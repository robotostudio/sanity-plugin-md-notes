import {getOrderingMenuItemsForSchemaType} from 'sanity/structure'
import {openHelpDialog} from '../components/help-dialog-store'
import {HelpIcon} from '../components/HelpIcon'
import {isHelpActive} from '../schema/withHelp'

/**
 * Returns a list-pane menu item that opens the help dialog for `schemaType`,
 * plus the schema's default ordering menu items if a structure context is
 * passed. Returns an empty array when help is not active for the schema.
 *
 * Calling `.menuItems([...])` on a list pane REPLACES the default sort
 * options that Sanity would otherwise build from the schema's `orderings`,
 * so include them explicitly:
 *
 *   // Inside a structure resolver: `(S, context) => ...`
 *   S.documentTypeList('page').menuItems(
 *     helpMenuItems(S, 'page', context),   // Help + default sorts
 *   )
 *
 *   // With your own custom orderings (skip the context):
 *   S.documentTypeList('page').menuItems([
 *     ...helpMenuItems(S, 'page'),
 *     S.orderingMenuItem({name: 'foo', title: 'Foo', by: [...]}),
 *   ])
 */
export function helpMenuItems(
  S: any,
  schemaType: string,
  context?: {schema: unknown},
): any[] {
  if (!isHelpActive(schemaType)) {
    return context ? getOrderingMenuItemsForSchemaType(context as never, schemaType) : []
  }
  const helpItem = S.menuItem()
    .title('Help')
    .icon(HelpIcon)
    // Distinct group so Sanity renders a visual separator between Help and
    // any sort/other items that follow in `.menuItems([...])`.
    .group('help')
    .action(() => openHelpDialog(schemaType))
  if (!context) return [helpItem]
  return [helpItem, ...getOrderingMenuItemsForSchemaType(context as never, schemaType)]
}
