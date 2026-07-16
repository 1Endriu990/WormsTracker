const storageKey = 'worms-battle-tracker-v1';
const initial = { matches: [
  { players: ['Kret', 'Borsuk'], winner: 'Kret', at: Date.now() - 86400000 * 2 },
  { players: ['Nitro', 'Kret', 'Borsuk'], winner: 'Nitro', at: Date.now() - 86400000 },
  { players: ['Borsuk', 'Nitro'], winner: 'Borsuk', at: Date.now() - 7200000 }
]};
let state = JSON.parse(localStorage.getItem(storageKey)) || initial;
state.roster ||= [...new Set(state.matches.flatMap(m => m.players))].sort((a,b) => a.localeCompare(b, 'pl'));
const $ = (id) => document.getElementById(id);
const dialog = $('battleDialog');
function standings() {
  const map = new Map();
  state.matches.forEach(m => m.players.forEach(name => {
    if (!map.has(name)) map.set(name, { name, points: 0, wins: 0, games: 0 });
    const p = map.get(name); p.games++; if (name === m.winner) { p.points += 3; p.wins++; } else { p.points--; p.losses = (p.losses || 0) + 1; }
  }));
  return [...map.values()].sort((a,b) => b.points-a.points || b.wins-a.wins || a.games-b.games || a.name.localeCompare(b.name, 'pl'));
}
function render() {
  const rows = standings();
  $('ranking').innerHTML = rows.length ? rows.map((p,i) => { const losses = p.losses || 0, winRate = Math.round((p.wins / p.games) * 100); return `<div class="rank-row"><span class="place">${i+1}</span><span class="player">${p.name}<small>${p.games} ${p.games === 1 ? 'bitwa' : 'bitew'}</small></span><span class="points">${p.points}</span><span class="wins">${p.wins} W</span><span class="losses">${losses} P</span><span class="rate">${winRate}%</span></div>`; }).join('') : '<div class="history empty">Brak graczy.</div>';
  $('history').classList.remove('empty');
  $('history').innerHTML = state.matches.slice().reverse().slice(0,6).map(m => `<article class="match"><b>🏅 ${m.winner}</b><p>pokonał: ${m.players.filter(p=>p!==m.winner).join(', ')}</p><time>${new Date(m.at).toLocaleString('pl-PL',{dateStyle:'medium',timeStyle:'short'})}</time></article>`).join('');
  $('matchCount').textContent = state.matches.length;
  $('playerCount').textContent = rows.length;
  $('leaderName').textContent = rows[0]?.name || '—';
  $('recentLabel').textContent = `${state.matches.length} ${state.matches.length === 1 ? 'raport' : 'raportów'}`;
  $('fullHistory').innerHTML = state.matches.length ? state.matches.slice().reverse().map((m, index) => { const matchIndex = state.matches.length - 1 - index; return `<article class="match"><div class="match-top"><b>#${state.matches.length-index} • 🏅 ${m.winner}</b><button class="delete-match" type="button" data-match-index="${matchIndex}">USUŃ</button></div><p>Uczestnicy: ${m.players.join(', ')}</p><time>${new Date(m.at).toLocaleString('pl-PL',{dateStyle:'full',timeStyle:'short'})} • zwycięzca +3 pkt, pozostali −1 pkt</time></article>`; }).join('') : '<div class="history empty">Historia jest jeszcze pusta.</div>';
  $('roster').innerHTML = state.roster.length ? state.roster.map((name, index) => `<span class="roster-chip"><span>${name}</span><button class="remove-player" type="button" data-remove-player="${index}" aria-label="Usuń gracza ${name}">×</button></span>`).join('') : '<span class="history empty">Dodaj pierwszego gracza.</span>';
  renderParticipantList();
}
function selectedPlayers() { return [...document.querySelectorAll('.participant input:checked')].map(input => input.value); }
function renderParticipantList() { $('participantList').innerHTML = state.roster.length ? state.roster.map(name => `<label class="participant"><input type="checkbox" value="${name.replaceAll('&','&amp;').replaceAll('"','&quot;')}"><span>${name}</span></label>`).join('') : '<span class="history empty">Najpierw dodaj graczy w zakładce „Gracze”.</span>'; updateWinnerOptions(); }
function updateWinnerOptions() { const players=selectedPlayers(), select=$('winner'); select.innerHTML = players.length >= 2 ? players.map(p=>`<option value="${p.replaceAll('&','&amp;').replaceAll('<','&lt;')}">${p}</option>`).join('') : '<option>Najpierw zaznacz graczy</option>'; select.disabled = players.length < 2; }
function toast(text) { const el=$('toast');el.textContent=text;el.classList.add('show');setTimeout(()=>el.classList.remove('show'),2600); }
$('openBattle').onclick = () => { renderParticipantList(); dialog.showModal(); };
$('closeBattle').onclick = () => dialog.close();
$('participantList').addEventListener('change', updateWinnerOptions);
$('playerForm').addEventListener('submit', (event) => { event.preventDefault(); const field=$('playerName'), name=field.value.trim().replace(/\s+/g,' '); if(!name) return; if(state.roster.some(p => p.toLocaleLowerCase('pl') === name.toLocaleLowerCase('pl'))) return toast('Taki gracz jest już na liście.'); state.roster.push(name); state.roster.sort((a,b)=>a.localeCompare(b,'pl')); localStorage.setItem(storageKey,JSON.stringify(state)); field.value=''; render(); toast(`Gracz ${name} został dodany!`); });
$('roster').addEventListener('click', (event) => { const button = event.target.closest('[data-remove-player]'); if (!button) return; const index = Number(button.dataset.removePlayer), [name] = state.roster.splice(index, 1); localStorage.setItem(storageKey, JSON.stringify(state)); render(); toast(`Gracz ${name} został usunięty z listy.`); });
$('fullHistory').addEventListener('click', (event) => { const button = event.target.closest('[data-match-index]'); if (!button) return; const index = Number(button.dataset.matchIndex); if (!window.confirm('Usunąć ten mecz z historii i przeliczyć ranking?')) return; state.matches.splice(index, 1); localStorage.setItem(storageKey, JSON.stringify(state)); render(); toast('Mecz został usunięty, a ranking przeliczony.'); });
$('resetStats').addEventListener('click', () => { if (!state.matches.length) return toast('Nie ma jeszcze statystyk do wyzerowania.'); if (!window.confirm('Na pewno wyzerować statystyki? Wszystkie mecze i historia zostaną usunięte. Lista graczy zostanie zachowana.')) return; state.matches = []; localStorage.setItem(storageKey, JSON.stringify(state)); render(); toast('Statystyki i historia zostały wyzerowane.'); });
$('battleForm').addEventListener('submit', (event) => { event.preventDefault(); const players=selectedPlayers(), winner=$('winner').value; if(players.length<2 || !players.includes(winner)) return; state.matches.push({players,winner,at:Date.now()}); localStorage.setItem(storageKey,JSON.stringify(state)); render(); dialog.close(); toast(`Bitwa zapisana — ${winner} otrzymuje +3 pkt!`); });
document.querySelectorAll('.tab').forEach(button => button.addEventListener('click', () => { document.querySelectorAll('.tab').forEach(t=>t.classList.toggle('active', t===button)); document.querySelectorAll('.tab-view').forEach(view=>view.hidden=view.dataset.view!==button.dataset.tab); }));
render();
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js'));
}
