import { LayoutDashboard, MessageSquare, Database, ChevronRight, Sun, Moon } from "lucide-react";
import { useTheme } from "../context/ThemeContext";

const NAV = [
  { id: "dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { id: "chat",      icon: MessageSquare,   label: "AI Query"   },
];

export default function Sidebar({ view, setView }) {
  const { dark, toggle } = useTheme();

  return (
    <nav style={{
      width: 220,
      background: "var(--bg-surface)",
      borderRight: "1px solid var(--border)",
      display: "flex",
      flexDirection: "column",
      flexShrink: 0,
    }}>
      {/* Logo */}
      <div style={{ padding: "28px 20px 20px", borderBottom: "1px solid var(--border)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <Database size={16} color="var(--accent)" />
          <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: "0.08em", color: "var(--accent)" }}>
            STORE.DB
          </span>
        </div>
        <p style={{ fontSize: 11, color: "var(--text-muted)", letterSpacing: "0.04em" }}>
          analytics console
        </p>
      </div>

      {/* Nav items */}
      <div style={{ flex: 1 }}>
        {NAV.map(({ id, icon: Icon, label }) => {
          const active = view === id;
          return (
            <button
              key={id}
              onClick={() => setView(id)}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                width: "100%", padding: "14px 20px",
                background: active ? "var(--bg-elevated)" : "transparent",
                border: "none",
                borderLeft: active ? "2px solid var(--accent)" : "2px solid transparent",
                color: active ? "var(--text-primary)" : "var(--text-secondary)",
                cursor: "pointer", fontSize: 13, letterSpacing: "0.04em",
                textAlign: "left", transition: "all 0.15s",
              }}
              onMouseOver={e => { if (!active) e.currentTarget.style.background = "var(--bg-hover)"; }}
              onMouseOut={e => { if (!active) e.currentTarget.style.background = "transparent"; }}
            >
              <Icon size={15} />
              <span style={{ flex: 1 }}>{label}</span>
              {active && <ChevronRight size={12} color="var(--accent)" />}
            </button>
          );
        })}
      </div>

      {/* Footer: theme toggle + info */}
      <div style={{ padding: "16px 20px", borderTop: "1px solid var(--border)" }}>
        <button
          onClick={toggle}
          title={dark ? "Switch to light mode" : "Switch to dark mode"}
          style={{
            display: "flex", alignItems: "center", gap: 8,
            width: "100%", padding: "8px 10px", marginBottom: 12,
            background: "var(--bg-elevated)", border: "1px solid var(--border)",
            borderRadius: 6, color: "var(--text-secondary)", cursor: "pointer",
            fontSize: 12, letterSpacing: "0.04em", transition: "all 0.15s",
          }}
          onMouseOver={e => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.color = "var(--text-primary)"; }}
          onMouseOut={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text-secondary)"; }}
        >
          {dark ? <Sun size={13} /> : <Moon size={13} />}
          {dark ? "Light mode" : "Dark mode"}
        </button>

        <p style={{ fontSize: 10, color: "var(--text-faint)", letterSpacing: "0.06em", lineHeight: 1.6 }}>
          POWERED BY<br />
          <span style={{ color: "var(--accent)" }}>LLAMA-INDEX + OLLAMA</span>
        </p>
      </div>
    </nav>
  );
}
