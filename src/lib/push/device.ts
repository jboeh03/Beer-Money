type DeviceSignals = {
  userAgent: string;
  platform: string;
  maxTouchPoints: number;
};

export type NotificationAvailability = "ready" | "needs-home-screen" | "unsupported";

export function isIosDevice(device: DeviceSignals): boolean {
  if (/iPad|iPhone|iPod/.test(device.userAgent)) return true;
  return device.platform === "MacIntel" && device.maxTouchPoints > 1;
}

export function notificationAvailability(
  device: DeviceSignals & { standalone: boolean; pushSupported: boolean },
): NotificationAvailability {
  if (isIosDevice(device) && !device.standalone) return "needs-home-screen";
  if (!device.pushSupported) return "unsupported";
  return "ready";
}
