import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createRoom } from "../api";

export default function HomePage() {
  const navigate = useNavigate();

  // Create room state
  const [handle1, setHandle1] = useState("");
  const [handle2, setHandle2] = useState("");
  const [ratingMin, setRatingMin] = useState(800);
  const [ratingMax, setRatingMax] = useState(2400);
  const [numProblems, setNumProblems] = useState(6);
  const [loadingCreate, setLoadingCreate] = useState(false);
  const [createError, setCreateError] = useState("");

  // Join room state
  const [joinCode, setJoinCode] = useState("");
  const [loadingJoin, setLoadingJoin] = useState(false);
  const [joinError, setJoinError] = useState("");

  const onCreateSubmit = async (e) => {
    e.preventDefault();
    setCreateError("");
    if (!handle1 || !handle2) {
      setCreateError("Both Codeforces handles are required.");
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
      };
      const data = await createRoom(payload);
      navigate(`/room/${data.roomCode}`);
    } catch (err) {
      console.error(err);
      if (err.response && err.response.data) {
        setCreateError(err.response.data.error || "Failed to create room.");
      } else {
        setCreateError("Failed to create room.");
      }
    } finally {
      setLoadingCreate(false);
    }
  };

  const onJoinSubmit = async (e) => {
    e.preventDefault();
    setJoinError("");
    const code = joinCode.trim().toUpperCase();
    if (!code) {
      setJoinError("Room code is required.");
      return;
    }

    // We don't even need to call backend here – RoomPage will do /join-room
    setLoadingJoin(true);
    try {
      navigate(`/room/${code}`);
    } finally {
      setLoadingJoin(false);
    }
  };

  return (
    <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap", maxWidth: "1100px" }}>
      {/* Create room card */}
      <div className="card" style={{ flex: 1, minWidth: "320px" }}>
        <h1>Create a CF Fight</h1>
        <p className="small">
          Enter two Codeforces handles. We&apos;ll generate unsolved problems for a fair fight.
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
                min={800}
                max={3500}
              />
            </label>
            <label>
              Rating max
              <input
                type="number"
                value={ratingMax}
                onChange={(e) => setRatingMax(e.target.value)}
                min={800}
                max={3500}
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
                min={1}
                max={7}
              />
            </label>
          </div>

          {createError && <div className="error-text">{createError}</div>}

          <div style={{ marginTop: "1rem" }}>
            <button
              type="submit"
              className="btn-primary"
              disabled={loadingCreate}
            >
              {loadingCreate ? "Creating..." : "Create room"}
            </button>
          </div>
        </form>
      </div>

      {/* Join room card */}
      <div className="card" style={{ flex: 1, minWidth: "260px" }}>
        <h2>Join an existing room</h2>
        <p className="small">
          If your friend already created a room, enter the room code they shared with you.
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

          <div style={{ marginTop: "1rem" }}>
            <button
              type="submit"
              className="btn-secondary"
              disabled={loadingJoin}
            >
              {loadingJoin ? "Joining..." : "Join room"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
