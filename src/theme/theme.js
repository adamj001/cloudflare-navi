import { createTheme } from '@mui/material/styles';

const glassTokens = {
  light: {
    dialog: 'rgba(255, 255, 255, 0.32)',
    dialogBorder: 'rgba(255, 255, 255, 0.52)',
    backdrop: 'rgba(15, 23, 42, 0.12)',
    input: 'rgba(15, 18, 24, 0.34)',
    inputBorder: 'rgba(255, 255, 255, 0.42)',
  },
  dark: {
    dialog: 'rgba(18, 20, 26, 0.68)',
    dialogBorder: 'rgba(255, 255, 255, 0.10)',
    backdrop: 'rgba(0, 0, 0, 0.20)',
    input: 'rgba(10, 12, 17, 0.58)',
    inputBorder: 'rgba(255, 255, 255, 0.28)',
  },
};

export const createAppTheme = (mode) => {
  const glass = glassTokens[mode];
  return createTheme({
    palette: {
      mode,
      primary: {
        main: '#00ff9d',
      },
    }, // 👈 1. 这里之前多了一个大括号导致语法报错
    typography: {
      fontFamily: 'Roboto, Arial, sans-serif',
    },
    components: {
      MuiDialog: {
        styleOverrides: {
          paper: {
            borderRadius: 28,
            background: glass.dialog,
            backdropFilter: 'blur(24px) saturate(135%)',
            WebkitBackdropFilter: 'blur(24px) saturate(135%)',
            border: `1px solid ${glass.dialogBorder}`,
            boxShadow:
              mode === 'dark'
                ? `
                  0 28px 80px rgba(0, 0, 0, 0.68),
                  inset 0 1px 0 rgba(255, 255, 255, 0.07),
                  inset 0 -1px 0 rgba(0, 0, 0, 0.30)
                `
                : '0 20px 60px rgba(165, 180, 200, 0.25)',
            
            // 👈 2. 滚动条样式已正确移入 paper 内部，确保应用到弹窗容器上
            '&::-webkit-scrollbar': {
              width: '4px',
            },
            '&::-webkit-scrollbar-track': {
              background: 'transparent',
              margin: '12px 0',
            },
            '&::-webkit-scrollbar-thumb': {
              background: 'transparent',
              borderRadius: '999px',
            },
            '&:hover::-webkit-scrollbar-thumb': {
              background:
                mode === 'dark'
                  ? 'rgba(255,255,255,0.20)'
                  : 'rgba(80,100,130,0.24)',
            },
          },
        },
      },
      MuiBackdrop: {
        styleOverrides: {
          root: {
            backgroundColor: glass.backdrop,
            backdropFilter: 'blur(20px) saturate(85%)',
            WebkitBackdropFilter: 'blur(20px) saturate(85%)',
          },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: 16,
            background: glass.input,
            backdropFilter: 'blur(14px)',
            WebkitBackdropFilter: 'blur(14px)',
            boxShadow:
              mode === 'dark'
                ? `
                  inset 0 1px 8px rgba(0, 0, 0, 0.48),
                  inset 0 1px 0 rgba(255, 255, 255, 0.10),
                  0 0 0 1px rgba(255, 255, 255, 0.05)
                `
                : 'inset 0 1px 5px rgba(100, 120, 150, 0.10)',
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor:
                mode === 'dark'
                  ? 'rgba(255,255,255,0.42)'
                  : 'rgba(255,255,255,0.70)',
            },
            '&.Mui-focused': {
              boxShadow:
                mode === 'dark'
                  ? `
                    inset 0 1px 8px rgba(0, 0, 0, 0.48),
                    0 0 0 3px rgba(0, 255, 157, 0.13)
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
    },
  });
};
