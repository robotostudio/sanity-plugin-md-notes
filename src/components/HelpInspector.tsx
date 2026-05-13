import {defineDocumentInspector, type DocumentInspectorProps} from 'sanity'
import {isHelpActive} from '../schema/withHelp'
import {getHelp} from '../registry'
import {HelpIcon} from './HelpIcon'
import {HelpPanel, HelpPanelEmpty} from './HelpPanel'

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
