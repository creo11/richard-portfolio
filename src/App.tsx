import "./App.css";

import { BrowserRouter, Routes, Route } from "react-router-dom";

import HomeParticleBackground from "./components/threejs/HomeParticleBackground/homeParticleBackground";
import DartSync from "./pages/DartSync/DartSync";

function PortfolioHome() {
  return (
    <>
      <HomeParticleBackground />
      <main className="portfolio-page"></main>
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<PortfolioHome />} />
        <Route path="/dartsync" element={<DartSync />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;