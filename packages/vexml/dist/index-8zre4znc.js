import {
  Rect2,
  QuadTree,
  DEFAULT_WIDTH,
  PAGE_MARGIN_X,
  FOLD_PADDING,
  PAGE_MARGIN_TOP,
  PAGE_MARGIN_TOP_WITH_TEMPO,
  PAGE_MARGIN_BOTTOM,
  PEDAL_BOTTOM_TEXT_LINE,
  PEDAL_BOTTOM_MARGIN,
  PEDAL_INK_RISE,
  SYSTEM_GAP,
  INTRA_PART_SPACING,
  INTER_PART_SPACING,
  STAVE_CLEARANCE,
  SPILL_COLUMN,
  BASE_VOICE_WIDTH,
  QUARTER_NOTE_TICKS,
  LOG_SPACING_RATIO,
  MIN_LOG_FACTOR,
  LEAD_BARLINE,
  LEAD_CLEF,
  LEAD_CLEF_CHANGE,
  LEAD_KEY,
  LEAD_TIME,
  LABEL_GAP,
  LABEL_CHAR_WIDTH,
  HEADER_TITLE_SIZE,
  HEADER_SUBTITLE_SIZE,
  HEADER_CREDIT_SIZE,
  HEADER_SYMBOL_SIZE,
  HEADER_FOOTER_SIZE,
  FOOTER_GAP,
  HEADER_GAP,
  LABEL_FONT_SIZE,
  GAP_LABEL_FONT_SIZE,
  TAB_MIN_NOTE_SPACING,
  TUPLET_MIN_GROUP_WIDTH,
  TAB_LINE_DISTANCE,
  TAB_FRET_SCALE,
  GRACE_SPACING,
  TAB_GRACE_SCALE,
  TAB_GRACE_SPACING,
  TAB_CURVE_Y_SHIFT,
  TAB_CURVE_CP_Y,
  TAB_CURVE_RISE,
  TAB_CURVE_FULL_WIDTH,
  TAB_CURVE_LINE_CLEARANCE,
  SLIDE_MIN_SLANT,
  SLIDE_PADDING,
  SINGLE_SLIDE_LEN,
  SINGLE_SLIDE_RISE,
  SINGLE_SLIDE_GAP,
  BRACKET_X_SHIFT,
  PART_GROUP_STEP,
  BRACKET_GLYPH_OVERHANG,
  CONNECTOR_VERTICAL_OVERHANG,
  BRACE_LEFT_OVERHANG,
  HARMONY_FONT_SIZE,
  HARMONY_Y_OFFSET,
  HARMONY_NOTE_CLEARANCE,
  HARMONY_PADDING,
  TIE_APEX_RISE,
  CHORD_DIAGRAM_WIDTH,
  CHORD_DIAGRAM_HEIGHT,
  CHORD_DIAGRAM_GAP,
  CHORD_DIAGRAM_PADDING,
  WORDS_FONT_SIZE,
  WORDS_Y_OFFSET,
  WORDS_CHAR_WIDTH,
  WORDS_NOTE_CLEARANCE,
  DYNAMICS_FONT_SIZE,
  PICTOGRAM_FONT_SIZE,
  ACCORDION_REGISTRATION_SIZE,
  NAVIGATION_FONT_SIZE,
  BARLINE_FERMATA_FONT_SIZE,
  BARLINE_FERMATA_INK_HEIGHT,
  NAVIGATION_TEXT_GAP,
  HAIRPIN_HEIGHT,
  HAIRPIN_CHAIN_GAP,
  HAIRPIN_DYNAMIC_GAP,
  HAIRPIN_NIENTE_RADIUS,
  HAIRPIN_STAVE_GAP,
  LYRIC_FONT_SIZE,
  LYRIC_PADDING,
  LYRIC_Y_OFFSET,
  LYRIC_NOTE_CLEARANCE,
  LYRIC_LINE_HEIGHT,
  FINGERING_FONT_SIZE,
  STRING_NUMBER_FONT_SIZE,
  STRING_NUMBER_RADIUS,
  STRING_NUMBER_RING_WIDTH,
  STRING_NUMBER_DIGIT_RISE,
  TECHNICAL_ROW_GAP,
  TECHNICAL_EDGE_GAP,
  TUPLET_NESTING_EXTRA_GAP,
  TUPLET_NUMERAL_HALF_HEIGHT,
  REHEARSAL_FONT_SIZE,
  REHEARSAL_PADDING,
  ENCLOSURE_PADDING,
  ENCLOSED_BASELINE,
  UNDERLINE_OFFSET,
  UNDERLINE_GAP,
  REHEARSAL_Y_OFFSET,
  REHEARSAL_NOTE_CLEARANCE,
  TEMPO_NOTE_CLEARANCE,
  TEMPO_SCALE,
  TEMPO_MARK_GAP,
  DEFAULT_TEMPO_BPM,
  LEDGER_HEADROOM,
  SLUR_Y_SHIFT,
  SLUR_TIE_GAP,
  SLUR_MARGIN,
  SLUR_ACCIDENTAL_GAP,
  SLUR_MARK_GAP,
  SLUR_BOW_MIN,
  SLUR_BOW_FLAT_WIDTH,
  SLUR_BOW_GROWTH,
  SLUR_BOW_MAX,
  SLUR_BOW_ASPECT,
  SLUR_SHOULDER,
  SLUR_MAX_CP_Y,
  SLUR_MIN_SHOULDER,
  SLUR_END_ZONE,
  SLUR_MAX_ASPECT,
  SLUR_STEM_TIP_SLANT,
  SLUR_GRACE_Y_SHIFT,
  SLUR_GRACE_CP_Y,
  SLUR_GRACE_MARGIN,
  SLUR_GHOST_STEEPNESS,
  SLUR_GHOST_OVERLAP,
  SLUR_GHOST_MAX_BETWEEN,
  SLUR_GRACE_ANCHOR,
  GRACE_START,
  EPSILON,
  HARMONY_ACCIDENTALS,
  HARMONY_ACCIDENTAL_KERN,
  HARMONY_ACCIDENTAL_FONT_SIZE,
  HARMONY_STACK_FONT_SIZE,
  HARMONY_STACK_LINE,
  GRACE_GROUP_SPACING_STAVE,
  NOTEHEAD_HALF_H,
  FRET_HALF_W,
  FRET_HALF_H,
  FAR,
  BAR_WIDTH,
  DEFAULT_TUNING,
  VOLTA_STAVE_GAP,
  DIRECTION_LINE_TEXT_LINE,
  OTTAVA_TEXT_LINE,
  DIRECTION_LINE_HOOK,
  MULTI_REST_PADDING,
  MULTI_REST_MIN_WIDTH,
  VOLTA_NOTE_CLEARANCE,
  VOLTA_LABEL_DROP,
  UNICODE_RANGE,
  Ink,
  Affine,
  PaintState,
  PAINT_PROPS,
  PaintEncoder,
  SNAPSHOT_VERSION2,
  SNAPSHOT_FORMAT,
  PaintReplayer
} from "./index-6pn8cpem.js";

// element.ts
function isHighlightable2(el) {
  return "color" in el && "halo" in el;
}
function isPlayable2(el) {
  return "getPitch" in el;
}

class Element2 {
  box;
  viewport;
  constructor(box, viewport) {
    this.box = box;
    this.viewport = viewport;
  }
  get rect() {
    return this.box;
  }
  relocate(rect) {
    this.box = rect;
  }
  drawColor(ctx, color) {
    const r = this.rect;
    ctx.save();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(r.x + r.w / 2, r.y + r.h / 2, r.w / 2, r.h / 2, 0, 0, 2 * Math.PI);
    ctx.fill();
    ctx.restore();
  }
  getBoundingClientRect() {
    return this.viewport.clientRectOf(this.rect);
  }
  stampGlyph(ctx, glyph, color) {
    ctx.save();
    ctx.fillStyle = color;
    ctx.font = glyph.font;
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.strokeStyle = color;
    ctx.lineWidth = 0.5;
    ctx.lineJoin = "round";
    if (glyph.outline) {
      ctx.beginPath();
      glyph.outline.trace(ctx, glyph.x, glyph.y);
      ctx.stroke();
      ctx.fill();
    } else {
      ctx.strokeText(glyph.text, glyph.x, glyph.y);
      ctx.fillText(glyph.text, glyph.x, glyph.y);
    }
    ctx.restore();
  }
}

// barline.ts
class Barline2 extends Element2 {
  measure;
  location;
  source;
  type = "barline";
  constructor(rect, viewport, measure, location, source) {
    super(rect, viewport);
    this.measure = measure;
    this.location = location;
    this.source = source;
  }
  getMeasure() {
    return this.measure;
  }
  getLocation() {
    return this.location;
  }
  getSources() {
    return this.source ? [this.source] : [];
  }
}

// toggle.ts
class Toggle {
  target;
  decoration;
  constructor(target, decoration) {
    this.target = target;
    this.decoration = decoration;
  }
  on(color) {
    this.decoration.set(this.target, color);
  }
  off() {
    this.decoration.set(this.target, null);
  }
  get active() {
    return this.decoration.has(this.target);
  }
}

// chord-diagram.ts
class ChordDiagram2 extends Element2 {
  opts;
  type = "chord-diagram";
  color;
  halo;
  constructor(rect, viewport, opts) {
    super(rect, viewport);
    this.opts = opts;
    this.color = new Toggle(this, opts.decorations.color);
    this.halo = new Toggle(this, opts.decorations.halo);
  }
  getSources() {
    return this.opts.source ? [this.opts.source] : [];
  }
  getTitle() {
    return this.opts.title;
  }
  getFrame() {
    return this.opts.frame;
  }
}

// ../core/events/dispatcher.ts
class Dispatcher {
  events = this;
  scopedEntries = new Map;
  universalEntries = [];
  nextId = 0;
  nextOrder = 0;
  on(type, listener, opts) {
    const id = this.nextId++;
    const entries = this.scopedEntries.get(type) ?? [];
    entries.push({
      kind: "scoped",
      listener,
      once: opts?.once ?? false,
      id,
      order: this.nextOrder++
    });
    this.scopedEntries.set(type, entries);
    return () => this.off(id);
  }
  all(typeListener, opts) {
    const id = this.nextId++;
    this.universalEntries.push({
      kind: "universal",
      typeListener,
      once: opts?.once ?? false,
      id,
      order: this.nextOrder++
    });
    return () => this.off(id);
  }
  dispatch(type, ...args) {
    const entries = [
      ...this.scopedEntries.get(type) ?? [],
      ...this.universalEntries
    ].sort((left, right) => left.order - right.order);
    const event = args[0];
    for (const entry of entries) {
      if (entry.kind === "scoped") {
        entry.listener(event);
      } else {
        entry.typeListener(type, event);
      }
      if (entry.once) {
        this.off(entry.id);
      }
    }
  }
  dispose() {
    this.scopedEntries.clear();
    this.universalEntries.length = 0;
  }
  off(id) {
    for (const [type, entries] of this.scopedEntries) {
      const kept = entries.filter((entry) => entry.id !== id);
      if (kept.length !== entries.length) {
        this.scopedEntries.set(type, kept);
      }
    }
    this.universalEntries = this.universalEntries.filter((entry) => entry.id !== id);
  }
}
// stave.ts
class Stave2 {
  number;
  lines;
  left;
  right;
  noteStartX;
  keyAccidentals;
  constructor(number, lines, left, right, noteStartX, keyAccidentals) {
    this.number = number;
    this.lines = lines;
    this.left = left;
    this.right = right;
    this.noteStartX = noteStartX;
    this.keyAccidentals = keyAccidentals;
  }
  getNumber() {
    return this.number;
  }
  getLineYs() {
    return [...this.lines];
  }
  getRect() {
    const top = this.lines[0] ?? 0;
    const bottom = this.lines[this.lines.length - 1] ?? top;
    return new Rect2(this.left, top, this.right - this.left, bottom - top);
  }
  getNoteStartX() {
    return this.noteStartX;
  }
  getKeyAccidentals() {
    return this.keyAccidentals.map(({ step, alter, x, y, w, h }) => ({
      step,
      alter,
      rect: new Rect2(x, y, w, h)
    }));
  }
}

// measure.ts
class Measure2 extends Element2 {
  source;
  number;
  index;
  part;
  column;
  voiceList;
  staveList;
  type = "measure";
  constructor(rect, viewport, source, number, index, part, column, voiceList, staveList) {
    super(rect, viewport);
    this.source = source;
    this.number = number;
    this.index = index;
    this.part = part;
    this.column = column;
    this.voiceList = voiceList;
    this.staveList = staveList;
  }
  getSources() {
    return this.source ? [this.source] : [];
  }
  getNumber() {
    return this.number;
  }
  getIndex() {
    return this.index;
  }
  getPart() {
    return this.part;
  }
  getBox() {
    return this.column;
  }
  getVoices() {
    return [...this.voiceList];
  }
  getStaves() {
    return this.staveList.map((s) => new Stave2(s.staff, s.lines, s.left, s.right, s.noteStartX, s.keyAccidentals));
  }
  drawn(staves, rect) {
    this.staveList = staves;
    this.relocate(rect);
  }
}

// dynamic-glyphs.ts
var GLYPHS = {
  p: "",
  m: "",
  f: "",
  r: "",
  s: "",
  z: "",
  n: ""
};

class DynamicGlyphs {
  spell(text) {
    return [...text].map((ch) => GLYPHS[ch] ?? ch).join("");
  }
  canSpell(text) {
    return [...text].every((ch) => (ch in GLYPHS));
  }
}

// measure-sequence-iterator.ts
class MeasureSequenceIterator {
  measures;
  constructor(measures) {
    this.measures = measures;
  }
  [Symbol.iterator]() {
    return this.walk(this.analyzeStructure())[Symbol.iterator]();
  }
  analyzeStructure() {
    const repeatEndsByMeasure = new Map;
    const voltas = [];
    const endingByMeasure = new Map;
    const startStack = [];
    let currentVolta = null;
    let currentEnding = null;
    const closeVolta = () => {
      currentEnding = null;
      if (currentVolta !== null && startStack.at(-1) === currentVolta.startIndex) {
        startStack.pop();
      }
      currentVolta = null;
    };
    for (const [i, measure] of this.measures.entries()) {
      for (const jump of measure.jumps) {
        if (jump.type === "repeatstart") {
          startStack.push(i);
        }
      }
      const endingJump = this.findJump(measure.jumps, "repeatending");
      if (endingJump) {
        const previous = currentVolta?.endings.at(-1);
        if (currentEnding === null && previous !== undefined && endingJump.number <= previous.number) {
          closeVolta();
        }
        if (currentVolta === null) {
          currentVolta = {
            startIndex: startStack.at(-1) ?? 0,
            endings: [],
            totalPasses: 0
          };
          voltas.push(currentVolta);
        }
        let ending = currentEnding;
        if (ending === null) {
          ending = {
            startIndex: i,
            endIndex: i,
            times: endingJump.times,
            number: endingJump.number,
            startPass: 0,
            endPass: 0
          };
          currentVolta.endings.push(ending);
        } else {
          ending.endIndex = i;
        }
        currentEnding = endingJump.last ? null : ending;
        endingByMeasure.set(i, { volta: currentVolta, ending });
        continue;
      }
      if (currentVolta !== null) {
        closeVolta();
      }
      const endJump = this.findJump(measure.jumps, "repeatend");
      if (endJump) {
        const startIndex = startStack.pop() ?? 0;
        repeatEndsByMeasure.set(i, {
          measureIndex: i,
          startIndex,
          times: endJump.times
        });
      }
    }
    if (currentVolta !== null && startStack.at(-1) === currentVolta.startIndex) {
      startStack.pop();
    }
    for (const volta of voltas) {
      const last = volta.endings.at(-1);
      let pass = 1;
      for (const ending of volta.endings) {
        const effective = ending === last && ending.times === 0 ? 1 : ending.times;
        ending.startPass = pass;
        ending.endPass = pass + effective - 1;
        pass += effective;
      }
      const sum = pass - 1;
      const needsImplicitFinalPass = volta.endings.length === 1 && last !== undefined && last.times > 0;
      volta.totalPasses = needsImplicitFinalPass ? sum + 1 : sum;
    }
    return { repeatEndsByMeasure, voltas, endingByMeasure };
  }
  walk(structure) {
    const result = [];
    const remainingBackJumps = new Map;
    const voltaPass = new Map;
    let jumped = false;
    let played = null;
    let i = 0;
    while (i <= this.measures.length) {
      if (played !== null && i === played + 1) {
        const jumps = this.measures[played]?.jumps ?? [];
        const target = this.navigate(jumps, jumped);
        played = null;
        if (target === "end") {
          break;
        }
        if (target !== null) {
          jumped = true;
          i = target;
          continue;
        }
      }
      played = null;
      const measure = this.measures[i];
      if (!measure) {
        break;
      }
      const endingHit = structure.endingByMeasure.get(i);
      if (endingHit) {
        const pass = jumped ? endingHit.volta.totalPasses : voltaPass.get(endingHit.volta) ?? 1;
        if (pass < endingHit.ending.startPass || pass > endingHit.ending.endPass) {
          i++;
          continue;
        }
      }
      result.push(measure.index);
      played = i;
      if (endingHit) {
        const { volta, ending } = endingHit;
        if (i < ending.endIndex) {
          i++;
          continue;
        }
        const nextPass = (voltaPass.get(volta) ?? 1) + 1;
        if (jumped || nextPass > volta.totalPasses) {
          voltaPass.delete(volta);
          i++;
        } else {
          voltaPass.set(volta, nextPass);
          this.resetNestedState(structure, remainingBackJumps, voltaPass, volta.startIndex, i);
          i = volta.startIndex;
        }
        continue;
      }
      const repeatEnd = structure.repeatEndsByMeasure.get(i);
      if (repeatEnd) {
        if (repeatEnd.times === 0 || jumped) {
          i++;
          continue;
        }
        const remaining = remainingBackJumps.get(i) ?? repeatEnd.times;
        if (remaining > 0) {
          remainingBackJumps.set(i, remaining - 1);
          this.resetNestedState(structure, remainingBackJumps, voltaPass, repeatEnd.startIndex, i);
          i = repeatEnd.startIndex;
        } else {
          remainingBackJumps.delete(i);
          i++;
        }
        continue;
      }
      i++;
    }
    return result;
  }
  navigate(jumps, jumped) {
    if (jumped) {
      if (jumps.some((jump) => jump.type === "fine")) {
        return "end";
      }
      const tocoda = this.findJump(jumps, "tocoda");
      return tocoda ? this.landmark("coda", tocoda.id, true) : null;
    }
    if (this.findJump(jumps, "dacapo")) {
      return 0;
    }
    const dalsegno = this.findJump(jumps, "dalsegno");
    return dalsegno ? this.landmark("segno", dalsegno.id, false) : null;
  }
  landmark(type, id, last) {
    const found = [];
    let named = null;
    for (const [i, measure] of this.measures.entries()) {
      for (const jump of measure.jumps) {
        if (jump.type !== type) {
          continue;
        }
        found.push(i);
        if (named === null && id !== null && jump.id === id) {
          named = i;
        }
      }
    }
    return named ?? (last ? found.at(-1) ?? null : found[0] ?? null);
  }
  resetNestedState(structure, remainingBackJumps, voltaPass, startIndex, endIndex) {
    for (const measureIndex of structure.repeatEndsByMeasure.keys()) {
      if (measureIndex > startIndex && measureIndex < endIndex) {
        remainingBackJumps.delete(measureIndex);
      }
    }
    for (const volta of structure.voltas) {
      if (volta.startIndex > startIndex && volta.startIndex < endIndex) {
        voltaPass.delete(volta);
      }
    }
  }
  findJump(jumps, type) {
    return jumps.find((jump) => jump.type === type);
  }
}

// gap-inserter.ts
class GapInserter {
  reader;
  constructor(reader) {
    this.reader = reader;
  }
  insert(document2, positions) {
    const parts = document2.score.parts;
    const indexes = this.indexesOf(parts[0]?.measures ?? [], positions);
    const order = positions.map((_, i) => i).sort((a, b) => (indexes[a] ?? 0) - (indexes[b] ?? 0));
    const inserted = [];
    order.forEach((original, k) => {
      const at = (indexes[original] ?? 0) + k;
      for (const [p, part] of parts.entries()) {
        const measure = part.insertMeasureAt(at, { number: "" });
        const ref = part.measures[at + 1];
        if (ref) {
          measure.copySignaturesFrom(ref);
        }
        if (p === 0) {
          inserted[original] = measure;
        }
      }
    });
    return inserted;
  }
  indexesOf(measures, positions) {
    const repeats = this.reader.measureRepeats(measures);
    const jumps = this.reader.measureJumps(measures);
    const order = [
      ...new MeasureSequenceIterator(measures.map((_, index) => ({ index, jumps: jumps[index] ?? [] })))
    ];
    const joined = (i) => !!repeats[i]?.ending && !!repeats[i - 1]?.ending;
    return positions.map((position) => {
      const byBar = position.beforeBarIndex !== undefined;
      if (byBar === (position.beforeMeasureIndex !== undefined)) {
        throw new TypeError("insertGaps: a gap needs exactly one of beforeMeasureIndex or beforeBarIndex");
      }
      const [name, index, max] = byBar ? ["beforeBarIndex", position.beforeBarIndex, order.length] : ["beforeMeasureIndex", position.beforeMeasureIndex, measures.length];
      if (index === undefined || !Number.isInteger(index) || index < 0 || index > max) {
        throw new RangeError(`insertGaps: ${name} must be an integer in [0, ${max}], got ${index}`);
      }
      const measure = byBar ? order[index] : undefined;
      if (!byBar || measure === undefined) {
        return byBar ? measures.length : index;
      }
      const block = this.blockAround(order, joined, measure);
      if (index !== block.p0) {
        throw new RangeError(`insertGaps: beforeBarIndex ${index} falls inside a repeat (measures ${block.lo}-${block.hi})`);
      }
      return block.lo;
    });
  }
  blockAround(order, joined, m) {
    let lo = m;
    let hi = m;
    for (;; ) {
      let p0 = -1;
      let p1 = -1;
      for (const [p, visited] of order.entries()) {
        if (visited >= lo && visited <= hi) {
          if (p0 < 0) {
            p0 = p;
          }
          p1 = p;
        }
      }
      let wideLo = lo;
      let wideHi = hi;
      const widen = (visited) => {
        if (visited !== undefined) {
          wideLo = Math.min(wideLo, visited);
          wideHi = Math.max(wideHi, visited);
        }
      };
      for (let p = p0;p <= p1; p++) {
        widen(order[p]);
      }
      if (p0 > 0 && order[p0 - 1] !== lo - 1) {
        widen(order[p0 - 1]);
      }
      if (p1 + 1 < order.length && order[p1 + 1] !== hi + 1) {
        widen(order[p1 + 1]);
      }
      while (wideLo > 0 && joined(wideLo)) {
        wideLo--;
      }
      while (joined(wideHi + 1)) {
        wideHi++;
      }
      if (wideLo === lo && wideHi === hi) {
        return { lo, hi, p0, p1 };
      }
      lo = wideLo;
      hi = wideHi;
    }
  }
}

// score-reader.ts
import {
  Chord,
  Dashes,
  MElement
} from "@stringsync/mdom";

// smufl.ts
import { VexFlow } from "vexflow/core";
function smuflGlyph(name) {
  if (!name) {
    return;
  }
  return VexFlow.Glyphs[name];
}

// appearance.ts
class Appearance {
  lineWidths;
  distances;
  glyphs;
  static NONE = new Appearance(new Map, new Map, new Map);
  constructor(lineWidths, distances, glyphs) {
    this.lineWidths = lineWidths;
    this.distances = distances;
    this.glyphs = glyphs;
  }
  lineWidth(type) {
    return this.lineWidths.get(type) ?? null;
  }
  distance(type) {
    return this.distances.get(type) ?? null;
  }
  glyph(type) {
    return smuflGlyph(this.glyphs.get(type)) ?? null;
  }
}

// document-layout.ts
class DocumentLayout {
  defaults;
  prints;
  constructor(defaults, prints) {
    this.defaults = defaults;
    this.prints = prints;
  }
  page() {
    const { pageWidth, pageHeight, pageMargins } = this.defaults;
    const margins = pageMargins ?? {
      left: PAGE_MARGIN_X,
      right: PAGE_MARGIN_X,
      top: PAGE_MARGIN_TOP,
      bottom: PAGE_MARGIN_BOTTOM
    };
    if (pageWidth === null || pageWidth <= margins.left + margins.right || pageHeight !== null && pageHeight <= margins.top + margins.bottom) {
      return null;
    }
    const even = this.defaults.evenPageMargins;
    const evenWidth = even ? pageWidth - even.left - even.right : null;
    if (even && evenWidth !== null && (evenWidth <= 0 || pageHeight !== null && pageHeight <= even.top + even.bottom)) {
      return null;
    }
    return {
      width: pageWidth,
      height: pageHeight,
      margins,
      evenShift: even ? even.left - margins.left : 0,
      evenNarrowing: evenWidth !== null ? Math.max(0, pageWidth - margins.left - margins.right - evenWidth) : 0
    };
  }
  pageSize(m) {
    for (const print of this.prints.get(m) ?? []) {
      const height = print?.pageHeight ?? null;
      const margins = print?.pageMargins ?? null;
      if (height === null && margins === null) {
        continue;
      }
      const own = {
        height,
        marginTop: margins?.top ?? null,
        marginBottom: margins?.bottom ?? null
      };
      const defaults = this.page();
      const total = (own.height ?? defaults?.height ?? Number.POSITIVE_INFINITY) - (own.marginTop ?? defaults?.margins.top ?? 0) - (own.marginBottom ?? defaults?.margins.bottom ?? 0);
      return total > 0 ? own : null;
    }
    return null;
  }
  systemMargins(m) {
    return {
      left: this.systemValue(m, "systemLeft") ?? 0,
      right: this.systemValue(m, "systemRight") ?? 0
    };
  }
  systemDistance(m) {
    return this.systemValue(m, "systemDistance");
  }
  topSystemDistance(m) {
    return this.systemValue(m, "topSystemDistance");
  }
  staffDistance(m, partIndex, staffNumber) {
    const print = this.prints.get(m)?.[partIndex]?.staffDistances;
    const defaults = this.defaults.staffDistances;
    return print?.get(staffNumber) ?? print?.get(ANY_STAFF) ?? defaults.get(staffNumber) ?? defaults.get(ANY_STAFF) ?? null;
  }
  startsPage(m) {
    return this.prints.get(m)?.some((print) => print?.newPage) ?? false;
  }
  blankPages(m) {
    return this.startsPage(m) ? Math.max(0, ...(this.prints.get(m) ?? []).map((p) => p?.blankPages ?? 0)) : 0;
  }
  systemValue(m, key) {
    for (const print of this.prints.get(m) ?? []) {
      const value = print?.[key];
      if (value !== null && value !== undefined) {
        return value;
      }
    }
    return this.defaults[key];
  }
}
var ANY_STAFF = "";

// font-scale.ts
var DEFAULT_TEXT_POINTS = 10;
var CSS_FONT_SCALES = {
  "xx-small": 0.6,
  "x-small": 0.75,
  small: 0.89,
  medium: 1,
  large: 1.2,
  "x-large": 1.5,
  "xx-large": 2
};
var MIN_FONT_SCALE = 0.5;
var MAX_FONT_SCALE = 3;
function fontScaleOf(size, base) {
  if (size === null) {
    return 1;
  }
  const named = CSS_FONT_SCALES[size];
  if (named !== undefined) {
    return named;
  }
  const points = Number(size);
  const basePoints = Number(base ?? DEFAULT_TEXT_POINTS);
  if (!(points > 0) || !(basePoints > 0)) {
    return 1;
  }
  return Math.min(Math.max(points / basePoints, MIN_FONT_SCALE), MAX_FONT_SCALE);
}

// percussion-glyphs.ts
var PERCUSSION_GLYPHS = {
  glass: {
    "glass harmonica": "",
    "glass harp": "",
    "wind chimes": ""
  },
  metal: {
    agogo: "",
    almglocken: "",
    bell: "",
    "bell plate": "",
    "bell tree": "",
    "brake drum": "",
    cencerro: "",
    "chain rattle": "",
    "Chinese cymbal": "",
    cowbell: "",
    "crash cymbals": "",
    crotale: "",
    "cymbal tongs": "",
    "domed gong": "",
    "finger cymbals": "",
    flexatone: "",
    gong: "",
    "hi-hat": "",
    "high-hat cymbals": "",
    handbell: "",
    "jaw harp": "",
    "jingle bells": "",
    "musical saw": "",
    "shell bells": "",
    sistrum: "",
    "sizzle cymbal": "",
    "sleigh bells": "",
    "suspended cymbal": "",
    "tam tam": "",
    "tam tam with beater": "",
    triangle: "",
    "Vietnamese hat": ""
  },
  wood: {
    "bamboo scraper": "",
    "board clapper": "",
    cabasa: "",
    castanets: "",
    "castanets with handle": "",
    claves: "",
    "football rattle": "",
    guiro: "",
    "log drum": "",
    maraca: "",
    maracas: "",
    quijada: "",
    rainstick: "",
    ratchet: "",
    "reco-reco": "",
    "sandpaper blocks": "",
    "slit drum": "",
    "temple block": "",
    vibraslap: "",
    whip: "",
    "wood block": ""
  },
  pitched: {
    celesta: "",
    chimes: "",
    glockenspiel: "",
    lithophone: "",
    mallet: "",
    marimba: "",
    "steel drums": "",
    tubaphone: "",
    "tubular chimes": "",
    vibraphone: "",
    xylophone: ""
  },
  membrane: {
    "bass drum": "",
    "bass drum on side": "",
    bongos: "",
    "Chinese tomtom": "",
    "conga drum": "",
    cuica: "",
    "goblet drum": "",
    "Indo-American tomtom": "",
    "Japanese tomtom": "",
    "military drum": "",
    "snare drum": "",
    "snare drum snares off": "",
    tabla: "",
    tambourine: "",
    "tenor drum": "",
    timbales: "",
    tomtom: ""
  },
  effect: {
    anvil: "",
    "auto horn": "",
    "bird whistle": "",
    cannon: "",
    "duck call": "",
    "gun shot": "",
    "klaxon horn": "",
    "lions roar": "",
    "lotus flute": "",
    megaphone: "",
    "police whistle": "",
    siren: "",
    "slide whistle": "",
    "thunder sheet": "",
    "wind machine": "",
    "wind whistle": ""
  },
  "stick-location": {
    center: "",
    rim: "",
    "cymbal bell": "",
    "cymbal edge": ""
  }
};
var TIMPANI_GLYPH = "";
var BEATER_GLYPHS = {
  bow: "",
  "chime hammer": "",
  coin: "",
  "drum stick": "",
  finger: "",
  fingernail: "",
  fist: "",
  "guiro scraper": "",
  hammer: "",
  hand: "",
  "jazz stick": ["", ""],
  "knitting needle": "",
  "metal hammer": "",
  "slide brush on gong": "",
  "snare stick": ["", ""],
  "spoon mallet": "",
  superball: "",
  "triangle beater": ["", ""],
  "triangle beater plain": "",
  "wire brush": ["", ""]
};
var STICK_GLYPHS = {
  "bass drum": {
    soft: ["", ""],
    medium: ["", ""],
    hard: ["", ""],
    x: ["", ""]
  },
  "double bass drum": {
    soft: ["", ""],
    medium: ["", ""],
    hard: ["", ""]
  },
  glockenspiel: {
    soft: ["", "", "", ""],
    hard: ["", "", "", ""]
  },
  gum: {
    soft: ["", "", "", ""],
    medium: ["", "", "", ""],
    hard: ["", "", "", ""]
  },
  hammer: {
    soft: ["", ""],
    medium: ["", ""],
    hard: ["", ""],
    shaded: ["", ""],
    x: ["", ""]
  },
  superball: {
    soft: ["", "", "", ""],
    medium: ["", "", "", ""],
    hard: ["", "", "", ""]
  },
  timpani: {
    soft: ["", "", "", ""],
    medium: ["", "", "", ""],
    hard: ["", "", "", ""],
    shaded: ["", "", "", ""]
  },
  wound: {
    soft: ["", "", "", ""],
    hard: ["", "", "", ""]
  },
  xylophone: {
    soft: ["", "", "", ""],
    medium: ["", "", "", ""],
    hard: ["", "", "", ""],
    shaded: ["", "", "", ""]
  },
  yarn: {
    soft: ["", "", "", ""],
    medium: ["", "", "", ""],
    hard: ["", "", "", ""]
  }
};
var TIP_INDEX = {
  up: 0,
  down: 1,
  left: 2,
  right: 3,
  northwest: 0,
  northeast: 0,
  southwest: 1,
  southeast: 1
};

// text-enclosure.ts
var ENCLOSURE_SHAPES = [
  "rectangle",
  "square",
  "oval",
  "circle",
  "bracket",
  "inverted-bracket",
  "triangle",
  "diamond",
  "pentagon",
  "hexagon",
  "heptagon",
  "octagon",
  "nonagon",
  "decagon"
];
var POLYGON_SIDES = {
  pentagon: 5,
  hexagon: 6,
  heptagon: 7,
  octagon: 8,
  nonagon: 9,
  decagon: 10
};
var BRACKET_HOOK = 0.25;
var KAPPA = 0.5523;

class TextEnclosure {
  shape;
  padding;
  constructor(shape, padding) {
    this.shape = shape;
    this.padding = padding;
  }
  size(w, h) {
    const pw = w + 2 * this.padding;
    const ph = h + 2 * this.padding;
    const sides = POLYGON_SIDES[this.shape];
    if (sides) {
      const d = Math.hypot(pw, ph) / Math.cos(Math.PI / sides);
      return { w: d, h: d };
    }
    switch (this.shape) {
      case "square": {
        const side = Math.max(pw, ph);
        return { w: side, h: side };
      }
      case "circle": {
        const d = Math.hypot(pw, ph);
        return { w: d, h: d };
      }
      case "oval":
        return { w: pw * Math.SQRT2, h: ph * Math.SQRT2 };
      case "triangle": {
        const base = pw + 2 * ph / Math.sqrt(3);
        return { w: base, h: base * Math.sqrt(3) / 2 };
      }
      case "diamond":
        return { w: 2 * pw, h: 2 * ph };
      default:
        return { w: pw, h: ph };
    }
  }
  textBox(outer, w, h) {
    const x = outer.x + (outer.w - w) / 2;
    if (this.shape === "triangle") {
      return new Rect2(x, outer.bottom - this.padding - h, w, h);
    }
    return new Rect2(x, outer.y + (outer.h - h) / 2, w, h);
  }
  draw(ctx, outer) {
    const { x, y, w, h, right, bottom } = outer;
    const cx = x + w / 2;
    const cy = y + h / 2;
    ctx.beginPath();
    const sides = POLYGON_SIDES[this.shape];
    if (sides) {
      for (let i = 0;i < sides; i++) {
        const angle = -Math.PI / 2 + 2 * Math.PI * i / sides;
        const px = cx + w / 2 * Math.cos(angle);
        const py = cy + h / 2 * Math.sin(angle);
        if (i === 0) {
          ctx.moveTo(px, py);
        } else {
          ctx.lineTo(px, py);
        }
      }
      ctx.closePath();
      ctx.stroke();
      return;
    }
    switch (this.shape) {
      case "oval":
      case "circle": {
        const kx = w / 2 * KAPPA;
        const ky = h / 2 * KAPPA;
        ctx.moveTo(x, cy);
        ctx.bezierCurveTo(x, cy - ky, cx - kx, y, cx, y);
        ctx.bezierCurveTo(cx + kx, y, right, cy - ky, right, cy);
        ctx.bezierCurveTo(right, cy + ky, cx + kx, bottom, cx, bottom);
        ctx.bezierCurveTo(cx - kx, bottom, x, cy + ky, x, cy);
        ctx.closePath();
        break;
      }
      case "triangle":
        ctx.moveTo(cx, y);
        ctx.lineTo(right, bottom);
        ctx.lineTo(x, bottom);
        ctx.closePath();
        break;
      case "diamond":
        ctx.moveTo(cx, y);
        ctx.lineTo(right, cy);
        ctx.lineTo(cx, bottom);
        ctx.lineTo(x, cy);
        ctx.closePath();
        break;
      case "bracket":
      case "inverted-bracket": {
        const hook = h * BRACKET_HOOK;
        const edge = this.shape === "bracket" ? y : bottom;
        const tip = this.shape === "bracket" ? y + hook : bottom - hook;
        ctx.moveTo(x, tip);
        ctx.lineTo(x, edge);
        ctx.lineTo(right, edge);
        ctx.lineTo(right, tip);
        break;
      }
      default:
        ctx.moveTo(x, y);
        ctx.lineTo(right, y);
        ctx.lineTo(right, bottom);
        ctx.lineTo(x, bottom);
        ctx.closePath();
    }
    ctx.stroke();
  }
}

// score-reader.ts
class ScoreReader {
  dynamics;
  measureBeats = new Map;
  lengths = new Map;
  noteLists = new WeakMap;
  noteReads = new WeakMap;
  midClefCache = new WeakMap;
  staffVoiceCache = new WeakMap;
  voiceCache = new WeakMap;
  divisionsByMeasure = new WeakMap;
  staffStyleCache = new WeakMap;
  wordFonts = new WeakMap;
  constructor(dynamics) {
    this.dynamics = dynamics;
  }
  measureBeatOf(note) {
    if (!this.measureBeats.has(note)) {
      this.measureBeats.set(note, note.measureBeat);
    }
    return this.measureBeats.get(note) ?? null;
  }
  beatsOf(note) {
    if (!this.lengths.has(note)) {
      this.lengths.set(note, note.beats);
    }
    return this.lengths.get(note) ?? null;
  }
  notesOf(measure) {
    let notes = this.noteLists.get(measure);
    if (!notes) {
      notes = measure.notes;
      this.noteLists.set(measure, notes);
    }
    return notes;
  }
  readNote(note, key, read) {
    let reads = this.noteReads.get(note);
    if (!reads) {
      reads = {};
      this.noteReads.set(note, reads);
    }
    let value = reads[key];
    if (value === undefined) {
      value = read();
      reads[key] = value;
    }
    return value;
  }
  beamsOf(note) {
    return this.readNote(note, "beams", () => note.beams);
  }
  technicalsOf(note) {
    return this.readNote(note, "technicals", () => note.technicals);
  }
  lyricsOf(note) {
    return this.readNote(note, "lyrics", () => note.lyrics);
  }
  ornamentsOf(note) {
    return this.readNote(note, "ornaments", () => note.ornaments);
  }
  dotsOf(note) {
    return this.readNote(note, "dots", () => note.dots);
  }
  accidentalOf(note) {
    return this.readNote(note, "accidental", () => note.accidental);
  }
  tiesOf(note) {
    return this.readNote(note, "ties", () => note.ties);
  }
  isChordMember(note) {
    return this.readNote(note, "chordMember", () => note.isChordMember);
  }
  beamRuns(notes) {
    const runs = [];
    let current = null;
    for (const note of notes) {
      if (this.isChordMember(note)) {
        continue;
      }
      const beams = this.beamsOf(note);
      const value = beams.find((beam) => beam.number === "1")?.text ?? null;
      if (value === "begin") {
        current = { notes: [note], breaksAfter: [] };
        runs.push(current);
      } else if (value !== null) {
        current?.notes.push(note);
      } else if (beams.length === 0 && note.isRest) {
        continue;
      } else {
        current = null;
        continue;
      }
      if (current && beams.some((beam) => beam.number !== "1" && beam.text === "end")) {
        current.breaksAfter.push(current.notes.length - 1);
      }
    }
    for (const run of runs) {
      run.breaksAfter = run.breaksAfter.filter((index) => index < run.notes.length - 1);
    }
    return runs;
  }
  staffVoices(measure, staffNumber) {
    let byStaff = this.staffVoiceCache.get(measure);
    if (!byStaff) {
      byStaff = new Map;
      this.staffVoiceCache.set(measure, byStaff);
    }
    let staffVoices = byStaff.get(staffNumber);
    if (!staffVoices) {
      staffVoices = this.projectVoices(this.voicesOf(measure), staffNumber);
      byStaff.set(staffNumber, staffVoices);
    }
    return staffVoices;
  }
  voicesOf(measure) {
    let voices = this.voiceCache.get(measure);
    if (!voices) {
      voices = measure.voices.map((voice) => ({
        staff: voice.staff,
        chords: voice.chords
      }));
      this.voiceCache.set(measure, voices);
    }
    return voices;
  }
  projectVoices(voices, staffNumber) {
    const out = [];
    for (const voice of voices) {
      const chords = [];
      for (const chord of voice.chords) {
        const notes = chord.notes.filter((note) => note.staff === staffNumber);
        if (notes.length === chord.notes.length) {
          chords.push(chord);
        } else if (notes.length > 0) {
          chords.push(new Chord(notes));
        }
      }
      if (chords.length > 0) {
        out.push({
          chords,
          beamChords: voice.staff === staffNumber ? voice.chords : null,
          run: voice.chords
        });
      }
    }
    return out;
  }
  keyIdentity(key) {
    if (key?.rootNote) {
      return key.rootNote;
    }
    const alterations = key?.alterations ?? [];
    if (alterations.length === 0) {
      return null;
    }
    return alterations.map((a) => `${a.step}${a.alter}`).join(" ");
  }
  meterFloor(measure, staffNumber) {
    return measure.isImplicit ? 0 : this.meterBeats(measure.getTime(staffNumber));
  }
  meterBeats(time) {
    if (!time || time.isSenzaMisura) {
      return 0;
    }
    let total = 0;
    for (const component of time.components) {
      const beatType = Number(component.beatType);
      if (!beatType) {
        return 0;
      }
      for (const term of component.beats.split("+")) {
        const beats = Number(term);
        if (!beats) {
          return 0;
        }
        total += beats / beatType * 4;
      }
    }
    return total;
  }
  midBarlinesOf(measure) {
    return measure.barlines.filter((barline) => barline.location === "middle").map((barline) => ({
      beat: barline.measureBeat ?? 0,
      style: barline.barStyle ?? "regular",
      source: barline
    }));
  }
  barlineAt(measure, location) {
    return measure.barlines.find((barline) => barline.location === location) ?? null;
  }
  barlineFermatasOf(measure) {
    return measure.barlines.filter((barline) => barline.location !== "middle").flatMap((barline) => barline.childrenNamed("fermata").map((fermata) => ({
      location: barline.location === "left" ? "left" : "right",
      shape: fermata.text?.trim() || "normal",
      inverted: fermata.getAttribute("type") === "inverted"
    })));
  }
  midClefsOf(measure, staffNumber) {
    let byStaff = this.midClefCache.get(measure);
    if (!byStaff) {
      byStaff = new Map;
      this.midClefCache.set(measure, byStaff);
    }
    let changes = byStaff.get(staffNumber);
    if (!changes) {
      changes = measure.clefChanges(staffNumber).filter((change) => change.beat > EPSILON && change.clef.getAttribute("after-barline") !== "yes");
      byStaff.set(staffNumber, changes);
    }
    return changes;
  }
  multiRestsOf(parts) {
    const leads = new Map;
    const hidden = new Set;
    const symbols = new Set;
    const measureCount = Math.max(0, ...parts.map((part) => part.measures.length));
    for (let m = 0;m < measureCount; m++) {
      if (hidden.has(m)) {
        continue;
      }
      const count = this.multiRestCountOf(parts[0]?.measures[m]);
      if (!count || count < 2 || !parts.every((part) => this.multiRestCountOf(part.measures[m]) === count)) {
        continue;
      }
      leads.set(m, count);
      if (this.multiRestUsesSymbols(parts[0]?.measures[m])) {
        symbols.add(m);
      }
      for (let swallowed = m + 1;swallowed < m + count; swallowed++) {
        hidden.add(swallowed);
      }
    }
    return { leads, hidden, symbols };
  }
  multiRestUsesSymbols(measure) {
    for (const node of measure?.children ?? []) {
      if (!(node instanceof MElement) || node.tag !== "attributes") {
        continue;
      }
      for (const style of node.childrenNamed("measure-style")) {
        const number = style.getAttribute("number");
        if (number !== null && number !== "1") {
          continue;
        }
        const rest = style.child("multiple-rest");
        if (rest?.getAttribute("use-symbols") === "yes") {
          return true;
        }
      }
    }
    return false;
  }
  measureStyleOf(measure, staffNumber) {
    const style = this.staffStylesOf(measure.part, staffNumber)[measure.index];
    if (!style) {
      return null;
    }
    if (style.repeat) {
      return { kind: "measure-repeat", ...style.repeat };
    }
    const covers = (span) => span.from <= EPSILON && span.to >= style.length - EPSILON && span.except.length === 0;
    const beatRepeat = style.beatRepeats.find(covers);
    if (beatRepeat) {
      return {
        kind: "beat-repeat",
        slashes: beatRepeat.slashes,
        dots: beatRepeat.dots,
        beats: beatsAcross(style.length, beatRepeat.unit),
        length: style.length
      };
    }
    const slash = style.slashes.find((span) => !span.stems && covers(span));
    if (slash) {
      return {
        kind: "beat-slash",
        unit: slash.unit,
        dots: slash.dots,
        beats: beatsAcross(style.length, slash.unit),
        length: style.length
      };
    }
    return null;
  }
  noteStyleOf(note) {
    const measure = note.measure;
    const style = this.staffStylesOf(measure.part, note.staff)[measure.index];
    const onset = this.measureBeatOf(note);
    if (!style || onset === null || note.isGrace) {
      return NOT_STYLED;
    }
    const spanAt = (n, at) => [
      ...style.beatRepeats.map((span) => ({
        ...span,
        kind: "beat-repeat"
      })),
      ...style.slashes.filter((span) => !span.stems).map((span) => ({ ...span, kind: "beat-slash" }))
    ].find((span) => !span.except.includes(n.voice) && at >= span.from - EPSILON && at < span.to - EPSILON);
    const span = spanAt(note, onset);
    if (!span) {
      return NOT_STYLED;
    }
    const covered = this.notesOf(measure).filter((n) => n.staff === note.staff && !n.isGrace).flatMap((n) => {
      const at = this.measureBeatOf(n);
      return at !== null && spanAt(n, at)?.from === span.from ? [{ n, at }] : [];
    });
    const owner = covered[0]?.n.voice;
    const windowOf = (at) => Math.floor((at - span.from + EPSILON) / span.unit);
    const first = covered.find(({ n, at }) => n.voice === owner && windowOf(at) === windowOf(onset));
    const anchored = note.voice === owner && first !== undefined && first.at === onset;
    const { dots } = span;
    let sign = null;
    if (anchored) {
      sign = span.kind === "beat-repeat" ? { kind: "beat-repeat", slashes: span.slashes, dots } : { kind: "beat-slash", unit: span.unit, dots };
    }
    return { hidden: true, sign };
  }
  bendOf(note) {
    const bend = note.bend;
    const elements = this.technicalsOf(note).filter((t) => t.technicalType === "bend");
    const element = elements[0];
    if (!bend || !element) {
      return null;
    }
    const released = bend.release || elements.slice(1).some((e) => e.child("release") !== null);
    const bar = element.child("with-bar");
    return {
      semitones: bend.semitones,
      release: released,
      preBend: element.child("pre-bend") !== null,
      shape: element.getAttribute("shape") === "angled" ? "angled" : "curved",
      bar: bar ? (bar.text ?? "").trim() : null
    };
  }
  isRhythmSlashed(note) {
    const measure = note.measure;
    const style = this.staffStylesOf(measure.part, note.staff)[measure.index];
    const onset = this.measureBeatOf(note) ?? 0;
    return style?.slashes.some((span) => span.stems && onset >= span.from - EPSILON && onset < span.to - EPSILON) ?? false;
  }
  staffStylesOf(part, staffNumber) {
    let byStaff = this.staffStyleCache.get(part);
    if (!byStaff) {
      byStaff = new Map;
      this.staffStyleCache.set(part, byStaff);
    }
    const cached = byStaff.get(staffNumber);
    if (cached) {
      return cached;
    }
    const styles = [];
    let repeat = null;
    let beatRepeat = null;
    let slash = null;
    for (const measure of part.measures) {
      const m = styles.length;
      const length = this.meterFloor(measure, staffNumber) || measure.endBeat;
      const unitOf = (style) => slashUnit(style) ?? beatUnit(measure.getTime(staffNumber));
      const style = {
        repeat: null,
        beatRepeats: [],
        slashes: [],
        length
      };
      for (const { beat, element } of measureStyleEvents(measure, staffNumber)) {
        const starts = element.getAttribute("type") === "start";
        const slashes = Number(element.getAttribute("slashes") ?? 1) || 1;
        const dots = element.getAttribute("use-dots") === "yes";
        const except = element.childrenNamed("except-voice").flatMap((voice) => voice.text ? [voice.text] : []);
        if (element.tag === "measure-repeat") {
          repeat = starts ? { count: Number(element.text) || 1, slashes, start: m } : null;
        } else if (element.tag === "beat-repeat") {
          if (beatRepeat) {
            style.beatRepeats.push({ ...beatRepeat, to: beat });
          }
          beatRepeat = starts ? { slashes, dots, except, unit: unitOf(element), from: beat } : null;
        } else if (element.tag === "slash") {
          if (slash) {
            style.slashes.push({ ...slash, to: beat });
          }
          slash = starts ? {
            stems: element.getAttribute("use-stems") === "yes",
            dots,
            except,
            unit: unitOf(element),
            from: beat
          } : null;
        }
      }
      if (repeat) {
        style.repeat = {
          count: repeat.count,
          slashes: repeat.slashes,
          bar: (m - repeat.start) % repeat.count
        };
      }
      if (beatRepeat) {
        style.beatRepeats.push({ ...beatRepeat, to: length });
        beatRepeat = { ...beatRepeat, from: 0 };
      }
      if (slash) {
        style.slashes.push({ ...slash, to: length });
        slash = { ...slash, from: 0 };
      }
      styles.push(style);
    }
    byStaff.set(staffNumber, styles);
    return styles;
  }
  clefAtEndOf(measure, staffNumber) {
    if (!measure) {
      return null;
    }
    return this.midClefsOf(measure, staffNumber).at(-1)?.clef ?? measure.getClef(staffNumber);
  }
  measureNumberingOf(measure) {
    const element = measure.print?.child("measure-numbering");
    if (!element) {
      return null;
    }
    const text = element.text?.trim();
    const value = text === "none" || text === "measure" || text === "system" ? text : "system";
    const system = element.getAttribute("system");
    return {
      value,
      system: SYSTEM_RELATIONS.find((relation) => relation === system) ?? null,
      staff: element.getAttribute("staff")
    };
  }
  tempoOf(measure) {
    for (const direction of measure.directions) {
      for (const metronome of direction.metronomes) {
        const [first, second] = metronome.beatUnits;
        if (!first) {
          continue;
        }
        return {
          duration: first.type,
          dots: first.dots,
          bpm: Number(metronome.perMinute ?? direction.soundTempo) || DEFAULT_TEMPO_BPM,
          duration2: second?.type ?? null,
          dots2: second?.dots ?? 0,
          parenthesis: metronome.parentheses,
          justify: this.justifyOf(metronome),
          position: this.positionOf(metronome)
        };
      }
    }
    return null;
  }
  modulationOf(measure) {
    for (const direction of measure.directions) {
      for (const metronome of direction.metronomes) {
        const relation = metronome.relation;
        if (!relation) {
          continue;
        }
        const left = this.modulationNotesOf(relation.left);
        const right = this.modulationNotesOf(relation.right);
        if (left.length === 0 || right.length === 0) {
          continue;
        }
        return {
          left,
          right,
          rate: null,
          parenthesis: metronome.parentheses,
          arrows: metronome.child("metronome-arrows") !== null,
          justify: this.justifyOf(metronome),
          position: this.positionOf(metronome)
        };
      }
    }
    return null;
  }
  rateModulationOf(measure) {
    for (const direction of measure.directions) {
      for (const metronome of direction.metronomes) {
        const units = this.tiedUnitsOf(metronome);
        const [first, second] = units;
        if (!first || !units.some((unit) => unit.length > 1)) {
          continue;
        }
        const bpm = Number(metronome.perMinute ?? direction.soundTempo) || DEFAULT_TEMPO_BPM;
        return {
          left: this.unitNotesOf(first),
          right: second ? this.unitNotesOf(second) : [],
          rate: second ? null : String(bpm),
          parenthesis: metronome.parentheses,
          arrows: false,
          justify: this.justifyOf(metronome),
          position: this.positionOf(metronome)
        };
      }
    }
    return null;
  }
  tiedUnitsOf(metronome) {
    const units = [];
    for (const node of metronome.children) {
      if (!(node instanceof MElement)) {
        continue;
      }
      if (node.tag === "beat-unit") {
        units.push([{ type: node.text?.trim() ?? "quarter", dots: 0 }]);
      } else if (node.tag === "beat-unit-dot") {
        const note = units.at(-1)?.at(-1);
        if (note) {
          note.dots++;
        }
      } else if (node.tag === "beat-unit-tied") {
        units.at(-1)?.push({
          type: node.child("beat-unit")?.text?.trim() ?? "quarter",
          dots: node.childrenNamed("beat-unit-dot").length
        });
      }
    }
    return units;
  }
  unitNotesOf(unit) {
    return unit.map((note, i) => ({
      type: note.type,
      dots: note.dots,
      beamed: false,
      beamsToNext: 0,
      tiesToNext: i < unit.length - 1,
      tuplet: null
    }));
  }
  justifyOf(metronome) {
    const justify = metronome.getAttribute("justify");
    return justify === "left" || justify === "center" || justify === "right" ? justify : null;
  }
  playbackTempoOf(measure) {
    const metronome = this.tempoOf(measure);
    if (metronome) {
      return metronome;
    }
    for (const sound of measure.sounds) {
      if (sound.tempo) {
        return { duration: "quarter", bpm: sound.tempo };
      }
    }
    return null;
  }
  swingOf(measure) {
    for (const sound of measure.sounds) {
      if (sound.swing) {
        return sound.swing;
      }
    }
    return null;
  }
  wordsOf(measure) {
    const wordFont = this.wordFontOf(measure);
    const written = measure.directions.flatMap((d) => {
      const staffNumber = d.staff;
      const placement = this.placementOf(d, "above");
      const offset = this.offsetBeatsOf(d, measure);
      const beat = d.measureBeat === null ? null : d.measureBeat + offset;
      const opensBar = beat !== null && Math.abs(beat) < EPSILON;
      const closesBar = beat !== null && !opensBar && beat > measure.endBeat - EPSILON;
      let lead = closesBar ? null : d.nextNote;
      if (!closesBar && offset !== 0 && beat !== null) {
        lead = this.leadAtBeat(measure, beat);
      }
      const directive = d.getAttribute("directive") === "yes";
      const at = {
        staffNumber,
        lead,
        placement,
        opensBar,
        closesBar,
        directive
      };
      const words = d.wordsElements.filter((words) => words.text).map((words) => ({
        ...at,
        text: words.text,
        glyph: false,
        format: this.formatOf(words, wordFont, wordFont),
        position: this.positionOf(words, d)
      }));
      const others = d.childrenNamed("direction-type").flatMap((type) => type.childrenNamed("other-direction")).flatMap((other) => {
        const glyph = smuflGlyph(other.getAttribute("smufl"));
        const text = glyph ?? other.text?.trim();
        return text ? [
          {
            ...at,
            text,
            glyph: glyph !== undefined,
            format: this.formatOf(other, wordFont, wordFont),
            position: this.positionOf(other, d)
          }
        ] : [];
      });
      return [...words, ...others];
    });
    const lead = this.leadAtBeat(measure, 0);
    const attributed = measure.childrenNamed("attributes").flatMap((attrs) => attrs.childrenNamed("directive").filter((el) => el.text).map((el) => ({
      text: el.text ?? "",
      glyph: false,
      staffNumber: "1",
      lead,
      placement: "above",
      opensBar: true,
      closesBar: false,
      directive: true,
      format: this.formatOf(el, wordFont, wordFont),
      position: this.positionOf(el)
    })));
    return [...attributed, ...written];
  }
  offsetBeatsOf(element, measure) {
    const offset = Number(element.child("offset")?.text);
    if (!Number.isFinite(offset) || offset === 0) {
      return 0;
    }
    const divisions = this.divisionsAt(measure);
    return divisions > 0 ? offset / divisions : 0;
  }
  divisionsAt(measure) {
    const cached = this.divisionsByMeasure.get(measure);
    if (cached !== undefined) {
      return cached;
    }
    let divisions = 0;
    for (const m of measure.part.measures) {
      for (const attrs of m.childrenNamed("attributes")) {
        const value = Number(attrs.child("divisions")?.text);
        if (value > 0) {
          divisions = value;
        }
      }
      if (m === measure) {
        break;
      }
    }
    this.divisionsByMeasure.set(measure, divisions);
    return divisions;
  }
  leadAtBeat(measure, beat) {
    let found = null;
    let foundBeat = Number.NEGATIVE_INFINITY;
    for (const { lead } of measure.chords) {
      const at = this.measureBeatOf(lead);
      if (at === null) {
        continue;
      }
      if (at <= beat + EPSILON ? at >= foundBeat : found === null && foundBeat === Number.NEGATIVE_INFINITY) {
        found = lead;
        foundBeat = at;
      }
    }
    return found;
  }
  dynamicsOf(measure) {
    const wordFont = this.wordFontOf(measure);
    const musicFont = measure.part.score.child("defaults")?.child("music-font") ?? null;
    return measure.directions.flatMap((d) => {
      const staffNumber = d.staff;
      const lead = d.nextNote;
      const placement = this.placementOf(d, "below");
      return d.dynamics.flatMap((dynamics) => {
        const base = (text) => this.dynamics.canSpell(text) ? musicFont : wordFont;
        return dynamics.marks.filter(Boolean).map((text) => ({
          text,
          glyph: this.dynamics.canSpell(text),
          format: this.formatOf(dynamics, null, base(text)),
          staffNumber,
          lead,
          placement,
          position: this.positionOf(dynamics, d)
        }));
      });
    });
  }
  symbolsOf(measure) {
    return measure.directions.flatMap((d) => {
      const bind = {
        staffNumber: d.staff,
        lead: d.nextNote,
        placement: this.placementOf(d, "above")
      };
      return d.childrenNamed("direction-type").flatMap((type) => type.children.filter((child) => child instanceof MElement).flatMap((child) => {
        const glyph = this.directionSymbolOf(child);
        return glyph ? [{ glyph, ...bind }] : [];
      }));
    });
  }
  directionSymbolOf(child) {
    const name = child.getAttribute("type") ?? "";
    const glyph = (glyphName) => smuflGlyph(glyphName) ?? "";
    switch (child.tag) {
      case "damp":
        return glyph("pluckedDamp");
      case "damp-all":
        return glyph("pluckedDampAll");
      case "eyeglasses":
        return glyph("miscEyeglasses");
      case "string-mute":
        return {
          on: glyph("stringsMuteOn"),
          off: glyph("stringsMuteOff")
        }[name] ?? "";
      case "staff-divide":
        return {
          down: glyph("staffDivideArrowDown"),
          up: glyph("staffDivideArrowUp"),
          "up-down": glyph("staffDivideArrowUpDown")
        }[name] ?? "";
      case "principal-voice": {
        if (name === "stop") {
          return glyph("analyticsEndStimme");
        }
        if (name !== "start") {
          return "";
        }
        const letter = {
          Hauptstimme: glyph("analyticsHauptstimme"),
          Nebenstimme: glyph("analyticsNebenstimme")
        }[child.getAttribute("symbol") ?? ""] ?? "";
        return letter + glyph("analyticsStartStimme");
      }
      case "symbol":
        return glyph(child.text?.trim());
      default:
        return "";
    }
  }
  harpPedalsOf(measure) {
    return measure.directions.flatMap((d) => d.children.filter((node) => node instanceof MElement).filter((node) => node.tag === "direction-type").flatMap((type) => type.childrenNamed("harp-pedals")).map((pedals) => {
      const settings = new Map;
      for (const tuning of pedals.childrenNamed("pedal-tuning")) {
        const step = tuning.child("pedal-step")?.text?.trim();
        const alter = Number(tuning.child("pedal-alter")?.text);
        if (step) {
          settings.set(step, HARP_PEDAL_GLYPHS[Math.sign(alter) + 1] ?? HARP_PEDAL_CENTERED);
        }
      }
      const glyph = (step) => settings.get(step) ?? HARP_PEDAL_CENTERED;
      return {
        glyphs: ["D", "C", "B"].map(glyph).join("") + HARP_PEDAL_DIVIDER + ["E", "F", "G", "A"].map(glyph).join(""),
        staffNumber: d.staff,
        lead: d.nextNote,
        placement: this.placementOf(d, "above"),
        position: this.positionOf(pedals, d)
      };
    }));
  }
  rehearsalsOf(measure) {
    const wordFont = this.wordFontOf(measure);
    return measure.directions.flatMap((d) => d.rehearsals.filter((rehearsal) => rehearsal.text).map((rehearsal) => ({
      text: rehearsal.text,
      format: this.formatOf(rehearsal, null, wordFont),
      position: this.positionOf(rehearsal)
    })));
  }
  figuredBassesOf(measure) {
    const out = [];
    for (const stack of measure.figuredBasses) {
      const lead = stack.nextNote;
      if (!lead) {
        continue;
      }
      const figures = stack.figures.map((figure) => {
        const text = (FIGURE_SIGN[figure.prefix ?? ""] ?? "") + (figure.number ?? "") + (FIGURE_SIGN[figure.suffix ?? ""] ?? "");
        return text && stack.parentheses ? `(${text})` : text;
      }).filter(Boolean);
      if (figures.length > 0) {
        out.push({ lead, figures, position: this.positionOf(stack) });
      }
    }
    return out;
  }
  navigationsOf(measure) {
    return measure.directions.flatMap((d) => d.childrenNamed("direction-type").flatMap((type) => [
      ...type.childrenNamed("segno").map((sign) => ({ kind: "segno", sign })),
      ...type.childrenNamed("coda").map((sign) => ({ kind: "coda", sign }))
    ]).map(({ kind, sign }) => ({ kind, position: this.positionOf(sign) })));
  }
  pictogramsOf(measure) {
    return measure.directions.flatMap((d) => {
      const placement = this.placementOf(d, "above");
      return d.childrenNamed("direction-type").flatMap((type) => type.children).filter((child) => child instanceof MElement).map((child) => this.pictogramElementOf(child)).filter((symbol) => symbol !== null).map((symbol) => ({
        symbol,
        staffNumber: d.staff,
        lead: d.nextNote,
        placement
      }));
    });
  }
  pedalsOf(measure) {
    const out = [];
    for (const direction of measure.directions) {
      for (const pedal of direction.pedals) {
        const raw = pedal.getAttribute("type");
        const type = PEDAL_TYPES[raw ?? ""];
        if (!type) {
          continue;
        }
        const lead = type === "stop" ? direction.previousNote : direction.nextNote ?? (type === "change" ? direction.previousNote : null);
        if (!lead) {
          continue;
        }
        const line = pedal.line;
        const sign = pedal.getAttribute("sign");
        out.push({
          lead,
          type,
          number: pedal.number,
          line,
          sign: sign === null ? !line : sign === "yes",
          abbreviated: pedal.getAttribute("abbreviated") === "yes",
          sostenuto: raw === "sostenuto",
          unmarked: raw === "resume" || raw === "discontinue"
        });
      }
    }
    return out;
  }
  onStaffOf(measure, staff, note) {
    if (!note || note.staff === staff) {
      return note;
    }
    const notes = this.notesOf(measure);
    const at = notes.indexOf(note);
    if (at < 0) {
      return note;
    }
    return notes.slice(at).find((n) => n.staff === staff && !n.isGrace) ?? note;
  }
  lastOnStaff(measure, staff, note) {
    const notes = this.notesOf(measure);
    const at = note ? notes.indexOf(note) : -1;
    if (at < 0) {
      return null;
    }
    return notes.slice(0, at + 1).reverse().find((n) => n.staff === staff && !n.isGrace) ?? null;
  }
  wedgesOf(measure) {
    const out = [];
    for (const direction of measure.directions) {
      for (const wedge of direction.wedges) {
        const wedgeType = wedge.wedgeType;
        if (wedgeType === "continue") {
          continue;
        }
        const type = wedgeType === "stop" ? "stop" : "start";
        const next = this.onStaffOf(measure, direction.staff, direction.nextNote ?? (type === "stop" ? direction.previousNote : null));
        const last = type === "stop" && next && next.staff !== direction.staff ? this.lastOnStaff(measure, direction.staff, direction.previousNote) : null;
        const lead = last ?? next;
        if (!lead) {
          continue;
        }
        const opener = type === "start" ? wedgeType : wedge.members.find((m) => m.wedgeType !== "stop")?.wedgeType ?? "crescendo";
        out.push({
          lead,
          type,
          number: wedge.number,
          crescendo: opener === "crescendo",
          placement: this.placementOf(direction, "below"),
          dash: lineDashOf(wedge),
          niente: wedge.getAttribute("niente") === "yes",
          spread: Number.parseFloat(wedge.getAttribute("spread") ?? "") || null,
          trailing: last !== null
        });
      }
    }
    return out;
  }
  octaveShiftsOf(part) {
    const notes = part.measures.flatMap((measure) => this.notesOf(measure));
    const indexOf = new Map(notes.map((note, index) => [note, index]));
    const spans = [];
    const open = new Map;
    for (const measure of part.measures) {
      for (const direction of measure.directions) {
        for (const marker of direction.octaveShifts) {
          const type = marker.octaveShiftType;
          if (type === "up" || type === "down") {
            const from = direction.nextNote;
            if (from) {
              open.set(marker.number, {
                from,
                size: marker.size,
                down: type === "down",
                staff: direction.staff
              });
            }
            continue;
          }
          if (type !== "stop") {
            continue;
          }
          const opened = open.get(marker.number);
          open.delete(marker.number);
          const to = direction.previousNote;
          if (!opened || !to) {
            continue;
          }
          const first = indexOf.get(opened.from);
          const last = indexOf.get(to);
          if (first === undefined || last === undefined) {
            continue;
          }
          const octaves = Math.max(1, Math.round((opened.size - 1) / 7));
          let suffix;
          if (octaves === 1) {
            suffix = opened.down ? "va" : "vb";
          } else {
            suffix = opened.down ? "ma" : "mb";
          }
          spans.push({
            notes: notes.slice(first, last + 1).filter((note) => note.staff === opened.staff),
            octaves: opened.down ? octaves : -octaves,
            label: String(opened.size),
            suffix,
            above: opened.down
          });
        }
      }
    }
    return spans;
  }
  directionLinesOf(part) {
    const spans = [];
    const open = new Map;
    for (const measure of part.measures) {
      for (const direction of measure.directions) {
        for (const mark of [...direction.brackets, ...direction.dashes]) {
          const spec = mark instanceof Dashes ? {
            kind: "dashes",
            type: mark.dashesType,
            lineEnd: "none",
            dash: [5, 5]
          } : {
            kind: "bracket",
            type: mark.bracketType,
            lineEnd: mark.lineEnd,
            dash: lineDashOf(mark)
          };
          const key = `${spec.kind}:${mark.number}`;
          if (spec.type === "stop") {
            const opened = open.get(key);
            open.delete(key);
            const to = direction.nextNote ?? direction.previousNote;
            if (opened && to && opened.from !== to) {
              spans.push({ ...opened, to, stopEnd: spec.lineEnd });
            }
            continue;
          }
          if (spec.type !== "start") {
            continue;
          }
          const from = direction.nextNote;
          if (!from) {
            continue;
          }
          open.set(key, {
            kind: spec.kind,
            from,
            above: this.placementOf(direction, "above") === "above",
            dash: spec.dash,
            startEnd: spec.lineEnd
          });
        }
      }
    }
    return spans;
  }
  harmoniesOf(measure) {
    const harmonies = [];
    const seen = new Set;
    for (const harmony of measure.harmonies) {
      const offset = this.offsetBeatsOf(harmony, measure);
      const written = harmony.nextNote;
      const at = written ? this.measureBeatOf(written) : null;
      const lead = offset === 0 || at === null ? written : this.leadAtBeat(measure, at + offset) ?? written;
      if (!lead) {
        continue;
      }
      const analysis = this.analysisSymbol(harmony);
      const symbol = analysis ?? this.harmonySymbol(harmony);
      const text = symbol.text;
      const frame = this.frameOf(harmony);
      const frameElement = harmony.child("frame");
      if (!text && !frame) {
        continue;
      }
      const key = `${this.measureBeatOf(lead) ?? 0}|${text}|${JSON.stringify(frame)}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      const placement = harmony.placement ?? (analysis ? "below" : "above");
      harmonies.push({
        lead,
        text,
        symbol,
        frame,
        framePosition: frameElement ? this.positionOf(frameElement) : null,
        placement,
        source: harmony,
        position: this.positionOf(harmony, harmony)
      });
    }
    return harmonies;
  }
  endBeatOf(voices) {
    let end = 0;
    for (const { chords } of voices) {
      const last = chords.at(-1);
      if (last) {
        end = Math.max(end, (this.measureBeatOf(last.lead) ?? 0) + (this.beatsOf(last.lead) ?? 0));
      }
    }
    return end;
  }
  barlineBreaks(score) {
    const joined = new Set;
    const broken = new Set;
    for (const group of score.partGroups) {
      for (let at = group.fromPartIndex;at < group.toPartIndex; at++) {
        (group.barline === "no" ? broken : joined).add(at);
      }
    }
    const breaks = new Set;
    for (let at = 0;at < score.parts.length - 1; at++) {
      if (!joined.has(at) || broken.has(at)) {
        breaks.add(at);
      }
    }
    return breaks;
  }
  groupStarts(score) {
    const starts = new Map;
    let partCount = 0;
    for (const node of score.child("part-list")?.children ?? []) {
      if (!(node instanceof MElement)) {
        continue;
      }
      if (node.tag === "score-part") {
        partCount++;
      } else if (node.tag === "part-group" && node.getAttribute("type") === "start") {
        starts.set(partCount, [...starts.get(partCount) ?? [], node]);
      }
    }
    return starts;
  }
  groupTimeSpans(score) {
    const starts = this.groupStarts(score);
    const taken = new Map;
    return score.partGroups.flatMap((group) => {
      const k = taken.get(group.fromPartIndex) ?? 0;
      taken.set(group.fromPartIndex, k + 1);
      const marker = starts.get(group.fromPartIndex)?.[k];
      return marker?.child("group-time") && group.toPartIndex > group.fromPartIndex ? [{ fromPart: group.fromPartIndex, toPart: group.toPartIndex }] : [];
    });
  }
  partGroups(score) {
    const starts = this.groupStarts(score);
    const taken = new Map;
    return score.partGroups.flatMap((group) => {
      const k = taken.get(group.fromPartIndex) ?? 0;
      taken.set(group.fromPartIndex, k + 1);
      const marker = starts.get(group.fromPartIndex)?.[k] ?? null;
      const symbol = this.groupSymbol(group.symbol);
      return symbol && group.toPartIndex > group.fromPartIndex ? [
        {
          fromPart: group.fromPartIndex,
          toPart: group.toPartIndex,
          symbol,
          depth: group.depth,
          name: this.labelOf(marker?.child("group-name") ?? null, marker?.child("group-name-display") ?? null, group.name),
          abbreviation: this.labelOf(marker?.child("group-abbreviation") ?? null, marker?.child("group-abbreviation-display") ?? null, group.abbreviation)
        }
      ] : [];
    }).sort((a, b) => a.depth - b.depth);
  }
  partLabels(part) {
    const entry = part.score.child("part-list")?.childrenNamed("score-part").find((scorePart) => scorePart.getAttribute("id") === part.id);
    return {
      name: this.labelOf(entry?.child("part-name") ?? null, entry?.child("part-name-display") ?? null, null),
      abbreviation: this.labelOf(entry?.child("part-abbreviation") ?? null, entry?.child("part-abbreviation-display") ?? null, null)
    };
  }
  documentLayoutOf(score) {
    const prints = new Map;
    score.parts.forEach((part, partIndex) => {
      part.measures.forEach((measure, m) => {
        const print = measure.print;
        if (!print) {
          return;
        }
        const row = prints.get(m) ?? Array.from({ length: score.parts.length }, () => null);
        row[partIndex] = this.layoutBlockOf(print, print.newPage, this.blankPagesOf(print));
        prints.set(m, row);
      });
    });
    return new DocumentLayout(this.layoutBlockOf(score.child("defaults"), false, 0), prints);
  }
  appearanceOf(score) {
    const appearance = score.child("defaults")?.child("appearance");
    const sizes = (tag) => {
      const sizes = new Map;
      for (const element of appearance?.childrenNamed(tag) ?? []) {
        const type = element.getAttribute("type")?.trim();
        const value = Number(element.text?.trim() || Number.NaN);
        if (type && Number.isFinite(value) && value > 0) {
          sizes.set(type, value);
        }
      }
      return sizes;
    };
    const glyphs = new Map;
    for (const element of appearance?.childrenNamed("glyph") ?? []) {
      const type = element.getAttribute("type")?.trim();
      const name = element.text?.trim();
      if (type && name) {
        glyphs.set(type, name);
      }
    }
    return new Appearance(sizes("line-width"), sizes("distance"), glyphs);
  }
  layoutBlockOf(element, newPage, blankPages) {
    const number = (parent, tag) => {
      const text = parent?.child(tag)?.text?.trim();
      const value = text ? Number(text) : Number.NaN;
      return Number.isFinite(value) ? value : null;
    };
    const page = element?.child("page-layout");
    const margins = page?.childrenNamed("page-margins") ?? [];
    const pageMargins = margins.find((m) => m.getAttribute("type") === "odd") ?? margins.find((m) => m.getAttribute("type") === "both") ?? margins.find((m) => m.getAttribute("type") === null) ?? null;
    const evenMargins = margins.find((m) => m.getAttribute("type") === "even") ?? null;
    const system = element?.child("system-layout");
    const systemMargins = system?.child("system-margins");
    const staffDistances = new Map;
    for (const staff of element?.childrenNamed("staff-layout") ?? []) {
      const distance = number(staff, "staff-distance");
      if (distance !== null) {
        staffDistances.set(staff.getAttribute("number") ?? ANY_STAFF, distance);
      }
    }
    return {
      pageWidth: number(page, "page-width"),
      pageHeight: number(page, "page-height"),
      pageMargins: pageMargins ? this.pageMarginsOf(pageMargins) : null,
      evenPageMargins: evenMargins ? this.pageMarginsOf(evenMargins) : null,
      systemLeft: number(systemMargins, "left-margin"),
      systemRight: number(systemMargins, "right-margin"),
      systemDistance: number(system, "system-distance"),
      topSystemDistance: number(system, "top-system-distance"),
      staffDistances,
      newPage,
      blankPages
    };
  }
  blankPagesOf(print) {
    const count = Number(print.getAttribute("blank-page"));
    return Number.isInteger(count) && count > 0 ? count : 0;
  }
  pageMarginsOf(margins) {
    const side = (tag) => Number(margins.child(tag)?.text) || 0;
    return {
      left: side("left-margin"),
      right: side("right-margin"),
      top: side("top-margin"),
      bottom: side("bottom-margin")
    };
  }
  headerOf(score) {
    const header = this.creditHeader(score) ?? this.catalogHeader(score);
    if (header.footer.length === 0) {
      header.footer = this.identificationRights(score);
    }
    const empty = !header.title && header.subtitles.length === 0 && header.left.length === 0 && header.right.length === 0 && header.symbols.length === 0 && header.footer.length === 0;
    return empty ? null : header;
  }
  creditHeader(score) {
    const layout = score.childrenNamed("defaults")[0]?.childrenNamed("page-layout")[0];
    const pageWidth = Number(layout?.childrenNamed("page-width")[0]?.text);
    const pageHeight = Number(layout?.childrenNamed("page-height")[0]?.text);
    const credits = score.childrenNamed("credit").filter((credit) => (credit.getAttribute("page") ?? "1") === "1").map((credit) => {
      const words = credit.childrenNamed("credit-words");
      const first = words[0];
      const symbols = credit.childrenNamed("credit-symbol").map((symbol) => smuflGlyph(symbol.text?.trim() ?? "") || undefined).filter((glyph) => glyph !== undefined);
      const y = Number(first?.getAttribute("default-y"));
      return {
        type: credit.childrenNamed("credit-type")[0]?.text?.trim() ?? null,
        lines: words.map((run) => run.text?.trim() ? run.text : `
`).join("").split(`
`).map((line) => line.trim()).filter((line) => line && !/^\d+$/.test(line)),
        symbols,
        side: this.creditSide(first, pageWidth),
        y: Number.isFinite(y) ? y : null
      };
    });
    const footer = credits.filter((credit) => credit.type === "rights").flatMap((credit) => credit.lines);
    const placed = credits.filter((credit) => credit.type !== "rights" && (credit.lines.length > 0 || credit.symbols.length > 0)).filter((credit) => (credit.lines.length > 0 || credit.symbols.length > 0) && !(credit.y !== null && Number.isFinite(pageHeight) && credit.y < pageHeight / 2));
    if (placed.every((credit) => credit.y !== null)) {
      placed.sort((a, b) => (b.y ?? 0) - (a.y ?? 0));
    }
    const header = {
      title: null,
      subtitles: [],
      left: [],
      right: [],
      symbols: [],
      footer
    };
    const centered = [];
    for (const credit of placed) {
      header.symbols.push(...credit.symbols);
      const role = CREDIT_ROLES.get(credit.type ?? "") ?? null;
      if (credit.type !== null && !role) {
        continue;
      }
      switch (role ?? credit.side) {
        case "title":
          header.title ??= credit.lines[0] ?? null;
          header.subtitles.push(...credit.lines.slice(1));
          break;
        case "subtitle":
          header.subtitles.push(...credit.lines);
          break;
        case "center":
          centered.push(...credit.lines);
          break;
        case "left":
          header.left.push(...credit.lines);
          break;
        case "right":
          header.right.push(...credit.lines);
          break;
      }
    }
    if (header.title === null) {
      header.title = centered.shift() ?? null;
    }
    header.subtitles.unshift(...centered);
    return placed.length > 0 || footer.length > 0 ? header : null;
  }
  creditSide(words, pageWidth) {
    const align = words?.getAttribute("halign") ?? words?.getAttribute("justify") ?? null;
    if (align === "left" || align === "center" || align === "right") {
      return align;
    }
    const x = Number(words?.getAttribute("default-x"));
    if (!Number.isFinite(x) || !Number.isFinite(pageWidth)) {
      return "left";
    }
    if (x < pageWidth / 3) {
      return "left";
    }
    return x > 2 * pageWidth / 3 ? "right" : "center";
  }
  catalogHeader(score) {
    const creators = score.childrenNamed("identification").flatMap((identification) => identification.childrenNamed("creator")).flatMap((creator) => {
      const text = creator.text?.trim();
      const role = CREDIT_ROLES.get(creator.getAttribute("type") ?? "");
      return text && (role === "left" || role === "right") ? [{ text, role }] : [];
    });
    const work = score.childrenNamed("work")[0]?.childrenNamed("work-title")[0]?.text?.trim() || null;
    const movementTitle = score.childrenNamed("movement-title")[0]?.text?.trim() || null;
    const movementNumber = score.childrenNamed("movement-number")[0]?.text?.trim() || null;
    let movement = movementTitle ?? movementNumber;
    if (movementTitle && movementNumber) {
      const dot = /^[\dIVXLC]+$/i.test(movementNumber) ? "." : "";
      movement = `${movementNumber}${dot} ${movementTitle}`;
    }
    const workNumber = score.childrenNamed("work")[0]?.childrenNamed("work-number")[0]?.text?.trim() || null;
    const title = work ?? movement;
    const subtitles = [
      ...work && workNumber ? [workNumber] : [],
      ...work && movement && movementTitle !== work ? [movement] : []
    ];
    return {
      title,
      subtitles,
      left: creators.filter((c) => c.role === "left").map((c) => c.text),
      right: creators.filter((c) => c.role === "right").map((c) => c.text),
      symbols: [],
      footer: []
    };
  }
  identificationRights(score) {
    return score.childrenNamed("identification").flatMap((identification) => identification.childrenNamed("rights")).flatMap((rights) => (rights.text ?? "").split(`
`)).map((line) => line.trim()).filter(Boolean);
  }
  labelOf(plain, display, fallback) {
    const source = display ?? plain;
    if (source?.getAttribute("print-object") === "no") {
      return null;
    }
    if (display) {
      const text = display.children.map((run) => {
        if (!(run instanceof MElement)) {
          return "";
        }
        if (run.tag === "accidental-text") {
          return ACCIDENTAL_TEXT[run.text?.trim() ?? ""] ?? "";
        }
        return run.tag === "display-text" ? run.text ?? "" : "";
      }).join("");
      if (text.trim()) {
        return text;
      }
    }
    return plain?.text?.trim() || fallback;
  }
  measureRepeats(measures) {
    const read = measures.map((measure) => this.readBarlines(measure));
    const out = [];
    let open = null;
    let hidden = false;
    for (const [i, r] of read.entries()) {
      if (r.started !== null) {
        hidden = r.startHidden;
      }
      const number = r.started ?? open;
      const first = number !== null && open === null;
      const restated = r.closed !== null && read[i + 1]?.started === number;
      const last = r.closed !== null && !restated;
      open = number === null || last ? null : number;
      out.push({
        repeatBegin: r.repeatBegin,
        repeatEnd: r.repeatEnd,
        repeatTimes: r.repeatTimes,
        geometry: r.geometry,
        ending: number === null ? null : {
          number,
          first,
          last,
          hidden,
          open: last && (r.closed === "discontinue" || !r.repeatEnd && i < read.length - 1)
        }
      });
    }
    return out;
  }
  measureJumps(measures) {
    return this.measureRepeats(measures).map(({ repeatBegin, repeatEnd, repeatTimes, ending }, i) => {
      const jumps = [];
      const measure = measures[i];
      if (measure) {
        jumps.push(...this.navigationJumps(measure));
      }
      if (repeatBegin) {
        jumps.push({ type: "repeatstart" });
      }
      if (ending) {
        jumps.push({
          type: "repeatending",
          times: this.endingPasses(ending.number),
          last: ending.last,
          number: this.endingFirstPass(ending.number)
        });
      } else if (repeatEnd) {
        jumps.push({
          type: "repeatend",
          times: Math.max(0, (repeatTimes ?? 2) - 1)
        });
      }
      return jumps;
    });
  }
  navigationJumps(measure) {
    const jumps = [];
    for (const sound of measure.sounds) {
      const segno = sound.getAttribute("segno");
      if (segno !== null) {
        jumps.push({ type: "segno", id: segno });
      }
      const coda = sound.getAttribute("coda");
      if (coda !== null) {
        jumps.push({ type: "coda", id: coda });
      }
      const fine = sound.getAttribute("fine");
      if (fine !== null && fine !== "no") {
        jumps.push({ type: "fine" });
      }
      const tocoda = sound.getAttribute("tocoda");
      if (tocoda !== null) {
        jumps.push({ type: "tocoda", id: tocoda });
      }
      if (sound.getAttribute("dacapo") === "yes") {
        jumps.push({ type: "dacapo" });
      }
      const dalsegno = sound.getAttribute("dalsegno");
      if (dalsegno !== null) {
        jumps.push({ type: "dalsegno", id: dalsegno });
      }
    }
    return jumps;
  }
  endingPasses(numberAttr) {
    if (!numberAttr) {
      return 1;
    }
    let total = 0;
    for (const part of numberAttr.split(",")) {
      const range = part.trim().match(/^(\d+)\s*-\s*(\d+)$/);
      if (range) {
        total += Math.max(1, Number(range[2]) - Number(range[1]) + 1);
      } else if (part.trim()) {
        total += 1;
      }
    }
    return Math.max(1, total);
  }
  endingFirstPass(numberAttr) {
    return Number(numberAttr?.split(/[,-]/)[0]?.trim()) || 1;
  }
  modulationNotesOf(notes) {
    return notes.map((note) => ({
      type: note.type,
      dots: note.dots,
      beamed: note.beams.length > 0,
      tiesToNext: note.child("metronome-tied")?.getAttribute("type") === "start",
      beamsToNext: note.beams.filter((beam) => beam === "begin" || beam === "continue").length,
      tuplet: note.tuplet ? { actual: note.tuplet.actual, type: note.tuplet.type } : null
    }));
  }
  placementOf(direction, fallback) {
    return direction.placement ?? fallback;
  }
  pictogramElementOf(element) {
    if (element.tag === "percussion") {
      const pictogram = element.children.find((c) => c instanceof MElement);
      return pictogram ? this.pictogramOf(pictogram) : null;
    }
    if (element.tag === "accordion-registration") {
      const middle = element.child("accordion-middle");
      return {
        kind: "accordion",
        high: element.child("accordion-high") !== null,
        middle: middle ? Math.min(3, Number(middle.text) || 1) : 0,
        low: element.child("accordion-low") !== null
      };
    }
    if (element.tag === "scordatura") {
      const strings = element.childrenNamed("accord").map((accord) => {
        const step = accord.child("tuning-step")?.text?.trim();
        if (!step) {
          return null;
        }
        const alter = Math.round(Number(accord.child("tuning-alter")?.text ?? 0) || 0);
        const sign = (alter < 0 ? "♭" : "♯").repeat(Math.abs(alter));
        return `${accord.getAttribute("string") ?? "?"} = ${step}${sign}`;
      }).filter((text) => text !== null);
      return strings.length > 0 ? { kind: "text", text: `Scordatura: ${strings.join(", ")}` } : null;
    }
    return null;
  }
  pictogramOf(element) {
    const value = element.text?.trim() ?? "";
    const tip = TIP_INDEX[element.getAttribute("tip") ?? ""] ?? 0;
    let glyph;
    const named = smuflGlyph(element.getAttribute("smufl"));
    if (named) {
      return { kind: "glyph", glyph: named };
    }
    if (element.tag === "timpani") {
      glyph = TIMPANI_GLYPH;
    } else if (element.tag === "beater") {
      const beater = BEATER_GLYPHS[value];
      glyph = Array.isArray(beater) ? beater[tip] ?? beater[0] : beater;
    } else if (element.tag === "stick") {
      const type = element.child("stick-type")?.text?.trim() ?? "";
      const material = element.child("stick-material")?.text?.trim() ?? "";
      const sticks = STICK_GLYPHS[type]?.[material];
      glyph = sticks?.[tip] ?? sticks?.[0];
      if (!glyph) {
        const text = `${material} ${type}`.trim();
        return text ? { kind: "text", text } : null;
      }
      const enclosures = [
        element.getAttribute("parentheses") === "yes" ? "" : "",
        element.getAttribute("dashed-circle") === "yes" ? "" : ""
      ].filter(Boolean);
      if (enclosures.length && sticks?.[0]) {
        return {
          kind: "glyph",
          glyph,
          enclosure: {
            glyphs: enclosures,
            head: sticks[0],
            tip: sticks[tip] ? tip : 0
          }
        };
      }
    } else {
      glyph = PERCUSSION_GLYPHS[element.tag]?.[value];
    }
    if (glyph) {
      return { kind: "glyph", glyph };
    }
    return value ? { kind: "text", text: value } : null;
  }
  measureWidthOf(measure) {
    const raw = measure.getAttribute("width");
    const width = Number(raw);
    return raw !== null && Number.isFinite(width) && width > 0 ? width : null;
  }
  positionOf(element, host = null) {
    const read = (name) => {
      const value = element.getAttribute(name);
      const number = Number(value);
      return value !== null && Number.isFinite(number) ? number : null;
    };
    const x = read("default-x");
    const y = read("default-y");
    const dx = read("relative-x");
    const dy = read("relative-y");
    if (x === null && y === null && dx === null && dy === null) {
      return null;
    }
    let side = null;
    if (y !== null && host !== null && host.placement === null) {
      if (y >= 0) {
        side = "above";
      } else if (y < -STAFF_LINES_SPAN) {
        side = "below";
      }
    }
    return { x, y, dx: dx ?? 0, dy: dy ?? 0, side };
  }
  wordFontOf(measure) {
    const score = measure.part.score;
    if (!this.wordFonts.has(score)) {
      this.wordFonts.set(score, score.child("defaults")?.child("word-font") ?? null);
    }
    return this.wordFonts.get(score) ?? null;
  }
  formatOf(element, fallback, sizeBase) {
    const attr = (name) => element.getAttribute(name) ?? fallback?.getAttribute(name) ?? null;
    const style = attr("font-style");
    const weight = attr("font-weight");
    const enclosure = element.getAttribute("enclosure");
    const align = element.getAttribute("halign") ?? element.getAttribute("justify");
    const valign = element.getAttribute("valign");
    const underline = Number(element.getAttribute("underline") ?? 0);
    const rotation = Number(element.getAttribute("rotation") ?? 0);
    return {
      valign: valign === "top" || valign === "middle" || valign === "bottom" || valign === "baseline" ? valign : null,
      family: attr("font-family"),
      italic: style === null ? null : style === "italic",
      bold: weight === null ? null : weight === "bold",
      scale: fontScaleOf(element.getAttribute("font-size"), sizeBase?.getAttribute("font-size") ?? null),
      enclosure: enclosure === "none" || isEnclosureShape(enclosure) ? enclosure : null,
      underline: Number.isInteger(underline) ? Math.min(Math.max(underline, 0), MAX_UNDERLINES) : 0,
      rotation: Number.isFinite(rotation) ? Math.min(Math.max(rotation, -180), 180) : 0,
      align: align === "left" || align === "center" || align === "right" ? align : null
    };
  }
  harmonyExtensionSigns(kind) {
    return kind.replace(/b(?=\d)/g, "♭").replace(/#(?=\d)/g, "♯");
  }
  harmonySymbol(harmony) {
    const root = harmony.root;
    const step = root?.text ?? root?.step ?? "";
    const alter = this.harmonyAlter(harmony.child("root")?.child("root-alter"));
    const kindEl = harmony.child("kind");
    const kindValue = harmony.kind?.value ?? "";
    const symbols = kindEl?.getAttribute("use-symbols") === "yes";
    const kind = this.harmonyExtensionSigns((symbols ? HARMONY_KIND_SYMBOLS[kindValue] : undefined) ?? harmony.kind?.text ?? (kindEl ? HARMONY_KIND_SUFFIX[kindValue] ?? "" : ""));
    const degrees = this.degreeTexts(harmony);
    const [open, close] = this.degreeBrackets(kindEl, degrees.length > 0);
    const stacked = degrees.length > 0 && kindEl?.getAttribute("stack-degrees") === "yes";
    const inline = degrees.join(open ? "," : "");
    const head = step + alter + kind + open;
    const tail = close + this.bassText(harmony);
    return {
      text: head + inline + tail,
      head: stacked ? head : head + inline + tail,
      stack: stacked ? degrees : [],
      tail: stacked ? tail : "",
      hang: false
    };
  }
  analysisSymbol(harmony) {
    const numeral = harmony.child("numeral");
    const fn = harmony.child("function");
    if (!numeral && !fn) {
      return null;
    }
    const kindEl = harmony.child("kind");
    const kindValue = harmony.kind?.value ?? "";
    const quality = NUMERAL_QUALITY[kindValue];
    const tones = HARMONY_KIND_TONES[kindValue] ?? [];
    const seventh = tones.length === 3 && tones[2]?.[0] === 7;
    const kindText = kindEl?.getAttribute("text");
    const suffix = kindText ?? quality?.suffix ?? HARMONY_KIND_SUFFIX[kindValue] ?? "";
    const inversionEl = harmony.child("inversion");
    const inversion = Number(inversionEl?.text ?? 0);
    const figures = inversionEl?.getAttribute("text")?.split("") ?? (seventh ? SEVENTH_FIGURES[inversion] ?? [] : TRIAD_FIGURES[inversion] ?? []);
    const stack = kindText && inversion === 0 ? [] : figures;
    const degrees = this.degreeTexts(harmony).join("");
    const head = `${this.numeralKeyText(numeral)}${this.numeralText(numeral, fn, quality?.lower ?? false)}${suffix}`;
    return {
      text: head + stack.join("") + degrees,
      head: stack.length > 0 ? head : head + degrees,
      stack: [...stack].reverse(),
      tail: stack.length > 0 ? degrees : "",
      hang: true
    };
  }
  numeralText(numeral, fn, lower) {
    const rootEl = numeral?.child("numeral-root");
    if (!rootEl) {
      return fn?.text?.trim() ?? "";
    }
    const degree = Number(rootEl.text ?? 0);
    const roman = ROMAN_NUMERALS[degree - 1] ?? "";
    const root = rootEl.getAttribute("text") ?? (lower ? roman.toLowerCase() : roman);
    const alterEl = numeral?.child("numeral-alter");
    if (!alterEl || alterEl.getAttribute("print-object") === "no") {
      return root;
    }
    const semitones = Number(alterEl.text ?? 0);
    const sign = (semitones > 0 ? "♯" : "♭").repeat(Math.abs(semitones));
    return alterEl.getAttribute("location") === "right" ? root + sign : sign + root;
  }
  numeralKeyText(numeral) {
    const keyEl = numeral?.child("numeral-key");
    if (!keyEl || keyEl.getAttribute("print-object") === "no") {
      return "";
    }
    const fifths = Number(keyEl.child("numeral-fifths")?.text ?? 0);
    const minor = keyEl.child("numeral-mode")?.text?.trim().endsWith("minor") ?? false;
    const tonic = minor ? MINOR_TONICS[fifths + 7]?.toLowerCase() : MAJOR_TONICS[fifths + 7];
    return tonic ? `${tonic}: ` : "";
  }
  degreeBrackets(kindEl, any) {
    if (any && kindEl?.getAttribute("parentheses-degrees") === "yes") {
      return ["(", ")"];
    }
    if (any && kindEl?.getAttribute("bracket-degrees") === "yes") {
      return ["[", "]"];
    }
    return ["", ""];
  }
  degreeTexts(harmony) {
    return harmony.childrenNamed("degree").filter((degree) => degree.getAttribute("print-object") !== "no").map((degree) => {
      const valueEl = degree.child("degree-value");
      const alterEl = degree.child("degree-alter");
      const typeEl = degree.child("degree-type");
      const type = typeEl?.text?.trim() ?? "alter";
      const spelled = typeEl?.getAttribute("text") ?? null;
      if (type === "subtract" && spelled === null) {
        return "";
      }
      const typeText = spelled ?? DEGREE_TYPE_TEXT[type] ?? "";
      const semitones = Number(alterEl?.text ?? 0);
      const plusMinus = alterEl?.getAttribute("plus-minus") === "yes";
      const signs = plusMinus ? DEGREE_PLUS_MINUS : DEGREE_SIGNS;
      const sign = (semitones > 0 ? signs.up : signs.down).repeat(Math.abs(semitones));
      const symbol = HARMONY_SYMBOLS[valueEl?.getAttribute("symbol") ?? ""] ?? "";
      const value = valueEl?.getAttribute("text") ?? valueEl?.text?.trim() ?? "";
      return typeText + sign + symbol + value;
    }).filter((text) => text !== "");
  }
  harmonyAlter(element) {
    const print = element?.getAttribute("print-object");
    const alter = element?.text ?? "";
    if (print === "no" || Number(alter) === 0 && print !== "yes") {
      return "";
    }
    return HARMONY_ALTER[alter] ?? "";
  }
  bassText(harmony) {
    const bass = harmony.bass;
    if (bass?.step) {
      const separatorEl = harmony.child("bass")?.child("bass-separator");
      const separator = separatorEl ? separatorEl.text ?? "" : "/";
      return `${separator}${bass.text ?? bass.step}${this.harmonyAlter(harmony.child("bass")?.child("bass-alter"))}`;
    }
    const inversionEl = harmony.child("inversion");
    const inversion = Number(inversionEl?.text ?? 0);
    if (!inversionEl || !(inversion > 0)) {
      return "";
    }
    const text = inversionEl.getAttribute("text");
    if (text !== null) {
      return `/${text}`;
    }
    const root = harmony.root;
    const tone = HARMONY_KIND_TONES[harmony.kind?.value ?? ""]?.[inversion - 1];
    const rootIndex = STEPS.indexOf(root?.step ?? "");
    if (!root || !tone || rootIndex < 0) {
      return "";
    }
    const [degree, semitones] = tone;
    const step = STEPS[(rootIndex + degree - 1) % 7];
    const target = STEP_SEMITONES[rootIndex] + (root.alter ?? 0) + semitones;
    const natural = STEP_SEMITONES[STEPS.indexOf(step)];
    const alter = ((target - natural) % 12 + 18) % 12 - 6;
    return `/${step}${alter === 0 ? "" : HARMONY_ALTER[String(alter)] ?? ""}`;
  }
  frameOf(harmony) {
    const frame = harmony.frame;
    if (!frame || harmony.getAttribute("print-frame") === "no") {
      return null;
    }
    const numStrings = frame.strings;
    const frameNotes = frame.frameNotes;
    const absFret = new Map;
    for (const fn of frameNotes) {
      absFret.set(fn.string, fn.fret);
    }
    const fretted = [...absFret.values()].filter((f) => f > 0);
    const hasOpen = [...absFret.values()].includes(0);
    const firstFret = frame.firstFret ?? (fretted.length > 0 && !hasOpen ? Math.min(...fretted) : 1);
    const toRelative = (abs) => abs === 0 ? 0 : abs - firstFret + 1;
    const played = new Map;
    const barreStart = new Map;
    const barres = [];
    for (const fn of frameNotes) {
      const relFret = toRelative(fn.fret);
      played.set(fn.string, relFret);
      if (fn.barre === "start") {
        barreStart.set(relFret, fn.string);
      } else if (fn.barre === "stop") {
        const from = barreStart.get(relFret);
        if (from !== undefined) {
          barres?.push({
            fromString: from,
            toString: fn.string,
            fret: relFret
          });
        }
      }
    }
    let position = firstFret;
    let positionText = 0;
    if (firstFret > 1 && fretted.length > 0) {
      const lowString = Math.max(...[...absFret].filter(([, f]) => f > 0).map(([s]) => s));
      const lowFret = absFret.get(lowString);
      position = lowFret;
      positionText = lowFret - firstFret;
    }
    const chord = [];
    for (let s = 1;s <= numStrings; s += 1) {
      chord.push([s, played.has(s) ? played.get(s) : "x"]);
    }
    const unplayed = frame.getAttribute("unplayed");
    return {
      chord,
      position,
      positionText,
      barres,
      fretCount: frame.frets,
      ...unplayed === null ? {} : { unplayed }
    };
  }
  multiRestCountOf(measure) {
    if (!measure) {
      return null;
    }
    const count = measure.getMultiRestCount("1");
    for (let staff = 2;staff <= measure.staveCount; staff++) {
      if (measure.getMultiRestCount(String(staff)) !== count) {
        return null;
      }
    }
    return count;
  }
  groupSymbol(symbol) {
    switch (symbol) {
      case "brace":
        return "brace";
      case "bracket":
      case "square":
        return "bracket";
      case "line":
        return "line";
      default:
        return null;
    }
  }
  readBarlines(measure) {
    const read = {
      repeatBegin: false,
      repeatEnd: false,
      repeatTimes: null,
      started: null,
      startHidden: false,
      closed: null,
      geometry: { ...NO_BARLINE_GEOMETRY }
    };
    for (const barline of measure.barlines) {
      const winged = this.wingedOf(barline.childrenNamed("repeat")[0]);
      if (barline.repeat === "forward") {
        read.repeatBegin = true;
        read.geometry.beginWinged = winged;
      } else if (barline.repeat === "backward") {
        read.repeatEnd = true;
        read.repeatTimes = barline.repeatTimes;
        read.geometry.endWinged = winged;
      }
      const ending = barline.ending;
      const endingElement = barline.childrenNamed("ending")[0];
      const jog = this.tenthsOf(endingElement, "end-length");
      if (ending?.type === "start") {
        read.started = ending.number;
        read.startHidden = endingElement?.getAttribute("print-object") === "no";
        read.geometry.startJog = jog;
        read.geometry.textX = this.tenthsOf(endingElement, "text-x");
      } else if (ending) {
        read.closed = ending.type;
        read.geometry.endJog = jog;
      }
    }
    return read;
  }
  wingedOf(repeat) {
    const value = repeat?.getAttribute("winged");
    return WINGED.find((w) => w === value) ?? "none";
  }
  tenthsOf(element, name) {
    const raw = element?.getAttribute(name);
    const value = raw == null ? Number.NaN : Number(raw);
    return Number.isFinite(value) ? value : null;
  }
}
var SYSTEM_RELATIONS = [
  "only-top",
  "only-bottom",
  "also-top",
  "also-bottom",
  "none"
];
var STAFF_LINES_SPAN = 40;
var HARP_PEDAL_GLYPHS = ["", "", ""];
var HARP_PEDAL_CENTERED = "";
var HARP_PEDAL_DIVIDER = "";
var MAX_UNDERLINES = 3;
function isEnclosureShape(value) {
  return ENCLOSURE_SHAPES.includes(value);
}
var PEDAL_TYPES = {
  start: "start",
  sostenuto: "start",
  resume: "start",
  change: "change",
  stop: "stop",
  discontinue: "stop"
};
var LINE_TYPE_DASH = {
  solid: null,
  dashed: [5, 5],
  dotted: [1, 3],
  wavy: null
};
function lineDashOf(element) {
  const lineType = element.getAttribute("line-type") ?? "solid";
  const base = LINE_TYPE_DASH[lineType] ?? null;
  if (!base) {
    return null;
  }
  const length = (name) => {
    const value = Number(element.getAttribute(name));
    return value > 0 ? value : null;
  };
  const dash = lineType === "dashed" ? length("dash-length") : null;
  const space = length("space-length");
  return [dash ?? base[0] ?? 5, space ?? base[1] ?? 5];
}
var HARMONY_ALTER = { "1": "♯", "-1": "♭", "0": "♮" };
var DEGREE_TYPE_TEXT = {
  add: "add",
  alter: ""
};
var DEGREE_SIGNS = { up: "♯", down: "♭" };
var DEGREE_PLUS_MINUS = { up: "+", down: "-" };
var STEPS = ["C", "D", "E", "F", "G", "A", "B"];
var STEP_SEMITONES = [0, 2, 4, 5, 7, 9, 11];
var THIRD = [3, 4];
var FLAT_THIRD = [3, 3];
var FIFTH = [5, 7];
var SEVENTH = [7, 10];
var MAJOR_SEVENTH = [7, 11];
var HARMONY_KIND_TONES = {
  major: [THIRD, FIFTH],
  minor: [FLAT_THIRD, FIFTH],
  augmented: [THIRD, [5, 8]],
  diminished: [FLAT_THIRD, [5, 6]],
  dominant: [THIRD, FIFTH, SEVENTH],
  "major-seventh": [THIRD, FIFTH, MAJOR_SEVENTH],
  "minor-seventh": [FLAT_THIRD, FIFTH, SEVENTH],
  "diminished-seventh": [FLAT_THIRD, [5, 6], [7, 9]],
  "augmented-seventh": [THIRD, [5, 8], SEVENTH],
  "half-diminished": [FLAT_THIRD, [5, 6], SEVENTH],
  "major-minor": [FLAT_THIRD, FIFTH, MAJOR_SEVENTH],
  "major-sixth": [THIRD, FIFTH, [6, 9]],
  "minor-sixth": [FLAT_THIRD, FIFTH, [6, 9]],
  "dominant-ninth": [THIRD, FIFTH, SEVENTH, [9, 14]],
  "major-ninth": [THIRD, FIFTH, MAJOR_SEVENTH, [9, 14]],
  "minor-ninth": [FLAT_THIRD, FIFTH, SEVENTH, [9, 14]],
  "dominant-11th": [THIRD, FIFTH, SEVENTH, [9, 14], [11, 17]],
  "major-11th": [THIRD, FIFTH, MAJOR_SEVENTH, [9, 14], [11, 17]],
  "minor-11th": [FLAT_THIRD, FIFTH, SEVENTH, [9, 14], [11, 17]],
  "dominant-13th": [THIRD, FIFTH, SEVENTH, [9, 14], [11, 17], [13, 21]],
  "major-13th": [THIRD, FIFTH, MAJOR_SEVENTH, [9, 14], [11, 17], [13, 21]],
  "minor-13th": [FLAT_THIRD, FIFTH, SEVENTH, [9, 14], [11, 17], [13, 21]],
  "suspended-second": [[2, 2], FIFTH],
  "suspended-fourth": [[4, 5], FIFTH],
  power: [FIFTH]
};
var ROMAN_NUMERALS = ["I", "II", "III", "IV", "V", "VI", "VII"];
var NUMERAL_QUALITY = {
  major: { lower: false, suffix: "" },
  minor: { lower: true, suffix: "" },
  augmented: { lower: false, suffix: "+" },
  diminished: { lower: true, suffix: "°" },
  dominant: { lower: false, suffix: "" },
  "major-seventh": { lower: false, suffix: "M" },
  "minor-seventh": { lower: true, suffix: "" },
  "diminished-seventh": { lower: true, suffix: "°" },
  "augmented-seventh": { lower: false, suffix: "+" },
  "half-diminished": { lower: true, suffix: "ø" },
  "major-minor": { lower: true, suffix: "M" }
};
var TRIAD_FIGURES = [[], ["6"], ["6", "4"]];
var SEVENTH_FIGURES = [["7"], ["6", "5"], ["4", "3"], ["4", "2"]];
var MAJOR_TONICS = [
  "C♭",
  "G♭",
  "D♭",
  "A♭",
  "E♭",
  "B♭",
  "F",
  "C",
  "G",
  "D",
  "A",
  "E",
  "B",
  "F♯",
  "C♯"
];
var MINOR_TONICS = [
  "A♭",
  "E♭",
  "B♭",
  "F",
  "C",
  "G",
  "D",
  "A",
  "E",
  "B",
  "F♯",
  "C♯",
  "G♯",
  "D♯",
  "A♯"
];
var HARMONY_SYMBOLS = {
  major: "△",
  minor: "-",
  augmented: "+",
  diminished: "°",
  "half-diminished": "ø"
};
var HARMONY_KIND_SYMBOLS = {
  minor: "-",
  augmented: "+",
  diminished: "°",
  "major-seventh": "△7",
  "minor-seventh": "-7",
  "diminished-seventh": "°7",
  "augmented-seventh": "+7",
  "half-diminished": "ø7",
  "major-minor": "-",
  "minor-sixth": "-6",
  "major-ninth": "△9",
  "minor-ninth": "-9",
  "major-11th": "△11",
  "minor-11th": "-11",
  "major-13th": "△13",
  "minor-13th": "-13"
};
var HARMONY_KIND_SUFFIX = {
  major: "",
  minor: "m",
  augmented: "+",
  diminished: "dim",
  dominant: "7",
  "major-seventh": "maj7",
  "minor-seventh": "m7",
  "diminished-seventh": "dim7",
  "augmented-seventh": "+7",
  "half-diminished": "m7♭5",
  "major-minor": "mMaj7",
  "major-sixth": "6",
  "minor-sixth": "m6",
  "dominant-ninth": "9",
  "major-ninth": "maj9",
  "minor-ninth": "m9",
  "dominant-11th": "11",
  "major-11th": "maj11",
  "minor-11th": "m11",
  "dominant-13th": "13",
  "major-13th": "maj13",
  "minor-13th": "m13",
  "suspended-second": "sus2",
  "suspended-fourth": "sus4",
  Neapolitan: "N",
  Italian: "It",
  French: "Fr",
  German: "Ger",
  pedal: "ped",
  power: "5",
  Tristan: "Tr",
  other: "",
  none: ""
};
var FIGURE_SIGN = {
  sharp: "♯",
  flat: "♭",
  natural: "♮",
  "double-sharp": "\uD834\uDD2A",
  "sharp-sharp": "♯♯",
  "flat-flat": "\uD834\uDD2B",
  slash: "/",
  "back-slash": "\\"
};
var ACCIDENTAL_TEXT = {
  sharp: "♯",
  flat: "♭",
  natural: "♮",
  "double-sharp": "\uD834\uDD2A",
  "flat-flat": "\uD834\uDD2B"
};
var CREDIT_ROLES = new Map([
  ["title", "title"],
  ["subtitle", "subtitle"],
  ["composer", "right"],
  ["arranger", "right"],
  ["lyricist", "left"],
  ["poet", "left"],
  ["translator", "left"]
]);
var WINGED = [
  "none",
  "straight",
  "curved",
  "double-straight",
  "double-curved"
];
var NO_BARLINE_GEOMETRY = {
  beginWinged: "none",
  endWinged: "none",
  startJog: null,
  endJog: null,
  textX: null
};
var NOT_STYLED = { hidden: false, sign: null };
function measureStyleEvents(measure, staffNumber) {
  const events = [];
  const children = measure.children;
  children.forEach((node, index) => {
    if (!(node instanceof MElement) || node.tag !== "attributes") {
      return;
    }
    const styles = node.childrenNamed("measure-style").filter((style) => {
      const number = style.getAttribute("number");
      return number === null || number === staffNumber;
    });
    if (styles.length === 0) {
      return;
    }
    const next = children.slice(index + 1).find((child) => child instanceof MElement && child.tag === "note");
    const beat = next?.measureBeat ?? measure.endBeat;
    for (const style of styles) {
      for (const element of style.children) {
        if (element instanceof MElement && STYLE_TAGS.has(element.tag)) {
          events.push({ beat, element });
        }
      }
    }
  });
  return events;
}
var STYLE_TAGS = new Set(["measure-repeat", "beat-repeat", "slash"]);
var NOTE_TYPE_BEATS = {
  breve: 8,
  whole: 4,
  half: 2,
  quarter: 1,
  eighth: 0.5,
  "16th": 0.25,
  "32nd": 0.125
};
function slashUnit(style) {
  const type = style.child("slash-type")?.text;
  const beats = type ? NOTE_TYPE_BEATS[type] : undefined;
  if (!beats) {
    return null;
  }
  let unit = beats;
  let dot = beats / 2;
  for (const _ of style.childrenNamed("slash-dot")) {
    unit += dot;
    dot /= 2;
  }
  return unit;
}
function beatUnit(time) {
  const beats = Number(time?.beats);
  const beatType = Number(time?.beatType);
  if (!beats || !beatType) {
    return 1;
  }
  const unit = 4 / beatType;
  return beatType >= 8 && beats > 3 && beats % 3 === 0 ? unit * 3 : unit;
}
function beatsAcross(length, unit) {
  const beats = [];
  for (let beat = 0;beat < length - EPSILON; beat += unit) {
    beats.push(beat);
  }
  return beats;
}
function bezierPointOf(element, outgoing = false) {
  const suffix = outgoing && element.tag === "slur" && element.getAttribute("type") === "continue" ? "2" : "";
  const read = (axis) => {
    const value = element.getAttribute(`bezier-${axis}${suffix}`);
    return value !== null && value.trim() !== "" && Number.isFinite(Number(value)) ? Number(value) : null;
  };
  return { x: read("x"), y: read("y") };
}
function curveSegmentOf(marker) {
  const span = marker.members;
  const opener = span[0];
  const closer = marker.getAttribute("type") === "start" ? marker.partner : span.at(-1);
  const members = span.filter((candidate) => candidate === marker || candidate === closer || candidate.getAttribute("type") === "continue" && candidate.members[0] === opener);
  const end = members[members.indexOf(marker) + 1];
  if (!end) {
    return null;
  }
  const startPoint = bezierPointOf(marker, true);
  const endPoint = bezierPointOf(end);
  const bezier = [startPoint.x, startPoint.y, endPoint.x, endPoint.y].some((v) => v !== null) ? { start: startPoint, end: endPoint } : null;
  return { end, bezier };
}

// measure-box.ts
class MeasureBox2 extends Element2 {
  number;
  index;
  sources;
  system;
  measureList;
  type = "measure";
  constructor(rect, viewport, number, index, sources, system, measureList) {
    super(rect, viewport);
    this.number = number;
    this.index = index;
    this.sources = sources;
    this.system = system;
    this.measureList = measureList;
  }
  getSources() {
    return this.sources;
  }
  getNumber() {
    return this.number;
  }
  getIndex() {
    return this.index;
  }
  getSystem() {
    return this.system;
  }
  rehome(system) {
    this.system = system;
  }
  getMeasures() {
    return [...this.measureList];
  }
}

// note.ts
class Note2 extends Element2 {
  deps;
  type = "note";
  color;
  halo;
  ink;
  glyph;
  constructor(deps) {
    super(deps.rect, deps.viewport);
    this.deps = deps;
    this.color = new Toggle(this, deps.decorations.color);
    this.halo = new Toggle(this, deps.decorations.halo);
    this.ink = deps.ink;
    this.glyph = deps.glyph;
  }
  drawn(raw) {
    this.relocate(raw.rect);
    this.ink = raw.ink;
    this.glyph = raw.glyph;
  }
  getSources() {
    return this.deps.source ? [this.deps.source] : [];
  }
  drawColor(ctx, color) {
    if (this.glyph) {
      this.stampGlyph(ctx, this.glyph, color);
    }
  }
  getPitch() {
    return this.deps.facts.pitch;
  }
  getDurationBeats() {
    return this.deps.facts.beats;
  }
  getArticulations() {
    return [...this.deps.facts.articulations];
  }
  isGrace() {
    return this.deps.facts.grace;
  }
  isSwingExempt() {
    return this.deps.facts.swingExempt;
  }
  getGraceNotes() {
    return this.deps.facts.graces.map((g) => this.deps.notes.get(g)).filter((n) => !!n);
  }
  getInkRect() {
    let ink = this.ink;
    for (const sibling of this.getChordSiblings({ includeSelf: true })) {
      for (const grace of sibling.getGraceNotes()) {
        ink = ink.union(grace.ink);
      }
    }
    return ink;
  }
  isChordMember() {
    return this.deps.facts.chordMember;
  }
  getChordSiblings(opts) {
    const all = [];
    for (const key of this.deps.chord) {
      const note = this.deps.notes.get(key);
      if (note) {
        all.push(note);
      }
    }
    return opts.includeSelf ? all : all.filter((n) => n !== this);
  }
  getMeasure() {
    return this.deps.measure;
  }
  getTabPosition() {
    return this.deps.tabs.get(this.deps.key) ?? null;
  }
}

// part.ts
class Part2 {
  source;
  id;
  label;
  measureList;
  constructor(source, id, label, measureList) {
    this.source = source;
    this.id = id;
    this.label = label;
    this.measureList = measureList;
  }
  getSources() {
    return this.source ? [this.source] : [];
  }
  getId() {
    return this.id;
  }
  getLabel() {
    return this.label;
  }
  getMeasures() {
    return [...this.measureList];
  }
}

// default-score-parser.ts
import {
  MDOMParser,
  MDocument,
  MElement as MElement2,
  MText,
  MusicXMLSerializer
} from "@stringsync/mdom";

class DefaultScoreParser {
  async parse(input) {
    if (input instanceof MDocument) {
      return input;
    }
    const parser = new MDOMParser;
    let document2;
    if (typeof input === "string") {
      document2 = parser.parseFromString(input);
    } else if (input instanceof Blob) {
      document2 = await parser.parseFromBlob(input);
    } else {
      throw new TypeError("render: input is not a string, Blob or MDocument");
    }
    if (document2.root.tag !== "score-timewise") {
      return document2;
    }
    const partwise = toPartwise(document2);
    return parser.parseFromString(new MusicXMLSerializer().serializeToString(partwise));
  }
}
var toPartwise = (document2) => {
  const timewise = document2.root;
  const root = new MElement2("score-partwise");
  for (const [name, value] of Object.entries(timewise.attributes)) {
    root.setAttribute(name, value);
  }
  const parts = new Map;
  for (const child of timewise.children) {
    if (!(child instanceof MElement2) || child.tag !== "measure") {
      root.append(clone(child));
    }
  }
  for (const measure of timewise.childrenNamed("measure")) {
    for (const part of measure.childrenNamed("part")) {
      const id = part.getAttribute("id") ?? "";
      let target = parts.get(id);
      if (!target) {
        target = new MElement2("part");
        target.setAttribute("id", id);
        parts.set(id, target);
        root.append(target);
      }
      const copy = new MElement2("measure");
      for (const [name, value] of Object.entries(measure.attributes)) {
        copy.setAttribute(name, value);
      }
      for (const content of part.children) {
        copy.append(clone(content));
      }
      target.append(copy);
    }
  }
  return new MDocument(root, document2.declaration, null);
};
var clone = (node) => {
  if (!(node instanceof MElement2)) {
    return new MText(node.value);
  }
  const copy = new MElement2(node.tag);
  for (const [name, value] of Object.entries(node.attributes)) {
    copy.setAttribute(name, value);
  }
  for (const child of node.children) {
    copy.append(clone(child));
  }
  return copy;
};

// gaps.ts
import { MDocument as MDocument2 } from "@stringsync/mdom";

class Gaps {
  gaps;
  inserter;
  indexes = null;
  constructor(gaps, inserter) {
    this.gaps = gaps;
    this.inserter = inserter;
  }
  isEmpty() {
    return this.gaps.length === 0;
  }
  inserts() {
    return this.gaps.some((gap) => gap.measure === undefined);
  }
  names() {
    return this.gaps.some((gap) => gap.measure !== undefined);
  }
  check(input) {
    if (input instanceof MDocument2 ? this.inserts() : this.names()) {
      throw new Error(input instanceof MDocument2 ? "render: gaps for an MDocument must name measures in it (see insertGaps)" : "render: a gap naming a measure needs its MDocument as input");
    }
  }
  resolve(document2) {
    for (const gap of this.gaps) {
      if (!(gap.durationMs > 0)) {
        throw new RangeError(`render: gap durationMs must be positive, got ${gap.durationMs}`);
      }
    }
    const positioned = this.gaps.flatMap((gap, i) => gap.measure === undefined ? [i] : []);
    const inserted = this.inserter.insert(document2, positioned.map((i) => this.gaps[i]));
    const insertedByGap = new Map(positioned.map((gapIndex, k) => [gapIndex, inserted[k]]));
    const indexes = this.gaps.map((gap, i) => {
      const measure = gap.measure ?? insertedByGap.get(i);
      if (!measure || measure.index < 0 || measure.part.score !== document2.score) {
        throw new Error(`render: gap ${i}'s measure is not in the rendered document (removed by an undo?)`);
      }
      return measure.index;
    });
    if (new Set(indexes).size !== indexes.length) {
      throw new RangeError("render: two gaps name the same measure");
    }
    this.indexes = indexes;
  }
  documentIndexes() {
    const indexes = this.indexes ?? [];
    return indexes.flatMap((measureIndex, i) => {
      const gap = this.gaps[i];
      return gap ? [{ gap, measureIndex }] : [];
    });
  }
  byMeasureIndex() {
    return new Map(this.documentIndexes().map(({ gap, measureIndex }) => [
      measureIndex,
      gap
    ]));
  }
}

// cue-note.ts
function isCueNote(note) {
  return note.child("cue") !== null;
}
function isCueSized(note) {
  const size = note.child("type")?.getAttribute("size");
  return isCueNote(note) || size === "cue" || size === "grace-cue";
}

// mnote-facts.ts
class MNoteFacts {
  mnote;
  chord;
  constructor(mnote, chord) {
    this.mnote = mnote;
    this.chord = chord;
  }
  get pitch() {
    const pitch = this.mnote.pitch;
    return pitch ? this.pitchToKey(pitch) : null;
  }
  get beats() {
    return this.mnote.beats ?? 0;
  }
  get articulations() {
    return this.mnote.articulations;
  }
  get grace() {
    return this.mnote.isGrace;
  }
  get swingExempt() {
    const { mnote } = this;
    return mnote.isGrace || mnote.type === null || mnote.timeModification !== null;
  }
  get chordMember() {
    return this.chord.length > 1;
  }
  get graces() {
    return this.mnote.gracesBefore;
  }
  pitchToKey(p) {
    const n = Math.round(p.alter);
    let accidental = "";
    if (n > 0) {
      accidental = "#".repeat(n);
    } else if (n < 0) {
      accidental = "b".repeat(-n);
    }
    return `${p.step}${accidental}/${p.octave}`;
  }
}

// sequence.ts
class Sequence2 {
  steps;
  tempo;
  durationBeats;
  measureCount;
  tiedFrom;
  firstStepOfNote;
  firstStepOfMeasure;
  tieAdjacency = new Map;
  constructor(steps, tempo, durationBeats, measureCount, tiedFrom, firstStepOfNote, firstStepOfMeasure) {
    this.steps = steps;
    this.tempo = tempo;
    this.durationBeats = durationBeats;
    this.measureCount = measureCount;
    this.tiedFrom = tiedFrom;
    this.firstStepOfNote = firstStepOfNote;
    this.firstStepOfMeasure = firstStepOfMeasure;
    const link = (a, b) => {
      const edges = this.tieAdjacency.get(a) ?? [];
      edges.push(b);
      this.tieAdjacency.set(a, edges);
    };
    for (const [note, from] of tiedFrom) {
      link(note, from);
      link(from, note);
    }
  }
  get length() {
    return this.steps.length;
  }
  adoptGeometry(other) {
    if (other.steps.length !== this.steps.length) {
      throw new Error("vexml: a timeline can only adopt geometry from its own steps");
    }
    for (const [i, step] of other.steps.entries()) {
      const own = this.steps[i];
      if (own) {
        this.steps[i] = {
          ...own,
          x: step.x,
          glideToX: step.glideToX,
          systemRect: step.systemRect
        };
      }
    }
  }
  model(indexOf) {
    const index = (note) => indexOf.get(note) ?? -1;
    return {
      steps: this.steps.map((step) => ({
        measureIndex: step.measureIndex,
        startBeat: step.startBeat,
        endBeat: step.endBeat,
        x: step.x,
        glideToX: step.glideToX,
        systemRect: step.systemRect,
        active: step.active.map(index)
      })),
      segments: this.tempo.segments,
      durationBeats: this.durationBeats,
      measureCount: this.measureCount,
      ties: [...this.tiedFrom].map(([note, from]) => [
        index(note),
        index(from)
      ])
    };
  }
  getStep(index) {
    return this.steps[index] ?? null;
  }
  getNoteNearMs(timeMs, opts = {}) {
    const positions = this.getSteps().flatMap((step) => step.active.filter((note) => !opts.note || note === opts.note).map((note) => ({ note, timeMs: step.startMs })));
    const voice = opts.voice;
    const preferred = voice ? positions.filter(({ note }) => note.getSources().some((source) => source.part === voice.part && source.voice === voice.voice)) : positions;
    const candidates = preferred.length ? preferred : positions;
    return candidates.reduce((best, candidate) => !best || Math.abs(candidate.timeMs - timeMs) < Math.abs(best.timeMs - timeMs) ? candidate : best, null);
  }
  getSteps() {
    return this.steps;
  }
  getDurationBeats() {
    return this.durationBeats;
  }
  getDurationMs() {
    return this.tempo.msAt(this.durationBeats);
  }
  beatsToMs(beats) {
    return this.tempo.msAt(beats);
  }
  msToBeats(ms) {
    return this.tempo.beatsAt(ms);
  }
  getStepIndexAtBeats(beat) {
    const first = this.steps[0];
    if (!first || beat < first.startBeat) {
      return null;
    }
    let lo = 0;
    let hi = this.steps.length - 1;
    while (lo < hi) {
      const mid = lo + hi + 1 >> 1;
      const step = this.steps[mid];
      if (step && step.startBeat <= beat) {
        lo = mid;
      } else {
        hi = mid - 1;
      }
    }
    return lo;
  }
  getStepIndexAtMs(ms) {
    return this.getStepIndexAtBeats(this.msToBeats(ms));
  }
  getMeasureCount() {
    return this.measureCount;
  }
  getMeasureIndexAtMs(ms) {
    const index = this.getStepIndexAtMs(ms);
    return index === null ? 0 : this.steps[index]?.measureIndex ?? 0;
  }
  getMeasureIndexAtBeats(beats) {
    const index = this.getStepIndexAtBeats(beats);
    return index === null ? 0 : this.steps[index]?.measureIndex ?? 0;
  }
  positionAt(ms) {
    const beat = this.msToBeats(ms);
    const index = this.getStepIndexAtBeats(beat) ?? 0;
    const step = this.steps[index];
    if (!step) {
      return null;
    }
    const span = step.endBeat - step.startBeat;
    const frac = span > 0 ? Math.min(1, Math.max(0, (beat - step.startBeat) / span)) : 0;
    const x = step.x + (step.glideToX - step.x) * frac;
    return new Rect2(x, step.systemRect.y, BAR_WIDTH, step.systemRect.h);
  }
  resolveX(x, startStep, endStep) {
    if (startStep > endStep) {
      return null;
    }
    let stepIndex = startStep;
    for (let i = startStep;i <= endStep; i++) {
      const step = this.steps[i];
      if (!step) {
        return null;
      }
      stepIndex = i;
      if (x < step.glideToX) {
        break;
      }
    }
    const step = this.steps[stepIndex];
    if (!step) {
      return null;
    }
    const span = step.glideToX - step.x;
    const frac = span > 0 ? Math.min(1, Math.max(0, (x - step.x) / span)) : 0;
    const beat = step.startBeat + (step.endBeat - step.startBeat) * frac;
    return { stepIndex, beat };
  }
  classify(from, to) {
    const prev = from === null ? null : this.steps[from]?.active ?? null;
    const next = this.steps[to]?.active ?? [];
    return Sequence2.classifyTransition(prev, next, this.tiedFrom);
  }
  getHighlighted(index) {
    const active = this.steps[index]?.active;
    if (!active) {
      return [];
    }
    const lit = new Set(active);
    const queue = [...active];
    for (let note = queue.pop();note; note = queue.pop()) {
      for (const neighbor of this.tieAdjacency.get(note) ?? []) {
        if (!lit.has(neighbor)) {
          lit.add(neighbor);
          queue.push(neighbor);
        }
      }
    }
    return [...lit];
  }
  getFirstStepOfNote(note) {
    return this.firstStepOfNote.get(note) ?? null;
  }
  getFirstStepOfMeasure(measureIndex) {
    return this.firstStepOfMeasure.get(measureIndex) ?? null;
  }
  getStepRangeOfMeasure(measureIndex) {
    const start = this.firstStepOfMeasure.get(measureIndex);
    if (start === undefined) {
      return null;
    }
    let end = start;
    while (this.steps[end + 1]?.measureIndex === measureIndex) {
      end++;
    }
    return { start, end };
  }
  static classifyTransition(prevActive, nextActive, tiedFrom) {
    const prev = new Set(prevActive ?? []);
    const next = new Set(nextActive);
    const started = [];
    const sustained = [];
    const tiedOut = new Set;
    for (const n of nextActive) {
      const from = tiedFrom.get(n);
      if (prev.has(n)) {
        sustained.push(n);
      } else if (from !== undefined && prev.has(from)) {
        sustained.push(n);
        tiedOut.add(from);
      } else {
        started.push(n);
      }
    }
    const stopped = [];
    for (const p of prevActive ?? []) {
      if (!next.has(p) && !tiedOut.has(p)) {
        stopped.push(p);
      }
    }
    return { started, sustained, stopped };
  }
}

// sequence-placer.ts
class SequencePlacer {
  skeleton;
  notesByMnote;
  constructor(skeleton, notesByMnote) {
    this.skeleton = skeleton;
    this.notesByMnote = notesByMnote;
  }
  place(geometry) {
    const rects = new Map;
    for (const m of geometry.measures) {
      rects.set(m.index, m.rect);
    }
    const xs = new Map;
    for (const rn of geometry.notes) {
      const note = this.notesByMnote.get(rn.mnote);
      if (note) {
        xs.set(note, Math.min(xs.get(note) ?? Infinity, rn.rect.x));
      }
    }
    return this.placeOn({
      systemRectOf: (m) => rects.get(m) ?? EMPTY,
      xOf: (note) => xs.get(note) ?? null
    });
  }
  placeInput(input) {
    const xs = new Map;
    for (const sn of input.notes) {
      xs.set(sn.note, Math.min(xs.get(sn.note) ?? Infinity, sn.x));
    }
    return this.placeOn({
      systemRectOf: (m) => input.measures[m]?.systemRect ?? EMPTY,
      xOf: (note) => xs.get(note) ?? null
    });
  }
  placeOn(geometry) {
    const {
      steps: skeletons,
      tempo,
      totalBeats,
      measures,
      tiedFrom
    } = this.skeleton;
    const rect = (s) => geometry.systemRectOf(s.measureIndex);
    const xs = skeletons.map((s) => {
      if (s.kind === "seed") {
        return null;
      }
      const box = rect(s);
      let x = null;
      for (const note of s.notes) {
        const noteX = geometry.xOf(note);
        if (noteX !== null) {
          x = x === null ? noteX : Math.min(x, noteX);
        }
      }
      return x ?? box.x;
    });
    for (const [i, s] of skeletons.entries()) {
      if (xs[i] !== null) {
        continue;
      }
      const box = rect(s);
      const prev = skeletons[i - 1];
      const prevBeat = prev?.startBeat ?? s.startBeat;
      const prevX = xs[i - 1] ?? null;
      let j = i + 1;
      while (j < skeletons.length && xs[j] === null) {
        j++;
      }
      const next = skeletons[j];
      const nextX = xs[j] ?? null;
      const fromX = prev && prevX !== null && rect(prev).y === box.y ? prevX : box.x;
      const toX = next && nextX !== null && rect(next).y === box.y && nextX > fromX ? nextX : box.right;
      const span = (next?.startBeat ?? totalBeats) - prevBeat;
      xs[i] = span > 0 ? fromX + (toX - fromX) * (s.startBeat - prevBeat) / span : fromX;
    }
    const steps = [];
    const firstStepOfNote = new Map;
    const firstStepOfMeasure = new Map;
    for (const [i, s] of skeletons.entries()) {
      const box = rect(s);
      const x = xs[i] ?? box.x;
      const next = skeletons[i + 1];
      const nextX = xs[i + 1] ?? null;
      const sameSystem = next !== undefined && nextX !== null && rect(next).y === box.y && nextX > x;
      const glideToX = s.kind !== "gap" && sameSystem && nextX !== null ? nextX : box.right;
      steps.push({
        index: i,
        measureIndex: s.measureIndex,
        startBeat: s.startBeat,
        endBeat: s.endBeat,
        startMs: tempo.msAt(s.startBeat),
        endMs: tempo.msAt(s.endBeat),
        x,
        glideToX,
        systemRect: box,
        active: [...s.active]
      });
      for (const note of s.active) {
        if (!firstStepOfNote.has(note)) {
          firstStepOfNote.set(note, i);
        }
      }
      if (!firstStepOfMeasure.has(s.measureIndex)) {
        firstStepOfMeasure.set(s.measureIndex, i);
      }
    }
    return new Sequence2(steps, tempo, totalBeats, measures.length, tiedFrom, firstStepOfNote, firstStepOfMeasure);
  }
}
var EMPTY = new Rect2(0, 0, 0, 0);

// sounding-notes.ts
class SoundingNotes {
  reader;
  staves;
  parts;
  placeholders = new Map;
  multiRests = null;
  constructor(reader, staves, parts) {
    this.reader = reader;
    this.staves = staves;
    this.parts = parts;
  }
  of(m) {
    let placeholders = this.placeholders.get(m);
    if (placeholders) {
      return placeholders;
    }
    placeholders = [];
    this.multiRests ??= this.reader.multiRestsOf(this.parts);
    if (this.multiRests.hidden.has(m)) {
      return [];
    }
    for (const [p, part] of this.parts.entries()) {
      const measure = part.measures[m];
      if (!measure) {
        continue;
      }
      for (const staffNumber of this.staves.visibleNumbers(part)) {
        if (this.multiRests.leads.has(m) || this.reader.measureStyleOf(measure, staffNumber)) {
          continue;
        }
        const voices = this.reader.staffVoices(measure, staffNumber);
        const chords = voices.flatMap((voice) => voice.chords);
        placeholders.push(...this.staveOf(chords, p, staffNumber, this.staves.isTab(part, staffNumber)));
      }
    }
    this.placeholders.set(m, placeholders);
    return placeholders;
  }
  staveOf(chords, part, staffNumber, isTab) {
    const beats = chords.map((chord) => chord.measureBeat ?? 0);
    const span = Math.max(1, ...beats) + 1;
    const placeholders = [];
    for (const [i, chord] of chords.entries()) {
      if (isTab && (chord.lead.isRest || !chord.lead.isGrace && chord.notes.every((note) => this.reader.tiesOf(note).some((tie) => tie.tieType === "stop")))) {
        continue;
      }
      const beat = beats[i] ?? 0;
      for (const mnote of chord.notes) {
        let tab = null;
        if (isTab) {
          const { string, fret } = mnote;
          if (string === null || fret === null) {
            continue;
          }
          tab = { string, fret };
        }
        placeholders.push({
          mnote,
          chord: chord.notes,
          beat,
          span,
          part,
          staffNumber,
          tab
        });
      }
    }
    return placeholders;
  }
}

// stave-plan.ts
class StavePlan {
  visibility;
  tunings = new Map;
  tabs = new Map;
  visible = new Map;
  symbols = new Map;
  constructor(visibility) {
    this.visibility = visibility;
  }
  tuningOf(part, staffNumber) {
    return memo(this.tunings, part, staffNumber, () => this.readTuning(part, staffNumber));
  }
  readTuning(part, staffNumber) {
    for (const measure of part.measures) {
      const tunings = measure.getStaffTunings(staffNumber);
      if (tunings.length === 0) {
        continue;
      }
      const lineCount = Math.max(...tunings.map((t) => t.line));
      const midis = [];
      for (const tuning of tunings) {
        midis[lineCount - tuning.line] = tuning.midi;
      }
      return midis;
    }
    return null;
  }
  isTab(part, staffNumber) {
    return memo(this.tabs, part, staffNumber, () => this.readIsTab(part, staffNumber));
  }
  readIsTab(part, staffNumber) {
    for (const measure of part.measures) {
      if (this.hasStaffTuning(measure, staffNumber)) {
        return true;
      }
      const clef = measure.getClef(staffNumber);
      if (clef) {
        return clef.sign === "TAB";
      }
    }
    return false;
  }
  staveCountOf(part) {
    let count = Math.max(part.staveCount, 1);
    const first = part.measures[0];
    while (first?.getClef(String(count + 1))) {
      count++;
    }
    return count;
  }
  visibleNumbers(part) {
    let visible = this.visible.get(part);
    if (!visible) {
      const { showTabs, showNotation } = this.visibility;
      const all = Array.from({ length: this.staveCountOf(part) }, (_, s) => String(s + 1));
      visible = all.filter((n) => this.isTab(part, n) ? showTabs : showNotation);
      this.visible.set(part, visible);
    }
    return visible;
  }
  groupStaveCount(parts, span) {
    return parts.slice(span.fromPart, span.toPart + 1).reduce((n, part) => n + this.visibleNumbers(part).length, 0);
  }
  isAllTab(part) {
    const staves = this.visibleNumbers(part);
    return staves.length > 0 && staves.every((n) => this.isTab(part, n));
  }
  pairsTabWithNotation(part) {
    if (!this.visibility.showTabs || !this.visibility.showNotation) {
      return false;
    }
    const staves = this.visibleNumbers(part);
    return staves.some((n) => this.isTab(part, n)) && staves.some((n) => !this.isTab(part, n));
  }
  partsPairTabWithNotation(parts) {
    if (!this.visibility.showTabs || !this.visibility.showNotation || parts.length < 2) {
      return false;
    }
    if (parts.some((part) => this.pairsTabWithNotation(part))) {
      return false;
    }
    const kinds = [];
    for (const part of parts) {
      for (const staff of this.visibleNumbers(part)) {
        kinds.push(this.isTab(part, staff));
      }
    }
    return kinds.includes(true) && kinds.includes(false);
  }
  symbolOf(part) {
    if (!this.symbols.has(part)) {
      this.symbols.set(part, this.readSymbol(part));
    }
    return this.symbols.get(part) ?? null;
  }
  systemSymbol(parts) {
    let bracket = this.partsPairTabWithNotation(parts);
    let brace = false;
    for (const part of parts) {
      if (this.visibleNumbers(part).length <= 1) {
        continue;
      }
      const symbol = this.symbolOf(part);
      bracket ||= symbol === "bracket";
      brace ||= symbol === "brace";
    }
    if (bracket) {
      return "bracket";
    }
    return brace ? "brace" : null;
  }
  systemOverhang(parts) {
    switch (this.systemSymbol(parts)) {
      case "bracket":
        return BRACKET_X_SHIFT + BRACKET_GLYPH_OVERHANG;
      case "brace":
        return BRACE_LEFT_OVERHANG;
      case null:
        return 0;
    }
  }
  readSymbol(part) {
    const symbol = part.partSymbol;
    if (symbol === null) {
      if (this.pairsTabWithNotation(part)) {
        return "bracket";
      }
      return this.isAllTab(part) ? null : "brace";
    }
    if (symbol === "none") {
      return null;
    }
    return symbol === "bracket" ? "bracket" : "brace";
  }
  hasStaffTuning(measure, staffNumber) {
    const details = measure.getStaffDetails(staffNumber);
    return !!details && details.staffTunings.length > 0 && details.staffLines !== null;
  }
}
function memo(cache, part, staffNumber, read) {
  let byStaff = cache.get(part);
  if (!byStaff) {
    byStaff = new Map;
    cache.set(part, byStaff);
  }
  if (!byStaff.has(staffNumber)) {
    byStaff.set(staffNumber, read());
  }
  return byStaff.get(staffNumber);
}

// swing-warp.ts
class SwingWarp {
  swing;
  span;
  onBeatSpan;
  phase;
  origin;
  constructor(swing, opts) {
    this.swing = swing && swing.first !== swing.second ? swing : null;
    this.span = this.swing ? 2 * this.swing.unit : 0;
    this.onBeatSpan = this.swing ? this.swing.first / (this.swing.first + this.swing.second) * this.span : 0;
    this.phase = this.swing && opts.meterBeats > opts.playedBeats ? (opts.meterBeats - opts.playedBeats) % this.span : 0;
    this.origin = this.warp(this.phase);
  }
  at(beat) {
    return this.swing ? this.warp(beat + this.phase) - this.origin : beat;
  }
  warp(beat) {
    const swing = this.swing;
    if (!swing) {
      return beat;
    }
    const pair = Math.floor(beat / this.span);
    const into = beat - pair * this.span;
    const warped = into <= swing.unit ? into / swing.unit * this.onBeatSpan : this.onBeatSpan + (into - swing.unit) / swing.unit * (this.span - this.onBeatSpan);
    return pair * this.span + warped;
  }
}

// tempo-map.ts
class TempoMap {
  segments;
  constructor(segments) {
    this.segments = segments;
  }
  msAt(beats) {
    const last = this.segments.at(-1);
    if (!last) {
      return beats / DEFAULT_TEMPO_BPM * 60000;
    }
    let ms = 0;
    for (const seg of this.segments) {
      if (beats <= seg.startBeat) {
        break;
      }
      const upto = Math.min(beats, seg.endBeat);
      ms += (upto - seg.startBeat) / seg.bpm * 60000;
    }
    if (beats > last.endBeat) {
      ms += (beats - last.endBeat) / last.bpm * 60000;
    }
    return ms;
  }
  beatsAt(ms) {
    const last = this.segments.at(-1);
    if (!last) {
      return ms / 60000 * DEFAULT_TEMPO_BPM;
    }
    let elapsed = 0;
    for (const seg of this.segments) {
      const segMs = (seg.endBeat - seg.startBeat) / seg.bpm * 60000;
      if (ms <= elapsed + segMs) {
        return seg.startBeat + (ms - elapsed) / 60000 * seg.bpm;
      }
      elapsed += segMs;
    }
    return last.endBeat + (ms - elapsed) / 60000 * last.bpm;
  }
}

// timeline.ts
class Timeline2 {
  tempo;
  durationBeats;
  bars;
  gaps;
  steps;
  constructor(tempo, durationBeats, bars, gaps, steps) {
    this.tempo = tempo;
    this.durationBeats = durationBeats;
    this.bars = bars;
    this.gaps = gaps;
    this.steps = steps;
  }
  getDurationMs() {
    return this.tempo.msAt(this.durationBeats);
  }
  getDurationBeats() {
    return this.durationBeats;
  }
  beatsToMs(beats) {
    return this.tempo.msAt(beats);
  }
  getBars() {
    return this.bars;
  }
  getGaps() {
    return this.gaps;
  }
  getSteps() {
    return this.steps;
  }
}

// sequence-factory.ts
var QUARTERS_PER_UNIT = {
  whole: 4,
  half: 2,
  quarter: 1,
  eighth: 0.5,
  "16th": 0.25,
  "32nd": 0.125,
  "64th": 0.0625,
  "128th": 0.03125
};
var BEAT_EPSILON = 0.000001;
var GRACE_MS = 65;
var EMPTY_GEOMETRY = {
  bounds: new Rect2(0, 0, 0, 0),
  notes: [],
  measures: [],
  chordDiagrams: []
};

class SequenceFactory {
  reader;
  gaps;
  constructor(reader, gaps) {
    this.reader = reader;
    this.gaps = gaps;
  }
  create(parts, geometry, notesByMnote) {
    return this.createFromInput(this.buildInput(parts, geometry, notesByMnote, (mnote) => notesByMnote.get(mnote)?.isSwingExempt() ?? null));
  }
  restore(model, notes) {
    const tempo = new TempoMap(model.segments);
    const steps = [];
    const firstStepOfNote = new Map;
    const firstStepOfMeasure = new Map;
    for (const [i, step] of model.steps.entries()) {
      const active = step.active.flatMap((n) => notes[n] ?? []);
      steps.push({
        index: i,
        measureIndex: step.measureIndex,
        startBeat: step.startBeat,
        endBeat: step.endBeat,
        startMs: tempo.msAt(step.startBeat),
        endMs: tempo.msAt(step.endBeat),
        x: step.x,
        glideToX: step.glideToX,
        systemRect: step.systemRect,
        active
      });
      for (const note of active) {
        if (!firstStepOfNote.has(note)) {
          firstStepOfNote.set(note, i);
        }
      }
      if (!firstStepOfMeasure.has(step.measureIndex)) {
        firstStepOfMeasure.set(step.measureIndex, i);
      }
    }
    const tiedFrom = new Map;
    for (const [n, from] of model.ties) {
      const note = notes[n];
      const prior = notes[from];
      if (note && prior) {
        tiedFrom.set(note, prior);
      }
    }
    return new Sequence2(steps, tempo, model.durationBeats, model.measureCount, tiedFrom, firstStepOfNote, firstStepOfMeasure);
  }
  createFromInput(input) {
    return new SequencePlacer(this.skeletonOf(input), new Map).placeInput(input);
  }
  begin(parts, geometry, notesByMnote) {
    const input = this.buildInput(parts, geometry, notesByMnote, (mnote) => notesByMnote.get(mnote)?.isSwingExempt() ?? null);
    return new SequencePlacer(this.skeletonOf(input), notesByMnote);
  }
  skeletonOf(input) {
    const notesByMeasure = new Map;
    for (const note of input.notes) {
      const list = notesByMeasure.get(note.measureIndex);
      if (list) {
        list.push(note);
      } else {
        notesByMeasure.set(note.measureIndex, [note]);
      }
    }
    const intervals = [];
    const onsets = new Map;
    const ends = [];
    const { passes, segments, totalBeats } = this.unroll(input.measures);
    const gapEnds = [];
    for (const [p, { measure, startBeat: measureStart }] of passes.entries()) {
      if (measure.gapMs !== undefined) {
        onsets.set(measureStart, {
          measureIndex: measure.index,
          kind: "gap",
          notes: []
        });
        const next = passes[p + 1];
        if (next) {
          gapEnds.push({
            beat: next.startBeat,
            measureIndex: next.measure.index
          });
        }
        continue;
      }
      for (const sn of notesByMeasure.get(measure.index) ?? []) {
        const startBeat = measureStart + sn.measureBeat;
        intervals.push({
          note: sn.note,
          startBeat,
          endBeat: startBeat + sn.beats
        });
        ends.push({ beat: startBeat + sn.beats, measureIndex: measure.index });
        const existing = onsets.get(startBeat);
        if (existing) {
          existing.notes.push(sn.note);
        } else {
          onsets.set(startBeat, {
            measureIndex: measure.index,
            kind: "notes",
            notes: [sn.note]
          });
        }
      }
    }
    const tiedFrom = new Map;
    for (const sn of input.notes) {
      if (sn.tiedFrom) {
        tiedFrom.set(sn.note, sn.tiedFrom);
      }
    }
    const quantize = (beat) => Math.round(beat / BEAT_EPSILON);
    for (const { beat, measureIndex } of gapEnds) {
      if (!onsets.has(beat)) {
        onsets.set(beat, { measureIndex, kind: "left", notes: [] });
      }
    }
    const onsetKeys = new Set([...onsets.keys()].map(quantize));
    for (const end of ends) {
      const key = quantize(end.beat);
      if (end.beat >= totalBeats - BEAT_EPSILON || onsetKeys.has(key - 1) || onsetKeys.has(key) || onsetKeys.has(key + 1)) {
        continue;
      }
      onsetKeys.add(key);
      onsets.set(end.beat, {
        measureIndex: end.measureIndex,
        kind: "seed",
        notes: []
      });
    }
    const tempo = new TempoMap(segments);
    const startBeats = [...onsets.keys()].sort((a, b) => a - b);
    const byStart = intervals.map((_, i) => i).sort((a, b) => intervals[a].startBeat - intervals[b].startBeat);
    let joined = 0;
    let sounding = [];
    const steps = [];
    for (const [i, startBeat] of startBeats.entries()) {
      const onset = onsets.get(startBeat);
      if (!onset) {
        continue;
      }
      const endBeat = startBeats[i + 1] ?? totalBeats;
      while (joined < byStart.length && intervals[byStart[joined]].startBeat <= startBeat) {
        sounding.push(byStart[joined]);
        joined++;
      }
      sounding = sounding.filter((iv) => startBeat < intervals[iv].endBeat - BEAT_EPSILON);
      const active = [...sounding].sort((a, b) => a - b).map((iv) => intervals[iv].note);
      steps.push({
        startBeat,
        endBeat,
        measureIndex: onset.measureIndex,
        kind: onset.kind,
        notes: onset.notes,
        active
      });
    }
    return { steps, tempo, totalBeats, measures: input.measures, tiedFrom };
  }
  timeline(parts) {
    const notesByMnote = new Map;
    const sources = new Map;
    const rawNotes = [];
    const sounding = new SoundingNotes(this.reader, new StavePlan({ showTabs: true, showNotation: true }), parts);
    for (const [measureIndex] of (parts[0]?.measures ?? []).entries()) {
      for (const { mnote } of sounding.of(measureIndex)) {
        const stand = {};
        notesByMnote.set(mnote, stand);
        sources.set(stand, mnote);
        rawNotes.push({
          mnote,
          rect: new Rect2(0, 0, 0, 0),
          ink: new Rect2(0, 0, 0, 0),
          chord: [],
          measureIndex,
          tab: null,
          glyph: null
        });
      }
    }
    const input = this.buildInput(parts, { ...EMPTY_GEOMETRY, notes: rawNotes }, notesByMnote, (mnote) => new MNoteFacts(mnote, []).swingExempt);
    const { measures } = input;
    const { passes, segments, totalBeats } = this.unroll(measures);
    const tempo = new TempoMap(segments);
    const bars = passes.map(({ measure, startBeat, endBeat }) => ({
      measureIndex: measure.index,
      startMs: tempo.msAt(startBeat),
      endMs: tempo.msAt(endBeat)
    }));
    const gaps = this.gaps.documentIndexes().map(({ gap, measureIndex }) => {
      const bar = bars.find((b) => b.measureIndex === measureIndex);
      return {
        measureIndex,
        label: gap.label ?? null,
        startMs: bar?.startMs ?? 0,
        endMs: bar?.endMs ?? 0
      };
    });
    const { steps: skeleton, tiedFrom } = this.skeletonOf(input);
    const noteOf = (stand) => {
      const mnote = sources.get(stand);
      const pitch = mnote ? new MNoteFacts(mnote, []).pitch : null;
      return mnote && pitch !== null ? [{ pitch, partId: mnote.part.id }] : [];
    };
    const steps = skeleton.map((step, i) => {
      const { started, sustained } = Sequence2.classifyTransition(i === 0 ? null : skeleton[i - 1]?.active ?? null, step.active, tiedFrom);
      return {
        startMs: tempo.msAt(step.startBeat),
        endMs: tempo.msAt(step.endBeat),
        started: started.flatMap(noteOf),
        sustained: sustained.flatMap(noteOf)
      };
    });
    return new Timeline2(tempo, totalBeats, bars, gaps, steps);
  }
  unroll(measures) {
    const passes = [];
    const segments = [];
    let totalBeats = 0;
    let bpm = DEFAULT_TEMPO_BPM;
    for (const measureIndex of new MeasureSequenceIterator(measures)) {
      const measure = measures[measureIndex];
      if (!measure) {
        continue;
      }
      if (measure.tempoBpm !== null) {
        bpm = measure.tempoBpm;
      }
      const endBeat = totalBeats + measure.beats;
      segments.push({
        startBeat: totalBeats,
        endBeat,
        bpm: measure.gapMs === undefined ? bpm : measure.beats * 60000 / measure.gapMs
      });
      passes.push({ measure, startBeat: totalBeats, endBeat });
      totalBeats = endBeat;
    }
    return { passes, segments, totalBeats };
  }
  buildInput(parts, geometry, notesByMnote, swingExemptOf) {
    const systemRectByIndex = new Map;
    for (const measure of geometry.measures) {
      systemRectByIndex.set(measure.index, measure.rect);
    }
    const gaps = this.gaps.byMeasureIndex();
    const measureCount = parts[0]?.measures.length ?? 0;
    const jumps = this.reader.measureJumps(parts[0]?.measures ?? []);
    const swings = this.swingWarps(parts);
    const swung = (index, beat) => swings[index]?.at(beat) ?? beat;
    const tempoBpms = parts[0]?.measures.map((m0, i) => gaps.get(i) ? null : this.quarterBpm(m0)) ?? [];
    const bpms = [];
    for (const tempoBpm of tempoBpms) {
      bpms.push(tempoBpm ?? bpms.at(-1) ?? DEFAULT_TEMPO_BPM);
    }
    const chordSiblings = new Map;
    const reads = new Map;
    const notesOf = parts.map((part) => part.measures.map((measure) => {
      const notes = this.reader.notesOf(measure);
      let chord = [];
      for (const n of notes) {
        const read = {
          grace: n.isGrace,
          chordMember: this.reader.isChordMember(n),
          voice: n.voice
        };
        reads.set(n, read);
        if (read.chordMember && chord.length > 0) {
          chord.push(n);
        } else {
          chord = [n];
        }
        chordSiblings.set(n, chord);
      }
      return notes;
    }));
    const readOf = (n) => reads.get(n) ?? {
      grace: n.isGrace,
      chordMember: this.reader.isChordMember(n),
      voice: n.voice
    };
    const spans = new Map;
    const span = (mnote, measureIndex) => {
      const known = spans.get(mnote);
      if (known !== undefined) {
        return known;
      }
      const measureBeat = this.reader.measureBeatOf(mnote);
      const beats = this.reader.beatsOf(mnote);
      const exempt = swingExemptOf(mnote);
      let played = null;
      if (exempt !== null && measureBeat !== null && beats !== null) {
        const warp = exempt ? (beat) => beat : (beat) => swung(measureIndex, beat);
        played = { onset: warp(measureBeat), end: warp(measureBeat + beats) };
      }
      spans.set(mnote, played);
      return played;
    };
    const graceSpans = new Map;
    const madeGraces = new Map;
    const starts = new Map;
    const ends = new Map;
    const made = new Map;
    for (const measures of notesOf) {
      for (const [measureIndex, measureNotes] of measures.entries()) {
        const bpm = bpms[measureIndex] ?? DEFAULT_TEMPO_BPM;
        const previousByVoice = new Map;
        const pendingByVoice = new Map;
        for (const n of measureNotes) {
          const { grace, chordMember, voice } = readOf(n);
          if (grace) {
            pendingByVoice.set(voice, [
              ...pendingByVoice.get(voice) ?? [],
              n
            ]);
            continue;
          }
          if (chordMember) {
            continue;
          }
          const graces = pendingByVoice.get(voice) ?? [];
          pendingByVoice.delete(voice);
          const previous = previousByVoice.get(voice) ?? null;
          previousByVoice.set(voice, n);
          if (graces.length === 0) {
            continue;
          }
          const anchorSpan = span(n, measureIndex);
          if (!anchorSpan) {
            continue;
          }
          const previousSpan = previous ? span(previous, measureIndex) : null;
          const makeTime = graces[0]?.graceMakeTime != null;
          const ahead = !makeTime && previousSpan !== null && graces[0]?.graceStealTimePrevious != null;
          const victim = ahead && previousSpan ? previousSpan : anchorSpan;
          const run = this.placeGraces(graces, victim, ahead ? "end" : "start", bpm, makeTime);
          for (const [grace, graceSpan] of run) {
            graceSpans.set(grace, graceSpan);
          }
          const runStart = run.get(graces[0])?.onset ?? victim.onset;
          const runEnd = run.get(graces.at(-1))?.end ?? victim.onset;
          if (makeTime) {
            const inMeasure = made.get(measureIndex) ?? new Map;
            const at = anchorSpan.onset;
            inMeasure.set(at, Math.max(inMeasure.get(at) ?? 0, runEnd - at));
            made.set(measureIndex, inMeasure);
            for (const [grace, graceSpan] of run) {
              madeGraces.set(grace, { at, offset: graceSpan.onset - at });
            }
          } else if (ahead && previous) {
            ends.set(previous, runStart);
          } else {
            starts.set(n, runEnd);
          }
        }
        for (const [voice, graces] of pendingByVoice) {
          const host = previousByVoice.get(voice);
          const hostSpan = host ? span(host, measureIndex) : null;
          if (!host || !hostSpan) {
            continue;
          }
          const run = this.placeGraces(graces, hostSpan, "end", bpm, false);
          for (const [grace, graceSpan] of run) {
            graceSpans.set(grace, graceSpan);
          }
          ends.set(host, run.get(graces[0])?.onset ?? hostSpan.end);
        }
      }
    }
    const madeBefore = (measureIndex, beat, inclusive) => {
      let beats = 0;
      for (const [at, extra] of made.get(measureIndex) ?? []) {
        if (at < beat - BEAT_EPSILON || inclusive && at <= beat + BEAT_EPSILON) {
          beats += extra;
        }
      }
      return beats;
    };
    const measures = [];
    for (let i = 0;i < measureCount; i++) {
      const gap = gaps.get(i);
      measures.push({
        index: i,
        beats: gap ? 1 : swung(i, this.measureBeats(parts, i)) + madeBefore(i, Number.POSITIVE_INFINITY, false),
        tempoBpm: tempoBpms[i] ?? null,
        jumps: jumps[i] ?? [],
        systemRect: systemRectByIndex.get(i) ?? new Rect2(0, 0, 0, 0),
        ...gap ? { gapMs: gap.durationMs } : {}
      });
    }
    const notes = [];
    for (const rn of geometry.notes) {
      const note = notesByMnote.get(rn.mnote);
      if (!note || isCueNote(rn.mnote)) {
        continue;
      }
      let played;
      const madeGrace = madeGraces.get(rn.mnote);
      const graceSpan = graceSpans.get(rn.mnote);
      if (madeGrace && graceSpan) {
        const onset = madeGrace.at + madeBefore(rn.measureIndex, madeGrace.at, false) + madeGrace.offset;
        played = { onset, end: onset + graceSpan.end - graceSpan.onset };
      } else if (readOf(rn.mnote).grace) {
        played = graceSpan ?? null;
      } else {
        const written = span(rn.mnote, rn.measureIndex);
        const lead = chordSiblings.get(rn.mnote)?.[0] ?? rn.mnote;
        played = written && {
          onset: Math.max(written.onset, starts.get(lead) ?? written.onset),
          end: Math.min(written.end, ends.get(lead) ?? written.end)
        };
      }
      if (played && !madeGrace) {
        played = {
          onset: played.onset + madeBefore(rn.measureIndex, played.onset, true),
          end: played.end + madeBefore(rn.measureIndex, played.end, false)
        };
      }
      if (!played || played.end <= played.onset) {
        continue;
      }
      notes.push({
        note,
        measureIndex: rn.measureIndex,
        measureBeat: played.onset,
        beats: played.end - played.onset,
        x: rn.rect.x,
        tiedFrom: this.tiedFromOf(rn.mnote, notesByMnote, chordSiblings)
      });
    }
    return { measures, notes };
  }
  placeGraces(graces, victim, from, bpm, makeTime) {
    const flicks = graces.filter((grace, i) => i === 0 || !this.reader.isChordMember(grace)).length;
    const flick = GRACE_MS * bpm / 60000;
    const room = (victim.end - victim.onset) / 2;
    const beats = makeTime ? flick : Math.min(flick, room / Math.max(1, flicks));
    let at = from === "start" ? victim.onset : victim.end - beats * flicks;
    const placed = new Map;
    for (const [i, grace] of graces.entries()) {
      if (i > 0 && !this.reader.isChordMember(grace)) {
        at += beats;
      }
      placed.set(grace, { onset: at, end: at + beats });
    }
    return placed;
  }
  swingWarps(parts) {
    const measures = parts[0]?.measures ?? [];
    const warps = [];
    let swing = null;
    for (const [index, measure] of measures.entries()) {
      swing = this.reader.swingOf(measure) ?? swing;
      warps.push(new SwingWarp(swing, {
        playedBeats: this.measureBeats(parts, index),
        meterBeats: this.reader.meterBeats(measure.getTime())
      }));
    }
    return warps;
  }
  quarterBpm(measure) {
    const tempo = this.reader.playbackTempoOf(measure);
    if (!tempo) {
      return null;
    }
    return tempo.bpm * (QUARTERS_PER_UNIT[tempo.duration] ?? 1);
  }
  measureBeats(parts, index) {
    let maxEnd = 0;
    for (const part of parts) {
      const measure = part.measures[index];
      if (!measure) {
        continue;
      }
      for (const note of this.reader.notesOf(measure)) {
        const onset = this.reader.measureBeatOf(note);
        const beats = this.reader.beatsOf(note);
        if (onset !== null && beats !== null) {
          maxEnd = Math.max(maxEnd, onset + beats);
        }
      }
    }
    if (maxEnd > 0) {
      return maxEnd;
    }
    return this.reader.meterBeats(parts[0]?.measures[index]?.getTime() ?? null);
  }
  samePitch(a, b) {
    return !!a.pitch && !!b.pitch && a.pitch.step === b.pitch.step && a.pitch.octave === b.pitch.octave && a.pitch.alter === b.pitch.alter;
  }
  tiedFromOf(mnote, notesByMnote, chordSiblings) {
    for (const tie of this.reader.tiesOf(mnote)) {
      if (tie.tieType !== "stop") {
        continue;
      }
      const partner = tie.partner?.note;
      if (!partner) {
        continue;
      }
      const member = (chordSiblings.get(partner) ?? [partner]).find((n) => this.samePitch(n, mnote)) ?? partner;
      const target = notesByMnote.get(member);
      if (target) {
        return target;
      }
    }
    return null;
  }
}

// config.ts
var DEFAULT_FONT_CONFIG = {
  notation: { family: "Bravura" },
  text: { family: "Source Sans 3" }
};
var DEFAULT_STANDARD_LAYOUT = {
  type: "standard",
  referenceWidth: DEFAULT_WIDTH,
  honorSystemBreaks: true,
  documentLayout: "ignore",
  overflow: "wrap"
};
var DEFAULT_PANORAMIC_LAYOUT = {
  type: "panoramic",
  stickySignatures: false,
  scale: 1,
  fitHeight: null
};
var DEFAULT_PAGED_LAYOUT = {
  type: "paged",
  pageWidth: 816,
  pageHeight: 1056,
  margin: 48,
  honorSystemBreaks: true,
  documentLayout: "ignore",
  overflow: "wrap"
};
var DEFAULT_CONFIG = {
  fonts: {},
  documentFonts: false,
  pixelRatio: null,
  backgroundColor: null,
  gaps: [],
  layout: DEFAULT_STANDARD_LAYOUT,
  noteSpacing: 36,
  softmaxFactor: 10,
  systemSpacing: SYSTEM_GAP,
  showPartLabels: false,
  showHeader: false,
  measureNumbering: "document",
  showTabSlideText: false,
  tabStemPlacement: "none",
  showTabs: true,
  showNotation: true,
  stretchSingleSystem: true,
  minLastSystemFill: 0.75,
  maxSystemFill: 0.9,
  height: null,
  maxHeight: null,
  width: null,
  maxWidth: null,
  scrollContainer: null,
  progressive: false
};
function resolveConfig(input) {
  const layout = input?.layout ?? DEFAULT_CONFIG.layout;
  switch (layout.type) {
    case "standard":
      return {
        ...DEFAULT_CONFIG,
        ...input,
        layout: { ...DEFAULT_STANDARD_LAYOUT, ...layout }
      };
    case "panoramic":
      return {
        ...DEFAULT_CONFIG,
        ...input,
        layout: { ...DEFAULT_PANORAMIC_LAYOUT, ...layout }
      };
    case "paged":
      return {
        ...DEFAULT_CONFIG,
        ...input,
        layout: { ...DEFAULT_PAGED_LAYOUT, ...layout }
      };
  }
}

// font-families.ts
class FontFamilies {
  notation;
  text;
  constructor(config) {
    this.notation = FontFamilies.sanitize(config?.notation?.family ?? DEFAULT_FONT_CONFIG.notation.family);
    this.text = FontFamilies.sanitize(config?.text?.family ?? DEFAULT_FONT_CONFIG.text.family);
  }
  get notationStack() {
    return `'${this.notation}', serif`;
  }
  get textStack() {
    return `'${this.text}', sans-serif`;
  }
  static documentStack(family, fallback) {
    const faces = (family ?? "").split(",").map((face) => FontFamilies.sanitize(face).trim()).filter((face) => face && !MUSICXML_GENERIC_FACES.has(face)).map((face) => CSS_GENERIC_FACES.has(face) ? face : `'${face}'`);
    return faces.length === 0 ? fallback : `${faces.join(", ")}, ${fallback}`;
  }
  static sanitize(value) {
    return value.replace(/['"\\<>\r\n\f\t\0]/g, "");
  }
}
var MUSICXML_GENERIC_FACES = new Set(["music", "engraved", "handwritten"]);
var CSS_GENERIC_FACES = new Set([
  "serif",
  "sans-serif",
  "cursive",
  "fantasy",
  "monospace",
  "system-ui"
]);

// default-hit-tester.ts
class DefaultHitTester {
  tree;
  constructor(tree) {
    this.tree = tree;
  }
  hitTest(point) {
    const probe = new Rect2(point.x, point.y, 1, 1);
    let best = null;
    let bestArea = Number.POSITIVE_INFINITY;
    let bestForeground = false;
    for (const target of this.tree.query(probe)) {
      const foreground = target.type !== "measure";
      const area = target.rect.w * target.rect.h;
      const better = best === null || foreground && !bestForeground || foreground === bestForeground && area < bestArea;
      if (better) {
        best = target;
        bestArea = area;
        bestForeground = foreground;
      }
    }
    return best;
  }
  hitTestAll(point) {
    const probe = new Rect2(point.x, point.y, 1, 1);
    return this.tree.query(probe).sort((a, b) => this.byPriority(a, b));
  }
  hitTestWithin(rect) {
    return this.tree.query(rect).filter((t) => rect.containsRect(t.rect)).sort((a, b) => this.byPriority(a, b));
  }
  byPriority(a, b) {
    const fa = a.type !== "measure";
    const fb = b.type !== "measure";
    if (fa !== fb) {
      return fa ? -1 : 1;
    }
    return a.rect.w * a.rect.h - b.rect.w * b.rect.h;
  }
}

// element-index.ts
class ElementIndex {
  hitTester;
  noteByKey;
  boxByIndex;
  tabByKey;
  diagramList;
  barlineList;
  partList;
  systemByIndex;
  constructor(hitTester, noteByKey, boxByIndex, tabByKey, diagramList, barlineList, partList, systemByIndex) {
    this.hitTester = hitTester;
    this.noteByKey = noteByKey;
    this.boxByIndex = boxByIndex;
    this.tabByKey = tabByKey;
    this.diagramList = diagramList;
    this.barlineList = barlineList;
    this.partList = partList;
    this.systemByIndex = systemByIndex;
  }
  all() {
    return [
      ...this.notes(),
      ...this.barlines(),
      ...this.measures(),
      ...this.measureBoxes(),
      ...this.tabPositions(),
      ...this.chordDiagrams(),
      ...this.systems()
    ];
  }
  notes() {
    return [...this.noteByKey.values()];
  }
  measures() {
    return this.partList.flatMap((part) => part.getMeasures());
  }
  measureBoxes() {
    return [...this.boxByIndex.values()];
  }
  barlines() {
    return [...this.barlineList];
  }
  tabPositions() {
    return [...this.tabByKey.values()];
  }
  chordDiagrams() {
    return [...this.diagramList];
  }
  parts() {
    return [...this.partList];
  }
  systems() {
    return [...this.systemByIndex.values()].sort((a, b) => a.getIndex() - b.getIndex());
  }
  at(point) {
    return this.hitTester.hitTest(point);
  }
  allAt(point) {
    return this.hitTester.hitTestAll(point);
  }
  within(rect) {
    return this.hitTester.hitTestWithin(rect);
  }
  get noteLookup() {
    return this.noteByKey;
  }
}

// element-model.ts
function staveModelsOf(staves, part) {
  return staves.filter((s) => s.part === part).map(({ staff, lines, left, right, noteStartX, keyAccidentals }) => ({
    staff,
    lines,
    left,
    right,
    noteStartX,
    keyAccidentals
  }));
}

// system.ts
class System2 extends Element2 {
  index;
  boxList;
  type = "system";
  constructor(rect, viewport, index, boxList) {
    super(rect, viewport);
    this.index = index;
    this.boxList = boxList;
  }
  getSources() {
    return this.boxList.flatMap((box) => box.getSources());
  }
  getIndex() {
    return this.index;
  }
  getMeasureBoxes() {
    return [...this.boxList];
  }
}

// element-placer.ts
class ElementPlacer {
  tree;
  noteByKey;
  tabByKey;
  boxByIndex;
  systemByIndex;
  boxesOfSystem;
  diagrams;
  barlines;
  viewport;
  decorations;
  placed = new Set;
  constructor(tree, noteByKey, tabByKey, boxByIndex, systemByIndex, boxesOfSystem, diagrams, barlines, viewport, decorations) {
    this.tree = tree;
    this.noteByKey = noteByKey;
    this.tabByKey = tabByKey;
    this.boxByIndex = boxByIndex;
    this.systemByIndex = systemByIndex;
    this.boxesOfSystem = boxesOfSystem;
    this.diagrams = diagrams;
    this.barlines = barlines;
    this.viewport = viewport;
    this.decorations = decorations;
  }
  place(system, drawn) {
    let bounds = null;
    for (const m of drawn.measures) {
      const box = this.boxByIndex.get(m.index);
      if (!box) {
        continue;
      }
      box.relocate(m.rect);
      for (const measure of box.getMeasures()) {
        const staves = staveModelsOf(m.staves, measure.getPart().getId());
        measure.drawn(staves, rectOfStaves(staves) ?? m.rect);
        if (staves.length > 0) {
          this.insert(measure);
        }
      }
      for (const raw of m.barlines) {
        const measure = box.getMeasures().find((candidate) => candidate.getPart().getId() === raw.part);
        if (measure) {
          const barline = new Barline2(raw.rect, this.viewport, measure, raw.location, raw.source);
          this.barlines.push(barline);
          this.insert(barline);
        }
      }
      bounds = bounds ? bounds.union(m.rect) : m.rect;
      this.insert(box);
    }
    if (bounds) {
      this.systemByIndex.get(system)?.relocate(bounds);
    }
    const lastOf = new Map;
    const tabOf = new Map;
    for (const rn of drawn.notes) {
      lastOf.set(rn.mnote, rn);
      if (rn.tab) {
        tabOf.set(rn.mnote, rn);
      }
    }
    for (const [key, rn] of lastOf) {
      const note = this.noteByKey.get(key);
      if (!note) {
        continue;
      }
      note.drawn(rn);
      const tabRaw = tabOf.get(key);
      const tab = this.tabByKey.get(key);
      if (tabRaw && tab) {
        tab.drawn({ rect: tabRaw.rect, glyph: tabRaw.glyph });
      }
      if (!rn.mnote.isGrace) {
        this.insert(tab ?? note);
      }
    }
    for (const d of drawn.chordDiagrams) {
      this.diagrams.push(new ChordDiagram2(d.rect, this.viewport, {
        source: d.harmonySource,
        frame: d.frame,
        title: d.title,
        decorations: this.decorations
      }));
    }
  }
  forecast(forecast, systemCount) {
    const touched = new Set;
    for (const m of forecast.measures) {
      const box = this.boxByIndex.get(m.index);
      if (!box || this.placed.has(box)) {
        continue;
      }
      const from = box.getSystem().getIndex();
      if (from !== m.systemIndex) {
        const list = this.boxesOfSystem.get(from);
        list?.splice(list.indexOf(box), 1);
        const { system, boxes } = this.systemAt(m.systemIndex);
        boxes.push(box);
        boxes.sort((a, b) => a.getIndex() - b.getIndex());
        box.rehome(system);
        touched.add(from);
      }
      box.relocate(m.rect);
      touched.add(m.systemIndex);
    }
    for (let s = this.systemByIndex.size - 1;s >= systemCount; s--) {
      if ((this.boxesOfSystem.get(s)?.length ?? 0) === 0) {
        this.systemByIndex.delete(s);
        this.boxesOfSystem.delete(s);
        touched.delete(s);
      }
    }
    for (let s = this.systemByIndex.size;s < systemCount; s++) {
      this.systemAt(s);
    }
    for (const s of touched) {
      const system = this.systemByIndex.get(s);
      if (system) {
        system.relocate(this.boxesOfSystem.get(s)?.reduce((all, box) => all ? all.union(box.rect) : box.rect, null) ?? new Rect2(0, 0, 0, 0));
      }
    }
    const tabOf = new Map;
    for (const rn of forecast.notes) {
      if (rn.tab) {
        tabOf.set(rn.mnote, rn);
      }
    }
    for (const rn of forecast.notes) {
      const note = this.noteByKey.get(rn.mnote);
      if (!note || this.placed.has(note)) {
        continue;
      }
      note.drawn(rn);
      const tabRaw = tabOf.get(rn.mnote);
      const tab = this.tabByKey.get(rn.mnote);
      if (tabRaw && tab) {
        tab.drawn({ rect: tabRaw.rect, glyph: tabRaw.glyph });
      }
    }
  }
  systemAt(index) {
    let system = this.systemByIndex.get(index);
    let boxes = this.boxesOfSystem.get(index);
    if (!system || !boxes) {
      boxes = [];
      system = new System2(new Rect2(0, 0, 0, 0), this.viewport, index, boxes);
      this.systemByIndex.set(index, system);
      this.boxesOfSystem.set(index, boxes);
    }
    return { system, boxes };
  }
  insert(element) {
    if (!this.placed.has(element)) {
      this.placed.add(element);
      this.tree.insert(element, element.rect);
    }
  }
}
function rectOfStaves(staves) {
  if (staves.length === 0) {
    return null;
  }
  const left = Math.min(...staves.map((stave) => stave.left));
  const right = Math.max(...staves.map((stave) => stave.right));
  const top = Math.min(...staves.map((stave) => stave.lines[0] ?? Infinity));
  const bottom = Math.max(...staves.map((stave) => stave.lines[stave.lines.length - 1] ?? -Infinity));
  return new Rect2(left, top, right - left, bottom - top);
}

// tab-position.ts
class TabPosition2 extends Element2 {
  opts;
  type = "tab-position";
  color;
  halo;
  glyph;
  constructor(rect, viewport, opts) {
    super(rect, viewport);
    this.opts = opts;
    this.color = new Toggle(this, opts.decorations.color);
    this.halo = new Toggle(this, opts.decorations.halo);
    this.glyph = opts.glyph;
  }
  drawn(raw) {
    this.relocate(raw.rect);
    this.glyph = raw.glyph;
  }
  getSources() {
    return this.opts.note.getSources();
  }
  drawColor(ctx, color) {
    if (this.glyph) {
      this.stampGlyph(ctx, this.glyph, color);
    }
  }
  getString() {
    return this.opts.string;
  }
  getFret() {
    return this.opts.fret;
  }
  getNote() {
    return this.opts.note;
  }
}

// voice.ts
class Voice2 {
  id;
  stave;
  keys;
  notes;
  constructor(id, stave, keys, notes) {
    this.id = id;
    this.stave = stave;
    this.keys = keys;
    this.notes = notes;
  }
  getId() {
    return this.id;
  }
  getStave() {
    return this.stave;
  }
  getNotes() {
    const all = [];
    for (const key of this.keys) {
      const note = this.notes.get(key);
      if (note) {
        all.push(note);
      }
    }
    return all;
  }
}

// element-factory.ts
class ElementFactory {
  model(geometry, parts) {
    const boxByIndex = new Map;
    for (const m of geometry.measures) {
      boxByIndex.set(m.index, {
        rect: m.rect,
        index: m.index,
        number: m.number,
        systemIndex: m.systemIndex,
        sources: parts.flatMap((p) => p.measures[m.index] ?? [])
      });
    }
    const boxes = [...boxByIndex.values()];
    const stavesByIndex = new Map(geometry.measures.map((m) => [m.index, m.staves]));
    const barlinesByIndex = new Map(geometry.measures.map((m) => [m.index, m.barlines]));
    const where = new Map;
    const partModels = parts.map((mpart, part) => {
      const measures = [];
      for (const box of boxes) {
        const mmeasure = mpart.measures[box.index];
        if (!mmeasure) {
          continue;
        }
        where.set(mmeasure, { part, measure: measures.length });
        const staves = staveModelsOf(stavesByIndex.get(box.index) ?? [], mpart.id);
        measures.push({
          rect: rectOfStaves2(staves) ?? box.rect,
          index: mmeasure.index,
          number: mmeasure.number,
          voices: [],
          staves,
          source: mmeasure
        });
      }
      return { id: mpart.id, label: mpart.label, measures, source: mpart };
    });
    const barlines = boxes.flatMap((box) => (barlinesByIndex.get(box.index) ?? []).flatMap((raw) => {
      const part = parts.findIndex((mpart) => mpart.id === raw.part);
      const mmeasure = parts[part]?.measures[box.index];
      const at = mmeasure && where.get(mmeasure);
      return at ? [
        {
          rect: raw.rect,
          location: raw.location,
          part: at.part,
          measure: at.measure,
          source: raw.source
        }
      ] : [];
    }));
    const drawn = new Map;
    for (const rn of geometry.notes) {
      if (where.has(rn.mnote.measure)) {
        drawn.set(rn.mnote, rn);
      }
    }
    const indexOf = new Map;
    for (const mnote of drawn.keys()) {
      indexOf.set(mnote, indexOf.size);
    }
    const indexesOf = (mnotes) => mnotes.flatMap((mnote) => indexOf.get(mnote) ?? []);
    const notes = [...drawn.values()].map((rn) => {
      const at = where.get(rn.mnote.measure) ?? { part: 0, measure: 0 };
      return {
        key: rn.mnote,
        facts: new MNoteFacts(rn.mnote, rn.chord),
        rect: rn.rect,
        ink: rn.ink,
        glyph: rn.glyph,
        part: at.part,
        measure: at.measure,
        chord: indexesOf(rn.chord),
        source: rn.mnote
      };
    });
    for (const [part, mpart] of parts.entries()) {
      for (const mmeasure of mpart.measures) {
        const at = where.get(mmeasure);
        const measure = at && partModels[part]?.measures[at.measure];
        if (measure) {
          measure.voices = mmeasure.voices.map((v) => ({
            id: v.id,
            staff: Number(v.staff),
            notes: indexesOf(v.notes)
          }));
        }
      }
    }
    const tabByNote = new Map;
    for (const rn of geometry.notes) {
      const note = indexOf.get(rn.mnote);
      if (rn.tab && note !== undefined) {
        tabByNote.set(note, {
          note,
          rect: rn.rect,
          string: rn.tab.string,
          fret: rn.tab.fret,
          glyph: rn.glyph
        });
      }
    }
    const tabs = [...tabByNote.values()];
    const tabIndexOf = new Map(tabs.map((tab, i) => [tab.note, i]));
    const targets = [];
    for (const rn of geometry.notes) {
      const note = indexOf.get(rn.mnote);
      if (rn.mnote.isGrace || note === undefined) {
        continue;
      }
      const tab = tabIndexOf.get(note);
      targets.push(tab === undefined ? note : ~tab);
    }
    return {
      bounds: geometry.bounds,
      boxes,
      parts: partModels,
      notes,
      tabs,
      diagrams: geometry.chordDiagrams.map((d) => ({
        rect: d.rect,
        frame: d.frame,
        title: d.title,
        source: d.harmonySource
      })),
      barlines,
      targets
    };
  }
  build(model, viewport, decorations) {
    const linked = this.link(model, viewport, decorations);
    const { tree, notes, tabList, barlines, measures, boxes } = linked;
    for (const target of model.targets) {
      const element = target < 0 ? tabList[~target] : notes[target];
      if (element) {
        tree.insert(element, element.rect);
      }
    }
    for (const barline of barlines) {
      tree.insert(barline, barline.rect);
    }
    for (const measure of measures) {
      if (measure.getStaves().length > 0) {
        tree.insert(measure, measure.rect);
      }
    }
    for (const box of boxes.values()) {
      tree.insert(box, box.rect);
    }
    return linked.index;
  }
  buildPlaceable(model, viewport, decorations) {
    const linked = this.link(model, viewport, decorations);
    return {
      elements: linked.index,
      placer: new ElementPlacer(linked.tree, linked.noteByKey, linked.tabByKey, linked.boxes, linked.systems, linked.boxesOfSystem, linked.diagrams, linked.barlines, viewport, decorations)
    };
  }
  link(model, viewport, decorations) {
    const rawsBySystem = new Map;
    for (const m of model.boxes) {
      const rects = rawsBySystem.get(m.systemIndex) ?? [];
      rects.push(m.rect);
      rawsBySystem.set(m.systemIndex, rects);
    }
    const systems = new Map;
    const boxesOfSystem = new Map;
    for (const [systemIndex, rects] of rawsBySystem) {
      const x = Math.min(...rects.map((r) => r.x));
      const y = Math.min(...rects.map((r) => r.y));
      const right = Math.max(...rects.map((r) => r.right));
      const bottom = Math.max(...rects.map((r) => r.bottom));
      const boxes = [];
      boxesOfSystem.set(systemIndex, boxes);
      systems.set(systemIndex, new System2(new Rect2(x, y, right - x, bottom - y), viewport, systemIndex, boxes));
    }
    const boxes = new Map;
    const measuresOfBox = new Map;
    for (const m of model.boxes) {
      const system = systems.get(m.systemIndex);
      if (!system) {
        continue;
      }
      const measureList = [];
      measuresOfBox.set(m.index, measureList);
      const box = new MeasureBox2(m.rect, viewport, m.number, m.index, m.sources, system, measureList);
      boxes.set(m.index, box);
      boxesOfSystem.get(m.systemIndex)?.push(box);
    }
    const keys = model.notes.map((n) => n.key);
    const keysOf = (indexes) => indexes.flatMap((i) => keys[i] ?? []);
    const noteByKey = new Map;
    const tabByKey = new Map;
    const partList = [];
    const measuresOfPart = [];
    for (const pm of model.parts) {
      const measureList = [];
      const part = new Part2(pm.source, pm.id, pm.label, measureList);
      partList.push(part);
      measuresOfPart.push(measureList);
      for (const mm of pm.measures) {
        const box = boxes.get(mm.index);
        if (!box) {
          continue;
        }
        const voices = mm.voices.map((v) => new Voice2(v.id, v.staff, keysOf(v.notes), noteByKey));
        const measure = new Measure2(mm.rect, viewport, mm.source, mm.number, mm.index, part, box, voices, mm.staves);
        measureList.push(measure);
        measuresOfBox.get(box.getIndex())?.push(measure);
      }
    }
    for (const [i, nm] of model.notes.entries()) {
      const measure = measuresOfPart[nm.part]?.[nm.measure];
      const key = keys[i];
      if (!measure || !key) {
        continue;
      }
      noteByKey.set(key, new Note2({
        key,
        source: nm.source,
        facts: nm.facts,
        rect: nm.rect,
        ink: nm.ink,
        viewport,
        decorations,
        measure,
        chord: keysOf(nm.chord),
        notes: noteByKey,
        tabs: tabByKey,
        glyph: nm.glyph
      }));
    }
    const tabList = [];
    for (const tm of model.tabs) {
      const key = keys[tm.note];
      const note = key && noteByKey.get(key);
      if (!key || !note) {
        continue;
      }
      const tab = new TabPosition2(tm.rect, viewport, {
        string: tm.string,
        fret: tm.fret,
        note,
        decorations,
        glyph: tm.glyph
      });
      tabByKey.set(key, tab);
      tabList.push(tab);
    }
    const diagrams = model.diagrams.map((d) => new ChordDiagram2(d.rect, viewport, {
      source: d.source,
      frame: d.frame,
      title: d.title,
      decorations
    }));
    const barlines = model.barlines.flatMap((raw) => {
      const measure = measuresOfPart[raw.part]?.[raw.measure];
      return measure ? [new Barline2(raw.rect, viewport, measure, raw.location, raw.source)] : [];
    });
    const measures = measuresOfPart.flat();
    const tree = new QuadTree(model.bounds);
    const notes = [...noteByKey.values()];
    const index = new ElementIndex(new DefaultHitTester(tree), noteByKey, boxes, tabByKey, diagrams, barlines, partList, systems);
    return {
      index,
      tree,
      notes,
      tabList,
      noteByKey,
      tabByKey,
      boxes,
      systems,
      boxesOfSystem,
      diagrams,
      barlines,
      measures
    };
  }
}
function rectOfStaves2(staves) {
  if (staves.length === 0) {
    return null;
  }
  const left = Math.min(...staves.map((stave) => stave.left));
  const right = Math.max(...staves.map((stave) => stave.right));
  const top = Math.min(...staves.map((stave) => stave.lines[0] ?? Infinity));
  const bottom = Math.max(...staves.map((stave) => stave.lines[stave.lines.length - 1] ?? -Infinity));
  return new Rect2(left, top, right - left, bottom - top);
}

// barline-translator.ts
import { Barline, BarNote, Volta } from "vexflow/core";

class BarlineTranslator {
  decorations(repeats) {
    return repeats.map(({ repeatBegin, repeatEnd, repeatTimes, ending, geometry }) => ({
      repeatBegin,
      repeatEnd,
      repeatTimesLabel: repeatEnd && repeatTimes && repeatTimes > 2 ? `${repeatTimes}x` : null,
      beginWinged: geometry.beginWinged,
      endWinged: geometry.endWinged,
      volta: ending && !ending.hidden ? {
        type: this.voltaType(ending),
        label: this.voltaLabel(ending.number),
        startJog: geometry.startJog,
        endJog: geometry.endJog,
        textX: geometry.textX
      } : null
    }));
  }
  midBarNote(style) {
    const type = BAR_STYLE_TYPES[style];
    if (type === undefined) {
      return new BarNote(Barline.type.NONE).setWidth(CUSTOM_MID_BAR_WIDTH);
    }
    return new BarNote(type);
  }
  voltaType(ending) {
    const hooked = ending.last && !ending.open;
    if (ending.first) {
      return hooked ? Volta.type.BEGIN_END : Volta.type.BEGIN;
    }
    return hooked ? Volta.type.END : Volta.type.MID;
  }
  voltaLabel(number) {
    return number.split(",").map((part) => `${part.trim()}.`).join(" ");
  }
}
var BAR_STYLE_TYPES = {
  regular: Barline.type.SINGLE,
  "light-light": Barline.type.DOUBLE,
  "light-heavy": Barline.type.END,
  none: Barline.type.NONE
};
var CUSTOM_MID_BAR_WIDTH = 8;
var NO_DECORATION = {
  repeatBegin: false,
  repeatEnd: false,
  repeatTimesLabel: null,
  beginWinged: "none",
  endWinged: "none",
  volta: null
};

// chord-translator.ts
import { MElement as MElement3 } from "@stringsync/mdom";
import {
  Accidental,
  Dot,
  GraceNote,
  Modifier as Modifier2,
  Parenthesis,
  StaveNote as StaveNote2,
  Stem,
  VexFlow as VexFlow2
} from "vexflow/core";

// harmonic-kind.ts
var HARMONIC_PITCH_TAGS = {
  "base-pitch": "base",
  "touching-pitch": "touching",
  "sounding-pitch": "sounding"
};
function harmonicPitch(note, reader) {
  const harmonic = harmonicMark(note, reader);
  if (!harmonic) {
    return null;
  }
  for (const [tag, pitch] of Object.entries(HARMONIC_PITCH_TAGS)) {
    if (harmonic.child(tag)) {
      return pitch;
    }
  }
  return "touching";
}
function isDiamondHarmonic(note, reader) {
  return harmonicPitch(note, reader) === "touching";
}
function harmonicMark(note, reader) {
  return reader.technicalsOf(note).find((t) => t.technicalType === "harmonic") ?? null;
}

// invisible-stave-note.ts
import { Annotation, StaveNote } from "vexflow/core";

// measure-style-drawer.ts
import { Element } from "vexflow/core";
class MeasureStyleDrawer {
  context;
  constructor(context) {
    this.context = context;
  }
  draw(stave, mark) {
    this.context.openGroup("vexml-measure-style");
    try {
      switch (mark.kind) {
        case "measure-repeat":
          this.drawMeasureRepeat(stave, mark);
          return;
        case "beat-repeat":
          this.drawPerBeat(stave, mark, beatRepeatGlyph(mark), "center");
          return;
        case "beat-slash":
          this.drawPerBeat(stave, mark, beatSlashGlyph(mark), "start");
          return;
      }
    } finally {
      this.context.closeGroup();
    }
  }
  drawMeasureRepeat(stave, mark) {
    const { count, bar } = mark;
    const even = count % 2 === 0;
    if (bar !== (even ? count / 2 - 1 : (count - 1) / 2)) {
      return;
    }
    const x = even ? stave.getX() + stave.getWidth() : (stave.getNoteStartX() + stave.getNoteEndX()) / 2;
    const slashes = mark.slashes > 1 ? mark.slashes : count;
    let glyph = REPEAT_1_BAR;
    if (slashes >= 4) {
      glyph = REPEAT_4_BARS;
    } else if (slashes >= 2) {
      glyph = REPEAT_2_BARS;
    }
    this.drawCentered(glyph, x, middleLineY(stave));
    if (count > 1) {
      const number = new Element("MultiMeasureRest");
      number.setText(timeSigDigits(count));
      number.renderText(this.context, x - number.getWidth() / 2, stave.getYForLine(NUMBER_LINE) - number.getHeight() / 2);
    }
  }
  drawPerBeat(stave, mark, glyph, align) {
    const left = stave.getNoteStartX() + BEAT_PADDING;
    const area = stave.getNoteEndX() - BEAT_PADDING - left;
    const y = middleLineY(stave);
    mark.beats.forEach((beat, i) => {
      const next = mark.beats[i + 1] ?? mark.length;
      const at = align === "center" ? (beat + next) / 2 : beat;
      const x = left + at / mark.length * area;
      if (align === "center") {
        this.drawCentered(glyph, x, y);
        return;
      }
      if (mark.kind === "beat-slash") {
        this.drawSlash(stave, mark, x, y);
      }
    });
  }
  drawSign(stave, sign, x) {
    this.context.openGroup("vexml-measure-style");
    try {
      const y = middleLineY(stave);
      if (sign.kind === "beat-repeat") {
        new Element().setText(beatRepeatGlyph(sign)).renderText(this.context, x, y);
        return;
      }
      this.drawSlash(stave, sign, x, y);
    } finally {
      this.context.closeGroup();
    }
  }
  drawSlash(stave, sign, x, y) {
    const head = new Element().setText(beatSlashGlyph(sign));
    head.renderText(this.context, x, y);
    if (dotted(sign)) {
      new Element().setText(AUGMENTATION_DOT).renderText(this.context, x + head.getWidth() + DOT_GAP, y - stave.getSpacingBetweenLines() / 2);
    }
  }
  drawCentered(glyph, x, y) {
    const element = new Element().setText(glyph);
    element.renderText(this.context, x - element.getWidth() / 2, y);
  }
}
function middleLineY(stave) {
  return stave.getYForLine((stave.getNumLines() - 1) / 2);
}
function beatRepeatGlyph(mark) {
  const slashes = REPEAT_BAR_SLASH.repeat(mark.slashes);
  return mark.dots ? `${REPEAT_BAR_UPPER_DOT}${slashes}${REPEAT_BAR_LOWER_DOT}` : slashes;
}
function dotted(mark) {
  return mark.dots && !Number.isInteger(Math.log2(mark.unit));
}
function beatSlashGlyph(mark) {
  const { unit } = mark;
  let head = SLASH_GLYPH_FILLED;
  if (unit >= 4) {
    head = SLASH_GLYPHS.w ?? head;
  } else if (unit >= 2) {
    head = SLASH_GLYPHS.h ?? head;
  }
  return head;
}
function timeSigDigits(count) {
  return [...String(count)].map((digit) => String.fromCodePoint(TIME_SIG_0 + Number(digit))).join("");
}
var REPEAT_1_BAR = "";
var REPEAT_2_BARS = "";
var REPEAT_4_BARS = "";
var REPEAT_BAR_SLASH = "";
var REPEAT_BAR_UPPER_DOT = "";
var REPEAT_BAR_LOWER_DOT = "";
var AUGMENTATION_DOT = "";
var TIME_SIG_0 = 57472;
var NUMBER_LINE = -0.5;
var DOT_GAP = 3;
var BEAT_PADDING = 8;

// invisible-stave-note.ts
class InvisibleStaveNote extends StaveNote {
  spacingHidden = false;
  sign = null;
  constructor(...args) {
    super(...args);
    this.renderOptions.draw = false;
  }
  draw() {
    this.setRendered();
    const ctx = this.checkContext();
    for (const modifier of this.getModifiers()) {
      if (modifier instanceof Annotation) {
        modifier.setContext(ctx).drawWithStyle();
      }
    }
    if (this.sign) {
      new MeasureStyleDrawer(ctx).drawSign(this.checkStave(), this.sign, this.getAbsoluteX());
    }
  }
}

// notehead-text.ts
import { Modifier } from "vexflow/core";
var FONT_FAMILY = "Arial, sans-serif";
var FONT_SIZE = 9;
var HOLLOW_DURATIONS = new Set(["w", "h"]);

class NoteheadText extends Modifier {
  label;
  static get CATEGORY() {
    return "NoteheadText";
  }
  constructor(label) {
    super();
    this.label = label;
    this.setPosition(Modifier.Position.CENTER);
    this.setWidth(0);
  }
  getCategory() {
    return NoteheadText.CATEGORY;
  }
  draw() {
    const ctx = this.checkContext();
    const note = this.checkAttachedNote();
    this.setRendered();
    const left = note.getModifierStartXY(Modifier.Position.LEFT, this.checkIndex());
    const right = note.getModifierStartXY(Modifier.Position.RIGHT, this.checkIndex());
    const x = (left.x + right.x) / 2;
    ctx.save();
    if (!HOLLOW_DURATIONS.has(note.getDuration())) {
      ctx.setFillStyle("#fff");
    }
    ctx.setFont(FONT_FAMILY, FONT_SIZE);
    const width = ctx.measureText(this.label).width;
    ctx.fillText(this.label, x - width / 2, left.y + FONT_SIZE * 0.35);
    ctx.restore();
  }
}

// chord-translator.ts
class ChordTranslator {
  durations;
  notations;
  reader;
  keys = new Map;
  middleKeys = new Map;
  appearance = Appearance.NONE;
  constructor(durations, notations, reader) {
    this.durations = durations;
    this.notations = notations;
    this.reader = reader;
  }
  useAppearance(appearance) {
    this.appearance = appearance;
  }
  isHeld(note) {
    return this.reader.tiesOf(note).some((tie) => tie.tieType === "stop");
  }
  staveNote(chord, clef, opts) {
    const { octaveShift = 0 } = opts;
    const lead = chord.lead;
    const visible = lead.printObject && !opts.styled?.hidden;
    const NoteClass = visible ? StaveNote2 : InvisibleStaveNote;
    if (lead.isRest) {
      const rest = new NoteClass(this.struct(chord, clef, opts));
      this.dressRest(rest);
      this.hideSpacing(rest, lead);
      this.attachSign(rest, opts);
      this.addDots(rest, lead);
      this.notations.attachRest(rest, chord);
      return rest;
    }
    if (lead.isGrace) {
      const grace = new GraceNote({
        keys: chord.notes.map((note) => this.vexflowKey(note)),
        duration: this.durations.code(lead),
        clef,
        octaveShift,
        slash: lead.graceSlash
      });
      this.addAccidentals(grace, chord);
      return grace;
    }
    const staveNote = visible && isCueSized(lead) ? new GraceNote(this.struct(chord, clef, opts)) : new NoteClass(this.struct(chord, clef, opts));
    this.hideSpacing(staveNote, lead);
    this.attachSign(staveNote, opts);
    if (opts.slashed) {
      staveNote.noteHeads[0]?.setText(this.slashGlyph(chord));
    } else {
      this.addAccidentals(staveNote, chord);
      this.addParentheses(staveNote, chord);
      this.addLevel(staveNote, chord);
      this.addNoteheadText(staveNote, chord);
    }
    this.addDots(staveNote, lead);
    this.hideLedgerLines(staveNote, lead);
    this.applyStemNone(staveNote, lead);
    if (!opts.slashed) {
      this.addSlashNoteheads(staveNote, chord);
    }
    this.notations.attach(staveNote, chord);
    return staveNote;
  }
  attachSign(staveNote, opts) {
    if (staveNote instanceof InvisibleStaveNote && opts.styled?.sign) {
      staveNote.sign = opts.styled.sign;
    }
  }
  dressRest(rest) {
    const glyph = this.appearance.glyph("quarter-rest");
    const key = rest.keyProps[0];
    if (glyph !== null && key && rest.glyphProps.codeHead === VexFlow2.Glyphs.restQuarter) {
      key.code = glyph;
      rest.reset();
    }
  }
  hideSpacing(staveNote, note) {
    if (staveNote instanceof InvisibleStaveNote && note.getAttribute("print-spacing") === "no") {
      staveNote.spacingHidden = true;
    }
  }
  keyLines(chord, clef, opts) {
    if (chord.lead.isGrace) {
      return [];
    }
    const {
      keys,
      clef: keyClef,
      octaveShift = 0
    } = this.struct(chord, clef, opts);
    return keys.map((key) => VexFlow2.keyProperties(key, keyClef).line - 3.5 * octaveShift);
  }
  struct(chord, clef, opts) {
    const { alignCenter = false, octaveShift = 0, defaultStem, stem } = opts;
    const lead = chord.lead;
    const duration = this.durations.code(lead);
    if (lead.isRest) {
      const restKey = this.pitchedRestKey(lead);
      return {
        keys: [
          restKey ?? (defaultStem ? VOICE_REST_KEY[defaultStem] : undefined) ?? "b/4"
        ],
        duration: `${duration}r`,
        dots: this.reader.dotsOf(lead),
        clef: restKey ? clef : undefined,
        alignCenter,
        stemDirection: stem ? STEM[stem] : undefined
      };
    }
    const direction = opts.slashed ? this.stemOf(lead, defaultStem) ?? "up" : stem ?? this.stemOf(lead, defaultStem);
    return {
      keys: opts.slashed ? [this.middleKey(clef)] : chord.notes.map((note) => this.vexflowKey(note)),
      duration,
      dots: this.reader.dotsOf(lead),
      clef,
      octaveShift,
      stemDirection: direction ? STEM[direction] : undefined,
      autoStem: !direction && !lead.stem
    };
  }
  stemOf(note, defaultStem) {
    if (note.stem === "up" || note.stem === "down") {
      return note.stem;
    }
    return note.stem ? undefined : defaultStem;
  }
  applyNoteColors(staveNote, chord) {
    const lead = chord.lead;
    const noteColor = lead.color;
    if (noteColor) {
      staveNote.setStyle({ fillStyle: noteColor, strokeStyle: noteColor });
      staveNote.setLedgerLineStyle({ strokeStyle: noteColor });
    }
    chord.notes.forEach((note, index) => {
      const color = note.notehead?.color ?? note.color;
      if (color) {
        staveNote.noteHeads[index]?.setStyle({
          fillStyle: color,
          strokeStyle: color
        });
      }
    });
    const stemColor = lead.stemColor ?? noteColor;
    if (stemColor) {
      staveNote.getStem()?.setStyle({ strokeStyle: stemColor });
    }
  }
  vexflowKey(note) {
    let key = this.keys.get(note);
    if (key === undefined) {
      key = this.spellKey(note);
      this.keys.set(note, key);
    }
    return key;
  }
  spellKey(note) {
    const pitch = note.pitch;
    const key = pitch ? `${pitch.step.toLowerCase()}/${pitch.octave}` : this.displayKey(note.unpitched);
    if (!key) {
      return "b/4";
    }
    if (isDiamondHarmonic(note, this.reader)) {
      return `${key}/H`;
    }
    const notehead = note.notehead;
    if (!notehead) {
      return key;
    }
    const filled = notehead.filled;
    const fill = filled === null ? null : NOTEHEAD_FILL_SUFFIX[notehead.value];
    const suffix = (fill && (filled ? fill.filled : fill.open)) ?? NOTEHEAD_SUFFIX[notehead.value];
    return suffix ? `${key}/${suffix}` : key;
  }
  displayKey(at) {
    return at ? `${at.step.toLowerCase()}/${at.octave}` : null;
  }
  pitchedRestKey(note) {
    return this.displayKey(note.restPosition);
  }
  addAccidentals(staveNote, chord) {
    chord.notes.forEach((note, i) => {
      if (note.notehead?.value === "x" || this.isHeld(note)) {
        return;
      }
      const printed = this.reader.accidentalOf(note);
      const code = printed && (printed.value === "other" ? smuflGlyph2(printed.getAttribute("smufl")) : ACCIDENTAL_CODES[printed.value]);
      if (!printed || !code) {
        return;
      }
      const bracket = printed.bracket || printed.editorial;
      const accidental = new Accidental(bracket ? ACCIDENTAL_BRACKET_LEFT + new Accidental(code).getText() + ACCIDENTAL_BRACKET_RIGHT : code);
      if (!bracket && (printed.cautionary || printed.parentheses)) {
        accidental.setAsCautionary();
      }
      staveNote.addModifier(accidental, i);
    });
  }
  addParentheses(staveNote, chord) {
    chord.notes.forEach((note, i) => {
      if (note.notehead?.parentheses) {
        staveNote.addModifier(new Parenthesis(Modifier2.Position.LEFT), i);
        staveNote.addModifier(new Parenthesis(Modifier2.Position.RIGHT), i);
      }
    });
  }
  addLevel(staveNote, chord) {
    const level = chord.lead.child("level");
    const bracket = level?.getAttribute("bracket") === "yes";
    if (!level || !bracket && level.getAttribute("parentheses") !== "yes") {
      return;
    }
    chord.notes.forEach((note, i) => {
      if (!bracket && note.notehead?.parentheses) {
        return;
      }
      for (const position of [
        Modifier2.Position.LEFT,
        Modifier2.Position.RIGHT
      ]) {
        const mark = new Parenthesis(position);
        if (bracket) {
          mark.setText(position === Modifier2.Position.LEFT ? NOTEHEAD_BRACKET_LEFT : NOTEHEAD_BRACKET_RIGHT);
        }
        staveNote.addModifier(mark, i);
      }
    });
  }
  hideLedgerLines(staveNote, note) {
    if (note.getAttribute("print-leger") === "no") {
      staveNote.drawLedgerLines = () => {};
    }
  }
  addNoteheadText(staveNote, chord) {
    chord.notes.forEach((note, i) => {
      const runs = note.child("notehead-text")?.children ?? [];
      const text = runs.filter((run) => run instanceof MElement3).map((run) => this.noteheadRun(run)).join("");
      if (text) {
        staveNote.addModifier(new NoteheadText(text), i);
      }
    });
  }
  noteheadRun(run) {
    const text = run.text ?? "";
    return run.tag === "accidental-text" ? ACCIDENTAL_SIGNS[text] ?? text : text;
  }
  addDots(staveNote, note) {
    if (note.getAttribute("print-dot") === "no") {
      return;
    }
    for (let i = 0;i < this.reader.dotsOf(note); i++) {
      Dot.buildAndAttach([staveNote], { all: true });
    }
  }
  applyStemNone(staveNote, note) {
    if (note.stem === "none") {
      staveNote.glyphProps = {
        ...staveNote.glyphProps,
        stem: false,
        codeFlagUp: undefined
      };
    }
  }
  slashGlyph(chord) {
    return SLASH_GLYPHS[this.durations.code(chord.lead)] ?? SLASH_GLYPH_FILLED;
  }
  middleKey(clef) {
    let key = this.middleKeys.get(clef);
    if (key === undefined) {
      key = MIDDLE_KEY_CANDIDATES.find((candidate) => VexFlow2.keyProperties(candidate, clef).line === MIDDLE_LINE) ?? "b/4";
      this.middleKeys.set(clef, key);
    }
    return key;
  }
  addSlashNoteheads(staveNote, chord) {
    const byDuration = this.slashGlyph(chord);
    const noteHeads = staveNote.noteHeads;
    chord.notes.forEach((note, i) => {
      if (note.notehead?.value !== "slash") {
        return;
      }
      const filled = note.notehead?.filled ?? null;
      let text = byDuration;
      if (filled === true) {
        text = SLASH_GLYPH_FILLED;
      } else if (filled === false) {
        text = SLASH_GLYPH_OPEN;
      }
      noteHeads[i]?.setText(text);
    });
  }
}
var ACCIDENTAL_SIGNS = {
  sharp: "♯",
  flat: "♭",
  natural: "♮"
};
var ACCIDENTAL_CODES = {
  sharp: "#",
  flat: "b",
  natural: "n",
  "double-sharp": "##",
  "sharp-sharp": "##",
  "flat-flat": "bb",
  "natural-sharp": "",
  "natural-flat": "",
  "quarter-sharp": "+",
  "quarter-flat": "d",
  "three-quarters-sharp": "++",
  "three-quarters-flat": "db",
  "sharp-down": "",
  "sharp-up": "",
  "natural-down": "",
  "natural-up": "",
  "flat-down": "",
  "flat-up": "",
  "double-sharp-down": "",
  "double-sharp-up": "",
  "flat-flat-down": "",
  "flat-flat-up": "",
  "arrow-down": "",
  "arrow-up": "",
  "triple-sharp": "",
  "triple-flat": "",
  "slash-quarter-sharp": "+-",
  "slash-sharp": "++-",
  "slash-flat": "bs",
  "double-slash-flat": "bss",
  "sharp-1": "",
  "sharp-2": "",
  "sharp-3": "",
  "sharp-5": "",
  "flat-1": "",
  "flat-2": "",
  "flat-3": "",
  "flat-4": "",
  sori: "o",
  koron: "k"
};
function smuflGlyph2(name) {
  const glyphs = VexFlow2.Glyphs;
  return name ? glyphs[name] : undefined;
}
var STEM = { up: Stem.UP, down: Stem.DOWN };
var MIDDLE_LINE = 3;
var MIDDLE_KEY_CANDIDATES = [2, 3, 4, 5].flatMap((octave) => ["c", "d", "e", "f", "g", "a", "b"].map((step) => `${step}/${octave}`));
var NOTEHEAD_BRACKET_LEFT = "";
var NOTEHEAD_BRACKET_RIGHT = "";
var ACCIDENTAL_BRACKET_LEFT = "";
var ACCIDENTAL_BRACKET_RIGHT = "";
var SLASH_GLYPHS = {
  w: "",
  h: ""
};
var SLASH_GLYPH_FILLED = "";
var SLASH_GLYPH_OPEN = "";
var NOTEHEAD_SUFFIX = {
  x: "X2",
  diamond: "DI",
  triangle: "TU",
  "inverted triangle": "TD",
  square: "SQ",
  rectangle: "SQ",
  "circle-x": "CX",
  slashed: "SF",
  "back slashed": "SB",
  do: "DO",
  re: "RE",
  mi: "MI",
  fa: "FA",
  "fa up": "FAUP",
  so: "SO",
  la: "LA",
  ti: "TI"
};
var NOTEHEAD_FILL_SUFFIX = {
  x: { open: "X1", filled: "X2" },
  diamond: { open: "D1", filled: "D2" },
  triangle: { open: "T1", filled: "T2" },
  square: { open: "S1", filled: "S2" },
  rectangle: { open: "S1", filled: "S2" }
};
var VOICE_REST_KEY = { up: "d/5", down: "g/4" };

// duration-translator.ts
import { GhostNote } from "vexflow/core";
var DURATION_CODES = {
  whole: "w",
  half: "h",
  quarter: "q",
  eighth: "8",
  "16th": "16",
  "32nd": "32",
  "64th": "64",
  "128th": "128"
};
var BEAT_CODES = [
  [4, "w"],
  [2, "h"],
  [1, "q"],
  [0.5, "8"],
  [0.25, "16"],
  [0.125, "32"],
  [0.0625, "64"],
  [0.03125, "128"]
];
var GHOST_DURATIONS = [
  ["w", 4],
  ["h", 2],
  ["q", 1],
  ["8", 0.5],
  ["16", 0.25],
  ["32", 0.125],
  ["64", 0.0625],
  ["128", 0.03125]
];

class DurationTranslator {
  reader;
  constructor(reader) {
    this.reader = reader;
  }
  code(lead) {
    if (lead.type) {
      return DURATION_CODES[lead.type] ?? "q";
    }
    const beats = this.reader.beatsOf(lead);
    if (beats === null) {
      return "q";
    }
    if (lead.isRest && this.fillsMeter(lead, beats)) {
      return "w";
    }
    return BEAT_CODES.find(([b]) => Math.abs(b - beats) < EPSILON)?.[1] ?? "q";
  }
  fillsMeter(lead, beats) {
    const meter = this.reader.meterBeats(lead.time);
    return meter > 0 && Math.abs(meter - beats) < EPSILON;
  }
  ghostNotes(beats) {
    const ghosts = [];
    let remaining = beats;
    for (const [duration, value] of GHOST_DURATIONS) {
      while (remaining >= value - EPSILON) {
        ghosts.push(new GhostNote({ duration }));
        remaining -= value;
      }
    }
    return ghosts;
  }
}

// font-shorthand-patch.ts
import { Font } from "vexflow/core";

// css-font.ts
class CssFont {
  style;
  weightName;
  weight;
  size;
  sizePx;
  families;
  constructor(style, weightName, weight, size, sizePx, families) {
    this.style = style;
    this.weightName = weightName;
    this.weight = weight;
    this.size = size;
    this.sizePx = sizePx;
    this.families = families;
  }
  static parse(shorthand) {
    let style = "normal";
    let weightName = "normal";
    const words = shorthand.trim().split(/\s+/);
    let at = 0;
    for (;at < words.length; at++) {
      const word = words[at] ?? "";
      if (word === "italic" || word === "oblique") {
        style = word;
      } else if (WEIGHTS.has(word) || /^\d{1,4}$/.test(word)) {
        weightName = word;
      } else if (!MODIFIERS.has(word)) {
        break;
      }
    }
    const size = (words[at] ?? "").split("/")[0] ?? "";
    const sizePx = toPx(size);
    if (sizePx === null) {
      return null;
    }
    const families = words.slice(at + 1).join(" ").split(",").map((name) => name.trim().replace(/^(['"])(.*)\1$/, "$2")).filter((name) => name.length > 0);
    return new CssFont(style, weightName, WEIGHTS.get(weightName) ?? Number(weightName), size, sizePx, families);
  }
}
var WEIGHTS = new Map([
  ["normal", 400],
  ["bold", 700],
  ["lighter", 300],
  ["bolder", 700]
]);
var MODIFIERS = new Set(["normal", "small-caps"]);
var UNITS = {
  px: 1,
  pt: 4 / 3,
  pc: 16,
  in: 96,
  cm: 96 / 2.54,
  mm: 96 / 25.4,
  em: 16,
  rem: 16
};
function toPx(size) {
  const match = /^(\d*\.?\d+)([a-z]+)$/.exec(size);
  const unit = match ? UNITS[match[2] ?? ""] : undefined;
  return match && unit !== undefined ? Number(match[1]) * unit : null;
}

// font-shorthand-patch.ts
class FontShorthandPatch {
  static installed = false;
  install() {
    if (FontShorthandPatch.installed || typeof document !== "undefined") {
      return;
    }
    FontShorthandPatch.installed = true;
    const fromCSSString = Font.fromCSSString;
    Font.fromCSSString = (shorthand) => {
      const font = CssFont.parse(shorthand);
      if (!font) {
        return fromCSSString(shorthand);
      }
      return {
        family: font.families.map(serialize).join(", "),
        size: font.size,
        weight: font.weightName,
        style: font.style
      };
    };
  }
}
var GENERIC = new Set([
  "serif",
  "sans-serif",
  "monospace",
  "cursive",
  "fantasy",
  "system-ui"
]);
function serialize(name) {
  return GENERIC.has(name) || name.split(" ").every((word) => /^-?[A-Za-z_][\w-]*$/.test(word)) ? name : `"${name}"`;
}

// layout-planner.ts
import {
  Formatter,
  GhostNote as GhostNote2,
  GraceNoteGroup,
  Metrics
} from "vexflow/core";

// header-plan.ts
class HeaderPlan {
  header;
  constructor(header) {
    this.header = header;
  }
  static of(config, header) {
    return config.showHeader && config.layout.type !== "panoramic" && header ? new HeaderPlan(header) : null;
  }
  height(width) {
    return this.stack(width).height;
  }
  footer(width) {
    const lines = [];
    let y = 0;
    for (const text of this.header.footer) {
      y += HEADER_FOOTER_SIZE;
      lines.push({
        text,
        size: HEADER_FOOTER_SIZE,
        weight: "normal",
        align: "center",
        x: width / 2,
        baseline: y
      });
      y += HEADER_FOOTER_SIZE * DESCENT;
    }
    return { lines, height: y };
  }
  lines(width) {
    return this.stack(width).lines;
  }
  creditWidth(text) {
    return text.length * HEADER_CREDIT_SIZE * 0.6;
  }
  stack(width) {
    const lines = [];
    let y = 0;
    const centered = [
      ...this.header.title ? [{ text: this.header.title, size: HEADER_TITLE_SIZE }] : [],
      ...this.header.subtitles.map((text) => ({
        text,
        size: HEADER_SUBTITLE_SIZE
      }))
    ];
    for (const [index, { text, size }] of centered.entries()) {
      y += size;
      lines.push({
        text,
        size,
        weight: index === 0 && this.header.title ? "bold" : "normal",
        align: "center",
        x: width / 2,
        baseline: y
      });
      y += size * DESCENT;
    }
    if (this.header.symbols.length > 0) {
      y += HEADER_SYMBOL_SIZE;
      lines.push({
        text: this.header.symbols.join(" "),
        size: HEADER_SYMBOL_SIZE,
        weight: "normal",
        align: "center",
        x: width / 2,
        baseline: y,
        glyph: true
      });
      y += HEADER_SYMBOL_SIZE * DESCENT;
    }
    const rows = Math.max(this.header.left.length, this.header.right.length);
    if (rows > 0 && centered.length > 0) {
      y += SIDE_GAP;
    }
    for (let row = 0;row < rows; row++) {
      const left = this.header.left[row];
      const right = this.header.right[row];
      const stacked = !!left && !!right && this.creditWidth(left) + this.creditWidth(right) + SIDE_GAP > width - 2 * PAGE_MARGIN_X;
      y += HEADER_CREDIT_SIZE;
      const sides = [
        { text: left, align: "left", x: PAGE_MARGIN_X },
        { text: right, align: "right", x: width - PAGE_MARGIN_X }
      ];
      for (const { text, align, x } of sides) {
        if (!text) {
          continue;
        }
        if (stacked && align === "right") {
          y += HEADER_CREDIT_SIZE;
        }
        lines.push({
          text,
          size: HEADER_CREDIT_SIZE,
          weight: "normal",
          align,
          x,
          baseline: y
        });
        if (stacked && align === "left") {
          y += HEADER_CREDIT_SIZE * DESCENT;
        }
      }
      y += HEADER_CREDIT_SIZE * DESCENT;
    }
    return { lines, height: y };
  }
}
var DESCENT = 0.35;
var SIDE_GAP = 6;

// lazy-layout-plan.ts
class LazyLayoutPlan {
  rules;
  layout;
  systems = [];
  row = [];
  rowMinWidth = 0;
  forcedStarts = new Set;
  next = 0;
  evened = 0;
  placed = 0;
  finished = false;
  version = 0;
  forecasted = null;
  measuredSum = 0;
  estimatedSum = 0;
  measuredMinSum = 0;
  estimatedMinSum = 0;
  ratioThrough = 0;
  constructor(rules) {
    this.rules = rules;
    this.layout = {
      ...rules.base,
      boxes: [],
      width: rules.width,
      systemStaveOffsets: new Map
    };
    this.skipHidden();
    if (this.next >= rules.measureCount) {
      this.finish();
    }
  }
  placedSystems() {
    return this.placed;
  }
  isComplete() {
    return this.finished && this.placed >= this.systems.length;
  }
  placeThrough(system) {
    while (!this.finished && this.placed <= system) {
      this.consume();
    }
  }
  complete() {
    while (!this.finished) {
      this.consume();
    }
    return this.layout;
  }
  systemMeasures() {
    if (!this.finished) {
      throw new Error("vexml: the layout is not complete");
    }
    return this.systems;
  }
  systemOfMeasure(m) {
    const { boxes } = this.forecast();
    for (let i = Math.min(m, boxes.length - 1);i >= 0; i--) {
      const box = boxes[i];
      if (box) {
        return box.systemIndex;
      }
    }
    return 0;
  }
  forecast() {
    if (this.forecasted?.version === this.version) {
      return this.forecasted;
    }
    const { rules } = this;
    const ratio = this.estimateRatio();
    const minRatio = this.minRatio();
    const areaOf = (m, systemStart = false) => {
      if (m < this.next) {
        return rules.areaOf(m, systemStart);
      }
      const estimate = rules.estimateOf(m);
      const min = estimate.min * minRatio;
      return { min, ideal: Math.max(min, estimate.ideal * ratio) };
    };
    const rows = this.systems.slice(this.placed).map((row) => [...row]);
    let row = [...this.row];
    let rowMinWidth = this.rowMinWidth;
    for (let m = this.next;m < rules.measureCount; m++) {
      if (rules.hidden.has(m)) {
        continue;
      }
      let area = areaOf(m, !row.some(rules.isMusic));
      const { forcedBreak, keepsLine } = rules.printOf(m);
      const systemIndex = this.placed + rows.length;
      const usable = rules.usableOf(systemIndex, row[0] ?? m);
      const overruns = !keepsLine && rowMinWidth + LEAD_BARLINE + area.min > usable * rules.maxSystemFill;
      if (rules.layoutMode === "standard" && this.canBreak(row, m) && (forcedBreak || overruns)) {
        rows.push(row);
        row = [];
        rowMinWidth = 0;
        area = areaOf(m, true);
      }
      rowMinWidth += rules.leadOf(m, !row.some(rules.isMusic)) + area.min;
      row.push(m);
    }
    if (row.length > 0) {
      rows.push(row);
    }
    const boxes = [...this.layout.boxes];
    const systemCount = this.placed + rows.length;
    rows.forEach((measures, i) => {
      this.placeSystem(boxes, measures, this.placed + i, {
        isLast: i === rows.length - 1,
        lone: systemCount === 1,
        areaOf
      });
    });
    this.forecasted = { boxes, systemCount, version: this.version };
    return this.forecasted;
  }
  estimateRatio() {
    const { rules } = this;
    for (;this.ratioThrough < this.next; this.ratioThrough++) {
      const m = this.ratioThrough;
      if (rules.hidden.has(m) || !rules.isMusic(m)) {
        continue;
      }
      const measured = rules.areaOf(m);
      const estimated = rules.estimateOf(m);
      this.measuredSum += measured.ideal;
      this.estimatedSum += estimated.ideal;
      this.measuredMinSum += measured.min;
      this.estimatedMinSum += estimated.min;
    }
    return this.estimatedSum > 0 ? this.measuredSum / this.estimatedSum : 1;
  }
  minRatio() {
    return this.estimatedMinSum > 0 ? this.measuredMinSum / this.estimatedMinSum : 1;
  }
  consume() {
    const { rules } = this;
    const m = this.next;
    let area = rules.areaOf(m, !this.row.some(rules.isMusic));
    const { forcedBreak, keepsLine } = rules.printOf(m);
    const usable = rules.usableOf(this.systems.length, this.row[0] ?? m);
    const overruns = keepsLine ? !rules.strict && rules.overflow === "wrap" && this.rowMinWidth + LEAD_BARLINE + area.min > usable : this.rowMinWidth + LEAD_BARLINE + area.min > usable * rules.maxSystemFill;
    if (rules.layoutMode === "standard" && this.canBreak(this.row, m) && (forcedBreak || overruns)) {
      if (forcedBreak) {
        this.forcedStarts.add(m);
      }
      this.systems.push(this.row);
      this.row = [];
      this.rowMinWidth = 0;
      area = rules.areaOf(m, true);
    }
    const lead = rules.leadOf(m, !this.row.some(rules.isMusic));
    this.rowMinWidth += lead + area.min;
    this.row.push(m);
    this.next = m + 1;
    this.skipHidden();
    if (this.next >= rules.measureCount) {
      this.finish();
    }
    this.version++;
    this.settle();
  }
  canBreak(row, m) {
    return this.rules.isMusic(m) && row.some(this.rules.isMusic);
  }
  skipHidden() {
    while (this.next < this.rules.measureCount && this.rules.hidden.has(this.next)) {
      this.next++;
    }
  }
  finish() {
    if (this.row.length > 0) {
      this.systems.push(this.row);
      this.row = [];
    }
    this.finished = true;
  }
  settle() {
    const begun = this.systems.length + (this.row.length > 0 ? 1 : 0);
    while (this.evened + 2 < begun) {
      this.evenPair(this.evened);
      this.evened++;
    }
    while (this.placed < this.systems.length && (this.placed + 2 < begun || this.finished)) {
      this.place(this.placed);
      this.placed++;
    }
  }
  evenPair(s) {
    const { rules } = this;
    const start = this.systems[s];
    const follow = this.systems[s + 1];
    const boundary = follow?.[0];
    if (!start || !follow || boundary === undefined) {
      return;
    }
    if (this.forcedStarts.has(boundary)) {
      return;
    }
    const misfit = (measures, systemIndex) => {
      const intrinsic = this.spanOf(measures, "ideal");
      const usable = rules.usableOf(systemIndex, measures[0] ?? 0);
      return intrinsic > usable ? intrinsic / usable : usable / intrinsic;
    };
    const overruns = (measures, systemIndex) => this.spanOf(measures, "min") > rules.usableOf(systemIndex, measures[0] ?? 0);
    let head = start;
    let tail = follow;
    let worst = Math.max(misfit(head, s), misfit(tail, s + 1));
    while (head.length > 1) {
      const nextHead = head.slice(0, -1);
      if (!nextHead.some(rules.isMusic)) {
        break;
      }
      const nextTail = head.slice(-1).concat(tail);
      if (overruns(nextTail, s + 1)) {
        break;
      }
      const candidate = Math.max(misfit(nextHead, s), misfit(nextTail, s + 1));
      if (candidate >= worst) {
        break;
      }
      head = nextHead;
      tail = nextTail;
      worst = candidate;
    }
    this.systems[s] = head;
    this.systems[s + 1] = tail;
  }
  spanOf(measures, key) {
    const start = this.musicStartOf(measures);
    return measures.reduce((sum, m, i) => sum + this.rules.leadOf(m, i === start) + this.rules.areaOf(m, i === start)[key], 0);
  }
  musicStartOf(measures) {
    return Math.max(0, measures.findIndex(this.rules.isMusic));
  }
  musicEndOf(measures) {
    const i = measures.findLastIndex(this.rules.isMusic);
    return i === -1 ? measures.length - 1 : i;
  }
  place(s) {
    const measures = this.systems[s];
    if (!measures) {
      return;
    }
    const right = this.placeSystem(this.layout.boxes, measures, s, {
      isLast: this.finished && s === this.systems.length - 1,
      lone: this.finished && this.systems.length === 1,
      areaOf: (m, systemStart) => this.rules.areaOf(m, systemStart)
    });
    this.layout.width = Math.max(this.layout.width, right);
  }
  placeSystem(boxes, measures, systemIndex, opts) {
    const { rules } = this;
    const start = this.musicStartOf(measures);
    const end = this.musicEndOf(measures);
    const leads = measures.map((m, i) => rules.leadOf(m, i === start));
    const areas = measures.map((m, i) => opts.areaOf(m, i === start));
    const areaSum = areas.reduce((sum, a) => sum + a.ideal, 0);
    const intrinsic = leads.reduce((sum, l) => sum + l, 0) + areaSum;
    const first = measures[0] ?? 0;
    const cap = rules.layoutMode === "standard" ? rules.usableOf(systemIndex, first) : Infinity;
    const isLastOfMany = opts.isLast && !opts.lone;
    const isRaggableLone = opts.lone && !rules.stretchSingleSystem;
    const obeysMinFill = isLastOfMany || isRaggableLone;
    const justify = rules.layoutMode === "standard" && (!obeysMinFill || intrinsic >= cap * rules.minLastSystemFill);
    const target = Math.min(cap, justify ? cap : intrinsic);
    const fixed = areas.reduce((sum, a) => sum + (a.fixed ? a.ideal : 0), 0);
    const flexibleSum = areaSum - fixed;
    const areaTarget = target - leads.reduce((sum, l) => sum + l, 0);
    const give = areaSum - areas.reduce((sum, a) => sum + a.min, 0);
    const squeeze = give > 0 ? Math.min(1, (areaSum - areaTarget) / give) : 1;
    const stretch = flexibleSum > 0 ? (areaTarget - fixed) / flexibleSum : 1;
    const areaWidth = (a) => {
      if (a.fixed) {
        return a.ideal;
      }
      return areaTarget >= areaSum ? a.ideal * stretch : a.ideal - (a.ideal - a.min) * squeeze;
    };
    const indent = start === 0 ? rules.indentOf(systemIndex, first) : 0;
    let cx = rules.left + indent;
    measures.forEach((m, i) => {
      const area = areas[i];
      const edge = rules.edgeOf(m);
      const w = edge ? rules.edgeWidthOf(m) : (leads[i] ?? 0) + (area ? areaWidth(area) : 0);
      boxes[m] = {
        x: cx,
        width: w,
        trailingPad: rules.padOf(m),
        leadingPad: edge ? 0 : rules.leadingPadOf(m, i === start),
        systemIndex,
        isSystemStart: i === start && !edge,
        isSystemEnd: i === end && !edge,
        edge
      };
      cx += w + (m === rules.lastLeading ? Math.max(rules.labelIndent, rules.systemOverhang) : 0);
    });
    return cx + rules.right + rules.rightIndentOf(first);
  }
}

// stave-factory.ts
import {
  StaveModifierPosition as StaveModifierPosition2,
  TabStave
} from "vexflow/core";

// staff-scaled-signatures.ts
import {
  KeySignature,
  StaveModifierPosition
} from "vexflow/core";
var STAVE_LINE_DISTANCE = 10;
function staveRatio(stave) {
  return stave.getSpacingBetweenLines() / STAVE_LINE_DISTANCE;
}

class StaffKeySignature extends KeySignature {
  getAccidentals() {
    if (!this.formatted) {
      this.format();
    }
    return this.children.map((glyph, i) => {
      const box = glyph.getBoundingBox();
      return {
        ...this.pitchOf(this.accList[i] ?? { type: "n", line: 0 }, i),
        x: this.x + box.getX(),
        y: box.getY(),
        w: box.getW(),
        h: box.getH()
      };
    });
  }
  opensStave() {
    return this.getPosition() === StaveModifierPosition.BEGIN;
  }
  convertToGlyph(acc, nextAcc, stave) {
    const before = this.width;
    super.convertToGlyph(acc, nextAcc, stave);
    const glyph = this.children[this.children.length - 1];
    if (!glyph) {
      return;
    }
    const gap = this.width - before - glyph.getWidth();
    glyph.setFontSize(glyph.fontSizeInPoints * staveRatio(stave));
    this.width = before + glyph.getWidth() + gap;
  }
}
function scaleTimeSignature(sig, stave) {
  const ratio = staveRatio(stave);
  if (ratio === 1) {
    return;
  }
  const inner = sig;
  const lineShift = inner.lineShift;
  for (const el of [sig, inner.topText, inner.botText]) {
    el.setFontSize(el.fontSizeInPoints * ratio);
  }
  sig.setTimeSig(sig.getTimeSpec());
  inner.lineShift = lineShift;
}

// cancelling-key-signature.ts
var STEPS2 = ["C", "D", "E", "F", "G", "A", "B"];
var TOP_LINE_STEPS = {
  treble: 5 * 7 + 3,
  bass: 3 * 7 + 5,
  alto: 4 * 7 + 4,
  tenor: 4 * 7 + 2
};
var ALTERS = { "#": 1, "##": 2, b: -1, bb: -2, n: 0 };

class CancellingKeySignature extends StaffKeySignature {
  keyClef;
  naturalsAfter;
  constructor(keySpec, cancelKeySpec, keyClef, naturalsAfter) {
    super(keySpec, cancelKeySpec);
    this.keyClef = keyClef;
    this.naturalsAfter = naturalsAfter;
  }
  pitchOf(acc) {
    const top = TOP_LINE_STEPS[this.keyClef] ?? TOP_LINE_STEPS.treble ?? 0;
    const steps = top - Math.round(acc.line * 2);
    return {
      step: STEPS2[(steps % 7 + 7) % 7] ?? "C",
      alter: ALTERS[acc.type] ?? 0
    };
  }
  convertAccLines(_clef, type, accList) {
    super.convertAccLines(this.keyClef, type, accList);
  }
  convertToCancelAccList(spec) {
    const cancelled = super.convertToCancelAccList(spec);
    if (cancelled && this.naturalsAfter) {
      this.accList = [
        ...this.accList.slice(cancelled.accList.length),
        ...cancelled.accList
      ];
    }
    return cancelled;
  }
}

// custom-key-signature.ts
import { Stave } from "vexflow/core";
class CustomKeySignature extends StaffKeySignature {
  accidentals;
  constructor(accidentals) {
    super("C");
    this.accidentals = accidentals;
  }
  pitchOf(_acc, index) {
    const { step, alter } = this.accidentals[index] ?? { step: "C", alter: 0 };
    return { step, alter };
  }
  format() {
    let stave = this.getStave();
    if (!stave) {
      stave = new Stave(0, 0, 100);
      this.setStave(stave);
    }
    this.width = 0;
    this.children = [];
    this.accList = this.accidentals.map((a) => ({ ...a }));
    for (const [i, acc] of this.accList.entries()) {
      this.convertToGlyph(acc, this.accList[i + 1], stave);
    }
    this.calculateDimensions();
    this.formatted = true;
  }
}

// detailed-stave.ts
import { Stave as Stave3 } from "vexflow/core";

class DetailedStave extends Stave3 {
  styledLines;
  constructor(x, y, width, styledLines, options) {
    super(x, y, width, options);
    this.styledLines = styledLines;
  }
  draw() {
    const ctx = this.checkContext();
    ctx.openGroup("stave");
    try {
      for (const { row, width, color, dash } of this.styledLines) {
        const thickness = width ?? this.getStyle().lineWidth ?? 1;
        const y = this.getYForLine(row) + (thickness % 2 === 0 ? 0 : 0.5);
        ctx.save();
        ctx.setLineWidth(thickness);
        if (color) {
          ctx.setStrokeStyle(color);
        }
        ctx.setLineDash(dash);
        ctx.beginPath();
        ctx.moveTo(this.x, y);
        ctx.lineTo(this.x + this.width, y);
        ctx.stroke();
        ctx.restore();
      }
    } finally {
      ctx.closeGroup();
    }
    const lineWidth = this.getStyle().lineWidth;
    if (lineWidth === undefined) {
      super.draw();
      return;
    }
    ctx.save();
    ctx.setLineWidth(lineWidth);
    super.draw();
    ctx.restore();
  }
}

// signature-translator.ts
import {
  StaveNote as StaveNote3,
  VexFlow as VexFlow3,
  Clef as VexflowClef
} from "vexflow/core";
class SignatureTranslator {
  appearance = Appearance.NONE;
  useAppearance(appearance) {
    this.appearance = appearance;
  }
  vexflowKeySpec(key) {
    return key.mode === "minor" ? `${key.rootNote}m` : `${key.rootNote}`;
  }
  timeSignatureSpec(time) {
    if (time?.symbol === "common") {
      return "C";
    }
    if (time?.symbol === "cut") {
      return "C|";
    }
    if (time?.symbol === "single-number" && time.beats) {
      return time.beats;
    }
    const extended = this.extendedTimeSpec(time);
    if (extended) {
      return JSON.stringify(extended);
    }
    if (time?.beats && time?.beatType) {
      return `${time.beats}/${time.beatType}`;
    }
    return null;
  }
  extendedTimeSpec(time) {
    if (!time?.beats || !time.beatType) {
      return null;
    }
    const symbol = time.symbol;
    const noted = symbol === "note" || symbol === "dotted-note";
    const interchangeable = time.child("interchangeable");
    const other = interchangeable?.child("beats")?.text?.trim();
    const otherType = interchangeable?.child("beat-type")?.text?.trim();
    const hasOther = Boolean(other && otherType);
    const pairs = time.components?.length ? time.components : [{ beats: time.beats, beatType: time.beatType }];
    const separator = this.timeSeparator(time);
    if (!noted && !hasOther && pairs.length < 2 && !separator) {
      return null;
    }
    return {
      separator,
      faces: pairs.map((pair) => this.timeFace(pair.beats, pair.beatType, noted ? symbol : null)),
      interchange: hasOther && other && otherType ? {
        relation: interchangeable?.child("time-relation")?.text?.trim() ?? null,
        face: this.timeFace(other, otherType, interchangeable?.getAttribute("symbol") === "note" || interchangeable?.getAttribute("symbol") === "dotted-note" ? interchangeable.getAttribute("symbol") : null)
      } : null
    };
  }
  timeSeparator(time) {
    const separator = time.getAttribute("separator");
    return separator && SEPARATORS.has(separator) ? separator : null;
  }
  keyCancel(key, prevKey) {
    const cancel = key?.child("cancel");
    const spec = FIFTHS_KEYS[Number(cancel?.text?.trim()) + 7];
    if (cancel && spec) {
      const location = cancel.getAttribute("location");
      return {
        spec,
        location: location === "right" || location === "before-barline" ? location : "left"
      };
    }
    return prevKey?.rootNote ? { spec: this.vexflowKeySpec(prevKey), location: "left" } : null;
  }
  timeFace(beats, beatType, note) {
    if (note !== "dotted-note") {
      return {
        beats,
        beatType,
        note: note === "note" ? "note" : null
      };
    }
    const count = Number(beats);
    const unit = Number(beatType) / 2;
    if (Number.isInteger(count) && count % 3 === 0 && unit >= 1) {
      return {
        beats: String(count / 3),
        beatType: String(unit),
        note: "dotted-note"
      };
    }
    return { beats, beatType, note: "note" };
  }
  customKeyAccidentals(key, clef) {
    const out = [];
    for (const alteration of key.alterations) {
      const named = alteration.accidental;
      const type = (named ? ACCIDENTAL_CODES[named] : undefined) ?? KEY_ALTER_CODES[String(alteration.alter)];
      if (!type) {
        continue;
      }
      out.push({
        type,
        line: this.keySignatureLine(alteration.step, alteration.octave, clef),
        step: alteration.step,
        alter: alteration.alter
      });
    }
    return out;
  }
  vexflowClef(sign, line) {
    switch (sign) {
      case "F":
        return "bass";
      case "C":
        return line === 4 ? "tenor" : "alto";
      case "percussion":
        return "percussion";
      default:
        return "treble";
    }
  }
  clefName(clef) {
    return this.vexflowClef(clef.sign, clef.getAttribute("additional") === "yes" ? null : clef.line);
  }
  clefSize(clef, change) {
    switch (clef?.getAttribute("size")) {
      case "cue":
      case "grace-cue":
        return { size: "small", scale: 1 };
      case "full":
        return { size: "default", scale: 1 };
      case "large":
        return { size: "default", scale: 1.2 };
      default:
        return { size: change ? "small" : "default", scale: 1 };
    }
  }
  vexflowClefSpec(clef) {
    return clef ? `${this.clefName(clef)}|${this.vexflowClefAnnotation(clef.octaveChange) ?? ""}` : null;
  }
  midClefSpecs(changes) {
    return changes.map(({ beat, clef }) => ({
      beat,
      clef: this.clefName(clef),
      annotation: this.vexflowClefAnnotation(clef.octaveChange),
      size: this.clefSize(clef, true),
      glyph: this.clefGlyph(this.clefName(clef), this.vexflowClefAnnotation(clef.octaveChange))
    }));
  }
  clefGlyph(name, annotation) {
    const code = VexflowClef.types[name]?.code;
    const { Glyphs } = VexFlow3;
    let type = null;
    if (code === Glyphs.cClef) {
      type = "c-clef";
    } else if (code === Glyphs.fClef && !annotation) {
      type = "f-clef";
    } else if (code === Glyphs.gClef && annotation === "8vb") {
      type = "g-clef-ottava-bassa";
    } else if (code === Glyphs.unpitchedPercussionClef1) {
      type = "percussion-clef";
    }
    return type ? this.appearance.glyph(type) : null;
  }
  vexflowClefAnnotation(octaveChange) {
    if (octaveChange === 1) {
      return "8va";
    }
    if (octaveChange === -1) {
      return "8vb";
    }
    return;
  }
  keySignatureLine(step, octave, clef) {
    const lineOf = (o) => 5 - (new StaveNote3({
      keys: [`${step.toLowerCase()}/${o}`],
      duration: "w",
      clef
    }).getKeyProps()[0]?.line ?? 2);
    if (octave !== null) {
      return lineOf(octave);
    }
    const onStave = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(lineOf).filter((line) => line >= 0 && line <= 4);
    return onStave.length > 0 ? Math.min(...onStave) : 2;
  }
}
var KEY_ALTER_CODES = {
  "-2": "bb",
  "-1": "b",
  "0": "n",
  "1": "#",
  "2": "##"
};
var FIFTHS_KEYS = [
  "Cb",
  "Gb",
  "Db",
  "Ab",
  "Eb",
  "Bb",
  "F",
  "C",
  "G",
  "D",
  "A",
  "E",
  "B",
  "F#",
  "C#"
];
var SEPARATORS = new Set([
  "horizontal",
  "diagonal",
  "vertical",
  "adjacent"
]);
function setClefGlyph(clef, glyph) {
  if (glyph !== null) {
    clef.code = glyph;
    clef.setText(glyph);
  }
}
function scaleClefGlyph(glyph, scale) {
  if (scale !== 1) {
    glyph.setFontSize(Number.parseFloat(String(glyph.fontInfo.size)) * scale);
  }
}

// stave-factory.ts
var STAVE_LINE_DISTANCE2 = 10;
var SMALL_STAFF_SIZE = 75;

class StaveFactory {
  signatures;
  staves;
  reader;
  constructor(signatures, staves, reader) {
    this.signatures = signatures;
    this.staves = staves;
    this.reader = reader;
  }
  create(part, measure, staffNumber, x, y, width) {
    const isTab = this.staves.isTab(part, staffNumber);
    const tabLines = isTab ? measure.getStaveLines(staffNumber) : 0;
    const staveLines = measure.getStaveLines(staffNumber);
    const hiddenAbove = Math.max(0, Math.floor((5 - staveLines) / 2));
    const halfNudge = Math.max(0, (5 - staveLines) / 2 - hiddenAbove);
    const staffType = measure.getStaffDetails(staffNumber)?.child("staff-type")?.text?.trim();
    const size = measure.getStaffDetails(staffNumber)?.staffSize ?? (staffType === "ossia" || staffType === "cue" ? SMALL_STAFF_SIZE : 100);
    const spacing = STAVE_LINE_DISTANCE2 * size / 100;
    const centering = 2 * (STAVE_LINE_DISTANCE2 - spacing);
    const details = isTab ? [] : this.lineDetails(measure, staffNumber, staveLines, hiddenAbove);
    const styled = details.flatMap((detail) => detail.style ? [detail.style] : []);
    const tabSpacing = TAB_LINE_DISTANCE * size / 100;
    const stave = isTab ? new TabStave(x, y, width, {
      numLines: tabLines,
      spacingBetweenLinesPx: tabSpacing
    }) : new DetailedStave(x, y, width, styled, {
      spaceAboveStaffLn: ((4 + halfNudge) * STAVE_LINE_DISTANCE2 + centering) / spacing,
      spacingBetweenLinesPx: spacing
    });
    for (let line = 0;line < 5 && !isTab && staveLines < 5; line++) {
      stave.setConfigForLine(line, {
        visible: line >= hiddenAbove && line < hiddenAbove + staveLines
      });
    }
    for (const { row } of details) {
      stave.setConfigForLine(row, { visible: false });
    }
    const emptyOssia = staffType === "ossia" && !this.reader.notesOf(measure).some((n) => n.staff === staffNumber && !n.isRest);
    if (measure.getStaffDetails(staffNumber)?.printObject === false || emptyOssia) {
      for (let line = 0;line < 5; line++) {
        stave.setConfigForLine(line, { visible: false });
      }
    }
    return { stave, isTab, tabLines };
  }
  lineDetails(measure, staffNumber, staveLines, hiddenAbove) {
    const details = [];
    for (const detail of measure.getLineDetails(staffNumber)) {
      const row = hiddenAbove + staveLines - detail.line;
      if (detail.line < 1 || detail.line > staveLines) {
        continue;
      }
      if (detail.getAttribute("print-object") === "no") {
        details.push({ row, style: null });
        continue;
      }
      const width = detail.width;
      const color = detail.getAttribute("color");
      const dash = this.dashOf(detail);
      if (width === null && !color && dash.length === 0) {
        continue;
      }
      details.push({ row, style: { row, width, color, dash } });
    }
    return details;
  }
  dashOf(detail) {
    const type = detail.getAttribute("line-type");
    if (type !== "dashed" && type !== "dotted") {
      return [];
    }
    return type === "dotted" ? [1, 3] : [5, 3];
  }
  addOpening(placed, measure, staffNumber, cancel) {
    const { stave, isTab, tabLines } = placed;
    if (isTab) {
      const tabStave = stave;
      tabStave.addTabGlyph();
      this.resizeTabClef(tabStave, tabLines);
      return;
    }
    const clef = measure.getClef(staffNumber);
    if (clef?.getAttribute("print-object") !== "no") {
      const { size, scale } = this.signatures.clefSize(clef, false);
      const name = this.clefName(measure, staffNumber);
      const annotation = this.signatures.vexflowClefAnnotation(clef?.octaveChange ?? null);
      stave.addClef(name, size, annotation);
      this.dressClef(stave, scale, this.signatures.clefGlyph(name, annotation));
    }
    this.addKey(stave, measure, staffNumber, cancel);
  }
  addClefChange(stave, measure, staffNumber) {
    const clef = measure.getClef(staffNumber);
    if (!clef) {
      return;
    }
    const { size, scale } = this.signatures.clefSize(clef, true);
    const name = this.signatures.clefName(clef);
    const annotation = this.signatures.vexflowClefAnnotation(clef.octaveChange);
    stave.addClef(name, size, annotation);
    this.dressClef(stave, scale, this.signatures.clefGlyph(name, annotation));
  }
  addEndCancel(stave, cancel, clef) {
    stave.addModifier(new CancellingKeySignature("C", cancel.spec, clef ? this.signatures.clefName(clef) : "treble", false).setPosition(StaveModifierPosition2.END), StaveModifierPosition2.END);
  }
  addKey(stave, measure, staffNumber, cancel) {
    const key = measure.getKey(staffNumber);
    if (key?.getAttribute("print-object") === "no") {
      return;
    }
    const customKey = this.customKey(measure, staffNumber);
    if (customKey.length > 0) {
      stave.addModifier(new CustomKeySignature(customKey).setPosition(StaveModifierPosition2.BEGIN), StaveModifierPosition2.BEGIN);
    } else if (key?.rootNote) {
      stave.addModifier(new CancellingKeySignature(this.signatures.vexflowKeySpec(key), cancel?.spec, this.clefName(measure, staffNumber), cancel?.location === "right").setPosition(StaveModifierPosition2.BEGIN), StaveModifierPosition2.BEGIN);
    }
  }
  customKey(measure, staffNumber) {
    const key = measure.getKey(staffNumber);
    return key ? this.signatures.customKeyAccidentals(key, this.clefName(measure, staffNumber)) : [];
  }
  clefSpec(measure, staffNumber) {
    return this.signatures.vexflowClefSpec(measure.getClef(staffNumber));
  }
  clefName(measure, staffNumber) {
    const clef = measure.getClef(staffNumber);
    return clef ? this.signatures.clefName(clef) : "treble";
  }
  dressClef(stave, scale, glyph) {
    const ratio = stave.getSpacingBetweenLines() / STAVE_LINE_DISTANCE2;
    const clefs = stave.getModifiers(undefined, "Clef");
    const clef = clefs[clefs.length - 1];
    if (clef) {
      setClefGlyph(clef, glyph);
      scaleClefGlyph(clef, scale * ratio);
    }
  }
  resizeTabClef(stave, tabLines) {
    if (tabLines === 6) {
      return;
    }
    const [tabClef] = stave.getModifiers(undefined, "Clef");
    if (tabClef) {
      tabClef.fontInfo.size *= (tabLines - 1) / 5;
      tabClef.line = (tabLines - 1) / 2;
    }
  }
}

// whole-layout-plan.ts
class WholeLayoutPlan {
  layout;
  systemCount;
  constructor(layout) {
    this.layout = layout;
    this.systemCount = layout.boxes.reduce((n, b) => b ? Math.max(n, b.systemIndex + 1) : n, 0) || 1;
  }
  placedSystems() {
    return this.systemCount;
  }
  isComplete() {
    return true;
  }
  placeThrough() {}
  complete() {
    return this.layout;
  }
  forecast() {
    return {
      boxes: this.layout.boxes,
      systemCount: this.systemCount,
      version: 0
    };
  }
  systemOfMeasure(m) {
    const { boxes } = this.layout;
    for (let i = Math.min(m, boxes.length - 1);i >= 0; i--) {
      const box = boxes[i];
      if (box) {
        return box.systemIndex;
      }
    }
    return 0;
  }
}

// layout-planner.ts
class LayoutPlanner {
  translator;
  tab;
  signatures;
  staves;
  reader;
  configuredGaps;
  constructor(translator, tab, signatures, staves, reader, configuredGaps) {
    this.translator = translator;
    this.tab = tab;
    this.signatures = signatures;
    this.staves = staves;
    this.reader = reader;
    this.configuredGaps = configuredGaps;
  }
  noteLogWidth(ticks, noteSpacing) {
    if (ticks <= 0) {
      return 0;
    }
    const factor = 1 + LOG_SPACING_RATIO * Math.log2(ticks / QUARTER_NOTE_TICKS);
    return noteSpacing * Math.max(MIN_LOG_FACTOR, factor);
  }
  graceWidthOf(t) {
    const group = this.translator.findModifier(t, GraceNoteGroup.CATEGORY);
    return group ? group.getWidth() + GRACE_SPACING : 0;
  }
  measureNoteArea(staves, opts) {
    const { floor, noteSpacing, softmaxFactor } = opts;
    let minNotes = 0;
    let logWidth = 0;
    for (const {
      voices,
      clef,
      meterFloor,
      isTab,
      tuning,
      barlines,
      midClefs
    } of staves) {
      const endBeat = Math.max(this.reader.endBeatOf(voices), meterFloor);
      const perVoice = voices.map((voice, voiceIndex) => isTab ? this.tab.tickables(voice.chords, tuning) : this.translator.tickables(voice.chords, clef, {
        endBeat,
        run: voice.run,
        barlines: voiceIndex === 0 ? barlines : [],
        midClefs,
        drawMidClefs: voiceIndex === 0
      }));
      const vexVoices = perVoice.map((tickables) => this.translator.softVoice(tickables, softmaxFactor));
      if (vexVoices.length === 0) {
        continue;
      }
      minNotes = Math.max(minNotes, this.minNoteWidth(vexVoices, softmaxFactor));
      minNotes = Math.max(minNotes, Math.max(0, ...voices.map((v) => this.tupletGroupCount(v.chords))) * TUPLET_MIN_GROUP_WIDTH);
      if (isTab) {
        const noteCount = Math.max(0, ...perVoice.map((t) => t.length));
        minNotes = Math.max(minNotes, noteCount * TAB_MIN_NOTE_SPACING);
      }
      for (const tickables of perVoice) {
        let w = 0;
        for (const t of tickables) {
          w += this.noteLogWidth(t.getTicks().value(), noteSpacing) + this.graceWidthOf(t);
        }
        logWidth = Math.max(logWidth, w);
      }
    }
    const min = Math.max(floor, minNotes);
    return { min, ideal: Math.max(min, logWidth) };
  }
  estimateNoteArea(staves, floor, noteSpacing) {
    let logWidth = 0;
    for (const { voices, meterFloor, isTab } of staves) {
      const endBeat = Math.max(this.reader.endBeatOf(voices), meterFloor);
      for (const voice of voices) {
        let w = 0;
        let last = 0;
        let count = 0;
        for (const chord of voice.chords) {
          if (chord.lead.isGrace) {
            w += GRACE_SPACING;
            continue;
          }
          const beat = this.reader.measureBeatOf(chord.lead) ?? 0;
          const beats = this.reader.beatsOf(chord.lead) ?? 0;
          w += this.noteLogWidth(beats * QUARTER_NOTE_TICKS, noteSpacing);
          last = Math.max(last, beat + beats);
          count++;
        }
        if (endBeat > last + EPSILON) {
          w += this.noteLogWidth((endBeat - last) * QUARTER_NOTE_TICKS, noteSpacing);
        }
        if (isTab) {
          w = Math.max(w, count * TAB_MIN_NOTE_SPACING);
        }
        logWidth = Math.max(logWidth, w);
      }
    }
    return { min: floor, ideal: Math.max(floor, logWidth) };
  }
  tupletGroupCount(chords) {
    let open = 0;
    let groups = 0;
    for (const chord of chords) {
      for (const tuplet of chord.lead.tuplets) {
        if (tuplet.tupletType === "start") {
          if (open === 0) {
            groups++;
          }
          open++;
        } else if (tuplet.tupletType === "stop" && open > 0) {
          open--;
        }
      }
    }
    return groups;
  }
  minNoteWidth(voices, softmaxFactor) {
    const formatter = new Formatter({ softmaxFactor }).joinVoices(voices);
    formatter.preCalculateMinTotalWidth(voices);
    const contexts = formatter.getTickContexts();
    const ticks = contexts?.list ?? [];
    let unaligned = 0;
    for (const tick of ticks) {
      if ((contexts?.map[tick]?.getTickables().length ?? 0) < voices.length) {
        unaligned += 1;
      }
    }
    const spread = (values) => {
      if (values.length === 0) {
        return 0;
      }
      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
      return mean > 0 ? Math.sqrt(variance) / mean : 0;
    };
    const seen = voices.map((voice) => voice.getTickables().filter((t) => !(t instanceof GhostNote2)));
    const widths = seen.flat().map((t) => t.getMetrics().width);
    const durations = Math.max(0, ...seen.map((ts) => spread(ts.map((t) => t.getTicks().value()))));
    const padding = Metrics.get("Stave.unalignedNotePadding");
    return formatter.getMinTotalWidth() + Math.max(unaligned * padding, Math.max(spread(widths), durations) * ticks.length * padding);
  }
  gapLabelWidth(gap) {
    if (!gap.label) {
      return 0;
    }
    const fontSize = gap.style?.fontSize ?? GAP_LABEL_FONT_SIZE;
    return gap.label.length * LABEL_CHAR_WIDTH * (fontSize / LABEL_FONT_SIZE) + 2 * LABEL_GAP;
  }
  trailingWordsPad(measures, noteSpacing) {
    const words = measures.flatMap((measure) => this.reader.wordsOf(measure));
    if (words.length === 0) {
      return 0;
    }
    let lastOnset = 0;
    for (const measure of measures) {
      for (const voice of this.reader.voicesOf(measure)) {
        for (const chord of voice.chords) {
          lastOnset = Math.max(lastOnset, this.reader.measureBeatOf(chord.lead) ?? 0);
        }
      }
    }
    let pad = 0;
    for (const { text, lead, format } of words) {
      if (!lead || (this.reader.measureBeatOf(lead) ?? 0) + EPSILON < lastOnset) {
        continue;
      }
      const room = this.noteLogWidth((this.reader.beatsOf(lead) ?? 0) * QUARTER_NOTE_TICKS, noteSpacing);
      pad = Math.max(pad, text.length * WORDS_CHAR_WIDTH * format.scale - room);
    }
    return Math.max(0, pad);
  }
  leadingWordsPad(parts, m) {
    const words = parts.flatMap((part) => {
      const measure = part.measures[m];
      return measure ? this.reader.wordsOf(measure).map((w) => ({ part, ...w })) : [];
    });
    if (words.length === 0) {
      return 0;
    }
    let firstOnset = Number.POSITIVE_INFINITY;
    for (const part of parts) {
      const measure = part.measures[m];
      for (const voice of measure ? this.reader.voicesOf(measure) : []) {
        for (const chord of voice.chords) {
          firstOnset = Math.min(firstOnset, this.reader.measureBeatOf(chord.lead) ?? 0);
        }
      }
    }
    let pad = 0;
    for (const { part, text, staffNumber, lead, closesBar, format } of words) {
      if (closesBar || lead && (this.reader.measureBeatOf(lead) ?? 0) > firstOnset + EPSILON) {
        continue;
      }
      if (!this.staves.isTab(part, staffNumber)) {
        continue;
      }
      pad = Math.max(pad, text.length * WORDS_CHAR_WIDTH * format.scale / 2);
    }
    return pad;
  }
  pageOf(config, documentPage) {
    const layout = config.layout;
    if (layout.type !== "paged") {
      return null;
    }
    if (documentPage) {
      return {
        width: documentPage.width,
        height: documentPage.height ?? layout.pageHeight,
        marginTop: documentPage.margins.top,
        marginBottom: documentPage.margins.bottom,
        offsetX: 0,
        evenShift: documentPage.evenShift
      };
    }
    return {
      width: layout.pageWidth,
      height: layout.pageHeight,
      marginTop: layout.margin,
      marginBottom: layout.margin,
      offsetX: layout.margin - PAGE_MARGIN_X,
      evenShift: 0
    };
  }
  flowOf(config, page, documentPage) {
    const layout = config.layout;
    if (layout.type === "paged") {
      return {
        type: "standard",
        referenceWidth: page ? page.width - 2 * page.offsetX : 0,
        honorSystemBreaks: layout.honorSystemBreaks,
        documentLayout: layout.documentLayout,
        overflow: layout.overflow
      };
    }
    if (documentPage && layout.type === "standard") {
      return { ...layout, referenceWidth: documentPage.width };
    }
    return layout;
  }
  documentSystems(parts, systems, planned, document2, strict) {
    const factory = new StaveFactory(this.signatures, this.staves, this.reader);
    const rows = parts.flatMap((part, partIndex) => this.staves.visibleNumbers(part).map((staffNumber) => ({ part, partIndex, staffNumber })));
    return systems.map((measures) => {
      const first = measures[0] ?? 0;
      const lines = rows.map(({ part, staffNumber }) => {
        const measure = part.measures[first];
        if (!measure) {
          return null;
        }
        const { stave } = factory.create(part, measure, staffNumber, 0, 0, 0);
        return { top: stave.getYForLine(0), bottom: stave.getBottomLineY() };
      });
      const staveOffsets = [planned[0] ?? 0];
      const fixedGaps = [false];
      for (let r = 1;r < rows.length; r++) {
        const row = rows[r];
        const above = lines[r - 1];
        const below = lines[r];
        const distance = row ? document2.staffDistance(first, row.partIndex, row.staffNumber) : null;
        const set = distance !== null && above !== null && below !== null;
        const gap = set && above && below ? above.bottom + (distance ?? 0) - below.top : (planned[r] ?? 0) - (planned[r - 1] ?? 0);
        staveOffsets.push((staveOffsets.at(-1) ?? 0) + gap);
        fixedGaps.push(strict && set);
      }
      return {
        staveOffsets,
        systemDistance: document2.systemDistance(first),
        topSystemDistance: document2.topSystemDistance(first),
        lineTop: lines[0]?.top ?? 0,
        startsPage: document2.startsPage(first),
        blankPages: document2.blankPages(first),
        page: document2.pageSize(first),
        strict,
        fixedGaps
      };
    });
  }
  plan(score, config) {
    return this.begin(score, config).complete();
  }
  begin(score, config) {
    const parts = score.parts;
    const mode = config.layout.type === "panoramic" ? "ignore" : config.layout.documentLayout;
    const document2 = mode === "ignore" ? null : this.reader.documentLayoutOf(score);
    const documentPage = config.layout.type === "standard" && config.layout.honorPageLayout === false ? null : document2?.page() ?? null;
    const appearance = mode === "ignore" ? Appearance.NONE : this.reader.appearanceOf(score);
    this.translator.useAppearance(appearance);
    this.signatures.useAppearance(appearance);
    const page = this.pageOf(config, documentPage);
    const layout = this.flowOf(config, page, documentPage);
    const layoutMode = layout.type;
    let width = layout.type === "standard" ? layout.referenceWidth : DEFAULT_WIDTH;
    const overflow = layout.type === "standard" ? layout.overflow : "allow";
    const honorSystemBreaks = layout.type === "standard" && layout.honorSystemBreaks;
    const noteSpacing = config.noteSpacing;
    const softmaxFactor = config.softmaxFactor;
    const x = documentPage?.margins.left ?? PAGE_MARGIN_X;
    const right = documentPage && page ? documentPage.margins.right + documentPage.evenNarrowing : documentPage?.margins.right ?? PAGE_MARGIN_X;
    const gaps = this.configuredGaps.byMeasureIndex();
    const hasTopTempo = parts.some((part) => {
      const measure = part.measures.find((_, m) => !gaps.has(m));
      return measure && (this.reader.tempoOf(measure) || this.reader.modulationOf(measure));
    });
    const header = HeaderPlan.of(config, this.reader.headerOf(score));
    const y = (hasTopTempo ? PAGE_MARGIN_TOP_WITH_TEMPO : PAGE_MARGIN_TOP) + (header && header.height(width) > 0 ? header.height(width) + HEADER_GAP : 0);
    const measureCount = Math.max(1, ...parts.map((part) => part.measures.length));
    const totalStaves = parts.reduce((sum, part) => sum + this.staves.visibleNumbers(part).length, 0);
    const staveOffsets = [];
    let offset = 0;
    for (const part of parts) {
      const staves = this.staves.visibleNumbers(part);
      const intra = this.staves.symbolOf(part) ? INTRA_PART_SPACING : INTER_PART_SPACING;
      staves.forEach((_, s) => {
        staveOffsets.push(offset);
        offset += s === staves.length - 1 ? INTER_PART_SPACING : intra;
      });
    }
    const labelChars = config.showPartLabels ? Math.max(0, ...parts.map((part) => this.reader.partLabels(part).name?.length ?? 0)) : 0;
    const partLabelIndent = labelChars > 0 ? labelChars * LABEL_CHAR_WIDTH + LABEL_GAP : 0;
    const groupChars = config.showPartLabels ? Math.max(0, ...this.reader.partGroups(score).map((group) => group.name?.length ?? 0)) : 0;
    const labelIndent = partLabelIndent + (groupChars > 0 ? groupChars * LABEL_CHAR_WIDTH + LABEL_GAP : 0);
    const abbreviationChars = config.showPartLabels ? Math.max(0, ...parts.map((part) => this.reader.partLabels(part).abbreviation?.length ?? 0)) : 0;
    const groupAbbreviationChars = config.showPartLabels ? Math.max(0, ...this.reader.partGroups(score).map((group) => group.abbreviation?.length ?? 0)) : 0;
    const abbreviationIndent = abbreviationChars > 0 ? abbreviationChars * LABEL_CHAR_WIDTH + LABEL_GAP : 0;
    const laterLabelIndent = abbreviationIndent + (groupAbbreviationChars > 0 ? groupAbbreviationChars * LABEL_CHAR_WIDTH + LABEL_GAP : 0);
    const indentOf = (systemIndex, first) => Math.max(systemIndex === 0 ? labelIndent : laterLabelIndent, document2?.systemMargins(first).left ?? 0);
    const rightIndentOf = (first) => document2?.systemMargins(first).right ?? 0;
    const usableOf = (systemIndex, first) => width - x - right - indentOf(systemIndex, first) - rightIndentOf(first);
    const music = Array.from({ length: measureCount }, (_, m) => m).filter((m) => !gaps.has(m));
    const firstMusic = music[0];
    const lastMusic = music[music.length - 1];
    const edgeOf = (m) => {
      if (firstMusic === undefined || lastMusic === undefined) {
        return null;
      }
      if (m < firstMusic) {
        return "leading";
      }
      return m > lastMusic ? "trailing" : null;
    };
    const isMusic = (m) => edgeOf(m) === null;
    const edgeWidthOf = (m) => {
      const gap = gaps.get(m);
      return gap ? Math.max(this.gapLabelWidth(gap), gap.minWidth ?? 0) : 0;
    };
    const systemOverhang = this.staves.systemOverhang(parts);
    const lastLeading = firstMusic === undefined ? -1 : firstMusic - 1;
    const edgeLeadOf = (m) => edgeWidthOf(m) + (m === lastLeading ? Math.max(0, systemOverhang - labelIndent) : 0);
    const _musicStartOf = (measures) => Math.max(0, measures.findIndex(isMusic));
    const _musicEndOf = (measures) => {
      const i = measures.findLastIndex(isMusic);
      return i === -1 ? measures.length - 1 : i;
    };
    const { leads: multiRestLeads, hidden: multiRestHidden } = this.reader.multiRestsOf(parts);
    const gapAreaOf = (gap) => {
      const min = Math.max(BASE_VOICE_WIDTH, this.gapLabelWidth(gap));
      return { min, ideal: Math.max(min, gap.minWidth ?? 0) };
    };
    const staveSpecsOf = (m) => {
      const staves = [];
      for (const part of parts) {
        const measure = part.measures[m];
        if (!measure) {
          continue;
        }
        for (const staffNumber of this.staves.visibleNumbers(part)) {
          const clef = measure.getClef(staffNumber);
          const voices = this.reader.staffVoices(measure, staffNumber);
          if (voices.length > 0) {
            staves.push({
              voices,
              clef: clef ? this.signatures.clefName(clef) : "treble",
              meterFloor: this.reader.meterFloor(measure, staffNumber),
              isTab: this.staves.isTab(part, staffNumber),
              tuning: this.staves.tuningOf(part, staffNumber),
              barlines: this.reader.midBarlinesOf(measure),
              midClefs: this.signatures.midClefSpecs(this.reader.midClefsOf(measure, staffNumber))
            });
          }
        }
      }
      return staves;
    };
    const floorOf = (m) => multiRestLeads.has(m) ? MULTI_REST_MIN_WIDTH : BASE_VOICE_WIDTH;
    const perMeasure = (read) => {
      const values = new Map;
      return (m) => {
        if (!values.has(m)) {
          values.set(m, read(m));
        }
        return values.get(m);
      };
    };
    const memoized = (measure) => {
      const areas = new Map;
      return (m) => {
        let area = areas.get(m);
        if (!area) {
          const gap = gaps.get(m);
          if (!isMusic(m)) {
            area = { min: 0, ideal: 0 };
          } else if (gap) {
            area = gapAreaOf(gap);
          } else {
            area = measure(m);
          }
          areas.set(m, area);
        }
        return area;
      };
    };
    const measuredAreaOf = memoized((m) => this.measureNoteArea(staveSpecsOf(m), {
      floor: floorOf(m),
      noteSpacing,
      softmaxFactor
    }));
    const estimateOf = memoized((m) => this.estimateNoteArea(staveSpecsOf(m), floorOf(m), noteSpacing));
    const documentWidthOf = perMeasure((m) => {
      const widths = mode === "ignore" || gaps.has(m) ? [] : parts.flatMap((part) => {
        const measure = part.measures[m];
        const width = measure ? this.reader.measureWidthOf(measure) : null;
        return width === null ? [] : [width];
      });
      return widths.length === 0 ? null : Math.max(...widths);
    });
    const areaOf = (m, systemStart = false) => {
      const area = measuredAreaOf(m);
      const documentWidth = documentWidthOf(m);
      if (documentWidth === null) {
        return area;
      }
      const requested = documentWidth - leadOf(m, systemStart);
      const width = mode === "strict" ? requested : Math.max(area.min, requested);
      return { min: width, ideal: width, fixed: true };
    };
    const pads = Array.from({ length: measureCount }, (_, m) => gaps.has(m) ? 0 : this.trailingWordsPad(parts.flatMap((part) => part.measures[m] ?? []), noteSpacing));
    const padOf = (m) => pads[m] ?? 0;
    const leadingPads = Array.from({ length: measureCount }, (_, m) => gaps.has(m) ? 0 : this.leadingWordsPad(parts, m));
    const leadFull = perMeasure((m) => {
      const hasKey = parts.some((part) => this.staves.visibleNumbers(part).some((staffNumber) => this.reader.keyIdentity(part.measures[m]?.getKey(staffNumber) ?? null) !== null));
      return LEAD_BARLINE + LEAD_CLEF + (hasKey ? LEAD_KEY : 0) + (m === (firstMusic ?? 0) ? LEAD_TIME : 0);
    });
    const clefChangesAt = perMeasure((m) => m > 0 && parts.some((part) => this.staves.visibleNumbers(part).some((staffNumber) => !this.staves.isTab(part, staffNumber) && this.signatures.vexflowClefSpec(part.measures[m]?.getClef(staffNumber) ?? null) !== this.signatures.vexflowClefSpec(this.reader.clefAtEndOf(part.measures[m - 1], staffNumber)))));
    const leadGlyphs = (m, systemStart) => systemStart ? leadFull(m) : LEAD_BARLINE + (clefChangesAt(m) ? LEAD_CLEF_CHANGE : 0);
    const leadingPadOf = (m, systemStart) => Math.max(0, (leadingPads[m] ?? 0) - leadGlyphs(m, systemStart));
    const leadOf = (m, systemStart) => isMusic(m) ? leadGlyphs(m, systemStart) + padOf(m) + leadingPadOf(m, systemStart) : edgeLeadOf(m);
    const spanOf = (measures) => measures.reduce((sum, m, i) => sum + leadOf(m, i === Math.max(0, measures.findIndex(isMusic))) + areaOf(m, i === Math.max(0, measures.findIndex(isMusic))).ideal, 0);
    const rules = {
      layoutMode,
      overflow,
      strict: mode === "strict",
      maxSystemFill: config.maxSystemFill,
      minLastSystemFill: config.minLastSystemFill,
      stretchSingleSystem: config.stretchSingleSystem,
      get width() {
        return width;
      },
      measureCount,
      hidden: multiRestHidden,
      left: x,
      right,
      lastLeading,
      labelIndent,
      systemOverhang,
      base: {
        measureCount,
        totalStaves,
        staveOffsets,
        top: y,
        systemGap: config.systemSpacing,
        appearance,
        page,
        floorHeight: y + offset + PAGE_MARGIN_BOTTOM,
        softmaxFactor,
        labelIndent,
        partLabelIndent,
        laterLabelIndent,
        abbreviationIndent
      },
      printOf: perMeasure((m) => {
        const print = parts.map((part) => part.measures[m]?.print);
        return {
          forcedBreak: honorSystemBreaks && print.some((p) => p?.newSystem || p?.newPage),
          keepsLine: honorSystemBreaks && print.some((p) => p?.systemBreak === "no")
        };
      }),
      isMusic,
      edgeOf,
      edgeWidthOf,
      areaOf,
      estimateOf,
      leadOf,
      padOf,
      leadingPadOf,
      indentOf,
      rightIndentOf,
      usableOf
    };
    if (layoutMode !== "panoramic" && overflow !== "widen" && !document2) {
      return new LazyLayoutPlan(rules);
    }
    let plan = new LazyLayoutPlan(rules);
    plan.complete();
    if (overflow === "widen") {
      for (let pass = 0;pass < 4; pass++) {
        const needed = Math.max(width, ...plan.systemMeasures().map((measures, systemIndex) => spanOf(measures) + x + right + indentOf(systemIndex, measures[0] ?? 0) + rightIndentOf(measures[0] ?? 0)));
        if (needed <= width) {
          break;
        }
        width = needed;
        plan = new LazyLayoutPlan(rules);
        plan.complete();
      }
    }
    const planned = plan.complete();
    if (document2) {
      const documentSystems = this.documentSystems(parts, plan.systemMeasures(), staveOffsets, document2, mode === "strict");
      planned.systemStaveOffsets = new Map(documentSystems.map((system, s) => [s, system.staveOffsets]));
      planned.documentSystems = documentSystems.map(({ staveOffsets: _, ...system }) => system);
      const lastPlanned = staveOffsets.at(-1) ?? 0;
      const deepest = Math.max(lastPlanned, ...documentSystems.map((system) => system.staveOffsets.at(-1) ?? 0));
      planned.floorHeight = y + offset + (deepest - lastPlanned) + PAGE_MARGIN_BOTTOM;
    }
    return new WholeLayoutPlan(planned);
  }
}

// notation-translator.ts
import {
  Score
} from "@stringsync/mdom";
import {
  Modifier as Modifier6,
  Ornament,
  Stroke as Stroke3,
  Tremolo
} from "vexflow/core";

// fermata-glyphs.ts
var NORMAL_FERMATA_GLYPHS = [
  "",
  ""
];
var FERMATA_GLYPHS = {
  normal: NORMAL_FERMATA_GLYPHS,
  angled: ["", ""],
  square: ["", ""],
  "double-angled": ["", ""],
  "double-square": ["", ""],
  "double-dot": ["", ""],
  "half-curve": ["", ""],
  curlew: ["", ""]
};

// technical-annotation.ts
import { Annotation as Annotation2, Modifier as Modifier3 } from "vexflow/core";

class TechnicalAnnotation extends Annotation2 {
  below;
  kind = "technical";
  baselineY = 0;
  constructor(text, below) {
    super(text);
    this.below = below;
    this.setVerticalJustification(below ? Annotation2.VerticalJustify.BOTTOM : Annotation2.VerticalJustify.TOP);
  }
  setBaselineY(y) {
    this.baselineY = y;
  }
  textBaselineY() {
    return this.baselineY;
  }
  draw() {
    const ctx = this.checkContext();
    const note = this.checkAttachedNote();
    this.setRendered();
    const start = note.getModifierStartXY(Modifier3.Position.ABOVE, this.index);
    this.x = start.x - this.getWidth() / 2;
    this.y = this.textBaselineY();
    this.renderText(ctx, 0, 0);
  }
}

// fingering-annotation.ts
class FingeringAnnotation extends TechnicalAnnotation {
  constructor(text, below) {
    super(text, below);
    this.setFontSize(FINGERING_FONT_SIZE);
  }
  rowHeight() {
    return FINGERING_FONT_SIZE + TECHNICAL_ROW_GAP;
  }
}

// footnote-annotation.ts
class FootnoteAnnotation extends TechnicalAnnotation {
  constructor(text) {
    super(text, false);
    this.setFontSize(FINGERING_FONT_SIZE);
  }
  rowHeight() {
    return FINGERING_FONT_SIZE + TECHNICAL_ROW_GAP;
  }
}

// lyric-annotation.ts
import { Annotation as Annotation3 } from "vexflow/core";
class LyricAnnotation extends Annotation3 {
  verseIndex;
  extend;
  kind = "lyric";
  textSize;
  justify;
  hyphenated;
  documentPosition;
  baselineY = 0;
  positionX = 0;
  constructor(text, verseIndex, extend, opts = {}) {
    super(text);
    this.verseIndex = verseIndex;
    this.extend = extend;
    const { family, scale = 1 } = opts;
    this.justify = opts.justify ?? "center";
    this.hyphenated = opts.hyphenated ?? false;
    this.documentPosition = opts.documentPosition ?? null;
    this.setVerticalJustification(Annotation3.VerticalJustify.BOTTOM);
    this.textSize = LYRIC_FONT_SIZE * scale;
    if (family) {
      this.setFont(family, this.textSize);
    } else {
      this.setFontSize(this.textSize);
    }
  }
  setPositionX(x) {
    this.positionX = x;
  }
  setBaselineY(y) {
    this.baselineY = y;
  }
  shiftVerses(rows) {
    this.verseIndex += rows;
  }
  getWidth() {
    return super.getWidth() + 2 * LYRIC_PADDING;
  }
  boxLeft(noteheadBeginX, noteheadEndX) {
    const w = this.getWidth();
    switch (this.justify) {
      case "left":
        return noteheadBeginX - LYRIC_PADDING + this.positionX;
      case "right":
        return noteheadEndX + LYRIC_PADDING - w + this.positionX;
      default:
        return (noteheadBeginX + noteheadEndX) / 2 - w / 2 + this.positionX;
    }
  }
  drawHyphen(ctx, x) {
    ctx.save();
    ctx.setFont(this.fontInfo);
    ctx.fillText("-", x - ctx.measureText("-").width / 2, this.baselineY);
    ctx.restore();
  }
  draw() {
    const ctx = this.checkContext();
    const note = this.checkAttachedNote();
    this.setRendered();
    this.x = this.boxLeft(note.getNoteHeadBeginX(), note.getNoteHeadEndX());
    this.y = this.baselineY;
    this.renderText(ctx, 0, 0);
  }
}

// non-arpeggio-bracket.ts
import { Stroke } from "vexflow/core";

class NonArpeggioBracket extends Stroke {
  lowIndex;
  highIndex;
  constructor(lowIndex, highIndex) {
    super(Stroke.Type.ARPEGGIO_DIRECTIONLESS);
    this.lowIndex = lowIndex;
    this.highIndex = highIndex;
  }
  draw() {
    const ctx = this.checkContext();
    const note = this.checkAttachedNote();
    this.setRendered();
    const ys = note.getYs().slice(this.lowIndex, this.highIndex + 1).filter((y) => Number.isFinite(y));
    if (ys.length === 0) {
      return;
    }
    const lineSpace = note.checkStave().getSpacingBetweenLines();
    const top = Math.min(...ys) - lineSpace / 2;
    const bottom = Math.max(...ys) + lineSpace / 2;
    const x = note.getModifierStartXY(this.position, this.index).x - 5 + this.xShift;
    const hook = lineSpace * 0.6;
    ctx.fillRect(x, top, NON_ARPEGGIATE_THICKNESS, bottom - top);
    ctx.fillRect(x, top, hook, NON_ARPEGGIATE_THICKNESS);
    ctx.fillRect(x, bottom - NON_ARPEGGIATE_THICKNESS, hook, NON_ARPEGGIATE_THICKNESS);
  }
}
var NON_ARPEGGIATE_THICKNESS = 1.5;

// notehead-articulation.ts
import { Modifier as Modifier5, Stem as Stem3 } from "vexflow/core";

// stave-articulation.ts
import {
  Articulation,
  getBottomY,
  getInitialOffset,
  Modifier as Modifier4,
  Stem as Stem2
} from "vexflow/core";

class StaveArticulation extends Articulation {
  draw() {
    const note = this.checkAttachedNote();
    const onStemTip = this.position === (note.getStemDirection() === Stem2.UP ? Modifier4.Position.ABOVE : Modifier4.Position.BELOW);
    if (!note.hasBeam() || !onStemTip) {
      super.draw();
      return;
    }
    const line = this.textLine;
    this.setTextLine(line + 1);
    super.draw();
    this.setTextLine(line);
  }
  belowBottomY() {
    const note = this.checkAttachedNote();
    const stave = note.checkStave();
    const space = stave.getSpacingBetweenLines();
    const onStemTip = note.getStemDirection() === Stem2.DOWN;
    const line = this.textLine + (note.hasBeam() && onStemTip ? 1 : 0);
    const y = getBottomY(note, line) + (line + getInitialOffset(note, Modifier4.Position.BELOW)) * space;
    return Math.max(stave.getYForBottomText(Articulation.INITIAL_OFFSET), y) + space;
  }
}

// notehead-articulation.ts
class NoteheadArticulation extends StaveArticulation {
  codes;
  constructor(code) {
    const codes = typeof code === "string" ? [code, code] : code;
    super(codes[0]);
    this.codes = codes;
  }
  setSide(staveNote, side = "notehead") {
    const stemUp = staveNote.getStemDirection() === Stem3.UP;
    const above = side === "stem" ? stemUp : !stemUp;
    this.setPosition(above ? Modifier5.Position.ABOVE : Modifier5.Position.BELOW);
    const [aboveGlyph, belowGlyph] = this.codes;
    if (aboveGlyph !== belowGlyph) {
      this.setText(above ? aboveGlyph : belowGlyph);
    }
    return this;
  }
}

// string-number-annotation.ts
class StringNumberAnnotation extends TechnicalAnnotation {
  constructor(number, below) {
    super(number, below);
    this.setFontSize(STRING_NUMBER_FONT_SIZE);
  }
  rowHeight() {
    return 2 * STRING_NUMBER_RADIUS + TECHNICAL_ROW_GAP;
  }
  ringCenterY() {
    return this.baselineY - STRING_NUMBER_RADIUS;
  }
  textBaselineY() {
    return this.ringCenterY() + STRING_NUMBER_DIGIT_RISE;
  }
  draw() {
    super.draw();
    const ctx = this.checkContext();
    ctx.beginPath();
    ctx.arc(this.getX() + this.getWidth() / 2, this.ringCenterY(), STRING_NUMBER_RADIUS, 0, 2 * Math.PI, false);
    ctx.setLineWidth(STRING_NUMBER_RING_WIDTH);
    ctx.stroke();
  }
}

// unbroken-arpeggio.ts
import { Stroke as Stroke2 } from "vexflow/core";

class UnbrokenArpeggio extends Stroke2 {
  below = [];
  drawsLine = true;
  join(lower, lowerNote) {
    lower.drawsLine = false;
    this.below.push(lowerNote);
  }
  draw() {
    if (!this.drawsLine) {
      this.setRendered();
      return;
    }
    if (this.below.length === 0) {
      super.draw();
      return;
    }
    const note = this.checkAttachedNote();
    const getYs = note.getYs.bind(note);
    const ys = [...getYs(), ...this.below.flatMap((n) => n.getYs())];
    note.getYs = () => ys;
    try {
      super.draw();
    } finally {
      note.getYs = getYs;
    }
  }
}

// notation-translator.ts
class NotationTranslator {
  reader;
  opts;
  lyricFonts = new WeakMap;
  constructor(reader, opts = {}) {
    this.reader = reader;
    this.opts = opts;
  }
  attach(staveNote, chord) {
    const lead = chord.lead;
    if (!this.hidesNotations(lead)) {
      this.addArticulations(staveNote, lead);
      this.addTechnicals(staveNote, chord);
      this.addOrnaments(staveNote, lead);
      this.addFermata(staveNote, lead);
      this.addArpeggio(staveNote, lead);
      this.addNonArpeggiate(staveNote, chord);
      this.addOtherNotations(staveNote, lead);
    }
    const footnote = lead.child("footnote")?.text?.trim();
    if (footnote) {
      staveNote.addModifier(new FootnoteAnnotation(footnote), 0);
    }
    if (lead.getAttribute("print-lyric") !== "no") {
      this.addLyrics(staveNote, lead);
    }
  }
  attachRest(staveNote, chord) {
    if (!this.hidesNotations(chord.lead)) {
      this.addFermata(staveNote, chord.lead);
    }
  }
  hidesNotations(note) {
    const groups = note.childrenNamed("notations");
    return groups.length > 0 && groups.every((group) => group.getAttribute("print-object") === "no");
  }
  addArticulations(staveNote, note) {
    for (const name of note.articulations) {
      const brush = BRUSH_ORNAMENTS[name];
      if (brush) {
        const ornament = new Ornament(brush.type);
        if (brush.glyph) {
          ornament.setText(brush.glyph);
        }
        staveNote.addModifier(ornament);
        continue;
      }
      const measureMark = MEASURE_MARK_GLYPHS[name];
      if (measureMark) {
        staveNote.addModifier(new StaveArticulation(measureMark).setPosition(Modifier6.Position.ABOVE));
        continue;
      }
      const code = ARTICULATION_CODES[name];
      if (code) {
        staveNote.addModifier(new NoteheadArticulation(code).setSide(staveNote));
      }
    }
    for (const other of notationMarks(note, "articulations", "other-articulation")) {
      const glyph = smuflGlyph(other.getAttribute("smufl"));
      if (glyph) {
        staveNote.addModifier(new NoteheadArticulation(mirroredPair(other.getAttribute("smufl") ?? "") ?? glyph).setSide(staveNote));
        continue;
      }
      this.addTextMark(staveNote, other);
    }
  }
  addTextMark(staveNote, mark) {
    const text = mark.text?.trim();
    if (text) {
      staveNote.addModifier(new FingeringAnnotation(text, mark.getAttribute("placement") === "below"), 0);
    }
  }
  addOtherNotations(staveNote, note) {
    const marks = note.childrenNamed("notations").flatMap((notations) => notations.childrenNamed("other-notation"));
    for (const mark of marks) {
      if (mark.getAttribute("type") === "stop") {
        continue;
      }
      const glyph = smuflGlyph(mark.getAttribute("smufl"));
      if (!glyph) {
        this.addTextMark(staveNote, mark);
        continue;
      }
      staveNote.addModifier(new StaveArticulation(glyph).setPosition(mark.getAttribute("placement") === "below" ? Modifier6.Position.BELOW : Modifier6.Position.ABOVE));
    }
  }
  addOrnaments(staveNote, note) {
    let last;
    let accidentalMarks = 0;
    for (const ornament of this.reader.ornamentsOf(note)) {
      if (ornament.ornamentType === "accidental-mark") {
        const code = ACCIDENTAL_CODES[ornament.accidentalMark ?? ""];
        if (last && code) {
          if (accidentalMarks === 0) {
            last.setUpperAccidental(code);
          } else {
            last.setLowerAccidental(code);
          }
          accidentalMarks++;
        }
        continue;
      }
      if (ornament.ornamentType === "tremolo") {
        if (ornament.tremoloType === "start" || ornament.tremoloType === "stop") {
          continue;
        }
        staveNote.addModifier(new Tremolo(ornament.tremoloMarks || 1));
        continue;
      }
      if (ornament.ornamentType === "other-ornament" && !smuflGlyph(ornament.getAttribute("smufl"))) {
        this.addTextMark(staveNote, ornament);
        continue;
      }
      const type = ornamentGlyph(ornament);
      if (!type) {
        continue;
      }
      last = new Ornament(type);
      accidentalMarks = 0;
      if (ornament.ornamentType.startsWith("delayed-")) {
        last.setDelayed(true);
      }
      staveNote.addModifier(last);
    }
  }
  fingeringLabel(marks) {
    let label = "";
    for (const mark of marks) {
      const text = mark.text?.trim();
      if (!text) {
        continue;
      }
      if (mark.alternate) {
        label += `(${text})`;
      } else if (label && mark.substitution) {
        label += `-${text}`;
      } else {
        label += label ? ` ${text}` : text;
      }
    }
    return label;
  }
  addTechnicals(staveNote, chord) {
    const strings = [];
    const fingerings = [];
    chord.notes.forEach((note, index) => {
      const labels = [];
      let below = false;
      for (const mark of this.reader.technicalsOf(note)) {
        if (mark.placement === "below") {
          below = true;
        }
        if (mark.technicalType === "fingering" || mark.technicalType === "pluck" || mark.technicalType === "tap" && mark.text?.trim()) {
          labels.push(mark);
          continue;
        }
        if (mark.technicalType === "string") {
          const number = mark.text?.trim();
          if (number) {
            strings.push({ index, number, below: mark.placement === "below" });
          }
          continue;
        }
        const code = technicalCode(mark);
        if (code) {
          staveNote.addModifier(new StaveArticulation(code).setPosition(mark.placement === "below" ? Modifier6.Position.BELOW : Modifier6.Position.ABOVE), index);
        }
      }
      for (const open of notationMarks(note, "technical", "open")) {
        staveNote.addModifier(new StaveArticulation(smuflGlyph(open.getAttribute("smufl")) ?? "").setPosition(open.getAttribute("placement") === "below" ? Modifier6.Position.BELOW : Modifier6.Position.ABOVE), index);
      }
      const text = this.fingeringLabel(labels);
      if (text) {
        fingerings.push({ index, text, below });
      }
    });
    for (const side of [false, true]) {
      const column = fingerings.filter((f) => f.below === side);
      if (side) {
        column.reverse();
      }
      for (const { index, text } of column) {
        staveNote.addModifier(new FingeringAnnotation(text, side), index);
      }
    }
    for (const { index, number, below } of strings) {
      staveNote.addModifier(new StringNumberAnnotation(number, below), index);
    }
  }
  addFermata(staveNote, note) {
    const fermata = note.fermata;
    if (!fermata) {
      return;
    }
    const inverted = fermata === "inverted";
    const shape = note.childrenNamed("notations").flatMap((notations) => notations.childrenNamed("fermata"))[0]?.text?.trim();
    const faces = FERMATA_SHAPES[shape ?? ""] ?? NORMAL_FERMATA;
    const articulation = new StaveArticulation(faces[inverted ? 1 : 0]);
    articulation.setPosition(inverted ? Modifier6.Position.BELOW : Modifier6.Position.ABOVE);
    staveNote.addModifier(articulation);
  }
  addArpeggio(staveNote, note) {
    const arpeggiate = note.arpeggiate;
    if (!arpeggiate) {
      return;
    }
    const direction = arpeggiate.direction;
    let type = Stroke3.Type.ARPEGGIO_DIRECTIONLESS;
    if (direction === "up") {
      type = Stroke3.Type.ROLL_DOWN;
    } else if (direction === "down") {
      type = Stroke3.Type.ROLL_UP;
    }
    const unbroken = note.child("notations")?.child("arpeggiate")?.getAttribute("unbroken") === "yes";
    staveNote.addModifier(unbroken ? new UnbrokenArpeggio(type) : new Stroke3(type), 0);
  }
  addNonArpeggiate(staveNote, chord) {
    const types = chord.notes.map((note) => note.nonArpeggiate);
    const bottom = types.indexOf("bottom");
    const top = types.lastIndexOf("top");
    if (bottom < 0 && top < 0) {
      return;
    }
    staveNote.addModifier(new NonArpeggioBracket(bottom < 0 ? 0 : bottom, top < 0 ? chord.notes.length - 1 : top), 0);
  }
  addLyrics(staveNote, lead) {
    const verses = [...this.reader.lyricsOf(lead)].sort((a, b) => Number(a.verse) - Number(b.verse));
    const lyricFont = lead.measure.part.score.child("defaults")?.child("lyric-font");
    verses.forEach((verse, index) => {
      const scale = fontScaleOf(verse.child("text")?.getAttribute("font-size") ?? null, lyricFont?.getAttribute("font-size") ?? null);
      const syllabic = verse.syllabic;
      const hyphenated = syllabic === "begin" || syllabic === "middle";
      const text = (this.syllableOf(verse) || this.soundOf(verse)) + (hyphenated ? "-" : "");
      if (text) {
        staveNote.addModifier(new LyricAnnotation(text, index, verse.extend, {
          family: this.lyricFaceOf(verse),
          justify: this.justifyOf(verse),
          scale,
          hyphenated,
          documentPosition: this.reader.positionOf(verse)
        }));
      }
    });
  }
  justifyOf(verse) {
    const justify = verse.getAttribute("justify");
    return justify === "left" || justify === "right" ? justify : "center";
  }
  lyricFaceOf(verse) {
    const { documentFonts } = this.opts;
    if (!documentFonts) {
      return;
    }
    const fonts = this.lyricFontsOf(verse);
    const number = verse.getAttribute("number");
    const name = verse.getAttribute("name");
    const font = fonts.find((f) => number !== null && f.getAttribute("number") === number || name !== null && f.getAttribute("name") === name) ?? fonts.find((f) => f.getAttribute("number") === null && f.getAttribute("name") === null);
    const family = verse.child("text")?.getAttribute("font-family") ?? font?.getAttribute("font-family") ?? null;
    return FontFamilies.documentStack(family, documentFonts.textFont);
  }
  lyricFontsOf(verse) {
    const score = verse.closest(Score);
    if (!score) {
      return [];
    }
    let fonts = this.lyricFonts.get(score);
    if (!fonts) {
      fonts = score.child("defaults")?.childrenNamed("lyric-font") ?? [];
      this.lyricFonts.set(score, fonts);
    }
    return fonts;
  }
  soundOf(verse) {
    if (verse.child("humming")) {
      return "mm";
    }
    return verse.child("laughing") ? "ha ha" : "";
  }
  syllableOf(verse) {
    return verse.runs.map((run) => run.text || (run.kind === "elision" ? " " : "")).join("");
  }
}
var ARTICULATION_CODES = {
  staccato: "a.",
  accent: "a>",
  tenuto: "a-",
  staccatissimo: "av",
  "strong-accent": "a^",
  "detached-legato": ["", ""],
  spiccato: ["", ""],
  "soft-accent": ["", ""],
  stress: ["", ""],
  unstress: ["", ""]
};
var NORMAL_FERMATA = ["a@a", "a@u"];
var FERMATA_SHAPES = {
  ...FERMATA_GLYPHS,
  normal: NORMAL_FERMATA
};
var MEASURE_MARK_GLYPHS = {
  "breath-mark": "",
  caesura: ""
};
var BRUSH_ORNAMENTS = {
  scoop: { type: "scoop" },
  plop: { type: "scoop", glyph: "" },
  doit: { type: "doit" },
  falloff: { type: "fall" }
};
var ORNAMENT_TYPES = {
  "trill-mark": "tr",
  turn: "turn",
  "delayed-turn": "turn",
  "inverted-turn": "",
  "delayed-inverted-turn": "",
  shake: "prallprall",
  mordent: "mordentInverted",
  "inverted-mordent": "mordent",
  schleifer: "",
  haydn: "",
  "vertical-turn": "",
  "inverted-vertical-turn": ""
};
var LONG_MORDENTS = {
  "mordent  ": "",
  "mordent above ": "",
  "inverted-mordent  ": "prallprall",
  "inverted-mordent above ": "",
  "inverted-mordent  below": ""
};
var MORDENT_APPROACHES = {
  "": "",
  above: "",
  below: ""
};
var MORDENT_ZIGZAG = "";
var MORDENT_STROKE = "";
var MORDENT_DEPARTURES = {
  "": "",
  above: "",
  below: ""
};
function composedMordent(type, approach, departure) {
  return (MORDENT_APPROACHES[approach] ?? "") + MORDENT_ZIGZAG + (type === "mordent" ? MORDENT_STROKE : "") + (MORDENT_DEPARTURES[departure] ?? MORDENT_DEPARTURES[""]);
}
var SLASHED_TURNS = new Set([
  "turn",
  "delayed-turn",
  "inverted-turn",
  "delayed-inverted-turn"
]);
var SLASHED_TURN = "";
var TECHNICAL_CODES = {
  "up-bow": "a|",
  "down-bow": "am",
  "open-string": "ah",
  "snap-pizzicato": "ao",
  stopped: "a+",
  "thumb-position": "",
  "double-tongue": "",
  "triple-tongue": "",
  heel: "",
  toe: "",
  fingernails: "",
  "brass-bend": "",
  flip: "",
  "half-muted": "",
  golpe: "",
  smear: ""
};
var HANDBELL_CODES = {
  belltree: "",
  damp: "",
  echo: "",
  gyro: "",
  "hand martellato": "",
  "mallet lift": "",
  "mallet table": "",
  martellato: "",
  "martellato lift": "",
  "muted martellato": "",
  "pluck lift": "",
  swing: ""
};
var ARROW_DIRECTIONS = {
  up: 0,
  northeast: 1,
  right: 2,
  southeast: 3,
  down: 4,
  southwest: 5,
  left: 6,
  northwest: 7
};
function technicalCode(mark) {
  switch (mark.technicalType) {
    case "hole":
      return holeCode(mark);
    case "harmon-mute":
      return harmonMuteCode(mark);
    case "arrow":
      return arrowCode(mark);
    case "handbell":
      return HANDBELL_CODES[mark.text?.trim() ?? ""];
    case "tap":
      return mark.getAttribute("hand") === "left" ? "" : "";
    case "harmonic":
      return mark.child("sounding-pitch") ? "ah" : undefined;
  }
  return TECHNICAL_CODES[mark.technicalType];
}
function holeCode(mark) {
  switch (mark.childrenNamed("hole-closed")[0]?.text?.trim()) {
    case "yes":
      return "";
    case "no":
      return "";
    case "half":
      return "";
  }
  return;
}
function harmonMuteCode(mark) {
  const closed = mark.childrenNamed("harmon-closed")[0];
  switch (closed?.text?.trim()) {
    case "yes":
      return "";
    case "no":
      return "";
    case "half":
      return closed?.getAttribute("location") === "right" ? "" : "";
  }
  return;
}
function arrowCode(mark) {
  const direction = ARROW_DIRECTIONS[mark.childrenNamed("arrow-direction")[0]?.text?.trim() ?? ""];
  if (direction === undefined) {
    return;
  }
  const style = mark.childrenNamed("arrow-style")[0]?.text?.trim();
  const head = mark.childrenNamed("arrowhead").length > 0;
  let base;
  if (style === "filled") {
    base = head ? 60280 : 60256;
  } else if (style === "hollow") {
    base = head ? 60288 : 60264;
  } else {
    base = head ? 60296 : 60272;
  }
  return String.fromCharCode(base + direction);
}
function ornamentGlyph(ornament) {
  const type = ornament.ornamentType;
  if (type === "other-ornament") {
    return smuflGlyph(ornament.getAttribute("smufl"));
  }
  if (ornament.getAttribute("slash") === "yes" && SLASHED_TURNS.has(type)) {
    return SLASHED_TURN;
  }
  if (type === "mordent" || type === "inverted-mordent") {
    const approach = ornament.getAttribute("approach") ?? "";
    const departure = ornament.getAttribute("departure") ?? "";
    if (ornament.getAttribute("long") === "yes" || approach || departure) {
      return LONG_MORDENTS[`${type} ${approach} ${departure}`] ?? composedMordent(type, approach, departure);
    }
  }
  return ORNAMENT_TYPES[type];
}
function notationMarks(note, group, tag) {
  return note.childrenNamed("notations").flatMap((notations) => notations.childrenNamed(group)).flatMap((block) => block.childrenNamed(tag));
}
function mirroredPair(name) {
  const match = /^(.*)(Above|Below)$/.exec(name);
  if (!match) {
    return;
  }
  const above = smuflGlyph(`${match[1]}Above`);
  const below = smuflGlyph(`${match[1]}Below`);
  return above && below ? [above, below] : undefined;
}

// probe-text-canvas.ts
import { Element as Element3 } from "vexflow/core";
class ProbeTextCanvas {
  probe;
  state = PaintState.INITIAL;
  constructor(probe) {
    this.probe = probe;
  }
  install() {
    Element3.setTextMeasurementCanvas(this);
  }
  getContext(_kind) {
    return this;
  }
  get font() {
    return String(this.state.props.font);
  }
  set font(font) {
    this.state = this.state.with("font", font);
  }
  measureText(text) {
    return this.probe.measureText(this.state, text);
  }
}

// paint-context.ts
class PaintContext {
  sink;
  probe;
  canvas;
  state = PaintState.INITIAL;
  stack = [];
  path = [];
  box = EMPTY_BOX;
  unbounded = false;
  constructor(sink, probe, canvas) {
    this.sink = sink;
    this.probe = probe;
    this.canvas = canvas;
  }
  getProp(prop) {
    return this.state.props[prop];
  }
  setProp(prop, value) {
    const current = this.state.props[prop];
    this.state = this.state.with(prop, Ink.isRole(value) ? value : this.probe.normalize(prop, value, current));
  }
  save() {
    this.stack.push(this.state);
  }
  restore() {
    this.state = this.stack.pop() ?? this.state;
  }
  mark() {
    return { state: this.state, stack: this.stack.length };
  }
  rewind(mark) {
    this.state = mark.state;
    this.stack.length = Math.min(this.stack.length, mark.stack);
    this.beginPath();
  }
  reset() {
    this.state = PaintState.INITIAL;
    this.stack.length = 0;
    this.beginPath();
    this.sink.reset();
  }
  isContextLost() {
    return false;
  }
  getContextAttributes() {
    return {
      alpha: true,
      colorSpace: "srgb",
      desynchronized: false,
      willReadFrequently: false
    };
  }
  scale(x, y) {
    this.transform(x, 0, 0, y, 0, 0);
  }
  rotate(angle) {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    this.transform(cos, sin, -sin, cos, 0, 0);
  }
  translate(x, y) {
    this.transform(1, 0, 0, 1, x, y);
  }
  transform(a, b, c, d, e, f) {
    if (!finite(a, b, c, d, e, f)) {
      return;
    }
    this.state = this.state.withMatrix(this.state.matrix.multiply(new Affine(a, b, c, d, e, f)));
  }
  setTransform(a, b, c, d, e, f) {
    const matrix = typeof a === "number" ? new Affine(a, b ?? 0, c ?? 0, d ?? 0, e ?? 0, f ?? 0) : fromInit(a ?? {});
    if (!finite(matrix.a, matrix.b, matrix.c, matrix.d, matrix.e, matrix.f)) {
      return;
    }
    this.state = this.state.withMatrix(matrix);
  }
  getTransform() {
    const m = this.state.matrix;
    if (typeof DOMMatrix === "undefined") {
      const { a, b, c, d, e, f } = m;
      return { a, b, c, d, e, f };
    }
    return new DOMMatrix([m.a, m.b, m.c, m.d, m.e, m.f]);
  }
  resetTransform() {
    this.state = this.state.withMatrix(Affine.IDENTITY);
  }
  setLineDash(segments) {
    if (segments.some((s) => !Number.isFinite(s) || s < 0)) {
      return;
    }
    const dash = segments.length % 2 ? [...segments, ...segments] : [...segments];
    this.state = this.state.withLineDash(dash);
  }
  getLineDash() {
    return [...this.state.lineDash];
  }
  beginPath() {
    this.path = [];
    this.box = EMPTY_BOX;
    this.unbounded = false;
  }
  closePath() {
    this.segment("closePath", []);
  }
  moveTo(x, y) {
    if (this.segment("moveTo", [x, y])) {
      this.extend(x, y, x, y);
    }
  }
  lineTo(x, y) {
    if (this.segment("lineTo", [x, y])) {
      this.extend(x, y, x, y);
    }
  }
  quadraticCurveTo(cpx, cpy, x, y) {
    if (this.segment("quadraticCurveTo", [cpx, cpy, x, y])) {
      this.extend(cpx, cpy, cpx, cpy);
      this.extend(x, y, x, y);
    }
  }
  bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x, y) {
    if (this.segment("bezierCurveTo", [cp1x, cp1y, cp2x, cp2y, x, y])) {
      this.extend(cp1x, cp1y, cp1x, cp1y);
      this.extend(cp2x, cp2y, cp2x, cp2y);
      this.extend(x, y, x, y);
    }
  }
  arc(x, y, radius, startAngle, endAngle, counterclockwise) {
    if (this.segment("arc", [
      x,
      y,
      radius,
      startAngle,
      endAngle,
      counterclockwise
    ])) {
      this.extend(x - radius, y - radius, x + radius, y + radius);
    }
  }
  arcTo(x1, y1, x2, y2, radius) {
    if (this.segment("arcTo", [x1, y1, x2, y2, radius])) {
      this.unbounded = true;
    }
  }
  ellipse(x, y, radiusX, radiusY, rotation, startAngle, endAngle, counterclockwise) {
    const args = [
      x,
      y,
      radiusX,
      radiusY,
      rotation,
      startAngle,
      endAngle,
      counterclockwise
    ];
    if (this.segment("ellipse", args)) {
      const r = Math.max(radiusX, radiusY);
      this.extend(x - r, y - r, x + r, y + r);
    }
  }
  rect(x, y, w, h) {
    if (this.segment("rect", [x, y, w, h])) {
      this.extend(x, y, x + w, y + h);
    }
  }
  roundRect(x, y, w, h, radii) {
    if (this.segment("roundRect", [x, y, w, h, radii])) {
      this.extend(x, y, x + w, y + h);
    }
  }
  fill(pathOrRule, fillRule) {
    if (isPath2D(pathOrRule)) {
      this.emit(null, { kind: "fill", path2d: pathOrRule, fillRule }, null);
      return;
    }
    const box = this.pathBox();
    if (box !== undefined) {
      this.emit(this.path.slice(), { kind: "fill", fillRule: pathOrRule }, box && this.reach(box, 0));
    }
  }
  stroke(path) {
    if (isPath2D(path)) {
      this.emit(null, { kind: "stroke", path2d: path }, null);
      return;
    }
    const box = this.pathBox();
    if (box !== undefined) {
      this.emit(this.path.slice(), { kind: "stroke" }, box && this.reach(box, this.strokeReach()));
    }
  }
  clip(pathOrRule, fillRule) {
    const clip = isPath2D(pathOrRule) ? {
      path: pathOrRule,
      matrix: this.state.matrix,
      fillRule: fillRule ?? "nonzero",
      rect: null
    } : {
      path: this.path.slice(),
      matrix: this.state.matrix,
      fillRule: pathOrRule ?? "nonzero",
      rect: rectOf(this.path)
    };
    this.state = this.state.withClip(clip);
  }
  isPointInPath(a, b, c, d) {
    const [path, x, y, fillRule] = isPath2D(a) ? [a, b, c, d] : [this.path, a, b, c];
    return this.probe.isPointInPath({
      state: this.state,
      path,
      x,
      y,
      fillRule: fillRule ?? "nonzero",
      stroke: false,
      scale: this.sink.scale
    });
  }
  isPointInStroke(a, b, c) {
    const [path, x, y] = isPath2D(a) ? [a, b, c] : [this.path, a, b];
    return this.probe.isPointInPath({
      state: this.state,
      path,
      x,
      y,
      fillRule: "nonzero",
      stroke: true,
      scale: this.sink.scale
    });
  }
  drawFocusIfNeeded() {}
  fillRect(x, y, w, h) {
    if (finite(x, y, w, h) && w !== 0 && h !== 0) {
      const box = this.state.matrix.mapBox(x, y, x + w, y + h);
      this.emit(null, { kind: "fillRect", x, y, w, h }, this.reach(box, 0));
    }
  }
  strokeRect(x, y, w, h) {
    if (finite(x, y, w, h)) {
      const box = this.state.matrix.mapBox(x, y, x + w, y + h);
      this.emit(null, { kind: "strokeRect", x, y, w, h }, this.reach(box, this.strokeReach()));
    }
  }
  clearRect(x, y, w, h) {
    if (finite(x, y, w, h) && w !== 0 && h !== 0) {
      const box = this.clipped(grow(this.state.matrix.mapBox(x, y, x + w, y + h), 1));
      if (box) {
        this.sink.paint({
          state: this.state,
          path: null,
          call: { kind: "clearRect", x, y, w, h },
          bounds: box
        });
      }
    }
  }
  fillText(text, x, y, maxWidth) {
    this.text("fillText", text, x, y, maxWidth);
  }
  strokeText(text, x, y, maxWidth) {
    this.text("strokeText", text, x, y, maxWidth);
  }
  measureText(text) {
    return this.probe.measureText(this.state, text);
  }
  drawImage(image, ...args) {
    if (!finite(...args)) {
      return;
    }
    const dest = destOf(image, args);
    if (dest === undefined) {
      return;
    }
    const box = dest && this.state.matrix.mapBox(dest[0], dest[1], dest[0] + dest[2], dest[1] + dest[3]);
    this.emit(null, { kind: "drawImage", image, args }, box && this.reach(box, 0));
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
  createImageData(a, b, settings) {
    return typeof a === "number" ? this.probe.createImageData(a, b ?? 0, settings) : this.probe.createImageData(a.width, a.height);
  }
  getImageData(sx, sy, sw, sh) {
    return this.sink.read(sx, sy, sw, sh);
  }
  putImageData(data, ...args) {
    if (!finite(...args) || args.length !== 2 && args.length !== 6) {
      return;
    }
    const [
      dx = 0,
      dy = 0,
      dirtyX = 0,
      dirtyY = 0,
      dirtyW = data.width,
      dirtyH = data.height
    ] = args;
    const s = this.sink.scale;
    const box = new Rect2(dx + dirtyX, dy + dirtyY, dirtyW, dirtyH);
    this.sink.paint({
      state: this.state,
      path: null,
      call: { kind: "putImageData", data, args },
      bounds: grow(new Rect2(box.x / s, box.y / s, box.w / s, box.h / s), 1)
    });
  }
  text(kind, text, x, y, maxWidth) {
    if (!finite(x, y) || maxWidth !== undefined && !(maxWidth > 0)) {
      return;
    }
    const m = this.probe.measureText(this.state, text);
    const ascent = m.actualBoundingBoxAscent;
    const descent = m.actualBoundingBoxDescent;
    const pad = 2 + 0.1 * (ascent + descent);
    const box = this.state.matrix.mapBox(x - m.actualBoundingBoxLeft - pad, y - ascent - pad, x + m.actualBoundingBoxRight + pad, y + descent + pad);
    this.emit(null, { kind, text, x, y, maxWidth }, this.reach(box, kind === "strokeText" ? this.strokeReach() : 0));
  }
  emit(path, call, box) {
    const props = this.state.props;
    const anywhere = props.filter !== "none" || ERASING.has(props.globalCompositeOperation);
    let bounds = null;
    if (box && !anywhere) {
      bounds = this.clipped(box);
      if (!bounds) {
        return;
      }
    }
    const op = { state: this.state, path, call, bounds };
    this.sink.paint(op);
  }
  reach(box, stroke) {
    const props = this.state.props;
    let pad = 1 + stroke;
    if (props.shadowColor !== CLEAR_SHADOW) {
      const offset = Math.max(Math.abs(props.shadowOffsetX), Math.abs(props.shadowOffsetY));
      pad += offset + 3 * props.shadowBlur;
    }
    return grow(box, pad);
  }
  strokeReach() {
    const props = this.state.props;
    const join = props.lineJoin === "miter" ? props.miterLimit : 1;
    const cap = props.lineCap === "square" ? Math.SQRT2 : 1;
    return props.lineWidth / 2 * this.state.matrix.maxScale * Math.max(join, cap, 1);
  }
  clipped(box) {
    let result = box;
    for (const clip of this.state.clips) {
      if (clip.rect) {
        result = result.intersection(clip.rect);
        if (!result) {
          return null;
        }
      }
    }
    return result;
  }
  pathBox() {
    if (this.path.length === 0) {
      return;
    }
    if (this.unbounded) {
      return null;
    }
    return this.box.minX > this.box.maxX ? undefined : new Rect2(this.box.minX, this.box.minY, this.box.maxX - this.box.minX, this.box.maxY - this.box.minY);
  }
  segment(kind, args) {
    if (args.some((a) => typeof a === "number" && !Number.isFinite(a))) {
      return false;
    }
    this.path.push({ kind, args, matrix: this.state.matrix });
    return true;
  }
  extend(x0, y0, x1, y1) {
    const r = this.state.matrix.mapBox(x0, y0, x1, y1);
    this.box = {
      minX: Math.min(this.box.minX, r.x),
      minY: Math.min(this.box.minY, r.y),
      maxX: Math.max(this.box.maxX, r.x + r.w),
      maxY: Math.max(this.box.maxY, r.y + r.h)
    };
  }
}
for (const prop of PAINT_PROPS) {
  Object.defineProperty(PaintContext.prototype, prop, {
    get() {
      return this.getProp(prop);
    },
    set(value) {
      this.setProp(prop, value);
    }
  });
}
var EMPTY_BOX = {
  minX: Infinity,
  minY: Infinity,
  maxX: -Infinity,
  maxY: -Infinity
};
var CLEAR_SHADOW = "rgba(0, 0, 0, 0)";
var ERASING = new Set([
  "copy",
  "source-in",
  "source-out",
  "destination-in",
  "destination-atop"
]);
function finite(...values) {
  return values.every(Number.isFinite);
}
function isPath2D(value) {
  return typeof Path2D !== "undefined" && value instanceof Path2D;
}
function fromInit(init) {
  return new Affine(init.a ?? init.m11 ?? 1, init.b ?? init.m12 ?? 0, init.c ?? init.m21 ?? 0, init.d ?? init.m22 ?? 1, init.e ?? init.m41 ?? 0, init.f ?? init.m42 ?? 0);
}
function rectOf(path) {
  const [only] = path;
  if (path.length !== 1 || !only || only.kind !== "rect" || !only.matrix.isAxisAligned) {
    return null;
  }
  const [x = 0, y = 0, w = 0, h = 0] = only.args;
  return only.matrix.mapBox(x, y, x + w, y + h);
}
function destOf(image, args) {
  const [a = 0, b = 0, c = 0, d = 0, e = 0, f = 0, g = 0, h = 0] = args;
  switch (args.length) {
    case 2: {
      const size = sizeOf(image);
      return size && [a, b, size.width, size.height];
    }
    case 4:
      return [a, b, c, d];
    case 8:
      return [e, f, g, h];
    default:
      return;
  }
}
function sizeOf(image) {
  const source = image;
  for (const [w, h] of [
    ["naturalWidth", "naturalHeight"],
    ["videoWidth", "videoHeight"],
    ["displayWidth", "displayHeight"],
    ["width", "height"]
  ]) {
    const width = source[w];
    const height = source[h];
    if (typeof width === "number" && typeof height === "number") {
      return { width, height };
    }
  }
  return null;
}
function grow(box, by) {
  return new Rect2(box.x - by, box.y - by, box.w + 2 * by, box.h + 2 * by);
}

// paint-list.ts
class PaintList {
  scale = 1;
  ops = [];
  groups = [];
  nextElement = 0;
  openGroup(kind) {
    const parent = this.groups.at(-1)?.element;
    const explicit = kind.startsWith("vexml-");
    this.groups.push({
      element: {
        id: this.nextElement++,
        kind: kind.replace(/^vexml-/, ""),
        parent: parent?.id,
        ancestors: this.groups.map((group) => group.element.id)
      },
      explicit
    });
    return;
  }
  closeGroup() {
    this.groups.pop();
  }
  paint(op) {
    let element = (this.groups.findLast((group) => group.explicit) ?? this.groups.at(-1))?.element ?? (op.call.kind === "fillText" || op.call.kind === "strokeText" ? { id: this.nextElement++, kind: "text" } : { id: this.nextElement++, kind: "path" });
    if (element?.kind === "notehead" && (op.call.kind === "fillText" || op.call.kind === "strokeText")) {
      const glyph = op.call.text.codePointAt(0) ?? 0;
      if (glyph >= 58592 && glyph <= 58623) {
        element = { ...element, kind: "rest" };
      }
    }
    this.ops.push(element ? { ...op, element } : op);
  }
  read() {
    throw new Error("vexml: the engraving cannot be read back while it is drawn");
  }
  mark() {
    return {
      ops: this.ops.length,
      groups: this.groups.length,
      nextElement: this.nextElement
    };
  }
  rewind(mark) {
    this.ops.length = mark.ops;
    this.groups.length = mark.groups;
    this.nextElement = mark.nextElement;
  }
  reset() {
    this.ops.length = 0;
    this.groups.length = 0;
    this.nextElement = 0;
  }
}

// score-recording.ts
class ScoreRecording {
  parts;
  probe;
  hasDocument = true;
  constructor(parts, probe) {
    this.parts = parts;
    this.probe = probe;
  }
  snapshot() {
    const { config, engraving, fold, pages, elements, notes, sequence, gaps } = this.parts;
    const encoder = new PaintEncoder;
    const engraved = engraving && {
      ops: encoder.encode(engraving.ops),
      elements: engraving.ops.map((op) => op.element ?? null),
      width: engraving.width,
      height: engraving.height,
      origin: [engraving.origin.x, engraving.origin.y],
      scale: engraving.scale
    };
    const folded = fold && {
      left: fold.left,
      width: fold.width,
      height: fold.height,
      starts: [...fold.starts],
      strips: fold.starts.map((_, i) => {
        const list = new PaintList;
        fold.paint(new PaintContext(list, this.probe, null), i);
        return encoder.encode(list.ops);
      })
    };
    const model = sequence.model(new Map(notes.map((note, i) => [note, i])));
    const noteIndex = new Map(elements.notes.map((note, i) => [note.key, i]));
    const fonts = [];
    const fontIndex = (font) => {
      const known = fonts.indexOf(font);
      return known < 0 ? fonts.push(font) - 1 : known;
    };
    return {
      format: SNAPSHOT_FORMAT,
      version: SNAPSHOT_VERSION2,
      config: structuredClone(config),
      paint: encoder.tables(),
      engraving: engraved,
      fold: folded,
      pages: pages.map(rect),
      elements: {
        bounds: rect(elements.bounds),
        boxes: elements.boxes.map((box) => ({
          rect: rect(box.rect),
          index: box.index,
          number: box.number,
          systemIndex: box.systemIndex
        })),
        parts: elements.parts.map((part) => ({
          id: part.id,
          label: part.label,
          measures: part.measures.map((measure) => ({
            rect: rect(measure.rect),
            index: measure.index,
            number: measure.number,
            voices: measure.voices.map((voice) => ({
              id: voice.id,
              staff: voice.staff,
              notes: [...voice.notes]
            })),
            staves: measure.staves.map((stave) => ({
              ...stave,
              lines: [...stave.lines],
              keyAccidentals: stave.keyAccidentals.map((a) => ({ ...a }))
            }))
          }))
        })),
        fonts,
        notes: elements.notes.map((note, i) => {
          const { glyph, facts } = note;
          return [
            note.rect.x,
            note.rect.y,
            note.rect.w,
            note.rect.h,
            sameRect(note.ink, note.rect) ? null : rect(note.ink),
            glyph && [
              glyph.text,
              fontIndex(glyph.font),
              glyph.x === note.rect.x ? null : glyph.x,
              glyph.y
            ],
            note.part,
            note.measure,
            facts.pitch,
            facts.beats,
            (facts.grace ? 1 : 0) | (facts.swingExempt ? 2 : 0) | (facts.chordMember ? 4 : 0),
            note.chord.length === 1 && note.chord[0] === i ? null : [...note.chord],
            facts.graces.flatMap((key) => noteIndex.get(key) ?? []),
            [...facts.articulations]
          ];
        }),
        tabs: elements.tabs.map((tab) => ({
          note: tab.note,
          rect: rect(tab.rect),
          string: tab.string,
          fret: tab.fret,
          glyph: tab.glyph && { ...tab.glyph }
        })),
        diagrams: elements.diagrams.map((diagram) => ({
          rect: rect(diagram.rect),
          frame: structuredClone(diagram.frame),
          title: diagram.title
        })),
        barlines: elements.barlines.map((barline) => ({
          rect: rect(barline.rect),
          location: barline.location,
          part: barline.part,
          measure: barline.measure
        })),
        targets: [...elements.targets]
      },
      sequence: {
        steps: model.steps.map((step) => ({
          measureIndex: step.measureIndex,
          startBeat: step.startBeat,
          endBeat: step.endBeat,
          x: step.x,
          glideToX: step.glideToX,
          systemRect: rect(step.systemRect),
          active: step.active
        })),
        segments: model.segments.map((segment) => ({ ...segment })),
        durationBeats: model.durationBeats,
        measureCount: model.measureCount,
        ties: model.ties
      },
      gaps: gaps.map((gap) => ({ ...gap })),
      outlines: null
    };
  }
}
function rect(r) {
  return [r.x, r.y, r.w, r.h];
}
function sameRect(a, b) {
  return a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h;
}

// snapshot-config.ts
function snapshotConfig(config) {
  const font = (override, family) => ({
    family: override?.family ?? family,
    url: override?.url ?? null
  });
  return {
    layout: layoutOf(config.layout),
    noteSpacing: config.noteSpacing,
    softmaxFactor: config.softmaxFactor,
    systemSpacing: config.systemSpacing,
    showPartLabels: config.showPartLabels,
    showHeader: config.showHeader,
    measureNumbering: config.measureNumbering,
    showTabSlideText: config.showTabSlideText,
    tabStemPlacement: config.tabStemPlacement,
    showTabs: config.showTabs,
    showNotation: config.showNotation,
    minLastSystemFill: config.minLastSystemFill,
    stretchSingleSystem: config.stretchSingleSystem,
    maxSystemFill: config.maxSystemFill,
    fonts: {
      notation: font(config.fonts.notation, DEFAULT_FONT_CONFIG.notation.family),
      text: font(config.fonts.text, DEFAULT_FONT_CONFIG.text.family)
    },
    documentFonts: config.documentFonts,
    gaps: config.gaps.map((gap) => ({
      beforeMeasureIndex: gap.beforeMeasureIndex ?? null,
      beforeBarIndex: gap.beforeBarIndex ?? null,
      measureIndex: gap.measure?.index ?? null,
      durationMs: gap.durationMs,
      label: gap.label ?? null,
      minWidth: gap.minWidth ?? null,
      style: gap.style ? {
        fontFamily: gap.style.fontFamily ?? null,
        fontSize: gap.style.fontSize ?? null,
        fontColor: gap.style.fontColor ?? null,
        fill: gap.style.fill ?? null,
        border: gap.style.border ?? null
      } : null
    }))
  };
}
function layoutOf(layout) {
  switch (layout.type) {
    case "standard":
      return {
        type: layout.type,
        referenceWidth: layout.referenceWidth,
        honorSystemBreaks: layout.honorSystemBreaks,
        ...documentLayoutOf(layout),
        overflow: layout.overflow
      };
    case "panoramic":
      return {
        type: layout.type,
        stickySignatures: layout.stickySignatures,
        scale: layout.scale,
        fitHeight: layout.fitHeight
      };
    case "paged":
      return {
        type: layout.type,
        pageWidth: layout.pageWidth,
        pageHeight: layout.pageHeight,
        margin: layout.margin,
        honorSystemBreaks: layout.honorSystemBreaks,
        ...documentLayoutOf(layout),
        overflow: layout.overflow
      };
  }
}
function documentLayoutOf(layout) {
  return layout.documentLayout === "ignore" ? {} : {
    documentLayout: layout.documentLayout,
    ...layout.type === "standard" && layout.honorPageLayout === false ? { honorPageLayout: false } : {}
  };
}

// progressive-engraving.ts
var RECENT_PIECES = 16;
var SLICE_RESERVE_MS = 5;

class ProgressiveEngraving {
  deps;
  dispatcher = new Dispatcher;
  events = this.dispatcher.events;
  forecastByMeasure = new Map;
  forecastVersion;
  pending = [];
  shownOps = 0;
  stepped = 0;
  pieces = null;
  pieceMs = [];
  slice = null;
  disposed = false;
  final = null;
  recorded = null;
  done;
  finish = () => {};
  constructor(deps) {
    this.deps = deps;
    this.holdForecast(deps.planned);
    this.forecastVersion = deps.plan.forecast().version;
    this.done = new Promise((resolve) => {
      this.finish = resolve;
    });
  }
  get elements() {
    return this.deps.elements;
  }
  get sequence() {
    return this.deps.sequence;
  }
  get gaps() {
    return this.deps.gaps;
  }
  drawFirstScreen(view) {
    let system = this.step();
    while (system !== null && !this.finished() && this.deps.draw.bottomOf(system) < view.visibleBottom()) {
      system = this.step();
    }
    this.flush();
  }
  start() {
    if (!this.finished() && !this.disposed) {
      this.schedule();
    } else {
      this.complete();
    }
  }
  isComplete() {
    return this.finished();
  }
  whenComplete() {
    return this.done;
  }
  drawThroughMeasure(m) {
    while (!this.finished() && this.stepped <= this.deps.plan.systemOfMeasure(m)) {
      this.step();
    }
    this.flush();
  }
  drawAll() {
    while (!this.finished()) {
      this.step();
    }
    this.flush();
  }
  recording() {
    this.drawAll();
    if (!this.recorded) {
      const { config, probe, factory, parts, elements, sequence, gaps } = this.deps;
      const result = this.result();
      const model = factory.model(result.geometry, parts);
      this.recorded = new ScoreRecording({
        config: snapshotConfig(config),
        engraving: result.engraving,
        fold: result.fold,
        pages: result.pages,
        elements: model,
        notes: model.notes.flatMap((note) => elements.noteLookup.get(note.key) ?? []),
        sequence,
        gaps
      }, probe);
    }
    return this.recorded;
  }
  dispose() {
    this.disposed = true;
    this.slice?.dispose();
    this.slice = null;
    this.dispatcher.dispose();
  }
  holdForecast(geometry) {
    for (const m of geometry.measures) {
      this.forecastByMeasure.set(m.index, { measure: m, notes: [] });
    }
    for (const n of geometry.notes) {
      this.forecastByMeasure.get(n.measureIndex)?.notes.push(n);
    }
  }
  refreshForecast() {
    const { plan, provisional, placer } = this.deps;
    const forecast = plan.forecast();
    if (forecast.version === this.forecastVersion) {
      return;
    }
    this.forecastVersion = forecast.version;
    const geometry = provisional.geometryOf(forecast, this.forecastByMeasure.keys());
    this.holdForecast(geometry);
    placer.forecast(geometry, forecast.systemCount);
  }
  finished() {
    return this.deps.draw.done() && this.pieces === null;
  }
  step() {
    let piece = this.advance();
    while (!piece.done) {
      piece = this.advance();
    }
    return piece.value;
  }
  advance() {
    this.pieces ??= this.stepInPieces();
    const started = performance.now();
    const piece = this.pieces.next();
    this.pieceMs.push(performance.now() - started);
    if (this.pieceMs.length > RECENT_PIECES) {
      this.pieceMs.shift();
    }
    if (piece.done) {
      this.pieces = null;
    }
    return piece;
  }
  *stepInPieces() {
    const { draw, placer, sink } = this.deps;
    let system = draw.advance();
    while (system === null) {
      if (draw.done()) {
        return null;
      }
      yield;
      system = draw.advance();
    }
    const result = this.result();
    const { geometry } = result;
    const measures = geometry.measures.filter((m) => m.systemIndex === system);
    for (const m of measures) {
      this.forecastByMeasure.delete(m.index);
    }
    this.refreshForecast();
    yield;
    const ofSystem = (m) => draw.systemOfMeasure(m) === system;
    placer.place(system, {
      measures,
      notes: geometry.notes.filter((n) => ofSystem(n.measureIndex)),
      chordDiagrams: geometry.chordDiagrams.filter((d) => ofSystem(d.measureIndex))
    });
    this.deps.sequence.adoptGeometry(this.deps.timeline.place(this.merged(geometry)));
    sink.extendEngraving(result.engraving, this.shownOps);
    this.shownOps = result.engraving.ops.length;
    this.pending.push(system);
    this.stepped++;
    return system;
  }
  result() {
    if (this.deps.draw.done()) {
      this.final ??= this.deps.draw.result();
      return this.final;
    }
    return this.deps.draw.result();
  }
  merged(drawn) {
    const notes = [...drawn.notes];
    const measures = [...drawn.measures];
    const undrawn = [...this.forecastByMeasure.keys()].sort((a, b) => a - b);
    for (const m of undrawn) {
      const forecast = this.forecastByMeasure.get(m);
      if (forecast) {
        notes.push(...forecast.notes);
        measures.push(forecast.measure);
      }
    }
    return { ...drawn, notes, measures };
  }
  flush() {
    if (this.pending.length > 0 && !this.disposed) {
      const systems = this.pending;
      this.pending = [];
      this.dispatcher.dispatch("draw", { systems });
    }
    if (this.finished()) {
      this.complete();
    }
  }
  complete() {
    this.finish();
    if (!this.disposed) {
      this.dispatcher.dispatch("complete");
    }
  }
  schedule() {
    this.slice = this.deps.scheduler.request((budget) => this.run(budget));
  }
  run(budget) {
    this.slice = null;
    if (this.disposed) {
      return;
    }
    do {
      this.advance();
    } while (!this.finished() && budget.timeRemaining() > Math.max(...this.pieceMs) + SLICE_RESERVE_MS);
    this.flush();
    if (!this.finished()) {
      this.schedule();
    }
  }
}

// provisional-geometry.ts
class ProvisionalGeometry {
  reader;
  staves;
  score;
  layout;
  stack;
  pitch;
  rows;
  sounding;
  constructor(reader, staves, score, layout) {
    this.reader = reader;
    this.staves = staves;
    this.score = score;
    this.layout = layout;
    this.sounding = new SoundingNotes(reader, staves, score.parts);
    this.stack = layout.floorHeight - PAGE_MARGIN_BOTTOM - layout.top;
    this.pitch = this.stack + layout.systemGap;
    let row = 0;
    this.rows = score.parts.map((part) => {
      const rows = new Map;
      for (const staffNumber of staves.visibleNumbers(part)) {
        rows.set(staffNumber, row++);
      }
      return rows;
    });
  }
  systemTop(system) {
    return this.layout.top + system * this.pitch;
  }
  geometryOf(forecast, measures = forecast.boxes.keys()) {
    const columns = [];
    const notes = [];
    const { parts } = this.score;
    for (const m of measures) {
      const box = forecast.boxes[m];
      if (!box) {
        continue;
      }
      const top = this.systemTop(box.systemIndex);
      columns.push({
        rect: new Rect2(box.x, top, box.width, this.stack),
        index: m,
        number: parts[0]?.measures[m]?.number ?? String(m + 1),
        systemIndex: box.systemIndex,
        staves: [],
        barlines: []
      });
      for (const p of this.sounding.of(m)) {
        const x = box.x + box.width * p.beat / p.span;
        const row = this.rows[p.part]?.get(p.staffNumber) ?? 0;
        const y = top + (this.layout.staveOffsets[row] ?? 0);
        const rect = p.tab ? new Rect2(x - FRET_HALF_W, y - FRET_HALF_H, 2 * FRET_HALF_W, 2 * FRET_HALF_H) : new Rect2(x, y - NOTEHEAD_HALF_H, 2 * NOTEHEAD_HALF_H, 2 * NOTEHEAD_HALF_H);
        notes.push({
          mnote: p.mnote,
          rect,
          ink: rect,
          chord: p.chord,
          measureIndex: m,
          tab: p.tab,
          glyph: null
        });
      }
    }
    const height = this.layout.top + forecast.systemCount * this.pitch - this.layout.systemGap + PAGE_MARGIN_BOTTOM;
    return {
      bounds: new Rect2(0, 0, this.layout.width, height),
      notes,
      measures: columns,
      chordDiagrams: []
    };
  }
}

// system-draw.ts
import { CanvasContext as CanvasContext2 } from "vexflow/core";

// draw-pass.ts
import {
  KeySignature as KeySignature2,
  Metrics as Metrics3,
  MetricsDefaults,
  StaveModifierPosition as StaveModifierPosition5
} from "vexflow/core";

// barline-width.ts
import {
  Barline as Barline3,
  StaveConnector
} from "vexflow/core";
var LIGHT = 1;
var HEAVY = 3;
var GAP = 2;
var DOT_RADIUS = 2;

class BarlineWidths {
  static installed = false;
  static light = null;
  static heavy = null;
  set(light, heavy) {
    BarlineWidths.light = light;
    BarlineWidths.heavy = heavy;
    if (BarlineWidths.installed) {
      return;
    }
    BarlineWidths.installed = true;
    const proto = Barline3.prototype;
    const vertical = proto.drawVerticalBar;
    const end = proto.drawVerticalEndBar;
    const repeat = proto.drawRepeatBar;
    proto.drawVerticalBar = function(stave, x, double) {
      if (!BarlineWidths.custom()) {
        return vertical.call(this, stave, x, double);
      }
      fillBars(stave, x, double ? ["light", "light"] : ["light"]);
    };
    proto.drawVerticalEndBar = function(stave, x) {
      if (!BarlineWidths.custom()) {
        return end.call(this, stave, x);
      }
      fillBars(stave, x, ["light", "heavy"]);
    };
    proto.drawRepeatBar = function(stave, x, begin) {
      if (!BarlineWidths.custom()) {
        return repeat.call(this, stave, x, begin);
      }
      drawRepeat(stave, x, begin);
    };
  }
  static current() {
    return {
      light: BarlineWidths.light ?? LIGHT,
      heavy: BarlineWidths.heavy ?? HEAVY
    };
  }
  static custom() {
    return BarlineWidths.light !== null || BarlineWidths.heavy !== null;
  }
}
function barRects(kinds, gap = GAP) {
  const widths = BarlineWidths.current();
  const rects = [];
  let right = LIGHT;
  for (const kind of [...kinds].reverse()) {
    const width = widths[kind];
    rects.unshift([right - width, width]);
    right -= width + gap;
  }
  return rects;
}
function drawBarConnector(ctx, opts) {
  const { top, bottom, type } = opts;
  const xShift = opts.xShift ?? 0;
  ctx.openGroup("vexml-staveconnector");
  try {
    const kinds = CONNECTOR_BARS[type];
    if (!BarlineWidths.custom() || !kinds) {
      new StaveConnector(top, bottom).setType(type).setXShift(xShift).setContext(ctx).draw();
      return;
    }
    const topY = top.getYForLine(0);
    const botY = bottom.getYForLine(bottom.getNumLines() - 1);
    const left = type === "singleLeft" || type === "boldDoubleLeft";
    const x = top.getX() + (left ? xShift : top.getWidth());
    for (const [offset, width] of left ? leftRects(kinds) : barRects(kinds)) {
      ctx.fillRect(x + offset, topY, width, botY - topY);
    }
  } finally {
    ctx.closeGroup();
  }
}
var CONNECTOR_BARS = {
  singleLeft: ["light"],
  singleRight: ["light"],
  thinDouble: ["light", "light"],
  boldDoubleLeft: ["heavy", "light"],
  boldDoubleRight: ["light", "heavy"]
};
function leftRects(kinds) {
  const widths = BarlineWidths.current();
  if (kinds.length === 1) {
    return [[0, widths.light]];
  }
  return [
    [LIGHT - widths.heavy, widths.heavy],
    [LIGHT + GAP, widths.light]
  ];
}
function fillBars(stave, x, kinds) {
  const ctx = stave.checkContext();
  const topY = stave.getTopLineTopY();
  const height = stave.getBottomLineBottomY() - topY;
  for (const [offset, width] of barRects(kinds)) {
    ctx.fillRect(x + offset, topY, width, height);
  }
}
function drawRepeat(stave, x, begin) {
  const rects = begin ? leftRects(["heavy", "light"]) : barRects(["light", "heavy"]);
  const ctx = stave.checkContext();
  const topY = stave.getTopLineTopY();
  const height = stave.getBottomLineBottomY() - topY;
  for (const [offset, width] of rects) {
    ctx.fillRect(x + offset, topY, width, height);
  }
  const [thinOffset, thinWidth] = begin ? rects[1] ?? [0, 0] : rects[0] ?? [0, 0];
  const dotX = begin ? x + thinOffset + thinWidth + GAP + 1 + DOT_RADIUS / 2 : x + thinOffset - GAP - 1 - DOT_RADIUS / 2;
  const spacing = stave.getSpacingBetweenLines();
  let dotY = topY + (stave.getNumLines() - 1) * spacing / 2 - spacing / 2 + DOT_RADIUS / 2;
  for (let i = 0;i < 2; i++) {
    ctx.beginPath();
    ctx.arc(dotX, dotY, DOT_RADIUS, 0, Math.PI * 2, false);
    ctx.fill();
    dotY += spacing;
  }
}

// collision-resolver.ts
class CollisionResolver {
  tree;
  registered = [];
  constructor(bounds, opts) {
    this.tree = new QuadTree(bounds, opts);
  }
  add(c) {
    this.tree.insert(c, c.rect);
    this.registered.push(c);
  }
  clear() {
    this.tree.clear();
    this.registered.length = 0;
  }
  query(candidate) {
    const out = [];
    for (const other of this.tree.query(candidate)) {
      const overlap = candidate.intersection(other.rect);
      if (!overlap) {
        continue;
      }
      out.push({
        other,
        overlap,
        mtv: this.mtvOf(candidate, other.rect, overlap)
      });
    }
    return out;
  }
  liftClear(rect, gap, opts) {
    const { kinds, band, xMargin = 0 } = opts;
    const probe = new Rect2(rect.x - xMargin, -FAR, rect.w + 2 * xMargin, FAR + rect.bottom);
    let topMost = Infinity;
    for (const c of this.query(probe)) {
      if (kinds && !kinds.includes(c.other.kind)) {
        continue;
      }
      if (band !== undefined && c.other.band !== undefined && c.other.band !== band) {
        continue;
      }
      topMost = Math.min(topMost, c.other.rect.y);
    }
    if (topMost === Infinity) {
      return rect;
    }
    const targetBottom = Math.min(rect.bottom, topMost - gap);
    return rect.translate(0, targetBottom - rect.bottom);
  }
  dropClear(rect, gap, opts) {
    const { kinds, band, xMargin = 0 } = opts;
    const probe = new Rect2(rect.x - xMargin, rect.y, rect.w + 2 * xMargin, FAR);
    let bottomMost = -Infinity;
    for (const c of this.query(probe)) {
      if (kinds && !kinds.includes(c.other.kind)) {
        continue;
      }
      if (band !== undefined && c.other.band !== undefined && c.other.band !== band) {
        continue;
      }
      bottomMost = Math.max(bottomMost, c.other.rect.bottom);
    }
    if (bottomMost === -Infinity) {
      return rect;
    }
    const targetTop = Math.max(rect.y, bottomMost + gap);
    return rect.translate(0, targetTop - rect.y);
  }
  pushRightOf(rect, kind, gap) {
    let out = rect;
    for (;; ) {
      const probe = new Rect2(-FAR, out.y, FAR + out.right, out.h);
      let targetX = out.x;
      for (const c of this.query(probe)) {
        if (c.other.kind === kind) {
          targetX = Math.max(targetX, c.other.rect.right + gap);
        }
      }
      if (targetX === out.x) {
        return out;
      }
      out = out.translate(targetX - out.x, 0);
    }
  }
  nudgeInsideX(rect, bounds, margin) {
    const left = bounds.x + margin;
    const right = bounds.right - margin;
    let dx = 0;
    if (rect.right > right) {
      dx = right - rect.right;
    }
    if (rect.x + dx < left) {
      dx = left - rect.x;
    }
    return rect.translate(dx, 0);
  }
  escaping(viewport) {
    const out = [];
    for (const item of this.registered) {
      if (viewport.containsRect(item.rect)) {
        continue;
      }
      const edges = [];
      if (item.rect.y < viewport.y) {
        edges.push("top");
      }
      if (item.rect.bottom > viewport.bottom) {
        edges.push("bottom");
      }
      if (item.rect.x < viewport.x) {
        edges.push("left");
      }
      if (item.rect.right > viewport.right) {
        edges.push("right");
      }
      out.push({ item, edges });
    }
    return out;
  }
  mtvOf(a, b, overlap) {
    const signX = a.x + a.w / 2 < b.x + b.w / 2 ? -1 : 1;
    const signY = a.y + a.h / 2 < b.y + b.h / 2 ? -1 : 1;
    return overlap.w <= overlap.h ? { axis: "x", dx: signX * overlap.w, dy: 0 } : { axis: "y", dx: 0, dy: signY * overlap.h };
  }
}

// connector-drawer.ts
import {
  StaveConnector as StaveConnector2
} from "vexflow/core";
class ConnectorDrawer {
  context;
  _reader;
  staves;
  parts;
  partGroups;
  groupTimeSpans;
  barlineBreaks;
  totalStaves;
  labelIndent;
  partLabelIndent;
  laterLabelIndent;
  abbreviationIndent;
  labelFont;
  notationColor;
  textColor;
  constructor(context, _reader, staves, opts) {
    this.context = context;
    this._reader = _reader;
    this.staves = staves;
    this.parts = opts.parts;
    this.partGroups = opts.partGroups;
    this.groupTimeSpans = opts.groupTimeSpans ?? [];
    this.barlineBreaks = opts.barlineBreaks;
    this.totalStaves = opts.totalStaves;
    this.labelIndent = opts.labelIndent;
    this.partLabelIndent = opts.partLabelIndent;
    this.laterLabelIndent = opts.laterLabelIndent;
    this.abbreviationIndent = opts.abbreviationIndent;
    this.labelFont = opts.labelFont;
    this.notationColor = opts.notationColor;
    this.textColor = opts.textColor;
  }
  drawConnectors(column) {
    this.drawGroupTimes(column);
    const { systemTop, systemBottom } = column;
    if (systemTop && systemBottom && this.totalStaves > 1) {
      if (column.isSystemStart) {
        this.drawSystemStart(column);
      }
      if (column.begRepeatX !== null) {
        this.drawRepeatConnector(column, "boldDoubleLeft", column.begRepeatX - systemTop.getX());
      }
      if (column.repeatEnd) {
        this.drawRepeatConnector(column, "boldDoubleRight", 0);
        if (column.repeatBoth) {
          this.drawRepeatConnector(column, "boldDoubleLeft", systemTop.getWidth());
        }
        return;
      }
      let type = "singleRight";
      if (column.barStyle === "light-light") {
        type = "thinDouble";
      } else if (column.barStyle === "light-heavy" || column.isLastMeasure) {
        type = "boldDoubleRight";
      }
      for (const run of this.barlineRuns(column)) {
        drawBarConnector(this.context, {
          top: run.top,
          bottom: run.bottom,
          type
        });
      }
    }
  }
  drawGroupTimes(column) {
    for (const [index, sign] of column.groupTimes ?? []) {
      const span = this.groupTimeSpans[index];
      const top = column.partStaves[span?.fromPart ?? -1]?.top;
      const bottom = column.partStaves[span?.toPart ?? -1]?.bottom;
      if (top && bottom) {
        sign.draw(this.context, top, bottom);
      }
    }
  }
  drawSystemStart(column) {
    const { systemTop, systemBottom } = column;
    if (!systemTop || !systemBottom || this.totalStaves <= 1) {
      return;
    }
    drawBarConnector(this.context, {
      top: systemTop,
      bottom: systemBottom,
      type: "singleLeft"
    });
    if (this.staves.partsPairTabWithNotation(this.parts)) {
      systemTop.setX(column.measureX - BRACKET_X_SHIFT);
      this.context.openGroup("vexml-staveconnector");
      try {
        new StaveConnector2(systemTop, systemBottom).setType("bracket").setContext(this.context).draw();
      } finally {
        this.context.closeGroup();
      }
      systemTop.setX(column.measureX);
    }
    this.drawPartGroupConnectors(column);
    this.drawPartGroupNames(column);
  }
  drawPartSymbol(part, top, bottom, measureX) {
    const symbol = this.staves.symbolOf(part);
    if (top === bottom || !symbol) {
      return;
    }
    if (symbol === "bracket") {
      top.setX(measureX - BRACKET_X_SHIFT);
    }
    this.context.openGroup("vexml-staveconnector");
    try {
      new StaveConnector2(top, bottom).setType(symbol).setContext(this.context).draw();
    } finally {
      this.context.closeGroup();
    }
    top.setX(measureX);
  }
  barlineRuns(column) {
    const systemTop = column.systemTop;
    const systemBottom = column.systemBottom;
    if (!systemTop || !systemBottom) {
      return [];
    }
    if (this.barlineBreaks.size === 0) {
      return [{ top: systemTop, bottom: systemBottom }];
    }
    const runs = [];
    let top;
    let bottom;
    for (const [partIndex, staves] of column.partStaves.entries()) {
      if (staves) {
        top ??= staves.top;
        bottom = staves.bottom;
      }
      if (this.barlineBreaks.has(partIndex) && top && bottom) {
        runs.push({ top, bottom });
        top = undefined;
        bottom = undefined;
      }
    }
    if (top && bottom) {
      runs.push({ top, bottom });
    }
    return runs;
  }
  drawCustomBarline(stave, column) {
    if (column.repeatEnd || column.repeatBoth || !column.barStyle) {
      return;
    }
    this.paintBarStyle(stave, stave.getX() + stave.getWidth(), column.barStyle);
  }
  paintBarStyle(stave, x, barStyle) {
    this.context.openGroup("vexml-stavebarline");
    try {
      const style = CUSTOM_BAR_STYLES[barStyle];
      if (!style) {
        return;
      }
      const spacing = stave.getSpacingBetweenLines();
      const topY = stave.getTopLineTopY();
      const [from, to] = style.span ?? [0, 0];
      const y = style.span ? topY + from * spacing : topY;
      const height = style.span ? (to - from) * spacing : stave.getBottomLineBottomY() - topY;
      this.context.save();
      this.context.setFillStyle(this.notationColor);
      for (const [offset, width] of barRects(style.bars, style.gap)) {
        if (style.dash) {
          const [on, off] = style.dash;
          for (let dy = 0;dy < height; dy += on + off) {
            this.context.fillRect(x + offset, y + dy, width, Math.min(on, height - dy));
          }
        } else {
          this.context.fillRect(x + offset, y, width, height);
        }
      }
      this.context.restore();
    } finally {
      this.context.closeGroup();
    }
  }
  connectorExtent(column) {
    if (!column.isSystemStart || !column.systemTop || !column.systemBottom) {
      return null;
    }
    const symbol = this.staves.systemSymbol(this.parts);
    if (symbol === null) {
      return null;
    }
    const top = column.systemTop.getYForLine(0);
    const bottom = column.systemBottom.getBottomLineY();
    const curl = symbol === "bracket" ? CONNECTOR_VERTICAL_OVERHANG : 0;
    return {
      left: column.measureX - this.staves.systemOverhang(this.parts),
      top: top - curl,
      bottom: bottom + curl
    };
  }
  drawPartGroupConnectors(column) {
    const maxDepth = Math.max(0, ...this.partGroups.map((g) => g.depth));
    for (const group of this.partGroups) {
      const top = column.partStaves[group.fromPart]?.top;
      const bottom = column.partStaves[group.toPart]?.bottom;
      if (!top || !bottom) {
        continue;
      }
      top.setX(column.measureX - BRACKET_X_SHIFT - PART_GROUP_STEP * (maxDepth - group.depth));
      this.context.openGroup("vexml-staveconnector");
      try {
        new StaveConnector2(top, bottom).setType(group.symbol === "line" ? "singleLeft" : group.symbol).setContext(this.context).draw();
      } finally {
        this.context.closeGroup();
      }
      top.setX(column.measureX);
    }
  }
  drawPartGroupNames(column) {
    const first = column.systemIndex === 0;
    const total = first ? this.labelIndent : this.laterLabelIndent;
    const inner = first ? this.partLabelIndent : this.abbreviationIndent;
    if (column.partStaves.length === 0 || total <= inner) {
      return;
    }
    this.context.save();
    this.context.setFont(this.labelFont, LABEL_FONT_SIZE);
    this.context.setFillStyle(this.textColor);
    for (const group of this.partGroups) {
      const top = column.partStaves[group.fromPart]?.top;
      const bottom = column.partStaves[group.toPart]?.bottom;
      const text = first ? group.name : group.abbreviation;
      if (!text || !top || !bottom) {
        continue;
      }
      const width = this.context.measureText(text).width;
      const cy = (top.getYForLine(0) + bottom.getBottomLineY()) / 2;
      this.context.fillText(text, column.measureX - inner - LABEL_GAP - width, cy + 1.5);
    }
    this.context.restore();
  }
  drawRepeatConnector(column, type, xShift) {
    if (!column.systemTop || !column.systemBottom) {
      return;
    }
    drawBarConnector(this.context, {
      top: column.systemTop,
      bottom: column.systemBottom,
      type,
      xShift
    });
  }
}
var CUSTOM_BAR_STYLES = {
  dotted: { bars: ["light"], dash: [1, 3] },
  dashed: { bars: ["light"], dash: [4, 4] },
  heavy: { bars: ["heavy"] },
  "heavy-light": { bars: ["heavy", "light"] },
  "heavy-heavy": { bars: ["heavy", "heavy"], gap: 1 },
  tick: { bars: ["light"], span: [-0.5, 0.5] },
  short: { bars: ["light"], span: [1, 3] }
};

// direction-placer.ts
import {
  Element as Element6,
  StaveNote as StaveNote4,
  StaveTempo,
  TabNote,
  TimeSignature
} from "vexflow/core";

// accordion-registration-glyph.ts
class AccordionRegistrationGlyph {
  ranks;
  diameter;
  constructor(ranks, diameter) {
    this.ranks = ranks;
    this.diameter = diameter;
  }
  draw(context, x, y) {
    const r = this.diameter / 2;
    const cx = x + r;
    const cy = y + r;
    const band = this.diameter / 3;
    const chordHalf = Math.sqrt(r * r - (band / 2) ** 2);
    const dot = this.diameter * DOT_RATIO;
    context.save();
    context.setLineWidth(Math.max(1, this.diameter * LINE_RATIO));
    context.beginPath();
    context.arc(cx, cy, r, 0, Math.PI * 2, false);
    context.stroke();
    context.beginPath();
    for (const dy of [-band / 2, band / 2]) {
      context.moveTo(cx - chordHalf, cy + dy);
      context.lineTo(cx + chordHalf, cy + dy);
    }
    context.stroke();
    const dots = [];
    if (this.ranks.high) {
      dots.push([cx, cy - band]);
    }
    const middle = Math.min(3, this.ranks.middle);
    for (let i = 0;i < middle; i++) {
      dots.push([cx + (i - (middle - 1) / 2) * dot * 3, cy]);
    }
    if (this.ranks.low) {
      dots.push([cx, cy + band]);
    }
    for (const [dx, dy] of dots) {
      context.beginPath();
      context.arc(dx, dy, dot, 0, Math.PI * 2, false);
      context.fill();
    }
    context.restore();
  }
}
var DOT_RATIO = 0.09;
var LINE_RATIO = 0.06;

// chord-diagram-glyph.ts
class ChordDiagramGlyph {
  x;
  y;
  style;
  chord;
  position;
  positionText;
  barres;
  tuning;
  title;
  unplayed;
  stringCount;
  fretCount;
  width;
  spacing;
  fretSpacing;
  originX;
  originY;
  circleRadius;
  fontSize;
  barShiftX;
  bridgeWidth;
  constructor(x, y, opts) {
    this.x = x;
    this.y = y;
    this.style = {
      width: 100,
      height: 120,
      stringCount: 6,
      fretCount: 5,
      showTuning: true,
      strokeWidth: 1,
      color: "#000",
      bgColor: "#fff",
      fontFamily: "Arial, sans-serif",
      ...opts
    };
    this.chord = opts.chord;
    this.position = opts.position ?? 0;
    this.positionText = opts.positionText ?? 0;
    this.barres = opts.barres ?? [];
    this.tuning = opts.tuning ?? DEFAULT_TUNING;
    this.title = opts.title;
    this.unplayed = opts.unplayed ?? "X";
    this.stringCount = this.style.stringCount;
    this.fretCount = this.style.fretCount;
    this.width = this.style.width * 0.75;
    this.spacing = this.width / this.stringCount;
    const vRows = this.fretCount + 3 + (this.style.showTuning ? 1 : 0);
    this.fretSpacing = this.style.height / vRows;
    this.originX = x + this.style.width * 0.15 + this.spacing / 2;
    this.originY = y + this.fretSpacing * 1.5;
    this.circleRadius = opts.circleRadius ?? this.width / 18;
    this.fontSize = opts.fontSize ?? Math.ceil(this.width / 7);
    this.barShiftX = this.width / 28;
    this.bridgeWidth = Math.max(2, Math.ceil(this.fretSpacing / 4));
  }
  get titleSize() {
    return Math.max(this.fontSize, 11);
  }
  get top() {
    return this.drawnTop ?? this.y - this.titleSize * 2;
  }
  drawnTop = null;
  draw(context) {
    context.openGroup("vexml-chord-diagram");
    try {
      const { chord, position, positionText, barres, tuning } = this;
      const { spacing, fretSpacing, originX, originY } = this;
      const overhang = fretSpacing * 0.4;
      const topOverhang = position > 1 ? overhang : 0;
      const hasMarkers = chord.some(([, fret]) => fret === "x" && this.unplayed !== "" || fret === 0);
      if (this.title) {
        const size = this.titleSize;
        const topY = hasMarkers ? this.y - size * 1.4 : originY - topOverhang - fretSpacing * 0.5 - size * 0.73;
        this.titleText(context, this.x + this.style.width / 2, topY, this.title, size);
        const titleTop = topY + size * 0.73 - size;
        this.drawnTop = Math.min(titleTop, originY - topOverhang);
      } else {
        this.drawnTop = originY - topOverhang;
      }
      if (position <= 1) {
        const w = spacing * (this.stringCount - 1) + this.style.strokeWidth;
        context.save();
        context.setFillStyle(this.style.color);
        context.fillRect(originX - this.style.strokeWidth / 2, originY - this.bridgeWidth, w, this.bridgeWidth);
        context.restore();
      } else {
        this.text(context, originX - spacing / 2 - spacing * 0.45, originY + fretSpacing * positionText, String(position), this.fontSize);
      }
      for (let i = 0;i < this.stringCount; i += 1) {
        this.line(context, originX + spacing * i, originY - topOverhang, originX + spacing * i, originY + fretSpacing * this.fretCount + overhang);
      }
      for (let i = 0;i < this.fretCount + 1; i += 1) {
        this.line(context, originX, originY + fretSpacing * i, originX + spacing * (this.stringCount - 1), originY + fretSpacing * i);
      }
      if (this.style.showTuning && tuning.length > 0) {
        for (let i = 0;i < Math.min(this.stringCount, tuning.length); i += 1) {
          this.text(context, originX + spacing * i, originY + this.fretCount * fretSpacing + fretSpacing / 2, tuning[i] ?? "", this.fontSize);
        }
      }
      for (const [string, fret] of chord) {
        this.lightUp(context, string, fret, position, positionText);
      }
      for (const barre of barres) {
        this.lightBar(context, barre, position, positionText);
      }
    } finally {
      context.closeGroup();
    }
  }
  lightUp(context, string, fret, position, positionText) {
    const stringNum = this.stringCount - string;
    const shift = position === 1 && positionText === 1 ? positionText : 0;
    const mute = fret === "x";
    const fretNum = mute ? 0 : fret - shift;
    const x = this.originX + this.spacing * stringNum;
    let y = this.originY + this.fretSpacing * fretNum;
    if (fretNum === 0) {
      y -= this.bridgeWidth;
    }
    if (mute) {
      if (this.unplayed !== "") {
        this.text(context, x, y - this.fretSpacing, this.unplayed, this.fontSize);
      }
      return;
    }
    const cy = y - this.fretSpacing / 2;
    context.save();
    context.setLineWidth(this.style.strokeWidth);
    context.setStrokeStyle(this.style.color);
    context.setFillStyle(fretNum > 0 ? this.style.color : this.style.bgColor);
    context.beginPath();
    context.arc(x, cy, this.circleRadius, 0, Math.PI * 2, false);
    context.fill();
    context.stroke();
    context.restore();
  }
  lightBar(context, barre, position, positionText) {
    let fretNum = barre.fret;
    if (position === 1 && positionText === 1) {
      fretNum -= positionText;
    }
    const fromNum = this.stringCount - barre.fromString;
    const toNum = this.stringCount - barre.toString;
    const x = this.originX + this.spacing * fromNum - this.barShiftX;
    const xTo = this.originX + this.spacing * toNum + this.barShiftX;
    const y = this.originY + this.fretSpacing * (fretNum - 1) + this.fretSpacing / 4;
    const yTo = this.originY + this.fretSpacing * (fretNum - 1) + this.fretSpacing / 4 * 3;
    context.save();
    context.setFillStyle(this.style.color);
    context.fillRect(x, y, xTo - x, yTo - y);
    context.restore();
  }
  line(context, x1, y1, x2, y2) {
    context.save();
    context.setLineWidth(this.style.strokeWidth);
    context.setStrokeStyle(this.style.color);
    context.beginPath();
    context.moveTo(x1, y1);
    context.lineTo(x2, y2);
    context.stroke();
    context.restore();
  }
  text(context, x, topY, msg, size) {
    context.save();
    context.setFont(this.style.fontFamily, size);
    context.setFillStyle(this.style.color);
    const w = context.measureText(msg).width;
    context.fillText(msg, x - w / 2, topY + size * 0.73);
    context.restore();
  }
  titleText(context, centerX, topY, msg, size) {
    const accSize = size - 2;
    const kern = size * 0.18;
    const chars = [...msg];
    const fontFor = (ch) => context.setFont(this.style.fontFamily, HARMONY_ACCIDENTALS.has(ch) ? accSize : size);
    context.save();
    context.setFillStyle(this.style.color);
    let total = 0;
    for (const ch of chars) {
      fontFor(ch);
      total += context.measureText(ch).width - (HARMONY_ACCIDENTALS.has(ch) ? kern * 2 : 0);
    }
    const baseline = topY + size * 0.73;
    let x = centerX - total / 2;
    for (const ch of chars) {
      const acc = HARMONY_ACCIDENTALS.has(ch);
      fontFor(ch);
      if (acc) {
        x -= kern;
      }
      context.fillText(ch, x, baseline);
      x += context.measureText(ch).width;
      if (acc) {
        x -= kern;
      }
    }
    context.restore();
  }
}

// formatted-text.ts
import { Element as Element4 } from "vexflow/core";
class FormattedText {
  context;
  text;
  style;
  w;
  h;
  boxW;
  boxH;
  textW;
  inkLeft;
  innerH;
  enclosure;
  constructor(context, text, style) {
    this.context = context;
    this.text = text;
    this.style = style;
    this.textW = context.measureText(text).width;
    this.inkLeft = 0;
    if (style.enclosure) {
      const { family, size, weight, fontStyle } = style.font;
      const ink = new Element4().setFont(family, size, weight, fontStyle).setText(text).getTextMetrics();
      this.inkLeft = Math.max(ink.actualBoundingBoxLeft, 0);
      this.textW = Math.max(this.textW, ink.actualBoundingBoxRight) + this.inkLeft;
    }
    const underline = style.underline ?? 0;
    this.innerH = style.textHeight + (underline > 0 ? UNDERLINE_OFFSET + (underline - 1) * UNDERLINE_GAP : 0);
    this.enclosure = style.enclosure ? new TextEnclosure(style.enclosure, style.padding ?? 0) : null;
    const size = this.enclosure ? this.enclosure.size(this.textW, this.innerH) : { w: this.textW, h: this.innerH };
    this.boxW = size.w;
    this.boxH = size.h;
    const radians = this.radians();
    const cos = Math.abs(Math.cos(radians));
    const sin = Math.abs(Math.sin(radians));
    this.w = size.w * cos + size.h * sin;
    this.h = size.w * sin + size.h * cos;
  }
  topAt(anchorY, align) {
    const origin = new Rect2(0, 0, this.boxW, this.boxH);
    const inner = this.enclosure ? this.enclosure.textBox(origin, this.textW, this.innerH) : origin;
    const baseline = this.baselineIn(inner);
    if (align === "baseline") {
      return anchorY - baseline;
    }
    const { family, size, weight, fontStyle } = this.style.font;
    const ink = new Element4().setFont(family, size, weight, fontStyle).setText(this.text).getTextMetrics();
    const top = baseline - ink.actualBoundingBoxAscent;
    const bottom = baseline + ink.actualBoundingBoxDescent;
    if (align === "top") {
      return anchorY - top;
    }
    if (align === "bottom") {
      return anchorY - bottom;
    }
    return anchorY - (top + bottom) / 2;
  }
  baselineIn(inner) {
    if (this.style.hangs) {
      return inner.y;
    }
    return inner.y + this.style.textHeight * (this.enclosure ? ENCLOSED_BASELINE : 1);
  }
  radians() {
    return (this.style.rotation ?? 0) * Math.PI / 180;
  }
  draw(placed) {
    const canvas = this.context.context2D;
    if (!this.style.rotation || !canvas?.rotate) {
      this.drawUpright(placed);
      return;
    }
    const cx = placed.x + placed.w / 2;
    const cy = placed.y + placed.h / 2;
    canvas.save();
    canvas.translate(cx, cy);
    canvas.rotate(this.radians());
    canvas.translate(-cx, -cy);
    this.drawUpright(new Rect2(cx - this.boxW / 2, cy - this.boxH / 2, this.boxW, this.boxH));
    canvas.restore();
  }
  drawUpright(placed) {
    const inner = this.enclosure ? this.enclosure.textBox(placed, this.textW, this.innerH) : new Rect2(placed.x, placed.y, this.textW, this.innerH);
    const { textHeight } = this.style;
    const textBottom = inner.y + textHeight;
    const baseline = this.baselineIn(inner);
    this.context.fillText(this.text, inner.x + this.inkLeft, baseline);
    const underline = this.style.underline ?? 0;
    if (underline > 0 || this.enclosure) {
      this.context.setLineWidth(1);
    }
    for (let i = 0;i < underline; i++) {
      const y = textBottom + UNDERLINE_OFFSET + i * UNDERLINE_GAP;
      this.context.beginPath();
      this.context.moveTo(inner.x, y);
      this.context.lineTo(inner.right, y);
      this.context.stroke();
    }
    if (this.enclosure && this.style.enclosureWidth) {
      this.context.setLineWidth(this.style.enclosureWidth);
    }
    this.enclosure?.draw(this.context, placed);
  }
}

// metronome-glyph.ts
import { Element as Element5 } from "vexflow/core";

class MetronomeGlyph {
  width;
  ascent;
  descent;
  placed = [];
  bars = [];
  curves = [];
  arrows = [];
  x = 0;
  top;
  noteAscent;
  beamThickness;
  stemWidth;
  glyph = new Element5("StaveTempo.glyph");
  text = new Element5("StaveTempo");
  constructor(modulation) {
    this.glyph.setText(BEAMED_GLYPH);
    this.noteAscent = this.glyph.getTextMetrics().actualBoundingBoxAscent;
    this.descent = this.glyph.getTextMetrics().actualBoundingBoxDescent;
    this.beamThickness = this.noteAscent * BEAM_THICKNESS;
    this.stemWidth = this.noteAscent * STEM_WIDTH;
    this.top = -this.noteAscent;
    if (modulation.arrows) {
      this.putArrow(-1);
      this.x += GAP2;
    }
    if (modulation.parenthesis) {
      this.putText("(");
      this.x += GAP2;
    }
    this.putGroup(modulation.left);
    this.x += GAP2;
    this.putText("=");
    this.x += GAP2;
    if (modulation.rate !== null) {
      this.putText(modulation.rate);
    } else {
      this.putGroup(modulation.right);
    }
    if (modulation.parenthesis) {
      this.x += GAP2;
      this.putText(")");
    }
    if (modulation.arrows) {
      this.x += GAP2;
      this.putArrow(1);
    }
    this.width = this.x;
    this.ascent = -this.top;
  }
  putGlyph(content, y) {
    this.glyph.setText(content);
    this.placed.push({
      kind: "glyph",
      text: content,
      x: this.x,
      y,
      size: null
    });
    this.x += this.glyph.getWidth();
  }
  putText(content) {
    this.text.setText(content);
    this.placed.push({
      kind: "text",
      text: content,
      x: this.x,
      y: 0,
      size: null
    });
    this.x += this.text.getWidth();
  }
  putGroup(notes) {
    const spans = [];
    for (const [i, note] of notes.entries()) {
      if (i > 0) {
        this.x += notes[i - 1]?.tiesToNext ? TIE_GAP : GAP2;
      }
      const left = this.x;
      this.putGlyph(note.beamed ? BEAMED_GLYPH : NOTE_GLYPHS[note.type] ?? BEAMED_GLYPH, 0);
      for (let dot = 0;dot < note.dots; dot++) {
        this.x += GAP2;
        this.putGlyph(DOT_GLYPH, 2);
      }
      spans.push({ left, right: this.x });
    }
    this.putBeams(notes, spans);
    this.putBrackets(notes, spans);
    this.putTies(notes, spans);
  }
  putArrow(direction) {
    this.arrows.push({
      x: this.x,
      y: -this.noteAscent * ARROW_RISE,
      direction
    });
    this.x += this.noteAscent * ARROW_LENGTH;
  }
  putTies(notes, spans) {
    for (const [i, note] of notes.entries()) {
      const from = spans[i];
      const to = spans[i + 1];
      if (!note.tiesToNext || !from || !to) {
        continue;
      }
      this.curves.push({
        x1: from.left + this.noteAscent * TIE_INSET,
        x2: to.left + this.noteAscent * TIE_INSET,
        y: this.descent * 0.8,
        bow: this.noteAscent * TIE_BOW
      });
    }
  }
  putBeams(notes, spans) {
    for (const [i, note] of notes.entries()) {
      const from = spans[i];
      const to = spans[i + 1];
      if (!from || !to) {
        continue;
      }
      for (let level = 0;level < note.beamsToNext; level++) {
        this.bars.push({
          x: from.right - this.stemWidth,
          y: -this.noteAscent + level * this.beamThickness * (1 + BEAM_SPACING),
          width: to.right - from.right + this.stemWidth,
          height: this.beamThickness
        });
      }
    }
  }
  putBrackets(notes, spans) {
    for (const [i, note] of notes.entries()) {
      if (note.tuplet?.type !== "start") {
        continue;
      }
      const close = notes.findIndex((other, j) => j > i && other.tuplet?.type === "stop");
      const from = spans[i];
      const to = (close === -1 ? spans.at(-1) : spans[close]) ?? from;
      if (!from || !to) {
        continue;
      }
      const label = String(note.tuplet.actual);
      const size = this.noteAscent * BRACKET_NUMBER_SIZE;
      const sized = new Element5("StaveTempo");
      sized.setFontSize(size);
      sized.setText(label);
      const labelWidth = sized.getWidth();
      const y = -this.noteAscent * (1 + BRACKET_GAP);
      const leg = this.noteAscent * BRACKET_LEG;
      const center = (from.left + to.right) / 2;
      const breakFrom = center - labelWidth / 2 - GAP2;
      const breakTo = center + labelWidth / 2 + GAP2;
      this.bars.push({
        x: from.left,
        y,
        width: breakFrom - from.left,
        height: this.beamThickness
      }, {
        x: breakTo,
        y,
        width: to.right - breakTo,
        height: this.beamThickness
      }, { x: from.left, y, width: this.beamThickness, height: leg }, {
        x: to.right - this.beamThickness,
        y,
        width: this.beamThickness,
        height: leg
      });
      this.placed.push({
        kind: "text",
        text: label,
        x: center - labelWidth / 2,
        y: y + this.beamThickness,
        size
      });
      this.top = Math.min(this.top, y - sized.getTextMetrics().actualBoundingBoxAscent);
    }
  }
  draw(context, x, baseline) {
    for (const item of this.placed) {
      const el = new Element5(item.kind === "glyph" ? "StaveTempo.glyph" : "StaveTempo");
      if (item.size !== null) {
        el.setFontSize(item.size);
      }
      el.setText(item.text);
      el.renderText(context, x + item.x, baseline + item.y);
    }
    for (const bar of this.bars) {
      context.fillRect(x + bar.x, baseline + bar.y, bar.width, bar.height);
    }
    for (const tie of this.curves) {
      const mid = x + (tie.x1 + tie.x2) / 2;
      const y = baseline + tie.y;
      context.beginPath();
      context.moveTo(x + tie.x1, y);
      context.quadraticCurveTo(mid, y + tie.bow * 2, x + tie.x2, y);
      context.quadraticCurveTo(mid, y + tie.bow * 2 - this.beamThickness * 2, x + tie.x1, y);
      context.closePath();
      context.fill();
    }
    for (const arrow of this.arrows) {
      this.drawArrow(context, x + arrow.x, baseline + arrow.y, arrow.direction);
    }
  }
  drawArrow(context, x, y, direction) {
    const length = this.noteAscent * ARROW_LENGTH;
    const head = this.noteAscent * ARROW_HEAD;
    const tip = direction === 1 ? x + length : x;
    const back = tip - direction * head;
    context.fillRect(direction === 1 ? x : back, y - this.beamThickness / 2, length - head, this.beamThickness);
    context.beginPath();
    context.moveTo(tip, y);
    context.lineTo(back, y - head / 2);
    context.lineTo(back, y + head / 2);
    context.closePath();
    context.fill();
  }
}
var NOTE_GLYPHS = {
  breve: "",
  whole: "",
  half: "",
  quarter: "",
  eighth: "",
  "16th": "",
  "32nd": "",
  "64th": "",
  "128th": ""
};
var BEAMED_GLYPH = "";
var DOT_GLYPH = "";
var GAP2 = 3;
var BEAM_THICKNESS = 0.09;
var STEM_WIDTH = 0.03;
var BEAM_SPACING = 0.75;
var BRACKET_GAP = 0.16;
var BRACKET_LEG = 0.14;
var BRACKET_NUMBER_SIZE = 0.36;
var ARROW_LENGTH = 1;
var ARROW_HEAD = 0.4;
var ARROW_RISE = 0.25;
var TIE_INSET = 0.1;
var TIE_BOW = 0.22;
var TIE_GAP = 9;

// direction-placer.ts
class DirectionPlacer {
  context;
  reader;
  collisionResolver;
  geometry;
  spill;
  reporter;
  labelFont;
  documentFonts;
  documentPositions;
  notationFont;
  notationColor;
  textColor;
  scratchViewport;
  appearance;
  enclosureWidth;
  soundingDynamic = new Map;
  belowWords = new Map;
  placedDynamics = new Map;
  dynamics = new DynamicGlyphs;
  constructor(context, reader, collisionResolver, geometry, spill, reporter, opts) {
    this.context = context;
    this.reader = reader;
    this.collisionResolver = collisionResolver;
    this.geometry = geometry;
    this.spill = spill;
    this.reporter = reporter;
    this.labelFont = opts.labelFont;
    this.documentFonts = opts.documentFonts ?? false;
    this.documentPositions = opts.documentPositions;
    this.notationFont = opts.notationFont;
    this.notationColor = opts.notationColor;
    this.textColor = opts.textColor;
    this.scratchViewport = opts.scratchViewport;
    this.appearance = opts.appearance ?? Appearance.NONE;
    this.enclosureWidth = this.appearance.lineWidth("enclosure") ?? undefined;
  }
  mark() {
    return new Map(this.soundingDynamic);
  }
  rewind(mark) {
    this.soundingDynamic.clear();
    for (const [key, value] of mark) {
      this.soundingDynamic.set(key, value);
    }
  }
  suppressesDynamic(key, text, measureIndex) {
    if (!SUSTAINED_DYNAMIC.test(text)) {
      return false;
    }
    const sounding = this.soundingDynamic.get(key);
    const redundant = sounding?.text === text && measureIndex - sounding.measure <= DYNAMIC_RESTATE_GAP;
    this.soundingDynamic.set(key, { text, measure: measureIndex });
    return redundant;
  }
  dynamicsOn(stave) {
    return this.placedDynamics.get(stave) ?? [];
  }
  belowWordsOn(stave) {
    return this.belowWords.get(stave) ?? [];
  }
  placeColumn(column) {
    for (const w of column.words) {
      const placement = this.sideOf(w.placement, w.position);
      const placed = this.drawWords(w.stave, w.text, this.wordsAnchor(w), placement, w.glyph ? {
        font: this.notationFont,
        size: NAVIGATION_FONT_SIZE,
        italic: false,
        color: this.notationColor,
        align: w.format?.align ?? this.wordsAlign(w),
        clearsHairpins: true,
        position: w.position
      } : {
        font: this.faceOf(w.format),
        size: WORDS_FONT_SIZE * (w.format?.scale ?? 1),
        italic: w.format?.italic ?? false,
        bold: w.format?.bold ?? false,
        align: w.format?.align ?? this.wordsAlign(w),
        clearsHairpins: true,
        position: w.position,
        ...this.decorationOf(w.format)
      });
      if (placement === "below") {
        const placedOnStave = this.belowWords.get(w.stave);
        if (placedOnStave) {
          placedOnStave.push(placed);
        } else {
          this.belowWords.set(w.stave, [placed]);
        }
      } else {
        this.reporter.growPageTop(placed.y);
        this.spill.growDecorationTop(column.systemIndex, placed.y);
      }
    }
    for (const sym of column.symbols) {
      const placed = this.drawWords(sym.stave, sym.glyph, sym.anchor, sym.placement, {
        font: this.notationFont,
        size: DYNAMICS_FONT_SIZE,
        italic: false,
        color: this.notationColor,
        align: "center"
      });
      if (sym.placement !== "below") {
        this.reporter.growPageTop(placed.y);
        this.spill.growDecorationTop(column.systemIndex, placed.y);
      }
    }
    for (const d of column.dynamics) {
      const placement = this.sideOf(d.placement, d.position);
      const placed = this.drawWords(d.stave, d.glyph ? this.dynamics.spell(d.text) : d.text, d.anchor, placement, d.glyph ? {
        font: this.notationFont,
        size: DYNAMICS_FONT_SIZE * (d.format?.scale ?? 1),
        italic: false,
        color: this.notationColor,
        align: "center",
        position: d.position,
        ...this.decorationOf(d.format)
      } : {
        font: this.faceOf(d.format),
        size: WORDS_FONT_SIZE * (d.format?.scale ?? 1),
        italic: d.format?.italic ?? true,
        bold: d.format?.bold ?? false,
        align: "center",
        position: d.position,
        ...this.decorationOf(d.format)
      });
      const onStave = this.placedDynamics.get(d.stave);
      if (onStave) {
        onStave.push(placed);
      } else {
        this.placedDynamics.set(d.stave, [placed]);
      }
      if (placement !== "below") {
        this.reporter.growPageTop(placed.y);
        this.spill.growDecorationTop(column.systemIndex, placed.y);
      }
    }
    for (const h of column.harpPedals) {
      const placement = this.sideOf(h.placement, h.position);
      const placed = this.drawWords(h.stave, h.glyphs, h.anchor, placement, {
        font: this.notationFont,
        size: DYNAMICS_FONT_SIZE,
        italic: false,
        color: this.notationColor,
        align: "center",
        position: h.position
      });
      if (placement !== "below") {
        this.reporter.growPageTop(placed.y);
        this.spill.growDecorationTop(column.systemIndex, placed.y);
      }
    }
    for (const pictogram of column.pictograms) {
      const placed = this.drawPictogram(pictogram);
      if (pictogram.placement !== "below") {
        this.reporter.growPageTop(placed.y);
        this.spill.growDecorationTop(column.systemIndex, placed.y);
      }
    }
    for (const f of column.figuredBasses) {
      for (const [i, figure] of f.figures.entries()) {
        this.drawWords(f.stave, figure, f.anchor, "below", {
          font: this.labelFont,
          size: WORDS_FONT_SIZE,
          italic: false,
          align: "center",
          position: i === 0 ? f.position : null
        });
      }
    }
    let pending = column.harmonies.filter((h) => h.frame).length;
    for (const h of column.harmonies) {
      const stave = h.frame ? h.staveNote.getStave() : null;
      if (h.frame && stave) {
        pending--;
        const doc = this.followed(h.framePosition);
        const harmonyDoc = this.followed(h.position);
        const pinned = this.pins(doc ?? harmonyDoc);
        const top = this.baselineOf(stave, stave.getYForLine(0) - CHORD_DIAGRAM_GAP - CHORD_DIAGRAM_HEIGHT, doc);
        const anchor = this.xOf(stave, h.staveNote.getAbsoluteX(), harmonyDoc);
        const frets = [
          ...h.frame.chord.map(([, f]) => typeof f === "number" ? f : 0),
          ...(h.frame.barres ?? []).map((b) => b.fret)
        ];
        const natural = new Rect2(anchor + (doc?.x ?? 0) + (doc?.dx ?? 0), top, CHORD_DIAGRAM_WIDTH, CHORD_DIAGRAM_HEIGHT);
        const band = this.reporter.rowOf(stave);
        const lift = (box) => this.collisionResolver.liftClear(new Rect2(box.x, box.y, box.w, CHORD_DIAGRAM_HEIGHT + CHORD_DIAGRAM_PADDING), CHORD_DIAGRAM_GAP, { kinds: TEXT_CLEAR_KINDS, band });
        const unpad = (box) => new Rect2(box.x, box.y, CHORD_DIAGRAM_WIDTH, CHORD_DIAGRAM_HEIGHT);
        const lifted = unpad(lift(natural));
        const clamped = this.collisionResolver.nudgeInsideX(lifted, new Rect2(this.scratchViewport.x, this.scratchViewport.y, this.scratchViewport.w - pending * (CHORD_DIAGRAM_WIDTH + CHORD_DIAGRAM_GAP), this.scratchViewport.h), PAGE_MARGIN_X);
        const spaced = this.collisionResolver.pushRightOf(clamped, "diagram", CHORD_DIAGRAM_GAP);
        let placed = spaced.x === lifted.x ? lifted : unpad(lift(spaced));
        if (pinned) {
          placed = natural;
        }
        const diagram = new ChordDiagramGlyph(placed.x, placed.y, {
          ...h.frame,
          title: h.text || undefined,
          width: CHORD_DIAGRAM_WIDTH,
          height: CHORD_DIAGRAM_HEIGHT,
          stringCount: h.frame.chord.length,
          fretCount: Math.max(h.frame.fretCount ?? 4, ...frets),
          showTuning: false,
          fontFamily: this.labelFont,
          color: this.notationColor
        });
        this.collisionResolver.add({
          rect: new Rect2(placed.x, diagram.top, placed.w, placed.bottom - diagram.top),
          kind: "diagram",
          band: this.reporter.rowOf(stave)
        });
        diagram.draw(this.context);
        this.reporter.growPageTop(diagram.top);
        this.reporter.recordAnnotationSpill(stave, new Rect2(placed.x, diagram.top, placed.w, placed.bottom - diagram.top));
        this.spill.growHighestTop(column.systemIndex, diagram.top);
        this.geometry.addChordDiagram({
          rect: new Rect2(placed.x, diagram.top, placed.w, placed.bottom - diagram.top),
          harmonySource: h.source,
          measureIndex: column.measureIndex,
          frame: h.frame,
          title: h.text || null
        });
      } else {
        const placement = this.sideOf(h.placement, h.position);
        const top = this.drawHarmony(h.staveNote, h.symbol, placement, h.position);
        if (placement !== "below") {
          this.reporter.growPageTop(top);
          this.spill.growDecorationTop(column.systemIndex, top);
        }
      }
    }
    for (const t of column.tempos) {
      const top = this.drawTempo(t.stave, t);
      this.reporter.growPageTop(top);
      this.spill.growDecorationTop(column.systemIndex, top);
    }
    for (const { stave, fret } of column.capos) {
      const placed = this.drawWords(stave, `Capo ${fret}`, stave.getX(), "above", { font: this.labelFont, size: WORDS_FONT_SIZE, italic: false });
      this.reporter.growPageTop(placed.y);
      this.spill.growDecorationTop(column.systemIndex, placed.y);
    }
    const topStave = column.topStave;
    const measure = column.measure;
    if (topStave && measure) {
      for (const { kind, position } of this.reader.navigationsOf(measure)) {
        const placed = this.drawWords(topStave, NAVIGATION_GLYPHS[kind], topStave.getX(), "above", {
          font: this.notationFont,
          size: NAVIGATION_FONT_SIZE,
          italic: false,
          color: this.notationColor,
          sideGap: NAVIGATION_TEXT_GAP,
          position
        });
        this.reporter.growPageTop(placed.y);
        this.spill.growDecorationTop(column.systemIndex, placed.y);
      }
    }
    const timesLabel = column.repeatTimesLabel;
    if (topStave && timesLabel) {
      const placed = this.drawWords(topStave, timesLabel, topStave.getX() + topStave.getWidth(), "above", {
        font: this.labelFont,
        size: WORDS_FONT_SIZE,
        italic: false,
        align: "right"
      });
      this.reporter.growPageTop(placed.y);
      this.spill.growDecorationTop(column.systemIndex, placed.y);
    }
    for (const f of column.fermatas) {
      this.drawBarlineFermata(f, column.systemIndex);
    }
    if (topStave && measure) {
      for (const { text, format, position } of this.reader.rehearsalsOf(measure)) {
        const top = this.drawRehearsal(topStave, text, { format, position });
        this.reporter.growPageTop(top);
        this.spill.growDecorationTop(column.systemIndex, top);
      }
    }
  }
  drawBarlineFermata(f, systemIndex) {
    this.context.openGroup("vexml-fermata");
    try {
      const faces = FERMATA_GLYPHS[f.shape] ?? NORMAL_FERMATA_GLYPHS;
      const x = f.location === "right" ? f.stave.getX() + f.stave.getWidth() : f.stave.getX();
      const placed = this.drawWords(f.stave, faces[f.inverted ? 1 : 0], x, f.inverted ? "below" : "above", {
        font: this.notationFont,
        size: BARLINE_FERMATA_FONT_SIZE,
        italic: false,
        color: this.notationColor,
        align: "center",
        inkHeight: BARLINE_FERMATA_INK_HEIGHT,
        hangs: f.inverted
      });
      if (!f.inverted) {
        this.reporter.growPageTop(placed.y);
        this.spill.growDecorationTop(systemIndex, placed.y);
      }
    } finally {
      this.context.closeGroup();
    }
  }
  drawRehearsal(stave, text, opts = {}) {
    const { format, position } = opts;
    this.context.openGroup("vexml-rehearsal");
    try {
      const size = REHEARSAL_FONT_SIZE * (format?.scale ?? 1);
      this.context.save();
      const font = {
        family: this.faceOf(format),
        size,
        weight: format?.bold ?? true ? "bold" : "normal",
        fontStyle: format?.italic ? "italic" : "normal"
      };
      this.context.setFont(font.family, font.size, font.weight, font.fontStyle);
      this.context.setFillStyle(this.textColor);
      this.context.setStrokeStyle(this.textColor);
      const enclosure = format?.enclosure ?? "rectangle";
      const formatted = new FormattedText(this.context, text, {
        font,
        textHeight: size,
        underline: format?.underline,
        rotation: format?.rotation,
        enclosure: enclosure === "none" ? undefined : enclosure,
        padding: REHEARSAL_PADDING,
        enclosureWidth: this.enclosureWidth
      });
      const doc = this.followed(position);
      const x = this.xOf(stave, stave.getX(), doc) - alignOffsetOf(format?.align, formatted.w);
      const bottom = doc?.y === null || doc?.y === undefined ? stave.getYForLine(0) - REHEARSAL_Y_OFFSET - (doc?.dy ?? 0) : this.baselineOf(stave, 0, doc) + (enclosure === "none" ? 0 : REHEARSAL_PADDING);
      const top = doc?.y != null && format?.valign ? formatted.topAt(this.baselineOf(stave, 0, doc), format.valign) : bottom - formatted.h;
      const natural = new Rect2(x, top, formatted.w, formatted.h);
      const band = this.reporter.rowOf(stave);
      const placed = this.collisionResolver.nudgeInsideX(this.pins(doc) ? natural : this.collisionResolver.liftClear(natural, REHEARSAL_NOTE_CLEARANCE, {
        kinds: TEXT_CLEAR_KINDS,
        band
      }), this.scratchViewport, PAGE_MARGIN_X);
      this.reporter.recordAnnotationSpill(stave, placed);
      formatted.draw(placed);
      this.context.restore();
      this.collisionResolver.add({ rect: placed, kind: "annotation", band });
      return placed.y;
    } finally {
      this.context.closeGroup();
    }
  }
  tempoLayout(task, x, baseline) {
    const tempo = task.tempo;
    const glyph = new Element6("StaveTempo.glyph").setText("");
    const dot = new Element6("StaveTempo.glyph").setText("");
    const text = new Element6("StaveTempo");
    const ink = glyph.getTextMetrics();
    let w = 0;
    let ascent = ink.actualBoundingBoxAscent;
    let descent = ink.actualBoundingBoxDescent;
    if (tempo) {
      const advance = (el) => el.getWidth() + 3;
      w += tempo.parenthesis ? advance(text.setText("(")) : 0;
      w += advance(glyph) + (tempo.dots ?? 0) * advance(dot);
      w += advance(text.setText("="));
      w += tempo.duration2 ? advance(glyph) + (tempo.dots2 ?? 0) * advance(dot) : advance(text.setText(String(tempo.bpm)));
      if (tempo.parenthesis) {
        w += text.setText(")").getWidth();
      }
    }
    const markWidth = w;
    for (const [i, modulation] of task.modulations.entries()) {
      const group = new MetronomeGlyph(modulation);
      w += (tempo || i > 0 ? TEMPO_MARK_GAP : 0) + group.width;
      ascent = Math.max(ascent, group.ascent);
      descent = Math.max(descent, group.descent);
    }
    return {
      rect: new Rect2(x, baseline - ascent * TEMPO_SCALE, w * TEMPO_SCALE, (ascent + descent) * TEMPO_SCALE),
      markWidth: markWidth + (tempo ? TEMPO_MARK_GAP : 0)
    };
  }
  drawTempo(stave, task) {
    this.context.openGroup("vexml-tempo");
    try {
      const doc = this.followed(task.position);
      const baseY = this.baselineOf(stave, stave.getYForTopText(1), doc);
      const position = 0;
      const shiftX = stave.getModifierXShift(position);
      const anchorX = stave.getX() + shiftX + 10;
      const free = stave.getX() + stave.getWidth() - 10 - anchorX - this.tempoLayout(task, anchorX, baseY).rect.w;
      const targetX = this.xOf(stave, anchorX + Math.max(0, alignOffsetOf(task.justify, free)), doc);
      const band = this.reporter.rowOf(stave);
      const { rect: natural, markWidth } = this.tempoLayout(task, targetX, baseY);
      const placed = this.pins(doc) ? natural : this.collisionResolver.liftClear(natural, TEMPO_NOTE_CLEARANCE, {
        kinds: TEXT_CLEAR_KINDS,
        band
      });
      const shiftY = placed.y - natural.y;
      this.reporter.recordAnnotationSpill(stave, placed);
      this.context.save();
      this.context.scale(TEMPO_SCALE, TEMPO_SCALE);
      let cursor = targetX / TEMPO_SCALE;
      const tempo = task.tempo;
      if (tempo) {
        new StaveTempo({
          duration: tempo.duration,
          dots: tempo.dots,
          bpm: tempo.bpm,
          duration2: tempo.duration2 ?? undefined,
          dots2: tempo.dots2,
          parenthesis: tempo.parenthesis
        }, cursor - shiftX - 10, (baseY + shiftY) / TEMPO_SCALE - stave.getYForTopText(1)).setStave(stave).setPosition(position).setContext(this.context).draw();
        cursor += markWidth;
      }
      for (const modulation of task.modulations) {
        const group = new MetronomeGlyph(modulation);
        group.draw(this.context, cursor, (baseY + shiftY) / TEMPO_SCALE);
        cursor += group.width + TEMPO_MARK_GAP;
      }
      this.context.restore();
      this.collisionResolver.add({ rect: placed, kind: "annotation", band });
      return placed.y;
    } finally {
      this.context.closeGroup();
    }
  }
  harmonyRun(text, x, y, size, draw) {
    const scale = size / HARMONY_FONT_SIZE;
    const kern = HARMONY_ACCIDENTAL_KERN * scale;
    const accidentalSize = HARMONY_ACCIDENTAL_FONT_SIZE * scale;
    let cursor = x;
    for (const ch of text) {
      const accidental = HARMONY_ACCIDENTALS.has(ch);
      this.context.setFont(this.labelFont, accidental ? accidentalSize : size);
      if (accidental) {
        cursor -= kern;
      }
      if (draw) {
        this.context.fillText(ch, cursor, y);
      }
      cursor += this.context.measureText(ch).width - (accidental ? kern : 0);
    }
    return cursor - x;
  }
  harmonyLayout(symbol, x, y, draw) {
    const stackHeight = symbol.stack.length === 0 ? 0 : (symbol.stack.length - 1) * HARMONY_STACK_LINE + HARMONY_STACK_FONT_SIZE;
    const stackBase = symbol.hang ? y - HARMONY_FONT_SIZE + stackHeight : y;
    let cursor = x + this.harmonyRun(symbol.head, x, y, HARMONY_FONT_SIZE, draw);
    let column = 0;
    symbol.stack.forEach((row, i) => {
      column = Math.max(column, this.harmonyRun(row, cursor, stackBase - i * HARMONY_STACK_LINE, HARMONY_STACK_FONT_SIZE, draw));
    });
    cursor += column;
    cursor += this.harmonyRun(symbol.tail, cursor, y, HARMONY_FONT_SIZE, draw);
    return {
      width: cursor - x,
      height: Math.max(HARMONY_FONT_SIZE, y - stackBase + stackHeight),
      depth: Math.max(0, stackBase - y)
    };
  }
  drawHarmony(staveNote, symbol, placement, position) {
    this.context.openGroup("vexml-harmony");
    try {
      const stave = staveNote.getStave();
      if (!stave) {
        return Infinity;
      }
      const below = placement === "below";
      const doc = this.followed(position);
      const x = this.xOf(stave, staveNote.getAbsoluteX(), doc);
      this.context.save();
      this.context.setFillStyle(this.textColor);
      const { width, height, depth } = this.harmonyLayout(symbol, x, 0, false);
      const band = this.reporter.rowOf(stave);
      let placed;
      if (below) {
        const baseline = this.baselineOf(stave, stave.getBottomLineY() + WORDS_Y_OFFSET + height, doc);
        const natural = new Rect2(x, baseline - height, width, height + depth);
        placed = this.pins(doc) ? natural : this.collisionResolver.dropClear(natural, WORDS_NOTE_CLEARANCE, {
          kinds: TEXT_CLEAR_KINDS,
          band
        });
        this.reporter.recordAnnotationDrop(stave, placed);
        this.harmonyLayout(symbol, placed.x, placed.y + height, true);
      } else {
        const baseY = this.baselineOf(stave, stave.getYForLine(0) - HARMONY_Y_OFFSET, doc);
        const natural = new Rect2(x, baseY - height, width, height + depth + HARMONY_PADDING);
        placed = this.pins(doc) ? natural : this.collisionResolver.liftClear(natural, HARMONY_NOTE_CLEARANCE, {
          kinds: TEXT_CLEAR_KINDS,
          band
        });
        this.reporter.recordAnnotationSpill(stave, placed);
        this.harmonyLayout(symbol, placed.x, placed.bottom - HARMONY_PADDING - depth, true);
      }
      this.context.restore();
      this.collisionResolver.add({ rect: placed, kind: "annotation", band });
      return placed.y;
    } finally {
      this.context.closeGroup();
    }
  }
  wordsAnchor(task) {
    const { anchor, stave } = task;
    if (task.directive) {
      return this.directiveX(stave);
    }
    if (task.closesBar) {
      return stave.getX() + stave.getWidth();
    }
    return task.opensBar && anchor?.isCenterAligned() ? stave.getNoteStartX() : anchor;
  }
  directiveX(stave) {
    const timeSignature = stave.getModifiers().find((m) => m.getCategory() === TimeSignature.CATEGORY);
    return timeSignature ? stave.getX() + timeSignature.getX() : stave.getNoteStartX();
  }
  wordsAlign(task) {
    if (task.closesBar) {
      return "right";
    }
    return task.anchor instanceof TabNote ? "center" : "left";
  }
  faceOf(format) {
    return this.documentFonts ? FontFamilies.documentStack(format?.family ?? null, this.labelFont) : this.labelFont;
  }
  decorationOf(format) {
    const enclosure = format?.enclosure;
    return {
      underline: format?.underline,
      valign: format?.valign,
      rotation: format?.rotation,
      enclosure: enclosure && enclosure !== "none" ? enclosure : undefined
    };
  }
  drawWords(stave, text, anchor, placement, style) {
    this.context.openGroup("vexml-words");
    try {
      const below = placement === "below";
      const baseY = below ? stave.getBottomLineY() + WORDS_Y_OFFSET : stave.getYForLine(0) - WORDS_Y_OFFSET;
      let anchorX = typeof anchor === "number" ? anchor : anchor?.getAbsoluteX() ?? stave.getNoteStartX();
      if (anchor instanceof StaveNote4 && style.align === "center") {
        anchorX = (anchor.getNoteHeadBeginX() + anchor.getNoteHeadEndX()) / 2;
      }
      this.context.save();
      const font = {
        family: style.font,
        size: style.size,
        weight: style.bold ? "bold" : "normal",
        fontStyle: style.italic ? "italic" : "normal"
      };
      this.context.setFont(font.family, font.size, font.weight, font.fontStyle);
      this.context.setFillStyle(style.color ?? this.textColor);
      this.context.setStrokeStyle(style.color ?? this.textColor);
      const formatted = new FormattedText(this.context, text, {
        font,
        textHeight: style.inkHeight ?? style.size,
        hangs: style.hangs,
        underline: style.underline,
        rotation: style.rotation,
        enclosure: style.enclosure,
        padding: ENCLOSURE_PADDING,
        enclosureWidth: this.enclosureWidth
      });
      const { w, h } = formatted;
      const doc = this.followed(style.position);
      const top = below ? baseY : baseY - h;
      const baseline = this.baselineOf(stave, style.hangs ? top : top + h, doc);
      let textTop = style.hangs ? baseline : baseline - h;
      if (doc?.y != null && style.valign) {
        textTop = formatted.topAt(baseline, style.valign);
      }
      const natural = new Rect2(this.xOf(stave, anchorX, doc) - alignOffsetOf(style.align, w), textTop, w, h);
      const placed = this.placeBeside(stave, natural, typeof anchor !== "number" && doc?.x == null, {
        below,
        kinds: style.clearsHairpins ? WORDS_CLEAR_KINDS : TEXT_CLEAR_KINDS,
        sideGap: style.sideGap,
        pinned: this.pins(doc),
        pinnedX: this.pins(doc) && doc?.x != null
      });
      formatted.draw(placed);
      this.context.restore();
      return placed;
    } finally {
      this.context.closeGroup();
    }
  }
  xOf(stave, natural, doc) {
    return (doc?.x == null ? natural : stave.getX() + doc.x) + (doc?.dx ?? 0);
  }
  followed(position) {
    return this.documentPositions ? position ?? null : null;
  }
  pins(position) {
    return position !== null && this.documentPositions === "strict";
  }
  baselineOf(stave, natural, doc) {
    const base = doc?.y === null || doc?.y === undefined ? natural : stave.getYForLine(0) - doc.y;
    return base - (doc?.dy ?? 0);
  }
  sideOf(placement, position) {
    return this.followed(position)?.side ?? placement;
  }
  drawPictogram(task) {
    this.context.openGroup("vexml-pictogram");
    try {
      const { stave, symbol, anchor, placement } = task;
      if (symbol.kind === "text") {
        return this.drawWords(stave, symbol.text, anchor, placement, {
          font: this.labelFont,
          size: WORDS_FONT_SIZE,
          italic: false,
          clearsHairpins: true
        });
      }
      const below = placement === "below";
      const x = anchor?.getAbsoluteX() ?? stave.getNoteStartX();
      const metrics = (glyph) => new Element6().setFont(this.notationFont, PICTOGRAM_FONT_SIZE).setText(glyph).getTextMetrics();
      const ink = symbol.kind === "glyph" ? metrics(symbol.glyph) : null;
      const layers = ink && symbol.kind === "glyph" ? [{ glyph: symbol.glyph, ink, x: 0, y: 0 }] : [];
      if (ink && symbol.kind === "glyph" && symbol.enclosure) {
        const { head, tip, glyphs } = symbol.enclosure;
        const upright = metrics(head);
        const diameter = upright.actualBoundingBoxLeft + upright.actualBoundingBoxRight;
        const left = -ink.actualBoundingBoxLeft;
        const right = ink.actualBoundingBoxRight;
        const top = -ink.actualBoundingBoxAscent;
        const bottom = ink.actualBoundingBoxDescent;
        let cx = (left + right) / 2;
        if (tip === 2) {
          cx = left + diameter / 2;
        } else if (tip === 3) {
          cx = right - diameter / 2;
        }
        const cy = tip === 1 ? bottom - diameter / 2 : top + diameter / 2;
        for (const glyph of glyphs) {
          const mark = metrics(glyph);
          layers.push({
            glyph,
            ink: mark,
            x: cx - (mark.actualBoundingBoxRight - mark.actualBoundingBoxLeft) / 2,
            y: cy + (mark.actualBoundingBoxAscent - mark.actualBoundingBoxDescent) / 2
          });
        }
      }
      const left = Math.min(...layers.map((l) => l.x - l.ink.actualBoundingBoxLeft));
      const top = Math.min(...layers.map((l) => l.y - l.ink.actualBoundingBoxAscent));
      const w = ink ? Math.max(...layers.map((l) => l.x + l.ink.actualBoundingBoxRight)) - left : ACCORDION_REGISTRATION_SIZE;
      const h = ink ? Math.max(...layers.map((l) => l.y + l.ink.actualBoundingBoxDescent)) - top : ACCORDION_REGISTRATION_SIZE;
      const y = below ? stave.getBottomLineY() + WORDS_Y_OFFSET : stave.getYForLine(0) - WORDS_Y_OFFSET - h;
      const placed = this.placeBeside(stave, new Rect2(x, y, w, h), true, {
        below,
        kinds: WORDS_CLEAR_KINDS
      });
      this.context.save();
      this.context.setFillStyle(this.notationColor);
      this.context.setStrokeStyle(this.notationColor);
      if (ink && symbol.kind === "glyph") {
        this.context.setFont(this.notationFont, PICTOGRAM_FONT_SIZE);
        for (const layer of layers) {
          this.context.fillText(layer.glyph, placed.x - left + layer.x, placed.y - top + layer.y);
        }
      } else if (symbol.kind === "accordion") {
        new AccordionRegistrationGlyph(symbol, ACCORDION_REGISTRATION_SIZE).draw(this.context, placed.x, placed.y);
      }
      this.context.restore();
      return placed;
    } finally {
      this.context.closeGroup();
    }
  }
  placeBeside(stave, natural, noteAnchored, opts) {
    const { below, kinds } = opts;
    const band = this.reporter.rowOf(stave);
    let cleared = natural;
    if (!opts.pinned) {
      cleared = below ? this.collisionResolver.dropClear(natural, WORDS_NOTE_CLEARANCE, {
        kinds,
        band,
        xMargin: opts.sideGap
      }) : this.collisionResolver.liftClear(natural, WORDS_NOTE_CLEARANCE, {
        kinds,
        band,
        xMargin: opts.sideGap
      });
    }
    const bounded = noteAnchored && !opts.pinnedX ? this.collisionResolver.nudgeInsideX(cleared, new Rect2(stave.getNoteStartX(), cleared.y, this.scratchViewport.right - stave.getNoteStartX(), cleared.h), 0) : cleared;
    const stemmed = this.collisionResolver.query(bounded).some((c) => c.other.kind === "stem") ? this.collisionResolver.pushRightOf(bounded, "stem", WORDS_NOTE_CLEARANCE) : bounded;
    const placed = opts.pinnedX ? bounded : this.collisionResolver.nudgeInsideX(stemmed, this.scratchViewport, PAGE_MARGIN_X);
    if (below) {
      this.reporter.recordAnnotationDrop(stave, placed);
    } else {
      this.reporter.recordAnnotationSpill(stave, placed);
    }
    this.collisionResolver.add({ rect: placed, kind: "annotation", band });
    return placed;
  }
  drawDirectionLines(lines) {
    for (const { span, start, stop } of lines) {
      if (!start || !stop) {
        continue;
      }
      const left = start.getAbsoluteX();
      const right = stop.getAbsoluteX() + stop.getGlyphWidth();
      if (right <= left) {
        continue;
      }
      const stave = start.checkStave();
      const naturalY = span.above ? stave.getYForTopText(DIRECTION_LINE_TEXT_LINE) : stave.getYForBottomText(DIRECTION_LINE_TEXT_LINE);
      let y = naturalY;
      if (!span.above) {
        const scoped = new CollisionResolver(this.scratchViewport, {});
        for (const rect of this.belowWordsOn(stave)) {
          scoped.add({ rect, kind: "annotation" });
        }
        y = scoped.dropClear(new Rect2(left, naturalY, right - left, 1), WORDS_NOTE_CLEARANCE, {}).y;
      }
      const toward = span.above ? 1 : -1;
      const hookOf = (end) => end === "none" ? 0 : (end === "up" ? -1 : 1) * toward * DIRECTION_LINE_HOOK;
      this.context.save();
      this.context.setStrokeStyle(this.notationColor);
      this.context.setLineWidth(this.appearance.lineWidth(span.kind) ?? 1);
      if (span.dash) {
        this.context.setLineDash(span.dash);
      }
      this.context.beginPath();
      const startHook = hookOf(span.startEnd);
      if (startHook) {
        this.context.moveTo(left, y + startHook);
        this.context.lineTo(left, y);
      } else {
        this.context.moveTo(left, y);
      }
      this.context.lineTo(right, y);
      const stopHook = hookOf(span.stopEnd);
      if (stopHook) {
        this.context.lineTo(right, y + stopHook);
      }
      this.context.stroke();
      this.context.closePath();
      this.context.restore();
      this.reporter.growPageTop(y - DIRECTION_LINE_HOOK);
      this.reporter.growPageBottom(y + DIRECTION_LINE_HOOK);
    }
  }
}
var TEXT_CLEAR_KINDS = ["note", "tie", "annotation"];
var WORDS_CLEAR_KINDS = [...TEXT_CLEAR_KINDS, "hairpin"];
var SUSTAINED_DYNAMIC = /^(p+|f+|mp|mf)$/;
var DYNAMIC_RESTATE_GAP = 1;
var NAVIGATION_GLYPHS = {
  segno: "",
  coda: ""
};
function alignOffsetOf(align, w) {
  if (align === "center") {
    return w / 2;
  }
  return align === "right" ? w : 0;
}

// geometry-collector.ts
import {
  Modifier as Modifier7,
  Stem as Stem4,
  Stroke as Stroke4
} from "vexflow/core";
class GeometryCollector {
  rawNotes = [];
  rawMeasures = [];
  rawChordDiagrams = [];
  mark() {
    return {
      notes: this.rawNotes.length,
      measures: this.rawMeasures.length,
      chordDiagrams: this.rawChordDiagrams.length
    };
  }
  rewind(mark) {
    this.rawNotes.length = mark.notes;
    this.rawMeasures.length = mark.measures;
    this.rawChordDiagrams.length = mark.chordDiagrams;
  }
  collectTabNotes(measureIndex, tabStave, chords) {
    for (const { note, chord } of chords) {
      const x = note.getAbsoluteX();
      const positions = note.getPositions();
      const fretEls = note.fretElement;
      for (const mnote of chord.notes) {
        const string = mnote.string;
        const fret = mnote.fret;
        if (string === null || fret === null) {
          continue;
        }
        const y = tabStave.getYForLine(string - 1);
        const el = fretEls[positions.findIndex((pos) => pos.str === string)];
        const rect = new Rect2(x - FRET_HALF_W, y - FRET_HALF_H, 2 * FRET_HALF_W, 2 * FRET_HALF_H);
        this.rawNotes.push({
          mnote,
          rect,
          ink: rect,
          chord: chord.notes,
          measureIndex,
          tab: { string, fret },
          glyph: el ? {
            text: el.getText(),
            font: el.getFont(),
            x: x - el.getWidth() / 2,
            y: y + el.getYShift()
          } : null
        });
      }
    }
  }
  collectStaveNotes(measureIndex, chords) {
    for (const { note, chord } of chords) {
      const headX = note.getNoteHeadBeginX();
      const headWidth = note.getNoteHeadEndX() - headX;
      const ys = note.getYs();
      const heads = note.noteHeads;
      chord.notes.forEach((mnote, i) => {
        const y = ys[i];
        if (y === undefined) {
          return;
        }
        const head = heads[i];
        const box = head?.isRendered() ? head.getBoundingBox() : undefined;
        const glyph = head && box ? {
          text: head.getText(),
          font: head.getFont(),
          x: box.getX(),
          y
        } : null;
        const rest = mnote.isRest && box;
        const rect = new Rect2(box ? box.getX() : headX, rest ? box.getY() : y - NOTEHEAD_HALF_H, box ? box.getW() : headWidth, rest ? box.getH() : 2 * NOTEHEAD_HALF_H);
        this.rawNotes.push({
          mnote,
          rect,
          ink: this.inkOf(note, i, rect),
          chord: chord.notes,
          measureIndex,
          tab: null,
          glyph
        });
      });
    }
  }
  inkOf(note, index, head) {
    let ink = head;
    const ys = note.getYs();
    for (const mod of note.getModifiers()) {
      const box = this.modifierInk(note, mod, index, ys);
      if (box) {
        ink = ink.union(box);
      }
    }
    const stem = note.getStem();
    if (note.shouldDrawFlag() && stem) {
      const { flag } = note;
      const { yTop, yBottom } = note.getNoteHeadBounds();
      const height = stem.getHeight();
      const {
        actualBoundingBoxAscent: ascent,
        actualBoundingBoxDescent: descent
      } = flag.getTextMetrics();
      const baseline = note.getStemDirection() === Stem4.DOWN ? yTop - height - descent : yBottom - height + ascent;
      ink = ink.union(new Rect2(note.getStemX() - Stem4.WIDTH / 2, baseline - ascent, flag.getWidth(), ascent + descent));
    }
    return ink;
  }
  modifierInk(note, mod, index, ys) {
    const category = mod.getCategory();
    const stroke = category === Stroke4.CATEGORY;
    if (!stroke && (!INK_CATEGORIES.has(category) || mod.getIndex() !== index)) {
      return null;
    }
    const position = mod.getPosition();
    const left = position === Modifier7.Position.LEFT;
    if (!left && position !== Modifier7.Position.RIGHT) {
      return null;
    }
    const start = note.getModifierStartXY(position, mod.checkIndex(), {
      forceFlagRight: true
    });
    const w = mod.getWidth();
    const x = start.x + mod.getXShift() - (left ? w : 0);
    if (stroke) {
      const space = note.checkStave().getSpacingBetweenLines();
      const { type } = mod;
      const top = Math.min(...ys) - space;
      const bottom = Math.max(...ys) + (ARROW_BELOW.has(type) ? 1.5 : 1) * space;
      return new Rect2(x, top, w, bottom - top);
    }
    const metrics = mod.getTextMetrics();
    const top = start.y + mod.getYShift() - metrics.actualBoundingBoxAscent;
    const h = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;
    return new Rect2(x, top, w, h);
  }
  addMeasure(measure) {
    this.rawMeasures.push(measure);
  }
  addChordDiagram(diagram) {
    this.rawChordDiagrams.push(diagram);
  }
  decoratedMeasures(tops) {
    return this.rawMeasures.map((measure) => {
      const top = tops.decorationTopOf(measure.systemIndex);
      const { rect } = measure;
      if (top === undefined || top >= rect.y) {
        return measure;
      }
      return {
        ...measure,
        rect: new Rect2(rect.x, top, rect.w, rect.bottom - top)
      };
    });
  }
  notes() {
    return this.rawNotes;
  }
  measures() {
    return this.rawMeasures;
  }
  chordDiagrams() {
    return this.rawChordDiagrams;
  }
}
var INK_CATEGORIES = new Set([
  "Accidental",
  "Dot",
  "Parenthesis",
  "FretHandFinger"
]);
var ARROW_BELOW = new Set([
  Stroke4.Type.BRUSH_UP,
  Stroke4.Type.ROLL_UP,
  Stroke4.Type.RASGUEADO_UP
]);

// lyric-mark.ts
function isLyricMark(modifier) {
  return modifier?.kind === "lyric";
}

// lyric-placer.ts
class LyricPlacer {
  translator;
  context;
  collisionResolver;
  lyricDrops;
  extendWidth;
  notationColor;
  hyphenDistance;
  documentPositions;
  observedLyricDrops = new Map;
  steppedSystems = new Set;
  pinned = [];
  constructor(translator, context, collisionResolver, opts) {
    this.translator = translator;
    this.context = context;
    this.collisionResolver = collisionResolver;
    this.notationColor = opts.notationColor;
    this.lyricDrops = opts.lyricDrops ?? new Map;
    this.documentPositions = opts.documentPositions;
    this.extendWidth = opts.extendWidth ?? 1;
    this.hyphenDistance = opts.hyphenDistance ?? null;
  }
  rowKey(system, row) {
    return `${system}:${row}`;
  }
  recordDrop(system, row, drop) {
    const key = this.rowKey(system, row);
    const seen = this.observedLyricDrops.get(key);
    if (seen !== undefined && seen !== drop) {
      this.steppedSystems.add(system);
    }
    this.observedLyricDrops.set(key, Math.max(seen ?? 0, drop));
  }
  requestDrop(system, row, drop) {
    const key = this.rowKey(system, row);
    const hung = Math.max(this.observedLyricDrops.get(key) ?? 0, this.lyricDrops.get(key) ?? 0);
    if (drop > hung) {
      this.recordDrop(system, row, drop);
      this.steppedSystems.add(system);
    }
  }
  carriedDrop(system, row) {
    return this.lyricDrops.get(this.rowKey(system, row)) ?? 0;
  }
  pin(notes, row, baseline, opts = {}) {
    const { system = 0 } = opts;
    const lyricNotes = notes.map((note) => ({ note, lyrics: this.lyricsOf(note) })).filter(({ lyrics }) => lyrics.length > 0);
    if (lyricNotes.length === 0) {
      return;
    }
    if (this.documentPositions) {
      for (const { note, lyrics } of lyricNotes) {
        for (const lyric of lyrics) {
          if (lyric.documentPosition?.y == null) {
            continue;
          }
          const key = `${system}:${row}:${lyric.verseIndex}`;
          const drop = note.checkStave().getYForLine(0) - lyric.documentPosition.y - note.checkStave().getBottomLineY();
          const desired = Math.max(this.observedLyricDrops.get(key) ?? -Infinity, drop);
          this.observedLyricDrops.set(key, desired);
          if (desired > (this.lyricDrops.get(key) ?? -Infinity)) {
            this.steppedSystems.add(system);
          }
        }
      }
    }
    for (const { note, lyrics } of lyricNotes) {
      for (const lyric of lyrics) {
        const y = this.baselineOf(lyric, note.checkStave(), row, system, baseline);
        lyric.setPositionX(this.documentPositions ? lyric.documentPosition?.dx ?? 0 : 0);
        lyric.setBaselineY(y);
        lyric.setStyle({ fillStyle: this.notationColor });
        const w = lyric.getWidth();
        const rect = new Rect2(lyric.boxLeft(note.getNoteHeadBeginX(), note.getNoteHeadEndX()), y - lyric.textSize, w, lyric.textSize);
        this.collisionResolver.add({ rect, kind: "annotation", band: row });
        this.pinned.push({
          stave: note.checkStave(),
          system,
          row,
          left: rect.x,
          width: w,
          rect,
          verseIndex: lyric.verseIndex,
          textSize: lyric.textSize,
          lyric
        });
      }
    }
    this.drawMelismas(notes, row, baseline, system);
    this.drawHyphens(notes);
  }
  baselineOf(lyric, stave, row, system, baseline) {
    const automatic = baseline + lyric.verseIndex * LYRIC_LINE_HEIGHT;
    if (!this.documentPositions) {
      return automatic;
    }
    const key = `${system}:${row}:${lyric.verseIndex}`;
    const drop = this.lyricDrops.get(key) ?? this.observedLyricDrops.get(key);
    const document2 = drop === undefined ? automatic : stave.getBottomLineY() + drop;
    return (this.documentPositions === "strict" ? document2 : Math.max(automatic, document2)) - (lyric.documentPosition?.dy ?? 0);
  }
  pinnedSyllables() {
    return this.pinned;
  }
  rowDrop(system, row) {
    const key = this.rowKey(system, row);
    return Math.max(this.observedLyricDrops.get(key) ?? 0, this.lyricDrops.get(key) ?? 0);
  }
  drawMelismas(notes, row, baseline, system) {
    for (const [i, note] of notes.entries()) {
      for (const lyric of this.lyricsOf(note)) {
        if (!lyric.extend) {
          continue;
        }
        const next = notes.findIndex((n, j) => j > i && this.lyricsOf(n).some((l) => l.verseIndex === lyric.verseIndex));
        const last = notes[(next === -1 ? notes.length : next) - 1];
        if (!last || last === note) {
          continue;
        }
        const y = this.baselineOf(lyric, note.checkStave(), row, system, baseline);
        const x1 = lyric.boxLeft(note.getNoteHeadBeginX(), note.getNoteHeadEndX()) + lyric.getWidth() - LYRIC_PADDING;
        const x2 = last.getAbsoluteX() + this.translator.noteheadHalfWidth();
        if (x2 <= x1) {
          continue;
        }
        this.context.save();
        this.context.setStrokeStyle(this.notationColor);
        this.context.setLineWidth(this.extendWidth);
        const crisp = Math.round(y) + 0.5;
        this.context.beginPath();
        this.context.moveTo(x1, crisp);
        this.context.lineTo(x2, crisp);
        this.context.stroke();
        this.context.restore();
        this.collisionResolver.add({
          rect: new Rect2(x1, y - Math.max(1, this.extendWidth / 2), x2 - x1, Math.max(2, this.extendWidth)),
          kind: "annotation",
          band: row
        });
      }
    }
  }
  drawHyphens(notes) {
    const distance = this.hyphenDistance;
    if (distance === null) {
      return;
    }
    for (const [i, note] of notes.entries()) {
      for (const lyric of this.lyricsOf(note)) {
        if (!lyric.hyphenated) {
          continue;
        }
        const nextNote = notes.find((n, j) => j > i && this.lyricsOf(n).some((l) => l.verseIndex === lyric.verseIndex));
        const next = nextNote ? this.lyricsOf(nextNote).find((l) => l.verseIndex === lyric.verseIndex) : undefined;
        if (!nextNote || !next) {
          continue;
        }
        const from = lyric.boxLeft(note.getNoteHeadBeginX(), note.getNoteHeadEndX()) + lyric.getWidth() - LYRIC_PADDING;
        const to = next.boxLeft(nextNote.getNoteHeadBeginX(), nextNote.getNoteHeadEndX()) + LYRIC_PADDING;
        const extra = Math.floor((to - from) / distance);
        this.context.save();
        this.context.setFillStyle(this.notationColor);
        for (let k = 1;k <= extra; k++) {
          lyric.drawHyphen(this.context, from + (to - from) * k / (extra + 1));
        }
        this.context.restore();
      }
    }
  }
  lyricsOf(note) {
    return note.getModifiers().filter(isLyricMark);
  }
  observedDrops() {
    return this.observedLyricDrops;
  }
  stepped(system) {
    return this.steppedSystems.has(system);
  }
  observedDropsOf(system) {
    const drops = new Map;
    for (const [key, drop] of this.observedLyricDrops) {
      if (key.startsWith(`${system}:`)) {
        drops.set(key, drop);
      }
    }
    return drops;
  }
  mark() {
    return this.pinned.length;
  }
  rewind(mark) {
    this.pinned.length = mark;
  }
  forgetSystem(system) {
    this.steppedSystems.delete(system);
    for (const key of this.observedDropsOf(system).keys()) {
      this.observedLyricDrops.delete(key);
    }
  }
}

// repeat-wing-drawer.ts
import {
  Barline as Barline4,
  StaveModifierPosition as StaveModifierPosition3
} from "vexflow/core";
var WING_RISE = 1.5;
var WING_REACH = 1.1;

class RepeatWingDrawer {
  context;
  constructor(context) {
    this.context = context;
  }
  draw(top, bottom, wings) {
    this.context.openGroup("vexml-repeat-wing");
    try {
      const begin = this.repeatX(top, StaveModifierPosition3.BEGIN, [
        Barline4.type.REPEAT_BEGIN
      ]);
      const end = this.repeatX(top, StaveModifierPosition3.END, [
        Barline4.type.REPEAT_END,
        Barline4.type.REPEAT_BOTH
      ]);
      const boxes = [];
      if (begin !== null) {
        boxes.push(...this.drawSign(top, bottom, begin, 1, wings.begin));
      }
      if (end !== null) {
        boxes.push(...this.drawSign(top, bottom, end, -1, wings.end));
        boxes.push(...this.drawSign(top, bottom, end, 1, wings.reopen));
      }
      return boxes;
    } finally {
      this.context.closeGroup();
    }
  }
  repeatX(stave, position, types) {
    const barline = stave.getModifiers(position).find((modifier) => modifier instanceof Barline4 && types.includes(modifier.getType()));
    return barline ? barline.getX() : null;
  }
  drawSign(top, bottom, x, facing, winged) {
    if (winged === "none") {
      return [];
    }
    const space = top.getSpacingBetweenLines();
    const curved = winged === "curved" || winged === "double-curved";
    const double = winged === "double-straight" || winged === "double-curved";
    const thickEdge = facing === 1 ? x - 2 : x + 1;
    const roots = [{ x: thickEdge, width: 3 }];
    if (double) {
      roots.push({ x: facing === 1 ? x + 3 : x - 4, width: 1 });
    }
    const ends = [
      { y: top.getTopLineTopY(), up: -1 },
      { y: bottom.getBottomLineBottomY(), up: 1 }
    ];
    return roots.flatMap((root) => ends.map((end) => this.drawWing(root, end.y, end.up * WING_RISE * space, facing * WING_REACH * space, curved, facing)));
  }
  drawWing(root, y, rise, reach, curved, facing) {
    const back = facing === 1 ? root.x : root.x + root.width;
    const front = back + facing * root.width;
    const ctx = this.context;
    ctx.beginPath();
    ctx.moveTo(back, y);
    if (curved) {
      ctx.quadraticCurveTo(back, y + rise, back + reach, y + rise);
      ctx.quadraticCurveTo(front, y + rise * 0.6, front, y);
    } else {
      ctx.lineTo(back + reach, y + rise);
      ctx.lineTo(front + reach, y + rise);
      ctx.lineTo(front, y);
    }
    ctx.closePath();
    ctx.fill();
    const xs = [back, front, back + reach, front + reach];
    const left = Math.min(...xs);
    return new Rect2(left, Math.min(y, y + rise), Math.max(...xs) - left, Math.abs(rise));
  }
}

// spanner-resolver.ts
import {
  Font as Font2
} from "vexflow/core";

// dashed-tie.ts
import { StaveNote as StaveNote5, StaveTie } from "vexflow/core";
var TIE_RISE = 0.255;
var TIE_MAX_RISE = 1.35;
var TIE_MIDDLE = 0.215;
var TIE_TIP = 0.125;
var TIE_SHOULDER = 0.24;
var TIE_OFF_HEAD = 0.91;
var TIE_OFF_LINE = 0.32;
var TIE_CHORD_MIN = 0.3;
var TIE_TUCK = 0.37;
var TIE_GAP_LEVEL = 0.05;
var TIE_GAP_BLOCKED = 0.2;

class DashedTie extends StaveTie {
  inkBounds = null;
  dash;
  tip;
  bezier;
  fit;
  constructor(notes, opts = {}) {
    super(notes);
    this.dash = opts.dash ?? null;
    this.tip = opts.tip ?? null;
    this.bezier = opts.bezier ?? null;
    this.fit = opts.fit ?? false;
  }
  renderTie(params) {
    this.inkBounds = null;
    if (!this.dash && !this.bezier) {
      if (this.fit) {
        this.renderFitted(params);
        return;
      }
      if (this.tip === null) {
        super.renderTie(params);
      } else {
        this.renderTipped(params, this.tip);
      }
      return;
    }
    const ctx = this.checkContext();
    const options = this.renderOptions;
    const short = Math.abs(params.lastX - params.firstX) < options.shortTieCutoff;
    const cp = ((short ? options.cp1Short : options.cp1) + (short ? options.cp2Short : options.cp2)) / 2;
    const firstX = params.firstX + options.firstXShift;
    const lastX = params.lastX + options.lastXShift;
    const yShift = options.yShift * params.direction;
    const notes = this.getNotes();
    const firstIndexes = notes.firstIndexes ?? [];
    const lastIndexes = notes.lastIndexes ?? [];
    ctx.save();
    ctx.setLineDash(this.dash ?? []);
    for (let i = 0;i < firstIndexes.length; i++) {
      const firstY = (params.firstYs[firstIndexes[i]] ?? 0) + yShift;
      const lastY = (params.lastYs[lastIndexes[i]] ?? 0) + yShift;
      ctx.beginPath();
      ctx.moveTo(firstX, firstY);
      if (this.bezier) {
        const middle = (firstY + lastY) / 2 + cp * params.direction;
        const start = this.bezier.start;
        const end = this.bezier.end;
        const x0 = start.x === null ? firstX + (lastX - firstX) / 3 : firstX + start.x;
        const x1 = end.x === null ? lastX - (lastX - firstX) / 3 : lastX + end.x;
        const y0 = start.y === null ? firstY + 2 * (middle - firstY) / 3 : firstY - start.y;
        const y1 = end.y === null ? lastY + 2 * (middle - lastY) / 3 : lastY - end.y;
        const thickness = this.dash ? 0 : 2 * Math.abs(short ? options.cp2Short - options.cp1Short : options.cp2 - options.cp1) / 3;
        const tip = this.dash ? 0 : this.tip ?? 0;
        const shift = (thickness - tip / 3) * params.direction;
        ctx.bezierCurveTo(x0, y0, x1, y1, lastX, lastY);
        if (this.dash) {
          ctx.stroke();
        } else {
          ctx.lineTo(lastX, lastY + tip * params.direction);
          ctx.bezierCurveTo(x1, y1 + shift, x0, y0 + shift, firstX, firstY + tip * params.direction);
          ctx.closePath();
          ctx.fill();
        }
        const xs = [firstX, lastX, x0, x1];
        const ys = [
          firstY,
          lastY,
          firstY + tip * params.direction,
          lastY + tip * params.direction,
          y0,
          y1,
          y0 + shift,
          y1 + shift
        ];
        const bounds = new Rect2(Math.min(...xs), Math.min(...ys), Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
        this.inkBounds = this.inkBounds ? this.inkBounds.union(bounds) : bounds;
        continue;
      }
      ctx.quadraticCurveTo((firstX + lastX) / 2, (firstY + lastY) / 2 + cp * params.direction, lastX, lastY);
      ctx.stroke();
    }
    ctx.restore();
  }
  renderFitted(params) {
    const notes = this.getNotes();
    const first = notes.firstNote;
    const last = notes.lastNote;
    const firstIndexes = notes.firstIndexes ?? [];
    const lastIndexes = notes.lastIndexes ?? [];
    const stave = (first ?? last)?.checkStave();
    if (!stave) {
      return;
    }
    const space = stave.getSpacingBetweenLines();
    const dir = params.direction;
    const ctx = this.checkContext();
    for (let i = 0;i < firstIndexes.length; i++) {
      const firstIndex = firstIndexes[i];
      const lastIndex = lastIndexes[i];
      const firstHead = params.firstYs[firstIndex] ?? 0;
      const lastHead = params.lastYs[lastIndex] ?? 0;
      const firstOff = this.offHead(first, firstHead, dir, stave);
      const lastOff = this.offHead(last, lastHead, dir, stave);
      const firstX = first ? this.startX(first, firstIndex, firstOff, dir, params.firstX, space) : params.firstX;
      const lastX = last ? this.endX(last, lastIndex, lastOff, dir, params.lastX, space) : params.lastX;
      const firstY = firstHead + dir * firstOff * space;
      const lastY = lastHead + dir * lastOff * space;
      const length = Math.abs(lastX - firstX);
      const rise = space * Math.min(TIE_MAX_RISE, TIE_RISE * Math.sqrt(length / space));
      const tip = TIE_TIP * space / 2;
      const middle = TIE_MIDDLE * space / 2;
      const nearLift = (rise - middle + tip) / 0.75;
      const farLift = (rise + middle - tip) / 0.75;
      const x0 = firstX + length * TIE_SHOULDER;
      const x1 = lastX - length * TIE_SHOULDER;
      ctx.beginPath();
      ctx.moveTo(firstX, firstY - dir * tip);
      ctx.bezierCurveTo(x0, firstY - dir * tip + dir * nearLift, x1, lastY - dir * tip + dir * nearLift, lastX, lastY - dir * tip);
      ctx.lineTo(lastX, lastY + dir * tip);
      ctx.bezierCurveTo(x1, lastY + dir * tip + dir * farLift, x0, firstY + dir * tip + dir * farLift, firstX, firstY + dir * tip);
      ctx.closePath();
      ctx.fill();
      const ys = [
        firstY - dir * tip,
        lastY + dir * tip,
        (firstY + lastY) / 2 + dir * (rise + middle)
      ];
      const bounds = new Rect2(Math.min(firstX, lastX), Math.min(...ys), length, Math.max(...ys) - Math.min(...ys));
      this.inkBounds = this.inkBounds ? this.inkBounds.union(bounds) : bounds;
    }
  }
  offHead(note, headY, dir, stave) {
    if (!(note instanceof StaveNote5) || note.getKeys().length < 2) {
      return TIE_OFF_HEAD;
    }
    const space = stave.getSpacingBetweenLines();
    const position = (headY - stave.getYForLine(0)) / space;
    const line = dir > 0 ? Math.ceil(position + TIE_CHORD_MIN - TIE_OFF_LINE) : Math.floor(position - TIE_CHORD_MIN + TIE_OFF_LINE);
    return Math.abs(line + dir * TIE_OFF_LINE - position);
  }
  blocked(note, index, off, dir, stemDirection) {
    const heads = note.getKeys().length;
    const inner = dir > 0 ? index > 0 : index < heads - 1;
    return off < 0.5 || inner || note.hasStem() && note.getStemDirection() === stemDirection;
  }
  startX(note, index, off, dir, fallback, space) {
    if (!(note instanceof StaveNote5)) {
      return fallback;
    }
    if (this.blocked(note, index, off, dir, dir < 0 ? 1 : 0)) {
      return fallback + (off < 0.5 ? TIE_GAP_LEVEL : TIE_GAP_BLOCKED) * space;
    }
    return note.getNoteHeadEndX() - TIE_TUCK * space;
  }
  endX(note, index, off, dir, fallback, space) {
    if (!(note instanceof StaveNote5)) {
      return fallback;
    }
    if (this.blocked(note, index, off, dir, dir > 0 ? -1 : 0)) {
      return fallback - (off < 0.5 ? TIE_GAP_LEVEL : TIE_GAP_BLOCKED) * space;
    }
    return note.getNoteHeadBeginX() + TIE_TUCK * space;
  }
  renderTipped(params, tip) {
    const ctx = this.checkContext();
    const options = this.renderOptions;
    const dir = params.direction;
    const short = Math.abs(params.lastX - params.firstX) < options.shortTieCutoff;
    const near = short ? options.cp1Short : options.cp1;
    const far = (short ? options.cp2Short : options.cp2) - tip;
    const firstX = params.firstX + options.firstXShift;
    const lastX = params.lastX + options.lastXShift;
    const cpX = (firstX + lastX) / 2;
    const yShift = options.yShift * dir;
    const notes = this.getNotes();
    const firstIndexes = notes.firstIndexes ?? [];
    const lastIndexes = notes.lastIndexes ?? [];
    for (let i = 0;i < firstIndexes.length; i++) {
      const firstY = (params.firstYs[firstIndexes[i]] ?? 0) + yShift;
      const lastY = (params.lastYs[lastIndexes[i]] ?? 0) + yShift;
      const midY = (firstY + lastY) / 2;
      ctx.beginPath();
      ctx.moveTo(firstX, firstY);
      ctx.quadraticCurveTo(cpX, midY + near * dir, lastX, lastY);
      ctx.lineTo(lastX, lastY + tip * dir);
      ctx.quadraticCurveTo(cpX, midY + far * dir, firstX, firstY + tip * dir);
      ctx.closePath();
      ctx.fill();
    }
  }
}

// ottava-bracket.ts
import { Metrics as Metrics2, TextBracket } from "vexflow/core";

class OttavaBracket extends TextBracket {
  useGlyph(glyph, notationFont) {
    this.textElement.setFont(notationFont, Metrics2.get("fontSize"));
    this.textElement.setText(glyph);
    this.superscriptElement.setText("");
    return this;
  }
}

// span-scope.ts
var WHOLE_SCORE = {
  owns: () => true,
  ownsOpen: () => true
};

// spanner-resolver.ts
class SpannerResolver {
  octaveShiftSpans;
  directionLineSpans;
  showTabSlideText;
  scratchViewport;
  appearance;
  notationFont;
  allChords = [];
  allPedals = [];
  allWedges = [];
  allTabChords = [];
  staveRows = new Map;
  systemOfMeasure;
  systemStarts = new Map;
  context;
  spanners;
  translator;
  spill;
  directionPlacer;
  reporter;
  systemReach = new Map;
  bows = new Map;
  stackedHairpins = new Map;
  constructor(opts) {
    this.context = opts.context;
    this.spanners = opts.spanners;
    this.translator = opts.translator;
    this.spill = opts.spill;
    this.directionPlacer = opts.directionPlacer;
    this.reporter = opts.reporter;
    this.octaveShiftSpans = opts.octaveShiftSpans;
    this.directionLineSpans = opts.directionLineSpans;
    this.showTabSlideText = opts.showTabSlideText;
    this.scratchViewport = opts.scratchViewport;
    this.systemOfMeasure = opts.systemOfMeasure;
    this.appearance = opts.appearance;
    this.notationFont = opts.notationFont;
  }
  mark() {
    return {
      chords: this.allChords.length,
      tabChords: this.allTabChords.length,
      pedals: this.allPedals.length,
      wedges: this.allWedges.length
    };
  }
  rewind(mark) {
    this.allChords.length = mark.chords;
    this.allTabChords.length = mark.tabChords;
    this.allPedals.length = mark.pedals;
    this.allWedges.length = mark.wedges;
  }
  forgetSystem(system) {
    this.systemStarts.delete(system);
    this.systemReach.delete(system);
    this.stackedHairpins.delete(system);
  }
  beginSystem(system) {
    this.systemStarts.set(system, {
      chords: this.allChords.length,
      tabChords: this.allTabChords.length,
      pedals: this.allPedals.length,
      wedges: this.allWedges.length
    });
  }
  registerStave(stave, row, system) {
    this.staveRows.set(stave, { row, system });
  }
  systemOfNote(note) {
    const stave = note.getStave();
    return (stave && this.systemOf(stave)) ?? -1;
  }
  systemOf(stave) {
    return this.staveRows.get(stave)?.system;
  }
  addChords(chords) {
    this.allChords.push(...chords);
  }
  addTabChords(chords) {
    this.allTabChords.push(...chords);
  }
  addPedals(pedals) {
    this.allPedals.push(...pedals);
  }
  addWedges(wedges) {
    this.allWedges.push(...wedges);
  }
  resolve(anchors) {
    this.resolveIn({
      chords: this.allChords,
      tabChords: this.allTabChords,
      pedals: this.allPedals,
      wedges: this.allWedges,
      ownPedals: this.allPedals
    }, WHOLE_SCORE, WHOLE_SCORE, anchors);
  }
  resolveSystem(system, anchors) {
    const own = this.systemStarts.get(system);
    if (!own) {
      return;
    }
    let reach = system;
    for (const chord of this.allChords.slice(own.chords)) {
      for (const note of chord.notes) {
        reach = Math.max(reach, this.systemOfMeasure(this.spanners.reach(note)));
      }
    }
    for (const chord of this.allTabChords.slice(own.tabChords)) {
      for (const note of chord.notes) {
        reach = Math.max(reach, this.systemOfMeasure(this.spanners.reach(note)));
      }
    }
    this.systemReach.set(system, reach);
    const from = this.windowStart(system);
    const start = this.systemStarts.get(from) ?? own;
    const systemOf = (end) => {
      const stave = end.getStave();
      return (stave && this.staveRows.get(stave)?.system) ?? system;
    };
    const settles = (end) => (this.systemReach.get(end) ?? end) === system;
    this.resolveIn({
      chords: this.allChords.slice(start.chords),
      tabChords: this.allTabChords.slice(start.tabChords),
      pedals: this.allPedals.slice(start.pedals),
      wedges: this.allWedges.slice(start.wedges),
      ownPedals: this.allPedals.slice(own.pedals)
    }, {
      owns: (a, b) => Math.max(systemOf(a), systemOf(b)) === system,
      ownsOpen: (note) => this.systemOfMeasure(this.spanners.reach(note)) === system
    }, {
      owns: (a, b) => settles(Math.max(systemOf(a), systemOf(b))),
      ownsOpen: () => false
    }, anchors);
  }
  reachesPast(system) {
    if (this.windowStart(system + 1) <= system) {
      return true;
    }
    const crosses = (from, to) => from !== undefined && to !== undefined && this.systemOfMeasure(from.measure.index) <= system && this.systemOfMeasure(to.measure.index) > system;
    return this.octaveShiftSpans.some((span) => crosses(span.notes[0], span.notes.at(-1))) || this.directionLineSpans.some((span) => crosses(span.from, span.to));
  }
  windowStart(system) {
    let from = system;
    for (let moved = true;moved; ) {
      moved = false;
      for (const [earlier, reach] of this.systemReach) {
        if (earlier < from && reach >= from) {
          from = earlier;
          moved = true;
        }
      }
    }
    for (const [marks, list] of [
      [this.allWedges, "wedges"],
      [this.allPedals, "pedals"]
    ]) {
      const open = new Map;
      const before = this.systemStarts.get(system)?.[list] ?? marks.length;
      marks.slice(0, before).forEach((mark, index) => {
        if (mark.type === "start") {
          open.set(mark.number, index);
        } else {
          open.delete(mark.number);
        }
      });
      for (const index of open.values()) {
        let recordedOn = from;
        for (const [earlier, start] of this.systemStarts) {
          if (start[list] <= index) {
            recordedOn = earlier;
          }
        }
        from = Math.min(from, recordedOn);
      }
    }
    return from;
  }
  resolveIn(pool, scope, wedgeScope, anchors) {
    for (const tie of this.spanners.buildTies(pool.chords, anchors.byLead, scope)) {
      this.context.openGroup("vexml-tie");
      tie.setContext(this.context).draw();
      this.context.closeGroup();
      const stave = (tie.getNotes().firstNote ?? tie.getNotes().lastNote)?.checkStave();
      if (stave) {
        const rect = this.tieRect(tie);
        this.reportBow(stave, rect, false);
        this.addBow(stave, rect);
      }
    }
    for (const slur of this.spanners.buildSlurs(pool.chords, anchors.byLead, scope)) {
      this.context.openGroup("vexml-slur");
      slur.curve.setContext(this.context).drawWithStyle();
      this.context.closeGroup();
      const rect = new Rect2(slur.left, slur.top, slur.right - slur.left, slur.bottom - slur.top);
      if (slur.stave) {
        this.reportBow(slur.stave, rect, slur.crossStave);
        this.addBow(slur.stave, rect);
        this.clearLyricsOfBow(slur.stave, rect, slur.crossStave);
      } else {
        this.reporter.growPageTop(slur.top);
        this.reporter.growPageBottom(slur.bottom);
      }
    }
    for (const tie of this.spanners.buildHammerPulls(pool.tabChords, anchors.byTabLead, scope)) {
      this.context.openGroup("vexml-tie");
      tie.setContext(this.context).draw();
      this.context.closeGroup();
    }
    for (const slide of this.spanners.buildSlides(pool.tabChords, anchors.byTabLead, { showText: this.showTabSlideText, scope })) {
      this.context.openGroup("vexml-slide");
      slide.setContext(this.context).draw();
      this.context.closeGroup();
    }
    for (const line of this.spanners.buildGlissandos(pool.chords, anchors.byLead, scope)) {
      this.context.openGroup("vexml-glissando");
      line.setContext(this.context).draw();
      this.context.closeGroup();
    }
    for (const span of this.octaveShiftSpans) {
      const first = span.notes[0];
      const last = span.notes.at(-1);
      const start = first && anchors.byLead.get(first);
      const stop = last && anchors.byLead.get(last);
      if (!start || !stop || !scope.owns(start, stop)) {
        continue;
      }
      const bracket = new OttavaBracket({
        start,
        stop,
        text: span.label,
        superscript: span.suffix,
        position: span.above ? OttavaBracket.Position.TOP : OttavaBracket.Position.BOTTOM
      });
      const glyph = this.appearance.glyph(`octave-shift-${span.above ? "down" : "up"}-${span.label}`);
      if (glyph !== null) {
        bracket.useGlyph(glyph, this.notationFont);
      }
      bracket.renderOptions.color = Ink.NOTATION;
      bracket.renderOptions.lineWidth = this.appearance.lineWidth("octave shift") ?? bracket.renderOptions.lineWidth;
      this.clearOctaveBracket(bracket, span.notes.map((note) => anchors.byLead.get(note)).filter((note) => note !== undefined), span.above);
      this.context.openGroup("vexml-bracket");
      this.context.save();
      this.context.setLineWidth(bracket.renderOptions.lineWidth);
      this.context.setStrokeStyle(Ink.NOTATION);
      bracket.setContext(this.context).draw();
      this.context.restore();
      this.context.closeGroup();
    }
    this.directionPlacer.drawDirectionLines(this.directionLineSpans.flatMap((span) => {
      const start = anchors.byLead.get(span.from);
      const stop = anchors.byLead.get(span.to);
      return start && stop && scope.owns(start, stop) ? [{ span, start, stop }] : [];
    }));
    for (const bracket of this.spanners.buildWavyLines(pool.chords, anchors.byLead, scope)) {
      this.context.openGroup("vexml-bracket");
      bracket.setContext(this.context).draw();
      this.context.closeGroup();
    }
    const wedges = this.spanners.buildWedges(pool.wedges, anchors.byLead, {
      scope: wedgeScope,
      wraps: (from, to) => this.systemOfNote(to) > this.systemOfNote(from)
    });
    for (const wedge of wedges) {
      this.clearWedge(wedge, anchors.byLead.values());
      this.startPastDynamic(wedge);
    }
    this.alignWedgeChains(wedges);
    for (const wedge of wedges) {
      this.context.openGroup("vexml-hairpin");
      wedge.setContext(this.context).draw();
      this.context.closeGroup();
      this.reporter.growPageTop(wedge.bounds.top);
      this.reporter.growPageBottom(wedge.bounds.bottom);
      const placement = this.staveRows.get(wedge.stave);
      if (placement) {
        this.spill.recordStave(placement.system, placement.row, wedge.stave, wedge.rect);
        this.spill.growHighestTop(placement.system, wedge.bounds.top);
      }
    }
    this.observeStackedWords(wedges);
    for (const { marking, notes } of this.spanners.buildPedals(pool.pedals, anchors.byLead, pool.chords, { scope })) {
      this.dropPedalClear(marking, notes, wedges);
      this.context.openGroup("vexml-pedal");
      marking.setContext(this.context).draw();
      this.context.closeGroup();
    }
    for (const marker of pool.ownPedals) {
      const stave = anchors.byLead.get(marker.lead)?.getStave();
      if (stave) {
        this.reporter.growPageBottom(stave.getYForBottomText(PEDAL_BOTTOM_TEXT_LINE) + PEDAL_BOTTOM_MARGIN);
      }
    }
  }
  dropPedalClear(marking, notes, wedges) {
    const stave = notes[0]?.getStave();
    if (!stave) {
      return;
    }
    const hw = this.translator.noteheadHalfWidth();
    const xs = notes.map((note) => note.getAbsoluteX());
    const left = Math.min(...xs) - hw;
    const baseline = stave.getYForBottomText(PEDAL_BOTTOM_TEXT_LINE);
    const natural = new Rect2(left, baseline - PEDAL_INK_RISE, Math.max(...xs) + hw - left, PEDAL_INK_RISE);
    const scoped = new CollisionResolver(this.scratchViewport, {});
    for (const note of notes) {
      scoped.add({ rect: this.reporter.noteObstacle(note), kind: "note" });
    }
    for (const wedge of wedges) {
      if (wedge.stave === stave && !wedge.above) {
        scoped.add({ rect: wedge.rect, kind: "note" });
      }
    }
    const placed = scoped.dropClear(natural, WORDS_NOTE_CLEARANCE, {});
    marking.setLine((placed.y - natural.y) / stave.getSpacingBetweenLines());
    this.reporter.growPageBottom(placed.bottom + PEDAL_BOTTOM_MARGIN);
  }
  clearWedge(wedge, notes) {
    const natural = wedge.rect;
    const scoped = new CollisionResolver(this.scratchViewport, {});
    for (const rect of this.bowsOnRowOf(wedge.stave)) {
      scoped.add({ rect, kind: "tie" });
    }
    const tuplets = new Set;
    for (const note of notes) {
      if (note.getStave() !== wedge.stave) {
        continue;
      }
      const rect = this.reporter.noteObstacle(note);
      if (rect.right < natural.left || rect.left > natural.right) {
        continue;
      }
      scoped.add({ rect, kind: "note" });
      const tuplet = note.getTuplet();
      if (tuplet) {
        tuplets.add(tuplet);
      }
    }
    for (const tuplet of tuplets) {
      scoped.add({ rect: this.translator.tupletRect(tuplet), kind: "note" });
    }
    for (const rect of this.reporter.lyricObstacles(wedge.stave)) {
      scoped.add({ rect, kind: "annotation" });
    }
    const placed = wedge.above ? scoped.liftClear(natural, WORDS_NOTE_CLEARANCE, {}) : scoped.dropClear(natural, WORDS_NOTE_CLEARANCE, {});
    wedge.setOffset(wedge.above ? natural.y - placed.y : placed.y - natural.y);
  }
  startPastDynamic(wedge) {
    const { top, bottom } = wedge.bounds;
    const { left, right } = wedge.rect;
    for (const dynamic of this.directionPlacer.dynamicsOn(wedge.stave)) {
      const onLine = dynamic.top < bottom && dynamic.bottom > top;
      if (!onLine || dynamic.left > left || dynamic.right <= left) {
        continue;
      }
      const inset = dynamic.right + HAIRPIN_DYNAMIC_GAP - left;
      if (left + inset < right) {
        wedge.setHorizontalInsets(inset, 0);
      }
      return;
    }
  }
  observeStackedWords(wedges) {
    for (const wedge of wedges) {
      const placement = this.staveRows.get(wedge.stave);
      if (wedge.above || !placement) {
        continue;
      }
      const rect = wedge.rect;
      const scoped = new CollisionResolver(this.scratchViewport, {});
      scoped.add({ rect, kind: "hairpin" });
      let stacked = false;
      for (const words of this.directionPlacer.belowWordsOn(wedge.stave)) {
        const dropped = scoped.dropClear(words, WORDS_NOTE_CLEARANCE, {});
        if (dropped.y === words.y) {
          continue;
        }
        stacked = true;
        this.reporter.growPageBottom(dropped.bottom);
        this.spill.recordDrop(placement.system, placement.row, wedge.stave, dropped);
      }
      if (!stacked) {
        continue;
      }
      const lineTop = wedge.stave.getYForLine(0);
      const band = {
        row: placement.row,
        rect: rect.translate(0, -lineTop)
      };
      const bands = this.stackedHairpins.get(placement.system);
      if (bands) {
        bands.push(band);
      } else {
        this.stackedHairpins.set(placement.system, [band]);
      }
    }
  }
  observedHairpinBands() {
    return this.stackedHairpins;
  }
  alignWedgeChains(wedges) {
    const touch = 2 * this.translator.noteheadHalfWidth();
    const sorted = [...wedges].sort((a, b) => a.rect.left - b.rect.left);
    const chained = new Set;
    for (const head of sorted) {
      if (chained.has(head)) {
        continue;
      }
      const chain = [head];
      let tail = head;
      for (const next of sorted) {
        if (!chained.has(next) && next !== tail && next.stave === tail.stave && next.above === tail.above && Math.abs(next.rect.left - tail.rect.right) <= touch) {
          if (tail.opens && !next.opens) {
            const gap = next.rect.left - tail.rect.right;
            const inset = Math.max(0, (HAIRPIN_CHAIN_GAP - gap) / 2);
            tail.setHorizontalInsets(0, inset);
            next.setHorizontalInsets(inset, 0);
          }
          chain.push(next);
          tail = next;
        }
      }
      const offset = Math.max(...chain.map((wedge) => wedge.getOffset()));
      for (const wedge of chain) {
        wedge.setOffset(offset);
        chained.add(wedge);
      }
    }
  }
  bowsOnRowOf(stave) {
    const placement = this.staveRows.get(stave);
    if (!placement) {
      return this.bows.get(stave) ?? [];
    }
    const rects = [];
    for (const [other, bows] of this.bows) {
      const at = this.staveRows.get(other);
      if (at?.system === placement.system && at.row === placement.row) {
        rects.push(...bows);
      }
    }
    return rects;
  }
  addBow(stave, rect) {
    const bows = this.bows.get(stave);
    if (bows) {
      bows.push(rect);
    } else {
      this.bows.set(stave, [rect]);
    }
  }
  reportBow(stave, rect, crossStave) {
    this.reporter.growPageTop(rect.top);
    this.reporter.growPageBottom(rect.bottom);
    const placement = this.staveRows.get(stave);
    if (!placement) {
      return;
    }
    if (!crossStave) {
      this.spill.recordStave(placement.system, placement.row, stave, rect);
    }
    this.spill.growHighestTop(placement.system, rect.top);
  }
  clearLyricsOfBow(stave, rect, crossStave) {
    const placement = this.staveRows.get(stave);
    if (!placement || crossStave || rect.bottom <= stave.getBottomLineY()) {
      return;
    }
    const over = this.reporter.lyricObstacles(stave).some((lyric) => lyric.left < rect.right && lyric.right > rect.left);
    if (over) {
      this.reporter.dropLyricsBelow(placement.system, placement.row, stave, rect.bottom);
    }
  }
  tieRect(tie) {
    if (tie instanceof DashedTie && tie.inkBounds) {
      return tie.inkBounds;
    }
    const firstX = tie.getFirstX();
    const lastX = tie.getLastX();
    const options = tie.renderOptions;
    const cp = Math.abs(lastX - firstX) < options.shortTieCutoff ? options.cp2Short : options.cp2;
    const direction = tie.getDirection();
    const ends = [...tie.getFirstYs(), ...tie.getLastYs()].map((y) => y + options.yShift * direction);
    const apexes = ends.map((y) => y + cp / 2 * direction);
    const top = Math.min(...ends, ...apexes);
    const bottom = Math.max(...ends, ...apexes);
    return new Rect2(Math.min(firstX, lastX), top, Math.abs(lastX - firstX), bottom - top);
  }
  clearOctaveBracket(bracket, notes, above) {
    const stave = notes[0]?.getStave();
    if (!stave) {
      return;
    }
    const baseline = above ? stave.getYForTopText(OTTAVA_TEXT_LINE) : stave.getYForBottomText(OTTAVA_TEXT_LINE + 1);
    const height = Font2.convertSizeToPixelValue(bracket.fontInfo.size);
    const hw = this.translator.noteheadHalfWidth();
    const xs = notes.map((note) => note.getAbsoluteX());
    const left = Math.min(...xs) - hw;
    const natural = new Rect2(left, baseline - height, Math.max(...xs) + hw - left, height);
    const scoped = new CollisionResolver(this.scratchViewport, {});
    for (const note of notes) {
      scoped.add({ rect: this.reporter.noteObstacle(note), kind: "note" });
    }
    const placed = above ? scoped.liftClear(natural, WORDS_NOTE_CLEARANCE, {}) : scoped.dropClear(natural, WORDS_NOTE_CLEARANCE, {});
    const shift = (above ? natural.y - placed.y : placed.y - natural.y) / stave.getSpacingBetweenLines();
    bracket.setLine(OTTAVA_TEXT_LINE + shift);
    this.reporter.growPageTop(placed.y);
    this.reporter.growPageBottom(placed.bottom);
    const placement = this.staveRows.get(stave);
    if (placement) {
      this.spill.recordStave(placement.system, placement.row, stave, placed);
      if (above) {
        this.spill.growHighestTop(placement.system, placed.y);
      }
    }
  }
}

// spill-tracker.ts
class SpillTracker {
  staveSpill = new Map;
  systemTopByIndex = new Map;
  systemHighestTop = new Map;
  systemDecorationTop = new Map;
  forgetSystem(system) {
    this.staveSpill.delete(system);
    this.systemTopByIndex.delete(system);
    this.systemHighestTop.delete(system);
    this.systemDecorationTop.delete(system);
  }
  recordStave(system, row, stave, rect) {
    const spill = this.spillOf(system, row, stave);
    this.bandSpill(spill.rise, rect, stave.getYForLine(0) - rect.y);
    this.bandSpill(spill.drop, rect, rect.bottom - stave.getBottomLineY());
  }
  recordRise(system, row, stave, rect) {
    const spill = this.spillOf(system, row, stave);
    this.bandSpill(spill.rise, rect, stave.getYForLine(0) - rect.y);
  }
  recordDrop(system, row, stave, rect) {
    const spill = this.spillOf(system, row, stave);
    this.bandSpill(spill.drop, rect, rect.bottom - stave.getBottomLineY());
  }
  seedRow(system, row, stave) {
    this.spillOf(system, row, stave);
  }
  recordSystemTop(system, topY) {
    this.systemTopByIndex.set(system, topY);
  }
  growHighestTop(system, top) {
    this.systemHighestTop.set(system, Math.min(this.systemHighestTop.get(system) ?? Infinity, top));
  }
  growDecorationTop(system, top) {
    this.systemDecorationTop.set(system, Math.min(this.systemDecorationTop.get(system) ?? Infinity, top));
  }
  decorationTopOf(system) {
    return this.systemDecorationTop.get(system);
  }
  observedStaveSpill() {
    return this.staveSpill;
  }
  observedOverflow() {
    const overflow = new Map;
    for (const [idx, topY] of this.systemTopByIndex) {
      const highest = this.systemHighestTop.get(idx);
      if (idx > 0 && highest !== undefined) {
        overflow.set(idx, Math.max(0, topY - highest));
      }
    }
    return overflow;
  }
  systemTops() {
    const tops = new Map;
    for (const [idx, topY] of this.systemTopByIndex) {
      tops.set(idx, Math.min(topY, this.systemHighestTop.get(idx) ?? Infinity, this.systemDecorationTop.get(idx) ?? Infinity));
    }
    return tops;
  }
  spillOf(system, row, stave) {
    let rows = this.staveSpill.get(system);
    if (!rows) {
      rows = new Map;
      this.staveSpill.set(system, rows);
    }
    let spill = rows.get(row);
    if (!spill) {
      spill = {
        rise: new Map,
        drop: new Map,
        lineTop: stave.getYForLine(0) - stave.getY(),
        lineBottom: stave.getBottomLineY() - stave.getY()
      };
      rows.set(row, spill);
    }
    return spill;
  }
  bandSpill(columns, rect, extent) {
    const first = Math.floor(rect.x / SPILL_COLUMN);
    const last = Math.floor(rect.right / SPILL_COLUMN);
    if (extent <= 0 || !Number.isFinite(first) || !Number.isFinite(last)) {
      return;
    }
    for (let column = first;column <= last; column++) {
      columns.set(column, Math.max(columns.get(column) ?? 0, extent));
    }
  }
}

// stave-builder.ts
import {
  Barline as Barline5,
  MultiMeasureRest,
  TimeSignature as TimeSignature4
} from "vexflow/core";

// ending-volta.ts
import { Volta as Volta2 } from "vexflow/core";
var DEFAULT_TEXT_X = 5;
var TEXT_DROP = 15;

class EndingVolta extends Volta2 {
  decoration;
  lineWidth;
  constructor(decoration, x, yShift, opts = {}) {
    super(decoration.type, decoration.label, x, yShift);
    this.decoration = decoration;
    this.lineWidth = opts.lineWidth ?? null;
  }
  draw() {
    this.checkStave().checkContext().openGroup("vexml-volta");
    try {
      const stave = this.checkStave();
      const x = stave.getModifierXShift(this.getPosition());
      const ctx = stave.checkContext();
      this.setRendered();
      const space = stave.getSpacingBetweenLines();
      const px = (tenths, fallback) => tenths === null ? fallback : tenths * space / 10;
      const defaultJog = 1.5 * space;
      const left = this.x + x;
      const topY = stave.getYForTopText(stave.getNumLines()) + this.yShift;
      const { type, startJog, endJog, textX } = this.decoration;
      const line = this.lineWidth ?? 1;
      const begins = type === Volta2.type.BEGIN || type === Volta2.type.BEGIN_END;
      let width = stave.getWidth() - x;
      if (type === Volta2.type.END) {
        width -= 5;
      } else if (type === Volta2.type.BEGIN_END) {
        width -= 3;
      }
      if (begins) {
        ctx.fillRect(left, topY, line, px(startJog, defaultJog));
      }
      if (type === Volta2.type.END || type === Volta2.type.BEGIN_END) {
        ctx.fillRect(left + width, topY, line, px(endJog, defaultJog));
      }
      if (begins) {
        this.renderText(ctx, x + px(textX, DEFAULT_TEXT_X), topY - this.yShift + TEXT_DROP);
      }
      ctx.fillRect(left, topY, width, line);
    } finally {
      this.checkStave().checkContext().closeGroup();
    }
  }
}

// extended-time-signature.ts
import { Element as Element7, TimeSignature as TimeSignature2 } from "vexflow/core";
class ExtendedTimeSignature extends TimeSignature2 {
  spec;
  pieces = [];
  rules = [];
  lineOffset;
  constructor(spec) {
    super("4/4");
    this.spec = spec;
    let x = 0;
    let tallest = 0;
    const place = (face) => {
      const column = this.column(face);
      for (const piece of column.pieces) {
        piece.x += x;
        this.pieces.push(piece);
      }
      for (const rule of column.rules) {
        this.rules.push({ ...rule, x1: rule.x1 + x, x2: rule.x2 + x });
      }
      tallest = Math.max(tallest, column.height);
      x += column.width;
    };
    spec.faces.forEach((face, index) => {
      if (index > 0) {
        x += this.add(GLYPH.timeSigPlus, x, "middle");
      }
      place(face);
    });
    if (spec.interchange) {
      const { relation, face } = spec.interchange;
      const [open, close] = this.joiner(relation);
      x += GAP3;
      if (open) {
        x += this.add(open, x, "middle");
      }
      place(face);
      if (close) {
        x += this.add(close, x, "middle");
      }
    }
    this.width = x;
    this.lineOffset = tallest > 30 ? 0.5 : 0;
  }
  setTimeSig(timeSpec) {
    if (this.pieces) {
      return this;
    }
    return super.setTimeSig(timeSpec);
  }
  drawAt(ctx, stave, x) {
    this.setRendered();
    for (const { element, x: dx, line, stem, lift } of this.pieces) {
      const y = stave.getYForLine(this.lineOf(line)) - (lift ?? 0) * stave.getSpacingBetweenLines();
      element.renderText(ctx, x + dx, y);
      if (stem) {
        const space = stave.getSpacingBetweenLines();
        const width = Math.max(1, space * 0.17);
        const left = x + dx + element.getWidth() - width;
        ctx.save();
        ctx.setFillStyle(Ink.NOTATION);
        ctx.fillRect(left, y - stem * space, width, stem * space);
        ctx.restore();
      }
    }
    const space = stave.getSpacingBetweenLines();
    for (const rule of this.rules) {
      ctx.save();
      ctx.setStrokeStyle(Ink.NOTATION);
      ctx.setLineWidth((rule.width ?? RULE_WIDTH) * space);
      ctx.beginPath();
      ctx.moveTo(x + rule.x1, stave.getYForLine(rule.line1));
      ctx.lineTo(x + rule.x2, stave.getYForLine(rule.line2));
      ctx.stroke();
      ctx.restore();
    }
  }
  lineOf(line) {
    if (line === "top") {
      return this.topLine - this.lineOffset;
    }
    if (line === "base") {
      return 4;
    }
    return line === "bottom" ? this.bottomLine + this.lineOffset : 2;
  }
  joiner(relation) {
    switch (relation) {
      case "parentheses":
        return [GLYPH.timeSigParensLeft, GLYPH.timeSigParensRight];
      case "bracket":
        return [GLYPH.timeSigBracketLeft, GLYPH.timeSigBracketRight];
      case "equals":
        return [GLYPH.timeSigEquals, null];
      case "slash":
        return [GLYPH.timeSigFractionalSlash, null];
      case "hyphen":
        return [GLYPH.timeSigMinus, null];
      default:
        return [null, null];
    }
  }
  add(text, x, line) {
    const element = new Element7;
    element.setText(text);
    this.pieces.push({ element, x, line });
    return element.getWidth() + GAP3;
  }
  column(face) {
    const top = this.textOf(face.beats, true);
    const note = face.note ? NOTE_HEADS[face.beatType] : undefined;
    const bottom = note ? this.noteOf(face, note) : null;
    if (!bottom) {
      const digits = this.textOf(face.beatType, true);
      if (this.spec.separator) {
        return this.separated(top, digits, this.spec.separator);
      }
      const width = Math.max(top.getWidth(), digits.getWidth());
      return {
        rules: [],
        pieces: [
          { element: top, x: (width - top.getWidth()) / 2, line: "top" },
          {
            element: digits,
            x: (width - digits.getWidth()) / 2,
            line: "bottom"
          }
        ],
        width,
        height: Math.max(top.getHeight(), digits.getHeight())
      };
    }
    const width = Math.max(top.getWidth(), bottom.width);
    const shift = (width - bottom.width) / 2;
    return {
      rules: [],
      pieces: [
        { element: top, x: (width - top.getWidth()) / 2, line: "top" },
        ...bottom.pieces.map((piece) => ({ ...piece, x: piece.x + shift }))
      ],
      width,
      height: top.getHeight()
    };
  }
  separated(top, bottom, separator) {
    const height = Math.max(top.getHeight(), bottom.getHeight());
    if (separator === "horizontal") {
      const width = Math.max(top.getWidth(), bottom.getWidth());
      return {
        pieces: [
          {
            element: top,
            x: (width - top.getWidth()) / 2,
            line: "top",
            lift: 0.5
          },
          {
            element: bottom,
            x: (width - bottom.getWidth()) / 2,
            line: "bottom",
            lift: -0.5
          }
        ],
        rules: [
          {
            x1: -RULE_OVERHANG * SPACE,
            line1: 2,
            x2: width + RULE_OVERHANG * SPACE,
            line2: 2,
            width: HORIZONTAL_RULE_WIDTH
          }
        ],
        width,
        height
      };
    }
    if (separator === "diagonal") {
      const overlap = 0.4 * SPACE;
      const slash = SPACE;
      const right = top.getWidth() - overlap + slash;
      return {
        pieces: [
          { element: top, x: 0, line: "top" },
          { element: bottom, x: right - overlap, line: "bottom" }
        ],
        rules: [
          {
            x1: top.getWidth() - overlap,
            line1: 4,
            x2: right,
            line2: 0
          }
        ],
        width: right - overlap + bottom.getWidth(),
        height
      };
    }
    const gap = separator === "vertical" ? 1.2 * SPACE : 0.4 * SPACE;
    const second = top.getWidth() + gap;
    return {
      pieces: [
        { element: top, x: 0, line: "middle" },
        { element: bottom, x: second, line: "middle" }
      ],
      rules: separator === "vertical" ? [
        {
          x1: top.getWidth() + gap / 2,
          line1: 0.5,
          x2: top.getWidth() + gap / 2,
          line2: 3.5
        }
      ] : [],
      width: second + bottom.getWidth(),
      height
    };
  }
  textOf(digits, small) {
    let text = "";
    for (const digit of digits) {
      text += TimeSignature2.getTimeSigCode(digit, small);
    }
    const element = new Element7;
    element.setText(text);
    return element;
  }
  noteOf(face, note) {
    const glyph = (text) => {
      const element = new Element7;
      element.setText(text);
      const size = element.fontInfo.size;
      element.setFontSize((typeof size === "number" ? size : Number.parseFloat(size)) * NOTE_SCALE);
      return element;
    };
    const head = glyph(note.head);
    const stemmed = face.beatType !== "1";
    const pieces = [
      {
        element: head,
        x: 0,
        line: "base",
        stem: stemmed ? STEM_SPACES : undefined
      }
    ];
    let width = head.getWidth();
    if (note.flag) {
      const flag = glyph(note.flag);
      pieces.push({
        element: flag,
        x: head.getWidth() - 1,
        line: "base",
        lift: STEM_SPACES
      });
      width = head.getWidth() - 1 + flag.getWidth();
    }
    if (face.note === "dotted-note") {
      const dot = glyph("");
      pieces.push({ element: dot, x: width + 2, line: "base", lift: 0.5 });
      width += 2 + dot.getWidth();
    }
    return { pieces, width };
  }
}
var GLYPH = {
  noteWhole: "",
  noteHalfUp: "",
  noteQuarterUp: "",
  noteEighthUp: "",
  note16thUp: "",
  note32ndUp: "",
  augmentationDot: "",
  timeSigParensLeft: "",
  timeSigParensRight: "",
  timeSigBracketLeft: "",
  timeSigBracketRight: "",
  timeSigEquals: "",
  timeSigFractionalSlash: "",
  timeSigMinus: "",
  timeSigPlus: ""
};
var NOTE_HEADS = {
  "1": { head: "", flag: null },
  "2": { head: "", flag: null },
  "4": { head: "", flag: null },
  "8": { head: "", flag: "" },
  "16": { head: "", flag: "" },
  "32": { head: "", flag: "" }
};
var NOTE_SCALE = 0.85;
var STEM_SPACES = 1.8;
var GAP3 = 6;
var SPACE = 10;
var RULE_WIDTH = 0.16;
var RULE_OVERHANG = 0.3;
var HORIZONTAL_RULE_WIDTH = 0.4;

// group-time-placeholder.ts
import { TimeSignature as TimeSignature3 } from "vexflow/core";

class GroupTimePlaceholder extends TimeSignature3 {
  group;
  constructor(group, width) {
    super("4/4");
    this.group = group;
    this.width = width;
  }
  setTimeSig(timeSpec) {
    return this.group ? this : super.setTimeSig(timeSpec);
  }
  drawAt(_ctx, _stave, x) {
    this.setRendered();
    this.group.x = x;
  }
}

// group-time-signature.ts
class GroupTimeSignature {
  source;
  scale;
  x = null;
  constructor(source, scale) {
    this.source = source;
    this.scale = scale;
  }
  static scaleFor(staveCount) {
    return Math.min(2.5, 1 + 0.5 * staveCount);
  }
  placeholder() {
    return new GroupTimePlaceholder(this, this.source.make().getWidth() * this.scale);
  }
  draw(ctx, top, bottom) {
    ctx.openGroup("vexml-time-signature");
    try {
      if (this.x === null) {
        return;
      }
      const middle = top.getYForLine(2);
      const center = (middle + bottom.getYForLine(2)) / 2;
      const k = this.scale;
      const frame = {
        getYForLine: (line) => center / k + top.getYForLine(line) - middle,
        getSpacingBetweenLines: () => top.getSpacingBetweenLines()
      };
      ctx.save();
      ctx.scale(k, k);
      this.source.make().drawAt(ctx, frame, this.x / k);
      ctx.restore();
    } finally {
      ctx.closeGroup();
    }
  }
}

// measure-number-plan.ts
class MeasureNumberPlan {
  staves;
  parts;
  marks;
  followsDocument;
  mode;
  constructor(reader, staves, parts, opts) {
    this.staves = staves;
    this.parts = parts;
    const { mode } = opts;
    this.mode = mode;
    this.marks = parts.map((part) => {
      let current = null;
      return part.measures.map((measure) => {
        current = reader.measureNumberingOf(measure) ?? current;
        return current;
      });
    });
    this.followsDocument = mode === "document" && this.marks.some((marks) => marks.some((mark) => mark !== null));
  }
  numbers(partIndex, staffNumber, m, isSystemStart) {
    if (!this.followsDocument) {
      const top = this.topStave(m);
      return top?.partIndex === partIndex && top.staffNumber === staffNumber && this.onCadence(m, isSystemStart);
    }
    return this.marks.some((marks, from) => {
      const mark = marks[m];
      if (!mark || !this.shows(mark, from, m, isSystemStart)) {
        return false;
      }
      return this.targets(mark, from, m).some((target) => target.partIndex === partIndex && target.staffNumber === staffNumber);
    });
  }
  onCadence(m, isSystemStart) {
    switch (this.mode) {
      case "none":
        return false;
      case "document":
      case "system":
        return isSystemStart;
      case "every":
        return true;
      case "every-2":
        return isSystemStart || m % 2 === 0;
      case "every-3":
        return isSystemStart || m % 3 === 0;
    }
  }
  shows(mark, partIndex, m, isSystemStart) {
    if (this.parts[partIndex]?.measures[m]?.isImplicit) {
      return false;
    }
    switch (mark.value) {
      case "none":
        return false;
      case "measure":
        return true;
      case "system":
        return isSystemStart;
    }
  }
  targets(mark, from, m) {
    const relation = mark.system ?? "only-top";
    const own = this.ownStave(from, m, mark.staff);
    const top = this.topStave(m);
    const bottom = this.bottomStave(m);
    const targets = {
      "only-top": [top],
      "only-bottom": [bottom],
      "also-top": [own, top],
      "also-bottom": [own, bottom],
      none: [own]
    }[relation];
    return targets.filter((target) => target !== null);
  }
  ownStave(partIndex, m, staff) {
    const visible = this.visibleOf(partIndex, m);
    const staffNumber = staff !== null && visible.includes(staff) ? staff : visible[0];
    return staffNumber ? { partIndex, staffNumber } : null;
  }
  topStave(m) {
    for (let partIndex = 0;partIndex < this.parts.length; partIndex++) {
      const own = this.ownStave(partIndex, m, null);
      if (own) {
        return own;
      }
    }
    return null;
  }
  bottomStave(m) {
    for (let partIndex = this.parts.length - 1;partIndex >= 0; partIndex--) {
      const own = this.ownStave(partIndex, m, null);
      if (own) {
        return own;
      }
    }
    return null;
  }
  visibleOf(partIndex, m) {
    const part = this.parts[partIndex];
    return part?.measures[m] ? this.staves.visibleNumbers(part) : [];
  }
}

// stave-builder.ts
class StaveBuilder {
  parts;
  partGroups;
  groupTimeSpans;
  totalStaves;
  measureNumbers;
  textColor;
  staveOffsets;
  systemStaveOffsets;
  voltaLifts;
  appearance;
  signatures;
  reader;
  staves;
  context;
  collisionResolver;
  spill;
  gaps;
  multiRests;
  multiRestSymbols;
  factory;
  constructor(opts) {
    const { reader, staves } = opts;
    this.signatures = opts.signatures;
    this.reader = reader;
    this.staves = staves;
    this.context = opts.context;
    this.collisionResolver = opts.collisionResolver;
    this.spill = opts.spill;
    this.parts = opts.parts;
    this.partGroups = opts.partGroups;
    this.groupTimeSpans = opts.groupTimeSpans;
    this.totalStaves = opts.totalStaves;
    this.measureNumbers = new MeasureNumberPlan(reader, staves, opts.parts, {
      mode: opts.measureNumbering
    });
    this.textColor = opts.textColor;
    this.staveOffsets = opts.staveOffsets;
    this.systemStaveOffsets = opts.systemStaveOffsets;
    this.voltaLifts = opts.voltaLifts;
    this.appearance = opts.appearance;
    this.gaps = opts.gaps.byMeasureIndex();
    const multiRests = this.reader.multiRestsOf(this.parts);
    this.multiRests = multiRests.leads;
    this.multiRestSymbols = multiRests.symbols;
    this.factory = new StaveFactory(this.signatures, staves, reader);
  }
  endCancelOf(next, measure, staffNumber) {
    const key = next?.getKey(staffNumber) ?? null;
    const prevKey = measure.getKey(staffNumber);
    if (!next || key?.getAttribute("print-object") === "no" || this.reader.keyIdentity(key) === this.reader.keyIdentity(prevKey) || this.factory.customKey(next, staffNumber).length > 0) {
      return null;
    }
    const cancel = this.signatures.keyCancel(key, prevKey);
    return cancel?.location === "before-barline" ? cancel : null;
  }
  build(part, measure, staffNumber, visibleCount, column) {
    const m = column.measureIndex;
    const clef = measure.getClef(staffNumber);
    const offsets = this.systemStaveOffsets?.get(column.systemIndex) ?? this.staveOffsets;
    const staveY = column.systemY + (offsets[column.staveRow] ?? 0);
    const placed = this.factory.create(part, measure, staffNumber, column.measureX, staveY, column.measureWidth);
    const { stave, isTab } = placed;
    const staffWidth = this.appearance.lineWidth("staff");
    if (staffWidth !== null && !isTab) {
      stave.setStyle({ ...stave.getStyle(), lineWidth: staffWidth });
    }
    const legerWidth = this.appearance.lineWidth("leger");
    if (legerWidth !== null) {
      stave.setDefaultLedgerLineStyle({
        ...stave.getDefaultLedgerLineStyle(),
        lineWidth: legerWidth
      });
    }
    const repeatBegin = column.decoration.repeatBegin && !column.suppressBegRepeat;
    let begBarType = Barline5.type.NONE;
    if (repeatBegin) {
      begBarType = Barline5.type.REPEAT_BEGIN;
    } else if (isTab && this.totalStaves === 1 && column.isSystemStart) {
      begBarType = Barline5.type.SINGLE;
    }
    stave.setBegBarType(begBarType);
    const styled = column.barStyle ? BAR_STYLE_TYPES[column.barStyle] : undefined;
    let endBarType = Barline5.type.SINGLE;
    if (column.repeatBoth) {
      endBarType = Barline5.type.REPEAT_BOTH;
    } else if (column.decoration.repeatEnd) {
      endBarType = Barline5.type.REPEAT_END;
    } else if (this.totalStaves > 1) {
      endBarType = Barline5.type.NONE;
    } else if (column.barStyle) {
      endBarType = styled ?? Barline5.type.NONE;
    } else if (column.isLastMeasure) {
      endBarType = Barline5.type.END;
    }
    stave.setEndBarType(endBarType);
    const volta = column.decoration.volta;
    const voltaBase = stave.getYForLine(0) - VOLTA_STAVE_GAP;
    const voltaTop = voltaBase - (this.voltaLifts.get(column.systemIndex) ?? 0);
    if (volta && column.staveRow === 0) {
      stave.addModifier(new EndingVolta(volta, stave.getX(), voltaTop - stave.getYForTopText(stave.getNumLines()), { lineWidth: this.appearance.lineWidth("ending") }));
    }
    const prevMeasure = part.measures[m - 1];
    const key = measure.getKey(staffNumber);
    const prevKey = prevMeasure?.getKey(staffNumber) ?? null;
    const keyChanged = this.reader.keyIdentity(key) !== this.reader.keyIdentity(prevKey);
    const customKey = isTab ? [] : this.factory.customKey(measure, staffNumber);
    const cancel = keyChanged && customKey.length === 0 ? this.signatures.keyCancel(key, prevKey) : null;
    const keyCancel = cancel && cancel.location !== "before-barline" ? cancel : undefined;
    const nextCancel = isTab ? null : this.endCancelOf(part.measures[m + 1], measure, staffNumber);
    if (nextCancel) {
      this.factory.addEndCancel(stave, nextCancel, this.reader.clefAtEndOf(measure, staffNumber));
    }
    const clefChanged = m > 0 && this.signatures.vexflowClefSpec(clef) !== this.signatures.vexflowClefSpec(this.reader.clefAtEndOf(prevMeasure, staffNumber));
    if (column.isSystemStart) {
      this.factory.addOpening(placed, measure, staffNumber, keyCancel);
    } else {
      if (clef && clefChanged && !isTab && clef.getAttribute("print-object") !== "no") {
        this.factory.addClefChange(stave, measure, staffNumber);
      }
      if (keyChanged && !isTab) {
        this.factory.addKey(stave, measure, staffNumber, keyCancel);
      }
    }
    const partIndex = this.parts.indexOf(part);
    const span = this.groupTimeSpans.findIndex((s) => partIndex >= s.fromPart && partIndex <= s.toPart);
    const time = measure.getTime(staffNumber);
    const timeSpec = this.signatures.timeSignatureSpec(time) ?? (column.opensScore && !time ? "4/4" : null);
    const prevTimeSpec = this.signatures.timeSignatureSpec(prevMeasure?.getTime(staffNumber) ?? null);
    if (timeSpec && !isTab && time?.getAttribute("print-object") !== "no" && (column.opensScore || timeSpec !== prevTimeSpec)) {
      const extended = this.signatures.extendedTimeSpec(time);
      const make = () => extended ? new ExtendedTimeSignature(extended) : new TimeSignature4(timeSpec);
      if (span >= 0) {
        const group = column.groupTimes.get(span) ?? new GroupTimeSignature({ make }, GroupTimeSignature.scaleFor(this.staves.groupStaveCount(this.parts, this.groupTimeSpans[span] ?? { fromPart: 0, toPart: 0 })));
        column.groupTimes.set(span, group);
        stave.addModifier(group.placeholder());
      } else if (extended) {
        stave.addModifier(make());
      } else {
        const plain = new TimeSignature4(timeSpec);
        scaleTimeSignature(plain, stave);
        stave.addModifier(plain);
      }
    } else if (span >= 0 && !isTab) {
      const group = column.groupTimes.get(span);
      if (group) {
        stave.addModifier(group.placeholder());
      }
    }
    const showNumber = !this.gaps.has(m) && this.measureNumbers.numbers(partIndex, staffNumber, m, column.isSystemStart);
    const partTop = this.staves.visibleNumbers(part)[0] === staffNumber;
    const numberOccluded = column.isSystemStart && partTop && (visibleCount > 1 && this.staves.symbolOf(part) === "bracket" || partIndex === 0 && this.staves.partsPairTabWithNotation(this.parts) || this.partGroups.some((group) => group.symbol === "bracket" && group.fromPart === partIndex));
    const numberBeside = !numberOccluded && column.staveRow > 0;
    if (showNumber && !numberOccluded && !numberBeside) {
      stave.setMeasure(Number(measure.number));
      this.context.save();
      this.context.setFont(stave.getFont());
      this.addMeasureNumberObstacle(String(Number(measure.number)), stave.getX(), stave.getYForTopText(0) + 3, true);
      this.context.restore();
    }
    if (volta && column.staveRow === 0) {
      const rect = new Rect2(stave.getX(), voltaTop, stave.getWidth(), VOLTA_LABEL_DROP);
      this.collisionResolver.add({ rect, kind: "annotation" });
      this.spill.growDecorationTop(column.systemIndex, rect.y);
      this.spill.growHighestTop(column.systemIndex, rect.y);
    }
    if (column.staveRow === 0 && column.nextVolta) {
      this.collisionResolver.add({
        rect: new Rect2(column.nextVolta.x, voltaTop, column.nextVolta.width, VOLTA_LABEL_DROP),
        kind: "annotation"
      });
    }
    if (showNumber && (numberOccluded || numberBeside)) {
      const baseline = stave.getYForTopText(0) + (numberOccluded ? -14 : 3);
      this.context.save();
      this.context.setFont(stave.getFont());
      this.context.setFillStyle(this.textColor);
      this.context.fillText(measure.number, stave.getX() + 4, baseline);
      this.addMeasureNumberObstacle(measure.number, stave.getX() + 4, baseline, false);
      this.context.restore();
    }
    this.spill.seedRow(column.systemIndex, column.staveRow, stave);
    return {
      stave,
      isTab,
      volta: volta && column.staveRow === 0 ? {
        box: new Rect2(stave.getX(), voltaBase, stave.getWidth(), VOLTA_LABEL_DROP),
        top: voltaTop
      } : null,
      multiRestCount: this.multiRests.get(m) ?? null,
      multiRestSymbols: this.multiRestSymbols.has(m),
      measureStyle: this.reader.measureStyleOf(measure, staffNumber)
    };
  }
  drawMultiRest(stave, count, symbols) {
    this.context.openGroup("vexml-multi-rest");
    try {
      new MultiMeasureRest(count, {
        numberOfMeasures: count,
        useSymbols: symbols,
        paddingLeft: stave.getNoteStartX() - stave.getX() + MULTI_REST_PADDING,
        paddingRight: MULTI_REST_PADDING
      }).setStave(stave).setContext(this.context).draw();
    } finally {
      this.context.closeGroup();
    }
  }
  addMeasureNumberObstacle(label, x, baseline, centered) {
    const ink = this.context.measureText(label);
    this.collisionResolver.add({
      rect: new Rect2(centered ? x - ink.width / 2 : x, baseline + ink.y, ink.width, ink.height),
      kind: "annotation"
    });
  }
}

// stem-width.ts
import { Stem as Stem5 } from "vexflow/core";

class StemWidth {
  static installed = false;
  static width = null;
  set(width) {
    if (!StemWidth.installed) {
      StemWidth.installed = true;
      const vexflow = Object.getOwnPropertyDescriptor(Stem5, "WIDTH")?.get;
      Object.defineProperty(Stem5, "WIDTH", {
        configurable: true,
        get: () => StemWidth.width ?? vexflow?.call(Stem5)
      });
    }
    StemWidth.width = width;
  }
}

// system-formatter.ts
import {
  Barline as Barline6,
  BarNote as BarNote2,
  Bend,
  ClefNote,
  Formatter as Formatter2,
  GraceNoteGroup as GraceNoteGroup3,
  Modifier as Modifier9,
  Stave as Stave4,
  StaveModifierPosition as StaveModifierPosition4,
  StaveNote as StaveNote7,
  Stem as Stem6,
  TickContext,
  TimeSignature as TimeSignature5,
  Vibrato
} from "vexflow/core";

// after-grace-group.ts
import {
  GraceNoteGroup as GraceNoteGroup2,
  Modifier as Modifier8
} from "vexflow/core";

class AfterGraceGroup extends GraceNoteGroup2 {
  reach = 0;
  constructor(...args) {
    super(...args);
    this.setPosition(Modifier8.Position.RIGHT);
  }
  setReach(px) {
    this.reach = px;
  }
  getLayoutElements() {
    const elements = super.getLayoutElements();
    this.slide();
    return elements;
  }
  getBoundingBox() {
    const box = super.getBoundingBox();
    const graces = this.getGraceNotes();
    if (!this.slide()) {
      return box;
    }
    return graces.map((grace) => grace.getBoundingBox()).reduce((merged, next) => merged.mergeWith(next));
  }
  slide() {
    const graces = this.getGraceNotes();
    const first = graces[0]?.getTickContext().getXOffset();
    const start = this.checkAttachedNote().getTickContext().getX() + this.reach;
    if (first === undefined || first >= start) {
      return false;
    }
    for (const grace of graces) {
      const tick = grace.getTickContext();
      tick.setXOffset(tick.getXOffset() + start - first);
    }
    return true;
  }
}

// technical-mark.ts
function isTechnicalMark(modifier) {
  return modifier?.kind === "technical";
}

// voice-articulation-placer.ts
import { StaveNote as StaveNote6 } from "vexflow/core";
class VoiceArticulationPlacer {
  place(voices) {
    if (voices.length < 2) {
      return;
    }
    const onsets = voices.map((voice) => this.onsets(voice.getTickables()));
    onsets.forEach((notes, voiceIndex) => {
      for (const [tick, note] of notes) {
        const marks = note.getModifiers().filter((m) => m instanceof NoteheadArticulation);
        if (marks.length === 0) {
          continue;
        }
        const others = onsets.filter((_, other) => other !== voiceIndex).map((other) => other.get(tick)).filter((other) => other !== undefined);
        if (this.crowded(note, others)) {
          for (const mark of marks) {
            mark.setSide(note, "stem");
          }
        }
      }
    });
  }
  crowded(note, others) {
    const lines = (n) => n.getKeyProps().map((p) => p.line);
    if (note.getStemDirection() === 1) {
      const bottom = Math.min(...lines(note));
      return others.some((o) => lines(o).some((line) => line < bottom));
    }
    const top = Math.max(...lines(note));
    return others.some((o) => lines(o).some((line) => line > top));
  }
  onsets(tickables) {
    const out = new Map;
    let tick = 0;
    for (const tickable of tickables) {
      if (tickable instanceof StaveNote6 && !tickable.isRest() && tickable.renderOptions.draw !== false) {
        out.set(tick, tickable);
      }
      tick += tickable.getTicks().value();
    }
    return out;
  }
}

// system-formatter.ts
class SystemFormatter {
  opts;
  context;
  translator;
  chords;
  spanners;
  connectorDrawer;
  lyricPlacer;
  collisionResolver;
  spill;
  reporter;
  softmaxFactor;
  notationColor;
  byLead;
  crossStaveNotes;
  shrunk = new WeakSet;
  articulationPlacer = new VoiceArticulationPlacer;
  constructor(opts) {
    this.opts = opts;
    this.context = opts.context;
    this.translator = opts.translator;
    this.chords = opts.chords;
    this.spanners = opts.spanners;
    this.connectorDrawer = opts.connectorDrawer;
    this.lyricPlacer = opts.lyricPlacer;
    this.collisionResolver = opts.collisionResolver;
    this.spill = opts.spill;
    this.reporter = opts.reporter;
    this.softmaxFactor = opts.softmaxFactor;
    this.notationColor = opts.notationColor;
    this.byLead = opts.byLead;
    this.crossStaveNotes = opts.crossStaveNotes;
  }
  alignBegModifiers(staves) {
    const repeats = [];
    const timeSignatures = [];
    for (const stave of staves) {
      stave.format();
      for (const modifier of stave.getModifiers(StaveModifierPosition4.BEGIN)) {
        if (modifier instanceof Barline6 && modifier.getType() === Barline6.type.REPEAT_BEGIN) {
          repeats.push(modifier);
        } else if (modifier.getCategory() === TimeSignature5.CATEGORY) {
          timeSignatures.push(modifier);
        }
      }
    }
    this.squareUp(timeSignatures);
    return repeats.length > 0 ? this.squareUp(repeats) : null;
  }
  shrinkNoteheads(note, stave) {
    const ratio = stave.getSpacingBetweenLines() / 10;
    if (ratio === 1 || !(note instanceof StaveNote7)) {
      return;
    }
    for (const head of note.noteHeads) {
      if (!this.shrunk.has(head)) {
        this.shrunk.add(head);
        head.setFontSize(head.fontSizeInPoints * ratio);
      }
    }
    const sized = [
      ...note.getModifiers().filter((m) => m.getCategory() === "Accidental"),
      note.flag
    ];
    for (const el of sized) {
      if (el && !this.shrunk.has(el)) {
        this.shrunk.add(el);
        el.setFontSize(el.fontSizeInPoints * ratio);
      }
    }
    if (!this.shrunk.has(note)) {
      this.shrunk.add(note);
      note.setStemLength(Stem6.HEIGHT * ratio);
      note.getStem()?.setExtension(note.getStemExtension());
    }
  }
  formatAndDraw(pending, column) {
    if (pending.length === 0) {
      return { top: Infinity, bottom: 0 };
    }
    const startX = Math.max(...pending.map((p) => p.stave.getNoteStartX())) + column.measureLeadingPad;
    let noteEndX = 0;
    for (const p of pending) {
      p.stave.setNoteStartX(startX);
      noteEndX = p.stave.getNoteEndX();
      for (const vexVoice of p.vexVoices) {
        vexVoice.setStave(p.stave);
        for (const note of vexVoice.getTickables()) {
          note.setStave(p.stave);
          this.shrinkNoteheads(note, p.stave);
        }
      }
    }
    const formatter = new Formatter2({ softmaxFactor: this.softmaxFactor });
    for (const p of pending) {
      this.articulationPlacer.place(p.vexVoices);
      formatter.joinVoices(p.vexVoices);
    }
    const allVoices = pending.flatMap((p) => p.vexVoices);
    const justifyWidth = noteEndX - startX - Stave4.defaultPadding - column.measureTrailingPad;
    formatter.format(allVoices, Math.max(1, justifyWidth), {
      context: this.context
    });
    this.closeHiddenGaps(allVoices);
    if (this.opts.documentPositions) {
      for (const p of pending) {
        for (const { note, chord } of [...p.noteChords, ...p.tabChords]) {
          const position = this.opts.reader.positionOf(chord.lead);
          if (position?.x !== null && position?.x !== undefined) {
            const x = note.getTickContext().getX() + p.stave.getX() + position.x + position.dx - note.getAbsoluteX() - note.getXShift();
            const context = new TickContext().addTickable(note).preFormat();
            context.setX(x);
          }
        }
      }
    }
    this.pushAfterGraces(allVoices, noteEndX);
    for (const p of pending) {
      this.placeRests(p);
    }
    let bottom = 0;
    let top = Infinity;
    const notationGraceWidths = new Map;
    for (const p of pending) {
      if (p.isTab) {
        continue;
      }
      for (const vexVoice of p.vexVoices) {
        for (const note of vexVoice.getTickables()) {
          const group = this.graceGroupOf(this.translator, note);
          if (group) {
            notationGraceWidths.set(note.getTickContext(), group.getWidth());
          }
        }
      }
    }
    const lyricDrops = new Map;
    for (const p of pending) {
      if (p.isTab) {
        continue;
      }
      const floorY = p.stave.getBottomLineY();
      let drop = Math.max(lyricDrops.get(p.row) ?? 0, LYRIC_Y_OFFSET);
      for (const note of p.staveNotes) {
        note.setStave(p.stave);
        drop = Math.max(drop, this.noteBottom(note) + LYRIC_NOTE_CLEARANCE - floorY);
        const marksBottom = this.belowMarksBottom(note, p.stave);
        if (marksBottom !== null) {
          drop = Math.max(drop, marksBottom + LYRIC_NOTE_CLEARANCE - floorY);
        }
      }
      lyricDrops.set(p.row, drop);
      this.lyricPlacer.recordDrop(column.systemIndex, p.row, drop);
    }
    for (const p of pending) {
      if (p.isTab) {
        const tabStave = p.stave;
        tabStave.setNoteStartX(startX + this.translator.noteheadHalfWidth());
        for (const vexVoice of p.vexVoices) {
          for (const note of vexVoice.getTickables()) {
            note.setStave(tabStave);
          }
        }
        this.stretchVibratos(tabStave, p.vexVoices);
        this.stretchBends(tabStave, p.vexVoices);
        this.alignTabGraces(p.vexVoices, notationGraceWidths);
      }
      this.pinTechnicals(p);
      this.lyricPlacer.pin(p.staveNotes, p.row, p.stave.getBottomLineY() + Math.max(lyricDrops.get(p.row) ?? LYRIC_Y_OFFSET, this.lyricPlacer.carriedDrop(column.systemIndex, p.row)), { system: column.systemIndex });
      for (const vexVoice of p.vexVoices) {
        for (const note of vexVoice.getTickables()) {
          if (note instanceof BarNote2 || note instanceof ClefNote) {
            continue;
          }
          note.getStem()?.setStyle({
            strokeStyle: this.notationColor
          });
          if (note instanceof StaveNote7) {
            note.setLedgerLineStyle({ strokeStyle: Ink.LEDGER });
          }
        }
      }
      for (const { note, chord } of [...p.noteChords, ...p.graceChords]) {
        this.chords.applyNoteColors(note, chord);
      }
      for (const vexVoice of p.vexVoices) {
        vexVoice.draw(this.context, p.stave);
      }
      for (const { note, style } of p.midBars) {
        if (BAR_STYLE_TYPES[style] === undefined) {
          this.connectorDrawer.paintBarStyle(p.stave, note.getAbsoluteX(), style);
        }
      }
      for (const beam of p.beams) {
        beam.setContext(this.context).draw();
        const notes = beam.getNotes();
        if (notes.some((note) => this.crossStaveNotes.has(note))) {
          const tips = notes.map((note) => note.getStemExtents().topY);
          const left = notes[0]?.getStemX() ?? 0;
          const right = notes[notes.length - 1]?.getStemX() ?? left;
          const rect = new Rect2(left, Math.min(...tips), right - left, Math.max(...tips) - Math.min(...tips));
          this.recordStaveSpill(this.spillHost(rect, notes, pending, p), rect);
        }
      }
      for (const tremolo of p.tremolos) {
        tremolo.setContext(this.context).draw();
      }
      for (const tuplet of p.tuplets) {
        tuplet.setContext(this.context).draw();
        const rect = this.translator.tupletRect(tuplet);
        const host = this.spillHost(rect, tuplet.getNotes(), pending, p);
        this.collisionResolver.add({ rect, kind: "note", band: host.row });
        this.recordStaveSpill(host, rect);
      }
      for (const note of p.staveNotes) {
        const box = note.getBoundingBox();
        bottom = Math.max(bottom, box.getY() + box.getH());
        top = Math.min(top, this.noteTop(note), this.accidentalTop(note));
        const heads = this.crossStaveNotes.has(note) ? note.getNoteHeadBounds() : null;
        const spillTop = heads ? heads.yTop : this.noteTop(note);
        const spillBottom = heads ? heads.yBottom : box.getY() + box.getH();
        this.recordStaveSpill(p, new Rect2(box.getX(), spillTop, box.getW(), spillBottom - spillTop));
        this.collisionResolver.add({
          rect: heads ? new Rect2(box.getX(), spillTop, box.getW(), spillBottom - spillTop) : this.noteRect(note),
          kind: "note",
          band: p.row
        });
        if (heads && note.hasStem()) {
          const { topY, baseY } = note.getStemExtents();
          this.collisionResolver.add({
            rect: new Rect2(note.getStemX() - Stem6.WIDTH / 2, Math.min(topY, baseY), Stem6.WIDTH, Math.abs(baseY - topY)),
            kind: "stem"
          });
        }
        if (p.tiedNotes.has(note) && note.getStemDirection() === Stem6.DOWN) {
          this.collisionResolver.add({
            rect: this.tieApexRect(note),
            kind: "tie",
            band: p.row
          });
        }
      }
      for (const { note, chord } of p.tabChords) {
        const rect = this.tabArcApexRect(p.stave, note, chord.lead);
        if (rect) {
          this.collisionResolver.add({ rect, kind: "tie", band: p.row });
        }
        const bend = this.tabBendRect(note);
        if (bend) {
          this.collisionResolver.add({ rect: bend, kind: "note", band: p.row });
        }
      }
      const hasLyrics = p.noteChords.some(({ chord }) => chord.notes.some((note) => this.opts.reader.lyricsOf(note).length > 0));
      for (const slur of this.spanners.buildSlurs(p.noteChords.map(({ chord }) => chord), this.byLead)) {
        if (slur.stave === p.stave && !slur.crossStave) {
          this.collisionResolver.add({
            rect: new Rect2(slur.left, slur.top, slur.right - slur.left, slur.bottom - slur.top),
            kind: "tie",
            band: p.row
          });
          const drop = slur.bottom + LYRIC_NOTE_CLEARANCE - p.stave.getBottomLineY();
          if (hasLyrics && drop > (lyricDrops.get(p.row) ?? LYRIC_Y_OFFSET)) {
            this.lyricPlacer.recordDrop(column.systemIndex, p.row, drop);
          }
        }
      }
    }
    return { top, bottom };
  }
  tabArcApexRect(stave, note, lead) {
    if (!lead.slurs.length && !lead.hammerOns.length && !lead.pullOffs.length) {
      return null;
    }
    const y = Math.min(...note.getYs());
    if (y - stave.getSpacingBetweenLines() >= stave.getYForLine(0)) {
      return null;
    }
    const hw = this.translator.noteheadHalfWidth();
    return new Rect2(note.getAbsoluteX() - hw, y - TAB_CURVE_RISE, 2 * hw, TAB_CURVE_RISE);
  }
  tabBendRect(note) {
    const bend = this.translator.findModifier(note, Bend.CATEGORY);
    return bend?.inkRect() ?? null;
  }
  closeHiddenGaps(voices) {
    const contexts = new Map;
    for (const voice of voices) {
      for (const note of voice.getTickables()) {
        const context = note.checkTickContext();
        const hidden = note instanceof InvisibleStaveNote && note.spacingHidden;
        contexts.set(context, (contexts.get(context) ?? true) && hidden);
      }
    }
    const sorted = [...contexts.keys()].sort((a, b) => a.getX() - b.getX());
    if (![...contexts.values()].some(Boolean) || sorted.length < 2) {
      return;
    }
    const xs = sorted.map((c) => c.getX());
    const first = xs[0] ?? 0;
    const last = xs[xs.length - 1] ?? 0;
    const removed = [];
    let cut = 0;
    for (const [i, context] of sorted.entries()) {
      removed.push(cut);
      const next = sorted[i + 1];
      if (contexts.get(context) && next) {
        cut += (xs[i + 1] ?? 0) - (xs[i] ?? 0);
      }
    }
    const span = last - first;
    if (span <= 0 || cut >= span) {
      return;
    }
    const scale = span / (span - cut);
    for (const [i, context] of sorted.entries()) {
      context.setX(first + ((xs[i] ?? 0) - first - (removed[i] ?? 0)) * scale);
    }
  }
  pushAfterGraces(voices, areaEndX) {
    for (const voice of voices) {
      const tickables = voice.getTickables();
      for (const [i, note] of tickables.entries()) {
        for (const group of note.getModifiers()) {
          if (!(group instanceof AfterGraceGroup)) {
            continue;
          }
          const next = tickables[i + 1];
          const endX = next ? next.getAbsoluteX() : areaEndX;
          group.setReach(endX - GRACE_SPACING - group.getWidth() - note.getAbsoluteX());
        }
      }
    }
  }
  noteTop(note) {
    let top = this.noteGlyphTop(note);
    for (const mod of note.getModifiers()) {
      if (isTechnicalMark(mod)) {
        if (!mod.below) {
          top = Math.min(top, mod.getBoundingBox().getY());
        }
      } else if (mod.getCategory() === "Articulation" && mod.getPosition() === Modifier9.Position.ABOVE) {
        top = Math.min(top, mod.getBoundingBox().getY());
      }
    }
    return top;
  }
  accidentalTop(note) {
    let top = Infinity;
    for (const mod of note.getModifiers()) {
      if (mod.getCategory() === "Accidental") {
        top = Math.min(top, mod.getBoundingBox().getY());
      }
    }
    return top;
  }
  noteGlyphTop(note) {
    let top = note.getNoteHeadBounds().yTop;
    if (note.getStem()) {
      const { topY, baseY } = note.getStemExtents();
      top = Math.min(top, topY, baseY);
    }
    return top;
  }
  noteBottom(note) {
    let bottom = note.getNoteHeadBounds().yBottom;
    if (note.getStem()) {
      const { topY, baseY } = note.getStemExtents();
      bottom = Math.max(bottom, topY, baseY);
    }
    return bottom;
  }
  belowMarksBottom(note, stave) {
    let bottom = null;
    let column = 0;
    for (const mod of note.getModifiers()) {
      if (isTechnicalMark(mod)) {
        if (mod.below) {
          column += mod.rowHeight();
        }
      } else if (mod instanceof StaveArticulation && mod.getPosition() === Modifier9.Position.BELOW) {
        bottom = Math.max(bottom ?? -Infinity, mod.belowBottomY());
      }
    }
    if (column > 0) {
      const edge = Math.max(stave.getBottomLineY(), this.noteBottom(note));
      bottom = Math.max(bottom ?? -Infinity, edge + TECHNICAL_EDGE_GAP + column);
    }
    return bottom;
  }
  pinTechnicals(p) {
    for (const note of p.staveNotes) {
      const marks = note.getModifiers().filter(isTechnicalMark);
      if (marks.length === 0) {
        continue;
      }
      note.setStave(p.stave);
      const sides = [
        {
          below: false,
          edge: Math.min(p.stave.getYForLine(0), this.noteGlyphTop(note)) - TECHNICAL_EDGE_GAP
        },
        {
          below: true,
          edge: Math.max(p.stave.getBottomLineY(), this.noteBottom(note)) + TECHNICAL_EDGE_GAP
        }
      ];
      for (const { below, edge } of sides) {
        let y = edge;
        for (const mark of marks.filter((m) => m.below === below)) {
          const height = mark.rowHeight();
          if (below) {
            y += height;
          }
          mark.setBaselineY(y);
          mark.setStyle({ fillStyle: this.notationColor });
          const w = mark.getWidth();
          this.collisionResolver.add({
            rect: new Rect2(note.getAbsoluteX() - w / 2, y - height, w, height),
            kind: "annotation",
            band: p.row
          });
          if (!below) {
            y -= height;
          }
        }
      }
    }
  }
  placeRests(p) {
    if (p.isTab || p.vexVoices.length < 2) {
      return;
    }
    const resolver = new CollisionResolver(new Rect2(-FAR, -FAR, 2 * FAR, 2 * FAR), {});
    const visible = p.noteChords.filter(({ note }) => !(note instanceof InvisibleStaveNote) && note.renderOptions.draw !== false);
    for (const { note } of visible) {
      if (!note.isRest()) {
        for (const head of note.noteHeads) {
          resolver.add({ rect: this.headRect(note, head), kind: "note" });
        }
        if (note.hasStem() && !this.crossStaveNotes.has(note)) {
          const { topY, baseY } = note.getStemExtents();
          resolver.add({
            rect: new Rect2(note.getStemX() - Stem6.WIDTH / 2, Math.min(topY, baseY), Stem6.WIDTH, Math.abs(baseY - topY)),
            kind: "note"
          });
        }
      }
    }
    const voiceOf = new Map(p.vexVoices.flatMap((voice, index) => voice.getTickables().map((note) => [note, index])));
    const step = p.stave.getSpacingBetweenLines() / 2;
    for (const { note, chord } of visible) {
      if (!note.isRest()) {
        continue;
      }
      const head = note.noteHeads[0];
      if (!head) {
        continue;
      }
      let rect = this.headRect(note, head);
      if (!chord.lead.restPosition && resolver.query(rect).length > 0) {
        const up = voiceOf.get(note) === 0;
        const clear = up ? resolver.liftClear(rect, step, {}) : resolver.dropClear(rect, step, {});
        const steps = Math.ceil(Math.abs(clear.y - rect.y) / step);
        if (steps > 0) {
          const dy = (up ? -1 : 1) * steps * step;
          note.setKeyLine(0, note.getKeyLine(0) - dy / p.stave.getSpacingBetweenLines());
          note.setStave(p.stave);
          this.shrinkNoteheads(note, p.stave);
          rect = this.headRect(note, note.noteHeads[0] ?? head);
        }
      }
      resolver.add({ rect, kind: "note" });
    }
  }
  headRect(note, head) {
    const metrics = head.getTextMetrics();
    const displacement = head.isDisplaced() ? (head.getWidth() - Stem6.WIDTH / 2) * note.getStemDirection() : 0;
    return new Rect2(note.getNoteHeadBeginX() + displacement, head.getY() - metrics.actualBoundingBoxAscent, head.getWidth(), metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent);
  }
  noteRect(note) {
    const top = this.noteTop(note);
    const bottom = this.noteBottom(note);
    const hw = this.translator.noteheadHalfWidth();
    return new Rect2(note.getAbsoluteX() - hw, top, 2 * hw, bottom - top);
  }
  tieApexRect(note) {
    const headTop = Math.min(...note.getYs());
    const hw = this.translator.noteheadHalfWidth();
    return new Rect2(note.getAbsoluteX() - hw, headTop - TIE_APEX_RISE, 2 * hw, TIE_APEX_RISE);
  }
  stretchBends(stave, voices) {
    for (const voice of voices) {
      const tickables = voice.getTickables();
      tickables.forEach((note, i) => {
        const bend = this.translator.findModifier(note, Bend.CATEGORY);
        if (!bend) {
          return;
        }
        const startX = note.getAbsoluteX() + note.getWidth() + 5;
        const endX = tickables[i + 1]?.getAbsoluteX() ?? stave.getNoteEndX();
        bend.stretch(Math.max(0, endX - startX));
      });
    }
  }
  stretchVibratos(stave, voices) {
    for (const voice of voices) {
      const tickables = voice.getTickables();
      tickables.forEach((note, i) => {
        const vibrato = this.translator.findModifier(note, Vibrato.CATEGORY);
        if (!vibrato) {
          return;
        }
        const startX = note.getAbsoluteX() + note.getWidth() + 2;
        const endX = tickables[i + 1]?.getAbsoluteX() ?? stave.getNoteEndX();
        vibrato.setVibratoWidth(Math.max(0, endX - startX));
      });
    }
  }
  alignTabGraces(voices, notationGraceWidths) {
    for (const voice of voices) {
      for (const note of voice.getTickables()) {
        const group = this.graceGroupOf(this.translator, note);
        if (!group) {
          continue;
        }
        const notationWidth = notationGraceWidths.get(note.getTickContext());
        if (notationWidth === undefined) {
          continue;
        }
        const own = note.getMetrics().modLeftPx;
        group.setSpacingFromNextModifier(group.getSpacingFromNextModifier() + Math.max(0, notationWidth + GRACE_GROUP_SPACING_STAVE - own));
      }
    }
  }
  recordStaveSpill(p, rect) {
    this.spill.recordStave(this.reporter.systemOf(p.stave), p.row, p.stave, rect);
  }
  spillHost(rect, notes, pending, owner) {
    const staves = new Set(notes.map((note) => note.getStave()));
    const distance = (stave) => Math.max(0, stave.getYForLine(0) - rect.bottom, rect.top - stave.getBottomLineY());
    let host = owner;
    for (const candidate of pending) {
      if (staves.has(candidate.stave) && distance(candidate.stave) < distance(host.stave)) {
        host = candidate;
      }
    }
    return host;
  }
  squareUp(group) {
    if (group.length < 2) {
      return group[0]?.getX() ?? null;
    }
    const x = Math.max(...group.map((modifier) => modifier.getX()));
    for (const modifier of group) {
      modifier.setX(x);
    }
    return x;
  }
  graceGroupOf(translator, note) {
    return translator.findModifier(note, GraceNoteGroup3.CATEGORY);
  }
}

// voice-builder.ts
import {
  BarNote as BarNote3,
  GhostNote as GhostNote3,
  Stem as Stem7
} from "vexflow/core";
class VoiceBuilder {
  translator;
  tab;
  reader;
  spanners;
  softmaxFactor;
  octaveShiftByNote;
  byLead;
  byTabLead;
  crossStave = new Set;
  standIns = new Map;
  plannedStems = new Map;
  constructor(translator, tab, reader, spanners, opts) {
    this.translator = translator;
    this.tab = tab;
    this.reader = reader;
    this.spanners = spanners;
    this.softmaxFactor = opts.softmaxFactor;
    this.octaveShiftByNote = opts.octaveShiftByNote;
    this.byLead = opts.byLead;
    this.byTabLead = opts.byTabLead;
  }
  crossStaveNotes() {
    return this.crossStave;
  }
  planStems(measure, staffNumbers) {
    this.plannedStems = new Map;
    const rowOf = new Map(staffNumbers.map((staff, row) => [staff, row]));
    for (const staffNumber of staffNumbers) {
      const staffVoices = this.reader.staffVoices(measure, staffNumber);
      staffVoices.forEach((voice, voiceIndex) => {
        if (voice.beamChords === null) {
          return;
        }
        const defaultStem = voiceStem(voiceIndex, staffVoices.length);
        const chordOf = new Map(voice.beamChords.map((c) => [c.lead, c]));
        for (const group of this.reader.beamRuns(voice.beamChords.map((c) => c.lead))) {
          const chords = group.notes.map((lead) => {
            const heads = new Map;
            for (const note of chordOf.get(lead)?.notes ?? []) {
              const row = rowOf.get(note.staff);
              if (row !== undefined) {
                heads.set(row, (heads.get(row) ?? 0) + 1);
              }
            }
            return heads;
          });
          const rows = new Set(chords.flatMap((heads) => [...heads.keys()]));
          if (rows.size <= 1 || group.notes.every((lead) => lead.stem)) {
            continue;
          }
          const bottom = Math.max(...rows);
          let below = 0;
          for (const heads of chords) {
            let lean = 0;
            for (const [row, count] of heads) {
              lean += row === bottom ? count : -count;
            }
            below += lean > 0 ? 1 : -1;
          }
          const stem = defaultStem ?? (below > 0 ? "up" : "down");
          for (const lead of group.notes) {
            for (const note of chordOf.get(lead)?.notes ?? []) {
              this.plannedStems.set(note, stem);
            }
          }
        }
      });
    }
  }
  autoBeams(voice, defaultStem) {
    if (voice.beamChords === null || defaultStem) {
      return [];
    }
    const heads = new Map(voice.chords.map((c) => [c.lead, c.notes.length]));
    const whole = new Map(voice.beamChords.map((c) => [
      c.lead,
      heads.get(c.lead) === c.notes.length
    ]));
    return this.reader.beamRuns(voice.beamChords.map((c) => c.lead)).map((group) => group.notes).filter((leads) => leads.every((lead) => !lead.stem && whole.get(lead) === true));
  }
  buildNotes(stave, row, voices, clef, opts) {
    const {
      meterFloor = 0,
      clefOctaveShift = 0,
      barlines = [],
      midClefs = []
    } = opts;
    const octaveShiftOf = (lead) => clefOctaveShift + (this.octaveShiftByNote.get(lead) ?? 0);
    const endBeat = Math.max(this.reader.endBeatOf(voices), meterFloor);
    const staveNotes = [];
    const tiedNotes = new Set;
    const noteChords = [];
    const graceChords = [];
    const stemFor = (index) => voiceStem(index, voices.length);
    const midBars = [];
    let verseOffset = 0;
    const vexVoices = voices.map((voice, voiceIndex) => {
      const chords = voice.chords;
      const chordByLead = new Map;
      for (const chord of chords) {
        chordByLead.set(chord.lead, chord);
      }
      const tickables = this.translator.tickables(chords, clef, {
        endBeat,
        run: voice.run,
        autoBeams: this.autoBeams(voice, stemFor(voiceIndex)),
        stemOf: (lead) => this.plannedStems.get(lead),
        recordStandIn: (lead, ghost) => {
          const ghosts = this.standIns.get(lead);
          if (ghosts) {
            ghosts.push(ghost);
          } else {
            this.standIns.set(lead, [ghost]);
          }
        },
        record: (lead, note) => {
          this.byLead.set(lead, note);
          staveNotes.push(note);
          if (this.reader.tiesOf(lead).length > 0) {
            tiedNotes.add(note);
          }
          const chord = chordByLead.get(lead);
          if (chord) {
            (lead.isGrace ? graceChords : noteChords).push({ note, chord });
          }
        },
        octaveShiftOf,
        defaultStem: stemFor(voiceIndex),
        barlines: voiceIndex === 0 ? barlines : [],
        midClefs,
        drawMidClefs: voiceIndex === 0
      });
      if (voiceIndex === 0) {
        const barNotes = tickables.filter((t) => t instanceof BarNote3);
        barlines.forEach((barline, index) => {
          const note = barNotes[index];
          if (note) {
            midBars.push({
              note,
              style: barline.style,
              source: barline.source
            });
          }
        });
      }
      if (verseOffset > 0 || voiceIndex < voices.length - 1) {
        let rowsUsed = 0;
        for (const tickable of tickables) {
          for (const modifier of tickable.getModifiers()) {
            if (isLyricMark(modifier)) {
              rowsUsed = Math.max(rowsUsed, modifier.verseIndex + 1);
              modifier.shiftVerses(verseOffset);
            }
          }
        }
        verseOffset += rowsUsed;
      }
      return this.translator.softVoice(tickables, this.softmaxFactor);
    });
    const beamPlans = voices.flatMap((v, voiceIndex) => v.beamChords === null ? [] : [
      {
        groups: this.reader.beamRuns(v.beamChords.map((c) => c.lead)),
        defaultStem: stemFor(voiceIndex)
      }
    ]);
    return {
      stave,
      row,
      isTab: false,
      vexVoices,
      beams: [],
      beamPlans,
      tuplets: [],
      tremolos: [],
      tupletChords: voices.flatMap((v) => v.beamChords === null ? [] : [v.beamChords]),
      staveNotes,
      tiedNotes,
      noteChords,
      graceChords,
      tabChords: [],
      graceTabChords: [],
      midBars
    };
  }
  buildPartBeams(pending) {
    const rowOf = new Map;
    const splitHalves = new Map;
    const splitKey = (voice, beat) => `${voice}@${beat}`;
    for (const p of pending) {
      for (const note of p.staveNotes) {
        rowOf.set(note, p.row);
      }
      for (const { note, chord } of p.noteChords) {
        if (!this.reader.isChordMember(chord.lead)) {
          continue;
        }
        const key = splitKey(chord.lead.voice, this.reader.measureBeatOf(chord.lead));
        const halves = splitHalves.get(key);
        if (halves) {
          halves.push(note);
        } else {
          splitHalves.set(key, [note]);
        }
      }
    }
    for (const p of pending) {
      for (const { groups, defaultStem } of p.beamPlans) {
        for (const group of groups) {
          const notesByLead = new Map;
          for (const lead of group.notes) {
            const halves = splitHalves.get(splitKey(lead.voice, this.reader.measureBeatOf(lead)));
            const main = this.byLead.get(lead);
            if (halves && main) {
              notesByLead.set(lead, [main, ...halves].sort((a, b) => (rowOf.get(a) ?? 0) - (rowOf.get(b) ?? 0)));
            }
          }
          const notes = group.notes.flatMap((lead) => notesByLead.get(lead) ?? [this.byLead.get(lead)]).filter((note) => note !== undefined);
          let stem = defaultStem ?? (group.notes.every((lead) => !lead.stem && this.reader.isRhythmSlashed(lead)) ? "up" : undefined);
          const written = group.notes.every((lead) => lead.stem);
          if (!written && new Set(notes.map((note) => rowOf.get(note))).size > 1) {
            const bottom = Math.max(...notes.map((note) => rowOf.get(note) ?? 0));
            const chords = group.notes.map((lead) => (notesByLead.get(lead) ?? [this.byLead.get(lead)]).filter((note) => note !== undefined));
            stem = defaultStem ?? (sidesBelow(chords, (note) => rowOf.get(note) === bottom) ? "up" : "down");
            const direction = stem === "up" ? Stem7.UP : Stem7.DOWN;
            const top = Math.min(...notes.map((note) => rowOf.get(note) ?? 0));
            for (const note of notes) {
              if (note.getStemDirection() !== direction) {
                note.setStemDirection(direction);
              }
              const row = rowOf.get(note);
              if (stem === "up" ? row !== top : row !== bottom) {
                this.crossStave.add(note);
              }
            }
          }
          if (written) {
            const rows = notes.map((note) => rowOf.get(note) ?? 0);
            const top = Math.min(...rows);
            const bottom = Math.max(...rows);
            if (top !== bottom) {
              for (const note of notes) {
                const row = rowOf.get(note);
                if (note.getStemDirection() === Stem7.UP ? row !== top : row !== bottom) {
                  this.crossStave.add(note);
                }
              }
            }
          }
          p.beams.push(...this.spanners.buildBeams([group], this.byLead, {
            defaultStem: stem,
            notesByLead
          }));
        }
      }
      p.beamPlans.length = 0;
      for (const chords of p.tupletChords) {
        p.tuplets.push(...this.spanners.buildTuplets(chords, this.byLead));
        p.tremolos.push(...this.spanners.buildTremolos(chords, this.byLead));
      }
      p.tupletChords.length = 0;
    }
    for (const [lead, ghosts] of this.standIns) {
      const tuplet = this.byLead.get(lead)?.getTuplet();
      if (tuplet) {
        for (const ghost of ghosts) {
          ghost.setTuplet(tuplet);
        }
      }
    }
    this.standIns.clear();
    if (pending.some((p) => p.tuplets.length > 0)) {
      for (const p of pending) {
        p.vexVoices = p.vexVoices.map((voice) => this.translator.softVoice(voice.getTickables(), this.softmaxFactor));
      }
    }
  }
  buildTabNotes(stave, row, voices, tuning) {
    const tabChords = [];
    const graceTabChords = [];
    const byTabTickable = new Map;
    const tickablesByVoice = voices.map((voice) => {
      const chords = voice.chords;
      const chordByLead = new Map;
      for (const chord of chords) {
        chordByLead.set(chord.lead, chord);
      }
      return this.tab.tickables(chords, tuning, (lead, tickable) => {
        byTabTickable.set(lead, tickable);
        if (tickable instanceof GhostNote3) {
          return;
        }
        const tabNote = tickable;
        this.byTabLead.set(lead, tabNote);
        const chord = chordByLead.get(lead);
        if (chord) {
          (lead.isGrace ? graceTabChords : tabChords).push({
            note: tabNote,
            chord
          });
        }
      });
    });
    for (const voice of voices) {
      this.spanners.buildTuplets(voice.chords, byTabTickable);
    }
    const vexVoices = tickablesByVoice.map((tickables) => this.translator.softVoice(tickables, this.softmaxFactor));
    return {
      stave,
      row,
      isTab: true,
      vexVoices,
      beams: [],
      beamPlans: [],
      tuplets: [],
      tremolos: [],
      tupletChords: [],
      staveNotes: [],
      tiedNotes: new Set,
      noteChords: [],
      graceChords: [],
      tabChords,
      graceTabChords,
      midBars: []
    };
  }
}
function sidesBelow(chords, isBelow) {
  let below = 0;
  for (const halves of chords) {
    let lean = 0;
    for (const note of halves) {
      const heads = note.getKeyProps().length;
      lean += isBelow(note) ? heads : -heads;
    }
    below += lean > 0 ? 1 : -1;
  }
  return below > 0;
}
function voiceStem(index, count) {
  if (count <= 1) {
    return;
  }
  return index === 0 ? "up" : "down";
}

// draw-pass.ts
class DrawPass {
  boxes;
  totalStaves;
  softmaxFactor;
  systemGap;
  documentSystems;
  labelIndent;
  laterLabelIndent;
  showTabs;
  showNotation;
  parts;
  gaps;
  columnMultiRests = [];
  columnMeasureStyles = [];
  notationColor;
  textColor;
  byLead = new Map;
  byTabLead = new Map;
  pageBottom = 0;
  pageTop = Infinity;
  geometry = new GeometryCollector;
  systemTopY;
  systemContentBottom;
  systemBottoms = new Map;
  header;
  headerWidth;
  headerTop = null;
  staveLines = new Map;
  currentSystem = -1;
  systemLyricStart = 0;
  collisionResolver;
  scratchViewport;
  spill = new SpillTracker;
  decorations;
  measureX = 0;
  measureWidth = 0;
  measureTrailingPad = 0;
  measureLeadingPad = 0;
  systemIndex = 0;
  shifts = new Map;
  isSystemStart = false;
  isLastMeasure = false;
  opensScore = false;
  edge = null;
  barStyle = null;
  decoration = NO_DECORATION;
  repeatBoth = false;
  suppressBegRepeat = false;
  systemY = 0;
  staveRow = 0;
  systemTop;
  systemBottom;
  systemPending = [];
  lyricPlacer;
  staveBuilder;
  measureStyleDrawer;
  repeatWingDrawer;
  voiceBuilder;
  systemFormatter;
  directionPlacer;
  observedVoltaLifts = new Map;
  columnVoltaBox = null;
  columnStaves = [];
  columnStaveOwners = new Map;
  begRepeatX = null;
  tempoTasks = [];
  capoTasks = [];
  harmonyTasks = [];
  wordsTasks = [];
  fermataTasks = [];
  dynamicsTasks = [];
  symbolTasks = [];
  pictogramTasks = [];
  figuredBassTasks = [];
  harpPedalTasks = [];
  pendingStaves = [];
  partStaves = [];
  partGroups;
  groupTimeSpans;
  groupTimes = new Map;
  connectorDrawer;
  octaveShiftByNote = new Map;
  spannerResolver;
  translator;
  signatures;
  staves;
  reader;
  spanners;
  context;
  score;
  labelFont;
  notationFont;
  topOverflow;
  list;
  paint;
  voltaLifts;
  hairpinBands;
  constructor(opts) {
    const {
      chords,
      tab,
      barlines,
      config,
      configuredGaps,
      layout,
      topSlack,
      scratchHeight,
      signatures,
      staves,
      reader,
      context,
      score,
      labelFont,
      topOverflow,
      list,
      paint
    } = opts;
    this.translator = opts.translator;
    this.signatures = signatures;
    this.staves = staves;
    this.reader = reader;
    this.spanners = opts.spanners;
    this.context = context;
    this.score = score;
    this.labelFont = labelFont;
    this.notationFont = opts.notationFont;
    this.topOverflow = topOverflow;
    this.list = list;
    this.paint = paint;
    const { translator, spanners, notationFont } = this;
    this.context.openGroup = (kind) => this.list.openGroup(kind ?? "element");
    this.context.closeGroup = () => this.list.closeGroup();
    this.voltaLifts = opts.voltaLifts ?? new Map;
    this.hairpinBands = opts.hairpinBands ?? new Map;
    const {
      boxes,
      staveOffsets,
      systemStaveOffsets,
      totalStaves,
      softmaxFactor,
      systemGap,
      width,
      labelIndent,
      partLabelIndent,
      laterLabelIndent,
      abbreviationIndent
    } = layout;
    this.boxes = boxes;
    this.totalStaves = totalStaves;
    this.softmaxFactor = softmaxFactor;
    this.systemGap = systemGap;
    this.documentSystems = layout.documentSystems;
    this.labelIndent = labelIndent;
    this.laterLabelIndent = laterLabelIndent;
    const { measureNumbering, showTabSlideText } = config;
    this.showTabs = config.showTabs;
    this.showNotation = config.showNotation;
    this.notationColor = Ink.NOTATION;
    this.textColor = Ink.TEXT;
    this.parts = this.score.parts;
    this.gaps = configuredGaps.byMeasureIndex();
    this.partGroups = this.reader.partGroups(this.score);
    this.groupTimeSpans = this.reader.groupTimeSpans(this.score);
    this.header = HeaderPlan.of(config, this.reader.headerOf(this.score));
    this.headerWidth = width;
    const barlineBreaks = this.staves.partsPairTabWithNotation(this.parts) ? new Set : this.reader.barlineBreaks(this.score);
    this.connectorDrawer = new ConnectorDrawer(context, reader, this.staves, {
      parts: this.parts,
      partGroups: this.partGroups,
      groupTimeSpans: this.groupTimeSpans,
      barlineBreaks,
      totalStaves: this.totalStaves,
      labelIndent: this.labelIndent,
      partLabelIndent,
      laterLabelIndent,
      abbreviationIndent,
      labelFont,
      notationColor: this.notationColor,
      textColor: this.textColor
    });
    const octaveShiftSpans = [];
    const directionLineSpans = [];
    for (const part of this.parts) {
      for (const span of this.reader.octaveShiftsOf(part)) {
        octaveShiftSpans.push(span);
        for (const note of span.notes) {
          this.octaveShiftByNote.set(note, span.octaves);
        }
      }
      directionLineSpans.push(...this.reader.directionLinesOf(part));
    }
    this.decorations = barlines.decorations(reader.measureRepeats(this.parts[0]?.measures ?? []));
    this.systemTopY = layout.top + topSlack;
    this.systemContentBottom = this.systemTopY;
    this.collisionResolver = new CollisionResolver(new Rect2(0, 0, width, scratchHeight), {});
    this.measureStyleDrawer = new MeasureStyleDrawer(this.context);
    this.repeatWingDrawer = new RepeatWingDrawer(this.context);
    this.staveBuilder = new StaveBuilder({
      signatures: this.signatures,
      reader,
      staves: this.staves,
      context,
      collisionResolver: this.collisionResolver,
      spill: this.spill,
      gaps: configuredGaps,
      parts: this.parts,
      partGroups: this.partGroups,
      groupTimeSpans: this.groupTimeSpans,
      totalStaves: this.totalStaves,
      measureNumbering,
      textColor: this.textColor,
      staveOffsets,
      systemStaveOffsets,
      voltaLifts: this.voltaLifts,
      appearance: layout.appearance
    });
    this.lyricPlacer = new LyricPlacer(translator, context, this.collisionResolver, {
      notationColor: this.notationColor,
      lyricDrops: opts.lyricDrops,
      documentPositions: config.layout.type !== "panoramic" && config.layout.documentLayout !== "ignore" ? config.layout.documentLayout : undefined,
      extendWidth: layout.appearance.lineWidth("extend"),
      hyphenDistance: layout.appearance.distance("hyphen")
    });
    this.voiceBuilder = new VoiceBuilder(translator, tab, reader, spanners, {
      softmaxFactor: this.softmaxFactor,
      octaveShiftByNote: this.octaveShiftByNote,
      byLead: this.byLead,
      byTabLead: this.byTabLead
    });
    this.systemFormatter = new SystemFormatter({
      context,
      translator,
      chords,
      spanners,
      connectorDrawer: this.connectorDrawer,
      lyricPlacer: this.lyricPlacer,
      collisionResolver: this.collisionResolver,
      spill: this.spill,
      reporter: { systemOf: (stave) => this.systemOf(stave) },
      reader,
      documentPositions: config.layout.type !== "panoramic" && config.layout.documentLayout !== "ignore",
      softmaxFactor: this.softmaxFactor,
      notationColor: this.notationColor,
      byLead: this.byLead,
      crossStaveNotes: this.voiceBuilder.crossStaveNotes()
    });
    this.scratchViewport = new Rect2(0, 0, width, scratchHeight);
    this.directionPlacer = new DirectionPlacer(context, reader, this.collisionResolver, this.geometry, this.spill, {
      rowOf: (stave) => this.rowOf(stave),
      recordAnnotationSpill: (stave, rect) => this.recordAnnotationSpill(stave, rect),
      recordAnnotationDrop: (stave, rect) => this.recordAnnotationDrop(stave, rect),
      growPageTop: (top) => {
        this.pageTop = Math.min(this.pageTop, top);
      },
      growPageBottom: (bottom) => {
        this.pageBottom = Math.max(this.pageBottom, bottom);
      }
    }, {
      labelFont,
      documentFonts: config.documentFonts,
      documentPositions: config.layout.type !== "panoramic" && config.layout.documentLayout !== "ignore" ? config.layout.documentLayout : undefined,
      notationFont,
      notationColor: this.notationColor,
      textColor: this.textColor,
      scratchViewport: this.scratchViewport,
      appearance: layout.appearance
    });
    this.spannerResolver = new SpannerResolver({
      context,
      spanners,
      translator,
      spill: this.spill,
      directionPlacer: this.directionPlacer,
      reporter: {
        noteObstacle: (note) => this.systemFormatter.noteRect(note),
        lyricObstacles: (stave) => this.lyricPlacer.pinnedSyllables().filter((syllable) => syllable.stave === stave).map((syllable) => syllable.rect),
        dropLyricsBelow: (system, row, stave, bottom) => {
          this.lyricPlacer.requestDrop(system, row, bottom + LYRIC_NOTE_CLEARANCE - stave.getBottomLineY());
          this.reportVerseSpill(system, 0);
        },
        growPageTop: (top) => {
          this.pageTop = Math.min(this.pageTop, top);
        },
        growPageBottom: (bottom) => {
          this.pageBottom = Math.max(this.pageBottom, bottom);
        }
      },
      octaveShiftSpans,
      directionLineSpans,
      showTabSlideText,
      scratchViewport: this.scratchViewport,
      systemOfMeasure: (m) => this.systemOfMeasure(m),
      appearance: layout.appearance,
      notationFont
    });
    this.context.setFillStyle(this.notationColor);
    this.context.setStrokeStyle(this.notationColor);
    MetricsDefaults.Stem.strokeStyle = this.notationColor;
    Metrics3.clear("Stem");
    new StemWidth().set(layout.appearance.lineWidth("stem"));
    new BarlineWidths().set(layout.appearance.lineWidth("light barline"), layout.appearance.lineWidth("heavy barline"));
    spanners.useAppearance(layout.appearance);
    spanners.useDocumentCurves(config.layout.type !== "panoramic" && config.layout.documentLayout !== "ignore");
  }
  measuresOf(system) {
    const measures = [];
    for (const [m, box] of this.boxes.entries()) {
      if (box?.systemIndex === system) {
        measures.push(m);
      }
    }
    return measures;
  }
  joinUnbrokenArpeggios(measure) {
    const byBeat = new Map;
    for (const chord of measure.chords) {
      const staveNote = this.byLead.get(chord.lead);
      const stroke = staveNote?.getModifiers().find((mod) => mod instanceof UnbrokenArpeggio);
      const beat = chord.lead.measureBeat;
      if (!staveNote || !stroke || beat === null) {
        continue;
      }
      const group = byBeat.get(beat) ?? [];
      group.push({
        staff: Number(chord.lead.staff),
        stroke,
        staveNote
      });
      byBeat.set(beat, group);
    }
    for (const group of byBeat.values()) {
      group.sort((a, b) => a.staff - b.staff);
      const [top, ...rest] = group;
      if (!top) {
        continue;
      }
      for (const lower of rest) {
        top.stroke.join(lower.stroke, lower.staveNote);
      }
    }
  }
  systemOfMeasure(m) {
    for (let i = Math.min(m, this.boxes.length - 1);i >= 0; i--) {
      const box = this.boxes[i];
      if (box) {
        return box.systemIndex;
      }
    }
    return 0;
  }
  mark(system) {
    return {
      system,
      pageTop: this.pageTop,
      pageBottom: this.pageBottom,
      systemTopY: this.systemTopY,
      systemContentBottom: this.systemContentBottom,
      currentSystem: this.currentSystem,
      geometry: this.geometry.mark(),
      lyrics: this.lyricPlacer.mark(),
      dynamics: this.directionPlacer.mark(),
      spanners: this.spannerResolver.mark(),
      list: this.list.mark(),
      paint: this.paint.mark()
    };
  }
  rewind(mark, through) {
    this.list.rewind(mark.list);
    this.paint.rewind(mark.paint);
    this.pageTop = mark.pageTop;
    this.pageBottom = mark.pageBottom;
    this.systemTopY = mark.systemTopY;
    this.systemContentBottom = mark.systemContentBottom;
    this.currentSystem = mark.currentSystem;
    this.geometry.rewind(mark.geometry);
    this.directionPlacer.rewind(mark.dynamics);
    this.lyricPlacer.rewind(mark.lyrics);
    this.spannerResolver.rewind(mark.spanners);
    for (let system = mark.system;system <= through; system++) {
      this.lyricPlacer.forgetSystem(system);
      this.spannerResolver.forgetSystem(system);
      this.spill.forgetSystem(system);
      this.systemBottoms.delete(system);
      this.staveLines.delete(system);
      this.observedVoltaLifts.delete(system);
    }
  }
  drawSystem(system) {
    const canvas = this.context.context2D;
    const shift = canvas?.translate ? this.shifts.get(system) ?? 0 : 0;
    if (shift) {
      canvas?.save();
      canvas?.translate(shift, 0);
    }
    this.beginSystem(system);
    for (const m of this.measuresOf(system)) {
      this.drawMeasureColumn(m);
    }
    this.endSystem(system);
    if (shift) {
      canvas?.restore();
    }
  }
  shiftSystem(system, dx) {
    this.shifts.set(system, dx);
  }
  reachesPast(system) {
    return this.spannerResolver.reachesPast(system);
  }
  observe(system) {
    const voltaLift = this.observedVoltaLifts.get(system);
    const hairpinBands = this.spannerResolver.observedHairpinBands().get(system);
    return {
      overflow: this.spill.observedOverflow().get(system) ?? 0,
      staveSpill: this.spill.observedStaveSpill().get(system),
      lyricDrops: this.lyricPlacer.observedDropsOf(system),
      lyricsStepped: this.lyricPlacer.stepped(system),
      voltaLift,
      voltasLifted: voltaLift !== undefined && voltaLift !== (this.voltaLifts.get(system) ?? 0),
      hairpinBands,
      hairpinsStacked: hairpinBands !== undefined && !this.hairpinBands.has(system)
    };
  }
  drawMeasureColumn(m) {
    const box = this.boxes[m];
    if (!box) {
      return;
    }
    this.measureX = box.x;
    this.measureWidth = box.width;
    this.measureTrailingPad = box.trailingPad;
    this.measureLeadingPad = box.leadingPad;
    this.systemIndex = box.systemIndex;
    this.isSystemStart = box.isSystemStart;
    this.edge = box.edge;
    this.isLastMeasure = !this.boxes.some((later, index) => index > m && later !== undefined && !later.edge);
    this.opensScore = m === this.boxes.findIndex((b) => b !== undefined && !b.edge);
    this.barStyle = this.parts[0]?.measures[m]?.barlines.find((b) => b.location === "right")?.barStyle ?? null;
    this.decoration = this.decorations[m] ?? NO_DECORATION;
    const nextBegins = this.decorations[m + 1]?.repeatBegin === true;
    const nextIsSystemStart = this.boxes[m + 1]?.isSystemStart === true;
    this.repeatBoth = this.decoration.repeatEnd && nextBegins && !nextIsSystemStart;
    this.suppressBegRepeat = !this.isSystemStart && this.decorations[m - 1]?.repeatEnd === true;
    this.systemY = this.systemTopY;
    this.staveRow = 0;
    this.systemTop = undefined;
    this.systemBottom = undefined;
    this.systemPending = [];
    this.columnVoltaBox = null;
    this.columnStaves = [];
    this.columnStaveOwners = new Map;
    this.columnMultiRests = [];
    this.columnMeasureStyles = [];
    this.tempoTasks = [];
    this.capoTasks = [];
    this.harmonyTasks = [];
    this.wordsTasks = [];
    this.fermataTasks = [];
    this.dynamicsTasks = [];
    this.symbolTasks = [];
    this.pictogramTasks = [];
    this.figuredBassTasks = [];
    this.harpPedalTasks = [];
    this.partStaves = [];
    this.groupTimes = new Map;
    for (const [partIndex, part] of this.parts.entries()) {
      const staves = this.staves.visibleNumbers(part);
      const measure = part.measures[m];
      if (!measure) {
        this.staveRow += staves.length;
        continue;
      }
      let partTop;
      let partBottom;
      this.pendingStaves = [];
      this.voiceBuilder.planStems(measure, staves);
      for (const staffNumber of staves) {
        const stave = this.buildStave(part, measure, m, staffNumber, staves.length);
        partTop ??= stave;
        partBottom = stave;
      }
      if (partTop && partBottom) {
        this.partStaves[partIndex] = { top: partTop, bottom: partBottom };
      }
      this.voiceBuilder.buildPartBeams(this.pendingStaves);
      this.joinUnbrokenArpeggios(measure);
      this.systemPending.push(...this.pendingStaves);
      for (const p of this.pendingStaves) {
        this.spannerResolver.registerStave(p.stave, p.row, this.systemIndex);
        if (this.isSystemStart) {
          this.addHairpinObstacles(p.stave, p.row);
        }
      }
      for (const {
        lead,
        text,
        symbol,
        frame,
        framePosition,
        placement,
        source,
        position
      } of this.reader.harmoniesOf(measure)) {
        const staveNote = this.byLead.get(lead) ?? this.byTabLead.get(lead);
        if (staveNote) {
          this.harmonyTasks.push({
            staveNote,
            text,
            symbol,
            frame,
            framePosition,
            placement,
            source,
            position
          });
        }
      }
      const tempo = this.reader.tempoOf(measure);
      const modulation = this.reader.modulationOf(measure);
      const rate = this.reader.rateModulationOf(measure);
      const topStave = this.pendingStaves[0];
      if ((tempo || modulation) && topStave) {
        this.tempoTasks.push({
          stave: topStave.stave,
          tempo: rate ? null : tempo,
          modulations: [rate, modulation].flatMap((m) => m ? [m] : []),
          justify: tempo?.justify ?? modulation?.justify ?? null,
          position: tempo?.position ?? modulation?.position ?? null
        });
      }
      const bottomStave = this.pendingStaves.at(-1);
      for (const fermata of this.reader.barlineFermatasOf(measure)) {
        const target = fermata.inverted ? bottomStave : topStave;
        if (target) {
          this.fermataTasks.push({ stave: target.stave, ...fermata });
        }
      }
      for (const {
        text,
        glyph,
        staffNumber,
        lead,
        placement,
        opensBar,
        closesBar,
        directive,
        format,
        position
      } of this.reader.wordsOf(measure)) {
        const target = this.pendingStaves[staves.indexOf(staffNumber)] ?? topStave;
        if (target) {
          const anchor = lead ? this.byLead.get(lead) ?? this.byTabLead.get(lead) : undefined;
          this.wordsTasks.push({
            stave: target.stave,
            text,
            glyph,
            anchor: anchor ?? target.staveNotes[0],
            placement,
            opensBar,
            closesBar,
            directive,
            format,
            position
          });
        }
      }
      for (const {
        text,
        glyph,
        staffNumber,
        lead,
        placement,
        format,
        position
      } of this.reader.dynamicsOf(measure)) {
        if (this.directionPlacer.suppressesDynamic(`${partIndex}:${staffNumber}`, text, m)) {
          continue;
        }
        const target = this.pendingStaves[staves.indexOf(staffNumber)] ?? topStave;
        if (target) {
          const anchor = lead ? this.byLead.get(lead) ?? this.byTabLead.get(lead) : undefined;
          this.dynamicsTasks.push({
            stave: target.stave,
            text,
            glyph,
            anchor: anchor ?? target.staveNotes[0],
            placement,
            format,
            position
          });
        }
      }
      for (const {
        glyph,
        staffNumber,
        lead,
        placement
      } of this.reader.symbolsOf(measure)) {
        const target = this.pendingStaves[staves.indexOf(staffNumber)] ?? topStave;
        if (target) {
          const anchor = lead ? this.byLead.get(lead) ?? this.byTabLead.get(lead) : undefined;
          this.symbolTasks.push({
            stave: target.stave,
            glyph,
            anchor: anchor ?? target.staveNotes[0],
            placement
          });
        }
      }
      for (const {
        glyphs,
        staffNumber,
        lead,
        placement,
        position
      } of this.reader.harpPedalsOf(measure)) {
        const target = this.pendingStaves[staves.indexOf(staffNumber)] ?? topStave;
        if (target) {
          const anchor = lead ? this.byLead.get(lead) ?? this.byTabLead.get(lead) : undefined;
          this.harpPedalTasks.push({
            stave: target.stave,
            glyphs,
            anchor: anchor ?? target.staveNotes[0],
            placement,
            position
          });
        }
      }
      for (const {
        symbol,
        staffNumber,
        lead,
        placement
      } of this.reader.pictogramsOf(measure)) {
        const target = this.pendingStaves[staves.indexOf(staffNumber)] ?? topStave;
        if (target) {
          const anchor = lead ? this.byLead.get(lead) ?? this.byTabLead.get(lead) : undefined;
          this.pictogramTasks.push({
            stave: target.stave,
            symbol,
            anchor: anchor ?? target.staveNotes[0],
            placement
          });
        }
      }
      const bassStave = this.pendingStaves.at(-1);
      if (bassStave) {
        for (const { lead, figures, position } of this.reader.figuredBassesOf(measure)) {
          this.figuredBassTasks.push({
            stave: bassStave.stave,
            figures,
            anchor: this.byLead.get(lead) ?? this.byTabLead.get(lead),
            position
          });
        }
      }
      this.spannerResolver.addPedals(this.reader.pedalsOf(measure));
      this.spannerResolver.addWedges(this.reader.wedgesOf(measure));
      if (partTop && partBottom && staves.length > 1 && this.isSystemStart) {
        this.connectorDrawer.drawPartSymbol(part, partTop, partBottom, this.measureX);
      }
      const labels = this.reader.partLabels(part);
      const text = this.systemIndex === 0 ? labels.name : labels.abbreviation;
      if ((this.systemIndex === 0 ? this.labelIndent : this.laterLabelIndent) > 0 && text && this.isSystemStart && partTop && partBottom) {
        this.context.save();
        this.context.setFont(this.labelFont, LABEL_FONT_SIZE);
        this.context.setFillStyle(this.textColor);
        const tw = this.context.measureText(text).width;
        const cy = (partTop.getYForLine(0) + partBottom.getBottomLineY()) / 2;
        this.context.fillText(text, this.measureX - LABEL_GAP - tw, cy + 1.5);
        this.context.restore();
      }
    }
    this.begRepeatX = this.systemFormatter.alignBegModifiers(this.columnStaves);
    for (const stave of this.edge ? [] : this.columnStaves) {
      stave.setContext(this.context).draw();
      this.connectorDrawer.drawCustomBarline(stave, this.connectorColumn());
    }
    if (!this.edge) {
      this.drawRepeatWings(m);
    }
    for (const { stave, count, symbols } of this.columnMultiRests) {
      this.staveBuilder.drawMultiRest(stave, count, symbols);
    }
    for (const { stave, mark } of this.columnMeasureStyles) {
      this.measureStyleDrawer.draw(stave, mark);
    }
    const noteExtent = this.systemFormatter.formatAndDraw(this.systemPending, this.formatColumn());
    this.pageBottom = Math.max(this.pageBottom, noteExtent.bottom);
    this.systemContentBottom = Math.max(this.systemContentBottom, noteExtent.bottom);
    this.pageTop = Math.min(this.pageTop, noteExtent.top);
    this.collectGeometry(m, noteExtent.top);
    if (this.edge) {
      this.drawEdgeGap(m);
      return;
    }
    this.drawGapOverlay(m);
    if (noteExtent.top < Infinity) {
      this.spill.growHighestTop(this.systemIndex, noteExtent.top);
      this.observeVoltaLift();
    }
    this.directionPlacer.placeColumn(this.directionColumn(m));
    this.connectorDrawer.drawConnectors(this.connectorColumn());
  }
  drawRepeatWings(m) {
    if (!this.systemTop || !this.systemBottom) {
      return;
    }
    const wings = this.repeatWingDrawer.draw(this.systemTop, this.systemBottom, {
      begin: this.decoration.beginWinged,
      end: this.decoration.endWinged,
      reopen: this.repeatBoth ? this.decorations[m + 1]?.beginWinged ?? "none" : "none"
    });
    for (const rect of wings) {
      this.collisionResolver.add({ rect, kind: "annotation" });
      this.pageTop = Math.min(this.pageTop, rect.y);
      this.pageBottom = Math.max(this.pageBottom, rect.y + rect.h);
    }
  }
  observeVoltaLift() {
    const box = this.columnVoltaBox;
    if (!box) {
      return;
    }
    const cleared = this.collisionResolver.liftClear(box, VOLTA_NOTE_CLEARANCE, {
      kinds: ["note", "tie"],
      band: 0
    });
    const lift = box.y - cleared.y;
    if (lift > (this.observedVoltaLifts.get(this.systemIndex) ?? 0)) {
      this.observedVoltaLifts.set(this.systemIndex, lift);
      this.spill.growHighestTop(this.systemIndex, cleared.y);
    }
  }
  formatColumn() {
    return {
      systemIndex: this.systemIndex,
      measureLeadingPad: this.measureLeadingPad,
      measureTrailingPad: this.measureTrailingPad
    };
  }
  directionColumn(m) {
    return {
      measureIndex: m,
      systemIndex: this.systemIndex,
      topStave: this.systemTop,
      measure: this.parts[0]?.measures[m],
      repeatTimesLabel: this.decorations[m]?.repeatTimesLabel ?? null,
      fermatas: this.fermataTasks,
      words: this.wordsTasks,
      dynamics: this.dynamicsTasks,
      symbols: this.symbolTasks,
      pictograms: this.pictogramTasks,
      figuredBasses: this.figuredBassTasks,
      harpPedals: this.harpPedalTasks,
      harmonies: this.harmonyTasks,
      tempos: this.tempoTasks,
      capos: this.capoTasks
    };
  }
  connectorColumn() {
    return {
      measureX: this.measureX,
      systemIndex: this.systemIndex,
      isSystemStart: this.isSystemStart,
      isLastMeasure: this.isLastMeasure,
      barStyle: this.barStyle,
      repeatEnd: this.decoration.repeatEnd,
      repeatBoth: this.repeatBoth,
      begRepeatX: this.begRepeatX,
      systemTop: this.systemTop,
      systemBottom: this.systemBottom,
      partStaves: this.partStaves,
      groupTimes: this.groupTimes
    };
  }
  staveColumn(m) {
    const nextBox = this.boxes[m + 1];
    return {
      measureIndex: m,
      measureX: this.measureX,
      measureWidth: this.measureWidth,
      systemIndex: this.systemIndex,
      systemY: this.systemY,
      staveRow: this.staveRow,
      isSystemStart: this.isSystemStart,
      opensScore: this.opensScore,
      groupTimes: this.groupTimes,
      isLastMeasure: this.isLastMeasure,
      barStyle: this.barStyle,
      decoration: this.decoration,
      repeatBoth: this.repeatBoth,
      suppressBegRepeat: this.suppressBegRepeat,
      nextVolta: nextBox && nextBox.systemIndex === this.systemIndex && this.decorations[m + 1]?.volta ? { x: nextBox.x, width: nextBox.width } : null
    };
  }
  beginSystem(system) {
    this.systemIndex = system;
    if (this.currentSystem >= 0) {
      const overflow = this.topOverflow.get(system) ?? 0;
      this.systemTopY = this.systemContentBottom + this.systemGap + overflow;
      const document2 = this.documentSystems?.[system];
      const above = this.staveLines.get(this.currentSystem);
      if (document2?.systemDistance !== null && document2?.systemDistance !== undefined && above) {
        const placed = above.bottom + document2.systemDistance - document2.lineTop;
        this.systemTopY = document2.strict ? placed : Math.max(placed, this.systemContentBottom + STAVE_CLEARANCE + overflow);
      }
    }
    this.currentSystem = system;
    this.spannerResolver.beginSystem(system);
    this.systemContentBottom = this.systemTopY;
    this.spill.recordSystemTop(system, this.systemTopY);
    this.systemLyricStart = this.lyricPlacer.mark();
    this.collisionResolver.clear();
  }
  endSystem(system) {
    this.resolveSpanners(system);
    this.systemBottoms.set(system, this.systemContentBottom);
    this.warnEscapes();
    this.reportVerseSpill(system, this.systemLyricStart);
  }
  reportVerseSpill(system, from) {
    for (const syllable of this.lyricPlacer.pinnedSyllables().slice(from).filter((s) => s.system === system)) {
      const baseline = this.lyricPlacer.baselineOf(syllable.lyric, syllable.stave, syllable.row, system, syllable.stave.getBottomLineY() + this.lyricPlacer.rowDrop(system, syllable.row));
      this.spill.recordDrop(system, syllable.row, syllable.stave, new Rect2(syllable.left, baseline - syllable.textSize, syllable.width, syllable.textSize));
    }
  }
  buildStave(part, measure, m, staffNumber, visibleCount) {
    const built = this.staveBuilder.build(part, measure, staffNumber, visibleCount, this.staveColumn(m));
    const { stave } = built;
    this.columnStaves.push(stave);
    this.columnStaveOwners.set(stave, {
      part: part.id,
      staff: Number(staffNumber)
    });
    const capo = built.isTab ? measure.getStaffDetails(staffNumber)?.capo : null;
    if (capo && this.isSystemStart && this.systemIndex === 0) {
      this.capoTasks.push({ stave, fret: capo });
    }
    if (built.volta) {
      this.columnVoltaBox = built.volta.box;
      this.pageTop = Math.min(this.pageTop, built.volta.top);
    }
    const staveBottom = stave.getBottomY();
    this.pageBottom = Math.max(this.pageBottom, staveBottom);
    this.systemContentBottom = Math.max(this.systemContentBottom, staveBottom);
    if (built.measureStyle) {
      this.columnMeasureStyles.push({ stave, mark: built.measureStyle });
    }
    if (built.multiRestCount || built.measureStyle) {
      if (built.multiRestCount) {
        this.columnMultiRests.push({
          stave,
          count: built.multiRestCount,
          symbols: built.multiRestSymbols
        });
      }
      this.systemTop ??= stave;
      this.systemBottom = stave;
      this.spanLines(stave);
      this.staveRow++;
      return stave;
    }
    const voices = this.reader.staffVoices(measure, staffNumber);
    if (built.isTab && voices.length > 0) {
      this.pendingStaves.push(this.voiceBuilder.buildTabNotes(stave, this.staveRow, voices, this.staves.tuningOf(part, staffNumber)));
      for (const voice of voices) {
        this.spannerResolver.addTabChords(voice.chords);
      }
    } else if (voices.length > 0) {
      const clef = measure.getClef(staffNumber);
      const clefName = clef ? this.signatures.clefName(clef) : "treble";
      this.pendingStaves.push(this.voiceBuilder.buildNotes(stave, this.staveRow, voices, clefName, {
        meterFloor: this.reader.meterFloor(measure, staffNumber),
        clefOctaveShift: clef?.octaveChange ?? 0,
        barlines: this.reader.midBarlinesOf(measure),
        midClefs: this.signatures.midClefSpecs(this.reader.midClefsOf(measure, staffNumber))
      }));
      for (const voice of voices) {
        this.spannerResolver.addChords(voice.chords);
      }
    }
    this.systemTop ??= stave;
    this.systemBottom = stave;
    this.spanLines(stave);
    this.staveRow++;
    return stave;
  }
  collectGeometry(m, contentTop) {
    for (const p of this.systemPending) {
      if (p.isTab) {
        this.geometry.collectTabNotes(m, p.stave, [
          ...p.tabChords,
          ...p.graceTabChords
        ]);
      } else {
        this.geometry.collectStaveNotes(m, [...p.noteChords, ...p.graceChords]);
      }
    }
    if (this.systemTop && this.systemBottom) {
      const connector = this.connectorDrawer.connectorExtent(this.connectorColumn());
      const left = Math.min(this.measureX, connector?.left ?? Infinity);
      const right = this.measureX + this.measureWidth;
      const top = Math.min(this.systemY, contentTop, connector?.top ?? Infinity);
      const bottom = Math.max(this.systemContentBottom, connector?.bottom ?? -Infinity);
      const staves = this.edge ? [] : this.rawStaves();
      this.geometry.addMeasure({
        rect: new Rect2(left, top, right - left, Math.max(0, bottom - top)),
        index: m,
        number: this.parts[0]?.measures[m]?.number ?? String(m + 1),
        systemIndex: this.systemIndex,
        staves,
        barlines: this.rawBarlines(m, staves)
      });
    }
  }
  rawBarlines(m, staves) {
    const barlines = [];
    const rowsByPart = new Map;
    for (const stave of staves) {
      const rows = rowsByPart.get(stave.part) ?? [];
      rows.push(stave);
      rowsByPart.set(stave.part, rows);
    }
    const rectOf = (rows) => {
      const left = Math.min(...rows.map((s) => s.left));
      const right = Math.max(...rows.map((s) => s.right));
      const top = Math.min(...rows.map((s) => s.lines[0] ?? Infinity));
      const bottom = Math.max(...rows.map((s) => s.lines[s.lines.length - 1] ?? -Infinity));
      return new Rect2(left, top, right - left, bottom - top);
    };
    const hitAt = (x, rect) => new Rect2(x - 4, rect.y, 8, rect.h);
    for (const [partId, rows] of rowsByPart) {
      const part = this.parts.find((candidate) => candidate.id === partId);
      const measure = part?.measures[m];
      if (!part || !measure) {
        continue;
      }
      const rect = rectOf(rows);
      const first = rows[0];
      const soleTab = this.totalStaves === 1 && first !== undefined && this.staves.isTab(part, String(first.staff));
      const leftVisible = this.decoration.repeatBegin && !this.suppressBegRepeat || this.isSystemStart && (this.totalStaves > 1 || soleTab);
      if (leftVisible) {
        barlines.push({
          rect: hitAt(rect.x, rect),
          part: partId,
          location: "left",
          source: this.reader.barlineAt(measure, "left")
        });
      }
      const rightVisible = this.decoration.repeatEnd || this.repeatBoth || this.totalStaves > 1 || this.barStyle !== "none";
      if (rightVisible) {
        barlines.push({
          rect: hitAt(rect.right, rect),
          part: partId,
          location: "right",
          source: this.reader.barlineAt(measure, "right")
        });
      }
    }
    const middleBySource = new Map;
    for (const pending of this.systemPending) {
      const owner = this.columnStaveOwners.get(pending.stave);
      if (!owner) {
        continue;
      }
      const rect = rectOf(staves.filter((stave) => stave.part === owner.part && stave.staff === owner.staff));
      for (const { note, style, source } of pending.midBars) {
        if (style === "none") {
          continue;
        }
        const hit = hitAt(note.getAbsoluteX(), rect);
        const existing = middleBySource.get(source);
        if (existing) {
          existing.rect = existing.rect.union(hit);
        } else {
          middleBySource.set(source, {
            rect: hit,
            part: owner.part,
            location: "middle",
            source
          });
        }
      }
    }
    return [...barlines, ...middleBySource.values()];
  }
  rawStaves() {
    return this.columnStaves.flatMap((stave) => {
      const owner = this.columnStaveOwners.get(stave);
      if (!owner) {
        return [];
      }
      const lines = Array.from({ length: stave.getNumLines() }, (_, i) => stave.getYForLine(i));
      return {
        ...owner,
        lines,
        left: stave.getX(),
        right: stave.getX() + stave.getWidth(),
        noteStartX: stave.getNoteStartX(),
        keyAccidentals: stave.getModifiers(StaveModifierPosition5.BEGIN, KeySignature2.CATEGORY).flatMap((sig) => sig instanceof StaffKeySignature && sig.opensStave() ? sig.getAccidentals() : [])
      };
    });
  }
  drawGapOverlay(m) {
    const gap = this.gaps.get(m);
    if (!gap || !this.systemTop || !this.systemBottom) {
      return;
    }
    const startX = this.systemTop.getNoteStartX();
    const endX = this.measureX + this.measureWidth;
    const top = this.systemTop.getYForLine(0);
    const bottom = this.systemBottom.getYForLine(this.systemBottom.getNumLines() - 1);
    this.context.save();
    if (gap.style?.fill) {
      this.context.setFillStyle(gap.style.fill);
      this.context.fillRect(startX, top, Math.max(0, endX - startX), bottom - top);
    }
    this.context.restore();
    this.drawGapLabel(gap, startX, endX, top, bottom);
  }
  drawGapLabel(gap, left, right, top, bottom) {
    if (!gap.label) {
      return;
    }
    const fontSize = gap.style?.fontSize ?? GAP_LABEL_FONT_SIZE;
    this.context.save();
    this.context.setFont(gap.style?.fontFamily ?? this.labelFont, fontSize);
    this.context.setFillStyle(gap.style?.fontColor ?? this.textColor);
    const tw = this.context.measureText(gap.label).width;
    this.context.fillText(gap.label, (left + right) / 2 - tw / 2, (top + bottom) / 2 + fontSize * 0.35);
    this.context.restore();
  }
  drawEdgeGap(m) {
    const gap = this.gaps.get(m);
    if (!gap || !this.systemTop || !this.systemBottom) {
      return;
    }
    const left = this.measureX;
    const right = this.measureX + this.measureWidth;
    const top = this.systemTop.getYForLine(0);
    const bottom = this.systemBottom.getYForLine(this.systemBottom.getNumLines() - 1);
    this.context.save();
    if (gap.style?.fill) {
      this.context.setFillStyle(gap.style.fill);
      this.context.fillRect(left, top, right - left, bottom - top);
    }
    if (gap.style?.border) {
      const l = left + 0.5;
      const t = top + 0.5;
      const r = right - 0.5;
      const b = bottom - 0.5;
      this.context.setStrokeStyle(gap.style.border);
      this.context.setLineWidth(1);
      this.context.beginPath();
      if (this.edge === "leading") {
        this.context.moveTo(r, t);
        this.context.lineTo(l, t);
        this.context.lineTo(l, b);
        this.context.lineTo(r, b);
      } else {
        this.context.rect(l, t, r - l, b - t);
      }
      this.context.stroke();
    }
    this.context.restore();
    this.drawGapLabel(gap, left, right, top, bottom);
  }
  finish() {
    this.drawFooter();
    return { ...this.collected(), systemExtents: this.systemExtents() };
  }
  collected() {
    return {
      pageTop: this.pageTop,
      pageBottom: this.pageBottom,
      staveLines: this.staveLines,
      rawNotes: this.geometry.notes(),
      rawMeasures: this.geometry.decoratedMeasures(this.spill),
      rawChordDiagrams: this.geometry.chordDiagrams()
    };
  }
  extentOf(system, isLast) {
    const inkTop = this.spill.systemTops().get(system) ?? this.systemTopY;
    let top = inkTop;
    if (system === 0 && this.header && this.header.height(this.headerWidth) > 0) {
      top = Math.min(inkTop, Math.min(inkTop, this.pageTop) - HEADER_GAP - this.header.height(this.headerWidth));
    }
    let bottom = this.systemBottoms.get(system) ?? top;
    const footer = isLast ? this.header?.footer(this.headerWidth) : undefined;
    if (footer && footer.lines.length > 0) {
      bottom = this.pageBottom + FOOTER_GAP + footer.height;
    }
    return { top, bottom };
  }
  linesOf(system) {
    return this.staveLines.get(system);
  }
  resolveSpanners(system) {
    this.spannerResolver.resolveSystem(system, {
      byLead: this.byLead,
      byTabLead: this.byTabLead
    });
  }
  addHairpinObstacles(stave, row) {
    const lineTop = stave.getYForLine(0);
    for (const band of this.hairpinBands.get(this.systemIndex) ?? []) {
      if (band.row === row) {
        this.collisionResolver.add({
          rect: band.rect.translate(0, lineTop),
          kind: "hairpin",
          band: row
        });
      }
    }
  }
  rowOf(stave) {
    return this.systemPending.find((p) => p.stave === stave)?.row;
  }
  recordAnnotationSpill(stave, rect) {
    const row = this.rowOf(stave);
    if (row === undefined) {
      return;
    }
    this.spill.recordRise(this.systemOf(stave), row, stave, rect);
  }
  recordAnnotationDrop(stave, rect) {
    this.pageBottom = Math.max(this.pageBottom, rect.bottom);
    this.systemContentBottom = Math.max(this.systemContentBottom, rect.bottom);
    const row = this.rowOf(stave);
    if (row === undefined) {
      return;
    }
    this.spill.recordDrop(this.systemOf(stave), row, stave, rect);
  }
  systemOf(stave) {
    return this.spannerResolver.systemOf(stave) ?? this.systemIndex;
  }
  spanLines(stave) {
    const top = stave.getYForLine(0);
    const bottom = stave.getYForLine(stave.getNumLines() - 1);
    const lines = this.staveLines.get(this.systemIndex);
    this.staveLines.set(this.systemIndex, {
      top: Math.min(lines?.top ?? top, top),
      bottom: Math.max(lines?.bottom ?? bottom, bottom)
    });
  }
  widenPage(width) {
    this.headerWidth = width;
  }
  drawHeader() {
    this.headerTop = null;
    const inkTop = this.spill.systemTops().get(0);
    if (!this.header || this.header.height(this.headerWidth) === 0 || inkTop === undefined) {
      return;
    }
    const top = Math.min(inkTop, this.pageTop) - HEADER_GAP - this.header.height(this.headerWidth);
    this.context.save();
    this.context.setFillStyle(this.textColor);
    for (const line of this.header.lines(this.headerWidth)) {
      this.context.setFont(line.glyph ? this.notationFont : this.labelFont, line.size, line.weight);
      const width = this.context.measureText(line.text).width;
      const lead = { left: 0, center: 0.5, right: 1 }[line.align];
      this.context.fillText(line.text, line.x - lead * width, top + line.baseline);
    }
    this.context.restore();
    this.headerTop = top;
    this.pageTop = Math.min(this.pageTop, top);
  }
  drawFooter() {
    const footer = this.header?.footer(this.headerWidth);
    if (!footer || footer.lines.length === 0 || this.currentSystem < 0) {
      return;
    }
    const top = this.pageBottom + FOOTER_GAP;
    this.context.save();
    this.context.setFillStyle(this.textColor);
    for (const line of footer.lines) {
      this.context.setFont(this.labelFont, line.size, line.weight);
      const width = this.context.measureText(line.text).width;
      this.context.fillText(line.text, line.x - width / 2, top + line.baseline);
    }
    this.context.restore();
    this.pageBottom = top + footer.height;
    this.systemBottoms.set(this.currentSystem, this.pageBottom);
  }
  systemExtents() {
    const extents = new Map;
    for (const [system, inkTop] of this.spill.systemTops()) {
      const top = system === 0 && this.headerTop !== null ? Math.min(inkTop, this.headerTop) : inkTop;
      extents.set(system, {
        top,
        bottom: this.systemBottoms.get(system) ?? top
      });
    }
    return extents;
  }
  warnEscapes() {
    for (const { item, edges } of this.collisionResolver.escaping(this.scratchViewport)) {
      if (edges.includes("top") || edges.includes("bottom")) {
        console.warn(`vexml: ${item.kind} clipped past the ${edges.join("/")} of the canvas ` + "(content in no-man's land: bump LEDGER_HEADROOM / topSlack).");
      }
    }
  }
}

// page-walk.ts
class PageWalk {
  height;
  marginTop;
  marginBottom;
  index = 0;
  cropTop = 0;
  pages = [];
  bottom = 0;
  startPage = 0;
  constructor(height, marginTop, marginBottom) {
    this.height = height;
    this.marginTop = marginTop;
    this.marginBottom = marginBottom;
    this.pages.push(this.openPage(0, null));
  }
  place(extent, document2) {
    if (this.index === 0) {
      this.pages[0] = this.openPage(0, document2?.system.page ?? null);
    }
    const current = this.pages.at(-1);
    const distance = document2?.system.topSystemDistance ?? null;
    const anchorTop = distance !== null && document2 ? document2.lines.top : extent.top;
    const anchorOffset = (marginTop) => distance !== null && document2 ? marginTop + distance : marginTop;
    if (this.index === 0) {
      this.cropTop = anchorTop - anchorOffset(current.marginTop);
    }
    const top = extent.top - this.cropTop;
    this.bottom = extent.bottom - this.cropTop;
    const fitsTo = document2 ? document2.lines.bottom - this.cropTop : this.bottom;
    const pageTop = current.top + current.marginTop;
    const pageBottom = current.top + current.height - current.marginBottom;
    const forced = document2?.system.startsPage ?? false;
    let pushed = 0;
    if (this.index > 0 && (forced || fitsTo > pageBottom && top > pageTop)) {
      if (forced) {
        for (let b = 0;b < (document2?.system.blankPages ?? 0); b++) {
          const last = this.pages.at(-1);
          this.pages.push(this.openPage(last.top + last.height, null));
        }
      }
      const previous = this.pages.at(-1);
      const next = this.openPage(previous.top + previous.height, document2?.system.page ?? null);
      this.pages.push(next);
      pushed = Math.max(0, next.top + anchorOffset(next.marginTop) - (anchorTop - this.cropTop));
      this.bottom += pushed;
    }
    this.startPage = this.pages.length - 1;
    for (;; ) {
      const last = this.pages.at(-1);
      if (this.bottom < last.top + last.height + last.marginTop) {
        break;
      }
      this.pages.push(this.openPage(last.top + last.height, null));
    }
    this.index += 1;
    return pushed;
  }
  placedPage() {
    return this.startPage;
  }
  result() {
    if (this.index === 0) {
      return { cropTop: 0, pageCount: 1, pageHeights: [this.height] };
    }
    const pages = [...this.pages];
    for (;; ) {
      const last = pages.at(-1);
      if (this.bottom + last.marginBottom <= last.top + last.height) {
        break;
      }
      pages.push(this.openPage(last.top + last.height, null));
    }
    return {
      cropTop: this.cropTop,
      pageCount: pages.length,
      pageHeights: pages.map((page) => page.height)
    };
  }
  openPage(top, own) {
    return {
      top,
      height: own?.height ?? this.height,
      marginTop: own?.marginTop ?? this.marginTop,
      marginBottom: own?.marginBottom ?? this.marginBottom
    };
  }
}

// page-planner.ts
class PagePlanner {
  pageHeight;
  marginTop;
  marginBottom;
  constructor(pageHeight, marginTop, marginBottom) {
    this.pageHeight = pageHeight;
    this.marginTop = marginTop;
    this.marginBottom = marginBottom;
  }
  plan(extents, document2) {
    const walk = this.walk();
    const pushes = new Map;
    let shift = 0;
    extents.forEach((extent, index) => {
      const lines = document2?.lines[index];
      const system = document2?.systems[index];
      const push = walk.place({ top: extent.top + shift, bottom: extent.bottom + shift }, lines && system ? {
        lines: { top: lines.top + shift, bottom: lines.bottom + shift },
        system
      } : undefined);
      if (push > 0) {
        pushes.set(index, push);
        shift += push;
      }
    });
    return { pushes, ...walk.result() };
  }
  walk() {
    return new PageWalk(this.pageHeight, this.marginTop, this.marginBottom);
  }
}

// signature-fold.ts
import { Barline as Barline7, CanvasContext } from "vexflow/core";
class SignatureFold {
  reader;
  staves;
  score;
  opts;
  left;
  width;
  height;
  parts;
  states = [];
  factory;
  systemX;
  constructor(signatures, reader, staves, score, opts) {
    this.reader = reader;
    this.staves = staves;
    this.score = score;
    this.opts = opts;
    this.factory = new StaveFactory(signatures, staves, reader);
    this.parts = score.parts;
    this.height = opts.height;
    this.systemX = opts.boxes.find((box) => box !== undefined)?.x ?? 0;
    this.left = Math.max(0, this.systemX - PAGE_MARGIN_X);
    let previous = null;
    for (const [measureIndex, box] of opts.boxes.entries()) {
      if (box?.systemIndex !== 0) {
        continue;
      }
      const signature = this.signatureAt(measureIndex);
      if (signature !== previous) {
        this.states.push({ x: box.x, measureIndex });
        previous = signature;
      }
    }
    let right = this.systemX;
    for (const state of this.states) {
      for (const stave of this.column(state, 0).staves) {
        right = Math.max(right, stave.getNoteStartX());
      }
    }
    this.width = right + FOLD_PADDING - this.left;
  }
  get starts() {
    return this.states.map((state) => state.x);
  }
  indexAt(x) {
    let index = 0;
    for (const [i, state] of this.states.entries()) {
      if (state.x > x) {
        break;
      }
      index = i;
    }
    return index;
  }
  paint(context2D, index) {
    const state = this.states[index];
    if (!state) {
      return;
    }
    const context = new CanvasContext(context2D);
    context.setFillStyle(this.opts.notationColor);
    context.setStrokeStyle(this.opts.notationColor);
    const column = this.column(state, this.left + this.width - this.systemX + 1);
    for (const stave of column.staves) {
      stave.setContext(context).draw();
    }
    const connectors = new ConnectorDrawer(context, this.reader, this.staves, {
      parts: this.parts,
      partGroups: this.reader.partGroups(this.score),
      barlineBreaks: new Set,
      totalStaves: this.opts.totalStaves,
      labelIndent: 0,
      partLabelIndent: 0,
      laterLabelIndent: 0,
      abbreviationIndent: 0,
      labelFont: "",
      notationColor: this.opts.notationColor,
      textColor: this.opts.textColor
    });
    const partStaves = column.partStaves.map((entry) => entry ? { top: entry.top, bottom: entry.bottom } : undefined);
    for (const entry of column.partStaves) {
      if (entry) {
        connectors.drawPartSymbol(entry.part, entry.top, entry.bottom, this.systemX);
      }
    }
    connectors.drawSystemStart({
      measureX: this.systemX,
      systemIndex: 0,
      isSystemStart: true,
      isLastMeasure: false,
      barStyle: null,
      repeatEnd: false,
      repeatBoth: false,
      begRepeatX: null,
      systemTop: column.staves[0],
      systemBottom: column.staves.at(-1),
      partStaves
    });
  }
  signatureAt(measureIndex) {
    const parts = [];
    for (const part of this.parts) {
      const measure = part.measures[measureIndex];
      for (const staffNumber of this.staves.visibleNumbers(part)) {
        if (!measure || this.staves.isTab(part, staffNumber)) {
          parts.push("");
          continue;
        }
        const clef = this.factory.clefSpec(measure, staffNumber);
        const key = this.reader.keyIdentity(measure.getKey(staffNumber));
        parts.push(`${clef}/${key}`);
      }
    }
    return parts.join(";");
  }
  column(state, width) {
    const staves = [];
    const partStaves = [];
    let row = 0;
    for (const part of this.parts) {
      const numbers = this.staves.visibleNumbers(part);
      const measure = part.measures[state.measureIndex];
      if (!measure) {
        row += numbers.length;
        partStaves.push(undefined);
        continue;
      }
      const built = [];
      for (const staffNumber of numbers) {
        const placed = this.factory.create(part, measure, staffNumber, this.systemX, this.opts.rowYs[row] ?? 0, width);
        placed.stave.setBegBarType(placed.isTab && this.opts.totalStaves === 1 ? Barline7.type.SINGLE : Barline7.type.NONE);
        placed.stave.setEndBarType(Barline7.type.NONE);
        this.factory.addOpening(placed, measure, staffNumber);
        built.push(placed.stave);
        row++;
      }
      const top = built[0];
      const bottom = built.at(-1);
      partStaves.push(top && bottom ? { part, top, bottom } : undefined);
      staves.push(...built);
    }
    return { staves, partStaves };
  }
}

// system-draw.ts
class SystemDraw {
  deps;
  score;
  plan;
  layout;
  drawing;
  list = new PaintList;
  topSlack = LEDGER_HEADROOM;
  walk;
  shifts = new Map;
  topOverflow = new Map;
  systemStaveOffsets;
  plannedStaveOffsets;
  fixedGaps;
  lyricDrops = new Map;
  voltaLifts = new Map;
  hairpinBands = new Map;
  marks = new Map;
  activeFloorHeight;
  settled = 0;
  drawnAhead = false;
  headerOps = [];
  pageWidth;
  finished = null;
  settledOpCount = 0;
  pieces = null;
  constructor(deps, probe, score, plan) {
    this.deps = deps;
    this.score = score;
    this.plan = plan;
    const { config } = deps;
    const { layout } = plan;
    const { systemGap, floorHeight, measureCount } = layout;
    const systemCount = measureCount;
    const perSystem = floorHeight - layout.top + systemGap + LEDGER_HEADROOM;
    const tallestPage = Math.max(layout.page?.height ?? 0, ...(layout.documentSystems ?? []).map((s) => s.page?.height ?? 0));
    const pageHeight = layout.top + this.topSlack + systemCount * 2 * perSystem + (layout.page ? systemCount * tallestPage : 0);
    this.activeFloorHeight = floorHeight;
    this.plannedStaveOffsets = new Map(layout.systemStaveOffsets);
    this.systemStaveOffsets = layout.systemStaveOffsets;
    this.fixedGaps = layout.documentSystems ? new Map(layout.documentSystems.map((system, s) => [s, system.fixedGaps])) : undefined;
    const paint = new PaintContext(this.list, probe, null);
    const context = new CanvasContext2(paint);
    const families = new FontFamilies(config.fonts);
    this.layout = layout;
    this.pageWidth = layout.width;
    this.drawing = new DrawPass({
      translator: deps.translator,
      chords: deps.chords,
      tab: deps.tab,
      signatures: deps.signatures,
      staves: deps.staves,
      barlines: deps.barlines,
      reader: deps.reader,
      spanners: deps.spanners,
      config,
      configuredGaps: deps.gaps,
      context,
      score,
      layout: this.layout,
      labelFont: families.textStack,
      notationFont: families.notationStack,
      topSlack: this.topSlack,
      scratchHeight: pageHeight,
      topOverflow: this.topOverflow,
      list: this.list,
      paint,
      lyricDrops: this.lyricDrops,
      voltaLifts: this.voltaLifts,
      hairpinBands: this.hairpinBands
    });
    const { page } = layout;
    this.walk = page ? new PagePlanner(page.height, page.marginTop, page.marginBottom).walk() : null;
  }
  done() {
    return this.plan.isComplete() && this.settled >= this.plan.placedSystems();
  }
  systemOfMeasure(m) {
    return this.drawing.systemOfMeasure(m);
  }
  drawNext() {
    while (!this.done()) {
      const system = this.advance();
      if (system !== null) {
        return system;
      }
    }
    return null;
  }
  advance() {
    if (this.done()) {
      return null;
    }
    this.pieces ??= this.settleNext();
    const piece = this.pieces.next();
    if (!piece.done) {
      return null;
    }
    this.pieces = null;
    return piece.value;
  }
  bottomOf(system) {
    const isLast = this.plan.isComplete() && system === this.plan.placedSystems() - 1;
    return this.drawing.extentOf(system, isLast).bottom - this.cropTop();
  }
  result() {
    const { layout: layoutConfig } = this.deps.config;
    const pass = this.done() ? this.finish() : this.collected();
    const ops = [...this.headerOps, ...this.settledOps()];
    const { page } = this.layout;
    if (this.walk && page && this.done()) {
      const { cropTop, pageHeights } = this.walk.result();
      return this.paged(ops, pass, page, cropTop, pageHeights);
    }
    const { pageTop, pageBottom } = pass;
    const { width } = this.layout;
    let cropTop = this.cropTop();
    let cssHeight = Math.max(this.activeFloorHeight + this.topSlack, pageBottom + PAGE_MARGIN_BOTTOM) - cropTop;
    let scale = layoutConfig.type === "panoramic" ? layoutConfig.scale : 1;
    const lines = pass.staveLines.get(0);
    if (layoutConfig.type === "panoramic" && layoutConfig.fitHeight !== null && lines && pageTop !== Infinity) {
      const middle = (lines.top + lines.bottom) / 2;
      const half = Math.max(middle - Math.min(pageTop, lines.top), Math.max(pageBottom, lines.bottom) - middle);
      cropTop = middle - half;
      cssHeight = 2 * half;
      scale = layoutConfig.fitHeight / cssHeight;
    }
    const engraving = {
      ops,
      width,
      height: cssHeight,
      origin: { x: 0, y: -cropTop },
      scale
    };
    const geometry = this.toScore(pass, new Rect2(0, 0, width, cssHeight), 0, cropTop);
    const sticky = layoutConfig.type === "panoramic" && layoutConfig.stickySignatures;
    if (!sticky) {
      return { geometry, engraving, fold: null, pages: [] };
    }
    const offsets = this.layout.systemStaveOffsets?.get(0) ?? this.layout.staveOffsets;
    const fold = new SignatureFold(this.deps.signatures, this.deps.reader, this.deps.staves, this.score, {
      boxes: this.layout.boxes,
      rowYs: offsets.map((offset) => this.layout.top + this.topSlack + offset - cropTop),
      totalStaves: this.layout.totalStaves,
      height: cssHeight,
      notationColor: Ink.NOTATION,
      textColor: Ink.TEXT
    });
    return { geometry, engraving, fold, pages: [] };
  }
  *settleNext() {
    const system = this.settled;
    this.plan.placeThrough(system + 1);
    yield;
    const next = system + 1 < this.plan.placedSystems() ? system + 1 : undefined;
    if (!this.drawnAhead) {
      this.draw(system);
      yield;
    }
    const early = this.drawing.reachesPast(system) ? undefined : this.weigh(system);
    const drawAhead = next !== undefined && !early?.revision.needed;
    this.drawnAhead = drawAhead;
    if (drawAhead) {
      this.draw(next);
      yield;
    }
    const seen = drawAhead || !early ? this.weigh(system) : early;
    if (seen.revision.needed) {
      this.reserve(system, seen);
      this.redraw(system, drawAhead && next !== undefined ? next : system);
      this.drawnAhead = false;
      yield;
    }
    const lines = this.drawing.linesOf(system);
    const document2 = this.layout.documentSystems?.[system];
    const push = this.walk?.place(this.drawing.extentOf(system, next === undefined), lines && document2 ? { lines, system: document2 } : undefined);
    const shift = this.walk && this.walk.placedPage() % 2 === 1 ? this.layout.page?.evenShift ?? 0 : 0;
    const shifted = shift !== (this.shifts.get(system) ?? 0);
    if (shifted) {
      this.shifts.set(system, shift);
      this.drawing.shiftSystem(system, shift);
    }
    if (push || shifted) {
      this.topOverflow.set(system, (this.topOverflow.get(system) ?? 0) + (push ?? 0));
      this.redraw(system, this.drawnAhead && next !== undefined ? next : system);
      this.drawnAhead = false;
      yield;
    }
    this.settled++;
    if (this.settled === 1) {
      this.drawHeader();
    } else if (this.layout.width !== this.pageWidth) {
      this.drawing.widenPage(this.layout.width);
      this.drawHeader();
    }
    const ahead = this.drawnAhead ? this.marks.get(this.settled) : undefined;
    this.settledOpCount = ahead ? ahead.list.ops : this.list.ops.length;
    return system;
  }
  draw(system) {
    this.marks.set(system, this.drawing.mark(system));
    this.drawing.drawSystem(system);
  }
  redraw(system, through) {
    const mark = this.marks.get(system);
    if (mark) {
      this.drawing.rewind(mark, through);
    }
    this.drawing.drawSystem(system);
  }
  weigh(system) {
    const seen = this.drawing.observe(system);
    const revision = this.deps.spillResolver.revise(this.layout.staveOffsets, {
      observedStaveSpill: new Map(seen.staveSpill ? [[system, seen.staveSpill]] : []),
      observedOverflow: new Map([[system, seen.overflow]]),
      lyricsStepped: seen.lyricsStepped,
      voltasLifted: seen.voltasLifted,
      hairpinsStacked: seen.hairpinsStacked
    }, this.plan.placedSystems(), this.plannedStaveOffsets, this.fixedGaps);
    return { seen, revision };
  }
  reserve(system, { seen, revision }) {
    const offsets = revision.systemStaveOffsets.get(system);
    if (offsets) {
      this.systemStaveOffsets.set(system, offsets);
    }
    this.activeFloorHeight = Math.max(this.activeFloorHeight, this.layout.floorHeight + revision.grewBy);
    this.topOverflow.set(system, seen.overflow);
    for (const [key, drop] of seen.lyricDrops) {
      this.lyricDrops.set(key, drop);
    }
    if (seen.voltaLift !== undefined) {
      this.voltaLifts.set(system, seen.voltaLift);
    }
    if (seen.hairpinBands) {
      this.hairpinBands.set(system, seen.hairpinBands);
    }
  }
  drawHeader() {
    this.pageWidth = this.layout.width;
    const at = this.list.ops.length;
    this.drawing.drawHeader();
    this.headerOps = this.list.ops.splice(at);
    const { pageTop } = this.drawing.collected();
    for (const mark of this.marks.values()) {
      mark.pageTop = Math.min(mark.pageTop, pageTop);
    }
  }
  settledOps() {
    return this.done() ? this.list.ops : this.list.ops.slice(0, this.settledOpCount);
  }
  finish() {
    this.finished ??= this.drawing.finish();
    return this.finished;
  }
  collected() {
    const pass = this.drawing.collected();
    if (!this.drawnAhead && !this.pieces) {
      return pass;
    }
    const settled = (system) => system < this.settled;
    return {
      ...pass,
      rawNotes: pass.rawNotes.filter((n) => settled(this.systemOfMeasure(n.measureIndex))),
      rawMeasures: pass.rawMeasures.filter((m) => settled(m.systemIndex)),
      rawChordDiagrams: pass.rawChordDiagrams.filter((d) => settled(this.systemOfMeasure(d.measureIndex)))
    };
  }
  cropTop() {
    const { pageTop } = this.drawing.collected();
    return pageTop === Infinity ? this.topSlack : Math.max(0, Math.min(this.topSlack, pageTop - PAGE_MARGIN_TOP));
  }
  toScore(pass, bounds, dx, cropTop) {
    const shiftOf = (system) => this.shifts.get(system) ?? 0;
    const toScore = (r, system) => r.translate(dx + shiftOf(system), -cropTop);
    const toScoreGlyph = (g, system) => g ? { ...g, x: g.x + dx + shiftOf(system), y: g.y - cropTop } : null;
    return {
      bounds,
      notes: pass.rawNotes.map((n) => {
        const system = this.systemOfMeasure(n.measureIndex);
        return {
          ...n,
          rect: toScore(n.rect, system),
          ink: toScore(n.ink, system),
          glyph: toScoreGlyph(n.glyph, system)
        };
      }),
      measures: pass.rawMeasures.map((mm) => {
        const dxOf = dx + shiftOf(mm.systemIndex);
        return {
          ...mm,
          rect: toScore(mm.rect, mm.systemIndex),
          staves: mm.staves.map((s) => ({
            ...s,
            lines: s.lines.map((y) => y - cropTop),
            left: s.left + dxOf,
            right: s.right + dxOf,
            noteStartX: s.noteStartX + dxOf,
            keyAccidentals: s.keyAccidentals.map((a) => ({
              ...a,
              x: a.x + dxOf,
              y: a.y - cropTop
            }))
          })),
          barlines: mm.barlines.map((barline) => ({
            ...barline,
            rect: toScore(barline.rect, mm.systemIndex)
          }))
        };
      }),
      chordDiagrams: pass.rawChordDiagrams.map((d) => ({
        ...d,
        rect: toScore(d.rect, this.systemOfMeasure(d.measureIndex))
      }))
    };
  }
  paged(ops, pass, page, cropTop, pageHeights) {
    const { width: pageWidth, offsetX: dx } = page;
    const height = pageHeights.reduce((sum, h) => sum + h, 0);
    return {
      geometry: this.toScore(pass, new Rect2(0, 0, pageWidth, height), dx, cropTop),
      engraving: {
        ops,
        width: pageWidth,
        height,
        origin: { x: dx, y: -cropTop },
        scale: 1
      },
      fold: null,
      pages: pageHeights.map((pageHeight, index) => {
        const top = pageHeights.slice(0, index).reduce((sum, h) => sum + h, 0);
        return new Rect2(0, top, pageWidth, pageHeight);
      })
    };
  }
}

// score-drawer.ts
class ScoreDrawer {
  config;
  translator;
  chords;
  tab;
  signatures;
  staves;
  barlines;
  reader;
  spanners;
  gaps;
  spillResolver;
  constructor(config, translator, chords, tab, signatures, staves, barlines, reader, spanners, gaps, spillResolver) {
    this.config = config;
    this.translator = translator;
    this.chords = chords;
    this.tab = tab;
    this.signatures = signatures;
    this.staves = staves;
    this.barlines = barlines;
    this.reader = reader;
    this.spanners = spanners;
    this.gaps = gaps;
    this.spillResolver = spillResolver;
  }
  draw(probe, score, layout) {
    const run = this.begin(probe, score, new WholeLayoutPlan(layout));
    while (!run.done()) {
      run.drawNext();
    }
    return run.result();
  }
  begin(probe, score, plan) {
    return new SystemDraw({
      config: this.config,
      translator: this.translator,
      chords: this.chords,
      tab: this.tab,
      signatures: this.signatures,
      staves: this.staves,
      barlines: this.barlines,
      reader: this.reader,
      spanners: this.spanners,
      gaps: this.gaps,
      spillResolver: this.spillResolver
    }, probe, score, plan);
  }
}

// beam-builder.ts
import { Beam as Beam2, Stem as Stem8 } from "vexflow/core";

// spaced-beam.ts
import { Beam } from "vexflow/core";

class SpacedBeam extends Beam {
  distance = null;
  setDistance(distance) {
    this.distance = distance;
    return this;
  }
  levelDistance() {
    return this.distance ?? this.renderOptions.beamWidth * 1.5;
  }
  levelOffset(level, _x) {
    return level * this.levelDistance() * (this.notes[0]?.getStemDirection() ?? 1);
  }
  calculateFlatSlope() {
    const width = this.renderOptions.beamWidth;
    this.renderOptions.beamWidth = this.levelDistance() / 1.5;
    try {
      super.calculateFlatSlope();
    } finally {
      this.renderOptions.beamWidth = width;
    }
  }
  applyStemExtensions() {
    super.applyStemExtensions();
    if (this.distance === null) {
      return;
    }
    const { beamWidth, showStemlets, stemletExtension } = this.renderOptions;
    for (const note of this.notes) {
      const stem = note.getStem();
      if (!stem) {
        continue;
      }
      const x = note.getStemX();
      if (note.getStemDirection() !== this.getStemDirection()) {
        const level = note.getGlyphProps().beamCount - 1;
        const reach = Math.abs(this.levelOffset(level, x));
        stem.setExtension(stem.getExtension() + reach - level * beamWidth * 1.5);
      }
      if (note.isRest() && showStemlets) {
        const reach = Math.abs(this.levelOffset(this.getBeamCount() - 1, x));
        stem.setStemlet(true, reach + beamWidth + stemletExtension);
      }
    }
  }
  drawBeamLines(ctx) {
    const first = this.notes[0];
    if (!first) {
      return;
    }
    const firstX = first.getStemX();
    const baseY = this.getBeamYToDraw();
    const thickness = this.renderOptions.beamWidth * first.getStemDirection();
    const levels = ["4", "8", "16", "32", "64"];
    levels.forEach((duration, level) => {
      for (const line of this.getBeamLines(duration)) {
        const end = line.end ?? line.start;
        const topAt = (x) => this.getSlopeY(x, firstX, baseY, this.slope) + this.levelOffset(level, x);
        ctx.beginPath();
        ctx.moveTo(line.start, topAt(line.start));
        ctx.lineTo(line.start, topAt(line.start) + thickness);
        ctx.lineTo(end + 1, topAt(end) + thickness);
        ctx.lineTo(end + 1, topAt(end));
        ctx.closePath();
        ctx.fill();
      }
    });
  }
}

// feathered-beam.ts
class FeatheredBeam extends SpacedBeam {
  fan;
  constructor(notes, autoStem, fan) {
    super(notes, autoStem);
    this.fan = fan;
  }
  levelOffset(level, x) {
    const first = this.notes[0];
    const last = this.notes[this.notes.length - 1];
    const firstX = first?.getStemX() ?? x;
    const span = (last?.getStemX() ?? x) - firstX;
    const t = span > 0 ? Math.min(Math.max((x - firstX) / span, 0), 1) : 1;
    return super.levelOffset(level, x) * (this.fan === "accel" ? t : 1 - t);
  }
}

// beam-builder.ts
class BeamBuilder {
  reader;
  appearance;
  constructor(reader, appearance) {
    this.reader = reader;
    this.appearance = appearance;
  }
  build(groups, byLead, opts = {}) {
    const { defaultStem, notesByLead } = opts;
    const beams = [];
    for (const group of groups) {
      const notes = group.notes.filter((note) => !note.isGrace).flatMap((note) => notesByLead?.get(note) ?? [byLead.get(note)]).filter((note) => note !== undefined);
      if (notes.length > 1) {
        const autoStem = !defaultStem && group.notes.every((note) => !note.stem) && !notes.every((note) => note.getStemDirection() === beamStem(notes));
        const beam = this.beamOf(notes, autoStem, fanOf(group, this.reader));
        beam.renderOptions.beamWidth = this.appearance.lineWidth("beam") ?? beam.renderOptions.beamWidth;
        if (autoStem) {
          notes.forEach((note) => {
            this.reorientArticulations(note);
          });
        }
        const opposed = notes.some((note) => note.getStemDirection() !== notes[0]?.getStemDirection());
        if (!opposed && this.isFlatBeam(group, byLead)) {
          beam.renderOptions.flatBeams = true;
          beam.renderOptions.minFlatBeamOffset = Stem8.HEIGHT - (beam instanceof SpacedBeam ? beam.levelDistance() : beam.renderOptions.beamWidth * 1.5);
        }
        if (group.breaksAfter.length > 0) {
          beam.breakSecondaryAt(group.breaksAfter);
        }
        beams.push(beam);
      }
    }
    return beams;
  }
  beamOf(notes, autoStem, fan) {
    const distance = this.appearance.distance("beam");
    if (fan) {
      return new FeatheredBeam(notes, autoStem, fan).setDistance(distance);
    }
    if (distance !== null) {
      return new SpacedBeam(notes, autoStem).setDistance(distance);
    }
    return new Beam2(notes, autoStem);
  }
  isFlatBeam(group, byLead) {
    const lines = group.notes.filter((note) => !note.isGrace && !note.isRest).map((note) => byLead.get(note)).filter((note) => note !== undefined).map((note) => note.getKeyProps().map((key) => key.line));
    const lo = lines.map((event) => Math.min(...event));
    const hi = lines.map((event) => Math.max(...event));
    if (lines.length < 2) {
      return false;
    }
    const sorted = (voice, sign) => voice.every((line, i, all) => {
      const prev = all.at(i - 1);
      return i === 0 || prev === undefined || sign * (line - prev) >= 0;
    });
    const moved = (voice, sign) => {
      const first = voice.at(0);
      const last = voice.at(-1);
      return first !== undefined && last !== undefined && sign * (last - first) > 0;
    };
    const monotonic = (sign) => sorted(lo, sign) && sorted(hi, sign) && (moved(lo, sign) || moved(hi, sign));
    return !monotonic(1) && !monotonic(-1);
  }
  reorientArticulations(staveNote) {
    for (const mod of staveNote.getModifiers()) {
      if (mod instanceof NoteheadArticulation) {
        mod.setSide(staveNote);
      }
    }
  }
}
function beamStem(notes) {
  let sum = 0;
  for (const note of notes) {
    for (const props of note.getKeyProps()) {
      sum += props.line - 3;
    }
  }
  return sum >= 0 ? Stem8.DOWN : Stem8.UP;
}
function fanOf(group, reader) {
  for (const note of group.notes) {
    for (const beam of reader.beamsOf(note)) {
      const fan = beam.getAttribute("fan");
      if (fan === "accel" || fan === "rit") {
        return fan;
      }
    }
  }
  return null;
}

// curve-connectors.ts
class CurveConnectors {
  reader;
  connectors = new Map;
  ties = new Map;
  reaches = new Map;
  documentCurves = false;
  constructor(reader) {
    this.reader = reader;
  }
  useDocumentCurves(enabled) {
    if (enabled !== this.documentCurves) {
      this.connectors.clear();
      this.ties.clear();
      this.reaches.clear();
    }
    this.documentCurves = enabled;
  }
  tiesOf(note) {
    let ties = this.ties.get(note);
    if (!ties) {
      ties = this.reader.tiesOf(note).filter((tie) => tie.tieType === "start" || this.documentCurves && tie.tieType === "continue").map((tie) => {
        const segment = this.documentCurves ? curveSegmentOf(tie) : null;
        return {
          partner: segment?.end.note ?? tie.partner?.note ?? null,
          bezier: segment?.bezier ?? null,
          dash: lineDashOf(tie),
          orientation: tie.getAttribute("orientation")
        };
      });
      this.ties.set(note, ties);
    }
    return ties;
  }
  connectorsOf(note) {
    const cached = this.connectors.get(note);
    if (cached) {
      return cached;
    }
    const resolved = {
      slurs: note.slurs.filter((s) => s.slurType === "start" || this.documentCurves && s.slurType === "continue").map((s) => {
        const found = curveSegmentOf(s);
        const segment = this.documentCurves ? found : null;
        const partner = segment?.end.note ?? s.partner?.note ?? null;
        return {
          slurType: "start",
          bezier: segment?.bezier ?? null,
          partner: partner && { note: partner },
          placement: s.placement ?? placementOfOrientation(s) ?? placementOfBezier(found?.bezier ?? null),
          dash: lineDashOf(s)
        };
      }),
      techniques: [
        ...note.hammerOns.filter((h) => h.hammerOnType === "start").map((h) => ({
          slurType: h.hammerOnType,
          bezier: null,
          partner: h.partner,
          placement: null,
          dash: null
        })),
        ...note.pullOffs.filter((p) => p.pullOffType === "start").map((p) => ({
          slurType: p.pullOffType,
          bezier: null,
          partner: p.partner,
          placement: null,
          dash: null
        }))
      ]
    };
    this.connectors.set(note, resolved);
    return resolved;
  }
  slurConnectors(note, spans) {
    const { slurs, techniques } = this.connectorsOf(note);
    const slurTargets = new Set(slurs.map((s) => s.partner?.note ?? null));
    return [
      ...slurs,
      ...techniques.filter((t) => {
        const partner = t.partner?.note ?? null;
        return !slurTargets.has(partner) && !spans.some((span) => span.has(note) && !!partner && span.has(partner));
      })
    ];
  }
  slurSpans(chords) {
    const leads = chords.map((chord) => chord.lead);
    const index = new Map(leads.map((note, i) => [note, i]));
    const spans = [];
    leads.forEach((note, i) => {
      for (const slur of this.connectorsOf(note).slurs) {
        const j = slur.slurType === "start" && slur.partner ? index.get(slur.partner.note) ?? -1 : -1;
        if (j > i) {
          spans.push(new Set(leads.slice(i, j + 1)));
        }
      }
    });
    return spans;
  }
  reach(note) {
    let reach = this.reaches.get(note);
    if (reach === undefined) {
      const { slurs, techniques } = this.connectorsOf(note);
      const partners = [
        ...this.tiesOf(note).map((tie) => tie.partner),
        ...[...slurs, ...techniques].map((c) => c.partner?.note ?? null),
        ...note.slides.filter((s) => s.slideType === "start").map((s) => s.partner?.note ?? null),
        ...note.glissandos.filter((g) => g.glissandoType === "start").map((g) => g.partner?.note ?? null),
        ...note.wavyLines.filter((w) => w.wavyLineType === "start").map((w) => w.partner?.note ?? null)
      ];
      reach = Math.max(note.measure.index, ...partners.map((partner) => partner?.measure.index ?? -1));
      this.reaches.set(note, reach);
    }
    return reach;
  }
}
function placementOfOrientation(slur) {
  const orientation = slur.getAttribute("orientation");
  if (orientation === "over") {
    return "above";
  }
  return orientation === "under" ? "below" : null;
}
function placementOfBezier(bezier) {
  const ys = [bezier?.start.y, bezier?.end.y].filter((y) => typeof y === "number" && y !== 0);
  const first = ys[0];
  if (first === undefined || ys.some((y) => Math.sign(y) !== Math.sign(first))) {
    return null;
  }
  return first > 0 ? "above" : "below";
}

// notation-slide.ts
import { Modifier as Modifier10 } from "vexflow/core";
class NotationSlide {
  from;
  to;
  context;
  dash;
  fromIndex;
  toIndex;
  constructor(from, to, opts) {
    this.from = from;
    this.to = to;
    this.fromIndex = opts.fromIndex;
    this.toIndex = opts.toIndex;
    this.dash = opts.dash ?? null;
  }
  setContext(context) {
    this.context = context;
    return this;
  }
  draw() {
    const ctx = this.context;
    if (!ctx) {
      return;
    }
    const startY = this.from.getModifierStartXY(Modifier10.Position.RIGHT, this.fromIndex).y;
    const endY = this.to.getModifierStartXY(Modifier10.Position.LEFT, this.toIndex).y;
    const x1 = this.from.getAbsoluteX() + this.from.getGlyphWidth() / 2 + 2 * SLIDE_PADDING;
    const x2 = this.to.getAbsoluteX() - SLIDE_PADDING;
    const width = Math.max(x2 - x1, 1);
    const rise = endY - startY;
    const sign = rise < 0 ? -1 : 1;
    const dy = sign * Math.min(Math.max(Math.abs(rise), SLIDE_MIN_SLANT), width);
    ctx.save();
    if (this.dash) {
      ctx.setLineDash(this.dash);
    }
    ctx.beginPath();
    ctx.moveTo(x1, startY);
    ctx.lineTo(x2, startY + dy);
    ctx.stroke();
    ctx.restore();
  }
}

// single-slide.ts
import {
  Modifier as Modifier11
} from "vexflow/core";
class SingleSlide {
  note;
  index;
  kind;
  extraPad;
  context;
  constructor(note, index, kind, extraPad) {
    this.note = note;
    this.index = index;
    this.kind = kind;
    this.extraPad = extraPad;
  }
  setContext(context) {
    this.context = context;
    return this;
  }
  draw() {
    const ctx = this.context;
    if (!ctx) {
      return;
    }
    const side = this.kind === "in" ? Modifier11.Position.LEFT : Modifier11.Position.RIGHT;
    const y = this.note.getModifierStartXY(side, this.index).y;
    const half = this.note.getGlyphWidth() / 2;
    const pad = SLIDE_PADDING + this.extraPad;
    const near = this.note.getAbsoluteX();
    const [x1, y1, x2, y2] = this.kind === "in" ? [
      near - half - pad - SINGLE_SLIDE_LEN,
      y + SINGLE_SLIDE_RISE,
      near - half - pad,
      y
    ] : [
      near + half + pad,
      y,
      near + half + pad + SINGLE_SLIDE_LEN,
      y - SINGLE_SLIDE_RISE
    ];
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }
}

// glissando-builder.ts
class GlissandoBuilder {
  build(chords, byLead, scope = WHOLE_SCORE) {
    if (!chords.some((c) => c.notes.some((n) => n.slides.length > 0 || n.glissandos.length > 0))) {
      return [];
    }
    const placement = new Map;
    for (const chord of chords) {
      const staveNote = byLead.get(chord.lead);
      if (staveNote) {
        chord.notes.forEach((note, index) => {
          placement.set(note, { staveNote, index });
        });
      }
    }
    const lines = [];
    const open = new Map;
    for (const chord of chords) {
      for (const note of chord.notes) {
        const at = placement.get(note);
        if (!at) {
          continue;
        }
        const markers = [
          ...note.slides.map((s) => ({
            number: s.number,
            type: s.slideType,
            dash: lineDashOf(s)
          })),
          ...note.glissandos.map((g) => ({
            number: g.number,
            type: g.glissandoType,
            dash: lineDashOf(g)
          }))
        ];
        for (const marker of markers) {
          if (marker.type === "start") {
            open.set(marker.number, { ...at, note, dash: marker.dash });
          } else if (marker.type === "stop") {
            const from = open.get(marker.number);
            open.delete(marker.number);
            if (!from) {
              if (scope.owns(at.staveNote, at.staveNote)) {
                lines.push(new SingleSlide(at.staveNote, at.index, "in", 0));
              }
              continue;
            }
            if (!scope.owns(from.staveNote, at.staveNote)) {
              continue;
            }
            lines.push(new NotationSlide(from.staveNote, at.staveNote, {
              fromIndex: from.index,
              toIndex: at.index,
              dash: from.dash ?? marker.dash
            }));
          }
        }
      }
    }
    for (const at of open.values()) {
      if (scope.ownsOpen(at.note)) {
        lines.push(new SingleSlide(at.staveNote, at.index, "out", SINGLE_SLIDE_GAP));
      }
    }
    return lines;
  }
}

// crisp-curve.ts
import {
  Curve,
  StaveNote as StaveNote8
} from "vexflow/core";
var CURVE_THICKNESS = 2.93;
var CURVE_TIP = 1.25;
var HEAD_REACH = 0.7;
function curveThickness(middle) {
  return middle / LENS_DEPTH;
}
var LENS_DEPTH = 0.75;

class CrispCurve extends Curve {
  tip = null;
  bezier;
  reach;
  openX;
  constructor(from, to, opts) {
    super(from, to, { ...opts, thickness: opts.thickness ?? CURVE_THICKNESS });
    this.openX = opts.openX ?? null;
    this.bezier = opts.bezier ?? null;
    this.reach = opts.reach ?? { start: false, end: false };
  }
  setTip(tip) {
    this.tip = tip;
    return this;
  }
  renderCurve(params) {
    const reached = this.reachedEnds(params);
    const original = this.renderOptions.cps;
    const bezier = this.bezier;
    if (bezier) {
      const spacing = (params.lastX - params.firstX - 2 * this.renderOptions.xShift) / 4;
      this.renderOptions.cps = original.map((point, i) => {
        const offset = i === 0 ? bezier.start : bezier.end;
        return {
          x: offset.x === null ? point.x : offset.x + (i === 0 ? -spacing : spacing),
          y: offset.y === null ? point.y : -offset.y / params.direction
        };
      });
    }
    try {
      this.paintCurve(reached);
    } finally {
      this.renderOptions.cps = original;
    }
  }
  reachedEnds(params) {
    const centre = (note) => note instanceof StaveNote8 ? note.getNoteHeadBeginX() + note.getGlyphWidth() / 2 : null;
    const first = this.reach.start ? centre(this.from) : null;
    const last = this.reach.end ? centre(this.to) : null;
    const open = this.openX;
    const openFirst = open !== null && !this.from ? open : params.firstX;
    const openLast = open !== null && !this.to ? open : params.lastX;
    return {
      ...params,
      firstX: first === null ? openFirst : first - HEAD_REACH,
      lastX: last === null ? openLast : last + HEAD_REACH
    };
  }
  paintCurve(params) {
    if (this.getStyle()?.lineDash) {
      super.renderCurve(params);
      return;
    }
    this.renderTipped(params, this.tip ?? Math.min(CURVE_TIP, this.renderOptions.thickness * LENS_DEPTH));
  }
  renderTipped(params, tip) {
    const ctx = this.checkContext();
    const options = this.renderOptions;
    const dir = params.direction;
    const yShift = options.yShift * dir;
    const firstX = params.firstX + options.xShift;
    const firstY = params.firstY + yShift;
    const lastX = params.lastX - options.xShift;
    const lastY = params.lastY + yShift;
    const [cp0 = { x: 0, y: 0 }, cp1 = { x: 0, y: 0 }] = options.cps;
    const spacing = (lastX - firstX) / (options.cps.length + 2);
    const far = options.thickness - tip / 3;
    ctx.beginPath();
    ctx.moveTo(firstX, firstY);
    ctx.bezierCurveTo(firstX + spacing + cp0.x, firstY + cp0.y * dir, lastX - spacing + cp1.x, lastY + cp1.y * dir, lastX, lastY);
    ctx.lineTo(lastX, lastY + tip * dir);
    ctx.bezierCurveTo(lastX - spacing + cp1.x, lastY + (cp1.y + far) * dir, firstX + spacing + cp0.x, firstY + (cp0.y + far) * dir, firstX, firstY + tip * dir);
    ctx.closePath();
    ctx.fill();
  }
}

// tab-curve.ts
class TabCurve extends CrispCurve {
  notes;
  firstIndex;
  lastIndex;
  constructor(notes, firstIndex, lastIndex) {
    super(notes.firstNote ?? undefined, notes.lastNote ?? undefined, {
      yShift: TAB_CURVE_Y_SHIFT,
      cps: [
        { x: 0, y: TAB_CURVE_CP_Y },
        { x: 0, y: TAB_CURVE_CP_Y }
      ]
    });
    this.notes = notes;
    this.firstIndex = firstIndex;
    this.lastIndex = lastIndex;
  }
  draw() {
    this.checkContext();
    this.setRendered();
    const { firstNote, lastNote } = this.notes;
    const anchor = firstNote ?? lastNote;
    const stave = anchor?.checkStave();
    if (!anchor || !stave) {
      return false;
    }
    const firstY = (firstNote ?? anchor).getYs()[this.firstIndex];
    const lastY = (lastNote ?? anchor).getYs()[this.lastIndex];
    if (typeof firstY !== "number" || typeof lastY !== "number") {
      return false;
    }
    const firstX = firstNote ? firstNote.getTieRightX() : stave.getTieStartX();
    const lastX = lastNote ? lastNote.getTieLeftX() : stave.getTieEndX();
    const spacing = stave.getSpacingBetweenLines();
    const onTopLine = Math.min(firstY, lastY) - spacing < stave.getYForLine(0);
    const rise = TAB_CURVE_RISE;
    const scale = Math.min(1, Math.abs(lastX - firstX) / TAB_CURVE_FULL_WIDTH, onTopLine ? 1 : (spacing - TAB_CURVE_LINE_CLEARANCE) / rise);
    this.renderOptions.yShift = TAB_CURVE_Y_SHIFT * scale;
    this.renderOptions.cps = [
      { x: 0, y: TAB_CURVE_CP_Y * scale },
      { x: 0, y: TAB_CURVE_CP_Y * scale }
    ];
    this.renderCurve({
      firstX,
      lastX,
      firstY,
      lastY,
      direction: -1
    });
    return true;
  }
}

// tie-specs.ts
function tieSpecs(firstNote, lastNote, firstIndexes, lastIndexes) {
  const wraps = (lastNote.getStave()?.getY() ?? 0) > (firstNote.getStave()?.getY() ?? 0);
  return wraps ? [
    { firstNote, firstIndexes, lastIndexes: firstIndexes },
    { lastNote, firstIndexes: lastIndexes, lastIndexes }
  ] : [{ firstNote, lastNote, firstIndexes, lastIndexes }];
}

// hammer-pull-builder.ts
class HammerPullBuilder {
  connectors;
  constructor(connectors) {
    this.connectors = connectors;
  }
  build(chords, byTabLead, scope = WHOLE_SCORE) {
    const ties = [];
    const spans = this.connectors.slurSpans(chords);
    for (const chord of chords) {
      const firstNote = byTabLead.get(chord.lead);
      if (!firstNote) {
        continue;
      }
      for (const slur of this.connectors.slurConnectors(chord.lead, spans)) {
        if (slur.slurType !== "start") {
          continue;
        }
        const partner = slur.partner?.note ?? null;
        const lastNote = partner && byTabLead.get(partner);
        if (!partner || !lastNote || !scope.owns(firstNote, lastNote)) {
          continue;
        }
        const { firstIndexes, lastIndexes } = this.pairByString(firstNote, lastNote);
        const specs = tieSpecs(firstNote, lastNote, firstIndexes, lastIndexes);
        for (const notes of specs) {
          notes.firstIndexes?.forEach((firstIndex, i) => {
            const lastIndex = notes.lastIndexes?.[i] ?? firstIndex;
            ties.push(new TabCurve(notes, firstIndex, lastIndex));
          });
        }
      }
    }
    return ties;
  }
  pairByString(firstNote, lastNote) {
    const lastPositions = lastNote.getPositions();
    const firstIndexes = [];
    const lastIndexes = [];
    firstNote.getPositions().forEach((position, i) => {
      const j = lastPositions.findIndex((other) => other.str === position.str);
      if (j >= 0) {
        firstIndexes.push(i);
        lastIndexes.push(j);
      }
    });
    return firstIndexes.length > 0 ? { firstIndexes, lastIndexes } : { firstIndexes: [0], lastIndexes: [0] };
  }
}

// pedal-line.ts
import { PedalMarking } from "vexflow/core";
var GLYPHS2 = {
  ped: "",
  p: "",
  dot: "",
  up: "",
  sost: "",
  s: ""
};
var NOTCH = 5;

class PedalLine extends PedalMarking {
  down;
  changes;
  up;
  pedal;
  constructor(down, changes, up, pedal) {
    super([down, ...changes, up]);
    this.down = down;
    this.changes = changes;
    this.up = up;
    this.pedal = pedal;
  }
  draw() {
    const ctx = this.checkContext();
    this.setRendered();
    if (this.renderOptions.color !== undefined) {
      ctx.setStrokeStyle(this.renderOptions.color);
      ctx.setFillStyle(this.renderOptions.color);
    }
    ctx.setFont(this.font);
    ctx.setLineWidth(this.renderOptions.bracketLineWidth);
    const y = this.down.checkStave().getYForBottomText(this.line + 3);
    if (this.pedal.line) {
      this.drawLine(y);
    } else if (this.pedal.sign) {
      this.drawSigns(y);
    }
  }
  drawLine(y) {
    const ctx = this.checkContext();
    const top = y - this.renderOptions.bracketHeight;
    let x = this.down.getAbsoluteX();
    ctx.beginPath();
    if (this.pedal.resumed) {
      ctx.moveTo(x, y);
    } else if (this.pedal.sign) {
      const depress = this.depressSign();
      ctx.fillText(depress, x, y);
      x += ctx.measureText(depress).width + this.renderOptions.textMarginRight;
      ctx.moveTo(x, y);
    } else {
      ctx.moveTo(x, top);
      ctx.lineTo(x, y);
    }
    for (const change of this.changes) {
      const cx = change.getAbsoluteX();
      ctx.lineTo(cx - NOTCH, y);
      ctx.lineTo(cx, top);
      ctx.lineTo(cx + NOTCH, y);
    }
    const end = this.liftX(this.up) - NOTCH;
    ctx.lineTo(end, y);
    if (!this.pedal.discontinued) {
      ctx.lineTo(end, top);
    }
    ctx.stroke();
  }
  drawSigns(y) {
    const ctx = this.checkContext();
    const depress = this.depressSign();
    const release = GLYPHS2.up;
    const releaseWidth = ctx.measureText(release).width;
    if (!this.pedal.resumed) {
      ctx.fillText(depress, this.down.getAbsoluteX(), y);
    }
    for (const change of this.changes) {
      const cx = change.getAbsoluteX();
      ctx.fillText(release, cx - releaseWidth - NOTCH, y);
      ctx.fillText(depress, cx, y);
    }
    if (!this.pedal.discontinued) {
      ctx.fillText(release, this.liftX(this.up) - releaseWidth, y);
    }
  }
  depressSign() {
    const { sostenuto, abbreviated } = this.pedal;
    if (abbreviated) {
      return (sostenuto ? GLYPHS2.s : GLYPHS2.p) + GLYPHS2.dot;
    }
    return sostenuto ? `${GLYPHS2.sost} ${GLYPHS2.ped}` : GLYPHS2.ped;
  }
  liftX(note) {
    const tickables = note.getVoice().getTickables();
    const next = tickables[tickables.indexOf(note) + 1];
    if (next) {
      return next.getAbsoluteX();
    }
    const stave = note.checkStave();
    return stave.getX() + stave.getWidth();
  }
}

// pedal-builder.ts
class PedalBuilder {
  appearance;
  constructor(appearance) {
    this.appearance = appearance;
  }
  build(markers, byLead, chords, { scope = WHOLE_SCORE } = {}) {
    const pedals = [];
    const open = new Map;
    for (const marker of markers) {
      const staveNote = byLead.get(marker.lead);
      if (!staveNote) {
        continue;
      }
      if (marker.type === "start") {
        open.set(marker.number, { note: staveNote, mark: marker, changes: [] });
        continue;
      }
      const from = open.get(marker.number);
      if (marker.type === "change") {
        if (from && from.note !== staveNote) {
          from.changes.push(staveNote);
        }
        continue;
      }
      open.delete(marker.number);
      if (!from || !scope.owns(from.note, staveNote)) {
        continue;
      }
      const marking = new PedalLine(from.note, from.changes, staveNote, {
        line: from.mark.line,
        sign: from.mark.sign,
        abbreviated: from.mark.abbreviated,
        sostenuto: from.mark.sostenuto,
        resumed: from.mark.unmarked,
        discontinued: marker.unmarked
      });
      marking.renderOptions.color = Ink.NOTATION;
      marking.renderOptions.bracketLineWidth = this.appearance.lineWidth("pedal") ?? marking.renderOptions.bracketLineWidth;
      pedals.push({
        marking,
        notes: this.pedalSpan(chords, byLead, from.note, staveNote)
      });
    }
    return pedals;
  }
  pedalSpan(chords, byLead, from, to) {
    const i = chords.findIndex((c) => byLead.get(c.lead) === from);
    const j = chords.findIndex((c) => byLead.get(c.lead) === to);
    if (i < 0 || j < i) {
      return [from, to];
    }
    const y = from.getStave()?.getY();
    return chords.slice(i, j + 1).map((c) => byLead.get(c.lead)).filter((n) => !!n && n.getStave()?.getY() === y);
  }
}

// slide-builder.ts
import { TabSlide as TabSlide2 } from "vexflow/core";

// crisp-tab-slide.ts
import { TabSlide } from "vexflow/core";

class CrispTabSlide extends TabSlide {
  renderTie(params) {
    const ctx = this.checkContext();
    for (const index of this.getNotes().firstIndexes ?? []) {
      const y = params.firstYs[index];
      if (typeof y !== "number" || Number.isNaN(y)) {
        continue;
      }
      const slideY = y + this.renderOptions.yShift;
      ctx.beginPath();
      ctx.moveTo(params.firstX, slideY + 3 * params.direction);
      ctx.lineTo(params.lastX, slideY - 3 * params.direction);
      ctx.stroke();
    }
    this.setRendered();
  }
}

// tab-slide-line.ts
var TAB_LINE_CLEAR_HEIGHT = 6;

class TabSlideLine {
  slide;
  context;
  constructor(slide) {
    this.slide = slide;
  }
  setContext(context) {
    this.context = context;
    this.slide.setContext(context);
    return this;
  }
  draw() {
    const ctx = this.context;
    if (!ctx) {
      return;
    }
    const x = this.slide.getFirstX();
    const width = this.slide.getLastX() - x;
    const ys = this.slide.getFirstYs();
    if (width > 0) {
      for (const index of this.slide.getNotes().firstIndexes ?? []) {
        const y = ys[index];
        if (typeof y === "number") {
          ctx.clearRect(x, y - TAB_LINE_CLEAR_HEIGHT / 2, width, TAB_LINE_CLEAR_HEIGHT);
        }
      }
    }
    this.slide.draw();
  }
}

// slide-builder.ts
class SlideBuilder {
  build(chords, byTabLead, opts) {
    const { showText, scope = WHOLE_SCORE } = opts;
    const slides = [];
    const open = new Map;
    for (const chord of chords) {
      const tabNote = byTabLead.get(chord.lead);
      if (!tabNote) {
        continue;
      }
      const markers = [
        ...chord.lead.slides.map((s) => ({
          number: s.number,
          type: s.slideType
        })),
        ...chord.lead.glissandos.map((g) => ({
          number: g.number,
          type: g.glissandoType
        }))
      ];
      for (const marker of markers) {
        const number = marker.number;
        const fret = chord.lead.fret ?? 0;
        if (marker.type === "start") {
          open.set(number, { note: tabNote, fret, lead: chord.lead });
        } else if (marker.type === "stop") {
          const from = open.get(number);
          open.delete(number);
          if (!from) {
            if (scope.owns(tabNote, tabNote)) {
              slides.push(new SingleSlide(tabNote, 0, "in", SINGLE_SLIDE_GAP));
            }
            continue;
          }
          if (!scope.owns(from.note, tabNote)) {
            continue;
          }
          const notes = {
            firstNote: from.note,
            lastNote: tabNote,
            firstIndexes: from.note.getPositions().map((_, i) => i),
            lastIndexes: tabNote.getPositions().map((_, i) => i)
          };
          const slide = new CrispTabSlide(notes, fret > from.fret ? TabSlide2.SLIDE_UP : TabSlide2.SLIDE_DOWN);
          if (!showText) {
            slide.setText("");
          }
          slides.push(new TabSlideLine(slide));
        }
      }
    }
    for (const { note, lead } of open.values()) {
      if (scope.ownsOpen(lead)) {
        slides.push(new SingleSlide(note, 0, "out", SINGLE_SLIDE_GAP));
      }
    }
    return slides;
  }
}

// slur-bow.ts
import { Curve as Curve2 } from "vexflow/core";
class SlurBow {
  obstacles;
  from;
  to;
  isGrace;
  crossStave;
  mayGhost;
  bulgeUp;
  dir;
  ghost;
  tiedFrom;
  tiedTo;
  useStemTips;
  constructor(obstacles, opts) {
    this.obstacles = obstacles;
    this.from = opts.from;
    this.to = opts.to;
    this.isGrace = opts.isGrace;
    this.crossStave = opts.crossStave;
    this.mayGhost = opts.mayGhost;
    this.bulgeUp = opts.bulgeUp;
    this.dir = opts.bulgeUp ? -1 : 1;
    this.ghost = opts.ghost;
    this.tiedFrom = opts.tiedFrom;
    this.tiedTo = opts.tiedTo;
    this.useStemTips = this.stemTipsAreLevel();
  }
  takeSide(up) {
    this.bulgeUp = up;
    this.dir = up ? -1 : 1;
  }
  ghostOf(n) {
    return this.ghost && n === this.to ? this.from : n;
  }
  towardBulge(note) {
    return note.getStemDirection() === 1 === this.bulgeUp;
  }
  metric(note) {
    return this.useStemTips && this.towardBulge(note) ? Curve2.Position.NEAR_TOP : Curve2.Position.NEAR_HEAD;
  }
  anchorY(note) {
    const bulgeSide = (top, bottom) => this.bulgeUp ? Math.min(top, bottom) : Math.max(top, bottom);
    const { yTop, yBottom } = note.getNoteHeadBounds();
    if (SLUR_GRACE_ANCHOR === "notehead" || !note.hasStem()) {
      return bulgeSide(yTop, yBottom);
    }
    const { topY, baseY } = note.getStemExtents();
    return bulgeSide(topY, baseY);
  }
  extentsOf(n) {
    if (this.isGrace) {
      const y = this.anchorY(this.ghostOf(n));
      return { top: y, bottom: y };
    }
    const extents = this.obstacles.noteExtents(n);
    const marks = this.obstacles.marksOnSide(n, this.bulgeUp);
    return marks ? {
      top: Math.min(extents.top, marks.top),
      bottom: Math.max(extents.bottom, marks.bottom)
    } : extents;
  }
  get baseYShift() {
    return this.isGrace ? SLUR_GRACE_Y_SHIFT : SLUR_Y_SHIFT;
  }
  noteEndY(note) {
    const { topY, baseY } = note.getStemExtents();
    return this.metric(note) === Curve2.Position.NEAR_TOP ? topY : baseY;
  }
  markLift(note) {
    if (this.isGrace || this.crossStave && this.bulgeUp) {
      return 0;
    }
    const marks = this.obstacles.marksOnSide(note, this.bulgeUp);
    if (!marks) {
      return 0;
    }
    const edge = this.bulgeUp ? marks.top : marks.bottom;
    const end = this.noteEndY(note) + this.dir * this.baseYShift;
    return Math.max(0, this.dir * (edge - end) + SLUR_MARK_GAP);
  }
  tieLift(note) {
    const tied = note === this.from ? this.tiedFrom : this.tiedTo;
    if (!tied || this.isGrace || this.ghost || note.getStemDirection() === 0) {
      return 0;
    }
    const tieDir = note.getStemDirection() === 1 ? 1 : -1;
    return tieDir === this.dir ? SLUR_TIE_GAP : 0;
  }
  endpointY(note) {
    if (this.isGrace) {
      return this.anchorY(this.ghostOf(note));
    }
    const end = this.ghostOf(note);
    return this.noteEndY(end) + this.dir * (this.markLift(end) + this.tieLift(end));
  }
  stemTipsAreLevel() {
    const stemAnchorY = (note) => {
      const { topY, baseY } = note.getStemExtents();
      return this.towardBulge(note) ? topY : baseY;
    };
    const headAnchorY = (note) => note.getStemExtents().baseY;
    const relative = (note, y) => y - (note.getStave()?.getY() ?? 0);
    const spread = (anchorY) => Math.abs(relative(this.from, anchorY(this.from)) - relative(this.to, anchorY(this.to)));
    const beamedOnBulgeSide = [this.from, this.to].some((note) => note.hasBeam() && this.towardBulge(note));
    const slantBudget = beamedOnBulgeSide ? Math.abs(this.to.getAbsoluteX() - this.from.getAbsoluteX()) * SLUR_STEM_TIP_SLANT : 0;
    return !this.crossStave && spread(stemAnchorY) <= Math.max(spread(headAnchorY), slantBudget);
  }
}

// head-curve.ts
import {
  GraceNote as GraceNote2
} from "vexflow/core";
class HeadCurve extends CrispCurve {
  fromY;
  toY;
  constructor(opts) {
    super(opts.from, opts.to, opts);
    this.fromY = opts.fromY;
    this.toY = opts.toY;
  }
  draw() {
    this.checkContext();
    this.setRendered();
    const { from, to } = this;
    const stave = (from ?? to)?.checkStave();
    if (!stave) {
      return false;
    }
    this.renderCurve({
      firstX: from ? startX(from) : stave.getTieStartX(),
      lastX: to ? to.getTieLeftX() : stave.getTieEndX(),
      firstY: this.fromY,
      lastY: this.toY,
      direction: this.renderOptions.openingDirection === "down" ? -1 : 1
    });
    return true;
  }
}
function startX(note) {
  if (!(note instanceof GraceNote2)) {
    return note.getTieRightX();
  }
  const left = note.getNoteHeadBeginX();
  return left + (note.getNoteHeadEndX() - left) * GRACE_START;
}

// slur-curve.ts
class SlurCurveFactory {
  appearance;
  constructor(appearance) {
    this.appearance = appearance;
  }
  create(bow, slur, ends) {
    const { from: curveFrom, to: curveTo, openX } = ends;
    const { cpY, yShift, shoulder, width } = ends.shape;
    const only = curveFrom ?? curveTo;
    const position = bow.metric(curveFrom ?? only);
    const positionEnd = bow.metric(curveTo ?? only);
    const y0 = bow.endpointY(curveFrom ?? only);
    const y1 = bow.endpointY(curveTo ?? only);
    const slant = (y1 - y0) * shoulder;
    const pull = (shoulder - 0.25) * width;
    const lean = width ? -bow.dir * (y1 - y0) * cpY / width : 0;
    const middle = this.appearance.lineWidth("slur middle");
    const thickness = middle === null ? CURVE_THICKNESS : curveThickness(middle);
    const options = {
      thickness,
      position,
      positionEnd,
      openingDirection: bow.bulgeUp ? "down" : "up",
      yShift,
      cps: [
        { x: pull + lean, y: cpY + bow.dir * slant },
        { x: -pull + lean, y: cpY - bow.dir * slant }
      ]
    };
    const bezier = slur.bezier && {
      start: curveFrom ? slur.bezier.start : { x: null, y: null },
      end: curveTo ? slur.bezier.end : { x: null, y: null }
    };
    const lifted = [curveFrom, curveTo].some((n) => n !== undefined && (bow.markLift(n) > 0 || bow.tieLift(n) > 0));
    const reachesHead = (note) => !bow.isGrace && !bezier && note !== undefined && !bow.towardBulge(note);
    const reach = {
      start: reachesHead(curveFrom),
      end: reachesHead(curveTo)
    };
    const curve = bow.isGrace || lifted || bow.ghost ? new HeadCurve({
      ...options,
      from: curveFrom,
      to: curveTo,
      fromY: y0,
      toY: y1,
      bezier,
      reach,
      openX
    }) : new CrispCurve(curveFrom, curveTo, {
      ...options,
      bezier,
      reach,
      openX
    });
    curve.setTip(this.appearance.lineWidth("slur tip"));
    const endTop = Math.min(y0, y1) + bow.dir * yShift;
    const endBottom = Math.max(y0, y1) + bow.dir * yShift;
    const apex = (y0 + y1) / 2 + bow.dir * (yShift + 0.75 * cpY + thickness);
    const stave = only.checkStave();
    const firstX = (curveFrom?.getTieRightX() ?? openX ?? stave.getTieStartX()) + curve.renderOptions.xShift;
    const lastX = (curveTo?.getTieLeftX() ?? openX ?? stave.getTieEndX()) - curve.renderOptions.xShift;
    const spacing = (lastX - firstX) / 4;
    const controlXs = bezier ? [
      firstX + (bezier.start.x ?? spacing + pull + lean),
      lastX + (bezier.end.x ?? -spacing - pull + lean)
    ] : [];
    const controlYs = bezier ? [
      y0 + bow.dir * yShift + (bezier.start.y === null ? bow.dir * cpY + slant : -bezier.start.y),
      y1 + bow.dir * yShift + (bezier.end.y === null ? bow.dir * cpY - slant : -bezier.end.y)
    ] : [];
    if (slur.dash) {
      curve.setStyle({ lineDash: slur.dash.join(" ") });
    }
    const curveStave = (curveFrom ?? curveTo)?.getStave();
    return {
      curve,
      stave: curveStave,
      top: Math.min(endTop, apex, ...controlYs.map((y) => y - thickness)),
      bottom: Math.max(endBottom, apex, ...controlYs.map((y) => y + thickness)),
      left: Math.min(curveFrom?.getAbsoluteX() ?? openX ?? curveStave?.getTieStartX() ?? 0, ...controlXs),
      right: Math.max(curveTo?.getAbsoluteX() ?? openX ?? curveStave?.getTieEndX() ?? 0, ...controlXs),
      crossStave: bow.crossStave && !bow.ghost
    };
  }
}

// slur-obstacles.ts
import { Articulation as Articulation2, Modifier as Modifier12 } from "vexflow/core";
var PREFERRED_SIDE_BONUS = 8;

class SlurObstacles {
  cheaperSide(from, to, span, preferUp) {
    const xL = from.getAbsoluteX();
    const width = to.getAbsoluteX() - xL;
    const costOf = (up) => {
      const dir = up ? -1 : 1;
      const headY = (n) => {
        const { yTop, yBottom } = n.getNoteHeadBounds();
        return up ? yTop : yBottom;
      };
      const yL = headY(from);
      const yR = headY(to);
      let cost = 0;
      for (const n of span) {
        if (n === from || n === to) {
          continue;
        }
        const s = width ? (n.getAbsoluteX() - xL) / width : 0.5;
        const extents = this.noteExtents(n);
        const y = up ? extents.top : extents.bottom;
        cost += Math.max(0, dir * (y - (yL + s * (yR - yL))));
      }
      for (const n of [from, to]) {
        if (n.hasStem() && n.getStemDirection() === 1 === up) {
          const { topY, baseY } = n.getStemExtents();
          cost += Math.abs(topY - baseY) / 2;
        }
      }
      return cost - (up === preferUp ? PREFERRED_SIDE_BONUS : 0);
    };
    return costOf(true) <= costOf(false);
  }
  noteExtents(note) {
    const { yTop, yBottom } = note.getNoteHeadBounds();
    let top = yTop;
    let bottom = yBottom;
    if (note.hasStem()) {
      const { topY, baseY } = note.getStemExtents();
      top = Math.min(top, topY, baseY);
      bottom = Math.max(bottom, topY, baseY);
    }
    return { top, bottom };
  }
  marksOnSide(note, above) {
    const side = above ? Modifier12.Position.ABOVE : Modifier12.Position.BELOW;
    let top = Infinity;
    let bottom = -Infinity;
    for (const mod of note.getModifiers()) {
      if (mod instanceof Articulation2 && mod.getPosition() === side) {
        const box = mod.getBoundingBox();
        top = Math.min(top, box.getY());
        bottom = Math.max(bottom, box.getY() + box.getH());
      }
    }
    return top === Infinity ? null : { top, bottom };
  }
  accidentalBoxes(note) {
    return note.getModifiers().filter((mod) => mod.getCategory() === "Accidental").map((mod) => mod.getBoundingBox());
  }
}

// slur-shape.ts
class SlurShape {
  cpY;
  yShift;
  shoulder;
  width;
  blocked;
  constructor(bow, spanNotes, chord) {
    const { xL, xR, yL, yR } = chord;
    const width = Math.abs(xR - xL);
    const bowDepth = Math.min(SLUR_BOW_MAX, SLUR_BOW_MIN + SLUR_BOW_GROWTH * Math.max(0, width - SLUR_BOW_FLAT_WIDTH), width * SLUR_BOW_ASPECT);
    const floor = bow.isGrace ? SLUR_GRACE_CP_Y : bowDepth / 0.75;
    const margin = bow.isGrace ? SLUR_GRACE_MARGIN : SLUR_MARGIN;
    const needAt = (x, y, gap = margin) => {
      const s = width ? (x - xL) / (xR - xL) : 0.5;
      const chordY = yL + bow.dir * bow.baseYShift + s * (yR - yL);
      return { s, need: Math.max(0, bow.dir * (y - chordY) + gap) };
    };
    const clearances = [
      ...clearanceOf(bow, spanNotes).map((n) => {
        const extents = bow.extentsOf(n);
        return needAt(n.getAbsoluteX(), bow.bulgeUp ? extents.top : extents.bottom);
      }),
      ...bow.isGrace ? [] : spanNotes.filter((n) => n !== bow.from).flatMap((n) => bow.obstacles.accidentalBoxes(n)).map((box) => needAt(box.getX() + box.getW() / 2, bow.bulgeUp ? box.getY() : box.getY() + box.getH(), SLUR_ACCIDENTAL_GAP))
    ];
    const inflation = Math.max(0, ...clearances.filter((c) => c.s >= SLUR_END_ZONE && c.s <= 1 - SLUR_END_ZONE).map((c) => c.need / riseFactor(c.s, bow.isGrace ? 0.25 : SLUR_SHOULDER)));
    const reach = width * SLUR_MAX_ASPECT;
    const cpY = Math.max(floor, Math.min(reach, inflation, bow.isGrace ? Infinity : SLUR_MAX_CP_Y));
    const capped = cpY === SLUR_MAX_CP_Y && inflation > cpY;
    const middle = clearances.filter((c) => c.s >= SLUR_END_ZONE && c.s <= 1 - SLUR_END_ZONE);
    let shoulder = bow.isGrace ? 0.25 : SLUR_SHOULDER;
    while (capped && shoulder > SLUR_MIN_SHOULDER && middle.some((c) => c.need > riseFactor(c.s, shoulder) * cpY)) {
      shoulder = Math.max(SLUR_MIN_SHOULDER, shoulder - 0.01);
    }
    const shortfall = Math.max(0, ...clearances.map((c) => c.need - riseFactor(c.s, shoulder) * cpY));
    const yShift = bow.baseYShift + Math.min(shortfall, Math.max(0, reach - 0.75 * cpY));
    const blocked = clearances.some((c) => c.need - riseFactor(c.s, shoulder) * cpY - (yShift - bow.baseYShift) > SLUR_GHOST_OVERLAP);
    this.cpY = cpY;
    this.yShift = yShift;
    this.shoulder = shoulder;
    this.width = width;
    this.blocked = blocked;
  }
}
function clearanceOf(bow, spanNotes) {
  if (bow.crossStave && bow.bulgeUp && !bow.mayGhost) {
    return [];
  }
  if (bow.isGrace) {
    return spanNotes;
  }
  return spanNotes.filter((n) => n !== bow.from && n !== bow.to);
}
function riseFactor(s, shoulder = SLUR_SHOULDER) {
  const xAt = (t) => 3 * t * (1 - t) * ((1 - t) * shoulder + t * (1 - shoulder)) + t ** 3;
  let lo = 0;
  let hi = 1;
  for (let i = 0;i < 30; i++) {
    const mid = (lo + hi) / 2;
    if (xAt(mid) < s) {
      lo = mid;
    } else {
      hi = mid;
    }
  }
  const t = (lo + hi) / 2;
  return 3 * t * (1 - t);
}

// slur-builder.ts
class SlurBuilder {
  connectors;
  obstacles = new SlurObstacles;
  curves;
  constructor(connectors, appearance) {
    this.connectors = connectors;
    this.curves = new SlurCurveFactory(appearance);
  }
  build(chords, byLead, scope = WHOLE_SCORE) {
    if (!chords.some((c) => c.notes.some((n) => {
      const { slurs, techniques } = this.connectors.connectorsOf(n);
      return slurs.length > 0 || techniques.length > 0;
    }))) {
      return [];
    }
    const slurs = [];
    const spans = this.connectors.slurSpans(chords);
    const indexOf = new Map(chords.map((chord, i) => [chord.lead, i]));
    const leadOf = new Map(chords.flatMap((chord) => chord.notes.map((note) => [note, chord.lead])));
    const tiedLeads = new Set;
    for (const chord of chords) {
      for (const note of chord.notes) {
        for (const tie of this.connectors.tiesOf(note)) {
          tiedLeads.add(chord.lead);
          if (tie.partner) {
            tiedLeads.add(leadOf.get(tie.partner) ?? tie.partner);
          }
        }
      }
    }
    const voiceOf = new Map;
    for (const chord of chords) {
      const note = byLead.get(chord.lead);
      if (note) {
        voiceOf.set(note, `${chord.lead.staff}/${chord.lead.voice}`);
      }
    }
    let notesByRow;
    const onRow = (stave) => {
      if (!notesByRow) {
        const index = new Map;
        notesByRow = index;
        chords.forEach((chord, chordIndex) => {
          const note = byLead.get(chord.lead);
          const row = note?.getStave()?.getY();
          if (note && row !== undefined) {
            const notes = index.get(row);
            if (notes) {
              notes.push({ note, index: chordIndex });
            } else {
              index.set(row, [{ note, index: chordIndex }]);
            }
          }
        });
      }
      return notesByRow.get(stave.getY()) ?? [];
    };
    chords.forEach((chord, i) => {
      const from = byLead.get(chord.lead);
      const isGrace = chord.lead.isGrace;
      const connectors = [
        ...this.connectors.slurConnectors(chord.lead, spans),
        ...chord.notes.filter((note) => note !== chord.lead).flatMap((note) => this.connectors.connectorsOf(note).slurs)
      ];
      const reached = new Set;
      for (const slur of connectors) {
        if (slur.slurType !== "start" || !slur.partner || !from) {
          continue;
        }
        const partner = leadOf.get(slur.partner.note) ?? slur.partner.note;
        const to = byLead.get(partner);
        if (!to || reached.has(partner) || !scope.owns(from, to)) {
          continue;
        }
        reached.add(partner);
        const j = indexOf.get(partner) ?? -1;
        let span = j > i ? chords.slice(i, j + 1).map((c) => byLead.get(c.lead)).filter((n) => n !== undefined).filter((n) => n.getStave() === from.getStave() || n.getStave() === to.getStave()) : [from, to];
        const fromStave = from.getStave();
        const toStave = to.getStave();
        const crossStave = !!fromStave && !!toStave && toStave.getY() < fromStave.getY();
        const sameRow = !!fromStave && !!toStave && toStave.getY() === fromStave.getY();
        if ((crossStave || sameRow && !isGrace) && fromStave && toStave) {
          const left = from.getAbsoluteX();
          const right = to.getAbsoluteX();
          const sliced = new Set(span);
          const candidates = crossStave ? [...onRow(fromStave), ...onRow(toStave)].sort((a, b) => a.index - b.index) : onRow(fromStave);
          span = candidates.filter(({ note: n }) => n.getAbsoluteX() >= left && n.getAbsoluteX() <= right && (crossStave || sliced.has(n) || !n.isRest())).map(({ note }) => note);
        }
        const restedOver = sameRow && !isGrace && onRow(fromStave).some(({ note: n }) => n.isRest() && voiceOf.get(n) !== voiceOf.get(from) && n.getAbsoluteX() >= from.getAbsoluteX() && n.getAbsoluteX() <= to.getAbsoluteX());
        let bulgeUp;
        const sideIsFree = !isGrace && !crossStave && !slur.placement && !restedOver && from.getStemDirection() === to.getStemDirection() && span.every((n) => voiceOf.get(n) === undefined || voiceOf.get(n) === voiceOf.get(from));
        if (isGrace) {
          bulgeUp = crossStave && slur.placement === "above";
        } else if (crossStave) {
          bulgeUp = from.getStemDirection() !== 1;
        } else if (slur.placement === "above") {
          bulgeUp = true;
        } else if (slur.placement === "below") {
          bulgeUp = false;
        } else if ((from.getStemDirection() === to.getStemDirection() || voiceOf.get(from) !== voiceOf.get(to)) && (restedOver || span.some((n) => !n.isRest() && voiceOf.get(n) !== undefined && voiceOf.get(n) !== voiceOf.get(from)))) {
          bulgeUp = from.getStemDirection() === 1;
        } else {
          bulgeUp = from.getStemDirection() !== to.getStemDirection() || from.getStemDirection() !== 1;
        }
        if (sideIsFree) {
          bulgeUp = this.obstacles.cheaperSide(from, to, span, bulgeUp);
        }
        const voicesBetween = span.filter((n) => n !== from && n !== to && (voiceOf.get(n) === voiceOf.get(from) || voiceOf.get(n) === voiceOf.get(to))).length;
        const mayGhost = crossStave && !from.hasBeam() && !to.hasBeam() && !slur.bezier && voicesBetween <= SLUR_GHOST_MAX_BETWEEN;
        const ghost = mayGhost && Math.abs(to.getAbsoluteX() - from.getAbsoluteX()) < Math.abs(from.getStemExtents().baseY - to.getStemExtents().baseY) * SLUR_GHOST_STEEPNESS;
        if (ghost && !(isGrace && slur.placement)) {
          bulgeUp = false;
        }
        const bow = new SlurBow(this.obstacles, {
          from,
          to,
          isGrace,
          crossStave,
          mayGhost,
          bulgeUp,
          ghost,
          tiedFrom: tiedLeads.has(chord.lead),
          tiedTo: tiedLeads.has(partner)
        });
        if (toStave && fromStave && toStave.getY() > fromStave.getY()) {
          const fromY = bow.endpointY(from);
          const toY = bow.endpointY(to);
          const fromRow = onRow(fromStave).flatMap(({ note }) => {
            const stave = note.getStave();
            return stave ? [stave] : [];
          });
          const toRow = onRow(toStave).flatMap(({ note }) => {
            const stave = note.getStave();
            return stave ? [stave] : [];
          });
          const rowEndX = Math.max(fromStave.getTieEndX(), ...fromRow.map((stave) => stave.getTieEndX()));
          const rowStartX = Math.min(toStave.getTieStartX(), ...toRow.map((stave) => stave.getTieStartX()));
          slurs.push(this.curves.create(bow, slur, {
            from,
            to: undefined,
            openX: rowEndX,
            shape: new SlurShape(bow, span.filter((n) => n.getStave() === fromStave), { xL: from.getAbsoluteX(), xR: rowEndX, yL: fromY, yR: fromY })
          }), this.curves.create(bow, slur, {
            from: undefined,
            to,
            openX: rowStartX,
            shape: new SlurShape(bow, span.filter((n) => n.getStave() === toStave), { xL: rowStartX, xR: to.getAbsoluteX(), yL: toY, yR: toY })
          }));
          continue;
        }
        const solve = () => new SlurShape(bow, bow.ghost ? span.filter((n) => n.getStave()?.getY() === fromStave?.getY()) : span, {
          xL: from.getAbsoluteX(),
          xR: to.getAbsoluteX(),
          yL: bow.endpointY(from),
          yR: bow.endpointY(to)
        });
        let shape = solve();
        if (mayGhost && !bow.ghost && !isGrace && shape.blocked) {
          bow.takeSide(!bow.bulgeUp);
          shape = solve();
          if (shape.blocked) {
            bow.ghost = true;
            bow.takeSide(false);
            shape = solve();
          }
        }
        if (bow.ghost && shape.blocked) {
          continue;
        }
        slurs.push(this.curves.create(bow, slur, {
          from,
          to,
          openX: undefined,
          shape
        }));
      }
    });
    return slurs;
  }
}

// tie-builder.ts
class TieBuilder {
  connectors;
  appearance;
  constructor(connectors, appearance) {
    this.connectors = connectors;
    this.appearance = appearance;
  }
  build(chords, byLead, scope = WHOLE_SCORE) {
    if (!chords.some((c) => c.notes.some((n) => this.connectors.tiesOf(n).length > 0))) {
      return [];
    }
    const placement = new Map;
    const chordOf = new Map;
    for (const chord of chords) {
      const staveNote = byLead.get(chord.lead);
      if (staveNote) {
        chord.notes.forEach((note, index) => {
          placement.set(note, { staveNote, index });
          chordOf.set(note, chord);
        });
      }
    }
    let voicesByRow;
    const otherVoiceUnder = (chord, first, last) => {
      const row = first.getStave()?.getY();
      if (row === undefined || last.getStave()?.getY() !== row) {
        return false;
      }
      if (!voicesByRow) {
        const index = new Map;
        voicesByRow = index;
        for (const c of chords) {
          const note = byLead.get(c.lead);
          const y = note?.getStave()?.getY();
          if (note && y !== undefined && !note.isRest()) {
            const entry = { note, voice: `${c.lead.staff}/${c.lead.voice}` };
            const notes = index.get(y);
            if (notes) {
              notes.push(entry);
            } else {
              index.set(y, [entry]);
            }
          }
        }
      }
      const voice = `${chord.lead.staff}/${chord.lead.voice}`;
      const left = first.getAbsoluteX();
      const right = last.getAbsoluteX();
      return (voicesByRow.get(row) ?? []).some(({ note, voice: other }) => other !== voice && note.getAbsoluteX() > left && note.getAbsoluteX() < right);
    };
    const ties = [];
    for (const chord of chords) {
      const heads = chord.notes.length;
      for (const note of chord.notes) {
        const from = placement.get(note);
        if (!from) {
          continue;
        }
        for (const tie of this.connectors.tiesOf(note)) {
          const partnerNote = (tie.partner && this.samePitchMember(note, chordOf.get(tie.partner))) ?? tie.partner;
          const to = partnerNote && placement.get(partnerNote);
          if (!to || !scope.owns(from.staveNote, to.staveNote)) {
            continue;
          }
          let direction = null;
          if (heads > 1) {
            const middle = (heads - 1) / 2;
            if (from.index === middle) {
              direction = from.staveNote.getStemDirection() === 1 ? 1 : -1;
            } else {
              direction = from.index > middle ? -1 : 1;
            }
          } else if (otherVoiceUnder(chord, from.staveNote, to.staveNote)) {
            direction = from.staveNote.getStemDirection() === 1 ? -1 : 1;
          }
          if (tie.orientation === "over") {
            direction = -1;
          } else if (tie.orientation === "under") {
            direction = 1;
          }
          const specs = tieSpecs(from.staveNote, to.staveNote, [from.index], [to.index]);
          for (const spec of specs) {
            const staveTie = new DashedTie(spec, {
              dash: tie.dash,
              tip: this.appearance.lineWidth("tie tip"),
              fit: this.appearance.lineWidth("tie tip") === null && this.appearance.lineWidth("tie middle") === null,
              bezier: tie.bezier && {
                start: spec.firstNote ? tie.bezier.start : { x: null, y: null },
                end: spec.lastNote ? tie.bezier.end : { x: null, y: null }
              }
            });
            const middle = this.appearance.lineWidth("tie middle");
            if (middle !== null) {
              const options = staveTie.renderOptions;
              options.cp1 = options.cp2 - 2 * middle;
              options.cp1Short = options.cp2Short - 2 * middle;
            }
            if (direction !== null) {
              staveTie.setDirection(direction);
            }
            ties.push(staveTie);
          }
        }
      }
    }
    return ties;
  }
  samePitchMember(note, chord) {
    const p = note.pitch;
    if (!chord || !p) {
      return null;
    }
    return chord.notes.find((n) => n.pitch?.step === p.step && n.pitch?.octave === p.octave && n.pitch?.alter === p.alter) ?? null;
  }
}

// bowed-tremolo.ts
import { Element as Element8 } from "vexflow/core";

class BowedTremolo extends Element8 {
  from;
  to;
  marks;
  constructor(from, to, marks) {
    super();
    this.from = from;
    this.to = to;
    this.marks = marks;
  }
  draw() {
    const ctx = this.checkContext();
    ctx.openGroup("vexml-beam");
    try {
      this.setRendered();
      if (this.from.getStave() !== this.to.getStave()) {
        return;
      }
      const x1 = this.from.getStemX();
      const x2 = this.to.getStemX();
      if (!(x2 > x1) || !this.from.hasStem() || !this.to.hasStem()) {
        return;
      }
      const a = this.from.getStemExtents();
      const b = this.to.getStemExtents();
      const y1 = (a.topY + a.baseY) / 2;
      const y2 = (b.topY + b.baseY) / 2;
      const slope = (y2 - y1) / (x2 - x1);
      const width = Math.min((x2 - x1) * 0.5, 14);
      const left = (x1 + x2) / 2 - width / 2;
      const right = left + width;
      const midY = (y1 + y2) / 2;
      const thickness = 4;
      const pitch = thickness * 1.8;
      const rise = width * 0.25;
      const top = midY - (this.marks - 1) * pitch / 2;
      for (let i = 0;i < this.marks; i++) {
        const y = top + i * pitch;
        const yAt = (x) => y + slope * (x - (x1 + x2) / 2);
        ctx.beginPath();
        ctx.moveTo(left, yAt(left) + rise / 2);
        ctx.lineTo(left, yAt(left) + rise / 2 + thickness);
        ctx.lineTo(right, yAt(right) - rise / 2 + thickness);
        ctx.lineTo(right, yAt(right) - rise / 2);
        ctx.closePath();
        ctx.fill();
      }
    } finally {
      ctx.closeGroup();
    }
  }
}

// tremolo-builder.ts
class TremoloBuilder {
  reader;
  constructor(reader) {
    this.reader = reader;
  }
  build(chords, byLead) {
    const out = [];
    let open;
    for (const { lead } of chords) {
      const staveNote = byLead.get(lead);
      const tremolo = this.reader.ornamentsOf(lead).find((o) => o.ornamentType === "tremolo");
      if (!staveNote || !tremolo) {
        continue;
      }
      if (tremolo.tremoloType === "start") {
        open = { note: staveNote, marks: tremolo.tremoloMarks || 1 };
      } else if (tremolo.tremoloType === "stop" && open) {
        out.push(new BowedTremolo(open.note, staveNote, open.marks));
        open = undefined;
      }
    }
    return out;
  }
}

// tuplet-builder.ts
import { Stem as Stem9, Tuplet as Tuplet2 } from "vexflow/core";

// display-tuplet.ts
import { Tuplet } from "vexflow/core";
var NOTE_GLYPHS2 = {
  breve: "",
  whole: "",
  half: "",
  quarter: "",
  eighth: "",
  "16th": "",
  "32nd": "",
  "64th": "",
  "128th": ""
};
var DOT_GLYPH2 = "";
var COLON_GLYPH = "";
var DIGIT_BASE = 59520;
var LEG = 10;
var TEXT_GAP = 5;

class DisplayTuplet extends Tuplet {
  curved;
  bracketWidth;
  constructor(notes, opts = {}) {
    const {
      showNumber,
      showType,
      actualValue,
      normalValue,
      curved,
      bracketWidth,
      ...rest
    } = opts;
    super(notes, rest);
    this.curved = curved ?? false;
    this.bracketWidth = bracketWidth ?? null;
    const ratioed = this.options.ratioed;
    const side = (number, value, type) => (showNumber === "none" ? "" : digits(number)) + (type && value ? glyphs(value) : "");
    const typeActual = showType === "actual" || showType === "both";
    const typeNormal = showType === "both";
    if (showNumber === "none" || typeActual) {
      const actual = side(this.options.numNotes, actualValue ?? null, typeActual);
      const normal = side(this.options.notesOccupied, normalValue ?? null, typeNormal);
      const showNormal = ratioed && showNumber !== "none" || typeNormal && normal !== "";
      this.textElement.setText(actual + (showNormal ? COLON_GLYPH + normal : ""));
    }
  }
  draw() {
    if (!this.curved && this.bracketWidth === null && this.textElement.getText() !== "") {
      super.draw();
      return;
    }
    const { location, bracketed, textYOffset } = this.options;
    const ctx = this.checkContext();
    const first = this.notes[0];
    const last = this.notes[this.notes.length - 1];
    if (!first || !last) {
      return;
    }
    let xPos;
    if (bracketed) {
      xPos = first.getTieLeftX() - 5;
      this.width = last.getTieRightX() - xPos + 5;
    } else {
      xPos = stemX(first);
      this.width = stemX(last) - xPos;
    }
    const yPos = this.getYPosition();
    const textWidth = this.textElement.getWidth();
    const center = xPos + this.width / 2;
    ctx.openGroup("tuplet", this.getAttribute("id"));
    if (bracketed) {
      const half = textWidth === 0 ? 0 : textWidth / 2 + TEXT_GAP;
      const run = this.width / 2 - half;
      if (run > 0) {
        if (this.curved) {
          this.arc(xPos, center - half, yPos, location);
          this.arc(xPos + this.width, center + half, yPos, location);
        } else {
          const width = this.bracketWidth ?? 1;
          if (half === 0) {
            ctx.fillRect(xPos, yPos, this.width, width);
          } else {
            ctx.fillRect(xPos, yPos, run, width);
            ctx.fillRect(center + half, yPos, run, width);
          }
          const legY = yPos + (location === Tuplet.LOCATION_BOTTOM ? width : 0);
          ctx.fillRect(xPos, legY, width, location * LEG);
          ctx.fillRect(xPos + this.width, legY, width, location * LEG);
        }
      }
    }
    if (textWidth > 0) {
      this.textElement.renderText(ctx, center - textWidth / 2, yPos + this.textElement.getHeight() / 2 + (location === Tuplet.LOCATION_TOP ? -1 : 1) * textYOffset);
    }
    ctx.closeGroup();
    this.setRendered();
  }
  arc(fromX, toX, yPos, location) {
    const ctx = this.checkContext();
    const startY = yPos + location * LEG;
    const inward = toX > fromX ? 1 : -1;
    ctx.beginPath();
    ctx.moveTo(fromX, startY);
    ctx.quadraticCurveTo(fromX, yPos, toX, yPos);
    ctx.lineTo(toX, yPos + location);
    ctx.quadraticCurveTo(fromX + inward, yPos + location, fromX + inward, startY);
    ctx.closePath();
    ctx.fill();
  }
}
function digits(n) {
  let out = "";
  for (let rest = n;rest >= 1; rest = Math.floor(rest / 10)) {
    out = String.fromCharCode(DIGIT_BASE + rest % 10) + out;
  }
  return out;
}
function glyphs(value) {
  const note = NOTE_GLYPHS2[value.type];
  return note ? note + DOT_GLYPH2.repeat(value.dots) : "";
}
function stemX(note) {
  return note.getStemX?.() ?? note.getAbsoluteX();
}

// tuplet-builder.ts
class TupletBuilder {
  reader;
  appearance;
  constructor(reader, appearance) {
    this.reader = reader;
    this.appearance = appearance;
  }
  build(chords, byLead) {
    const tuplets = [];
    const open = new Map;
    chords.forEach((chord, i) => {
      for (const tuplet of chord.lead.tuplets) {
        const number = tuplet.number;
        if (tuplet.tupletType === "start") {
          const depth = open.size;
          for (const enclosing of open.values()) {
            enclosing.maxDepth = Math.max(enclosing.maxDepth, depth);
          }
          open.set(number, {
            start: i,
            depth,
            maxDepth: depth,
            placement: tuplet.placement,
            display: this.tupletDisplay(tuplet),
            lead: chord.lead
          });
          continue;
        }
        const opened = tuplet.tupletType === "stop" && open.get(number);
        if (!opened) {
          continue;
        }
        open.delete(number);
        const { start, depth, maxDepth, placement, display, lead } = opened;
        const group = chords.slice(start, i + 1).map((c) => byLead.get(c.lead)).filter((n) => n !== undefined);
        if (group.length > 1) {
          const ratio = chords[start]?.lead.timeModification;
          const numNotes = display?.numNotes ?? ratio?.actual;
          const notesOccupied = display?.notesOccupied ?? ratio?.normal;
          const stemmed = group.find((n) => !n.isRest()) ?? group[0];
          const isBelow = placement === "below" || placement !== "above" && stemmed?.getStemDirection() === Stem9.DOWN;
          const location = isBelow ? Tuplet2.LOCATION_BOTTOM : Tuplet2.LOCATION_TOP;
          tuplets.push(new DisplayTuplet(group, {
            location,
            showNumber: display?.showNumber ?? null,
            showType: display?.showType ?? null,
            actualValue: display?.actualValue ?? tupletNoteValue(lead, this.reader),
            normalValue: display?.normalValue ?? rawNormalValue(lead, this.reader),
            curved: display?.curved ?? false,
            bracketWidth: this.appearance.lineWidth("tuplet bracket"),
            yOffset: (maxDepth - depth) * TUPLET_NESTING_EXTRA_GAP * -location,
            ratioed: display?.ratioed ?? false,
            ...display?.bracketed != null && {
              bracketed: display.bracketed
            },
            ...numNotes != null && notesOccupied != null && { numNotes, notesOccupied }
          }));
        }
      }
    });
    return tuplets;
  }
  tupletDisplay(marker) {
    return {
      numNotes: marker.actual?.number ?? null,
      notesOccupied: marker.normal?.number ?? null,
      ratioed: marker.showNumber === "both",
      bracketed: marker.bracket,
      showNumber: marker.showNumber,
      showType: marker.showType,
      actualValue: displayValue(marker.actual),
      normalValue: displayValue(marker.normal),
      curved: marker.getAttribute("line-shape") === "curved"
    };
  }
}
function displayValue(side) {
  return side?.type ? { type: side.type, dots: side.dots } : null;
}
function tupletNoteValue(note, reader) {
  return note.type ? { type: note.type, dots: reader.dotsOf(note) } : null;
}
function rawNormalValue(note, reader) {
  const modification = note.child("time-modification");
  const type = modification?.child("normal-type")?.text?.trim();
  if (!type) {
    return tupletNoteValue(note, reader);
  }
  return { type, dots: modification?.childrenNamed("normal-dot").length ?? 0 };
}

// wavy-line-builder.ts
import { VibratoBracket } from "vexflow/core";
class WavyLineBuilder {
  build(chords, byLead, scope = WHOLE_SCORE) {
    if (!chords.some((c) => c.lead.wavyLines.length > 0)) {
      return [];
    }
    const brackets = [];
    const open = new Map;
    for (const chord of chords) {
      const staveNote = byLead.get(chord.lead);
      if (!staveNote) {
        continue;
      }
      for (const wavy of chord.lead.wavyLines) {
        if (wavy.wavyLineType === "start") {
          open.set(wavy.number, staveNote);
          continue;
        }
        if (wavy.wavyLineType !== "stop") {
          continue;
        }
        const from = open.get(wavy.number);
        open.delete(wavy.number);
        if (from && from !== staveNote && scope.owns(from, staveNote)) {
          brackets.push(new VibratoBracket({ start: from, stop: staveNote }));
        }
      }
    }
    return brackets;
  }
}

// hairpin.ts
var DEFAULT_SPREAD = 15;

class Hairpin {
  from;
  to;
  context;
  dash;
  niente;
  crescendo;
  placement;
  spread;
  runsOff;
  edgeX;
  constructor(from, to, opts) {
    this.from = from;
    this.to = to;
    this.crescendo = opts.crescendo;
    this.placement = opts.placement;
    this.dash = opts.dash ?? null;
    this.niente = opts.niente ?? false;
    this.spread = opts.spread ?? null;
    this.runsOff = opts.runsOff ?? null;
    this.edgeX = opts.edgeX ?? null;
  }
  offset = 0;
  startInset = 0;
  endInset = 0;
  lineWidth = null;
  setContext(context) {
    this.context = context;
    return this;
  }
  setOffset(offset) {
    this.offset = offset;
    return this;
  }
  getOffset() {
    return this.offset;
  }
  setHorizontalInsets(start, end) {
    this.startInset = start;
    this.endInset = end;
    return this;
  }
  setLineWidth(lineWidth) {
    this.lineWidth = lineWidth;
    return this;
  }
  get stave() {
    return this.from.checkStave();
  }
  get above() {
    return this.placement === "above";
  }
  get opens() {
    return this.crescendo;
  }
  span() {
    const stave = this.stave;
    const x1 = this.runsOff === "left" ? this.edgeX ?? stave.getNoteStartX() : this.from.getAbsoluteX();
    const x2 = this.runsOff === "right" ? this.edgeX ?? stave.getX() + stave.getWidth() : this.to.getAbsoluteX();
    return [x1 + this.startInset, x2 - this.endInset];
  }
  get bounds() {
    const stave = this.stave;
    const center = this.placement === "above" ? stave.getYForLine(0) - HAIRPIN_STAVE_GAP - HAIRPIN_HEIGHT / 2 - this.offset : stave.getBottomLineY() + HAIRPIN_STAVE_GAP + HAIRPIN_HEIGHT / 2 + this.offset;
    const height = this.spread === null ? HAIRPIN_HEIGHT : this.spread / DEFAULT_SPREAD * HAIRPIN_HEIGHT;
    return { top: center - height / 2, bottom: center + height / 2 };
  }
  get rect() {
    const { top, bottom } = this.bounds;
    const [x1, x2] = this.span();
    return new Rect2(Math.min(x1, x2), top, Math.abs(x2 - x1), bottom - top);
  }
  draw() {
    const ctx = this.context;
    if (!ctx) {
      return;
    }
    const { top, bottom } = this.bounds;
    const mid = (top + bottom) / 2;
    const [x1, x2] = this.span();
    const [pointX, mouthX] = this.crescendo ? [x1, x2] : [x2, x1];
    const radius = this.niente ? HAIRPIN_NIENTE_RADIUS : 0;
    const run = Math.abs(mouthX - pointX);
    const circleX = pointX + (mouthX > pointX ? radius : -radius);
    const armY = (y) => mid + (y - mid) * (run ? radius / run : 0);
    ctx.save();
    if (this.lineWidth !== null) {
      ctx.setLineWidth(this.lineWidth);
    }
    if (this.dash) {
      ctx.setLineDash(this.dash);
    }
    ctx.beginPath();
    ctx.moveTo(mouthX, top);
    ctx.lineTo(circleX, armY(top));
    if (radius) {
      ctx.moveTo(circleX, armY(bottom));
    }
    ctx.lineTo(mouthX, bottom);
    ctx.stroke();
    ctx.restore();
    if (radius) {
      ctx.save();
      if (this.lineWidth !== null) {
        ctx.setLineWidth(this.lineWidth);
      }
      ctx.beginPath();
      ctx.arc(circleX, mid, radius, 0, Math.PI * 2, false);
      ctx.stroke();
      ctx.restore();
    }
  }
}

// wedge-builder.ts
var HAIRPIN_BARLINE_GAP = 4;

class WedgeBuilder {
  appearance;
  constructor(appearance) {
    this.appearance = appearance;
  }
  build(markers, byLead, {
    scope = WHOLE_SCORE,
    wraps = (from, to) => (to.getStave()?.getY() ?? 0) > (from.getStave()?.getY() ?? 0)
  } = {}) {
    const wedges = [];
    const open = new Map;
    for (const marker of markers) {
      if (marker.type === "start") {
        open.set(marker.number, marker);
        continue;
      }
      const from = open.get(marker.number);
      open.delete(marker.number);
      const firstNote = from && byLead.get(from.lead);
      const lastNote = byLead.get(marker.lead);
      if (!from || !firstNote || !lastNote || firstNote === lastNote && !marker.trailing || !scope.owns(firstNote, lastNote)) {
        continue;
      }
      const spreads = [from.spread, marker.spread].filter((spread) => spread !== null);
      const opts = {
        crescendo: from.crescendo,
        placement: from.placement,
        dash: from.dash ?? marker.dash,
        niente: from.niente || marker.niente,
        spread: spreads.length > 0 ? Math.max(...spreads) : null
      };
      const rowStaves = (note) => {
        const y = note.getStave()?.getY();
        return [...byLead.values()].flatMap((other) => {
          const stave = other.getStave();
          return stave && stave.getY() === y ? [stave] : [];
        });
      };
      const rowEnd = Math.max(...rowStaves(firstNote).map((s) => s.getX() + s.getWidth()));
      const rowStart = Math.min(...rowStaves(lastNote).map((s) => s.getNoteStartX()));
      const wrapped = firstNote === lastNote || wraps(firstNote, lastNote);
      const halves = wrapped ? [
        new Hairpin(firstNote, firstNote, {
          ...opts,
          runsOff: "right",
          edgeX: firstNote === lastNote ? firstNote.checkStave().getNoteEndX() - HAIRPIN_BARLINE_GAP : rowEnd
        }),
        ...firstNote === lastNote ? [] : [
          new Hairpin(lastNote, lastNote, {
            ...opts,
            runsOff: "left",
            edgeX: rowStart
          })
        ]
      ] : [new Hairpin(firstNote, lastNote, opts)];
      for (const half of halves) {
        wedges.push(half.setLineWidth(this.appearance.lineWidth("wedge")));
      }
    }
    return wedges;
  }
}

// spanner-builder.ts
class SpannerBuilder {
  reader;
  connectors;
  appearance = Appearance.NONE;
  constructor(reader) {
    this.reader = reader;
    this.connectors = new CurveConnectors(reader);
  }
  useDocumentCurves(enabled) {
    this.connectors.useDocumentCurves(enabled);
  }
  useAppearance(appearance) {
    this.appearance = appearance;
  }
  buildTremolos(chords, byLead) {
    return new TremoloBuilder(this.reader).build(chords, byLead);
  }
  buildBeams(groups, byLead, opts = {}) {
    return new BeamBuilder(this.reader, this.appearance).build(groups, byLead, opts);
  }
  buildTuplets(chords, byLead) {
    return new TupletBuilder(this.reader, this.appearance).build(chords, byLead);
  }
  buildTies(chords, byLead, scope = WHOLE_SCORE) {
    return new TieBuilder(this.connectors, this.appearance).build(chords, byLead, scope);
  }
  buildHammerPulls(chords, byTabLead, scope = WHOLE_SCORE) {
    return new HammerPullBuilder(this.connectors).build(chords, byTabLead, scope);
  }
  buildSlides(chords, byTabLead, opts) {
    return new SlideBuilder().build(chords, byTabLead, opts);
  }
  buildGlissandos(chords, byLead, scope = WHOLE_SCORE) {
    return new GlissandoBuilder().build(chords, byLead, scope);
  }
  buildWedges(markers, byLead, opts = {}) {
    return new WedgeBuilder(this.appearance).build(markers, byLead, opts);
  }
  buildWavyLines(chords, byLead, scope = WHOLE_SCORE) {
    return new WavyLineBuilder().build(chords, byLead, scope);
  }
  buildPedals(markers, byLead, chords, opts = {}) {
    return new PedalBuilder(this.appearance).build(markers, byLead, chords, opts);
  }
  buildSlurs(chords, byLead, scope = WHOLE_SCORE) {
    return new SlurBuilder(this.connectors, this.appearance).build(chords, byLead, scope);
  }
  reach(note) {
    return this.connectors.reach(note);
  }
}

// spill-resolver.ts
class SpillResolver {
  revise(planned, report, systemCount, plannedBySystem, fixedBySystem) {
    const plannedOf = (system) => plannedBySystem?.get(system) ?? planned;
    const systemStaveOffsets = this.spacedOffsets(planned, report.observedStaveSpill, { plannedBySystem, fixedBySystem });
    const respace = [...systemStaveOffsets].some(([system, offsets]) => offsets.some((o, i) => o !== plannedOf(system)[i]));
    const needsOverflow = systemCount > 1 && [...report.observedOverflow.values()].some((v) => v > 0);
    const needsLyricPin = report.lyricsStepped;
    const needsVoltaLift = report.voltasLifted;
    const needsHairpinRoom = report.hairpinsStacked;
    const grewBy = Math.max(0, ...[...systemStaveOffsets].map(([system, offsets]) => (offsets.at(-1) ?? 0) - (plannedOf(system).at(-1) ?? 0)));
    return {
      systemStaveOffsets,
      needed: respace || needsOverflow || needsLyricPin || needsVoltaLift || needsHairpinRoom,
      grewBy
    };
  }
  spacedOffsets(planned, spillBySystem, opts = {}) {
    const { plannedBySystem, fixedBySystem } = opts;
    const bySystem = new Map;
    for (const [system, spill] of spillBySystem) {
      bySystem.set(system, this.systemOffsets(plannedBySystem?.get(system) ?? planned, spill, fixedBySystem?.get(system)));
    }
    return bySystem;
  }
  systemOffsets(planned, spill, fixed) {
    const resolved = new Map;
    const plannedGaps = [];
    for (let i = 1;i < planned.length; i++) {
      const above = spill.get(i - 1);
      const below = spill.get(i);
      const plannedGap = (planned[i] ?? 0) - (planned[i - 1] ?? 0);
      if (fixed?.[i]) {
        plannedGaps.push(null);
        continue;
      }
      const needed = above && below ? above.lineBottom + this.worstColumn(above.drop, below.rise) + STAVE_CLEARANCE - below.lineTop : plannedGap;
      plannedGaps.push(plannedGap);
      resolved.set(plannedGap, Math.max(resolved.get(plannedGap) ?? plannedGap, needed));
    }
    const offsets = [planned[0] ?? 0];
    plannedGaps.forEach((plannedGap, g) => {
      const gap = plannedGap === null ? (planned[g + 1] ?? 0) - (planned[g] ?? 0) : resolved.get(plannedGap) ?? plannedGap;
      offsets.push((offsets.at(-1) ?? 0) + gap);
    });
    return offsets;
  }
  worstColumn(drop, rise) {
    let worst = 0;
    for (const [column, px] of drop) {
      worst = Math.max(worst, px + (rise.get(column) ?? 0));
    }
    for (const [column, px] of rise) {
      worst = Math.max(worst, px + (drop.get(column) ?? 0));
    }
    return worst;
  }
}

// tab-voice-translator.ts
import {
  Annotation as Annotation4,
  Element as Element10,
  GhostNote as GhostNote4,
  GraceNoteGroup as GraceNoteGroup4,
  GraceTabNote,
  Stem as Stem10,
  TabNote as TabNote2,
  Vibrato as Vibrato2
} from "vexflow/core";

// tab-bend.ts
import { Bend as Bend2, Element as Element9, Modifier as Modifier13 } from "vexflow/core";
var BAR_GLYPHS = {
  scoop: "",
  dip: ""
};
var BAR_TEXT = "w/bar";
var PRE_BEND_GAP = 8;
var BAR_GLYPH_SIZE = 20;
var ARROW_HALF_WIDTH = 4;

class TabBend extends Bend2 {
  mark;
  glyph;
  down;
  constructor(label, mark) {
    const code = mark.bar === null ? undefined : BAR_GLYPHS[mark.bar];
    const down = mark.semitones < 0;
    const text = mark.bar === null || code ? label : `${mark.bar || BAR_TEXT} ${label}`;
    const first = { type: down ? Bend2.DOWN : Bend2.UP, text };
    super(mark.release && !down ? [first, { type: Bend2.DOWN, text: "" }] : [first]);
    this.mark = mark;
    this.down = down;
    this.glyph = code ? new Element9().setText(code).setFontSize(BAR_GLYPH_SIZE) : null;
  }
  travels() {
    return !this.mark.preBend && this.glyph === null;
  }
  stretch(width) {
    if (!this.travels()) {
      return;
    }
    const [first, second] = this.phrase;
    if (!first) {
      return;
    }
    first.drawWidth = second ? width / 2 : width;
    if (second) {
      second.drawWidth = 0;
    }
  }
  inkRect() {
    const note = this.checkAttachedNote();
    const { labelY } = this.heights(note);
    const top = labelY - this.getTextHeight();
    const fretY = Math.min(...note.getYs());
    const labelHalf = this.getWidth() / 2;
    let left;
    let right;
    if (this.mark.preBend) {
      left = note.getAbsoluteX() - labelHalf;
      right = note.getAbsoluteX() + labelHalf;
    } else {
      left = note.getAbsoluteX();
      right = this.legStartX(note) + Math.max(this.legsWidth(), this.glyphWidth()) + labelHalf;
    }
    return new Rect2(left, top, right - left, fretY - top);
  }
  draw() {
    const ctx = this.checkContext();
    const note = this.checkAttachedNote();
    this.setRendered();
    const { baseY, tipY, labelY } = this.heights(note);
    this.applyStyle(ctx, this.getStyleLine());
    ctx.setFont(this.fontInfo);
    const label = (x, text) => {
      ctx.fillText(text, x - ctx.measureText(text).width / 2, labelY);
    };
    const arrow = (x, y, direction) => {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - ARROW_HALF_WIDTH, y + ARROW_HALF_WIDTH * direction);
      ctx.lineTo(x + ARROW_HALF_WIDTH, y + ARROW_HALF_WIDTH * direction);
      ctx.closePath();
      ctx.fill();
    };
    const text = this.phrase[0]?.text ?? "";
    if (this.mark.preBend) {
      const x = note.getAbsoluteX();
      const from = Math.min(...note.getYs()) - PRE_BEND_GAP;
      this.leg(x, from, x, tipY);
      arrow(x, tipY, 1);
      label(x, text);
      return;
    }
    const startX = this.legStartX(note);
    if (this.glyph) {
      const width = this.glyphWidth();
      const { descent } = this.glyphInk();
      this.glyph.renderText(ctx, startX, tipY - descent);
      ctx.setFont(this.fontInfo);
      label(startX + width / 2, text);
      return;
    }
    const [first, second] = this.phrase;
    const w1 = first?.drawWidth ?? 0;
    if (this.down) {
      this.leg(startX, tipY, startX + w1, baseY);
      arrow(startX + w1, baseY, -1);
      label(startX + w1, text);
      return;
    }
    this.leg(startX, baseY, startX + w1, tipY);
    label(startX + w1, text);
    if (second) {
      const w2 = w1 + (second.drawWidth ?? 0);
      this.leg(startX + w1, tipY, startX + w1 + w2, baseY);
      arrow(startX + w1 + w2, baseY, -1);
    } else {
      arrow(startX + w1, tipY, 1);
    }
  }
  leg(x0, y0, x1, y1) {
    const ctx = this.checkContext();
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    if (this.mark.shape === "angled" || x0 === x1) {
      ctx.lineTo(x1, y1);
    } else {
      ctx.quadraticCurveTo(x1, y0, x1, y1);
    }
    ctx.stroke();
  }
  legStartX(note) {
    return note.getModifierStartXY(Modifier13.Position.RIGHT, this.index ?? 0).x + 3;
  }
  legsWidth() {
    return this.phrase.reduce((sum, leg) => sum + (leg.drawWidth ?? 0), 0);
  }
  glyphWidth() {
    return this.glyph?.getWidth() ?? 0;
  }
  glyphInk() {
    const metrics = this.glyph?.getTextMetrics();
    return {
      ascent: metrics?.actualBoundingBoxAscent ?? 0,
      descent: metrics?.actualBoundingBoxDescent ?? 0
    };
  }
  heights(note) {
    const spacing = note.checkStave().getSpacingBetweenLines();
    const lowestY = Math.min(...note.getYs());
    const baseY = note.getModifierStartXY(Modifier13.Position.RIGHT, this.index ?? 0).y + 0.5;
    const tipY = lowestY - (this.textLine + 1) * spacing + 3;
    const { ascent, descent } = this.glyphInk();
    return { baseY, tipY, labelY: tipY - 4 - ascent - descent };
  }
}

// tab-voice-translator.ts
var STEP_SEMITONES2 = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11
};

class TabVoiceTranslator {
  durations;
  reader;
  tabStemPlacement;
  constructor(durations, reader, tabStemPlacement) {
    this.durations = durations;
    this.reader = reader;
    this.tabStemPlacement = tabStemPlacement;
  }
  isHeld(note) {
    return this.reader.tiesOf(note).some((tie) => tie.tieType === "stop");
  }
  tickables(chords, tuning, record) {
    const tickables = [];
    let pendingGrace = [];
    for (const chord of chords) {
      if (chord.lead.isRest) {
        tickables.push(...this.durations.ghostNotes(chord.lead.beats ?? 0));
        continue;
      }
      if (chord.lead.isGrace) {
        pendingGrace.push({
          note: this.tabGrace(chord, tuning),
          lead: chord.lead
        });
        continue;
      }
      if (chord.notes.every((note) => this.isHeld(note))) {
        if (chord.lead.timeModification) {
          const ghost = new GhostNote4({
            duration: this.durations.code(chord.lead),
            dots: this.reader.dotsOf(chord.lead)
          });
          tickables.push(ghost);
          record?.(chord.lead, ghost);
        } else {
          tickables.push(...this.durations.ghostNotes(chord.lead.beats ?? 0));
        }
        continue;
      }
      const tabNote = this.tabChord(chord, tuning);
      if (pendingGrace.length > 0) {
        const group = new GraceNoteGroup4(pendingGrace.map((g) => g.note));
        group.preFormat();
        group.setWidth(group.getWidth() + TAB_GRACE_SPACING);
        tabNote.addModifier(group, 0);
        for (const g of pendingGrace) {
          record?.(g.lead, g.note);
        }
        pendingGrace = [];
      }
      record?.(chord.lead, tabNote);
      tickables.push(tabNote);
    }
    return tickables;
  }
  tabChord(chord, tuning) {
    const lead = chord.lead;
    const duration = this.durations.code(lead);
    const tabNote = new TabNote2({
      positions: this.positions(chord, tuning),
      duration,
      dots: this.reader.dotsOf(lead),
      stemDirection: this.tabStemPlacement === "above" ? Stem10.UP : Stem10.DOWN
    }, this.tabStemPlacement !== "none");
    this.styleFrets(tabNote, TAB_FRET_SCALE);
    this.addTabModifiers(tabNote, lead);
    return tabNote;
  }
  tabGrace(chord, tuning) {
    const duration = this.durations.code(chord.lead);
    const grace = new GraceTabNote({
      positions: this.positions(chord, tuning),
      duration
    });
    this.styleFrets(grace, TAB_FRET_SCALE * (TAB_GRACE_SCALE / grace.getFontScale()));
    return grace;
  }
  positions(chord, tuning) {
    const toPosition = (note) => {
      const derived = tuning && note.fret == null ? this.derivePosition(note, tuning) : null;
      const fret = note.fret ?? derived?.fret ?? 0;
      let fretText = fret;
      if (note.notehead?.value === "x") {
        fretText = "✕";
      } else if (note.isHarmonic) {
        fretText = `<${fret}>`;
      } else if (note.notehead?.parentheses) {
        fretText = `(${fret})`;
      }
      return {
        str: note.string ?? derived?.str ?? 1,
        fret: fretText
      };
    };
    const struck = chord.notes.filter((note) => !this.isHeld(note));
    return (struck.length > 0 ? struck : chord.notes).map(toPosition);
  }
  derivePosition(note, tuning) {
    const pitch = note.pitch;
    if (!pitch) {
      return null;
    }
    const midi = this.midiOf(pitch.step, pitch.octave, pitch.alter ?? 0);
    if (note.string != null) {
      const open = tuning[note.string - 1];
      return open == null ? null : { str: note.string, fret: Math.max(0, midi - open) };
    }
    let best = null;
    for (const [index, open] of tuning.entries()) {
      const fret = midi - open;
      if (fret >= 0 && (best === null || fret < best.fret)) {
        best = { str: index + 1, fret };
      }
    }
    return best ?? { str: tuning.length, fret: 0 };
  }
  midiOf(step, octave, alter) {
    return (octave + 1) * 12 + (STEP_SEMITONES2[step.toUpperCase()] ?? 0) + alter;
  }
  addTabModifiers(tabNote, lead) {
    const bend = this.reader.bendOf(lead);
    if (bend) {
      tabNote.addModifier(new TabBend(this.bendLabel(bend.semitones), bend), 0);
    }
    const other = lead.otherTechnical[0];
    if (other) {
      const noteWidth = tabNote.width;
      tabNote.addModifier(this.tabAnnotation(other, noteWidth), 0);
    }
    if (lead.wavyLines.some((w) => w.wavyLineType === "start")) {
      tabNote.addModifier(new Vibrato2, 0);
    }
  }
  tabAnnotation(text, noteWidth) {
    const annotation = new Annotation4(text).setVerticalJustification(Annotation4.VerticalJustify.TOP);
    annotation.setXShift(noteWidth / 2);
    return annotation;
  }
  bendLabel(semitones) {
    const size = Math.abs(semitones);
    const whole = Math.floor(size / 2);
    const half = size % 2 === 1 ? "½" : "";
    const amount = whole > 0 ? `${whole}${half}` : half || "0";
    return semitones < 0 ? `-${amount}` : amount;
  }
  styleFrets(tabNote, scale) {
    const note = tabNote;
    let width = 0;
    for (const el of note.fretElement) {
      if (el.getText().includes("<")) {
        this.styleHarmonicFret(el, scale);
      } else {
        this.boldFret(el, scale);
      }
      width = Math.max(el.getWidth(), width);
    }
    note.width = width;
  }
  styleHarmonicFret(el, scale) {
    el.setText(el.getText().replace(/[<>]/g, ""));
    this.boldFret(el, scale);
    const fontSize = el.fontSizeInPoints;
    const open = this.harmonicBracket("<", fontSize);
    const close = this.harmonicBracket(">", fontSize);
    const openWidth = open.getWidth();
    const digitsWidth = el.getWidth();
    open.setX(0);
    el.setXShift(openWidth);
    close.setX(openWidth + digitsWidth);
    el.addChild(open);
    el.addChild(close);
    el.setWidth(openWidth + digitsWidth + close.getWidth());
  }
  harmonicBracket(glyph, fontSizeInPoints) {
    const el = new Element10("TabNote.text");
    el.setText(glyph);
    el.setFontSize(fontSizeInPoints);
    el.setYShift(el.getHeight() / 2 + 1);
    return el;
  }
  boldFret(el, scale) {
    el.fontWeight = "bold";
    el.setFontSize(el.fontSizeInPoints * scale);
    el.setYShift(el.getHeight() / 2);
  }
}

// voice-translator.ts
import {
  GhostNote as GhostNote6,
  GraceNoteGroup as GraceNoteGroup6,
  StaveNote as StaveNote9,
  Voice
} from "vexflow/core";

// attributed-clef-note.ts
import { ClefNote as ClefNote2 } from "vexflow/core";

class AttributedClefNote extends ClefNote2 {
  draw() {
    const context = this.checkContext();
    context.openGroup("vexml-clef");
    try {
      super.draw();
    } finally {
      context.closeGroup();
    }
  }
}

// grace-host-ghost-note.ts
import { GhostNote as GhostNote5, GraceNoteGroup as GraceNoteGroup5 } from "vexflow/core";

class GraceHostGhostNote extends GhostNote5 {
  addToModifierContext(mc) {
    this.modifierContext = mc;
    for (const modifier of this.getModifiers()) {
      mc.addMember(modifier);
    }
    this.preFormatted = false;
    return this;
  }
  draw() {
    super.draw();
    const ctx = this.checkContext();
    for (const modifier of this.getModifiers()) {
      if (modifier instanceof GraceNoteGroup5) {
        modifier.setContext(ctx).drawWithStyle();
      }
    }
  }
}

// voice-translator.ts
var MIDDLE_LINE2 = 3;
var FLAGGED_DURATIONS = new Set(["8", "16", "32", "64", "128"]);

class VoiceTranslator {
  chords;
  durations;
  barlines;
  reader;
  constructor(chords, durations, barlines, reader) {
    this.chords = chords;
    this.durations = durations;
    this.barlines = barlines;
    this.reader = reader;
  }
  useAppearance(appearance) {
    this.chords.useAppearance(appearance);
  }
  tickables(chords, clef, opts) {
    const {
      endBeat = 0,
      run = [],
      recordStandIn,
      record,
      octaveShiftOf = () => 0,
      defaultStem,
      autoBeams = [],
      stemOf = () => {
        return;
      },
      barlines = [],
      midClefs = [],
      drawMidClefs = true
    } = opts;
    const beamStems = this.beamStems(chords, clef, {
      autoBeams,
      midClefs,
      octaveShiftOf
    });
    const tickables = [];
    let activeClef = clef;
    let nextClef = 0;
    const flushClefs = (upTo) => {
      for (let change = midClefs[nextClef];change && change.beat <= upTo + EPSILON; change = midClefs[nextClef]) {
        activeClef = change.clef;
        if (drawMidClefs) {
          const note = new AttributedClefNote(change.clef, change.size.size, change.annotation);
          setClefGlyph(note.getClef(), change.glyph);
          scaleClefGlyph(note.getClef(), change.size.scale);
          note.setWidth(note.getClef().getWidth());
          tickables.push(note);
        }
        nextClef++;
      }
    };
    let nextBarline = 0;
    const flushBarlines = (upTo) => {
      for (let bar = barlines[nextBarline];bar && bar.beat <= upTo + EPSILON; bar = barlines[nextBarline]) {
        tickables.push(this.barlines.midBarNote(bar.style));
        nextBarline++;
      }
    };
    const soleLead = chords.filter((c) => !c.lead.isGrace).map((c) => c.lead);
    const lone = soleLead.length === 1 ? soleLead[0] : undefined;
    const centerWholeRest = !!lone && lone.isRest && this.durations.code(lone) === "w";
    let cursor = 0;
    let pendingGrace = [];
    const flushAfterGraces = (pendingAfter) => {
      const host = tickables.at(-1);
      if (!host || pendingAfter.length === 0) {
        return;
      }
      const group = new AfterGraceGroup(pendingAfter.map((g) => g.note));
      if (this.beamsGraceGroup(pendingAfter)) {
        group.beamNotes();
      }
      group.preFormat();
      host.addModifier(group, 0);
      for (const g of pendingAfter) {
        record?.(g.lead, g.note);
      }
    };
    for (const chord of chords) {
      if (chord.lead.isGrace) {
        pendingGrace.push({
          note: this.chords.staveNote(chord, activeClef, {
            octaveShift: octaveShiftOf(chord.lead)
          }),
          lead: chord.lead
        });
        continue;
      }
      const onset = this.reader.measureBeatOf(chord.lead) ?? cursor;
      flushBarlines(onset);
      flushClefs(onset);
      if (onset > cursor + EPSILON) {
        tickables.push(...this.gapFill(cursor, onset, run, recordStandIn));
      }
      const staveNote = this.chords.staveNote(chord, activeClef, {
        alignCenter: centerWholeRest,
        octaveShift: octaveShiftOf(chord.lead),
        defaultStem,
        stem: stemOf(chord.lead) ?? beamStems.get(chord.lead),
        slashed: this.reader.isRhythmSlashed(chord.lead),
        styled: this.reader.noteStyleOf(chord.lead)
      });
      if (pendingGrace.length > 0) {
        const group = new GraceNoteGroup6(pendingGrace.map((g) => g.note));
        if (this.beamsGraceGroup(pendingGrace)) {
          group.beamNotes();
        }
        group.preFormat();
        staveNote.addModifier(group, 0);
        const prev = tickables.at(-1);
        const prevHasDots = prev?.getModifiers().some((m) => m.getCategory() === "Dot");
        if (prev && !prevHasDots) {
          prev.setRightDisplacedHeadPx(prev.getRightDisplacedHeadPx() + GRACE_SPACING);
        }
        for (const g of pendingGrace) {
          record?.(g.lead, g.note);
        }
        pendingGrace = [];
      }
      record?.(chord.lead, staveNote);
      tickables.push(staveNote);
      cursor = onset + (this.reader.beatsOf(chord.lead) ?? 0);
    }
    if (tickables.length === 0 && pendingGrace.length > 0) {
      tickables.push(...this.gapFill(cursor, endBeat, run, recordStandIn, true));
      cursor = endBeat;
      const lead = tickables[0];
      if (lead instanceof GraceHostGhostNote) {
        const group = new GraceNoteGroup6(pendingGrace.map((g) => g.note));
        if (this.beamsGraceGroup(pendingGrace)) {
          group.beamNotes();
        }
        group.preFormat();
        lead.addModifier(group, 0);
        for (const g of pendingGrace) {
          record?.(g.lead, g.note);
        }
        pendingGrace = [];
      }
    }
    flushAfterGraces(pendingGrace);
    pendingGrace = [];
    flushBarlines(Number.POSITIVE_INFINITY);
    flushClefs(Number.POSITIVE_INFINITY);
    if (endBeat > cursor + EPSILON) {
      tickables.push(...this.gapFill(cursor, endBeat, run, recordStandIn));
    }
    return tickables;
  }
  beamStems(chords, clef, opts) {
    const stems = new Map;
    if (opts.autoBeams.length === 0) {
      return stems;
    }
    const lines = new Map;
    let activeClef = clef;
    let nextClef = 0;
    let cursor = 0;
    for (const chord of chords) {
      if (chord.lead.isGrace) {
        continue;
      }
      const onset = this.reader.measureBeatOf(chord.lead) ?? cursor;
      for (let change = opts.midClefs[nextClef];change && change.beat <= onset + EPSILON; change = opts.midClefs[nextClef]) {
        activeClef = change.clef;
        nextClef++;
      }
      const sum = this.chords.keyLines(chord, activeClef, {
        octaveShift: opts.octaveShiftOf(chord.lead),
        slashed: this.reader.isRhythmSlashed(chord.lead)
      }).reduce((total, line) => total + line - MIDDLE_LINE2, 0);
      lines.set(chord.lead, sum);
      cursor = onset + (this.reader.beatsOf(chord.lead) ?? 0);
    }
    for (const group of opts.autoBeams) {
      const leads = group.filter((lead) => lines.has(lead));
      if (leads.length < 2) {
        continue;
      }
      const sum = leads.reduce((total, lead) => total + (lines.get(lead) ?? 0), 0);
      for (const lead of leads) {
        stems.set(lead, sum >= 0 ? "down" : "up");
      }
    }
    return stems;
  }
  gapFill(from, to, run, recordStandIn, hostsGraces = false) {
    const ghosts = [];
    let cursor = from;
    for (const chord of run) {
      const lead = chord.lead;
      const onset = this.reader.measureBeatOf(lead);
      const beats = this.reader.beatsOf(lead);
      if (lead.isGrace || lead.type === null || onset === null || beats === null || Math.abs(onset - cursor) > EPSILON || onset + beats > to + EPSILON) {
        continue;
      }
      const struct = {
        duration: this.durations.code(lead),
        dots: this.reader.dotsOf(lead)
      };
      const ghost = hostsGraces && ghosts.length === 0 ? new GraceHostGhostNote(struct) : new GhostNote6(struct);
      ghosts.push(ghost);
      recordStandIn?.(lead, ghost);
      cursor = onset + beats;
    }
    if (to > cursor + EPSILON) {
      ghosts.push(...this.durations.ghostNotes(to - cursor));
    }
    return ghosts;
  }
  softVoice(tickables, softmaxFactor) {
    return new Voice().setMode(Voice.Mode.SOFT).setSoftmaxFactor(softmaxFactor).addTickables(tickables);
  }
  noteheadHalfWidthCache = 0;
  noteheadHalfWidth() {
    if (this.noteheadHalfWidthCache === 0) {
      this.noteheadHalfWidthCache = new StaveNote9({ keys: ["c/4"], duration: "q" }).getGlyphWidth() / 2;
    }
    return this.noteheadHalfWidthCache;
  }
  tupletRect(tuplet) {
    const notes = tuplet.getNotes();
    const xs = notes.map((note) => note.getAbsoluteX());
    const hw = this.noteheadHalfWidth();
    const left = Math.min(...xs) - hw;
    const y = tuplet.getYPosition();
    return new Rect2(left, y - TUPLET_NUMERAL_HALF_HEIGHT, Math.max(...xs) + hw - left, 2 * TUPLET_NUMERAL_HALF_HEIGHT);
  }
  findModifier(note, category) {
    return note.getModifiers().find((m) => m.getCategory() === category);
  }
  beamsGraceGroup(graces) {
    return graces.length > 1 && graces.every((g) => FLAGGED_DURATIONS.has(this.durations.code(g.lead)));
  }
}

// score-engraver.ts
class ScoreEngraver {
  config;
  layoutPlanner;
  scoreDrawer;
  elementFactory;
  sequenceFactory;
  configuredGaps;
  reader;
  staves;
  constructor(config, layoutPlanner, scoreDrawer, elementFactory, sequenceFactory, configuredGaps, reader, staves) {
    this.config = config;
    this.layoutPlanner = layoutPlanner;
    this.scoreDrawer = scoreDrawer;
    this.elementFactory = elementFactory;
    this.sequenceFactory = sequenceFactory;
    this.configuredGaps = configuredGaps;
    this.reader = reader;
    this.staves = staves;
  }
  static create(config, reader, gaps, elements, sequences) {
    const durations = new DurationTranslator(reader);
    const barlines = new BarlineTranslator;
    const signatures = new SignatureTranslator;
    const staves = new StavePlan({
      showTabs: config.showTabs,
      showNotation: config.showNotation
    });
    const tab = new TabVoiceTranslator(durations, reader, config.tabStemPlacement);
    const chords = new ChordTranslator(durations, new NotationTranslator(reader, {
      documentFonts: config.documentFonts ? { textFont: new FontFamilies(config.fonts).textStack } : undefined
    }), reader);
    const translator = new VoiceTranslator(chords, durations, barlines, reader);
    return new ScoreEngraver(config, new LayoutPlanner(translator, tab, signatures, staves, reader, gaps), new ScoreDrawer(config, translator, chords, tab, signatures, staves, barlines, reader, new SpannerBuilder(reader), gaps, new SpillResolver), elements, sequences, gaps, reader, staves);
  }
  check() {
    if (this.config.minLastSystemFill < 0 || this.config.minLastSystemFill > 1) {
      throw new RangeError("render: minLastSystemFill must be between 0 and 1");
    }
    for (const [name, font] of Object.entries(this.config.fonts)) {
      if (font?.url && font.faces) {
        throw new TypeError(`render: fonts.${name} takes a url or faces, not both`);
      }
      for (const face of font?.faces ?? []) {
        if (face.unicodeRange !== undefined && !UNICODE_RANGE.test(face.unicodeRange)) {
          throw new TypeError(`render: fonts.${name} has an invalid unicodeRange: ${face.unicodeRange}`);
        }
      }
    }
    const { pixelRatio, layout } = this.config;
    if (pixelRatio != null && !(pixelRatio > 0)) {
      throw new RangeError("render: pixelRatio must be positive");
    }
    if (layout.type === "panoramic" && !(layout.scale > 0 && Number.isFinite(layout.scale) && (layout.fitHeight === null || layout.fitHeight > 0 && Number.isFinite(layout.fitHeight)))) {
      throw new RangeError("render: a panoramic scale and fitHeight must be positive");
    }
    if (layout.type === "paged" && !(layout.margin >= 0 && layout.pageWidth > 2 * layout.margin && layout.pageHeight > 2 * layout.margin)) {
      throw new RangeError("render: a page must be larger than its margins on both axes");
    }
  }
  engrave(document2, probe, viewport, decorations) {
    if (document2.score.parts.length > 0) {
      this.configuredGaps.resolve(document2);
    }
    const parts = document2.score.parts;
    new ProbeTextCanvas(probe).install();
    new FontShorthandPatch().install();
    const drawn = parts.length > 0 ? this.scoreDrawer.draw(probe, document2.score, this.layoutPlanner.plan(document2.score, this.config)) : {
      geometry: {
        bounds: new Rect2(0, 0, 0, 0),
        notes: [],
        measures: [],
        chordDiagrams: []
      },
      engraving: null,
      fold: null,
      pages: []
    };
    const { geometry } = drawn;
    const model = this.elementFactory.model(geometry, parts);
    const elements = this.elementFactory.build(model, viewport, decorations);
    const sequence = this.sequenceFactory.create(parts, geometry, elements.noteLookup);
    const gaps = parts.length > 0 ? this.gapInfos(sequence) : [];
    const recording = new ScoreRecording({
      config: snapshotConfig(this.config),
      engraving: drawn.engraving,
      fold: drawn.fold,
      pages: drawn.pages,
      elements: model,
      notes: elements.notes(),
      sequence,
      gaps
    }, probe);
    return { drawn, elements, sequence, gaps, recording };
  }
  beginProgressive(document2, probe, viewport, decorations, scheduler, sink) {
    const parts = document2.score.parts;
    if (parts.length === 0) {
      return null;
    }
    this.configuredGaps.resolve(document2);
    new ProbeTextCanvas(probe).install();
    new FontShorthandPatch().install();
    const plan = this.layoutPlanner.begin(document2.score, this.config);
    plan.placeThrough(1);
    const provisional = new ProvisionalGeometry(this.reader, this.staves, document2.score, plan.layout);
    const planned = provisional.geometryOf(plan.forecast());
    const model = this.elementFactory.model(planned, parts);
    const { elements, placer } = this.elementFactory.buildPlaceable(model, viewport, decorations);
    const timeline = this.sequenceFactory.begin(parts, planned, elements.noteLookup);
    const sequence = timeline.place(planned);
    return new ProgressiveEngraving({
      draw: this.scoreDrawer.begin(probe, document2.score, plan),
      plan,
      provisional,
      planned,
      elements,
      placer,
      sequence,
      timeline,
      gaps: this.gapInfos(sequence),
      parts,
      factory: this.elementFactory,
      config: this.config,
      probe,
      scheduler,
      sink
    });
  }
  gapInfos(sequence) {
    return this.configuredGaps.documentIndexes().map(({ gap, measureIndex }) => {
      const range = sequence.getStepRangeOfMeasure(measureIndex);
      const step = range ? sequence.getStep(range.start) : null;
      return {
        measureIndex,
        label: gap.label ?? null,
        startMs: step?.startMs ?? 0,
        endMs: step?.endMs ?? 0
      };
    });
  }
}

// canvas-paint-probe.ts
class CanvasPaintProbe {
  ctx;
  metrics = new Map;
  normalized = new Map;
  constructor(ctx) {
    this.ctx = ctx;
  }
  normalize(prop, value, current) {
    const key = isPrimitive(value) && isPrimitive(current) ? `${prop}|${typeof value}:${value}|${typeof current}:${current}` : null;
    if (key !== null && this.normalized.has(key)) {
      return this.normalized.get(key);
    }
    const ctx = this.ctx;
    ctx[prop] = current;
    ctx[prop] = value;
    const normalized = ctx[prop];
    if (key !== null) {
      if (this.normalized.size >= MAX_CACHED_METRICS) {
        this.normalized.clear();
      }
      this.normalized.set(key, normalized);
    }
    return normalized;
  }
  measureText(state, text) {
    const p = state.props;
    const key = `${p.font}|${p.letterSpacing}|${p.wordSpacing}|${p.fontKerning}|${p.fontStretch}|${p.fontVariantCaps}|${p.textRendering}|${p.direction}|${p.textAlign}|${p.textBaseline}|${text}`;
    let metrics = this.metrics.get(key);
    if (!metrics) {
      const ctx = this.ctx;
      for (const prop of TEXT_PROPS) {
        ctx[prop] = p[prop];
      }
      metrics = this.ctx.measureText(text);
      if (this.metrics.size >= MAX_CACHED_METRICS) {
        this.metrics.clear();
      }
      this.metrics.set(key, metrics);
    }
    return metrics;
  }
  forget() {
    this.metrics.clear();
  }
  isPointInPath(query) {
    const { state, path, x, y, fillRule, stroke, scale } = query;
    const base = Affine.scale(scale);
    if (Array.isArray(path)) {
      const replayer = new PaintReplayer(this.ctx, base, {
        scale,
        device: null
      });
      replayer.replay({
        state,
        path,
        call: { kind: "fillRect", x: 0, y: 0, w: 0, h: 0 },
        bounds: null
      });
      const hit = stroke ? this.ctx.isPointInStroke(x, y) : this.ctx.isPointInPath(x, y, fillRule);
      replayer.finish();
      return hit;
    }
    const m = base.multiply(state.matrix);
    this.ctx.save();
    this.ctx.lineWidth = state.props.lineWidth;
    this.ctx.setTransform(m.a, m.b, m.c, m.d, m.e, m.f);
    const hit = stroke ? this.ctx.isPointInStroke(path, x, y) : this.ctx.isPointInPath(path, x, y, fillRule);
    this.ctx.restore();
    return hit;
  }
  createLinearGradient(x0, y0, x1, y1) {
    return this.ctx.createLinearGradient(x0, y0, x1, y1);
  }
  createRadialGradient(x0, y0, r0, x1, y1, r1) {
    return this.ctx.createRadialGradient(x0, y0, r0, x1, y1, r1);
  }
  createConicGradient(startAngle, x, y) {
    return this.ctx.createConicGradient(startAngle, x, y);
  }
  createPattern(image, repetition) {
    return this.ctx.createPattern(image, repetition);
  }
  createImageData(sw, sh, settings) {
    return this.ctx.createImageData(sw, sh, settings);
  }
}
var MAX_CACHED_METRICS = 1e4;
var TEXT_PROPS = [
  "font",
  "letterSpacing",
  "wordSpacing",
  "fontKerning",
  "fontStretch",
  "fontVariantCaps",
  "textRendering",
  "direction",
  "textAlign",
  "textBaseline"
];
function isPrimitive(value) {
  return typeof value === "string" || typeof value === "number" || value === undefined;
}

export { isHighlightable2, isPlayable2, Element2, Barline2, ChordDiagram2, Dispatcher, Stave2, Measure2, DynamicGlyphs, GapInserter, ScoreReader, MeasureBox2, Note2, Part2, DefaultScoreParser, Gaps, Sequence2, Timeline2, SequenceFactory, DEFAULT_FONT_CONFIG, resolveConfig, FontFamilies, System2, TabPosition2, Voice2, ElementFactory, CssFont, PaintContext, PaintList, snapshotConfig, ScoreEngraver, CanvasPaintProbe };
