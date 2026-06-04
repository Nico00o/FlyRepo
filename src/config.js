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
    pollIntervalMs: Math.max(Number(process.env.POLL_INTERVAL_SECONDS || 60), 30) * 1000
  };
}
