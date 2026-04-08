import { Platform } from 'react-native';

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

export const colors = {
  // Deep Emerald — premium, not "startup green"
  primary: '#0B6E4F',
  primaryDark: '#085240',
  primaryLight: '#EFF7F3',
  primaryMedium: '#C8E6DA',

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

export const shadows = {
  soft: {
    shadowColor: '#0B6E4F',
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

export const radii = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  full: 9999,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

const baseFont: any = { fontFamily };

export const typography = {
  logo: {
    ...baseFont,
    fontSize: 24,
    fontWeight: '800' as any,
    letterSpacing: -0.5,
    color: colors.primary,
  },
  h1: { ...baseFont, fontSize: 36, fontWeight: '800' as any, color: colors.textPrimary, letterSpacing: -0.5 },
  h2: { ...baseFont, fontSize: 26, fontWeight: '700' as any, color: colors.textPrimary, letterSpacing: -0.3 },
  h3: { ...baseFont, fontSize: 20, fontWeight: '700' as any, color: colors.textPrimary },
  h4: { ...baseFont, fontSize: 16, fontWeight: '700' as any, color: colors.textPrimary },
  body: { ...baseFont, fontSize: 15, fontWeight: '400' as any, color: colors.textSecondary, lineHeight: 24 },
  bodySmall: { ...baseFont, fontSize: 13, fontWeight: '400' as any, color: colors.textSecondary, lineHeight: 20 },
  label: {
    ...baseFont,
    fontSize: 11,
    fontWeight: '700' as any,
    color: colors.textMuted,
    textTransform: 'uppercase' as any,
    letterSpacing: 0.8,
  },
  caption: {
    ...baseFont,
    fontSize: 11,
    fontWeight: '600' as any,
    color: colors.textMuted,
    letterSpacing: 0.5,
  },
};

export const BREAKPOINTS = {
  tablet: 768,
  desktop: 1024,
};

export const isDesktop = (width: number) => width >= BREAKPOINTS.tablet;
