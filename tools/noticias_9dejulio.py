"""Lee las últimas noticias de www.9dejulio.gov.ar y las guarda en app-9dejulio/noticias.json.
Lo ejecuta automáticamente la GitHub Action .github/workflows/noticias-9dejulio.yml."""
import json, re, sys, datetime, urllib.request
from urllib.parse import urljoin
from bs4 import BeautifulSoup

BASE = "https://www.9dejulio.gov.ar/"
SALIDA = "app-9dejulio/noticias.json"
MAX = 12
FECHA_RE = re.compile(r"\b(\d{1,2}/\d{1,2}/\d{2,4})\b")

def descargar(url):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (app-9dejulio)"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read().decode(r.headers.get_content_charset() or "utf-8", "replace")

def limpiar_titulo(t):
    t = " ".join(t.split()).strip(" -–")
    # la web publica los títulos en MAYÚSCULAS: pasarlos a oración
    if t.isupper():
        t = t.capitalize()
    return t

def main():
    sopa = BeautifulSoup(descargar(BASE + "index.php"), "html.parser")
    noticias = {}
    for a in sopa.select('a[href*="noticia.php?id="]'):
        m = re.search(r"id=(\d+)", a["href"])
        if not m:
            continue
        nid = int(m.group(1))
        n = noticias.setdefault(nid, {"id": nid, "titulo": "", "fecha": "", "imagen": "",
                                      "link": urljoin(BASE, a["href"])})
        texto = a.get_text(" ", strip=True)
        if len(texto) > len(n["titulo"]) and not texto.lower().startswith(("ver m", "leer m")):
            n["titulo"] = texto
        # imagen y fecha: dentro del enlace o en el bloque que lo contiene
        nodo = a
        for _ in range(4):
            if not n["imagen"]:
                img = nodo.find("img") if hasattr(nodo, "find") else None
                if img and img.get("src"):
                    n["imagen"] = urljoin(BASE, img["src"])
                    if not n["titulo"] and img.get("alt"):
                        n["titulo"] = img["alt"]
            if not n["fecha"]:
                f = FECHA_RE.search(nodo.get_text(" ", strip=True))
                if f:
                    n["fecha"] = f.group(1)
            if n["imagen"] and n["fecha"]:
                break
            nodo = nodo.parent
            if nodo is None:
                break
    lista = [dict(n, titulo=limpiar_titulo(n["titulo"])) for n in noticias.values() if n["titulo"]]
    lista.sort(key=lambda n: n["id"], reverse=True)
    lista = lista[:MAX]
    if not lista:
        print("No se encontraron noticias; no se modifica el archivo."); sys.exit(0)
    try:
        previo = json.load(open(SALIDA, encoding="utf-8"))["noticias"]
    except Exception:
        previo = None
    if previo == lista:
        print("Sin cambios."); return
    json.dump({"actualizado": datetime.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
               "fuente": BASE + "index.php", "noticias": lista},
              open(SALIDA, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"{len(lista)} noticias guardadas.")

if __name__ == "__main__":
    main()
