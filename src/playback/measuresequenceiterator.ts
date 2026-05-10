import * as util from '@/util';

type Measure = {
  index: number;
  jumps: Jump[];
};

type Jump = { type: 'repeatstart' } | { type: 'repeatend'; times: number } | { type: 'repeatending'; times: number };

/**
 * Iterates over measure indices in playback order, expanding repeats and voltas.
 *
 * Runs in two phases:
 *   1. Pre-scan the measures once, building a structural map: which `repeatend`s
 *      pair with which `repeatstart`s, and which contiguous `repeatending` runs
 *      form volta groups.
 *   2. Walk the measures linearly, consulting the map to decide when to back-jump
 *      and when to skip an exhausted volta ending.
 */
export class MeasureSequenceIterator<T extends Measure> implements Iterable<number> {
  constructor(private measures: T[]) {}

  [Symbol.iterator](): Iterator<number> {
    return computeSequence(this.measures)[Symbol.iterator]();
  }
}

type RepeatEnd = { measureIndex: number; startIndex: number; times: number };

type VoltaEnding = { measureIndex: number; times: number; startPass: number; endPass: number };

type Volta = { startIndex: number; endings: VoltaEnding[]; totalPasses: number };

type Structure = {
  repeatEndsByMeasure: Map<number, RepeatEnd>;
  voltas: Volta[];
  endingByMeasure: Map<number, { volta: Volta; ending: VoltaEnding }>;
};

function computeSequence(measures: Measure[]): number[] {
  const structure = analyzeStructure(measures);
  return walk(measures, structure);
}

function analyzeStructure(measures: Measure[]): Structure {
  const repeatEndsByMeasure = new Map<number, RepeatEnd>();
  const voltas: Volta[] = [];
  const endingByMeasure = new Map<number, { volta: Volta; ending: VoltaEnding }>();

  const startStack = new util.Stack<number>();
  let currentVolta: Volta | null = null;

  for (let i = 0; i < measures.length; i++) {
    const jumps = measures[i].jumps;

    for (const jump of jumps) {
      if (jump.type === 'repeatstart') {
        startStack.push(i);
      }
    }

    const endingJump = findJump(jumps, 'repeatending');

    if (endingJump) {
      if (currentVolta === null) {
        currentVolta = { startIndex: startStack.peek() ?? 0, endings: [], totalPasses: 0 };
        voltas.push(currentVolta);
      }
      const ending: VoltaEnding = {
        measureIndex: i,
        times: endingJump.times,
        startPass: 0,
        endPass: 0,
      };
      currentVolta.endings.push(ending);
      endingByMeasure.set(i, { volta: currentVolta, ending });
      // A `repeatend` co-located with a `repeatending` is intentionally dropped.
      continue;
    }

    if (currentVolta !== null) {
      if (startStack.peek() === currentVolta.startIndex) {
        startStack.pop();
      }
      currentVolta = null;
    }

    const endJump = findJump(jumps, 'repeatend');
    if (endJump) {
      const startIndex = startStack.pop() ?? 0;
      repeatEndsByMeasure.set(i, { measureIndex: i, startIndex, times: endJump.times });
    }
  }

  // Close any volta that runs to the end of the score.
  if (currentVolta !== null && startStack.peek() === currentVolta.startIndex) {
    startStack.pop();
  }

  for (const volta of voltas) {
    // A `repeatending` with `times: 0` on the LAST ending is the standard
    // "discontinue" volta: it plays once on the final pass with no back-jump.
    // Treat it as `times: 1` for pass-range purposes.
    const lastIndex = volta.endings.length - 1;
    let pass = 1;
    for (let i = 0; i < volta.endings.length; i++) {
      const ending = volta.endings[i];
      const effective = i === lastIndex && ending.times === 0 ? 1 : ending.times;
      ending.startPass = pass;
      ending.endPass = pass + effective - 1;
      pass += effective;
    }
    const sum = pass - 1;
    // A single-ending volta whose ending has a back-jump (`times > 0`) needs an
    // implicit "+1" pass for the run-past-the-now-exhausted-ending step. In every
    // other shape the volta naturally exits on its final ending.
    const last = volta.endings[lastIndex];
    const needsImplicitFinalPass = volta.endings.length === 1 && last.times > 0;
    volta.totalPasses = needsImplicitFinalPass ? sum + 1 : sum;
  }

  return { repeatEndsByMeasure, voltas, endingByMeasure };
}

function walk(measures: Measure[], structure: Structure): number[] {
  const result: number[] = [];
  const remainingBackJumps = new Map<number, number>();
  const voltaPass = new Map<Volta, number>();

  let i = 0;
  while (i < measures.length) {
    const endingHit = structure.endingByMeasure.get(i);

    if (endingHit) {
      const pass = voltaPass.get(endingHit.volta) ?? 1;
      if (pass < endingHit.ending.startPass || pass > endingHit.ending.endPass) {
        i++;
        continue;
      }
    }

    result.push(measures[i].index);

    if (endingHit) {
      const { volta } = endingHit;
      const nextPass = (voltaPass.get(volta) ?? 1) + 1;
      if (nextPass > volta.totalPasses) {
        voltaPass.delete(volta);
        i++;
      } else {
        voltaPass.set(volta, nextPass);
        resetNestedState(structure, remainingBackJumps, voltaPass, volta.startIndex, i);
        i = volta.startIndex;
      }
      continue;
    }

    const repeatEnd = structure.repeatEndsByMeasure.get(i);
    if (repeatEnd) {
      if (repeatEnd.times === 0) {
        i++;
        continue;
      }
      const remaining = remainingBackJumps.get(i) ?? repeatEnd.times;
      if (remaining > 0) {
        remainingBackJumps.set(i, remaining - 1);
        resetNestedState(structure, remainingBackJumps, voltaPass, repeatEnd.startIndex, i);
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

/**
 * Resets state for repeat-ends and voltas nested strictly inside the range we're
 * jumping back over, so their counters re-initialize on the next pass through the
 * outer block.
 */
function resetNestedState(
  structure: Structure,
  remainingBackJumps: Map<number, number>,
  voltaPass: Map<Volta, number>,
  startIndex: number,
  endIndex: number
): void {
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

function findJump<K extends Jump['type']>(jumps: Jump[], type: K): Extract<Jump, { type: K }> | undefined {
  return jumps.find((jump): jump is Extract<Jump, { type: K }> => jump.type === type);
}
