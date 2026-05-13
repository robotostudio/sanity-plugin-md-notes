import {Dialog} from '@sanity/ui'
import {type ReactNode, useEffect, useState} from 'react'
import {getHelp} from '../registry'
import {HelpPanel, HelpPanelEmpty} from './help-panel'
import {closeHelpDialog, subscribeHelpDialog} from './help-dialog-store'

export function HelpDialogProvider({children}: {children: ReactNode}) {
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
