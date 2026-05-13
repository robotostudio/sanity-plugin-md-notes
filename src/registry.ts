/**
 * Help content registry. Built once at plugin init from the file map the
 * consumer passes in (Vite `import.meta.glob` or Webpack `require.context`).
 */

export interface HelpEntry {
  content: string
  lastUpdated: string | null
  sourcePath: string
}

export interface HelpRegistryOptions {
  /**
   * Map of file path → raw markdown string. The path is used to derive the
   * schema-type key: the basename (minus `.help.md`) must equal the schema
   * `name:` you want to attach help to.
   *
   * Vite example:
   *   const files = import.meta.glob('./sanity/schemas/**\/*.help.md', {
   *     eager: true, query: '?raw', import: 'default'
   *   })
   *
   * Webpack example:
   *   const files = {}
   *   const ctx = require.context('./sanity/schemas', true, /\.help\.md$/)
   *   ctx.keys().forEach((k) => { files[k] = ctx(k) })
   */
  files: Record<string, string>

  /**
   * GitHub `owner/repo` for the "Edit on GitHub" footer link. Optional;
   * footer link is hidden when omitted.
   *   e.g. 'BabelStreet/sanity-babel-street'
   */
  githubRepo?: string

  /**
   * Branch the GitHub link should point at. Defaults to `main`.
   */
  branch?: string

  /**
   * Prefix to strip from the file key when constructing the GitHub path.
   * Useful when your glob's keys start with `./` or `../`. Defaults to
   * stripping a leading `./` or `../`.
   */
  basePath?: string
}

function parseFrontmatter(raw: string): {
  body: string
  lastUpdated: string | null
} {
  const match = raw.match(/^---\r?\n([\s\S]+?)\r?\n---\r?\n([\s\S]*)$/)
  if (!match) return {body: raw, lastUpdated: null}
  const meta = match[1] ?? ''
  const body = match[2] ?? ''
  const lu = meta.match(/^\s*lastUpdated:\s*['"]?([^'"\s]+)['"]?\s*$/m)
  return {body, lastUpdated: lu ? lu[1] : null}
}

let registry: Record<string, HelpEntry> = {}
let editUrlBase: string | null = null

export function initHelpRegistry(options: HelpRegistryOptions): void {
  const {files, githubRepo, branch = 'main', basePath} = options
  registry = {}
  editUrlBase = githubRepo
    ? `https://github.com/${githubRepo}/blob/${branch}`
    : null

  for (const [path, raw] of Object.entries(files)) {
    if (typeof raw !== 'string') continue
    const match = path.match(/([^/\\]+)\.help\.md$/)
    if (!match || !match[1]) continue
    const {body, lastUpdated} = parseFrontmatter(raw)
    const sourcePath = basePath
      ? path.replace(new RegExp(`^${basePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`), '')
      : path.replace(/^\.\.?\//, '')
    registry[match[1]] = {content: body, lastUpdated, sourcePath}
  }
}

export function getHelp(schemaType: string): HelpEntry | undefined {
  return registry[schemaType]
}

export function hasHelp(schemaType: string): boolean {
  return schemaType in registry
}

export function getEditUrl(entry: HelpEntry): string | null {
  if (!editUrlBase) return null
  return `${editUrlBase}/${entry.sourcePath}`
}
