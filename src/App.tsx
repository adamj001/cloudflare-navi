import { useState, useEffect, useMemo } from 'react';
import { NavigationClient } from './API/client';
import { MockNavigationClient } from './API/mock';
import { Site, Group } from './API/http';
import { GroupWithSites } from './types';
import ThemeToggle from './components/ThemeToggle';
import GroupCard from './components/GroupCard';
import LoginForm from './components/LoginForm';
import SearchBox from './components/SearchBox';
import { sanitizeCSS, isSecureUrl, extractDomain } from './utils/url';
import './App.css';

// MUI
import {
  Container,
  Typography,
  Box,
  Button,
  CircularProgress,
  Alert,
  Stack,
  Paper,
  createTheme,
  ThemeProvider,
  CssBaseline,
  TextField,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  Menu,
  MenuItem,
  Divider,
  ListItemIcon,
  ListItemText,
  Snackbar,
  InputAdornment,
  Slider,
  FormControlLabel,
  Switch,
  AppBar,
  Tabs,
  Tab,
  Toolbar,
} from '@mui/material';
import SortIcon from '@mui/icons-material/Sort';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import GitHubIcon from '@mui/icons-material/GitHub';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import SettingsIcon from '@mui/icons-material/Settings';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import LogoutIcon from '@mui/icons-material/Logout';
import MenuIcon from '@mui/icons-material/Menu';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';

const isDev = import.meta.env.DEV;
const useRealApi = import.meta.env.VITE_USE_REAL_API === 'true';
const api = isDev && !useRealApi
  ? new MockNavigationClient()
  : new NavigationClient(isDev ? 'http://localhost:8788/api' : '/api');

enum SortMode {
  None,
  GroupSort,
  SiteSort,
}

const DEFAULT_CONFIGS: Record<string, string> = {
  'site.title': '导航站',
  'site.name': '导航站',
  'site.customCss': '',
  'site.backgroundImage': '',
  'site.backgroundOpacity': '0.15',
  'site.iconApi': 'https://www.faviconextractor.com/favicon/{domain}?larger=true',
  'site.searchBoxEnabled': 'true',
  'site.searchBoxGuestEnabled': 'true',
};

export default function App() {
  // 主题（默认深色）
  const [darkMode, setDarkMode] = useState(true);  // 默认开启深色
  const theme = useMemo(() => createTheme({ palette: { mode: darkMode ? 'dark' : 'light' } }), [darkMode]);
  const toggleTheme = () => setDarkMode(prev => !prev);

  // 数据 & 状态
  const [groups, setGroups] = useState<GroupWithSites[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<number | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>(SortMode.None);
  const [currentSortingGroupId, setCurrentSortingGroupId] = useState<number | null>(null);

  // 认证
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthRequired, setIsAuthRequired] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const viewMode: 'readonly' | 'edit' = isAuthenticated ? 'edit' : 'readonly';

  // 配置
  const [configs, setConfigs] = useState(DEFAULT_CONFIGS);
  const [tempConfigs, setTempConfigs] = useState(DEFAULT_CONFIGS);
  const [openConfig, setOpenConfig] = useState(false);

  // 对话框
  const [openAddGroup, setOpenAddGroup] = useState(false);
  const [openAddSite, setOpenAddSite] = useState(false);
  const [newGroup, setNewGroup] = useState<Partial<Group>>({ name: '', is_public: 1 });
  const [newSite, setNewSite] = useState<Partial<Site>>({ name: '', url: '', group_id: 0, is_public: 1 });

  // 菜单 & 导入
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [openImport, setOpenImport] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importLoading, setImportLoading] = useState(false);

  // 提示
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  const handleError = (msg: string) => {
    setSnackbarMessage(msg);
    setSnackbarOpen(true);
  };

  // 初始化
  useEffect(() => {
    (async () => {
      setIsAuthChecking(true);
      try {
        const auth = await api.checkAuthStatus();
        setIsAuthenticated(!!auth);
        await Promise.all([fetchData(), fetchConfigs()]);
      } finally {
        setIsAuthChecking(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (groups.length > 0 && selectedTab === null) {
      setSelectedTab(groups[0].id);
    }
  }, [groups]);

  useEffect(() => {
    document.title = configs['site.title'] || '导航站';
  }, [configs]);

  useEffect(() => {
    const style = document.getElementById('custom-style') || document.createElement('style');
    style.id = 'custom-style';
    style.textContent = sanitizeCSS(configs['site.customCss'] || '');
    document.head.appendChild(style);
    return () => style.remove();
  }, [configs]);

  const fetchData = async () => {
    setLoading(true);
    try {
      setGroups(await api.getGroupsWithSites());
    } finally {
      setLoading(false);
    }
  };

  const fetchConfigs = async () => {
    try {
      const data = await api.getConfigs();
      const merged = { ...DEFAULT_CONFIGS, ...data };
      setConfigs(merged);
      setTempConfigs(merged);
    } catch {}
  };

  const handleLogin = async (username: string, password: string) => {
    setLoginLoading(true);
    setLoginError(null);
    try {
      const res = await api.login(username, password, true);
      if (res?.success) {
        setIsAuthenticated(true);
        setIsAuthRequired(false);
        await fetchData();
      } else {
        setLoginError('用户名或密码错误');
      }
    } catch {
      setLoginError('登录失败');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = async () => {
    await api.logout();
    setIsAuthenticated(false);
    await fetchData();
    handleError('已退出登录');
    setMenuAnchorEl(null);
  };

  const handleSaveGroupOrder = async () => {
    try {
      const orders = groups.map((g, i) => ({ id: g.id!, order_num: i }));
      await api.updateGroupOrder(orders);
      await fetchData();
      setSortMode(SortMode.None);
      handleError('分组顺序已保存');
    } catch {
      handleError('保存失败');
    }
  };

  const handleCreateGroup = async () => {
    if (!newGroup.name?.trim()) return handleError('分组名称不能为空');
    await api.createGroup({ ...newGroup, order_num: groups.length } as Group);
    setOpenAddGroup(false);
    await fetchData();
  };

  const handleCreateSite = async () => {
    if (!newSite.name?.trim() || !newSite.url?.trim()) return handleError('名称和URL不能为空');
    await api.createSite(newSite as Site);
    setOpenAddSite(false);
    await fetchData();
  };

  const handleSaveConfig = async () => {
    for (const [k, v] of Object.entries(tempConfigs)) {
      if (configs[k] !== v) await api.setConfig(k, v);
    }
    setConfigs(tempConfigs);
    setOpenConfig(false);
  };

  const handleExportData = () => {
    const data = {
      groups: groups.map(g => ({ id: g.id, name: g.name, order_num: g.order_num })),
      sites: groups.flatMap(g => g.sites || []),
      configs,
      version: '1.0',
      exportDate: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `导航站备份_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportData = async () => {
    if (!importFile) return;
    setImportLoading(true);
    try {
      const text = await importFile.text();
      const json = JSON.parse(text);
      const res = await api.importData(json);
      if (res.success) {
        await fetchData();
        await fetchConfigs();
        handleError('导入成功');
      } else {
        handleError('导入失败');
      }
    } catch {
      handleError('导入失败');
    } finally {
      setImportLoading(false);
      setOpenImport(false);
    }
  };

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

      <Snackbar open={snackbarOpen} autoHideDuration={6000} onClose={() => setSnackbarOpen(false)}>
        <Alert severity="error" onClose={() => setSnackbarOpen(false)}>{snackbarMessage}</Alert>
      </Snackbar>

      <Box sx={{ minHeight: '100vh', position: 'relative', overflow: 'hidden', bgcolor: '#121212' }}>  {/* 黑色背景 */}
        {/* 背景图 */}
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
                bgcolor: darkMode ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.7)',  // 深色调蒙层
                opacity: 1 - Number(configs['site.backgroundOpacity'] || 0.15),
              },
            }}
          />
        )}

        <Container maxWidth="xl" sx={{ py: 3, position: 'relative', zIndex: 2 }}>
          {/* 第一行: 名称 + 设置 */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h4" fontWeight="bold">{configs['site.name']}</Typography>
            <Stack direction="row" spacing={1}>
              {viewMode === 'edit' && (
                <IconButton onClick={e => setMenuAnchorEl(e.currentTarget)}>
                  <SettingsIcon />
                </IconButton>
              )}
              <ThemeToggle darkMode={darkMode} onToggle={toggleTheme} />
            </Stack>
          </Box>

          {/* 第二行: 主菜单 Tabs */}
          <AppBar position="static" color="transparent" elevation={0} sx={{ mb: 4, backdropFilter: 'blur(12px)', bgcolor: 'rgba(18,18,18,0.5)', borderRadius: 2, p: 1 }}>
            <Tabs
              value={selectedTab || false}
              onChange={(_, v) => setSelectedTab(v)}
              variant="scrollable"
              scrollButtons="auto"
              allowScrollButtonsMobile
              sx={{ '.MuiTabs-indicator': { height: 3, borderRadius: 1 } }}
            >
              {groups.map(g => (
                <Tab key={g.id} label={g.name} value={g.id} sx={{ color: 'white' }} />
              ))}
            </Tabs>
          </AppBar>

          {/* 搜索框 */}
          {configs['site.searchBoxEnabled'] === 'true' && (viewMode === 'edit' || configs['site.searchBoxGuestEnabled'] === 'true') && (
            <Box sx={{ mb: 4, maxWidth: 600, mx: 'auto' }}>
              <SearchBox groups={groups} sites={groups.flatMap(g => g.sites || [])} />
            </Box>
          )}

          {/* 主内容：卡片网格 */}
          {loading ? (
            <Box sx={{ display: 'grid', placeItems: 'center', minHeight: 400 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 4 }}>
              {groups
                .filter(g => g.id === selectedTab)
                .flatMap(group => group.sites || [])
                .map(site => (
                  <Paper
                    key={site.id}
                    elevation={0}
                    sx={{
                      p: 2,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      bgcolor: 'rgba(255,255,255,0.05)',
                      backdropFilter: 'blur(10px)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 3,
                      boxShadow: '0 4px 30px rgba(0,0,0,0.1)',
                      transition: 'transform 0.3s',
                      '&:hover': { transform: 'translateY(-5px)' },
                    }}
                    component="a"
                    href={site.url}
                    target="_blank"
                  >
                    <img src={site.icon} alt={site.name} style={{ width: 48, height: 48, marginBottom: 8 }} />
                    <Typography variant="body2">{site.name}</Typography>
                    {site.description && site.description !== '暂无描述' && (
                      <Typography variant="caption" sx={{ mt: 1, color: 'text.secondary' }}>{site.description}</Typography>
                    )}
                  </Paper>
                ))}
            </Box>
          )}
        </Container>

        {/* 菜单和对话框代码保持不变（省略以节省空间，你原来的就行） */}
      </Box>
    </ThemeProvider>
  );
}
