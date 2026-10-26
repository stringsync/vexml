/*
 * MusicXML <percussion> pictograms -> their SMuFL glyphs. Keyed by the child's tag and then
 * its text, the schema's own spelling (the glass-value, metal-value, ... enumerations), so a
 * value the schema does not list finds nothing and prints as its words instead. Names in the
 * comments are the SMuFL glyph names.
 */
export const PERCUSSION_GLYPHS: Record<string, Record<string, string>> = {
	glass: {
		'glass harmonica': '', // pictGlassHarmonica
		'glass harp': '', // pictGlassHarp
		'wind chimes': '', // pictWindChimesGlass
	},
	metal: {
		agogo: '', // pictAgogo
		almglocken: '', // pictAlmglocken
		bell: '', // pictBell
		'bell plate': '', // pictBellPlate
		'bell tree': '', // pictBellTree
		'brake drum': '', // pictBrakeDrum
		cencerro: '', // pictCencerro
		'chain rattle': '', // pictChainRattle
		'Chinese cymbal': '', // pictChineseCymbal
		cowbell: '', // pictCowBell
		'crash cymbals': '', // pictCrashCymbals
		crotale: '', // pictCrotales
		'cymbal tongs': '', // pictCymbalTongs
		'domed gong': '', // pictGongWithButton
		'finger cymbals': '', // pictFingerCymbals
		flexatone: '', // pictFlexatone
		gong: '', // pictGong
		'hi-hat': '', // pictHiHat
		'high-hat cymbals': '', // pictHiHatOnStand
		handbell: '', // pictHandbell
		'jaw harp': '', // pictJawHarp
		'jingle bells': '', // pictJingleBells
		'musical saw': '', // pictMusicalSaw
		'shell bells': '', // pictShellBells
		sistrum: '', // pictSistrum
		'sizzle cymbal': '', // pictSizzleCymbal
		'sleigh bells': '', // pictSleighBell
		'suspended cymbal': '', // pictSuspendedCymbal
		'tam tam': '', // pictTamTam
		'tam tam with beater': '', // pictTamTamWithBeater
		triangle: '', // pictTriangle
		'Vietnamese hat': '', // pictVietnameseHat
	},
	wood: {
		'bamboo scraper': '', // pictBambooScraper
		'board clapper': '', // pictBoardClapper
		cabasa: '', // pictCabasa
		castanets: '', // pictCastanets
		'castanets with handle': '', // pictCastanetsWithHandle
		claves: '', // pictClaves
		'football rattle': '', // pictFootballRatchet
		guiro: '', // pictGuiro
		'log drum': '', // pictLogDrum
		maraca: '', // pictMaraca
		maracas: '', // pictMaracas
		quijada: '', // pictQuijada
		rainstick: '', // pictRainstick
		ratchet: '', // pictRatchet
		'reco-reco': '', // pictRecoReco
		'sandpaper blocks': '', // pictSandpaperBlocks
		'slit drum': '', // pictSlitDrum
		'temple block': '', // pictTempleBlocks
		vibraslap: '', // pictVibraslap
		whip: '', // pictWhip
		'wood block': '', // pictWoodBlock
	},
	pitched: {
		celesta: '', // pictCelesta
		chimes: '', // pictChimes
		glockenspiel: '', // pictGlsp
		lithophone: '', // pictLithophone
		mallet: '', // pictBeaterMallet
		marimba: '', // pictMar
		'steel drums': '', // pictSteelDrums
		tubaphone: '', // pictTubaphone
		'tubular chimes': '', // pictTubularBells
		vibraphone: '', // pictVib
		xylophone: '', // pictXyl
	},
	membrane: {
		'bass drum': '', // pictBassDrum
		'bass drum on side': '', // pictBassDrumOnSide
		bongos: '', // pictBongos
		'Chinese tomtom': '', // pictTomTomChinese
		'conga drum': '', // pictConga
		cuica: '', // pictCuica
		'goblet drum': '', // pictGobletDrum
		'Indo-American tomtom': '', // pictTomTomIndoAmerican
		'Japanese tomtom': '', // pictTomTomJapanese
		'military drum': '', // pictSnareDrumMilitary
		'snare drum': '', // pictSnareDrum
		'snare drum snares off': '', // pictSnareDrumSnaresOff
		tabla: '', // pictTabla
		tambourine: '', // pictTambourine
		'tenor drum': '', // pictTenorDrum
		timbales: '', // pictTimbales
		tomtom: '', // pictTomTom
	},
	effect: {
		anvil: '', // pictAnvil
		'auto horn': '', // pictCarHorn
		'bird whistle': '', // pictBirdWhistle
		cannon: '', // pictCannon
		'duck call': '', // pictDuckCall
		'gun shot': '', // pictPistolShot
		'klaxon horn': '', // pictKlaxonHorn
		'lions roar': '', // pictLionsRoar
		'lotus flute': '', // pictLotusFlute
		megaphone: '', // pictMegaphone
		'police whistle': '', // pictPoliceWhistle
		siren: '', // pictSiren
		'slide whistle': '', // pictSlideWhistle
		'thunder sheet': '', // pictThundersheet
		'wind machine': '', // pictWindMachine
		'wind whistle': '', // pictWindWhistle
	},
	'stick-location': {
		center: '', // pictCenter1
		rim: '', // pictRim1
		'cymbal bell': '', // pictBellOfCymbal
		'cymbal edge': '', // pictEdgeOfCymbal
	},
};

/* <timpani/> is empty: the one pictogram it can mean. */
export const TIMPANI_GLYPH = ''; // pictTimpani

/*
 * <beater> values -> their glyphs: one glyph for a beater with no tip, or [up, down] for one
 * SMuFL draws pointing either way (the beater's `tip` picks).
 */
export const BEATER_GLYPHS: Record<
	string,
	string | [up: string, down: string]
> = {
	bow: '', // pictBeaterBow
	'chime hammer': '', // pictBeaterHammer
	coin: '', // pictCoins
	'drum stick': '', // pictDrumStick
	finger: '', // pictBeaterFinger
	fingernail: '', // pictBeaterFingernails
	fist: '', // pictBeaterFist
	'guiro scraper': '', // pictBeaterGuiroScraper
	hammer: '', // pictBeaterHammer
	hand: '', // pictBeaterHand
	'jazz stick': ['', ''], // pictBeaterJazzSticksUp/Down
	'knitting needle': '', // pictBeaterKnittingNeedle
	'metal hammer': '', // pictBeaterMetalHammer
	'slide brush on gong': '', // pictSlideBrushOnGong
	'snare stick': ['', ''], // pictBeaterSnareSticksUp/Down
	'spoon mallet': '', // pictBeaterSpoonWoodenMallet
	superball: '', // pictSuperball
	'triangle beater': ['', ''], // pictBeaterTriangleUp/Down
	'triangle beater plain': '', // pictBeaterTrianglePlain
	'wire brush': ['', ''], // pictBeaterWireBrushesUp/Down
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
		soft: ['', ''], // pictBeaterSoftBassDrumUp/Down
		medium: ['', ''], // pictBeaterMediumBassDrumUp/Down
		hard: ['', ''], // pictBeaterHardBassDrumUp/Down
		x: ['', ''], // pictBeaterMetalBassDrumUp/Down
	},
	'double bass drum': {
		soft: ['', ''], // pictBeaterDoubleBassDrumUp/Down
		medium: ['', ''],
		hard: ['', ''],
	},
	glockenspiel: {
		soft: ['', '', '', ''], // pictBeaterSoftGlockenspiel*
		hard: ['', '', '', ''], // pictBeaterHardGlockenspiel*
	},
	gum: {
		soft: ['', '', '', ''], // pictGumSoft*
		medium: ['', '', '', ''], // pictGumMedium*
		hard: ['', '', '', ''], // pictGumHard*
	},
	hammer: {
		soft: ['', ''], // pictBeaterHammerPlasticUp/Down
		medium: ['', ''],
		hard: ['', ''],
		shaded: ['', ''], // pictBeaterHammerWoodUp/Down
		x: ['', ''], // pictBeaterHammerMetalUp/Down
	},
	superball: {
		soft: ['', '', '', ''], // pictBeaterSuperball*
		medium: ['', '', '', ''],
		hard: ['', '', '', ''],
	},
	timpani: {
		soft: ['', '', '', ''], // pictBeaterSoftTimpani*
		medium: ['', '', '', ''], // pictBeaterMediumTimpani*
		hard: ['', '', '', ''], // pictBeaterHardTimpani*
		shaded: ['', '', '', ''], // pictBeaterWoodTimpani*
	},
	wound: {
		soft: ['', '', '', ''], // pictWoundSoft*
		hard: ['', '', '', ''], // pictWoundHard*
	},
	xylophone: {
		soft: ['', '', '', ''], // pictBeaterSoftXylophone*
		medium: ['', '', '', ''], // pictBeaterMediumXylophone*
		hard: ['', '', '', ''], // pictBeaterHardXylophone*
		shaded: ['', '', '', ''], // pictBeaterWoodXylophone*
	},
	yarn: {
		soft: ['', '', '', ''], // pictBeaterSoftYarn*
		medium: ['', '', '', ''], // pictBeaterMediumYarn*
		hard: ['', '', '', ''], // pictBeaterHardYarn*
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
