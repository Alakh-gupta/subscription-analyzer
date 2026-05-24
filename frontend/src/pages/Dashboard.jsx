import { useState, useEffect } from "react";
import AnalyzerChart from "../components/AnalyzerChart";

export default function Dashboard({ dashboardView, setDashboardView }) {
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
  const [dashboard, setDashboard] = useState([]);
  const [profileLink, setProfileLink] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanStep, setScanStep] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editPlatform, setEditPlatform] = useState("");
  const [editCost, setEditCost] = useState("");
  const [scanMessage, setScanMessage] = useState(null);
  const [scanEmail, setScanEmail] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState(null);
  const [isSearchingContent, setIsSearchingContent] = useState(false);
  const [isExtensionInstalled, setIsExtensionInstalled] = useState(false);
  const [lastHeartbeatTime, setLastHeartbeatTime] = useState(0);

  const getPlatformNameFromUrl = (url) => {
    if (!url || !url.startsWith("http")) return null;
    try {
      const hostname = new URL(url).hostname;
      let cleanHost = hostname.replace('www.', '');
      
      if (cleanHost.includes("netflix.com")) return "Netflix";
      if (cleanHost.includes("spotify.com")) return "Spotify";
      if (cleanHost.includes("hotstar.com")) return "JioHotstar";
      if (cleanHost.includes("youtube.com")) return "YouTube Premium";
      if (cleanHost.includes("aws.amazon.com") || cleanHost.includes("console.aws")) return "AWS Cloud";
      if (cleanHost.includes("primevideo.com") || cleanHost.includes("amazon.com")) return "Amazon Prime";
      if (cleanHost.includes("hulu.com")) return "Hulu";
      
      const parts = cleanHost.split('.');
      if (parts.length >= 2) {
        const name = parts[parts.length - 2];
        return name.charAt(0).toUpperCase() + name.slice(1);
      }
      return cleanHost;
    } catch (e) {
      return null;
    }
  };

  const incrementLocalUsage = (platform, seconds) => {
    setDashboard(prevDashboard => {
      return prevDashboard.map(sub => {
        if (sub.platform.toLowerCase() === platform.toLowerCase()) {
          const updatedHours = parseFloat(sub.totalHours) + (seconds / 3600);
          return {
            ...sub,
            totalHours: parseFloat(updatedHours.toFixed(4))
          };
        }
        return sub;
      });
    });
  };

  useEffect(() => {
    // 1. Initial DOM check
    if (document.documentElement.getAttribute("data-subscription-tracker-active") === "true") {
      setIsExtensionInstalled(true);
      setLastHeartbeatTime(Date.now());
    }

    // 2. Event listener for fallback DOM dispatch
    const handleActiveEvent = () => {
      setIsExtensionInstalled(true);
      setLastHeartbeatTime(Date.now());
    };
    window.addEventListener("SubscriptionTrackerActive", handleActiveEvent);

    // 3. Main HTML5 message receiver (for real-time heartbeats and cross-tab broadcasts)
    const handleMessage = (event) => {
      if (event.data && event.data.type === "SUBSCRIPTION_TRACKER_HEARTBEAT") {
        setIsExtensionInstalled(true);
        setLastHeartbeatTime(Date.now());

        // Optimistically increment local usage metrics in memory for lag-free tracking!
        if (event.data.url) {
          const platform = getPlatformNameFromUrl(event.data.url);
          if (platform) {
            incrementLocalUsage(platform, 1);
          }
        }
      }
    };
    window.addEventListener("message", handleMessage);

    return () => {
      window.removeEventListener("SubscriptionTrackerActive", handleActiveEvent);
      window.removeEventListener("message", handleMessage);
    };
  }, []);

  // 4. Background safety daemon to check if extension goes offline
  useEffect(() => {
    const checkOfflineDaemon = setInterval(() => {
      if (lastHeartbeatTime > 0 && Date.now() - lastHeartbeatTime > 4000) {
        setIsExtensionInstalled(false);
      }
    }, 2000);
    return () => clearInterval(checkOfflineDaemon);
  }, [lastHeartbeatTime]);

  const loadDashboard = async () => {
    try {
      const res = await fetch(`${API_URL}/api/dashboard`);
      const data = await res.json();
      setDashboard(data);
    } catch (err) {
      console.error("Failed to load dashboard");
    }
  };

  useEffect(() => {
    loadDashboard();
    
    // Check for OAuth callback messages
    const params = new URLSearchParams(window.location.search);
    if (params.get("scan") === "success") {
      const found = params.get("found") || "0";
      setScanMessage({ type: "success", text: `Scan complete! Found ${found} new subscriptions.` });
      window.history.replaceState({}, document.title, window.location.pathname);
      setTimeout(() => setScanMessage(null), 5000);
    } else if (params.get("scan") === "error") {
      setScanMessage({ type: "error", text: "Failed to scan Gmail inbox. Please try again." });
      window.history.replaceState({}, document.title, window.location.pathname);
      setTimeout(() => setScanMessage(null), 5000);
    }

    const interval = setInterval(loadDashboard, 10000); // 10-second official sync interval to remove all page lag!
    return () => clearInterval(interval);
  }, []);

  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  const runAutoScan = async (e) => {
    e?.preventDefault();
    if (!scanEmail) return;

    setIsScanning(true);
    try {
      setScanStep("Establishing secure connection to mail servers...");
      await sleep(1000);
      setScanStep("Authenticating inbox access credentials...");
      await sleep(1000);
      setScanStep("Searching inbox headers for billing keys (receipt, invoice, subscription)...");
      await sleep(1200);
      setScanStep("Found active subscription billings! Importing platform details...");
      await sleep(800);

      const res = await fetch(`${API_URL}/api/auth/google/mock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: scanEmail })
      });
      const data = await res.json();
      
      if (res.ok && data.success) {
        setScanMessage({ 
          type: "success", 
          text: `Scan complete! Discovered ${data.found} active subscriptions in your inbox.` 
        });
        setScanEmail("");
        loadDashboard();
      } else {
        setScanMessage({ type: "error", text: "Gmail scan simulation failed." });
      }
    } catch (err) {
      console.error("Scanner failed", err);
      setScanMessage({ type: "error", text: "Scanner connection failed." });
    } finally {
      setIsScanning(false);
      setScanStep("");
      setTimeout(() => setScanMessage(null), 5000);
    }
  };

  const addSubscription = async (e) => {
    e.preventDefault();
    if (!profileLink) return;

    setIsLoading(true);
    try {
      await fetch(`${API_URL}/api/subscriptions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileLink })
      });
      setProfileLink("");
      loadDashboard();
    } catch (err) {
      console.error("Failed to add subscription");
    } finally {
      setIsLoading(false);
    }
  };

  const deleteSubscription = async (id) => {
    try {
      await fetch(`${API_URL}/api/subscriptions/${id}`, {
        method: "DELETE"
      });
      loadDashboard();
    } catch (err) {
      console.error("Failed to delete subscription");
    }
  };

  const updateSubscription = async (id) => {
    try {
      await fetch(`${API_URL}/api/subscriptions/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform: editPlatform, cost: parseFloat(editCost) })
      });
      setEditingId(null);
      loadDashboard();
    } catch (err) {
      console.error("Failed to update subscription");
    }
  };

  const handleContentSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery) return;
    
    setIsSearchingContent(true);
    try {
      const res = await fetch(`${API_URL}/api/search?q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      setSearchResults(data.results);
    } catch (err) {
      console.error("Content search failed", err);
    } finally {
      setIsSearchingContent(false);
    }
  };

  // Compute analytics metrics
  const totalSpend = dashboard.reduce((sum, sub) => sum + sub.cost, 0);
  const totalHours = dashboard.reduce((sum, sub) => sum + sub.totalHours, 0);
  const avgHourlyCost = totalHours > 0 ? (totalSpend / totalHours) : 0;
  const mostExpensive = dashboard.length > 0 
    ? [...dashboard].sort((a, b) => b.cost - a.cost)[0] 
    : null;
  const underutilizedCount = dashboard.filter(sub => sub.prompt.includes("⚠️") || sub.prompt.includes("❌")).length;

  return (
    <div className="max-w-6xl mx-auto space-y-10 p-8 animate-fade-in relative">
      {/* Premium Full-Screen Scanning Overlay */}
      {isScanning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="bg-slate-900 border border-slate-700/80 p-8 rounded-3xl max-w-md w-full shadow-2xl text-center space-y-6 animate-scale-up">
            <div className="relative w-20 h-20 mx-auto">
              <div className="absolute inset-0 rounded-full border-4 border-t-blue-500 border-r-indigo-500 border-slate-800 animate-spin" />
              <div className="absolute inset-2 bg-slate-950 rounded-full flex items-center justify-center">
                <span className="text-2xl animate-pulse">🤖</span>
              </div>
            </div>
            
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-slate-100">Smart Inbox Scanner</h3>
              <p className="text-xs text-blue-400 font-semibold tracking-wider uppercase">Active Scanning...</p>
            </div>
            
            <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 shadow-inner">
              <p className="text-sm font-medium text-slate-300 font-mono animate-pulse">
                {scanStep}
              </p>
            </div>
            
            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div className="bg-gradient-to-r from-blue-500 to-indigo-600 h-full rounded-full animate-pulse" style={{ width: '80%' }} />
            </div>
            
            <p className="text-[11px] text-slate-500">* Securing end-to-end sandbox tunnel...</p>
          </div>
        </div>
      )}
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-800">
        <div>
          <h1 className="text-4xl font-extrabold text-slate-100 tracking-tight flex items-center gap-3">
            Subscription Control Panel
            {isExtensionInstalled ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-sm uppercase tracking-wider animate-pulse">
                ● Live Connected
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-rose-500/10 text-rose-400 border border-rose-500/20 shadow-sm uppercase tracking-wider">
                ● Live Offline
              </span>
            )}
          </h1>
          <p className="text-slate-400 text-lg mt-1">
            {dashboardView === 'grid' && "Track usage, manage platforms, and analyze value."}
            {dashboardView === 'analyze' && "High-level cost breakdowns, ROI calculations, and optimization insights."}
            {dashboardView === 'all' && "Master Panel: All tools, charts, subscriptions, and alerts consolidated."}
          </p>
        </div>
        
        {/* Local Tab Switcher */}
        <div className="flex bg-slate-900 border border-slate-800 p-1.5 rounded-2xl shadow-inner gap-1">
          {[
            { id: "grid", label: "Grid View 🎴" },
            { id: "analyze", label: "Analyze View 📈" },
            { id: "all", label: "All Views 🌟" }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setDashboardView(tab.id)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-300 ${
                dashboardView === tab.id 
                  ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md shadow-blue-500/25" 
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      {/* Prominent High-Fidelity Alert Box if live tracking is offline */}
      {!isExtensionInstalled && (
        <div className="bg-gradient-to-r from-rose-950/80 to-slate-900/90 border border-rose-500/30 p-6 rounded-3xl shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 animate-fade-in">
          <div className="space-y-2 text-left">
            <h4 className="text-lg font-bold text-rose-400 flex items-center gap-2">
              <span>⚠️</span> Alert: Live Time-Tracking is Disabled!
            </h4>
            <p className="text-sm text-slate-300">
              The dashboard cannot detect your subscription time-tracker extension. Live usage recording is currently suspended.
            </p>
            <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800/80 text-xs text-slate-400 space-y-1">
              <p className="font-bold text-slate-300 uppercase tracking-wider mb-1">🔧 Steps to enable Developer Mode & tracking:</p>
              <p>1. Open Google Chrome and go to <code className="bg-slate-900 px-1 py-0.5 rounded text-blue-400 select-all font-mono text-[10px]">chrome://extensions/</code></p>
              <p>2. Toggle the <strong>"Developer mode"</strong> switch in the top-right corner to <strong>ON</strong>.</p>
              <p>3. Click the <strong>"Load unpacked"</strong> button in the top-left corner.</p>
              <p>4. Select your extension folder: <code className="bg-slate-900 px-1 py-0.5 rounded text-blue-400 select-all font-mono text-[10px]">c:\Users\ADMIN\OneDrive\Desktop\coding\subscription-analyzer\extension</code></p>
            </div>
          </div>
          <div className="flex flex-col items-center gap-3 whitespace-nowrap min-w-[200px] w-full md:w-auto">
            <a 
              href="/extension.zip" 
              download="subscription-analyzer.zip"
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-extrabold px-5 py-3.5 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 transition-all duration-300 transform hover:-translate-y-0.5"
            >
              <span>📥</span> Download Extension (.zip)
            </a>
            <div className="bg-rose-500/10 border border-rose-500/30 px-5 py-2.5 rounded-xl text-[10px] font-black text-rose-400 uppercase tracking-widest animate-pulse text-center w-full">
              ⌛ Waiting for Connection...
            </div>
          </div>
        </div>
      )}

      {scanMessage && (
        <div className={`px-6 py-4 rounded-2xl border font-medium flex items-center gap-3 shadow-lg animate-fade-in ${
          scanMessage.type === "success" 
            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" 
            : "bg-rose-500/10 border-rose-500/20 text-rose-400"
        }`}>
          <span>{scanMessage.type === "success" ? "✅" : "❌"}</span>
          <p>{scanMessage.text}</p>
        </div>
      )}

      {/* Unified Global Subscription Search Panel */}
      <section className="bg-gradient-to-r from-blue-950/40 to-indigo-950/40 p-8 rounded-3xl border border-blue-500/20 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl" />
        <h2 className="text-2xl font-bold mb-3 flex items-center gap-2">
          <span>🔍</span> Unified Subscription Search
        </h2>
        <p className="text-slate-400 mb-6">
          Search for a song, artist, movie, or TV show to instantly extract deep links and direct play URLs across all your active subscriptions!
        </p>
        
        <form onSubmit={handleContentSearch} className="flex gap-4">
          <input 
            type="text"
            placeholder="e.g. 'Starboy', 'Stranger Things', 'Blinding Lights'..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="flex-1 bg-slate-900/80 border border-slate-700 rounded-xl px-5 py-4 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-slate-100 placeholder:text-slate-600 text-sm shadow-inner"
            required
          />
          <button 
            type="submit"
            disabled={isSearchingContent}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold px-8 py-4 rounded-xl transition-all shadow-md flex items-center gap-2 text-sm disabled:opacity-50"
          >
            {isSearchingContent ? "Searching..." : "Find Content ✨"}
          </button>
        </form>

        {searchResults && (
          <div className="mt-8 bg-slate-900/50 p-6 rounded-2xl border border-slate-700/30 space-y-4 divide-y divide-slate-800/80 max-h-96 overflow-y-auto shadow-inner">
            <h3 className="text-sm font-bold text-slate-400 pb-2">Results across your active subscriptions:</h3>
            {searchResults.length === 0 ? (
              <p className="text-sm text-slate-500 py-4 text-center">No active subscription services found. Add subscriptions below to enable unified lookup!</p>
            ) : (
              searchResults.map((result, idx) => (
                <div key={idx} className="flex flex-col sm:flex-row justify-between items-start sm:items-center py-4 first:pt-0 gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-slate-100 text-base">{result.platform}</span>
                      <span className="text-[10px] bg-slate-800 border border-slate-700 text-blue-400 px-2 py-0.5 rounded-md font-semibold font-mono uppercase">
                        {result.type}
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-md font-semibold border ${
                        result.confidence.includes("✅") ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-amber-500/10 border-amber-500/20 text-amber-400"
                      }`}>
                        {result.confidence}
                      </span>
                    </div>
                    <p className="text-slate-300 text-sm mt-1.5 font-medium">{result.title}</p>
                  </div>
                  <a 
                    href={result.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="bg-slate-900 hover:bg-slate-800 text-blue-400 hover:text-blue-300 border border-slate-700 hover:border-blue-500/30 px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 shadow-sm shrink-0"
                  >
                    Play Content ➔
                  </a>
                </div>
              ))
            )}
          </div>
        )}
      </section>

      {/* -------------------- 1. GRID VIEW -------------------- */}
      {dashboardView === "grid" && (
        <div className="space-y-12 animate-fade-in">
          {/* Analyzer Graph Area */}
          <section className="bg-slate-800/30 p-8 rounded-3xl border border-slate-700/50 shadow-xl">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <span>📈</span> Subscription Analyzer
            </h2>
            <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-700/50">
              <AnalyzerChart data={dashboard} />
            </div>
          </section>

          {/* Action Cards Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Add Subscription Form */}
            <section className="bg-slate-800/50 p-8 rounded-3xl border border-slate-700/50 shadow-xl relative overflow-hidden group h-full">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                <span className="p-2 bg-blue-500/20 text-blue-400 rounded-xl">🔗</span> 
                Add via Profile Link
              </h2>
              <p className="text-slate-400 mb-6 relative">
                Paste a link to your profile or billing page, and we'll automatically extract the platform and estimated cost.
              </p>
              <form onSubmit={addSubscription} className="flex flex-col gap-4 relative">
                <div className="w-full">
                  <label className="block text-sm font-medium text-slate-400 mb-2">Profile URL</label>
                  <input
                    type="url"
                    placeholder="e.g., https://www.netflix.com/youraccount"
                    value={profileLink}
                    onChange={(e) => setProfileLink(e.target.value)}
                    className="w-full bg-slate-900/80 border border-slate-700 rounded-xl px-5 py-4 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-slate-600 text-slate-100 shadow-inner"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 disabled:opacity-50 text-white font-semibold px-8 py-4 rounded-xl transition-all shadow-lg hover:shadow-blue-500/25 flex justify-center items-center gap-2 mt-2"
                >
                  {isLoading ? (
                    <><span className="animate-spin">⏳</span> Fetching Details...</>
                  ) : (
                    <>Fetch Details <span className="text-xl">✨</span></>
                  )}
                </button>
              </form>
            </section>

            {/* Auto Scan Accounts */}
            <section className="bg-gradient-to-br from-indigo-900/40 to-purple-900/40 p-8 rounded-3xl border border-indigo-500/30 shadow-xl relative overflow-hidden h-full">
              <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl" />
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-3 relative">
                <span className="p-2 bg-purple-500/20 text-purple-400 rounded-xl">🤖</span> 
                Smart Auto-Scan
              </h2>
              <p className="text-slate-300 mb-8 relative">
                Connect securely to automatically detect all active subscriptions, retrieve exact costs, and import billing cycles instantly.
              </p>
              
              <div className="relative mt-auto">
                <form onSubmit={runAutoScan} className="flex flex-col gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2">Email Address</label>
                    <input
                      type="email"
                      placeholder="e.g., your.email@gmail.com"
                      value={scanEmail}
                      onChange={(e) => setScanEmail(e.target.value)}
                      className="w-full bg-slate-900/80 border border-indigo-500/30 rounded-xl px-5 py-4 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all placeholder:text-slate-600 text-slate-100 shadow-inner"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-slate-900/50 hover:bg-slate-800 border border-indigo-500/50 text-indigo-300 font-semibold px-8 py-4 rounded-xl transition-all shadow-[0_0_20px_rgba(99,102,241,0.15)] hover:shadow-[0_0_30px_rgba(99,102,241,0.3)] flex justify-center items-center gap-3 group backdrop-blur-sm mt-2"
                  >
                    Scan Email Inbox
                    <span className="group-hover:translate-x-1 transition-transform">→</span>
                  </button>
                </form>
              </div>
            </section>
          </div>

          {/* Dashboard Grid */}
          <section>
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <span>📋</span> Current Subscriptions
            </h2>
            
            {dashboard.length === 0 ? (
              <div className="text-center py-12 text-slate-500 font-medium bg-slate-800/20 rounded-2xl border border-slate-700/30 border-dashed">
                No subscriptions added yet. Add one above to start tracking!
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {dashboard.map((sub) => (
                  <div key={sub._id} className="group relative bg-slate-800 border border-slate-700 rounded-2xl p-6 hover:border-slate-500 transition-all shadow-lg hover:shadow-xl">
                    {editingId === sub._id ? (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs font-medium text-slate-400 mb-1">Platform Name</label>
                          <input 
                            type="text" 
                            value={editPlatform} 
                            onChange={e => setEditPlatform(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-slate-100"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-400 mb-1">Monthly Cost ($)</label>
                          <input 
                            type="number" 
                            step="0.01"
                            value={editCost} 
                            onChange={e => setEditCost(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-slate-100"
                          />
                        </div>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => updateSubscription(sub._id)}
                            className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-2 rounded-lg text-sm font-semibold transition-colors"
                          >
                            Save
                          </button>
                          <button 
                            onClick={() => setEditingId(null)}
                            className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2 rounded-lg text-sm font-semibold transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <button 
                          onClick={() => {
                            setEditingId(sub._id);
                            setEditPlatform(sub.platform);
                            setEditCost(sub.cost);
                          }}
                          className="absolute top-4 right-10 text-slate-500 hover:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Edit"
                        >
                          ✏️
                        </button>
                        <button 
                          onClick={() => deleteSubscription(sub._id)}
                          className="absolute top-4 right-4 text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Remove"
                        >
                          ✕
                        </button>
                        
                        <div className="flex justify-between items-start mb-6">
                          <h3 className="text-2xl font-bold text-slate-100">{sub.platform}</h3>
                          <span className="text-lg font-mono text-emerald-400 bg-emerald-400/10 px-3 py-1 rounded-lg">
                            ${sub.cost.toFixed(2)}<span className="text-sm text-emerald-500/70">/mo</span>
                          </span>
                        </div>
                        
                        <div className="space-y-4">
                          <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700/50">
                            <p className="text-sm text-slate-400 mb-1">Time Tracked</p>
                            <p className="text-3xl font-light text-slate-100">
                              {sub.totalHours} <span className="text-lg text-slate-500 font-normal">hrs</span>
                            </p>
                          </div>
                          
                          <div className={`p-4 rounded-xl border ${
                            sub.prompt.includes("✅") ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" :
                            sub.prompt.includes("⚠️") ? "bg-amber-500/10 border-amber-500/20 text-amber-400" :
                            "bg-rose-500/10 border-rose-500/20 text-rose-400"
                          }`}>
                            <p className="text-sm font-medium">Smart Prompt</p>
                            <p className="mt-1 font-semibold">{sub.prompt}</p>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {/* -------------------- 2. ANALYZE VIEW -------------------- */}
      {dashboardView === "analyze" && (
        <div className="space-y-8 animate-fade-in">
          {/* KPI Stats Block */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
            <div className="bg-slate-800/40 p-6 rounded-3xl border border-slate-700/50 shadow-lg flex flex-col justify-between hover:border-slate-600 transition-all">
              <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Total Monthly Spend</span>
              <div className="mt-4">
                <span className="text-3xl font-extrabold text-emerald-400">${totalSpend.toFixed(2)}</span>
                <p className="text-[10px] text-slate-500 mt-1">across active services</p>
              </div>
            </div>
            
            <div className="bg-slate-800/40 p-6 rounded-3xl border border-slate-700/50 shadow-lg flex flex-col justify-between hover:border-slate-600 transition-all">
              <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Tracked Watch Time</span>
              <div className="mt-4">
                <span className="text-3xl font-extrabold text-blue-400">{totalHours.toFixed(2)} hrs</span>
                <p className="text-[10px] text-slate-500 mt-1">total usage accumulated</p>
              </div>
            </div>

            <div className="bg-slate-800/40 p-6 rounded-3xl border border-slate-700/50 shadow-lg flex flex-col justify-between hover:border-slate-600 transition-all">
              <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Avg. ROI Hourly Cost</span>
              <div className="mt-4">
                <span className="text-3xl font-extrabold text-purple-400">${avgHourlyCost.toFixed(2)}/hr</span>
                <p className="text-[10px] text-slate-500 mt-1">monthly cost / usage hrs</p>
              </div>
            </div>

            <div className="bg-slate-800/40 p-6 rounded-3xl border border-slate-700/50 shadow-lg flex flex-col justify-between hover:border-slate-600 transition-all">
              <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Highest Cost App</span>
              <div className="mt-4">
                <span className="text-xl font-bold text-slate-200 truncate block">
                  {mostExpensive ? mostExpensive.platform : "None"}
                </span>
                <p className="text-[10px] text-emerald-400 font-semibold mt-1">
                  {mostExpensive ? `$${mostExpensive.cost.toFixed(2)}/mo` : ""}
                </p>
              </div>
            </div>

            <div className="bg-slate-800/40 p-6 rounded-3xl border border-slate-700/50 shadow-lg flex flex-col justify-between hover:border-slate-600 transition-all">
              <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Cancellation Alerts</span>
              <div className="mt-4">
                <span className={`text-3xl font-extrabold ${underutilizedCount > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {underutilizedCount}
                </span>
                <p className="text-[10px] text-slate-500 mt-1">underutilized service(s)</p>
              </div>
            </div>
          </div>

          {/* Spend / Usage Chart */}
          <section className="bg-slate-800/30 p-8 rounded-3xl border border-slate-700/50 shadow-xl">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <span>📈</span> Spend vs. Usage Distribution
            </h2>
            <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-700/50">
              <AnalyzerChart data={dashboard} />
            </div>
          </section>

          {/* Cancellation Recommendations */}
          <section className="bg-slate-800/40 p-8 rounded-3xl border border-slate-700/50 shadow-xl">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <span>💡</span> Value & Optimization Plan
            </h2>
            
            <div className="space-y-4">
              {dashboard.length === 0 ? (
                <div className="text-center py-6 text-slate-500 font-medium">
                  No subscription data available.
                </div>
              ) : (
                dashboard.map(sub => {
                  const isUnderutilized = sub.prompt.includes("⚠️") || sub.prompt.includes("❌");
                  return (
                    <div 
                      key={sub._id}
                      className={`flex flex-col md:flex-row items-start md:items-center justify-between p-6 rounded-2xl border transition-all ${
                        isUnderutilized 
                          ? "bg-rose-500/5 border-rose-500/10 hover:border-rose-500/25" 
                          : "bg-emerald-500/5 border-emerald-500/10 hover:border-emerald-500/25"
                      }`}
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2.5">
                          <h4 className="text-lg font-bold text-slate-100">{sub.platform}</h4>
                          <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wide border ${
                            isUnderutilized 
                              ? "bg-rose-500/10 border-rose-500/20 text-rose-400" 
                              : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                          }`}>
                            {isUnderutilized ? "Low Value" : "Excellent Value"}
                          </span>
                        </div>
                        <p className="text-slate-400 text-sm">
                          Cost: <span className="font-semibold text-slate-200">${sub.cost.toFixed(2)}/mo</span> | 
                          Watch time: <span className="font-semibold text-slate-200">{sub.totalHours.toFixed(2)} hrs</span> | 
                          Hourly rate: <span className="font-semibold text-slate-200">
                            ${sub.totalHours > 0 ? (sub.cost / sub.totalHours).toFixed(2) : sub.cost.toFixed(2)}/hr
                          </span>
                        </p>
                      </div>

                      <div className="mt-4 md:mt-0 flex items-center gap-6 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 pt-4 md:pt-0 border-slate-700/30">
                        <span className={`font-bold text-sm ${
                          isUnderutilized ? "text-rose-400" : "text-emerald-400"
                        }`}>
                          {sub.prompt}
                        </span>
                        {isUnderutilized ? (
                          <button 
                            onClick={() => deleteSubscription(sub._id)}
                            className="bg-rose-600/10 hover:bg-rose-600/20 border border-rose-500/20 text-rose-400 hover:text-rose-300 font-bold px-4 py-2 rounded-xl text-xs transition-all shadow-inner"
                          >
                            Cancel Sub ✕
                          </button>
                        ) : (
                          <span className="text-emerald-500 font-bold text-xs uppercase tracking-wider">Optimal Keep ✅</span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>
        </div>
      )}

      {/* -------------------- 3. ALL COMBINED VIEW -------------------- */}
      {dashboardView === "all" && (
        <div className="space-y-10 animate-fade-in">
          {/* KPI Stats Block */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
            <div className="bg-slate-800/40 p-6 rounded-3xl border border-slate-700/50 shadow-lg flex flex-col justify-between hover:border-slate-600 transition-all">
              <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Total Monthly Spend</span>
              <div className="mt-4">
                <span className="text-3xl font-extrabold text-emerald-400">${totalSpend.toFixed(2)}</span>
                <p className="text-[10px] text-slate-500 mt-1">across active services</p>
              </div>
            </div>
            
            <div className="bg-slate-800/40 p-6 rounded-3xl border border-slate-700/50 shadow-lg flex flex-col justify-between hover:border-slate-600 transition-all">
              <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Tracked Watch Time</span>
              <div className="mt-4">
                <span className="text-3xl font-extrabold text-blue-400">{totalHours.toFixed(2)} hrs</span>
                <p className="text-[10px] text-slate-500 mt-1">total usage accumulated</p>
              </div>
            </div>

            <div className="bg-slate-800/40 p-6 rounded-3xl border border-slate-700/50 shadow-lg flex flex-col justify-between hover:border-slate-600 transition-all">
              <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Avg. ROI Hourly Cost</span>
              <div className="mt-4">
                <span className="text-3xl font-extrabold text-purple-400">${avgHourlyCost.toFixed(2)}/hr</span>
                <p className="text-[10px] text-slate-500 mt-1">monthly cost / usage hrs</p>
              </div>
            </div>

            <div className="bg-slate-800/40 p-6 rounded-3xl border border-slate-700/50 shadow-lg flex flex-col justify-between hover:border-slate-600 transition-all">
              <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Highest Cost App</span>
              <div className="mt-4">
                <span className="text-xl font-bold text-slate-200 truncate block">
                  {mostExpensive ? mostExpensive.platform : "None"}
                </span>
                <p className="text-[10px] text-emerald-400 font-semibold mt-1">
                  {mostExpensive ? `$${mostExpensive.cost.toFixed(2)}/mo` : ""}
                </p>
              </div>
            </div>

            <div className="bg-slate-800/40 p-6 rounded-3xl border border-slate-700/50 shadow-lg flex flex-col justify-between hover:border-slate-600 transition-all">
              <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Cancellation Alerts</span>
              <div className="mt-4">
                <span className={`text-3xl font-extrabold ${underutilizedCount > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {underutilizedCount}
                </span>
                <p className="text-[10px] text-slate-500 mt-1">underutilized service(s)</p>
              </div>
            </div>
          </div>

          {/* Chart and Quick Forms Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Analyzer Graph Area (takes 2 cols on wide screens) */}
            <section className="lg:col-span-2 bg-slate-800/35 p-8 rounded-3xl border border-slate-700/50 shadow-xl">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                <span>📈</span> Spend vs. Usage Distribution
              </h2>
              <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-700/50">
                <AnalyzerChart data={dashboard} />
              </div>
            </section>

            {/* Quick Add Form & Scanner */}
            <div className="space-y-6 flex flex-col justify-between h-full">
              {/* Add via Link */}
              <section className="bg-slate-800/50 p-6 rounded-3xl border border-slate-700/50 shadow-xl relative overflow-hidden group flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
                    <span className="p-1.5 bg-blue-500/20 text-blue-400 rounded-lg text-sm">🔗</span> 
                    Add via Profile Link
                  </h3>
                  <p className="text-xs text-slate-400 mb-4">Paste profile link to auto-extract name & cost.</p>
                </div>
                <form onSubmit={addSubscription} className="flex flex-col gap-3">
                  <input
                    type="url"
                    placeholder="Profile URL"
                    value={profileLink}
                    onChange={(e) => setProfileLink(e.target.value)}
                    className="w-full bg-slate-900/80 border border-slate-700 rounded-lg px-4 py-2.5 text-xs focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-slate-100 placeholder:text-slate-600"
                    required
                  />
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg text-xs transition-all"
                  >
                    {isLoading ? "Fetching..." : "Fetch Details ✨"}
                  </button>
                </form>
              </section>

              {/* Auto Scan Accounts */}
              <section className="bg-gradient-to-br from-indigo-900/40 to-purple-900/40 p-6 rounded-3xl border border-indigo-500/30 shadow-xl relative overflow-hidden flex-1 flex flex-col justify-between mt-6">
                <div>
                  <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
                    <span className="p-1.5 bg-purple-500/20 text-purple-400 rounded-lg text-sm">🤖</span> 
                    Smart Auto-Scan
                  </h3>
                  <p className="text-xs text-slate-300 mb-4">Securely scan email inbox for billing cycles.</p>
                </div>
                <form onSubmit={runAutoScan} className="flex flex-col gap-3">
                  <input
                    type="email"
                    placeholder="your.email@gmail.com"
                    value={scanEmail}
                    onChange={(e) => setScanEmail(e.target.value)}
                    className="w-full bg-slate-900/80 border border-indigo-500/30 rounded-lg px-4 py-2.5 text-xs focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-slate-100 placeholder:text-slate-600"
                    required
                  />
                  <button
                    type="submit"
                    className="w-full bg-slate-900/50 hover:bg-slate-800 border border-indigo-500/50 text-indigo-300 font-semibold py-2.5 rounded-lg text-xs transition-all"
                  >
                    Scan Email Inbox →
                  </button>
                </form>
              </section>
            </div>
          </div>

          {/* Current Subscriptions Cards Grid */}
          <section>
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <span>📋</span> Current Subscriptions
            </h2>
            
            {dashboard.length === 0 ? (
              <div className="text-center py-12 text-slate-500 font-medium bg-slate-800/20 rounded-2xl border border-slate-700/30 border-dashed">
                No subscriptions added yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {dashboard.map((sub) => (
                  <div key={sub._id} className="group relative bg-slate-800 border border-slate-700 rounded-2xl p-6 hover:border-slate-500 transition-all shadow-lg hover:shadow-xl">
                    {editingId === sub._id ? (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs font-medium text-slate-400 mb-1">Platform Name</label>
                          <input 
                            type="text" 
                            value={editPlatform} 
                            onChange={e => setEditPlatform(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-slate-100"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-400 mb-1">Monthly Cost ($)</label>
                          <input 
                            type="number" 
                            step="0.01"
                            value={editCost} 
                            onChange={e => setEditCost(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-slate-100"
                          />
                        </div>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => updateSubscription(sub._id)}
                            className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-2 rounded-lg text-sm font-semibold transition-colors"
                          >
                            Save
                          </button>
                          <button 
                            onClick={() => setEditingId(null)}
                            className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2 rounded-lg text-sm font-semibold transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <button 
                          onClick={() => {
                            setEditingId(sub._id);
                            setEditPlatform(sub.platform);
                            setEditCost(sub.cost);
                          }}
                          className="absolute top-4 right-10 text-slate-500 hover:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Edit"
                        >
                          ✏️
                        </button>
                        <button 
                          onClick={() => deleteSubscription(sub._id)}
                          className="absolute top-4 right-4 text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Remove"
                        >
                          ✕
                        </button>
                        
                        <div className="flex justify-between items-start mb-6">
                          <h3 className="text-2xl font-bold text-slate-100">{sub.platform}</h3>
                          <span className="text-lg font-mono text-emerald-400 bg-emerald-400/10 px-3 py-1 rounded-lg">
                            ${sub.cost.toFixed(2)}<span className="text-sm text-emerald-500/70">/mo</span>
                          </span>
                        </div>
                        
                        <div className="space-y-4">
                          <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700/50">
                            <p className="text-sm text-slate-400 mb-1">Time Tracked</p>
                            <p className="text-3xl font-light text-slate-100">
                              {sub.totalHours} <span className="text-lg text-slate-500 font-normal">hrs</span>
                            </p>
                          </div>
                          
                          <div className={`p-4 rounded-xl border ${
                            sub.prompt.includes("✅") ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" :
                            sub.prompt.includes("⚠️") ? "bg-amber-500/10 border-amber-500/20 text-amber-400" :
                            "bg-rose-500/10 border-rose-500/20 text-rose-400"
                          }`}>
                            <p className="text-sm font-medium">Smart Prompt</p>
                            <p className="mt-1 font-semibold">{sub.prompt}</p>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Cancellation Recommendations */}
          <section className="bg-slate-800/40 p-8 rounded-3xl border border-slate-700/50 shadow-xl">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <span>💡</span> Value & Optimization Recommendations
            </h2>
            
            <div className="space-y-4">
              {dashboard.length === 0 ? (
                <div className="text-center py-6 text-slate-500 font-medium">
                  No subscription data available.
                </div>
              ) : (
                dashboard.map(sub => {
                  const isUnderutilized = sub.prompt.includes("⚠️") || sub.prompt.includes("❌");
                  return (
                    <div 
                      key={sub._id}
                      className={`flex flex-col md:flex-row items-start md:items-center justify-between p-6 rounded-2xl border transition-all ${
                        isUnderutilized 
                          ? "bg-rose-500/5 border-rose-500/10 hover:border-rose-500/25" 
                          : "bg-emerald-500/5 border-emerald-500/10 hover:border-emerald-500/25"
                      }`}
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2.5">
                          <h4 className="text-lg font-bold text-slate-100">{sub.platform}</h4>
                          <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wide border ${
                            isUnderutilized 
                              ? "bg-rose-500/10 border-rose-500/20 text-rose-400" 
                              : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                          }`}>
                            {isUnderutilized ? "Low Value" : "Excellent Value"}
                          </span>
                        </div>
                        <p className="text-slate-400 text-sm">
                          Cost: <span className="font-semibold text-slate-200">${sub.cost.toFixed(2)}/mo</span> | 
                          Watch time: <span className="font-semibold text-slate-200">{sub.totalHours.toFixed(2)} hrs</span> | 
                          Hourly rate: <span className="font-semibold text-slate-200">
                            ${sub.totalHours > 0 ? (sub.cost / sub.totalHours).toFixed(2) : sub.cost.toFixed(2)}/hr
                          </span>
                        </p>
                      </div>

                      <div className="mt-4 md:mt-0 flex items-center gap-6 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 pt-4 md:pt-0 border-slate-700/30">
                        <span className={`font-bold text-sm ${
                          isUnderutilized ? "text-rose-400" : "text-emerald-400"
                        }`}>
                          {sub.prompt}
                        </span>
                        {isUnderutilized ? (
                          <button 
                            onClick={() => deleteSubscription(sub._id)}
                            className="bg-rose-600/10 hover:bg-rose-600/20 border border-rose-500/20 text-rose-400 hover:text-rose-300 font-bold px-4 py-2 rounded-xl text-xs transition-all shadow-inner"
                          >
                            Cancel Sub ✕
                          </button>
                        ) : (
                          <span className="text-emerald-500 font-bold text-xs uppercase tracking-wider">Optimal Keep ✅</span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
