import {Dialog} from '@sanity/ui'
import {type ReactElement, type ReactNode, useEffect, useState} from 'react'

import {getHelp} from '../registry'
import {closeHelpDialog, subscribeHelpDialog} from './help-dialog-store'
import {HelpPanel, HelpPanelEmpty} from './help-panel'

export function HelpDialogProvider({children}: {children: ReactNode}): ReactElement {
  const [schemaType, setSchemaType] = useState<string | null>(null)

  useEffect(() => subscribeHelpDialog(setSchemaType), [])

  const entry = schemaType ? getHelp(schemaType) : null

  return (
    <>
      {children}
      {schemaType && (
        <Dialog
          id="sanity-plugin-help-dialog"
          header="Help"
          onClose={closeHelpDialog}
          onClickOutside={closeHelpDialog}
          width={1}
          padding={0}
        >
          <div style={{height: '70vh'}}>
            {entry ? <HelpPanel entry={entry} /> : <HelpPanelEmpty schemaType={schemaType} />}
          </div>
        </Dialog>
      )}
    </>
  )
}
