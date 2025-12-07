import axios from "axios";

// const api = axios.create({
//   baseURL: "https://cf-fight.onrender.com",
// });

const api = axios.create({
  baseURL: "http://localhost:4000",
});

export async function createRoom(payload) {
  const res = await api.post("/api/create-room", payload);
  return res.data;
}

export async function joinRoom(roomCode) {
  const res = await api.post("/api/join-room", { roomCode });
  return res.data;
}

export async function startRoom(roomCode) {
  const res = await api.post("/api/start-room", { roomCode });
  return res.data;
}

export async function refreshSolves(roomCode) {
  const res = await api.post(`/api/room/${roomCode}/refresh-solves`);
  return res.data;
}

export async function getRoomStatus(roomCode) {
  const res = await api.get(`/api/room/${roomCode}/status`);
  return res.data;
}

export async function createSoloSet(payload) {
  const res = await api.post("/api/solo-set", payload);
  return res.data;
}

export async function refreshSolo(sessionId) {
  const res = await api.post("/api/solo-refresh", { sessionId });
  return res.data;
}

