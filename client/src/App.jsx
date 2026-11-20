import React, { useState, useEffect } from 'react';
import { Cpu, GitPullRequest, AlertCircle, ShieldAlert, Sparkles, Search, Server, Plus, Trash2, RotateCcw, CheckCircle2, Activity, FileText } from 'lucide-react';
import { fetchReportsHybrid, subscribeRealtimeReports, resetReportsHybrid, createReportHybrid, deleteReportHybrid } from './services/intelligenceClient';

const RISK_BADGE = {
  'High Risk': 'bg-rose-50 text-rose-700 border-rose-200',
  Moderate: 'bg-amber-50 text-amber-800 border-amber-200',
  Healthy: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

export default function App() {
  const [items, setItems] = useState([]);
  const [selectedId, setSelectedId] = useState('repo-101');
  const [search, setSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState('All');
  const [backendConnected, setBackendConnected] = useState(false);
  const [repoName, setRepoName] = useState('');
  const [language, setLanguage] = useState('TypeScript');
  const [commitMessage, setCommitMessage] = useState('');
  const [prCount, setPrCount] = useState(14);
  const [openIssues, setOpenIssues] = useState(3);
  const [deployFreq, setDeployFreq] = useState('Daily');
  const [owner, setOwner] = useState('Sasidhar');
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    (async () => {
      const r = await fetchReportsHybrid();
      setItems(r.items); setBackendConnected(r.backendConnected);
      if (r.items[0]) setSelectedId(r.items[0].id);
    })();
    const unsub = subscribeRealtimeReports((liveItems, connected) => { setItems(liveItems); setBackendConnected(connected); });
    return () => unsub();
  }, []);

  const selected = items.find((x) => x.id === selectedId) || items[0] || null;

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!repoName.trim()) return;
    const r = await createReportHybrid({ repoName, language, commitMessage, prCount, openIssues, deployFreq, owner });
    if (r.item) { setSelectedId(r.item.id); setRepoName(''); setCommitMessage(''); setShowForm(false); }
    setBackendConnected(r.backendConnected);
  };

  const handleDelete = async (id) => {
    const r = await deleteReportHybrid(id);
    setBackendConnected(r.backendConnected);
    if (Array.isArray(r.items)) { setItems(r.items); setSelectedId(r.items[0]?.id || null); }
  };

  const handleReset = async () => {
    const r = await resetReportsHybrid();
    setItems(r.items); setBackendConnected(r.backendConnected);
    if (r.items[0]) setSelectedId(r.items[0].id);
  };

  const filtered = items.filter((item) => {
    const okRisk = riskFilter === 'All' || item.riskLevel === riskFilter;
    const q = search.trim().toLowerCase();
    const okQ = !q || item.repoName.toLowerCase().includes(q) || item.language.toLowerCase().includes(q) || item.owner.toLowerCase().includes(q);
    return okRisk && okQ;
  });

  const avgHealth = items.length ? Math.round(items.reduce((a, b) => a + (b.healthScore || 75), 0) / items.length) : 0;
  const totalPrs = items.reduce((a, b) => a + (b.prCount || 0), 0);
  const highRiskCount = items.filter((x) => x.riskLevel === 'High Risk').length;

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 text-[15px]">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-[1440px] mx-auto px-6 sm:px-10 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="h-11 w-11 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-sm shadow-indigo-600/25"><Cpu className="w-6 h-6" /></div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900">DevPulse Intelligence</h1>
                <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200"><Activity className="w-3.5 h-3.5" /> Live Telemetry</span>
              </div>
              <p className="text-sm text-slate-500 mt-0.5">Engineering velocity, PR throughput & AI release-risk scoring</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <button onClick={handleReset} className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 text-sm font-medium text-slate-700 inline-flex items-center gap-1.5 transition"><RotateCcw className="w-4 h-4" /> Reset</button>
            <span className={`text-sm px-3.5 py-2 rounded-xl border inline-flex items-center gap-2 font-semibold ${backendConnected ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-slate-100 border-slate-200 text-slate-600'}`}><Server className="w-4 h-4" />{backendConnected ? 'API Connected' : 'Local Cache'}</span>
            <button onClick={() => setShowForm((v) => !v)} className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-sm font-bold text-white inline-flex items-center gap-2 shadow-sm transition"><Plus className="w-4 h-4 stroke-[2.5]" /> Analyze Repo</button>
          </div>
        </div>
      </header>

      <main className="max-w-[1440px] mx-auto px-6 sm:px-10 py-8 space-y-7">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs"><div className="text-xs font-bold uppercase tracking-wider text-slate-400">Tracked Repositories</div><div className="text-3xl font-extrabold text-slate-900 mt-1.5">{items.length}</div><div className="text-sm text-slate-500 mt-1">Active engineering services</div></div>
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs"><div className="text-xs font-bold uppercase tracking-wider text-slate-400">Mean Health Index</div><div className="text-3xl font-extrabold text-indigo-600 mt-1.5">{avgHealth}<span className="text-base font-semibold text-slate-400"> / 100</span></div><div className="text-sm text-slate-500 mt-1">Code & release stability</div></div>
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs"><div className="text-xs font-bold uppercase tracking-wider text-slate-400">Sprint Pull Requests</div><div className="text-3xl font-extrabold text-slate-900 mt-1.5">{totalPrs}</div><div className="text-sm text-slate-500 mt-1">Merged & active PRs</div></div>
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs"><div className="text-xs font-bold uppercase tracking-wider text-slate-400">High-Risk Alerts</div><div className="text-3xl font-extrabold text-rose-600 mt-1.5">{highRiskCount}</div><div className="text-sm text-slate-500 mt-1">Needs pre-release review</div></div>
        </div>

        {showForm && (
          <form onSubmit={handleCreate} className="bg-white border-2 border-indigo-200 rounded-2xl p-6 space-y-4 shadow-sm">
            <div className="flex items-center justify-between"><h2 className="text-base font-bold text-slate-900 flex items-center gap-2"><Sparkles className="w-5 h-5 text-indigo-600" /> Run AI Release & Risk Assessment</h2><button type="button" onClick={() => setShowForm(false)} className="text-sm font-medium text-slate-500 hover:text-slate-900">Close</button></div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
              <input type="text" required value={repoName} onChange={(e) => setRepoName(e.target.value)} placeholder="org/repo-name (e.g., torstaq/auth-api)" className="px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900" />
              <select value={language} onChange={(e) => setLanguage(e.target.value)} className="px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900"><option>TypeScript</option><option>Node.js</option><option>Python</option><option>Go</option><option>React</option></select>
              <select value={owner} onChange={(e) => setOwner(e.target.value)} className="px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900"><option>Sasidhar</option><option>Vijaysimha</option></select>
            </div>
            <input type="text" value={commitMessage} onChange={(e) => setCommitMessage(e.target.value)} placeholder="Latest commit or PR summary (e.g., Hotfix auth token expiry & DB migration)..." className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-sm text-slate-900" />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
              <div><label className="text-xs font-semibold text-slate-500 block mb-1">Pull Requests</label><input type="number" min={0} value={prCount} onChange={(e) => setPrCount(e.target.value)} className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900" /></div>
              <div><label className="text-xs font-semibold text-slate-500 block mb-1">Open Issues</label><input type="number" min={0} value={openIssues} onChange={(e) => setOpenIssues(e.target.value)} className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900" /></div>
              <div><label className="text-xs font-semibold text-slate-500 block mb-1">Deploy Cadence</label><select value={deployFreq} onChange={(e) => setDeployFreq(e.target.value)} className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900"><option>Daily</option><option>Multiple / day</option><option>Weekly</option></select></div>
            </div>
            <div className="flex justify-end"><button type="submit" className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-sm font-bold text-white">Generate Intelligence Report</button></div>
          </form>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1"><Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" /><input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search repositories or owners..." className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-slate-300 text-sm text-slate-900" /></div>
              <select value={riskFilter} onChange={(e) => setRiskFilter(e.target.value)} className="px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-sm font-medium text-slate-800"><option value="All">All Risks</option><option value="High Risk">High Risk</option><option value="Moderate">Moderate</option><option value="Healthy">Healthy</option></select>
            </div>
            <div className="space-y-3">
              {filtered.map((item) => {
                const active = selected?.id === item.id;
                return (
                  <button key={item.id} onClick={() => setSelectedId(item.id)} className={`w-full text-left p-4 rounded-2xl border transition space-y-2.5 ${active ? 'bg-white border-indigo-600 ring-2 ring-indigo-600/15 shadow-xs' : 'bg-white/85 border-slate-200 hover:bg-white'}`}>
                    <div className="flex items-center justify-between gap-2"><span className={`text-xs px-2.5 py-1 rounded-full border font-semibold ${RISK_BADGE[item.riskLevel] || RISK_BADGE.Moderate}`}>{item.riskLevel} · {item.riskScore}</span><span className="text-xs font-semibold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-md border border-indigo-100">{item.language}</span></div>
                    <div className="text-base font-bold text-slate-900">{item.repoName}</div>
                    <div className="flex items-center justify-between text-xs sm:text-sm text-slate-500"><span>Lead: <strong className="text-slate-700">{item.owner}</strong></span><span>Health: <strong className="text-slate-900">{item.healthScore}/100</strong></span></div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="lg:col-span-7">
            {selected ? (
              <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-8 space-y-6 shadow-xs">
                <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-5">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-slate-500"><span className="font-mono font-bold text-indigo-600">{selected.language}</span><span>·</span><span>Owner: <strong className="text-slate-800">{selected.owner}</strong></span><span>·</span><span>Deploy cadence: <strong className="text-slate-800">{selected.deployFreq}</strong></span></div>
                    <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-1">{selected.repoName}</h2>
                    {selected.commitMessage && <p className="text-xs sm:text-sm text-slate-500 mt-1">Latest signal: <span className="font-mono text-slate-700">{selected.commitMessage}</span></p>}
                  </div>
                  <button onClick={() => handleDelete(selected.id)} className="text-sm text-rose-600 hover:text-rose-700 font-medium inline-flex items-center gap-1.5"><Trash2 className="w-4 h-4" /> Remove</button>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4"><div className="text-xs font-semibold text-slate-500 inline-flex items-center gap-1.5"><GitPullRequest className="w-4 h-4 text-indigo-600" /> Pull Requests</div><div className="text-2xl font-extrabold text-slate-900 mt-1">{selected.prCount}</div></div>
                  <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4"><div className="text-xs font-semibold text-slate-500 inline-flex items-center gap-1.5"><AlertCircle className="w-4 h-4 text-amber-600" /> Open Issues</div><div className="text-2xl font-extrabold text-slate-900 mt-1">{selected.openIssues}</div></div>
                  <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4"><div className="text-xs font-semibold text-slate-500 inline-flex items-center gap-1.5"><ShieldAlert className="w-4 h-4 text-rose-600" /> Risk Score</div><div className="text-2xl font-extrabold text-slate-900 mt-1">{selected.riskScore}<span className="text-sm font-semibold text-slate-400"> / 100</span></div></div>
                </div>
                <div className="bg-indigo-50/70 border border-indigo-200/80 rounded-xl p-5 space-y-2"><div className="text-xs font-bold uppercase tracking-wider text-indigo-700 flex items-center gap-1.5"><Sparkles className="w-4 h-4" /> AI Synthesis</div><p className="text-sm sm:text-base text-slate-800 leading-relaxed">{selected.aiSummary}</p></div>
                {selected.releaseNote && (
                  <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 space-y-1.5">
                    <div className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5"><FileText className="w-4 h-4 text-indigo-600" /> Release Note Draft</div>
                    <p className="text-xs sm:text-sm font-mono text-slate-700 leading-relaxed">{selected.releaseNote}</p>
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 space-y-2.5">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Detected Telemetry Signals</h3>
                    <ul className="space-y-2 text-sm text-slate-700">{(selected.riskSignals || []).map((sig, i) => <li key={i} className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" /><span>{sig}</span></li>)}</ul>
                  </div>
                  <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 space-y-2.5">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Actionable Engineering Playbook</h3>
                    <ul className="space-y-2 text-sm text-slate-700">{(selected.recommendations || []).map((rec, i) => <li key={i} className="flex items-start gap-2"><span className="font-mono font-bold text-indigo-600">{i + 1}.</span><span>{rec}</span></li>)}</ul>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center text-sm text-slate-500">Select a repository to inspect its AI intelligence report.</div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
