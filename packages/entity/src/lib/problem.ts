import 'reflect-metadata';
import { Entity } from './entity.js';
import { StringProperty } from './property.js';

@Entity()
export class Problem {
  @StringProperty()
  readonly property: string;

  @StringProperty()
  readonly message: string;

  constructor(data: { property?: string; message: string }) {
    this.property = data.property ?? '';
    this.message = data.message;
  }

  toString(): string {
    return `${this.property}: ${this.message}`;
  }
}
