// Genera data/channels.json. Editá esta lista para agregar/quitar canales
// o cambiar en qué proveedor está cada uno.
// id      = identificador interno (y el id XMLTV por defecto)
// alias   = otros ids con los que puede aparecer en la fuente de datos
// cat     = categoría por defecto
// providers = directv | flow | telecentro  (VERIFICAR contra cada grilla oficial)
import { writeFileSync } from "node:fs";
const ALL = ["directv", "flow", "telecentro"];
const L = [
  // [id, nombre, cat, providers?]
  ["Telefe.ar", "Telefe", "ent"], ["ElTrece.ar", "El Trece", "ent"], ["AmericaTV.ar", "América TV", "ent"],
  ["ElNueve.ar", "El Nueve", "ent"], ["TVPublica.ar", "TV Pública", "ent"], ["NetTV.ar", "Net TV", "ent"],
  ["TN.ar", "TN", "news"], ["C5N.ar", "C5N", "news"], ["A24.ar", "A24", "news"], ["LN+.ar", "LN+", "news"],
  ["Canal26.ar", "Canal 26", "news"], ["CronicaTV.ar", "Crónica TV", "news"], ["IPNoticias.ar", "IP Noticias", "news"],
  ["CNNenEspanol.us", "CNN en Español", "news"],
  ["ESPN.ar", "ESPN", "sports"], ["ESPN2.ar", "ESPN 2", "sports"], ["ESPN3.ar", "ESPN 3", "sports"],
  ["ESPNPremium.ar", "ESPN Premium", "sports"], ["FoxSports.ar", "Fox Sports", "sports"],
  ["FoxSports2.ar", "Fox Sports 2", "sports"], ["FoxSports3.ar", "Fox Sports 3", "sports"],
  ["TyCSports.ar", "TyC Sports", "sports"], ["TNTSports.ar", "TNT Sports", "sports"],
  ["DSports.ar", "DSports", "sports", ["directv"]], ["DSports2.ar", "DSports 2", "sports", ["directv"]],
  ["TNT.ar", "TNT", "movies"], ["Space.ar", "Space", "movies"], ["Warner.ar", "Warner Channel", "series"],
  ["AXN.ar", "AXN", "series"], ["StudioUniversal.ar", "Studio Universal", "movies"], ["Cinecanal.ar", "Cinecanal", "movies"],
  ["Cinemax.ar", "Cinemax", "movies"], ["FX.ar", "FX", "series"], ["StarChannel.ar", "Star Channel", "series"],
  ["TCM.ar", "TCM", "movies"], ["ParamountChannel.ar", "Paramount Channel", "movies"], ["FilmArts.ar", "Film&Arts", "movies"],
  ["ComedyCentral.ar", "Comedy Central", "series"], ["TNTSeries.ar", "TNT Series", "series"], ["Sony.ar", "Sony Channel", "series"],
  ["UniversalTV.ar", "Universal TV", "series"], ["AE.ar", "A&E", "docs"], ["Lifetime.ar", "Lifetime", "series"],
  ["TLC.ar", "TLC", "ent"], ["FoodNetwork.ar", "Food Network", "ent"],
  ["Discovery.ar", "Discovery Channel", "docs"], ["NatGeo.ar", "National Geographic", "docs"], ["History.ar", "History", "docs"],
  ["AnimalPlanet.ar", "Animal Planet", "docs"], ["InvestigationDiscovery.ar", "Investigation Discovery", "docs"],
  ["CartoonNetwork.ar", "Cartoon Network", "kids"], ["DisneyChannel.ar", "Disney Channel", "kids"], ["Nickelodeon.ar", "Nickelodeon", "kids"],
  ["DiscoveryKids.ar", "Discovery Kids", "kids"], ["DisneyJunior.ar", "Disney Junior", "kids"], ["PakaPaka.ar", "Paka Paka", "kids"],
  ["Tooncast.ar", "Tooncast", "kids"], ["Cartoonito.ar", "Cartoonito", "kids"],
  ["MTV.ar", "MTV", "music"], ["QuieroMusica.ar", "Quiero Música", "music"],
];
const channels = L.map(([id, name, cat, providers]) => ({ id, name, cat, providers: providers || ALL }));
writeFileSync(new URL("../data/channels.json", import.meta.url), JSON.stringify({ channels }, null, 1));
console.log(channels.length, "canales");
