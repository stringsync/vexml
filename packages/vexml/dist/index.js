import {
  isHighlightable2,
  isPlayable2,
  Element2,
  Barline2,
  ChordDiagram2,
  Dispatcher,
  Stave2,
  Measure2,
  DynamicGlyphs,
  GapInserter,
  ScoreReader,
  MeasureBox2,
  Note2,
  Part2,
  DefaultScoreParser,
  Gaps,
  Sequence2,
  Timeline2,
  SequenceFactory,
  DEFAULT_FONT_CONFIG,
  resolveConfig,
  FontFamilies,
  System2,
  TabPosition2,
  Voice2,
  ElementFactory,
  PaintContext,
  PaintList,
  snapshotConfig,
  ScoreEngraver,
  CanvasPaintProbe
} from "./index-8zre4znc.js";
import {
  disposables,
  Disposer,
  SnapshotFingerprint,
  SnapshotMismatchError2,
  ScoreBox,
  TiledSurface
} from "./index-kdpqmhaq.js";
import {
  Rect2,
  MAX_CANVAS_AREA,
  TILE_BUDGET,
  TILE_SIZE,
  FOLD_SHADOW_WIDTH,
  SCROLL_DURATION_MS,
  MAX_SCROLL_SPEED_PX_PER_MS,
  SCROLL_FRAME_MS,
  SCROLL_TOP_PADDING_PX,
  SCROLL_SIDE_PADDING_PX,
  RESIZE_SETTLE_MS,
  HALO_MARGIN,
  CURSOR_COLOR,
  CURSOR_WIDTH_PX,
  LOUPE_OPTIONS,
  LOUPE_ENTER_MS,
  LOUPE_EXIT_MS,
  LOUPE_MIN_SCALE,
  UNICODE_RANGE,
  Ink,
  Affine,
  SNAPSHOT_VERSION2,
  SNAPSHOT_FORMAT,
  PaintDecoder,
  PaintReplayer
} from "./index-6pn8cpem.js";
// bravura-url.ts
var BRAVURA_URL = new URL("./assets/fonts/Bravura.woff2", import.meta.url).href;
var BRAVURA_COMMON_URL = new URL("./assets/fonts/BravuraCommon.woff2", import.meta.url).href;
var BRAVURA_COMMON_RANGE = "U+0000-00FF, U+E000-E00F, U+E040-E06F, U+E080-E08F, U+E0A0-E0DF, U+E1E7, U+E240-E26F, U+E4A0-E4FF, U+E510-E54F, U+E870-E88F, U+ECA0-ECBF";
var BRAVURA_REST_RANGE = "U+0100-DFFF, U+E010-E03F, U+E070-E07F, U+E090-E09F, U+E0E0-E1E6, U+E1E8-E23F, U+E270-E49F, U+E500-E50F, U+E550-E86F, U+E890-EC9F, U+ECC0-10FFFF";
// chord-note-order.ts
class ChordNoteOrder {
  of(focus) {
    const chord = focus.measure.chords.find((chord) => chord.notes.includes(focus));
    return [...chord?.notes ?? []].sort((a, b) => Number(a.staff) - Number(b.staff) || this.position(b) - this.position(a));
  }
  position(note) {
    const position = note.pitch ?? note.unpitched ?? note.restPosition;
    if (!position) {
      return -1;
    }
    return position.octave * 7 + "CDEFGAB".indexOf(position.step);
  }
}
// cursor-position.ts
class CursorPosition {
  rect;
  host;
  constructor(rect, host) {
    this.rect = rect;
    this.host = host;
  }
  getBoundingClientRect() {
    return this.host.clientRectOf(this.rect);
  }
}

// cursor-controller.ts
var EMPTY_RECT = new Rect2(0, 0, 0, 0);

class CursorController {
  sequence;
  host;
  scroller;
  drawing;
  dispatcher = new Dispatcher;
  events = this.dispatcher.events;
  subscriptions = new Disposer;
  views = new Set;
  index = 0;
  ms = 0;
  disposed = false;
  lastVisible;
  constructor(sequence, host, scroller, drawing) {
    this.sequence = sequence;
    this.host = host;
    this.scroller = scroller;
    this.drawing = drawing;
    this.lastVisible = this.isFullyVisible();
    this.subscriptions.defer(this.host.events.on("viewportchange", () => this.checkVisibility()));
    this.subscriptions.use(this.host);
  }
  next() {
    if (this.disposed || this.index >= this.sequence.length - 1) {
      return;
    }
    const from = this.index;
    this.index++;
    this.ms = this.sequence.getStep(this.index)?.startMs ?? this.ms;
    this.emit(from);
  }
  previous() {
    if (this.disposed || this.index <= 0) {
      return;
    }
    const from = this.index;
    this.index--;
    this.ms = this.sequence.getStep(this.index)?.startMs ?? this.ms;
    this.emit(from);
  }
  seekMs(timeMs) {
    if (this.disposed) {
      return;
    }
    const clamped = Math.min(Math.max(0, timeMs), this.sequence.getDurationMs());
    const from = this.index;
    this.ms = clamped;
    this.index = this.sequence.getStepIndexAtMs(clamped) ?? 0;
    this.emit(from);
  }
  seekBeats(beats) {
    this.seekMs(this.sequence.beatsToMs(beats));
  }
  getTimeMs() {
    return this.ms;
  }
  getTimeBeats() {
    return this.sequence.msToBeats(this.ms);
  }
  getIndex() {
    return this.index;
  }
  getActiveElements() {
    return this.sequence.getStep(this.index)?.active ?? [];
  }
  getHighlightedElements() {
    return this.isDone() ? [] : this.sequence.getHighlighted(this.index);
  }
  isDone() {
    return this.ms >= this.sequence.getDurationMs();
  }
  isFullyVisible() {
    this.drawThrough();
    const rect = this.sequence.positionAt(this.ms);
    if (!rect) {
      return true;
    }
    const bar = this.host.clientRectOf(rect);
    const vp = this.host.viewportRect();
    return bar.left >= vp.left && bar.right <= vp.right && bar.top >= vp.top && bar.bottom <= vp.bottom;
  }
  sync(view) {
    const unlisten = this.dispatcher.events.on("change", (e) => view.render(e));
    this.views.add(view);
    const detach = disposables.callback(() => {
      unlisten();
      this.views.delete(view);
    });
    this.subscriptions.use(detach);
    view.render(this.snapshot(null));
    return detach;
  }
  follow(scroller, opts) {
    const target = scroller ?? this.scroller;
    const listener = () => {
      if (!this.isFullyVisible()) {
        target.scrollIntoView(this.barRect(), opts);
      }
    };
    const unfollow = disposables.callback(this.dispatcher.events.on("change", listener));
    this.subscriptions.use(unfollow);
    listener();
    return unfollow;
  }
  scrollIntoView(opts) {
    this.scroller.scrollIntoView(this.barRect(), opts);
  }
  cancelScroll() {
    this.scroller.cancel();
  }
  dispose() {
    if (this.disposed) {
      return;
    }
    this.disposed = true;
    const toDispose = [...this.views];
    this.subscriptions.dispose();
    for (const view of toDispose) {
      view.dispose();
    }
    this.views.clear();
    this.dispatcher.dispatch("dispose");
    this.dispatcher.dispose();
  }
  barRect() {
    this.drawThrough();
    return this.sequence.positionAt(this.ms) ?? EMPTY_RECT;
  }
  drawThrough() {
    const step = this.sequence.getStep(this.index);
    if (step) {
      this.drawing.drawThroughMeasure(step.measureIndex);
    }
  }
  snapshot(from) {
    const { started, sustained, stopped } = this.sequence.classify(from, this.index);
    return {
      timeMs: this.ms,
      timeBeats: this.sequence.msToBeats(this.ms),
      index: this.index,
      position: new CursorPosition(this.barRect(), this.host),
      active: this.getActiveElements(),
      highlighted: this.getHighlightedElements(),
      started,
      sustained,
      stopped,
      done: this.isDone()
    };
  }
  emit(from) {
    this.dispatcher.dispatch("change", this.snapshot(from));
    this.checkVisibility();
  }
  checkVisibility() {
    if (this.disposed) {
      return;
    }
    const fullyVisible = this.isFullyVisible();
    if (fullyVisible !== this.lastVisible) {
      this.lastVisible = fullyVisible;
      this.dispatcher.dispatch("visibility", { fullyVisible });
    }
  }
}
// default-editing-bindings.ts
class DefaultEditingBindings {
  resolve(key) {
    if (!key.altKey && (key.ctrlKey || key.metaKey) && key.key.toLowerCase() === "z") {
      return { type: key.shiftKey ? "redo" : "undo" };
    }
    if (key.altKey || key.ctrlKey || key.metaKey) {
      return null;
    }
    if (key.key === "Escape") {
      return { type: "clear" };
    }
    switch (key.key) {
      case "ArrowLeft":
        return {
          type: "move",
          extend: key.shiftKey,
          move: { unit: "note", direction: -1 }
        };
      case "ArrowRight":
        return {
          type: "move",
          extend: key.shiftKey,
          move: { unit: "note", direction: 1 }
        };
      case "ArrowUp":
        return {
          type: "move",
          extend: key.shiftKey,
          move: { unit: "vertical", direction: -1 }
        };
      case "ArrowDown":
        return {
          type: "move",
          extend: key.shiftKey,
          move: { unit: "vertical", direction: 1 }
        };
      default:
        return null;
    }
  }
}
// editing-controller.ts
import { Note as MNote } from "@stringsync/mdom";

// editing-caret.ts
function editingCaretRect(index, target) {
  const measure = index.parts().find((part) => part.getSources().includes(target.part))?.getMeasures().find((candidate) => candidate.getSources().includes(target.measure));
  const stave = measure?.getStaves().find((candidate) => candidate.getNumber() === target.staff);
  if (!stave) {
    return null;
  }
  const notes = target.measure.notes.flatMap((note) => {
    const onset = note.measureBeat;
    const element = index.noteLookup.get(note);
    return onset === null || !element ? [] : [{ onset, x: element.rect.x }];
  });
  const xByOnset = new Map;
  for (const note of notes) {
    xByOnset.set(note.onset, Math.min(xByOnset.get(note.onset) ?? Infinity, note.x));
  }
  const points = [...xByOnset].map(([onset, x]) => ({ onset, x })).sort((a, b) => a.onset - b.onset);
  const exact = points.find((point) => point.onset === target.onset);
  const previous = points.findLast((point) => point.onset < target.onset);
  const next = points.find((point) => point.onset > target.onset);
  const start = { onset: 0, x: stave.getNoteStartX() };
  const end = { onset: target.measure.endBeat, x: stave.getRect().right };
  const left = previous ?? start;
  const right = next ?? end;
  let x = exact?.x ?? start.x;
  if (!exact && right.onset > left.onset) {
    const ratio = (target.onset - left.onset) / (right.onset - left.onset);
    x = left.x + Math.max(0, Math.min(1, ratio)) * (right.x - left.x);
  } else if (!exact && target.onset > left.onset) {
    x = end.x;
  }
  const rect = stave.getRect();
  return new Rect2(x, rect.y, 0, rect.h);
}

// editing-controller.ts
class EditingController {
  editor;
  deps;
  opts;
  dispatcher = new Dispatcher;
  events = this.dispatcher.events;
  disposer = new Disposer;
  bindings;
  disposed = false;
  enabled;
  presentation;
  drag = null;
  suppressedClick = null;
  constructor(editor, deps, opts = {}) {
    this.editor = editor;
    this.deps = deps;
    this.opts = opts;
    this.enabled = opts.enabled ?? true;
    this.bindings = opts.bindings ?? new DefaultEditingBindings;
    this.presentation = this.resolve();
    this.disposer.use(deps.view);
    this.disposer.defer(editor.events.on("selectionchange", () => this.refresh()));
    this.disposer.defer(editor.events.on("caretchange", () => this.refresh()));
    this.disposer.defer(editor.events.on("documentchange", () => this.refresh()));
    if (opts.pointer !== false) {
      this.disposer.defer(deps.events.on("pointerdown", (event) => this.pointerDown(event)));
      this.disposer.defer(deps.events.on("pointermove", (event) => this.pointerMove(event)));
      this.disposer.defer(deps.events.on("pointerup", (event) => this.pointerUp(event)));
      const captureEnd = (event) => {
        const pointer = event;
        if (pointer.pointerId !== this.drag?.pointerId) {
          return;
        }
        if (event.type === "lostpointercapture" && (pointer.buttons & 1) === 0) {
          this.commitDrag();
        } else {
          this.endDrag();
        }
      };
      for (const type of ["pointercancel", "lostpointercapture"]) {
        deps.dom.addEventListener(type, captureEnd);
        this.disposer.defer(() => deps.dom.removeEventListener(type, captureEnd));
      }
      this.disposer.defer(deps.events.on("click", (event) => this.click(event)));
    }
    if (opts.keyboard !== false) {
      const keydown = (event) => {
        if (event.target !== deps.dom) {
          return;
        }
        const key = event;
        if (key.defaultPrevented || key.isComposing) {
          return;
        }
        if (this.handleKey(key)) {
          key.preventDefault();
        }
      };
      deps.dom.addEventListener("keydown", keydown);
      this.disposer.defer(() => deps.dom.removeEventListener("keydown", keydown));
      if (typeof HTMLElement !== "undefined" && deps.dom instanceof HTMLElement && !deps.dom.hasAttribute("tabindex")) {
        const element = deps.dom;
        element.tabIndex = 0;
        this.disposer.defer(() => {
          if (element.getAttribute("tabindex") === "0") {
            element.removeAttribute("tabindex");
          }
        });
      }
    }
    this.renderView();
  }
  setEnabled(enabled) {
    if (this.disposed || this.enabled === enabled) {
      return;
    }
    this.endDrag();
    this.enabled = enabled;
    this.renderView();
  }
  renderView() {
    this.deps.view.render(this.enabled ? this.presentation : {
      selected: [],
      focus: null,
      caret: null,
      measures: [],
      barline: null,
      structuralFocus: null,
      position: null
    });
  }
  get navigator() {
    return this.deps.navigator;
  }
  getPresentation() {
    return this.presentation;
  }
  handleKey(key) {
    if (this.disposed || !this.enabled) {
      return false;
    }
    if (key.key === "Escape" && this.drag) {
      this.endDrag();
      return true;
    }
    const command = this.bindings.resolve(key);
    if (!command) {
      return false;
    }
    this.execute(command);
    return true;
  }
  execute(command) {
    if (this.disposed || !this.enabled) {
      return false;
    }
    let moved = false;
    switch (command.type) {
      case "undo":
        moved = this.editor.undo();
        break;
      case "redo":
        moved = this.editor.redo();
        break;
      case "move":
        moved = this.navigator.move(command.move, { extend: command.extend });
        break;
      case "select":
        if (command.chordEdge) {
          moved = this.navigator.selectChordEdge(command.note, command.chordEdge);
        } else {
          this.editor.select(command.note);
          moved = true;
        }
        break;
      case "clear":
        if (this.opts.allowDeselect === false) {
          const focus = this.editor.getFocus();
          const measure = this.editor.getStructuralFocus();
          if (focus && this.editor.getSelection().length > 1) {
            this.editor.select(focus);
            moved = true;
          } else if (measure && !this.isBarline(measure) && this.editor.getSelectedMeasures().length > 1) {
            this.editor.selectMeasure(measure);
            moved = true;
          }
          break;
        }
        moved = this.editor.getSelection().length > 0 || this.editor.getCaret() !== null || this.editor.getStructuralFocus() !== null;
        this.editor.clearSelection();
        break;
    }
    this.dispatcher.dispatch("command", { command, moved });
    return moved;
  }
  selectVoice(voice) {
    return !this.disposed && this.enabled && this.navigator.selectVoice(voice);
  }
  scrollIntoView(opts) {
    if (!this.disposed && this.presentation.position) {
      this.deps.scroller.scrollIntoView(this.presentation.position, opts);
    }
  }
  dispose() {
    if (this.disposed) {
      return;
    }
    this.endDrag();
    this.disposed = true;
    this.disposer.dispose();
    this.dispatcher.dispatch("dispose");
    this.dispatcher.dispose();
  }
  pointerDown(event) {
    const key = event.native;
    if (!this.enabled || key.defaultPrevented || key.button !== 0 || key.isPrimary === false || key.pointerType === "touch" || this.drag) {
      return;
    }
    this.suppressedClick = null;
    this.drag = {
      pointerId: key.pointerId,
      start: event.point,
      client: { x: key.clientX, y: key.clientY },
      initial: this.editor.getSelection(),
      additive: key.ctrlKey || key.metaKey,
      rect: null,
      notes: []
    };
    const dom = this.domElement();
    dom?.focus({ preventScroll: true });
    dom?.setPointerCapture(key.pointerId);
    key.preventDefault();
  }
  pointerMove(event) {
    const drag = this.drag;
    if (!drag || event.native.pointerId !== drag.pointerId) {
      return;
    }
    if (!drag.rect && Math.hypot(event.native.clientX - drag.client.x, event.native.clientY - drag.client.y) < 4) {
      return;
    }
    drag.rect = new Rect2(Math.min(drag.start.x, event.point.x), Math.min(drag.start.y, event.point.y), Math.abs(event.point.x - drag.start.x), Math.abs(event.point.y - drag.start.y));
    const hits = new Set(this.deps.elements.within(drag.rect).flatMap((element) => element.getSources().filter((source) => source instanceof MNote)));
    const notes = this.editor.document.score.parts.flatMap((part) => part.measures.flatMap((measure) => measure.notes.filter((note) => hits.has(note))));
    drag.notes = [
      ...new Set([...drag.additive ? drag.initial : [], ...notes])
    ];
    if (!drag.notes.length && this.opts.allowDeselect === false) {
      drag.notes = drag.initial;
    }
    this.suppressedClick = drag.pointerId;
    this.refresh();
  }
  pointerUp(event) {
    const drag = this.drag;
    if (!drag || event.native.pointerId !== drag.pointerId) {
      return;
    }
    this.pointerMove(event);
    this.commitDrag();
  }
  commitDrag() {
    const drag = this.drag;
    if (drag?.rect) {
      this.editor.selectNotes(drag.notes);
    }
    this.endDrag();
  }
  endDrag() {
    const drag = this.drag;
    if (!drag) {
      return;
    }
    this.drag = null;
    const dom = this.domElement();
    if (dom?.hasPointerCapture(drag.pointerId)) {
      dom.releasePointerCapture(drag.pointerId);
    }
    this.presentation = this.resolve();
    this.renderView();
    this.dispatcher.dispatch("change", this.presentation);
  }
  domElement() {
    return typeof HTMLElement !== "undefined" && this.deps.dom instanceof HTMLElement ? this.deps.dom : null;
  }
  click(event) {
    if (event.native.pointerId === this.suppressedClick) {
      this.suppressedClick = null;
      return;
    }
    if (!this.enabled || event.native.defaultPrevented) {
      return;
    }
    const note = event.target?.getSources().find((source) => source instanceof MNote);
    const structural = note ? null : this.structuralTarget(event.target);
    const key = event.native;
    const selection = this.editor.getSelection();
    if (structural) {
      if (!key.ctrlKey && !key.metaKey) {
        this.clickStructural(structural, key.shiftKey);
      }
    } else if (this.opts.allowDeselect === false && selection.length > 1 && (!note || !selection.includes(note)) && !key.shiftKey && !key.ctrlKey && !key.metaKey) {
      this.execute({ type: "clear" });
    } else if (!note) {
      if (!key.ctrlKey && !key.metaKey) {
        this.execute({ type: "clear" });
      }
    } else if (key.shiftKey) {
      if (this.editor.canExtendTo(note)) {
        this.editor.select(note, { extend: true });
      }
    } else if (key.ctrlKey || key.metaKey) {
      if (this.opts.allowDeselect !== false || this.editor.getSelection().length !== 1 || this.editor.getFocus() !== note) {
        this.editor.toggle(note);
      }
    } else if (this.opts.allowDeselect !== false && this.opts.toggleOnClick && this.editor.getFocus() === note && this.editor.getSelection().length === 1) {
      this.editor.clearSelection();
    } else {
      this.editor.select(note);
    }
    if (typeof HTMLElement !== "undefined" && this.deps.dom instanceof HTMLElement) {
      this.deps.dom.focus({ preventScroll: true });
    }
  }
  structuralTarget(target) {
    if (target instanceof Measure2) {
      return target.getSources()[0] ?? null;
    }
    if (target instanceof Barline2) {
      const measure = target.getMeasure().getSources()[0];
      return measure ? {
        measure,
        location: target.getLocation(),
        barline: target.getSources()[0] ?? null
      } : null;
    }
    return null;
  }
  clickStructural(target, extend) {
    const focus = this.editor.getStructuralFocus();
    if (this.opts.allowDeselect !== false && this.opts.toggleOnClick && !extend && focus && this.sameTarget(focus, target) && this.editor.getSelectedMeasures().length <= 1) {
      this.editor.clearSelection();
      return;
    }
    if (this.isBarline(target)) {
      this.editor.selectBarline(target);
      return;
    }
    const anchor = this.editor.getStructuralAnchor();
    const note = this.editor.getFocus();
    if (extend && anchor && !this.isBarline(anchor)) {
      this.editor.selectMeasure(target, {
        extend: anchor.part === target.part
      });
    } else if (extend && note && note.part === target.part) {
      this.editor.selectMeasure(note.measure);
      this.editor.selectMeasure(target, { extend: true });
    } else {
      this.editor.selectMeasure(target);
    }
  }
  sameTarget(a, b) {
    if (this.isBarline(a) && this.isBarline(b)) {
      return a.measure === b.measure && a.location === b.location && a.barline === b.barline;
    }
    return a === b;
  }
  isBarline(target) {
    return "barline" in target;
  }
  refresh() {
    const previous = this.presentation.position;
    this.presentation = this.resolve();
    this.renderView();
    const position = this.presentation.position;
    if (this.enabled && !this.drag && this.opts.follow !== false && position !== previous && (!position || !previous || !position.isEqual(previous))) {
      this.scrollIntoView({ behavior: "smooth" });
    }
    this.dispatcher.dispatch("change", this.presentation);
  }
  resolve() {
    const source = this.editor.getFocus();
    const focus = source ? this.deps.elements.noteLookup.get(source) ?? null : null;
    const fallback = source ? this.deps.elements.measureBoxes().find((box) => box.getSources().includes(source.measure)) : null;
    const target = this.drag?.rect ? null : this.editor.getCaret();
    const caret = target ? editingCaretRect(this.deps.elements, target) : null;
    const structural = this.drag?.rect ? null : this.resolveStructural();
    return {
      selected: this.drag?.rect ? this.drag.notes.flatMap((note) => {
        const element = this.deps.elements.noteLookup.get(note);
        return element ? [element] : [];
      }) : this.editor.getSelectedElements(this.deps.elements),
      ...this.drag?.rect ? { marquee: this.drag.rect } : {},
      focus,
      caret,
      measures: structural?.measures ?? [],
      barline: structural?.barline ?? null,
      structuralFocus: structural?.focus ?? null,
      position: caret ?? focus?.rect ?? fallback?.rect ?? structural?.focus?.rect ?? structural?.measure?.rect ?? null
    };
  }
  resolveStructural() {
    const target = this.editor.getStructuralFocus();
    if (!target) {
      return null;
    }
    const measureOf = new Map;
    for (const measure of this.deps.elements.measures()) {
      for (const source of measure.getSources()) {
        measureOf.set(source, measure);
      }
    }
    const measures = this.editor.getSelectedMeasures().flatMap((source) => measureOf.get(source) ?? []);
    const selected = this.editor.getSelectedBarline();
    const barline = selected ? this.deps.elements.barlines().find((element) => element.getLocation() === selected.location && element.getMeasure() === measureOf.get(selected.measure) && (element.getSources()[0] ?? null) === selected.barline) ?? null : null;
    const measure = measureOf.get(this.isBarline(target) ? target.measure : target) ?? null;
    return {
      measures,
      barline,
      focus: this.isBarline(target) ? barline : measure,
      measure
    };
  }
}
// editing-navigator.ts
class EditingNavigator {
  editor;
  layout;
  chordOrder = new ChordNoteOrder;
  constructor(editor, layout) {
    this.editor = editor;
    this.layout = layout;
  }
  move(move, opts = {}) {
    const structural = this.editor.getStructuralFocus();
    if (structural) {
      return this.moveStructural(structural, move, opts);
    }
    const focus = this.editor.getFocus();
    let target;
    switch (move.unit) {
      case "note":
        target = this.nextNote(move.direction);
        break;
      case "measure":
        target = focus ? this.nextMeasure(focus, move.direction) : this.nextNote(move.direction);
        break;
      case "voice":
        target = focus ? this.nextVoice(focus, move.direction) : undefined;
        break;
      case "vertical":
        target = this.nextVertical(focus, move.direction);
        break;
      case "chordPitch":
        target = focus ? this.nextPitch(focus, move.direction) : undefined;
        break;
    }
    if (!target || target === focus || opts.extend && !this.editor.canExtendTo(target)) {
      return false;
    }
    this.editor.select(target, opts);
    return true;
  }
  selectChordEdge(note, edge) {
    const notes = this.chordOrder.of(note);
    const target = edge === "top" ? notes[0] : notes.at(-1);
    if (!target) {
      return false;
    }
    this.editor.select(target);
    return true;
  }
  selectVoice(voice) {
    const available = this.editor.getVoices().find((candidate) => candidate.part === voice.part && candidate.voice === voice.voice);
    if (!available) {
      return false;
    }
    const notes = this.notes(available);
    const target = this.closest(notes, this.editor.getFocus());
    if (!target) {
      return false;
    }
    this.editor.select(target);
    return true;
  }
  moveStructural(focus, move, opts) {
    const vertical = move.unit === "vertical" || move.unit === "voice";
    if (move.unit === "chordPitch" || vertical && opts.extend) {
      return false;
    }
    const measure = this.isBarline(focus) ? focus.measure : focus;
    if (vertical) {
      const parts = this.editor.document.score.parts;
      const part = parts[parts.indexOf(measure.part) + move.direction];
      const target = part?.measures[measure.index];
      if (!target) {
        return false;
      }
      if (this.isBarline(focus)) {
        this.editor.selectBarline({
          measure: target,
          location: focus.location,
          barline: null
        });
      } else {
        this.editor.selectMeasure(target);
      }
      return true;
    }
    if (this.isBarline(focus)) {
      const barlines = this.barlines(measure);
      const at = barlines.findIndex((barline) => barline.measure === focus.measure && barline.location === focus.location && barline.barline === focus.barline);
      const target = barlines[at + move.direction];
      if (at < 0 || !target) {
        return false;
      }
      this.editor.selectBarline(target);
      return true;
    }
    const target = measure.part.measures[measure.index + move.direction];
    if (!target) {
      return false;
    }
    this.editor.selectMeasure(target, opts);
    return true;
  }
  barlines(measure) {
    return measure.part.measures.flatMap((candidate) => {
      const explicit = (location) => candidate.barlines.filter((barline) => barline.location === location);
      return [
        ...explicit("left").map((barline) => ({
          measure: candidate,
          location: "left",
          barline
        })),
        ...explicit("middle").sort((a, b) => (a.measureBeat ?? 0) - (b.measureBeat ?? 0)).map((barline) => ({
          measure: candidate,
          location: "middle",
          barline
        })),
        {
          measure: candidate,
          location: "right",
          barline: explicit("right")[0] ?? null
        }
      ];
    });
  }
  isBarline(target) {
    return "barline" in target;
  }
  notes(voice, measures = voice.part.measures) {
    return measures.flatMap((measure) => measure.chords.filter((chord) => chord.lead.part === voice.part && chord.lead.voice === voice.voice).map((chord) => chord.lead));
  }
  nextNote(direction) {
    const focus = this.editor.getFocus();
    const voice = focus ? { part: focus.part, voice: focus.voice } : this.editor.getActiveVoice();
    if (!voice) {
      return;
    }
    const chords = voice.part.measures.flatMap((measure) => measure.chords.filter((chord) => chord.lead.voice === voice.voice));
    if (!focus) {
      return (direction === 1 ? chords[0] : chords.at(-1))?.lead;
    }
    const at = chords.findIndex((chord) => chord.notes.includes(focus));
    return chords[at + direction]?.lead;
  }
  nextMeasure(focus, direction) {
    const measures = focus.part.measures;
    for (let index = focus.measure.index + direction;index >= 0 && index < measures.length; index += direction) {
      const target = measures[index]?.chords.find((chord) => chord.lead.voice === focus.voice)?.lead;
      if (target) {
        return target;
      }
    }
    return;
  }
  nextVoice(focus, direction) {
    const systems = this.layout?.getSystems();
    if (!systems) {
      const voices = this.editor.getVoices();
      const at = voices.findIndex((voice) => voice.part === focus.part && voice.voice === focus.voice);
      const voice = voices[at + direction];
      return voice ? this.closest(this.notes(voice), focus) : undefined;
    }
    const index = systems.findIndex((measures) => measures.includes(focus.measure));
    const system = systems[index];
    if (!system) {
      return;
    }
    const groups = this.groups(system);
    const at = groups.findIndex((notes) => notes.some((note) => note.part === focus.part && note.voice === focus.voice));
    const adjacent = groups[at + direction];
    if (adjacent) {
      return this.closest(adjacent, focus);
    }
    for (let next = index + direction;next >= 0 && next < systems.length; next += direction) {
      const measures = systems[next];
      if (!measures) {
        continue;
      }
      const nextGroups = this.groups(measures);
      const target = direction === 1 ? nextGroups[0]?.[0] : nextGroups.at(-1)?.at(-1);
      if (target) {
        return target;
      }
    }
    return;
  }
  groups(measures) {
    return this.editor.getVoices().map((voice) => this.notes(voice, [...measures])).filter((notes) => notes.length > 0);
  }
  closest(notes, focus) {
    if (!focus) {
      return notes[0];
    }
    return [...notes].sort((a, b) => Math.abs(a.measure.index - focus.measure.index) - Math.abs(b.measure.index - focus.measure.index) || Math.abs((a.measureBeat ?? 0) - (focus.measureBeat ?? 0)) - Math.abs((b.measureBeat ?? 0) - (focus.measureBeat ?? 0)))[0];
  }
  nextVertical(focus, direction) {
    if (!focus) {
      const initial = this.nextNote(direction);
      const notes = initial ? this.chordOrder.of(initial) : [];
      return direction === 1 ? notes[0] : notes.at(-1);
    }
    const notes = this.chordOrder.of(focus);
    const at = notes.indexOf(focus);
    const adjacent = notes[at + direction];
    if (at >= 0 && adjacent) {
      return adjacent;
    }
    const voice = this.nextVoice(focus, direction);
    if (!voice) {
      return;
    }
    const entering = this.chordOrder.of(voice);
    return direction === 1 ? entering[0] : entering.at(-1);
  }
  nextPitch(focus, direction) {
    const chord = focus.measure.chords.find((chord) => chord.notes.includes(focus));
    const notes = (chord?.notes ?? []).filter((note) => note.pitch !== null).sort((a, b) => this.pitchNumber(a) - this.pitchNumber(b));
    const at = notes.indexOf(focus);
    return at < 0 ? undefined : notes[at + direction];
  }
  pitchNumber(note) {
    const pitch = note.pitch;
    const semitones = {
      C: 0,
      D: 2,
      E: 4,
      F: 5,
      G: 7,
      A: 9,
      B: 11
    };
    return pitch ? pitch.octave * 12 + (semitones[pitch.step] ?? 0) + pitch.alter : 0;
  }
}
// editing-session.ts
import {
  Note as MNote2
} from "@stringsync/mdom";

// pitch-edit.ts
class PitchEdit {
  notes;
  constructor(notes) {
    this.notes = notes;
  }
  apply(spec) {
    const notes = this.notes;
    if (!["A", "B", "C", "D", "E", "F", "G"].includes(spec.step) || !Number.isInteger(spec.octave) || spec.octave < 0 || spec.octave > 9 || !Number.isFinite(spec.alter ?? 0)) {
      throw new RangeError("editing: invalid pitch");
    }
    for (const note of notes) {
      if (!note.pitch) {
        throw new Error("editing: pitch edits require pitched notes");
      }
      if (note.ties.length > 0 || note.childrenNamed("tie").length > 0) {
        throw new Error("editing: tied pitches require a tie-aware command");
      }
      if (note.string !== null || note.fret !== null) {
        throw new Error("editing: fretted pitches require a fingering-aware command");
      }
    }
    let changed = false;
    for (const note of new Set(notes)) {
      const before = note.pitch;
      if (!before || before.step === spec.step && before.octave === spec.octave && before.alter === (spec.alter ?? 0)) {
        continue;
      }
      note.setPitch(spec);
      note.child("accidental")?.remove();
      changed = true;
    }
    return changed;
  }
}

// tab-position-edit.ts
class TabPositionEdit {
  notes;
  constructor(notes) {
    this.notes = notes;
  }
  apply(spec) {
    const pitch = spec.pitch;
    if (!["A", "B", "C", "D", "E", "F", "G"].includes(pitch.step) || !Number.isInteger(pitch.octave) || pitch.octave < 0 || pitch.octave > 9 || !Number.isFinite(pitch.alter ?? 0)) {
      throw new RangeError("editing: invalid pitch");
    }
    if (!Number.isInteger(spec.string) || spec.string < 1 || !Number.isInteger(spec.fret) || spec.fret < 0) {
      throw new RangeError("editing: invalid tab position");
    }
    for (const note of this.notes) {
      if (!note.pitch) {
        throw new Error("editing: tab positions require pitched notes");
      }
      if (note.ties.length > 0 || note.childrenNamed("tie").length > 0) {
        throw new Error("editing: tied tab positions require a tie-aware command");
      }
    }
    let changed = false;
    for (const note of new Set(this.notes)) {
      const before = note.pitch;
      if (!before) {
        continue;
      }
      const pitchChanged = before.step !== pitch.step || before.octave !== pitch.octave || before.alter !== (pitch.alter ?? 0);
      if (!pitchChanged && note.string === spec.string && note.fret === spec.fret) {
        continue;
      }
      if (pitchChanged) {
        note.setPitch(pitch);
        note.child("accidental")?.remove();
      }
      note.setStringFret({ string: spec.string, fret: spec.fret });
      changed = true;
    }
    return changed;
  }
}

// editing-session.ts
class EditingSession {
  document;
  disposer = new Disposer;
  dispatcher = this.disposer.use(new Dispatcher);
  events = this.dispatcher.events;
  activeVoice = null;
  focus = null;
  anchor = null;
  selected = [];
  structuralFocus = null;
  structuralAnchor = null;
  selectedMeasures = [];
  selectedBarline = null;
  caret = null;
  constructor(document2) {
    this.document = document2;
    this.disposer.defer(document2.history.events.on("change", () => {
      this.dispatcher.dispatch("documentchange");
    }));
  }
  get history() {
    return this.document.history;
  }
  dispose() {
    this.disposer.dispose();
  }
  getVoices() {
    return this.document.score.parts.flatMap((part) => [
      ...new Set(part.measures.flatMap((measure) => measure.notes.map((note) => note.voice)))
    ].map((voice) => ({ part, voice })));
  }
  getActiveVoice() {
    const voices = this.getVoices();
    return voices.find((voice) => voice.part === this.activeVoice?.part && voice.voice === this.activeVoice.voice) ?? voices[0] ?? null;
  }
  setActiveVoice(voice) {
    const target = this.getVoices().find((candidate) => candidate.part === voice.part && candidate.voice === voice.voice);
    if (!target) {
      throw new Error("editing: voice does not belong to this document");
    }
    const previous = this.getActiveVoice();
    this.activeVoice = target;
    if (previous?.part !== target.part || previous.voice !== target.voice) {
      this.dispatcher.dispatch("voicechange");
    }
  }
  clearSelection() {
    this.selectNotes([]);
  }
  getCaret() {
    return this.caret && this.contains(this.caret.measure) ? { ...this.caret } : null;
  }
  setCaret(caret) {
    this.requireCaret(caret);
    const hadSelection = Boolean(this.focus || this.anchor || this.selected.length || this.structuralFocus || this.structuralAnchor || this.selectedMeasures.length || this.selectedBarline);
    this.clearNoteSelection();
    this.clearStructuralSelection();
    this.caret = { ...caret };
    if (hadSelection) {
      this.selectionChanged();
    }
    this.dispatcher.dispatch("caretchange");
  }
  moveCaret(onset) {
    const caret = this.getCaret();
    if (!caret) {
      return false;
    }
    this.setCaret({ ...caret, onset });
    return true;
  }
  clearCaret() {
    if (this.caret) {
      this.caret = null;
      this.dispatcher.dispatch("caretchange");
    }
  }
  canExtendTo(note) {
    const anchor = this.anchor;
    return !anchor || !this.contains(anchor) || anchor.part === note.part && anchor.voice === note.voice;
  }
  selectionChanged() {
    const focus = this.getFocus();
    if (focus) {
      this.setActiveVoice({ part: focus.part, voice: focus.voice });
    }
    this.dispatcher.dispatch("selectionchange");
  }
  getFocus() {
    return this.focus && this.contains(this.focus) ? this.focus : null;
  }
  getSelection() {
    return this.selected.filter((note) => this.contains(note));
  }
  getStructuralFocus() {
    return this.structuralFocus && this.containsStructuralTarget(this.structuralFocus) ? this.structuralFocus : null;
  }
  getStructuralAnchor() {
    return this.structuralAnchor && this.containsStructuralTarget(this.structuralAnchor) ? this.structuralAnchor : null;
  }
  getSelectedMeasures() {
    return this.selectedMeasures.filter((measure) => this.contains(measure));
  }
  getSelectedBarline() {
    return this.selectedBarline && this.containsStructuralTarget(this.selectedBarline) ? this.selectedBarline : null;
  }
  selectMeasure(measure, opts = {}) {
    this.requireElement(measure);
    const anchor = this.getStructuralAnchor();
    if (opts.extend && anchor && !this.isBarlineTarget(anchor)) {
      if (anchor.part !== measure.part) {
        throw new Error("editing: a measure range must stay within one part");
      }
      const measures = anchor.part.measures;
      const start = measures.indexOf(anchor);
      const end = measures.indexOf(measure);
      this.selectedMeasures = measures.slice(Math.min(start, end), Math.max(start, end) + 1);
    } else {
      this.structuralAnchor = measure;
      this.selectedMeasures = [measure];
    }
    this.clearNoteSelection();
    this.clearCaret();
    this.selectedBarline = null;
    this.structuralFocus = measure;
    this.selectionChanged();
  }
  selectBarline(target) {
    this.requireElement(target.measure);
    const barline = target.barline ?? target.measure.barlines.find((candidate) => candidate.location === target.location) ?? null;
    if (barline) {
      this.requireElement(barline);
      if (barline.parent !== target.measure || barline.location !== target.location) {
        throw new Error("editing: barline target does not match its measure");
      }
    }
    const selected = Object.freeze({
      measure: target.measure,
      location: target.location,
      barline
    });
    this.clearNoteSelection();
    this.clearCaret();
    this.structuralFocus = selected;
    this.structuralAnchor = selected;
    this.selectedMeasures = [];
    this.selectedBarline = selected;
    this.selectionChanged();
  }
  select(note, opts = {}) {
    this.requireNote(note);
    const anchor = this.anchor;
    if (opts.extend && anchor && this.contains(anchor)) {
      if (anchor.part !== note.part || anchor.voice !== note.voice) {
        throw new Error("editing: a range must stay within one part and voice");
      }
      const notes = this.voiceNotes(anchor);
      const start = notes.indexOf(anchor);
      const end = notes.indexOf(note);
      this.selected = notes.slice(Math.min(start, end), Math.max(start, end) + 1);
    } else {
      this.anchor = note;
      this.selected = [note];
    }
    this.clearStructuralSelection();
    this.focus = note;
    this.clearCaret();
    this.selectionChanged();
  }
  selectNotes(notes) {
    for (const note of notes) {
      this.requireNote(note);
    }
    this.clearStructuralSelection();
    this.selected = [...new Set(notes)];
    this.focus = this.selected.at(-1) ?? null;
    this.anchor = this.focus;
    this.clearCaret();
    this.selectionChanged();
  }
  toggle(note) {
    this.requireNote(note);
    const selected = this.getSelection();
    this.selectNotes(selected.includes(note) ? selected.filter((target) => target !== note) : [...selected, note]);
  }
  selectElements(elements) {
    this.selectNotes(elements.flatMap((element) => element.getSources().filter((source) => source instanceof MNote2)));
  }
  getSelectedElements(index) {
    return this.getSelection().flatMap((note) => {
      const element = index.noteLookup.get(note);
      return element ? [element] : [];
    });
  }
  move(direction, opts = {}) {
    return new EditingNavigator(this).move({
      unit: direction === "next" || direction === "previous" ? "note" : "chordPitch",
      direction: direction === "next" || direction === "higher" ? 1 : -1
    }, opts);
  }
  setPitch(spec) {
    return this.history.edit("Set pitch", () => new PitchEdit(this.getSelection()).apply(spec));
  }
  setTabPosition(spec) {
    return this.history.edit("Set tab position", () => new TabPositionEdit(this.getSelection()).apply(spec));
  }
  undo() {
    return this.history.undo();
  }
  redo() {
    return this.history.redo();
  }
  clearNoteSelection() {
    this.focus = null;
    this.anchor = null;
    this.selected = [];
  }
  clearStructuralSelection() {
    this.structuralFocus = null;
    this.structuralAnchor = null;
    this.selectedMeasures = [];
    this.selectedBarline = null;
  }
  contains(element) {
    let node = element.parent;
    while (node) {
      if (node === this.document.root) {
        return true;
      }
      node = node.parent;
    }
    return false;
  }
  containsStructuralTarget(target) {
    if (!this.isBarlineTarget(target)) {
      return this.contains(target);
    }
    return this.contains(target.measure) && (!target.barline || this.contains(target.barline) && target.barline.parent === target.measure && target.barline.location === target.location);
  }
  isBarlineTarget(target) {
    return "barline" in target;
  }
  requireElement(element) {
    if (!this.contains(element)) {
      throw new Error("editing: target does not belong to this document");
    }
  }
  requireNote(note) {
    this.requireElement(note);
  }
  requireCaret(caret) {
    if (!this.contains(caret.measure) || caret.measure.part !== caret.part) {
      throw new Error("editing: caret does not belong to this document");
    }
    if (!caret.voice || !Number.isInteger(caret.staff) || caret.staff < 1 || caret.staff > caret.measure.staveCount || !Number.isFinite(caret.onset) || caret.onset < 0) {
      throw new Error("editing: invalid caret target");
    }
  }
  voiceNotes(note) {
    return note.part.measures.flatMap((measure) => measure.notes.filter((candidate) => candidate.voice === note.voice));
  }
}
// insert-gaps.ts
function insertGaps(document2, positions) {
  return new GapInserter(new ScoreReader(new DynamicGlyphs)).insert(document2, positions);
}
// page.ts
class Page {
  index;
  rect;
  systems;
  painter;
  constructor(index, rect, systems, painter) {
    this.index = index;
    this.rect = rect;
    this.systems = systems;
    this.painter = painter;
  }
  getIndex() {
    return this.index;
  }
  getSystems() {
    return [...this.systems];
  }
  toBlob(type = "image/png", quality) {
    const canvas = this.toCanvas();
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        canvas.width = 0;
        canvas.height = 0;
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error(`vexml: could not encode page ${this.index}`));
        }
      }, type, quality);
    });
  }
  toCanvas() {
    const { x, y, w, h } = this.rect;
    const scale = Math.min(this.painter.pixelRatio, Math.sqrt(MAX_CANVAS_AREA / (w * h)));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(w * scale);
    canvas.height = Math.round(h * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("vexml: 2D context unavailable for a page");
    }
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = this.painter.paperColor();
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const sx = canvas.width / w;
    const sy = canvas.height / h;
    ctx.setTransform(sx, 0, 0, sy, -x * sx, -y * sy);
    this.painter.paintEngraving(ctx, this.rect, scale);
    return canvas;
  }
}
// playhead.ts
class Playhead {
  marker;
  color;
  widthPx;
  visible = true;
  event = null;
  constructor(marker, opts) {
    this.marker = marker;
    this.color = opts?.color ?? CURSOR_COLOR;
    this.widthPx = opts?.widthPx ?? CURSOR_WIDTH_PX;
    this.marker.hide();
  }
  setVisible(visible) {
    if (this.visible === visible) {
      return;
    }
    this.visible = visible;
    if (this.event) {
      this.render(this.event);
    }
  }
  setWidthPx(widthPx) {
    this.widthPx = widthPx;
    if (this.event) {
      this.render(this.event);
    }
  }
  render(event) {
    this.event = event;
    if (!this.visible) {
      this.marker.hide();
      return;
    }
    const rect = event.position.rect;
    this.marker.show(new Rect2(rect.x - this.widthPx / 2, rect.y, this.widthPx, rect.h), this.color);
  }
  dispose() {
    this.marker.dispose();
  }
}
// read-timeline.ts
async function readTimeline(input, config) {
  const reader = new ScoreReader(new DynamicGlyphs);
  const gaps = new Gaps(config?.gaps ?? [], new GapInserter(reader));
  gaps.check(input);
  const document2 = await new DefaultScoreParser().parse(input);
  if (document2.score.parts.length > 0) {
    gaps.resolve(document2);
  }
  return new SequenceFactory(reader, gaps).timeline(document2.score.parts);
}
// browser-idle-scheduler.ts
var IDLE_TIMEOUT_MS = 100;
var FALLBACK_SLICE_MS = 8;

class BrowserIdleScheduler {
  request(slice) {
    if (typeof requestIdleCallback === "function") {
      const id = requestIdleCallback((deadline) => slice(deadline), {
        timeout: IDLE_TIMEOUT_MS
      });
      return disposables.callback(() => cancelIdleCallback(id));
    }
    const id = setTimeout(() => {
      const started = performance.now();
      slice({
        timeRemaining: () => Math.max(0, FALLBACK_SLICE_MS - (performance.now() - started))
      });
    }, 0);
    return disposables.callback(() => clearTimeout(id));
  }
}

// default-font-loader.ts
import { VexFlow } from "vexflow/core";
class DefaultFontLoader {
  bravura;
  constructor(bravura) {
    this.bravura = bravura;
  }
  async load(container, config) {
    const families = new FontFamilies(config);
    const { notation, text } = families;
    if (typeof document === "undefined") {
      return { notation, text };
    }
    this.injectNotationFont(config?.notation);
    this.injectTextFont(config?.text);
    this.applyFontVariables(container, families);
    VexFlow.setFonts(`'${notation}'`, `'${text}'`, "sans-serif");
    VexFlow.setTextFonts(`'${notation}'`, `'${text}'`, "sans-serif");
    await this.settle(notation, text);
    return { notation, text };
  }
  async ensure(samples) {
    if (typeof document === "undefined" || !document.fonts) {
      return false;
    }
    const cold = new Set;
    document.fonts.forEach((face) => {
      if (face.status !== "loaded") {
        cold.add(face);
      }
    });
    if (cold.size === 0) {
      return false;
    }
    const loaded = await Promise.all(samples.map(({ font, text }) => document.fonts.load(font, text).catch(() => [])));
    return loaded.some((faces) => faces.some((face) => cold.has(face) && face.status === "loaded"));
  }
  async settle(notation, text) {
    if (!document.fonts || !document.body || !globalThis.requestAnimationFrame) {
      return;
    }
    const key = `${notation}|${text}`;
    if (document.head.querySelector(`meta[data-vexml-fonts-settled="${key}"]`)) {
      return;
    }
    await this.googleFontsSettled();
    const specs = [
      { font: `1em '${notation}'`, sample: "" },
      ...[300, 400, 600].map((weight) => ({
        font: `${weight} 1em '${text}'`,
        sample: "0123456789 HPabcdefgh"
      }))
    ];
    await Promise.all(specs.map(({ font, sample }) => document.fonts.load(font, sample)));
    const probe = document.createElement("div");
    probe.style.cssText = "position:absolute;visibility:hidden;left:-9999px;top:0";
    for (const { font, sample } of specs) {
      const span = document.createElement("span");
      span.style.font = font;
      span.textContent = sample;
      probe.appendChild(span);
    }
    document.body.appendChild(probe);
    try {
      let previous = "";
      for (let attempt = 0;attempt < 20; attempt++) {
        const widths = Array.from(probe.children).map((span) => span.getBoundingClientRect().width).join();
        if (widths === previous) {
          break;
        }
        previous = widths;
        await document.fonts.ready;
        await new Promise(requestAnimationFrame);
      }
    } finally {
      probe.remove();
    }
    const settled = document.createElement("meta");
    settled.setAttribute("data-vexml-fonts-settled", key);
    document.head.appendChild(settled);
  }
  injectNotationFont(override) {
    const family = override?.family ?? DEFAULT_FONT_CONFIG.notation.family;
    if (this.injectFiles(family, override, "block")) {
      return;
    }
    if (family === DEFAULT_FONT_CONFIG.notation.family) {
      this.injectFiles(family, { faces: this.bravura }, "block");
    }
  }
  injectTextFont(override) {
    const family = override?.family ?? DEFAULT_FONT_CONFIG.text.family;
    if (this.injectFiles(family, override, "swap")) {
      return;
    }
    if (!override?.family) {
      this.injectGoogleFonts();
    }
  }
  injectFiles(family, override, display) {
    const files = override?.faces ?? (override?.url ? [{ url: override.url }] : []);
    for (const file of files) {
      this.injectFontFace(family, file.url, display, file.unicodeRange);
    }
    return files.length > 0;
  }
  injectGoogleFonts() {
    if (document.head.querySelector("link[data-vexml-google-fonts]")) {
      return;
    }
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@300;400;600&display=swap";
    link.setAttribute("data-vexml-google-fonts", "");
    const settle = () => link.setAttribute("data-vexml-google-fonts", "settled");
    link.addEventListener("load", settle, { once: true });
    link.addEventListener("error", settle, { once: true });
    document.head.appendChild(link);
  }
  async googleFontsSettled() {
    const link = document.head.querySelector("link[data-vexml-google-fonts]");
    if (!link || link.getAttribute("data-vexml-google-fonts") === "settled") {
      return;
    }
    await new Promise((resolve) => {
      link.addEventListener("load", resolve, { once: true });
      link.addEventListener("error", resolve, { once: true });
    });
  }
  injectFontFace(family, url, display, unicodeRange) {
    family = FontFamilies.sanitize(family);
    url = FontFamilies.sanitize(url);
    const range = unicodeRange && UNICODE_RANGE.test(unicodeRange) ? `
				unicode-range: ${unicodeRange};` : "";
    const key = `${family}|${url}`;
    if (document.head.querySelector(`style[data-vexml-font-face="${key}"]`)) {
      return;
    }
    const style = document.createElement("style");
    style.setAttribute("data-vexml-font-face", key);
    style.textContent = `
			@font-face {
				font-family: '${family}';
				src: url('${url}') format('woff2');
				font-weight: normal;
				font-style: normal;
				font-display: ${display};${range}
			}
		`;
    document.head.appendChild(style);
  }
  applyFontVariables(container, families) {
    container.style.setProperty("--vexml-font-notation", families.notationStack);
    container.style.setProperty("--vexml-font-text", families.textStack);
  }
}

// color-style.ts
var COLOR_PAD = 4;

class ColorStyle {
  placement = "content";
  draw(ctx, target, color) {
    target.drawColor(ctx, color);
  }
  bounds(target) {
    const r = target.rect;
    return new Rect2(r.x - COLOR_PAD, r.y - COLOR_PAD, r.w + 2 * COLOR_PAD, r.h + 2 * COLOR_PAD);
  }
}

// default-decoration.ts
class DefaultDecoration {
  host;
  style;
  active = new Map;
  layer = null;
  constructor(host, style) {
    this.host = host;
    this.style = style;
  }
  set(target, color) {
    if ((this.active.get(target) ?? null) === color) {
      return;
    }
    if (color === null) {
      this.active.delete(target);
    } else {
      this.active.set(target, color);
    }
    this.repaint(this.style.bounds(target));
  }
  has(target) {
    return this.active.has(target);
  }
  dispose() {
    this.layer?.dispose();
    this.layer = null;
    this.active.clear();
  }
  repaint(dirty) {
    this.layer ??= this.host.createLayer(this.style.placement);
    const ctx = this.layer.ctx;
    const x = Math.floor(dirty.x) - 1;
    const y = Math.floor(dirty.y) - 1;
    const w = Math.ceil(dirty.right) + 1 - x;
    const h = Math.ceil(dirty.bottom) + 1 - y;
    const region = new Rect2(x, y, w, h);
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    ctx.clearRect(x, y, w, h);
    for (const [target, color] of this.active) {
      if (this.style.bounds(target).intersects(region)) {
        this.style.draw(ctx, target, color);
      }
    }
    ctx.restore();
  }
}

// halo-style.ts
class HaloStyle {
  placement = "background";
  draw(ctx, target, color) {
    const b = this.bounds(target);
    const radius = b.w / 2;
    ctx.save();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(b.x + radius, b.y + radius, radius, 0, 2 * Math.PI);
    ctx.fill();
    ctx.restore();
  }
  drawOutline(ctx, target, color) {
    const b = this.bounds(target);
    const radius = b.w / 2;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(b.x + radius, b.y + radius, radius - 1, 0, 2 * Math.PI);
    ctx.stroke();
    ctx.restore();
  }
  bounds(target) {
    const r = target.rect;
    const radius = Math.max(r.w, r.h) / 2 + HALO_MARGIN;
    return new Rect2(r.x + r.w / 2 - radius, r.y + r.h / 2 - radius, 2 * radius, 2 * radius);
  }
}

// default-decorations.ts
class DefaultDecorations {
  color;
  halo;
  disposer = new Disposer;
  constructor(host) {
    this.color = this.disposer.use(new DefaultDecoration(host, new ColorStyle));
    this.halo = this.disposer.use(new DefaultDecoration(host, new HaloStyle));
  }
  dispose() {
    this.disposer.dispose();
  }
}

// font-samples.ts
class FontSamples {
  chars = new Map;
  add(font, text) {
    let chars = this.chars.get(font);
    if (!chars) {
      chars = new Set;
      this.chars.set(font, chars);
    }
    for (const char of text) {
      chars.add(char);
    }
  }
  list() {
    return Array.from(this.chars, ([font, chars]) => ({
      font,
      text: Array.from(chars).join("")
    }));
  }
}

// glyph-collector.ts
class GlyphCollector {
  probe;
  seen = new FontSamples;
  constructor(probe) {
    this.probe = probe;
  }
  samples() {
    return this.seen.list();
  }
  normalize(prop, value, current) {
    return this.probe.normalize(prop, value, current);
  }
  measureText(state, text) {
    this.seen.add(String(state.props.font), text);
    return this.probe.measureText(state, text);
  }
  forget() {
    this.probe.forget();
  }
  isPointInPath(query) {
    return this.probe.isPointInPath(query);
  }
  createLinearGradient(x0, y0, x1, y1) {
    return this.probe.createLinearGradient(x0, y0, x1, y1);
  }
  createRadialGradient(x0, y0, r0, x1, y1, r1) {
    return this.probe.createRadialGradient(x0, y0, r0, x1, y1, r1);
  }
  createConicGradient(startAngle, x, y) {
    return this.probe.createConicGradient(startAngle, x, y);
  }
  createPattern(image, repetition) {
    return this.probe.createPattern(image, repetition);
  }
  createImageData(sw, sh, settings) {
    return this.probe.createImageData(sw, sh, settings);
  }
}

// progressive-recording.ts
class ProgressiveRecording {
  engraving;
  hasDocument = true;
  constructor(engraving) {
    this.engraving = engraving;
  }
  snapshot() {
    return this.engraving.recording().snapshot();
  }
}

// complete-drawing.ts
class CompleteDrawing {
  dispatcher = new Dispatcher;
  events = this.dispatcher.events;
  isComplete() {
    return true;
  }
  whenComplete() {
    return Promise.resolve();
  }
  drawThroughMeasure(_m) {}
  drawAll() {}
  dispose() {
    this.dispatcher.dispose();
  }
}

// cursor-host-adapter.ts
class CursorHostAdapter {
  host;
  dispatcher = new Dispatcher;
  events = this.dispatcher.events;
  observers = new Disposer;
  constructor(host) {
    this.host = host;
    const fire = () => this.dispatcher.dispatch("viewportchange");
    this.observers.defer(host.events.on("scroll", fire));
    this.observers.defer(host.events.on("resize", fire));
    this.observers.use(this.dispatcher);
  }
  clientRectOf(rect) {
    return this.host.clientRectOf(rect);
  }
  viewportRect() {
    return this.host.viewportRect();
  }
  dispose() {
    this.observers.dispose();
  }
}

// lazy-layer.ts
class LazyLayer {
  host;
  kind;
  zIndex;
  layer = null;
  constructor(host, kind, zIndex) {
    this.host = host;
    this.kind = kind;
    this.zIndex = zIndex;
  }
  get ctx() {
    this.layer ??= this.host.createLayer(this.kind, this.zIndex);
    return this.layer.ctx;
  }
  dispose() {
    this.layer?.dispose();
    this.layer = null;
  }
}

// loupe.ts
function resolveLoupeOptions(base, patch) {
  const given = Object.entries(patch).filter(([key, value]) => (key in base) && value !== undefined);
  const options = {
    ...base,
    ...Object.fromEntries(given)
  };
  const { width, height, zoom, radius, gap, paper } = options;
  const positive = [width, height, zoom].every((v) => Number.isFinite(v) && v > 0);
  const nonNegative = [radius, gap].every((v) => Number.isFinite(v) && v >= 0);
  if (!positive || !nonNegative) {
    throw new Error("vexml: loupe width, height and zoom must be positive, radius and gap non-negative");
  }
  if (paper !== null && typeof paper !== "string") {
    throw new Error("vexml: loupe paper must be a CSS color or null");
  }
  return options;
}

// noop-editing-view.ts
class NoopEditingView {
  render(_state) {}
  dispose() {}
}

// score-editing-layout.ts
class ScoreEditingLayout {
  score;
  constructor(score) {
    this.score = score;
  }
  getSystems() {
    return this.score.getSystems().map((system) => system.getSources());
  }
}

// selection-overlay.ts
var STRUCTURE_PAD = 4;

class SelectionOverlay {
  layer;
  opts;
  focusLayer;
  previous = [];
  previousFocus = [];
  previousCaret = null;
  halo = new HaloStyle;
  color = new ColorStyle;
  constructor(layer, opts = {}, focusLayer = layer) {
    this.layer = layer;
    this.opts = opts;
    this.focusLayer = focusLayer;
  }
  render(state) {
    if (this.previous.length === 0 && this.previousFocus.length === 0 && !this.previousCaret && !state.marquee && !state.focus && !state.caret && state.selected.length === 0 && state.measures.length === 0 && !state.barline && !state.structuralFocus) {
      return;
    }
    const caretWidth = this.opts.caretWidth ?? 2;
    const ctx = this.layer.ctx;
    for (const rect of this.previous) {
      ctx.clearRect(rect.x - 1, rect.y - 1, rect.w + 2, rect.h + 2);
    }
    this.previous = [];
    for (const rect of this.previousFocus) {
      this.focusLayer.ctx.clearRect(rect.x - 1, rect.y - 1, rect.w + 2, rect.h + 2);
    }
    this.previousFocus = [];
    if (this.previousCaret) {
      this.focusLayer.ctx.clearRect(this.previousCaret.x - caretWidth / 2 - 1, this.previousCaret.y - 1, caretWidth + 2, this.previousCaret.h + 2);
      this.previousCaret = null;
    }
    ctx.save();
    const color = this.opts.color ?? "#155dfc";
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.1;
    const regions = state.marquee ? [state.marquee] : [
      ...this.regions(state.selected),
      ...this.measureRegions(state.measures)
    ];
    for (const rect of regions) {
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
      this.previous.push(rect);
    }
    const foreground = this.focusLayer.ctx;
    foreground.save();
    foreground.globalAlpha = 1;
    const colored = new Set([
      ...state.selected,
      ...state.focus ? [state.focus] : []
    ]);
    for (const note of colored) {
      for (const element of [note, note.getTabPosition()]) {
        if (element) {
          this.color.draw(foreground, element, color);
          this.previousFocus.push(this.color.bounds(element));
        }
      }
    }
    if (state.focus) {
      for (const element of [state.focus, state.focus.getTabPosition()]) {
        if (element) {
          ctx.globalAlpha = 0.24;
          this.halo.draw(ctx, element, color);
          this.previous.push(this.halo.bounds(element));
          foreground.globalAlpha = 1;
          this.halo.drawOutline(foreground, element, this.opts.focusColor ?? color);
          this.previousFocus.push(this.halo.bounds(element));
        }
      }
    }
    if (state.caret) {
      foreground.fillStyle = this.opts.caretColor ?? this.opts.focusColor ?? color;
      foreground.fillRect(state.caret.x - caretWidth / 2, state.caret.y, caretWidth, state.caret.h);
      this.previousCaret = state.caret;
    }
    if (state.barline) {
      const rect = this.padded(state.barline);
      ctx.globalAlpha = 0.24;
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
      this.previous.push(rect);
    }
    if (state.structuralFocus) {
      const rect = this.padded(state.structuralFocus);
      foreground.fillStyle = this.opts.focusColor ?? color;
      this.outline(foreground, rect, 2);
      this.previousFocus.push(rect);
    }
    foreground.restore();
    ctx.globalAlpha = 1;
    if (state.marquee) {
      const rect = state.marquee;
      ctx.fillStyle = color;
      this.outline(ctx, rect, 1);
    }
    ctx.restore();
  }
  dispose() {
    this.layer.dispose();
    if (this.focusLayer !== this.layer) {
      this.focusLayer.dispose();
    }
  }
  outline(ctx, rect, width) {
    ctx.fillRect(rect.x, rect.y, rect.w, width);
    ctx.fillRect(rect.x, rect.bottom - width, rect.w, width);
    ctx.fillRect(rect.x, rect.y, width, rect.h);
    ctx.fillRect(rect.right - width, rect.y, width, rect.h);
  }
  padded(element) {
    const r = element.rect;
    return new Rect2(r.x, r.y - STRUCTURE_PAD, r.w, r.h + 2 * STRUCTURE_PAD);
  }
  measureRegions(measures) {
    const systems = new Map;
    for (const measure of measures) {
      const system = measure.getBox().getSystem();
      const rect = this.padded(measure);
      systems.set(system, systems.get(system)?.union(rect) ?? rect);
    }
    return [...systems.values()];
  }
  regions(notes) {
    if (notes.length < 2) {
      return [];
    }
    const systems = new Map;
    for (const note of notes) {
      const system = note.getMeasure().getBox().getSystem();
      for (const element of [note, note.getTabPosition()]) {
        if (element) {
          const rect = this.halo.bounds(element);
          systems.set(system, systems.get(system)?.union(rect) ?? rect);
        }
      }
    }
    return [...systems.values()];
  }
}

// score.ts
class Score {
  host;
  elements;
  sequence;
  scroller;
  gaps;
  dispatcher = new Dispatcher;
  disposer = new Disposer;
  listening = new Map;
  events = {
    on: (type, listener, opts) => {
      const release = this.retain(type);
      const unlisten = this.dispatcher.events.on(type, opts?.once ? (event) => {
        release();
        listener(event);
      } : listener, opts);
      return () => {
        unlisten();
        release();
      };
    },
    all: (listener, opts) => this.dispatcher.events.all(listener, opts)
  };
  bound = new Map;
  lastResize = null;
  hovered = null;
  lastClient = null;
  unlistenScroll = null;
  cursors = new Set;
  editors = new Set;
  pages;
  snapshots;
  drawing;
  constructor(host, elements, decorations, sequence, scroller, gaps, opts = {}) {
    this.host = host;
    this.elements = elements;
    this.sequence = sequence;
    this.scroller = scroller;
    this.gaps = gaps;
    this.pages = opts.pages ?? [];
    this.snapshots = opts.snapshots ?? null;
    const drawing = opts.drawing ?? new CompleteDrawing;
    this.drawing = drawing;
    this.disposer.use(host);
    this.disposer.use(this.dispatcher);
    this.disposer.use(decorations);
    this.disposer.use(drawing);
    this.disposer.defer(drawing.events.on("draw", (event) => this.dispatcher.dispatch("draw", event)));
    this.disposer.defer(drawing.events.on("complete", () => this.dispatcher.dispatch("complete")));
    const unlistenResize = host.events.on("resize", (size) => {
      host.relayoutLayers();
      if (size.width === this.lastResize?.width && size.height === this.lastResize?.height) {
        return;
      }
      this.lastResize = size;
      this.scroller.suspendForResize();
      this.dispatcher.dispatch("resize", size);
    });
    this.disposer.defer(unlistenResize);
    this.disposer.defer(() => this.unbindAll());
    this.disposer.defer(() => {
      for (const cursor of [...this.cursors]) {
        cursor.dispose();
      }
      this.cursors.clear();
    });
    this.disposer.defer(() => {
      for (const editor of this.editors) {
        editor.dispose();
      }
      this.editors.clear();
    });
  }
  addLayer(kind, zIndex) {
    if (zIndex !== undefined && !Number.isInteger(zIndex)) {
      throw new Error("vexml: layer zIndex must be an integer");
    }
    return this.host.createLayer(kind, zIndex);
  }
  createMarker(zIndex) {
    if (zIndex !== undefined && !Number.isInteger(zIndex)) {
      throw new Error("vexml: marker zIndex must be an integer");
    }
    return this.host.createMarker(zIndex);
  }
  createLoupe(opts = {}) {
    return this.host.createLoupe(resolveLoupeOptions(LOUPE_OPTIONS, opts));
  }
  setMaxHeight(px) {
    this.host.setMaxHeight(px);
  }
  createCursor() {
    const cursor = new CursorController(this.sequence, new CursorHostAdapter(this.host), this.scroller, this.drawing);
    cursor.events.on("dispose", () => this.cursors.delete(cursor));
    this.cursors.add(cursor);
    return cursor;
  }
  createEditingController(editor, opts = {}) {
    if (this.snapshots && !this.snapshots.hasDocument) {
      throw new Error("vexml: a score rendered from a snapshot has no document to edit; render the MusicXML");
    }
    const view = opts.view ?? (opts.selection === false ? new NoopEditingView : new SelectionOverlay(new LazyLayer(this.host, "background"), opts.selection, new LazyLayer(this.host, "content", 2)));
    const controller = new EditingController(editor, {
      elements: this.elements,
      navigator: new EditingNavigator(editor, new ScoreEditingLayout(this)),
      events: this.events,
      dom: this.host.dom,
      scroller: this.scroller,
      view
    }, opts);
    controller.events.on("dispose", () => this.editors.delete(controller));
    this.editors.add(controller);
    return controller;
  }
  createPlayhead(opts) {
    return new Playhead(this.host.createMarker(), opts);
  }
  snapshot() {
    if (!this.snapshots) {
      throw new Error("vexml: this score has nothing to snapshot");
    }
    this.drawing.drawAll();
    return this.snapshots.snapshot();
  }
  isComplete() {
    return this.drawing.isComplete();
  }
  whenComplete() {
    return this.drawing.whenComplete();
  }
  getDurationMs() {
    return this.sequence.getDurationMs();
  }
  getDurationBeats() {
    return this.sequence.getDurationBeats();
  }
  getMeasureCount() {
    return this.sequence.getMeasureCount();
  }
  getMeasureIndexAtMs(ms) {
    return this.sequence.getMeasureIndexAtMs(ms);
  }
  getMeasureIndexAtBeats(beats) {
    return this.sequence.getMeasureIndexAtBeats(beats);
  }
  getSequence() {
    return this.sequence;
  }
  getGaps() {
    return this.gaps;
  }
  getElements() {
    return this.elements;
  }
  getParts() {
    return this.elements.parts();
  }
  getSystems() {
    return this.elements.systems();
  }
  getPages() {
    return [...this.pages];
  }
  getTimeAt(point) {
    const range = this.stepRangeAt(point);
    if (!range) {
      return null;
    }
    const resolved = this.sequence.resolveX(point.x, range.start, range.end);
    const step = resolved && this.sequence.getStep(resolved.stepIndex);
    if (!resolved || !step) {
      return null;
    }
    return {
      ms: this.sequence.beatsToMs(resolved.beat),
      beat: resolved.beat,
      stepMs: step.startMs,
      stepBeat: step.startBeat,
      stepIndex: resolved.stepIndex
    };
  }
  stepRangeAt(point) {
    const target = this.elements.at(point);
    if (target instanceof Note2 || target instanceof TabPosition2) {
      const note = target instanceof Note2 ? target : target.getNote();
      const index = this.sequence.getFirstStepOfNote(note);
      return index === null ? null : { start: index, end: index };
    }
    if (target instanceof Measure2 || target instanceof Barline2) {
      const measure = target instanceof Measure2 ? target : target.getMeasure();
      return this.sequence.getStepRangeOfMeasure(measure.getIndex());
    }
    if (target instanceof MeasureBox2) {
      return this.sequence.getStepRangeOfMeasure(target.getIndex());
    }
    return null;
  }
  dispose() {
    this.disposer.dispose();
  }
  unbindAll() {
    for (const handlers of this.bound.values()) {
      for (const [domType, handler] of handlers) {
        this.sourceOf(domType).removeEventListener(domType, handler);
      }
    }
    this.bound.clear();
    this.unlistenScroll?.();
    this.unlistenScroll = null;
  }
  retain(type) {
    const count = this.listening.get(type) ?? 0;
    this.listening.set(type, count + 1);
    if (count === 0) {
      this.bind(type);
    }
    let released = false;
    return () => {
      if (released) {
        return;
      }
      released = true;
      const left = (this.listening.get(type) ?? 1) - 1;
      this.listening.set(type, left);
      if (left === 0) {
        this.unbind(type);
      }
    };
  }
  bind(type) {
    switch (type) {
      case "resize":
      case "draw":
      case "complete":
        return;
      case "scroll": {
        this.listen(type, "scroll", (native) => {
          this.dispatcher.dispatch("scroll", { ...this.host.scroll, native });
        });
        return;
      }
      case "hover": {
        const track = (native) => {
          const pointer = native;
          if (pointer.pointerType === "touch") {
            return;
          }
          this.lastClient = { x: pointer.clientX, y: pointer.clientY };
          this.recomputeHover();
        };
        this.listen(type, "pointermove", track);
        this.listen(type, "pointerdown", track);
        const clear = () => {
          this.lastClient = null;
          this.recomputeHover();
        };
        this.listen(type, "pointerleave", clear);
        this.listen(type, "pointercancel", clear);
        this.unlistenScroll = this.host.events.on("scroll", () => this.recomputeHover());
        return;
      }
      default: {
        this.listen(type, type, (native) => {
          const pointer = native;
          const point = this.host.toScoreSpace(pointer.clientX, pointer.clientY);
          this.dispatcher.dispatch(type, {
            target: this.targetAt(pointer.clientX, pointer.clientY, point),
            point,
            native: pointer
          });
        });
      }
    }
  }
  unbind(type) {
    if (type === "resize" || type === "draw" || type === "complete") {
      return;
    }
    const handlers = this.bound.get(type);
    if (handlers) {
      for (const [domType, handler] of handlers) {
        this.sourceOf(domType).removeEventListener(domType, handler);
      }
      this.bound.delete(type);
    }
    if (type === "hover") {
      this.unlistenScroll?.();
      this.unlistenScroll = null;
      this.hovered = null;
      this.lastClient = null;
    }
  }
  listen(type, domType, handler) {
    this.sourceOf(domType).addEventListener(domType, handler);
    const handlers = this.bound.get(type) ?? [];
    handlers.push([domType, handler]);
    this.bound.set(type, handlers);
  }
  sourceOf(domType) {
    return domType === "scroll" ? this.host.scrollTarget : this.host.dom;
  }
  targetAt(clientX, clientY, point) {
    return this.host.obscures(clientX, clientY) ? null : this.elements.at(point);
  }
  recomputeHover() {
    const client = this.lastClient;
    const point = client ? this.host.toScoreSpace(client.x, client.y) : null;
    const target = client && point ? this.targetAt(client.x, client.y, point) : null;
    if (target !== this.hovered) {
      this.hovered = target;
      this.dispatcher.dispatch("hover", { target, point });
    }
  }
}

// snapshot-reader.ts
import { MDocument } from "@stringsync/mdom";

// recorded-fold.ts
class RecordedFold {
  left;
  width;
  height;
  starts;
  strips;
  constructor(left, width, height, starts, strips) {
    this.left = left;
    this.width = width;
    this.height = height;
    this.starts = starts;
    this.strips = strips;
  }
  indexAt(x) {
    let index = 0;
    for (const [i, start] of this.starts.entries()) {
      if (start > x) {
        break;
      }
      index = i;
    }
    return index;
  }
  paint(context, index) {
    const strip = this.strips[index];
    if (!strip) {
      return;
    }
    const m = context.getTransform();
    const replayer = new PaintReplayer(context, new Affine(m.a, m.b, m.c, m.d, m.e, m.f), { scale: Math.hypot(m.a, m.b), device: null });
    for (const op of strip) {
      replayer.replay(op);
    }
    replayer.finish();
  }
}

// snapshot-reader.ts
class SnapshotReader {
  config;
  constructor(config) {
    this.config = config;
  }
  static isSnapshot(input) {
    return typeof input === "object" && input !== null && !(typeof Blob !== "undefined" && input instanceof Blob) && !(input instanceof MDocument);
  }
  check(snapshot) {
    if (snapshot.format !== SNAPSHOT_FORMAT) {
      throw new SnapshotMismatchError2("format", "render: the input is not a vexml score snapshot");
    }
    if (snapshot.version !== SNAPSHOT_VERSION2) {
      throw new SnapshotMismatchError2("version", `render: the snapshot is version ${snapshot.version}, this vexml reads ${SNAPSHOT_VERSION2}`);
    }
    const { gaps: _, ...want } = snapshotConfig(this.config);
    const { gaps: __, ...have } = snapshot.config;
    if (JSON.stringify(have) !== JSON.stringify(want)) {
      throw new SnapshotMismatchError2("config", "render: the snapshot was engraved with a different config");
    }
  }
  read(snapshot) {
    const decoder = new PaintDecoder(snapshot.paint, snapshot.outlines);
    const { engraving, fold, elements, sequence } = snapshot;
    const outlined = (glyph) => {
      const outline = decoder.outline(glyph.font, glyph.text);
      return outline ? { ...glyph, outline } : glyph;
    };
    const keys = elements.notes.map(() => ({}));
    return {
      engraving: engraving && {
        ops: decoder.decode(engraving.ops),
        width: engraving.width,
        height: engraving.height,
        origin: { x: engraving.origin[0], y: engraving.origin[1] },
        scale: engraving.scale,
        fingerprint: SnapshotFingerprint.of(snapshot)
      },
      fold: fold && new RecordedFold(fold.left, fold.width, fold.height, fold.starts, fold.strips.map((strip) => decoder.decode(strip))),
      pages: snapshot.pages.map(rect),
      elements: {
        bounds: rect(elements.bounds),
        boxes: elements.boxes.map((box) => ({
          ...box,
          rect: rect(box.rect),
          sources: []
        })),
        parts: elements.parts.map((part) => ({
          ...part,
          source: null,
          measures: part.measures.map((measure) => ({
            ...measure,
            rect: rect(measure.rect),
            source: null
          }))
        })),
        notes: elements.notes.map((note, i) => {
          const [x, y, w, h, ink, glyph, part, measure, pitch, beats, flags] = note;
          const box = new Rect2(x, y, w, h);
          return {
            key: keys[i] ?? {},
            facts: {
              pitch,
              beats,
              articulations: note[13],
              grace: (flags & 1) !== 0,
              swingExempt: (flags & 2) !== 0,
              chordMember: (flags & 4) !== 0,
              graces: note[12].flatMap((g) => keys[g] ?? [])
            },
            rect: box,
            ink: ink ? rect(ink) : box,
            glyph: glyph && outlined({
              text: glyph[0],
              font: elements.fonts[glyph[1]] ?? "",
              x: glyph[2] ?? x,
              y: glyph[3]
            }),
            part,
            measure,
            chord: note[11] ?? [i],
            source: null
          };
        }),
        tabs: elements.tabs.map((tab) => ({
          ...tab,
          rect: rect(tab.rect),
          glyph: tab.glyph && outlined(tab.glyph)
        })),
        diagrams: elements.diagrams.map((diagram) => ({
          ...diagram,
          rect: rect(diagram.rect),
          source: null
        })),
        barlines: elements.barlines.map((barline) => ({
          ...barline,
          rect: rect(barline.rect),
          source: null
        })),
        targets: elements.targets
      },
      sequence: {
        ...sequence,
        steps: sequence.steps.map((step) => ({
          ...step,
          systemRect: rect(step.systemRect)
        }))
      }
    };
  }
}
function rect([x, y, w, h]) {
  return new Rect2(x, y, w, h);
}

// stored-snapshot.ts
class StoredSnapshot {
  stored;
  hasDocument = false;
  constructor(stored) {
    this.stored = stored;
  }
  snapshot() {
    return this.stored;
  }
}

// score-renderer.ts
class ScoreRenderer {
  config;
  stage;
  fontLoader;
  parser;
  engraver;
  elementFactory;
  sequenceFactory;
  scheduler;
  constructor(config, stage, fontLoader, parser, engraver, elementFactory, sequenceFactory, scheduler) {
    this.config = config;
    this.stage = stage;
    this.fontLoader = fontLoader;
    this.parser = parser;
    this.engraver = engraver;
    this.elementFactory = elementFactory;
    this.sequenceFactory = sequenceFactory;
    this.scheduler = scheduler;
  }
  async render(input) {
    this.engraver.check();
    const fonts = this.fontLoader.load(this.stage.container, this.config.fonts);
    if (SnapshotReader.isSnapshot(input)) {
      const read = new SnapshotReader(this.config).read(input);
      if (input.outlines) {
        fonts.catch(() => {});
      } else {
        await fonts;
        await this.fontLoader.ensure(this.textOf(read.engraving));
      }
      return this.restore(input, read);
    }
    await fonts;
    const collector = new GlyphCollector(this.stage.probe);
    const first = await this.engrave(input, collector);
    if (!await this.fontLoader.ensure(collector.samples())) {
      return first();
    }
    this.stage.probe.forget();
    return (await this.engrave(input, this.stage.probe))();
  }
  async engrave(input, probe) {
    const document2 = await this.parser.parse(input);
    const decorations = new DefaultDecorations(this.stage);
    const progressive = this.config.progressive && this.config.layout.type === "standard" ? this.engraver.beginProgressive(document2, probe, this.stage, decorations, this.scheduler, this.stage) : null;
    if (progressive) {
      return () => {
        progressive.drawFirstScreen(this.stage);
        const score = this.score(progressive.elements, decorations, progressive.sequence, progressive.gaps, [], new ProgressiveRecording(progressive), progressive);
        progressive.start();
        return score;
      };
    }
    const engraved = this.engraver.engrave(document2, probe, this.stage, decorations);
    return () => {
      this.show(engraved.drawn.engraving, engraved.drawn.fold);
      return this.score(engraved.elements, decorations, engraved.sequence, engraved.gaps, engraved.drawn.pages, engraved.recording);
    };
  }
  restore(snapshot, read) {
    this.show(read.engraving, read.fold);
    const decorations = new DefaultDecorations(this.stage);
    const elements = this.elementFactory.build(read.elements, this.stage, decorations);
    const sequence = this.sequenceFactory.restore(read.sequence, elements.notes());
    return this.score(elements, decorations, sequence, snapshot.gaps.map((gap) => ({ ...gap })), read.pages, new StoredSnapshot(snapshot));
  }
  textOf(engraving) {
    const samples = new FontSamples;
    for (const op of engraving?.ops ?? []) {
      if (op.call.kind === "fillText" || op.call.kind === "strokeText") {
        samples.add(String(op.state.props.font), op.call.text);
      }
    }
    return samples.list();
  }
  show(engraving, fold) {
    if (engraving) {
      this.stage.engrave(engraving);
    }
    if (fold) {
      this.stage.setFold(fold);
    }
  }
  score(elements, decorations, sequence, gaps, pageRects, snapshots, drawing) {
    const systems = elements.systems();
    const pages = pageRects.map((rect, index) => new Page(index, rect, systems.filter((system) => system.rect.y >= rect.y && system.rect.y < rect.y + rect.h), this.stage));
    return new Score(this.stage, elements, decorations, sequence, this.stage.scroller, gaps, { pages, snapshots, drawing });
  }
}

// managed-layer.ts
var MAX_BITMAP_PX = 16384;

class ManagedLayer {
  kind;
  canvas;
  stage;
  zIndex;
  order;
  ctx;
  constructor(kind, canvas, stage, zIndex, order) {
    this.kind = kind;
    this.canvas = canvas;
    this.stage = stage;
    this.zIndex = zIndex;
    this.order = order;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("vexml: 2D context unavailable for layer");
    }
    this.ctx = ctx;
  }
  resize(cssWidth, cssHeight) {
    const dpr = this.stage.pixelRatio;
    const area = cssWidth * cssHeight;
    const scale = Math.min(dpr, area > 0 ? Math.sqrt(MAX_CANVAS_AREA / area) : dpr);
    const sx = Math.min(scale, cssWidth > 0 ? MAX_BITMAP_PX / cssWidth : dpr);
    const sy = Math.min(scale, cssHeight > 0 ? MAX_BITMAP_PX / cssHeight : dpr);
    this.canvas.width = Math.max(0, Math.round(cssWidth * sx));
    this.canvas.height = Math.max(0, Math.round(cssHeight * sy));
    this.canvas.style.width = `${cssWidth}px`;
    this.canvas.style.height = `${cssHeight}px`;
    this.ctx.setTransform(sx, 0, 0, sy, 0, 0);
  }
  place(left, top, width, height) {
    this.canvas.style.left = `${left}px`;
    this.canvas.style.top = `${top}px`;
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
  }
  dispose() {
    this.canvas.remove();
    this.canvas.width = 0;
    this.canvas.height = 0;
    this.stage.forget(this);
  }
}

// loupe-placement.ts
function placeLoupe(size, anchor, at, viewport) {
  const { width, height, gap } = size;
  const right = viewport.left + viewport.width;
  const bottom = viewport.top + viewport.height;
  const x = (value) => Math.max(viewport.left, Math.min(value, right - width));
  const y = (value) => Math.max(viewport.top, Math.min(value, bottom - height));
  const above = anchor.top - gap - height;
  if (above >= viewport.top) {
    return { left: x(at.x - width / 2), top: y(above) };
  }
  const top = y(at.y - height / 2);
  const rightOf = anchor.right + gap;
  if (rightOf + width <= right) {
    return { left: rightOf, top };
  }
  const leftOf = anchor.left - gap - width;
  if (leftOf >= viewport.left) {
    return { left: leftOf, top };
  }
  return { left: x(right - width), top };
}

// managed-loupe.ts
class ManagedLoupe {
  canvas;
  stage;
  opts;
  ctx;
  dpr = 0;
  paper = null;
  shown = null;
  frame = null;
  exit = null;
  constructor(canvas, stage, opts) {
    this.canvas = canvas;
    this.stage = stage;
    this.opts = opts;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("vexml: 2D context unavailable for loupe");
    }
    this.ctx = ctx;
    this.style();
  }
  show(anchor, at) {
    this.shown = { anchor, at };
    this.frame ??= requestAnimationFrame(() => this.paint());
  }
  hide() {
    this.shown = null;
    if (this.frame !== null) {
      cancelAnimationFrame(this.frame);
      this.frame = null;
    }
    if (this.paper === null) {
      return;
    }
    this.paper = null;
    const exit = this.animate(false);
    if (!exit) {
      this.close();
      return;
    }
    this.exit = exit;
    exit.onfinish = () => {
      this.exit = null;
      this.close();
    };
  }
  configure(opts) {
    this.opts = resolveLoupeOptions(this.opts, opts);
    this.style();
    this.dpr = 0;
    if (this.paper !== null) {
      this.paper = this.opts.paper ?? this.stage.paperColor();
    }
    if (this.shown) {
      this.frame ??= requestAnimationFrame(() => this.paint());
    }
  }
  dispose() {
    if (this.frame !== null) {
      cancelAnimationFrame(this.frame);
    }
    this.exit?.cancel();
    this.canvas.remove();
    this.canvas.width = 0;
    this.canvas.height = 0;
    this.stage.forgetLoupe(this);
  }
  paint() {
    this.frame = null;
    if (!this.shown) {
      return;
    }
    const { anchor, at } = this.shown;
    const center = at ?? {
      x: anchor.x + anchor.w / 2,
      y: anchor.y + anchor.h / 2
    };
    const { width, height, zoom, gap } = this.opts;
    const dpr = this.stage.pixelRatio;
    if (dpr !== this.dpr) {
      this.dpr = dpr;
      this.canvas.width = Math.round(width * dpr);
      this.canvas.height = Math.round(height * dpr);
    }
    const entering = this.paper === null;
    const paper = this.paper ?? this.opts.paper ?? this.stage.paperColor();
    if (entering) {
      this.paper = paper;
      this.exit?.cancel();
      this.exit = null;
      this.open();
    }
    const frame = this.stage.frame();
    const ctx = this.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.fillStyle = paper;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    const kx = dpr * zoom * frame.sx;
    const ky = dpr * zoom * frame.sy;
    const region = new Rect2(center.x - this.canvas.width / kx / 2, center.y - this.canvas.height / ky / 2, this.canvas.width / kx, this.canvas.height / ky);
    ctx.setTransform(kx, 0, 0, ky, -region.x * kx, -region.y * ky);
    this.stage.paintScore(ctx, region);
    const point = {
      x: frame.left + center.x * frame.sx,
      y: frame.top + center.y * frame.sy
    };
    const { left, top } = placeLoupe({ width, height, gap }, {
      left: frame.left + anchor.x * frame.sx,
      top: frame.top + anchor.y * frame.sy,
      right: frame.left + (anchor.x + anchor.w) * frame.sx
    }, point, visibleViewport());
    this.canvas.style.transform = `translate(${left}px, ${top}px)`;
    this.canvas.style.transformOrigin = `${point.x - left}px ${point.y - top}px`;
    if (entering) {
      this.animate(true);
    }
  }
  animate(entering) {
    if (typeof this.canvas.animate !== "function" || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      return null;
    }
    const small = { scale: String(LOUPE_MIN_SCALE), opacity: 0 };
    const full = { scale: "1", opacity: 1 };
    return this.canvas.animate(entering ? [small, full] : [full, small], {
      duration: entering ? LOUPE_ENTER_MS : LOUPE_EXIT_MS,
      easing: entering ? "ease-out" : "ease-in"
    });
  }
  open() {
    this.canvas.style.display = "";
    if (this.canvas.popover && !this.canvas.matches(":popover-open")) {
      this.canvas.showPopover();
    }
  }
  close() {
    this.canvas.style.display = "none";
    if (this.canvas.popover && this.canvas.matches(":popover-open")) {
      this.canvas.hidePopover();
    }
  }
  style() {
    const { width, height, radius } = this.opts;
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    this.canvas.style.borderRadius = `${radius}px`;
  }
}
function visibleViewport() {
  const visual = window.visualViewport;
  if (visual) {
    return {
      left: visual.offsetLeft,
      top: visual.offsetTop,
      width: visual.width,
      height: visual.height
    };
  }
  const doc = document.documentElement;
  return { left: 0, top: 0, width: doc.clientWidth, height: doc.clientHeight };
}

// managed-marker.ts
class ManagedMarker {
  el;
  frame;
  stage;
  zIndex;
  order;
  rect = null;
  color = "";
  radius = 0;
  size = "";
  corners = "";
  constructor(el, frame, stage, zIndex, order) {
    this.el = el;
    this.frame = frame;
    this.stage = stage;
    this.zIndex = zIndex;
    this.order = order;
  }
  show(rect, color, opts) {
    this.rect = rect;
    this.radius = opts?.radius ?? 0;
    if (color !== this.color) {
      this.color = color;
      this.el.style.backgroundColor = color;
    }
    this.el.style.display = "";
    this.apply();
  }
  hide() {
    this.rect = null;
    this.el.style.display = "none";
  }
  relayout(frame) {
    this.frame = frame;
    if (this.rect) {
      this.apply();
    }
  }
  paint(ctx) {
    const rect = this.rect;
    if (!rect) {
      return;
    }
    ctx.fillStyle = this.color;
    if (this.radius > 0) {
      ctx.beginPath();
      ctx.roundRect(rect.x, rect.y, rect.w, rect.h, this.radius);
      ctx.fill();
    } else {
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    }
  }
  dispose() {
    this.el.remove();
    this.stage.forgetMarker(this);
  }
  apply() {
    const rect = this.rect;
    if (!rect) {
      return;
    }
    const { left, top, sx, sy } = this.frame;
    const size = `${rect.w * sx}px ${rect.h * sy}px`;
    if (size !== this.size) {
      this.size = size;
      this.el.style.width = `${rect.w * sx}px`;
      this.el.style.height = `${rect.h * sy}px`;
    }
    const corners = this.radius > 0 ? `${this.radius * sx}px / ${this.radius * sy}px` : "";
    if (corners !== this.corners) {
      this.corners = corners;
      this.el.style.borderRadius = corners;
    }
    this.el.style.transform = `translate(${left + rect.x * sx}px, ${top + rect.y * sy}px)`;
  }
}

// ../core/time/duration.ts
class Duration {
  _ms;
  constructor(_ms) {
    this._ms = _ms;
  }
  static zero() {
    return new Duration(0);
  }
  static ms(ms) {
    return new Duration(ms);
  }
  static secs(secs) {
    return Duration.ms(secs * 1000);
  }
  static mins(mins) {
    return Duration.secs(mins * 60);
  }
  static hrs(hrs) {
    return Duration.mins(hrs * 60);
  }
  static days(days) {
    return Duration.hrs(days * 24);
  }
  static min(...durations) {
    return durations.reduce((min, duration) => duration.isLessThan(min) ? duration : min, Duration.ms(Number.POSITIVE_INFINITY));
  }
  static max(...durations) {
    return durations.reduce((max, duration) => duration.isGreaterThan(max) ? duration : max, Duration.ms(Number.NEGATIVE_INFINITY));
  }
  get ms() {
    return this._ms;
  }
  get secs() {
    return this._ms / 1000;
  }
  get mins() {
    return this.secs / 60;
  }
  get hrs() {
    return this.mins / 60;
  }
  isEqual(other) {
    return this._ms === other._ms;
  }
  isLessThan(other) {
    return this._ms < other._ms;
  }
  isGreaterThan(other) {
    return this._ms > other._ms;
  }
  isLessThanOrEqual(other) {
    return this._ms <= other._ms;
  }
  isGreaterThanOrEqual(other) {
    return this._ms >= other._ms;
  }
  add(other) {
    return new Duration(this._ms + other._ms);
  }
  subtract(other) {
    return new Duration(this._ms - other._ms);
  }
  multiply(factor) {
    return new Duration(this._ms * factor);
  }
  clamp(min, max) {
    return new Duration(Math.min(Math.max(this._ms, min._ms), max._ms));
  }
  negate() {
    return new Duration(-this._ms);
  }
  toString() {
    return `${this._ms}ms`;
  }
  human() {
    if (this._ms < 1000) {
      return `${Math.round(this._ms)}ms`;
    }
    if (this.secs < 60) {
      return `${this.secs.toFixed(1)}s`;
    }
    const mins = Math.floor(this.mins);
    return `${mins}m ${String(Math.round(this.secs - mins * 60)).padStart(2, "0")}s`;
  }
}

// ../core/time/clock/system-clock.ts
class SystemClock {
  now() {
    return Duration.ms(performance.now());
  }
}
// ../core/time/timer/system-timer.ts
class SystemTimer {
  setTimeout(callback, delay) {
    const id = setTimeout(callback, delay.ms);
    return disposables.callback(() => clearTimeout(id));
  }
  setInterval(callback, interval) {
    const id = setInterval(callback, interval.ms);
    return disposables.callback(() => clearInterval(id));
  }
}
// scroll-controller.ts
class ScrollController {
  host;
  timer;
  clock;
  tween = null;
  frameTimer = null;
  resizeSettleTimer = null;
  constructor(host, timer = new SystemTimer, clock = new SystemClock) {
    this.host = host;
    this.timer = timer;
    this.clock = clock;
  }
  suspendForResize() {
    if (!this.resizeSettleTimer) {
      this.cancel();
    }
    if (this.resizeSettleTimer) {
      this.resizeSettleTimer.dispose();
    }
    this.resizeSettleTimer = this.timer.setTimeout(() => {
      this.resizeSettleTimer = null;
    }, Duration.ms(RESIZE_SETTLE_MS));
  }
  scrollIntoView(rect, opts) {
    if (this.resizeSettleTimer) {
      return;
    }
    const { sx, sy } = this.host.frame();
    const base = this.host.baseOffset();
    const left = base.left + rect.x * sx;
    const top = base.top + rect.y * sy;
    const target = {
      left,
      top,
      right: left + rect.w * sx,
      bottom: top + rect.h * sy
    };
    const scroll = this.host.scroll;
    const block = opts?.block ?? "nearest";
    if (this.tween) {
      const destination = this.tween.to;
      const pending = this.scrollOffsetFor(target, destination, block);
      if (pending.left === destination.left && pending.top === destination.top) {
        return;
      }
    }
    const offset = this.scrollOffsetFor(target, scroll, block);
    if (offset.left === scroll.left && offset.top === scroll.top) {
      this.stopTween();
      return;
    }
    const behavior = opts?.behavior;
    if (behavior === "smooth" || behavior === "auto") {
      this.smoothScrollTo(offset);
    } else {
      this.stopTween();
      this.host.scrollTo({ ...offset, behavior });
    }
  }
  smoothScrollTo(offset) {
    const from = { ...this.host.scroll };
    const distance = Math.max(Math.abs(offset.left - from.left), Math.abs(offset.top - from.top));
    if (distance > MAX_SCROLL_SPEED_PX_PER_MS * SCROLL_DURATION_MS) {
      this.stopTween();
      this.host.scrollTo({ ...offset, behavior: "instant" });
      return;
    }
    this.tween = { from, to: offset, start: this.clock.now().ms };
    if (!this.frameTimer) {
      this.step();
    }
  }
  step() {
    if (!this.tween) {
      this.frameTimer = null;
      return;
    }
    const { from, to, start } = this.tween;
    const t = Math.min(1, (this.clock.now().ms - start) / SCROLL_DURATION_MS);
    this.host.scrollTo({
      left: from.left + (to.left - from.left) * t,
      top: from.top + (to.top - from.top) * t,
      behavior: "instant"
    });
    if (t >= 1) {
      this.tween = null;
      this.frameTimer = null;
      return;
    }
    this.frameTimer = this.timer.setTimeout(() => this.step(), Duration.ms(SCROLL_FRAME_MS));
  }
  stopTween() {
    if (this.frameTimer) {
      this.frameTimer.dispose();
      this.frameTimer = null;
    }
    this.tween = null;
  }
  cancel() {
    this.stopTween();
    const { left, top } = this.host.scroll;
    this.host.scrollTo({ left, top, behavior: "instant" });
  }
  dispose() {
    this.stopTween();
    if (this.resizeSettleTimer) {
      this.resizeSettleTimer.dispose();
      this.resizeSettleTimer = null;
    }
  }
  scrollOffsetFor(target, scroll, block) {
    const size = this.host.clientSize();
    const inset = this.host.leftInset();
    const view = {
      left: scroll.left + inset,
      top: scroll.top,
      right: scroll.left + size.width,
      bottom: scroll.top + size.height
    };
    const left = this.pageOffset(target.left, target.right, view.left, view.right, {
      padding: SCROLL_SIDE_PADDING_PX,
      align: "nearest"
    }) - inset;
    return {
      left: Math.max(0, left),
      top: this.pageOffset(target.top, target.bottom, view.top, view.bottom, {
        padding: SCROLL_TOP_PADDING_PX,
        align: block
      })
    };
  }
  pageOffset(start, end, viewStart, viewEnd, opts) {
    const { padding, align } = opts;
    if (start >= viewStart && end <= viewEnd) {
      return viewStart;
    }
    const size = viewEnd - viewStart;
    if (align === "start" || end - start > size) {
      return start - padding;
    }
    const inset = Math.min(padding, size - (end - start));
    return start < viewStart ? end + inset - size : start - inset;
  }
}

// tiled-layer.ts
class TiledLayer {
  kind;
  element;
  surface;
  ctx;
  owner;
  zIndex;
  order;
  constructor(kind, element, surface, ctx, owner, zIndex, order) {
    this.kind = kind;
    this.element = element;
    this.surface = surface;
    this.ctx = ctx;
    this.owner = owner;
    this.zIndex = zIndex;
    this.order = order;
  }
  place(left, top, width, height) {
    const style = this.element.style;
    style.left = `${left}px`;
    style.top = `${top}px`;
    style.width = `${width}px`;
    style.height = `${height}px`;
    this.surface.fit(width, height);
  }
  dispose() {
    this.surface.dispose();
    this.element.remove();
    this.owner.forget(this);
  }
}

// stage.ts
class Stage {
  container;
  static byContainer = new WeakMap;
  base;
  probe;
  engraving;
  view = null;
  viewRequest = null;
  scrollElement;
  dispatcher = new Dispatcher;
  events = this.dispatcher.events;
  resizeObserver;
  onWindowScroll = () => {
    if (this.scrollElement !== this.container) {
      for (const layer of this.layers) {
        if (layer.kind === "viewport") {
          this.placeLayer(layer);
        }
      }
    }
    this.updateFold();
    this.requestView();
    this.dispatcher.dispatch("scroll");
  };
  onWindowResize = () => {
    this.requestView();
  };
  box;
  layers = new Set;
  markers = new Set;
  loupes = new Set;
  overlays = 0;
  scrollController = null;
  fold = null;
  backgroundColor;
  fixedPixelRatio;
  ink;
  scale = 1;
  disposer = new Disposer;
  constructor(container, scroll) {
    this.container = container;
    Stage.byContainer.get(container)?.dispose();
    Stage.byContainer.set(container, this);
    this.disposer.defer(() => {
      if (Stage.byContainer.get(this.container) === this) {
        Stage.byContainer.delete(this.container);
      }
    });
    this.scrollElement = scroll.scrollContainer ?? container;
    this.backgroundColor = scroll.backgroundColor ?? null;
    this.fixedPixelRatio = scroll.pixelRatio ?? null;
    this.ink = scroll.ink ?? Ink.DEFAULT;
    this.box = ScoreBox.open(container, scroll);
    this.base = this.box.base;
    this.disposer.use(this.box);
    this.probe = new CanvasPaintProbe(scratchContext());
    this.engraving = new TiledSurface(this.base, {
      ...surfaceOptions(this.pixelRatio),
      ink: this.ink
    });
    this.disposer.use(this.engraving);
    this.disposer.defer(() => this.clearFold());
    this.disposer.defer(() => {
      for (const loupe of [...this.loupes]) {
        loupe.dispose();
      }
    });
    this.disposer.defer(() => {
      for (const marker of [...this.markers]) {
        marker.dispose();
      }
    });
    this.disposer.defer(() => {
      for (const layer of [...this.layers]) {
        layer.dispose();
      }
    });
    this.disposer.defer(() => this.scrollController?.dispose());
    this.disposer.use(this.dispatcher);
    this.resizeObserver = new ResizeObserver(() => {
      this.dispatcher.dispatch("resize", {
        width: this.scrollElement.clientWidth,
        height: this.scrollElement.clientHeight
      });
    });
    this.resizeObserver.observe(container);
    this.resizeObserver.observe(this.base);
    if (this.scrollElement !== container) {
      this.resizeObserver.observe(this.scrollElement);
    }
    this.disposer.defer(() => this.resizeObserver.disconnect());
    window.addEventListener("scroll", this.onWindowScroll, {
      capture: true,
      passive: true
    });
    window.addEventListener("resize", this.onWindowResize);
    this.disposer.defer(() => {
      window.removeEventListener("scroll", this.onWindowScroll, {
        capture: true
      });
      window.removeEventListener("resize", this.onWindowResize);
    });
    this.disposer.defer(() => {
      if (this.viewRequest !== null) {
        cancelAnimationFrame(this.viewRequest);
        this.viewRequest = null;
      }
    });
  }
  setMaxHeight(px) {
    this.box.setStyle("max-height", px == null ? "" : `${px}px`);
    if (px != null) {
      this.box.setStyle("overflow-y", "auto");
    }
  }
  clientRectOf(rect) {
    const { left, top, sx, sy } = this.frame();
    return new DOMRect(left + rect.x * sx, top + rect.y * sy, rect.w * sx, rect.h * sy);
  }
  toScoreSpace(clientX, clientY) {
    const { left, top, sx, sy } = this.frame();
    return { x: (clientX - left) / sx, y: (clientY - top) / sy };
  }
  get dom() {
    return this.container;
  }
  get scrollTarget() {
    return this.scrollElement;
  }
  get scroll() {
    return {
      left: this.scrollElement.scrollLeft,
      top: this.scrollElement.scrollTop
    };
  }
  viewportRect() {
    const box = this.scrollElement.getBoundingClientRect();
    const inset = this.fold ? this.scrollElement.clientLeft + this.leftInset() : 0;
    return new DOMRect(box.left + inset, box.top, Math.max(0, box.width - inset), box.height);
  }
  leftInset() {
    return this.fold ? this.fold.pad + this.fold.fold.width * this.frame().sx : 0;
  }
  obscures(clientX, clientY) {
    if (!this.fold?.shown) {
      return false;
    }
    const r = this.fold.element.getBoundingClientRect();
    return clientX >= r.left && clientX < r.right && clientY >= r.top && clientY < r.bottom;
  }
  setFold(fold) {
    this.clearFold();
    const track = document.createElement("div");
    track.className = "vexml-fold-track";
    track.style.display = "flex";
    track.style.alignItems = "flex-start";
    track.style.width = "max-content";
    const element = document.createElement("div");
    element.className = "vexml-fold";
    element.style.position = "sticky";
    element.style.left = "0";
    element.style.zIndex = "1";
    element.style.flex = "none";
    element.style.boxSizing = "content-box";
    element.style.pointerEvents = "none";
    element.style.visibility = "hidden";
    element.style.backgroundColor = `var(--vexml-fold-background, ${this.paperColor()})`;
    const canvas = document.createElement("canvas");
    canvas.style.display = "block";
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    const shadow = document.createElement("div");
    shadow.className = "vexml-fold-shadow";
    shadow.style.position = "absolute";
    shadow.style.top = "0";
    shadow.style.bottom = "0";
    shadow.style.left = "100%";
    shadow.style.width = `var(--vexml-fold-shadow-width, ${FOLD_SHADOW_WIDTH}px)`;
    shadow.style.background = "var(--vexml-fold-shadow, linear-gradient(to right, rgba(0, 0, 0, 0.14), rgba(0, 0, 0, 0)))";
    element.append(canvas, shadow);
    this.container.insertBefore(track, this.base);
    track.append(element, this.base);
    this.fold = {
      fold,
      track,
      element,
      canvas,
      index: -1,
      shown: false,
      pad: 0
    };
    this.placeFold();
  }
  get pixelRatio() {
    return this.fixedPixelRatio ?? (window.devicePixelRatio || 1);
  }
  get scroller() {
    this.scrollController ??= new ScrollController(this);
    return this.scrollController;
  }
  baseOffset() {
    if (this.scrollElement === this.container) {
      return { left: this.base.offsetLeft, top: this.base.offsetTop };
    }
    const base = this.base.getBoundingClientRect();
    const el = this.scrollElement;
    const box = el.getBoundingClientRect();
    return {
      left: base.left - box.left - el.clientLeft + el.scrollLeft,
      top: base.top - box.top - el.clientTop + el.scrollTop
    };
  }
  clientSize() {
    return {
      width: this.scrollElement.clientWidth,
      height: this.scrollElement.clientHeight
    };
  }
  scrollTo(opts) {
    this.scrollElement.scrollTo(opts);
  }
  createLayer(kind, zIndex) {
    const element = document.createElement(kind === "viewport" ? "canvas" : "div");
    element.className = "vexml-layer";
    element.style.position = "absolute";
    element.style.pointerEvents = "none";
    const z = zIndex ?? (kind === "background" ? -1 : undefined);
    if (z !== undefined) {
      element.style.zIndex = String(z);
    }
    const layer = element instanceof HTMLCanvasElement ? new ManagedLayer(kind, element, this, z ?? 0, this.overlays++) : this.tiledLayer(kind, element, z ?? 0);
    this.container.appendChild(element);
    this.layers.add(layer);
    this.sizeBitmap(layer);
    this.placeLayer(layer);
    if (layer instanceof TiledLayer && this.view) {
      layer.surface.show(this.view);
    }
    return layer;
  }
  tiledLayer(kind, element, zIndex) {
    const surface = new TiledSurface(element, surfaceOptions(this.pixelRatio * this.scale));
    return new TiledLayer(kind, element, surface, new PaintContext(surface, this.probe, element), this, zIndex, this.overlays++);
  }
  shown = null;
  engrave(engraving) {
    const { ops, width, height, origin, scale, fingerprint } = engraving;
    this.shown = { width, height, origin };
    this.box.size(width, height, scale);
    this.scale = scale;
    const dpr = this.pixelRatio * scale;
    this.engraving.rescale(dpr);
    const painted = this.box.takePainted();
    if (painted && fingerprint && painted.key === ScoreBox.paintKey(fingerprint, dpr, this.ink)) {
      this.engraving.adopt(painted.plane);
    }
    this.engraving.load(ops, width, height, {
      x: Math.round(origin.x * dpr) / dpr,
      y: -Math.round(-origin.y * dpr) / dpr
    });
    this.growLayers();
    this.fitEngraving();
    this.updateView();
    painted?.plane.remove();
  }
  extendEngraving(engraving, from) {
    const { ops, width, height, origin, scale } = engraving;
    const { shown } = this;
    if (!shown || shown.width !== width || shown.origin.x !== origin.x || shown.origin.y !== origin.y || height < shown.height) {
      this.engrave(engraving);
      return;
    }
    if (height !== shown.height) {
      shown.height = height;
      this.box.size(width, height, scale);
      this.engraving.grow(height);
      this.growLayers();
    }
    for (let i = from;i < ops.length; i++) {
      const op = ops[i];
      if (op) {
        this.engraving.paint(op);
      }
    }
    this.fitEngraving();
    this.updateView();
  }
  visibleBottom() {
    const port = this.viewportRect();
    return this.toScoreSpace(0, Math.min(port.bottom, window.innerHeight)).y;
  }
  createMarker(zIndex) {
    const el = document.createElement("div");
    el.className = "vexml-marker";
    el.style.position = "absolute";
    el.style.left = "0";
    el.style.top = "0";
    el.style.pointerEvents = "none";
    el.style.willChange = "transform";
    if (zIndex !== undefined) {
      el.style.zIndex = String(zIndex);
    }
    const marker = new ManagedMarker(el, this.markerFrame(), this, zIndex ?? 0, this.overlays++);
    this.container.appendChild(el);
    this.markers.add(marker);
    return marker;
  }
  createLoupe(opts) {
    const canvas = document.createElement("canvas");
    canvas.className = "vexml-loupe";
    if ("popover" in canvas) {
      canvas.popover = "manual";
      canvas.style.margin = "0";
      canvas.style.padding = "0";
      canvas.style.border = "none";
      canvas.style.background = "transparent";
    }
    canvas.style.position = "fixed";
    canvas.style.inset = "0 auto auto 0";
    canvas.style.zIndex = "2147483647";
    canvas.style.pointerEvents = "none";
    canvas.style.willChange = "transform";
    canvas.style.display = "none";
    canvas.style.boxShadow = "0 2px 12px rgba(0, 0, 0, 0.3)";
    const loupe = new ManagedLoupe(canvas, this, opts);
    document.body.appendChild(canvas);
    this.loupes.add(loupe);
    return loupe;
  }
  paintScore(ctx, region) {
    const overlays = [...this.markers];
    for (const layer of this.layers) {
      if (layer instanceof TiledLayer) {
        overlays.push(layer);
      }
    }
    overlays.sort((a, b) => a.zIndex - b.zIndex || a.order - b.order);
    const paint = (overlay) => {
      if (overlay instanceof ManagedMarker) {
        overlay.paint(ctx);
      } else {
        overlay.surface.paintInto(ctx, region);
      }
    };
    let behind = true;
    for (const overlay of overlays) {
      if (behind && overlay.zIndex >= 0) {
        behind = false;
        this.engraving.paintInto(ctx, region);
      }
      paint(overlay);
    }
    if (behind) {
      this.engraving.paintInto(ctx, region);
    }
  }
  paintEngraving(ctx, region, scale) {
    if (this.disposer.disposed) {
      throw new Error("vexml: the score was disposed");
    }
    this.engraving.paintInto(ctx, region, scale);
  }
  relayoutLayers() {
    this.placeFold();
    this.fitEngraving();
    if (this.markers.size > 0) {
      const frame = this.markerFrame();
      for (const marker of this.markers) {
        marker.relayout(frame);
      }
    }
    for (const layer of this.layers) {
      if (layer.kind === "viewport") {
        this.sizeBitmap(layer);
      }
      this.placeLayer(layer);
    }
    this.updateView();
  }
  forget(layer) {
    this.layers.delete(layer);
  }
  forgetMarker(marker) {
    this.markers.delete(marker);
  }
  forgetLoupe(loupe) {
    this.loupes.delete(loupe);
  }
  dispose() {
    this.disposer.dispose();
  }
  placeFold() {
    if (!this.fold) {
      return;
    }
    const { fold, element, canvas } = this.fold;
    const { sx, sy } = this.frame();
    const pad = parseFloat(getComputedStyle(this.scrollElement).paddingLeft) || 0;
    this.fold.pad = pad;
    const box = getComputedStyle(this.container);
    const top = parseFloat(box.paddingTop) || 0;
    const bottom = Math.max(parseFloat(box.paddingBottom) || 0, this.container.clientHeight - top - fold.height * sy);
    element.style.left = `${-pad}px`;
    element.style.paddingLeft = `${pad}px`;
    element.style.paddingTop = `${top}px`;
    element.style.marginTop = `${-top}px`;
    element.style.paddingBottom = `${bottom}px`;
    element.style.marginBottom = `${-bottom}px`;
    element.style.width = `${fold.width * sx}px`;
    element.style.height = `${fold.height * sy}px`;
    element.style.marginLeft = `${fold.left * sx - pad}px`;
    element.style.marginRight = `${-(fold.left + fold.width) * sx}px`;
    const dpr = this.pixelRatio;
    canvas.width = Math.round(fold.width * sx * dpr);
    canvas.height = Math.round(fold.height * sy * dpr);
    this.fold.index = -1;
    this.updateFold();
  }
  updateFold() {
    if (!this.fold) {
      return;
    }
    const { fold, element, canvas } = this.fold;
    const el = this.scrollElement;
    const edge = el.getBoundingClientRect().left + el.clientLeft;
    const { left, sx } = this.frame();
    const pad = this.fold.pad;
    const shown = left + fold.left * sx - pad < edge - 0.5;
    if (shown !== this.fold.shown) {
      this.fold.shown = shown;
      element.style.visibility = shown ? "visible" : "hidden";
    }
    if (!shown) {
      return;
    }
    const index = fold.indexAt((edge + pad - left) / sx + fold.width);
    if (index === this.fold.index) {
      return;
    }
    this.fold.index = index;
    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, canvas.width, canvas.height);
    const kx = canvas.width / fold.width;
    const ky = canvas.height / fold.height;
    const strip = new PaintList;
    fold.paint(new PaintContext(strip, this.probe, null), index);
    const replayer = new PaintReplayer(context, new Affine(kx, 0, 0, ky, -fold.left * kx, 0), { scale: kx, device: null }, { ink: this.ink });
    for (const op of strip.ops) {
      replayer.replay(op);
    }
    replayer.finish();
  }
  clearFold() {
    if (!this.fold) {
      return;
    }
    const { track, canvas } = this.fold;
    if (track.parentNode) {
      track.replaceWith(this.base);
    }
    canvas.width = 0;
    canvas.height = 0;
    this.fold = null;
  }
  paperColor() {
    if (this.backgroundColor && !isClear(this.backgroundColor)) {
      return this.backgroundColor;
    }
    for (let el = this.container;el; el = el.parentElement) {
      const color = getComputedStyle(el).backgroundColor;
      if (color && !isClear(color)) {
        return color;
      }
    }
    return "#ffffff";
  }
  sizeBitmap(layer) {
    if (layer instanceof TiledLayer) {
      const { width, height } = this.intrinsicSize();
      layer.surface.resize(width, height);
    } else {
      layer.resize(this.scrollElement.clientWidth, this.scrollElement.clientHeight);
    }
  }
  intrinsicSize() {
    const style = this.base.style;
    return {
      width: parseFloat(style.getPropertyValue("--vexml-width")) || 0,
      height: parseFloat(style.getPropertyValue("--vexml-height")) || 0
    };
  }
  placeLayer(layer) {
    const left = this.base.offsetLeft;
    const top = this.base.offsetTop;
    if (layer.kind !== "viewport") {
      const { width, height } = this.renderedSize();
      layer.place(left, top, width, height);
    } else if (this.scrollElement === this.container) {
      layer.place(left, top, this.container.clientWidth, this.container.clientHeight);
    } else {
      const el = this.scrollElement;
      const view = el.getBoundingClientRect();
      const box = this.container.getBoundingClientRect();
      layer.place(view.left + el.clientLeft - box.left - this.container.clientLeft, view.top + el.clientTop - box.top - this.container.clientTop, el.clientWidth, el.clientHeight);
    }
  }
  markerFrame() {
    const { width, height } = this.intrinsicSize();
    const shown = this.renderedSize();
    return {
      left: this.base.offsetLeft,
      top: this.base.offsetTop,
      sx: width > 0 ? shown.width / width : 1,
      sy: height > 0 ? shown.height / height : 1
    };
  }
  frame() {
    const r = this.base.getBoundingClientRect();
    const intrinsic = this.intrinsicSize();
    const w = intrinsic.width || r.width || 1;
    const h = intrinsic.height || r.height || 1;
    return { left: r.left, top: r.top, sx: r.width / w, sy: r.height / h };
  }
  updateView() {
    const { left, top, sx, sy } = this.frame();
    const port = this.viewportRect();
    const x0 = Math.max(port.left, 0);
    const y0 = Math.max(port.top, 0);
    const w = Math.max(0, Math.min(port.right, window.innerWidth) - x0);
    const h = Math.max(0, Math.min(port.bottom, window.innerHeight) - y0);
    this.view = sx > 0 && sy > 0 ? new Rect2((x0 - w - left) / sx, (y0 - h - top) / sy, 3 * w / sx, 3 * h / sy) : Rect2.zero();
    this.engraving.show(this.view);
    for (const layer of this.layers) {
      if (layer instanceof TiledLayer) {
        layer.surface.show(this.view);
      }
    }
  }
  growLayers() {
    const { height } = this.intrinsicSize();
    for (const layer of this.layers) {
      if (layer instanceof TiledLayer && layer.kind !== "viewport") {
        layer.surface.grow(height);
      }
    }
  }
  fitEngraving() {
    const { width, height } = this.renderedSize();
    this.engraving.fit(width, height);
  }
  renderedSize() {
    return this.box.renderedSize();
  }
  requestView() {
    this.viewRequest ??= requestAnimationFrame(() => {
      this.viewRequest = null;
      this.updateView();
    });
  }
}
function surfaceOptions(scale) {
  return {
    scale,
    tileSize: TILE_SIZE,
    budget: TILE_BUDGET
  };
}
function scratchContext() {
  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("vexml: 2D context unavailable");
  }
  return ctx;
}
var probe = null;
function isClear(color) {
  if (!probe) {
    const canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;
    probe = canvas.getContext("2d", { willReadFrequently: true });
    if (!probe) {
      return false;
    }
  }
  probe.clearRect(0, 0, 1, 1);
  probe.fillStyle = "transparent";
  probe.fillStyle = color;
  probe.fillRect(0, 0, 1, 1);
  return probe.getImageData(0, 0, 1, 1).data[3] === 0;
}

// render.ts
function render(input, container, config) {
  const resolved = resolveConfig(config);
  const reader = new ScoreReader(new DynamicGlyphs);
  const gaps = new Gaps(resolved.gaps, new GapInserter(reader));
  if (SnapshotReader.isSnapshot(input)) {
    new SnapshotReader(resolved).check(input);
  } else {
    gaps.check(input);
  }
  const fit = resolved.layout.type !== "panoramic" && resolved.width == null && resolved.maxWidth == null;
  const stage = new Stage(container, {
    height: resolved.height,
    maxHeight: resolved.maxHeight,
    width: resolved.width,
    maxWidth: resolved.maxWidth,
    backgroundColor: resolved.backgroundColor,
    pixelRatio: resolved.pixelRatio,
    fit,
    scrollContainer: resolved.scrollContainer,
    ink: new Ink(resolved.fonts.notation?.color ?? null, resolved.fonts.text?.color ?? null)
  });
  const elements = new ElementFactory;
  const sequences = new SequenceFactory(reader, gaps);
  return new ScoreRenderer(resolved, stage, new DefaultFontLoader([
    { url: BRAVURA_COMMON_URL, unicodeRange: BRAVURA_COMMON_RANGE },
    { url: BRAVURA_URL, unicodeRange: BRAVURA_REST_RANGE }
  ]), new DefaultScoreParser, ScoreEngraver.create(resolved, reader, gaps, elements, sequences), elements, sequences, new BrowserIdleScheduler).render(input);
}
export {
  BRAVURA_COMMON_RANGE,
  BRAVURA_REST_RANGE,
  Barline2 as Barline,
  ChordDiagram2 as ChordDiagram,
  ChordNoteOrder,
  CursorController,
  DefaultEditingBindings,
  EditingController,
  EditingNavigator,
  EditingSession,
  Element2 as Element,
  Measure2 as Measure,
  MeasureBox2 as MeasureBox,
  Note2 as Note,
  Page,
  Part2 as Part,
  Playhead,
  Rect2 as Rect,
  SNAPSHOT_VERSION2 as SNAPSHOT_VERSION,
  Score,
  ScoreEditingLayout,
  SelectionOverlay,
  Sequence2 as Sequence,
  SnapshotMismatchError2 as SnapshotMismatchError,
  Stave2 as Stave,
  System2 as System,
  TabPosition2 as TabPosition,
  Timeline2 as Timeline,
  Voice2 as Voice,
  insertGaps,
  isHighlightable2 as isHighlightable,
  isPlayable2 as isPlayable,
  readTimeline,
  render
};
