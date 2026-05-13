import type {UserViewComponent} from 'sanity/structure'

import {getHelp} from '../registry'
import {HelpPanel, HelpPanelEmpty} from './help-panel'

export const HelpView: UserViewComponent = ({schemaType}) => {
  const entry = getHelp(schemaType.name)
  if (!entry) return <HelpPanelEmpty schemaType={schemaType.name} />
  return <HelpPanel entry={entry} />
}
