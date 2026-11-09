/* Service worker di PinguHome: riceve le notifiche push e apre l'app al tocco. */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("push", (evento) => {
  let dati = { title: "PinguHome", body: "", url: "/", tag: undefined };
  try {
    dati = { ...dati, ...evento.data.json() };
  } catch (_) {
    if (evento.data) dati.body = evento.data.text();
  }
  evento.waitUntil(
    self.registration.showNotification(dati.title, {
      body: dati.body,
      tag: dati.tag,
      icon: "/notifica-icona.png",
      badge: "/notifica-icona.png",
      data: { url: dati.url },
    }),
  );
});

self.addEventListener("notificationclick", (evento) => {
  evento.notification.close();
  const url = (evento.notification.data && evento.notification.data.url) || "/";
  evento.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((finestre) => {
      for (const f of finestre) {
        if ("focus" in f) {
          f.navigate(url);
          return f.focus();
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});
