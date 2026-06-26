#!/usr/bin/env bash
# Validate MusicXML files against the MusicXML 4.0 XSD with xmllint.
# Fast path: a local xmllint on PATH. Otherwise: build & run the Docker image.
# Usage: validate.sh [files...]   (no args -> all integration fixtures)
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo="$(cd "$here/.." && pwd)"
schema="xmllint/schema/musicxml.xsd"   # relative to repo root (== Docker /work)
image="vexml-xmllint"

# Files: args as given, else default to the integration fixtures glob.
if [ "$#" -gt 0 ]; then
	files=("$@")
else
	files=("$repo"/tests/integration/__data__/*.musicxml)
fi

# Paths must be relative to the repo root so they resolve inside the Docker mount.
cd "$repo"
rel=()
for f in "${files[@]}"; do
	case "$f" in
		"$repo"/*) rel+=("${f#"$repo"/}") ;;
		/*) echo "validate.sh: file is outside the repo: $f" >&2; exit 1 ;;
		*) rel+=("$f") ;;
	esac
done

# Drop the per-file "<file> validates" lines; blank-line-separate each invalid
# file's error group (each ends in "<file> fails to validate").
filter() { awk '/ validates$/ {next} {print} / fails to validate$/ {print ""}'; }

status=0
if command -v xmllint >/dev/null 2>&1; then
	xmllint --noout --schema "$schema" "${rel[@]}" 2>&1 | filter >&2 || status=$?
else
	if ! docker image inspect "$image" >/dev/null 2>&1; then
		docker build -t "$image" "$here"
	fi
	docker run --rm -v "$repo:/work:ro" "$image" --noout --schema "$schema" "${rel[@]}" 2>&1 | filter >&2 || status=$?
fi

if [ "$status" -eq 0 ]; then
	echo "xmllint: all ${#rel[@]} MusicXML file(s) valid"
else
	exit 1
fi
