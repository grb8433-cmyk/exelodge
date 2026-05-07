import { Platform } from 'react-native';

/**
 * Tracks a custom event using Google Analytics 4 (Web only).
 * On mobile, this function is a no-op to prevent crashes.
 */
export function trackEvent(eventName: string, params?: Record<string, any>) {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', eventName, params);
  }
}
