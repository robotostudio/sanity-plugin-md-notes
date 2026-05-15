import type { DefaultDocumentNodeResolver } from 'sanity/structure'

import { HelpIcon } from '../components/help-icon'
import { HelpView } from '../components/help-view'
import { isHelpActive } from '../schema/with-help'

/**
 * Composes a `defaultDocumentNode` resolver that injects the Help view tab
 * when the schema is opted in via `withHelp()` and a help.md file exists.
 *
 * Use in `sanity.config.ts`:
 *
 *   structureTool({
 *     structure,
 *     defaultDocumentNode: withHelpDefaultDocumentNode(),
 *   })
 *
 * Or compose with your existing resolver:
 *
 *   structureTool({
 *     structure,
 *     defaultDocumentNode: withHelpDefaultDocumentNode((S, context) => {
 *       return S.document().views([S.view.form(), S.view.component(MyPreview)])
 *     }),
 *   })
 */
export function withHelpDefaultDocumentNode(
  base?: DefaultDocumentNodeResolver,
): DefaultDocumentNodeResolver {
  return (S, context) => {
    const baseNode = base ? base(S, context) : S.document()
    if (!baseNode) return baseNode
    if (!isHelpActive(context.schemaType)) return baseNode

    const helpView = S.view.component(HelpView).id('help').title('Help').icon(HelpIcon)

    // If the base resolver declared views, append Help. Otherwise use [form, Help].
    const builderWithViews = baseNode as unknown as {
      getViews?: () => unknown[]
    }
    const existingViews =
      typeof builderWithViews.getViews === 'function' ? builderWithViews.getViews() : null
    if (existingViews && existingViews.length > 0) {
      // If the base resolver already injected a Help view, don't duplicate it.
      const hasHelpView = existingViews.some(
        (view) =>
          typeof (view as { getId?: () => string }).getId === 'function' &&
          (view as { getId: () => string }).getId() === 'help',
      )
      if (hasHelpView) return baseNode
      return baseNode.views([...existingViews, helpView] as Parameters<typeof baseNode.views>[0])
    }
    return baseNode.views([S.view.form(), helpView])
  }
}
