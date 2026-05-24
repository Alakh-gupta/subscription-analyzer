import { useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Navbar from "./components/Navbar";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [dashboardView, setDashboardView] = useState("grid");

  const toggleDashboardView = () => {
    setDashboardView((prev) => {
      if (prev === "grid") return "analyze";
      if (prev === "analyze") return "all";
      return "grid";
    });
  };

  return (
    <Router>
      <div className="min-h-screen bg-slate-900 text-slate-100 font-sans selection:bg-blue-500/30">
        <Navbar 
          isAuthenticated={isAuthenticated} 
          setIsAuthenticated={setIsAuthenticated} 
          dashboardView={dashboardView}
          toggleDashboardView={toggleDashboardView}
        />
        <main>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route 
              path="/login" 
              element={<Login setIsAuthenticated={setIsAuthenticated} />} 
            />
            <Route 
              path="/dashboard" 
              element={
                isAuthenticated ? (
                  <Dashboard dashboardView={dashboardView} setDashboardView={setDashboardView} />
                ) : (
                  <Navigate to="/login" replace />
                )
              } 
            />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;