"""Lee las últimas noticias de www.9dejulio.gov.ar y las guarda en app-9dejulio/noticias.json.
Lo ejecuta automáticamente la GitHub Action .github/workflows/noticias-9dejulio.yml."""
import json, os, re, sys, datetime, urllib.request
from urllib.parse import urljoin
from bs4 import BeautifulSoup

BASE = "https://www.9dejulio.gov.ar/"
SALIDA = "app-9dejulio/noticias.json"
CARPETA_IMG = "app-9dejulio/noticias-img"   # las portadas se guardan acá
MAX = 12
FECHA_RE = re.compile(r"\b(\d{1,2}/\d{1,2}/\d{2,4})\b")

def bajar(url):
    req = urllib.request.Request(url.replace(" ", "%20"), headers={"User-Agent": "Mozilla/5.0 (app-9dejulio)"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read(), r.headers

def descargar(url):
    datos, h = bajar(url)
    return datos.decode(h.get_content_charset() or "utf-8", "replace")

def portada(n):
    """Imagen de portada de la noticia: la og:image de la nota (tamaño completo) o, si no hay, la de la portada."""
    try:
        nota = BeautifulSoup(descargar(n["link"]), "html.parser")
        og = nota.find("meta", property="og:image")
        if og and og.get("content"):
            return urljoin(n["link"], og["content"])
    except Exception as e:
        print("  no se pudo leer la nota", n["id"], e)
    return n["imagen"]

def guardar_imagen(n):
    """Descarga la portada y devuelve la ruta relativa para la app (o la URL original si falla)."""
    url = portada(n)
    if not url:
        return ""
    ext = os.path.splitext(url.split("?")[0])[1].lower()
    ext = ext if ext in (".jpg", ".jpeg", ".png", ".webp", ".gif") else ".jpg"
    nombre = f"{n['id']}{ext}"
    destino = os.path.join(CARPETA_IMG, nombre)
    if not os.path.exists(destino):
        try:
            datos, _ = bajar(url)
            os.makedirs(CARPETA_IMG, exist_ok=True)
            open(destino, "wb").write(datos)
        except Exception as e:
            print("  no se pudo bajar la imagen", url, e)
            return url
    return "noticias-img/" + nombre

def limpiar_titulo(t):
    t = " ".join(t.split()).strip(" -–")
    t = re.sub(r"^\d{1,2}/\d{1,2}/\d{2,4}\s*[-–|:]?\s*", "", t)   # sacar la fecha pegada al título
    # la web publica los títulos en MAYÚSCULAS: pasarlos a oración
    if t.isupper():
        t = t.capitalize()
    return t[:1].upper() + t[1:]

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
    for n in lista:
        n["imagen_original"] = n["imagen"]
        n["imagen"] = guardar_imagen(n)
    # borrar portadas de noticias que ya salieron de la lista
    usadas = {os.path.basename(n["imagen"]) for n in lista}
    if os.path.isdir(CARPETA_IMG):
        for f in os.listdir(CARPETA_IMG):
            if f not in usadas:
                os.remove(os.path.join(CARPETA_IMG, f))
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
