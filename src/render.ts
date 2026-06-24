import { MDOMParser, type MDocument } from "@stringsync/mdom";
import { Formatter, Renderer, Stave, StaveNote, Voice } from "vexflow";

export type RenderOptions = {
  config?: { WIDTH?: number; [key: string]: unknown };
};

export async function render(
  input: string | Blob,
  element: HTMLElement,
  options?: RenderOptions,
) {
  if (typeof input === "string") {
    return renderMusicXML(input, element, options);
  }
  if (input instanceof Blob) {
    return renderMXL(input, element, options);
  }
  throw new TypeError("render: input is not a string or Blob");
}

function renderMDoc(
  _mdoc: MDocument,
  element: HTMLElement,
  options?: RenderOptions,
) {
  // ponytail: placeholder — draws a fixed measure so the visual harness has something to
  // baseline. Replace with the real MDocument -> vexflow mapping; keep this signature.
  const width = options?.config?.WIDTH ?? 500;

  // vexflow's type only admits div/canvas; the SVG backend appends a child to any element.
  const renderer = new Renderer(
    element as HTMLDivElement,
    Renderer.Backends.SVG,
  );
  renderer.resize(width, 200);
  const context = renderer.getContext();

  const stave = new Stave(10, 40, width - 20);
  stave.addClef("treble").addTimeSignature("4/4").setContext(context).draw();

  const notes = [
    new StaveNote({ keys: ["c/4"], duration: "q" }),
    new StaveNote({ keys: ["e/4"], duration: "q" }),
    new StaveNote({ keys: ["g/4"], duration: "q" }),
    new StaveNote({ keys: ["c/5"], duration: "q" }),
  ];

  const voice = new Voice({ numBeats: 4, beatValue: 4 }).addTickables(notes);
  new Formatter().joinVoices([voice]).format([voice], width - 50);
  voice.draw(context, stave);
}

function renderMusicXML(
  musicXML: string,
  element: HTMLElement,
  options?: RenderOptions,
) {
  const parser = new MDOMParser();
  const mdoc = parser.parseFromString(musicXML);
  return renderMDoc(mdoc, element, options);
}

async function renderMXL(
  mxl: Blob,
  element: HTMLElement,
  options?: RenderOptions,
) {
  const parser = new MDOMParser();
  const mdoc = await parser.parseFromBlob(mxl);
  return renderMDoc(mdoc, element, options);
}
