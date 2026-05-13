import {
  BellIcon,
  BulbOutlineIcon,
  CheckmarkIcon,
  CopyIcon,
  DocumentIcon,
  ErrorOutlineIcon,
  WarningOutlineIcon,
} from '@sanity/icons'
import {Box, Card, Flex, Text} from '@sanity/ui'
import React, {
  Children,
  createContext,
  isValidElement,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ComponentType,
  type ReactNode,
} from 'react'
import ReactMarkdown, {type Components} from 'react-markdown'
import remarkGfm from 'remark-gfm'

/**
 * react-markdown renders both inline `` `code` `` and fenced `` ``` `` blocks
 * with the same `<code>` element, so the same renderer is called for both.
 * The `<pre>` renderer flips this context to `true`, letting the `<code>`
 * renderer skip the inline pill styles when it's nested inside a block.
 */
const InPreContext = createContext(false)

const MONO_FONT =
  'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace'

const BORDER = '1px solid var(--card-border-color)'

const baseHeading: CSSProperties = {
  fontWeight: 600,
  lineHeight: 1.3,
  color: 'inherit',
  position: 'relative',
}

const styles: Record<string, CSSProperties> = {
  h1: {
    ...baseHeading,
    fontSize: '1.75rem',
    margin: '0 0 1rem',
    paddingBottom: '0.4rem',
    borderBottom: BORDER,
    letterSpacing: '-0.01em',
  },
  h2: {
    ...baseHeading,
    fontSize: '1.375rem',
    margin: '2rem 0 0.75rem',
    paddingBottom: '0.35rem',
    borderBottom: BORDER,
    letterSpacing: '-0.005em',
  },
  h3: {
    ...baseHeading,
    fontSize: '1.0625rem',
    margin: '1.5rem 0 0.4rem',
  },
  h4: {
    ...baseHeading,
    fontSize: '1rem',
    margin: '1.25rem 0 0.4rem',
  },
  h5: {
    ...baseHeading,
    fontSize: '0.9375rem',
    margin: '1rem 0 0.3rem',
  },
  h6: {
    ...baseHeading,
    fontSize: '0.875rem',
    margin: '1rem 0 0.3rem',
    color: 'var(--card-muted-fg-color)',
  },
  p: {
    fontSize: '0.9375rem',
    lineHeight: 1.65,
    margin: '0 0 1rem',
    fontWeight: 400,
  },
  ul: {
    fontSize: '0.9375rem',
    lineHeight: 1.65,
    margin: '0 0 1rem',
    paddingLeft: '1.5rem',
    listStyleType: 'disc',
  },
  ol: {
    fontSize: '0.9375rem',
    lineHeight: 1.65,
    margin: '0 0 1rem',
    paddingLeft: '1.5rem',
    listStyleType: 'decimal',
  },
  li: {
    marginBottom: '0.35rem',
  },
  inlineCode: {
    fontFamily: MONO_FONT,
    fontSize: '0.85em',
    padding: '0.1em 0.35em',
    borderRadius: 4,
    background: 'var(--card-code-bg-color)',
    border: BORDER,
    wordBreak: 'break-word',
  },
  pre: {
    margin: 0,
    fontFamily: MONO_FONT,
    fontSize: '0.85rem',
    lineHeight: 1.6,
    whiteSpace: 'pre',
  },
  link: {
    color: 'var(--card-link-fg-color)',
    textDecoration: 'underline',
    textUnderlineOffset: 2,
  },
  hr: {
    border: 0,
    borderTop: BORDER,
    margin: '1.75rem 0',
  },
  table: {
    borderCollapse: 'collapse',
    width: '100%',
    fontSize: '0.9375rem',
    lineHeight: 1.55,
  },
  th: {
    textAlign: 'left',
    padding: '0.5rem 0.75rem',
    borderBottom: BORDER,
    fontWeight: 600,
  },
  td: {
    padding: '0.5rem 0.75rem',
    borderBottom: BORDER,
    verticalAlign: 'top',
  },
  tableWrap: {
    margin: '0 0 1rem',
  },
}

// --- Remark plugins (inline, no extra deps) ----------------------------

interface MdastNode {
  type: string
  value?: string
  meta?: string
  children?: MdastNode[]
  data?: {hProperties?: Record<string, unknown>}
}

/**
 * Copies the optional `title="..."` (or single-quoted) from a fenced code
 * block's meta string onto the rendered `<code>` element as `data-title`.
 * The `<pre>` renderer reads it to draw a label header above the block.
 *
 *     ```ts title="vite.config.ts"
 *     ...
 *     ```
 */
function remarkCodeMeta() {
  return (tree: MdastNode) => {
    walk(tree)
    function walk(node: MdastNode): void {
      if (node.type === 'code' && typeof node.meta === 'string') {
        const titleMatch = node.meta.match(/title=(?:"([^"]+)"|'([^']+)')/)
        if (titleMatch) {
          const title = titleMatch[1] ?? titleMatch[2]
          if (title) {
            node.data = node.data ?? {}
            node.data.hProperties = node.data.hProperties ?? {}
            node.data.hProperties['data-title'] = title
          }
        }
      }
      if (Array.isArray(node.children)) node.children.forEach(walk)
    }
  }
}

const ADMONITION_TYPES = new Set(['note', 'tip', 'important', 'warning', 'caution'])

/**
 * GitHub-style alert syntax. Detects a blockquote whose first child paragraph
 * starts with `[!TYPE]`, strips the marker, and stamps `data-admonition` on
 * the blockquote element so the renderer can switch presentation.
 *
 *     > [!WARNING]
 *     > Renaming a published slug breaks bookmarks.
 */
function remarkAdmonitions() {
  return (tree: MdastNode) => {
    walk(tree)
    function walk(node: MdastNode): void {
      if (node.type === 'blockquote' && Array.isArray(node.children)) {
        const firstPara = node.children[0]
        if (firstPara?.type === 'paragraph' && Array.isArray(firstPara.children)) {
          const firstText = firstPara.children[0]
          if (firstText?.type === 'text' && typeof firstText.value === 'string') {
            const match = firstText.value.match(/^\[!([A-Z]+)\]\s*\n?/)
            if (match && match[1]) {
              const type = match[1].toLowerCase()
              if (ADMONITION_TYPES.has(type)) {
                firstText.value = firstText.value.slice(match[0].length)
                if (firstText.value === '' && firstPara.children.length === 1) {
                  node.children.shift()
                }
                node.data = node.data ?? {}
                node.data.hProperties = node.data.hProperties ?? {}
                node.data.hProperties['data-admonition'] = type
              }
            }
          }
        }
      }
      if (Array.isArray(node.children)) node.children.forEach(walk)
    }
  }
}

// --- Helpers -----------------------------------------------------------

/** Convert a React children tree into a flat plain-text string. */
function getTextFromChildren(children: ReactNode): string {
  if (children == null || typeof children === 'boolean') return ''
  if (typeof children === 'string' || typeof children === 'number') return String(children)
  if (Array.isArray(children)) return children.map(getTextFromChildren).join('')
  if (isValidElement(children)) {
    const props = children.props as {children?: ReactNode}
    return getTextFromChildren(props.children)
  }
  return ''
}

/** Slugify for heading anchors. Lowercase, kebab, strip punctuation. */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

// --- Heading with anchor link -----------------------------------------

function HeadingAnchor({slug}: {slug: string}) {
  const onClick = useCallback(
    (event: React.MouseEvent<HTMLAnchorElement>) => {
      if (event.metaKey || event.ctrlKey || event.shiftKey) return
      event.preventDefault()
      // Update URL hash so the link is copy-shareable, but use replaceState to
      // avoid spamming the back-button history with anchor clicks.
      const url = new URL(window.location.href)
      url.hash = slug
      window.history.replaceState(null, '', url.toString())
      const target = document.getElementById(slug)
      if (target) target.scrollIntoView({behavior: 'smooth', block: 'start'})
    },
    [slug],
  )
  return (
    <a
      href={`#${slug}`}
      onClick={onClick}
      className="help-md-anchor"
      aria-label="Link to this section"
    >
      #
    </a>
  )
}

function makeHeading(
  level: 1 | 2 | 3 | 4 | 5 | 6,
  style: CSSProperties,
): Components[`h${typeof level}`] {
  const Tag = `h${level}` as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
  return ({children}) => {
    const text = getTextFromChildren(children)
    const slug = slugify(text)
    return (
      <Tag id={slug || undefined} style={style}>
        {children}
        {slug ? <HeadingAnchor slug={slug} /> : null}
      </Tag>
    )
  }
}

// --- Code block with title header + copy button -----------------------

/** Pulls `data-title` off the inner `<code>` element that react-markdown emits. */
function getCodeTitle(children: ReactNode): string | undefined {
  let title: string | undefined
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return
    const props = child.props as Record<string, unknown>
    const value = props['data-title']
    if (typeof value === 'string' && value) title = value
  })
  return title
}

function CodeBlock({children}: {children?: ReactNode}) {
  const title = getCodeTitle(children)
  const scrollRef = useRef<HTMLDivElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  const onCopy = useCallback(() => {
    const text = scrollRef.current?.textContent ?? ''
    if (!text) return
    const fallbackCopy = () => {
      try {
        const ta = document.createElement('textarea')
        ta.value = text
        ta.setAttribute('readonly', '')
        ta.style.position = 'absolute'
        ta.style.left = '-9999px'
        document.body.appendChild(ta)
        ta.select()
        document.execCommand('copy')
        document.body.removeChild(ta)
        return true
      } catch {
        return false
      }
    }
    const flash = () => {
      setCopied(true)
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => setCopied(false), 1500)
    }
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(flash, () => {
        if (fallbackCopy()) flash()
      })
    } else if (fallbackCopy()) {
      flash()
    }
  }, [])

  return (
    <Card
      radius={2}
      border
      tone="transparent"
      className="help-md-codeblock"
      style={{margin: '0 0 1rem', overflow: 'hidden'}}
    >
      {title ? (
        <Flex
          align="center"
          gap={2}
          paddingX={3}
          paddingY={3}
          style={{
            borderBottom: BORDER,
            background: 'var(--card-code-bg-color)',
          }}
        >
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              fontSize: '18px',
              lineHeight: 1,
              color: 'var(--card-muted-fg-color)',
            }}
          >
            <DocumentIcon />
          </span>
          <Text size={2} muted style={{fontFamily: MONO_FONT, lineHeight: 1}}>
            {title}
          </Text>
        </Flex>
      ) : null}
      <div style={{position: 'relative'}}>
        <button
          type="button"
          onClick={onCopy}
          className={`help-md-copy-btn${copied ? ' is-copied' : ''}`}
          aria-label={copied ? 'Copied' : 'Copy code'}
          title={copied ? 'Copied' : 'Copy code'}
        >
          {copied ? <CheckmarkIcon /> : <CopyIcon />}
        </button>
        <div
          ref={scrollRef}
          style={{
            padding: '0.75rem 1rem',
            maxHeight: '22rem',
            overflow: 'auto',
          }}
        >
          <pre style={styles.pre}>
            <InPreContext.Provider value={true}>{children}</InPreContext.Provider>
          </pre>
        </div>
      </div>
    </Card>
  )
}

// --- Admonitions -------------------------------------------------------

type AdmonitionType = 'note' | 'tip' | 'important' | 'warning' | 'caution'

const ADMONITIONS: Record<
  AdmonitionType,
  {
    label: string
    icon: ComponentType | null
    tone: 'primary' | 'positive' | 'caution' | 'critical'
  }
> = {
  note: {label: 'Note', icon: null, tone: 'primary'},
  tip: {label: 'Tip', icon: BulbOutlineIcon, tone: 'positive'},
  important: {label: 'Important', icon: BellIcon, tone: 'primary'},
  warning: {label: 'Warning', icon: WarningOutlineIcon, tone: 'caution'},
  caution: {label: 'Caution', icon: ErrorOutlineIcon, tone: 'critical'},
}

function Admonition({type, children}: {type: AdmonitionType; children?: ReactNode}) {
  const config = ADMONITIONS[type]
  const Icon = config.icon
  const body = (
    <div className="help-md-admonition-body" style={{flex: 1, minWidth: 0}}>
      {children}
    </div>
  )
  return (
    <Card
      radius={3}
      padding={3}
      tone={config.tone}
      role="note"
      aria-label={Icon ? undefined : config.label}
      style={{margin: '0 0 1rem'}}
    >
      {Icon ? (
        <Flex align="flex-start" gap={3}>
          <span
            role="img"
            aria-label={config.label}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              flexShrink: 0,
              fontSize: '20px',
              lineHeight: 1,
              marginTop: '2px',
              color: 'inherit',
            }}
          >
            <Icon />
          </span>
          {body}
        </Flex>
      ) : (
        body
      )}
    </Card>
  )
}

// --- Video embeds (unchanged behaviour) -------------------------------

interface VideoProvider {
  name: string
  toEmbed: (url: string) => string | null
}

const videoProviders: VideoProvider[] = [
  {
    name: 'Loom',
    toEmbed: (url) => {
      const m = url.match(/^https?:\/\/(?:www\.)?loom\.com\/(?:share|embed)\/([\w-]+)/i)
      return m ? `https://www.loom.com/embed/${m[1]}` : null
    },
  },
  {
    name: 'YouTube',
    toEmbed: (url) => {
      // `youtube-nocookie.com` is YouTube's privacy-enhanced embed host and is
      // generally more permissive for embeds on third-party domains — it skips
      // some referrer-based checks that `youtube.com/embed` enforces.
      const watch = url.match(
        /^https?:\/\/(?:www\.|m\.)?youtube\.com\/watch\?(?:[^#]*&)?v=([\w-]{6,})/i,
      )
      if (watch) return `https://www.youtube-nocookie.com/embed/${watch[1]}`
      const short = url.match(/^https?:\/\/youtu\.be\/([\w-]{6,})/i)
      if (short) return `https://www.youtube-nocookie.com/embed/${short[1]}`
      const embed = url.match(
        /^https?:\/\/(?:www\.)?youtube(?:-nocookie)?\.com\/embed\/([\w-]{6,})/i,
      )
      if (embed) return `https://www.youtube-nocookie.com/embed/${embed[1]}`
      const shorts = url.match(/^https?:\/\/(?:www\.)?youtube\.com\/shorts\/([\w-]{6,})/i)
      if (shorts) return `https://www.youtube-nocookie.com/embed/${shorts[1]}`
      return null
    },
  },
  {
    name: 'Vimeo',
    toEmbed: (url) => {
      const player = url.match(/^https?:\/\/player\.vimeo\.com\/video\/(\d+)/i)
      if (player) return `https://player.vimeo.com/video/${player[1]}`
      const m = url.match(/^https?:\/\/(?:www\.)?vimeo\.com\/(\d+)/i)
      return m ? `https://player.vimeo.com/video/${m[1]}` : null
    },
  },
  {
    name: 'Wistia',
    toEmbed: (url) => {
      const m = url.match(
        /^https?:\/\/(?:[\w-]+\.)*wistia\.(?:com|net)\/(?:medias|embed(?:\/iframe)?)\/([\w-]+)/i,
      )
      return m ? `https://fast.wistia.net/embed/iframe/${m[1]}` : null
    },
  },
]

interface Embed {
  provider: string
  embedUrl: string
}

function detectVideoEmbed(url: string): Embed | null {
  for (const p of videoProviders) {
    const embedUrl = p.toEmbed(url)
    if (embedUrl) return {provider: p.name, embedUrl}
  }
  return null
}

function findBareVideoLink(children: React.ReactNode): Embed | null {
  const arr = Children.toArray(children).filter((c) => typeof c !== 'string' || c.trim() !== '')
  if (arr.length !== 1) return null
  const only = arr[0]
  if (!isValidElement(only)) return null
  const props = only.props as {href?: string; children?: React.ReactNode}
  const href = props.href
  if (typeof href !== 'string') return null
  const linkChildren = Children.toArray(props.children)
  const isBare =
    linkChildren.length === 1 && typeof linkChildren[0] === 'string' && linkChildren[0] === href
  if (!isBare) return null
  return detectVideoEmbed(href)
}

function VideoEmbed({provider, embedUrl}: Embed) {
  return (
    <div
      style={{
        position: 'relative',
        paddingBottom: '56.25%',
        height: 0,
        margin: '0 0 1rem',
        borderRadius: 6,
        overflow: 'hidden',
        border: BORDER,
        background: 'var(--card-code-bg-color)',
      }}
    >
      <iframe
        src={embedUrl}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; fullscreen; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        // YouTube validates embeds via the Referer header. Sanity Studio's
        // default referrer policy can strip it, which produces "Error 153".
        // Setting `origin` sends just the host (no path), enough for YouTube
        // and most other providers, but doesn't leak the in-studio URL.
        referrerPolicy="origin"
        title={`${provider} video`}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          border: 0,
        }}
      />
    </div>
  )
}

// --- Component map -----------------------------------------------------

const components: Components = {
  h1: makeHeading(1, styles.h1!),
  h2: makeHeading(2, styles.h2!),
  h3: makeHeading(3, styles.h3!),
  h4: makeHeading(4, styles.h4!),
  h5: makeHeading(5, styles.h5!),
  h6: makeHeading(6, styles.h6!),
  p: ({children}) => {
    const embed = findBareVideoLink(children)
    if (embed) return <VideoEmbed {...embed} />
    return <p style={styles.p}>{children}</p>
  },
  strong: ({children}) => <strong style={{fontWeight: 600}}>{children}</strong>,
  em: ({children}) => <em>{children}</em>,
  del: ({children}) => <del>{children}</del>,
  ul: ({children}) => <ul style={styles.ul}>{children}</ul>,
  ol: ({children}) => <ol style={styles.ol}>{children}</ol>,
  li: ({children}) => <li style={styles.li}>{children}</li>,
  code: ({children, ...rest}) => {
    const inPre = useContext(InPreContext)
    if (inPre) {
      // Inside a fenced block — render plain so the outer CodeBlock controls styling
      const dataTitle = (rest as Record<string, unknown>)['data-title']
      return (
        <code data-title={typeof dataTitle === 'string' ? dataTitle : undefined}>{children}</code>
      )
    }
    return <code style={styles.inlineCode}>{children}</code>
  },
  pre: ({children}) => <CodeBlock>{children}</CodeBlock>,
  a: ({href, children}) => {
    const isExternal = !!href && /^https?:\/\//i.test(href)
    return (
      <a
        href={href}
        style={styles.link}
        {...(isExternal ? {target: '_blank', rel: 'noopener noreferrer'} : {})}
      >
        {children}
      </a>
    )
  },
  blockquote: ({children, ...rest}) => {
    const admonitionType = (rest as Record<string, unknown>)['data-admonition']
    if (typeof admonitionType === 'string' && admonitionType in ADMONITIONS) {
      return <Admonition type={admonitionType as AdmonitionType}>{children}</Admonition>
    }
    return (
      <Card
        paddingX={3}
        paddingY={1}
        radius={2}
        tone="primary"
        style={{
          borderLeft: '3px solid var(--card-focus-ring-color)',
          margin: '0 0 1rem',
        }}
      >
        {children}
      </Card>
    )
  },
  hr: () => <hr style={styles.hr} />,
  img: ({src, alt}) => (
    <img
      src={typeof src === 'string' ? src : undefined}
      alt={alt ?? ''}
      style={{
        maxWidth: '100%',
        height: 'auto',
        borderRadius: 4,
        margin: '0 0 1rem',
      }}
    />
  ),
  table: ({children}) => (
    <Box overflow="auto" style={styles.tableWrap}>
      <table style={styles.table}>{children}</table>
    </Box>
  ),
  thead: ({children}) => <thead>{children}</thead>,
  tbody: ({children}) => <tbody>{children}</tbody>,
  tr: ({children}) => <tr>{children}</tr>,
  th: ({children}) => <th style={styles.th}>{children}</th>,
  td: ({children}) => <td style={styles.td}>{children}</td>,
}

/**
 * Read `window.location.hash` after content renders and scroll to a matching
 * heading. Handles deep-links pasted into a fresh tab: Sanity's structure
 * tool restores `?inspect=help` from the URL on its own, the help panel
 * mounts, this effect fires, and the panel lands pre-scrolled to the
 * targeted section.
 */
function useHashScroll(content: string) {
  useEffect(() => {
    if (typeof window === 'undefined') return
    const rawHash = window.location.hash.slice(1)
    if (!rawHash) return
    let hash: string
    try {
      hash = decodeURIComponent(rawHash)
    } catch {
      hash = rawHash
    }
    // Defer so react-markdown has flushed the heading IDs into the DOM.
    const handle = window.setTimeout(() => {
      const target = document.getElementById(hash)
      if (target) target.scrollIntoView({block: 'start', inline: 'nearest'})
    }, 50)
    return () => window.clearTimeout(handle)
  }, [content])
}

export function MarkdownRenderer({content}: {content: string}) {
  useHashScroll(content)
  return (
    <div className="help-md">
      <style>{`
        .help-md, .help-md * {
          font-family: var(--font-family-text, -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, Roboto, "Helvetica Neue", Arial, sans-serif);
        }
        .help-md code, .help-md pre, .help-md pre * {
          font-family: ${MONO_FONT};
        }
        .help-md > :first-child { margin-top: 0 !important; }
        .help-md > :last-child { margin-bottom: 0 !important; }
        .help-md p:last-child { margin-bottom: 0; }
        .help-md li > p { margin: 0 0 0.35rem; }
        .help-md li:last-child { margin-bottom: 0; }

        /* Leave breathing room when scrolled-to by an anchor click */
        .help-md h1, .help-md h2, .help-md h3,
        .help-md h4, .help-md h5, .help-md h6 {
          scroll-margin-top: 1.25rem;
        }
        /* Heading anchor link — hover-revealed, keeps the panel quiet */
        .help-md .help-md-anchor {
          margin-left: 0.4em;
          font-weight: 400;
          text-decoration: none;
          color: var(--card-muted-fg-color);
          opacity: 0;
          transition: opacity 0.12s ease-in-out;
        }
        .help-md h1:hover .help-md-anchor,
        .help-md h2:hover .help-md-anchor,
        .help-md h3:hover .help-md-anchor,
        .help-md h4:hover .help-md-anchor,
        .help-md h5:hover .help-md-anchor,
        .help-md h6:hover .help-md-anchor,
        .help-md .help-md-anchor:focus-visible {
          opacity: 1;
        }

        /* Copy button on code blocks — hover-revealed, glass-backdrop */
        .help-md .help-md-codeblock {
          position: relative;
        }
        .help-md .help-md-copy-btn {
          position: absolute;
          top: 8px;
          right: 8px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          padding: 0;
          font-size: 16px;
          color: var(--card-muted-fg-color);
          background: color-mix(in srgb, var(--card-bg-color) 55%, transparent);
          backdrop-filter: blur(8px) saturate(140%);
          -webkit-backdrop-filter: blur(8px) saturate(140%);
          border: 1px solid var(--card-border-color);
          border-radius: 6px;
          cursor: pointer;
          opacity: 0;
          transition: opacity 0.12s, color 0.12s, background 0.12s;
          z-index: 1;
        }
        .help-md .help-md-codeblock:hover .help-md-copy-btn,
        .help-md .help-md-copy-btn:focus-visible,
        .help-md .help-md-copy-btn.is-copied {
          opacity: 1;
        }
        .help-md .help-md-copy-btn:hover {
          color: var(--card-fg-color);
          background: color-mix(in srgb, var(--card-bg-color) 75%, transparent);
        }
        .help-md .help-md-copy-btn.is-copied {
          color: #2db571;
          color: var(--card-badge-positive-dot-color, #2db571);
        }

        /* Admonition body — strip the trailing margin off the last paragraph */
        .help-md .help-md-admonition-body > :last-child {
          margin-bottom: 0;
        }
      `}</style>
      <ReactMarkdown
        components={components}
        remarkPlugins={[remarkGfm, remarkCodeMeta, remarkAdmonitions]}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
