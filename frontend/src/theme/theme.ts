import { createTheme } from '@mui/material/styles';

declare module '@mui/material/styles' {
  interface Components {
    MuiPickersDay: {
      styleOverrides: {
        root: {
          '&.Mui-selected': {
            backgroundColor: string;
            color: string;
          };
        };
      };
    };
  }
}

// Custom theme following cyberpunk aesthetic with neon colors
export const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#7c3aed', // Purple
      light: '#9d5cf5',
      dark: '#5b21b6',
    },
    secondary: {
      main: '#00FFFF', // Neon blue
      light: '#69FFFF',
      dark: '#00CCCC',
    },
    background: {
      default: '#09090b',
      paper: 'transparent',
    },
    text: {
      primary: '#ffffff',
      secondary: 'rgba(255, 255, 255, 0.7)',
    },
  },
  typography: {
    fontFamily: 'JetBrains Mono, monospace',
    h1: {
      fontSize: '2.5rem',
      fontWeight: 700,
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 600,
    },
    h3: {
      fontSize: '1.75rem',
      fontWeight: 600,
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.5,
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.43,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: '4px',
          textTransform: 'none',
          fontWeight: 600,
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          backgroundColor: '#0a0b0e',
          backgroundImage: 'none',
          width: '350px',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '8px',
          overflow: 'hidden'
        }
      }
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: {
          backgroundColor: '#1a1b1e',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          padding: '16px',
          color: 'white',
          fontSize: '1.1rem',
          fontWeight: 'bold'
        }
      }
    },
    MuiDialogContent: {
      styleOverrides: {
        root: {
          backgroundColor: '#0a0b0e',
          padding: '16px',
          '& .MuiTextField-root': {
            '& .MuiOutlinedInput-root': {
              backgroundColor: '#1a1b1e',
              color: 'white',
              '& fieldset': {
                borderColor: 'rgba(255,255,255,0.1)'
              },
              '&:hover fieldset': {
                borderColor: 'rgba(255,255,255,0.2)'
              },
              '&.Mui-focused fieldset': {
                borderColor: '#4caf50'
              }
            },
            '& input': {
              color: 'white',
              '&::placeholder': {
                color: 'rgba(255,255,255,0.5)',
                opacity: 1
              }
            }
          }
        }
      }
    },
    MuiDialogActions: {
      styleOverrides: {
        root: {
          backgroundColor: '#1a1b1e',
          borderTop: '1px solid rgba(255,255,255,0.1)',
          padding: '16px',
          gap: '8px'
        }
      }
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: '8px',
          backgroundImage: 'linear-gradient(45deg, rgba(255,0,255,0.1) 0%, rgba(0,255,255,0.1) 100%)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        },
      },
    },
    MuiPickersDay: {
      styleOverrides: {
        root: {
          '&.Mui-selected': {
            backgroundColor: '#7c3aed',
            color: '#fff',
          },
        },
      },
    },
    MuiTypography: {
      styleOverrides: {
        root: {
          color: '#ffffff', // Default text color for all Typography components
        },
      },
    },
  },
}); 