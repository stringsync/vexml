# config

## Intent

### Goals

- **DO** Define simple rendering configuration that's JSON-encodeable.
- **DO** Provide a default configuration.
- **DO** Expose a concrete schema for callers to programmatically create configuration knobs.

### Non-goals

- **DO NOT** Deal with complex configurations such as custom classes or functions.
- **DO NOT** Provide a configuration validator (TypeScript enforces validation at compile-time).
- **DO NOT** Manage the intended effect of configuration values.
