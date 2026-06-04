import { PermissionFlagsBits } from 'discord.js';
import { buildCommitMessage } from './embeds.js';
import { fetchCommitDetails, fetchLatestCommits } from './github.js';
import { getGuildChannels, loadStore, updateChannelLastSha } from './storage.js';

export function startGitHubMonitor(client, config) {
  let running = false;

  async function tick() {
    if (running) {
      return;
    }

    running = true;

    try {
      const store = await loadStore();

      for (const [guildId, guildConfig] of Object.entries(store)) {
        for (const channelConfig of getGuildChannels(guildConfig)) {
          await checkChannel(client, config, guildId, channelConfig);
        }
      }
    } catch (error) {
      console.error('Monitor tick failed:', error);
    } finally {
      running = false;
    }
  }

  setInterval(tick, config.pollIntervalMs);
  void tick();
}

export async function checkGuild(client, appConfig, guildId, guildConfig, options = {}) {
  let sent = 0;
  let reason = null;

  for (const channelConfig of getGuildChannels(guildConfig)) {
    const result = await checkChannel(client, appConfig, guildId, channelConfig, options);
    sent += result.sent;
    reason = reason || result.reason;
  }

  return { sent, reason };
}

export async function checkChannel(client, appConfig, guildId, channelConfig, options = {}) {
  const lastCheck = channelConfig.lastCheckAt ? new Date(channelConfig.lastCheckAt).getTime() : 0;
  const frequencyMs = Math.max(channelConfig.frequencySeconds || 60, 30) * 1000;

  if (!options.force && Date.now() - lastCheck < frequencyMs) {
    return { sent: 0, latestSha: channelConfig.lastSha, reason: null };
  }

  const channel = await client.channels.fetch(channelConfig.channelId).catch(() => null);

  if (!channel?.isTextBased()) {
    return { sent: 0, latestSha: channelConfig.lastSha, reason: 'No pude acceder al canal configurado.' };
  }

  const botPermissions = channel.permissionsFor(client.user);

  if (!botPermissions?.has(PermissionFlagsBits.SendMessages)) {
    return { sent: 0, latestSha: channelConfig.lastSha, reason: 'No tengo permiso para enviar mensajes en el canal configurado.' };
  }

  const { latestSha, newCommits } = await fetchLatestCommits({
    repo: channelConfig.repo,
    branch: channelConfig.branch,
    githubToken: appConfig.githubToken,
    sinceSha: channelConfig.lastSha
  });

  if (!latestSha) {
    return { sent: 0, latestSha: null, reason: 'GitHub no devolvio commits para esa rama.' };
  }

  for (const commit of newCommits) {
    const details = await fetchCommitDetails({
      repo: channelConfig.repo,
      sha: commit.sha,
      githubToken: appConfig.githubToken
    }).catch(() => null);

    await channel.send(
      buildCommitMessage({
        commit,
        details,
        repo: channelConfig.repo,
        branch: channelConfig.branch,
        channelId: channelConfig.channelId
      })
    );
  }

  await updateChannelLastSha(guildId, channelConfig.channelId, latestSha);

  return { sent: newCommits.length, latestSha, reason: null };
}
