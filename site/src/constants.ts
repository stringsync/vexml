// localStorage key for the last-edited MusicXML.
export const STORAGE_KEY = 'vexml:musicxml';
// localStorage key for the dark-mode toggle.
export const DARK_KEY = 'vexml:dark';
// localStorage key for the selected playback instrument.
export const INSTRUMENT_KEY = 'vexml:instrument';

// How long each grace note sounds before the main note, in ms. Short enough to read as an ornament.
export const GRACE_MS = 80;

// The color a sounding note shows while the cursor is over it (and a grace note while it plays).
export const ACTIVE_COLOR = '#155dfc';
// A note's fill while it's hovered/pinned (wins over ACTIVE_COLOR).
export const HOVER_COLOR = '#f4f800';
// The halo outline drawn around the hovered/pinned note.
export const HALO_COLOR = 'rgba(255, 0, 105, 0.9)';

// Debounce window for slider/typing-driven re-renders, and the render-time threshold below which we
// skip the debounce entirely (renders fast enough to keep up with input).
export const DEBOUNCE_MS = 500;
export const FAST_RENDER_MS = 50;

// How long a "Saved / Cleared / Retrieved" confirmation stays up.
export const FEEDBACK_MS = 1500;

// Config defaults, used both as the slider's displayed value and the render fallback.
export const DEFAULT_NOTE_SPACING = 36;
export const DEFAULT_SOFTMAX_FACTOR = 10;
export const DEFAULT_SYSTEM_SPACING = 30;
export const DEFAULT_MAX_SYSTEM_FILL = 0.9;
export const DEFAULT_WIDTH = 900;

// The example loaded on first visit (when nothing is saved).
export const DEFAULT_FIXTURE = 'voices_grand_staff';
