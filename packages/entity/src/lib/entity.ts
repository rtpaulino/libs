import { PROPERTY_METADATA_KEY } from './types.js';

export class EntityUtils {
  getPropertyKeys(target: Object): string[] {
    return Reflect.getMetadata(PROPERTY_METADATA_KEY, target) || [];
  }
}
