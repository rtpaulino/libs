import { createHash } from 'crypto';

export function sha1(buffer: Buffer): string {
  return createHash('sha1').update(buffer).digest('hex');
}
