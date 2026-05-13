import {defineDocumentInspector, type DocumentInspectorProps} from 'sanity'

import {getHelp} from '../registry'
import {isHelpActive} from '../schema/with-help'
import {HelpIcon} from './help-icon'
import {HelpPanel, HelpPanelEmpty} from './help-panel'

function HelpInspectorComponent({documentType}: DocumentInspectorProps) {
  const entry = getHelp(documentType)
  if (!entry) return <HelpPanelEmpty schemaType={documentType} />
  return <HelpPanel entry={entry} />
}

export const helpInspector = defineDocumentInspector({
  name: 'help',
  useMenuItem: ({documentType}) => ({
    title: 'Help',
    icon: HelpIcon,
    showAsAction: true,
    hidden: !isHelpActive(documentType),
  }),
  component: HelpInspectorComponent,
})
