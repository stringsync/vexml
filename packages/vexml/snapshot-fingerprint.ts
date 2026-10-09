import type { PaintStream } from './paint-encoder';
import type { ScoreSnapshot } from './score-snapshot';

/*
 * A hash of what a snapshot's engraving paints: its op stream, the tables the ops name and its
 * text outlines. Equal snapshots hash equal, and two that paint differently almost surely don't,
 * which is how a render knows the tiles a `paint` left show its own engraving. Fast enough to
 * run on every snapshot shown.
 */
export class SnapshotFingerprint {
	private readonly bits = new Float64Array(1);
	private readonly words = new Uint32Array(this.bits.buffer);
	private a = 0x811c9dc5;
	private b = 0x01000193;

	static of(snapshot: ScoreSnapshot): string {
		const hash = new SnapshotFingerprint();
		hash.text(JSON.stringify([snapshot.paint, snapshot.outlines]));
		hash.stream(snapshot.engraving?.ops ?? []);
		return hash.digest();
	}

	private stream(items: PaintStream): void {
		this.mix(items.length);
		for (const item of items) {
			this.item(item);
		}
	}

	private item(item: PaintStream[number]): void {
		if (typeof item === 'number') {
			this.bits[0] = item;
			this.mix(this.words[0] ?? 0);
			this.mix(this.words[1] ?? 0);
		} else if (typeof item === 'string') {
			this.text(item);
		} else if (Array.isArray(item)) {
			this.stream(item);
		} else if (item === null) {
			this.mix(1);
		} else {
			this.mix(item ? 2 : 3);
		}
	}

	private text(text: string): void {
		this.mix(text.length);
		for (let i = 0; i < text.length; i++) {
			this.mix(text.charCodeAt(i));
		}
	}

	// Two 32-bit lanes, FNV-1a and a murmur-style multiply, for a 64-bit hash.
	private mix(word: number): void {
		this.a = Math.imul(this.a ^ word, 0x01000193);
		this.b = Math.imul(this.b ^ word, 0x5bd1e995) ^ (this.b >>> 15);
	}

	private digest(): string {
		return `${(this.a >>> 0).toString(36)}.${(this.b >>> 0).toString(36)}`;
	}
}
