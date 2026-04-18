import { useState, useEffect } from "react";
import axios from "axios";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid,
} from "recharts";
import { ShoppingCart, TrendingUp, Users, Package, Loader2 } from "lucide-react";
import { useTheme } from "../context/ThemeContext";

const API = "http://localhost:8000/api";

const fmt = n =>
  typeof n === "number" ? n.toLocaleString("en", { maximumFractionDigits: 2 }) : n;

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div style={{
      background: "var(--bg-surface)", border: "1px solid var(--border)",
      borderRadius: 8, padding: "20px 24px",
      display: "flex", flexDirection: "column", gap: 10,
      transition: "border-color 0.15s",
    }}
      onMouseOver={e => e.currentTarget.style.borderColor = "var(--border-strong)"}
      onMouseOut={e => e.currentTarget.style.borderColor = "var(--border)"}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Icon size={14} color={color} />
        <span style={{ fontSize: 11, color: "var(--text-muted)", letterSpacing: "0.06em" }}>{label}</span>
      </div>
      <p style={{ fontSize: 28, fontWeight: 600, margin: 0, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
        {value}
      </p>
    </div>
  );
}

function ChartBox({ title, children }) {
  return (
    <div style={{
      background: "var(--bg-surface)", border: "1px solid var(--border)",
      borderRadius: 8, padding: "20px 24px",
    }}>
      <p style={{ fontSize: 11, color: "var(--text-muted)", margin: "0 0 16px", letterSpacing: "0.08em" }}>
        {title}
      </p>
      {children}
    </div>
  );
}

export default function Dashboard() {
  const [dash, setDash] = useState(null);
  const [loading, setLoading] = useState(true);
  const { dark } = useTheme();

  useEffect(() => {
    axios.get(`${API}/dashboard/`)
      .then(r => { setDash(r.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const tooltipStyle = {
    background: "var(--tooltip-bg)", border: "1px solid var(--border)",
    borderRadius: 6, color: "var(--text-primary)", fontSize: 12, fontFamily: "inherit",
  };

  const axisColor = dark ? "#444" : "#aaa";

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", gap: 10 }}>
      <Loader2 size={18} color="var(--accent)" style={{ animation: "spin 1s linear infinite" }} />
      <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>loading data...</span>
    </div>
  );

  if (!dash) return (
    <div style={{ padding: 40 }}>
      <p style={{ color: "var(--text-secondary)", fontSize: 13 }}>
        Could not connect to backend at http://localhost:8000
      </p>
    </div>
  );

  const s = dash.stats;

  return (
    <div style={{ padding: "32px 36px", maxWidth: 1100, animation: "fadeIn 0.2s ease" }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 20, fontWeight: 600, margin: "0 0 4px", letterSpacing: "-0.01em", color: "var(--text-primary)" }}>
          Store Overview
        </h1>
        <p style={{ fontSize: 12, color: "var(--text-muted)", letterSpacing: "0.04em" }}>LIVE FROM STORE.DB</p>
      </div>

      {/* Stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 32 }}>
        <StatCard icon={ShoppingCart} label="COMPLETED ORDERS" value={fmt(s.completed_orders)} color="var(--accent)" />
        <StatCard icon={TrendingUp}   label="REVENUE"          value={`$${fmt(Math.round(s.revenue))}`} color="var(--success)" />
        <StatCard icon={Users}        label="CUSTOMERS"         value={fmt(s.customers)} color="var(--warning)" />
        <StatCard icon={Package}      label="PRODUCTS"          value={fmt(s.products)} color="var(--danger)" />
      </div>

      {/* Charts */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        <ChartBox title="REVENUE BY MONTH">
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={dash.by_month} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: axisColor, fontFamily: "inherit" }} />
              <YAxis tick={{ fontSize: 10, fill: axisColor, fontFamily: "inherit" }} />
              <Tooltip contentStyle={tooltipStyle} formatter={v => [`$${fmt(Math.round(v))}`, "Revenue"]} />
              <Line type="monotone" dataKey="revenue" stroke="var(--accent)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartBox>

        <ChartBox title="VOLUME BY CATEGORY">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={dash.by_category} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="category" tick={{ fontSize: 10, fill: axisColor, fontFamily: "inherit" }} />
              <YAxis tick={{ fontSize: 10, fill: axisColor, fontFamily: "inherit" }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="volume" fill="var(--accent)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartBox>
      </div>

      {/* Top products */}
      <ChartBox title="TOP 5 PRODUCTS">
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              {["#", "Product", "Units Sold"].map(h => (
                <th key={h} style={{
                  padding: "8px 0", textAlign: h === "Units Sold" ? "right" : "left",
                  color: "var(--text-muted)", fontWeight: 500, letterSpacing: "0.06em", fontSize: 11,
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dash.top_products.map((p, i) => (
              <tr key={i} style={{ borderBottom: "1px solid var(--border)" }}>
                <td style={{ padding: "10px 0", color: "var(--text-muted)", width: 28, fontSize: 11 }}>
                  {String(i + 1).padStart(2, "0")}
                </td>
                <td style={{ padding: "10px 0", color: "var(--text-primary)" }}>{p.name}</td>
                <td style={{ padding: "10px 0", textAlign: "right", color: "var(--accent)", fontWeight: 600 }}>
                  {fmt(p.sold)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </ChartBox>
    </div>
  );
}
