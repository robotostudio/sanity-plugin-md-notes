import type {StructureBuilder, ViewBuilder} from 'sanity/structure'

import {HelpIcon} from '../components/help-icon'
import {HelpView} from '../components/help-view'
import {isHelpActive} from '../schema/with-help'

export interface HelpViewOptions {
  /** Schema type the help tab is being injected into. */
  schemaType: string
}

/**
 * Returns an array containing the Help view tab for a given schema type, or
 * an empty array if help is not active for that schema. Designed to be
 * spread into a document builder's `.views([...])` chain, which preserves
 * full builder control (e.g. `.initialValueTemplates(...)`):
 *
 *   S.document()
 *     .schemaType('not-found-page')
 *     .documentId('not-found-page-en')
 *     .title('English 404 Page')
 *     .views([S.view.form(), ...helpView(S, {schemaType: 'not-found-page'})])
 *
 * For the simple one-shot case where you don't need any builder chaining,
 * `helpDocument(S, {schemaType, documentId, title?})` is more concise.
 */
export function helpView(S: StructureBuilder, options: HelpViewOptions): ViewBuilder[] {
  if (!isHelpActive(options.schemaType)) return []
  return [S.view.component(HelpView).id('help').title('Help').icon(HelpIcon)]
}
