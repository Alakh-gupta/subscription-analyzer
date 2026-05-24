from flask import Flask, jsonify, request
import requests
import time
import os
import joblib

app = Flask(__name__)

SECURITY_HEADERS = [
    "Content-Security-Policy",
    "Strict-Transport-Security",
    "X-Frame-Options",
    "X-Content-Type-Options",
    "Referrer-Policy"
]

PLATFORMS = {
    "netflix": "https://www.netflix.com",
    "spotify": "https://www.spotify.com",
    "jiohotstar": "https://www.hotstar.com",
    "youtube premium": "https://www.youtube.com",
    "amazon prime": "https://www.primevideo.com",
    "hulu": "https://www.hulu.com",
    "aws cloud": "https://aws.amazon.com",
    "youtube": "https://www.youtube.com"
}

# ------------------ AI Model Loading ------------------
MODEL_PATH = os.path.join(os.path.dirname(__file__), "recommendation_model.joblib")
recommendation_model = None

if os.path.exists(MODEL_PATH):
    try:
        recommendation_model = joblib.load(MODEL_PATH)
        print("AI Recommendation Model loaded successfully.")
    except Exception as e:
        print(f"Error loading AI model: {e}")
else:
    print("AI Model file not found. Run train_model.py first.")

# ------------------ Security Header Scan ------------------
@app.route("/security/<platform>")
def analyze_security(platform):
    platform_lower = platform.lower()
    
    # 1. Resolve domain URL dynamically if not explicitly mapped
    if platform_lower in PLATFORMS:
        url = PLATFORMS[platform_lower]
    else:
        # e.g., "Github" -> "https://www.github.com"
        # Sanitize platform string for basic domain construction
        clean_name = "".join(c for c in platform_lower if c.isalnum())
        url = f"https://www.{clean_name}.com"

    start = time.time()
    headers_present = []
    security_score = 70  # Default safe fallback score
    response_time = 250
    https = True

    try:
        response = requests.get(url, timeout=4)
        response_time = round((time.time() - start) * 1000, 2)
        https = url.startswith("https")
        
        for h in SECURITY_HEADERS:
            if h in response.headers:
                headers_present.append(h)
        # Dynamic score based on active security headers
        security_score = min(50 + len(headers_present) * 10, 100)
    except Exception as e:
        # Offline/Connection resilience fallback
        print(f"Scanning connection fallback for {url}: {e}")
        # Default safety values so dashboard AI recommendations don't break
        security_score = 70 

    return jsonify({
        "platform": platform,
        "https": https,
        "response_time_ms": response_time,
        "security_headers": headers_present,
        "security_score": security_score
    })

# ------------------ AI Inference Endpoint ------------------
@app.route("/predict", methods=["POST"])
def predict_recommendation():
    global recommendation_model
    
    if not recommendation_model and os.path.exists(MODEL_PATH):
        try:
            recommendation_model = joblib.load(MODEL_PATH)
        except Exception as e:
            return jsonify({"error": f"Failed to load AI model: {str(e)}"}), 500
            
    if not recommendation_model:
        return jsonify({"error": "AI Model not trained or loaded"}), 500
        
    try:
        data = request.get_json()
        cost = float(data.get("cost", 9.99))
        usage_hours = float(data.get("usage_hours", 0.0))
        security_score = int(data.get("security_score", 50))
        
        # Predict label: 0 (Not Worth It), 1 (Use Occasionally), 2 (Worth It)
        prediction = recommendation_model.predict([[cost, usage_hours, security_score]])[0]
        
        labels = {
            0: "Not Worth It ❌",
            1: "Use Occasionally ⚠️",
            2: "Worth It ✅"
        }
        
        return jsonify({
            "cost": cost,
            "usage_hours": usage_hours,
            "security_score": security_score,
            "prediction_class": int(prediction),
            "recommendation": labels.get(prediction, "Not Worth It ❌")
        })
    except Exception as e:
        return jsonify({"error": f"Inference failed: {str(e)}"}), 400

# ------------------ YouTube Live Content Search ------------------
@app.route("/search/youtube")
def api_search_youtube():
    query = request.args.get("q", "")
    if not query:
        return jsonify({"error": "Missing query"}), 400
        
    try:
        import urllib.request
        import urllib.parse
        import re
        
        search_keyword = urllib.parse.quote(query)
        req = urllib.request.Request(
            "https://www.youtube.com/results?search_query=" + search_keyword,
            headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'}
        )
        
        with urllib.request.urlopen(req, timeout=4) as response:
            html = response.read().decode()
            video_ids = re.findall(r"watch\?v=(\S{11})", html)
            
            if video_ids:
                return jsonify({
                    "platform": "YouTube Premium",
                    "title": f"Play '{query}' on YouTube",
                    "url": "https://www.youtube.com/watch?v=" + video_ids[0],
                    "type": "Video/Song 🎵",
                    "confidence": "High ✅"
                })
    except Exception as e:
        print("YouTube search failed:", e)
        
    return jsonify({
        "platform": "YouTube Premium",
        "title": f"Search '{query}' on YouTube",
        "url": "https://www.youtube.com/results?search_query=" + urllib.parse.quote(query),
        "type": "Video/Song 🎵",
        "confidence": "Fallback Link ⚠️"
    })

if __name__ == "__main__":
    app.run(port=7000, debug=True)
