import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Pool } from 'pg';

const ROOT_DIR = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const DATA_DIR = path.resolve(
  process.env.BOT_DATA_DIR ||
  process.env.RAILWAY_VOLUME_MOUNT_PATH ||
  (process.env.RAILWAY_PROJECT_ID ? '/data' : path.join(ROOT_DIR, 'data'))
);
const STORE_PATH = path.join(DATA_DIR, 'guild-configs.json');
const STORE_KEY = 'guild-configs';
const DATABASE_URL = process.env.DATABASE_URL || '';
let storeWriteQueue = Promise.resolve();
let pool = null;
let databaseReady = false;

export function getStorePath() {
  if (DATABASE_URL) {
    return 'PostgreSQL DATABASE_URL';
  }

  return STORE_PATH;
}

function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: DATABASE_URL,
      ssl: process.env.PGSSLMODE === 'require' ? { rejectUnauthorized: false } : undefined
    });
  }

  return pool;
}

async function ensureDatabaseStore(client = getPool()) {
  if (databaseReady) {
    return;
  }

  await client.query(`
    CREATE TABLE IF NOT EXISTS bot_store (
      key text PRIMARY KEY,
      value jsonb NOT NULL,
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `);
  databaseReady = true;
}

async function readStore() {
  if (DATABASE_URL) {
    await ensureDatabaseStore();
    const result = await getPool().query('SELECT value FROM bot_store WHERE key = $1', [STORE_KEY]);
    return migrateStore(result.rows[0]?.value || {});
  }

  try {
    const raw = await readFile(STORE_PATH, 'utf8');
    return migrateStore(JSON.parse(raw));
  } catch (error) {
    if (error.code === 'ENOENT') {
      return {};
    }

    throw error;
  }
}

async function writeStore(store) {
  if (DATABASE_URL) {
    await ensureDatabaseStore();
    await getPool().query(
      `
        INSERT INTO bot_store (key, value, updated_at)
        VALUES ($1, $2::jsonb, now())
        ON CONFLICT (key)
        DO UPDATE SET value = EXCLUDED.value, updated_at = now()
      `,
      [STORE_KEY, JSON.stringify(migrateStore(store))]
    );
    return;
  }

  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(STORE_PATH, `${JSON.stringify(store, null, 2)}\n`, 'utf8');
}

export async function loadStore() {
  await storeWriteQueue;
  return readStore();
}

export async function saveStore(store) {
  return queueStoreMutation(async () => {
    await writeStore(migrateStore(store));
    return store;
  });
}

async function updateStore(mutator) {
  if (DATABASE_URL) {
    const client = await getPool().connect();

    try {
      await client.query('BEGIN');
      await ensureDatabaseStore(client);
      await client.query('SELECT pg_advisory_xact_lock(hashtext($1), 0)', [STORE_KEY]);

      const current = await client.query('SELECT value FROM bot_store WHERE key = $1', [STORE_KEY]);
      const store = migrateStore(current.rows[0]?.value || {});
      const result = await mutator(store);

      await client.query(
        `
          INSERT INTO bot_store (key, value, updated_at)
          VALUES ($1, $2::jsonb, now())
          ON CONFLICT (key)
          DO UPDATE SET value = EXCLUDED.value, updated_at = now()
        `,
        [STORE_KEY, JSON.stringify(migrateStore(store))]
      );
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {});
      throw error;
    } finally {
      client.release();
    }
  }

  return queueStoreMutation(async () => {
    const store = await readStore();
    const result = await mutator(store);
    await writeStore(store);
    return result;
  });
}

function queueStoreMutation(action) {
  const next = storeWriteQueue.then(action, action);
  storeWriteQueue = next.catch(() => {});
  return next;
}

export function migrateGuildConfig(config = {}) {
  if (config.channels) {
    return {
      channels: config.channels,
      updatedAt: config.updatedAt
    };
  }

  if (config.repo && config.channelId) {
    return {
      channels: {
        [config.channelId]: {
          channelId: config.channelId,
          repo: config.repo,
          branch: config.branch || 'main',
          frequencySeconds: config.frequencySeconds || 60,
          filters: config.filters || {},
          lastSha: config.lastSha || null,
          updatedAt: config.updatedAt
        }
      },
      updatedAt: config.updatedAt
    };
  }

  return { channels: {}, updatedAt: config.updatedAt };
}

export function migrateStore(store) {
  return Object.fromEntries(
    Object.entries(store || {}).map(([guildId, config]) => [guildId, migrateGuildConfig(config)])
  );
}

export function getGuildChannels(guildConfig) {
  return Object.values(migrateGuildConfig(guildConfig).channels || {});
}

export async function upsertGuildConfig(guildId, config) {
  return updateStore((store) => {
    store[guildId] = {
      ...store[guildId],
      ...config,
      updatedAt: new Date().toISOString()
    };
    return store[guildId];
  });
}

export async function upsertChannelConfig(guildId, channelId, config) {
  return updateStore((store) => {
    const guildConfig = migrateGuildConfig(store[guildId]);
    const existingChannels = guildConfig.channels || {};

    if (!existingChannels[channelId] && Object.keys(existingChannels).length >= 3) {
      throw new Error('Este servidor ya tiene 3 canales configurados. Elimina uno con `/channel remove`.');
    }

    guildConfig.channels = {
      ...existingChannels,
      [channelId]: {
        ...existingChannels[channelId],
        ...config,
        channelId,
        updatedAt: new Date().toISOString()
      }
    };
    guildConfig.updatedAt = new Date().toISOString();
    store[guildId] = guildConfig;
    return guildConfig.channels[channelId];
  });
}

export async function updateChannelLastSha(guildId, channelId, lastSha) {
  return updateStore((store) => {
    const guildConfig = migrateGuildConfig(store[guildId]);

    if (!guildConfig.channels?.[channelId]) {
      return null;
    }

    guildConfig.channels[channelId].lastSha = lastSha;
    guildConfig.channels[channelId].lastCheckAt = new Date().toISOString();
    guildConfig.updatedAt = new Date().toISOString();
    store[guildId] = guildConfig;
    return guildConfig.channels[channelId];
  });
}

export async function deleteChannelConfig(guildId, channelId) {
  return updateStore((store) => {
    const guildConfig = migrateGuildConfig(store[guildId]);
    const existed = Boolean(guildConfig.channels?.[channelId]);

    if (guildConfig.channels) {
      delete guildConfig.channels[channelId];
    }

    guildConfig.updatedAt = new Date().toISOString();
    store[guildId] = guildConfig;
    return existed;
  });
}

export function findChannelConfig(guildConfig, channelId) {
  return migrateGuildConfig(guildConfig).channels?.[channelId] || null;
}

export async function deleteGuildConfig(guildId) {
  return updateStore((store) => {
    const existed = Boolean(store[guildId]);
    delete store[guildId];
    return existed;
  });
}
