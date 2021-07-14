import { EDITOR } from 'internal:constants';
import { warnID } from '../platform/debug';

export function reportMissingClass (id: string) {
    if (EDITOR && EditorExtends.UuidUtils.isUuid(id)) {
        id = EditorExtends.UuidUtils.decompressUuid(id);
        warnID(5301, id);
    } else {
        warnID(5302, id);
    }
}
