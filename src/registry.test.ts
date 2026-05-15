import { beforeEach, describe, expect, test } from 'vitest'

import { getEditUrl, getHelp, hasHelp, initHelpRegistry } from './registry'

const mdWithFrontmatter = `---
lastUpdated: 2026-05-13
---

# Hello

Body content.`

const mdWithoutFrontmatter = `# Hello

Just a body, no frontmatter.`

const mdWithQuotedDate = `---
lastUpdated: '2026-05-13'
---

# Quoted`

const mdWithExtraFrontmatter = `---
author: jane
lastUpdated: 2026-05-13
tags: foo
---

# Extra frontmatter fields`

describe('initHelpRegistry', () => {
  beforeEach(() => {
    initHelpRegistry({ files: {} })
  })

  test('extracts schema name from path basename', () => {
    initHelpRegistry({
      files: {
        './sanity/schemas/documents/page.help.md': mdWithFrontmatter,
        './sanity/schemas/documents/post.help.md': mdWithoutFrontmatter,
      },
    })
    expect(hasHelp('page')).toBe(true)
    expect(hasHelp('post')).toBe(true)
    expect(hasHelp('nonexistent')).toBe(false)
  })

  test('handles kebab-case schema names', () => {
    initHelpRegistry({
      files: {
        './schemas/not-found-page.help.md': mdWithFrontmatter,
      },
    })
    expect(hasHelp('not-found-page')).toBe(true)
  })

  test('handles Windows backslash paths', () => {
    initHelpRegistry({
      files: {
        '.\\sanity\\schemas\\page.help.md': mdWithFrontmatter,
      },
    })
    expect(hasHelp('page')).toBe(true)
  })

  test('skips non-string values silently', () => {
    initHelpRegistry({
      files: {
        './schemas/page.help.md': mdWithFrontmatter,
        './schemas/bad.help.md': undefined as unknown as string,
      },
    })
    expect(hasHelp('page')).toBe(true)
    expect(hasHelp('bad')).toBe(false)
  })

  test('skips files without the .help.md suffix', () => {
    initHelpRegistry({
      files: {
        './schemas/page.md': mdWithFrontmatter,
        './schemas/page.help.txt': mdWithFrontmatter,
      },
    })
    expect(hasHelp('page')).toBe(false)
  })

  test('re-init wipes previous entries', () => {
    initHelpRegistry({ files: { './schemas/page.help.md': mdWithFrontmatter } })
    expect(hasHelp('page')).toBe(true)
    initHelpRegistry({ files: { './schemas/post.help.md': mdWithFrontmatter } })
    expect(hasHelp('page')).toBe(false)
    expect(hasHelp('post')).toBe(true)
  })
})

describe('frontmatter parsing (via initHelpRegistry)', () => {
  test('extracts lastUpdated and strips frontmatter from body', () => {
    initHelpRegistry({ files: { './schemas/page.help.md': mdWithFrontmatter } })
    const entry = getHelp('page')
    expect(entry?.lastUpdated).toBe('2026-05-13')
    // Note the leading newline: the frontmatter regex consumes up to and
    // including the closing `---\n` but not the blank line after it. This
    // is benign for markdown rendering and we keep the regex simple.
    expect(entry?.content).toBe('\n# Hello\n\nBody content.')
  })

  test('returns null lastUpdated when frontmatter is missing', () => {
    initHelpRegistry({ files: { './schemas/page.help.md': mdWithoutFrontmatter } })
    const entry = getHelp('page')
    expect(entry?.lastUpdated).toBeNull()
    expect(entry?.content).toBe(mdWithoutFrontmatter)
  })

  test('strips quotes around lastUpdated value', () => {
    initHelpRegistry({ files: { './schemas/page.help.md': mdWithQuotedDate } })
    expect(getHelp('page')?.lastUpdated).toBe('2026-05-13')
  })

  test('extracts lastUpdated when surrounded by other frontmatter fields', () => {
    initHelpRegistry({ files: { './schemas/page.help.md': mdWithExtraFrontmatter } })
    expect(getHelp('page')?.lastUpdated).toBe('2026-05-13')
  })

  test('CRLF line endings work', () => {
    const crlf = mdWithFrontmatter.replace(/\n/g, '\r\n')
    initHelpRegistry({ files: { './schemas/page.help.md': crlf } })
    expect(getHelp('page')?.lastUpdated).toBe('2026-05-13')
  })
})

describe('getEditUrl', () => {
  test('builds GitHub blob URL from owner/repo + default branch', () => {
    initHelpRegistry({
      files: { './schemas/page.help.md': mdWithFrontmatter },
      githubRepo: 'org/repo',
    })
    const entry = getHelp('page')!
    expect(getEditUrl(entry)).toBe('https://github.com/org/repo/blob/main/schemas/page.help.md')
  })

  test('respects custom branch', () => {
    initHelpRegistry({
      files: { './schemas/page.help.md': mdWithFrontmatter },
      githubRepo: 'org/repo',
      branch: 'next',
    })
    expect(getEditUrl(getHelp('page')!)).toBe(
      'https://github.com/org/repo/blob/next/schemas/page.help.md',
    )
  })

  test('strips configured basePath from source path', () => {
    initHelpRegistry({
      files: { 'apps/studio/schemas/page.help.md': mdWithFrontmatter },
      githubRepo: 'org/repo',
      basePath: 'apps/studio/',
    })
    expect(getEditUrl(getHelp('page')!)).toBe(
      'https://github.com/org/repo/blob/main/schemas/page.help.md',
    )
  })

  test('accepts pkg.repository object as githubRepo', () => {
    initHelpRegistry({
      files: { './schemas/page.help.md': mdWithFrontmatter },
      githubRepo: { type: 'git', url: 'git+https://github.com/org/repo.git' },
    })
    expect(getEditUrl(getHelp('page')!)).toBe(
      'https://github.com/org/repo/blob/main/schemas/page.help.md',
    )
  })

  test('returns null when no githubRepo configured', () => {
    initHelpRegistry({ files: { './schemas/page.help.md': mdWithFrontmatter } })
    expect(getEditUrl(getHelp('page')!)).toBeNull()
  })

  test('returns null when githubRepo is unparseable', () => {
    initHelpRegistry({
      files: { './schemas/page.help.md': mdWithFrontmatter },
      githubRepo: 'https://gitlab.com/org/repo',
    })
    expect(getEditUrl(getHelp('page')!)).toBeNull()
  })
})
