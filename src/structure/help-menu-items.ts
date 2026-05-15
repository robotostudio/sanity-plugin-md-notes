import {
  getOrderingMenuItemsForSchemaType,
  type MenuItem,
  type MenuItemBuilder,
  type StructureBuilder,
  type StructureContext,
  type StructureResolverContext,
} from 'sanity/structure'

import { openHelpDialog } from '../components/help-dialog-store'
import { HelpIcon } from '../components/help-icon'
import { isHelpActive } from '../schema/with-help'

export interface HelpMenuItemsOptions {
  /** Schema type the Help item is being added for. */
  schemaType: string

  /**
   * The structure resolver's `context` argument. When provided, the
   * schema's default ordering menu items are appended so calling
   * `.menuItems([...])` doesn't wipe Sanity's default sorts. Omit when
   * you're supplying your own custom orderings instead.
   */
  context?: StructureResolverContext
}

/**
 * Returns a list-pane menu item that opens the help dialog for `schemaType`,
 * plus the schema's default ordering menu items if a structure context is
 * passed. When help is not active for the schema, returns the default
 * ordering items if `context` was provided, otherwise an empty array.
 *
 * Calling `.menuItems([...])` on a list pane REPLACES the default sort
 * options that Sanity would otherwise build from the schema's `orderings`,
 * so include them explicitly:
 *
 *   // Inside a structure resolver: `(S, context) => ...`
 *   S.documentTypeList('page').menuItems(
 *     helpMenuItems(S, {schemaType: 'page', context}),  // Help + default sorts
 *   )
 *
 *   // With your own custom orderings (skip the context):
 *   S.documentTypeList('page').menuItems([
 *     ...helpMenuItems(S, {schemaType: 'page'}),
 *     S.orderingMenuItem({name: 'foo', title: 'Foo', by: [...]}),
 *   ])
 */
export function helpMenuItems(
  S: StructureBuilder,
  options: HelpMenuItemsOptions,
): (MenuItem | MenuItemBuilder)[] {
  const { schemaType, context } = options
  // `getOrderingMenuItemsForSchemaType` is typed as `StructureContext` upstream
  // but only reads `context.schema` — and `StructureResolverContext` already
  // provides that. The cast is safe and matches what every
  // `(S, context) => ...` resolver passes through.
  const orderings = context
    ? getOrderingMenuItemsForSchemaType(context as unknown as StructureContext, schemaType)
    : []
  if (!isHelpActive(schemaType)) return orderings
  const helpItem = S.menuItem()
    .title('Help')
    .icon(HelpIcon)
    // Distinct group so Sanity renders a visual separator between Help and
    // any sort/other items that follow in `.menuItems([...])`.
    .group('help')
    .action(() => openHelpDialog(schemaType))
  return context ? [helpItem, ...orderings] : [helpItem]
}
