import { useEffect, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { joinRoom, startRoom, refreshSolves, getRoomStatus } from "../api";

export default function RoomPage() {
  const { code } = useParams();
  const roomCode = (code || "").toUpperCase();

  const [room, setRoom] = useState(null);
  const [solves, setSolves] = useState(null);
  const [loading, setLoading] = useState(true);
  const [startLoading, setStartLoading] = useState(false);
  const [refreshLoading, setRefreshLoading] = useState(false);
  const [error, setError] = useState("");

  const loadRoom = useCallback(async () => {
    setError("");
    setLoading(true);
    try {
      const data = await joinRoom(roomCode);
      setRoom(data.room);
      setSolves(data.solves);
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

  const handleRefresh = async () => {
    setRefreshLoading(true);
    setError("");
    try {
      const data = await refreshSolves(roomCode);
      setRoom(data.room);
      setSolves(data.solves);
    } catch (err) {
      console.error(err);
      if (err.response && err.response.data) {
        setError(err.response.data.error || "Failed to refresh solves.");
      } else {
        setError("Failed to refresh solves.");
      }
    } finally {
      setRefreshLoading(false);
    }
  };

  const isStarted = room && room.startTime;

  const formatTime = (sec) => {
    if (sec == null) return "-";
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}m ${s}s`;
  };

  const getSolveInfo = (handle, key) => {
    if (!solves || !solves[handle]) return null;
    return solves[handle][key] || null;
  };

  const [h1, h2] = room ? [room.handle1, room.handle2] : ["", ""];

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

          <div style={{ marginTop: "0.75rem", marginBottom: "0.75rem" }}>
            {!isStarted ? (
              <button
                className="btn-primary"
                onClick={handleStart}
                disabled={startLoading}
              >
                {startLoading ? "Starting..." : "Start duel"}
              </button>
            ) : (
              <span className="badge">
                Started at: {new Date(room.startTime).toLocaleTimeString()}
              </span>
            )}

            <button
              className="btn-secondary"
              style={{ marginLeft: "0.75rem" }}
              onClick={handleRefresh}
              disabled={refreshLoading}
            >
              {refreshLoading ? "Refreshing..." : "Refresh solves"}
            </button>
          </div>

          <p className="small">
            Share this room code with your friend: <strong>{roomCode}</strong>
          </p>

          <div className="problem-list">
            <h2>Problems</h2>
            {room.problems.map((p) => {
              const s1 = getSolveInfo(h1, p.key);
              const s2 = getSolveInfo(h2, p.key);

              return (
                <div key={p.key} className="problem-item">
                  <div>
                    <div>
                      {p.contestId}{p.index} – {p.name}
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
