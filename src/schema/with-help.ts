import {hasHelp} from '../registry'

/**
 * Schema types that have opted into the help system via `withHelp()`.
 * Populated as schemas are imported (module evaluation time).
 */
const helpEnabledSchemas = new Set<string>()

/**
 * Opts a schema into the help system. Wrap the schema definition:
 *
 *   import {defineType} from 'sanity'
 *   import {withHelp} from 'sanity-plugin-md-notes'
 *
 *   export default withHelp(defineType({
 *     name: 'page',
 *     type: 'document',
 *     fields: [...],
 *   }))
 *
 * Once opted in, the inspector trigger, the Help view tab, the list-pane
 * "Help" menu item, and the singleton Help view all light up as soon as a
 * `<schemaName>.help.md` file is present in the consumer's file map.
 */
export function withHelp<T extends {name: string}>(schema: T): T {
  helpEnabledSchemas.add(schema.name)
  return schema
}

/** True when the schema has been wrapped with `withHelp()`. */
export function isHelpEnabled(schemaType: string): boolean {
  return helpEnabledSchemas.has(schemaType)
}

/** True when help is opted in AND a help.md file exists for the type. */
export function isHelpActive(schemaType: string): boolean {
  return isHelpEnabled(schemaType) && hasHelp(schemaType)
}
