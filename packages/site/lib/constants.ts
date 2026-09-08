// Namespaced so a playground on a shared origin can't collide with another app's keys.
export const STORAGE_KEY = 'vexml:musicxml';
export const INSTRUMENT_KEY = 'vexml:instrument';

// How long each grace note sounds before the main note, in ms. Short enough to read as an ornament.
export const GRACE_MS = 80;

// The playhead bar drawn over the score: the brand pink, wide enough to read against a staff.
export const CURSOR_COLOR = '#ff3d9e';
export const CURSOR_WIDTH_PX = 2;

// A dark shade of the playhead pink makes editing focus distinct from playback.
export const SELECTION_OUTLINE_COLOR = '#a80050';

// Sounding notes use a lighter playhead pink; hover uses the cursor pink.
export const ACTIVE_COLOR = '#ff70b8';
// A note's fill while it's hovered (wins over ACTIVE_COLOR).
export const HOVER_COLOR = CURSOR_COLOR;
// The halo outline drawn around the hovered note.
export const HALO_COLOR = CURSOR_COLOR;

// Debounce window for slider/typing-driven re-renders, and the render-time threshold below which we
// skip the debounce entirely (renders fast enough to keep up with input).
export const DEBOUNCE_MS = 500;
export const FAST_RENDER_MS = 50;

// Config defaults, used both as the slider's displayed value and the render fallback.
export const DEFAULT_NOTE_SPACING = 36;
export const DEFAULT_SOFTMAX_FACTOR = 10;
export const DEFAULT_SYSTEM_SPACING = 30;
export const DEFAULT_MAX_SYSTEM_FILL = 0.9;
export const DEFAULT_WIDTH = 900;

// The example loaded on first visit (when nothing is saved).
export const DEFAULT_FIXTURE = 'voices_grand_staff';
