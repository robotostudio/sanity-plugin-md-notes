# sanity-plugin-help

Drop a `<schemaName>.help.md` file next to a Sanity schema and editors get a
native **Help inspector** + **Help view tab** + optional **kebab menu item**
inside Studio. Authored in Markdown, rendered with `@sanity/ui` so it looks
native (light + dark themes, your studio font).

Supports tables, code blocks, lists, images, and inline embeds for **Loom,
YouTube, Vimeo, and Wistia** (paste the URL on its own line).

---

## Installation

```sh
npm install sanity-plugin-help
# or
pnpm add sanity-plugin-help
# or
yarn add sanity-plugin-help
```

## Setup

The plugin needs the **raw text of your `.help.md` files** passed in via the
`files` option. Your bundler does the glob; the plugin stays bundler-agnostic.

### Vite (standalone Sanity Studio)

```ts
// sanity.config.ts
/// <reference types="vite/client" />
import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {helpPlugin, withHelpDefaultDocumentNode} from 'sanity-plugin-help'

const helpFiles = import.meta.glob('./schemaTypes/**/*.help.md', {
  eager: true,
  query: '?raw',
  import: 'default',
}) as Record<string, string>

export default defineConfig({
  // ...
  plugins: [
    helpPlugin({
      files: helpFiles,
      githubRepo: 'org/repo', // optional — adds an "Edit on GitHub" footer
      branch: 'main',         // optional — defaults to 'main'
    }),
    structureTool({
      structure: yourStructure,
      defaultDocumentNode: withHelpDefaultDocumentNode(),
    }),
  ],
})
```

### Webpack / Next.js (Studio mounted in a Next.js route)

```ts
// sanity.config.ts
import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {helpPlugin, withHelpDefaultDocumentNode} from 'sanity-plugin-help'

const helpFiles: Record<string, string> = {}
const helpCtx = (require as unknown as {
  context: (dir: string, deep: boolean, pattern: RegExp) => {
    keys(): string[]
    (key: string): string
  }
}).context('./sanity/schemas', true, /\.help\.md$/)
helpCtx.keys().forEach((k) => {
  helpFiles[k] = helpCtx(k)
})

export default defineConfig({
  // ...
  plugins: [
    helpPlugin({files: helpFiles, githubRepo: 'org/repo', branch: 'main'}),
    structureTool({
      structure: yourStructure,
      defaultDocumentNode: withHelpDefaultDocumentNode(),
    }),
  ],
})
```

You also need a Webpack rule in `next.config.mjs` so `.help.md` files load as
raw strings:

```js
webpack: (config) => {
  const helpMdRule = {test: /\.help\.md$/, type: 'asset/source'}
  for (const rule of config.module.rules) {
    if (rule && Array.isArray(rule.oneOf)) rule.oneOf.unshift(helpMdRule)
  }
  config.module.rules.unshift(helpMdRule)
  return config
},
```

The `oneOf` injection matters — Next.js wraps rules in `oneOf` groups and the
rule won't fire without it.

## Opting a schema in

Wrap the schema with `withHelp`:

```ts
// schemaTypes/page.ts
import {defineType} from 'sanity'
import {withHelp} from 'sanity-plugin-help'

export default withHelp(
  defineType({
    name: 'page',
    type: 'document',
    fields: [/* ... */],
  }),
)
```

Then drop `page.help.md` next to the schema with a `lastUpdated` frontmatter
field:

```md
---
lastUpdated: 2026-05-12
---

# Pages

Helpful editor-facing markdown goes here.
```

**Inspector + Help view tab** appear automatically. Delete the `.md` file →
they disappear. The opt-in stays explicit — schemas not wrapped with
`withHelp` are never touched, even if a matching `.md` file exists.

## Optional structure helpers

These two are opt-in at the structure level (not auto-applied), because not
every list / pane needs them.

### Kebab "Help" item on a document list

```ts
import {helpMenuItems} from 'sanity-plugin-help'

S.documentList()
  .filter('_type == "page"')
  .menuItems([
    ...helpMenuItems(S, 'page'),
    ...yourSortItems(S),
  ])
```

### Help tab on a singleton

`S.document()` bypasses `defaultDocumentNode`, so singletons need an explicit
helper:

```ts
import {helpDocument} from 'sanity-plugin-help'

S.listItem()
  .title('404 Page')
  .child(helpDocument(S, 'not-found-page', 'not-found-page-en', 'English 404 Page'))
```

## Video embeds

Paste a Loom, YouTube, Vimeo, or Wistia URL **on its own line** and it
embeds as an inline 16:9 iframe. Explicit `[click here](https://...)` syntax
keeps acting as a regular link.

Supported URL shapes:

| Provider | Patterns |
|---|---|
| Loom | `loom.com/share/<id>`, `loom.com/embed/<id>` |
| YouTube | `youtube.com/watch?v=<id>`, `youtu.be/<id>`, `youtube.com/embed/<id>`, `youtube.com/shorts/<id>` |
| Vimeo | `vimeo.com/<id>`, `player.vimeo.com/video/<id>` |
| Wistia | `*.wistia.com/medias/<id>`, `*.wistia.net/medias/<id>`, `fast.wistia.net/embed/iframe/<id>` |

## Configuration

```ts
helpPlugin({
  // Required — raw markdown content keyed by file path.
  files: Record<string, string>,

  // Optional — adds an "Edit on GitHub" footer link.
  githubRepo: 'org/repo',
  branch: 'main',                // default: 'main'
  basePath: 'apps/studio/schemas', // default: strips leading './' or '../'
})
```

## Local development (yalc)

`yalc` only symlinks the plugin's `dist/` into the consumer — it doesn't run
the consumer's package manager. Because of that, the plugin's runtime
dependencies (`react-markdown`, `remark-gfm`, `@sanity/incompatible-plugin`)
**are not auto-installed when you `yalc add`**.

After linking the plugin into a consumer for the first time:

```sh
# In the consumer studio project
npx yalc add sanity-plugin-help
pnpm install                       # or npm/yarn
# If pnpm doesn't pull transitive deps from the file:.yalc/... entry:
pnpm add react-markdown remark-gfm
```

Once the plugin is published to npm and installed normally
(`pnpm add sanity-plugin-help`), the package manager resolves these
transitive dependencies automatically and this step is not needed.

## Develop & test

This plugin uses [@sanity/plugin-kit](https://github.com/sanity-io/plugin-kit)
with default configuration for build & watch scripts.

```sh
pnpm install
pnpm link-watch        # builds on change + pushes to local yalc
```

See [Testing a plugin in Sanity Studio](https://github.com/sanity-io/plugin-kit#testing-a-plugin-in-sanity-studio)
for the full local-dev flow.

## License

[MIT](LICENSE) © Sameerroboto
