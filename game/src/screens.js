// screens.js — the pre-flight board and the delivery logbook. The board is
// the planning layer: route chart, wind forecast, cargo manifest, fuel choice.
// The logbook is the payoff: a full-screen ledger, never a modal.

import { ISLANDS } from './terrain.js';
import { totalCargoKg } from './legs.js';

const $ = (id) => document.getElementById(id);

export function showBriefing(leg, fuelChoice, onTakeoff, onFuel) {
  $('hud').classList.add('hidden');
  $('logbook').classList.add('hidden');
  $('crash').classList.add('hidden');
  $('briefing').classList.remove('hidden');
  $('brief-leg').textContent = 'Leg — ' + leg.name;
  $('brief-route').textContent = leg.from + '  →  ' + leg.to + '   ·   ' + leg.rings.length + ' rings   ·   dusk in ' + leg.duskMinutes + ' min';
  const w = leg.wind;
  $('brief-wind').innerHTML =
    '<b>' + w.name + '</b> — ' + Math.round(w.speed * 1.94) + ' kt from ' + Math.round(w.dirDeg) + '°, gusting +' + Math.round(w.gust * 1.94) + ' kt.<br>' +
    'It will shove your nose ' + (w.dirDeg > 180 ? 'left' : 'right') + ' all the way there. Crab into it.';
  const cargoEl = $('brief-cargo');
  cargoEl.innerHTML = '';
  for (const c of leg.cargo) {
    const li = document.createElement('li');
    li.innerHTML = c.item + ' — <b>' + c.kg + ' kg</b>';
    cargoEl.appendChild(li);
  }
  const total = totalCargoKg(leg);
  const li = document.createElement('li');
  li.innerHTML = 'Total aboard — <b>' + total + ' kg</b>' + (total > 250 ? ' — heavy. She will climb slow and turn wide.' : ' — light. She will dance.');
  cargoEl.appendChild(li);
  $('brief-note').textContent = leg.brief;
  document.querySelectorAll('.fuel-choice').forEach((b) => {
    b.classList.toggle('selected', b.dataset.fuel === fuelChoice);
    b.onclick = () => onFuel(b.dataset.fuel);
  });
  $('takeoff-btn').onclick = onTakeoff;
  drawChart(leg);
}

function drawChart(leg) {
  const cv = $('chart');
  const ctx = cv.getContext('2d');
  const W = cv.width;
  const H = cv.height;
  const scale = Math.min(W / 6000, H / 6000);
  const toX = (x) => (x + 3000) * scale + (W - 6000 * scale) / 2;
  const toY = (z) => (z + 3000) * scale + (H - 6000 * scale) / 2;
  ctx.fillStyle = '#0c2833';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#143c46';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#1d4e5e';
  ctx.fillRect(0, 0, W, H);
  for (const isl of ISLANDS) {
    ctx.beginPath();
    ctx.arc(toX(isl.x), toY(isl.z), Math.max(4, isl.r * scale), 0, Math.PI * 2);
    ctx.fillStyle = '#5d7d3a';
    ctx.fill();
    ctx.fillStyle = '#f7ead2';
    ctx.font = '11px Georgia';
    ctx.fillText(isl.name, toX(isl.x) - 24, toY(isl.z) + 3);
  }
  // Route through the rings.
  ctx.strokeStyle = '#ffb347';
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 4]);
  ctx.beginPath();
  leg.rings.forEach((r, i) => {
    if (i === 0) ctx.moveTo(toX(r.x), toY(r.z));
    else ctx.lineTo(toX(r.x), toY(r.z));
  });
  ctx.stroke();
  ctx.setLineDash([]);
  leg.rings.forEach((r, i) => {
    ctx.beginPath();
    ctx.arc(toX(r.x), toY(r.z), 6, 0, Math.PI * 2);
    ctx.strokeStyle = '#ffb347';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#f7ead2';
    ctx.font = 'bold 12px Georgia';
    ctx.fillText(String(i + 1), toX(r.x) - 4, toY(r.z) + 4);
  });
  // Wind arrow.
  const rad = (leg.wind.dirDeg * Math.PI) / 180;
  const cx = W - 70;
  const cy = 30;
  ctx.strokeStyle = '#ffb347';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + Math.sin(rad) * 26, cy + Math.cos(rad) * 26);
  ctx.stroke();
  ctx.fillStyle = '#ffb347';
  ctx.font = '11px Georgia';
  ctx.fillText('wind', cx - 12, cy + 42);
}

export function showLogbook(result) {
  $('briefing').classList.add('hidden');
  $('hud').classList.add('hidden');
  $('logbook').classList.remove('hidden');
  $('log-leg').textContent = 'Leg — ' + result.legName + ' · ' + result.from + ' → ' + result.to;
  const mins = Math.floor(result.timeSec / 60);
  const secs = Math.floor(result.timeSec % 60);
  $('log-time').textContent = mins + 'm ' + String(secs).padStart(2, '0') + 's';
  $('log-fuel').textContent = Math.round(result.fuelLeft) + '% left';
  $('log-landing').textContent = result.landingGrade;
  $('log-letters').textContent = result.rings + ' of ' + result.ringsTotal + ' rings · ' + result.letters + ' letters';
  $('log-best').textContent = result.best;
  $('log-stamp').textContent = result.newBest ? 'DELIVERED · NEW BEST' : 'DELIVERED';
  return new Promise((resolve) => {
    $('next-leg-btn').onclick = () => resolve('next');
    $('replay-btn').onclick = () => resolve('replay');
  });
}

export function showCrash(title, text) {
  $('briefing').classList.add('hidden');
  $('hud').classList.add('hidden');
  $('crash').classList.remove('hidden');
  $('crash-title').textContent = title;
  $('crash-text').textContent = text;
  return new Promise((resolve) => {
    $('retry-btn').onclick = () => resolve();
  });
}

export function showHUD() {
  $('briefing').classList.add('hidden');
  $('logbook').classList.add('hidden');
  $('crash').classList.add('hidden');
  $('hud').classList.remove('hidden');
}

export function setNarration(text) {
  $('narration').textContent = text || '';
}

export function setCenterMsg(text) {
  $('center-msg').textContent = text || '';
}

// Hide every overlay screen (briefing, logbook, crash) at once.
export function hideAllScreens() {
  $('briefing').classList.add('hidden');
  $('logbook').classList.add('hidden');
  $('crash').classList.add('hidden');
}
