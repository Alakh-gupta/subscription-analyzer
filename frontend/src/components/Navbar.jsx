import { Link, useNavigate, useLocation } from "react-router-dom";

export default function Navbar({ isAuthenticated, setIsAuthenticated, dashboardView, toggleDashboardView }) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    setIsAuthenticated(false);
    navigate("/");
  };

  const isDashboardRoute = location.pathname === "/dashboard";

  const handleDashboardClick = (e) => {
    if (isDashboardRoute) {
      e.preventDefault();
      toggleDashboardView();
    }
  };

  // Map view modes to clean labels and styling colors
  const viewStyles = {
    grid: { label: "Grid Mode 🎴", color: "text-blue-400 border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20" },
    analyze: { label: "Analyze Mode 📈", color: "text-purple-400 border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20" },
    all: { label: "All Mode 🌟", color: "text-amber-400 border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20" }
  };

  const currentView = viewStyles[dashboardView] || { label: "Grid", color: "" };

  return (
    <nav className="bg-slate-900 border-b border-slate-800 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <span className="text-2xl animate-pulse">📊</span>
            <Link to="/" className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
              SubAnalyzer
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/" className="text-slate-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors">
              Home
            </Link>
            {isAuthenticated ? (
              <>
                <Link 
                  to="/dashboard" 
                  onClick={handleDashboardClick}
                  title="Click to toggle between Card, List, and Analytics views!"
                  className="text-slate-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 group cursor-pointer"
                >
                  <span>Dashboard</span>
                  <span className={`text-[11px] border px-2 py-0.5 rounded-full font-semibold transition-all shadow-sm ${currentView.color}`}>
                    {currentView.label}
                  </span>
                </Link>
                <button 
                  onClick={handleLogout}
                  className="bg-slate-800 hover:bg-slate-700 text-rose-400 px-4 py-2 rounded-lg text-sm font-medium transition-all border border-slate-700 hover:border-rose-500/30 hover:text-rose-300"
                >
                  Logout
                </button>
              </>
            ) : (
              <Link 
                to="/login" 
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-lg hover:shadow-blue-500/25"
              >
                Login
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
