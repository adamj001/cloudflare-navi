import { StrictMode, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { createAppTheme } from './theme/theme';
function Root() {
  const [darkMode] = useState(false); // 👈 先固定，后面再升级 toggle
  const theme = useMemo(
    () => createAppTheme(darkMode ? 'dark' : 'light'),
    [darkMode]
  );
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  );
}
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>
);