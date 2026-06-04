export function compactNumber(value) {
  return Intl.NumberFormat('en', {
    notation: 'compact',
    maximumFractionDigits: 1
  }).format(value || 0);
}

export function progressBar(percent, size = 10) {
  const normalized = Math.max(0, Math.min(100, Math.round(percent || 0)));
  const filled = Math.round((normalized / 100) * size);
  return `${'█'.repeat(filled)}${'░'.repeat(size - filled)} ${normalized}%`;
}

export function timeAgo(dateInput) {
  const date = new Date(dateInput);
  const seconds = Math.max(1, Math.floor((Date.now() - date.getTime()) / 1000));
  const units = [
    ['año', 31536000],
    ['mes', 2592000],
    ['dia', 86400],
    ['hora', 3600],
    ['minuto', 60]
  ];

  for (const [label, value] of units) {
    const amount = Math.floor(seconds / value);
    if (amount >= 1) {
      return `hace ${amount} ${label}${amount === 1 ? '' : 's'}`;
    }
  }

  return `hace ${seconds} segundo${seconds === 1 ? '' : 's'}`;
}

export function repoUrl(repo) {
  return `https://github.com/${repo}`;
}

export function truncate(value, length = 900) {
  if (!value) {
    return 'Sin datos';
  }

  return value.length > length ? `${value.slice(0, length - 1)}…` : value;
}
