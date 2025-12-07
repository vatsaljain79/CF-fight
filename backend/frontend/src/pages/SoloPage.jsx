import { useLocation, useNavigate, Link } from "react-router-dom";
import { useEffect, useState, useCallback } from "react";
import { refreshSolo } from "../api";

export default function SoloPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const initial = location.state;

  const [solo, setSolo] = useState(initial || null);
  const [loadingRefresh, setLoadingRefresh] = useState(false);
  const [error, setError] = useState("");
  const [elapsedSec, setElapsedSec] = useState(0);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const autoRefreshMs = 10000;

  // If user directly opens /solo without state
  if (!solo) {
    return (
      <div className="card">
        <h1>Solo Practice</h1>
        <p className="small">No solo set found. Go back and create one.</p>
        <Link to="/" className="small">
          ← Back to home
        </Link>
      </div>
    );
  }

  const { sessionId, handle, ratingMin, ratingMax, numProblems, includeTags, excludeTags, startTime, problems, solves } =
    solo;

  const formatTime = (sec) => {
    if (sec == null) return "-";
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}m ${s.toString().padStart(2, "0")}s`;
  };

  const formatHMS = (sec) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    if (h > 0) return `${h}h ${m}m ${s.toString().padStart(2, "0")}s`;
    return `${m}m ${s.toString().padStart(2, "0")}s`;
  };

  const computeScoreSummary = () => {
    if (!solves) return { solvedCount: 0, totalTime: 0 };
    let solvedCount = 0;
    let totalTime = 0;
    for (const p of problems) {
      const s = solves[p.key];
      if (s && s.timeFromStartSec != null) {
        solvedCount += 1;
        totalTime += s.timeFromStartSec;
      }
    }
    return { solvedCount, totalTime };
  };

  const { solvedCount, totalTime } = computeScoreSummary();

  const handleRefresh = useCallback(
    async (manual = true) => {
      if (!sessionId) return;
      setError("");
      if (manual) setLoadingRefresh(true);
      try {
        const data = await refreshSolo(sessionId);
        setSolo(data);
      } catch (e) {
        setError("Failed to refresh solves.");
      } finally {
        if (manual) setLoadingRefresh(false);
      }
    },
    [sessionId]
  );

  // Timer effect
  useEffect(() => {
    if (!startTime) return;
    const startMs = new Date(startTime).getTime();
    if (isNaN(startMs)) return;

    const update = () => {
      const now = Date.now();
      const diff = Math.max(0, Math.round((now - startMs) / 1000));
      setElapsedSec(diff);
    };

    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [startTime]);

  // Auto refresh effect
  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(() => {
      handleRefresh(false);
    }, autoRefreshMs);
    return () => clearInterval(id);
  }, [autoRefresh, handleRefresh]);

  // Rematch: reuse same settings
  const handleRematch = async () => {
    navigate("/", {
      state: {
        soloRematch: {
          handle,
          ratingMin,
          ratingMax,
          numProblems,
          includeTags,
          excludeTags,
        },
      },
    });
  };

  return (
      <div
    style={{
      display: "flex",
      justifyContent: "center",
      width: "100%",
      paddingTop: "30px",
    }}
  >
    <div
      style={{
        width: "100%",
        maxWidth: "900px",
        padding: "0 20px",
      }}
    >
    <div className="card">
      <h1>Solo Practice</h1>
      <p className="small">
        Handle: <strong>{handle}</strong>
      </p>
      <p className="small">
        Rating range: {ratingMin} – {ratingMax} | Problems: {numProblems}
      </p>
      {includeTags?.length > 0 && (
        <p className="small">Include: {includeTags.join(", ")}</p>
      )}
      {excludeTags?.length > 0 && (
        <p className="small">Exclude: {excludeTags.join(", ")}</p>
      )}

      {/* Timer + controls */}
      <div
        style={{
          marginTop: "0.75rem",
          marginBottom: "0.75rem",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: "0.75rem",
        }}
      >
        <span className="badge">
          Started at: {new Date(startTime).toLocaleTimeString()}
        </span>
        <span className="badge">Elapsed: {formatHMS(elapsedSec)}</span>

        <button
          className="btn-secondary"
          onClick={() => handleRefresh(true)}
          disabled={loadingRefresh}
        >
          {loadingRefresh ? "Refreshing..." : "Refresh now"}
        </button>

        <label style={{ fontSize: "0.8rem", cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={autoRefresh}
            onChange={(e) => setAutoRefresh(e.target.checked)}
            style={{ marginRight: "0.3rem" }}
          />
          Auto refresh every 10s
        </label>

        <button
          className="btn-secondary"
          onClick={handleRematch}
          style={{ marginLeft: "auto" }}
        >
          New solo set (rematch)
        </button>
      </div>

      {/* Summary */}
      <div
        style={{
          borderTop: "1px solid #1f2937",
          paddingTop: "0.5rem",
          marginBottom: "0.75rem",
          fontSize: "0.9rem",
        }}
      >
        <p className="small">
          Solved: <strong>{solvedCount}</strong> / {problems.length} | Total
          time: {solvedCount > 0 ? formatTime(totalTime) : "-"}
        </p>
      </div>

      {error && <div className="error-text">{error}</div>}

      {/* Problems */}
      <div className="problem-list">
        <h2>Problems</h2>
        {problems.map((p) => {
          const s = solves ? solves[p.key] : null;
          return (
            <div key={p.key} className="problem-item">
              <div>
                <div>
                  {p.contestId}
                  {p.index} – {p.name}
                </div>
                <div className="small">
                  Rating {p.rating} | Band [{p.bandStart}–{p.bandEnd}] |{" "}
                  <a
                    href={`https://codeforces.com/problemset/problem/${p.contestId}/${p.index}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: "#38bdf8" }}
                  >
                    Open on CF
                  </a>
                </div>
                {/* {p.tags && p.tags.length > 0 && (
                  <div className="small" style={{ marginTop: "0.2rem" }}>
                    Tags: {p.tags.join(", ")}
                  </div>
                )} */}
              </div>
              <div style={{ textAlign: "right", fontSize: "0.8rem" }}>
                {s ? (
                  <span className="solved">
                    solved at {formatTime(s.timeFromStartSec)}
                  </span>
                ) : (
                  <span className="not-solved">not solved</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: "1rem" }}>
        <Link to="/" className="small">
          ← Back to home
        </Link>
      </div>
    </div>
    </div>
    </div>
  );
}
