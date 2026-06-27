# xmllint — MusicXML XSD validation

Validates MusicXML files against the MusicXML 4.0 XSD using `xmllint` (libxml2).
MusicXML is XSD 1.0, which xmllint fully supports.

## Run

```sh
./xmllint/validate.sh                 # validate all integration fixtures
./xmllint/validate.sh path/to/foo.musicxml ...   # validate specific files
```

It's also wired into `vex fix`, which validates every `.musicxml` file.

## How it works

- **Fast path:** if `xmllint` is on your PATH, it's used directly.
- **Otherwise:** a tiny Docker image (`vexml-xmllint`, Alpine + `libxml2-utils`)
  is built on first use and run with the repo mounted read-only at `/work`.

Validation command: `xmllint --noout --schema xmllint/schema/musicxml.xsd <files>`.
Exits non-zero if any file fails; each failing file is named in the output.

## Schema

`xmllint/schema/` holds the vendored MusicXML 4.0 XSD. `musicxml.xsd` imports
`xlink.xsd` and `xml.xsd` (same dir), so imports resolve fully offline.
