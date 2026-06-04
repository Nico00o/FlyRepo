import {
  ChannelType,
  PermissionFlagsBits,
  SlashCommandBuilder
} from 'discord.js';

const repoOption = (option) =>
  option
    .setName('repo')
    .setDescription('Repositorio en formato owner/repo.')
    .setRequired(true);

export const commands = [
  new SlashCommandBuilder()
    .setName('channel')
    .setDescription('Configura canales independientes de monitoreo.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((subcommand) =>
      subcommand
        .setName('add')
        .setDescription('Agrega o actualiza un canal monitoreado.')
        .addChannelOption((option) =>
          option
            .setName('canal')
            .setDescription('Canal donde se publicaran commits.')
            .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
            .setRequired(true)
        )
        .addStringOption(repoOption)
        .addStringOption((option) =>
          option
            .setName('branch')
            .setDescription('Rama a monitorear.')
            .setRequired(false)
        )
        .addIntegerOption((option) =>
          option
            .setName('frecuencia')
            .setDescription('Frecuencia en segundos. Minimo 30.')
            .setMinValue(30)
            .setMaxValue(3600)
            .setRequired(false)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('remove')
        .setDescription('Elimina un canal monitoreado.')
        .addChannelOption((option) =>
          option
            .setName('canal')
            .setDescription('Canal a eliminar.')
            .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('list')
        .setDescription('Muestra los canales monitoreados.')
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('settings')
        .setDescription('Muestra la configuracion de un canal.')
        .addChannelOption((option) =>
          option
            .setName('canal')
            .setDescription('Canal a revisar.')
            .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
            .setRequired(true)
        )
    ),
  new SlashCommandBuilder()
    .setName('github-watch')
    .setDescription('Atajo: configura commits nuevos de un repositorio en un canal.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addStringOption(repoOption)
    .addChannelOption((option) =>
      option
        .setName('canal')
        .setDescription('Canal donde se publicaran los commits.')
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName('branch')
        .setDescription('Rama a monitorear.')
        .setRequired(false)
    ),
  new SlashCommandBuilder()
    .setName('github-status')
    .setDescription('Muestra el estado actual de GitHub Monitor.'),
  new SlashCommandBuilder()
    .setName('github-check')
    .setDescription('Revisa ahora los canales configurados y publica commits pendientes.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  new SlashCommandBuilder()
    .setName('github-stop')
    .setDescription('Detiene todas las publicaciones de GitHub Monitor.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  new SlashCommandBuilder()
    .setName('repo')
    .setDescription('Explora repositorios y analytics.')
    .addSubcommand((subcommand) =>
      subcommand
        .setName('dashboard')
        .setDescription('Muestra un dashboard premium del repositorio.')
        .addStringOption((option) =>
          option
            .setName('repo')
            .setDescription('Repositorio owner/repo. Si se omite, usa el primer configurado.')
            .setRequired(false)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('analytics')
        .setDescription('Muestra actividad reciente del repositorio.')
        .addStringOption((option) =>
          option
            .setName('repo')
            .setDescription('Repositorio owner/repo. Si se omite, usa el primer configurado.')
            .setRequired(false)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('search')
        .setDescription('Busca repositorios en GitHub.')
        .addStringOption((option) =>
          option
            .setName('query')
            .setDescription('Texto de busqueda.')
            .setRequired(true)
        )
        .addStringOption((option) =>
          option
            .setName('lenguaje')
            .setDescription('Filtrar por lenguaje.')
            .setRequired(false)
        )
        .addIntegerOption((option) =>
          option
            .setName('estrellas')
            .setDescription('Minimo de estrellas.')
            .setMinValue(0)
            .setRequired(false)
        )
    ),
  new SlashCommandBuilder()
    .setName('ranking')
    .setDescription('Muestra el ranking de contributors.')
    .addStringOption((option) =>
      option
        .setName('repo')
        .setDescription('Repositorio owner/repo. Si se omite, usa el primer configurado.')
        .setRequired(false)
    ),
  new SlashCommandBuilder()
    .setName('compare-contributors')
    .setDescription('Compara dos contributors dentro de un repositorio.')
    .addStringOption((option) =>
      option
        .setName('usuario1')
        .setDescription('Primer usuario de GitHub.')
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName('usuario2')
        .setDescription('Segundo usuario de GitHub.')
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName('repo')
        .setDescription('Repositorio owner/repo. Si se omite, usa el primer configurado.')
        .setRequired(false)
    ),
  new SlashCommandBuilder()
    .setName('help')
    .setDescription('Muestra ayuda interactiva del bot.')
];

export const commandData = commands.map((command) => command.toJSON());
