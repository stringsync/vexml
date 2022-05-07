import * as VF from 'vexflow';
import { CodeTracker, NotationMessage } from './types';

function factoryOrnament(factory: VF.Factory, param: { type: string; position: string }): VF.Modifier {
  const modifier = new VF.Ornament(param.type);
  modifier.setPosition(param.position);
  modifier.setContext(factory.getContext());
  return modifier;
}

export class Notations {
  private static slurStart: number[] = [-1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1];
  private static tiedStart: number[] = [-1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1];
  private static tupletStart: number[] = [-1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1];

  public static render(t: CodeTracker, factory: VF.Factory, message: NotationMessage, notes: Array<VF.Note>): void {
    switch (message.name) {
      case 'slur':
        if (message.type == 'start') {
          Notations.slurStart[message.number - 1] = notes.length - 1;
        } else if (message.type == 'stop') {
          if (Notations.slurStart[message.number - 1] >= 0) {
            factory.Curve({
              from: notes[Notations.slurStart[message.number - 1]],
              to: notes[notes.length - 1],
              options: {},
            });
            t.literal(
              `factory.Curve({from: notes[${Notations.slurStart[message.number - 1]}],` +
                `to: notes[notes.length - 1],options: {},});`
            );
            Notations.slurStart[message.number - 1] = -1;
          }
        }
        break;
      case 'tied':
        if (message.type == 'start') {
          Notations.tiedStart[message.number - 1] = notes.length - 1;
        } else if (message.type == 'stop') {
          if (Notations.tiedStart[message.number - 1] >= 0) {
            factory.Curve({
              from: notes[Notations.tiedStart[message.number - 1]],
              to: notes[notes.length - 1],
              options: {},
            });
            t.literal(
              `factory.Curve({from: notes[${Notations.tiedStart[message.number - 1]}],` +
                `to: notes[notes.length - 1],options: {},});`
            );
            Notations.tiedStart[message.number - 1] = -1;
          }
        }
        break;
      case 'tuplet':
        if (message.type == 'start') {
          Notations.tupletStart[message.number - 1] = notes.length - 1;
        } else if (message.type == 'stop') {
          if (Notations.tupletStart[message.number - 1] >= 0) {
            factory.Tuplet({
              notes: notes.slice(Notations.tupletStart[message.number - 1]) as VF.StemmableNote[],
              options: {},
            });
            t.literal(
              `factory.Tuplet({ notes: notes.slice(${Notations.tupletStart[message.number - 1]}),` + `options: {},});`
            );
            Notations.tupletStart[message.number - 1] = -1;
          }
        }
        break;
      case 'tremolo':
        notes[notes.length - 1].addModifier(new VF.Tremolo(parseInt(message.value)), 0);
        t.literal(`notes[notes.length - 1].addModifier(new VF.Tremolo(${parseInt(message.value)}), 0);`);
        break;
      case 'fingering':
        notes[notes.length - 1].addModifier(
          factory.Fingering({ number: message.value, position: message.placement ?? 'above' }),
          0
        );
        t.literal(
          `notes[notes.length - 1].addModifier(factory.Fingering({ number: '${message.value}', ` +
            `position: '${message.placement ?? 'above'}' }), 0);`
        );
        break;
      case 'string':
        notes[notes.length - 1].addModifier(
          factory.StringNumber({ number: message.value, position: message.placement ?? 'above' }),
          0
        );
        t.literal(
          `notes[notes.length - 1].addModifier(factory.StringNumber({ number: '${message.value}', ` +
            `position: '${message.placement ?? 'above'}' }), 0);`
        );
        break;
      default:
        const modifiers = this.getVexFlowNotation(factory, message.name);
        for (const modifier of modifiers) {
          if (modifier.class == 'A') {
            notes[notes.length - 1].addModifier(
              factory.Articulation({ type: modifier.type, position: message.placement ?? 'above' }),
              0
            );
            t.literal(
              `notes[notes.length - 1].addModifier(factory.Articulation({ type: '${modifier.type}', ` +
                `position: '${message.placement ?? 'above'}' }), 0);`
            );
          }
          if (modifier.class == 'O') {
            notes[notes.length - 1].addModifier(
              factoryOrnament(factory, { type: modifier.type, position: message.placement ?? 'above' }),
              0
            );
            t.literal(
              `notes[notes.length - 1].addModifier(factoryOrnament(factory, { type: '${modifier.type}', ` +
                `position: '${message.placement ?? 'above'}' }), 0);`
            );
          }
        }
    }
  }

  private static getVexFlowNotation(factory: VF.Factory, type: string): { class: string; type: string }[] {
    switch (type) {
      // MusicXML Articulations
      // **********************
      case 'accent':
        return [{ class: 'A', type: 'a>' }];
      case 'breath-mark':
        // VexFlow issue: supported as TextNote
        return [];
      case 'caesura':
        // VexFlow issue: supported as TextNote
        return [];
      case 'detached-legato':
        return [
          { class: 'A', type: 'a.' },
          { class: 'A', type: 'a-' },
        ];
      case 'doit':
        return [{ class: 'O', type: 'doit' }];
      case 'falloff':
        return [{ class: 'O', type: 'fall' }];
      case 'plop':
        // VexFlow bug: not supported
        return [];
      case 'soft-accent':
        // VexFlow bug: not supported
        return [];
      case 'scoop':
        return [{ class: 'O', type: 'scoop' }];
      case 'spiccato':
        // VexFlow bug: not supported
        return [];
      case 'staccato':
        return [{ class: 'A', type: 'a.' }];
      case 'staccatissimo':
        return [{ class: 'A', type: 'av' }];
      case 'stress':
        // VexFlow bug: not supported
        return [];
      case 'strong-accent':
        return [{ class: 'A', type: 'a^' }];
        return [];
      case 'tenuto':
        return [{ class: 'A', type: 'a-' }];
      case 'unstress':
        // VexFlow bug: not supported
        return [];
      // MusicXML Ornaments
      // ******************
      case 'trill-mark':
        return [{ class: 'O', type: 'tr' }];
      case 'turn':
        return [{ class: 'O', type: 'turn' }];
      case 'inverted-turn':
        return [{ class: 'O', type: 'turn_inverted' }];
      case 'mordent':
        return [{ class: 'O', type: 'mordent' }];
      case 'inverted-mordent':
        return [{ class: 'O', type: 'mordent_inverted' }];
      case 'schleifer':
        // VexFlow bug: not supported
        return [];
      // MusicXML Notations
      // ******************
      case 'up-bow':
        return [{ class: 'A', type: 'a|' }];
      case 'down-bow':
        return [{ class: 'A', type: 'am' }];
      case 'snap-pizzicato':
        return [{ class: 'A', type: 'ao' }];
      case 'stopped':
        return [{ class: 'A', type: 'a+' }];
      // MusicXML Notations
      // ******************
      case 'fermata':
        return [{ class: 'A', type: 'a@' }];
      default:
        return [];
    }
  }
}
