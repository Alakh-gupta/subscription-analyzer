let activePlatform = null;
let startTime = null;

// Fired when user switches tabs
chrome.tabs.onActivated.addListener(async (info) => {
  const tab = await chrome.tabs.get(info.tabId);
  handleTab(tab.url);
});

// Fired when page finishes loading
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete") {
    handleTab(tab.url);
  }
});

function handleTab(url = "") {
  const platform = getPlatform(url);

  if (platform) {
    if (!activePlatform) {
      activePlatform = platform;
      startTime = Date.now();   // ⏱ START
    }
  } else {
    stopTracking();
  }
}

function stopTracking() {
  if (activePlatform && startTime) {
    const seconds =
      Math.floor((Date.now() - startTime) / 1000); // ⏱ STOP

    saveUsage(activePlatform, seconds);
  }

  activePlatform = null;
  startTime = null;
}

function saveUsage(platform, seconds) {
  chrome.storage.local.get(["usage"], (data) => {
    let usage = data.usage || {};
    usage[platform] = (usage[platform] || 0) + seconds;
    chrome.storage.local.set({ usage });

    // Send to backend
    fetch("http://localhost:5000/api/usage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ platform, seconds })
    });
  });
}

function getPlatform(url) {
  if (!url) return null;
  if (url.includes("netflix.com")) return "Netflix";
  if (url.includes("spotify.com")) return "Spotify";
  if (url.includes("hotstar.com")) return "JioHotstar";
  return null;
}
