import {LaunchIcon} from '@sanity/icons'
import {Box, Card, Flex, Stack, Text} from '@sanity/ui'
import {getEditUrl, type HelpEntry} from '../registry'
import {MarkdownRenderer} from './markdown-renderer'

function formatDate(iso: string | null): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function HelpPanel({entry}: {entry: HelpEntry}) {
  const lastUpdated = formatDate(entry.lastUpdated)
  const editUrl = getEditUrl(entry)

  return (
    <Flex direction="column" height="fill" style={{minHeight: 0, height: '100%'}}>
      <Box flex={1} overflow="auto" padding={4}>
        <Box style={{maxWidth: 640, margin: '0 auto'}}>
          <MarkdownRenderer content={entry.content} />
        </Box>
      </Box>
      <Card paddingX={4} paddingY={3} tone="transparent" borderTop style={{flexShrink: 0}}>
        <Box style={{maxWidth: 640, margin: '0 auto'}}>
          <Flex align="center" justify="space-between" gap={3} wrap="wrap">
            <Text size={0} muted>
              {lastUpdated ? `Last updated: ${lastUpdated}` : 'No update date set'}
            </Text>
            {editUrl ? (
              <Text size={0}>
                <a
                  href={editUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    lineHeight: 1,
                    color: 'var(--card-link-fg-color)',
                    textDecoration: 'none',
                  }}
                >
                  <span style={{textDecoration: 'underline', textUnderlineOffset: 2}}>
                    Edit on GitHub
                  </span>
                  <LaunchIcon style={{fontSize: '1.15em'}} />
                </a>
              </Text>
            ) : null}
          </Flex>
        </Box>
      </Card>
    </Flex>
  )
}

export function HelpPanelEmpty({schemaType}: {schemaType: string}) {
  return (
    <Box padding={4}>
      <Stack space={3}>
        <Text size={1} weight="semibold">
          No help content available
        </Text>
        <Text size={1} muted>
          Drop a <code>{schemaType}.help.md</code> file next to the schema definition to add
          guidance here.
        </Text>
      </Stack>
    </Box>
  )
}
