// ../core/geometry/rect.ts
class Rect2 {
  x;
  y;
  w;
  h;
  constructor(x, y, w, h) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
  }
  static zero() {
    return new Rect2(0, 0, 0, 0);
  }
  static fromDomRect(rect) {
    return new Rect2(rect.x, rect.y, rect.width, rect.height);
  }
  get top() {
    return this.y;
  }
  get left() {
    return this.x;
  }
  get right() {
    return this.x + this.w;
  }
  get bottom() {
    return this.y + this.h;
  }
  get area() {
    return this.w * this.h;
  }
  isEqual(other) {
    return this.x === other.x && this.y === other.y && this.w === other.w && this.h === other.h;
  }
  contains(position) {
    return position.x >= this.x && position.x <= this.right && position.y >= this.y && position.y <= this.bottom;
  }
  containsRect(other) {
    return other.x >= this.x && other.y >= this.y && other.right <= this.right && other.bottom <= this.bottom;
  }
  intersects(other) {
    return this.x < other.right && other.x < this.right && this.y < other.bottom && other.y < this.bottom;
  }
  intersection(other) {
    if (!this.intersects(other)) {
      return null;
    }
    const left = Math.max(this.x, other.x);
    const top = Math.max(this.y, other.y);
    return new Rect2(left, top, Math.min(this.right, other.right) - left, Math.min(this.bottom, other.bottom) - top);
  }
  union(other) {
    const left = Math.min(this.x, other.x);
    const top = Math.min(this.y, other.y);
    return new Rect2(left, top, Math.max(this.right, other.right) - left, Math.max(this.bottom, other.bottom) - top);
  }
  translate(dx, dy) {
    return new Rect2(this.x + dx, this.y + dy, this.w, this.h);
  }
  atOrigin() {
    return new Rect2(0, 0, this.w, this.h);
  }
}

// ../core/geometry/quad-tree.ts
class QuadTree {
  bounds;
  capacity;
  maxDepth;
  entries = [];
  children = [];
  constructor(bounds, opts = {}) {
    this.bounds = bounds;
    this.capacity = opts.capacity ?? 8;
    this.maxDepth = opts.maxDepth ?? 8;
  }
  insert(item, bounds) {
    const child = this.children.find((quadrant) => quadrant.bounds.containsRect(bounds));
    if (child === undefined) {
      this.entries.push({ item, bounds });
      if (this.entries.length > this.capacity && this.children.length === 0) {
        this.split();
      }
      return;
    }
    child.insert(item, bounds);
  }
  query(area) {
    const found = [];
    this.collectHere(area, found);
    for (const child of this.children) {
      child.collect(area, found);
    }
    return found;
  }
  clear() {
    this.entries.length = 0;
    this.children = [];
  }
  get size() {
    return this.children.reduce((total, child) => total + child.size, this.entries.length);
  }
  collect(area, found) {
    if (!this.bounds.intersects(area)) {
      return;
    }
    this.collectHere(area, found);
    for (const child of this.children) {
      child.collect(area, found);
    }
  }
  collectHere(area, found) {
    for (const entry of this.entries) {
      if (entry.bounds.intersects(area)) {
        found.push(entry.item);
      }
    }
  }
  split() {
    if (this.maxDepth === 0) {
      return;
    }
    const halfW = this.bounds.w / 2;
    const halfH = this.bounds.h / 2;
    const left = this.bounds.x;
    const top = this.bounds.y;
    const opts = { capacity: this.capacity, maxDepth: this.maxDepth - 1 };
    this.children = [
      new QuadTree(new Rect2(left, top, halfW, halfH), opts),
      new QuadTree(new Rect2(left + halfW, top, halfW, halfH), opts),
      new QuadTree(new Rect2(left, top + halfH, halfW, halfH), opts),
      new QuadTree(new Rect2(left + halfW, top + halfH, halfW, halfH), opts)
    ];
    const held = this.entries.splice(0);
    for (const entry of held) {
      this.insert(entry.item, entry.bounds);
    }
  }
}
// constants.ts
var MAX_CANVAS_AREA = 4096 * 4096;
var TILE_BUDGET = MAX_CANVAS_AREA;
var TILE_SIZE = 512;
var DEFAULT_WIDTH = 900;
var DEFAULT_STEM_WIDTH = 1.2;
var DEFAULT_BEAM_WIDTH = 5;
var DEFAULT_STAFF_LINE_WIDTH = 1.3;
var PAGE_MARGIN_X = 15;
var FOLD_PADDING = 6;
var FOLD_SHADOW_WIDTH = 14;
var PAGE_MARGIN_TOP = 40;
var PAGE_MARGIN_TOP_WITH_TEMPO = 70;
var PAGE_MARGIN_BOTTOM = 40;
var PEDAL_BOTTOM_TEXT_LINE = 3;
var PEDAL_BOTTOM_MARGIN = 12;
var PEDAL_INK_RISE = 24;
var SYSTEM_GAP = 30;
var INTRA_PART_SPACING = 100;
var INTER_PART_SPACING = 80;
var STAVE_CLEARANCE = 12;
var SPILL_COLUMN = 8;
var BASE_VOICE_WIDTH = 80;
var QUARTER_NOTE_TICKS = 4096;
var LOG_SPACING_RATIO = 0.17;
var MIN_LOG_FACTOR = 0.4;
var LEAD_BARLINE = 12;
var LEAD_CLEF = 32;
var LEAD_CLEF_CHANGE = 24;
var LEAD_KEY = 40;
var LEAD_TIME = 32;
var LEAD_REPEAT_BEGIN = 16;
var LABEL_GAP = 28;
var LABEL_CHAR_WIDTH = 7.5;
var HEADER_TITLE_SIZE = 24;
var HEADER_SUBTITLE_SIZE = 15;
var HEADER_CREDIT_SIZE = 13;
var HEADER_SYMBOL_SIZE = 30;
var HEADER_FOOTER_SIZE = 10;
var FOOTER_GAP = 16;
var HEADER_GAP = 20;
var LABEL_FONT_SIZE = 13;
var GAP_LABEL_FONT_SIZE = 16;
var TAB_MIN_NOTE_SPACING = 32;
var TUPLET_MIN_GROUP_WIDTH = 64;
var STAVE_LINE_DISTANCE = 10;
var TAB_LINE_DISTANCE = 15;
var TAB_FRET_SCALE = 1.022;
var GRACE_SPACING = 16;
var TAB_GRACE_SCALE = 0.8;
var TAB_GRACE_SPACING = 14;
var TAB_CURVE_Y_SHIFT = 12;
var TAB_CURVE_CP_Y = 12;
var TAB_CURVE_RISE = TAB_CURVE_Y_SHIFT + 0.75 * TAB_CURVE_CP_Y;
var TAB_CURVE_FULL_WIDTH = 28;
var TAB_CURVE_LINE_CLEARANCE = 2;
var SLIDE_MIN_SLANT = 6;
var SLIDE_PADDING = 3;
var SINGLE_SLIDE_LEN = 10;
var SINGLE_SLIDE_RISE = 7;
var SINGLE_SLIDE_GAP = 5;
var BRACKET_X_SHIFT = 3;
var PART_GROUP_STEP = 10;
var BRACKET_GLYPH_OVERHANG = 8;
var CONNECTOR_VERTICAL_OVERHANG = 10;
var BRACE_LEFT_OVERHANG = 14;
var HARMONY_FONT_SIZE = 13;
var HARMONY_Y_OFFSET = 14;
var HARMONY_NOTE_CLEARANCE = 8;
var HARMONY_PADDING = 15;
var TIE_APEX_RISE = 13;
var CHORD_DIAGRAM_WIDTH = 88;
var CHORD_DIAGRAM_HEIGHT = 84;
var CHORD_DIAGRAM_GAP = 6;
var CHORD_DIAGRAM_PADDING = 15;
var WORDS_FONT_SIZE = 13;
var TEMPO_WORDS_FONT_SIZE = 16;
var WORDS_Y_OFFSET = 14;
var WORDS_CHAR_WIDTH = 8.5;
var WORDS_NOTE_CLEARANCE = WORDS_Y_OFFSET;
var DYNAMICS_FONT_SIZE = 24;
var PICTOGRAM_FONT_SIZE = 30;
var ACCORDION_REGISTRATION_SIZE = 20;
var NAVIGATION_FONT_SIZE = 24;
var BARLINE_FERMATA_FONT_SIZE = 30;
var BARLINE_FERMATA_INK_HEIGHT = 12;
var NAVIGATION_TEXT_GAP = 4;
var HAIRPIN_HEIGHT = 10;
var HAIRPIN_BREAK_OPEN_RATIO = 0.4;
var HAIRPIN_CHAIN_GAP = 4;
var HAIRPIN_DYNAMIC_GAP = 3;
var HAIRPIN_BARLINE_STOP_MAX_SPACES = 3;
var HAIRPIN_NIENTE_RADIUS = 3;
var HAIRPIN_STAVE_GAP = 14;
var LYRIC_FONT_SIZE = 11;
var LYRIC_PADDING = 3;
var LYRIC_Y_OFFSET = 18;
var LYRIC_NOTE_CLEARANCE = 26;
var LYRIC_LINE_HEIGHT = LYRIC_FONT_SIZE + 5;
var FINGERING_FONT_SIZE = 11;
var STRING_NUMBER_FONT_SIZE = 11;
var STRING_NUMBER_RADIUS = 7;
var STRING_NUMBER_RING_WIDTH = 1;
var STRING_NUMBER_DIGIT_RISE = 4;
var TECHNICAL_ROW_GAP = 4;
var TECHNICAL_EDGE_GAP = 9;
var TUPLET_NESTING_EXTRA_GAP = 10;
var TUPLET_NUMERAL_HALF_HEIGHT = 8;
var TUPLET_SLUR_GAP = 4;
var REHEARSAL_FONT_SIZE = 14;
var REHEARSAL_PADDING = 4;
var ENCLOSURE_PADDING = 3;
var ENCLOSED_BASELINE = 0.85;
var UNDERLINE_OFFSET = 2;
var UNDERLINE_GAP = 2;
var REHEARSAL_Y_OFFSET = 8;
var REHEARSAL_NOTE_CLEARANCE = REHEARSAL_Y_OFFSET;
var TEMPO_NOTE_CLEARANCE = 10;
var TEMPO_SCALE = 0.7;
var TEMPO_MARK_GAP = 12;
var TEMPO_WORD_METRONOME_GAP = 6;
var DEFAULT_TEMPO_BPM = 120;
var LEDGER_HEADROOM = 300;
var SLUR_Y_SHIFT = 10;
var SLUR_BARLINE_GAP = 4;
var SLUR_TIE_GAP = 7;
var SLUR_NESTED_END_GAP = 4;
var SLUR_NESTED_GAP = 3;
var SLUR_TUPLET_END_GAP = 4;
var SLUR_TUPLET_GAP = 4;
var SLUR_MARGIN = 14;
var SLUR_ACCIDENTAL_GAP = 2;
var SLUR_FERMATA_GAP = 6;
var SLUR_MARK_GAP = 3;
var SLUR_BOW_MIN = 9.1;
var SLUR_BOW_FLAT_WIDTH = 51;
var SLUR_BOW_GROWTH = 0.12;
var SLUR_BOW_MAX = 14.5;
var SLUR_BOW_ASPECT = 0.22;
var SLUR_SHOULDER = 0.16;
var SLUR_MAX_CP_Y = 64;
var SLUR_MIN_SHOULDER = 0.05;
var SLUR_END_ZONE = 0.15;
var SLUR_MAX_ASPECT = 0.25;
var SLUR_STEM_TIP_SLANT = 0.5;
var SLUR_GRACE_Y_SHIFT = 4;
var SLUR_GRACE_CP_Y = 6;
var SLUR_GRACE_MARGIN = 5;
var SLUR_GHOST_STEEPNESS = 2 / 3;
var SLUR_GHOST_OVERLAP = 4;
var SLUR_GHOST_MAX_BETWEEN = 2;
var GRACE_START = 0.35;
var GRACE_END_STEM_GAP = 4;
var EPSILON = 0.000001;
var HARMONY_ACCIDENTALS = new Set(["♯", "♭", "♮"]);
var HARMONY_ACCIDENTAL_KERN = 2.5;
var HARMONY_ACCIDENTAL_FONT_SIZE = HARMONY_FONT_SIZE - 3;
var HARMONY_STACK_FONT_SIZE = 9;
var HARMONY_STACK_LINE = 10;
var GRACE_GROUP_SPACING_STAVE = 4;
var NOTEHEAD_HALF_H = 5;
var FRET_HALF_W = 6;
var FRET_HALF_H = 7;
var SCROLL_DURATION_MS = 200;
var MAX_SCROLL_SPEED_PX_PER_MS = 3;
var SCROLL_FRAME_MS = 16;
var SCROLL_TOP_PADDING_PX = 16;
var SCROLL_SIDE_PADDING_PX = 16;
var RESIZE_SETTLE_MS = 150;
var HALO_MARGIN = 8;
var CURSOR_COLOR = "#2563eb";
var CURSOR_WIDTH_PX = 2;
var LOUPE_OPTIONS = {
  width: 200,
  height: 96,
  zoom: 1.5,
  radius: 16,
  gap: 8,
  paper: null
};
var LOUPE_ENTER_MS = 150;
var LOUPE_EXIT_MS = 100;
var LOUPE_MIN_SCALE = 0.5;
var FAR = 1e6;
var BAR_WIDTH = 1;
var DEFAULT_TUNING = ["E", "A", "D", "G", "B", "E"];
var VOLTA_STAVE_GAP = 34;
var DIRECTION_LINE_TEXT_LINE = 2;
var OTTAVA_TEXT_LINE = 1;
var DIRECTION_LINE_HOOK = 8;
var DIRECTION_LINE_WORD_GAP = 4;
var MULTI_REST_PADDING = 12;
var MULTI_REST_MIN_WIDTH = 110;
var VOLTA_NOTE_CLEARANCE = 12;
var VOLTA_LABEL_DROP = 20;
var UNICODE_RANGE = /^\s*U\+[0-9A-F?]{1,6}(-[0-9A-F]{1,6})?(\s*,\s*U\+[0-9A-F?]{1,6}(-[0-9A-F]{1,6})?)*\s*$/i;

// ink.ts
class Ink {
  notation;
  text;
  static NOTATION = "vexml-ink:notation";
  static TEXT = "vexml-ink:text";
  static LEDGER = "vexml-ink:ledger";
  static DEFAULT = new Ink(null, null);
  constructor(notation, text) {
    this.notation = notation;
    this.text = text;
  }
  static isRole(value) {
    return value === Ink.NOTATION || value === Ink.TEXT || value === Ink.LEDGER;
  }
  resolve(value) {
    switch (value) {
      case Ink.NOTATION:
        return this.notation ?? "#000000";
      case Ink.TEXT:
        return this.text ?? "#000000";
      case Ink.LEDGER:
        return this.notation ?? "#444";
      default:
        return value;
    }
  }
  equals(other) {
    return this.notation === other.notation && this.text === other.text;
  }
}

// affine.ts
class Affine {
  a;
  b;
  c;
  d;
  e;
  f;
  static IDENTITY = new Affine(1, 0, 0, 1, 0, 0);
  constructor(a, b, c, d, e, f) {
    this.a = a;
    this.b = b;
    this.c = c;
    this.d = d;
    this.e = e;
    this.f = f;
  }
  static scale(sx, sy = sx) {
    return new Affine(sx, 0, 0, sy, 0, 0);
  }
  static translate(tx, ty) {
    return new Affine(1, 0, 0, 1, tx, ty);
  }
  multiply(other) {
    return new Affine(this.a * other.a + this.c * other.b, this.b * other.a + this.d * other.b, this.a * other.c + this.c * other.d, this.b * other.c + this.d * other.d, this.a * other.e + this.c * other.f + this.e, this.b * other.e + this.d * other.f + this.f);
  }
  isEqual(other) {
    return this.a === other.a && this.b === other.b && this.c === other.c && this.d === other.d && this.e === other.e && this.f === other.f;
  }
  get isAxisAligned() {
    return this.b === 0 && this.c === 0;
  }
  get maxScale() {
    return Math.max(Math.hypot(this.a, this.b), Math.hypot(this.c, this.d));
  }
  mapBox(x0, y0, x1, y1) {
    if (x0 > x1) {
      [x0, x1] = [x1, x0];
    }
    if (y0 > y1) {
      [y0, y1] = [y1, y0];
    }
    const [ax0, ax1] = this.a < 0 ? [this.a * x1, this.a * x0] : [this.a * x0, this.a * x1];
    const [cy0, cy1] = this.c < 0 ? [this.c * y1, this.c * y0] : [this.c * y0, this.c * y1];
    const [bx0, bx1] = this.b < 0 ? [this.b * x1, this.b * x0] : [this.b * x0, this.b * x1];
    const [dy0, dy1] = this.d < 0 ? [this.d * y1, this.d * y0] : [this.d * y0, this.d * y1];
    return new Rect2(ax0 + cy0 + this.e, bx0 + dy0 + this.f, ax1 + cy1 - ax0 - cy0, bx1 + dy1 - bx0 - dy0);
  }
}

// paint-state.ts
var DEFAULT_PROPS = {
  fillStyle: "#000000",
  strokeStyle: "#000000",
  globalAlpha: 1,
  globalCompositeOperation: "source-over",
  lineWidth: 1,
  lineCap: "butt",
  lineJoin: "miter",
  miterLimit: 10,
  lineDashOffset: 0,
  shadowOffsetX: 0,
  shadowOffsetY: 0,
  shadowBlur: 0,
  shadowColor: "rgba(0, 0, 0, 0)",
  font: "10px sans-serif",
  textAlign: "start",
  textBaseline: "alphabetic",
  direction: "inherit",
  filter: "none",
  imageSmoothingEnabled: true,
  imageSmoothingQuality: "low",
  letterSpacing: "0px",
  wordSpacing: "0px",
  fontKerning: "auto",
  fontStretch: "normal",
  fontVariantCaps: "normal",
  textRendering: "auto"
};

class PaintState {
  props;
  matrix;
  clips;
  lineDash;
  static INITIAL = new PaintState(DEFAULT_PROPS, Affine.IDENTITY, [], []);
  constructor(props, matrix, clips, lineDash) {
    this.props = props;
    this.matrix = matrix;
    this.clips = clips;
    this.lineDash = lineDash;
  }
  static of(props, matrix, clips, lineDash) {
    return new PaintState(props, matrix, clips, lineDash);
  }
  with(prop, value) {
    if (this.props[prop] === value) {
      return this;
    }
    return new PaintState({ ...this.props, [prop]: value }, this.matrix, this.clips, this.lineDash);
  }
  withMatrix(matrix) {
    return new PaintState(this.props, matrix, this.clips, this.lineDash);
  }
  withClip(clip) {
    return new PaintState(this.props, this.matrix, [...this.clips, clip], this.lineDash);
  }
  withLineDash(lineDash) {
    return new PaintState(this.props, this.matrix, this.clips, lineDash);
  }
}
var PAINT_PROPS = Object.keys(DEFAULT_PROPS);

// paint-encoder.ts
class PaintEncoder {
  strings = [];
  stringIndex = new Map;
  matrices = [];
  matrixIndex = new Map;
  matrixByValue = new Map;
  props = [];
  propsIndex = new Map;
  propsByValue = new Map;
  clips = [];
  clipsIndex = new Map;
  clipsByValue = new Map;
  dashes = [];
  dashIndex = new Map;
  dashByValue = new Map;
  states = [];
  stateIndex = new Map;
  stateByValue = new Map;
  encode(ops) {
    const out = [];
    for (const op of ops) {
      const call = PAINT_CALLS.indexOf(op.call.kind);
      if (call < 0) {
        throw new Error(`vexml: a snapshot cannot hold a ${op.call.kind}`);
      }
      const unbounded = (op.call.kind === "fillText" || op.call.kind === "strokeText") && op.call.maxWidth === undefined;
      out.push(call * CALL_FLAGS + (op.bounds ? HAS_BOUNDS : 0) + (unbounded ? NO_MAX_WIDTH : 0), this.state(op.state));
      if (op.bounds) {
        const { x, y, right, bottom } = op.bounds;
        const x0 = Math.floor(x);
        const y0 = Math.floor(y);
        const [ax, ay] = anchorOf(op.state.matrix, op.path, op.call);
        out.push(x0 - ax, y0 - ay, Math.ceil(right) - x0, Math.ceil(bottom) - y0);
      }
      if (op.path) {
        out.push(op.path.length);
        this.path(op.path, this.matrix(op.state.matrix), out);
      } else {
        out.push(-1);
      }
      this.call(op.call, out);
    }
    return out;
  }
  tables() {
    return {
      strings: this.strings,
      matrices: this.matrices,
      props: this.props,
      clips: this.clips,
      dashes: this.dashes,
      states: this.states
    };
  }
  call(call, out) {
    switch (call.kind) {
      case "fill":
        if (call.path2d) {
          throw new Error("vexml: a snapshot cannot hold a Path2D");
        }
        out.push(FILL_RULES.indexOf(call.fillRule));
        return;
      case "stroke":
        if (call.path2d) {
          throw new Error("vexml: a snapshot cannot hold a Path2D");
        }
        return;
      case "fillRect":
      case "strokeRect":
      case "clearRect":
        out.push(exact(call.x), exact(call.y), exact(call.w), exact(call.h));
        return;
      case "fillText":
      case "strokeText":
        out.push(this.string(call.text), exact(call.x), exact(call.y));
        if (call.maxWidth !== undefined) {
          out.push(exact(call.maxWidth));
        }
        return;
    }
  }
  path(path, from, out) {
    let previous = from;
    for (const segment of path) {
      const matrix = this.matrix(segment.matrix);
      const fixed = PATH_ARGS[segment.kind] === segment.args.length;
      out.push(PATH_KINDS.indexOf(segment.kind) + (matrix === previous ? 0 : SEGMENT_MATRIX) + (fixed ? 0 : SEGMENT_COUNT));
      if (matrix !== previous) {
        out.push(matrix);
        previous = matrix;
      }
      if (!fixed) {
        out.push(segment.args.length);
      }
      for (const arg of segment.args) {
        out.push(this.arg(arg));
      }
    }
  }
  arg(arg) {
    if (typeof arg === "number") {
      return exact(arg);
    }
    if (typeof arg === "boolean" || arg === null) {
      return arg;
    }
    if (arg === undefined) {
      return null;
    }
    if (Array.isArray(arg) && arg.every((r) => typeof r === "number")) {
      return arg.map(exact);
    }
    throw new Error("vexml: a snapshot cannot hold this path argument");
  }
  state(state) {
    const known = this.stateIndex.get(state);
    if (known !== undefined) {
      return known;
    }
    const entry = [
      this.propsOf(state.props),
      this.matrix(state.matrix),
      this.clipsOf(state.clips),
      this.dash(state.lineDash)
    ];
    const key = entry.join(",");
    let index = this.stateByValue.get(key);
    if (index === undefined) {
      index = this.states.length / 4;
      this.states.push(...entry);
      this.stateByValue.set(key, index);
    }
    this.stateIndex.set(state, index);
    return index;
  }
  propsOf(props) {
    const known = this.propsIndex.get(props);
    if (known !== undefined) {
      return known;
    }
    const changed = {};
    for (const prop of PAINT_PROPS) {
      const value = props[prop];
      if (value === PaintState.INITIAL.props[prop]) {
        continue;
      }
      if (typeof value !== "string" && typeof value !== "number" && typeof value !== "boolean") {
        throw new Error(`vexml: a snapshot cannot hold this ${prop}`);
      }
      changed[prop] = value;
    }
    const key = JSON.stringify(changed);
    let index = this.propsByValue.get(key);
    if (index === undefined) {
      index = this.props.length;
      this.props.push(changed);
      this.propsByValue.set(key, index);
    }
    this.propsIndex.set(props, index);
    return index;
  }
  matrix(matrix) {
    const known = this.matrixIndex.get(matrix);
    if (known !== undefined) {
      return known;
    }
    const { a, b, c, d, e, f } = matrix;
    const key = `${a},${b},${c},${d},${e},${f}`;
    let index = this.matrixByValue.get(key);
    if (index === undefined) {
      index = this.matrices.length / 6;
      this.matrices.push(a, b, c, d, e, f);
      this.matrixByValue.set(key, index);
    }
    this.matrixIndex.set(matrix, index);
    return index;
  }
  clipsOf(clips) {
    const known = this.clipsIndex.get(clips);
    if (known !== undefined) {
      return known;
    }
    const encoded = clips.map((clip) => {
      if (!Array.isArray(clip.path)) {
        throw new Error("vexml: a snapshot cannot hold a Path2D clip");
      }
      const matrix = this.matrix(clip.matrix);
      const path = [clip.path.length];
      this.path(clip.path, matrix, path);
      const { rect } = clip;
      return [
        path,
        matrix,
        FILL_RULES.indexOf(clip.fillRule),
        rect ? [rect.x, rect.y, rect.w, rect.h] : null
      ];
    });
    const key = JSON.stringify(encoded);
    let index = this.clipsByValue.get(key);
    if (index === undefined) {
      index = this.clips.length;
      this.clips.push(encoded);
      this.clipsByValue.set(key, index);
    }
    this.clipsIndex.set(clips, index);
    return index;
  }
  dash(dash) {
    const known = this.dashIndex.get(dash);
    if (known !== undefined) {
      return known;
    }
    const key = dash.join(",");
    let index = this.dashByValue.get(key);
    if (index === undefined) {
      index = this.dashes.length;
      this.dashes.push([...dash]);
      this.dashByValue.set(key, index);
    }
    this.dashIndex.set(dash, index);
    return index;
  }
  string(text) {
    let index = this.stringIndex.get(text);
    if (index === undefined) {
      index = this.strings.length;
      this.strings.push(text);
      this.stringIndex.set(text, index);
    }
    return index;
  }
}
var PAINT_CALLS = [
  "fill",
  "stroke",
  "fillRect",
  "strokeRect",
  "clearRect",
  "fillText",
  "strokeText"
];
var PATH_KINDS = [
  "moveTo",
  "lineTo",
  "quadraticCurveTo",
  "bezierCurveTo",
  "arc",
  "arcTo",
  "ellipse",
  "rect",
  "roundRect",
  "closePath"
];
var FILL_RULES = [undefined, "nonzero", "evenodd"];
var PATH_ARGS = {
  moveTo: 2,
  lineTo: 2,
  quadraticCurveTo: 4,
  bezierCurveTo: 6,
  arcTo: 5,
  rect: 4,
  closePath: 0
};
var CALL_FLAGS = 4;
var HAS_BOUNDS = 1;
var NO_MAX_WIDTH = 2;
var SEGMENT_MATRIX = 16;
var SEGMENT_COUNT = 32;
function anchorOf(stateMatrix, path, call) {
  let matrix = stateMatrix;
  let x = 0;
  let y = 0;
  const first = path?.[0];
  if (first) {
    matrix = first.matrix;
    [x, y] = first.args;
  } else if ("x" in call) {
    x = call.x;
    y = call.y;
  }
  const px = typeof x === "number" ? x : 0;
  const py = typeof y === "number" ? y : 0;
  const { a, b, c, d, e, f } = matrix;
  return [Math.floor(a * px + c * py + e), Math.floor(b * px + d * py + f)];
}
function exact(value) {
  if (!Number.isFinite(value)) {
    throw new Error("vexml: a snapshot cannot hold a non-finite coordinate");
  }
  return value;
}

// score-snapshot.ts
var SNAPSHOT_VERSION2 = 7;
var SNAPSHOT_FORMAT = "vexml-score-snapshot";

// glyph-outline.ts
class GlyphOutline {
  data;
  made = null;
  commands = null;
  constructor(data) {
    this.data = data;
  }
  path() {
    this.made ??= new Path2D(this.data);
    return this.made;
  }
  trace(ctx) {
    this.commands ??= parse(this.data);
    for (const [command, args] of this.commands) {
      const [a = 0, b = 0, c = 0, d = 0, e = 0, f = 0] = args;
      switch (command) {
        case "M":
          ctx.moveTo(a, b);
          break;
        case "L":
          ctx.lineTo(a, b);
          break;
        case "Q":
          ctx.quadraticCurveTo(a, b, c, d);
          break;
        case "C":
          ctx.bezierCurveTo(a, b, c, d, e, f);
          break;
        case "Z":
          ctx.closePath();
          break;
      }
    }
  }
}
function parse(data) {
  const commands = [];
  for (const token of data.match(/[MLQCZ]|-?[\d.]+(?:e-?\d+)?/g) ?? []) {
    const last = commands[commands.length - 1];
    if (/[MLQCZ]/.test(token)) {
      commands.push([token, []]);
    } else {
      last?.[1].push(Number(token));
    }
  }
  return commands;
}

// text-outline.ts
class TextOutline {
  glyphs;
  constructor(glyphs) {
    this.glyphs = glyphs;
  }
  trace(ctx, x, y) {
    for (const { glyph, x: gx, y: gy, scale, skew } of this.glyphs) {
      ctx.save();
      ctx.transform(scale, 0, skew * scale, -scale, x + gx, y + gy);
      glyph.trace(ctx);
      ctx.restore();
    }
  }
  fill(ctx, x, y) {
    for (const { glyph, x: gx, y: gy, scale, skew } of this.glyphs) {
      ctx.save();
      ctx.transform(scale, 0, skew * scale, -scale, x + gx, y + gy);
      ctx.fill(glyph.path());
      ctx.restore();
    }
  }
}

// paint-decoder.ts
class PaintDecoder {
  tables;
  matrices = [];
  states = [];
  stateMatrices = [];
  outlines = new Map;
  constructor(tables, outlines = null) {
    this.tables = tables;
    if (outlines) {
      this.readOutlines(outlines);
    }
    const { matrices, props, clips, dashes, states } = tables;
    for (let i = 0;i < matrices.length; i += 6) {
      this.matrices.push(new Affine(num(matrices[i]), num(matrices[i + 1]), num(matrices[i + 2]), num(matrices[i + 3]), num(matrices[i + 4]), num(matrices[i + 5])));
    }
    const propSets = props.map((changed) => ({ ...PaintState.INITIAL.props, ...changed }));
    const clipLists = clips.map((list) => list.map(([path, matrix, fillRule, rect]) => {
      const segments = [];
      this.path(path, 1, num(path[0]), matrix, segments);
      return {
        path: segments,
        matrix: this.matrix(matrix),
        fillRule: FILL_RULES[fillRule] ?? "nonzero",
        rect: rect ? new Rect2(num(rect[0]), num(rect[1]), num(rect[2]), num(rect[3])) : null
      };
    }));
    for (let i = 0;i < states.length; i += 4) {
      this.stateMatrices.push(num(states[i + 1]));
      this.states.push(PaintState.of(must(propSets[num(states[i])]), this.matrix(num(states[i + 1])), must(clipLists[num(states[i + 2])]), must(dashes[num(states[i + 3])])));
    }
  }
  decode(stream) {
    const ops = [];
    let at = 0;
    const next = () => num(stream[at++]);
    while (at < stream.length) {
      const code = next();
      const stateIndex = next();
      const state = must(this.states[stateIndex]);
      const box = code & HAS_BOUNDS ? [next(), next(), next(), next()] : null;
      const length = next();
      let path = null;
      if (length >= 0) {
        path = [];
        at = this.path(stream, at, length, must(this.stateMatrices[stateIndex]), path);
      }
      const kind = PAINT_CALLS[Math.floor(code / CALL_FLAGS)];
      let call;
      switch (kind) {
        case "fill":
          call = { kind, fillRule: FILL_RULES[next()] };
          break;
        case "stroke":
          call = { kind };
          break;
        case "fillRect":
        case "strokeRect":
        case "clearRect":
          call = { kind, x: next(), y: next(), w: next(), h: next() };
          break;
        case "fillText":
        case "strokeText": {
          const text = must(this.tables.strings[next()]);
          const x = next();
          const y = next();
          if (!(code & NO_MAX_WIDTH)) {
            call = { kind, text, x, y, maxWidth: next() };
            break;
          }
          const outline = kind === "fillText" ? this.outlineOf(state, text) : undefined;
          call = outline ? { kind, text, x, y, outline } : { kind, text, x, y };
          break;
        }
        default:
          throw new Error("vexml: unknown paint call in a snapshot");
      }
      let bounds = null;
      if (box) {
        const [ax, ay] = anchorOf(state.matrix, path, call);
        bounds = new Rect2(ax + must(box[0]), ay + must(box[1]), must(box[2]), must(box[3]));
      }
      ops.push({ state, path, call, bounds });
    }
    return ops;
  }
  path(stream, at, length, from, out) {
    let matrix = this.matrix(from);
    for (let i = 0;i < length; i++) {
      const code = num(stream[at++]);
      const kind = PATH_KINDS[code % SEGMENT_MATRIX];
      if (!kind) {
        throw new Error("vexml: unknown path segment in a snapshot");
      }
      if (code & SEGMENT_MATRIX) {
        matrix = this.matrix(num(stream[at++]));
      }
      const count = code & SEGMENT_COUNT ? num(stream[at++]) : PATH_ARGS[kind] ?? 0;
      out.push({ kind, matrix, args: stream.slice(at, at + count) });
      at += count;
    }
    return at;
  }
  readOutlines({ glyphs, forms, fonts, texts }) {
    const paths = glyphs.map((data) => new GlyphOutline(data));
    for (const [font, text, ...placed] of texts) {
      const glyphsOf = [];
      for (let i = 0;i + 3 < placed.length; i += 4) {
        const form = num(placed[i + 3]) * 2;
        glyphsOf.push({
          glyph: must(paths[num(placed[i])]),
          x: num(placed[i + 1]),
          y: num(placed[i + 2]),
          scale: num(forms[form]),
          skew: num(forms[form + 1])
        });
      }
      const name = must(fonts[num(font)]);
      let byText = this.outlines.get(name);
      if (!byText) {
        byText = new Map;
        this.outlines.set(name, byText);
      }
      byText.set(must(this.tables.strings[num(text)]), new TextOutline(glyphsOf));
    }
  }
  outline(font, text) {
    return this.outlines.get(font)?.get(text);
  }
  outlineOf(state, text) {
    const font = state.props.font;
    return typeof font === "string" ? this.outline(font, text) : undefined;
  }
  matrix(index) {
    return must(this.matrices[index]);
  }
}
function num(value) {
  if (typeof value !== "number") {
    throw new Error("vexml: a snapshot holds a malformed paint stream");
  }
  return value;
}
function must(value) {
  if (value === undefined) {
    throw new Error("vexml: a snapshot names a paint table entry it lacks");
  }
  return value;
}

// paint-replayer.ts
class PaintReplayer {
  ctx;
  base;
  target;
  applied = null;
  props = null;
  clips = null;
  dash = null;
  matrix = null;
  started = false;
  ink;
  constructor(ctx, base, target, opts = {}) {
    this.ctx = ctx;
    this.base = base;
    this.target = target;
    this.ink = opts.ink ?? Ink.DEFAULT;
  }
  replay(op) {
    if (!this.started) {
      this.ctx.save();
      this.started = true;
    }
    const { call } = op;
    if (call.kind === "putImageData") {
      this.put(call.data, call.args);
      return;
    }
    this.apply(op.state);
    if (op.path) {
      this.ctx.beginPath();
      this.trace(op.path);
    }
    this.transform(op.state.matrix);
    const ctx = this.ctx;
    switch (call.kind) {
      case "fill":
        if (call.path2d) {
          ctx.fill(call.path2d, call.fillRule);
        } else {
          ctx.fill(call.fillRule);
        }
        break;
      case "stroke":
        if (call.path2d) {
          ctx.stroke(call.path2d);
        } else {
          ctx.stroke();
        }
        break;
      case "fillRect":
        ctx.fillRect(call.x, call.y, call.w, call.h);
        break;
      case "strokeRect":
        ctx.strokeRect(call.x, call.y, call.w, call.h);
        break;
      case "clearRect":
        ctx.clearRect(call.x, call.y, call.w, call.h);
        break;
      case "fillText":
        if (call.outline) {
          call.outline.fill(ctx, call.x, call.y);
        } else {
          ctx.fillText(call.text, call.x, call.y, call.maxWidth);
        }
        break;
      case "strokeText":
        ctx.strokeText(call.text, call.x, call.y, call.maxWidth);
        break;
      case "drawImage":
        ctx.drawImage(call.image, ...call.args);
        break;
    }
  }
  finish() {
    if (this.started) {
      this.ctx.restore();
      this.started = false;
    }
    this.applied = null;
    this.props = null;
    this.clips = null;
    this.dash = null;
    this.matrix = null;
  }
  apply(state) {
    if (state === this.applied) {
      return;
    }
    this.applied = state;
    const ctx = this.ctx;
    if (state.clips !== this.clips) {
      this.ctx.restore();
      this.ctx.save();
      this.props = null;
      this.dash = null;
      this.matrix = null;
      for (const clip of state.clips) {
        this.ctx.beginPath();
        if (Array.isArray(clip.path)) {
          this.trace(clip.path);
          this.transform(clip.matrix);
          this.ctx.clip(clip.fillRule);
        } else {
          this.transform(clip.matrix);
          this.ctx.clip(clip.path, clip.fillRule);
        }
      }
      this.clips = state.clips;
    }
    const props = this.props ?? new Map;
    for (const prop of PAINT_PROPS) {
      const value = state.props[prop];
      if (!props.has(prop) || props.get(prop) !== value) {
        ctx[prop] = this.ink.resolve(value);
        props.set(prop, value);
      }
    }
    this.props = props;
    if (state.lineDash !== this.dash) {
      this.ctx.setLineDash(state.lineDash);
      this.dash = state.lineDash;
    }
  }
  trace(path) {
    const ctx = this.ctx;
    for (const segment of path) {
      this.transform(segment.matrix);
      ctx[segment.kind](...segment.args);
    }
  }
  transform(matrix) {
    if (matrix === this.matrix) {
      return;
    }
    this.matrix = matrix;
    const m = this.base.multiply(matrix);
    this.ctx.setTransform(m.a, m.b, m.c, m.d, m.e, m.f);
  }
  put(data, args) {
    const [dx = 0, dy = 0, x = 0, y = 0, w = data.width, h = data.height] = args;
    const { device, scale } = this.target;
    if (device) {
      this.ctx.putImageData(data, dx - device.x, dy - device.y, x, y, w, h);
      return;
    }
    const canvas = document.createElement("canvas");
    canvas.width = data.width;
    canvas.height = data.height;
    const scratch = canvas.getContext("2d");
    if (!scratch) {
      return;
    }
    scratch.putImageData(data, 0, 0, x, y, w, h);
    this.matrix = null;
    const m = this.base.multiply(Affine.scale(1 / scale)).multiply(Affine.translate(dx, dy));
    this.ctx.save();
    this.ctx.setTransform(m.a, m.b, m.c, m.d, m.e, m.f);
    this.ctx.drawImage(canvas, 0, 0);
    this.ctx.restore();
  }
}

export { Rect2, QuadTree, MAX_CANVAS_AREA, TILE_BUDGET, TILE_SIZE, DEFAULT_WIDTH, DEFAULT_STEM_WIDTH, DEFAULT_BEAM_WIDTH, DEFAULT_STAFF_LINE_WIDTH, PAGE_MARGIN_X, FOLD_PADDING, FOLD_SHADOW_WIDTH, PAGE_MARGIN_TOP, PAGE_MARGIN_TOP_WITH_TEMPO, PAGE_MARGIN_BOTTOM, PEDAL_BOTTOM_TEXT_LINE, PEDAL_BOTTOM_MARGIN, PEDAL_INK_RISE, SYSTEM_GAP, INTRA_PART_SPACING, INTER_PART_SPACING, STAVE_CLEARANCE, SPILL_COLUMN, BASE_VOICE_WIDTH, QUARTER_NOTE_TICKS, LOG_SPACING_RATIO, MIN_LOG_FACTOR, LEAD_BARLINE, LEAD_CLEF, LEAD_CLEF_CHANGE, LEAD_KEY, LEAD_TIME, LEAD_REPEAT_BEGIN, LABEL_GAP, LABEL_CHAR_WIDTH, HEADER_TITLE_SIZE, HEADER_SUBTITLE_SIZE, HEADER_CREDIT_SIZE, HEADER_SYMBOL_SIZE, HEADER_FOOTER_SIZE, FOOTER_GAP, HEADER_GAP, LABEL_FONT_SIZE, GAP_LABEL_FONT_SIZE, TAB_MIN_NOTE_SPACING, TUPLET_MIN_GROUP_WIDTH, STAVE_LINE_DISTANCE, TAB_LINE_DISTANCE, TAB_FRET_SCALE, GRACE_SPACING, TAB_GRACE_SCALE, TAB_GRACE_SPACING, TAB_CURVE_Y_SHIFT, TAB_CURVE_CP_Y, TAB_CURVE_RISE, TAB_CURVE_FULL_WIDTH, TAB_CURVE_LINE_CLEARANCE, SLIDE_MIN_SLANT, SLIDE_PADDING, SINGLE_SLIDE_LEN, SINGLE_SLIDE_RISE, SINGLE_SLIDE_GAP, BRACKET_X_SHIFT, PART_GROUP_STEP, BRACKET_GLYPH_OVERHANG, CONNECTOR_VERTICAL_OVERHANG, BRACE_LEFT_OVERHANG, HARMONY_FONT_SIZE, HARMONY_Y_OFFSET, HARMONY_NOTE_CLEARANCE, HARMONY_PADDING, TIE_APEX_RISE, CHORD_DIAGRAM_WIDTH, CHORD_DIAGRAM_HEIGHT, CHORD_DIAGRAM_GAP, CHORD_DIAGRAM_PADDING, WORDS_FONT_SIZE, TEMPO_WORDS_FONT_SIZE, WORDS_Y_OFFSET, WORDS_CHAR_WIDTH, WORDS_NOTE_CLEARANCE, DYNAMICS_FONT_SIZE, PICTOGRAM_FONT_SIZE, ACCORDION_REGISTRATION_SIZE, NAVIGATION_FONT_SIZE, BARLINE_FERMATA_FONT_SIZE, BARLINE_FERMATA_INK_HEIGHT, NAVIGATION_TEXT_GAP, HAIRPIN_HEIGHT, HAIRPIN_BREAK_OPEN_RATIO, HAIRPIN_CHAIN_GAP, HAIRPIN_DYNAMIC_GAP, HAIRPIN_BARLINE_STOP_MAX_SPACES, HAIRPIN_NIENTE_RADIUS, HAIRPIN_STAVE_GAP, LYRIC_FONT_SIZE, LYRIC_PADDING, LYRIC_Y_OFFSET, LYRIC_NOTE_CLEARANCE, LYRIC_LINE_HEIGHT, FINGERING_FONT_SIZE, STRING_NUMBER_FONT_SIZE, STRING_NUMBER_RADIUS, STRING_NUMBER_RING_WIDTH, STRING_NUMBER_DIGIT_RISE, TECHNICAL_ROW_GAP, TECHNICAL_EDGE_GAP, TUPLET_NESTING_EXTRA_GAP, TUPLET_NUMERAL_HALF_HEIGHT, TUPLET_SLUR_GAP, REHEARSAL_FONT_SIZE, REHEARSAL_PADDING, ENCLOSURE_PADDING, ENCLOSED_BASELINE, UNDERLINE_OFFSET, UNDERLINE_GAP, REHEARSAL_Y_OFFSET, REHEARSAL_NOTE_CLEARANCE, TEMPO_NOTE_CLEARANCE, TEMPO_SCALE, TEMPO_MARK_GAP, TEMPO_WORD_METRONOME_GAP, DEFAULT_TEMPO_BPM, LEDGER_HEADROOM, SLUR_Y_SHIFT, SLUR_BARLINE_GAP, SLUR_TIE_GAP, SLUR_NESTED_END_GAP, SLUR_NESTED_GAP, SLUR_TUPLET_END_GAP, SLUR_TUPLET_GAP, SLUR_MARGIN, SLUR_ACCIDENTAL_GAP, SLUR_FERMATA_GAP, SLUR_MARK_GAP, SLUR_BOW_MIN, SLUR_BOW_FLAT_WIDTH, SLUR_BOW_GROWTH, SLUR_BOW_MAX, SLUR_BOW_ASPECT, SLUR_SHOULDER, SLUR_MAX_CP_Y, SLUR_MIN_SHOULDER, SLUR_END_ZONE, SLUR_MAX_ASPECT, SLUR_STEM_TIP_SLANT, SLUR_GRACE_Y_SHIFT, SLUR_GRACE_CP_Y, SLUR_GRACE_MARGIN, SLUR_GHOST_STEEPNESS, SLUR_GHOST_OVERLAP, SLUR_GHOST_MAX_BETWEEN, GRACE_START, GRACE_END_STEM_GAP, EPSILON, HARMONY_ACCIDENTALS, HARMONY_ACCIDENTAL_KERN, HARMONY_ACCIDENTAL_FONT_SIZE, HARMONY_STACK_FONT_SIZE, HARMONY_STACK_LINE, GRACE_GROUP_SPACING_STAVE, NOTEHEAD_HALF_H, FRET_HALF_W, FRET_HALF_H, SCROLL_DURATION_MS, MAX_SCROLL_SPEED_PX_PER_MS, SCROLL_FRAME_MS, SCROLL_TOP_PADDING_PX, SCROLL_SIDE_PADDING_PX, RESIZE_SETTLE_MS, HALO_MARGIN, CURSOR_COLOR, CURSOR_WIDTH_PX, LOUPE_OPTIONS, LOUPE_ENTER_MS, LOUPE_EXIT_MS, LOUPE_MIN_SCALE, FAR, BAR_WIDTH, DEFAULT_TUNING, VOLTA_STAVE_GAP, DIRECTION_LINE_TEXT_LINE, OTTAVA_TEXT_LINE, DIRECTION_LINE_HOOK, DIRECTION_LINE_WORD_GAP, MULTI_REST_PADDING, MULTI_REST_MIN_WIDTH, VOLTA_NOTE_CLEARANCE, VOLTA_LABEL_DROP, UNICODE_RANGE, Ink, Affine, PaintState, PAINT_PROPS, PaintEncoder, SNAPSHOT_VERSION2, SNAPSHOT_FORMAT, PaintDecoder, PaintReplayer };
