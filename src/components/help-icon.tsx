import {BookIcon} from '@sanity/icons'

/**
 * Default Help icon. Re-exported as a named component so consumers can
 * import it elsewhere, and so we don't pass the raw @sanity/icons component
 * directly (slightly more stable against API changes upstream).
 */
export function HelpIcon() {
  return <BookIcon />
}
