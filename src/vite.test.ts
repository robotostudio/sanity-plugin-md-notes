import {mkdirSync, mkdtempSync, rmSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'

import {afterEach, beforeEach, describe, expect, test} from 'vitest'

import {sanityHelpVite} from './vite'

let workDir: string

beforeEach(() => {
  workDir = mkdtempSync(join(tmpdir(), 'sanity-plugin-help-vite-'))
})

afterEach(() => {
  rmSync(workDir, {recursive: true, force: true})
})

function writeGitConfig(remoteUrl: string): void {
  const gitDir = join(workDir, '.git')
  mkdirSync(gitDir, {recursive: true})
  writeFileSync(
    join(gitDir, 'config'),
    `[core]\n\trepositoryformatversion = 0\n[remote "origin"]\n\turl = ${remoteUrl}\n\tfetch = +refs/heads/*:refs/remotes/origin/*\n`,
    'utf8',
  )
}

describe('sanityHelpVite()', () => {
  test('config() excludes the git-repo stub from optimizeDeps', () => {
    const plugin = sanityHelpVite()
    const cfg = plugin.config!()
    expect(cfg.optimizeDeps?.exclude).toContain('sanity-plugin-help/git-repo')
  })

  test('resolveId intercepts the git-repo subpath', () => {
    const plugin = sanityHelpVite()
    const id = plugin.resolveId!('sanity-plugin-help/git-repo')
    expect(typeof id).toBe('string')
    expect(id).toMatch(/^\0/) // null-byte prefix = virtual module
  })

  test('resolveId returns null for any other id', () => {
    const plugin = sanityHelpVite()
    expect(plugin.resolveId!('react')).toBeNull()
    expect(plugin.resolveId!('./something')).toBeNull()
  })

  test('load returns the override repo when one is configured', () => {
    const plugin = sanityHelpVite({override: 'org/repo'})
    plugin.configResolved!()
    const resolved = plugin.resolveId!('sanity-plugin-help/git-repo')!
    const result = plugin.load!(resolved)!
    expect(result).toContain('"org/repo"')
    expect(result).toContain('export default')
  })

  test('detects repo from a real .git/config file (https url)', () => {
    writeGitConfig('https://github.com/foo/bar.git')
    const plugin = sanityHelpVite({cwd: workDir})
    plugin.configResolved!()
    const resolved = plugin.resolveId!('sanity-plugin-help/git-repo')!
    expect(plugin.load!(resolved)).toContain('"foo/bar"')
  })

  test('detects repo from a real .git/config file (ssh url)', () => {
    writeGitConfig('git@github.com:foo/bar.git')
    const plugin = sanityHelpVite({cwd: workDir})
    plugin.configResolved!()
    const resolved = plugin.resolveId!('sanity-plugin-help/git-repo')!
    expect(plugin.load!(resolved)).toContain('"foo/bar"')
  })

  test('walks up to find .git/ in a parent dir (monorepo case)', () => {
    writeGitConfig('https://github.com/foo/bar.git')
    const nested = join(workDir, 'apps', 'studio')
    mkdirSync(nested, {recursive: true})

    const plugin = sanityHelpVite({cwd: nested})
    plugin.configResolved!()
    const resolved = plugin.resolveId!('sanity-plugin-help/git-repo')!
    expect(plugin.load!(resolved)).toContain('"foo/bar"')
  })

  test('emits null when no .git/ exists in any ancestor dir', () => {
    // No writeGitConfig — empty workDir
    const plugin = sanityHelpVite({cwd: workDir})
    plugin.configResolved!()
    const resolved = plugin.resolveId!('sanity-plugin-help/git-repo')!
    expect(plugin.load!(resolved)).toBe('export default null;\n')
  })

  test('emits null when origin URL is non-GitHub', () => {
    writeGitConfig('https://gitlab.com/foo/bar.git')
    const plugin = sanityHelpVite({cwd: workDir})
    plugin.configResolved!()
    const resolved = plugin.resolveId!('sanity-plugin-help/git-repo')!
    expect(plugin.load!(resolved)).toBe('export default null;\n')
  })

  test('handles the .git file pointer used by worktrees/submodules', () => {
    // Real `.git/` lives at workDir/.git-real
    const realGitDir = join(workDir, '.git-real')
    mkdirSync(realGitDir, {recursive: true})
    writeFileSync(
      join(realGitDir, 'config'),
      `[remote "origin"]\n\turl = https://github.com/foo/bar.git\n`,
      'utf8',
    )
    // Worktree-style `.git` is a file containing `gitdir: <path>`
    writeFileSync(join(workDir, '.git'), `gitdir: ${realGitDir}\n`, 'utf8')

    const plugin = sanityHelpVite({cwd: workDir})
    plugin.configResolved!()
    const resolved = plugin.resolveId!('sanity-plugin-help/git-repo')!
    expect(plugin.load!(resolved)).toContain('"foo/bar"')
  })
})
