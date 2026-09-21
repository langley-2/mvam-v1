// Heuristic checks supplement review; never print matched credential values.
export const secretPatterns = [
  ['private key', /-----BEGIN (?:[A-Z]+ )?PRIVATE KEY-----/],
  ['OpenAI key', /\bsk-(?:proj-|svcacct-)?[A-Za-z0-9_-]{24,}/],
  ['GitHub token', /\b(?:gh[pousr]_[A-Za-z0-9_]{30,}|github_pat_[A-Za-z0-9_]{30,})/],
  ['AWS access key', /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/],
  ['Slack token', /\bxox[baprs]-[A-Za-z0-9-]{20,}/],
  ['credential in URL', /https?:\/\/[^\s/:"'<>]+:[^\s/@"'<>]+@/],
  ['assigned secret', /\b(?:api_?key|password|client_secret|access_token)\s*[:=]\s*["'][A-Za-z0-9_+\/-]{20,}["']/i],
]
export function findSecrets(text) {
  return secretPatterns.filter(([, pattern]) => pattern.test(text)).map(([name]) => name)
}
