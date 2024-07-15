# playback

## Intent

The intent of this module is to provide data structures that are useful for playback.

### Goals

- **DO** House the logic for constructing valid playback sequences.
- **DO** Provide data structures to discretely navigate a rendering.
- **DO** Expose tools to convert between ticks and time.

### Non-goals

- **DO NOT** Contain cursor-specific implementations.
- **DO NOT** Provide the machinery to interpolate between playback steps.
- **DO NOT** Commit a sequence to a prescribed bpm.
