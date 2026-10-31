/*
 * MusicXML fermata shape (the <fermata> element's text) -> its [above, below] SMuFL glyphs.
 * A note's fermata (NotationTranslator.addFermata) and a barline's (DirectionPlacer) both
 * read it. The curlew has one face, so an inverted one draws the same sign below.
 */
export const NORMAL_FERMATA_GLYPHS: [above: string, below: string] = [
	'\uE4C0', // fermataAbove
	'\uE4C1', // fermataBelow
];
export const FERMATA_GLYPHS: Record<string, [above: string, below: string]> = {
	normal: NORMAL_FERMATA_GLYPHS,
	angled: ['\uE4C4', '\uE4C5'], // fermataShortAbove/Below
	square: ['\uE4C6', '\uE4C7'], // fermataLongAbove/Below
	'double-angled': ['\uE4C2', '\uE4C3'], // fermataVeryShortAbove/Below
	'double-square': ['\uE4C8', '\uE4C9'], // fermataVeryLongAbove/Below
	'double-dot': ['\uE4CA', '\uE4CB'], // fermataLongHenzeAbove/Below
	'half-curve': ['\uE4CC', '\uE4CD'], // fermataShortHenzeAbove/Below
	curlew: ['\uE4D6', '\uE4D6'], // curlewSign
};
