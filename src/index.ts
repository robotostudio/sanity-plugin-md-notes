// Plugin entry
export {helpPlugin, type HelpPluginConfig} from './plugin'

// Schema opt-in
export {withHelp, isHelpEnabled, isHelpActive} from './schema/withHelp'

// Structure helpers
export {helpMenuItems} from './structure/helpMenuItems'
export {helpDocument} from './structure/helpDocument'
export {withHelpDefaultDocumentNode} from './structure/withHelpDefaultDocumentNode'

// Registry types (for consumers building their own integrations)
export type {HelpEntry, HelpRegistryOptions} from './registry'

// Components — exposed so consumers can swap or compose
export {HelpIcon} from './components/HelpIcon'
export {HelpPanel, HelpPanelEmpty} from './components/HelpPanel'
export {MarkdownRenderer} from './components/MarkdownRenderer'
