// Plugin entry
export {helpPlugin, type HelpPluginConfig} from './plugin'

// Schema opt-in
export {isHelpActive, isHelpEnabled, withHelp} from './schema/with-help'

// Structure helpers
export {helpDocument} from './structure/help-document'
export {helpMenuItems} from './structure/help-menu-items'
export {withHelpDefaultDocumentNode} from './structure/with-help-default-document-node'

// Registry types (for consumers building their own integrations)
export type {HelpEntry, HelpRegistryOptions} from './registry'

// Components — exposed so consumers can swap or compose
export {HelpIcon} from './components/help-icon'
export {HelpPanel, HelpPanelEmpty} from './components/help-panel'
export {MarkdownRenderer} from './components/markdown-renderer'
