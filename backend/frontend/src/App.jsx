// src/App.jsx
import Navbar from "./components/Navbar";
import { Routes, Route } from "react-router-dom";
import HomePage from "./pages/HomePage";
import RoomPage from "./pages/RoomPage";
import SoloPage from "./pages/SoloPage";

export default function App() {
  return (
    <>
      <Navbar />

      <div style={{ paddingTop: "70px" }}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/room/:code" element={<RoomPage />} />
          <Route path="/solo" element={<SoloPage />} />
        </Routes>
      </div>
    </>
  );
}
