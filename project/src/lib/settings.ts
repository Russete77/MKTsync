import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import i18n from '../i18n';

export interface Settings {
  notifications: {
    email: boolean;
    push: boolean;
  };
  language: string;
  currency: string;
}

interface SettingsStore extends Settings {
  updateSettings: (settings: Partial<Settings>) => void;
  updateNotifications: (notifications: Partial<Settings['notifications']>) => void;
  setLanguage: (language: string) => void;
  setCurrency: (currency: string) => void;
}

export const useSettings = create<SettingsStore>()(
  persist(
    (set) => ({
      notifications: {
        email: false,
        push: false,
      },
      language: 'en',
      currency: 'USD',
      updateSettings: (newSettings) =>
        set((state) => ({
          ...state,
          ...newSettings,
        })),
      updateNotifications: (notifications) =>
        set((state) => ({
          ...state,
          notifications: {
            ...state.notifications,
            ...notifications,
          },
        })),
      setLanguage: (language) => {
        i18n.changeLanguage(language);
        set((state) => ({ ...state, language }));
      },
      setCurrency: (currency) =>
        set((state) => ({ ...state, currency })),
    }),
    {
      name: 'app-settings',
    }
  )
);