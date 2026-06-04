import { ActivityType } from 'discord.js';
import { getGuildChannels, loadStore } from './storage.js';

const validStatuses = new Set(['online', 'idle', 'dnd', 'invisible']);

export async function startRichPresence(client, presenceConfig) {
  await updateRichPresence(client, presenceConfig);

  const refreshMs = (presenceConfig.refreshSeconds || 45) * 1000;
  return setInterval(() => {
    updateRichPresence(client, presenceConfig).catch((error) => {
      console.error('Presence update failed:', error);
    });
  }, refreshMs);
}

async function updateRichPresence(client, presenceConfig) {
  const store = await loadStore();
  const channels = Object.values(store).flatMap((guildConfig) => getGuildChannels(guildConfig));
  const uniqueRepos = new Set(channels.map((channel) => channel.repo));
  const status = validStatuses.has(presenceConfig.status) ? presenceConfig.status : 'online';
  const activities = buildActivities({
    customText: presenceConfig.text,
    repoCount: uniqueRepos.size,
    channelCount: channels.length
  });
  const activity = activities[Math.floor(Date.now() / ((presenceConfig.refreshSeconds || 45) * 1000)) % activities.length];

  client.user.setPresence({
    status,
    activities: [activity]
  });
}

function buildActivities({ customText, repoCount, channelCount }) {
  const repoLabel = repoCount === 1 ? '1 repo' : `${repoCount} repos`;
  const channelLabel = channelCount === 1 ? '1 canal' : `${channelCount} canales`;

  return [
    {
      name: customText || 'GitHub activity',
      type: ActivityType.Playing
    },
    {
      name: `${repoLabel} en GitHub`,
      type: ActivityType.Watching
    },
    {
      name: `${channelLabel} de commits`,
      type: ActivityType.Listening
    }
  ];
}
