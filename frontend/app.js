/* ============================================================
   CRICMASTER — CREX-inspired UI with real backend data
   Plain HTML / CSS / JavaScript
   ============================================================ */
'use strict';

const API_BASE = 'http://127.0.0.1:8000';
const app = document.getElementById('app');
const toast = document.getElementById('toast');
const drawer = document.getElementById('drawer');

const state = {
  route: 'home',
  theme: localStorage.getItem('cm-theme') || 'light',
  matchId: null,
  playerId: null,
  teamId: null,
  profile: null,
  profileError: '',
  adminData: null,
  adminError: '',
  matchDetails: null,
  playerDetails: null,
  teamDetails: null,
  teamMatches: [],
  searchQuery: '',
  searchResults: [],
  searchError: '',
  matchTab: 'SUMMARY',
  loading: new Set()
};

document.body.classList.toggle('dark', state.theme === 'dark');

// All public cricket data is loaded from the backend.
let live = [];
let upcoming = [];
let results = [];
let iplMatches = [];

let iplCurrentPage = 1;
const IPL_PAGE_SIZE = 30;
let iplHasMore = false;
let iplTotalPages = 1;
let iplTotalMatches = 0;
let selectedIplSeason = '';
let playerCurrentPage = 1;
let playerTotalPages = 1;
let playerSearchQuery = '';
const PLAYER_PAGE_SIZE = 50;
let players = [];
let teams = [];
let news = [];
let series = [];
let standings = [];
let statsData = null;
let healthData = null;
let databaseHealth = null;
let firebaseContextPromise = null;
let selectedStandingsSeason = '2026';

/* ============================================================
   GENERAL HELPERS
   ============================================================ */

const esc = value =>
  String(value ?? '').replace(/[&<>"']/g, ch => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }[ch]));

const card = (html, cls = 'card') =>
  `<div class="${cls}">${html}</div>`;

const teamLogo = value =>
  `<div class="team-logo">${esc(value || '?')}</div>`;

const status = (type, label) =>
  `<span class="badge ${type}">${type === 'live' ? '● ' : ''}${esc(label)}</span>`;

const emptyState = message =>
  `<div class="empty card">${esc(message)}</div>`;

const section = (title, route, label) =>
  `<div class="section-head">
    <h2>${esc(title)}</h2>
    ${route ? `<button data-route="${esc(route)}">${esc(label || 'View all →')}</button>` : ''}
  </div>`;

function showToast(message) {
  if (!toast) {
    console.log(message);
    return;
  }

  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2200);
}

window.showToast = showToast;

function closeDrawer() {
  drawer?.classList.remove('open');
}

function setLoading(key, on) {
  if (on) state.loading.add(key);
  else state.loading.delete(key);
}

function isLoading(key) {
  return state.loading.has(key);
}

function firstValue(obj, keys, fallback = '') {
  for (const key of keys) {
    if (
      obj &&
      obj[key] !== undefined &&
      obj[key] !== null &&
      obj[key] !== ''
    ) {
      return obj[key];
    }
  }

  return fallback;
}

function getList(payload, preferred = []) {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== 'object') return [];

  const keys = [
    ...preferred,
    'data',
    'items',
    'results',
    'matches',
    'players',
    'teams',
    'news',
    'articles',
    'series',
    'standings',
    'table',
    'points_table',
    'records',
    'rows',
    'fixtures'
  ];

  for (const key of keys) {
    if (Array.isArray(payload[key])) {
      return payload[key];
    }
  }

  for (const key of ['data', 'result', 'payload']) {
    if (
      payload[key] &&
      typeof payload[key] === 'object' &&
      !Array.isArray(payload[key])
    ) {
      const nested = getList(payload[key], preferred);
      if (nested.length) return nested;
    }
  }

  return [];
}

async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      Accept: 'application/json',
      ...(options.headers || {})
    }
  });

  const raw = await response.text();
  let payload;

  try {
    payload = raw ? JSON.parse(raw) : {};
  } catch {
    payload = { message: raw };
  }

  if (!response.ok) {
    const reason =
      payload.detail ||
      payload.message ||
      payload.error ||
      `HTTP ${response.status}`;

    throw new Error(
      typeof reason === 'string'
        ? reason
        : JSON.stringify(reason)
    );
  }

  return payload;
}

function apiQuery(path, params = {}) {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      query.set(key, String(value));
    }
  });

  const suffix = query.toString();

  return apiRequest(path + (suffix ? `?${suffix}` : ''));
}

/* ============================================================
   MATCH DATA MAPPING
   ============================================================ */

function shortName(name, teamInfo = []) {
  const found = teamInfo.find(team =>
    String(firstValue(team, ['name', 'team_name'], ''))
      .toLowerCase() === String(name || '').toLowerCase()
  );

  const supplied = firstValue(
    found,
    ['shortname', 'short_name', 'abbreviation', 'code'],
    ''
  );

  return supplied ||
    String(name || 'TEAM')
      .split(/\s+/)
      .map(word => word[0] || '')
      .join('')
      .slice(0, 5)
      .toUpperCase();
}

function getEventName(raw) {
  const supplied = firstValue(raw, ['event_name', 'series_name', 'series', 'competition'], '');
  const full = String(firstValue(raw, ['name', 'match_name', 'title'], ''));
  const season = firstValue(raw, ['season'], '');
  const number = firstValue(raw, ['match_number'], '');

  if (full) {
    const parts = full.split(',').map(part => part.trim());
    if (parts.length >= 3) return `${parts.slice(2).join(', ')} • ${parts[1]}`;
    if (parts.length > 1) return parts.slice(1).join(', ');
    return full;
  }
  if (supplied && number !== '') return `${supplied} • Match ${number}${season !== '' ? ` • ${season}` : ''}`;
  if (supplied) return `${supplied}${season !== '' ? ` • ${season}` : ''}`;
  if (season !== '') return `IPL ${season}${number !== '' ? ` • Match ${number}` : ''}`;
  return 'Cricket Match';
}

function mapScores(raw, teamNames) {
  const rows = Array.isArray(raw.score) ? raw.score : [];
  const scores = {};
  const unresolved = [];

  rows.forEach(row => {
    const inning = String(
      firstValue(row, ['inning', 'innings', 'team'], '')
    ).toLowerCase();

    const header = inning
      .replace(/\s+inning\s+\d+.*$/i, '')
      .trim();

    const matched = teamNames.find(team =>
      header === String(team).toLowerCase()
    );

    const value = {
      score: `${firstValue(row, ['r', 'runs'], '—')}/${firstValue(row, ['w', 'wickets'], '—')}`,
      overs: firstValue(row, ['o', 'overs'], '')
    };

    if (matched) {
      scores[matched] = value;
    } else {
      unresolved.push({ header, value });
    }
  });

  // Resolve combined innings names only where the team is unambiguous.
  unresolved.forEach(({ header, value }) => {
    const named = teamNames.filter(team =>
      header.includes(String(team).toLowerCase())
    );

    const missing = teamNames.filter(team => !scores[team]);

    if (named.length >= 2 && missing.length === 1) {
      scores[missing[0]] = value;
    } else if (named.length === 1 && !scores[named[0]]) {
      scores[named[0]] = value;
    }
  });

  return { scores, rows };
}

function mapApiMatch(raw, index, idBase, view, source = 'cricketdata') {
  const info = Array.isArray(raw.teamInfo) ? raw.teamInfo : [];
  let names = Array.isArray(raw.teams) ? raw.teams : [];

  if (names.length < 2) {
    const a = firstValue(raw, ['team1', 'team_a', 'home_team', 'team1_name'], '');
    const b = firstValue(raw, ['team2', 'team_b', 'away_team', 'team2_name'], '');
    names = [a, b].filter(Boolean);
  }

  const a = String(names[0] || 'Team A');
  const b = String(names[1] || 'Team B');
  const mapped = mapScores(raw, names);
  const sa = mapped.scores[a] || {};
  const sb = mapped.scores[b] || {};
  const rawStatus = String(firstValue(raw, ['status', 'result', 'match_status'], ''));

  let date = firstValue(raw, ['date', 'match_date'], '');
  if (date && /^\d{4}-\d{2}-\d{2}$/.test(String(date))) {
    date = new Date(`${date}T12:00:00`).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric'
    });
  }

  let resultNote = rawStatus;
  if (source === 'ipl') {
    const winner = firstValue(raw, ['winner'], '');
    if (winner) resultNote = `${winner} won`;
    else if (raw.outcome_json) {
      try {
        const outcome = typeof raw.outcome_json === 'string' ? JSON.parse(raw.outcome_json) : raw.outcome_json;
        resultNote = outcome?.result || (outcome?.by?.wickets ? `Won by ${outcome.by.wickets} wickets` : '') || (outcome?.by?.runs ? `Won by ${outcome.by.runs} runs` : '') || 'Historical match';
      } catch {
        resultNote = 'Historical match';
      }
    } else {
      resultNote = rawStatus || 'Historical match';
    }
  }

  let matchState = 'UPCOMING';
  if (raw.matchEnded === true || view === 'results' || (source === 'ipl' && (raw.winner || raw.outcome_json))) {
    matchState = 'COMPLETED';
  } else if (/stumps/i.test(rawStatus)) {
    matchState = /day\s+\d+/i.test(rawStatus) ? `${rawStatus.match(/day\s+\d+/i)[0].toUpperCase()} • STUMPS` : 'STUMPS';
  } else if (/innings|in progress|day\s+\d+/i.test(rawStatus)) {
    matchState = 'IN PROGRESS';
  } else if (raw.matchStarted === true || view === 'live') {
    matchState = 'LIVE';
  } else if (source === 'ipl') {
    matchState = 'COMPLETED';
  }

  return {
    id: idBase + index,
    apiId: String(firstValue(raw, ['id', 'match_id', 'matchId'], '')),
    source,
    a,
    b,
    aa: shortName(a, info),
    bb: shortName(b, info),
    as: sa.score || firstValue(raw, ['score1', 'team1_score'], '—'),
    bs: sb.score || firstValue(raw, ['score2', 'team2_score'], '—'),
    over: view === 'live' ? ((sa.overs || sb.overs) ? `${sa.overs || sb.overs} ov` : '') : '',
    event: getEventName(raw),
    venue: String(firstValue(raw, ['venue', 'ground', 'stadium'], 'Venue unavailable')),
    time: date || '',
    note: resultNote,
    status: matchState,
    matchType: firstValue(raw, ['matchType', 'match_type', 'format'], ''),
    season: firstValue(raw, ['season'], ''),
    matchNumber: firstValue(raw, ['match_number'], ''),
    seriesId: firstValue(raw, ['series_id', 'seriesId'], '')
  };
}

function mapPlayer(raw, index) {
  const nested =
    raw?.player && typeof raw.player === 'object'
      ? raw.player
      : {};

  const name = String(
    firstValue(
      raw,
      ['name', 'player_name', 'player', 'batter', 'bowler', 'full_name', 'fullname', 'display_name'],
      firstValue(
        nested,
        ['name', 'player_name', 'full_name'],
        typeof raw?.player === 'string' ? raw.player : ''
      )
    )
  );

  if (!name) return null;

  return {
    id: index,
    apiId: firstValue(raw, ['id', 'player_id', 'playerId'], ''),
    apiName: name,
    name,
    country: String(
      firstValue(raw, ['country', 'nationality', 'team'], '—')
    ),
    initials: name
      .split(/\s+/)
      .map(word => word[0] || '')
      .join('')
      .slice(0, 3)
      .toUpperCase(),
    role: String(
      firstValue(raw, ['role', 'playing_role', 'player_role'], 'Cricketer')
    ),
    runs: firstValue(
      raw,
      ['runs', 'total_runs', 'runs_scored', 'batting_runs'],
      '—'
    ),
    sr: firstValue(raw, ['strike_rate', 'strikeRate', 'sr'], '—'),
    avg: firstValue(raw, ['average', 'batting_average', 'avg'], '—'),
    matches: firstValue(
      raw,
      ['matches', 'matches_played', 'match_count'],
      '—'
    ),
    wickets: firstValue(raw, ['wickets', 'total_wickets'], '—'),
    age: firstValue(raw, ['age'], '—'),
    hand: String(
      firstValue(raw, ['batting_hand', 'batting_style', 'battingType'], '—')
    ),
    raw
  };
}

function mapTeam(raw, index) {
  const nested =
    raw?.team && typeof raw.team === 'object'
      ? raw.team
      : {};

  const nameValue = firstValue(
    raw,
    ['name', 'team', 'team_name', 'full_name', 'franchise'],
    firstValue(
      nested,
      ['name', 'team_name', 'full_name'],
      typeof raw?.team === 'string' ? raw.team : ''
    )
  );

  const name = String(nameValue || '');

  if (!name) return null;

  return {
    id: index,
    apiId: firstValue(raw, ['id', 'team_id', 'teamId'], ''),
    apiName: name,
    name,
    short: String(
      firstValue(
        raw,
        ['shortname', 'short_name', 'abbreviation', 'code'],
        shortName(name)
      )
    ),
    series: String(
      firstValue(raw, ['series', 'competition', 'season'], 'IPL Historical')
    ),
    pts: firstValue(raw, ['points', 'pts', 'points_total'], '—'),
    played: firstValue(
      raw,
      ['played', 'matches_played', 'matches', 'p'],
      '—'
    ),
    won: firstValue(raw, ['won', 'wins', 'w'], '—'),
    nrr: firstValue(raw, ['nrr', 'net_run_rate'], '—'),
    raw
  };
}

function mapStanding(raw, index) {
  const name = String(
    firstValue(raw, ['team', 'team_name', 'name'], '')
  );

  if (!name) return null;

  const nrrValue = Number(
    firstValue(raw, ['nrr', 'net_run_rate'], NaN)
  );

  return {
    id: index,
    name,
    short: shortName(name),
    played: firstValue(raw, ['played', 'matches_played', 'p'], '—'),
    won: firstValue(raw, ['wins', 'won', 'w'], '—'),
    lost: firstValue(raw, ['losses', 'lost', 'l'], '—'),
    noResults: firstValue(raw, ['no_results', 'noResults', 'nr'], 0),
    nrr: Number.isFinite(nrrValue)
      ? `${nrrValue > 0 ? '+' : ''}${nrrValue.toFixed(3)}`
      : firstValue(raw, ['nrr', 'net_run_rate'], '—'),
    pts: firstValue(raw, ['points', 'pts', 'points_total'], '—'),
    position: firstValue(raw, ['position', 'rank', 'place'], index + 1),
    raw
  };
}

function mapSeries(raw, index) {
  const season = firstValue(
    raw,
    ['season', 'season_name', 'name', 'series_name', 'title'],
    ''
  );

  if (season === '') return null;

  const name = String(season);

  return {
    id: index,
    name: /^IPL\b/i.test(name) ? name : `IPL ${name}`,
    start: firstValue(raw, ['start_date', 'startDate'], ''),
    end: firstValue(raw, ['end_date', 'endDate'], ''),
    matches: firstValue(
      raw,
      ['matches', 'match_count', 'matches_count'],
      '—'
    ),
    raw
  };
}

function mapNews(raw, index) {
  const title = String(
    firstValue(raw, ['title', 'headline', 'name', 'news_title'], '')
  );

  if (!title) return null;

  return [
    String(
      firstValue(raw, ['category', 'type', 'tag', 'source'], 'CRICKET NEWS')
    ),
    title,
    String(
      firstValue(raw, ['summary', 'description', 'excerpt', 'content', 'body'], '')
    ),
    String(firstValue(raw, ['url', 'link', 'article_url'], '')),
    String(firstValue(raw, ['published_at', 'date', 'created_at'], ''))
  ];
}

/* ============================================================
   MATCH CARDS AND COMPONENTS
   ============================================================ */

function scoreCard(m, type = 'live') {
  const badge =
    type === 'done' || m.status === 'COMPLETED'
      ? status('done', 'COMPLETED')
      : m.status === 'LIVE' || m.status === 'IN PROGRESS'
        ? status('live', m.status)
        : status('upcoming', m.status || 'UPCOMING');

  const foot = type === 'done'
    ? (m.note || m.time || '')
    : (m.over || m.note || m.time || '');

  return card(`
    <div class="score-head">
      <span class="series-name">${esc(m.event)}</span>
      ${badge}
    </div>

    <div class="match-name">${esc(m.a)} vs ${esc(m.b)}</div>
    <div class="venue">${esc(m.venue)}</div>

    <div class="score-grid">
      <div>
        ${teamLogo(m.aa)}
        <div class="team-name">${esc(m.a)}</div>
        <div class="score-big">${esc(m.as || '—')}</div>
      </div>

      <div class="eyebrow">VS</div>

      <div class="right">
        ${teamLogo(m.bb)}
        <div class="team-name">${esc(m.b)}</div>
        <div class="score-big">${esc(m.bs || '—')}</div>
      </div>
    </div>

    <div class="match-action">
      <span>${esc(foot)}</span>
      <button class="link-btn" data-open-match="${esc(m.id)}">
        Match Center →
      </button>
    </div>
  `, 'card score-card ' + (type === 'live' ? 'live-card' : ''));
}

function playerCard(p) {
  return card(`
    <div class="person">
      <div class="person-avatar">${esc(p.initials)}</div>
      <div>
        <h3>${esc(p.name)}</h3>
        <p>${esc(p.country)} • ${esc(p.role)}</p>
      </div>
    </div>

    <div class="mini-stats">
      <div class="mini-stat">
        <b>${esc(p.runs)}</b><span>RUNS</span>
      </div>
      <div class="mini-stat">
        <b>${esc(p.sr)}</b><span>SR</span>
      </div>
      <div class="mini-stat">
        <b>${esc(p.avg)}</b><span>AVG</span>
      </div>
    </div>

    <div class="match-action" style="margin-top:11px">
      <span>${esc(p.hand)}</span>
      <button class="link-btn" data-open-player="${p.id}">
        Open Profile →
      </button>
    </div>
  `, 'card player-card');
}

function teamCard(t) {
  return card(`
    ${teamLogo(t.short)}
    <h3 style="text-align:center">${esc(t.name)}</h3>
    <p style="text-align:center">${esc(t.series)} • ${esc(t.pts)} pts</p>

    <div class="match-action" style="margin-top:12px">
      <span>${esc(t.played)} matches</span>
      <button class="link-btn" data-open-team="${t.id}">
        Team Profile →
      </button>
    </div>
  `, 'card team-card');
}

function standingsTable(full = false) {
  if (!standings.length) {
    return emptyState(
      isLoading('standings')
        ? 'Loading points table…'
        : 'No points table data returned for this season.'
    );
  }

  return card(`
    <div class="table-wrap">
      <table class="table">
        <thead>
          <tr>
            <th>#</th><th>Team</th><th>P</th><th>W</th><th>L</th><th>NRR</th><th>Pts</th>
          </tr>
        </thead>
        <tbody>
          ${standings.map((t, i) => `
            <tr>
              <td class="rank">${esc(t.position || i + 1)}</td>
              <td>
                <b>${esc(t.name)}</b>
                <small style="display:block;color:var(--muted);margin-top:2px">${esc(t.short)}</small>
              </td>
              <td>${esc(t.played)}</td>
              <td>${esc(t.won)}</td>
              <td>${esc(t.lost)}</td>
              <td class="${String(t.nrr).startsWith('+') ? 'green' : ''}">${esc(t.nrr)}</td>
              <td><b>${esc(t.pts)}</b></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    ${full
      ? '<div style="padding:10px 12px;border-top:1px solid var(--line);font-size:9px;color:var(--muted)">Source: CRICMASTER standings API</div>'
      : ''}
  `, 'card');
}

function newsCard(n, i) {
  const icons = ['🏏', '⚡', '📊', '🏆', '◈', '▣'];

  const link = n[3]
    ? `<a class="link-btn" href="${esc(n[3])}" target="_blank" rel="noopener noreferrer">Read story →</a>`
    : '<span style="color:var(--muted);font-size:9px">Link unavailable</span>';

  return card(`
    <div class="news-thumb">${icons[i % icons.length]}</div>
    <div class="news-body">
      <div class="news-tag">${esc(n[0])}</div>
      <h3>${esc(n[1])}</h3>
      <p>${esc(n[2])}</p>
      <div style="margin-top:11px">${link}</div>
    </div>
  `, 'card news-card');
}

/* ============================================================
   API LOADERS
   ============================================================ */

async function loadMatchView(view) {
  const key = `matches-${view}`;
  setLoading(key, true);
  render();

  try {
    const payload = await apiQuery('/api/matches', { view });
    const rows = getList(payload, ['matches', 'data']);

    const mapped = rows.map((raw, i) =>
      mapApiMatch(
        raw,
        i,
        view === 'live' ? 1000 :
          view === 'upcoming' ? 2000 : 3000,
        view
      )
    );

    if (view === 'live') live = mapped;
    if (view === 'upcoming') upcoming = mapped;
    if (view === 'results') results = mapped;

    console.log(`CRICMASTER: loaded ${view} matches`, mapped.length);

  } catch (error) {
    console.error(`${view} matches API error:`, error);

  } finally {
    setLoading(key, false);
    render();
  }
}


async function loadIplMatches(page = iplCurrentPage) {
  iplCurrentPage = Math.max(1, Number(page) || 1);
  setLoading('ipl-matches', true);
  render();

  try {
    const payload = await apiQuery('/api/ipl/matches', {
      season: selectedIplSeason || undefined,
      page: iplCurrentPage,
      limit: IPL_PAGE_SIZE
    });
    const rows = getList(payload, ['matches', 'items', 'data']);
    iplTotalMatches = Number(payload.total ?? rows.length) || rows.length;
    iplTotalPages = Number(payload.pages ?? Math.max(1, Math.ceil(iplTotalMatches / IPL_PAGE_SIZE))) || 1;
    iplCurrentPage = Number(payload.page ?? iplCurrentPage) || iplCurrentPage;
    iplHasMore = iplCurrentPage < iplTotalPages;
    iplMatches = rows.map((raw, index) => mapApiMatch(raw, (iplCurrentPage - 1) * IPL_PAGE_SIZE + index, 4000, 'results', 'ipl'));
    console.log(`CRICMASTER: IPL page ${iplCurrentPage}/${iplTotalPages} loaded`, iplMatches.length, 'matches');
  } catch (error) {
    console.error('IPL matches API error:', error);
    showToast('Could not load IPL matches. Check the API and database.');
  } finally {
    setLoading('ipl-matches', false);
    render();
  }
}

async function loadIplSeasons() {
  try {
    const payload = await apiRequest('/api/ipl/seasons');
    const seasons = getList(payload, ['seasons', 'data']);
    if (!series.length && seasons.length) {
      series = seasons.map((item, index) => mapSeries(item, index)).filter(Boolean);
    }
    render();
  } catch (error) {
    console.warn('IPL seasons API error:', error.message);
  }
}

function statPlayerRows(payload) {
  if (!payload || typeof payload !== 'object') return [];

  let rows = [];

  for (const key of [
    'top_runs', 'top_batters', 'top_scorers',
    'top_wickets', 'top_bowlers', 'players',
    'player_stats', 'batting', 'bowling'
  ]) {
    if (Array.isArray(payload[key])) {
      rows.push(...payload[key]);
    }
  }

  if (
    payload.data &&
    typeof payload.data === 'object' &&
    !Array.isArray(payload.data)
  ) {
    rows.push(...statPlayerRows(payload.data));
  }

  return rows;
}

async function loadPlayers(search = playerSearchQuery, page = playerCurrentPage) {
  playerSearchQuery = String(search || '').trim();
  playerCurrentPage = Math.max(1, Number(page) || 1);
  setLoading('players', true);
  render();

  try {
    const [playerResult, statsResult] = await Promise.allSettled([
      apiQuery('/api/ipl/players', {
        search: playerSearchQuery || undefined,
        page: playerCurrentPage,
        limit: PLAYER_PAGE_SIZE
      }),
      statsData ? Promise.resolve(statsData) : apiQuery('/api/stats', { limit: 50 })
    ]);

    const playerPayload = playerResult.status === 'fulfilled' ? playerResult.value : null;
    if (statsResult.status === 'fulfilled') statsData = statsResult.value;

    const rows = getList(playerPayload, ['players', 'items', 'data']);
    const total = Number(playerPayload?.total ?? playerPayload?.count ?? rows.length) || rows.length;
    playerTotalPages = Number(playerPayload?.pages ?? Math.max(1, Math.ceil(total / PLAYER_PAGE_SIZE))) || 1;
    playerCurrentPage = Number(playerPayload?.page ?? playerCurrentPage) || playerCurrentPage;

    const statMap = new Map();
    statPlayerRows(statsData).forEach(raw => {
      const player = mapPlayer(raw, 0);
      if (!player) return;
      const key = player.name.toLowerCase();
      const old = statMap.get(key) || {};
      statMap.set(key, {
        runs: player.runs !== '—' ? player.runs : old.runs,
        sr: player.sr !== '—' ? player.sr : old.sr,
        avg: player.avg !== '—' ? player.avg : old.avg,
        wickets: player.wickets !== '—' ? player.wickets : old.wickets,
        matches: player.matches !== '—' ? player.matches : old.matches
      });
    });

    players = rows.map((raw, index) => {
      const player = mapPlayer(raw, index);
      if (!player) return null;
      const stats = statMap.get(player.name.toLowerCase()) || {};
      return {
        ...player,
        runs: stats.runs ?? player.runs,
        sr: stats.sr ?? player.sr,
        avg: stats.avg ?? player.avg,
        wickets: stats.wickets ?? player.wickets,
        matches: stats.matches ?? player.matches
      };
    }).filter(Boolean);

    console.log(`CRICMASTER: loaded players page ${playerCurrentPage}/${playerTotalPages}`, players.length);
  } catch (error) {
    console.error('Players API error:', error);
    showToast('Could not load players. Check the backend.');
  } finally {
    setLoading('players', false);
    render();
  }
}

async function loadTeams() {
  setLoading('teams', true);
  render();

  try {
    const payload = await apiRequest('/api/ipl/teams');

    teams = getList(payload, ['teams', 'data'])
      .map(mapTeam)
      .filter(Boolean)
      .map((team, i) => ({ ...team, id: i }));

    console.log('CRICMASTER: loaded teams', teams.length);

  } catch (error) {
    console.error('Teams API error:', error);

  } finally {
    setLoading('teams', false);
    render();
  }
}

async function loadSeries() {
  setLoading('series', true);
  render();

  try {
    const payload = await apiRequest('/api/series');

    series = getList(payload, ['series', 'data'])
      .map(mapSeries)
      .filter(Boolean);

    console.log('CRICMASTER: loaded series', series.length);

  } catch (error) {
    console.error('Series API error:', error);

  } finally {
    setLoading('series', false);
    render();
  }
}

async function loadStandings(season = selectedStandingsSeason) {
  selectedStandingsSeason = String(season || '2026');
  setLoading('standings', true);
  render();

  try {
    const payload = await apiQuery('/api/standings', { season: selectedStandingsSeason });

    standings = getList(
      payload,
      ['standings', 'points_table', 'table', 'teams', 'data']
    )
      .map(mapStanding)
      .filter(Boolean);

    console.log(
      `CRICMASTER: loaded standings for ${selectedStandingsSeason}`,
      standings.length
    );

  } catch (error) {
    console.error('Standings API error:', error);

  } finally {
    setLoading('standings', false);
    render();
  }
}

async function loadNews() {
  setLoading('news', true);
  render();

  try {
    const payload = await apiRequest('/api/news');

    news = getList(payload, ['news', 'articles', 'items', 'data'])
      .map(mapNews)
      .filter(Boolean);

    console.log('CRICMASTER: loaded news', news.length);

  } catch (error) {
    console.error('News API error:', error);

  } finally {
    setLoading('news', false);
    render();
  }
}

async function loadHealth() {
  const [health, db] = await Promise.allSettled([
    apiRequest('/api/health'),
    apiRequest('/api/database/health')
  ]);

  healthData =
    health.status === 'fulfilled' ? health.value : null;

  databaseHealth =
    db.status === 'fulfilled' ? db.value : null;

  render();
}

/* ============================================================
   FIREBASE AUTHENTICATION
   ============================================================ */

async function getFirebaseContext() {
  if (firebaseContextPromise) return firebaseContextPromise;

  firebaseContextPromise = (async () => {
    const [appModule, authModule, configModule] = await Promise.all([
      import('https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js'),
      import('https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js'),
      import('./js/firebase-config.js')
    ]);

    const config =
      configModule.firebaseConfig ||
      configModule.firebaseConfigWeb ||
      configModule.config ||
      configModule.default?.firebaseConfig ||
      configModule.default ||
      window.firebaseConfig;

    if (!config?.apiKey || !config?.projectId) {
      throw new Error('Firebase web config export was not found.');
    }

    const firebaseApp = appModule.getApps().length
      ? appModule.getApp()
      : appModule.initializeApp(config);

    const auth = authModule.getAuth(firebaseApp);

    const user = await new Promise(resolve => {
      let unsubscribe = null;

      unsubscribe = authModule.onAuthStateChanged(
        auth,
        current => {
          if (unsubscribe) unsubscribe();
          resolve(current || null);
        },
        () => resolve(null)
      );
    });

    return { auth, authModule, user };
  })().catch(error => {
    firebaseContextPromise = null;
    throw error;
  });

  return firebaseContextPromise;
}

async function authRequest(path, options = {}) {
  const storedToken = sessionStorage.getItem('cricmasterIdToken');
  if (storedToken) {
    try {
      return await apiRequest(path, {
        ...options,
        headers: { ...(options.headers || {}), Authorization: `Bearer ${storedToken}` }
      });
    } catch (error) {
      if (!/401|403|unauthorized|invalid firebase|token/i.test(error.message)) throw error;
    }
  }

  const context = await getFirebaseContext();
  if (!context.user) throw new Error('Please sign in to view your account.');
  const token = await context.user.getIdToken(true);
  sessionStorage.setItem('cricmasterIdToken', token);
  return apiRequest(path, {
    ...options,
    headers: { ...(options.headers || {}), Authorization: `Bearer ${token}` }
  });
}

async function loadProfile() {
  setLoading('profile', true);
  state.profileError = '';
  render();

  try {
    state.profile = await authRequest('/api/auth/me');

    console.log('CRICMASTER: authenticated profile loaded');

  } catch (error) {
    state.profile = null;
    state.profileError = error.message;

    console.warn('Profile API:', error.message);

  } finally {
    setLoading('profile', false);
    render();
  }
}

async function loadAdmin() {
  setLoading('admin', true);
  state.adminError = '';
  render();

  try {
    state.adminData = await authRequest('/api/admin/overview');

  } catch (error) {
    state.adminData = null;
    state.adminError = error.message;

    console.warn('Admin API:', error.message);

  } finally {
    setLoading('admin', false);
    render();
  }
}

async function logout() {
  const button = document.getElementById('logoutAction');
  if (button) {
    button.disabled = true;
    button.textContent = 'Signing out…';
  }

  try {
    try {
      await authRequest('/api/auth/logout', { method: 'POST' });
    } catch (error) {
      // Firebase sign-out must still happen if the backend logout is unavailable.
      console.warn('Backend logout:', error.message);
    }

    try {
      const context = await getFirebaseContext();
      if (context.user) {
        await context.authModule.signOut(context.auth);
      }
    } catch (error) {
      console.warn('Firebase sign-out:', error.message);
    }
  } finally {
    sessionStorage.removeItem('cricmasterIdToken');
    localStorage.removeItem('cricmasterUser');
    firebaseContextPromise = null;
    state.profile = null;
    state.profileError = '';

    // Replace the dashboard history entry so Back cannot reopen a signed-in screen.
    window.location.replace('/pages/login.html');
  }
}

/* ============================================================
   HISTORICAL IPL DETAILS
   ============================================================ */

function selectedMatch() {
  return [...live, ...upcoming, ...results, ...iplMatches]
    .find(match => String(match.id) === String(state.matchId)) || null;
}

async function loadMatchDetails() {
  const match = selectedMatch();

  if (!match || match.source !== 'ipl' || !match.apiId) {
    state.matchDetails = null;
    render();
    return;
  }

  setLoading('match-details', true);
  render();

  const id = encodeURIComponent(match.apiId);

  const requests = await Promise.allSettled([
    apiRequest(`/api/ipl/matches/${id}/scorecard`),
    apiRequest(`/api/ipl/matches/${id}/scorecard/detailed`),
    apiRequest(`/api/ipl/matches/${id}/commentary`)
  ]);

  state.matchDetails = {
    scorecard: requests[0].status === 'fulfilled'
      ? requests[0].value
      : null,
    detailed: requests[1].status === 'fulfilled'
      ? requests[1].value
      : null,
    commentary: requests[2].status === 'fulfilled'
      ? requests[2].value
      : null
  };

  setLoading('match-details', false);
  render();
}

async function loadPlayerDetails() {
  const player = players.find(
    p => String(p.id) === String(state.playerId)
  );

  if (!player) return;

  setLoading('player-details', true);
  render();

  const name = encodeURIComponent(player.apiName || player.name);

  const requests = await Promise.allSettled([
    apiRequest(`/api/ipl/player-profile?player=${name}`),
    apiRequest(`/api/ipl/player-stats?player=${name}`)
  ]);

  state.playerDetails = {
    profile: requests[0].status === 'fulfilled'
      ? requests[0].value
      : null,
    stats: requests[1].status === 'fulfilled'
      ? requests[1].value
      : null
  };

  setLoading('player-details', false);
  render();
}

async function loadTeamDetails() {
  const team = teams.find(
    t => String(t.id) === String(state.teamId)
  );

  if (!team) return;

  setLoading('team-details', true);
  render();

  const name = encodeURIComponent(team.apiName || team.name);

  const requests = await Promise.allSettled([
    apiRequest(`/api/ipl/team-profile?team=${name}`),
    apiQuery('/api/ipl/team-matches', {
      team: team.apiName || team.name,
      limit: 50
    })
  ]);

  state.teamDetails =
    requests[0].status === 'fulfilled'
      ? requests[0].value
      : null;

  state.teamMatches =
    requests[1].status === 'fulfilled'
      ? getList(requests[1].value, ['matches', 'data'])
          .map((m, i) => mapApiMatch(m, i, 6000, 'results', 'ipl'))
      : [];

  setLoading('team-details', false);
  render();
}

/* ============================================================
   SEARCH
   ============================================================ */

async function searchEverything(query) {
  const q = String(query || '').trim();

  if (q.length < 2) {
    showToast('Type at least 2 characters to search.');
    return;
  }

  state.searchQuery = q;
  state.searchError = '';
  state.searchResults = [];

  go('news');
  setLoading('search', true);
  render();

  try {
    const payload = await apiQuery('/api/search', {
      q,
      limit: 15
    });

    const grouped = [];
    (Array.isArray(payload.players) ? payload.players : []).forEach(item => {
      grouped.push({ ...item, result_type: 'Player', title: item.player_name || item.name || 'Player' });
    });
    (Array.isArray(payload.teams) ? payload.teams : []).forEach(item => {
      grouped.push({ ...item, result_type: 'Team', title: item.team_name || item.name || 'Team' });
    });
    (Array.isArray(payload.matches) ? payload.matches : []).forEach(item => {
      grouped.push({ ...item, result_type: 'IPL Match', title: `${item.team1 || 'Team A'} vs ${item.team2 || 'Team B'}` });
    });
    state.searchResults = grouped.length
      ? grouped
      : getList(payload, ['results', 'items', 'data']);

  } catch (error) {
    state.searchError = error.message;

  } finally {
    setLoading('search', false);
    render();
  }
}

/* ============================================================
   ROUTING AND EVENT BINDING
   ============================================================ */

function go(route) {
  state.route = route;
  closeDrawer();
  render();
  window.scrollTo({ top: 0, behavior: 'smooth' });

  if (
    route === 'profile' &&
    !state.profile &&
    !isLoading('profile')
  ) {
    loadProfile();
  }

  if (
    route === 'admin' &&
    !state.adminData &&
    !isLoading('admin')
  ) {
    loadAdmin();
  }

  if (
    route === 'standings' &&
    !standings.length &&
    !isLoading('standings')
  ) {
    loadStandings(selectedStandingsSeason);
  }
}

function updateNav() {
  document.querySelectorAll('[data-route]').forEach(el => {
    const route = el.dataset.route;

    el.classList.toggle(
      'active',
      route === state.route ||
      (state.route === 'match' && route === 'live') ||
      (state.route === 'player' && route === 'players') ||
      (state.route === 'team' && route === 'teams')
    );
  });
}

function bindRenderedControls() {
  app.querySelectorAll('[data-route]').forEach(el => el.addEventListener('click', () => go(el.dataset.route)));
  document.querySelectorAll('[data-open-match]').forEach(el => el.addEventListener('click', () => {
    state.matchId = el.dataset.openMatch;
    state.matchTab = 'SUMMARY';
    state.matchDetails = null;
    go('match');
    if (selectedMatch()?.source === 'ipl') loadMatchDetails();
  }));
  document.querySelectorAll('[data-open-player]').forEach(el => el.addEventListener('click', () => {
    state.playerId = el.dataset.openPlayer;
    state.playerDetails = null;
    go('player');
    loadPlayerDetails();
  }));
  document.querySelectorAll('[data-open-team]').forEach(el => el.addEventListener('click', () => {
    state.teamId = el.dataset.openTeam;
    state.teamDetails = null;
    state.teamMatches = [];
    go('team');
    loadTeamDetails();
  }));
  document.querySelectorAll('[data-match-tab]').forEach(el => el.addEventListener('click', () => {
    state.matchTab = el.dataset.matchTab;
    render();
    if (selectedMatch()?.source === 'ipl' && !state.matchDetails) loadMatchDetails();
  }));

  const newsSearch = document.getElementById('newsSearch');
  if (newsSearch) {
    newsSearch.value = state.searchQuery;
    newsSearch.addEventListener('keydown', event => {
      if (event.key === 'Enter') searchEverything(newsSearch.value);
    });
  }
  const playersSearch = document.getElementById('playersSearch');
  if (playersSearch) playersSearch.value = playerSearchQuery;
  document.getElementById('runPlayerSearch')?.addEventListener('click', () => loadPlayers(document.getElementById('playersSearch')?.value || '', 1));
  document.getElementById('clearPlayerSearch')?.addEventListener('click', () => loadPlayers('', 1));

  document.querySelectorAll('[data-ipl-page]').forEach(button => button.addEventListener('click', () => {
    if (button.dataset.iplPage === 'prev' && iplCurrentPage > 1) loadIplMatches(iplCurrentPage - 1);
    if (button.dataset.iplPage === 'next' && iplCurrentPage < iplTotalPages) loadIplMatches(iplCurrentPage + 1);
  }));
  const iplSeasonSelect = document.querySelector('[data-ipl-season]');
  if (iplSeasonSelect) {
    iplSeasonSelect.value = selectedIplSeason;
    iplSeasonSelect.addEventListener('change', () => {
      selectedIplSeason = iplSeasonSelect.value;
      loadIplMatches(1);
    });
  }
  const standingsSelect = document.querySelector('[data-standings-season]');
  if (standingsSelect) {
    standingsSelect.value = String(selectedStandingsSeason);
    standingsSelect.addEventListener('change', () => {
      selectedStandingsSeason = standingsSelect.value;
      loadStandings(selectedStandingsSeason);
    });
  }
  document.querySelectorAll('[data-player-page]').forEach(button => button.addEventListener('click', () => {
    if (button.dataset.playerPage === 'prev' && playerCurrentPage > 1) loadPlayers(playerSearchQuery, playerCurrentPage - 1);
    if (button.dataset.playerPage === 'next' && playerCurrentPage < playerTotalPages) loadPlayers(playerSearchQuery, playerCurrentPage + 1);
  }));
}

function render() {
  if (!app) return;

  app.innerHTML = (views[state.route] || views.home)();

  bindRenderedControls();
  updateNav();
}

/* ============================================================
   CRICMASTER SCREENS
   ============================================================ */

const views = {
  home() {
    return `
      <div class="page-title">
        <div>
          <div class="eyebrow">YOUR CRICKET HOME</div>
          <h1>Welcome to CRICMASTER</h1>
          <p>Live scores, real player data and cricket insights in one place.</p>
        </div>
        <button class="link-btn" data-route="profile">Open profile →</button>
      </div>

      <div class="grid g2">
        <div class="hero">
          <div class="eyebrow" style="color:#8fa6bb">CRICMASTER MATCH CENTRE</div>
          <h1>Every score. Every player. Every moment.</h1>
          <p>Follow current matches, browse historical IPL games, compare player stats and check real standings.</p>
          <div class="hero-row">
            <div class="hero-pill"><b>${live.length}</b> Live matches</div>
            <div class="hero-pill"><b>${results.length}</b> Results loaded</div>
            <div class="hero-pill"><b>${players.length}</b> Players</div>
          </div>
        </div>

        ${card(
          section('CricPoints & Rewards', 'profile', 'View account →') +
          `<div style="display:flex;align-items:end;justify-content:space-between;padding:4px 0 15px">
            <div>
              <div class="eyebrow">ACCOUNT BALANCE</div>
              <div style="font:800 34px 'Plus Jakarta Sans';margin-top:5px">
                ${esc(state.profile?.points ?? '—')}
                <span style="font-size:10px;color:var(--muted)">PTS</span>
              </div>
            </div>
            ${status(
              state.profile ? 'live' : 'upcoming',
              state.profile ? 'ACCOUNT CONNECTED' : 'SIGN IN'
            )}
          </div>
          <p style="font-size:10px;color:var(--muted)">
            ${state.profile
              ? `Welcome, ${esc(state.profile.display_name || state.profile.email || 'player')}`
              : 'Sign in to load your saved CricPoints balance.'}
          </p>`,
          'card'
        )}
      </div>

      <div class="section">
        ${section('Live Now', 'live', 'See all live →')}
        <div class="grid g2">
          ${live.length
            ? live.map(m => scoreCard(m, 'live')).join('')
            : emptyState(isLoading('matches-live')
              ? 'Loading live matches…'
              : 'No live matches returned right now.')}
        </div>
      </div>

      <div class="section">
        ${section('Upcoming Fixtures', 'matches', 'Full schedule →')}
        <div class="grid g3">
          ${upcoming.length
            ? upcoming.slice(0, 6).map(m => scoreCard(m, 'upcoming')).join('')
            : emptyState(isLoading('matches-upcoming')
              ? 'Loading fixtures…'
              : 'No upcoming fixtures are currently returned by the API.')}
        </div>
      </div>

      <div class="section">
        ${section('Recent Results', 'matches', 'All results →')}
        <div class="grid g3">
          ${results.length
            ? results.slice(0, 3).map(m => scoreCard(m, 'done')).join('')
            : emptyState(isLoading('matches-results')
              ? 'Loading results…'
              : 'No completed matches returned.')}
        </div>
      </div>

      <div class="section">
        ${section('Top Players', 'players', 'Explore players →')}
        <div class="grid g4">
          ${players.length
            ? players.slice(0, 4).map(playerCard).join('')
            : emptyState(isLoading('players')
              ? 'Loading player data…'
              : 'No player records returned.')}
        </div>
      </div>

      <div class="section">
        ${section('IPL Points Table', 'standings', 'Full table →')}
        ${standingsTable(false)}
      </div>

      <div class="section">
        ${section('Cricket News', 'news', 'Read all →')}
        <div class="grid g3">
          ${news.length
            ? news.slice(0, 3).map(newsCard).join('')
            : emptyState(isLoading('news')
              ? 'Loading news…'
              : 'No news stories returned by the backend.')}
        </div>
      </div>
    `;
  },

  live() {
    return `
      <div class="page-title">
        <div>
          <div class="eyebrow">MATCHES</div>
          <h1>Live Matches</h1>
          <p>Current scores and match information from CRICMASTER's cricket API.</p>
        </div>
        ${status('live', `${live.length} MATCHES`)}
      </div>

      <div class="live-strip">
        ${live.map(m => `
          <div class="live-strip-item">
            <b>${esc(m.a)} ${esc(m.as)} vs ${esc(m.b)} ${esc(m.bs)}</b>
            <span>${esc(m.event)} • ${esc(m.over || m.note)}</span>
          </div>
        `).join('')}
      </div>

      <div class="section">
        <div class="grid g2">
          ${live.length
            ? live.map(m => scoreCard(m, 'live')).join('')
            : emptyState(isLoading('matches-live')
              ? 'Loading live matches…'
              : 'No live matches available.')}
        </div>
      </div>
    `;
  },

  
  matches() {
    const seasonOptions = series.map(item => {
      const value = String(item.raw?.season ?? item.name.replace(/^IPL\s*/i, ''));
      return `<option value="${esc(value)}" ${selectedIplSeason === value ? 'selected' : ''}>${esc(item.name)}</option>`;
    }).join('');

    return `
      <div class="page-title"><div><div class="eyebrow">MATCH CENTRE</div><h1>Matches</h1><p>Live scores, scheduled fixtures, recent results and the full historical IPL archive.</p></div></div>
      <div class="section">${section('Live Matches')}<div class="grid g2">${live.length ? live.map(m => scoreCard(m, 'live')).join('') : emptyState('No live matches are currently returned by the provider.')}</div></div>
      <div class="section">${section('Upcoming Fixtures')}<div class="grid g3">${upcoming.length ? upcoming.map(m => scoreCard(m, 'upcoming')).join('') : emptyState('No upcoming fixtures are currently returned by the provider.')}</div></div>
      <div class="section">${section('Recent Results')}<div class="grid g3">${results.length ? results.map(m => scoreCard(m, 'done')).join('') : emptyState('No completed matches available.')}</div></div>
      <div class="section">
        ${section('Historical IPL Matches')}
        <div class="archive-controls">
          <label class="archive-season-label"><span class="eyebrow">SEASON</span><select data-ipl-season class="archive-season-select"><option value="">All IPL seasons</option>${seasonOptions}</select></label>
          <div class="archive-pager"><button class="filter" data-ipl-page="prev" ${iplCurrentPage <= 1 ? 'disabled' : ''}>← Previous</button><span>Page ${iplCurrentPage} of ${iplTotalPages} · ${iplTotalMatches.toLocaleString('en-IN')} matches</span><button class="filter" data-ipl-page="next" ${iplCurrentPage >= iplTotalPages ? 'disabled' : ''}>Next →</button></div>
        </div>
        <div class="grid g3">${iplMatches.length ? iplMatches.map(m => scoreCard(m, 'done')).join('') : emptyState(isLoading('ipl-matches') ? 'Loading IPL matches…' : 'No matches found for this season/page.')}</div>
      </div>
    `;
  },

  match() {
    const m = selectedMatch();

    if (!m) {
      return `
        <div class="page-title"><div><h1>Match Centre</h1></div></div>
        ${emptyState('Choose a match from the Matches or Live page.')}
      `;
    }

    let body = '';

    if (state.matchTab === 'SCORECARD') {
      body = m.source === 'ipl'
        ? detailBlock(
            'Detailed Scorecard',
            state.matchDetails?.detailed || state.matchDetails?.scorecard
          )
        : emptyState('A detailed scorecard is not available for this live API match.');

    } else if (state.matchTab === 'COMMENTARY') {
      body = m.source === 'ipl'
        ? detailBlock('Historical Commentary', state.matchDetails?.commentary)
        : emptyState('Live ball-by-ball commentary is not exposed for this match by the current API.');

    } else if (state.matchTab === 'INFO') {
      body = detailBlock('Match Information', {
        event: m.event,
        venue: m.venue,
        status: m.status,
        date: m.time,
        source: m.source,
        matchType: m.matchType,
        matchId: m.apiId
      });

    } else if (state.matchTab === 'GRAPHS') {
      body = emptyState('No graph endpoint is currently documented for this match.');

    } else {
      body = card(`
        <div class="score-grid">
          <div>
            ${teamLogo(m.aa)}
            <div class="team-name">${esc(m.a)}</div>
            <div class="score-big">${esc(m.as)}</div>
          </div>
          <div class="eyebrow">VS</div>
          <div class="right">
            ${teamLogo(m.bb)}
            <div class="team-name">${esc(m.b)}</div>
            <div class="score-big">${esc(m.bs)}</div>
          </div>
        </div>
        <p style="font-size:10px;color:var(--muted)">
          ${esc(m.note || m.time || '')}
        </p>
      `, 'card');
    }

    return `
      <div class="match-center">
        <div class="match-center-top">
          <button class="back" data-route="matches">← Back to matches</button>
          <h1>${esc(m.a)} vs ${esc(m.b)}</h1>
          <p>${esc(m.event)} • ${esc(m.venue)}</p>

          <div class="match-teams">
            <div>
              <div class="big-team-logo">${esc(m.aa)}</div>
              <div class="big-score">${esc(m.as)}</div>
            </div>

            <div>
              ${status(
                m.status === 'COMPLETED' ? 'done' :
                m.status === 'LIVE' ? 'live' : 'upcoming',
                m.status
              )}
            </div>

            <div>
              <div class="big-team-logo">${esc(m.bb)}</div>
              <div class="big-score">${esc(m.bs)}</div>
            </div>
          </div>

          <p style="margin-top:12px">${esc(m.note || m.time || '')}</p>
        </div>
      </div>

      <div class="match-tabs">
        ${['SUMMARY', 'COMMENTARY', 'SCORECARD', 'GRAPHS', 'INFO']
          .map(tab => `
            <button data-match-tab="${tab}" class="${state.matchTab === tab ? 'active' : ''}">
              ${tab}
            </button>
          `).join('')}
      </div>

      <div class="commentary">
        ${isLoading('match-details')
          ? emptyState('Loading match details…')
          : body}
      </div>
    `;
  },

  players() {
    return `
      <div class="page-title"><div><div class="eyebrow">PLAYER DATABASE</div><h1>Players</h1><p>Search and browse the full IPL player list stored in your database.</p></div></div>
      <div class="card" style="padding:13px;margin-bottom:14px">
        <label class="top-search" style="width:100%;background:var(--card2);border-color:var(--line);color:var(--muted)"><span>⌕</span><input id="playersSearch" placeholder="Search a player, then press Enter…" style="color:var(--text)"></label>
        <button class="filter" id="runPlayerSearch" style="margin-top:10px">Search players</button>
        ${playerSearchQuery ? '<button class="filter" id="clearPlayerSearch" style="margin-top:10px">Clear search</button>' : ''}
      </div>
      <div class="archive-pager"><button class="filter" data-player-page="prev" ${playerCurrentPage <= 1 ? 'disabled' : ''}>← Previous</button><span>Page ${playerCurrentPage} of ${playerTotalPages}</span><button class="filter" data-player-page="next" ${playerCurrentPage >= playerTotalPages ? 'disabled' : ''}>Next →</button></div>
      <div class="grid g3">${players.length ? players.map(playerCard).join('') : emptyState(isLoading('players') ? 'Loading players…' : 'No players matched this search.')}</div>
    `;
  },

  player() {
    const p = players.find(x => String(x.id) === String(state.playerId));

    if (!p) {
      return `
        <div class="page-title"><div><h1>Player Profile</h1></div></div>
        ${emptyState('Select a player from the Players screen.')}
      `;
    }

    return `
      <div class="page-title">
        <div>
          <button class="link-btn" data-route="players">← Players</button>
          <div class="eyebrow" style="margin-top:8px">PLAYER PROFILE</div>
          <h1>${esc(p.name)}</h1>
          <p>${esc(p.country)} • ${esc(p.role)}</p>
        </div>
      </div>

      <div class="grid g2">
        <div class="card">
          <div class="profile-cover">
            <div class="profile-user">
              <span class="avatar">${esc(p.initials)}</span>
              <div>
                <h2>${esc(p.name)}</h2>
                <p>${esc(p.country)} • ${esc(p.role)}</p>
              </div>
            </div>
          </div>

          <div class="mini-stats" style="padding:15px;margin:0;grid-template-columns:repeat(4,1fr)">
            <div class="mini-stat"><b>${esc(p.matches)}</b><span>MATCHES</span></div>
            <div class="mini-stat"><b>${esc(p.runs)}</b><span>RUNS</span></div>
            <div class="mini-stat"><b>${esc(p.avg)}</b><span>AVG</span></div>
            <div class="mini-stat"><b>${esc(p.wickets)}</b><span>WICKETS</span></div>
          </div>
        </div>

        ${card(
          section('Batting & Career Stats') +
          `<div class="grid g2">
            <div class="metric"><b>${esc(p.sr)}</b><small>Strike Rate</small></div>
            <div class="metric"><b>${esc(p.avg)}</b><small>Average</small></div>
            <div class="metric"><b>${esc(p.age)}</b><small>Age</small></div>
            <div class="metric"><b>${esc(p.hand)}</b><small>Batting style</small></div>
          </div>`,
          'card'
        )}
      </div>

      <div class="section">
        ${section('Historical Profile')}
        ${isLoading('player-details')
          ? emptyState('Loading player profile…')
          : detailBlock('Player profile response', state.playerDetails?.profile)}
      </div>

      <div class="section">
        ${section('Player Stats')}
        ${isLoading('player-details')
          ? emptyState('Loading stats…')
          : detailBlock('Stats response', state.playerDetails?.stats)}
      </div>
    `;
  },

  teams() {
    return `
      <div class="page-title">
        <div>
          <div class="eyebrow">TEAM DATABASE</div>
          <h1>Teams</h1>
          <p>Browse teams available in the historical IPL database.</p>
        </div>
      </div>

      <div class="grid g4">
        ${teams.length
          ? teams.map(teamCard).join('')
          : emptyState(isLoading('teams')
            ? 'Loading teams…'
            : 'No team records returned.')}
      </div>
    `;
  },

  team() {
    const t = teams.find(x => String(x.id) === String(state.teamId));

    if (!t) {
      return `
        <div class="page-title"><div><h1>Team Profile</h1></div></div>
        ${emptyState('Select a team from the Teams screen.')}
      `;
    }

    return `
      <div class="page-title">
        <div>
          <button class="link-btn" data-route="teams">← Teams</button>
          <div class="eyebrow" style="margin-top:8px">TEAM PROFILE</div>
          <h1>${esc(t.name)}</h1>
          <p>Historical IPL team data</p>
        </div>
      </div>

      ${isLoading('team-details')
        ? emptyState('Loading team details…')
        : detailBlock('Team Profile', state.teamDetails)}

      <div class="section">
        ${section('Historical Fixtures')}
        <div class="grid g3">
          ${state.teamMatches.length
            ? state.teamMatches.map(m => scoreCard(m, 'done')).join('')
            : emptyState(isLoading('team-details')
              ? 'Loading fixtures…'
              : 'No team matches returned.')}
        </div>
      </div>
    `;
  },

  stats() {
    const rows = players.slice(0, 20);

    return `
      <div class="page-title">
        <div>
          <div class="eyebrow">CRICKET ANALYTICS</div>
          <h1>Stats & Analytics</h1>
          <p>Player leaderboards and data from your stats endpoint.</p>
        </div>
      </div>

      <div class="grid g4">
        <div class="metric card">
          <div class="icon">🏏</div>
          <b>${esc(statsData ? firstValue(statsData, ['total_players', 'players_count'], '—') : '—')}</b>
          <small>Players tracked</small>
        </div>
        <div class="metric card">
          <div class="icon">⚡</div>
          <b>${esc(rows.length)}</b>
          <small>Loaded player records</small>
        </div>
        <div class="metric card">
          <div class="icon">🏆</div>
          <b>${esc(teams.length)}</b>
          <small>Historical teams</small>
        </div>
        <div class="metric card">
          <div class="icon">◈</div>
          <b>${esc(standings.length)}</b>
          <small>Standings entries</small>
        </div>
      </div>

      <div class="section">
        ${section('Player Leaderboard', 'players', 'Explore players →')}

        ${card(`
          <div class="table-wrap">
            <table class="table">
              <thead>
                <tr><th>#</th><th>Player</th><th>Runs</th><th>SR</th><th>Average</th><th>Wickets</th></tr>
              </thead>
              <tbody>
                ${rows.map((p, i) => `
                  <tr>
                    <td class="rank">${i + 1}</td>
                    <td><b>${esc(p.name)}</b></td>
                    <td>${esc(p.runs)}</td>
                    <td>${esc(p.sr)}</td>
                    <td>${esc(p.avg)}</td>
                    <td>${esc(p.wickets)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `, 'card')}
      </div>

      <div class="section">${section('API Stats Payload')}</div>

      ${statsData
        ? detailBlock('Additional stats fields', statsData)
        : emptyState(isLoading('players')
          ? 'Loading statistics…'
          : 'No stats payload returned.')}
    `;
  },

  standings() {
    const availableSeasons = series.filter(item => /^\d{4}(?:\/\d{2})?$/.test(String(item.raw?.season ?? item.name.replace(/^IPL\s*/i, ''))));
    const standingsSeasonOptions = availableSeasons.map(item => { const value = String(item.raw?.season ?? item.name.replace(/^IPL\s*/i, '')); return `<option value="${esc(value)}" ${String(selectedStandingsSeason) === value ? 'selected' : ''}>IPL ${esc(value)}</option>`; }).join('');
    return `
      <div class="page-title">
        <div>
          <div class="eyebrow">SERIES</div>
          <h1>Standings & Series</h1>
          <p>Points table from the standings API and seasons from historical IPL data.</p>
        </div>
      </div>

      <div class="card" style="padding:15px;margin-bottom:14px">
        <div class="grid g3">
          <div>
            <span class="eyebrow">SERIES</span>
            <strong style="display:block;margin-top:5px;font-size:13px">Indian Premier League</strong>
          </div>
          <div>
            <span class="eyebrow">SEASON</span>
            <select data-standings-season class="archive-season-select">${standingsSeasonOptions || `<option value="2026">IPL 2026</option>`}</select>
          </div>
          <div>
            <span class="eyebrow">TABLE</span>
            <strong style="display:block;margin-top:5px;font-size:13px" class="green">
              ${standings.length} TEAMS
            </strong>
          </div>
        </div>
      </div>

      ${standingsTable(true)}

      <div class="section">${section('IPL Seasons')}</div>
      <div class="grid g3">
        ${series.length
          ? series.map(s => card(`
              <div class="eyebrow">HISTORICAL SERIES</div>
              <h3 style="margin:8px 0">${esc(s.name)}</h3>
              <p style="font-size:10px;color:var(--muted)">
                ${esc(s.start)} ${s.end ? '— ' + esc(s.end) : ''}
              </p>
              <p style="font-size:10px;color:var(--muted)">
                ${esc(s.matches)} matches
              </p>
            `, 'card')).join('')
          : emptyState(isLoading('series')
            ? 'Loading seasons…'
            : 'No seasons returned.')}
      </div>
    `;
  },

  news() {
    let searchBlock = '';

    if (state.searchQuery) {
      searchBlock = `
        <div class="section">
          ${section(`Search Results: ${state.searchQuery}`)}

          ${state.searchError
            ? emptyState(state.searchError)
            : isLoading('search')
              ? emptyState('Searching…')
              : state.searchResults.length
                ? card(`
                    <div class="table-wrap">
                      <table class="table">
                        <thead><tr><th>Result</th><th>Details</th></tr></thead>
                        <tbody>
                          ${state.searchResults.map(item => `
                            <tr>
                              <td>
                                <b>${esc(firstValue(
                                  item,
                                  ['title', 'name', 'player_name', 'team_name', 'team', 'match_name', 'type'],
                                  'Search result'
                                ))}</b>
                              </td>
                              <td>${esc(firstValue(
                                item,
                                ['result_type', 'description', 'summary', 'status', 'season', 'match_date', 'type', 'series'],
                                '—'
                              ))}</td>
                            </tr>
                          `).join('')}
                        </tbody>
                      </table>
                    </div>
                  `, 'card')
                : emptyState('No search results found.')}
        </div>
      `;
    }

    return `
      <div class="page-title">
        <div>
          <div class="eyebrow">CRICKET MEDIA</div>
          <h1>News & Search</h1>
          <p>Cricket news from your endpoint and search across CRICMASTER.</p>
        </div>
      </div>

      <div class="card" style="padding:12px;margin-bottom:14px">
        <label class="top-search" style="width:100%;background:var(--card2);border-color:var(--line);color:var(--muted)">
          <span>⌕</span>
          <input id="newsSearch" placeholder="Search players, teams, series or matches…" style="color:var(--text)">
        </label>
        <button class="filter" id="runSearch" style="margin-top:10px">Search</button>
      </div>

      ${searchBlock}

      <div class="section">
        ${section('Latest Cricket News')}
        <div class="grid g3">
          ${news.length
            ? news.map(newsCard).join('')
            : emptyState(isLoading('news')
              ? 'Loading news…'
              : 'No articles returned by the news endpoint.')}
        </div>
      </div>
    `;
  },

  profile() {
    const p = state.profile;

    return `
      <div class="page-title">
        <div>
          <div class="eyebrow">ACCOUNT</div>
          <h1>Profile & Settings</h1>
          <p>Your Firebase account and saved CricPoints.</p>
        </div>
      </div>

      ${p
        ? card(`
            <div class="profile-cover">
              <div class="profile-user">
                <span class="avatar">${esc(
                  String(firstValue(p, ['display_name', 'email'], 'CM')).slice(0, 2).toUpperCase()
                )}</span>
                <div>
                  <h2>${esc(firstValue(p, ['display_name', 'email'], 'CRICMASTER User'))}</h2>
                  <p>${esc(firstValue(p, ['email', 'phone'], 'Account verified'))}</p>
                </div>
              </div>
            </div>

            <div class="mini-stats" style="padding:15px;margin:0;grid-template-columns:repeat(3,1fr)">
              <div class="mini-stat"><b>${esc(p.points ?? '—')}</b><span>CRICPOINTS</span></div>
              <div class="mini-stat"><b>${p.onboarding_completed ? 'Yes' : 'No'}</b><span>ONBOARDING</span></div>
              <div class="mini-stat"><b>${esc(p.provider || '—')}</b><span>LOGIN PROVIDER</span></div>
            </div>
          `, 'card')
        : emptyState(isLoading('profile')
          ? 'Loading your account…'
          : (state.profileError || 'Sign in to view your account and CricPoints.'))}

      ${!p
        ? `<div class="section">
             <div class="card" style="padding:15px">
               <p style="font-size:11px;color:var(--muted);margin:0 0 10px">
                 Sign in to view your saved points and account details.
               </p>
               <a class="link-btn" href="/pages/login.html">Open Login →</a>
             </div>
           </div>`
        : ''}

      <div class="section">
        ${section('Preferences')}

        ${card(`
          <div class="settings">
            <div class="setting">
              <div><h4>Theme</h4><p>Switch between light and dark mode.</p></div>
              <button class="filter" id="profileTheme">
                ${state.theme === 'dark' ? 'Dark mode' : 'Light mode'}
              </button>
            </div>

            <div class="setting">
              <div><h4>Terms & privacy</h4><p>Review CRICMASTER's account policies.</p></div>
              <span class="pill">INFO</span>
            </div>

            <div class="setting">
              <div><h4>Sign out</h4><p>End the current Firebase session.</p></div>
              <button class="filter" id="logoutAction">Logout</button>
            </div>
          </div>
        `, 'card')}
      </div>
    `;
  },

  admin() {
    return `
      <div class="page-title">
        <div>
          <div class="eyebrow">OWNER / ADMIN</div>
          <h1>Admin Dashboard</h1>
          <p>Protected overview from the backend.</p>
        </div>
        ${healthData ? status('live', 'API ONLINE') : status('upcoming', 'CHECKING')}
      </div>

      ${state.adminData
        ? detailBlock('Admin Overview', state.adminData)
        : emptyState(isLoading('admin')
          ? 'Loading admin overview…'
          : (state.adminError || 'Sign in with an authorised admin account to access this screen.'))}

      <div class="section">
        ${section('Platform Health')}
        <div class="grid g2">
          ${detailBlock('Application Health', healthData)}
          ${detailBlock('Database Health', databaseHealth)}
        </div>
      </div>
    `;
  }
};

/* ============================================================
   DETAILS COMPONENT
   ============================================================ */

function displayValue(value) {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'object') return Array.isArray(value) ? `${value.length} items` : (Object.keys(value).length ? 'Details available' : '—');
  return String(value);
}

function renderDataTable(rows, maxRows = 30) {
  if (!Array.isArray(rows) || rows.length === 0) return emptyState('No records available.');
  if (typeof rows[0] !== 'object' || rows[0] === null) return `<ul class="clean-data-list">${rows.slice(0, maxRows).map(value => `<li>${esc(displayValue(value))}</li>`).join('')}</ul>`;
  const keys = Object.keys(rows[0]).filter(key => !['raw', 'extras_json', 'wickets_json', 'outcome_json', 'source_file', 'imported_at'].includes(key)).slice(0, 8);
  return `<div class="table-wrap"><table class="table"><thead><tr>${keys.map(key => `<th>${esc(key.replace(/_/g, ' '))}</th>`).join('')}</tr></thead><tbody>${rows.slice(0, maxRows).map(row => `<tr>${keys.map(key => `<td>${esc(displayValue(row[key]))}</td>`).join('')}</tr>`).join('')}</tbody></table>${rows.length > maxRows ? `<div class="data-footnote">Showing ${maxRows} of ${rows.length} records.</div>` : ''}</div>`;
}

function detailBlock(title, payload) {
  if (!payload) return emptyState(`${title} is not available from the backend.`);
  if (Array.isArray(payload)) return card(`<h3 style="margin-bottom:12px">${esc(title)}</h3>${renderDataTable(payload)}`, 'card data-panel');
  if (typeof payload !== 'object') return card(`<h3>${esc(title)}</h3><p>${esc(displayValue(payload))}</p>`, 'card data-panel');

  const sections = [];
  const scalarEntries = [];
  for (const [key, value] of Object.entries(payload)) {
    if (['success', 'configured', 'message', 'count', 'total', 'pages', 'page', 'limit'].includes(key)) continue;
    if (Array.isArray(value)) {
      sections.push(`<section class="data-subsection"><h4>${esc(key.replace(/_/g, ' '))}</h4>${renderDataTable(value, key === 'deliveries' ? 40 : 30)}</section>`);
    } else if (value && typeof value === 'object') {
      const entries = Object.entries(value).filter(([k, v]) => !['raw', 'extras_json', 'wickets_json', 'outcome_json'].includes(k) && (v === null || typeof v !== 'object'));
      const fields = entries.map(([k, v]) => `<div class="detail-field"><span>${esc(k.replace(/_/g, ' '))}</span><b>${esc(displayValue(v))}</b></div>`).join('');
      if (fields) sections.push(`<section class="data-subsection"><h4>${esc(key.replace(/_/g, ' '))}</h4><div class="detail-grid">${fields}</div></section>`);
    } else {
      scalarEntries.push([key, value]);
    }
  }
  const scalars = scalarEntries.length ? `<div class="detail-grid">${scalarEntries.map(([key, value]) => `<div class="detail-field"><span>${esc(key.replace(/_/g, ' '))}</span><b>${esc(displayValue(value))}</b></div>`).join('')}</div>` : '';
  return card(`<h3 style="margin-bottom:12px">${esc(title)}</h3>${scalars}${sections.join('') || (!scalars ? emptyState('No readable fields were returned.') : '')}`, 'card data-panel');
}

/* ============================================================
   GLOBAL CONTROLS
   ============================================================ */

document.addEventListener('click', event => {
  const routeControl = event.target.closest('[data-route]');

  if (routeControl && !app?.contains(routeControl)) {
    go(routeControl.dataset.route);
    return;
  }

  const formatChip = event.target.closest('.format-chip');

  if (formatChip) {
    document.querySelectorAll('.format-chip').forEach(x => {
      x.classList.remove('active');
    });

    formatChip.classList.add('active');

    showToast(`Format selected: ${formatChip.textContent.trim()}`);
  }

  const filter = event.target.closest('.filter');

  if (filter && filter.parentElement) {
    filter.parentElement.querySelectorAll('.filter').forEach(x => {
      x.classList.remove('active');
    });

    filter.classList.add('active');
  }

  if (
    event.target.closest('#themeToggle') ||
    event.target.closest('#profileTheme')
  ) {
    toggleTheme();
  }

  if (event.target.closest('#logoutAction')) {
    logout();
  }

  if (event.target.closest('#runSearch')) {
    searchEverything(
      document.getElementById('newsSearch')?.value || ''
    );
  }
});

function toggleTheme() {
  state.theme = state.theme === 'dark' ? 'light' : 'dark';

  localStorage.setItem('cm-theme', state.theme);

  document.body.classList.toggle('dark', state.theme === 'dark');

  render();

  showToast(
    `${state.theme === 'dark' ? 'Dark' : 'Light'} mode enabled`
  );
}

document.getElementById('mobileMenu')?.addEventListener('click', () => {
  drawer?.classList.add('open');
});

document.getElementById('closeDrawer')?.addEventListener('click', closeDrawer);

const globalSearch = document.getElementById('globalSearch');

globalSearch?.addEventListener('keydown', event => {
  if (event.key === 'Enter') {
    searchEverything(globalSearch.value);
  }

  if (
    (event.ctrlKey || event.metaKey) &&
    event.key.toLowerCase() === 'k'
  ) {
    event.preventDefault();
    globalSearch.focus();
  }
});

document.addEventListener('keydown', event => {
  if (
    (event.ctrlKey || event.metaKey) &&
    event.key.toLowerCase() === 'k'
  ) {
    event.preventDefault();
    globalSearch?.focus();
  }
});

/* ============================================================
   APPLICATION STARTUP
   ============================================================ */

async function enforceLoginAndOnboarding() {
  // Avoid briefly rendering the dashboard for signed-out visitors.
  if (app) {
    app.innerHTML = emptyState('Checking your CRICMASTER session…');
  }

  const context = await getFirebaseContext();
  if (!context.user) {
    sessionStorage.removeItem('cricmasterIdToken');
    localStorage.removeItem('cricmasterUser');
    window.location.replace('/pages/login.html');
    return false;
  }

  const token = await context.user.getIdToken(true);
  sessionStorage.setItem('cricmasterIdToken', token);

  // GET /me confirms the existing backend user and onboarding state.
  const profile = await apiRequest('/api/auth/me', {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!profile || profile.success !== true) {
    throw new Error('The backend could not verify this account.');
  }

  localStorage.setItem('cricmasterUser', JSON.stringify(profile));

  if (!profile.onboarding_completed) {
    window.location.replace('/pages/onboarding.html');
    return false;
  }

  state.profile = profile;
  return true;
}

async function initializeApp() {
  try {
    const allowed = await enforceLoginAndOnboarding();
    if (!allowed) return;
  } catch (error) {
    console.error('CRICMASTER access check failed:', error);
    sessionStorage.removeItem('cricmasterIdToken');
    sessionStorage.setItem(
      'cricmasterAuthError',
      'We could not verify your CRICMASTER session. Please sign in again.'
    );
    window.location.replace('/pages/login.html');
    return;
  }

  render();

  // Public cricket data loads after account and onboarding are verified.
  await Promise.allSettled([
    loadMatchView('live'),
    loadMatchView('upcoming'),
    loadMatchView('results'),
    loadIplMatches(),
    loadIplSeasons(),
    loadPlayers(),
    loadTeams(),
    loadSeries(),
    loadStandings(selectedStandingsSeason),
    loadNews(),
    loadHealth()
  ]);

  console.log('CRICMASTER: all data loaders finished.');
}

initializeApp();