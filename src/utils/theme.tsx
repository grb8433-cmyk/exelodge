import { Platform } from 'react-native';

export const colors = {
  // Primary Exeter Green
  primary: '#006633',
  primaryDark: '#004d26',
  primaryLight: '#f0fdf4',
  primaryMedium: '#dcfce7',
  
  // UI Neutrals
  white: '#FFFFFF',
  background: '#f8fafc',
  cardBg: '#FFFFFF',
  
  // Text (Modern Slate Palette)
  textPrimary: '#0f172a',   // Slate 900
  textSecondary: '#475569', // Slate 600
  textMuted: '#94a3b8',    // Slate 400
  
  // Accents
  accent: '#16a34a',
  success: '#10b981',
  error: '#ef4444',
  warning: '#f59e0b',
  border: '#f1f5f9',       // Slate 100
};

export const shadows = {
  // Soft, diffuse premium shadows
  soft: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 20,
    elevation: 5,
  },
};

export const radii = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 20, // Modern "App" card feel
  full: 9999,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const typography = {
  logo: { 
    fontSize: 28, 
    fontWeight: '800' as any, 
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    letterSpacing: -0.5 
  },
  h1: { fontSize: 32, fontWeight: '800' as any, color: '#0f172a' },
  h2: { fontSize: 24, fontWeight: '700' as any, color: '#0f172a' },
  h3: { fontSize: 20, fontWeight: '700' as any, color: '#0f172a' },
  h4: { fontSize: 17, fontWeight: '700' as any, color: '#0f172a' },
  body: { fontSize: 16, color: '#475569', lineHeight: 24 },
  bodySmall: { fontSize: 14, color: '#475569', lineHeight: 20 },
  label: { fontSize: 12, fontWeight: '600' as any, color: '#94a3b8', textTransform: 'uppercase' as any, letterSpacing: 1 },
};

export const BREAKPOINTS = {
  tablet: 768,
  desktop: 1024,
};

export const isDesktop = (width: number) => width >= BREAKPOINTS.tablet;
