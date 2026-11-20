const API_BASE = import.meta.env.VITE_API_URL || '';

export async function analyzeRepoHybrid(repoInput, githubToken = '') {
  try {
    const res = await fetch(`${API_BASE}/api/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ repoInput, githubToken }),
    });
    if (res.ok) {
      const data = await res.json();
      return { ...data, backendConnected: true };
    }
    if (res.status === 400) {
      const errData = await res.json();
      throw new Error(errData.error || 'Invalid repository');
    }
  } catch (err) {
    if (err.message && !err.message.includes('Failed to fetch')) throw err;
  }

  const trimmed = repoInput.trim().replace(/\/$/, '');
  const parts = trimmed.includes('github.com/')
    ? trimmed.split('github.com/')[1].split('/')
    : trimmed.split('/');
  if (parts.length < 2) throw new Error('Enter owner/repo (e.g., facebook/react)');
  const [owner, repo] = [parts[0], parts[1].replace(/\.git$/, '')];

  const headers = { Accept: 'application/vnd.github+json' };
  if (githubToken) headers.Authorization = `Bearer ${githubToken}`;

  const [repoRes, langRes, commitsRes, contribRes, contentsRes, pullsRes, issuesRes] = await Promise.all([
    fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers }),
    fetch(`https://api.github.com/repos/${owner}/${repo}/languages`, { headers }),
    fetch(`https://api.github.com/repos/${owner}/${repo}/commits?per_page=25`, { headers }),
    fetch(`https://api.github.com/repos/${owner}/${repo}/contributors?per_page=10`, { headers }),
    fetch(`https://api.github.com/repos/${owner}/${repo}/contents`, { headers }),
    fetch(`https://api.github.com/repos/${owner}/${repo}/pulls?state=all&per_page=12`, { headers }),
    fetch(`https://api.github.com/repos/${owner}/${repo}/issues?state=open&per_page=12`, { headers }),
  ]);

  if (!repoRes.ok) throw new Error(`Repository "${owner}/${repo}" not found or rate limited.`);
  const repoData = await repoRes.json();
  const languages = langRes.ok ? await langRes.json() : {};
  const commitsRaw = commitsRes.ok ? await commitsRes.json() : [];
  const contribRaw = contribRes.ok ? await contribRes.json() : [];
  const contentsRaw = contentsRes.ok ? await contentsRes.json() : [];
  const pullsRaw = pullsRes.ok ? await pullsRes.json() : [];
  const issuesRaw = issuesRes.ok ? await issuesRes.json() : [];

  const fileList = Array.isArray(contentsRaw)
    ? contentsRaw.map((i) => ({ name: i.name, type: i.type, size: i.size }))
    : [];
  const fileNames = fileList.map((f) => f.name);

  const commits = Array.isArray(commitsRaw)
    ? commitsRaw.map((c) => ({
        sha: c.sha.slice(0, 7),
        message: c.commit.message.split('\n')[0],
        author: c.commit.author?.name || 'Unknown',
        date: c.commit.author?.date,
      }))
    : [];

  const velocityMap = {};
  commits.forEach((c) => {
    if (c.date) {
      const d = c.date.slice(0, 10);
      velocityMap[d] = (velocityMap[d] || 0) + 1;
    }
  });

  const docScore = Math.min(100, (repoData.description ? 30 : 0) + (fileNames.some((f) => f.toLowerCase().includes('readme')) ? 40 : 0) + 20);
  const devopsScore = Math.min(100, 35 + (fileNames.includes('.github') ? 35 : 0) + (fileNames.some((f) => f.toLowerCase().includes('docker')) ? 20 : 0));
  const velocityScore = Math.min(100, 40 + commits.length * 2);
  const communityScore = Math.min(100, 35 + (repoData.license ? 25 : 0) + Math.min(30, contribRaw.length * 5));

  return {
    backendConnected: false,
    cached: false,
    scannedAt: new Date().toISOString(),
    rateInfo: {
      remaining: repoRes.headers.get('x-ratelimit-remaining'),
      limit: repoRes.headers.get('x-ratelimit-limit'),
    },
    meta: {
      fullName: repoData.full_name,
      description: repoData.description || 'No description provided.',
      stars: repoData.stargazers_count,
      forks: repoData.forks_count,
      openIssues: repoData.open_issues_count,
      sizeKB: repoData.size,
      defaultBranch: repoData.default_branch,
      license: repoData.license ? repoData.license.spdx_id : 'None',
      htmlUrl: repoData.html_url,
    },
    scores: {
      overall: Math.round((docScore + devopsScore + velocityScore + communityScore) / 4),
      documentation: docScore,
      devops: devopsScore,
      velocity: velocityScore,
      community: communityScore,
    },
    languages,
    commits,
    commitVelocity: Object.entries(velocityMap)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-10)
      .map(([date, count]) => ({ date: date.slice(5), count })),
    pulls: Array.isArray(pullsRaw)
      ? pullsRaw.map((p) => ({ number: p.number, title: p.title, state: p.merged_at ? 'merged' : p.state, url: p.html_url }))
      : [],
    issues: Array.isArray(issuesRaw)
      ? issuesRaw.filter((i) => !i.pull_request).map((i) => ({ number: i.number, title: i.title, url: i.html_url, isBug: (i.labels || []).some((l) => l.name.toLowerCase().includes('bug')) }))
      : [],
    contributors: Array.isArray(contribRaw)
      ? contribRaw.map((u) => ({ login: u.login, contributions: u.contributions, avatar: u.avatar_url, url: u.html_url }))
      : [],
    fileList,
  };
}

export async function fetchServerHistory() {
  try {
    const res = await fetch(`${API_BASE}/api/history`);
    if (res.ok) {
      const data = await res.json();
      return data.audits || [];
    }
  } catch {
    return null;
  }
  return null;
}

export function analyzeCodeLocally(code) {
  if (!code || !code.trim()) return { score: 100, summary: 'No code snippet provided.', issues: [] };
  const lines = code.trim().split('\n');
  const issues = [];
  let score = 96;

  if (code.includes('eval(') || code.includes('dangerouslySetInnerHTML')) {
    issues.push('CRITICAL Security Risk: Dynamic execution detected (eval / dangerouslySetInnerHTML).');
    score -= 25;
  }
  if (code.includes('async') && !code.includes('try') && !code.includes('.catch(')) {
    issues.push('Reliability Gap: Async call lacks try/catch or .catch() error boundary.');
    score -= 15;
  }
  if (code.includes('console.log(')) {
    issues.push('Code Hygiene: Remove debug console.log() before production deployment.');
    score -= 8;
  }
  if (code.includes('var ')) {
    issues.push('Modern JS Standard: Replace legacy `var` with `const` or `let`.');
    score -= 7;
  }
  if (/password|secret|api_key|apikey/i.test(code) && /['"][A-Za-z0-9_-]{12,}['"]/.test(code)) {
    issues.push('Security Alert: Possible hardcoded secret or API key detected.');
    score -= 30;
  }

  return {
    score: Math.max(10, score),
    summary: issues.length === 0 ? `Clean check across ${lines.length} lines.` : `Found ${issues.length} issue(s) across ${lines.length} lines.`,
    issues,
  };
}
