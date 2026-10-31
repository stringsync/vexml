// Preloaded (see bunfig.toml). vexflow measures text on a canvas it finds in the DOM or, with
// no DOM, on an OffscreenCanvas, and warns on every measurement when it finds neither. The
// unit tests of this package build elements with no DOM, so they get an OffscreenCanvas that
// measures every text as zero wide and zero tall, which is what vexflow's own empty metrics
// answer. A test that installs a canvas of its own with `Element.setTextMeasurementCanvas`
// replaces this one, and falls back to it when it clears its own.

const context = {
	font: '',
	measureText: () => ({
		width: 0,
		actualBoundingBoxLeft: 0,
		actualBoundingBoxRight: 0,
		actualBoundingBoxAscent: 0,
		actualBoundingBoxDescent: 0,
		fontBoundingBoxAscent: 0,
		fontBoundingBoxDescent: 0,
	}),
};

if (typeof OffscreenCanvas === 'undefined') {
	Object.assign(globalThis, {
		OffscreenCanvas: class {
			getContext() {
				return context;
			}
		},
	});
}
