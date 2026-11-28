import {
  DynamicGlyphs,
  GapInserter,
  ScoreReader,
  DefaultScoreParser,
  Gaps,
  SequenceFactory,
  DEFAULT_FONT_CONFIG,
  resolveConfig,
  FontFamilies,
  ElementFactory,
  ScoreEngraver,
  CanvasPaintProbe
} from "./index-rj506x4q.js";
import {
  SNAPSHOT_VERSION2,
  PaintDecoder
} from "./index-z3hf2qfa.js";

// detached-viewport.ts
class DetachedViewport {
  clientRectOf(_rect) {
    throw new Error("vexml: a score engraved with no DOM is not on a page");
  }
  toScoreSpace(_clientX, _clientY) {
    throw new Error("vexml: a score engraved with no DOM is not on a page");
  }
}

// headless-fonts.ts
import { VexFlow } from "vexflow/core";
class HeadlessFonts {
  registry;
  fonts;
  loaded = [];
  constructor(registry, fonts) {
    this.registry = registry;
    this.fonts = fonts;
  }
  get all() {
    return this.loaded;
  }
  async load(config) {
    const families = new FontFamilies(config);
    const sources = [...this.fonts];
    const bravura = families.notation === DEFAULT_FONT_CONFIG.notation.family && !config.notation?.url && !config.notation?.faces && !sources.some((font) => font.family === families.notation);
    if (bravura) {
      sources.push({
        family: families.notation,
        source: new URL("./assets/fonts/Bravura.woff2", import.meta.url)
      });
    }
    for (const font of sources) {
      const data = await this.read(font.source);
      this.registry?.register(toBuffer(data), font.family);
      this.loaded.push({ family: font.family, data });
    }
    VexFlow.setFonts(`'${families.notation}'`, `'${families.text}'`, "sans-serif");
    VexFlow.setTextFonts(`'${families.notation}'`, `'${families.text}'`, "sans-serif");
    return families;
  }
  async read(source) {
    if (source instanceof Uint8Array) {
      return source;
    }
    if (source instanceof ArrayBuffer) {
      return new Uint8Array(source);
    }
    const { readFile } = await import("node:fs/promises");
    return new Uint8Array(await readFile(source));
  }
}
function toBuffer(data) {
  return typeof Buffer === "undefined" ? data : Buffer.from(data.buffer, data.byteOffset, data.byteLength);
}

// inert-decoration.ts
class InertDecoration {
  set(_target, _color) {}
  has(_target) {
    return false;
  }
}

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

// outline-face.ts
import { create } from "fontkit";

class OutlineFace {
  family;
  font;
  weight;
  italic;
  runs = new Map;
  constructor(family, font) {
    this.family = family;
    this.font = font;
    this.weight = font["OS/2"]?.usWeightClass ?? 400;
    this.italic = font.italicAngle !== 0;
  }
  static read(family, data) {
    try {
      const font = create(Buffer.from(data.buffer, data.byteOffset, data.byteLength));
      return "layout" in font ? new OutlineFace(family, font) : null;
    } catch {
      return null;
    }
  }
  get unitsPerEm() {
    return this.font.unitsPerEm;
  }
  has(codePoint) {
    return this.font.hasGlyphForCodePoint(codePoint);
  }
  layout(text) {
    let run = this.runs.get(text);
    if (!run) {
      run = this.font.layout(text);
      this.runs.set(text, run);
    }
    return run;
  }
  glyph(id) {
    return this.font.getGlyph(id);
  }
}

// outline-fonts.ts
class OutlineFonts {
  faces;
  constructor(faces) {
    this.faces = faces;
  }
  layout(font, text) {
    const runs = [];
    let x = 0;
    let face = null;
    let start = 0;
    const close = (end) => {
      if (face && end > start) {
        const scale = font.sizePx / face.unitsPerEm;
        const run = face.layout(text.slice(start, end));
        const pens = [];
        for (const position of run.positions) {
          pens.push(x);
          x += fixed(position.xAdvance * scale);
        }
        runs.push({ face, run, pens, scale });
      }
      start = end;
    };
    let at = 0;
    for (const char of text) {
      const next = this.faceFor(font, char.codePointAt(0) ?? 0);
      if (!next) {
        return null;
      }
      if (next !== face) {
        close(at);
        face = next;
      }
      at += char.length;
    }
    close(at);
    return { runs, width: x };
  }
  faceFor(font, codePoint) {
    for (const family of font.families) {
      const face = this.match(family, font.weight, font.style !== "normal");
      if (face?.has(codePoint)) {
        return face;
      }
    }
    return null;
  }
  match(family, weight, italic) {
    const named = this.faces.filter((face) => face.family === family);
    const slanted = named.filter((face) => face.italic === italic);
    const pool = slanted.length > 0 ? slanted : named;
    const exact = pool.find((face) => face.weight === weight);
    if (exact) {
      return exact;
    }
    const lighter = pool.filter((face) => face.weight < weight).sort((a, b) => b.weight - a.weight);
    const heavier = pool.filter((face) => face.weight > weight).sort((a, b) => a.weight - b.weight);
    if (weight >= 400 && weight <= 500) {
      const upTo500 = heavier.filter((face) => face.weight <= 500);
      const past500 = heavier.filter((face) => face.weight > 500);
      return upTo500[0] ?? lighter[0] ?? past500[0] ?? null;
    }
    return weight < 400 ? lighter[0] ?? heavier[0] ?? null : heavier[0] ?? lighter[0] ?? null;
  }
}
function fixed(px) {
  return Math.trunc(px * 65536) / 65536;
}

// text-outliner.ts
class TextOutliner {
  fonts;
  glyphs = [];
  glyphIndex = new Map;
  forms = [];
  formIndex = new Map;
  constructor(loaded) {
    this.fonts = new OutlineFonts(loaded.flatMap((font) => OutlineFace.read(font.family, font.data) ?? []));
  }
  outline(snapshot) {
    const decoder = new PaintDecoder(snapshot.paint);
    const ops = [
      ...snapshot.engraving ? decoder.decode(snapshot.engraving.ops) : [],
      ...snapshot.fold?.strips.flatMap((strip) => decoder.decode(strip)) ?? []
    ];
    const strings = new Map(snapshot.paint.strings.map((s, i) => [s, i]));
    const fonts = [];
    const texts = [];
    const seen = new Set;
    for (const op of ops) {
      const text = textOf(op);
      const font = op.state.props.font;
      if (text === null || typeof font !== "string") {
        continue;
      }
      const key = `${font}
${text}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      const placed = this.place(font, text);
      if (!placed) {
        continue;
      }
      let fontAt = fonts.indexOf(font);
      if (fontAt < 0) {
        fontAt = fonts.push(font) - 1;
      }
      texts.push([fontAt, strings.get(text) ?? -1, ...placed]);
    }
    const outlines = {
      glyphs: this.glyphs,
      forms: this.forms,
      fonts,
      texts
    };
    return { ...snapshot, outlines };
  }
  place(font, text) {
    const parsed = CssFont.parse(font);
    const laid = parsed && this.fonts.layout(parsed, text);
    if (!parsed || !laid) {
      return null;
    }
    const placed = [];
    for (const { face, run, pens, scale } of laid.runs) {
      const skew = parsed.style !== "normal" && !face.italic ? FAKE_ITALIC : 0;
      const form = this.form(scale, skew);
      run.glyphs.forEach((glyph, i) => {
        const position = run.positions[i];
        const outline = this.glyph(face, glyph.id);
        if (position && outline !== null) {
          placed.push(outline, (pens[i] ?? 0) + position.xOffset * scale, -position.yOffset * scale, form);
        }
      });
    }
    return placed;
  }
  glyph(face, id) {
    const key = `${face.family}
${face.weight}
${face.italic}
${id}`;
    let index = this.glyphIndex.get(key);
    if (index === undefined) {
      const data = svg(face.glyph(id).path.commands);
      index = data === "" ? -1 : this.glyphs.push(data) - 1;
      this.glyphIndex.set(key, index);
    }
    return index < 0 ? null : index;
  }
  form(scale, skew) {
    const key = `${scale},${skew}`;
    let index = this.formIndex.get(key);
    if (index === undefined) {
      index = this.forms.length / 2;
      this.forms.push(scale, skew);
      this.formIndex.set(key, index);
    }
    return index;
  }
}
var FAKE_ITALIC = 0.25;
var SVG_COMMANDS = {
  moveTo: "M",
  lineTo: "L",
  quadraticCurveTo: "Q",
  bezierCurveTo: "C",
  closePath: "Z"
};
function svg(commands) {
  return commands.map(({ command, args }) => (SVG_COMMANDS[command] ?? "") + args.map((n) => Math.round(n * 10) / 10).join(" ")).join("");
}
function textOf(op) {
  return op.call.kind === "fillText" && op.call.maxWidth === undefined ? op.call.text : null;
}

// create-snapshot.ts
async function createSnapshot(input, canvas, opts = {}) {
  const config = resolveConfig(opts.config);
  const reader = new ScoreReader(new DynamicGlyphs);
  const gaps = new Gaps(config.gaps, new GapInserter(reader));
  gaps.check(input);
  const engraver = ScoreEngraver.create(config, reader, gaps, new ElementFactory, new SequenceFactory(reader, gaps));
  engraver.check();
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("createSnapshot: the canvas has no 2D context");
  }
  const fonts = new HeadlessFonts(opts.fontRegistry ?? null, opts.fonts ?? []);
  await fonts.load(config.fonts);
  const document = await new DefaultScoreParser().parse(input);
  const engraved = engraver.engrave(document, new CanvasPaintProbe(context), new DetachedViewport, { color: new InertDecoration, halo: new InertDecoration });
  return new TextOutliner(fonts.all).outline(engraved.recording.snapshot());
}
export {
  SNAPSHOT_VERSION2 as SNAPSHOT_VERSION,
  createSnapshot
};
