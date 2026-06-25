import { PaletteMode } from '@mui/material';
import { createTheme } from '@mui/material/styles';

const glassTokens = {
  light: {
    dialog: 'rgba(255, 255, 255, 0.28)',
    dialogBorder: 'rgba(255, 255, 255, 0.55)',
    backdrop: 'rgba(15, 23, 42, 0.10)',
    input: 'rgba(15, 18, 24, 0.06)',
    inputBorder: 'rgba(180, 200, 220, 0.55)',
  },
  dark: {
    dialog: 'rgba(255, 255, 255, 0.06)',
    dialogBorder: 'rgba(255, 255, 255, 0.12)',
    backdrop: 'rgba(0, 0, 0, 0.28)',
    input: 'rgba(255, 255, 255, 0.05)',
    inputBorder: 'rgba(255, 255, 255, 0.14)',
  },
};

export const createAppTheme = (mode: PaletteMode) => {
  const glass = glassTokens[mode];
  const isDark = mode === 'dark';

  return createTheme({
    palette: {
      mode,
      primary: {
        main: '#00ff9d',
      },
    },
    typography: {
      fontFamily: 'Roboto, Arial, sans-serif',
    },
    components: {
      MuiDialog: {
        styleOverrides: {
          // 针对 Dialog 遮罩单独控制，不影响其他组件
          root: {
            '& .MuiBackdrop-root': {
              backgroundColor: isDark
                ? 'rgba(0, 0, 0, 0.28)'
                : 'rgba(15, 23, 42, 0.10)',
              backdropFilter: 'blur(16px) saturate(140%)',
              WebkitBackdropFilter: 'blur(16px) saturate(140%)',
            },
          },
          paper: {
            borderRadius: 28,
            // 核心：极低透明度，让背景透出来
            backgroundColor: glass.dialog,
            backgroundImage: 'none',
            // 玻璃模糊
            backdropFilter: 'blur(20px) saturate(160%)',
            WebkitBackdropFilter: 'blur(20px) saturate(160%)',
            // 玻璃边框
            border: isDark
              ? `1px solid ${glass.dialogBorder}`
              : `1px solid ${glass.dialogBorder}`,
            // 阴影
            boxShadow: isDark
              ? `
                0 22px 70px rgba(0, 0, 0, 0.50),
                0 0 0 1px rgba(255, 255, 255, 0.03),
                inset 0 1px 0 rgba(255, 255, 255, 0.10)
              `
              : `
                0 20px 60px rgba(165, 180, 200, 0.30),
                inset 0 1px 0 rgba(255, 255, 255, 0.80)
              `,
            // 滚动条
            overflowY: 'auto',
            scrollbarWidth: 'thin',
            '&::-webkit-scrollbar': {
              width: '4px',
            },
            '&::-webkit-scrollbar-track': {
              background: 'transparent',
              margin: '10px 0',
            },
            '&::-webkit-scrollbar-thumb': {
              background: 'transparent',
              borderRadius: '999px',
            },
            '&:hover::-webkit-scrollbar-thumb': {
              background: isDark
                ? 'rgba(255,255,255,0.18)'
                : 'rgba(80,100,130,0.22)',
            },
            '&::-webkit-scrollbar-thumb:hover': {
              background: isDark
                ? 'rgba(255,255,255,0.28)'
                : 'rgba(80,100,130,0.32)',
            },
          },
        },
      },

      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: 16,
           background: isDark
        ? 'rgba(255, 255, 255, 0.05)'   // 改前 glass.input 有颜色 → 极低透明
        : 'rgba(255, 255, 255, 0.20)',
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
            boxShadow: isDark
              ? `
                inset 0 1px 8px rgba(0, 0, 0, 0.35),
                inset 0 1px 0 rgba(255, 255, 255, 0.08),
                0 0 0 1px rgba(255, 255, 255, 0.04)
              `
              : 'inset 0 1px 5px rgba(100, 120, 150, 0.08)',
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: isDark
                ? 'rgba(255,255,255,0.35)'
                : 'rgba(100,150,255,0.60)',
            },
            '&.Mui-focused': {
              boxShadow: isDark
                ? `
                  inset 0 1px 8px rgba(0, 0, 0, 0.35),
                  0 0 0 3px rgba(0, 255, 157, 0.15)
                `
                : '0 0 0 3px rgba(0, 150, 255, 0.12)',
            },
          },
          notchedOutline: {
            borderColor: glass.inputBorder,
          },
        },
      },

      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 14,
            textTransform: 'none',
          },
        },
      },

      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
          },
        },
      },
    },
  });
};
