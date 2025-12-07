import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { joinRoom, startRoom, refreshSolves, createRoom } from "../api";

export default function RoomPage() {
  const { code } = useParams();
  const roomCode = (code || "").toUpperCase();
  const navigate = useNavigate();

  const [room, setRoom] = useState(null);
  const [solves, setSolves] = useState(null);
  const [loading, setLoading] = useState(true);
  const [startLoading, setStartLoading] = useState(false);
  const [refreshLoading, setRefreshLoading] = useState(false);
  const [rematchLoading, setRematchLoading] = useState(false);
  const [error, setError] = useState("");

  // Auto refresh state
  const [autoRefresh, setAutoRefresh] = useState(true);
  const autoRefreshIntervalMs = 10000; // 10 seconds

  // Recently solved (for row highlight)
  const [recentSolvedKeys, setRecentSolvedKeys] = useState([]);
  const prevSolvesRef = useRef(null);

  // Timer: elapsed seconds since start
  const [elapsedSec, setElapsedSec] = useState(0);

  // Scoring mode: "rating" | "count" | "knockout"
  const [scoreMode, setScoreMode] = useState("rating");

  const loadRoom = useCallback(async () => {
    setError("");
    setLoading(true);
    try {
      const data = await joinRoom(roomCode);
      setRoom(data.room);
      setSolves(data.solves);
      prevSolvesRef.current = data.solves;
    } catch (err) {
      console.error(err);
      if (err.response && err.response.data) {
        setError(err.response.data.error || "Failed to join room.");
      } else {
        setError("Failed to join room.");
      }
    } finally {
      setLoading(false);
    }
  }, [roomCode]);

  useEffect(() => {
    loadRoom();
  }, [loadRoom]);

  const handleStart = async () => {
    setStartLoading(true);
    setError("");
    try {
      const data = await startRoom(roomCode);
      setRoom(data.room);
      setSolves(data.solves);
      prevSolvesRef.current = data.solves;
    } catch (err) {
      console.error(err);
      if (err.response && err.response.data) {
        setError(err.response.data.error || "Failed to start room.");
      } else {
        setError("Failed to start room.");
      }
    } finally {
      setStartLoading(false);
    }
  };

  const handleRefreshOnce = useCallback(
    async (manual = false) => {
      setError("");
      if (manual) setRefreshLoading(true);
      try {
        const data = await refreshSolves(roomCode);

        const prev = prevSolvesRef.current;
        const current = data.solves;
        const newlySolved = [];

        if (prev && current && room) {
          const handles = [room.handle1, room.handle2];
          for (const p of room.problems) {
            const key = p.key;
            for (const h of handles) {
              const prevEntry = prev[h]?.[key] || null;
              const currEntry = current[h]?.[key] || null;
              if (!prevEntry && currEntry) {
                newlySolved.push(`${h}|${key}`);
              }
            }
          }
        }

        prevSolvesRef.current = current;
        setSolves(current);
        setRoom(data.room);
        setRecentSolvedKeys(newlySolved);

        if (newlySolved.length > 0) {
          setTimeout(() => setRecentSolvedKeys([]), 5000);
        }
      } catch (err) {
        console.error(err);
        if (err.response && err.response.data) {
          setError(err.response.data.error || "Failed to refresh solves.");
        } else {
          setError("Failed to refresh solves.");
        }
      } finally {
        if (manual) setRefreshLoading(false);
      }
    },
    [roomCode, room]
  );

  const handleRefresh = () => {
    if (!room) return;
    handleRefreshOnce(true);
  };

  // Auto-refresh effect
  useEffect(() => {
    if (!autoRefresh || !room || !room.startTime) return;

    const id = setInterval(() => {
      handleRefreshOnce(false);
    }, autoRefreshIntervalMs);

    return () => clearInterval(id);
  }, [autoRefresh, room, handleRefreshOnce]);

  // Timer effect – updates every second after start
  useEffect(() => {
    if (!room || !room.startTime) {
      setElapsedSec(0);
      return;
    }
    const startMs = new Date(room.startTime).getTime();
    if (isNaN(startMs)) return;

    const update = () => {
      const now = Date.now();
      const diff = Math.max(0, Math.round((now - startMs) / 1000));
      setElapsedSec(diff);
    };

    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [room]);

  const isStarted = room && room.startTime;

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

  const getSolveInfo = (handle, key) => {
    if (!solves || !solves[handle]) return null;
    return solves[handle][key] || null;
  };

  const [h1, h2] = room ? [room.handle1, room.handle2] : ["", ""];

  const isRecentlySolved = (handle, key) =>
    recentSolvedKeys.includes(`${handle}|${key}`);

  // ===== Scoreboard logic with 3 modes =====
  const computeScoreboard = () => {
    if (!room || !solves) return [];

    const handles = [room.handle1, room.handle2];
    const rowByHandle = {};
    for (const h of handles) {
      rowByHandle[h] = {
        handle: h,
        solvedCount: 0,
        totalTime: 0,
        score: 0,
      };
    }

    let anySolved = false;

    if (scoreMode === "rating" || scoreMode === "count") {
      // Mode 1 & 2: per solved problem, add rating (or 1) and time
      for (const p of room.problems) {
        for (const h of handles) {
          const entry = solves[h]?.[p.key];
          if (entry && entry.timeFromStartSec != null) {
            anySolved = true;
            const row = rowByHandle[h];
            row.solvedCount += 1;
            row.totalTime += entry.timeFromStartSec;
            if (scoreMode === "rating") {
              row.score += p.rating || 0;
            } else {
              row.score += 1;
            }
          }
        }
      }
    } else if (scoreMode === "knockout") {
      // Mode 3: knockout
      for (const p of room.problems) {
        const entries = handles.map((h) => ({
          handle: h,
          entry: solves[h]?.[p.key] || null,
        }));

        const anyoneSolved = entries.some(
          (e) => e.entry && e.entry.timeFromStartSec != null
        );
        if (!anyoneSolved) continue;

        anySolved = true;

        // Update solvedCount + totalTime for all who solved
        for (const e of entries) {
          if (e.entry && e.entry.timeFromStartSec != null) {
            const row = rowByHandle[e.handle];
            row.solvedCount += 1;
            row.totalTime += e.entry.timeFromStartSec;
          }
        }

        // Determine who solved first
        let bestHandle = null;
        let bestTime = Infinity;
        for (const e of entries) {
          if (e.entry && e.entry.timeFromStartSec != null) {
            const t = e.entry.timeFromStartSec;
            if (t < bestTime) {
              bestTime = t;
              bestHandle = e.handle;
            }
          }
        }
        if (bestHandle) {
          rowByHandle[bestHandle].score += 1;
        }
      }
    }

    const rows = Object.values(rowByHandle);
    if (!anySolved) return [];

    rows.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.totalTime - b.totalTime;
    });

    return rows;
  };

  const scoreboard = computeScoreboard();
  const leaderHandle = scoreboard.length > 0 ? scoreboard[0].handle : null;

  const scoreModeLabel = {
    rating: "Score = rating, tie-break by total time.",
    count: "Score = #solved problems, tie-break by time.",
    knockout: "Knockout: first solve on a problem gets the point.",
  }[scoreMode];

  const handleRematch = async () => {
    if (!room) return;
    setRematchLoading(true);
    setError("");
    try {
      const payload = {
        handle1: room.handle1,
        handle2: room.handle2,
        ratingMin: room.ratingMin,
        ratingMax: room.ratingMax,
        numProblems: room.numProblems,
        includeTags: room.includeTags || [],
        excludeTags: room.excludeTags || [],
      };
      const data = await createRoom(payload);
      navigate(`/room/${data.roomCode}`);
    } catch (err) {
      console.error(err);
      if (err.response && err.response.data) {
        setError(err.response.data.error || "Failed to create rematch room.");
      } else {
        setError("Failed to create rematch room.");
      }
    } finally {
      setRematchLoading(false);
    }
  };

  return (
    <div className="card">
      {loading ? (
        <p>Loading room...</p>
      ) : error ? (
        <>
          <h2>Error</h2>
          <p className="error-text">{error}</p>
          <Link to="/" className="small">
            ← Back to home
          </Link>
        </>
      ) : !room ? (
        <>
          <h2>Room not found</h2>
          <Link to="/" className="small">
            ← Back to home
          </Link>
        </>
      ) : (
        <>
          <h1>Room {roomCode}</h1>
          <p className="small">
            {room.handle1} vs {room.handle2}
          </p>
          <p className="small">
            Rating range: {room.ratingMin} – {room.ratingMax} | Problems:{" "}
            {room.numProblems}
          </p>
          {room.includeTags && room.includeTags.length > 0 && (
            <p className="small">
              Include tags: {room.includeTags.join(", ")}
            </p>
          )}
          {room.excludeTags && room.excludeTags.length > 0 && (
            <p className="small">
              Exclude tags: {room.excludeTags.join(", ")}
            </p>
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
            {!isStarted ? (
              <button
                className="btn-primary"
                onClick={handleStart}
                disabled={startLoading}
              >
                {startLoading ? "Starting..." : "Start duel"}
              </button>
            ) : (
              <>
                <span className="badge">
                  Started at: {new Date(room.startTime).toLocaleTimeString()}
                </span>
                <span className="badge">
                  Elapsed: {formatHMS(elapsedSec)}
                </span>
              </>
            )}

            <button
              className="btn-secondary"
              onClick={handleRefresh}
              disabled={refreshLoading}
            >
              {refreshLoading ? "Refreshing..." : "Refresh now"}
            </button>

            <label
              style={{
                fontSize: "0.8rem",
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                style={{ marginRight: "0.3rem" }}
              />
              Auto refresh every 10s
            </label>
          </div>

          {/* Score mode selector + scoreboard */}
          <div
            style={{
              marginBottom: "1rem",
              borderTop: "1px solid #1f2937",
              paddingTop: "0.75rem",
            }}
          >
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "0.5rem",
                marginBottom: "0.5rem",
              }}
            >
              <h2 style={{ margin: 0 }}>Scoreboard</h2>

              <div style={{ fontSize: "0.8rem" }}>
                <span style={{ marginRight: "0.5rem" }}>Scoring:</span>
                <button
                  type="button"
                  onClick={() => setScoreMode("rating")}
                  style={{
                    padding: "0.25rem 0.5rem",
                    borderRadius: "999px",
                    border: "1px solid #1f2937",
                    background:
                      scoreMode === "rating" ? "#111827" : "transparent",
                    color: "#e5e7eb",
                    marginRight: "0.25rem",
                    cursor: "pointer",
                    fontSize: "0.75rem",
                  }}
                >
                  Rating
                </button>
                <button
                  type="button"
                  onClick={() => setScoreMode("count")}
                  style={{
                    padding: "0.25rem 0.5rem",
                    borderRadius: "999px",
                    border: "1px solid #1f2937",
                    background:
                      scoreMode === "count" ? "#111827" : "transparent",
                    color: "#e5e7eb",
                    marginRight: "0.25rem",
                    cursor: "pointer",
                    fontSize: "0.75rem",
                  }}
                >
                  Count
                </button>
                <button
                  type="button"
                  onClick={() => setScoreMode("knockout")}
                  style={{
                    padding: "0.25rem 0.5rem",
                    borderRadius: "999px",
                    border: "1px solid #1f2937",
                    background:
                      scoreMode === "knockout" ? "#111827" : "transparent",
                    color: "#e5e7eb",
                    cursor: "pointer",
                    fontSize: "0.75rem",
                  }}
                >
                  Knockout
                </button>
              </div>
            </div>

            <p className="small" style={{ marginBottom: "0.5rem" }}>
              {scoreModeLabel}
            </p>

            {scoreboard.length === 0 ? (
              <p className="small">No solves yet.</p>
            ) : (
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: "0.9rem",
                }}
              >
                <thead>
                  <tr>
                    <th
                      style={{
                        textAlign: "left",
                        padding: "0.25rem 0.5rem",
                        borderBottom: "1px solid #1f2937",
                      }}
                    >
                      Player
                    </th>
                    <th
                      style={{
                        textAlign: "center",
                        padding: "0.25rem 0.5rem",
                        borderBottom: "1px solid #1f2937",
                      }}
                    >
                      Score
                    </th>
                    <th
                      style={{
                        textAlign: "center",
                        padding: "0.25rem 0.5rem",
                        borderBottom: "1px solid #1f2937",
                      }}
                    >
                      Solved
                    </th>
                    <th
                      style={{
                        textAlign: "center",
                        padding: "0.25rem 0.5rem",
                        borderBottom: "1px solid #1f2937",
                      }}
                    >
                      Total time
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {scoreboard.map((row) => (
                    <tr
                      key={row.handle}
                      style={{
                        backgroundColor:
                          row.handle === leaderHandle && row.score > 0
                            ? "rgba(56,189,248,0.08)"
                            : "transparent",
                      }}
                    >
                      <td
                        style={{
                          padding: "0.25rem 0.5rem",
                          borderBottom: "1px solid #1f2937",
                        }}
                      >
                        {row.handle}
                        {row.handle === leaderHandle && row.score > 0 && (
                          <span style={{ marginLeft: "0.3rem" }}>🏆</span>
                        )}
                      </td>
                      <td
                        style={{
                          textAlign: "center",
                          padding: "0.25rem 0.5rem",
                          borderBottom: "1px solid #1f2937",
                        }}
                      >
                        {row.score}
                      </td>
                      <td
                        style={{
                          textAlign: "center",
                          padding: "0.25rem 0.5rem",
                          borderBottom: "1px solid #1f2937",
                        }}
                      >
                        {row.solvedCount}
                      </td>
                      <td
                        style={{
                          textAlign: "center",
                          padding: "0.25rem 0.5rem",
                          borderBottom: "1px solid #1f2937",
                        }}
                      >
                        {row.solvedCount > 0
                          ? formatTime(row.totalTime)
                          : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <p className="small">
            Share this room code with your friend: <strong>{roomCode}</strong>
          </p>

          <div style={{ marginTop: "0.5rem", marginBottom: "0.5rem" }}>
            <button
              className="btn-secondary"
              onClick={handleRematch}
              disabled={rematchLoading}
            >
              {rematchLoading ? "Creating rematch..." : "Rematch (same settings)"}
            </button>
          </div>

          {/* Problems */}
          <div className="problem-list">
            <h2>Problems</h2>
            {room.problems.map((p) => {
              const s1 = getSolveInfo(h1, p.key);
              const s2 = getSolveInfo(h2, p.key);

              const pRecentlySolvedBy1 = isRecentlySolved(h1, p.key);
              const pRecentlySolvedBy2 = isRecentlySolved(h2, p.key);

              return (
                <div
                  key={p.key}
                  className="problem-item"
                  style={{
                    background:
                      pRecentlySolvedBy1 || pRecentlySolvedBy2
                        ? "rgba(34,197,94,0.08)"
                        : "transparent",
                  }}
                >
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
                  </div>
                  <div style={{ textAlign: "right", fontSize: "0.8rem" }}>
                    <div>
                      {h1}:{" "}
                      {s1 ? (
                        <span className="solved">
                          solved at {formatTime(s1.timeFromStartSec)}
                          {pRecentlySolvedBy1 && " ★"}
                        </span>
                      ) : (
                        <span className="not-solved">not solved</span>
                      )}
                    </div>
                    <div>
                      {h2}:{" "}
                      {s2 ? (
                        <span className="solved">
                          solved at {formatTime(s2.timeFromStartSec)}
                          {pRecentlySolvedBy2 && " ★"}
                        </span>
                      ) : (
                        <span className="not-solved">not solved</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: "1rem" }}>
            <Link to="/" className="small">
              ← Create another room
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
