import {openHelpDialog} from '../components/help-dialog-store'
import {HelpIcon} from '../components/HelpIcon'
import {isHelpActive} from '../schema/withHelp'

/**
 * Returns a list-pane menu item that opens the help dialog for `schemaType`,
 * or an empty array if help is not active for that schema.
 *
 * Spread into a list's `.menuItems([...])`:
 *
 *   .menuItems([
 *     ...helpMenuItems(S, 'page'),
 *     ...createBaseSortMenuItems(S),
 *   ])
 */
export function helpMenuItems(S: any, schemaType: string): any[] {
  if (!isHelpActive(schemaType)) return []
  return [
    S.menuItem()
      .title('Help')
      .icon(HelpIcon)
      // Distinct group so Sanity renders a visual separator between Help and
      // any sort/other items that follow in `.menuItems([...])`.
      .group('help')
      .action(() => openHelpDialog(schemaType)),
  ]
}
