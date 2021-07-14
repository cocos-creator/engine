import { TEST } from 'internal:constants';

export const serializeSymbol: unique symbol = (TEST ? Symbol.for('serialize') : Symbol('[[deserialize]]')) as any;

export const deserializeSymbol: unique symbol = (TEST ? Symbol.for('deserialize') : Symbol('[[deserialize]]')) as any;
