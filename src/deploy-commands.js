import { REST, Routes } from 'discord.js';
import { commandData } from './commands.js';
import { getConfig } from './config.js';

const config = getConfig();
const rest = new REST({ version: '10' }).setToken(config.discordToken);

await rest.put(
  Routes.applicationCommands(config.discordClientId),
  { body: commandData }
);

console.log('Discord slash commands registered.');
