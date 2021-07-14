import { TEST } from 'internal:constants';

export const serializeTag = Symbol('[[Serialize]]');

export const deserializeTag = Symbol('[[Deserialize]]');

export interface SerializationInput {
    /**
     * Reads a property from input.
     * @param name Property name.
     * @returns The property's value, after deserialized.
     */
    readProperty(name: string): unknown;

    /**
     * Deserializes this object according to the original procedure.
     */
    readThis(): void;

    /**
      * Deserializes super according to the original procedure.
      */
    readSuper(): void;
}

export interface SerializationOutput {
    /**
     * Writes a property into output.
     * @param name Property name.
     * @param value Property value.
     */
    writeProperty(name: string, value: unknown): void;

    /**
     * Serialize this object according to the original procedure.
     */
    writeThis(): void;

    /**
     * Serialize super according to the original procedure.
     */
    writeSuper(): void;
}

export type SerializationContext = {
    /**
     * The root value passed to serialization procedure.
     */
    root: unknown;

    /**
     * Customized arguments passed to serialization procedure.
     */
    customArguments: Record<PropertyKey, unknown>
};

export type DeserializationContext = {
};

export interface CustomSerializable {
    [serializeTag](output: SerializationOutput, context: SerializationContext): void;

    [deserializeTag]?(input: SerializationInput, context: DeserializationContext): void;
}
