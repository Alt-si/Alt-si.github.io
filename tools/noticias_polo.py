"""Lee las últimas novedades de polosancayetano.com.ar (WordPress) y las guarda en
app-9dejulio/polo.json, con las imágenes de portada en app-9dejulio/polo-img/.
Lo ejecuta automáticamente la GitHub Action .github/workflows/noticias-9dejulio.yml."""
import json, os, re, sys, html, datetime, urllib.request
import xml.etree.ElementTree as ET

BASE = "https://polosancayetano.com.ar/"
SALIDA = "app-9dejulio/polo.json"
CARPETA_IMG = "app-9dejulio/polo-img"
MAX = 10

def bajar(url):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (app-9dejulio)"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read()

def limpiar(t):
    return " ".join(html.unescape(re.sub(r"<[^>]+>", "", t or "")).split())

def fecha_corta(iso):
    try:
        d = datetime.datetime.fromisoformat(iso.replace("Z", ""))
        return f"{d.day}/{d.month}/{d.strftime('%y')}"
    except Exception:
        return ""

def desde_api():
    datos = json.loads(bajar(BASE + f"wp-json/wp/v2/posts?per_page={MAX}&_embed=wp:featuredmedia"))
    out = []
    for p in datos:
        img = ""
        try:
            img = p["_embedded"]["wp:featuredmedia"][0]["source_url"]
        except Exception:
            pass
        out.append({"id": str(p["id"]), "titulo": limpiar(p["title"]["rendered"]), "fecha": fecha_corta(p.get("date", "")),
                    "link": p["link"], "imagen": img})
    return out

def desde_rss():
    raiz = ET.fromstring(bajar(BASE + "feed/"))
    out = []
    for it in raiz.iter("item"):
        link = it.findtext("link") or ""
        fecha = it.findtext("pubDate") or ""
        try:
            fecha = datetime.datetime.strptime(fecha[:16], "%a, %d %b %Y").strftime("%-d/%-m/%y")
        except Exception:
            fecha = ""
        m = re.search(r'<img[^>]+src="([^"]+)"', it.findtext("{http://purl.org/rss/1.0/modules/content/}encoded") or "")
        out.append({"id": link.rstrip("/").rsplit("/", 1)[-1], "titulo": limpiar(it.findtext("title")),
                    "fecha": fecha, "link": link, "imagen": m.group(1) if m else ""})
    return out[:MAX]

def guardar_imagen(n):
    url = n["imagen"]
    if not url:
        return ""
    ext = os.path.splitext(url.split("?")[0])[1].lower()
    ext = ext if ext in (".jpg", ".jpeg", ".png", ".webp", ".gif") else ".jpg"
    nombre = re.sub(r"[^a-z0-9-]", "", n["id"].lower())[:60] + ext
    destino = os.path.join(CARPETA_IMG, nombre)
    if not os.path.exists(destino):
        try:
            os.makedirs(CARPETA_IMG, exist_ok=True)
            open(destino, "wb").write(bajar(url))
        except Exception as e:
            print("  no se pudo bajar", url, e)
            return url
    return "polo-img/" + nombre

def main():
    try:
        lista = desde_api()
    except Exception as e:
        print("API de WordPress no disponible, uso el RSS:", e)
        try:
            lista = desde_rss()
        except Exception as e2:
            print("Tampoco hay RSS; no se modifica el archivo.", e2); sys.exit(0)
    lista = [n for n in lista if n["titulo"]]
    if not lista:
        print("Sin novedades; no se modifica el archivo."); sys.exit(0)
    for n in lista:
        n["imagen_original"] = n["imagen"]
        n["imagen"] = guardar_imagen(n)
    usadas = {os.path.basename(n["imagen"]) for n in lista}
    if os.path.isdir(CARPETA_IMG):
        for f in os.listdir(CARPETA_IMG):
            if f not in usadas:
                os.remove(os.path.join(CARPETA_IMG, f))
    try:
        if json.load(open(SALIDA, encoding="utf-8"))["noticias"] == lista:
            print("Sin cambios."); return
    except Exception:
        pass
    json.dump({"actualizado": datetime.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"), "fuente": BASE, "noticias": lista},
              open(SALIDA, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"{len(lista)} novedades del Polo guardadas.")

# ---------------- Empresas que acompañan (logos del carrusel de la portada) ----------------
SALIDA_EMP = "app-9dejulio/polo-empresas.json"
CARPETA_EMP = "app-9dejulio/polo-empresas"

def logos_portada():
    from bs4 import BeautifulSoup
    sopa = BeautifulSoup(bajar(BASE).decode("utf-8", "replace"), "html.parser")
    titulo = sopa.find(string=re.compile(r"empresas", re.I))
    if not titulo:
        return []
    nodo = titulo.parent
    for _ in range(8):                      # subir hasta el bloque que contiene los logos
        if len(nodo.find_all("img")) >= 3 or nodo.parent is None:
            break
        nodo = nodo.parent
    if len(nodo.find_all("img")) < 3:       # el carrusel puede estar en el bloque siguiente
        sig = nodo.find_next(lambda t: t.name in ("div", "section") and len(t.find_all("img")) >= 3)
        nodo = sig or nodo
    urls = []
    for img in nodo.find_all("img"):
        src = img.get("data-src") or img.get("data-lazy-src") or img.get("src") or ""
        if src.startswith("data:") or "/wp-content/uploads/" not in src:
            continue
        src = urllib.request.urljoin(BASE, src).replace("http://", "https://")
        if src not in urls:
            urls.append(src)
    return urls

def actualizar_empresas():
    try:
        urls = logos_portada()
    except Exception as e:
        print("No se pudieron leer los logos:", e); return
    if not urls:
        print("No se encontraron logos de empresas; no se modifica."); return
    os.makedirs(CARPETA_EMP, exist_ok=True)
    lista, usadas = [], set()
    for u in urls:
        nombre = re.sub(r"[^A-Za-z0-9._-]", "", os.path.basename(u.split("?")[0]))[:80]
        destino = os.path.join(CARPETA_EMP, nombre)
        local = "polo-empresas/" + nombre
        if not os.path.exists(destino):
            try:
                open(destino, "wb").write(bajar(u))
            except Exception as e:
                print("  no se pudo bajar", u, e); local = u
        usadas.add(nombre); lista.append({"imagen": local, "imagen_original": u})
    for f in os.listdir(CARPETA_EMP):
        if f not in usadas:
            os.remove(os.path.join(CARPETA_EMP, f))
    try:
        if json.load(open(SALIDA_EMP, encoding="utf-8"))["empresas"] == lista:
            print("Empresas sin cambios."); return
    except Exception:
        pass
    json.dump({"actualizado": datetime.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"), "fuente": BASE, "empresas": lista},
              open(SALIDA_EMP, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"{len(lista)} logos de empresas guardados.")

if __name__ == "__main__":
    try:
        main()
    finally:
        actualizar_empresas()
