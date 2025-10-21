import React, { useState } from "react";
import { Github, Upload, AlertCircle, CheckCircle2, Loader2, Key, Package, MessageSquare, RefreshCw } from "lucide-react";

export default function GitAutoPush() {
  const [username, setUsername] = useState("INDPrince");
  const [token, setToken] = useState("");
  const [repoName, setRepoName] = useState("");
  const [commitMsg, setCommitMsg] = useState("");
  const [action, setAction] = useState("new"); // 'new' or 'overwrite'
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [logs, setLogs] = useState([]);

  const addLog = (message, type = "info") => {
    setLogs(prev => [...prev, { message, type, timestamp: new Date().toLocaleTimeString() }]);
  };

  const handlePush = async () => {
    if (!username || !token || !repoName) {
      setStatus("⚠️ Please fill all required fields!");
      setSuccess(false);
      return;
    }

    setLoading(true);
    setSuccess(false);
    setStatus("🚀 Starting Git push process...");
    setLogs([]);
    addLog("Initializing push process...", "info");

    try {
      // Always use relative URL for API calls since frontend and backend are on same domain
      // This avoids CORS issues and works in all environments
      const res = await fetch("/api/gitpush", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          token,
          repoName,
          commitMsg: commitMsg || `Backup - ${new Date().toLocaleString()}`,
          action,
        }),
      });

      const data = await res.json();
      
      if (res.ok) {
        setStatus(`✅ ${data.message}`);
        setSuccess(true);
        addLog(data.message, "success");
        if (data.output) {
          data.output.split('\n').forEach(line => {
            if (line.trim()) addLog(line, "info");
          });
        }
      } else {
        // Handle error response - backend returns {detail: {error, details}}
        const errorMsg = data.detail?.error || data.error || "Push failed";
        const errorDetails = data.detail?.details || data.details || "";
        
        setStatus(`❌ ${errorMsg}`);
        setSuccess(false);
        addLog(errorMsg, "error");
        if (errorDetails) {
          addLog(errorDetails, "error");
        }
      }
    } catch (err) {
      setStatus(`❌ Error: ${err.message}`);
      setSuccess(false);
      addLog(`Connection error: ${err.message}`, "error");
    }
    setLoading(false);
  };

  const handleReset = () => {
    setToken("");
    setRepoName("");
    setCommitMsg("");
    setStatus("");
    setSuccess(false);
    setLogs([]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white">
      {/* Header */}
      <div className="bg-black/30 backdrop-blur-sm border-b border-white/10">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl">
              <Github className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                GitHub Auto Push
              </h1>
              <p className="text-gray-400 text-sm">Deploy your code to GitHub with one click</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Left Panel - Form */}
          <div className="space-y-6">
            {/* Configuration Card */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl border border-white/20 p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Package className="w-5 h-5 text-purple-400" />
                Repository Configuration
              </h2>
              
              <div className="space-y-4">
                {/* Username */}
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-300">
                    GitHub Username
                  </label>
                  <input
                    type="text"
                    placeholder="Enter GitHub username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/20 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/50 outline-none transition-all text-white placeholder-gray-500"
                  />
                </div>

                {/* Token */}
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-300 flex items-center gap-2">
                    <Key className="w-4 h-4 text-purple-400" />
                    GitHub Personal Access Token
                  </label>
                  <input
                    type="password"
                    placeholder="ghp_xxxxxxxxxxxx"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/20 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/50 outline-none transition-all text-white placeholder-gray-500"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Need a token? <a href="https://github.com/settings/tokens" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:underline">Generate one here</a>
                  </p>
                </div>

                {/* Repo Name */}
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-300">
                    Repository Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., my-awesome-project"
                    value={repoName}
                    onChange={(e) => setRepoName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/20 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/50 outline-none transition-all text-white placeholder-gray-500"
                  />
                </div>

                {/* Commit Message */}
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-300 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-purple-400" />
                    Commit Message (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="Auto-generated if empty"
                    value={commitMsg}
                    onChange={(e) => setCommitMsg(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/20 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/50 outline-none transition-all text-white placeholder-gray-500"
                  />
                </div>

                {/* Action Selection */}
                <div>
                  <label className="block text-sm font-medium mb-3 text-gray-300">
                    Action
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setAction("new")}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        action === "new"
                          ? "bg-purple-500/20 border-purple-500 text-white"
                          : "bg-black/20 border-white/20 text-gray-400 hover:border-purple-500/50"
                      }`}
                    >
                      <Upload className="w-5 h-5 mx-auto mb-1" />
                      <div className="text-sm font-medium">Create New</div>
                    </button>
                    <button
                      onClick={() => setAction("overwrite")}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        action === "overwrite"
                          ? "bg-pink-500/20 border-pink-500 text-white"
                          : "bg-black/20 border-white/20 text-gray-400 hover:border-pink-500/50"
                      }`}
                    >
                      <RefreshCw className="w-5 h-5 mx-auto mb-1" />
                      <div className="text-sm font-medium">Overwrite</div>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={handlePush}
                disabled={loading}
                className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:from-gray-500 disabled:to-gray-600 text-white font-semibold py-4 px-6 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 disabled:scale-100 transition-all duration-200 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Pushing...
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5" />
                    Push to GitHub
                  </>
                )}
              </button>
              <button
                onClick={handleReset}
                disabled={loading}
                className="px-6 py-4 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 hover:border-white/40 transition-all duration-200 disabled:opacity-50"
              >
                Reset
              </button>
            </div>
          </div>

          {/* Right Panel - Status & Logs */}
          <div className="space-y-6">
            {/* Status Card */}
            {status && (
              <div className={`bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl border p-6 ${
                success ? "border-green-500/50" : "border-red-500/50"
              }`}>
                <div className="flex items-start gap-3">
                  {success ? (
                    <CheckCircle2 className="w-6 h-6 text-green-400 flex-shrink-0 mt-1" />
                  ) : (
                    <AlertCircle className="w-6 h-6 text-red-400 flex-shrink-0 mt-1" />
                  )}
                  <div className="flex-1">
                    <h3 className="font-semibold mb-1">Status</h3>
                    <p className="text-sm text-gray-300">{status}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Logs Card */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl border border-white/20 p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
                Process Logs
              </h3>
              <div className="bg-black/40 rounded-xl p-4 h-96 overflow-y-auto font-mono text-sm space-y-2">
                {logs.length === 0 ? (
                  <div className="text-gray-500 text-center py-8">
                    No logs yet. Start by clicking "Push to GitHub"
                  </div>
                ) : (
                  logs.map((log, idx) => (
                    <div key={idx} className="flex gap-2">
                      <span className="text-gray-500">{log.timestamp}</span>
                      <span className={`flex-1 ${
                        log.type === "success" ? "text-green-400" :
                        log.type === "error" ? "text-red-400" :
                        "text-gray-300"
                      }`}>
                        {log.message}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Info Card */}
            <div className="bg-blue-500/10 backdrop-blur-md rounded-xl border border-blue-500/30 p-4">
              <h4 className="font-semibold text-blue-300 mb-2 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                Important Notes
              </h4>
              <ul className="text-sm text-gray-300 space-y-1">
                <li>• Token requires 'repo' permissions</li>
                <li>• 'Create New' will create a new repository</li>
                <li>• 'Overwrite' will force push to existing repo</li>
                <li>• All files in /app will be pushed</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
