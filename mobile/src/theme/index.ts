import { colors } from './colors';

export const theme = {
  colors,

  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32,
  },

  radius: {
    sm: 8,
    md: 12,
    lg: 18,
    round: 999,
  },

  typography: {
    title: {
      fontSize: 28,
      fontWeight: '700' as const,
    },
    heading: {
      fontSize: 20,
      fontWeight: '700' as const,
    },
    body: {
      fontSize: 16,
      fontWeight: '400' as const,
    },
    small: {
      fontSize: 14,
      fontWeight: '400' as const,
    },
  },
};
