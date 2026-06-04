import 'dotenv/config';

const required = ['DISCORD_TOKEN', 'DISCORD_CLIENT_ID'];

export function getConfig() {
  const missing = required.filter((name) => !process.env[name]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  return {
    discordToken: process.env.DISCORD_TOKEN,
    discordClientId: process.env.DISCORD_CLIENT_ID,
    githubToken: process.env.GITHUB_TOKEN || null,
    pollIntervalMs: Math.max(Number(process.env.POLL_INTERVAL_SECONDS || 60), 30) * 1000,
    presence: {
      status: process.env.BOT_STATUS || 'online',
      text: process.env.BOT_PRESENCE_TEXT || 'GitHub activity',
      refreshSeconds: Math.max(Number(process.env.BOT_PRESENCE_REFRESH_SECONDS || 45), 15)
    }
  };
}
