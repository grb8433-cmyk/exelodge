export const colors = {
  primary: '#16A34A',
  primaryDark: '#15803D',
  primaryLight: '#DCFCE7',
  white: '#FFFFFF',
  background: '#F9FAFB',
  textPrimary: '#111827',
  textSecondary: '#6B7280',
  accent: '#22C55E',
  error: '#EF4444',
  border: '#E5E7EB',
  inactive: '#9CA3AF',
};

export const shadows = {
  card: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
};

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
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
  h1: { fontSize: 24, fontWeight: '700', color: '#111827' },
  h2: { fontSize: 20, fontWeight: '700', color: '#111827' },
  h3: { fontSize: 18, fontWeight: '600', color: '#111827' },
  h4: { fontSize: 16, fontWeight: '600', color: '#111827' },
  body: { fontSize: 15, color: '#111827', lineHeight: 22 },
  bodySmall: { fontSize: 13, color: '#6B7280', lineHeight: 18 },
  caption: { fontSize: 11, color: '#6B7280' },
  label: { fontSize: 13, fontWeight: '500', color: '#6B7280' },
};

export const BREAKPOINTS = {
  tablet: 768,
  desktop: 1024,
};

export const CAMPUS_COORDS = {
  streatham: { latitude: 50.7354, longitude: -3.5353 },
  stLukes: { latitude: 50.7227, longitude: -3.5152 },
};

export const isDesktop = (width) => width >= BREAKPOINTS.tablet;
