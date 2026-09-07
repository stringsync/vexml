import type { EditingSession } from '@stringsync/vexml';

/** Labels and string values for the playground's voice dropdown. */
export class EditingVoices {
	constructor(readonly editor: EditingSession) {}
	get options() {
		const parts = this.editor.document.score.parts;
		return this.editor.getVoices().map(({ part, voice }) => ({
			part,
			voice,
			value: JSON.stringify([parts.indexOf(part), voice]),
			label:
				parts.length > 1
					? `Voice ${voice} · ${part.label ?? part.id} (${part.id})`
					: `Voice ${voice}`,
		}));
	}
	getValue(): string {
		const active = this.editor.getActiveVoice();
		return (
			this.options.find(
				(option) =>
					option.part === active?.part && option.voice === active.voice,
			)?.value ?? ''
		);
	}
}
