import { useState } from "react";
import { ThemeProvider } from "./context/ThemeContext";
import Sidebar from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
import Chat from "./pages/Chat";

function Layout() {
  const [view, setView] = useState("dashboard");
  return (
    <div style={{
      display: "flex", height: "100vh", overflow: "hidden",
      background: "var(--bg-base)", color: "var(--text-primary)",
    }}>
      <Sidebar view={view} setView={setView} />
      <main style={{ flex: 1, overflow: "auto", display: "flex", flexDirection: "column" }}>
        {view === "dashboard" && <Dashboard />}
        {view === "chat"      && <Chat />}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <Layout />
    </ThemeProvider>
  );
}
