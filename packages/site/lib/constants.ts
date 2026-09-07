// Namespaced so a playground on a shared origin can't collide with another app's keys.
export const STORAGE_KEY = 'vexml:musicxml';
export const INSTRUMENT_KEY = 'vexml:instrument';

// How long each grace note sounds before the main note, in ms. Short enough to read as an ornament.
export const GRACE_MS = 80;

// The playhead bar drawn over the score: the brand pink, wide enough to read against a staff.
export const CURSOR_COLOR = '#ff3d9e';
export const CURSOR_WIDTH_PX = 2;

// A sounding note belongs to the playhead sitting on it, so it takes the playhead's own pink a few
// steps lighter: the bar reads as the position and the notes under it as what that position is
// playing, rather than as two unrelated signals. Hovering is the one thing that has to be picked
// out against both, so it goes warm amber, a third of the wheel away, and never mistakable for
// either the pink or the engraved black.
//
// The color a sounding note shows while the cursor is over it (and a grace note while it plays).
export const ACTIVE_COLOR = '#ff70b8';
// A note's fill while it's hovered/pinned (wins over ACTIVE_COLOR).
export const HOVER_COLOR = '#f59e0b';
// The halo outline drawn around the hovered/pinned note.
export const HALO_COLOR = 'rgba(180, 83, 9, 0.95)';

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
