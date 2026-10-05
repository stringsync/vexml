import { disposables, type Resource } from "webappwiz/disposable";

export type Size = { width: number; height: number };

export function onWindowResize(target: Window, callback: (size: Size) => void): Resource {
	const listener = () => callback({ width: target.innerWidth, height: target.innerHeight });
	target.addEventListener("resize", listener);
	return disposables.callback(() => target.removeEventListener("resize", listener));
}
