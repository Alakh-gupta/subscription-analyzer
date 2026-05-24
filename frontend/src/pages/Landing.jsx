import { Link } from "react-router-dom";

export default function Landing() {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center p-8 text-center">
      <div className="max-w-3xl space-y-8">
        <h1 className="text-6xl md:text-7xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 tracking-tight pb-2">
          Take Control of Your Subscriptions.
        </h1>
        <p className="text-xl md:text-2xl text-slate-400 font-light leading-relaxed">
          Automatically track your watch time across Netflix, YouTube, AWS, and more. Stop wasting money on services you don't use.
        </p>
        
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-center gap-6">
          <Link 
            to="/login"
            className="text-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-semibold px-8 py-4 rounded-xl transition-all shadow-[0_0_40px_-10px_rgba(59,130,246,0.5)] hover:shadow-[0_0_60px_-15px_rgba(59,130,246,0.7)]"
          >
            Go to Dashboard 🚀
          </Link>
          <a href="#features" className="text-lg text-slate-400 hover:text-white font-medium px-8 py-4 rounded-xl border border-slate-700 hover:border-slate-500 transition-all bg-slate-800/50">
            Learn More
          </a>
        </div>

        {/* Feature Highlights */}
        <div id="features" className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-24 text-left">
          <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700/50">
            <div className="text-3xl mb-4">⏱️</div>
            <h3 className="text-xl font-bold text-slate-100 mb-2">Auto-Tracking</h3>
            <p className="text-slate-400">Our Chrome extension tracks your usage in the background automatically.</p>
          </div>
          <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700/50">
            <div className="text-3xl mb-4">📈</div>
            <h3 className="text-xl font-bold text-slate-100 mb-2">Visual Analytics</h3>
            <p className="text-slate-400">See exactly how much you pay versus how much you actually use.</p>
          </div>
          <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700/50">
            <div className="text-3xl mb-4">🤖</div>
            <h3 className="text-xl font-bold text-slate-100 mb-2">Smart Prompts</h3>
            <p className="text-slate-400">Get intelligent recommendations on whether to keep or cancel a sub.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
