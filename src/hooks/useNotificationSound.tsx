import { useEffect, useRef } from 'react';
import { settingsService } from '@/services/settingsService';
import { useAuth } from './useAuth';

export const useNotificationSound = () => {
  const { user } = useAuth();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const preferencesRef = useRef({ sound: 'default', volume: 50, enabled: true });

  useEffect(() => {
    if (user) {
      loadSoundPreferences();
    }
  }, [user]);

  const loadSoundPreferences = async () => {
    if (!user) return;
    try {
      const prefs = await settingsService.getUserPreferences(parseInt(user.id));
      if (prefs) {
        preferencesRef.current = {
          sound: prefs.notification_sound || 'default',
          volume: prefs.notification_volume || 50,
          enabled: prefs.push_notifications || false
        };
      }
    } catch (error) {
      console.error('Failed to load sound preferences:', error);
    }
  };

  const playSound = (soundType: string = 'default') => {
    if (!preferencesRef.current.enabled) return;

    try {
      // Create audio element if it doesn't exist
      if (!audioRef.current) {
        audioRef.current = new Audio();
      }

      const audio = audioRef.current;
      const { sound, volume } = preferencesRef.current;

      // Use custom sound if specified, otherwise use the type
      const soundFile = sound === 'default' ? soundType : sound;

      // Map sound types to audio files
      const soundMap: Record<string, string> = {
        default: '/sounds/notification.mp3',
        success: '/sounds/success.mp3',
        alert: '/sounds/alert.mp3',
        chime: '/sounds/chime.mp3',
        ping: '/sounds/ping.mp3',
      };

      audio.src = soundMap[soundFile] || soundMap.default;
      audio.volume = volume / 100;
      
      // Play the sound
      audio.play().catch(err => {
        console.warn('Failed to play notification sound:', err);
      });
    } catch (error) {
      console.error('Error playing notification sound:', error);
    }
  };

  return { playSound };
};