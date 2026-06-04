import {
  Client,
  Events,
  GatewayIntentBits,
  PermissionFlagsBits
} from 'discord.js';
import {
  buildAnalyticsEmbed,
  buildChannelListEmbed,
  buildChannelSettingsEmbed,
  buildCommitDetailsEmbed,
  buildCompareEmbed,
  buildFilesEmbed,
  buildHelpButtons,
  buildHelpEmbed,
  buildRankingEmbed,
  buildRepoDashboardEmbed,
  buildSearchEmbed,
  buildStatusEmbed
} from './embeds.js';
import { getConfig } from './config.js';
import {
  fetchCommitDetails,
  fetchContributors,
  fetchLanguages,
  fetchLatestCommits,
  fetchPullRequests,
  fetchRecentCommits,
  fetchReleases,
  fetchRepositoryDetails,
  parseRepo,
  searchRepositories
} from './github.js';
import { checkGuild, startGitHubMonitor } from './monitor.js';
import { startRichPresence } from './presence.js';
import {
  deleteChannelConfig,
  deleteGuildConfig,
  findChannelConfig,
  getGuildChannels,
  loadStore,
  migrateGuildConfig,
  upsertChannelConfig
} from './storage.js';
import { instanceLabel } from './runtime.js';

const config = getConfig();

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

client.once(Events.ClientReady, (readyClient) => {
  console.log(`Logged in as ${readyClient.user.tag} (${instanceLabel})`);
  startRichPresence(readyClient, config.presence).catch((error) => {
    console.error('Presence setup failed:', error);
  });
  startGitHubMonitor(client, config);
});

client.on(Events.InteractionCreate, async (interaction) => {
  try {
    if (interaction.isButton()) {
      await handleButton(interaction);
      return;
    }

    if (!interaction.isChatInputCommand() || !interaction.guildId) {
      return;
    }

    if (interaction.commandName === 'channel') {
      await handleChannel(interaction);
    } else if (interaction.commandName === 'github-watch') {
      await handleWatch(interaction);
    } else if (interaction.commandName === 'github-status') {
      await handleStatus(interaction);
    } else if (interaction.commandName === 'github-check') {
      await handleCheck(interaction);
    } else if (interaction.commandName === 'github-stop') {
      await handleStop(interaction);
    } else if (interaction.commandName === 'repo') {
      await handleRepo(interaction);
    } else if (interaction.commandName === 'ranking') {
      await handleRanking(interaction);
    } else if (interaction.commandName === 'compare-contributors') {
      await handleCompare(interaction);
    } else if (interaction.commandName === 'help') {
      await handleHelp(interaction);
    }
  } catch (error) {
    console.error('Interaction failed:', error);

    const payload = {
      content: `No pude completar eso: ${error.message}`
    };

    if (interaction.deferred || interaction.replied) {
      await interaction.editReply(payload);
    } else {
      await interaction.reply(payload);
    }
  }
});

async function handleChannel(interaction) {
  const subcommand = interaction.options.getSubcommand();

  if (subcommand === 'add') {
    await handleChannelAdd(interaction);
  } else if (subcommand === 'remove') {
    await handleChannelRemove(interaction);
  } else if (subcommand === 'list') {
    await handleChannelList(interaction);
  } else if (subcommand === 'settings') {
    await handleChannelSettings(interaction);
  }
}

async function handleWatch(interaction) {
  await configureChannel(interaction, {
    channel: interaction.options.getChannel('canal', true),
    repoInput: interaction.options.getString('repo', true),
    branch: interaction.options.getString('branch') || 'main',
    frequencySeconds: 60
  });
}

async function handleChannelAdd(interaction) {
  await configureChannel(interaction, {
    channel: interaction.options.getChannel('canal', true),
    repoInput: interaction.options.getString('repo', true),
    branch: interaction.options.getString('branch') || 'main',
    frequencySeconds: interaction.options.getInteger('frecuencia') || 60
  });
}

async function configureChannel(interaction, { channel, repoInput, branch, frequencySeconds }) {
  await interaction.deferReply();
  assertManager(interaction, 'Necesitas permiso de administrar servidor para configurar canales.');
  assertCanSend(interaction, channel);

  const parsed = parseRepo(repoInput);
  const { latestSha } = await fetchLatestCommits({
    repo: parsed.fullName,
    branch,
    githubToken: config.githubToken
  });

  const channelConfig = await upsertChannelConfig(interaction.guildId, channel.id, {
    repo: parsed.fullName,
    branch,
    frequencySeconds,
    filters: {},
    lastSha: latestSha,
    lastCheckAt: new Date().toISOString()
  });

  await interaction.editReply({
    embeds: [buildChannelSettingsEmbed(channelConfig)]
  });
}

async function handleChannelRemove(interaction) {
  assertManager(interaction, 'Necesitas permiso de administrar servidor para eliminar canales.');
  const channel = interaction.options.getChannel('canal', true);
  const existed = await deleteChannelConfig(interaction.guildId, channel.id);

  await interaction.reply({
    content: existed
      ? `Listo, deje de monitorear <#${channel.id}>.`
      : `Ese canal no estaba configurado.`
  });
}

async function handleChannelList(interaction) {
  const store = await loadStore();
  const guildConfig = migrateGuildConfig(store[interaction.guildId]);
  await interaction.reply({ embeds: [buildChannelListEmbed(guildConfig, { instanceLabel })] });
}

async function handleChannelSettings(interaction) {
  const channel = interaction.options.getChannel('canal', true);
  const guildConfig = await getCurrentGuildConfig(interaction.guildId);
  const channelConfig = findChannelConfig(guildConfig, channel.id);

  if (!channelConfig) {
    await interaction.reply(`No hay configuracion para <#${channel.id}>.`);
    return;
  }

  await interaction.reply({ embeds: [buildChannelSettingsEmbed(channelConfig)] });
}

async function handleStatus(interaction) {
  const guildConfig = await getCurrentGuildConfig(interaction.guildId);
  await interaction.reply({ embeds: [buildStatusEmbed(guildConfig, { instanceLabel })] });
}

async function handleCheck(interaction) {
  await interaction.deferReply();
  assertManager(interaction, 'Necesitas permiso de administrar servidor para revisar manualmente.');

  const guildConfig = await getCurrentGuildConfig(interaction.guildId);

  if (getGuildChannels(guildConfig).length === 0) {
    await interaction.editReply('Todavia no hay canales configurados. Usa `/channel add` para empezar.');
    return;
  }

  const result = await checkGuild(interaction.client, config, interaction.guildId, guildConfig, { force: true });

  if (result.reason) {
    await interaction.editReply(result.reason);
    return;
  }

  await interaction.editReply(
    result.sent > 0
      ? `Listo, publique ${result.sent} commit${result.sent === 1 ? '' : 's'} pendiente${result.sent === 1 ? '' : 's'}.`
      : 'Revise GitHub y no hay commits nuevos pendientes.'
  );
}

async function handleStop(interaction) {
  assertManager(interaction, 'Necesitas permiso de administrar servidor para detener esto.');
  const existed = await deleteGuildConfig(interaction.guildId);

  await interaction.reply({
    content: existed
      ? 'Listo, detuve todas las publicaciones de GitHub Monitor en este servidor.'
      : 'No habia configuraciones activas para este servidor.'
  });
}

async function handleRepo(interaction) {
  const subcommand = interaction.options.getSubcommand();

  if (subcommand === 'dashboard') {
    await handleRepoDashboard(interaction);
  } else if (subcommand === 'analytics') {
    await handleRepoAnalytics(interaction);
  } else if (subcommand === 'search') {
    await handleRepoSearch(interaction);
  }
}

async function handleRepoDashboard(interaction) {
  await interaction.deferReply();
  const repo = await resolveRepoOption(interaction);
  const [repository, languages, contributors, release, pullRequests, commits] = await Promise.all([
    fetchRepositoryDetails({ repo, githubToken: config.githubToken }),
    fetchLanguages({ repo, githubToken: config.githubToken }),
    fetchContributors({ repo, githubToken: config.githubToken, perPage: 100 }),
    fetchReleases({ repo, githubToken: config.githubToken }),
    fetchPullRequests({ repo, githubToken: config.githubToken }),
    fetchRecentCommits({ repo, githubToken: config.githubToken, perPage: 30 })
  ]);

  await interaction.editReply({
    embeds: [buildRepoDashboardEmbed({ repo, repository, languages, contributors, release, pullRequests, commits })]
  });
}

async function handleRepoAnalytics(interaction) {
  await interaction.deferReply();
  const repo = await resolveRepoOption(interaction);
  const branch = await resolveBranchForRepo(interaction.guildId, repo);
  const commits = await fetchRecentCommits({ repo, branch, githubToken: config.githubToken, perPage: 30 });

  await interaction.editReply({
    embeds: [buildAnalyticsEmbed({ repo, commits })]
  });
}

async function handleRepoSearch(interaction) {
  await interaction.deferReply();
  const query = interaction.options.getString('query', true);
  const language = interaction.options.getString('lenguaje');
  const minStars = interaction.options.getInteger('estrellas');
  const results = await searchRepositories({ query, language, minStars, githubToken: config.githubToken });

  await interaction.editReply({
    embeds: [buildSearchEmbed({ query, results })]
  });
}

async function handleRanking(interaction) {
  await interaction.deferReply();
  const repo = await resolveRepoOption(interaction);
  const contributors = await fetchContributors({ repo, githubToken: config.githubToken, perPage: 100 });

  await interaction.editReply({
    embeds: [buildRankingEmbed({ repo, contributors })]
  });
}

async function handleCompare(interaction) {
  await interaction.deferReply();
  const repo = await resolveRepoOption(interaction);
  const username1 = interaction.options.getString('usuario1', true);
  const username2 = interaction.options.getString('usuario2', true);
  const contributors = await fetchContributors({ repo, githubToken: config.githubToken, perPage: 100 });
  const first = contributors.find((item) => item.login.toLowerCase() === username1.toLowerCase());
  const second = contributors.find((item) => item.login.toLowerCase() === username2.toLowerCase());

  if (!first || !second) {
    throw new Error('No encontre a uno de esos usuarios en el top 100 de contributors del repo.');
  }

  await interaction.editReply({
    embeds: [buildCompareEmbed({ repo, first, second })]
  });
}

async function handleHelp(interaction) {
  await interaction.reply({
    embeds: [buildHelpEmbed()],
    components: buildHelpButtons()
  });
}

async function handleButton(interaction) {
  const [type, channelId, sha] = interaction.customId.split(':');

  if (type === 'help') {
    const category = channelId;
    await interaction.update({
      embeds: [buildHelpEmbed(category)],
      components: buildHelpButtons(category)
    });
    return;
  }

  if (!interaction.guildId || !['commit_more', 'commit_files'].includes(type)) {
    return;
  }

  await interaction.deferReply({ ephemeral: true });
  const guildConfig = await getCurrentGuildConfig(interaction.guildId);
  const channelConfig = findChannelConfig(guildConfig, channelId);

  if (!channelConfig) {
    await interaction.editReply('No encontre la configuracion de ese canal.');
    return;
  }

  const commit = await fetchCommitDetails({
    repo: channelConfig.repo,
    sha,
    githubToken: config.githubToken
  });

  if (type === 'commit_more') {
    const contributors = await fetchContributors({
      repo: channelConfig.repo,
      githubToken: config.githubToken,
      perPage: 100
    }).catch(() => []);

    await interaction.editReply({
      embeds: [buildCommitDetailsEmbed({
        commit,
        repo: channelConfig.repo,
        branch: channelConfig.branch,
        contributors
      })]
    });
    return;
  }

  await interaction.editReply({
    embeds: [buildFilesEmbed({ commit, repo: channelConfig.repo })]
  });
}

async function getCurrentGuildConfig(guildId) {
  const store = await loadStore();
  return migrateGuildConfig(store[guildId]);
}

async function resolveRepoOption(interaction) {
  const repoInput = interaction.options.getString('repo');

  if (repoInput) {
    return parseRepo(repoInput).fullName;
  }

  const guildConfig = await getCurrentGuildConfig(interaction.guildId);
  const firstChannel = getGuildChannels(guildConfig)[0];

  if (!firstChannel) {
    throw new Error('No hay repos configurados. Pasa `repo:owner/repo` o usa `/channel add`.');
  }

  return firstChannel.repo;
}

async function resolveBranchForRepo(guildId, repo) {
  const guildConfig = await getCurrentGuildConfig(guildId);
  const channel = getGuildChannels(guildConfig).find((item) => item.repo.toLowerCase() === repo.toLowerCase());
  return channel?.branch || 'main';
}

function assertManager(interaction, message) {
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
    throw new Error(message);
  }
}

function assertCanSend(interaction, channel) {
  const permissions = channel.permissionsFor(interaction.client.user);

  if (!permissions?.has(PermissionFlagsBits.SendMessages)) {
    throw new Error(`No tengo permiso para enviar mensajes en #${channel.name}.`);
  }
}

await client.login(config.discordToken);
