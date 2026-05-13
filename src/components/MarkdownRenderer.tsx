import {Box, Card} from '@sanity/ui'
import React, {Children, isValidElement, type CSSProperties} from 'react'
import ReactMarkdown, {type Components} from 'react-markdown'
import remarkGfm from 'remark-gfm'

const MONO_FONT =
  'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace'

const BORDER = '1px solid var(--card-border-color)'

const baseHeading: CSSProperties = {
  fontWeight: 600,
  lineHeight: 1.3,
  color: 'inherit',
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
  preWrap: {
    margin: '0 0 1rem',
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
      const watch = url.match(
        /^https?:\/\/(?:www\.|m\.)?youtube\.com\/watch\?(?:[^#]*&)?v=([\w-]{6,})/i,
      )
      if (watch) return `https://www.youtube.com/embed/${watch[1]}`
      const short = url.match(/^https?:\/\/youtu\.be\/([\w-]{6,})/i)
      if (short) return `https://www.youtube.com/embed/${short[1]}`
      const embed = url.match(/^https?:\/\/(?:www\.)?youtube\.com\/embed\/([\w-]{6,})/i)
      if (embed) return `https://www.youtube.com/embed/${embed[1]}`
      const shorts = url.match(/^https?:\/\/(?:www\.)?youtube\.com\/shorts\/([\w-]{6,})/i)
      if (shorts) return `https://www.youtube.com/embed/${shorts[1]}`
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
  const arr = Children.toArray(children).filter(
    (c) => typeof c !== 'string' || c.trim() !== '',
  )
  if (arr.length !== 1) return null
  const only = arr[0]
  if (!isValidElement(only)) return null
  const props = only.props as {href?: string; children?: React.ReactNode}
  const href = props.href
  if (typeof href !== 'string') return null
  const linkChildren = Children.toArray(props.children)
  const isBare =
    linkChildren.length === 1 &&
    typeof linkChildren[0] === 'string' &&
    linkChildren[0] === href
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
        allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media"
        allowFullScreen
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

const components: Components = {
  h1: ({children}) => <h1 style={styles.h1}>{children}</h1>,
  h2: ({children}) => <h2 style={styles.h2}>{children}</h2>,
  h3: ({children}) => <h3 style={styles.h3}>{children}</h3>,
  h4: ({children}) => <h4 style={styles.h4}>{children}</h4>,
  h5: ({children}) => <h5 style={styles.h5}>{children}</h5>,
  h6: ({children}) => <h6 style={styles.h6}>{children}</h6>,
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
  code: ({children}) => <code style={styles.inlineCode}>{children}</code>,
  pre: ({children}) => (
    <Card padding={3} radius={2} tone="transparent" border overflow="auto" style={styles.preWrap}>
      <pre style={styles.pre}>{children}</pre>
    </Card>
  ),
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
  blockquote: ({children}) => (
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
  ),
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

export function MarkdownRenderer({content}: {content: string}) {
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
      `}</style>
      <ReactMarkdown components={components} remarkPlugins={[remarkGfm]}>
        {content}
      </ReactMarkdown>
    </div>
  )
}
