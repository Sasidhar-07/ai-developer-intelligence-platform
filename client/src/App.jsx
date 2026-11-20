import React, { useState, useEffect } from 'react';
import {
  Activity,
  Star,
  AlertCircle,
  Search,
  Sparkles,
  ShieldCheck,
  Code2,
  ArrowUpRight,
  Cpu,
  GitPullRequest,
  Scale,
  History,
  KeyRound,
  Server,
  Bug,
} from 'lucide-react';
import { analyzeRepoHybrid, fetchServerHistory, analyzeCodeLocally } from './services/apiClient';

const SAMPLE_REPOS = ['facebook/react', 'vercel/next.js', 'tailwindlabs/tailwindcss', 'vitejs/vite'];

export default function App() {
  const [repoInput, setRepoInput] = useState('facebook/react');
  const [compareInput, setCompareInput] = useState('vitejs/vite');
  const [loading, setLoading] = useState(false);
  const [comparing, setComparing] = useState(false);
  const [error, setError] = useState('');

  const [intel, setIntel] = useState(null);
  const [compareIntel, setCompareIntel] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [historyList, setHistoryList] = useState([]);

  const [codeSnippet, setCodeSnippet] = useState(
    `async function fetchUserProfile(userId) {\n  var endpoint = '/api/v1/users/' + userId;\n  const response = await fetch(endpoint);\n  console.log('Status:', response.status);\n  return response.json();\n}`
  );
  const [codeAudit, setCodeAudit] = useState(() => analyzeCodeLocally(''));

  const [showSettings, setShowSettings] = useState(false);
  const [githubToken, setGithubToken] = useState(() => localStorage.getItem('gh_pat') || '');

  const loadHistory = async (latestData) => {
    const serverAudits = await fetchServerHistory();
    if (serverAudits) {
      setHistoryList(serverAudits);
    } else if (latestData) {
      setHistoryList((prev) => [
        {
          id: Date.now(),
          fullName: latestData.meta.fullName,
          overallScore: latestData.scores.overall,
          stars: latestData.meta.stars,
          primaryLang: Object.keys(latestData.languages)[0] || 'Multi',
          scannedAt: latestData.scannedAt,
        },
        ...prev.filter((p) => p.fullName !== latestData.meta.fullName),
      ]);
    }
  };

  const runAnalysis = async (target = repoInput) => {
    setLoading(true);
    setError('');
    try {
      const data = await analyzeRepoHybrid(target, githubToken);
      setIntel(data);
      setCodeAudit(analyzeCodeLocally(codeSnippet));
      await loadHistory(data);
    } catch (err) {
      setError(err.message || 'Analysis failed.');
    } finally {
      setLoading(false);
    }
  };

  const runCompare = async () => {
    setComparing(true);
    setError('');
    try {
      const data = await analyzeRepoHybrid(compareInput, githubToken);
      setCompareIntel(data);
    } catch (err) {
      setError(err.message || 'Comparison failed.');
    } finally {
      setComparing(false);
    }
  };

  useEffect(() => {
    runAnalysis('facebook/react');
  }, []);

  const totalLangBytes = intel ? Object.values(intel.languages).reduce((a, b) => a + b, 0) : 0;
  const maxCommitCount = intel?.commitVelocity?.length
    ? Math.max(...intel.commitVelocity.map((d) => d.count), 1)
    : 1;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-600/20 border border-indigo-500/40 text-indigo-400">
              <Cpu className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold tracking-tight text-white">
                AI-Powered Developer Intelligence Platform
              </h1>
              <p className="text-xs text-slate-400">
                Full-Stack Telemetry Engine · Persistent Audit Store · Security & Architecture Diagnostics
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {intel && (
              <span
                className={`text-xs px-2.5 py-1.5 rounded-lg border inline-flex items-center gap-1.5 ${
                  intel.backendConnected
                    ? 'bg-emerald-950/60 border-emerald-700 text-emerald-300'
                    : 'bg-slate-900 border-slate-700 text-slate-300'
                }`}
              >
                <Server className="w-3.5 h-3.5" />
                {intel.backendConnected ? (intel.cached ? 'Node API (Cached)' : 'Node API (Live)') : 'Edge API Mode'}
              </span>
            )}
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-slate-200"
            >
              <KeyRound className="w-3.5 h-3.5 text-amber-400" />
              GitHub PAT
            </button>
          </div>
        </div>

        {showSettings && (
          <div className="border-t border-slate-800 bg-slate-900 px-4 sm:px-6 py-3.5">
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row gap-3 items-center">
              <input
                type="password"
                value={githubToken}
                onChange={(e) => setGithubToken(e.target.value)}
                placeholder="Paste GitHub Personal Access Token (ghp_...) for 5,000 req/hr & private repos"
                className="flex-1 w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs"
              />
              <button
                onClick={() => {
                  localStorage.setItem('gh_pat', githubToken);
                  setShowSettings(false);
                  runAnalysis(repoInput);
                }}
                className="px-4 py-2 rounded-lg bg-emerald-600 text-xs font-semibold text-white"
              >
                Save Token
              </button>
            </div>
          </div>
        )}
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <section className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              runAnalysis();
            }}
            className="flex flex-col sm:flex-row gap-3"
          >
            <div className="relative flex-1">
              <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={repoInput}
                onChange={(e) => setRepoInput(e.target.value)}
                placeholder="Enter GitHub repository (e.g., facebook/react or https://github.com/owner/repo)"
                className="w-full pl-11 pr-4 py-2.5 rounded-lg bg-slate-950 border border-slate-700 text-slate-100 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 font-semibold text-white inline-flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              {loading ? 'Analyzing...' : 'Analyze Repository'}
            </button>
          </form>

          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-400">
            <span>Benchmarks:</span>
            {SAMPLE_REPOS.map((sample) => (
              <button
                key={sample}
                onClick={() => {
                  setRepoInput(sample);
                  runAnalysis(sample);
                }}
                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
              >
                {sample}
              </button>
            ))}
          </div>

          {error && (
            <div className="mt-4 p-3 rounded-lg bg-red-950/60 border border-red-800 text-red-300 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </section>

        {intel && (
          <>
            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="bg-slate-900 border border-indigo-500/40 rounded-xl p-4">
                <div className="flex items-center justify-between text-slate-400 text-xs">
                  <span>Overall Health</span>
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="mt-2 flex items-baseline gap-1.5">
                  <span className="text-3xl font-bold text-white">{intel.scores.overall}</span>
                  <span className="text-xs text-slate-400">/ 100</span>
                </div>
                <div className="mt-2.5 w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${intel.scores.overall}%` }} />
                </div>
              </div>

              {[
                { label: 'DevOps & CI/CD', value: intel.scores.devops, color: 'bg-indigo-500' },
                { label: 'Delivery Velocity', value: intel.scores.velocity, color: 'bg-cyan-500' },
                { label: 'Documentation', value: intel.scores.documentation, color: 'bg-amber-500' },
                { label: 'Community & License', value: intel.scores.community, color: 'bg-purple-500' },
              ].map((m) => (
                <div key={m.label} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                  <div className="text-slate-400 text-xs">{m.label}</div>
                  <div className="mt-2 flex items-baseline gap-1.5">
                    <span className="text-2xl font-bold text-white">{m.value}</span>
                    <span className="text-xs text-slate-500">/ 100</span>
                  </div>
                  <div className="mt-2.5 w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div className={`${m.color} h-full rounded-full`} style={{ width: `${m.value}%` }} />
                  </div>
                </div>
              ))}
            </section>

            <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-2">
              {[
                { id: 'overview', label: 'Architecture & Telemetry', icon: Sparkles },
                { id: 'activity', label: 'Velocity, PRs & Bugs', icon: GitPullRequest },
                { id: 'compare', label: 'Repo Benchmarking', icon: Scale },
                { id: 'audit', label: 'Security Code Auditor', icon: Code2 },
                { id: 'history', label: `Database Audit Log (${historyList.length})`, icon: History },
              ].map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-medium transition ${
                      activeTab === tab.id ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-900'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {activeTab === 'overview' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <a
                      href={intel.meta.htmlUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xl font-bold text-white hover:text-indigo-400 inline-flex items-center gap-1.5"
                    >
                      {intel.meta.fullName}
                      <ArrowUpRight className="w-5 h-5" />
                    </a>
                    <span className="text-xs text-amber-400 font-semibold flex items-center gap-1">
                      <Star className="w-4 h-4" /> {intel.meta.stars.toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm text-slate-300">{intel.meta.description}</p>
                  <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 text-sm text-slate-200 leading-relaxed">
                    <strong className="text-indigo-400 block text-xs uppercase mb-1">System Diagnostics</strong>
                    Primary stack: {Object.keys(intel.languages).slice(0, 3).join(', ') || 'Multi-language'}. Repository spans{' '}
                    {(intel.meta.sizeKB / 1024).toFixed(1)} MB across {intel.fileList.length} root modules with{' '}
                    {intel.meta.openIssues.toLocaleString()} open issues and {intel.meta.license} licensing.
                  </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                  <h3 className="text-sm font-semibold text-white mb-4">Language Distribution</h3>
                  <div className="space-y-3">
                    {Object.entries(intel.languages)
                      .slice(0, 6)
                      .map(([lang, bytes]) => {
                        const pct = totalLangBytes ? ((bytes / totalLangBytes) * 100).toFixed(1) : 0;
                        return (
                          <div key={lang}>
                            <div className="flex justify-between text-xs mb-1">
                              <span className="text-slate-200">{lang}</span>
                              <span className="text-slate-400">{pct}%</span>
                            </div>
                            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                              <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'activity' && (
              <div className="space-y-6">
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                  <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-indigo-400" /> Commit Velocity Trend
                  </h3>
                  <div className="grid grid-cols-5 sm:grid-cols-10 gap-3 items-end h-32 pt-4 px-2 bg-slate-950 rounded-lg border border-slate-800">
                    {intel.commitVelocity.map((d) => (
                      <div key={d.date} className="flex flex-col items-center gap-1 h-full justify-end pb-2">
                        <span className="text-xs text-indigo-300 font-semibold">{d.count}</span>
                        <div
                          className="w-full max-w-[26px] bg-indigo-500 rounded-t"
                          style={{ height: `${Math.max(15, Math.round((d.count / maxCommitCount) * 100))}%` }}
                        />
                        <span className="text-[10px] text-slate-400">{d.date}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                    <h3 className="text-sm font-semibold text-white mb-3">Pull Requests</h3>
                    <div className="space-y-2 max-h-80 overflow-y-auto">
                      {intel.pulls.map((pr) => (
                        <a key={pr.number} href={pr.url} target="_blank" rel="noreferrer" className="block p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs">
                          <span className="text-indigo-400 font-mono mr-2">#{pr.number}</span>
                          <span className="text-slate-200">{pr.title}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                    <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                      <Bug className="w-4 h-4 text-amber-400" /> Open Issues
                    </h3>
                    <div className="space-y-2 max-h-80 overflow-y-auto">
                      {intel.issues.map((issue) => (
                        <a key={issue.number} href={issue.url} target="_blank" rel="noreferrer" className="block p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs">
                          <span className="text-amber-400 font-mono mr-2">#{issue.number}</span>
                          <span className="text-slate-200">{issue.title}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'compare' && (
              <div className="space-y-4">
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row gap-3 items-center">
                  <span className="text-sm text-slate-300">
                    Compare <strong className="text-indigo-400">{intel.meta.fullName}</strong> with:
                  </span>
                  <input
                    type="text"
                    value={compareInput}
                    onChange={(e) => setCompareInput(e.target.value)}
                    className="flex-1 w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-sm"
                  />
                  <button onClick={runCompare} disabled={comparing} className="px-4 py-2 rounded-lg bg-indigo-600 text-sm font-semibold text-white">
                    {comparing ? 'Comparing...' : 'Benchmark'}
                  </button>
                </div>

                {compareIntel && (
                  <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-950 border-b border-slate-800 text-xs uppercase text-slate-400">
                        <tr>
                          <th className="py-3 px-5">Metric</th>
                          <th className="py-3 px-5 text-indigo-400">{intel.meta.fullName}</th>
                          <th className="py-3 px-5 text-emerald-400">{compareIntel.meta.fullName}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        <tr><td className="py-3 px-5">Health Score</td><td className="py-3 px-5 font-bold">{intel.scores.overall}/100</td><td className="py-3 px-5 font-bold">{compareIntel.scores.overall}/100</td></tr>
                        <tr><td className="py-3 px-5">Stars</td><td className="py-3 px-5">{intel.meta.stars.toLocaleString()}</td><td className="py-3 px-5">{compareIntel.meta.stars.toLocaleString()}</td></tr>
                        <tr><td className="py-3 px-5">Forks</td><td className="py-3 px-5">{intel.meta.forks.toLocaleString()}</td><td className="py-3 px-5">{compareIntel.meta.forks.toLocaleString()}</td></tr>
                        <tr><td className="py-3 px-5">Open Issues</td><td className="py-3 px-5">{intel.meta.openIssues.toLocaleString()}</td><td className="py-3 px-5">{compareIntel.meta.openIssues.toLocaleString()}</td></tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'audit' && (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-white">Static Security & Quality Code Inspector</h3>
                  <button onClick={() => setCodeAudit(analyzeCodeLocally(codeSnippet))} className="px-4 py-2 rounded-lg bg-indigo-600 text-xs font-semibold text-white">
                    Audit Code
                  </button>
                </div>
                <textarea
                  rows={8}
                  value={codeSnippet}
                  onChange={(e) => setCodeSnippet(e.target.value)}
                  className="w-full font-mono text-xs p-3.5 rounded-lg bg-slate-950 border border-slate-800 text-emerald-300"
                />
                <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
                  <div className="text-xs font-bold text-indigo-400">Quality Score: {codeAudit.score}/100 — {codeAudit.summary}</div>
                  {codeAudit.issues.map((iss, idx) => (
                    <div key={idx} className="text-xs text-amber-300">• {iss}</div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'history' && (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-white mb-4">Persistent Server Audit History</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {historyList.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => {
                        setRepoInput(item.fullName);
                        setActiveTab('overview');
                        runAnalysis(item.fullName);
                      }}
                      className="p-4 rounded-lg bg-slate-950 border border-slate-800 hover:border-indigo-500 cursor-pointer"
                    >
                      <div className="flex justify-between text-sm font-semibold text-indigo-400">
                        <span>{item.fullName}</span>
                        <span className="text-emerald-400">{item.overallScore}/100</span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">{item.primaryLang} · {item.stars.toLocaleString()} ★</p>
                      <p className="text-[11px] text-slate-500 mt-2">{new Date(item.scannedAt).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
