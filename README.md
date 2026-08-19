# sanity-plugin-md-notes

Drop a `.help.md` next to any Sanity schema. Editors get a native Help
panel in the inspector, view tab, and kebab dialog. Themed, opt-in,
composable.

Every piece is à la carte: wrap one schema, register one structure helper,
render one component anywhere — pick only the parts you need.

---

## What you get

- **Three render surfaces, one source of truth** — the same markdown
  file drives the document inspector, the editor-pane view tab, and the
  kebab list-pane dialog. Editors don't have to remember where to look.
- **Schema opt-in** — wrap a schema with `withHelp()` once; help only
  appears for schemas that explicitly opt in, even if a stray `.help.md`
  file exists.
- **Singleton-friendly** — drop-in helpers (`helpDocument` /
  `helpView`) for documents created via `S.document()`, which bypass
  `defaultDocumentNode`.
- **Author-friendly markdown** — GFM tables, fenced code blocks with
  copy buttons + file-label headers, admonitions (`> [!NOTE]` /
  `[!WARNING]` etc.), heading anchors with deep-linking, and inline
  embeds for **Loom, YouTube, Vimeo, Wistia**.
- **In-Studio navigation** — link to other documents or "new doc"
  forms via `/structure/intent/edit/...` URLs.
- **Bundler-agnostic** — Vite (`import.meta.glob`), Webpack
  (`require.context`), and Turbopack (via the included
  `sanity-plugin-md-notes codegen` CLI) all supported.
- **"Edit on GitHub" footer** — auto-detected from your `.git/config`
  via the bundled Vite plugin; pass it in literally for other bundlers.

---

## Installation

```sh
pnpm add sanity-plugin-md-notes
# or
npm install sanity-plugin-md-notes
# or
yarn add sanity-plugin-md-notes
# or
bun add sanity-plugin-md-notes
```

---

## Quick start

You need three things wired up: a **`.help.md` file map** for the plugin,
schemas **wrapped with `withHelp()`**, and
**`withHelpDefaultDocumentNode()`** registered on `structureTool`. The
file-map step looks slightly different per bundler.

### Vite (standalone Sanity Studio)

Register the Vite plugin once — it auto-detects your GitHub remote from
`.git/config` and exposes it through a typed subpath import:

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import { sanityHelpVite } from 'sanity-plugin-md-notes/vite'

export default defineConfig({
  plugins: [sanityHelpVite()],
})
```

Then in `sanity.config.ts`:

```ts
import { defineConfig } from 'sanity'
import { structureTool } from 'sanity/structure'
import { helpPlugin, withHelpDefaultDocumentNode } from 'sanity-plugin-md-notes'
import gitRepo from 'sanity-plugin-md-notes/git-repo'

const helpFiles = import.meta.glob('./schemaTypes/**/*.help.md', {
  eager: true,
  query: '?raw',
  import: 'default',
}) as Record<string, string>

export default defineConfig({
  // ...
  plugins: [
    helpPlugin({ files: helpFiles, githubRepo: gitRepo }),
    structureTool({
      structure,
      defaultDocumentNode: withHelpDefaultDocumentNode(),
    }),
  ],
})
```

> **TypeScript note.** If `import.meta.glob` errors with
> `Property 'glob' does not exist on type 'ImportMeta'`, your tsconfig
> doesn't include Vite's ambient types. Most Sanity studios scaffold with
> them already; if yours doesn't (we hit this on a client studio), add
> `"vite/client"` to `compilerOptions.types`:
>
> ```json
> // tsconfig.json
> {
>   "compilerOptions": {
>     "types": ["vite/client"]
>   }
> }
> ```
>
> Triple-slash `/// <reference types="vite/client" />` at the top of
> `sanity.config.ts` works too, but the tsconfig fix is the right level —
> reference directives belong in declaration files, not consumer code.

> **`githubRepo` is optional.** It only drives the "Edit on GitHub" footer
> link. The example uses [`sanity-plugin-md-notes/git-repo`](#auto-detect-github-repo-vite-plugin)
> for auto-detection; alternatively pass `'owner/repo'` literally or your
> `package.json` `repository` field. See [Configuration](#helppluginconfig-options)
> for all accepted shapes.

### Next.js / Turbopack / Webpack (Studio mounted in a Next.js app)

Turbopack doesn't implement Webpack's `require.context`, so the plugin
ships a CLI that scans for `.help.md` files at build/dev time and writes a
small TypeScript module you import directly.

**1. Install the supporting dev-deps:**

```sh
pnpm add -D raw-loader chokidar concurrently
```

**2. Add a `.help.md` loader in `next.config.ts`:**

```ts
const nextConfig: NextConfig = {
  // ...
  turbopack: {
    rules: {
      '*.help.md': { loaders: ['raw-loader'], as: '*.js' },
    },
  },
  webpack: (config) => {
    const helpMdRule = { test: /\.help\.md$/, type: 'asset/source' as const }
    for (const rule of config.module.rules) {
      if (rule && Array.isArray(rule.oneOf)) rule.oneOf.unshift(helpMdRule)
    }
    config.module.rules.unshift(helpMdRule)
    return config
  },
}
```

**3. Add an ambient module declaration so TypeScript knows `.help.md`
imports resolve to strings (project root, one-time setup):**

```ts
// help-md.d.ts
declare module '*.help.md' {
  const content: string
  export default content
}
```

**4. Wire the codegen CLI into your scripts:**

```json
{
  "scripts": {
    "dev": "concurrently -k -n help,next \"sanity-plugin-md-notes codegen --watch\" \"next dev\"",
    "predev": "sanity-plugin-md-notes codegen",
    "prebuild": "sanity-plugin-md-notes codegen"
  }
}
```

**5. Import the generated `helpFiles` from `sanity.config.ts`:**

```ts
import { helpPlugin, withHelpDefaultDocumentNode } from 'sanity-plugin-md-notes'
import { helpFiles } from './sanity/help-files' // generated by the CLI

export default defineConfig({
  // ...
  plugins: [
    helpPlugin({ files: helpFiles, githubRepo: 'org/repo' }),
    structureTool({
      structure,
      defaultDocumentNode: withHelpDefaultDocumentNode(),
    }),
  ],
})
```

**6. Add the generated file to `.gitignore`:**

```
sanity/help-files.ts
```

That's it. `pnpm dev` will keep the imports in sync with the filesystem;
new `.help.md` files HMR in without a restart.

---

## Opting in

Once `helpPlugin()` is registered, every help surface is opt-in per
schema. Pick the ones you want.

### Wrap the schema with `withHelp()`

The only step required to make help available at all. The wrapper marks
the schema as help-eligible, so a stray `.help.md` file can't
accidentally turn things on for a schema that wasn't opted in:

```ts
// schemaTypes/page.ts
import { defineType } from 'sanity'
import { withHelp } from 'sanity-plugin-md-notes'

export default withHelp(
  defineType({
    name: 'page',
    type: 'document',
    fields: [
      /* ... */
    ],
  }),
)
```

Drop `page.help.md` next to it:

```md
---
lastUpdated: 2026-05-13
---

# Pages

Editor-facing markdown goes here.
```

You now get the **Help inspector** (book icon, top-right) on every `page`
document. Everything below is additional surfaces you can wire up
per-schema.

### Help view tab on regular documents — `withHelpDefaultDocumentNode()`

Adds a "Help" tab next to "Editor" on every document with help
registered. Compose with `structureTool`'s `defaultDocumentNode`:

```ts
import { structureTool } from 'sanity/structure'
import { withHelpDefaultDocumentNode } from 'sanity-plugin-md-notes'

structureTool({
  structure,
  defaultDocumentNode: withHelpDefaultDocumentNode(),
})
```

If you already have a `defaultDocumentNode` resolver, pass it in — the
Help tab is appended after your existing views:

```ts
defaultDocumentNode: withHelpDefaultDocumentNode((S, context) =>
  S.document().views([S.view.form(), S.view.component(MyPreview)]),
)
```

### Help view tab on singleton documents

`S.document()` bypasses `defaultDocumentNode`, so singletons need an
explicit helper. Two flavours depending on how much builder control you
need.

**Composable — `helpView`.** Returns the Help view as a one-element
array (empty when help isn't active) that you spread into
`.views([...])`. Use this whenever you need to chain other builder
methods like `.initialValueTemplates(...)`, `.id(...)`, custom views,
etc:

```ts
import { helpView } from 'sanity-plugin-md-notes'

S.listItem()
  .title('404 Page')
  .child(
    S.document()
      .schemaType('not-found-page')
      .documentId('not-found-page-en')
      .title('English 404 Page')
      .initialValueTemplates([S.initialValueTemplateItem('not-found-page-en')])
      .views([S.view.form(), ...helpView(S, { schemaType: 'not-found-page' })]),
  )
```

**One-shot — `helpDocument`.** Builds the document node and injects the
Help view in one call. Use this for simple singletons where you don't
need extra builder methods:

```ts
import { helpDocument } from 'sanity-plugin-md-notes'

S.listItem()
  .title('404 Page')
  .child(
    helpDocument(S, {
      schemaType: 'not-found-page',
      documentId: 'not-found-page-en',
      title: 'English 404 Page',
    }),
  )
```

Both degrade cleanly when help isn't active for the schema — no explicit
guards needed.

### Help in the kebab "..." menu on document lists

`helpMenuItems` returns the Help menu item for a schema. Calling
`.menuItems([...])` on a `documentTypeList` replaces Sanity's auto-built
sort options, so `helpMenuItems` has two forms depending on whether you
want to keep them.

**Preserve Sanity's default sort options** (recommended). Pass `context`
from the resolver and `helpMenuItems` returns
`[helpItem, ...schemaDefaultOrderings]` — kebab still shows the
auto-derived sorts:

```ts
import { helpMenuItems } from 'sanity-plugin-md-notes'
import type { StructureResolver } from 'sanity/structure'

export const structure: StructureResolver = (S, context) =>
  S.list()
    .title('Content')
    .items([
      S.documentTypeListItem('page').child(
        S.documentTypeList('page').menuItems(helpMenuItems(S, { schemaType: 'page', context })),
      ),
    ])
```

**Custom orderings.** If you're building your own sort options anyway,
omit `context` and spread:

```ts
S.documentTypeList('page').menuItems([
  ...helpMenuItems(S, { schemaType: 'page' }),
  S.orderingMenuItem({
    name: 'recent',
    title: 'Recent',
    by: [
      /* ... */
    ],
  }),
])
```

---

## Authoring help content

### Frontmatter

Only one field is recognised:

| Field         | Description                                                                                   |
| ------------- | --------------------------------------------------------------------------------------------- |
| `lastUpdated` | ISO date string shown in the footer. Quoting is optional. Leave it out to hide the timestamp. |

```md
---
lastUpdated: 2026-05-13
---
```

### Markdown features

All standard markdown plus GitHub-flavored markdown (GFM):

- Headings `h1`–`h6` (with hover-revealed `#` anchor links — see below)
- Paragraphs, **bold**, _italic_, ~~strikethrough~~
- Unordered, ordered, and nested lists
- Task lists (`- [ ]` / `- [x]`)
- Inline `code` and fenced ` ```code blocks ` (see below)
- Blockquotes
- Horizontal rules (`---`)
- Tables with column-alignment hints (`:--`, `:-:`, `--:`)
- Images
- Links — external links auto-open in a new tab with `rel="noopener noreferrer"`

### Heading anchors

Hover any heading and a faded `#` link appears to the right. Clicking
scrolls to that section and updates the URL hash. Pasting that URL into a
new tab restores the same scroll position, _provided the inspector or
view tab is also part of the URL state_ (which it is for both — Sanity
persists `?inspect=help` and the active view in the URL automatically).

### Admonitions / callouts

GitHub's `> [!TYPE]` blockquote-prefix syntax is supported. Five types:

```md
> [!NOTE]
> Neutral context or "good to know" info.

> [!TIP]
> Productivity shortcut or recommended pattern.

> [!IMPORTANT]
> Required reading; not optional.

> [!WARNING]
> Footguns and look-fine-but-bite-later situations.

> [!CAUTION]
> Irreversible actions; data-loss risk.
```

Each renders as a tinted `@sanity/ui` Card with an icon (or no icon for
`NOTE`, intentionally low-key). The tone follows Sanity's design tokens,
so dark and light themes both look right out of the box.

### Code blocks

**Inline code** uses a subtle pill background and renders flush in
paragraph flow.

**Fenced code blocks** support:

- Language hints in the info string (`ts`, `js`, `bash`, etc.) for
  consumer tooling — the plugin itself doesn't bundle a syntax
  highlighter (intentional; see "Design notes" below).
- A `title="..."` parameter in the info string for a connected file-label
  header above the block:

  ````md
  ```ts title="sanity.config.ts"
  import { helpPlugin } from 'sanity-plugin-md-notes'
  ```
  ````

- A **copy button** in the top-right corner (hover-revealed, with a
  green-checkmark "Copied!" state).
- **Two-axis scrolling** — blocks cap at ~22rem tall and scroll
  internally so the outer Help panel stays bounded. Long lines scroll
  horizontally.

### Video embeds

Paste a Loom, YouTube, Vimeo, or Wistia URL **on its own line** and the
plugin renders an inline 16:9 iframe. Explicit `[click here](https://...)`
syntax keeps acting as a regular link.

| Provider | Supported URL shapes                                                                             |
| -------- | ------------------------------------------------------------------------------------------------ |
| Loom     | `loom.com/share/<id>`, `loom.com/embed/<id>`                                                     |
| YouTube  | `youtube.com/watch?v=<id>`, `youtu.be/<id>`, `youtube.com/embed/<id>`, `youtube.com/shorts/<id>` |
| Vimeo    | `vimeo.com/<id>`, `player.vimeo.com/video/<id>`                                                  |
| Wistia   | `*.wistia.com/medias/<id>`, `*.wistia.net/medias/<id>`, `fast.wistia.net/embed/iframe/<id>`      |

> [!NOTE]
> YouTube embeds use `youtube-nocookie.com` and `referrerPolicy="origin"`
> on the iframe — this works around the "Error 153 — Video player
> configuration error" some videos throw when embedded from arbitrary
> hosts. Videos with embedding disabled by their owner still won't play
> regardless. For maximum reliability, prefer Loom.

### In-Studio navigation (intent links)

Link to another document or the "new doc" form for a schema using
Sanity's structure-tool intent URLs. The format is path-based, not a
querystring, and the `/structure/` prefix is required:

```md
[Edit the Poster Resource Type](/structure/intent/edit/id=resourceType-poster;type=resourceType)

[Create a new Topic](/structure/intent/create/type=topic)
```

Rules:

- **Edit form**: `/structure/intent/edit/id=<docId>;type=<schemaType>`
- **Create form**: `/structure/intent/create/type=<schemaType>`
- **Params are semicolon-separated path segments.** Writing
  `?id=...&type=...` (querystring style) crashes the router.
- **`/structure/` prefix matters.** A bare `/intent/edit/...` URL routes
  through the studio-level tool picker, which can land in Presentation
  instead of Structure.
- **Clicking causes a full page reload** — this is a normal browser
  navigation, not in-app SPA navigation. Reliable, but no soft-nav.
- **Path prefix** assumes the studio is mounted at `/`. If the studio
  lives at `/studio`, prefix accordingly:
  `/studio/structure/intent/edit/...`.

---

## Configuration

### `helpPlugin(config)` options

```ts
helpPlugin({
  files: Record<string, string>,
  githubRepo?: string | {url?: string; type?: string},
  branch?: string,
  basePath?: string,
})
```

| Option       | Type                       | Default                 | Description                                                                                                                                           |
| ------------ | -------------------------- | ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `files`      | `Record<string, string>`   | required                | Map of file path → raw markdown. The basename (minus `.help.md`) must equal the schema `name:` you're attaching help to.                              |
| `githubRepo` | `string \| {url?: string}` | _(footer hidden)_       | Drives the "Edit on GitHub" footer link. Accepts `'owner/repo'`, any GitHub URL form, `github:owner/repo`, or the shape of `pkg.repository` directly. |
| `branch`     | `string`                   | `'main'`                | Branch the GitHub link points at.                                                                                                                     |
| `basePath`   | `string`                   | _(strips `./` / `../`)_ | Prefix to strip from each file key when building the GitHub URL.                                                                                      |

### Auto-detect GitHub repo (Vite plugin)

If you don't want to hand-write `'org/repo'` _or_ pass `pkg.repository`,
the plugin ships a Vite plugin that reads `.git/config` at build time and
exposes the detected `owner/repo` through a normal subpath import.

For a **standalone Sanity Studio**, drop the plugin into your
`vite.config.ts`:

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import { sanityHelpVite } from 'sanity-plugin-md-notes/vite'

export default defineConfig({
  plugins: [sanityHelpVite()],
})
```

If you'd rather keep all Sanity-adjacent config in one place, the `vite`
field in `sanity.cli.ts` works too — same result, just verbose:

```ts
// sanity.cli.ts
vite: (config) => ({
  ...config,
  plugins: [...(config.plugins ?? []), sanityHelpVite()],
}),
```

Then in `sanity.config.ts`:

```ts
import gitRepo from 'sanity-plugin-md-notes/git-repo'
import { helpPlugin } from 'sanity-plugin-md-notes'

helpPlugin({
  files: helpFiles,
  githubRepo: gitRepo, // 'owner/repo' or null — footer hides if null
})
```

It walks up from `process.cwd()` looking for `.git/`, so monorepos work
without configuration. Non-GitHub remotes resolve to `null` and the
footer silently hides.

> `sanity-plugin-md-notes/git-repo` is a normal subpath. TypeScript resolves
> types through the package's `exports` field — no triple-slash reference
> needed. Without `sanityHelpVite()` registered, the import safely
> evaluates to `null` at runtime, so the same `sanity.config.ts` is safe
> to move to Webpack/Turbopack later.

### Codegen CLI

For Webpack and Turbopack (Next.js 16+ default), the plugin ships a CLI
that generates the `helpFiles` import file. See the
[Next.js Quick start](#nextjs--turbopack--webpack-studio-mounted-in-a-nextjs-app)
above for the full setup.

```
sanity-plugin-md-notes codegen [options]

  --in <path>     Directory to scan          (default: ./sanity/schemas)
  --out <path>    Output TypeScript file     (default: ./sanity/help-files.ts)
  --watch, -w     Re-generate on file changes (requires chokidar)
  --help, -h      Show help
```

Programmatic API (if you'd rather wire it into a build script):

```ts
import { generateHelpFiles } from 'sanity-plugin-md-notes/codegen'

generateHelpFiles({
  inputDir: 'sanity/schemas',
  outputFile: 'sanity/help-files.ts',
})
```

---

## Escape hatches

These exports let you reuse the plugin's pieces in custom UIs — for
example, rendering help content in a custom inspector, or building your
own list-pane action.

| Export                | Description                                                                                         |
| --------------------- | --------------------------------------------------------------------------------------------------- |
| `HelpIcon`            | The default Help icon (`BookIcon` from `@sanity/icons`, wrapped). Re-export to swap globally.       |
| `HelpPanel`           | Full panel: rendered markdown + footer. Pass a `HelpEntry` from `getHelp()`.                        |
| `HelpPanelEmpty`      | The empty-state component shown when a schema is opted in but has no `.help.md` file yet.           |
| `MarkdownRenderer`    | Just the markdown body, no footer. Useful when embedding the same content in another tool.          |
| `getHelp(schemaType)` | Look up a `HelpEntry` from the registry. Returns `undefined` if no help is registered for the type. |
| `hasHelp(type)`       | Boolean: is there a `.help.md` registered for `type`?                                               |
| `isHelpEnabled(type)` | Boolean: was the schema wrapped with `withHelp()`?                                                  |
| `isHelpActive(type)`  | `hasHelp(type) && isHelpEnabled(type)`. The "is help genuinely available right now?" check.         |

```ts
import {getHelp, MarkdownRenderer} from 'sanity-plugin-md-notes'

function CustomHelpRenderer({schemaType}: {schemaType: string}) {
  const entry = getHelp(schemaType)
  if (!entry) return null
  return <MarkdownRenderer content={entry.content} />
}
```

---

## Troubleshooting

- **Help icon doesn't appear on a document.** Confirm the schema is
  wrapped with `withHelp(defineType({...}))` _and_ a matching
  `<schemaName>.help.md` file is in the `files` map. The basename must
  match the schema `name:` exactly (kebab-case schemas need kebab-case
  filenames; camelCase schemas need camelCase).
- **Help view tab doesn't appear on a singleton.** Singletons bypass
  `defaultDocumentNode` — use `helpDocument(S, {...})` or `helpView(S, {schemaType})`
  instead of `S.document()`.
- **Kebab menu wipes default sorts after adding `helpMenuItems`.** Pass
  `context` from the structure resolver: `helpMenuItems(S, {schemaType, context})`.
  Calling `.menuItems([...])` replaces Sanity's auto-built sorts unless
  you re-include them.
- **Intent link lands in Presentation tool, not Structure.** Make sure
  the URL starts with `/structure/`, not just `/intent/`. Both Sanity
  tools claim intents with equal priority and ties resolve to the
  first-listed tool.
- **`require.context` returns empty under Next.js 16 / Turbopack.**
  Turbopack doesn't implement Webpack's `require.context`. Use the
  [codegen CLI](#codegen-cli) instead.
- **Yalc local development: `.cmd` wrappers missing on Windows.** Yalc
  only creates the symlink; npm/pnpm normally create `.cmd` / `.ps1`
  shell wrappers for `bin` entries. Run `pnpm install` in the consumer
  project after `yalc add` to regenerate them. Once published to npm,
  this disappears.

---

## License

[MIT](LICENSE) © [Sameer](https://github.com/sameerroboto)
