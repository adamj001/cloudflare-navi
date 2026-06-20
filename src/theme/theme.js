import { createTheme } from '@mui/material/styles';
const glass = (mode: 'light' | 'dark') => ({
  backdropFilter: 'blur(18px) saturate(140%)',
  WebkitBackdropFilter: 'blur(18px) saturate(140%)',
  background:
    mode === 'dark'
      ? 'rgba(30,34,42,0.55)'
      : 'rgba(255,255,255,0.65)',
  borderRadius: 20,
  border:
    mode === 'dark'
      ? '1px solid rgba(255,255,255,0.08)'
      : '1px solid rgba(255,255,255,0.35)',
});
export const createAppTheme = (mode: 'light' | 'dark') =>
  createTheme({
    palette: {
      mode,
    },
    components: {
      // ================= PAPER（所有卡片/容器）=================
      MuiPaper: {
        styleOverrides: {
          root: {
            ...glass(mode),
            boxShadow:
              mode === 'dark'
                ? '0 20px 60px rgba(0,0,0,0.65)'
                : '0 20px 60px rgba(165,180,200,0.25)',
          },
        },
      },
      // ================= DIALOG =================
      MuiDialog: {
        styleOverrides: {
          paper: {
            ...glass(mode),
            padding: 16,
            boxShadow:
              mode === 'dark'
                ? '0 25px 80px rgba(0,0,0,0.7)'
                : '0 25px 80px rgba(0,0,0,0.15)',
          },
        },
      },
      // ================= BUTTON =================
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 14,
            textTransform: 'none',
            ...(mode === 'dark'
              ? {
                  background: 'rgba(255,255,255,0.06)',
                }
              : {
                  background: 'rgba(255,255,255,0.6)',
                }),
            backdropFilter: 'blur(10px)',
            '&:hover': {
              transform: 'translateY(-1px)',
            },
          },
        },
      },
      // ================= INPUT =================
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            ...glass(mode),
            padding: '6px 10px',
          },
          notchedOutline: {
            border: 'none',
          },
        },
      },
    },
  });
