// Descarga los logos de los canales desde la base de iptv-org y los guarda en logos/ + data/logos.json.
// Opcional: si falla algo, deja lo que ya había. Solo baja los que faltan.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { loadChannels, normName, idKey } from "./match.mjs";

const API = "https://iptv-org.github.io/api/";
const get = async (f) => { const r = await fetch(API + f); if (!r.ok) throw new Error(f + " " + r.status); return r.json(); };
const outUrl = new URL("../data/logos.json", import.meta.url);
let out = {};
try { out = JSON.parse(readFileSync(outUrl, "utf8")); } catch {}
mkdirSync(new URL("../logos/", import.meta.url), { recursive: true });

let chans = [], logos = [];
try { chans = await get("channels.json"); } catch (e) { console.log("channels.json:", e.message); }
try { logos = await get("logos.json"); } catch (e) { console.log("logos.json:", e.message); }

// url del logo por id de canal de iptv-org (logos.json: {channel, feed, format, width, height, url}; antes venía en channels.json)
const urlOf = new Map();
const score = (l) => (l.feed ? 0 : 4) + (/png|svg/i.test(l.format || l.url) ? 2 : 0) + ((l.width || 0) >= 100 ? 1 : 0);
for (const l of logos) { const k = idKey(l.channel); if (!urlOf.has(k) || score(l) > score(urlOf.get(k))) urlOf.set(k, l); }
for (const c of chans) if (c.logo && !urlOf.has(idKey(c.id))) urlOf.set(idKey(c.id), { url: c.logo });
// nombre -> id de iptv-org (prefiere Argentina)
const byName = new Map();
for (const c of chans) {
  if (!urlOf.has(idKey(c.id))) continue;
  for (const n of [c.name, ...(c.alt_names || [])]) {
    const k = normName(n); if (!k) continue;
    if (!byName.has(k) || c.country === "AR") byName.set(k, idKey(c.id));
  }
}

let ok = 0, miss = [];
for (const ch of loadChannels()) {
  if (out[ch.id] && existsSync(new URL("../" + out[ch.id], import.meta.url))) continue;
  const keys = [idKey(ch.id), ...(ch.alias || []).map(idKey)];
  let l = keys.map((k) => urlOf.get(k)).find(Boolean);
  if (!l) for (const n of [ch.name, ...(ch.names || [])]) { const id = byName.get(normName(n)); if (id) { l = urlOf.get(id); break; } }
  if (!l) { miss.push(ch.id); continue; }
  try {
    const r = await fetch(l.url);
    if (!r.ok) throw new Error(r.status);
    const buf = Buffer.from(await r.arrayBuffer());
    const type = r.headers.get("content-type") || "";
    const ext = /svg/.test(type) ? "svg" : /jpe?g/.test(type) ? "jpg" : /webp/.test(type) ? "webp" : /png/.test(type) ? "png" : (/\.(png|svg|jpe?g|webp)(\?|$)/i.exec(l.url) || [, ""])[1].toLowerCase().replace("jpeg", "jpg");
    if (!ext || buf.length > 250000 || buf.length < 100) throw new Error("tipo/tamaño " + type + " " + buf.length);
    const file = "logos/" + ch.id.replace(/[^A-Za-z0-9._+-]/g, "_") + "." + ext;
    writeFileSync(new URL("../" + file, import.meta.url), buf);
    out[ch.id] = file; ok++;
  } catch (e) { miss.push(ch.id + "(" + e.message + ")"); }
}
writeFileSync(outUrl, JSON.stringify(out));
console.log(`Logos: ${Object.keys(out).length} en total (${ok} nuevos). Sin logo: ${miss.join(", ")}`);
