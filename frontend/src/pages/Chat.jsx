import { useState, useRef, useEffect } from "react";
import axios from "axios";
import {
  Send, Loader2, Table2, Code2, MessageSquare,
  Trash2, Clock, Plus, Database, Package,
  AlertTriangle, TrendingUp, ShieldAlert,
} from "lucide-react";

const API = "http://localhost:8000/api";

// ── Role config ───────────────────────────────────────────────────────────────
const ROLES = {
  analyst: {
    id:          "analyst",
    label:       "SQL Analyst",
    badge:       "DATA",
    description: "Query your store database with natural language",
    placeholder: "Ask a question about your data...",
    footer:      "QUERIES ARE READ-ONLY · SQL GENERATED AUTOMATICALLY",
    accent:      "#6c63ff",
    accentDim:   "rgba(108,99,255,0.12)",
    suggestions: [
      "Which categories have the highest revenue?",
      "Top 5 customers by total orders",
      "Products low on stock",
      "Monthly order trends",
      "Average order value by category",
      "Orders with pending status",
    ],
  },
  manager: {
    id:          "manager",
    label:       "Product Manager",
    badge:       "INVENTORY",
    description: "AI-powered inventory health & performance reports",
    placeholder: "Ask about inventory health, stock levels, top performers...",
    footer:      "RAG-POWERED · READS FROM PRODUCTS.CSV · 100% OFFLINE",
    accent:      "#10b981",
    accentDim:   "rgba(16,185,129,0.12)",
    suggestions: [
      "Which products are performing best?",
      "What needs to be reordered urgently?",
      "Flag any supply chain risks",
      "Show me all out-of-stock products",
      "Which products have the highest ratings?",
      "What are the top 3 priority actions right now?",
    ],
  },
};

// ── Role Toggle ───────────────────────────────────────────────────────────────
function RoleToggle({ role, onChange }) {
  const current = ROLES[role];
  const other   = ROLES[role === "analyst" ? "manager" : "analyst"];
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 6,
      background: "var(--bg-elevated)", border: "1px solid var(--border)",
      borderRadius: 8, padding: 4,
    }}>
      {Object.values(ROLES).map(r => (
        <button
          key={r.id}
          onClick={() => onChange(r.id)}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "6px 12px", borderRadius: 6, border: "none",
            background: role === r.id ? r.accent : "transparent",
            color: role === r.id ? "#fff" : "var(--text-secondary)",
            cursor: "pointer", fontSize: 12, fontFamily: "inherit",
            letterSpacing: "0.04em", transition: "all 0.2s", fontWeight: 500,
          }}
        >
          {r.id === "analyst" ? <Database size={12} /> : <Package size={12} />}
          {r.label}
        </button>
      ))}
    </div>
  );
}

// ── SQL AI Message ─────────────────────────────────────────────────────────
function SQLMessage({ msg }) {
  if (msg.error) return (
    <div className="fade-in" style={{
      background: "var(--bg-surface)", border: "1px solid var(--danger)",
      borderRadius: 8, padding: "12px 16px", fontSize: 13, color: "var(--danger)",
    }}>
      Error: {msg.error}
    </div>
  );
  return (
    <div className="fade-in" style={{ maxWidth: "96%" }}>
      <div style={{
        background: "var(--bg-surface)", border: "1px solid var(--border)",
        borderRadius: "8px 8px 0 0", padding: "14px 18px",
        fontSize: 13, lineHeight: 1.7, color: "var(--text-secondary)", borderBottom: "none",
      }}>
        <span style={{ fontSize: 10, color: "var(--text-muted)", letterSpacing: "0.08em", display: "block", marginBottom: 6 }}>
          AI SUMMARY
        </span>
        {msg.summary}
      </div>
      <div style={{
        display: "grid", gridTemplateColumns: "1fr 1fr",
        border: "1px solid var(--border)", borderRadius: "0 0 8px 8px", overflow: "hidden",
      }}>
        {/* Results */}
        <div style={{ borderRight: "1px solid var(--border)" }}>
          <div style={{
            padding: "9px 16px", borderBottom: "1px solid var(--border)",
            display: "flex", alignItems: "center", gap: 6, background: "var(--bg-elevated)",
          }}>
            <Table2 size={13} color={ROLES.analyst.accent} />
            <span style={{ fontSize: 11, color: "var(--text-muted)", letterSpacing: "0.06em" }}>
              RESULTS · {msg.rows?.length ?? 0} ROWS
            </span>
          </div>
          <div style={{ overflow: "auto", maxHeight: 220, background: "var(--bg-surface)" }}>
            {msg.rows?.length > 0 ? (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr>
                    {Object.keys(msg.rows[0]).map(col => (
                      <th key={col} style={{
                        padding: "7px 12px", textAlign: "left", color: "var(--text-muted)",
                        fontWeight: 500, letterSpacing: "0.05em", fontSize: 10,
                        borderBottom: "1px solid var(--border)", background: "var(--bg-elevated)",
                        position: "sticky", top: 0, whiteSpace: "nowrap",
                      }}>{col.toUpperCase()}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {msg.rows.map((row, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid var(--border)" }}>
                      {Object.values(row).map((v, j) => (
                        <td key={j} style={{
                          padding: "7px 12px", color: "var(--text-secondary)", whiteSpace: "nowrap",
                          background: i % 2 === 0 ? "var(--bg-surface)" : "var(--bg-elevated)",
                        }}>
                          {typeof v === "number" ? v.toLocaleString() : String(v ?? "—")}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p style={{ padding: 16, fontSize: 12, color: "var(--text-muted)" }}>No rows returned.</p>
            )}
          </div>
        </div>
        {/* SQL */}
        <div style={{ background: "var(--bg-surface)" }}>
          <div style={{
            padding: "9px 16px", borderBottom: "1px solid var(--border)",
            display: "flex", alignItems: "center", gap: 6, background: "var(--bg-elevated)",
          }}>
            <Code2 size={13} color="#10b981" />
            <span style={{ fontSize: 11, color: "var(--text-muted)", letterSpacing: "0.06em" }}>GENERATED SQL</span>
          </div>
          <div style={{ padding: 16, overflow: "auto", maxHeight: 220 }}>
            <pre style={{
              margin: 0, fontSize: 11, color: "#10b981", lineHeight: 1.8,
              fontFamily: "'IBM Plex Mono', monospace", whiteSpace: "pre-wrap", wordBreak: "break-word",
            }}>{msg.sql}</pre>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Inventory AI Message ───────────────────────────────────────────────────
function parseReport(report) {
  if (!report) return { sections: [], priorities: [] };
  const lines = report.split("\n").map(l => l.trim()).filter(Boolean);
  const priorities = [];
  const sections = [];
  let inPriority = false;
  let currentSection = null;

  for (const line of lines) {
    if (/priority actions/i.test(line)) {
      inPriority = true;
      if (currentSection) sections.push(currentSection);
      currentSection = null;
      continue;
    }
    if (inPriority) {
      if (/^[-*\d]/.test(line)) priorities.push(line.replace(/^[-*\d.]+\s*/, ""));
      continue;
    }
    if (/^#+\s/.test(line) || (line.endsWith(":") && line.length < 50)) {
      if (currentSection) sections.push(currentSection);
      currentSection = { title: line.replace(/^#+\s*/, "").replace(/:$/, ""), bullets: [] };
    } else if (/^[-*•]/.test(line) && currentSection) {
      currentSection.bullets.push(line.replace(/^[-*•]\s*/, ""));
    } else if (currentSection) {
      currentSection.bullets.push(line);
    } else {
      sections.push({ title: null, bullets: [line] });
    }
  }
  if (currentSection) sections.push(currentSection);
  return { sections, priorities };
}

const LABEL_COLORS = {
  "OUT OF STOCK":  { bg: "rgba(239,68,68,0.1)",   text: "#ef4444", icon: AlertTriangle },
  "NEEDS REORDER": { bg: "rgba(245,158,11,0.1)",  text: "#f59e0b", icon: AlertTriangle },
  "TOP PERFORMER": { bg: "rgba(16,185,129,0.1)",  text: "#10b981", icon: TrendingUp    },
  "SUPPLY RISK":   { bg: "rgba(239,68,68,0.08)",  text: "#ef4444", icon: ShieldAlert   },
};

function labelChip(text) {
  for (const [key, style] of Object.entries(LABEL_COLORS)) {
    if (text.toUpperCase().includes(key)) {
      const Icon = style.icon;
      return (
        <span style={{
          display: "inline-flex", alignItems: "center", gap: 4,
          background: style.bg, color: style.text,
          fontSize: 10, padding: "2px 7px", borderRadius: 4,
          letterSpacing: "0.06em", fontWeight: 500, marginRight: 6, verticalAlign: "middle",
        }}>
          <Icon size={10} /> {key}
        </span>
      );
    }
  }
  return null;
}

function InventoryMessage({ msg }) {
  if (msg.error) return (
    <div className="fade-in" style={{
      background: "var(--bg-surface)", border: "1px solid var(--danger)",
      borderRadius: 8, padding: "12px 16px", fontSize: 13, color: "var(--danger)",
    }}>
      Error: {msg.error}
    </div>
  );

  const { sections, priorities } = parseReport(msg.report);

  return (
    <div className="fade-in" style={{ maxWidth: "96%" }}>
      {/* Header bar */}
      <div style={{
        background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.2)",
        borderRadius: "8px 8px 0 0", padding: "10px 18px", borderBottom: "none",
        display: "flex", alignItems: "center", gap: 8,
      }}>
        <Package size={14} color="#10b981" />
        <span style={{ fontSize: 11, color: "#10b981", letterSpacing: "0.08em", fontWeight: 500 }}>
          INVENTORY REPORT
        </span>
      </div>

      {/* Content */}
      <div style={{
        background: "var(--bg-surface)", border: "1px solid rgba(16,185,129,0.2)",
        borderRadius: "0 0 8px 8px", padding: "18px 20px",
      }}>
        {sections.length > 0 ? (
          sections.map((sec, i) => (
            <div key={i} style={{ marginBottom: i < sections.length - 1 ? 18 : 0 }}>
              {sec.title && (
                <p style={{
                  fontSize: 11, fontWeight: 500, color: "#10b981",
                  letterSpacing: "0.07em", margin: "0 0 8px",
                }}>
                  {sec.title.toUpperCase()}
                </p>
              )}
              {sec.bullets.map((b, j) => (
                <div key={j} style={{
                  display: "flex", gap: 8, marginBottom: 6,
                  fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6,
                }}>
                  {sec.title && <span style={{ color: "#10b981", flexShrink: 0, marginTop: 2 }}>›</span>}
                  <span>
                    {labelChip(b)}
                    {b}
                  </span>
                </div>
              ))}
            </div>
          ))
        ) : (
          <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.7 }}>
            {msg.report}
          </p>
        )}

        {/* Priority actions */}
        {priorities.length > 0 && (
          <div style={{
            marginTop: 20, padding: "14px 16px",
            background: "rgba(16,185,129,0.06)", borderRadius: 6,
            border: "1px solid rgba(16,185,129,0.15)",
          }}>
            <p style={{ fontSize: 11, color: "#10b981", letterSpacing: "0.08em", margin: "0 0 10px", fontWeight: 500 }}>
              PRIORITY ACTIONS
            </p>
            {priorities.map((p, i) => (
              <div key={i} style={{ display: "flex", gap: 10, marginBottom: 6, alignItems: "flex-start" }}>
                <span style={{
                  background: "#10b981", color: "#fff", fontSize: 10, fontWeight: 600,
                  width: 18, height: 18, borderRadius: "50%", display: "flex",
                  alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1,
                }}>{i + 1}</span>
                <span style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5 }}>{p}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── History Sidebar ────────────────────────────────────────────────────────
function HistorySidebar({ sessions, activeId, onSelect, onDelete, onNew, accentColor }) {
  return (
    <div style={{
      width: 220, flexShrink: 0,
      background: "var(--bg-surface)", borderRight: "1px solid var(--border)",
      display: "flex", flexDirection: "column",
    }}>
      <div style={{
        padding: "14px 14px 12px", borderBottom: "1px solid var(--border)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <span style={{ fontSize: 11, color: "var(--text-muted)", letterSpacing: "0.08em" }}>HISTORY</span>
        <button
          onClick={onNew}
          style={{
            background: "var(--bg-elevated)", border: "1px solid var(--border)",
            borderRadius: 5, padding: "4px 8px", cursor: "pointer",
            color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 4,
            fontSize: 11, transition: "all 0.15s",
          }}
          onMouseOver={e => { e.currentTarget.style.borderColor = accentColor; e.currentTarget.style.color = accentColor; }}
          onMouseOut={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text-secondary)"; }}
        >
          <Plus size={12} /> New
        </button>
      </div>
      <div style={{ flex: 1, overflow: "auto" }}>
        {sessions.length === 0 && (
          <p style={{ padding: "20px 14px", fontSize: 12, color: "var(--text-muted)" }}>
            No conversations yet.
          </p>
        )}
        {sessions.map(s => {
          const role = ROLES[s.role] || ROLES.analyst;
          const active = s.id === activeId;
          return (
            <div key={s.id} onClick={() => onSelect(s.id)} style={{
              padding: "10px 14px",
              background: active ? "var(--bg-elevated)" : "transparent",
              borderLeft: active ? `2px solid ${role.accent}` : "2px solid transparent",
              cursor: "pointer", display: "flex", alignItems: "flex-start",
              gap: 8, transition: "background 0.1s",
            }}
              onMouseOver={e => { if (!active) e.currentTarget.style.background = "var(--bg-hover)"; }}
              onMouseOut={e => { if (!active) e.currentTarget.style.background = "transparent"; }}
            >
              {s.role === "manager"
                ? <Package size={13} color={active ? role.accent : "var(--text-muted)"} style={{ marginTop: 2, flexShrink: 0 }} />
                : <Database size={13} color={active ? role.accent : "var(--text-muted)"} style={{ marginTop: 2, flexShrink: 0 }} />
              }
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{
                  fontSize: 12, color: active ? "var(--text-primary)" : "var(--text-secondary)",
                  margin: "0 0 2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>{s.title}</p>
                <p style={{ fontSize: 10, color: "var(--text-muted)", margin: 0, display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{
                    background: role.accentDim, color: role.accent,
                    fontSize: 9, padding: "1px 5px", borderRadius: 3, letterSpacing: "0.05em",
                  }}>{role.badge}</span>
                  {s.time}
                </p>
              </div>
              <button onClick={e => { e.stopPropagation(); onDelete(s.id); }} style={{
                background: "none", border: "none", cursor: "pointer",
                color: "var(--text-muted)", padding: 2, flexShrink: 0,
                display: "flex", alignItems: "center", borderRadius: 4,
              }}
                onMouseOver={e => e.currentTarget.style.color = "var(--danger)"}
                onMouseOut={e => e.currentTarget.style.color = "var(--text-muted)"}
                title="Delete"
              >
                <Trash2 size={12} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main Chat Page ────────────────────────────────────────────────────────────
export default function Chat() {
  const [role, setRole] = useState("analyst");
  const [sessions, setSessions] = useState(() => {
    try { return JSON.parse(localStorage.getItem("chat_sessions") || "[]"); }
    catch { return []; }
  });
  const [activeId, setActiveId] = useState(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const cfg = ROLES[role];

  useEffect(() => {
    localStorage.setItem("chat_sessions", JSON.stringify(sessions));
  }, [sessions]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [sessions, activeId]);

  // When switching roles, deselect active session so context is clear
  const handleRoleChange = (newRole) => {
    setRole(newRole);
    setActiveId(null);
  };

  const activeSession = sessions.find(s => s.id === activeId);
  const messages = activeSession?.messages || [];

  const now = () => new Date().toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit" });

  const newSession = () => {
    const id = Date.now().toString();
    setSessions(prev => [{ id, role, title: "New conversation", time: now(), messages: [] }, ...prev]);
    setActiveId(id);
  };

  const deleteSession = (id) => {
    setSessions(prev => prev.filter(s => s.id !== id));
    if (activeId === id) setActiveId(null);
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const q = input.trim();
    setInput("");

    let sessionId = activeId;
    if (!sessionId) {
      sessionId = Date.now().toString();
      const title = q.length > 32 ? q.slice(0, 32) + "…" : q;
      setSessions(prev => [{ id: sessionId, role, title, time: now(), messages: [] }, ...prev]);
      setActiveId(sessionId);
    }

    setSessions(prev => prev.map(s =>
      s.id === sessionId ? {
        ...s,
        title: s.messages.length === 0 ? (q.length > 32 ? q.slice(0, 32) + "…" : q) : s.title,
        messages: [...s.messages, { role: "user", text: q }],
      } : s
    ));

    setLoading(true);
    try {
      const endpoint = role === "manager" ? `${API}/inventory/` : `${API}/chat/`;
      const r = await axios.post(endpoint, { question: q });
      setSessions(prev => prev.map(s =>
        s.id === sessionId
          ? { ...s, messages: [...s.messages, { role: "ai", mode: role, ...r.data }] }
          : s
      ));
    } catch (e) {
      setSessions(prev => prev.map(s =>
        s.id === sessionId
          ? { ...s, messages: [...s.messages, { role: "ai", mode: role, error: e.response?.data?.error || "Something went wrong" }] }
          : s
      ));
    }
    setLoading(false);
  };

  // Derive accent from active session's role (not current toggle) for messages
  const activeCfg = activeSession ? ROLES[activeSession.role] || cfg : cfg;

  return (
    <div style={{ display: "flex", height: "100%", overflow: "hidden" }}>
      <HistorySidebar
        sessions={sessions}
        activeId={activeId}
        onSelect={setActiveId}
        onDelete={deleteSession}
        onNew={newSession}
        accentColor={cfg.accent}
      />

      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Header */}
        <div style={{
          padding: "14px 24px", borderBottom: "1px solid var(--border)",
          background: "var(--bg-surface)", flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16,
        }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
              <h2 style={{ fontSize: 14, fontWeight: 600, margin: 0, color: "var(--text-primary)" }}>
                {activeSession?.title || cfg.label}
              </h2>
              <span style={{
                fontSize: 9, padding: "2px 7px", borderRadius: 4, letterSpacing: "0.07em",
                background: cfg.accentDim, color: cfg.accent, fontWeight: 500,
              }}>{cfg.badge}</span>
            </div>
            <p style={{ fontSize: 11, color: "var(--text-muted)", letterSpacing: "0.03em" }}>
              {cfg.description}
            </p>
          </div>
          <RoleToggle role={role} onChange={handleRoleChange} />
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflow: "auto", padding: "24px 28px" }}>
          {messages.length === 0 && (
            <div className="fade-in">
              {/* Mode banner when manager */}
              {role === "manager" && (
                <div style={{
                  display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 24,
                  padding: "14px 18px", borderRadius: 8,
                  background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.15)",
                }}>
                  <Package size={18} color="#10b981" style={{ flexShrink: 0, marginTop: 1 }} />
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 500, color: "#10b981", margin: "0 0 4px" }}>
                      Product Manager mode active
                    </p>
                    <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: 0, lineHeight: 1.6 }}>
                      This agent reads your <code style={{ fontSize: 11, color: "#10b981" }}>Database</code> using RAG.
                      It can identify stock issues, top performers, supply risks, and give you priority actions.
                    </p>
                  </div>
                </div>
              )}
              <p style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 12, letterSpacing: "0.08em" }}>
                SUGGESTED QUERIES
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {cfg.suggestions.map((s, i) => (
                  <button key={i} onClick={() => setInput(s)} style={{
                    background: "var(--bg-surface)", border: "1px solid var(--border)",
                    borderRadius: 6, padding: "8px 14px", fontSize: 12,
                    color: "var(--text-secondary)", cursor: "pointer", transition: "all 0.15s",
                  }}
                    onMouseOver={e => { e.currentTarget.style.borderColor = cfg.accent; e.currentTarget.style.color = "var(--text-primary)"; }}
                    onMouseOut={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text-secondary)"; }}
                  >{s}</button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} style={{ marginBottom: 24 }}>
              {msg.role === "user" ? (
                <div className="fade-in" style={{ display: "flex", justifyContent: "flex-end" }}>
                  <div style={{
                    background: activeCfg.accent, borderRadius: "8px 8px 2px 8px",
                    padding: "10px 16px", fontSize: 13, maxWidth: "60%",
                    color: "#fff", lineHeight: 1.5,
                  }}>{msg.text}</div>
                </div>
              ) : msg.mode === "manager" ? (
                <InventoryMessage msg={msg} />
              ) : (
                <SQLMessage msg={msg} />
              )}
            </div>
          ))}

          {loading && (
            <div className="fade-in" style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--text-muted)", fontSize: 13 }}>
              <Loader2 size={14} color={cfg.accent} style={{ animation: "spin 1s linear infinite" }} />
              {role === "manager" ? "analyzing inventory..." : "querying database..."}
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input bar */}
        <div style={{
          padding: "14px 28px 20px", borderTop: "1px solid var(--border)",
          background: "var(--bg-surface)", flexShrink: 0,
        }}>
          {/* Accent strip on top when manager */}
          {role === "manager" && (
            <div style={{
              height: 2, borderRadius: 1, marginBottom: 12,
              background: "linear-gradient(90deg, #10b981, rgba(16,185,129,0.1))",
            }} />
          )}
          <div style={{ display: "flex", gap: 10 }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage()}
              placeholder={cfg.placeholder}
              style={{
                flex: 1, background: "var(--bg-elevated)",
                border: "1px solid var(--border)", borderRadius: 8,
                padding: "11px 16px", color: "var(--text-primary)",
                fontSize: 13, outline: "none", transition: "border-color 0.15s",
              }}
              onFocus={e => e.target.style.borderColor = cfg.accent}
              onBlur={e => e.target.style.borderColor = "var(--border)"}
            />
            <button
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              style={{
                background: input.trim() && !loading ? cfg.accent : "var(--bg-elevated)",
                border: "1px solid var(--border)", borderRadius: 8,
                padding: "11px 18px", cursor: "pointer",
                color: input.trim() && !loading ? "#fff" : "var(--text-muted)",
                display: "flex", alignItems: "center", gap: 6,
                fontSize: 13, transition: "all 0.15s",
              }}
            >
              <Send size={15} />
            </button>
          </div>
          <p style={{ fontSize: 10, color: "var(--text-faint)", margin: "8px 0 0", letterSpacing: "0.04em" }}>
            {cfg.footer}
          </p>
        </div>
      </div>
    </div>
  );
}
