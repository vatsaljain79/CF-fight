const express = require("express");
const cors = require("cors");
require("dotenv").config();

const {
  validateHandle,
  getUserSolvedSet,
  getUserInfo,
  getProblemset,
  getUserSubmissions,
} = require("./cfApi");

const app = express();

app.use(cors());
app.use(express.json());

// ========== In-memory rooms ==========
const rooms = new Map(); // roomCode -> roomObject
// roomCode -> { [handle]: { [problemKey]: { solvedAt: string, timeFromStartSec: number } } }
const roomSolves = new Map();

function initRoomSolves(room) {
  const { code, handle1, handle2, problems } = room;
  const byHandle = {};
  byHandle[handle1] = {};
  byHandle[handle2] = {};

  for (const p of problems) {
    byHandle[handle1][p.key] = null;
    byHandle[handle2][p.key] = null;
  }

  roomSolves.set(code, byHandle);
}
function computeTimeFromStart(startTimeIso, solvedAtIso) {
  if (!startTimeIso || !solvedAtIso) return null;
  const start = new Date(startTimeIso).getTime();
  const solved = new Date(solvedAtIso).getTime();
  if (isNaN(start) || isNaN(solved)) return null;
  return Math.max(0, Math.round((solved - start) / 1000)); // seconds
}
/**
 * Refresh solve status for all problems in a room by checking CF submissions
 * after the room's startTime.
 */
async function refreshSolvesForRoom(roomCode) {
  const room = rooms.get(roomCode);
  if (!room) {
    throw new Error("Room not found");
  }
  if (!room.startTime) {
    // contest not started yet
    return roomSolves.get(roomCode) || {};
  }

  const startTimeIso = room.startTime;
  const solves = roomSolves.get(roomCode) || {};
  const handles = [room.handle1, room.handle2];

  // keys of problems in this room
  const problemKeySet = new Set(room.problems.map((p) => p.key));

  for (const handle of handles) {
    // ensure structure
    if (!solves[handle]) {
      solves[handle] = {};
      for (const p of room.problems) {
        if (!solves[handle][p.key]) {
          solves[handle][p.key] = null;
        }
      }
    }

    const handleSolves = solves[handle];

    // get recent submissions (you can tune count later if needed)
    const submissions = await getUserSubmissions(handle, 1000);

    for (const sub of submissions) {
      if (
        sub.verdict !== "OK" ||
        !sub.problem ||
        !sub.problem.contestId ||
        !sub.problem.index
      ) {
        continue;
      }

      const key = `${sub.problem.contestId}-${sub.problem.index}`;
      if (!problemKeySet.has(key)) continue; // not part of this room

      // already recorded for this problem & handle
      if (handleSolves[key]) continue;

      // CF gives creationTimeSeconds (unix timestamp)
      const solvedAtIso = new Date(
        sub.creationTimeSeconds * 1000
      ).toISOString();

      const timeFromStartSec = computeTimeFromStart(
        startTimeIso,
        solvedAtIso
      );

      // If solved before contest start, ignore
      if (timeFromStartSec === null || timeFromStartSec < 0) continue;

      handleSolves[key] = {
        solvedAt: solvedAtIso,
        timeFromStartSec,
      };
    }

    solves[handle] = handleSolves;
  }

  roomSolves.set(roomCode, solves);
  return solves;
}



function generateRoomCode(length = 6) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < length; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function buildProblemListWithStats(problemset) {
  const { problems, problemStatistics } = problemset;

  const statsByKey = new Map();
  for (const stat of problemStatistics) {
    const key = `${stat.contestId}-${stat.index}`;
    statsByKey.set(key, stat);
  }

  const list = [];
  for (const p of problems) {
    if (!p.contestId || !p.index) continue;
    const key = `${p.contestId}-${p.index}`;
    const stat = statsByKey.get(key);
    const solvedCount = stat ? stat.solvedCount : 0;

    list.push({
      key,
      contestId: p.contestId,
      index: p.index,
      name: p.name,
      rating: p.rating || null,
      tags: p.tags || [],
      solvedCount,
    });
  }

  return list;
}

async function generateProblemsForRoom({
  handle1,
  handle2,
  ratingMin,
  ratingMax,
  numProblems,
}) {
  const [problemset, solved1, solved2] = await Promise.all([
    getProblemset(),
    getUserSolvedSet(handle1),
    getUserSolvedSet(handle2),
  ]);

  const allProblems = buildProblemListWithStats(problemset);

  const filtered = allProblems.filter(
    (p) =>
      p.rating !== null && p.rating >= ratingMin && p.rating <= ratingMax
  );

  if (filtered.length === 0) return [];

  const selected = [];
  const selectedKeys = new Set();

  const totalRange = ratingMax - ratingMin + 1;
  const step = totalRange / numProblems;

  for (let i = 0; i < numProblems; i++) {
    const bandStart = Math.round(ratingMin + i * step);
    const bandEnd =
      i === numProblems - 1
        ? ratingMax
        : Math.round(ratingMin + (i + 1) * step - 1);

    const candidates = filtered
      .filter(
        (p) =>
          p.rating >= bandStart &&
          p.rating <= bandEnd &&
          !solved1.has(p.key) &&
          !solved2.has(p.key) &&
          !selectedKeys.has(p.key)
      )
      .sort((a, b) => b.solvedCount - a.solvedCount);

    if (candidates.length === 0) continue;

    const chosen = candidates[0];
    selected.push({
      key: chosen.key,
      contestId: chosen.contestId,
      index: chosen.index,
      name: chosen.name,
      rating: chosen.rating,
      solvedCount: chosen.solvedCount,
      bandStart,
      bandEnd,
    });
    selectedKeys.add(chosen.key);
  }

  return selected;
}

// ========== Routes ==========

// Health
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "CF Fight backend running" });
});

// Validate handle
app.get("/api/cf/validate-handle", async (req, res) => {
  const { handle } = req.query;
  if (!handle) {
    return res.status(400).json({ error: "Missing handle" });
  }

  try {
    const result = await validateHandle(handle);
    if (!result.valid) {
      return res.status(400).json({ valid: false, error: result.error });
    }
    res.json({
      valid: true,
      handle,
      rating: result.info.rating || null,
      rank: result.info.rank || null,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal error while validating handle" });
  }
});

// Debug: solved problems
app.get("/api/cf/solved", async (req, res) => {
  const { handle } = req.query;
  if (!handle) {
    return res.status(400).json({ error: "Missing handle" });
  }

  try {
    const solvedSet = await getUserSolvedSet(handle);
    res.json({
      handle,
      solvedCount: solvedSet.size,
      solved: Array.from(solvedSet),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal error while fetching solved problems" });
  }
});

// ✅ Create room
app.post("/api/create-room", async (req, res) => {
  try {
    const {
      handle1,
      handle2,
      ratingMin: rMin,
      ratingMax: rMax,
      numProblems: nQ,
    } = req.body || {};

    if (!handle1 || !handle2) {
      return res.status(400).json({ error: "Both handles are required" });
    }

    let ratingMin = parseInt(rMin, 10);
    let ratingMax = parseInt(rMax, 10);
    let numProblems = parseInt(nQ, 10);

    if (isNaN(ratingMin)) ratingMin = 800;
    if (isNaN(ratingMax)) ratingMax = 2400;
    if (ratingMin < 800) ratingMin = 800;
    if (ratingMax > 3500) ratingMax = 3500;
    if (ratingMin > ratingMax) [ratingMin, ratingMax] = [ratingMax, ratingMin];

    if (isNaN(numProblems)) numProblems = 6;
    if (numProblems < 1) numProblems = 1;
    if (numProblems > 7) numProblems = 7;

    const [vh1, vh2] = await Promise.all([
      validateHandle(handle1),
      validateHandle(handle2),
    ]);

    const errors = [];
    if (!vh1.valid) errors.push(`Invalid handle1: ${vh1.error}`);
    if (!vh2.valid) errors.push(`Invalid handle2: ${vh2.error}`);

    if (errors.length > 0) {
      return res.status(400).json({ error: "Invalid handles", details: errors });
    }

    const problems = await generateProblemsForRoom({
      handle1,
      handle2,
      ratingMin,
      ratingMax,
      numProblems,
    });

    if (!problems || problems.length === 0) {
      return res.status(400).json({
        error:
          "Could not find suitable unsolved problems for both users in this rating range.",
      });
    }

    const roomCode = generateRoomCode();
    const now = new Date();

    const room = {
      code: roomCode,
      handle1,
      handle2,
      ratingMin,
      ratingMax,
      numProblems: problems.length,
      problems,
      createdAt: now.toISOString(),
      startTime: null,
    };

    rooms.set(roomCode, room);
    initRoomSolves(room);


    res.json({
      roomCode,
      room,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal error while creating room" });
  }
});

// Join an existing room by code
app.post("/api/join-room", (req, res) => {
  const { roomCode } = req.body || {};
  if (!roomCode) {
    return res.status(400).json({ error: "roomCode is required" });
  }

  const code = roomCode.toUpperCase();
  const room = rooms.get(code);
  if (!room) {
    return res.status(404).json({ error: "Room not found" });
  }

  const solves = roomSolves.get(code) || {};

  res.json({
    roomCode: code,
    room,
    solves,
  });
});

// Start the contest (set startTime)
app.post("/api/start-room", (req, res) => {
  const { roomCode } = req.body || {};
  if (!roomCode) {
    return res.status(400).json({ error: "roomCode is required" });
  }

  const code = roomCode.toUpperCase();
  const room = rooms.get(code);
  if (!room) {
    return res.status(404).json({ error: "Room not found" });
  }

  if (!room.startTime) {
    room.startTime = new Date().toISOString();
    rooms.set(code, room);
  }

  const solves = roomSolves.get(code) || {};

  res.json({
    roomCode: code,
    room,
    solves,
  });
});

// Get current room status (room + solves)
app.get("/api/room/:code/status", (req, res) => {
  const code = (req.params.code || "").toUpperCase();
  const room = rooms.get(code);
  if (!room) {
    return res.status(404).json({ error: "Room not found" });
  }

  const solves = roomSolves.get(code) || {};
  res.json({
    roomCode: code,
    room,
    solves,
  });
});

// Refresh solves for a room and return updated status
app.post("/api/room/:code/refresh-solves", async (req, res) => {
  try {
    const code = (req.params.code || "").toUpperCase();
    const room = rooms.get(code);
    if (!room) {
      return res.status(404).json({ error: "Room not found" });
    }

    const solves = await refreshSolvesForRoom(code);

    res.json({
      roomCode: code,
      room,
      solves,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal error while refreshing solves" });
  }
});



// 404 must be last
app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`✅ Server listening on port ${PORT}`);
});
