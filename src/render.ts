import { Config, DEFAULT_CONFIG } from './config';
import { Logger, NoopLogger } from './debug';
import { Score } from './elements';
import { DefaultFormatter, Formatter, PanoramicFormatter } from './formatting';
import { MusicXMLParser, MXLParser } from './parsing';
import { Renderer } from './rendering';

export type RenderMusicXMLOptions = {
  config?: Partial<Config>;
  logger?: Logger;
};

export function renderMusicXML(musicXML: string, div: HTMLDivElement, opts?: RenderMusicXMLOptions): Score {
  const config = { ...DEFAULT_CONFIG, ...opts?.config };
  const logger = opts?.logger ?? new NoopLogger();

  const parser = new MusicXMLParser({ config });

  const renderer = new Renderer({ config });

  let formatter: Formatter;
  const width = config.WIDTH;
  const height = config.HEIGHT;
  if (width && height) {
    formatter = new DefaultFormatter({ config, logger });
  } else if (width) {
    formatter = new DefaultFormatter({ config, logger });
  } else if (height) {
    formatter = new PanoramicFormatter({ config, logger });
  } else {
    formatter = new PanoramicFormatter({ config, logger });
  }

  const document = parser.parse(musicXML);
  const formattedDocument = formatter.format(document);

  return renderer.render(div, formattedDocument);
}

export type RenderMXLOptions = {
  config?: Partial<Config>;
  logger?: Logger;
};

export async function renderMXL(mxl: Blob, div: HTMLDivElement, opts?: RenderMXLOptions): Promise<Score> {
  const config = { ...DEFAULT_CONFIG, ...opts?.config };
  const logger = opts?.logger ?? new NoopLogger();

  const parser = new MXLParser({ config });

  const musicXML = await parser.raw(mxl);

  return renderMusicXML(musicXML, div, { config, logger });
}
