import { useState, useEffect } from "react";

export interface AppSettings {
  emailNotifications: boolean;
  pushNotifications: boolean;
  leaveUpdates: boolean;
  compactView: boolean;
}

const DEFAULT_SETTINGS: AppSettings = {
  emailNotifications: true,
  pushNotifications: true,
  leaveUpdates: true,
  compactView: false,
};

const SETTINGS_KEY = "app_settings";

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(() => {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (stored) {
      try {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
      } catch (e) {
        console.error("Failed to parse settings:", e);
        return DEFAULT_SETTINGS;
      }
    }
    return DEFAULT_SETTINGS;
  });

  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }, [settings]);

  const updateSetting = <K extends keyof AppSettings>(
    key: K,
    value: AppSettings[K]
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const resetSettings = () => {
    setSettings(DEFAULT_SETTINGS);
    localStorage.removeItem(SETTINGS_KEY);
  };

  return {
    settings,
    updateSetting,
    resetSettings,
  };
}
