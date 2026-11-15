/* Service worker di Uchi: riceve le notifiche push, apre l'app al tocco
   e tiene una copia del Wallet per aprire le carte anche senza linea. */
const CACHE = "uchi-wallet-v1";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) =>
  e.waitUntil(
    caches
      .keys()
      .then((k) => Promise.all(k.filter((n) => n.startsWith("uchi-wallet-") && n !== CACHE).map((n) => caches.delete(n))))
      .then(() => self.clients.claim()),
  ),
);

self.addEventListener("fetch", (evento) => {
  const r = evento.request;
  const url = new URL(r.url);
  if (url.origin !== self.location.origin) return;

  // Uscendo dall'app (il modulo "Esci" fa una POST), la copia delle carte si cancella
  if (url.pathname.startsWith("/auth/esci")) {
    evento.waitUntil(caches.delete(CACHE));
    return;
  }
  if (r.method !== "GET") return;

  // File dell'app (con il nome che cambia a ogni versione) e immagini: prima la copia, poi la rete
  if (url.pathname.startsWith("/_next/static/") || url.pathname === "/icona-512.png") {
    evento.respondWith(
      caches.open(CACHE).then((c) =>
        c.match(r).then(
          (copia) =>
            copia ||
            fetch(r).then((risposta) => {
              if (risposta.ok) c.put(r, risposta.clone());
              return risposta;
            }),
        ),
      ),
    );
    return;
  }

  // Pagine: sempre dalla rete; la pagina del Wallet si salva. Senza linea si apre la copia del Wallet.
  if (r.mode === "navigate") {
    evento.respondWith(
      fetch(r)
        .then((risposta) => {
          if (url.pathname === "/wallet" && risposta.ok && !risposta.redirected) {
            const copia = risposta.clone();
            caches.open(CACHE).then((c) => c.put("/wallet", copia));
          }
          return risposta;
        })
        .catch(() => caches.open(CACHE).then((c) => c.match("/wallet")).then((copia) => copia || Response.error())),
    );
  }
});

self.addEventListener("push", (evento) => {
  let dati = { title: "Uchi", body: "", url: "/", tag: undefined };
  try {
    dati = { ...dati, ...evento.data.json() };
  } catch (_) {
    if (evento.data) dati.body = evento.data.text();
  }
  evento.waitUntil(
    self.registration.showNotification(dati.title, {
      body: dati.body,
      tag: dati.tag,
      renotify: Boolean(dati.tag),
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
