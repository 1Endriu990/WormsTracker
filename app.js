const storageKey = 'worms-battle-tracker-v1';
const $ = (id) => document.getElementById(id);
const dialog = $('battleDialog');
const backendConfig = window.SUPABASE_CONFIG || {};
const online = Boolean(backendConfig.url && backendConfig.publishableKey && window.supabase);
const db = online ? window.supabase.createClient(backendConfig.url, backendConfig.publishableKey) : null;

const initial = {
  players: [
    { id: 'kret', name: 'Kret', is_active: true },
    { id: 'borsuk', name: 'Borsuk', is_active: true },
    { id: 'nitro', name: 'Nitro', is_active: true }
  ],
  matches: [
    { id: 'local-1', participant_ids: ['kret', 'borsuk'], winner_id: 'kret', played_at: new Date(Date.now() - 172800000).toISOString() },
    { id: 'local-2', participant_ids: ['nitro', 'kret', 'borsuk'], winner_id: 'nitro', played_at: new Date(Date.now() - 86400000).toISOString() },
    { id: 'local-3', participant_ids: ['borsuk', 'nitro'], winner_id: 'borsuk', played_at: new Date(Date.now() - 7200000).toISOString() }
  ]
};

let state = JSON.parse(localStorage.getItem(storageKey)) || initial;
if (!state.players) {
  const names = state.roster || [];
  const playerMap = new Map(names.map((name, index) => [name, `legacy-${index}`]));
  state = {
    players: names.map((name, index) => ({ id: `legacy-${index}`, name, is_active: true })),
    matches: (state.matches || []).map((match, index) => ({ id: `legacy-match-${index}`, participant_ids: match.players.map(name => playerMap.get(name)), winner_id: playerMap.get(match.winner), played_at: new Date(match.at).toISOString() }))
  };
}

function saveLocal() { localStorage.setItem(storageKey, JSON.stringify(state)); }
function playerById(id) { return state.players.find(player => player.id === id); }
function playerName(id) { const player = playerById(id); return player?.is_active ? player.name : 'UsuniÄ™ty gracz'; }
function activePlayers() { return state.players.filter(player => player.is_active).sort((a, b) => a.name.localeCompare(b.name, 'pl')); }

function standings() {
  const table = new Map(state.players.filter(player => player.is_active).map(player => [player.id, { ...player, points: 0, wins: 0, losses: 0, games: 0 }]));
  state.matches.forEach(match => match.participant_ids.forEach(id => {
    const player = table.get(id);
    if (!player) return;
    player.games++;
    if (id === match.winner_id) { player.points += 3; player.wins++; } else { player.points--; player.losses++; }
  }));
  return [...table.values()].sort((a, b) => b.points - a.points || b.wins - a.wins || a.games - b.games || a.name.localeCompare(b.name, 'pl'));
}

function renderParticipantList() {
  const players = activePlayers();
  $('participantList').innerHTML = players.length ? players.map(player => `<label class="participant"><input type="checkbox" value="${player.id}"><span>${player.name}</span></label>`).join('') : '<span class="history empty">Najpierw dodaj graczy w zakĹ‚adce â€žGraczeâ€ť.</span>';
  updateWinnerOptions();
}
function selectedPlayers() { return [...document.querySelectorAll('.participant input:checked')].map(input => input.value); }
function updateWinnerOptions() {
  const players = selectedPlayers(), select = $('winner');
  select.innerHTML = players.length >= 2 ? players.map(id => `<option value="${id}">${playerName(id)}</option>`).join('') : '<option>Najpierw zaznacz graczy</option>';
  select.disabled = players.length < 2;
}
function matchCard(match, index, full) {
  const winner = playerName(match.winner_id), participants = match.participant_ids.map(playerName).join(', '), date = new Date(match.played_at).toLocaleString('pl-PL', { dateStyle: full ? 'full' : 'medium', timeStyle: 'short' });
  const remove = full ? `<button class="delete-match" type="button" data-match-id="${match.id}">USUĹ</button>` : '';
  return `<article class="match"><div class="match-top"><b>${full ? `#${state.matches.length - index} â€˘ ` : ''}đźŹ… ${winner}</b>${remove}</div><p>${full ? 'Uczestnicy: ' : 'pokonaĹ‚: '}${full ? participants : match.participant_ids.filter(id => id !== match.winner_id).map(playerName).join(', ')}</p><time>${date}${full ? ' â€˘ zwyciÄ™zca +3 pkt, pozostali â’1 pkt' : ''}</time></article>`;
}
function render() {
  const rows = standings();
  $('ranking').innerHTML = rows.length ? rows.map((player, index) => { const rate = player.games ? Math.round(player.wins / player.games * 100) : 0; return `<div class="rank-row"><span class="place">${index + 1}</span><span class="player">${player.name}<small>${player.games} ${player.games === 1 ? 'bitwa' : 'bitew'}</small></span><span class="points">${player.points}</span><span class="wins">${player.wins} W</span><span class="losses">${player.losses} P</span><span class="rate">${rate}%</span><button class="remove-player rank-remove" type="button" data-remove-player="${player.id}" aria-label="UsuĹ„ gracza ${player.name} z rankingu">Ă—</button></div>`; }).join('') : '<div class="history empty">Brak graczy.</div>';
  const newest = state.matches.slice().reverse();
  $('history').classList.toggle('empty', !newest.length);
  $('history').innerHTML = newest.length ? newest.slice(0, 6).map((match, index) => matchCard(match, index, false)).join('') : 'Jeszcze ĹĽadna bomba nie spadĹ‚a. Dodaj pierwszÄ… bitwÄ™!';
  $('fullHistory').innerHTML = newest.length ? newest.map((match, index) => matchCard(match, index, true)).join('') : '<div class="history empty">Historia jest jeszcze pusta.</div>';
  $('matchCount').textContent = state.matches.length;
  $('playerCount').textContent = activePlayers().length;
  $('leaderName').textContent = rows[0]?.name || 'â€”';
  $('recentLabel').textContent = `${state.matches.length} ${state.matches.length === 1 ? 'raport' : 'raportĂłw'}`;
  $('roster').innerHTML = activePlayers().length ? activePlayers().map(player => `<span class="roster-chip"><span>${player.name}</span><button class="remove-player" type="button" data-remove-player="${player.id}" aria-label="UsuĹ„ gracza ${player.name}">Ă—</button></span>`).join('') : '<span class="history empty">Dodaj pierwszego gracza.</span>';
  renderParticipantList();
}
function toast(text) { const el = $('toast'); el.textContent = text; el.classList.add('show'); setTimeout(() => el.classList.remove('show'), 2800); }
function fail(error) { console.error(error); toast('Nie udaĹ‚o siÄ™ zapisaÄ‡ zmian. SprĂłbuj ponownie.'); }

async function loadOnline() {
  const [players, matches] = await Promise.all([db.from('players').select('*').order('name'), db.from('matches').select('*').order('played_at')]);
  if (players.error) throw players.error;
  if (matches.error) throw matches.error;
  state = { players: players.data, matches: matches.data };
  render();
}
async function addPlayer(name) {
  if (online) { const { error } = await db.from('players').insert({ name }); if (error) throw error; } else { state.players.push({ id: `local-${crypto.randomUUID()}`, name, is_active: true }); saveLocal(); }
}
async function disablePlayer(id) {
  const archivedName = `arch-${id.slice(0, 8)}-${Date.now().toString(36)}`;
  if (online) { const { error } = await db.from('players').update({ is_active: false, name: archivedName }).eq('id', id); if (error) throw error; } else { const player = playerById(id); player.is_active = false; player.name = archivedName; saveLocal(); }
}
async function addMatch(participant_ids, winner_id) {
  if (online) { const { error } = await db.from('matches').insert({ participant_ids, winner_id }); if (error) throw error; } else { state.matches.push({ id: `local-${crypto.randomUUID()}`, participant_ids, winner_id, played_at: new Date().toISOString() }); saveLocal(); }
}
async function deleteMatch(id) {
  if (online) { const { error } = await db.from('matches').delete().eq('id', id); if (error) throw error; } else { state.matches = state.matches.filter(match => match.id !== id); saveLocal(); }
}
async function resetMatches() {
  if (online) { const { error } = await db.from('matches').delete().not('id', 'is', null); if (error) throw error; } else { state.matches = []; saveLocal(); }
}

$('openBattle').onclick = () => { renderParticipantList(); dialog.showModal(); };
$('closeBattle').onclick = () => dialog.close();
$('participantList').addEventListener('change', updateWinnerOptions);
$('playerForm').addEventListener('submit', async (event) => {
  event.preventDefault(); const field = $('playerName'), name = field.value.trim().replace(/\s+/g, ' ');
  if (!name) return;
  if (state.players.some(player => player.name.toLocaleLowerCase('pl') === name.toLocaleLowerCase('pl'))) return toast('Taki gracz jest juĹĽ na liĹ›cie.');
  try { await addPlayer(name); field.value = ''; if (online) await loadOnline(); else render(); toast(`Gracz ${name} zostaĹ‚ dodany!`); } catch (error) { fail(error); }
});
async function handlePlayerRemoval(event) {
  const button = event.target.closest('[data-remove-player]'); if (!button) return;
  const player = playerById(button.dataset.removePlayer); if (!player || !window.confirm(`UsunÄ…Ä‡ ${player.name} z listy dostÄ™pnych graczy? Historia zostanie zachowana.`)) return;
  try { await disablePlayer(player.id); if (online) await loadOnline(); else render(); toast(`Gracz ${player.name} zostaĹ‚ usuniÄ™ty z listy.`); } catch (error) { fail(error); }
}
$('roster').addEventListener('click', handlePlayerRemoval);
$('ranking').addEventListener('click', handlePlayerRemoval);
$('battleForm').addEventListener('submit', async (event) => {
  event.preventDefault(); const participant_ids = selectedPlayers(), winner_id = $('winner').value;
  if (participant_ids.length < 2 || !participant_ids.includes(winner_id)) return;
  try { await addMatch(participant_ids, winner_id); if (online) await loadOnline(); else render(); dialog.close(); toast(`Bitwa zapisana â€” ${playerName(winner_id)} otrzymuje +3 pkt!`); } catch (error) { fail(error); }
});
$('fullHistory').addEventListener('click', async (event) => {
  const button = event.target.closest('[data-match-id]'); if (!button || !window.confirm('UsunÄ…Ä‡ ten mecz z historii i przeliczyÄ‡ ranking?')) return;
  try { await deleteMatch(button.dataset.matchId); if (online) await loadOnline(); else render(); toast('Mecz zostaĹ‚ usuniÄ™ty, a ranking przeliczony.'); } catch (error) { fail(error); }
});
$('resetStats').addEventListener('click', async () => {
  if (!state.matches.length) return toast('Nie ma jeszcze statystyk do wyzerowania.');
  if (!window.confirm('Na pewno wyzerowaÄ‡ statystyki? Wszystkie mecze i historia zostanÄ… usuniÄ™te. Lista graczy zostanie zachowana.')) return;
  try { await resetMatches(); if (online) await loadOnline(); else render(); toast('Statystyki i historia zostaĹ‚y wyzerowane.'); } catch (error) { fail(error); }
});
document.querySelectorAll('.tab').forEach(button => button.addEventListener('click', () => { document.querySelectorAll('.tab').forEach(tab => tab.classList.toggle('active', tab === button)); document.querySelectorAll('.tab-view').forEach(view => view.hidden = view.dataset.view !== button.dataset.tab); }));

if (online) {
  loadOnline().catch(fail);
  db.channel('worms-tracker-live').on('postgres_changes', { event: '*', schema: 'public', table: 'players' }, () => loadOnline().catch(fail)).on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, () => loadOnline().catch(fail)).subscribe();
} else render();
if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js'));
