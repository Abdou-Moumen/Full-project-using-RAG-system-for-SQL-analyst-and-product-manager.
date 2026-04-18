import sqlite3, json, re
from rest_framework.decorators import api_view
from rest_framework.response import Response

DB_PATH = "store.db"

SCHEMA = """
suppliers(id, name, country, lead_time_days)
products(id, name, category, price, stock, supplier_id)
customers(id, name, city, joined_date)
orders(id, product_id, customer_id, quantity, order_date, status)
"""

# ── Lazy LLM ─────────────────────────────────────────────────────────────────
_llm = None
def get_llm():
    global _llm
    if _llm is None:
        from llama_index.llms.ollama import Ollama
        _llm = Ollama(model="gemma4:e2b", request_timeout=300.0)
    return _llm


# ── Load product rows from DB with computed inventory fields ──────────────────
def load_product_rows():
    """
    Joins products + suppliers + orders to produce one row per product with:
      - stock, price, category, supplier, lead_time_days  (from DB)
      - last_month_sales   (completed orders qty, last 30 days)
      - total_sales        (all completed orders qty)
      - reorder_point      (computed: avg monthly sales * lead_time_factor)
    """
    con = sqlite3.connect(DB_PATH)
    con.row_factory = sqlite3.Row
    cur = con.cursor()
    cur.execute("""
        SELECT
            p.id,
            p.name,
            p.category,
            p.price,
            p.stock,
            s.name        AS supplier,
            s.lead_time_days,
            COALESCE(SUM(CASE
                WHEN o.status = 'completed'
                 AND o.order_date >= date('now', '-30 days')
                THEN o.quantity ELSE 0 END), 0) AS last_month_sales,
            COALESCE(SUM(CASE
                WHEN o.status = 'completed'
                THEN o.quantity ELSE 0 END), 0) AS total_sales
        FROM products p
        JOIN suppliers s ON p.supplier_id = s.id
        LEFT JOIN orders o ON o.product_id = p.id
        GROUP BY p.id
    """)
    rows = [dict(r) for r in cur.fetchall()]
    con.close()

    # Compute reorder_point: lead_time_days * daily_sales_rate (min 5)
    for r in rows:
        daily = r["last_month_sales"] / 30 if r["last_month_sales"] > 0 else 1
        r["reorder_point"] = max(5, round(daily * r["lead_time_days"] * 1.5))
        r["stock_gap"]     = r["reorder_point"] - r["stock"]
        r["needs_reorder"] = r["stock"] < r["reorder_point"]
        r["is_out_of_stock"] = r["stock"] == 0

    return rows


# ── Build LlamaIndex nodes from DB rows ───────────────────────────────────────
def build_nodes(rows):
    from llama_index.core.schema import TextNode
    nodes = []
    for r in rows:
        text = (
            f"{r['name']} is a {r['category']} product "
            f"from {r['supplier']}, priced at ${r['price']:.2f}. "
            f"Current stock is {r['stock']} units. "
            f"Last month sales: {r['last_month_sales']} units. "
            f"Supplier lead time is {r['lead_time_days']} days."
        )
        metadata = {
            "name":             r["name"],
            "category":         r["category"],
            "supplier":         r["supplier"],
            "price":            float(r["price"]),
            "stock":            int(r["stock"]),
            "lead_time_days":   int(r["lead_time_days"]),
            "reorder_point":    int(r["reorder_point"]),
            "last_month_sales": int(r["last_month_sales"]),
            "total_sales":      int(r["total_sales"]),
            "is_out_of_stock":  bool(r["is_out_of_stock"]),
            "needs_reorder":    bool(r["needs_reorder"]),
            "stock_gap":        int(r["stock_gap"]),
        }
        nodes.append(TextNode(
            text=text,
            metadata=metadata,
            excluded_embed_metadata_keys=[
                "reorder_point", "last_month_sales", "total_sales",
                "lead_time_days", "stock_gap", "needs_reorder", "is_out_of_stock",
            ],
            excluded_llm_metadata_keys=["stock_gap"],
        ))
    return nodes


# ── Lazy RAG tracker ──────────────────────────────────────────────────────────
_tracker = None

def get_tracker():
    global _tracker
    if _tracker is not None:
        return _tracker

    from llama_index.core import VectorStoreIndex, Settings
    from llama_index.core.prompts import PromptTemplate
    from llama_index.embeddings.ollama import OllamaEmbedding

    Settings.llm = get_llm()
    Settings.embed_model = OllamaEmbedding(model_name="nomic-embed-text")

    rows  = load_product_rows()
    nodes = build_nodes(rows)

    PROMPT = PromptTemplate("""
You are a PRODUCT MANAGER AGENT — a specialist in inventory health and product performance.

YOUR RESPONSIBILITIES:
- Identify products that are out of stock or critically low on stock
- Highlight top-performing products based on sales volume
- Flag supply risks: long lead_time_days combined with low stock
- Deliver clear, structured, actionable inventory reports

LABELING RULES (apply consistently):
  OUT OF STOCK   -> stock = 0
  NEEDS REORDER  -> stock < reorder_point
  TOP PERFORMER  -> total_sales > 100 AND last_month_sales > 10
  SUPPLY RISK    -> lead_time_days >= 7 AND stock < reorder_point

OUTPUT FORMAT:
  Use bullet points. Always end with a "PRIORITY ACTIONS" section listing the top 3 immediate actions.

STRICT RULES:
  1. Only use numbers from the context below — never invent or estimate
  2. If a product is not in the context, do not mention it
  3. Be concise

PRODUCT DATA:
{context_str}

QUESTION: {query_str}

YOUR REPORT:
""")

    index = VectorStoreIndex(nodes)
    _tracker = index.as_query_engine(
        text_qa_template=PROMPT,
        similarity_top_k=len(nodes),  # all products in context
    )
    return _tracker


# ── SQL helpers ───────────────────────────────────────────────────────────────
def get_sql(question):
    llm = get_llm()
    prompt = (
        "You are a SQLite expert. Write ONE valid SQLite SELECT query.\n"
        "Return ONLY the raw SQL, no explanation, no markdown.\n"
        f"RULES: Only SELECT. No INSERT/UPDATE/DELETE/DROP/ALTER. LIMIT 20 unless asked.\n"
        f"Schema: {SCHEMA}\nQuestion: {question}"
    )
    sql = str(llm.complete(prompt)).strip()
    match = re.search(r"```(?:sql)?\s*(.*?)```", sql, re.DOTALL | re.IGNORECASE)
    if match:
        sql = match.group(1).strip()
    return sql

def validate_sql(sql):
    cleaned = sql.strip().strip(";")
    lowered = cleaned.lower()
    forbidden = ["insert", "update", "delete", "drop", "alter", "pragma", "create", "attach"]
    if not lowered.startswith("select"):
        raise ValueError("Only SELECT queries are allowed.")
    for word in forbidden:
        if re.search(rf"\b{word}\b", lowered):
            raise ValueError(f"Forbidden keyword: {word}")
    return cleaned + ";"

def run_sql(sql):
    con = sqlite3.connect(DB_PATH)
    con.row_factory = sqlite3.Row
    cur = con.cursor()
    cur.execute(sql)
    rows = [dict(r) for r in cur.fetchall()]
    con.close()
    return rows

def summarize(question, rows):
    llm = get_llm()
    prompt = (
        "You are a business analyst. Summarize these SQL results as a short clear answer.\n"
        f"Question: {question}\nRows: {json.dumps(rows[:10], indent=2)}\nAnswer:"
    )
    return str(llm.complete(prompt)).strip()


# ── Views ─────────────────────────────────────────────────────────────────────
@api_view(["POST"])
def chat(request):
    question = request.data.get("question", "")
    try:
        sql      = get_sql(question)
        sql      = validate_sql(sql)
        rows     = run_sql(sql)
        summary  = summarize(question, rows)
        return Response({"sql": sql, "rows": rows[:20], "summary": summary})
    except Exception as e:
        return Response({"error": str(e)}, status=400)


@api_view(["POST"])
def inventory(request):
    question = request.data.get("question", "")
    if not question:
        return Response({"error": "No question provided."}, status=400)
    try:
        tracker  = get_tracker()
        response = tracker.query(question)
        return Response({"report": str(response).strip()})
    except Exception as e:
        return Response({"error": str(e)}, status=500)


@api_view(["GET"])
def dashboard(request):
    con = sqlite3.connect(DB_PATH)
    con.row_factory = sqlite3.Row
    cur = con.cursor()

    cur.execute("SELECT COUNT(*) as total FROM orders WHERE status='completed'")
    completed = dict(cur.fetchone())["total"]

    cur.execute("SELECT SUM(p.price * o.quantity) as revenue FROM orders o JOIN products p ON o.product_id=p.id WHERE o.status='completed'")
    revenue = dict(cur.fetchone())["revenue"] or 0

    cur.execute("SELECT COUNT(*) as total FROM customers")
    customers = dict(cur.fetchone())["total"]

    cur.execute("SELECT COUNT(*) as total FROM products")
    products_count = dict(cur.fetchone())["total"]

    cur.execute("""SELECT p.category, SUM(o.quantity) as volume
        FROM orders o JOIN products p ON o.product_id=p.id
        WHERE o.status='completed' GROUP BY p.category ORDER BY volume DESC""")
    by_category = [dict(r) for r in cur.fetchall()]

    cur.execute("""SELECT strftime('%Y-%m', o.order_date) as month, SUM(p.price*o.quantity) as revenue
        FROM orders o JOIN products p ON o.product_id=p.id
        WHERE o.status='completed' GROUP BY month ORDER BY month""")
    by_month = [dict(r) for r in cur.fetchall()]

    cur.execute("""SELECT p.name, SUM(o.quantity) as sold
        FROM orders o JOIN products p ON o.product_id=p.id
        WHERE o.status='completed' GROUP BY p.id ORDER BY sold DESC LIMIT 5""")
    top_products = [dict(r) for r in cur.fetchall()]

    con.close()
    return Response({
        "stats": {"completed_orders": completed, "revenue": revenue,
                  "customers": customers, "products": products_count},
        "by_category": by_category,
        "by_month": by_month,
        "top_products": top_products,
    })