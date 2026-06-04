import os from 'node:os';
import { randomUUID } from 'node:crypto';

export const instanceId = randomUUID().slice(0, 8);
export const instanceLabel = `${os.hostname()}:${instanceId}`;
