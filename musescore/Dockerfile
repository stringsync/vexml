# MuseScore 3, for rendering a reference PNG to compare vexml against.
#
# Debian's musescore3 rather than a MuseScore 4 AppImage: MuseScore ships no
# arm64 Linux build, so an AppImage would run under x86 emulation on Apple
# Silicon. This one is native on both arches. MuseScore 3's engraving is a few
# years behind MuseScore 4's, which is fine for a tool that is a second opinion
# and not ground truth.
FROM debian:bookworm-slim

RUN apt-get update -qq \
	&& apt-get install -y --no-install-recommends musescore3 \
	&& rm -rf /var/lib/apt/lists/*

# Qt needs somewhere writable for its config and runtime dirs, and warns unless
# the runtime dir is 0700. The container is throwaway, so /tmp is fine.
RUN mkdir -p /tmp/runtime && chmod 700 /tmp/runtime
ENV QT_QPA_PLATFORM=offscreen \
	XDG_RUNTIME_DIR=/tmp/runtime \
	HOME=/tmp

# PNG export is transparent by default, which reads as black in some viewers and
# makes a side-by-side against vexml's white background hard to judge. There is no
# CLI flag for it, so seed the QSettings file MuseScore reads at startup ('/' in
# the preference key export/png/useTransparency splits into section + backslash).
RUN mkdir -p /tmp/.config/MuseScore \
	&& printf '[export]\npng\\useTransparency=false\n' \
		> /tmp/.config/MuseScore/MuseScore3.ini

ENTRYPOINT ["mscore3"]
