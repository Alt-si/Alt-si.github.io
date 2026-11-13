"""Carga en app-9dejulio/sem.json las calles del estacionamiento medido dibujadas en Google My Maps.
Uso: python tools/kml_a_sem.py archivo.kml
- Cada LÍNEA del mapa = un tramo de calle con SEM (ponerle de nombre la calle, ej. "Libertad").
- Cada FORMA (polígono) = un área completa con SEM."""
import sys, json, xml.etree.ElementTree as ET
NS = "{http://www.opengis.net/kml/2.2}"
kml, salida = sys.argv[1], "app-9dejulio/sem.json"
lineas, poligonos = [], []
for pm in ET.parse(kml).getroot().iter(NS + "Placemark"):
    nombre = (pm.findtext(NS + "name") or "").strip() or None
    for ls in pm.iter(NS + "LineString"):
        pts = [[round(float(c.split(",")[1]), 7), round(float(c.split(",")[0]), 7)] for c in ls.findtext(NS + "coordinates").split()]
        lineas.append({"nombre": nombre, "puntos": pts})
    for pg in pm.iter(NS + "Polygon"):
        c = pg.find(f".//{NS}outerBoundaryIs//{NS}coordinates").text.split()
        poligonos.append({"nombre": nombre, "puntos": [[round(float(x.split(",")[1]), 7), round(float(x.split(",")[0]), 7)] for x in c]})
d = json.load(open(salida, encoding="utf-8"))
d["geometria"] = {"lineas": lineas, "poligonos": poligonos}
json.dump(d, open(salida, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(f"{len(lineas)} calles y {len(poligonos)} áreas cargadas en {salida}")
