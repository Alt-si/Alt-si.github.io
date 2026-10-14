// Uso: node tools/filter-channels.mjs entrada.channels.xml salida.channels.xml
// Deja solo los canales de la fuente que están en data/channels.json (por id o por nombre).
import { readFileSync, writeFileSync } from "node:fs";
import { loadChannels, buildMaps, resolve } from "./match.mjs";
const [inp, out] = process.argv.slice(2);
const xml = readFileSync(inp, "utf8");
const maps = buildMaps(loadChannels());
const re = /<channel\b([^>]*)>([\s\S]*?)<\/channel>/g;
let m, keep = [], skip = [];
while ((m = re.exec(xml))) {
  const id = (/xmltv_id="([^"]*)"/.exec(m[1]) || [])[1] || "";
  const name = m[2].replace(/<!\[CDATA\[|\]\]>/g, "").trim();
  (resolve(maps, id, name) ? keep : skip).push(m[0]);
  if (!resolve(maps, id, name)) skip[skip.length - 1] = name;
}
const head = (xml.match(/^[\s\S]*?<channels[^>]*>/) || ['<?xml version="1.0" encoding="UTF-8"?>\n<channels>'])[0];
writeFileSync(out, head + "\n  " + keep.join("\n  ") + "\n</channels>\n");
console.log(`${inp}: ${keep.length} canales coinciden, ${skip.length} no.`);
console.log("Sin coincidencia (por si querés sumarlos a channels.json):", skip.slice(0, 400).join(" | "));
