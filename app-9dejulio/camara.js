/* =====================================================================
   Cámara de la app: saca la foto EN EL MOMENTO (no deja elegir archivos de
   la galería) y le estampa fecha, hora y ubicación para que no se pueda
   cambiar después.
   Uso: const foto = await tomarFoto({ sello: () => "texto del sello" });
        → data URL JPEG, o null si la persona cancela.
   ===================================================================== */

const CSS = `
.cam9{position:fixed;inset:0;z-index:1000;background:#000;display:flex;flex-direction:column;font-family:inherit}
.cam9 video,.cam9 img.prev{flex:1;width:100%;min-height:0;object-fit:cover;background:#000}
.cam9 .barra{display:flex;align-items:center;justify-content:space-around;padding:18px 16px calc(22px + env(safe-area-inset-bottom));background:#000}
.cam9 button{border:none;background:none;color:#fff;font:inherit;font-size:15px;font-weight:700;cursor:pointer;min-width:80px}
.cam9 .disparo{width:76px;height:76px;min-width:0;border-radius:50%;background:#fff;box-shadow:0 0 0 5px rgba(255,255,255,.35)}
.cam9 .disparo:active{transform:scale(.92)}
.cam9 .usar{background:#22c55e;border-radius:14px;padding:12px 18px}
.cam9 .aviso{position:absolute;top:calc(16px + env(safe-area-inset-top));left:16px;right:16px;color:#fff;text-align:center;
  font-size:13px;background:rgba(0,0,0,.45);padding:8px 12px;border-radius:10px}
.cam9 .error{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#fff;text-align:center;padding:30px;gap:12px;font-size:15px;line-height:1.45}
.cam9 .error b{font-size:18px}`;

function estilos() {
  if (document.getElementById("cam9-css")) return;
  const s = document.createElement("style"); s.id = "cam9-css"; s.textContent = CSS; document.head.appendChild(s);
}

export function camaraDisponible() {
  return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
}

export function tomarFoto({ sello = () => "", max = 1280, calidad = 0.72 } = {}) {
  estilos();
  return new Promise(resolver => {
    const caja = document.createElement("div"); caja.className = "cam9";
    document.body.appendChild(caja);
    let stream = null, mirando = "environment";

    const terminar = valor => {
      if (stream) stream.getTracks().forEach(t => t.stop());
      caja.remove(); resolver(valor);
    };
    const error = (titulo, texto) => {
      caja.innerHTML = `<div class="error"><div style="font-size:44px">📷</div><b>${titulo}</b><div>${texto}</div>
        <button class="usar" style="margin-top:10px">Volver</button></div>`;
      caja.querySelector("button").onclick = () => terminar(null);
    };

    async function abrir() {
      if (stream) stream.getTracks().forEach(t => t.stop());
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: mirando }, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false });
      } catch (e) {
        return error("No pudimos abrir la cámara",
          "Para adjuntar una foto, permití el uso de la cámara a esta página (en el candado o en la configuración del navegador) y volvé a intentar.");
      }
      caja.innerHTML = `<div class="aviso">La foto se saca en el momento y queda registrada con fecha, hora y ubicación.</div>
        <video autoplay playsinline muted></video>
        <div class="barra"><button class="cancelar">Cancelar</button><button class="disparo" aria-label="Sacar foto"></button><button class="girar">⟲ Girar</button></div>`;
      const video = caja.querySelector("video"); video.srcObject = stream;
      caja.querySelector(".cancelar").onclick = () => terminar(null);
      caja.querySelector(".girar").onclick = () => { mirando = mirando === "environment" ? "user" : "environment"; abrir(); };
      caja.querySelector(".disparo").onclick = () => capturar(video);
    }

    function capturar(video) {
      const w0 = video.videoWidth, h0 = video.videoHeight;
      if (!w0) return;
      const k = Math.min(1, max / Math.max(w0, h0));
      const w = Math.round(w0 * k), h = Math.round(h0 * k);
      const c = document.createElement("canvas"); c.width = w; c.height = h;
      const g = c.getContext("2d");
      g.drawImage(video, 0, 0, w, h);
      // sello: franja inferior con fecha, hora y ubicación
      const texto = sello(), fs = Math.max(14, Math.round(w / 42));
      g.fillStyle = "rgba(0,0,0,.55)"; g.fillRect(0, h - fs * 2.2, w, fs * 2.2);
      g.fillStyle = "#fff"; g.font = `600 ${fs}px sans-serif`; g.textBaseline = "middle";
      g.fillText(texto, fs * 0.6, h - fs * 1.1, w - fs * 1.2);
      const url = c.toDataURL("image/jpeg", calidad);
      // vista previa: usar o repetir
      if (stream) stream.getTracks().forEach(t => t.stop()); stream = null;
      caja.innerHTML = `<img class="prev" src="${url}" alt="Foto tomada">
        <div class="barra"><button class="repetir">↺ Repetir</button><button class="usar">Usar esta foto</button></div>`;
      caja.querySelector(".repetir").onclick = abrir;
      caja.querySelector(".usar").onclick = () => terminar(url);
    }

    if (!camaraDisponible()) {
      error("Cámara no disponible", "Este navegador no permite usar la cámara desde la página. Probá con Chrome o Safari actualizados.");
    } else abrir();
  });
}

/** Texto del sello: "9 de Julio · 15/11/2026 12:58 · -35.44412, -60.88470 (±8 m)" */
export function textoSello(pos) {
  const f = new Date();
  const fecha = f.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" }) + " " +
                f.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
  const lugar = pos ? `${pos.lat.toFixed(5)}, ${pos.lng.toFixed(5)} (±${pos.precision} m)` : "sin ubicación";
  return `9 de Julio · ${fecha} · ${lugar}`;
}
