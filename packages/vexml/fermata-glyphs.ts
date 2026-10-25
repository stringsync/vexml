/*
 * MusicXML fermata shape (the <fermata> element's text) -> its [above, below] SMuFL glyphs.
 * A note's fermata (NotationTranslator.addFermata) and a barline's (DirectionPlacer) both
 * read it. The curlew has one face, so an inverted one draws the same sign below.
 */
export const NORMAL_FERMATA_GLYPHS: [above: string, below: string] = [
	'', // fermataAbove
	'', // fermataBelow
];
export const FERMATA_GLYPHS: Record<string, [above: string, below: string]> = {
	normal: NORMAL_FERMATA_GLYPHS,
	angled: ['', ''], // fermataShortAbove/Below
	square: ['', ''], // fermataLongAbove/Below
	'double-angled': ['', ''], // fermataVeryShortAbove/Below
	'double-square': ['', ''], // fermataVeryLongAbove/Below
	'double-dot': ['', ''], // fermataLongHenzeAbove/Below
	'half-curve': ['', ''], // fermataShortHenzeAbove/Below
	curlew: ['', ''], // curlewSign
};
