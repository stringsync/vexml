import * as data from '@/data';
import * as musicxml from '@/musicxml';
import type * as mdom from '@stringsync/mdom';
import { Config } from '@/config';
import { Logger } from '@/debug';

export class Articulation {
  private constructor(
    private config: Config,
    private log: Logger,
    private articulationType: data.ArticulationType,
    private placement: data.ArticulationPlacement
  ) {}

  static create(config: Config, log: Logger, musicXML: { note: musicxml.Note }): Articulation[] {
    const articulations = new Array<Articulation>();

    function add(articulationType: data.ArticulationType, placement: data.ArticulationPlacement) {
      articulations.push(new Articulation(config, log, articulationType, placement));
    }

    musicXML.note
      .getNotations()
      .flatMap((n) => n.getFermatas())
      .forEach((fermata) => {
        const type = fermata.getType();
        const shape = fermata.getShape();
        if (type === 'upright' && shape === 'normal') {
          add('upright-normal-fermata', 'above');
        } else if (type === 'upright' && shape === 'angled') {
          add('upright-angled-fermata', 'above');
        } else if (type === 'upright' && shape === 'square') {
          add('upright-square-fermata', 'above');
        } else if (type === 'inverted' && shape === 'normal') {
          add('inverted-normal-fermata', 'below');
        } else if (type === 'inverted' && shape === 'angled') {
          add('inverted-angled-fermata', 'below');
        } else if (type === 'inverted' && shape === 'square') {
          add('inverted-square-fermata', 'below');
        }
      });

    musicXML.note
      .getNotations()
      .flatMap((n) => n.getTechnicals())
      .forEach((technical) => {
        technical.getHarmonics().forEach(() => add('harmonic', 'above'));
        technical.getOpenStrings().forEach(() => add('open-string', 'above'));
        technical.getDoubleTongues().forEach(() => add('double-tongue', 'above'));
        technical.getTripleTongues().forEach(() => add('triple-tongue', 'above'));
        technical.getStopped().forEach(() => add('stopped', 'above'));
        technical.getSnapPizzicatos().forEach(() => add('snap-pizzicato', 'above'));
        technical.getTaps().forEach(() => add('tap', 'above'));
        technical.getHeels().forEach(() => add('heel', 'above'));
        technical.getToes().forEach(() => add('toe', 'above'));
        technical.getUpBows().forEach(() => add('upstroke', 'above'));
        technical.getDownBows().forEach(() => add('downstroke', 'above'));
      });

    musicXML.note
      .getNotations()
      .flatMap((n) => n.getArticulations())
      .forEach((articulation) => {
        articulation.getAccents().forEach((a) => add('accent', a.placement ?? 'above'));
        articulation.getStrongAccents().forEach((a) => add('strong-accent', a.placement ?? 'above'));
        articulation.getStaccatos().forEach((a) => add('staccato', a.placement ?? 'above'));
        articulation.getTenutos().forEach((a) => add('tenuto', a.placement ?? 'above'));
        articulation.getDetachedLegatos().forEach((a) => add('detached-legato', a.placement ?? 'above'));
        articulation.getStaccatissimos().forEach((a) => add('staccatissimo', a.placement ?? 'above'));
        articulation.getScoops().forEach((a) => add('scoop', a.placement ?? 'above'));
        articulation.getDoits().forEach((a) => add('doit', a.placement ?? 'above'));
        articulation.getFalloffs().forEach((a) => add('falloff', a.placement ?? 'above'));
        articulation.getBreathMarks().forEach((a) => add('breath-mark', a.placement ?? 'above'));
      });

    musicXML.note
      .getNotations()
      .flatMap((n) => n.getOrnaments())
      .forEach((ornament) => {
        ornament.getTrillMarks().forEach(() => add('trill-mark', 'above'));
        ornament.getMordents().forEach(() => add('mordent', 'above'));
        ornament.getInvertedMordents().forEach(() => add('inverted-mordent', 'above'));
      });

    musicXML.note
      .getNotations()
      .filter((n) => n.isArpeggiated())
      .flatMap((n) => n.getArpeggioDirection())
      .forEach((direction) => {
        switch (direction) {
          case 'up':
            // Yes, ROLL_DOWN is correct.
            add('arpeggio-roll-down', 'above');
            break;
          case 'down':
            // Yes, ROLL_UP is correct.
            add('arpeggio-roll-up', 'above');
            break;
          default:
            add('arpeggio-directionless', 'above');
            break;
        }
      });

    return articulations;
  }

  static fromMdom(config: Config, log: Logger, mdom: { note: mdom.Note }): Articulation[] {
    const articulations = new Array<Articulation>();
    const notations = mdom.note.childrenNamed('notations');

    function add(articulationType: data.ArticulationType, placement: data.ArticulationPlacement) {
      articulations.push(new Articulation(config, log, articulationType, placement));
    }

    function placementOf(element: mdom.MElement): data.ArticulationPlacement {
      const placement = element.getAttribute('placement');
      return placement === 'above' || placement === 'below' ? placement : 'above';
    }

    notations
      .flatMap((n) => n.childrenNamed('fermata'))
      .forEach((fermata) => {
        const type = fermata.getAttribute('type') ?? 'upright';
        const shape = fermata.text ?? 'normal';
        if (type === 'upright' && shape === 'normal') {
          add('upright-normal-fermata', 'above');
        } else if (type === 'upright' && shape === 'angled') {
          add('upright-angled-fermata', 'above');
        } else if (type === 'upright' && shape === 'square') {
          add('upright-square-fermata', 'above');
        } else if (type === 'inverted' && shape === 'normal') {
          add('inverted-normal-fermata', 'below');
        } else if (type === 'inverted' && shape === 'angled') {
          add('inverted-angled-fermata', 'below');
        } else if (type === 'inverted' && shape === 'square') {
          add('inverted-square-fermata', 'below');
        }
      });

    notations
      .flatMap((n) => n.childrenNamed('technical'))
      .forEach((technical) => {
        technical.childrenNamed('harmonic').forEach(() => add('harmonic', 'above'));
        technical.childrenNamed('open-string').forEach(() => add('open-string', 'above'));
        technical.childrenNamed('double-tongue').forEach(() => add('double-tongue', 'above'));
        technical.childrenNamed('triple-tongue').forEach(() => add('triple-tongue', 'above'));
        technical.childrenNamed('stopped').forEach(() => add('stopped', 'above'));
        technical.childrenNamed('snap-pizzicato').forEach(() => add('snap-pizzicato', 'above'));
        technical.childrenNamed('tap').forEach(() => add('tap', 'above'));
        technical.childrenNamed('heel').forEach(() => add('heel', 'above'));
        technical.childrenNamed('toe').forEach(() => add('toe', 'above'));
        technical.childrenNamed('up-bow').forEach(() => add('upstroke', 'above'));
        technical.childrenNamed('down-bow').forEach(() => add('downstroke', 'above'));
      });

    notations
      .flatMap((n) => n.childrenNamed('articulations'))
      .forEach((articulation) => {
        articulation.childrenNamed('accent').forEach((e) => add('accent', placementOf(e)));
        articulation.childrenNamed('strong-accent').forEach((e) => add('strong-accent', placementOf(e)));
        articulation.childrenNamed('staccato').forEach((e) => add('staccato', placementOf(e)));
        articulation.childrenNamed('tenuto').forEach((e) => add('tenuto', placementOf(e)));
        articulation.childrenNamed('detached-legato').forEach((e) => add('detached-legato', placementOf(e)));
        articulation.childrenNamed('staccatissimo').forEach((e) => add('staccatissimo', placementOf(e)));
        articulation.childrenNamed('scoop').forEach((e) => add('scoop', placementOf(e)));
        articulation.childrenNamed('doit').forEach((e) => add('doit', placementOf(e)));
        articulation.childrenNamed('falloff').forEach((e) => add('falloff', placementOf(e)));
        articulation.childrenNamed('breath-mark').forEach((e) => add('breath-mark', placementOf(e)));
      });

    notations
      .flatMap((n) => n.childrenNamed('ornaments'))
      .forEach((ornament) => {
        ornament.childrenNamed('trill-mark').forEach(() => add('trill-mark', 'above'));
        ornament.childrenNamed('mordent').forEach(() => add('mordent', 'above'));
        ornament.childrenNamed('inverted-mordent').forEach(() => add('inverted-mordent', 'above'));
      });

    for (const n of notations) {
      const arpeggiate = n.childrenNamed('arpeggiate');
      if (arpeggiate.length === 0) {
        continue;
      }
      switch (arpeggiate[0].getAttribute('direction')) {
        case 'up':
          // Yes, ROLL_DOWN is correct.
          add('arpeggio-roll-down', 'above');
          break;
        case 'down':
          // Yes, ROLL_UP is correct.
          add('arpeggio-roll-up', 'above');
          break;
        default:
          add('arpeggio-directionless', 'above');
          break;
      }
    }

    return articulations;
  }

  parse(): data.Articulation {
    return {
      type: 'articulation',
      articulationType: this.articulationType,
      placement: this.placement,
    };
  }
}
