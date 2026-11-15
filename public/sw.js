// Push and notification clicks only. This worker does not cache pages.
self.addEventListener("push", (event) => {
  const payload = readPayload(event);
  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      data: { url: payload.url },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = notificationUrl(event.notification.data && event.notification.data.url);
  event.waitUntil(openOrFocus(target));
});

function readPayload(event) {
  const fallback = { title: "Beer Money", body: "", url: "/today" };
  if (!event.data) return fallback;
  try {
    const parsed = event.data.json();
    const title =
      typeof parsed.title === "string" && parsed.title.trim() ? parsed.title.trim().slice(0, 120) : fallback.title;
    const body = typeof parsed.body === "string" ? parsed.body.slice(0, 280) : "";
    const url = typeof parsed.url === "string" ? parsed.url : fallback.url;
    return { title, body, url };
  } catch {
    return fallback;
  }
}

function notificationUrl(raw) {
  const fallback = new URL("/today", self.location.origin).href;
  if (typeof raw !== "string" || raw.length === 0 || raw.length > 2000 || raw.includes("\\")) {
    return fallback;
  }
  try {
    const url = new URL(raw, self.location.origin);
    if (url.username || url.password) return fallback;
    if (url.origin === self.location.origin) return url.href;
    if (url.protocol === "https:") return url.href;
  } catch {
    return fallback;
  }
  return fallback;
}

async function openOrFocus(target) {
  const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
  for (const client of windows) {
    if (!client.url.startsWith(self.location.origin)) continue;
    if ("navigate" in client && typeof client.navigate === "function") {
      await client.navigate(target);
    }
    if ("focus" in client) return client.focus();
  }
  if (self.clients.openWindow) return self.clients.openWindow(target);
  return undefined;
}
