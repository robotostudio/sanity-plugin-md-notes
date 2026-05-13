/// <reference types="node" />
/**
 * Vite plugin for `sanity-plugin-help`.
 *
 * Detects the consumer's GitHub remote from `.git/config` at dev/build time
 * and replaces the runtime stub at `sanity-plugin-help/git-repo` with the
 * resolved value:
 *
 *     // vite.config.ts
 *     import {sanityHelpVite} from 'sanity-plugin-help/vite'
 *     export default defineConfig({plugins: [sanityHelpVite()]})
 *
 *     // sanity.config.ts
 *     import gitRepo from 'sanity-plugin-help/git-repo'
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

const STUB_ID = 'sanity-plugin-help/git-repo'
const RESOLVED_ID = '\0sanity-plugin-help:git-repo'

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

function findGitDir(startDir: string): string | null {
  let dir = resolve(startDir)
  for (let i = 0; i < 50; i++) {
    const candidate = join(dir, '.git')
    if (existsSync(candidate)) {
      const stat = statSync(candidate)
      if (stat.isDirectory()) return candidate
      if (stat.isFile()) {
        // `.git` file in worktrees/submodules — contains `gitdir: <path>`
        const content = readFileSync(candidate, 'utf8').trim()
        const match = content.match(/^gitdir:\s*(.+)$/m)
        if (match && match[1]) return resolve(dir, match[1])
      }
    }
    const parent = dirname(dir)
    if (parent === dir) return null
    dir = parent
  }
  return null
}

function readOriginUrl(gitDir: string): string | null {
  const configPath = join(gitDir, 'config')
  if (!existsSync(configPath)) return null
  const cfg = readFileSync(configPath, 'utf8')
  // Naive INI scan — find [remote "origin"] section and its `url` entry.
  // Sections are delimited by the next `[...]` header.
  const sectionMatch = cfg.match(/\[remote\s+"origin"\]([\s\S]*?)(?=\n\[|$)/i)
  if (!sectionMatch || !sectionMatch[1]) return null
  const urlMatch = sectionMatch[1].match(/^\s*url\s*=\s*(.+)$/m)
  return urlMatch && urlMatch[1] ? urlMatch[1].trim() : null
}

function parseGithubRepo(input: string | {url?: string} | null | undefined): string | null {
  if (!input) return null
  const raw = typeof input === 'string' ? input : input.url
  if (!raw || typeof raw !== 'string') return null
  const cleaned = raw
    .trim()
    .replace(/^git\+/, '')
    .replace(/\.git$/, '')
  const ghShort = cleaned.match(/^github:([\w.-]+)\/([\w.-]+)$/i)
  if (ghShort) return `${ghShort[1]}/${ghShort[2]}`
  const ghUrl = cleaned.match(/github\.com[:/]([\w.-]+)\/([\w.-]+?)(?:[/?#]|$)/i)
  if (ghUrl) return `${ghUrl[1]}/${ghUrl[2]}`
  const plain = cleaned.match(/^([\w.-]+)\/([\w.-]+)$/)
  if (plain && !cleaned.includes('://') && !cleaned.includes('@')) {
    return `${plain[1]}/${plain[2]}`
  }
  return null
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
    name: 'sanity-plugin-help:vite',
    enforce: 'pre',
    config() {
      // Vite pre-bundles npm deps before plugins run; without this exclude,
      // `sanity-plugin-help/git-repo` would be resolved to the null stub
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
