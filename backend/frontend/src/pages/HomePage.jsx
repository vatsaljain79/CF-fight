import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createRoom, createSoloSet } from "../api";

// Codeforces tag list
const TAG_OPTIONS = [
  "2-sat",
  "binary search",
  "bitmasks",
  "brute force",
  "chinese remainder theorem",
  "combinatorics",
  "constructive algorithms",
  "data structures",
  "dfs and similar",
  "divide and conquer",
  "dp",
  "dsu",
  "expression parsing",
  "fft",
  "flows",
  "games",
  "geometry",
  "graph matchings",
  "graphs",
  "greedy",
  "hashing",
  "implementation",
  "interactive",
  "math",
  "matrices",
  "meet-in-the-middle",
  "number theory",
  "probabilities",
  "schedules",
  "shortest paths",
  "sortings",
  "string suffix structures",
  "strings",
  "ternary search",
  "trees",
  "two pointers",
].sort((a, b) => a.localeCompare(b));

export default function HomePage() {
  const navigate = useNavigate();

  // Duel settings
  const [handle1, setHandle1] = useState("");
  const [handle2, setHandle2] = useState("");
  const [ratingMin, setRatingMin] = useState(800);
  const [ratingMax, setRatingMax] = useState(2400);
  const [numProblems, setNumProblems] = useState(6);

  const [createError, setCreateError] = useState("");
  const [loadingCreate, setLoadingCreate] = useState(false);

  // Solo settings
  const [soloLoading, setSoloLoading] = useState(false);
  const [soloError, setSoloError] = useState("");

  // Tag filters
  const [includeTags, setIncludeTags] = useState([]);
  const [excludeTags, setExcludeTags] = useState([]);
  const [includeOpen, setIncludeOpen] = useState(false);
  const [excludeOpen, setExcludeOpen] = useState(false);

  // Join room
  const [joinCode, setJoinCode] = useState("");
  const [joinError, setJoinError] = useState("");
  const [loadingJoin, setLoadingJoin] = useState(false);

  // Filtered options so the same tag can't be in include + exclude
  const includeOptions = TAG_OPTIONS.filter((t) => !excludeTags.includes(t));
  const excludeOptions = TAG_OPTIONS.filter((t) => !includeTags.includes(t));

  const toggleIncludeTag = (tag) => {
    setIncludeTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
    setExcludeTags((prev) => prev.filter((t) => t !== tag));
  };

  const toggleExcludeTag = (tag) => {
    setExcludeTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
    setIncludeTags((prev) => prev.filter((t) => t !== tag));
  };

  const onCreateSubmit = async (e) => {
    e.preventDefault();
    setCreateError("");

    if (!handle1 || !handle2) {
      setCreateError("Both handles are required.");
      return;
    }

    setLoadingCreate(true);
    try {
      const payload = {
        handle1: handle1.trim(),
        handle2: handle2.trim(),
        ratingMin: Number(ratingMin),
        ratingMax: Number(ratingMax),
        numProblems: Number(numProblems),
        includeTags,
        excludeTags,
      };
      const data = await createRoom(payload);
      navigate(`/room/${data.roomCode}`);
    } catch (err) {
      setCreateError("Failed to create room.");
    } finally {
      setLoadingCreate(false);
    }
  };

  const onSoloSubmit = async (e) => {
    e.preventDefault();
    setSoloError("");

    const h1 = handle1.trim();
    if (!h1) {
      setSoloError("Player 1 handle required for solo practice.");
      return;
    }

    setSoloLoading(true);
    try {
      const payload = {
        handle: h1,
        ratingMin: Number(ratingMin),
        ratingMax: Number(ratingMax),
        numProblems: Number(numProblems),
        includeTags,
        excludeTags,
      };
      const data = await createSoloSet(payload);
      navigate("/solo", { state: data });
    } catch (err) {
      setSoloError("Failed to create solo practice set.");
    } finally {
      setSoloLoading(false);
    }
  };

  const onJoinSubmit = (e) => {
    e.preventDefault();
    setJoinError("");

    const code = joinCode.trim().toUpperCase();
    if (!code) {
      setJoinError("Room code required.");
      return;
    }

    setLoadingJoin(true);
    // We just navigate — RoomPage will fetch the room
    navigate(`/room/${code}`);
  };

  const renderTagPills = (tags, toggleFn) => (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: "0.4rem",
        maxHeight: "160px",
        overflowY: "auto",
        paddingTop: "0.3rem",
      }}
    >
      {tags.length === 0 && (
        <span className="small" style={{ opacity: 0.7 }}>
          No tags
        </span>
      )}
      {tags.map((tag) => (
        <button
          key={tag}
          type="button"
          onClick={() => toggleFn(tag)}
          style={{
            borderRadius: "999px",
            padding: "0.15rem 0.6rem",
            border: "1px solid #374151",
            fontSize: "0.8rem",
            cursor: "pointer",
            background:
              includeTags.includes(tag) || excludeTags.includes(tag)
                ? "#111827"
                : "transparent",
            color: "#e5e7eb",
          }}
        >
          {tag}
        </button>
      ))}
    </div>
  );

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
          maxWidth: "1100px",
          padding: "0 20px",
          display: "flex",
          gap: "1.75rem",
          flexWrap: "wrap",
          justifyContent: "center",
          alignItems: "flex-start",
        }}
      >
        {/* CREATE ROOM CARD */}
        <div className="card" style={{ flex: 1, minWidth: "340px" }}>
          <h1>Create a CodeForces Fight</h1>
          <p className="small">
            Enter two Codeforces handles. We'll generate unsolved problems for a
            fair fight.
          </p>

          <form onSubmit={onCreateSubmit}>
            <div className="form-row">
              <label>
                Player 1 handle
                <input
                  value={handle1}
                  onChange={(e) => setHandle1(e.target.value)}
                  placeholder="e.g. vatsal_jain_123"
                />
              </label>
            </div>

            <div className="form-row">
              <label>
                Player 2 handle
                <input
                  value={handle2}
                  onChange={(e) => setHandle2(e.target.value)}
                  placeholder="friend_handle"
                />
              </label>
            </div>

            <div className="form-row">
              <label>
                Rating min
                <input
                  type="number"
                  value={ratingMin}
                  onChange={(e) => setRatingMin(e.target.value)}
                />
              </label>
              <label>
                Rating max
                <input
                  type="number"
                  value={ratingMax}
                  onChange={(e) => setRatingMax(e.target.value)}
                />
              </label>
            </div>

            <div className="form-row">
              <label>
                Number of problems (max 7)
                <input
                  type="number"
                  value={numProblems}
                  onChange={(e) => setNumProblems(e.target.value)}
                />
              </label>
            </div>

            {/* Include Tags */}
            <div className="form-row" style={{ flexDirection: "column" }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setIncludeOpen(!includeOpen)}
                style={{
                  justifyContent: "space-between",
                  display: "flex",
                }}
              >
                <span>
                  Include tags{" "}
                  {includeTags.length > 0 && `(${includeTags.join(", ")})`}
                </span>
                <span>{includeOpen ? "▲" : "▼"}</span>
              </button>
              {includeOpen && renderTagPills(includeOptions, toggleIncludeTag)}
            </div>

            {/* Exclude Tags */}
            <div className="form-row" style={{ flexDirection: "column" }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setExcludeOpen(!excludeOpen)}
                style={{
                  justifyContent: "space-between",
                  display: "flex",
                }}
              >
                <span>
                  Exclude tags{" "}
                  {excludeTags.length > 0 && `(${excludeTags.join(", ")})`}
                </span>
                <span>{excludeOpen ? "▲" : "▼"}</span>
              </button>
              {excludeOpen && renderTagPills(excludeOptions, toggleExcludeTag)}
            </div>

            {createError && <div className="error-text">{createError}</div>}

            <button
              type="submit"
              className="btn-primary"
              disabled={loadingCreate}
            >
              {loadingCreate ? "Creating..." : "Create room"}
            </button>

            {/* SOLO PRACTICE */}
            <div
              style={{
                marginTop: "1rem",
                borderTop: "1px solid #1f2937",
                paddingTop: "1rem",
              }}
            >
              <button
                type="button"
                className="btn-secondary"
                disabled={soloLoading}
                onClick={onSoloSubmit}
              >
                {soloLoading ? "Preparing solo set..." : "Start Solo Practice"}
              </button>
              {soloError && <div className="error-text">{soloError}</div>}
            </div>
          </form>
        </div>

        {/* JOIN ROOM CARD */}
        <div className="card" style={{ flex: 1, minWidth: "320px" }}>
          <h2>Join an existing room</h2>
          <p className="small">
            If your friend already created a room, enter the room code they
            shared with you.
          </p>

          <form onSubmit={onJoinSubmit}>
            <div className="form-row">
              <label>
                Room code
                <input
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  placeholder="e.g. CIP9TN"
                />
              </label>
            </div>

            {joinError && <div className="error-text">{joinError}</div>}

            <button
              type="submit"
              className="btn-secondary"
              disabled={loadingJoin}
            >
              {loadingJoin ? "Joining..." : "Join room"}
            </button>
          </form>
        </div>
      </div>
      
    </div>
  );
}
