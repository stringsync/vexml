import { Playlist, type Track } from "./playlist";

export class Testing {
	readonly playlist = new Playlist("Road trip");

	withTracks(...tracks: Track[]): this {
		for (const track of tracks) this.playlist.append(track);
		return this;
	}

	shuffled(seed: number): this {
		this.playlist.shuffle(seed);
		return this;
	}
}
