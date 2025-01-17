# playback

## Intent

### Goals

- **DO** house the logic for constructing valid playback sequences.
- **DO** provide data structures to discretely navigate a rendering.
- **DO** expose tools to convert between ticks and time.

### Non-goals

- **DO NOT** contain cursor-specific implementations.
- **DO NOT** provide the machinery to interpolate between playback steps.
- **DO NOT** commit a sequence to a prescribed bpm.
