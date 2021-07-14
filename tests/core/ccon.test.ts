import { BufferBuilder, CCON, decodeCCONBinary, parseCCONJson, encodeCCONBinary, encodeCCONJson, InvalidCCONError } from "../../cocos/core/data/ccon";
import { TextEncoder } from 'util';

describe(`CCON`, () => {
    describe(`Json`, () => {
        function encodeAndDecode (document: unknown, chunks: Uint8Array[], chunkURLs: string[]) {
            expect(chunks).toHaveLength(chunkURLs.length);
            const ccon = new CCON(document, chunks);
            const cconJson = JSON.parse(JSON.stringify(encodeCCONJson(ccon, chunkURLs)));
            const decoded = parseCCONJson(cconJson);
            expect(decoded.chunks).toStrictEqual(chunkURLs);
            expect(decoded.document).toStrictEqual(document);
        }

        test('Zero chunks', () => {
            encodeAndDecode({}, [], []);
        });

        test('Single chunk', () => {
            encodeAndDecode({}, [new Uint8Array(0)], ['.bin']);
            encodeAndDecode({}, [new Uint8Array([1, 2, 3])], ['.bin']);
        });

        test('Multiple chunk', () => {
            encodeAndDecode({}, [
                new Uint8Array([1, 2, 3]),
                new Uint8Array([4]),
                new Uint8Array([5, 6, 7, 8]),
            ], [
                '.0.bin',
                '.1.bin',
                '.2.bin',
            ]);
        });
    });

    describe(`Binary`, () => {
        function encodeAndDecode (document: unknown, chunks: Uint8Array[], insertFrontBytes = 0, insertBackBytes = 0) {
            const ccon = new CCON(document, chunks);
            const cconBinary = encodeCCONBinary(ccon);
            let cconBinaryToDecode: Uint8Array;
            if (insertFrontBytes === 0 && insertBackBytes === 0) {
                cconBinaryToDecode = cconBinary;
            } else {
                // Simulates that not entire Uint8Array is CCON binary.
                const withFrontBytesInserted = new Uint8Array(insertFrontBytes + cconBinary.length + insertBackBytes);
                withFrontBytesInserted.set(cconBinary, insertFrontBytes);
                cconBinaryToDecode = new Uint8Array(withFrontBytesInserted.buffer, insertFrontBytes, cconBinary.length);
            }
            const decoded = decodeCCONBinary(cconBinaryToDecode);
            expect(decoded.chunks).toStrictEqual(chunks);
            expect(decoded.document).toStrictEqual(document);
        }

        test('Zero chunks', () => {
            encodeAndDecode({ foo: 'bar' }, []);
        });

        describe('Single chunk', () => {
            // Test lengths from 0 to 8, to ensure we would not suffer from alignment problem.
            test.each(Array.from({ length: 8 }, (_, index) => index))(`Chunk length: %s`, (chunkLength) => {
                encodeAndDecode({}, [new Uint8Array(Array.from({ length: chunkLength }, (_, index) => index))]);
            });
        });

        test('Multiple chunk', () => {
            encodeAndDecode({}, [
                new Uint8Array([1, 2, 3]),
                new Uint8Array([4]),
                new Uint8Array([5, 6, 7, 8]),
                new Uint8Array([4, 7, 8]),
                new Uint8Array([]),
                new Uint8Array([4, 2]),
            ]);
        });

        test('Not all bytes of underlying buffer of Uint8Array are part of CCON', () => {
            encodeAndDecode({}, [
                new Uint8Array([1, 2, 3]),
                new Uint8Array([4]),
            ], 7, 3);
        });

        describe('Invalid CCON error', () => {
            const MAGIC = 0x4E4F4343;
            const VERSION = 1;
            const textEncoder = new TextEncoder();

            test('Bad magic and version', () => {
                // Bad format: should at least contains 16 bytes
                expect(() => decodeCCONBinary(new Uint8Array([]))).toThrowError(InvalidCCONError);
                expect(() => decodeCCONBinary(new Uint8Array([1]))).toThrowError(InvalidCCONError);

                // Bad format: wrong magic
                const wrongMagicBuffer = new Uint32Array(4);
                expect(() => decodeCCONBinary(new Uint8Array(wrongMagicBuffer.buffer))).toThrowError(InvalidCCONError);

                // Bad format: wrong version
                const wrongVersionBuffer = new Uint32Array(4);
                wrongVersionBuffer[0] = MAGIC;
                expect(() => decodeCCONBinary(new Uint8Array(wrongVersionBuffer.buffer))).toThrowError(InvalidCCONError);
            });

            test('Parse json failed', () => {
                const invalidJsonBytes = textEncoder.encode('{InvalidJson');
                const bufferBuilder = new BufferBuilder();
                const invalidJsonBufferErrorHeader = new Uint32Array([
                    MAGIC,
                    VERSION,
                    0,
                    invalidJsonBytes.length,
                ]);
                bufferBuilder.append(invalidJsonBufferErrorHeader);
                bufferBuilder.append(invalidJsonBytes);
                invalidJsonBufferErrorHeader[2] = bufferBuilder.byteLength;
                expect(() => decodeCCONBinary(bufferBuilder.get())).toThrowError(InvalidCCONError);
            });
        });
    });
});
