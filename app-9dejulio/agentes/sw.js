// Service worker mínimo: permite mostrar notificaciones del sistema y
// abrir la mini app al tocarlas.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil(self.clients.claim()));
self.addEventListener("notificationclick", e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(ws => {
    const w = ws.find(c => c.url.includes("/agentes/"));
    return w ? w.focus() : self.clients.openWindow("./");
  }));
});
