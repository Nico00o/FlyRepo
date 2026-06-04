import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const DATA_DIR = path.resolve('data');
const STORE_PATH = path.join(DATA_DIR, 'guild-configs.json');

export async function loadStore() {
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

export async function saveStore(store) {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(STORE_PATH, `${JSON.stringify(store, null, 2)}\n`, 'utf8');
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
  const store = await loadStore();
  store[guildId] = {
    ...store[guildId],
    ...config,
    updatedAt: new Date().toISOString()
  };
  await saveStore(store);
  return store[guildId];
}

export async function upsertChannelConfig(guildId, channelId, config) {
  const store = await loadStore();
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
  await saveStore(store);
  return guildConfig.channels[channelId];
}

export async function updateChannelLastSha(guildId, channelId, lastSha) {
  const store = await loadStore();
  const guildConfig = migrateGuildConfig(store[guildId]);

  if (!guildConfig.channels?.[channelId]) {
    return null;
  }

  guildConfig.channels[channelId].lastSha = lastSha;
  guildConfig.channels[channelId].lastCheckAt = new Date().toISOString();
  guildConfig.updatedAt = new Date().toISOString();
  store[guildId] = guildConfig;
  await saveStore(store);
  return guildConfig.channels[channelId];
}

export async function deleteChannelConfig(guildId, channelId) {
  const store = await loadStore();
  const guildConfig = migrateGuildConfig(store[guildId]);
  const existed = Boolean(guildConfig.channels?.[channelId]);

  if (guildConfig.channels) {
    delete guildConfig.channels[channelId];
  }

  guildConfig.updatedAt = new Date().toISOString();
  store[guildId] = guildConfig;
  await saveStore(store);
  return existed;
}

export function findChannelConfig(guildConfig, channelId) {
  return migrateGuildConfig(guildConfig).channels?.[channelId] || null;
}

export async function deleteGuildConfig(guildId) {
  const store = await loadStore();
  const existed = Boolean(store[guildId]);
  delete store[guildId];
  await saveStore(store);
  return existed;
}
