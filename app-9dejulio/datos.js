/* =====================================================================
   Capa de datos de denuncias — misma API para Firebase y para modo demo.
   ===================================================================== */
import { firebaseConfig } from "./firebase-config.js";

export const AREAS = {
  "transito":      { nombre: "Tránsito",      color: "#ea580c" },
  "policial":      { nombre: "Policial",      color: "#1d4ed8" },
  "residuos":      { nombre: "Residuos",      color: "#d91c90" },
  "espacio-verde": { nombre: "Espacio verde", color: "#15803d" },
  "otros":         { nombre: "Otros",         color: "#6b7280" },
};

export const ESTADOS = {
  nueva:           { txt: "Nueva",                  color: "#c8102e" },
  en_camino:       { txt: "Agente en camino",       color: "#ea580c" },
  con_infraccion:  { txt: "Infracción labrada",     color: "#1d4ed8" },
  sin_infraccion:  { txt: "Verificada sin infracción", color: "#15803d" },
};

/* ---------- utilidades ---------- */
export function distanciaM(a, b) {
  if (!a || !b || a.lat == null || b.lat == null) return null;
  const R = 6371000, r = x => x * Math.PI / 180;
  const dLat = r(b.lat - a.lat), dLng = r(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)));
}
export function textoDistancia(m) {
  if (m == null) return "distancia desconocida";
  return m < 1000 ? `${m} m` : `${(m / 1000).toFixed(1).replace(".", ",")} km`;
}
export function aFecha(t) {           // Timestamp de Firestore, número o Date → Date
  if (!t) return null;
  if (t.toDate) return t.toDate();
  return new Date(t);
}
/** Reduce una foto a máx. 900 px y JPEG liviano (data URL, ~100 KB) para guardarla en la base. */
export function comprimirFoto(archivo, max = 900, calidad = 0.6) {
  return new Promise((ok, mal) => {
    if (!archivo) return ok(null);
    const img = new Image(), url = URL.createObjectURL(archivo);
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      ok(c.toDataURL("image/jpeg", calidad));
    };
    img.onerror = mal; img.src = url;
  });
}
export function ubicacionActual(timeout = 10000) {
  return new Promise(ok => {
    if (!navigator.geolocation) return ok(null);
    navigator.geolocation.getCurrentPosition(
      p => ok({ lat: p.coords.latitude, lng: p.coords.longitude, precision: Math.round(p.coords.accuracy) }),
      () => ok(null), { enableHighAccuracy: true, timeout, maximumAge: 30000 });
  });
}
export const AGENTE_ACTIVO_MIN = 15;   // un agente cuenta como "en servicio" si mandó ubicación en los últimos 15 min

/* =====================================================================
   MODO FIREBASE
   ===================================================================== */
async function crearFirebase() {
  const V = "10.12.2", B = `https://www.gstatic.com/firebasejs/${V}/`;
  const { initializeApp } = await import(B + "firebase-app.js");
  const A = await import(B + "firebase-auth.js");
  const F = await import(B + "firebase-firestore.js");
  const app = initializeApp(firebaseConfig);
  const auth = A.getAuth(app), db = F.getFirestore(app);

  const usuario = () => new Promise(ok => { const u = A.onAuthStateChanged(auth, x => { u(); ok(x); }); });

  return {
    modo: "firebase",

    async crearDenuncia(d) {
      let u = await usuario();
      if (!u) u = (await A.signInAnonymously(auth)).user;
      const ref = await F.addDoc(F.collection(db, "denuncias"), {
        ...d, estado: "nueva", vecinoUid: u.uid, creada: F.serverTimestamp(),
      });
      return ref.id;
    },

    /* ---- agentes ---- */
    async agenteActual() {
      const u = await usuario();
      if (!u || u.isAnonymous) return null;
      const s = await F.getDoc(F.doc(db, "agentes", u.uid));
      return { uid: u.uid, email: u.email, ...(s.exists() ? s.data() : { sinPerfil: true }) };
    },
    async ingresar(email, clave) {
      await A.signInWithEmailAndPassword(auth, email, clave);
      return this.agenteActual();
    },
    async crearPerfil(nombre, area) {             // queda pendiente hasta que el administrador lo habilite
      const u = auth.currentUser;
      await F.setDoc(F.doc(db, "agentes", u.uid), { nombre, area, email: u.email, habilitado: false });
      return this.agenteActual();
    },
    salir() { return A.signOut(auth); },

    async publicarUbicacion(agente, pos) {
      await F.updateDoc(F.doc(db, "agentes", agente.uid), { ubicacion: pos, enServicio: true, visto: F.serverTimestamp() });
    },
    async fueraDeServicio(agente) {
      await F.updateDoc(F.doc(db, "agentes", agente.uid), { enServicio: false });
    },
    escucharAgentes(area, cb) {
      const q = F.query(F.collection(db, "agentes"), F.where("area", "==", area), F.where("habilitado", "==", true));
      return F.onSnapshot(q, s => cb(s.docs.map(x => ({ uid: x.id, ...x.data() }))));
    },
    escucharDenuncias(area, cb) {
      const q = F.query(F.collection(db, "denuncias"), F.where("tipo", "==", area));
      return F.onSnapshot(q, s => cb(s.docs.map(x => ({ id: x.id, ...x.data() }))
        .sort((a, b) => (aFecha(b.creada) || 0) - (aFecha(a.creada) || 0))));
    },
    /** El primero que toca "Voy" se la queda (transacción: si otro ya la tomó, falla). */
    async tomarDenuncia(id, agente) {
      const ref = F.doc(db, "denuncias", id);
      await F.runTransaction(db, async t => {
        const s = await t.get(ref);
        if (s.data().estado !== "nueva") throw new Error("Otro agente ya tomó esta denuncia.");
        t.update(ref, { estado: "en_camino", agenteUid: agente.uid, agenteNombre: agente.nombre, tomada: F.serverTimestamp() });
      });
    },
    async liberarDenuncia(id) {
      await F.updateDoc(F.doc(db, "denuncias", id), { estado: "nueva", agenteUid: null, agenteNombre: null, tomada: null });
    },
    async cerrarDenuncia(id, resultado) {           // resultado: {estado, infraccion?, motivo?}
      await F.updateDoc(F.doc(db, "denuncias", id), { ...resultado, cerrada: F.serverTimestamp() });
    },
  };
}

/* =====================================================================
   MODO DEMO — todo queda en este navegador (sirve para probar el circuito
   con la app del vecino en una pestaña y la del agente en otra).
   ===================================================================== */
function crearDemo() {
  const K_DEN = "demo9dj-denuncias", K_AG = "demo9dj-agentes", K_YO = "demo9dj-agente-actual";
  const canal = "BroadcastChannel" in window ? new BroadcastChannel("demo9dj") : null;
  const leer = k => { try { return JSON.parse(localStorage.getItem(k)) || {}; } catch { return {}; } };
  const escribir = (k, v) => { localStorage.setItem(k, JSON.stringify(v)); canal && canal.postMessage(k); avisar(k); };
  const oyentes = [];
  const avisar = k => oyentes.forEach(o => o.k === k && o.f());
  canal && (canal.onmessage = e => avisar(e.data));
  window.addEventListener("storage", e => avisar(e.key));
  const escuchar = (k, f) => { const o = { k, f }; oyentes.push(o); f(); return () => oyentes.splice(oyentes.indexOf(o), 1); };
  const nuevoId = () => "D" + Date.now().toString(36).toUpperCase();

  return {
    modo: "demo",
    async crearDenuncia(d) {
      const t = leer(K_DEN), id = nuevoId();
      t[id] = { ...d, id, estado: "nueva", creada: Date.now() }; escribir(K_DEN, t); return id;
    },
    async agenteActual() { const uid = localStorage.getItem(K_YO); return uid ? leer(K_AG)[uid] || null : null; },
    async ingresar(nombre) {
      const ag = leer(K_AG), uid = "A-" + nombre.toLowerCase().replace(/\W+/g, "-");
      ag[uid] = ag[uid] || { uid, nombre, area: "transito", habilitado: true };
      escribir(K_AG, ag); localStorage.setItem(K_YO, uid); return ag[uid];
    },
    async crearPerfil() { return this.agenteActual(); },
    async salir() { localStorage.removeItem(K_YO); },
    async publicarUbicacion(a, pos) { const ag = leer(K_AG); Object.assign(ag[a.uid], { ubicacion: pos, enServicio: true, visto: Date.now() }); escribir(K_AG, ag); },
    async fueraDeServicio(a) { const ag = leer(K_AG); ag[a.uid].enServicio = false; escribir(K_AG, ag); },
    escucharAgentes(area, cb) { return escuchar(K_AG, () => cb(Object.values(leer(K_AG)).filter(a => a.area === area))); },
    escucharDenuncias(area, cb) {
      return escuchar(K_DEN, () => cb(Object.values(leer(K_DEN)).filter(d => d.tipo === area).sort((a, b) => b.creada - a.creada)));
    },
    async tomarDenuncia(id, a) {
      const t = leer(K_DEN);
      if (t[id].estado !== "nueva") throw new Error("Otro agente ya tomó esta denuncia.");
      Object.assign(t[id], { estado: "en_camino", agenteUid: a.uid, agenteNombre: a.nombre, tomada: Date.now() }); escribir(K_DEN, t);
    },
    async liberarDenuncia(id) { const t = leer(K_DEN); Object.assign(t[id], { estado: "nueva", agenteUid: null, agenteNombre: null, tomada: null }); escribir(K_DEN, t); },
    async cerrarDenuncia(id, r) { const t = leer(K_DEN); Object.assign(t[id], r, { cerrada: Date.now() }); escribir(K_DEN, t); },
  };
}

export const datos = firebaseConfig ? await crearFirebase() : crearDemo();
