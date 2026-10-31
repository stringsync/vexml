import { describe, expect, it } from 'bun:test';
import { NoopEditingView } from './noop-editing-view';

describe('NoopEditingView', () => {
	it('renders and disposes without effect', () => {
		const view = new NoopEditingView();
		expect(() => {
			view.render({
				selected: [],
				focus: null,
				caret: null,
				measures: [],
				barline: null,
				structuralFocus: null,
				position: null,
			});
			view.dispose();
		}).not.toThrow();
	});
});
