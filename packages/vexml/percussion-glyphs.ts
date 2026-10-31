// vet-ignore-file comments-say-why-not-what: each glyph is an invisible private-use character, so the trailing SMuFL name is the only readable key to the table
/*
 * MusicXML <percussion> pictograms -> their SMuFL glyphs. Keyed by the child's tag and then
 * its text, the schema's own spelling (the glass-value, metal-value, ... enumerations), so a
 * value the schema does not list finds nothing and prints as its words instead. Names in the
 * comments are the SMuFL glyph names.
 */
export const PERCUSSION_GLYPHS: Record<string, Record<string, string>> = {
	glass: {
		'glass harmonica': '\uE765', // pictGlassHarmonica
		'glass harp': '\uE764', // pictGlassHarp
		'wind chimes': '\uE6C1', // pictWindChimesGlass
	},
	metal: {
		agogo: '\uE717', // pictAgogo
		almglocken: '\uE712', // pictAlmglocken
		bell: '\uE714', // pictBell
		'bell plate': '\uE713', // pictBellPlate
		'bell tree': '\uE71A', // pictBellTree
		'brake drum': '\uE6E1', // pictBrakeDrum
		cencerro: '\uE716', // pictCencerro
		'chain rattle': '\uE748', // pictChainRattle
		'Chinese cymbal': '\uE726', // pictChineseCymbal
		cowbell: '\uE711', // pictCowBell
		'crash cymbals': '\uE720', // pictCrashCymbals
		crotale: '\uE6AE', // pictCrotales
		'cymbal tongs': '\uE728', // pictCymbalTongs
		'domed gong': '\uE733', // pictGongWithButton
		'finger cymbals': '\uE727', // pictFingerCymbals
		flexatone: '\uE740', // pictFlexatone
		gong: '\uE732', // pictGong
		'hi-hat': '\uE722', // pictHiHat
		'high-hat cymbals': '\uE723', // pictHiHatOnStand
		handbell: '\uE715', // pictHandbell
		'jaw harp': '\uE767', // pictJawHarp
		'jingle bells': '\uE719', // pictJingleBells
		'musical saw': '\uE766', // pictMusicalSaw
		'shell bells': '\uE718', // pictShellBells
		sistrum: '\uE746', // pictSistrum
		'sizzle cymbal': '\uE724', // pictSizzleCymbal
		'sleigh bells': '\uE710', // pictSleighBell
		'suspended cymbal': '\uE721', // pictSuspendedCymbal
		'tam tam': '\uE730', // pictTamTam
		'tam tam with beater': '\uE731', // pictTamTamWithBeater
		triangle: '\uE700', // pictTriangle
		'Vietnamese hat': '\uE725', // pictVietnameseHat
	},
	wood: {
		'bamboo scraper': '\uE6FB', // pictBambooScraper
		'board clapper': '\uE6F7', // pictBoardClapper
		cabasa: '\uE743', // pictCabasa
		castanets: '\uE6F8', // pictCastanets
		'castanets with handle': '\uE6F9', // pictCastanetsWithHandle
		claves: '\uE6F2', // pictClaves
		'football rattle': '\uE6F5', // pictFootballRatchet
		guiro: '\uE6F3', // pictGuiro
		'log drum': '\uE6DF', // pictLogDrum
		maraca: '\uE741', // pictMaraca
		maracas: '\uE742', // pictMaracas
		quijada: '\uE6FA', // pictQuijada
		rainstick: '\uE747', // pictRainstick
		ratchet: '\uE6F4', // pictRatchet
		'reco-reco': '\uE6FC', // pictRecoReco
		'sandpaper blocks': '\uE762', // pictSandpaperBlocks
		'slit drum': '\uE6E0', // pictSlitDrum
		'temple block': '\uE6F1', // pictTempleBlocks
		vibraslap: '\uE745', // pictVibraslap
		whip: '\uE6F6', // pictWhip
		'wood block': '\uE6F0', // pictWoodBlock
	},
	pitched: {
		celesta: '\uE6B0', // pictCelesta
		chimes: '\uE6C2', // pictChimes
		glockenspiel: '\uE6A0', // pictGlsp
		lithophone: '\uE6B1', // pictLithophone
		mallet: '\uE7DF', // pictBeaterMallet
		marimba: '\uE6A6', // pictMar
		'steel drums': '\uE6AF', // pictSteelDrums
		tubaphone: '\uE6B2', // pictTubaphone
		'tubular chimes': '\uE6C0', // pictTubularBells
		vibraphone: '\uE6A7', // pictVib
		xylophone: '\uE6A1', // pictXyl
	},
	membrane: {
		'bass drum': '\uE6D4', // pictBassDrum
		'bass drum on side': '\uE6D5', // pictBassDrumOnSide
		bongos: '\uE6DD', // pictBongos
		'Chinese tomtom': '\uE6D8', // pictTomTomChinese
		'conga drum': '\uE6DE', // pictConga
		cuica: '\uE6E4', // pictCuica
		'goblet drum': '\uE6E2', // pictGobletDrum
		'Indo-American tomtom': '\uE6DA', // pictTomTomIndoAmerican
		'Japanese tomtom': '\uE6D9', // pictTomTomJapanese
		'military drum': '\uE6D3', // pictSnareDrumMilitary
		'snare drum': '\uE6D1', // pictSnareDrum
		'snare drum snares off': '\uE6D2', // pictSnareDrumSnaresOff
		tabla: '\uE6E3', // pictTabla
		tambourine: '\uE6DB', // pictTambourine
		'tenor drum': '\uE6D6', // pictTenorDrum
		timbales: '\uE6DC', // pictTimbales
		tomtom: '\uE6D7', // pictTomTom
	},
	effect: {
		anvil: '\uE701', // pictAnvil
		'auto horn': '\uE755', // pictCarHorn
		'bird whistle': '\uE751', // pictBirdWhistle
		cannon: '\uE761', // pictCannon
		'duck call': '\uE757', // pictDuckCall
		'gun shot': '\uE760', // pictPistolShot
		'klaxon horn': '\uE756', // pictKlaxonHorn
		'lions roar': '\uE763', // pictLionsRoar
		'lotus flute': '\uE75A', // pictLotusFlute
		megaphone: '\uE759', // pictMegaphone
		'police whistle': '\uE752', // pictPoliceWhistle
		siren: '\uE753', // pictSiren
		'slide whistle': '\uE750', // pictSlideWhistle
		'thunder sheet': '\uE744', // pictThundersheet
		'wind machine': '\uE754', // pictWindMachine
		'wind whistle': '\uE758', // pictWindWhistle
	},
	'stick-location': {
		center: '\uE7FE', // pictCenter1
		rim: '\uE801', // pictRim1
		'cymbal bell': '\uE72A', // pictBellOfCymbal
		'cymbal edge': '\uE729', // pictEdgeOfCymbal
	},
};

/* <timpani/> is empty: the one pictogram it can mean. */
export const TIMPANI_GLYPH = '\uE6D0'; // pictTimpani

/*
 * <beater> values -> their glyphs: one glyph for a beater with no tip, or [up, down] for one
 * SMuFL draws pointing either way (the beater's `tip` picks).
 */
export const BEATER_GLYPHS: Record<
	string,
	string | [up: string, down: string]
> = {
	bow: '\uE7DE', // pictBeaterBow
	'chime hammer': '\uE7E1', // pictBeaterHammer
	coin: '\uE7E7', // pictCoins
	'drum stick': '\uE7E8', // pictDrumStick
	finger: '\uE7E4', // pictBeaterFinger
	fingernail: '\uE7E6', // pictBeaterFingernails
	fist: '\uE7E5', // pictBeaterFist
	'guiro scraper': '\uE7DD', // pictBeaterGuiroScraper
	hammer: '\uE7E1', // pictBeaterHammer
	hand: '\uE7E3', // pictBeaterHand
	'jazz stick': ['\uE7D3', '\uE7D4'], // pictBeaterJazzSticksUp/Down
	'knitting needle': '\uE7E2', // pictBeaterKnittingNeedle
	'metal hammer': '\uE7E0', // pictBeaterMetalHammer
	'slide brush on gong': '\uE734', // pictSlideBrushOnGong
	'snare stick': ['\uE7D1', '\uE7D2'], // pictBeaterSnareSticksUp/Down
	'spoon mallet': '\uE7DC', // pictBeaterSpoonWoodenMallet
	superball: '\uE7B2', // pictSuperball
	'triangle beater': ['\uE7D5', '\uE7D6'], // pictBeaterTriangleUp/Down
	'triangle beater plain': '\uE7EF', // pictBeaterTrianglePlain
	'wire brush': ['\uE7D7', '\uE7D8'], // pictBeaterWireBrushesUp/Down
};

/*
 * A <stick>'s <stick-type> and <stick-material> -> its glyphs [up, down, left, right], or
 * [up, down] for the sticks SMuFL draws only vertically. SMuFL names each stick by its
 * head's hardness, so 'shaded' (a wood or brass core) reads as the wood head where SMuFL
 * draws one, and 'x' (a metal core) as the metal head. A pairing SMuFL has no glyph for is
 * absent and prints as its words.
 */
export const STICK_GLYPHS: Record<string, Record<string, string[]>> = {
	'bass drum': {
		soft: ['\uE798', '\uE799'], // pictBeaterSoftBassDrumUp/Down
		medium: ['\uE79A', '\uE79B'], // pictBeaterMediumBassDrumUp/Down
		hard: ['\uE79C', '\uE79D'], // pictBeaterHardBassDrumUp/Down
		x: ['\uE79E', '\uE79F'], // pictBeaterMetalBassDrumUp/Down
	},
	'double bass drum': {
		soft: ['\uE7A0', '\uE7A1'], // pictBeaterDoubleBassDrumUp/Down
		medium: ['\uE7A0', '\uE7A1'],
		hard: ['\uE7A0', '\uE7A1'],
	},
	glockenspiel: {
		soft: ['\uE780', '\uE781', '\uE783', '\uE782'], // pictBeaterSoftGlockenspiel*
		hard: ['\uE784', '\uE785', '\uE787', '\uE786'], // pictBeaterHardGlockenspiel*
	},
	gum: {
		soft: ['\uE7BB', '\uE7BC', '\uE7BE', '\uE7BD'], // pictGumSoft*
		medium: ['\uE7BF', '\uE7C0', '\uE7C2', '\uE7C1'], // pictGumMedium*
		hard: ['\uE7C3', '\uE7C4', '\uE7C6', '\uE7C5'], // pictGumHard*
	},
	hammer: {
		soft: ['\uE7CD', '\uE7CE'], // pictBeaterHammerPlasticUp/Down
		medium: ['\uE7CD', '\uE7CE'],
		hard: ['\uE7CD', '\uE7CE'],
		shaded: ['\uE7CB', '\uE7CC'], // pictBeaterHammerWoodUp/Down
		x: ['\uE7CF', '\uE7D0'], // pictBeaterHammerMetalUp/Down
	},
	superball: {
		soft: ['\uE7AE', '\uE7AF', '\uE7B1', '\uE7B0'], // pictBeaterSuperball*
		medium: ['\uE7AE', '\uE7AF', '\uE7B1', '\uE7B0'],
		hard: ['\uE7AE', '\uE7AF', '\uE7B1', '\uE7B0'],
	},
	timpani: {
		soft: ['\uE788', '\uE789', '\uE78B', '\uE78A'], // pictBeaterSoftTimpani*
		medium: ['\uE78C', '\uE78D', '\uE78F', '\uE78E'], // pictBeaterMediumTimpani*
		hard: ['\uE790', '\uE791', '\uE793', '\uE792'], // pictBeaterHardTimpani*
		shaded: ['\uE794', '\uE795', '\uE797', '\uE796'], // pictBeaterWoodTimpani*
	},
	wound: {
		soft: ['\uE7B7', '\uE7B8', '\uE7BA', '\uE7B9'], // pictWoundSoft*
		hard: ['\uE7B3', '\uE7B4', '\uE7B6', '\uE7B5'], // pictWoundHard*
	},
	xylophone: {
		soft: ['\uE770', '\uE771', '\uE773', '\uE772'], // pictBeaterSoftXylophone*
		medium: ['\uE774', '\uE775', '\uE777', '\uE776'], // pictBeaterMediumXylophone*
		hard: ['\uE778', '\uE779', '\uE77B', '\uE77A'], // pictBeaterHardXylophone*
		shaded: ['\uE77C', '\uE77D', '\uE77F', '\uE77E'], // pictBeaterWoodXylophone*
	},
	yarn: {
		soft: ['\uE7A2', '\uE7A3', '\uE7A5', '\uE7A4'], // pictBeaterSoftYarn*
		medium: ['\uE7A6', '\uE7A7', '\uE7A9', '\uE7A8'], // pictBeaterMediumYarn*
		hard: ['\uE7AA', '\uE7AB', '\uE7AD', '\uE7AC'], // pictBeaterHardYarn*
	},
};

/*
 * A `tip` attribute -> its index into the [up, down, left, right] glyph lists above. SMuFL
 * draws no diagonal beaters, so each diagonal takes the vertical it leans toward.
 */
export const TIP_INDEX: Record<string, number> = {
	up: 0,
	down: 1,
	left: 2,
	right: 3,
	northwest: 0,
	northeast: 0,
	southwest: 1,
	southeast: 1,
};
