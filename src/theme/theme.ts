import { PaletteMode } from '@mui/material'; // 👈 引入 MUI 的模式类型
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
  // 0.68 太实，背景颜色几乎无法透进 Dialog
  dialog: 'rgba(13, 16, 22, 0.42)',
  // 图片中的外边缘是柔和灰白，不需要太亮
  dialogBorder: 'rgba(255, 255, 255, 0.12)',
  // 重点：让背景保留颜色，只做失焦，不要压得太黑
  backdrop: 'rgba(0, 0, 0, 0.08)',
  // 输入框保持比 Dialog 深一点，才有层级
  input: 'rgba(8, 10, 15, 0.44)',
  inputBorder: 'rgba(255, 255, 255, 0.34)',
},
};

// 👈 给 mode 加上了 : PaletteMode 类型约束，防止 TS 报错
export const createAppTheme = (mode: PaletteMode) => {
  const glass = glassTokens[mode];
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
          paper: {
            borderRadius: 28,
            background: glass.dialog,
           backdropFilter: 'blur(12px) saturate(155%)',
WebkitBackdropFilter: 'blur(12px) saturate(155%)',
border: `1px solid ${glass.dialogBorder}`,
boxShadow:
  mode === 'dark'
    ? `
      0 20px 60px rgba(0, 0, 0, 0.48),
      0 0 0 1px rgba(255, 255, 255, 0.03),
      inset 0 1px 0 rgba(255, 255, 255, 0.08),
      inset 0 -1px 0 rgba(0, 0, 0, 0.18)
    `
    : '0 20px 60px rgba(165, 180, 200, 0.25)',
            
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
backdropFilter: 'blur(28px) saturate(125%) brightness(0.82)',
WebkitBackdropFilter: 'blur(28px) saturate(125%) brightness(0.82)',
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
