export default function Navbar() {
  return (
    <nav
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        height: "60px",
        background: "#0f172a",
        display: "flex",
        alignItems: "center",
        padding: "0 1.2rem",
        borderBottom: "1px solid #1e293b",
        zIndex: 100,
      }}
    >
      <h2 style={{ margin: 0, color: "#e2e8f0", fontSize: "1.1rem" }}>
        CF Fight ⚔️
      </h2>
    </nav>
  );
}
