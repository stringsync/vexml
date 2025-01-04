import { Fraction } from '@/util';

export const fromFractionToNoteDuration = (fraction: Fraction): [denominator: string, dots: number] => {
  function equivalent(numerator: number, denominator: number): boolean {
    return fraction.isEquivalent(new Fraction(numerator, denominator));
  }

  // no dots
  if (equivalent(1, 256)) {
    return ['1024', 0];
  }
  if (equivalent(1, 128)) {
    return ['512', 0];
  }
  if (equivalent(1, 64)) {
    return ['256', 0];
  }
  if (equivalent(1, 32)) {
    return ['128', 0];
  }
  if (equivalent(1, 16)) {
    return ['64', 0];
  }
  if (equivalent(1, 8)) {
    return ['32', 0];
  }
  if (equivalent(1, 4)) {
    return ['16', 0];
  }
  if (equivalent(1, 2)) {
    return ['8', 0];
  }
  if (equivalent(1, 1)) {
    return ['4', 0];
  }
  if (equivalent(2, 1)) {
    return ['2', 0];
  }
  if (equivalent(4, 1)) {
    return ['1', 0];
  }

  // 1 dot
  if (equivalent(3, 128)) {
    return ['256d', 1];
  }
  if (equivalent(3, 64)) {
    return ['128', 1];
  }
  if (equivalent(3, 32)) {
    return ['64', 1];
  }
  if (equivalent(3, 16)) {
    return ['32', 1];
  }
  if (equivalent(3, 8)) {
    return ['16', 1];
  }
  if (equivalent(3, 4)) {
    return ['8', 1];
  }
  if (equivalent(3, 2)) {
    return ['4', 1];
  }
  if (equivalent(3, 1)) {
    return ['2', 1];
  }
  if (equivalent(6, 1)) {
    return ['1', 1];
  }

  return ['1', 0];
};
