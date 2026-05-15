import { describe, expect, test } from 'vitest'

import { parseGithubRepo } from './parse-github-repo'

describe('parseGithubRepo', () => {
  test('owner/repo shorthand', () => {
    expect(parseGithubRepo('robotostudio/sanity-plugin-md-notes')).toBe(
      'robotostudio/sanity-plugin-md-notes',
    )
  })

  test('https URL with .git suffix', () => {
    expect(parseGithubRepo('https://github.com/robotostudio/sanity-plugin-md-notes.git')).toBe(
      'robotostudio/sanity-plugin-md-notes',
    )
  })

  test('https URL without .git suffix', () => {
    expect(parseGithubRepo('https://github.com/robotostudio/sanity-plugin-md-notes')).toBe(
      'robotostudio/sanity-plugin-md-notes',
    )
  })

  test('git+https URL (npm pkg.repository.url shape)', () => {
    expect(parseGithubRepo('git+https://github.com/robotostudio/sanity-plugin-md-notes.git')).toBe(
      'robotostudio/sanity-plugin-md-notes',
    )
  })

  test('git@ SSH URL', () => {
    expect(parseGithubRepo('git@github.com:robotostudio/sanity-plugin-md-notes.git')).toBe(
      'robotostudio/sanity-plugin-md-notes',
    )
  })

  test('github: shorthand', () => {
    expect(parseGithubRepo('github:robotostudio/sanity-plugin-md-notes')).toBe(
      'robotostudio/sanity-plugin-md-notes',
    )
  })

  test('object with url field (pkg.repository shape)', () => {
    expect(
      parseGithubRepo({
        type: 'git',
        url: 'git+https://github.com/robotostudio/sanity-plugin-md-notes.git',
      }),
    ).toBe('robotostudio/sanity-plugin-md-notes')
  })

  test('strips trailing path/query/hash', () => {
    expect(parseGithubRepo('https://github.com/org/repo/tree/main')).toBe('org/repo')
    expect(parseGithubRepo('https://github.com/org/repo?foo=bar')).toBe('org/repo')
    expect(parseGithubRepo('https://github.com/org/repo#readme')).toBe('org/repo')
  })

  test('strips .git suffix even with trailing hash/query/path', () => {
    expect(parseGithubRepo('https://github.com/org/repo.git#readme')).toBe('org/repo')
    expect(parseGithubRepo('https://github.com/org/repo.git?foo=bar')).toBe('org/repo')
    expect(parseGithubRepo('https://github.com/org/repo.git/tree/main')).toBe('org/repo')
  })

  test('non-GitHub URL returns null', () => {
    expect(parseGithubRepo('https://gitlab.com/org/repo')).toBeNull()
    expect(parseGithubRepo('https://bitbucket.org/org/repo')).toBeNull()
  })

  test('lookalike hostnames containing github.com return null', () => {
    expect(parseGithubRepo('https://notgithub.com/org/repo')).toBeNull()
    expect(parseGithubRepo('https://github.com.evil.com/org/repo')).toBeNull()
  })

  test('falsy / invalid input returns null', () => {
    expect(parseGithubRepo(null)).toBeNull()
    expect(parseGithubRepo(undefined)).toBeNull()
    expect(parseGithubRepo('')).toBeNull()
    expect(parseGithubRepo({})).toBeNull()
    expect(parseGithubRepo({ url: '' })).toBeNull()
  })

  test('owner/repo names with dots, dashes, underscores', () => {
    expect(parseGithubRepo('foo.bar/some-repo_name')).toBe('foo.bar/some-repo_name')
    expect(parseGithubRepo('https://github.com/foo.bar/some-repo_name.git')).toBe(
      'foo.bar/some-repo_name',
    )
  })
})
