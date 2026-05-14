import {mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'

import {afterEach, beforeEach, describe, expect, test} from 'vitest'

import {generateHelpFiles} from './codegen'

let workDir: string

beforeEach(() => {
  workDir = mkdtempSync(join(tmpdir(), 'sanity-plugin-md-notes-codegen-'))
})

afterEach(() => {
  rmSync(workDir, {recursive: true, force: true})
})

function writeHelp(relativePath: string, content = '# placeholder\n'): void {
  const full = join(workDir, relativePath)
  mkdirSync(join(full, '..'), {recursive: true})
  writeFileSync(full, content, 'utf8')
}

describe('generateHelpFiles', () => {
  test('discovers .help.md files and writes a TS module with imports + helpFiles export', () => {
    writeHelp('schemas/page.help.md')
    writeHelp('schemas/documents/post.help.md')

    const result = generateHelpFiles({
      inputDir: join(workDir, 'schemas'),
      outputFile: join(workDir, 'sanity/help-files.ts'),
    })

    expect(result.filesWritten).toBe(2)

    const content = readFileSync(join(workDir, 'sanity/help-files.ts'), 'utf8')
    expect(content).toContain('import help0 from')
    expect(content).toContain('import help1 from')
    // Sorted by full path, so `schemas/documents/post...` comes before `schemas/page...`.
    expect(content).toContain("'post.help.md': help0")
    expect(content).toContain("'page.help.md': help1")
    expect(content).toContain('export const helpFiles: Record<string, string>')
  })

  test('keys are the basename only, not the full path', () => {
    writeHelp('schemas/deeply/nested/path/page.help.md')
    generateHelpFiles({
      inputDir: join(workDir, 'schemas'),
      outputFile: join(workDir, 'help-files.ts'),
    })
    const content = readFileSync(join(workDir, 'help-files.ts'), 'utf8')
    expect(content).toContain("'page.help.md': help0")
  })

  test('generates relative import paths from the output file location', () => {
    writeHelp('schemas/page.help.md')
    generateHelpFiles({
      inputDir: join(workDir, 'schemas'),
      outputFile: join(workDir, 'sanity/help-files.ts'),
    })
    const content = readFileSync(join(workDir, 'sanity/help-files.ts'), 'utf8')
    // Output is at ./sanity/help-files.ts, file is at ./schemas/page.help.md
    // → relative path should walk up out of /sanity then into /schemas
    expect(content).toMatch(/import help0 from '\.\.\/schemas\/page\.help\.md'/)
  })

  test('output file is sorted deterministically', () => {
    writeHelp('schemas/c.help.md')
    writeHelp('schemas/a.help.md')
    writeHelp('schemas/b.help.md')
    generateHelpFiles({
      inputDir: join(workDir, 'schemas'),
      outputFile: join(workDir, 'help-files.ts'),
    })
    const content = readFileSync(join(workDir, 'help-files.ts'), 'utf8')
    const aIdx = content.indexOf('a.help.md')
    const bIdx = content.indexOf('b.help.md')
    const cIdx = content.indexOf('c.help.md')
    expect(aIdx).toBeLessThan(bIdx)
    expect(bIdx).toBeLessThan(cIdx)
  })

  test('creates the output directory if missing', () => {
    writeHelp('schemas/page.help.md')
    generateHelpFiles({
      inputDir: join(workDir, 'schemas'),
      outputFile: join(workDir, 'a/b/c/help-files.ts'),
    })
    // No throw = success; file is readable
    const content = readFileSync(join(workDir, 'a/b/c/help-files.ts'), 'utf8')
    expect(content).toContain('helpFiles')
  })

  test('throws when inputDir does not exist', () => {
    expect(() =>
      generateHelpFiles({
        inputDir: join(workDir, 'does-not-exist'),
        outputFile: join(workDir, 'help-files.ts'),
      }),
    ).toThrow(/inputDir not found/)
  })

  test('ignores node_modules and dotdirs', () => {
    writeHelp('schemas/page.help.md')
    writeHelp('schemas/node_modules/poisoned/bad.help.md')
    writeHelp('schemas/.hidden/secret.help.md')

    const result = generateHelpFiles({
      inputDir: join(workDir, 'schemas'),
      outputFile: join(workDir, 'help-files.ts'),
    })
    expect(result.filesWritten).toBe(1)
  })
})
