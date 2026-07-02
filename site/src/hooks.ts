import {
	type Dispatch,
	type SetStateAction,
	useEffect,
	useRef,
	useState,
} from 'react';
import { INSTRUMENT_KEY } from './constants';
import { type Instrument, PianoInstrument } from './instrument';

// useState mirrored to localStorage under `key`: seeds from the stored value on mount (falling back
// to `initial`), and writes it back (JSON-encoded) on every change. Same API as useState.
export function useLocalStorage<T>(
	key: string,
	initial: T,
): [T, Dispatch<SetStateAction<T>>] {
	const [value, setValue] = useState<T>(() => {
		const raw = localStorage.getItem(key);
		if (raw === null) {
			return initial;
		}
		try {
			return JSON.parse(raw) as T;
		} catch {
			return initial;
		}
	});
	useEffect(() => {
		localStorage.setItem(key, JSON.stringify(value));
	}, [key, value]);
	return [value, setValue];
}

// The synth voice for playback and note previews. Owns the live `Instrument` (in a ref the render
// effect reads directly), its persisted name, and the mute toggle. Rebuilding on a name change
// re-downloads samples, so muting is kept separate.
export function useInstrument() {
	const ref = useRef<Instrument | null>(null);
	const [name, setName] = useLocalStorage(INSTRUMENT_KEY, 'marimba');
	if (!ref.current) {
		ref.current = new PianoInstrument(name);
	}
	const [muted, setMuted] = useState(false);
	// Read by the rebuild effect so it can seed a freshly-built synth without depending on `muted`
	// (which would rebuild — and re-download samples — on every mute toggle).
	const mutedRef = useRef(muted);
	mutedRef.current = muted;
	useEffect(() => {
		ref.current?.setMuted(muted);
	}, [muted]);
	// Rebuild the synth when the picker changes, then warm its samples. Runs on mount too (stored
	// instrument), so the first play doesn't drop onsets while loading.
	useEffect(() => {
		ref.current?.stopAll();
		ref.current = new PianoInstrument(name);
		ref.current.setMuted(mutedRef.current);
		ref.current.preload();
	}, [name]);
	return { ref, name, setName, muted, setMuted };
}
