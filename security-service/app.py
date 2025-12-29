from flask import Flask, jsonify
import requests
import time

app = Flask(__name__)

SECURITY_HEADERS = [
    "Content-Security-Policy",
    "Strict-Transport-Security",
    "X-Frame-Options",
    "X-Content-Type-Options",
    "Referrer-Policy"
]

PLATFORMS = {
    "Netflix": "https://www.netflix.com",
    "Spotify": "https://www.spotify.com",
    "JioHotstar": "https://www.hotstar.com"
}

@app.route("/security/<platform>")
def analyze_security(platform):
    if platform not in PLATFORMS:
        return jsonify({"error": "Platform not supported"}), 400

    url = PLATFORMS[platform]

    start = time.time()
    response = requests.get(url, timeout=5)
    response_time = round((time.time() - start) * 1000, 2)

    headers_present = []
    for h in SECURITY_HEADERS:
        if h in response.headers:
            headers_present.append(h)

    security_score = min(50 + len(headers_present) * 10, 100)

    return jsonify({
        "platform": platform,
        "https": url.startswith("https"),
        "response_time_ms": response_time,
        "security_headers": headers_present,
        "security_score": security_score
    })

if __name__ == "__main__":
    app.run(port=7000, debug=True)
