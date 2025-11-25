import React, { useState, useEffect, useMemo } from 'react';
import {
  ThemeProvider, createTheme, CssBaseline, Box, Container, Typography,
  AppBar, Tabs, Tab, IconButton, Stack, Button, Paper, CircularProgress,
  Snackbar, Alert
} from '@mui/material';
import { Add as AddIcon, Settings as SettingsIcon, Sort as SortIcon, DarkMode, LightMode } from '@mui/icons-material';

// ==================== 简易主题切换按钮（替代 ThemeToggle 组件） ====================
const SimpleThemeToggle: React.FC<{ darkMode: boolean; onToggle: () => void }> = ({ darkMode, onToggle }) => (
  <IconButton onClick={onToggle} color="inherit">
    {darkMode ? <LightMode /> : <DarkMode />}
  </IconButton>
);

interface Site {
  id?: number;
  name: string;
  url: string;
  icon?: string;
  description?: string;
}

interface GroupWithSites {
  id?: number;
  name: string;
  order_num: number;
  sites?: Site[];
}

function App() {
  // ==================== 主题 ====================
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  const theme = useMemo(() => createTheme({
    palette: {
      mode: darkMode ? 'dark' : 'light',
      primary: { main: '#00ff9d' },
    },
    typography: { fontFamily: '"Microsoft YaHei", "Roboto", sans-serif' },
  }), [darkMode]);

  const toggleTheme = () => {
    setDarkMode(prev => {
      localStorage.setItem('theme', !prev ? 'dark' : 'light');
      return !prev;
    });
  };

  // ==================== 核心状态 ====================
  const [selectedTab, setSelectedTab] = useState<number | null>(null);
  const [groups, setGroups] = useState<GroupWithSites[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    setIsAuthenticated(!!token);
    setIsAuthChecking(false);
  }, []);

  // 假数据（实际项目请换成你的 fetch）
  useEffect(() => {
    const fakeGroups: GroupWithSites[] = [
      { id: 1, name: 'Home', order_num: 1, sites: [
        { name: 'GitHub', url: 'https://github.com' },
        { name: 'Bilibili', url: 'https://www.bilibili.com' },
      ]},
      { id: 2, name: '工具', order_num: 2, sites: [] },
    ];
    setGroups(fakeGroups);
    setLoading(false);
  }, []);

  const currentGroup = useMemo(
    () => groups.find(g => g.id === selectedTab) || groups[0] || null,
    [groups, selectedTab]
  );

  // 修复：加上 ?? 0 防止 undefined
  useEffect(() => {
    if (groups.length > 0 && selectedTab === null) {
      const home = groups.find(g => g.name.toLowerCase() === 'home') || groups[0];
      setSelectedTab(home.id ?? 0);
    }
  }, [groups]);

  const handleOpenAddSite = (groupId: number) => {
    alert(`添加站点到分组 ${groupId}`);
  };

  const handleCloseSnackbar = () => setSnackbarOpen(false);

  if (isAuthChecking) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
          <CircularProgress size={60} />
        </Box>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />

      <Snackbar open={snackbarOpen} autoHideDuration={6000} onClose={handleCloseSnackbar}>
        <Alert onClose={handleCloseSnackbar} severity="error" variant="filled">
          {snackbarMessage}
        </Alert>
      </Snackbar>

      <Box sx={{ minHeight: '100vh', bgcolor: '#121212', position: 'relative', overflow: 'hidden' }}>
        <Container maxWidth="xl" sx={{ py: 3, position: 'relative', zIndex: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h4" fontWeight="bold" sx={{ color: 'white' }}>
              我的导航站
            </Typography>
            <Stack direction="row" spacing={1}>
              {isAuthenticated && <IconButton color="inherit"><SettingsIcon /></IconButton>}
              <SimpleThemeToggle darkMode={darkMode} onToggle={toggleTheme} />
            </Stack>
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 4 }}>
            <AppBar position="static" color="transparent" elevation={0} sx={{
              width: 'fit-content', backdropFilter: 'blur(16px)', background: 'rgba(30,30,30,0.6)', borderRadius: 4, px: 2, py: 1
            }}>
              <Tabs
                value={selectedTab || false}
                onChange={(_, v) => setSelectedTab(v as number)}
                variant="scrollable"
                scrollButtons="auto"
                allowScrollButtonsMobile
                sx={{
                  '& .MuiTab-root': { fontWeight: 800, fontSize: '1.1rem', minWidth: 80, color: '#ffffff !important' },
                  '& .MuiTabs-indicator': { height: 3, borderRadius: 1, backgroundColor: '#00ff9d' },
                }}
              >
                {groups.map(g => (
                  <Tab
                    key={g.id}
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {g.name}
                        {isAuthenticated && (
                          <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleOpenAddSite(g.id!); }} sx={{ color: '#00ff9d' }}>
                            <AddIcon fontSize="small" />
                          </IconButton>
                        )}
                      </Box>
                    }
                    value={g.id!}
                  />
                ))}
              </Tabs>
            </AppBar>
          </Box>

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 20 }}>
              <CircularProgress size={60} />
            </Box>
          ) : (
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 3.5, pb: 10 }}>
              {currentGroup?.sites?.map((site, i) => (
                <Paper
                  key={site.id || i}
                  component="a"
                  href={site.url}
                  target="_blank"
                  rel="noopener"
                  sx={{
                    p: 2.5, borderRadius: 4, bgcolor: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(12px)',
                    border: '1px solid rgba(255,255,255,0.12)', boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                    transition: 'all 0.3s ease', display: 'flex', flexDirection: 'column', alignItems: 'center',
                    textDecoration: 'none', color: 'inherit',
                    '&:hover': { transform: 'translateY(-8px) scale(1.03)', bgcolor: 'rgba(255,255,255,0.1)' },
                  }}
                >
                  <Box sx={{ width: 56, height: 56, mb: 1.5, borderRadius: 3, overflow: 'hidden', bgcolor: 'rgba(255,255,255,0.1)', p: 1 }}>
                    <img
                      src={`https://api.iowen.cn/favicon/${new URL(site.url).hostname}`}
                      alt={site.name}
                      style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                      onError={e => { (e.target as HTMLImageElement).src = `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="%23666"/><text y="55" font-size="50" fill="%23fff" text-anchor="middle" x="50">${site.name[0]}</text></svg>`; }}
                    />
                  </Box>
                  <Typography variant="subtitle2" fontWeight="bold">{site.name}</Typography>
                </Paper>
              ))}
            </Box>
          )}
        </Container>
      </Box>
    </ThemeProvider>
  );
}

export default App;
