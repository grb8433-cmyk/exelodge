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
  // Global Background & Surface
  white: '#FFFFFF',
  background: '#FAFAF8',
  surface: '#FFFFFF',
  surfaceSubtle: '#F4F7F5',
  surfaceInput: '#F4F7F5',

  // Borders
  border: '#E8EDE9',
  borderSubtle: 'rgba(0,0,0,0.06)',

  // Feature Card Accents (non-uni)
  accentPrice: '#4B6CF5',
  accentPriceBg: '#F0F4FF',
  accentLegal: '#7C3AED',
  accentLegalBg: '#F5F0FF',
  accentReviews: '#E07B20',
  accentReviewsBg: '#FFF8F0',
  accentAmber: '#F59E0B',
  accentAmberBg: '#FFFBEB',

  // Review Scores
  scoreHigh: '#0B9B6E',
  scoreMid: '#D97706',
  scoreLow: '#DC2626',

  // Star Rating
  starFilled: '#FBBF24',
  starStroke: '#F59E0B',
  starEmpty: '#E8EDE9',
  starEmptyStroke: '#D1D0CE',

  // Text Colours
  textPrimary: '#1C1917',
  textSecondary: '#57534E',
  textMuted: '#A8A29E',
  textDisabled: '#A8A29E',

  // Status
  success: '#0F9B6E',
  error: '#DC2626',
  warning: '#D97706',
};

export const darkColors = {
  // Global Background & Surface
  white: '#FFFFFF',
  background: '#0D1117',
  surface: '#161B22',
  surfaceSubtle: '#21262D',
  surfaceInput: '#0D1117',

  // Borders
  border: '#30363D',
  borderSubtle: 'rgba(255,255,255,0.06)',

  // Feature Card Accents (non-uni)
  accentPrice: '#58A6FF',
  accentPriceBg: '#0D1117',
  accentLegal: '#A371F7',
  accentLegalBg: '#0D1117',
  accentReviews: '#F0883E',
  accentReviewsBg: '#0D1117',
  accentAmber: '#D29922',
  accentAmberBg: '#0D1117',

  // Review Scores
  scoreHigh: '#3FB950',
  scoreMid: '#D29922',
  scoreLow: '#F85149',

  // Star Rating
  starFilled: '#FBBF24',
  starStroke: '#D29922',
  starEmpty: '#30363D',
  starEmptyStroke: '#484F58',

  // Text Colours
  textPrimary: '#F0F6FC',
  textSecondary: '#C9D1D9',
  textMuted: '#8B949E',
  textDisabled: '#484F58',

  // Status
  success: '#3FB950',
  error: '#F85149',
  warning: '#D29922',
};

/**
 * Utility to darken or lighten a hex color
 */
function adjustColor(color: string, amount: number) {
  return '#' + color.replace(/^#/, '').replace(/../g, color => ('0' + Math.min(255, Math.max(0, parseInt(color, 16) + amount)).toString(16)).slice(-2));
}

export const getUniversityColors = (universityId: string, isDarkMode = false) => {
  const uni = UNIVERSITIES.find(u => u.id === universityId) || UNIVERSITIES[0];
  const base = isDarkMode ? darkColors : baseColors;
  
  if (universityId === 'bristol') {
    return {
      ...base,
      primary: '#BE0F34',
      primaryDark: '#9A0C2A',
      primaryMedium: isDarkMode ? '#3A141A' : '#E0CCD2',
      primaryLight: isDarkMode ? '#1E0D10' : '#FDF2F3',
    };
  }

  if (universityId === 'southampton') {
    return {
      ...base,
      primary: '#E07B20',
      primaryDark: '#B85D14',
      primaryMedium: isDarkMode ? '#3D2010' : '#FDDCB8',
      primaryLight: isDarkMode ? '#261508' : '#FEF6EC',
    };
  }

  // Exeter (Default)
  return {
    ...base,
    primary: '#0B6E4F',
    primaryDark: '#085240',
    primaryMedium: isDarkMode ? '#112D22' : '#C8E6DA',
    primaryLight: isDarkMode ? '#0D1A15' : '#EFF7F3',
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
    shadowColor: 'rgba(0,0,0,1)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  medium: {
    shadowColor: 'rgba(0,0,0,1)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 5,
  },
  card: {
    shadowColor: 'rgba(0,0,0,1)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  cardHover: {
    shadowColor: 'rgba(0,0,0,1)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.10,
    shadowRadius: 30,
    elevation: 8,
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
  wordmark: { fontFamily, fontSize: 18, fontWeight: '900' as any, letterSpacing: -0.5 },
  h1Landing: { fontFamily, fontSize: 48, fontWeight: '900' as any, letterSpacing: -2, lineHeight: 48 },
  h1Page: { fontFamily, fontSize: 24, fontWeight: '900' as any, letterSpacing: -0.5, lineHeight: 36 },
  h1Overview: { fontFamily, fontSize: 36, fontWeight: '900' as any, letterSpacing: -1.5, lineHeight: 36 },
  h2Section: { fontFamily, fontSize: 24, fontWeight: '900' as any, letterSpacing: -0.5, lineHeight: 36 },
  h2ReviewScore: { fontFamily, fontSize: 30, fontWeight: '900' as any, letterSpacing: -1, lineHeight: 30 },
  h3Card: { fontFamily, fontSize: 16, fontWeight: '700' as any, lineHeight: 24 },
  priceLarge: { fontFamily, fontSize: 32, fontWeight: '900' as any, letterSpacing: -1, lineHeight: 32 },
  eyebrow: { fontFamily, fontSize: 10, fontWeight: '700' as any, letterSpacing: 1.5, textTransform: 'uppercase' as any },
  body: { fontFamily, fontSize: 14, fontWeight: '400' as any, lineHeight: 22.75 },
  bodySubtle: { fontFamily, fontSize: 13, fontWeight: '400' as any, lineHeight: 19.5 },
  bodySmall: { fontFamily, fontSize: 12, fontWeight: '500' as any, lineHeight: 18 },
  caption: { fontFamily, fontSize: 11, fontWeight: '400' as any, lineHeight: 16 },
};

export const BREAKPOINTS = {
  tablet: 768,
  desktop: 1024,
};

export const isDesktop = (width: number) => width >= BREAKPOINTS.tablet;
