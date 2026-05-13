/**
 * Runtime stub for `sanity-plugin-help/git-repo`.
 *
 * Without the Vite plugin, this resolves to `null` and the "Edit on GitHub"
 * footer is suppressed silently. With `sanityHelpVite()` registered in
 * `vite.config.ts`, the plugin intercepts this import at build time and
 * replaces it with the detected `'owner/repo'` string.
 */
const gitRepo: string | null = null
export default gitRepo
