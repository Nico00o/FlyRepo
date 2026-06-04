export function parseRepo(input) {
  const normalized = input
    .trim()
    .replace(/^https?:\/\/github\.com\//i, '')
    .replace(/\.git$/i, '')
    .replace(/\/+$/g, '');

  const [owner, repo] = normalized.split('/');

  if (!owner || !repo || normalized.split('/').length !== 2) {
    throw new Error('Repo format must be owner/repo, for example openai/openai-node.');
  }

  return { owner, repo, fullName: `${owner}/${repo}` };
}

function buildHeaders(githubToken) {
  const headers = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'github-activity-discord-bot'
  };

  if (githubToken) {
    headers.Authorization = `Bearer ${githubToken}`;
  }

  return headers;
}

async function githubGet(path, githubToken, params = {}) {
  const url = new URL(`https://api.github.com${path}`);

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value));
    }
  }

  const response = await fetch(url, { headers: buildHeaders(githubToken) });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`GitHub API error ${response.status}: ${body.slice(0, 200)}`);
  }

  return response.json();
}

export async function fetchLatestCommits({ repo, branch, githubToken, sinceSha }) {
  const { owner, repo: repoName } = parseRepo(repo);
  const commits = await githubGet(`/repos/${owner}/${repoName}/commits`, githubToken, {
    sha: branch,
    per_page: 10
  });

  if (!sinceSha) {
    return { latestSha: commits[0]?.sha ?? null, newCommits: [] };
  }

  const index = commits.findIndex((commit) => commit.sha === sinceSha);
  const newCommits = index === -1 ? commits.slice(0, 5).reverse() : commits.slice(0, index).reverse();

  return {
    latestSha: commits[0]?.sha ?? sinceSha,
    newCommits
  };
}

export async function fetchCommitDetails({ repo, sha, githubToken }) {
  const { owner, repo: repoName } = parseRepo(repo);
  return githubGet(`/repos/${owner}/${repoName}/commits/${sha}`, githubToken);
}

export async function fetchRepositoryDetails({ repo, githubToken }) {
  const { owner, repo: repoName } = parseRepo(repo);
  return githubGet(`/repos/${owner}/${repoName}`, githubToken);
}

export async function fetchContributors({ repo, githubToken, perPage = 10 }) {
  const { owner, repo: repoName } = parseRepo(repo);
  return githubGet(`/repos/${owner}/${repoName}/contributors`, githubToken, {
    per_page: perPage
  });
}

export async function fetchLanguages({ repo, githubToken }) {
  const { owner, repo: repoName } = parseRepo(repo);
  return githubGet(`/repos/${owner}/${repoName}/languages`, githubToken);
}

export async function fetchReleases({ repo, githubToken }) {
  const { owner, repo: repoName } = parseRepo(repo);
  return githubGet(`/repos/${owner}/${repoName}/releases/latest`, githubToken).catch((error) => {
    if (String(error.message).includes('404')) {
      return null;
    }

    throw error;
  });
}

export async function fetchPullRequests({ repo, githubToken }) {
  const { owner, repo: repoName } = parseRepo(repo);
  return githubGet(`/repos/${owner}/${repoName}/pulls`, githubToken, {
    state: 'open',
    per_page: 100
  });
}

export async function fetchReadme({ repo, githubToken }) {
  const { owner, repo: repoName } = parseRepo(repo);
  return githubGet(`/repos/${owner}/${repoName}/readme`, githubToken).catch((error) => {
    if (String(error.message).includes('404')) {
      return null;
    }

    throw error;
  });
}

export async function fetchRecentCommits({ repo, branch = 'main', githubToken, perPage = 30 }) {
  const { owner, repo: repoName } = parseRepo(repo);
  return githubGet(`/repos/${owner}/${repoName}/commits`, githubToken, {
    sha: branch,
    per_page: perPage
  });
}

export async function searchRepositories({ query, language, minStars, sort = 'stars', githubToken }) {
  const parts = [query];

  if (language) {
    parts.push(`language:${language}`);
  }

  if (minStars) {
    parts.push(`stars:>=${minStars}`);
  }

  return githubGet('/search/repositories', githubToken, {
    q: parts.join(' '),
    sort,
    order: 'desc',
    per_page: 5
  });
}
