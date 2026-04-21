import { Platform } from 'react-native';
import UNIVERSITIES from '../../config/universities.json';

// Inject Inter font on web at module load time
if (Platform.OS === 'web' && typeof document !== 'undefined') {
  if (!document.head.querySelector('[data-exelodge-fonts]')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap';
    link.setAttribute('data-exelodge-fonts', 'true');
    document.head.appendChild(link);
  }
}

// Premium font stack — Inter on web, system on native
export const fontFamily =
  Platform.OS === 'web'
    ? "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    : undefined;

export const baseColors = {
  // Warm Off-White — feels expensive
  white: '#FFFFFF',
  background: '#FAFAF8',
  cardBg: '#FFFFFF',

  // Gold Accent — depth and premium signal
  accent: '#C9A84C',
  accentLight: '#FBF5EA',
  accentDark: '#9B7A2F',

  // Text — warm dark instead of cold slate
  textPrimary: '#1C1917',   // warm-stone 900
  textSecondary: '#57534E', // warm-stone 600
  textMuted: '#A8A29E',     // warm-stone 400

  // Status
  success: '#0F9B6E',
  error: '#DC2626',
  warning: '#D97706',

  // Borders — warm tinted grey-green
  border: '#E8EDE9',
  borderDark: '#C9D4CC',

  // Surface tiers
  surfaceSubtle: '#F4F7F5',
  surfaceHover: '#EDF3EF',
};

/**
 * Utility to darken or lighten a hex color
 */
function adjustColor(color: string, amount: number) {
  return '#' + color.replace(/^#/, '').replace(/../g, color => ('0' + Math.min(255, Math.max(0, parseInt(color, 16) + amount)).toString(16)).slice(-2));
}

export const getUniversityColors = (universityId: string) => {
  const uni = UNIVERSITIES.find(u => u.id === universityId) || UNIVERSITIES[0];
  const primary = uni.primaryColor || '#0B6E4F';
  
  // Bristol Red specifically needs to be vibrant
  if (universityId === 'bristol') {
    return {
      ...baseColors,
      primary: '#BE0F34',
      primaryDark: '#9A0C2A',
      primaryMedium: '#E0CCD2',
      primaryLight: '#FDF2F3',
    };
  }

  // Exeter Green
  return {
    ...baseColors,
    primary: '#0B6E4F',
    primaryDark: '#085240',
    primaryMedium: '#C8E6DA',
    primaryLight: '#EFF7F3',
  };
};

// Legacy Export for safety (default to Exeter)
export const colors = {
  ...baseColors,
  primary: '#0B6E4F',
  primaryDark: '#085240',
  primaryLight: '#EFF7F3',
  primaryMedium: '#C8E6DA',
};

export const shadows = {
  soft: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  medium: {
    shadowColor: '#1C1917',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 5,
  },
  card: {
    shadowColor: '#1C1917',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 3,
  },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const radii = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const typography = {
  h1: { fontFamily, fontSize: 32, fontWeight: '800' as any, letterSpacing: -0.5 },
  h2: { fontFamily, fontSize: 24, fontWeight: '700' as any, letterSpacing: -0.3 },
  h3: { fontFamily, fontSize: 20, fontWeight: '700' as any },
  h4: { fontFamily, fontSize: 17, fontWeight: '600' as any },
  body: { fontFamily, fontSize: 15, fontWeight: '400' as any, lineHeight: 22 },
  bodySmall: { fontFamily, fontSize: 13, fontWeight: '400' as any },
  label: { fontFamily, fontSize: 12, fontWeight: '700' as any, letterSpacing: 0.5, textTransform: 'uppercase' as any },
  caption: { fontFamily, fontSize: 11, fontWeight: '500' as any },
};

export const BREAKPOINTS = {
  tablet: 768,
  desktop: 1024,
};

export const isDesktop = (width: number) => width >= BREAKPOINTS.tablet;
