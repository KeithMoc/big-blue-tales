// The one list of water presets (ADR-0022). core/env.js holds their numbers and refuses to load if the two disagree;
// the build, the scaffold and the shared sea read the names from here. Plain data: no imports, so Node tools can load it.
// Licence: MIT.
export const PRESET_IDS = ['midnight', 'twilight', 'sunlit', 'sunlit-sea', 'sandy-shelf'];
/** The places the shared sea offers, in button order. Each must be a preset. */
export const SEA_PLACES = ['sunlit', 'twilight', 'midnight', 'sandy-shelf'];
