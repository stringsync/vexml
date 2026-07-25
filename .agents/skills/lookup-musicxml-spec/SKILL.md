---
name: lookup-musicxml-spec
description: Look up the official MusicXML 4.0 specification (elements, attributes, data types, and examples) hosted at w3.org. Use when you need authoritative details about a MusicXML element's content model, allowed attributes, valid data-type values, parent/child relationships, or reference examples.
---

# Looking up the MusicXML 4.0 spec

The MusicXML 4.0 spec is large and split across many pages. Do NOT try to fetch
the whole spec. Instead, fetch the single page for the specific element, data
type, or example you need. Use the `fetch` tool with the URLs below.

Base reference URL: `https://www.w3.org/2021/06/musicxml40/musicxml-reference/`

## Choosing the right page

Figure out what you need, then jump straight to the deep-link URL. Only fetch an
index page when you don't know the exact element/type name.

### Elements

- Element detail: `https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/<element-name>/`
  - Example: `.../elements/note/`, `.../elements/tuplet/`, `.../elements/time-modification/`
  - Gives: description, parent elements, content model (children, order,
    cardinality like "Required", "Optional", "Zero or more", "Exactly one of"),
    the full attributes table (name, type, required?, description), and a list of
    examples using the element.
- Index (alphabetical list of all elements, only if you need to discover a name):
  `https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/`

Slug rules for element names:
- Element names use their literal hyphenated name without the angle brackets:
  `<time-modification>` -> `time-modification`.
- Elements that exist in both partwise and timewise scores (shown in the index
  as `<measure> (partwise)`) use a `<name>-<variant>` slug:
  `measure-partwise`, `measure-timewise`, `part-partwise`, `part-timewise`.

### Data types

- Data type detail: `https://www.w3.org/2021/06/musicxml40/musicxml-reference/data-types/<type-name>/`
  - Example: `.../data-types/note-type-value/`, `.../data-types/yes-no/`, `.../data-types/tenths/`
  - Gives: description, base type, allowed values (for enumerations), and which
    elements/attributes use the type.
- Index (only if you need to discover a type name):
  `https://www.w3.org/2021/06/musicxml40/musicxml-reference/data-types/`

When an element's attribute table lists a `Type` (e.g. `note-type-value`,
`start-stop`, `yes-no`), follow up on the data-type page to get the exact allowed
values.

### Examples

- Examples index: `https://www.w3.org/2021/06/musicxml40/musicxml-reference/examples/`
- Each element detail page ends with a list of examples that use it; fetch a
  specific example page when you need to see real MusicXML markup in context.

### Other references / tutorials

- Reference home (Elements / Data types / Examples): `https://www.w3.org/2021/06/musicxml40/musicxml-reference/`
- Spec home (tutorial, file listings/XSD, version history):
  `https://www.w3.org/2021/06/musicxml40/`
- Related references linked from the home page: Container, Opus, and Sounds
  references, plus the raw `musicxml.xsd` schema under "File Listings".

## Workflow

1. Identify the exact element or data-type name you care about. If unsure of the
   name, fetch the relevant index page first, then the detail page.
2. Fetch the deep-link detail URL for that name.
3. Read the content model and attributes to answer the question. For attribute
   value constraints, follow the linked data-type page.
4. Prefer citing the specific element/type page you used rather than the whole spec.

## Tips

- Names in the spec are written with angle brackets (`<note>`); URLs drop the
  brackets (`note`).
- If a deep link 404s, fall back to the matching index page to confirm the exact
  slug (watch for partwise/timewise variants).
- This project (vexml) renders MusicXML, so this spec is the source of truth for
  how elements should be interpreted. Cross-check parser/rendering assumptions
  against the element's documented content model and attribute defaults.
