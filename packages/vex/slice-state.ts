import { MElement, type Measure, MText } from '@stringsync/mdom';

const DIRECTION_SPANS = new Set([
	'wedge',
	'pedal',
	'octave-shift',
	'dashes',
	'bracket',
]);
const STYLE_SPANS = new Set(['slash', 'beat-repeat', 'measure-repeat']);

interface Span {
	mark: MElement;
	container: MElement;
}

/** Restore inherited notation at each contiguous run of selected measures. */
export function materializeSliceState(
	measures: readonly Measure[],
	selected: ReadonlySet<Measure>,
): void {
	// Scan source state before editing: synthesized marks must never feed it.
	const directions = new Map<string, Span>();
	const styles = new Map<string, Span>();
	const rests = new Map<string, { style: MElement; end: number }>();
	let previousStyles: Span[] = [];
	let divisions = 1;
	let runEnd = 0;
	for (const [index, measure] of measures.entries()) {
		const kept = selected.has(measure);
		const previous = measures[index - 1];
		const next = measures[index + 1];
		const opening = kept && (!previous || !selected.has(previous));
		const closing = kept && (!next || !selected.has(next));
		// Keep original child references before adding anything at either boundary.
		const source = elements(measure);
		if (opening) {
			runEnd = index + 1;
			for (const candidate of measures.slice(runEnd)) {
				if (!selected.has(candidate)) {
					break;
				}
				runEnd++;
			}
			measure.materializeSignatures();
			// mdom also hoists measure styles as signatures. Their spans need our
			// source-aware handling (especially counted rests), not a second copy.
			for (const element of elements(measure)) {
				if (element.tag === 'measure-style' && !source.includes(element)) {
					element.remove();
				}
			}
			const attributes = leadingAttributes(measure);
			const originalStyle = attributes.child('measure-style');
			for (const span of previousStyles) {
				attributes.insertBefore(styleBoundary(span, true), originalStyle);
			}
			for (const span of styles.values()) {
				attributes.insertBefore(styleBoundary(span, false), originalStyle);
			}
			for (const span of directions.values()) {
				insertDirection(measure, span, false, 0);
			}
			for (const [staff, rest] of rests) {
				if (rest.end > index) {
					const style = copy(rest.style);
					style.child('multiple-rest')?.setText(String(rest.end - index));
					attributes.insertBefore(style, originalStyle);
				} else {
					rests.delete(staff);
				}
			}
		}
		for (const element of source) {
			if (
				DIRECTION_SPANS.has(element.tag) &&
				element.parent?.tag === 'direction-type'
			) {
				const container = element.parent.parent;
				if (container?.tag === 'direction') {
					const key = `${element.tag}:${container.child('staff')?.text ?? '1'}:${element.getAttribute('number') ?? '1'}`;
					update(directions, key, { mark: element, container });
				}
			} else if (element.parent?.tag === 'measure-style') {
				for (const container of staffStyles(
					element.parent,
					measure.staveCount,
				)) {
					const staff = container.getAttribute('number') ?? '1';
					if (STYLE_SPANS.has(element.tag)) {
						update(styles, `${element.tag}:${staff}`, {
							mark: element,
							container,
						});
					} else if (element.tag === 'multiple-rest') {
						rests.set(staff, {
							style: copy(container),
							end: index + Number(element.text),
						});
					}
				}
			}
		}
		if (kept) {
			// Multiple rests count source columns, never the omitted columns in a gap.
			for (const element of elements(measure)) {
				if (element.tag === 'multiple-rest') {
					element.setText(
						String(Math.min(Number(element.text), runEnd - index)),
					);
				}
			}
		}
		const position = endPosition(measure, divisions);
		divisions = position.divisions;
		if (closing) {
			for (const span of directions.values()) {
				insertDirection(measure, span, true, position.offset);
			}
			// These styles are valid through the end of a part. Reset at the next
			// retained run instead: a measure-repeat stop here would hide this bar.
			previousStyles = [...styles.values()];
		}
	}
}

function staffStyles(style: MElement, count: number): MElement[] {
	if (style.getAttribute('number') || count === 1) {
		return [style];
	}
	// A numberless style applies to all staves; a later numbered stop can end
	// only one of them. Scope inherited copies so that override survives a cut.
	return Array.from({ length: count }, (_, index) => {
		const scoped = copy(style);
		scoped.setAttribute('number', String(index + 1));
		return scoped;
	});
}

function update(state: Map<string, Span>, key: string, span: Span): void {
	const type = span.mark.getAttribute('type');
	if (type === 'stop' || type === 'discontinue') {
		state.delete(key);
	} else if (type === 'resume' && span.mark.tag === 'pedal') {
		const mark = copy(span.mark);
		mark.setAttribute('type', 'start');
		state.set(key, { ...span, mark });
	} else if (!['continue', 'change'].includes(type ?? '')) {
		state.set(key, span);
	}
}

function insertDirection(
	measure: MElement,
	span: Span,
	stop: boolean,
	offset: number,
): void {
	const direction = new MElement('direction');
	for (const [name, value] of Object.entries(span.container.attributes)) {
		if (name !== 'id') {
			direction.setAttribute(name, value);
		}
	}
	const type = new MElement('direction-type');
	const mark = boundaryMark(span.mark);
	if (stop) {
		mark.setAttribute('type', 'stop');
		if (mark.tag === 'bracket') {
			mark.setAttribute('line-end', 'none');
		}
		if (mark.tag === 'wedge') {
			mark.removeAttribute('niente');
			if (span.mark.getAttribute('type') === 'diminuendo') {
				mark.setAttribute('spread', '0');
			} else {
				mark.removeAttribute('spread');
			}
		}
	}
	type.append(mark);
	direction.append(type);
	if (offset) {
		const element = new MElement('offset');
		element.setText(String(offset));
		direction.append(element);
	}
	for (const tag of ['voice', 'staff']) {
		const child = span.container.child(tag);
		if (child) {
			direction.append(copy(child));
		}
	}
	if (stop) {
		measure.insertBefore(direction, rightBarline(measure));
	} else {
		measure.insertBefore(direction, openingContent(measure));
	}
}

function styleBoundary(span: Span, stop: boolean): MElement {
	const style = boundaryMark(span.container);
	for (const child of style.children) {
		child.remove();
	}
	const mark = boundaryMark(span.mark);
	if (stop) {
		mark.setAttribute('type', 'stop');
	}
	style.append(mark);
	return style;
}

function leadingAttributes(measure: MElement): MElement {
	for (const child of measure.children) {
		if (!(child instanceof MElement)) {
			continue;
		}
		if (child.tag === 'attributes') {
			return child;
		}
		if (child.tag !== 'print') {
			break;
		}
	}
	const attributes = new MElement('attributes');
	measure.insertBefore(attributes, openingContent(measure));
	return attributes;
}

function openingContent(measure: MElement): MElement | null {
	return (
		measure.children.find(
			(child): child is MElement =>
				child instanceof MElement &&
				!['print', 'attributes'].includes(child.tag),
		) ?? null
	);
}

function rightBarline(measure: MElement): MElement | null {
	return (
		measure
			.childrenNamed('barline')
			.find((bar) => (bar.getAttribute('location') ?? 'right') === 'right') ??
		null
	);
}

/** End at the longest voice, even when the XML cursor finishes in a shorter one. */
function endPosition(measure: MElement, inheritedDivisions: number) {
	let divisions = inheritedDivisions;
	let cursor = 0;
	let end = 0;
	for (const child of measure.children) {
		if (!(child instanceof MElement)) {
			continue;
		}
		if (child.tag === 'attributes') {
			divisions = Number(child.child('divisions')?.text ?? divisions);
		}
		const duration = Number(child.child('duration')?.text ?? 0) / divisions;
		if (child.tag === 'backup') {
			cursor -= duration;
		} else if (
			child.tag === 'forward' ||
			(child.tag === 'note' && !child.child('chord'))
		) {
			cursor += duration;
		}
		end = Math.max(end, cursor);
	}
	return { divisions, offset: (end - cursor) * divisions };
}

function elements(root: MElement): MElement[] {
	return root.children.flatMap((child) =>
		child instanceof MElement ? [child, ...elements(child)] : [],
	);
}

function copy(element: MElement): MElement {
	const result = new MElement(element.tag);
	for (const [name, value] of Object.entries(element.attributes)) {
		result.setAttribute(name, value);
	}
	for (const child of element.children) {
		if (child instanceof MElement) {
			result.append(copy(child));
		} else if (child instanceof MText) {
			result.append(new MText(child.value));
		}
	}
	return result;
}

function boundaryMark(element: MElement): MElement {
	const result = copy(element);
	// IDs must stay unique; source x coordinates belong to the original endpoint.
	for (const attr of ['id', 'default-x', 'relative-x']) {
		result.removeAttribute(attr);
	}
	return result;
}
