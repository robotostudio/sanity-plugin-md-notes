/**
 * Normalises a wide range of repo identifiers into an `owner/repo` string.
 * Returns `null` when nothing recognisable is found — call sites then
 * suppress the "Edit on GitHub" footer link rather than point it at a
 * broken URL.
 *
 * Accepts every shape we've seen in the wild:
 * - `'owner/repo'` shorthand
 * - `'https://github.com/owner/repo[.git]'`
 * - `'git+https://github.com/owner/repo.git'`
 * - `'git@github.com:owner/repo.git'`
 * - `'github:owner/repo'`
 * - `{url: string}` — the shape of `pkg.repository` in package.json
 *
 * Used by both the consumer-facing `helpPlugin({githubRepo})` option (via
 * `registry.ts`) and the Vite plugin's auto-detection from `.git/config`
 * (via `vite.ts`). Single source of truth for a parser we'd otherwise
 * have two slightly-different copies of.
 */
export function parseGithubRepo(
  input: string | {url?: string; type?: string} | null | undefined,
): string | null {
  if (!input) return null
  const raw = typeof input === 'string' ? input : input.url
  if (!raw || typeof raw !== 'string') return null
  const cleaned = raw
    .trim()
    .replace(/^git\+/, '')
    .replace(/\.git$/, '')

  // github:owner/repo shorthand
  const ghShort = cleaned.match(/^github:([\w.-]+)\/([\w.-]+)$/i)
  if (ghShort) return `${ghShort[1]}/${ghShort[2]}`

  // Real github.com hosts only — covers https://, git://, ssh://, and the
  // `git@github.com:owner/repo` SCP-style. The protocol prefix is optional
  // so plain `github.com/owner/repo` still matches, but lookalikes like
  // `notgithub.com` or `github.com.evil.com` correctly fail.
  const ghUrl = cleaned.match(
    /^(?:(?:https?|ssh|git):\/\/(?:[^@/\s]+@)?|git@)?github\.com[:/]([\w.-]+)\/([\w.-]+?)(?:[/?#]|$)/i,
  )
  if (ghUrl) return `${ghUrl[1]}/${ghUrl[2]}`

  // plain `owner/repo` (no scheme, no `@`, exactly one slash)
  const plain = cleaned.match(/^([\w.-]+)\/([\w.-]+)$/)
  if (plain && !cleaned.includes('://') && !cleaned.includes('@')) {
    return `${plain[1]}/${plain[2]}`
  }

  return null
}
