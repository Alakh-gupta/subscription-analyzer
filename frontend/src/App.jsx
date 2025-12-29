import { useState } from "react";

function App() {
  const [summary, setSummary] = useState([]);
  const [security, setSecurity] = useState(null);
  const [recommendation, setRecommendation] = useState(null);

  const PLATFORM = "Netflix"; // change to Spotify / JioHotstar if needed

  // Fetch usage summary
  const loadSummary = async () => {
    const res = await fetch("http://localhost:5000/api/summary");
    const data = await res.json();
    setSummary(data);
  };

  // Fetch security analysis
  const loadSecurity = async () => {
    const res = await fetch(
      `http://localhost:5000/api/security/${PLATFORM}`
    );
    const data = await res.json();
    setSecurity(data);
  };

  // Fetch final recommendation
  const loadRecommendation = async () => {
    const res = await fetch(
      `http://localhost:5000/api/recommendation/${PLATFORM}`
    );
    const data = await res.json();
    setRecommendation(data);
  };

  return (
    <div style={{ padding: "20px", fontFamily: "Arial" }}>
      <h1>📊 Subscription Analyzer Dashboard</h1>

      {/* Usage Summary */}
      <section>
        <h2>1️⃣ Usage Summary</h2>
        <button onClick={loadSummary}>Load Usage</button>
        <ul>
          {summary.map((item) => (
            <li key={item._id}>
              {item._id}: {(item.total / 3600).toFixed(2)} hours
            </li>
          ))}
        </ul>
      </section>

      <hr />

      {/* Security Analysis */}
      <section>
        <h2>2️⃣ Security Analysis ({PLATFORM})</h2>
        <button onClick={loadSecurity}>Check Security</button>
        {security && (
          <pre>{JSON.stringify(security, null, 2)}</pre>
        )}
      </section>

      <hr />

      {/* Recommendation */}
      <section>
        <h2>3️⃣ Final Recommendation ({PLATFORM})</h2>
        <button onClick={loadRecommendation}>
          Get Recommendation
        </button>
        {recommendation && (
          <pre>{JSON.stringify(recommendation, null, 2)}</pre>
        )}
      </section>
    </div>
  );
}

export default App;
