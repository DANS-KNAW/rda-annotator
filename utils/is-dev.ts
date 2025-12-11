/**
 * Check if verbose/dev logging is enabled.
 * True in development mode OR when WXT_VERBOSE_LOGGING env var is set to "true".
 * This allows enabling verbose logging in production builds for debugging.
 */
export const isDev =
  import.meta.env.DEV || import.meta.env.WXT_VERBOSE_LOGGING === "true";
