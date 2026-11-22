import { Parser, Store } from 'n3';

/** Parse one Turtle document into a fresh store; invalid input never returns partial data. */
export function parseTurtleStore(turtle) {
  const quads = new Parser({ format: 'text/turtle' }).parse(turtle);
  return new Store(quads);
}
