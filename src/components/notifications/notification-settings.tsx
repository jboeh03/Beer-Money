"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import {
  deletePushSubscription,
  savePushSubscription,
  sendTestNotification,
} from "@/app/settings/notifications/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { urlBase64ToBytes } from "@/lib/push/bytes";
import { isIosDevice, notificationAvailability, type NotificationAvailability } from "@/lib/push/device";

type NotificationSettingsProps = {
  publicKey: string | null;
  signedIn: boolean;
  deviceCount: number;
};

type BrowserSnapshot = {
  checked: boolean;
  userAgent: string;
  platform: string;
  maxTouchPoints: number;
  standalone: boolean;
  pushSupported: boolean;
};

const SERVER_BROWSER: BrowserSnapshot = {
  checked: false,
  userAgent: "",
  platform: "",
  maxTouchPoints: 0,
  standalone: false,
  pushSupported: false,
};

let browserCache: BrowserSnapshot = SERVER_BROWSER;

function browserSnapshot(): BrowserSnapshot {
  const standalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator &&
      (navigator as Navigator & { standalone?: boolean }).standalone === true);
  const next: BrowserSnapshot = {
    checked: true,
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    maxTouchPoints: navigator.maxTouchPoints,
    standalone,
    pushSupported:
      "serviceWorker" in navigator && "PushManager" in window && "Notification" in window,
  };
  if (
    browserCache.checked === next.checked &&
    browserCache.userAgent === next.userAgent &&
    browserCache.platform === next.platform &&
    browserCache.maxTouchPoints === next.maxTouchPoints &&
    browserCache.standalone === next.standalone &&
    browserCache.pushSupported === next.pushSupported
  ) {
    return browserCache;
  }
  browserCache = next;
  return next;
}

function subscribeBrowser(onChange: () => void) {
  const media = window.matchMedia("(display-mode: standalone)");
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

export function NotificationSettings({ publicKey, signedIn, deviceCount }: NotificationSettingsProps) {
  const router = useRouter();
  const browser = useSyncExternalStore(subscribeBrowser, browserSnapshot, () => SERVER_BROWSER);
  const availability: NotificationAvailability | null = browser.checked
    ? notificationAvailability(browser)
    : null;
  const ios = browser.checked && isIosDevice(browser);
  const [permission, setPermission] = useState<NotificationPermission | "unknown">("unknown");
  const [thisDevice, setThisDevice] = useState(false);
  const [pending, setPending] = useState<"enable" | "test" | "disable" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!browser.checked || !browser.pushSupported) return;
    let cancelled = false;
    navigator.serviceWorker
      .register("/sw.js")
      .then(async (registration) => {
        const existing = await registration.pushManager.getSubscription();
        if (cancelled) return;
        setThisDevice(Boolean(existing));
        setPermission(Notification.permission);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [browser.checked, browser.pushSupported]);

  const canEnable = signedIn && Boolean(publicKey) && availability === "ready" && pending === null;
  const canTest = signedIn && deviceCount > 0 && pending === null;
  const canDisable = signedIn && thisDevice && pending === null;

  async function enable() {
    if (!publicKey) {
      setError("Set the VAPID public key before enabling notifications.");
      return;
    }
    setPending("enable");
    setError(null);
    setMessage(null);
    try {
      const registration = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result !== "granted") {
        setError("Notifications stay off until you allow them.");
        return;
      }
      const applicationServerKey = urlBase64ToBytes(publicKey);
      if (!applicationServerKey) {
        setError("The VAPID public key is not a valid P-256 key.");
        return;
      }
      const existing = await registration.pushManager.getSubscription();
      const subscription =
        existing ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey,
        }));
      const json = subscription.toJSON();
      const saved = await savePushSubscription({
        endpoint: json.endpoint,
        keys: json.keys,
      });
      if (!saved.ok) {
        setError(saved.error);
        return;
      }
      setThisDevice(true);
      setMessage("Notifications are on for this device. You still claim rewards yourself.");
      router.refresh();
    } catch (caught) {
      setError(enableFailure(caught));
    } finally {
      setPending(null);
    }
  }

  async function disable() {
    setPending("disable");
    setError(null);
    setMessage(null);
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      const subscription = await registration?.pushManager.getSubscription();
      if (!subscription) {
        setThisDevice(false);
        setMessage("This device is already off.");
        return;
      }
      const endpoint = subscription.endpoint;
      await subscription.unsubscribe();
      const removed = await deletePushSubscription(endpoint);
      if (!removed.ok) {
        setError(removed.error);
        return;
      }
      setThisDevice(false);
      setMessage("Notifications are off for this device.");
      router.refresh();
    } catch {
      setError("Could not disable notifications on this device.");
    } finally {
      setPending(null);
    }
  }

  async function sendTest() {
    setPending("test");
    setError(null);
    setMessage(null);
    try {
      const result = await sendTestNotification();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setMessage("Test notification sent. You still claim rewards yourself.");
      router.refresh();
    } finally {
      setPending(null);
    }
  }

  return (
    <Card>
      <h2 className="text-sm font-semibold text-foreground">This device</h2>
      <p className="mt-2 text-sm text-secondary" role="status">
        {statusLine({ availability, permission, thisDevice, deviceCount, ios, signedIn, publicKey })}
      </p>
      {availability === "needs-home-screen" ? (
        <p className="mt-2 text-sm text-secondary">
          This is a Safari tab. iOS delivers web push only from the home-screen app.
        </p>
      ) : null}
      {availability === "ready" && ios ? (
        <p className="mt-2 text-sm text-secondary">You are in the home-screen app, so notifications can be enabled.</p>
      ) : null}
      <div className="mt-4 flex flex-wrap gap-2">
        <Button onClick={() => void enable()} disabled={!canEnable} aria-busy={pending === "enable" || undefined}>
          Enable notifications
        </Button>
        <Button
          variant="secondary"
          onClick={() => void sendTest()}
          disabled={!canTest}
          aria-busy={pending === "test" || undefined}
        >
          Send test notification
        </Button>
        <Button
          variant="secondary"
          onClick={() => void disable()}
          disabled={!canDisable}
          aria-busy={pending === "disable" || undefined}
        >
          Disable
        </Button>
      </div>
      {message ? (
        <p className="mt-4 text-sm text-foreground" role="status">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="mt-4 text-sm text-negative" role="alert">
          {error}
        </p>
      ) : null}
    </Card>
  );
}

function statusLine({
  availability,
  permission,
  thisDevice,
  deviceCount,
  ios,
  signedIn,
  publicKey,
}: {
  availability: NotificationAvailability | null;
  permission: NotificationPermission | "unknown";
  thisDevice: boolean;
  deviceCount: number;
  ios: boolean;
  signedIn: boolean;
  publicKey: string | null;
}) {
  const saved = `Saved devices: ${deviceCount}.`;
  if (!availability) return `Checking this browser… ${saved}`;
  if (!signedIn && !publicKey) {
    return `Sign in and set the VAPID public key before enabling notifications. ${saved}`;
  }
  if (!signedIn) return `Sign in to save this device. ${saved}`;
  if (!publicKey) return `The VAPID public key is not set. ${saved}`;
  if (availability === "needs-home-screen") {
    return `Open Beer Money from the home-screen icon, then enable notifications. ${saved}`;
  }
  if (availability === "unsupported") {
    return ios
      ? `This iPhone browser cannot show push notifications. ${saved}`
      : `This browser cannot show push notifications. ${saved}`;
  }
  if (permission === "denied") {
    return `Notifications are blocked for Beer Money. Allow them in system settings, then try again. ${saved}`;
  }
  if (thisDevice) return `This device is subscribed. ${saved}`;
  return `This device can enable notifications. ${saved}`;
}

function enableFailure(error: unknown): string {
  if (error instanceof DOMException && error.name === "NotAllowedError") {
    return "The browser blocked notifications. On iPhone, open Beer Money from the home screen and allow them.";
  }
  return "Could not enable notifications on this device.";
}
