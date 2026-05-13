import {HelpIcon} from '../components/help-icon'
import {HelpView} from '../components/help-view'
import {isHelpActive} from '../schema/with-help'

/**
 * Returns an `S.document()` builder for a singleton with the Help view tab
 * pre-injected. Drop-in replacement for `S.document().schemaType(...).documentId(...)`
 * inside structure.ts when you want singletons to get the Help tab.
 *
 *   helpDocument(S, 'not-found-page', 'not-found-page-en', 'English 404 Page')
 */
export function helpDocument(S: any, schemaType: string, documentId: string, title?: string) {
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
