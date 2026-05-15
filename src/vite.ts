/// <reference types="node" />
/**
 * Vite plugin for `sanity-plugin-md-notes`.
 *
 * Detects the consumer's GitHub remote from `.git/config` at dev/build time
 * and replaces the runtime stub at `sanity-plugin-md-notes/git-repo` with the
 * resolved value:
 *
 *     // vite.config.ts
 *     import {sanityHelpVite} from 'sanity-plugin-md-notes/vite'
 *     export default defineConfig({plugins: [sanityHelpVite()]})
 *
 *     // sanity.config.ts
 *     import gitRepo from 'sanity-plugin-md-notes/git-repo'
 *     helpPlugin({files: helpFiles, githubRepo: gitRepo})
 *
 * `gitRepo` resolves to `'owner/repo'` when the origin remote points at
 * GitHub, otherwise `null` — in which case the "Edit on GitHub" footer is
 * suppressed without complaint. Without the Vite plugin registered, the
 * stub returns `null` at runtime, so the import is safe in any environment.
 *
 * Only runs in Vite (this entry point imports `node:fs`). Webpack/Next.js
 * consumers will get the `null` stub; pass `githubRepo: pkg.repository` on
 * `helpPlugin` manually instead.
 */
import {existsSync, readFileSync, statSync} from 'node:fs'
import {dirname, join, resolve} from 'node:path'

import {parseGithubRepo} from './parse-github-repo'

const STUB_ID = 'sanity-plugin-md-notes/git-repo'
const RESOLVED_ID = '\0sanity-plugin-md-notes:git-repo'

export interface SanityHelpViteOptions {
  /**
   * Directory to start searching for `.git/` from. Defaults to
   * `process.cwd()`. The plugin walks upward until it finds a `.git` dir or
   * file — so monorepos where the studio lives in `apps/studio/` work
   * without configuration.
   */
  cwd?: string

  /**
   * Skip git detection and use this value as-is. Accepts the same shapes as
   * `helpPlugin`'s `githubRepo` option (shorthand, URL, or `{url}` object).
   */
  override?: string | {url?: string} | null
}

// EACCES, transient FS errors, malformed worktree state — return null so
// `findGitDir` keeps walking rather than crashing plugin init.
function resolveGitCandidate(candidate: string, dir: string): string | null {
  try {
    if (!existsSync(candidate)) return null
    const stat = statSync(candidate)
    if (stat.isDirectory()) return candidate
    if (!stat.isFile()) return null
    // `.git` file in worktrees/submodules — contains `gitdir: <path>`
    const content = readFileSync(candidate, 'utf8').trim()
    const match = content.match(/^gitdir:\s*(.+)$/m)
    return match && match[1] ? resolve(dir, match[1]) : null
  } catch {
    return null
  }
}

function findGitDir(startDir: string): string | null {
  let dir = resolve(startDir)
  for (let i = 0; i < 50; i++) {
    const resolved = resolveGitCandidate(join(dir, '.git'), dir)
    if (resolved) return resolved
    const parent = dirname(dir)
    if (parent === dir) return null
    dir = parent
  }
  return null
}

function readOriginUrl(gitDir: string): string | null {
  const configPath = join(gitDir, 'config')
  if (!existsSync(configPath)) return null
  let cfg: string
  try {
    cfg = readFileSync(configPath, 'utf8')
  } catch {
    return null
  }
  // Naive INI scan — find [remote "origin"] section and its `url` entry.
  // Sections are delimited by the next `[...]` header.
  const sectionMatch = cfg.match(/\[remote\s+"origin"\]([\s\S]*?)(?=\n\[|$)/i)
  if (!sectionMatch || !sectionMatch[1]) return null
  const urlMatch = sectionMatch[1].match(/^\s*url\s*=\s*(.+)$/m)
  return urlMatch && urlMatch[1] ? urlMatch[1].trim() : null
}

interface MinimalVitePlugin {
  name: string
  enforce?: 'pre' | 'post'
  config?: () => {optimizeDeps?: {exclude?: string[]}}
  configResolved?: () => void
  resolveId?: (id: string) => string | null | undefined
  load?: (id: string) => string | null | undefined
}

export function sanityHelpVite(options: SanityHelpViteOptions = {}): MinimalVitePlugin {
  let repo: string | null = null

  return {
    name: 'sanity-plugin-md-notes:vite',
    enforce: 'pre',
    config() {
      // Vite pre-bundles npm deps before plugins run; without this exclude,
      // `sanity-plugin-md-notes/git-repo` would be resolved to the null stub
      // before our resolveId hook gets a chance to intercept it.
      return {optimizeDeps: {exclude: [STUB_ID]}}
    },
    configResolved() {
      if (options.override !== undefined) {
        repo = parseGithubRepo(options.override)
        return
      }
      const gitDir = findGitDir(options.cwd ?? process.cwd())
      if (!gitDir) return
      repo = parseGithubRepo(readOriginUrl(gitDir))
    },
    resolveId(id) {
      return id === STUB_ID ? RESOLVED_ID : null
    },
    load(id) {
      if (id !== RESOLVED_ID) return null
      return `export default ${JSON.stringify(repo)};\n`
    },
  }
}
