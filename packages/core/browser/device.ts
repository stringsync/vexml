export type Os = "ios" | "android" | "macos" | "windows" | "linux" | "unknown";

export type BrowserName = "safari" | "chrome" | "firefox" | "edge" | "unknown";

export type DeviceType = "phone" | "tablet" | "desktop";

export interface DeviceOptions {
	/** `navigator.maxTouchPoints`. Left out, the device is taken to be untouched. */
	touchPoints?: number;
}

/**
 * What a user agent string says about the device it came from: the operating
 * system, the browser, whether it is a phone, a tablet or a desktop, and
 * whether there is a touch screen.
 *
 * It takes the string rather than reading `navigator`, so the same call works
 * on the server against a request header and a test can hand it whatever it
 * likes.
 *
 * ```ts
 * const device = Device.parse(navigator.userAgent, {
 *   touchPoints: navigator.maxTouchPoints,
 * });
 * if (device.isPhone()) { ... }
 * ```
 *
 * It answers those four questions and no others. Browser versions, device
 * models and bot detection need a maintained database of user agents, which
 * this is not.
 */
export class Device {
	private constructor(
		readonly os: Os,
		readonly browser: BrowserName,
		readonly type: DeviceType,
		readonly touch: boolean,
	) {}

	static parse(userAgent: string, opts: DeviceOptions = {}): Device {
		const touchPoints = opts.touchPoints ?? 0;
		const agent = withoutInAppNoise(userAgent);
		return new Device(
			parseOs(agent, touchPoints),
			parseBrowser(agent),
			parseType(agent, touchPoints),
			touchPoints > 0,
		);
	}

	isIos(): boolean {
		return this.os === "ios";
	}

	isAndroid(): boolean {
		return this.os === "android";
	}

	isPhone(): boolean {
		return this.type === "phone";
	}

	isTablet(): boolean {
		return this.type === "tablet";
	}

	/** A phone or a tablet, which is to say anything that is not a desktop. */
	isMobile(): boolean {
		return this.type !== "desktop";
	}

	isDesktop(): boolean {
		return this.type === "desktop";
	}

	isTouch(): boolean {
		return this.touch;
	}
}

/**
 * The Facebook and Twitter in-app browsers append their own strings, which
 * name a device other than the one holding the phone: Twitter says "Twitter for
 * iPhone" on an iPad. Everything from the marker on is theirs, so it goes.
 */
function withoutInAppNoise(userAgent: string): string {
	const [withoutFacebook = ""] = userAgent.split("[FBAN");
	const [agent = ""] = withoutFacebook.split("Twitter");
	return agent;
}

function parseOs(userAgent: string, touchPoints: number): Os {
	if (/iPhone|iPad|iPod/i.test(userAgent)) {
		return "ios";
	}
	// iPadOS 13 and later claim to be a Mac. The touch screen is what gives them
	// away, and a desktop Mac reports no touch points at all.
	if (/Macintosh/i.test(userAgent)) {
		return touchPoints > 1 ? "ios" : "macos";
	}
	if (/Android/i.test(userAgent)) {
		return "android";
	}
	if (/Windows/i.test(userAgent)) {
		return "windows";
	}
	if (/Linux|X11/i.test(userAgent)) {
		return "linux";
	}
	return "unknown";
}

// Order matters and is the reverse of how specific each name looks. Edge says
// both Chrome and Safari, Chrome says Safari, and only Safari says Safari
// alone, so the broadest claim is checked last.
function parseBrowser(userAgent: string): BrowserName {
	// Edg/ on desktop, EdgA/ on Android, EdgiOS/ on iOS, Edge/ on the old one.
	if (/Edg(e|A|iOS)?\//i.test(userAgent)) {
		return "edge";
	}
	if (/Chrome|Chromium|CriOS/i.test(userAgent)) {
		return "chrome";
	}
	if (/Firefox|FxiOS/i.test(userAgent)) {
		return "firefox";
	}
	if (/Safari/i.test(userAgent)) {
		return "safari";
	}
	return "unknown";
}

// Grouped by vendor rather than by phone-then-tablet, because the rules below
// overlap: an iPad running Chrome says both "iPad" and "Mobile", so the generic
// mobile browser rules at the bottom would call it a phone if they ran first.
function parseType(userAgent: string, touchPoints: number): DeviceType {
	if (/iPhone|iPod/i.test(userAgent)) {
		return "phone";
	}
	if (/iPad/i.test(userAgent)) {
		return "tablet";
	}
	// iPadOS 13 and later claim to be a Mac, and nothing else about the string
	// tells them apart from one.
	if (/Macintosh/i.test(userAgent)) {
		return touchPoints > 1 ? "tablet" : "desktop";
	}

	if (/Windows Phone/i.test(userAgent)) {
		return "phone";
	}
	if (/\bWindows(?:.+)ARM\b/i.test(userAgent)) {
		return "tablet";
	}

	// Android and Amazon's fork of it both say "Mobile" on a phone and leave it
	// off on a tablet. SD4930UR is the one Fire phone that ever shipped.
	if (
		/\bAndroid(?:.+)Mobile\b|SD4930UR|\bSilk(?:.+)Mobile\b/i.test(userAgent)
	) {
		return "phone";
	}
	if (/Android|Silk/i.test(userAgent)) {
		return "tablet";
	}

	// What is left is the browsers that only ever ran on a phone, and the ones
	// that say "Mobile" without saying which platform.
	if (
		/BlackBerry|BB10|Opera Mini/i.test(userAgent) ||
		/\b(?:CriOS|Chrome)(?:.+)Mobile/i.test(userAgent) ||
		/Mobile(?:.+)Firefox\b/i.test(userAgent)
	) {
		return "phone";
	}

	return "desktop";
}
