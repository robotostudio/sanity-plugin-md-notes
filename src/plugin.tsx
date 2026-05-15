import { definePlugin } from 'sanity'

import { helpInspector } from './components/help-inspector'
import { HelpLayout } from './components/help-layout'
import { type HelpRegistryOptions, initHelpRegistry } from './registry'

export type HelpPluginConfig = HelpRegistryOptions

/**
 * Drop a `<schemaName>.help.md` next to a Sanity schema and editors get a
 * native Help inspector + view tab in Studio.
 *
 * Usage in `sanity.config.ts`:
 *
 *   import {defineConfig} from 'sanity'
 *   import {helpPlugin, withHelpDefaultDocumentNode} from 'sanity-plugin-md-notes'
 *
 *   // Vite (most Sanity studios):
 *   const helpFiles = import.meta.glob('./sanity/schemas/**\/*.help.md', {
 *     eager: true, query: '?raw', import: 'default'
 *   })
 *
 *   // Webpack/Next.js:
 *   // const helpFiles = {}
 *   // const ctx = require.context('./sanity/schemas', true, /\.help\.md$/)
 *   // ctx.keys().forEach((k) => { helpFiles[k] = ctx(k) })
 *
 *   export default defineConfig({
 *     plugins: [
 *       helpPlugin({
 *         files: helpFiles,
 *         githubRepo: 'org/repo',
 *         branch: 'main',
 *       }),
 *       structureTool({
 *         structure,
 *         defaultDocumentNode: withHelpDefaultDocumentNode(),
 *       }),
 *     ],
 *   })
 */
export const helpPlugin = definePlugin<HelpPluginConfig>((config) => {
  initHelpRegistry(config)
  return {
    name: 'sanity-plugin-md-notes',
    document: {
      inspectors: (prev) => [helpInspector, ...prev],
    },
    studio: {
      components: {
        layout: HelpLayout,
      },
    },
  }
})
