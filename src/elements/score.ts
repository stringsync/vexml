import * as vexflow from 'vexflow';
import { System } from './system';
import { Title } from './title';

export class Score {
  constructor(private ctx: vexflow.RenderContext, private title: Title, private systems: System[]) {}

  draw() {}
}
