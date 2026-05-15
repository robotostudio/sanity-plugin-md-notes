import type { DocumentBuilder, StructureBuilder } from 'sanity/structure'

import { HelpIcon } from '../components/help-icon'
import { HelpView } from '../components/help-view'
import { isHelpActive } from '../schema/with-help'

export interface HelpDocumentOptions {
  /** Schema type of the singleton document. */
  schemaType: string

  /** Stable document id (e.g. `'not-found-page-en'`). */
  documentId: string

  /** Optional display title shown in the structure pane. */
  title?: string
}

/**
 * Returns an `S.document()` builder for a singleton with the Help view tab
 * pre-injected. Drop-in replacement for `S.document().schemaType(...).documentId(...)`
 * inside structure.ts when you want singletons to get the Help tab.
 *
 *   helpDocument(S, {
 *     schemaType: 'not-found-page',
 *     documentId: 'not-found-page-en',
 *     title: 'English 404 Page',
 *   })
 */
export function helpDocument(S: StructureBuilder, options: HelpDocumentOptions): DocumentBuilder {
  const { schemaType, documentId, title } = options
  let doc = S.document().schemaType(schemaType).documentId(documentId)
  if (title) doc = doc.title(title)
  if (isHelpActive(schemaType)) {
    doc = doc.views([
      S.view.form(),
      S.view.component(HelpView).id('help').title('Help').icon(HelpIcon),
    ])
  }
  return doc
}
