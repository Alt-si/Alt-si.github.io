/* Lógica compartida de las mini apps de personal. El área sale de <html data-area="...">. */
import { datos, distanciaM, textoDistancia, aFecha, comprimirFoto, ubicacionActual, AGENTE_ACTIVO_MIN } from "../datos.js";
import { AREAS_APP } from "./areas.js";

const AREA = document.documentElement.dataset.area;
const INFO = AREAS_APP[AREA];
const ICONO = INFO.icono;
document.documentElement.style.setProperty("--area", INFO.color);
document.documentElement.style.setProperty("--area-osc", INFO.oscuro);
document.documentElement.style.setProperty("--area-claro", INFO.claro);
const ESTADOS = {
  nueva:      { txt: "Nueva",                 color: "#c8102e" },
  en_camino:  { txt: "En camino",             color: "#ea580c" },
  resuelta:   { txt: INFO.resolver.estado,    color: "#1d4ed8" },
  sin_accion: { txt: INFO.sinAccion.estado,   color: "#15803d" },
};


let yo = null, denuncias = [], agentes = [], miPos = null, pestaña = "nuevas", vistas = null, watchId = null, abiertaId = null;
const $ = id => document.getElementById(id);
const esc = t => String(t ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
function toast(m, ms = 2600) { const t = $("toast"); t.textContent = m; t.style.display = "block"; clearTimeout(t._t); t._t = setTimeout(() => t.style.display = "none", ms); }
function hace(t) {
  const d = aFecha(t); if (!d) return "recién";
  const m = Math.round((Date.now() - d) / 60000);
  if (m < 1) return "recién"; if (m < 60) return `hace ${m} min`;
  const h = Math.round(m / 60); if (h < 24) return `hace ${h} h`;
  return d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" }) + " " + d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
}

/* ================= INGRESO ================= */
async function inicio() {
  yo = await datos.agenteActual();
  if (!yo) return pantallaIngreso();
  if (yo.sinPerfil) return pantallaPerfil();
  if (!yo.habilitado) return pantallaPendiente();
  if (yo.area !== AREA) return pantallaIngreso(`Tu usuario es del área ${AREAS[yo.area]?.nombre || yo.area}.`);
  pantallaPrincipal();
}
function pantallaIngreso(error) {
  const demo = datos.modo === "demo";
  $("app").innerHTML = `<div class="ingreso">
    <div class="logo">${ICONO}</div>
    <h1>${INFO.personal}</h1>
    <p class="sub">Municipalidad de 9 de Julio</p>
    <form class="inf" id="f-ing">
      ${error ? `<div class="error">${esc(error)}</div>` : ""}
      ${demo
        ? `<div class="demo-aviso" style="margin:0">Modo demo: ingresá solo con tu nombre. Para probar con varios agentes, abrí otra pestaña con otro nombre.</div>
           <label>Tu nombre<input id="i-nom" required placeholder="Ej: Juan Gómez"></label>`
        : `<label>Correo<input id="i-mail" type="email" required autocomplete="username"></label>
           <label>Contraseña<input id="i-clave" type="password" required autocomplete="current-password"></label>`}
      <button class="b" type="submit">Ingresar</button>
    </form>
    <div class="muni">NUEVE DE JULIO · MUNICIPALIDAD</div>
  </div>`;
  $("f-ing").onsubmit = async e => {
    e.preventDefault(); const b = e.target.querySelector("button"); b.disabled = true;
    try { demo ? await datos.ingresar($("i-nom").value.trim(), AREA) : await datos.ingresar($("i-mail").value.trim(), $("i-clave").value); inicio(); }
    catch (err) { pantallaIngreso("Correo o contraseña incorrectos."); }
  };
}
function pantallaPerfil() {
  $("app").innerHTML = `<div class="ingreso"><div class="logo">${ICONO}</div><h1>Completá tu perfil</h1>
    <p class="sub">Es la primera vez que ingresás.</p>
    <form class="inf" id="f-per"><label>Nombre y apellido<input id="p-nom" required></label>
    <button class="b" type="submit">Solicitar acceso a ${INFO.nombre}</button></form></div>`;
  $("f-per").onsubmit = async e => { e.preventDefault(); await datos.crearPerfil($("p-nom").value.trim(), AREA); inicio(); };
}
function pantallaPendiente() {
  $("app").innerHTML = `<div class="ingreso"><div class="logo">${ICONO}</div><h1>Acceso pendiente</h1>
    <p class="sub">Tu usuario (${esc(yo.email)}) quedó registrado. Un administrador tiene que habilitarlo para que empieces a recibir denuncias.</p>
    <button class="b" onclick="location.reload()">Ya me habilitaron</button>
    <button class="b sec" style="margin-top:10px" id="b-salir">Salir</button></div>`;
  $("b-salir").onclick = async () => { await datos.salir(); location.reload(); };
}

/* ================= PRINCIPAL ================= */
function pantallaPrincipal() {
  const avisosOk = "Notification" in window && Notification.permission === "granted";
  $("app").innerHTML = `
    <header>
      <div class="h-fila"><div class="h-ico">${ICONO}</div>
        <div class="h-tit"><small>${INFO.personal}</small><b>${esc(yo.nombre)}</b></div>
        <button class="h-salir" id="b-salir">Salir</button></div>
      <div class="servicio"><div class="txt" id="srv-txt"></div><button class="switch" id="sw" aria-label="En servicio"></button></div>
    </header>
    ${datos.modo === "demo" ? `<div class="demo-aviso"><b>Modo demo.</b> Las denuncias que hagas desde la app del vecino en este mismo celular aparecen acá al instante.</div>` : ""}
    ${avisosOk ? "" : `<button class="avisos-btn" id="b-avisos">🔔 Activar avisos de denuncias nuevas</button>`}
    <div class="tabs">
      <button class="tab" data-t="nuevas">Nuevas</button>
      <button class="tab" data-t="mias">Mis casos</button>
      <button class="tab" data-t="historial">Historial</button>
    </div>
    <div class="lista" id="lista"></div>`;
  $("b-salir").onclick = async () => { await servicio(false); await datos.salir(); location.reload(); };
  $("sw").onclick = () => servicio(!$("sw").classList.contains("on"));
  $("b-avisos") && ($("b-avisos").onclick = activarAvisos);
  document.querySelectorAll(".tab").forEach(t => t.onclick = () => { pestaña = t.dataset.t; pintar(); });
  datos.escucharDenuncias(AREA, lista => { detectarNuevas(lista); denuncias = lista; pintar(); if (abiertaId) abrirDetalle(abiertaId, true); });
  datos.escucharAgentes(AREA, l => { agentes = l; pintar(); });
  let quiere = true; try { quiere = localStorage.getItem("srv-" + yo.uid) !== "0"; } catch {}
  servicio(quiere);
}

async function servicio(on) {
  const sw = $("sw"); if (!sw) return;
  sw.classList.toggle("on", on);
  try { localStorage.setItem("srv-" + yo.uid, on ? "1" : "0"); } catch {}
  if (watchId != null) { navigator.geolocation.clearWatch(watchId); watchId = null; }
  if (on && navigator.geolocation) {
    $("srv-txt").innerHTML = "<b>En servicio</b>Buscando tu ubicación…";
    let ultimo = 0;
    watchId = navigator.geolocation.watchPosition(p => {
      miPos = { lat: p.coords.latitude, lng: p.coords.longitude, precision: Math.round(p.coords.accuracy) };
      $("srv-txt").innerHTML = `<b>En servicio</b>Ubicación activa (±${miPos.precision} m)`;
      if (Date.now() - ultimo > 45000) { ultimo = Date.now(); datos.publicarUbicacion(yo, miPos).catch(console.error); }
      pintar();
    }, () => { $("srv-txt").innerHTML = "<b>En servicio</b>⚠️ Sin acceso a la ubicación: activá el GPS"; },
    { enableHighAccuracy: true, maximumAge: 20000 });
  } else {
    $("srv-txt").innerHTML = "<b>Fuera de servicio</b>No recibís avisos de cercanía";
    await datos.fueraDeServicio(yo).catch(() => {});
  }
}

/* el agente en servicio más cercano a la denuncia */
function masCercano(d) {
  if (!d.ubicacion) return null;
  const limite = Date.now() - AGENTE_ACTIVO_MIN * 60000;
  let mejor = null;
  for (const a of agentes) {
    const pos = a.uid === yo.uid ? (miPos || a.ubicacion) : a.ubicacion;
    if (!a.enServicio || !pos || (a.uid !== yo.uid && (aFecha(a.visto) || 0) < limite)) continue;
    const m = distanciaM(pos, d.ubicacion);
    if (m != null && (!mejor || m < mejor.m)) mejor = { uid: a.uid, nombre: a.nombre, m };
  }
  return mejor;
}

function filtrar() {
  if (pestaña === "nuevas") return denuncias.filter(d => d.estado === "nueva")
    .sort((a, b) => (distanciaM(miPos, a.ubicacion) ?? 1e9) - (distanciaM(miPos, b.ubicacion) ?? 1e9));
  if (pestaña === "mias") return denuncias.filter(d => d.estado === "en_camino" && d.agenteUid === yo.uid);
  return denuncias.filter(d => d.estado === "resuelta" || d.estado === "sin_accion" || (d.estado === "en_camino" && d.agenteUid !== yo.uid));
}

function pintar() {
  const l = $("lista"); if (!l) return;
  const nN = denuncias.filter(d => d.estado === "nueva").length, nM = denuncias.filter(d => d.estado === "en_camino" && d.agenteUid === yo.uid).length;
  document.querySelectorAll(".tab").forEach(t => {
    t.classList.toggle("sel", t.dataset.t === pestaña);
    const n = t.dataset.t === "nuevas" ? nN : t.dataset.t === "mias" ? nM : 0;
    t.innerHTML = { nuevas: "Nuevas", mias: "Mis casos", historial: "Historial" }[t.dataset.t] + (n ? `<span class="n">${n}</span>` : "");
  });
  const items = filtrar();
  if (!items.length) {
    l.innerHTML = `<div class="vacio"><div>${pestaña === "nuevas" ? "✅" : pestaña === "mias" ? "🚗" : "📋"}</div>${
      { nuevas: "No hay denuncias pendientes.", mias: "No tenés casos en curso.", historial: "Todavía no hay casos cerrados." }[pestaña]}</div>`;
    return;
  }
  l.innerHTML = items.map(d => {
    const e = ESTADOS[d.estado], dist = distanciaM(miPos, d.ubicacion), mc = d.estado === "nueva" ? masCercano(d) : null;
    return `<button class="card ${d._recien ? "nueva" : ""}" style="--c:${e.color}" data-id="${d.id}">
      ${d.foto ? `<img src="${d.foto}" alt="">` : `<div class="sinfoto">${ICONO}</div>`}
      <div class="cuerpo">
        <div class="arriba"><span>${hace(d.creada)}</span><span>${dist != null ? "📍 " + textoDistancia(dist) : ""}</span></div>
        <p>${esc(d.descripcion)}</p>
        ${d.estado !== "nueva" ? `<span class="chip estado" style="--c:${e.color}">${e.txt}</span>` : ""}
        ${mc ? (mc.uid === yo.uid ? `<span class="chip cerca">⭐ Sos el más cercano</span>` : `<span class="chip">Más cerca: ${esc(mc.nombre)} (${textoDistancia(mc.m)})</span>`) : ""}
        ${d.agenteNombre && d.estado !== "nueva" ? `<span class="chip">👮 ${esc(d.agenteNombre)}</span>` : ""}
        ${d.resolucion?.resumen ? `<span class="chip">📌 ${esc(d.resolucion.resumen)}</span>` : ""}
      </div></button>`;
  }).join("");
  l.querySelectorAll(".card").forEach(c => c.onclick = () => abrirDetalle(c.dataset.id));
}

/* ================= AVISOS ================= */
async function activarAvisos() {
  if (!("Notification" in window)) return toast("Este celular no permite avisos desde el navegador.");
  const p = await Notification.requestPermission();
  if (p === "granted") { $("b-avisos")?.remove(); sonar(); toast("Avisos activados ✔"); }
  else toast("Sin permiso para avisos: igual vas a escuchar un sonido con la app abierta.");
}
let ctxAudio = null;
function sonar() {
  try {
    ctxAudio = ctxAudio || new (window.AudioContext || window.webkitAudioContext)();
    [0, 0.22, 0.44].forEach((t, i) => {
      const o = ctxAudio.createOscillator(), g = ctxAudio.createGain();
      o.frequency.value = i === 2 ? 1175 : 880; o.connect(g); g.connect(ctxAudio.destination);
      g.gain.setValueAtTime(0.25, ctxAudio.currentTime + t); g.gain.exponentialRampToValueAtTime(0.001, ctxAudio.currentTime + t + 0.18);
      o.start(ctxAudio.currentTime + t); o.stop(ctxAudio.currentTime + t + 0.2);
    });
  } catch {}
  navigator.vibrate && navigator.vibrate([250, 120, 250]);
}
async function notificar(d) {
  sonar();
  const dist = distanciaM(miPos, d.ubicacion);
  const titulo = `🚨 Nueva denuncia · ${INFO.nombre}`, cuerpo = `${d.descripcion}${dist != null ? ` · a ${textoDistancia(dist)}` : ""}`;
  if ("Notification" in window && Notification.permission === "granted") {
    try { const reg = await navigator.serviceWorker?.getRegistration(); reg ? reg.showNotification(titulo, { body: cuerpo, tag: d.id, icon: "icono.svg", badge: "icono.svg", vibrate: [250, 120, 250] }) : new Notification(titulo, { body: cuerpo }); } catch {}
  }
  toast(titulo);
}
function detectarNuevas(lista) {
  const ids = new Set(lista.filter(d => d.estado === "nueva").map(d => d.id));
  if (vistas) lista.forEach(d => { d._recien = d.estado === "nueva" && !vistas.has(d.id); if (d._recien) notificar(d); });
  vistas = ids;
}
if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});

/* ================= DETALLE ================= */
window.cerrarHoja = () => { $("hoja").classList.remove("abierta"); abiertaId = null; };
function abrirDetalle(id, refresco) {
  const d = denuncias.find(x => x.id === id); if (!d) return cerrarHoja();
  if (refresco && $("panel").querySelector("form")) return;      // no pisar un formulario a medio completar
  abiertaId = id;
  const e = ESTADOS[d.estado], dist = distanciaM(miPos, d.ubicacion), mio = d.agenteUid === yo.uid;
  const destino = d.ubicacion ? `${d.ubicacion.lat},${d.ubicacion.lng}` : encodeURIComponent((d.direccion || "") + ", 9 de Julio, Buenos Aires");
  const res = d.resolucion;
  $("panel").innerHTML = `<div class="agarre"></div>
    <span class="chip estado" style="--c:${e.color}">${e.txt}</span>
    <h2 style="margin-top:8px">Denuncia ${esc(id.slice(-6).toUpperCase())}</h2>
    <div class="meta">${hace(d.creada)}${dist != null ? " · a " + textoDistancia(dist) + " de vos" : ""}${d.agenteNombre ? " · 👮 " + esc(d.agenteNombre) : ""}</div>
    ${d.foto ? `<img class="foto" src="${d.foto}" alt="Foto de la denuncia">` : ""}
    <div class="bloque"><small>Qué denuncia el vecino</small>${esc(d.descripcion)}</div>
    <div class="bloque"><small>Dónde</small>${esc(d.direccion || "Sin dirección escrita")}${d.ubicacion ? `<br><span class="ayuda">GPS del vecino (±${d.ubicacion.precision || "?"} m)</span>` : ""}</div>
    ${res ? `<div class="bloque"><small>${esc(INFO.resolver.estado)}</small>
        ${INFO.campos.filter(c => res.campos[c.id] && res.campos[c.id] !== "—").map(c =>
          c.tipo === "patente" ? `<b style="font-size:22px;letter-spacing:2px">${esc(res.campos[c.id])}</b><br>`
                               : `<span class="ayuda">${esc(c.label)}:</span> ${esc(res.campos[c.id])}<br>`).join("")}
        <span class="ayuda">👮 ${esc(res.agenteNombre)} · ${aFecha(d.cerrada)?.toLocaleString("es-AR") || ""}</span></div>
        ${res.foto ? `<img class="foto" src="${res.foto}" alt="Foto">` : ""}` : ""}
    ${d.estado === "sin_accion" ? `<div class="bloque"><small>${esc(INFO.sinAccion.estado)}</small>${esc(d.motivo)}${d.observaciones ? `<br>${esc(d.observaciones)}` : ""}</div>` : ""}
    <div class="acciones" id="acciones">
      <a class="b sec" href="https://www.google.com/maps/dir/?api=1&destination=${destino}" target="_blank" rel="noopener">🧭 Cómo llegar</a>
      ${d.estado === "nueva" ? `<button class="b" id="b-voy">🚗 Voy yo</button>` : ""}
      ${d.estado === "en_camino" && mio ? `
        <button class="b azul" id="b-inf">${INFO.resolver.boton}</button>
        <button class="b verde" id="b-sin">${INFO.sinAccion.boton}</button>
        <button class="b sec chico" id="b-lib">Liberar (que la tome otro agente)</button>` : ""}
      <button class="b sec chico" onclick="cerrarHoja()">Cerrar</button>
    </div>`;
  $("hoja").classList.add("abierta");
  $("b-voy") && ($("b-voy").onclick = async ev => {
    ev.target.disabled = true;
    try { await datos.tomarDenuncia(id, yo); toast("Tomaste la denuncia. ¡En camino!"); pestaña = "mias"; pintar(); }
    catch (err) { toast(err.message || "No se pudo tomar."); cerrarHoja(); }
  });
  $("b-inf") && ($("b-inf").onclick = () => formResolver(d));
  $("b-sin") && ($("b-sin").onclick = () => formSinAccion(d));
  $("b-lib") && ($("b-lib").onclick = async () => { await datos.liberarDenuncia(id); toast("Denuncia liberada"); cerrarHoja(); });
}

function campoHTML(c) {
  const req = c.requerido ? "required" : "", ph = c.placeholder ? `placeholder="${esc(c.placeholder)}"` : "";
  let control;
  if (c.tipo === "select") control = `<select id="c-${c.id}" ${req}>${c.opciones.map(o => `<option>${esc(o)}</option>`).join("")}</select>`;
  else if (c.tipo === "textarea") control = `<textarea id="c-${c.id}" ${req} ${ph}></textarea>`;
  else if (c.tipo === "patente") control = `<input id="c-${c.id}" class="patente" ${req} maxlength="9" placeholder="AB123CD" autocomplete="off" autocapitalize="characters">
      <span class="ayuda">Formatos: AB123CD (Mercosur) o ABC123. Motos: A123BCD o 123ABC.</span>`;
  else control = `<input id="c-${c.id}" ${c.tipo === "numero" ? 'inputmode="numeric"' : ""} ${req} ${ph}>`;
  return `<label>${esc(c.label)}${control}</label>`;
}
const PATENTE_OK = /^([A-Z]{2}\d{3}[A-Z]{2}|[A-Z]{3}\d{3}|[A-Z]\d{3}[A-Z]{3}|\d{3}[A-Z]{3})$/;
function formResolver(d) {
  // los campos marcados "medio" se muestran de a dos por fila
  let html = "", par = [];
  for (const c of INFO.campos) {
    if (c.medio) { par.push(campoHTML(c)); if (par.length === 2) { html += `<div class="fila2">${par.join("")}</div>`; par = []; } }
    else { if (par.length) { html += par.join(""); par = []; } html += campoHTML(c); }
  }
  html += par.join("");
  $("panel").innerHTML = `<div class="agarre"></div><h2>${esc(INFO.resolver.titulo)}</h2>
    <div class="meta">Denuncia ${esc(d.id.slice(-6).toUpperCase())} · ${esc(d.direccion || "")}</div>
    <form class="inf" id="f-res">${html}
      <label>${esc(INFO.fotoLabel)}<input id="f-foto" type="file" accept="image/*" capture="environment"></label>
      <div id="f-err"></div>
      <button class="b azul" type="submit">${esc(INFO.resolver.guardar)}</button>
      <button class="b sec chico" type="button" id="b-volver">Volver</button>
    </form>`;
  $("panel").querySelectorAll("input.patente").forEach(i => i.oninput = e => e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""));
  $("b-volver").onclick = () => { $("panel").innerHTML = ""; abrirDetalle(d.id); };
  $("f-res").onsubmit = async e => {
    e.preventDefault();
    const campos = {};
    for (const c of INFO.campos) campos[c.id] = $("c-" + c.id).value.trim();
    const malPat = INFO.campos.find(c => c.tipo === "patente" && campos[c.id] && !PATENTE_OK.test(campos[c.id]));
    if (malPat) { $("f-err").innerHTML = `<div class="error">Revisá la patente: "${esc(campos[malPat.id])}" no tiene un formato válido.</div>`; $("c-" + malPat.id).focus(); return; }
    const b = e.target.querySelector("button[type=submit]"); b.disabled = true; b.textContent = "Guardando…";
    try {
      const pos = miPos || await ubicacionActual();
      const resumen = INFO.resumen(campos) || "";
      await datos.cerrarDenuncia(d.id, { estado: "resuelta", resolucion: {
        campos, resumen, foto: await comprimirFoto($("f-foto").files[0]), ubicacion: pos || null,
        agenteUid: yo.uid, agenteNombre: yo.nombre, fecha: Date.now() } });
      toast(`${INFO.resolver.ok}${resumen ? " · " + resumen : ""}`); pestaña = "historial"; $("panel").innerHTML = ""; cerrarHoja(); pintar();
    } catch (err) { console.error(err); b.disabled = false; b.textContent = INFO.resolver.guardar; $("f-err").innerHTML = `<div class="error">No se pudo guardar. Revisá la conexión.</div>`; }
  };
}
function formSinAccion(d) {
  $("panel").innerHTML = `<div class="agarre"></div><h2>${esc(INFO.sinAccion.estado)}</h2>
    <form class="inf" id="f-sin">
      <label>Motivo<select id="motivo">${INFO.sinAccion.motivos.map(t => `<option>${t}</option>`).join("")}</select></label>
      <label>Observaciones<textarea id="obs2"></textarea></label>
      <button class="b verde" type="submit">Cerrar denuncia</button>
      <button class="b sec chico" type="button" id="b-volver">Volver</button>
    </form>`;
  $("b-volver").onclick = () => { $("panel").innerHTML = ""; abrirDetalle(d.id); };
  $("f-sin").onsubmit = async e => {
    e.preventDefault();
    await datos.cerrarDenuncia(d.id, { estado: "sin_accion", motivo: $("motivo").value, observaciones: $("obs2").value.trim() });
    toast("Denuncia cerrada"); pestaña = "historial"; $("panel").innerHTML = ""; cerrarHoja(); pintar();
  };
}

setInterval(pintar, 60000);   // refresca los "hace X min"
inicio();
