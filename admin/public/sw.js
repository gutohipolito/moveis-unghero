const CACHE_VERSION = "mu-admin-v10";

self.addEventListener("push", (event) => {
  let payload = {
    title: "Sistema - Móveis Unghero",
    body: "Você tem um novo alerta no painel.",
    icon: "/pwa-icon/192",
    badge: "/pwa-icon/192",
    tag: "mu-push",
    requireInteraction: false,
    data: { href: "/", notificationId: "mu-push" },
  };

  try {
    if (event.data) {
      const parsed = event.data.json();
      payload = { ...payload, ...parsed, data: { ...payload.data, ...parsed.data } };
    }
  } catch {
    // mantém payload padrão
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: payload.icon,
      badge: payload.badge,
      tag: payload.tag,
      requireInteraction: payload.requireInteraction,
      data: payload.data,
    })
  );
});

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) =>
      cache.addAll(["/pwa-icon/192", "/pwa-icon/512"]).catch(() => undefined)
    )
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const href = event.notification.data?.href || "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client) {
          if ("navigate" in client && typeof client.navigate === "function") {
            return client.navigate(href).then(() => client.focus());
          }
          client.postMessage({ type: "notification-navigate", href });
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(href);
      }
      return undefined;
    })
  );
});

function isNextManagedRequest(request, url) {
  if (url.pathname.startsWith("/api/")) return true;
  if (url.pathname.startsWith("/_next/")) return true;
  if (url.pathname.startsWith("/quotes/")) return true;
  if (url.searchParams.has("_rsc")) return true;
  if (request.headers.get("RSC") === "1") return true;
  if (request.headers.get("Next-Router-Prefetch")) return true;
  if (request.headers.get("Next-Router-State-Tree")) return true;
  if (request.headers.get("Next-Url")) return true;
  return false;
}

function isPwaIcon(url) {
  return url.pathname.startsWith("/pwa-icon/") || url.pathname.startsWith("/icon-mu");
}

function offlineFallback() {
  return new Response("Offline", {
    status: 503,
    statusText: "Service Unavailable",
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  // Prefetch RSC / chunks / API: o Next aborta essas requests — não virar 503 no console.
  if (isNextManagedRequest(event.request, url)) return;

  if (isPwaIcon(url)) {
    event.respondWith(
      caches.match(event.request).then(
        (cached) =>
          cached ||
          fetch(event.request).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, copy));
            }
            return res;
          })
      )
    );
    return;
  }

  if (event.request.mode !== "navigate") return;

  event.respondWith(
    fetch(event.request).catch(async (err) => {
      if (err && err.name === "AbortError") throw err;
      const cached = await caches.match(event.request);
      return cached || offlineFallback();
    })
  );
});
