const GITHUB_API_BASE = 'https://api.github.com';
const cache = new Map();

export function parseRepoInput(input) {
  const trimmed = (input || '').trim().replace(/\/$/, '');
  if (trimmed.includes('github.com/')) {
    const parts = trimmed.split('github.com/')[1].split('/');
    if (parts.length >= 2) {
      return { owner: parts[0], repo: parts[1].replace(/\.git$/, '') };
    }
  }
  const slashParts = trimmed.split('/');
  if (slashParts.length === 2 && slashParts[0] && slashParts[1]) {
    return { owner: slashParts[0], repo: slashParts[1] };
  }
  throw new Error('Invalid repository identifier. Expected format: owner/repo');
}

export async function analyzeRepositoryService(owner, repo, customToken = '') {
  const cacheKey = `${owner.toLowerCase()}/${repo.toLowerCase()}`;
  const ttlMs = (Number(process.env.CACHE_TTL_SECONDS) || 300) * 1000;

  if (!customToken && cache.has(cacheKey)) {
    const cached = cache.get(cacheKey);
    if (Date.now() - cached.timestamp < ttlMs) {
      return { ...cached.data, cached: true };
    }
  }

  const token = customToken || process.env.GITHUB_TOKEN || '';
  const headers = { Accept: 'application/vnd.github+json', 'User-Agent': 'DevIntel-Platform' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const [repoRes, langRes, commitsRes, contributorsRes, contentsRes, pullsRes, issuesRes] =
    await Promise.all([
      fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}`, { headers }),
      fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/languages`, { headers }),
      fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/commits?per_page=30`, { headers }),
      fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/contributors?per_page=10`, { headers }),
      fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/contents`, { headers }),
      fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/pulls?state=all&per_page=15`, { headers }),
      fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/issues?state=open&per_page=15`, { headers }),
    ]);

  if (!repoRes.ok) {
    if (repoRes.status === 404) throw new Error(`Repository "${owner}/${repo}" not found.`);
    if (repoRes.status === 403) throw new Error('GitHub API rate limit reached. Provide a GitHub PAT.');
    throw new Error(`GitHub API error (${repoRes.status})`);
  }

  const rateRemaining = repoRes.headers.get('x-ratelimit-remaining');
  const rateLimit = repoRes.headers.get('x-ratelimit-limit');

  const repoData = await repoRes.json();
  const languages = langRes.ok ? await langRes.json() : {};
  const commitsRaw = commitsRes.ok ? await commitsRes.json() : [];
  const contributorsRaw = contributorsRes.ok ? await contributorsRes.json() : [];
  const contentsRaw = contentsRes.ok ? await contentsRes.json() : [];
  const pullsRaw = pullsRes.ok ? await pullsRes.json() : [];
  const issuesRaw = issuesRes.ok ? await issuesRes.json() : [];

  const fileList = Array.isArray(contentsRaw)
    ? contentsRaw.map((item) => ({ name: item.name, type: item.type, size: item.size }))
    : [];
  const fileNames = fileList.map((f) => f.name);

  const pulls = Array.isArray(pullsRaw)
    ? pullsRaw.map((pr) => ({
        number: pr.number,
        title: pr.title,
        state: pr.merged_at ? 'merged' : pr.state,
        user: pr.user?.login || 'unknown',
        url: pr.html_url,
      }))
    : [];

  const issues = Array.isArray(issuesRaw)
    ? issuesRaw
        .filter((i) => !i.pull_request)
        .map((i) => ({
          number: i.number,
          title: i.title,
          url: i.html_url,
          isBug: (i.labels || []).some((l) => l.name.toLowerCase().includes('bug')),
        }))
    : [];

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
    if (!c.date) return;
    const day = c.date.slice(0, 10);
    velocityMap[day] = (velocityMap[day] || 0) + 1;
  });
  const commitVelocity = Object.entries(velocityMap)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-10)
    .map(([date, count]) => ({ date: date.slice(5), count }));

  const docScore = Math.min(
    100,
    (repoData.description ? 30 : 0) +
      (fileNames.some((f) => f.toLowerCase().includes('readme')) ? 40 : 0) +
      (fileNames.some((f) => f.toLowerCase().includes('contributing') || f.toLowerCase().includes('docs')) ? 30 : 10)
  );
  const devopsScore = Math.min(
    100,
    30 +
      (fileNames.includes('.github') ? 35 : 0) +
      (fileNames.some((f) => f.toLowerCase().includes('docker')) ? 20 : 0) +
      (fileNames.some((f) => f.toLowerCase().includes('test') || f.toLowerCase().includes('spec')) ? 15 : 0)
  );
  const velocityScore = Math.min(100, 35 + commits.length * 2 + (pulls.length > 0 ? 15 : 0));
  const communityScore = Math.min(
    100,
    30 +
      (repoData.license ? 25 : 0) +
      (contributorsRaw.length >= 5 ? 25 : contributorsRaw.length * 5) +
      (repoData.stargazers_count > 100 ? 20 : 10)
  );
  const overall = Math.round((docScore + devopsScore + velocityScore + communityScore) / 4);

  const payload = {
    cached: false,
    scannedAt: new Date().toISOString(),
    rateInfo: { remaining: rateRemaining, limit: rateLimit },
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
      overall,
      documentation: docScore,
      devops: devopsScore,
      velocity: velocityScore,
      community: communityScore,
    },
    languages,
    commits,
    commitVelocity,
    pulls,
    issues,
    contributors: Array.isArray(contributorsRaw)
      ? contributorsRaw.map((u) => ({
          login: u.login,
          contributions: u.contributions,
          avatar: u.avatar_url,
          url: u.html_url,
        }))
      : [],
    fileList,
  };

  cache.set(cacheKey, { timestamp: Date.now(), data: payload });
  return payload;
}

export async function fetchRawFileService(owner, repo, filePath, customToken = '') {
  const token = customToken || process.env.GITHUB_TOKEN || '';
  const headers = { Accept: 'application/vnd.github+json', 'User-Agent': 'DevIntel-Platform' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/contents/${filePath}`, { headers });
  if (!res.ok) throw new Error(`Cannot fetch file ${filePath}`);
  const data = await res.json();
  if (data.encoding === 'base64' && data.content) {
    return Buffer.from(data.content, 'base64').toString('utf-8');
  }
  throw new Error('Unsupported file encoding');
}
