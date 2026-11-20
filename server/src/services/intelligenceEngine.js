export function analyzeRepository({ repoName = '', language = 'TypeScript', commitMessage = '', prCount = 12, openIssues = 4, deployFreq = 'Daily' }) {
  const cleanRepo = repoName.trim() || 'torstaq/edge-gateway';
  const repoLower = cleanRepo.toLowerCase();
  const msg = commitMessage.toLowerCase();

  const riskSignals = [];
  let riskScore = 24;

  const isDesignTokenRepo = repoLower.includes('design-token') || repoLower.includes('ui-design');
  const hasAuthOrDbSignal =
    msg.includes('auth') ||
    msg.includes('oauth') ||
    msg.includes('jwt') ||
    msg.includes('session') ||
    msg.includes('schema') ||
    msg.includes('migration') ||
    msg.includes('security') ||
    msg.includes('sql') ||
    (!isDesignTokenRepo && /\b(token|tokens)\b/.test(msg));

  if (msg.includes('hotfix') || msg.includes('revert') || msg.includes('force') || msg.includes('hack')) {
    riskScore += 28;
    riskSignals.push('High-churn or hotfix commit signal detected');
  }
  if (hasAuthOrDbSignal) {
    riskScore += 18;
    riskSignals.push('Touches sensitive auth, schema, or security boundary');
  }
  if (Number(openIssues) >= 8) {
    riskScore += 16;
    riskSignals.push(`Elevated open issue backlog (${openIssues} issues)`);
  }
  if (msg.includes('test') || msg.includes('ci') || msg.includes('lint') || msg.includes('docs') || msg.includes('accessible') || msg.includes('token')) {
    riskScore -= 8;
    riskSignals.push('Includes verification, CI, design-system, or documentation updates');
  }

  riskScore = Math.max(8, Math.min(94, riskScore));

  const riskLevel = riskScore >= 65 ? 'High Risk' : riskScore >= 38 ? 'Moderate' : 'Healthy';
  const healthScore = Math.max(15, Math.min(98, 100 - Math.round(riskScore * 0.72)));

  const aiSummary =
    riskLevel === 'High Risk'
      ? `Repository ${cleanRepo} (${language}) shows elevated regression pressure (${riskScore}/100). Recommend targeted integration tests, staged canary rollout, and peer code review before merging.`
      : riskLevel === 'Moderate'
        ? `Repository ${cleanRepo} (${language}) has balanced velocity with moderate change risk (${riskScore}/100). Verify edge-case tests and monitor latency after deployment.`
        : `Repository ${cleanRepo} (${language}) is operating in a healthy release window (${riskScore}/100) with strong maintainability and clean deployment cadence.`;

  const releaseNote = `${cleanRepo} (${language}) — ${riskLevel} release (${healthScore}/100 health): ${
    commitMessage.trim() || 'Routine engineering update'
  }. Tracked ${Number(prCount) || 0} PRs and ${Number(openIssues) || 0} open issues on a ${deployFreq.toLowerCase()} cadence.`;

  const recommendations = [
    riskLevel === 'High Risk'
      ? 'Gate merge on automated API + auth regression checks and deploy to a 10% canary slice first.'
      : 'Keep PR scope under ~250 changed lines and enforce CI checks on every branch.',
    `Audit ${openIssues} open issues to separate quick wins from architectural blockers.`,
    `Maintain ${deployFreq.toLowerCase()} release rhythm for ${cleanRepo} with structured changelog notes.`,
  ];

  return {
    repoName: cleanRepo,
    language,
    commitMessage: commitMessage.trim() || 'Routine engineering update',
    prCount: Number(prCount) || 12,
    openIssues: Number(openIssues) || 0,
    deployFreq,
    riskScore,
    riskLevel,
    healthScore,
    riskSignals: riskSignals.length ? riskSignals : ['Standard commit hygiene and normal PR throughput'],
    aiSummary,
    releaseNote,
    recommendations,
  };
}
