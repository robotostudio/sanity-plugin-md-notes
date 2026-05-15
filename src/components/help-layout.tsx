import type { ReactElement } from 'react'
import type { LayoutProps } from 'sanity'

import { HelpDialogProvider } from './help-dialog-provider'

/**
 * Studio layout wrapper. Mounts the HelpDialogProvider once at the studio
 * root so the kebab "Help" action can open a dialog from anywhere.
 *
 * Wired automatically by `helpPlugin()` via `studio.components.layout`.
 */
export function HelpLayout(props: LayoutProps): ReactElement {
  return <HelpDialogProvider>{props.renderDefault(props)}</HelpDialogProvider>
}
