// Initialize focus state
chrome.storage.local.set({ browserFocused: true });

// Listen for browser window focus changes to stop tracking when user minimizes or switches to other system applications
chrome.windows.onFocusChanged.addListener((windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    chrome.storage.local.set({ browserFocused: false });
  } else {
    chrome.storage.local.set({ browserFocused: true });
  }
});

// Process heartbeat messages from content scripts
chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  if (message.action === "heartbeat") {
    try {
      // 1. Verify that the heartbeat sender tab is the active tab in its window
      if (sender.tab && sender.tab.active) {
        // 2. Check if the browser window has focus
        const data = await chrome.storage.local.get("browserFocused");
        if (data.browserFocused !== false) {
          const platform = getPlatform(message.url);
          if (platform) {
            saveUsage(platform, 1); // Record exactly 1 second of usage
            broadcastToDashboard(message.url);
          } else {
            // Also notify dashboard when visible to keep the live badge active
            broadcastToDashboard(message.url);
          }
        }
      }
    } catch (err) {
      console.error("Error processing heartbeat:", err);
    }
  }
});

function broadcastToDashboard(activeUrl) {
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach(tab => {
      if (tab.url && (tab.url.includes("localhost:") || tab.url.includes("127.0.0.1") || tab.url.includes("vercel.app"))) {
        chrome.tabs.sendMessage(tab.id, {
          action: "liveUsageUpdate",
          url: activeUrl
        }).catch(err => {
          // Tab might not have listener loaded, ignore
        });
      }
    });
  });
}

function saveUsage(platform, seconds) {
  chrome.storage.local.get(["usage"], (data) => {
    let usage = data.usage || {};
    usage[platform] = (usage[platform] || 0) + seconds;
    chrome.storage.local.set({ usage });

    // Send to backend in real-time
    fetch("http://localhost:5000/api/usage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ platform, seconds })
    }).catch(err => console.log("Backend not reachable", err));
  });
}

function getPlatform(url) {
  if (!url || !url.startsWith("http")) return null;
  
  try {
    const hostname = new URL(url).hostname;
    let cleanHost = hostname.replace('www.', '');
    
    // Explicit overrides
    if (cleanHost.includes("netflix.com")) return "Netflix";
    if (cleanHost.includes("spotify.com")) return "Spotify";
    if (cleanHost.includes("hotstar.com")) return "JioHotstar";
    if (cleanHost.includes("youtube.com")) return "YouTube Premium";
    if (cleanHost.includes("aws.amazon.com") || cleanHost.includes("console.aws")) return "AWS Cloud";
    if (cleanHost.includes("primevideo.com") || cleanHost.includes("amazon.com")) return "Amazon Prime";
    if (cleanHost.includes("hulu.com")) return "Hulu";
    
    // Generic parsing (e.g., github.com -> Github)
    const parts = cleanHost.split('.');
    if (parts.length >= 2) {
      const name = parts[parts.length - 2];
      return name.charAt(0).toUpperCase() + name.slice(1);
    }
    return cleanHost;
  } catch (e) {
    return null;
  }
}
