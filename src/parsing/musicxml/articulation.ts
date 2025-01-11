import * as data from '@/data';
import * as musicxml from '@/musicxml';

export class Articulation {
  private constructor(private articulationType: data.ArticulationType, private placement: data.ArticulationPlacement) {}

  static create(musicXML: { note: musicxml.Note }): Articulation[] {
    const articulations = new Array<Articulation>();

    function add(articulationType: data.ArticulationType, placement: data.ArticulationPlacement) {
      articulations.push(new Articulation(articulationType, placement));
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

  parse(): data.Articulation {
    return {
      type: 'articulation',
      articulationType: this.articulationType,
      placement: this.placement,
    };
  }
}
