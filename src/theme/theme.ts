import { createTheme } from '@mui/material/styles';

/**
 * Narendiraa Enterprises Sivakasi Theme Palette
 * Derived directly from the festive temple & fireworks poster:
 * - Deep Sivakasi Crimson Red (#990000 / #880808 / #A31D1D)
 * - Radiant Temple Gold (#FFD700 / #F59E0B / #D97706)
 * - Peacock Garland Green (#059669)
 * - Crisp White & Warm Ivory (#FFFDF9 / #FFFBEB)
 */
export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#990000', // Rich Sivakasi Crimson Red
      light: '#FEE2E2',
      dark: '#750909',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#F59E0B', // Radiant Temple Gold
      light: '#FEF9C3',
      dark: '#B45309',
      contrastText: '#1F1714',
    },
    info: {
      main: '#1D4ED8', // Royal Blue
      light: '#EFF6FF',
      dark: '#1E3A8A',
      contrastText: '#FFFFFF',
    },
    success: {
      main: '#059669', // Peacock Garland Green
      light: '#ECFDF5',
      dark: '#047857',
      contrastText: '#FFFFFF',
    },
    warning: {
      main: '#D97706', // Warm Amber
      light: '#FFFBEB',
      dark: '#92400E',
      contrastText: '#FFFFFF',
    },
    text: {
      primary: '#240808', // Deep Mahogany
      secondary: '#78350F', // Warm Amber Bronze
    },
    background: {
      default: '#FFFDF9',
      paper: '#FFFFFF',
    },
    divider: '#FDE68A',
  },
  typography: {
    fontFamily: '"Plus Jakarta Sans", "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    h1: {
      fontSize: '28px',
      fontWeight: 800,
      color: '#990000',
      letterSpacing: '-0.02em',
    },
    h2: {
      fontSize: '22px',
      fontWeight: 700,
      color: '#990000',
      letterSpacing: '-0.01em',
    },
    h3: {
      fontSize: '18px',
      fontWeight: 700,
      color: '#240808',
      letterSpacing: '-0.01em',
    },
    subtitle1: {
      fontSize: '14.5px',
      fontWeight: 600,
      color: '#240808',
    },
    body1: {
      fontSize: '14px',
      fontWeight: 500,
      color: '#240808',
    },
    body2: {
      fontSize: '13px',
      fontWeight: 500,
      color: '#78350F',
    },
    button: {
      fontWeight: 700,
      textTransform: 'none',
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 700,
          borderRadius: '8px',
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0 2px 10px rgba(153, 0, 0, 0.25)',
          },
        },
        contained: {
          background: 'linear-gradient(135deg, #990000 0%, #750909 100%)',
          color: '#FFFFFF',
          border: '1px solid #F59E0B',
          '&:hover': {
            background: 'linear-gradient(135deg, #750909 0%, #5E0505 100%)',
            boxShadow: '0 4px 14px rgba(153, 0, 0, 0.35)',
          },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          fontWeight: 700,
          fontSize: '12.5px',
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          color: '#7F1D1D',
          backgroundColor: '#FEF3C7',
          borderBottom: '2px solid #F59E0B',
        },
        body: {
          fontSize: '13.5px',
          fontWeight: 500,
          color: '#29221D',
          borderBottom: '1px solid #FEF3C7',
        },
      },
    },
  },
});
