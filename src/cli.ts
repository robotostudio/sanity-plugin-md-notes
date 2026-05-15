#!/usr/bin/env node
/// <reference types="node" />
/**
 * `sanity-plugin-md-notes` CLI.
 *
 * Currently exposes one command:
 *
 *     sanity-plugin-md-notes codegen [options]
 *
 * Scans a directory for `*.help.md` files and writes a TypeScript module
 * that imports each one and re-exports them as a `helpFiles` object you
 * can pass directly to `helpPlugin({files: helpFiles, ...})`. Supports a
 * `--watch` flag so the file stays in sync with the filesystem during
 * `next dev` / similar workflows — necessary in environments like
 * Turbopack that don't support Webpack's `require.context` or Vite's
 * `import.meta.glob`.
 */
import { generateHelpFiles, type GenerateHelpFilesOptions } from './codegen.js'

interface CodegenCliOptions extends GenerateHelpFilesOptions {
  watch: boolean
}

function printHelp(): void {
  // eslint-disable-next-line no-console
  console.log(
    [
      'sanity-plugin-md-notes — CLI',
      '',
      'Usage:',
      '  sanity-plugin-md-notes codegen [options]',
      '',
      'Options:',
      '  --in <path>      Directory to scan for *.help.md (default: ./sanity/schemas)',
      '  --out <path>     Output TypeScript file        (default: ./sanity/help-files.ts)',
      '  --watch, -w      Re-generate on filesystem changes (requires `chokidar`)',
      '  --help, -h       Show this help',
      '',
      'Examples:',
      '  npx sanity-plugin-md-notes codegen',
      '  npx sanity-plugin-md-notes codegen --in src/schemas --out src/help-files.ts',
      '  concurrently "npx sanity-plugin-md-notes codegen --watch" "next dev"',
    ].join('\n'),
  )
}

function parseCodegenArgs(argv: string[]): CodegenCliOptions | 'help' {
  const opts: CodegenCliOptions = { watch: false }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--help' || arg === '-h') return 'help'
    if (arg === '--watch' || arg === '-w') opts.watch = true
    else if (arg === '--in') opts.inputDir = argv[++i]
    else if (arg === '--out') opts.outputFile = argv[++i]
    else {
      // eslint-disable-next-line no-console
      console.error(`Unknown argument: ${arg}`)
      return 'help'
    }
  }
  return opts
}

function logResult(opts: CodegenCliOptions, count: number): void {
  const ts = new Date().toLocaleTimeString()
  const where = opts.outputFile ?? './sanity/help-files.ts'
  const noun = count === 1 ? 'file' : 'files'
  // eslint-disable-next-line no-console
  console.log(`[${ts}] [sanity-plugin-md-notes] wrote ${where} (${count} help ${noun})`)
}

function logError(err: unknown): void {
  const message = err instanceof Error ? err.message : String(err)
  // eslint-disable-next-line no-console
  console.error(`[sanity-plugin-md-notes] codegen failed: ${message}`)
}

async function startWatcher(opts: CodegenCliOptions, runOnce: () => void): Promise<void> {
  let chokidar: typeof import('chokidar')
  try {
    chokidar = await import('chokidar')
  } catch {
    // eslint-disable-next-line no-console
    console.error(
      `[sanity-plugin-md-notes] --watch requires \`chokidar\` to be installed:\n` +
        `  npm install --save-dev chokidar`,
    )
    process.exit(1)
  }

  const watchDir = opts.inputDir ?? './sanity/schemas'
  // eslint-disable-next-line no-console
  console.log(`[sanity-plugin-md-notes] watching ${watchDir} for *.help.md changes…`)

  const watcher = chokidar.watch(watchDir, {
    ignoreInitial: true,
    ignored: (path) => path.includes('node_modules') || /\\\./.test(path),
  })
  const handle = (path: string): void => {
    if (/\.help\.md$/.test(path)) runOnce()
  }
  watcher.on('add', handle).on('change', handle).on('unlink', handle)

  const cleanup = (): void => {
    watcher.close().then(() => process.exit(0))
  }
  process.on('SIGINT', cleanup)
  process.on('SIGTERM', cleanup)
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2)
  const cmd = argv[0]

  if (!cmd || cmd === '--help' || cmd === '-h') {
    printHelp()
    process.exit(0)
  }

  if (cmd !== 'codegen') {
    // eslint-disable-next-line no-console
    console.error(`Unknown command: ${cmd}\n`)
    printHelp()
    process.exit(1)
  }

  const parsed = parseCodegenArgs(argv.slice(1))
  if (parsed === 'help') {
    printHelp()
    process.exit(0)
  }

  const runOnce = (): void => {
    try {
      const result = generateHelpFiles(parsed)
      logResult(parsed, result.filesWritten)
    } catch (err) {
      logError(err)
      if (!parsed.watch) process.exit(1)
    }
  }

  runOnce()
  if (parsed.watch) await startWatcher(parsed, runOnce)
}

main()
