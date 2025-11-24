import React, { useState, useEffect, useMemo } from 'react';
import { NavigationClient } from './API/client';
import { MockNavigationClient } from './API/mock';
import { GroupWithSites } from './types';
import ThemeToggle from './components/ThemeToggle';
import LoginForm from './components/LoginForm';
import SearchBox from './components/SearchBox';
import { isSecureUrl } from './utils/url';
import './App.css';

import {
  Container,
  Typography,
  Box,
  Button,
  CircularProgress,
  Stack,
  Paper,
  createTheme,
  ThemeProvider,
  CssBaseline,
  IconButton,
  AppBar,
  Tabs,
  Tab,
} from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import GitHubIcon from '@mui/icons-material/GitHub';
import LoginIcon from '@mui/icons-material/Login';

const isDev = import.meta.env.DEV;
const useRealApi = import.meta.env.VITE_USE_REAL_API === 'true';
const api = isDev && !useRealApi
  ? new MockNavigationClient()
  : new NavigationClient(isDev ? 'http://localhost:8788/api' : '/api');

const DEFAULT_CONFIGS: Record<string, string> = {
  'site.name': '我的导航站',
  'site.backgroundImage': '',
  'site.backgroundOpacity': '0.2',
  'site.searchBoxEnabled': 'true',
  'site.searchBoxGuestEnabled': 'true',
};

export default function App() {
  const [darkMode] = useState(true);
  const theme = useMemo(() => createTheme({ palette: { mode: 'dark' } }), []);

  const [groups, setGroups] = useState<GroupWithSites[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<number | false>(false);
  const [configs, setConfigs] = useState(DEFAULT_CONFIGS);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showLogin, setShowLogin] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const auth = await api.checkAuthStatus();
        setIsAuthenticated(!!auth);
        const [g, c] = await Promise.all([api.getGroupsWithSites(), api.getConfigs()]);
        setGroups(g);
        setConfigs({ ...DEFAULT_CONFIGS, ...c });
        if (g.length > 0) setSelectedTab(g[0].id);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const currentGroup = groups.find(g => g.id === selectedTab);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ minHeight: '100vh', bgcolor: '#000', position: 'relative', overflow: 'hidden' }}>
        {configs['site.backgroundImage'] && isSecureUrl(configs['site.backgroundImage']) && (
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              background: `url(${configs['site.backgroundImage']}) center/cover no-repeat`,
              '&::before': {
                content: '""',
                position: 'absolute',
                inset: 0,
                bgcolor: 'rgba(0,0,0,0.85)',
                opacity: configs['site.backgroundOpacity'],
              },
            }}
          />
        )}

        <Container maxWidth="xl" sx={{ py: 4, position: 'relative', zIndex: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
            <Typography variant="h4" fontWeight="bold" sx={{ color: '#fff' }}>
              {configs['site.name']}
            </Typography>
            <Stack direction="row" spacing={2}>
              {isAuthenticated && <IconButton color="inherit"><SettingsIcon /></IconButton>}
              <ThemeToggle darkMode={darkMode} onToggle={() => {}} />
            </Stack>
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 5 }}>
            <AppBar position="static" color="transparent" elevation={0} sx={{ width: 'fit-content', backdropFilter: 'blur(16px)', background: 'rgba(30,30,30,0.7)', borderRadius: 4, px: 3, py: 1 }}>
              <Tabs
                value={selectedTab}
                onChange={(_, v) => setSelectedTab(v)}
                variant="scrollable"
                scrollButtons="auto"
                sx={{
                  '& .MuiTab-root': { fontWeight: 800, fontSize: '1.15rem', minWidth: 100, color: '#fff !important' },
                  '& .MuiTabs-indicator': { height: 4, borderRadius: 2, bgcolor: '#00ff9d' },
                }}
              >
                {groups.map(g => (
                  <Tab key={g.id} label={g.name} value={g.id} />
                ))}
              </Tabs>
            </AppBar>
          </Box>

          {configs['site.searchBoxEnabled'] === 'true' && (isAuthenticated || configs['site.searchBoxGuestEnabled'] === 'true') && (
            <Box sx={{ maxWidth: 700, mx: 'auto', mb: 6 }}>
              <SearchBox groups={groups} sites={groups.flatMap(g => g.sites || [])} />
            </Box>
          )}

          {loading ? (
            <Box sx={{ display: 'grid', placeItems: 'center', minHeight: 400 }}>
              <CircularProgress size={80} thickness={5} />
            </Box>
          ) : (
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 4, pb: 14 }}>
              {currentGroup?.sites?.map(site => (
                <Paper
                  key={site.id}
                  component="a"
                  href={site.url}
                  target="_blank"
                  rel="noopener"
                  sx={{
                    p: 3,
                    borderRadius: 5,
                    bgcolor: 'rgba(255,255,255,0.06)',
                    backdropFilter: 'blur(14px)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                    transition: 'all 0.35s ease',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    textDecoration: 'none',
                    color: 'inherit',
                    '&:hover': {
                      transform: 'translateY(-12px) scale(1.05)',
                      bgcolor: 'rgba(255,255,255,0.12)',
                      boxShadow: '0 24px 60px rgba(0,0,0,0.6)',
                    },
                  }}
                >
                  <Box sx={{ width: 64, height: 64, mb: 2, borderRadius: 4, overflow: 'hidden', bgcolor: 'rgba(255,255,255,0.1)', p: 1 }}>
                    <img
                      src={site.icon || `https://api.iowen.cn/favicon/${new URL(site.url).hostname}`}
                      alt={site.name}
                      style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                      onError={e => {
                        e.currentTarget.src = `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="%23666"/><text y="55" font-size="50" fill="%23fff" text-anchor="middle" x="50">${site.name[0]}</text></svg>`;
                      }}
                    />
                  </Box>
                  <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 0.5 }}>
                    {site.name}
                  </Typography>
                  {site.description && site.description !== '暂无描述' && (
                    <Typography variant="caption" sx={{ opacity: 0.8, fontSize: '0.8rem', textAlign: 'center' }}>
                      {site.description}
                    </Typography>
                  )}
                </Paper>
              ))}
            </Box>
          )}

          {!isAuthenticated && (
            <Box sx={{ position: 'fixed', left: 32, bottom: 32, zIndex: 10 }}>
              <Button
                variant="contained"
                startIcon={<LoginIcon />}
                onClick={() => setShowLogin(true)}
                sx={{
                  bgcolor: 'rgba(0,255,150,0.2)',
                  backdropFilter: 'blur(12px)',
                  border: '1px solid rgba(0,255,150,0.4)',
                  color: '#00ff9d',
                  fontWeight: 'bold',
                  px: 4,
                  py: 2,
                  borderRadius: 6,
                  fontSize: '1.1rem',
                  '&:hover': { bgcolor: 'rgba(0,255,150,0.3)', transform: 'translateY(-4px)' },
                }}
              >
                管理员登录
              </Button>
            </Box>
          )}

          <Box sx={{ position: 'fixed', right: 32, bottom: 32, zIndex: 10 }}>
            <IconButton
              component="a"
              href="https://github.com/你的用户名/你的仓库名"
              target="_blank"
              rel="noopener"
              size="large"
              sx={{
                width: 70,
                height: 70,
                bgcolor: 'rgba(255,255,255,0.1)',
                backdropFilter: 'blur(14px)',
                border: '1px solid rgba(255,255,255,0.2)',
                boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.2)', transform: 'translateY(-6px) rotate(10deg)' },
              }}
            >
              <GitHubIcon sx={{ fontSize: 42, color: '#fff' }} />
            </IconButton>
          </Box>
        </Container>

        <LoginForm open={showLogin} onClose={() => setShowLogin(false)} onSuccess={() => setIsAuthenticated(true)} />
      </Box>
    </ThemeProvider>
  );
}
