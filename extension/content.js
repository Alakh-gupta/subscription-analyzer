let heartbeatInterval = null;

function sendHeartbeat() {
  // Only send heartbeat if the tab is visible
  if (document.visibilityState === "visible") {
    chrome.runtime.sendMessage({
      action: "heartbeat",
      url: window.location.href
    }).catch((err) => {
      // Extension was reloaded or context is invalidated, stop running
      stopHeartbeat();
    });
  }
}

function startHeartbeat() {
  if (heartbeatInterval) return;
  sendHeartbeat();
  heartbeatInterval = setInterval(sendHeartbeat, 1000); // 1 second
}

function stopHeartbeat() {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
}

// Initial state check
if (document.visibilityState === "visible") {
  startHeartbeat();
}

// Listen for tab visibility changes (e.g. tab switching, minimizing)
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    startHeartbeat();
  } else {
    stopHeartbeat();
  }
});

// Notify dashboard page that the extension is active (Developer Mode is loaded and tracking)
try {
  document.documentElement.setAttribute("data-subscription-tracker-active", "true");
  window.dispatchEvent(new CustomEvent("SubscriptionTrackerActive"));
} catch (e) {
  console.log("Failed to dispatch extension activation event", e);
}
