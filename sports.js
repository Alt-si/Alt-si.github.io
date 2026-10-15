"use strict";
// Sección Deportes. Usa globals de app.js: $, esc, norm, fmtTime, nowSec, midnightOf, DOW, MON, TZ.
const ss = { data: null, sport: "all", tournament: "all", day: "all", scope: "all", q: "", hideDone: true, limit: 120 };
let spHay = [];

async function spLoad() {
  if (ss.data) return true;
  try {
    const bust = "?t=" + Math.floor(Date.now() / 600000);
    ss.data = await fetch("data/sports.json" + bust).then((r) => r.json());
    spHay = ss.data.events.map((e) => {
      const ch = ss.data.channels[e[4]] || {};
      const sp = ss.data.sports[e[5]] || {};
      return norm([e[2], e[3], e[6], sp.n, ch.n, ch.c].join(" "));
    });
    return true;
  } catch {
    $("#sports").innerHTML = '<div class="empty">No se pudo cargar la programación deportiva.</div>';
    return false;
  }
}

function spFiltered(skip) {
  const d = ss.data, now = nowSec(), t0 = midnightOf(now);
  const toks = norm(ss.q).split(" ").filter(Boolean);
  const out = [];
  for (let i = 0; i < d.events.length; i++) {
    const e = d.events[i], ch = d.channels[e[4]] || {};
    if (skip !== "sport" && ss.sport !== "all" && e[5] !== ss.sport) continue;
    if (skip !== "tournament" && ss.tournament !== "all" && e[6] !== ss.tournament) continue;
    if (ss.day !== "all") { const a = t0 + ss.day * 86400; if (e[1] <= a || e[0] >= a + 86400) continue; }
    if (ss.scope === "ar" && ch.c !== "Argentina") continue;
    if (ss.scope === "world" && ch.c === "Argentina") continue;
    if (ss.hideDone && e[1] <= now) continue;
    if (toks.length && !toks.every((t) => spHay[i].includes(t))) continue;
    out.push(i);
  }
  return out;
}

function spShell() {
  const d = ss.data;
  $("#sports").innerHTML = `
  <div class="sp-bar" id="spBar">
    <input id="spQ" type="search" list="spSugg" placeholder="Buscar equipo, jugador, torneo o canal…" autocomplete="off" aria-label="Buscar deportes">
    <datalist id="spSugg">${d.suggest.map((s) => `<option value="${esc(s[0])}">`).join("")}</datalist>
    <div class="sp-chips" id="spChips" role="group" aria-label="Deporte"></div>
    <div class="sp-row">
      <select id="spTour" aria-label="Torneo"></select>
      <select id="spDay" aria-label="Día"></select>
      <select id="spScope" aria-label="Origen del canal">
        <option value="all">Todo el mundo</option><option value="ar">Solo canales de Argentina</option><option value="world">Solo canales de otros países</option>
      </select>
      <label><input type="checkbox" id="spDone" checked> Ocultar terminados</label>
    </div>
  </div>
  <div id="spList"></div>`;
  const sel = $("#spDay");
  const t0 = midnightOf(nowSec());
  sel.add(new Option("Todos los días", "all"));
  for (let i = 0; i < 5; i++) {
    const dt = new Date((t0 + i * 86400 + TZ) * 1000);
    sel.add(new Option((i === 0 ? "Hoy" : i === 1 ? "Mañana" : DOW[dt.getUTCDay()]) + ` ${dt.getUTCDate()} ${MON[dt.getUTCMonth()]}`, String(i)));
  }
  let t;
  $("#spQ").oninput = (e) => { clearTimeout(t); t = setTimeout(() => { ss.q = e.target.value; ss.limit = 120; spRender(); }, 150); };
  $("#spTour").onchange = (e) => { ss.tournament = e.target.value; ss.limit = 120; spRender(); };
  sel.onchange = (e) => { ss.day = e.target.value === "all" ? "all" : +e.target.value; ss.limit = 120; spRender(); };
  $("#spScope").onchange = (e) => { ss.scope = e.target.value; ss.limit = 120; spRender(); };
  $("#spDone").onchange = (e) => { ss.hideDone = e.target.checked; ss.limit = 120; spRender(); };
  $("#spList").addEventListener("click", (e) => {
    if (e.target.closest(".sp-more")) { ss.limit += 150; spRender(); return; }
    const b = e.target.closest(".ev");
    if (b) spSheet(+b.dataset.i);
  });
  new ResizeObserver(() => $("#sports").style.setProperty("--sp-bar-h", $("#spBar").offsetHeight + "px")).observe($("#spBar"));
}

function spRender() {
  if (!ss.data) return;
  const d = ss.data, now = nowSec();

  // Chips de deporte con conteo (respeta los demás filtros)
  const bySport = {};
  for (const i of spFiltered("sport")) bySport[d.events[i][5]] = (bySport[d.events[i][5]] || 0) + 1;
  const total = Object.values(bySport).reduce((a, b) => a + b, 0);
  const order = Object.keys(d.sports).filter((k) => bySport[k] || k === ss.sport);
  $("#spChips").innerHTML =
    `<button class="chip" data-s="all" aria-pressed="${ss.sport === "all"}">Todos<small>${total}</small></button>` +
    order.map((k) => `<button class="chip" data-s="${k}" aria-pressed="${ss.sport === k}">${d.sports[k].e} ${esc(d.sports[k].n)}<small>${bySport[k] || 0}</small></button>`).join("");
  $("#spChips").onclick = (e) => {
    const b = e.target.closest(".chip"); if (!b) return;
    ss.sport = b.dataset.s; ss.tournament = "all"; ss.limit = 120; spRender();
  };

  // Torneos disponibles (respeta deporte y demás filtros)
  const tours = {};
  for (const i of spFiltered("tournament")) { const t = d.events[i][6]; if (t) tours[t] = (tours[t] || 0) + 1; }
  const tsel = $("#spTour");
  tsel.innerHTML = "";
  tsel.add(new Option("Todos los torneos", "all"));
  if (ss.tournament !== "all" && !tours[ss.tournament]) tours[ss.tournament] = 0;
  Object.entries(tours).sort((a, b) => b[1] - a[1]).forEach(([t, n]) => tsel.add(new Option(`${t} (${n})`, t)));
  tsel.value = ss.tournament;

  // Lista agrupada por día
  const idx = spFiltered();
  let html = `<div class="sp-sum">${idx.length} ${idx.length === 1 ? "evento" : "eventos"} · horarios de Argentina</div>`;
  let lastDay = null;
  for (const i of idx.slice(0, ss.limit)) {
    const e = d.events[i], ch = d.channels[e[4]] || {}, sp = d.sports[e[5]] || {};
    const dayKey = Math.floor((Math.max(e[0], midnightOf(now)) + TZ) / 86400);
    if (dayKey !== lastDay) {
      lastDay = dayKey;
      const dt = new Date(dayKey * 86400 * 1000);
      const rel = dayKey - Math.floor((now + TZ) / 86400);
      html += `<h3 class="sp-day">${rel === 0 ? "Hoy" : rel === 1 ? "Mañana" : DOW[dt.getUTCDay()]} · ${dt.getUTCDate()} ${MON[dt.getUTCMonth()]}</h3>`;
    }
    const live = e[0] <= now && now < e[1], past = e[1] <= now;
    html += `<button class="ev s-${e[5]}${past ? " past" : ""}" data-i="${i}">
      <span class="when"><b>${fmtTime(e[0])}</b><small>${fmtTime(e[1])}</small></span>
      <span class="what"><span class="ttl">${sp.e || ""} ${esc(e[2])}</span>
        <span class="sub">${e[6] ? `<span class="tg">${esc(e[6])}</span>` : ""}<span class="ch">${esc(ch.n || "")}</span><span>${esc(ch.c || "")}</span></span></span>
      ${live ? '<span class="live">EN VIVO</span>' : ""}</button>`;
  }
  if (!idx.length) html += '<div class="empty">No hay eventos con esos filtros. Probá con otro deporte, otro día o desmarcá "Ocultar terminados".</div>';
  if (idx.length > ss.limit) html += `<button class="sp-more">Mostrar más (${idx.length - ss.limit})</button>`;
  html += `<p class="sp-note">Los deportes y torneos se detectan a partir de la información de cada canal; algunos partidos pueden aparecer sin torneo. Equipos y jugadores se buscan por el texto del título y la descripción.</p>`;
  $("#spList").innerHTML = html;
}

function spSheet(i) {
  const d = ss.data, e = d.events[i], ch = d.channels[e[4]] || {}, sp = d.sports[e[5]] || {};
  const dd = new Date((e[0] + TZ) * 1000), now = nowSec();
  const status = e[1] <= now ? "Ya terminó" : e[0] <= now ? "En emisión ahora" : "Más tarde";
  $("#sheetBody").innerHTML =
    `<div class="s-${e[5]}"><span class="tag" style="background:var(--cat)">${sp.e || ""} ${esc(sp.n || "")}${e[6] ? " · " + esc(e[6]) : ""}</span></div>` +
    `<h2>${esc(e[2])}</h2>` +
    `<div class="meta">${DOW[dd.getUTCDay()]} ${dd.getUTCDate()} ${MON[dd.getUTCMonth()]}, ${fmtTime(e[0])} – ${fmtTime(e[1])} (hora de Argentina) · ${status}</div>` +
    (e[3] ? `<p>${esc(e[3])}</p>` : "") +
    `<div class="meta"><b>Canal:</b> ${esc(ch.n || "—")} (${esc(ch.c || "—")})</div>` +
    (ch.c && ch.c !== "Argentina" ? `<div class="meta">Es un canal de otro país: puede no estar disponible en tu proveedor.</div>` : "");
  $("#sheet").showModal();
}

async function showView(v) {
  const sports = v === "sports";
  document.body.dataset.view = sports ? "sports" : "guide";
  $("#tabGuide").setAttribute("aria-selected", !sports);
  $("#tabSports").setAttribute("aria-selected", sports);
  $("#grid").hidden = sports;
  $("#sports").hidden = !sports;
  try { history.replaceState(null, "", sports ? "#deportes" : location.pathname + location.search); } catch {}
  if (sports) {
    if (await spLoad()) { if (!$("#spBar")) spShell(); spRender(); }
  } else if (typeof render === "function") render(true);
}

$("#tabGuide").onclick = () => showView("guide");
$("#tabSports").onclick = () => showView("sports");
setInterval(() => { if (document.body.dataset.view === "sports" && ss.data) spRender(); }, 5 * 60000);
if (location.hash === "#deportes") showView("sports");
