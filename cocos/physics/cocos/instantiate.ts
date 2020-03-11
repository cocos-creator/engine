/**
 * @hidden
 */

import { instantiate } from '../framework/Physics-selector';
import { BuiltInWorld } from './builtin-world';
import { BuiltinBoxShape } from './shapes/builtin-box-shape';
import { BuiltinSphereShape } from './shapes/builtin-sphere-shape';
import { BuiltinCapsuleShape } from './shapes/builtin-capsule-shape';
import { PHYSICS_BUILTIN } from 'internal:constants';

if (PHYSICS_BUILTIN) {
    instantiate(
        BuiltinBoxShape,
        BuiltinSphereShape,
        null,
        BuiltInWorld,
        BuiltinCapsuleShape
    );
}
