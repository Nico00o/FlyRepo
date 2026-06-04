import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder
} from 'discord.js';
import { compactNumber, progressBar, repoUrl, timeAgo, truncate } from './format.js';

const githubDark = 0x0d1117;
const githubGreen = 0x2ea043;
const githubBlue = 0x58a6ff;
const githubGold = 0xd29922;

export function buildCommitMessage({ commit, details, repo, branch, channelId }) {
  const stats = details?.stats || {};
  const shortSha = commit.sha.slice(0, 7);
  const message = commit.commit.message.split('\n')[0] || 'Commit sin mensaje';
  const authorName = commit.author?.login || commit.commit.author?.name || 'Autor desconocido';
  const authorAvatar = commit.author?.avatar_url;
  const commitUrl = commit.html_url;
  const additions = stats.additions ?? 0;
  const deletions = stats.deletions ?? 0;
  const total = stats.total ?? additions + deletions;

  const embed = new EmbedBuilder()
    .setColor(githubGreen)
    .setTitle('Nuevo Commit Detectado')
    .setURL(commitUrl)
    .setAuthor({
      name: `${repo} - ${branch}`,
      iconURL: 'https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png',
      url: repoUrl(repo)
    })
    .setDescription(`**${truncate(message, 240)}**`)
    .addFields(
      { name: 'Repositorio', value: `[\`${repo}\`](${repoUrl(repo)})`, inline: true },
      { name: 'Autor', value: commit.author?.html_url ? `[${authorName}](${commit.author.html_url})` : authorName, inline: true },
      { name: 'Rama', value: `\`${branch}\``, inline: true },
      { name: 'Commit', value: `[\`${shortSha}\`](${commitUrl})`, inline: true },
      { name: 'Fecha', value: timeAgo(commit.commit.author?.date || Date.now()), inline: true },
      { name: 'Cambios', value: `+\`${additions}\`  -\`${deletions}\`  total \`${total}\``, inline: true }
    )
    .setTimestamp(new Date(commit.commit.author?.date || Date.now()))
    .setFooter({ text: 'GitHub Monitor - actividad en tiempo real' });

  if (authorAvatar) {
    embed.setThumbnail(authorAvatar);
  }

  return {
    embeds: [embed],
    components: [buildCommitButtons(channelId, commit.sha, commitUrl)]
  };
}

function buildCommitButtons(channelId, sha, commitUrl) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`commit_more:${channelId}:${sha}`)
      .setLabel('Mostrar mas')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`commit_files:${channelId}:${sha}`)
      .setLabel('Ver archivos')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setLabel('Abrir en GitHub')
      .setURL(commitUrl)
      .setStyle(ButtonStyle.Link)
  );
}

export function buildCommitDetailsEmbed({ commit, repo, branch, contributors = [] }) {
  const shortSha = commit.sha.slice(0, 7);
  const stats = commit.stats || {};
  const authorLogin = commit.author?.login || commit.commit.author?.name || 'Autor desconocido';
  const contributorIndex = contributors.findIndex((contributor) => contributor.login === commit.author?.login);
  const contributor = contributorIndex >= 0 ? contributors[contributorIndex] : null;
  const totalContributions = contributors.reduce((sum, item) => sum + (item.contributions || 0), 0);
  const contributionPercent = contributor && totalContributions
    ? (contributor.contributions / totalContributions) * 100
    : 0;
  const additions = stats.additions || 0;
  const deletions = stats.deletions || 0;
  const total = stats.total || additions + deletions || 1;

  const embed = new EmbedBuilder()
    .setColor(githubBlue)
    .setTitle(`Commit ${shortSha}`)
    .setURL(commit.html_url)
    .setAuthor({
      name: `${repo} - vista avanzada`,
      iconURL: 'https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png',
      url: repoUrl(repo)
    })
    .setDescription(truncate(commit.commit.message, 700))
    .addFields(
      { name: 'Hash corto', value: `\`${shortSha}\``, inline: true },
      { name: 'Hash completo', value: `\`${commit.sha}\``, inline: false },
      { name: 'Rama', value: `\`${branch}\``, inline: true },
      { name: 'Fecha exacta', value: `<t:${Math.floor(new Date(commit.commit.author.date).getTime() / 1000)}:F>`, inline: true },
      { name: 'Tiempo', value: timeAgo(commit.commit.author.date), inline: true },
      { name: 'Cambios realizados', value: `+\`${additions}\`  -\`${deletions}\`  total \`${stats.total || 0}\`\n${progressBar((additions / total) * 100)}` },
      { name: 'Contributor', value: contributor ? `**${authorLogin}**\nCommit #${contributor.contributions} en este repo\nRanking #${contributorIndex + 1} de ${contributors.length}\n${progressBar(contributionPercent)}` : `**${authorLogin}**\nSin ranking disponible.` },
      { name: 'Insights', value: buildCommitInsights(commit, additions, deletions, contributorIndex) }
    )
    .setFooter({ text: 'GitHub Monitor - analisis del commit' });

  if (commit.author?.avatar_url) {
    embed.setThumbnail(commit.author.avatar_url);
  }

  return embed;
}

function buildCommitInsights(commit, additions, deletions, contributorIndex) {
  const total = additions + deletions;
  const sizeLabel = total > 200 ? 'Commit grande' : total > 50 ? 'Commit mediano' : 'Commit preciso';
  const balance = additions >= deletions ? 'Mayormente agrega codigo' : 'Mayormente elimina codigo';
  const ranking = contributorIndex >= 0 && contributorIndex < 3 ? 'Contributor top del repositorio' : 'Actividad registrada';
  return `**Actividad:** ${sizeLabel}\n**Balance:** ${balance}\n**Ranking:** ${ranking}\n**Momento:** ${timeAgo(commit.commit.author.date)}`;
}

export function buildFilesEmbed({ commit, repo }) {
  const files = commit.files || [];
  const added = files.filter((file) => file.status === 'added').length;
  const removed = files.filter((file) => file.status === 'removed').length;
  const modified = files.filter((file) => file.status === 'modified').length;
  const fileLines = files.slice(0, 12).map((file) => {
    const icon = file.status === 'added' ? 'A' : file.status === 'removed' ? 'D' : 'M';
    return `\`${icon}\` **${file.filename}**  (+${file.additions} / -${file.deletions})`;
  });

  return new EmbedBuilder()
    .setColor(githubBlue)
    .setTitle('Archivos del commit')
    .setURL(commit.html_url)
    .setDescription(fileLines.length ? fileLines.join('\n') : 'Este commit no informa archivos modificados.')
    .addFields(
      { name: 'Modificados', value: String(modified), inline: true },
      { name: 'Agregados', value: String(added), inline: true },
      { name: 'Eliminados', value: String(removed), inline: true }
    )
    .setAuthor({ name: repo, url: repoUrl(repo) })
    .setFooter({ text: files.length > 12 ? `Mostrando 12 de ${files.length} archivos` : 'GitHub Monitor - archivos' });
}

export function buildStatusEmbed(guildConfig, options = {}) {
  const channels = Object.values(guildConfig.channels || {});
  const description = channels.length
    ? channels.map((item) => `**<#${item.channelId}>**\n\`${item.repo}\` - \`${item.branch}\` - cada ${item.frequencySeconds || 60}s`).join('\n\n')
    : 'No hay canales configurados.';
  const footer = options.instanceLabel
    ? `Cada canal tiene repo, frecuencia y filtros propios. Instancia ${options.instanceLabel}.`
    : 'Cada canal tiene repo, frecuencia y filtros propios.';

  const embed = new EmbedBuilder()
    .setColor(githubDark)
    .setTitle('GitHub Monitor')
    .setDescription(description)
    .addFields(
      { name: 'Canales activos', value: `${channels.length}/3`, inline: true },
      { name: 'Estado', value: 'Activo', inline: true }
    )
    .setFooter({ text: footer });

  return embed;
}

export function buildChannelListEmbed(guildConfig, options = {}) {
  return buildStatusEmbed(guildConfig, options).setTitle('Canales monitoreados');
}

export function buildChannelSettingsEmbed(channelConfig, options = {}) {
  const footer = options.instanceLabel
    ? `Guardado para este canal. Instancia ${options.instanceLabel}.`
    : 'Guardado para este canal.';

  return new EmbedBuilder()
    .setColor(githubDark)
    .setTitle('Configuracion del canal')
    .addFields(
      { name: 'Canal', value: `<#${channelConfig.channelId}>`, inline: true },
      { name: 'Repositorio', value: `\`${channelConfig.repo}\``, inline: true },
      { name: 'Rama', value: `\`${channelConfig.branch}\``, inline: true },
      { name: 'Frecuencia', value: `${channelConfig.frequencySeconds || 60}s`, inline: true },
      { name: 'Filtros', value: formatFilters(channelConfig.filters), inline: true },
      { name: 'Ultimo commit', value: channelConfig.lastSha ? `\`${channelConfig.lastSha.slice(0, 7)}\`` : 'Pendiente', inline: true }
    )
    .setFooter({ text: footer });
}

function formatFilters(filters = {}) {
  const active = Object.entries(filters).filter(([, value]) => value);
  return active.length ? active.map(([key, value]) => `${key}: ${value}`).join('\n') : 'Sin filtros';
}

export function buildHelpEmbed(category = 'monitoring') {
  const pages = {
    monitoring: {
      title: 'Monitoreo de Repositorios',
      body: '`/channel add` configura un canal con repo, branch y frecuencia.\n`/channel remove` elimina un canal.\n`/channel list` muestra los canales activos.\n`/channel settings` muestra la configuracion.\n`/github-check` fuerza una revision ahora.'
    },
    explorer: {
      title: 'Explorador de Repositorios',
      body: '`/repo dashboard` muestra salud, stars, forks, issues, PRs y lenguajes.\n`/repo analytics` resume actividad reciente.\n`/repo search` busca repositorios por texto, lenguaje y estrellas.'
    },
    stats: {
      title: 'Estadisticas',
      body: '`/ranking` muestra contributors por commits.\n`/compare-contributors` crea una comparativa entre dos usuarios.\nLos botones de commits muestran detalles y archivos.'
    },
    settings: {
      title: 'Configuracion',
      body: 'Cada canal mantiene repositorio, frecuencia, filtros y estado independiente.\nLimite actual: 3 canales por servidor.'
    }
  };
  const page = pages[category] || pages.monitoring;

  return new EmbedBuilder()
    .setColor(githubDark)
    .setTitle(`GitHub Monitor - ${page.title}`)
    .setDescription(page.body)
    .addFields(
      { name: 'Comandos destacados', value: '`/channel add`  `/repo dashboard`  `/ranking`  `/github-check`', inline: false }
    );
}

export function buildHelpButtons(active = 'monitoring') {
  const buttons = [
    ['monitoring', 'Monitoreo'],
    ['explorer', 'Explorador'],
    ['stats', 'Estadisticas'],
    ['settings', 'Config']
  ];

  return [
    new ActionRowBuilder().addComponents(
      buttons.map(([id, label]) =>
        new ButtonBuilder()
          .setCustomId(`help:${id}`)
          .setLabel(label)
          .setStyle(id === active ? ButtonStyle.Primary : ButtonStyle.Secondary)
      )
    )
  ];
}

export function buildRepoDashboardEmbed({ repo, repository, languages, contributors, release, pullRequests, commits }) {
  const languageTotal = Object.values(languages).reduce((sum, value) => sum + value, 0) || 1;
  const languageLines = Object.entries(languages)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([language, value]) => `**${language}** ${progressBar((value / languageTotal) * 100)}`)
    .join('\n') || 'Sin datos de lenguajes.';
  const lastCommit = commits[0];
  const health = buildHealthLabel(repository, commits);

  const embed = new EmbedBuilder()
    .setColor(githubDark)
    .setTitle(`Dashboard - ${repo}`)
    .setURL(repository.html_url)
    .setDescription(repository.description || 'Repositorio sin descripcion.')
    .addFields(
      { name: 'Stars', value: compactNumber(repository.stargazers_count), inline: true },
      { name: 'Forks', value: compactNumber(repository.forks_count), inline: true },
      { name: 'Watchers', value: compactNumber(repository.subscribers_count || repository.watchers_count), inline: true },
      { name: 'Open Issues', value: compactNumber(repository.open_issues_count), inline: true },
      { name: 'Pull Requests', value: compactNumber(pullRequests.length), inline: true },
      { name: 'Ultimo Release', value: release ? `[${release.tag_name}](${release.html_url})` : 'Sin release', inline: true },
      { name: 'Ultimo Commit', value: lastCommit ? `[${lastCommit.sha.slice(0, 7)}](${lastCommit.html_url}) - ${timeAgo(lastCommit.commit.author.date)}` : 'Sin datos', inline: false },
      { name: 'Contributors', value: compactNumber(contributors.length), inline: true },
      { name: 'Salud del proyecto', value: health, inline: true },
      { name: 'Lenguajes utilizados', value: languageLines, inline: false }
    )
    .setFooter({ text: 'GitHub Monitor - dashboard' });

  if (repository.owner?.avatar_url) {
    embed.setThumbnail(repository.owner.avatar_url);
  }

  return embed;
}

function buildHealthLabel(repository, commits) {
  const lastCommitDate = commits[0]?.commit?.author?.date;

  if (repository.archived) {
    return 'Archivado';
  }

  if (!lastCommitDate) {
    return 'Sin actividad';
  }

  const ageDays = (Date.now() - new Date(lastCommitDate).getTime()) / 86400000;
  if (ageDays <= 7) {
    return 'Maintained - actividad alta';
  }
  if (ageDays <= 30) {
    return 'Activo';
  }
  return 'Inactive - revisar mantenimiento';
}

export function buildRankingEmbed({ repo, contributors }) {
  const medals = ['1.', '2.', '3.'];
  const lines = contributors.slice(0, 10).map((item, index) => {
    const prefix = medals[index] || `${index + 1}.`;
    return `**${prefix} [${item.login}](${item.html_url})** - ${compactNumber(item.contributions)} commits`;
  });
  const total = contributors.reduce((sum, item) => sum + item.contributions, 0);

  return new EmbedBuilder()
    .setColor(githubGold)
    .setTitle(`Ranking de contribuidores - ${repo}`)
    .setDescription(lines.join('\n') || 'Sin contributors disponibles.')
    .addFields(
      { name: 'Total contributors', value: compactNumber(contributors.length), inline: true },
      { name: 'Commits contabilizados', value: compactNumber(total), inline: true },
      { name: 'Top contributor', value: contributors[0]?.login || 'Sin datos', inline: true }
    );
}

export function buildCompareEmbed({ repo, first, second }) {
  const total = Math.max(1, first.contributions + second.contributions);
  const firstScore = (first.contributions / total) * 100;
  const secondScore = (second.contributions / total) * 100;
  const winner = first.contributions >= second.contributions ? first.login : second.login;

  return new EmbedBuilder()
    .setColor(githubGold)
    .setTitle(`${first.login} vs ${second.login}`)
    .setDescription(`Comparativa premium en \`${repo}\``)
    .addFields(
      { name: first.login, value: `${compactNumber(first.contributions)} commits\n${progressBar(firstScore)}`, inline: false },
      { name: second.login, value: `${compactNumber(second.contributions)} commits\n${progressBar(secondScore)}`, inline: false },
      { name: 'Ganador general', value: `**${winner}**`, inline: true },
      { name: 'Criterio', value: 'Mayor participacion historica por commits.', inline: true },
      { name: 'Impact Score', value: `${Math.round(Math.max(firstScore, secondScore))}/100`, inline: true }
    );
}

export function buildAnalyticsEmbed({ repo, commits }) {
  const now = Date.now();
  const day = commits.filter((commit) => now - new Date(commit.commit.author.date).getTime() <= 86400000).length;
  const week = commits.filter((commit) => now - new Date(commit.commit.author.date).getTime() <= 604800000).length;
  const month = commits.length;
  const weeklyPercent = Math.min(100, week * 10);

  return new EmbedBuilder()
    .setColor(githubBlue)
    .setTitle(`Analytics - ${repo}`)
    .addFields(
      { name: 'Actividad diaria', value: `${day} commits`, inline: true },
      { name: 'Actividad semanal', value: `${week} commits`, inline: true },
      { name: 'Actividad mensual', value: `${month} commits recientes`, inline: true },
      { name: 'Actividad visual', value: progressBar(weeklyPercent), inline: false },
      { name: 'Timeline reciente', value: commits.slice(0, 8).map((commit) => `[\`${commit.sha.slice(0, 7)}\`](${commit.html_url}) ${truncate(commit.commit.message.split('\n')[0], 70)}`).join('\n') || 'Sin datos' }
    )
    .setFooter({ text: 'Las evoluciones historicas completas requieren guardar historial propio con el tiempo.' });
}

export function buildSearchEmbed({ query, results }) {
  const lines = results.items.map((repo) => {
    return `**[${repo.full_name}](${repo.html_url})**\n${truncate(repo.description, 140)}\nStars ${compactNumber(repo.stargazers_count)} - Forks ${compactNumber(repo.forks_count)} - ${repo.language || 'Sin lenguaje'}`;
  });

  return new EmbedBuilder()
    .setColor(githubDark)
    .setTitle(`Busqueda: ${query}`)
    .setDescription(lines.join('\n\n') || 'Sin resultados.');
}
