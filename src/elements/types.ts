import { Fragment } from './fragment';
import { Measure } from './measure';
import { Note } from './note';
import { Part } from './part';
import { Score } from './score';
import { Stave } from './stave';
import { System } from './system';
import { Voice } from './voice';

/**
 * Represents a rendered musical element.
 *
 * NOTE: The type union order is the rendering hierarchy.
 */
export type Element = Score | System | Measure | Fragment | Part | Stave | Voice | VoiceEntry;

/**
 * Leaf elements that are rendered as part of a voice.
 */
export type VoiceEntry = Note;

/**
 * Represents a rectangle with its position and dimensions.
 *
 * @property {number} x - The x-coordinate of the top-left corner of the rectangle.
 * @property {number} y - The y-coordinate of the top-left corner of the rectangle.
 * @property {number} w - The width of the rectangle.
 * @property {number} h - The height of the rectangle.
 */
export type Rect = {
  x: number;
  y: number;
  w: number;
  h: number;
};

/**
 * Represents a point in a 2D space.
 *
 * @property {number} x - The x-coordinate of the point.
 * @property {number} y - The y-coordinate of the point.
 */
export type Point = {
  x: number;
  y: number;
};
