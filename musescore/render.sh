#!/usr/bin/env bash
# Render a MusicXML file to a PNG with MuseScore, in Docker.
#
# MuseScore is a reference, not ground truth. It has its own bugs and its own
# house style, and its spacing, fonts, and page layout will never match vexml's.
# Use it for a second opinion on one ambiguous measure — not for layout parity.
#
# Usage: render.sh <input.musicxml> <output.png>
set -euo pipefail
shopt -s nullglob

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
image="vexml-musescore"

# Enough to read a measure without the file being enormous. MuseScore always
# lays out a full page, so trim the surrounding whitespace down to a margin.
dpi=130
margin=10

if [ "$#" -ne 2 ]; then
	echo "usage: render.sh <input.musicxml> <output.png>" >&2
	exit 1
fi

input="$1"
output="$2"

if [ ! -f "$input" ]; then
	echo "render.sh: no such file: $input" >&2
	exit 1
fi

# Two mounts, because the input and the output need not share a directory.
in_dir="$(cd "$(dirname "$input")" && pwd)"
in_file="$(basename "$input")"
out_dir="$(cd "$(dirname "$output")" && pwd)"
out_file="$(basename "$output")"
stem="${out_file%.png}"

if docker image inspect "$image" >/dev/null 2>&1; then
	# Near-free once the layers are cached, and picks up Dockerfile edits — a stale
	# image silently rendering with the old settings is not worth the second saved.
	docker build -q -t "$image" "$here" >/dev/null
else
	echo "Building $image (first run only, ~740MB)..." >&2
	docker build -t "$image" "$here"
fi

# MuseScore writes one file per page, suffixed -1, -2, … — never the bare name.
# Clear the previous run's pages so a shorter score can't leave stale ones behind.
for stale in "$out_dir/$stem"-[0-9]*.png; do
	rm -f "$stale"
done

docker run --rm \
	-v "$in_dir:/in:ro" \
	-v "$out_dir:/out" \
	"$image" -T "$margin" -r "$dpi" -o "/out/$out_file" "/in/$in_file"

pages=("$out_dir/$stem"-[0-9]*.png)
case "${#pages[@]}" in
	0)
		echo "render.sh: MuseScore wrote no pages" >&2
		exit 1
		;;
	# One page is the normal case for the handful of measures this is meant for.
	1)
		mv "${pages[0]}" "$output"
		echo "wrote $output"
		;;
	*)
		echo "wrote ${#pages[@]} pages:"
		printf '%s\n' "${pages[@]}"
		;;
esac
