import { useState, useEffect, useMemo } from 'react';
import { NavigationClient } from './API/client';
import { MockNavigationClient } from './API/mock';
import { Site, Group } from './API/http';
import { GroupWithSites } from './types';
import ThemeToggle from './components/ThemeToggle';
import LoginForm from './components/LoginForm';
import SearchBox from './components/SearchBox';
import { sanitizeCSS, isSecureUrl, extractDomain } from './utils/url';
import './App.css';

// 这三行必须单独 import！不能放进大括号！
import AppBar from '@mui/material/AppBar';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';

// 这几个图标也必须单独 import
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import LoginIcon from '@mui/icons-material/Login';
import MenuIcon from '@mui/icons-material/Menu';

// 其余组件可以用大括号批量导入
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
  DialogTitle,
  IconButton,
  Menu,
  MenuItem,
  Divider,
  ListItemIcon,
  ListItemText,
  Snackbar,
  Slider,
} from '@mui/material';

import SortIcon from '@mui/icons-material/Sort';
import GitHubIcon from '@mui/icons-material/GitHub';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import SettingsIcon from '@mui/icons-material/Settings';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import LogoutIcon from '@mui/icons-material/Logout';
const isDevEnvironment = import.meta.env.DEV;
const useRealApi = import.meta.env.VITE_USE_REAL_API === 'true';

const api =
  isDevEnvironment && !useRealApi
    ? new MockNavigationClient()
    : new NavigationClient(isDevEnvironment ? 'http://localhost:8788/api' : '/api');

enum SortMode {
  None,
  GroupSort,
  SiteSort,
}

const DEFAULT_CONFIGS = {
  'site.title': '导航站',
  'site.name': '导航站',
  'site.customCss': '',
  'site.backgroundImage': '',
  'site.backgroundOpacity': '0.15',
  'site.iconApi': 'https://www.faviconextractor.com/favicon/{domain}?larger=true',
  'site.searchBoxEnabled': 'true',
  'site.searchBoxGuestEnabled': 'true',
};

function App() {
  // 新增这两行！必须放在最前面！
  const [selectedTab, setSelectedTab] = useState<number | null>(null);
 

  const [darkMode, setDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      return savedTheme === 'dark';
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: darkMode ? 'dark' : 'light',
        },
      }),
    [darkMode]
  );

  const toggleTheme = () => {
    setDarkMode(!darkMode);
    localStorage.setItem('theme', !darkMode ? 'dark' : 'light');
  };

  const [groups, setGroups] = useState<GroupWithSites[]>([]);
   const currentGroup = groups.find(g => g.id === selectedTab);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>(SortMode.None);
  const [currentSortingGroupId, setCurrentSortingGroupId] = useState<number | null>(null);

  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [isAuthRequired, setIsAuthRequired] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);

  type ViewMode = 'readonly' | 'edit';
  const [viewMode, setViewMode] = useState<ViewMode>('readonly');

  const [configs, setConfigs] = useState<Record<string, string>>(DEFAULT_CONFIGS);
  const [openConfig, setOpenConfig] = useState(false);
  const [tempConfigs, setTempConfigs] = useState<Record<string, string>>(DEFAULT_CONFIGS);

  const [openAddGroup, setOpenAddGroup] = useState(false);
  const [openAddSite, setOpenAddSite] = useState(false);
  const [newGroup, setNewGroup] = useState<Partial<Group>>({
    name: '',
    order_num: 0,
    is_public: 1,
  });
  const [newSite, setNewSite] = useState<Partial<Site>>({
    name: '',
    url: '',
    icon: '',
    description: '',
    notes: '',
    order_num: 0,
    group_id: 0,
    is_public: 1,
  });

  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const openMenu = Boolean(menuAnchorEl);

  const [openImport, setOpenImport] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [importLoading, setImportLoading] = useState(false);

  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  const handleMenuOpen = (event: React.MouseEvent<HTMLButtonElement>) => {
    setMenuAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setMenuAnchorEl(null);
  };

  const checkAuthStatus = async () => {
    try {
      setIsAuthChecking(true);
      const result = await api.checkAuthStatus();
      if (result) {
        setIsAuthenticated(true);
        setViewMode('edit');
      } else {
        setIsAuthenticated(false);
        setViewMode('readonly');
      }
      await Promise.all([fetchData(), fetchConfigs()]);
    } catch (error) {
      console.error('认证检查失败:', error);
      setViewMode('readonly');
      await Promise.all([fetchData(), fetchConfigs()]);
    } finally {
      setIsAuthChecking(false);
    }
  };

  const handleLogin = async (username: string, password: string) => {
    try {
      setLoginLoading(true);
      setLoginError(null);
      const loginResponse = await api.login(username, password, true);
      if (loginResponse?.success) {
        setIsAuthenticated(true);
        setIsAuthRequired(false);
        setViewMode('edit');
        await fetchData();
        await fetchConfigs();
      } else {
        setLoginError(loginResponse?.message || '用户名或密码错误');
      }
    } catch (error) {
      console.error('登录失败:', error);
      setLoginError('登录失败');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = async () => {
    await api.logout();
    setIsAuthenticated(false);
    setViewMode('readonly');
    await fetchData();
    handleError('已退出登录');
  };

  const fetchConfigs = async () => {
    try {
      const configsData = await api.getConfigs();
      const mergedConfigs = { ...DEFAULT_CONFIGS, ...configsData };
      setConfigs(mergedConfigs);
      setTempConfigs(mergedConfigs);
    } catch (error) {
      console.error('加载配置失败:', error);
    }
  };

  useEffect(() => {
    checkAuthStatus();
  }, []);

  useEffect(() => {
    document.title = configs['site.title'] || '导航站';
  }, [configs]);

  useEffect(() => {
    const customCss = configs['site.customCss'];
    let styleElement = document.getElementById('custom-style');
    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.id = 'custom-style';
      document.head.appendChild(styleElement);
    }
    const sanitized = sanitizeCSS(customCss || '');
    styleElement.textContent = sanitized;
    return () => {
      const el = document.getElementById('custom-style');
      if (el) el.remove();
    };
  }, [configs]);

  const handleError = (errorMessage: string) => {
    setSnackbarMessage(errorMessage);
    setSnackbarOpen(true);
  };

  const handleCloseSnackbar = () => {
    setSnackbarOpen(false);
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const groupsWithSites = await api.getGroupsWithSites();
      setGroups(groupsWithSites);
    } catch (error) {
      console.error('加载数据失败:', error);
      handleError('加载数据失败: ' + (error instanceof Error ? error.message : '未知错误'));
    } finally {
      setLoading(false);
    }
  };

  const handleSiteUpdate = async (updatedSite: Site) => {
    try {
      if (updatedSite.id) {
        await api.updateSite(updatedSite.id, updatedSite);
        await fetchData();
      }
    } catch (error) {
      console.error('更新站点失败:', error);
      handleError('更新站点失败: ' + (error as Error).message);
    }
  };

  const handleSiteDelete = async (siteId: number) => {
    try {
      await api.deleteSite(siteId);
      await fetchData();
    } catch (error) {
      console.error('删除站点失败:', error);
      handleError('删除站点失败: ' + (error as Error).message);
    }
  };

  const handleGroupUpdate = async (updatedGroup: Group) => {
    try {
      if (updatedGroup.id) {
        await api.updateGroup(updatedGroup.id, updatedGroup);
        await fetchData();
      }
    } catch (error) {
      console.error('更新分组失败:', error);
      handleError('更新分组失败: ' + (error as Error).message);
    }
  };

  const handleGroupDelete = async (groupId: number) => {
    try {
      await api.deleteGroup(groupId);
      await fetchData();
    } catch (error) {
      console.error('删除分组失败:', error);
      handleError('删除分组失败: ' + (error as Error).message);
    }
  };

  const handleSaveSiteOrder = async (groupId: number, sites: Site[]) => {
    try {
      const siteOrders = sites.map((site, index) => ({ id: site.id as number, order_num: index }));
      const result = await api.updateSiteOrder(siteOrders);
      if (result) {
        await fetchData();
      } else {
        throw new Error('站点排序更新失败');
      }
      setSortMode(SortMode.None);
      setCurrentSortingGroupId(null);
    } catch (error) {
      console.error('更新站点排序失败:', error);
      handleError('更新站点排序失败: ' + (error as Error).message);
    }
  };

  const startSiteSort = (groupId: number) => {
    setSortMode(SortMode.SiteSort);
    setCurrentSortingGroupId(groupId);
  };

  const cancelSort = () => {
    setSortMode(SortMode.None);
    setCurrentSortingGroupId(null);
  };

  const handleOpenAddGroup = () => {
    setNewGroup({ name: '', order_num: groups.length, is_public: 1 });
    setOpenAddGroup(true);
  };

  const handleCloseAddGroup = () => {
    setOpenAddGroup(false);
  };

  const handleGroupInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewGroup({
      ...newGroup,
      [e.target.name]: e.target.value,
    });
  };

  const handleCreateGroup = async () => {
    try {
      if (!newGroup.name) {
        handleError('分组名称不能为空');
        return;
      }
      await api.createGroup(newGroup as Group);
      await fetchData();
      handleCloseAddGroup();
    } catch (error) {
      console.error('创建分组失败:', error);
      handleError('创建分组失败: ' + (error as Error).message);
    }
  };

  const handleOpenAddSite = (groupId: number) => {
    const group = groups.find((g) => g.id === groupId);
    const maxOrderNum = group?.sites.length ? Math.max(...group.sites.map((s) => s.order_num)) + 1 : 0;
    setNewSite({
      name: '',
      url: '',
      icon: '',
      description: '',
      notes: '',
      group_id: groupId,
      order_num: maxOrderNum,
      is_public: 1,
    });
    setOpenAddSite(true);
  };

  const handleCloseAddSite = () => {
    setOpenAddSite(false);
  };

  const handleSiteInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewSite({
      ...newSite,
      [e.target.name]: e.target.value,
    });
  };

  const handleCreateSite = async () => {
    try {
      if (!newSite.name || !newSite.url) {
        handleError('站点名称和URL不能为空');
        return;
      }
      await api.createSite(newSite as Site);
      await fetchData();
      handleCloseAddSite();
    } catch (error) {
      console.error('创建站点失败:', error);
      handleError('创建站点失败: ' + (error as Error).message);
    }
  };

  const handleOpenConfig = () => {
    setTempConfigs({ ...configs });
    setOpenConfig(true);
  };

  const handleCloseConfig = () => {
    setOpenConfig(false);
  };

  const handleConfigInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTempConfigs({
      ...tempConfigs,
      [e.target.name]: e.target.value,
    });
  };

  const handleSaveConfig = async () => {
    try {
      for (const [key, value] of Object.entries(tempConfigs)) {
        if (configs[key] !== value) {
          await api.setConfig(key, value);
        }
      }
      setConfigs({ ...tempConfigs });
      handleCloseConfig();
    } catch (error) {
      console.error('保存配置失败:', error);
      handleError('保存配置失败: ' + (error as Error).message);
    }
  };

  const handleExportData = async () => {
    try {
      const allSites: Site[] = [];
      groups.forEach((group) => {
        if (group.sites && group.sites.length > 0) {
          allSites.push(...group.sites);
        }
      });
      const exportData = {
        groups: groups.map((group) => ({
          id: group.id,
          name: group.name,
          order_num: group.order_num,
        })),
        sites: allSites,
        configs: configs,
        version: '1.0',
        exportDate: new Date().toISOString(),
      };
      const dataStr = JSON.stringify(exportData, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
      const exportFileName = `导航站备份_${new Date().toISOString().slice(0, 10)}.json`;
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileName);
      linkElement.click();
    } catch (error) {
      console.error('导出数据失败:', error);
      handleError('导出数据失败');
    }
  };

  const handleOpenImport = () => {
    setImportFile(null);
    setImportError(null);
    setOpenImport(true);
    handleMenuClose();
  };

  const handleCloseImport = () => {
    setOpenImport(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      if (selectedFile) {
        setImportFile(selectedFile);
        setImportError(null);
      }
    }
  };

  const handleImportData = async () => {
    if (!importFile) {
      handleError('请选择要导入的文件');
      return;
    }
    try {
      setImportLoading(true);
      setImportError(null);
      const fileReader = new FileReader();
      fileReader.readAsText(importFile, 'UTF-8');
      fileReader.onload = async (e) => {
        try {
          if (!e.target?.result) {
            throw new Error('读取文件失败');
          }
          const importData = JSON.parse(e.target.result as string);
          const result = await api.importData(importData);
          if (!result.success) {
            throw new Error(result.error || '导入失败');
          }
          await fetchData();
          await fetchConfigs();
          handleCloseImport();
          handleError('导入成功！');
        } catch (error) {
          console.error('解析导入数据失败:', error);
          handleError('解析导入数据失败: ' + (error instanceof Error ? error.message : '未知错误'));
        } finally {
          setImportLoading(false);
        }
      };
      fileReader.onerror = () => {
        handleError('读取文件失败');
        setImportLoading(false);
      };
    } catch (error) {
      console.error('导入数据失败:', error);
      handleError('导入数据失败: ' + (error as Error).message);
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

      <Snackbar open={snackbarOpen} autoHideDuration={6000} onClose={handleCloseSnackbar}>
        <Alert onClose={handleCloseSnackbar} severity="error" variant="filled" sx={{ width: '100%' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>

      <Box sx={{ minHeight: '100vh', bgcolor: '#121212', color: 'text.primary', position: 'relative', overflow: 'hidden' }}>
        {configs['site.backgroundImage'] && isSecureUrl(configs['site.backgroundImage']) && (
          <>
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundImage: `url(${configs['site.backgroundImage']})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
                zIndex: 0,
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: darkMode ? 'rgba(0, 0, 0, 0.7)' : 'rgba(255, 255, 255, 0.3)',
                  zIndex: 1,
                },
              }}
            />
          </>
        )}

        <Container maxWidth="xl" sx={{ py: 3, position: 'relative', zIndex: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h4" fontWeight="bold" sx={{ color: 'white' }}>
              {configs['site.name']}
            </Typography>
            <Stack direction="row" spacing={1}>
              {isAuthenticated && <IconButton onClick={handleOpenConfig} color="inherit"><SettingsIcon /></IconButton>}
              <ThemeToggle darkMode={darkMode} onToggle={toggleTheme} />
            </Stack>
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 4 }}>
            <AppBar position="static" color="transparent" elevation={0} sx={{ 
              width: 'fit-content', 
              backdropFilter: 'blur(16px)', 
              background: 'rgba(30,30,30,0.6)', 
              borderRadius: 4, 
              px: 2, 
              py: 1 
            }}>
              <Tabs 
                value={selectedTab || false} 
                onChange={(_, v) => setSelectedTab(v)} 
                variant="scrollable" 
                scrollButtons="auto" 
                allowScrollButtonsMobile 
                sx={{
                  '& .MuiTab-root': { 
                    fontWeight: 800, 
                    fontFamily: '"Microsoft YaHei", sans-serif', 
                    fontSize: '1.1rem', 
                    minWidth: 80, 
                    color: '#ffffff !important' 
                  },
                  '& .MuiTabs-indicator': { 
                    height: 3, 
                    borderRadius: 1, 
                    backgroundColor: '#00ff9d' 
                  },
                }}
              >
                {groups.map(g => <Tab key={g.id} label={g.name} value={g.id} />)}
              </Tabs>
            </AppBar>
          </Box>

          {configs['site.searchBoxEnabled'] === 'true' && (viewMode === 'edit' || configs['site.searchBoxGuestEnabled'] === 'true') && (
            <Box sx={{ mb: 4, maxWidth: 600, mx: 'auto' }}>
              <SearchBox
                groups={groups.map(g => ({
                  id: g.id,
                  name: g.name,
                  order_num: g.order_num,
                  is_public: g.is_public,
                  created_at: g.created_at,
                  updated_at: g.updated_at,
                }))}
                sites={groups.flatMap(g => g.sites || [])}
              />
            </Box>
          )}

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
              <CircularProgress size={60} thickness={4} />
            </Box>
          ) : (
            <Box sx={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', 
              gap: 3.5, 
              pb: 10 
            }}>
              {currentGroup?.sites?.map((site: Site) => (
                <Paper
                  key={site.id}
                  component="a"
                  href={site.url}
                  target="_blank"
                  rel="noopener"
                  sx={{
                    p: 2.5,
                    borderRadius: 4,
                    bgcolor: 'rgba(255,255,255,0.06)',
                    backdropFilter: 'blur(12px)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                    transition: 'all 0.3s ease',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    textDecoration: 'none',
                    color: 'inherit',
                                       '&:hover': {
                      transform: 'translateY(-8px) scale(1.03)',
                      bgcolor: 'rgba(255,255,255,0.1)',
                      boxShadow: '0 16px 40px rgba(0,0,0,0.4)',
                  },
                }}
              >
                <Box sx={{ width: 56, height: 56, mb: 1.5, borderRadius: 3, overflow: 'hidden', bgcolor: 'rgba(255,255,255,0.1)', p: 1 }}>
                  <img 
                    src={site.icon || `https://api.iowen.cn/favicon/${extractDomain(site.url)}`} 
                    alt={site.name}
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                    onError={e => {
                      e.currentTarget.src = `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="%23666"/><text y="55" font-size="50" fill="%23fff" text-anchor="middle" x="50">${site.name.charAt(0)}</text></svg>`;
                    }}
                  />
                </Box>
                <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 0.5 }}>
                  {site.name}
                </Typography>
                {site.description && site.description !== '暂无描述' && (
                  <Typography variant="caption" sx={{ opacity: 0.7, fontSize: '0.75rem' }}>
                    {site.description}
                  </Typography>
                )}

                {/* 管理员模式下显示编辑/删除按钮 */}
                {viewMode === 'edit' && (
                  <Box sx={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: 0.5 }}>
                    <IconButton size="small" onClick={(e) => { e.preventDefault(); e.stopPropagation(); /* TODO: 打开编辑弹窗 */ }}>
                      <EditIcon fontSize="small" sx={{ color: 'rgba(255,255,255,0.6)' }} />
                    </IconButton>
                    <IconButton size="small" onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleSiteDelete(site.id!); }}>
                      <DeleteIcon fontSize="small" sx={{ color: 'rgba(255,255,255,0.6)' }} />
                    </IconButton>
                  </Box>
                )}
              </Paper>
            ))}
          </Box>
        )}

        {/* 左下角管理员登录按钮 */}
        {!isAuthenticated && (
          <Box sx={{ position: 'fixed', left: 24, bottom: 24, zIndex: 10 }}>
            <Button
              variant="contained"
              startIcon={<LoginIcon />}
              onClick={() => setIsAuthRequired(true)}
              sx={{
                bgcolor: 'rgba(0,255,150,0.15)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(0,255,150,0.3)',
                color: '#00ff9d',
                fontWeight: 'bold',
                px: 3,
                py: 1.5,
                borderRadius: 4,
                '&:hover': { bgcolor: 'rgba(0,255,150,0.25)', transform: 'translateY(-2px)' },
              }}
            >
              管理员登录
            </Button>
          </Box>
        )}

        {/* 右下角 GitHub 图标 */}
        <Box sx={{ position: 'fixed', right: 24, bottom: 24, zIndex: 10 }}>
          <Paper
            component="a"
            href="https://github.com/adamj001/cloudflare-navi"
            target="_blank"
            rel="noopener"
            elevation={2}
            sx={{
              p: 1.5,
              borderRadius: 10,
              bgcolor: 'rgba(255,255,255,0.08)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: 'text.secondary',
              transition: 'all 0.3s ease',
              '&:hover': {
                bgcolor: 'rgba(255,255,255,0.15)',
                transform: 'translateY(-4px)',
                boxShadow: 4,
              },
              textDecoration: 'none',
            }}
          >
            <GitHubIcon />
          </Paper>
        </Box>

        {/* 管理员右上角菜单 */}
        {isAuthenticated && (
          <>
            <IconButton
              onClick={handleMenuOpen}
              sx={{ position: 'fixed', top: 16, right: 16, zIndex: 20, bgcolor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(10px)' }}
            >
              <MenuIcon sx={{ color: 'white' }} />
            </IconButton>

            <Menu
              anchorEl={menuAnchorEl}
              open={openMenu}
              onClose={handleMenuClose}
              PaperProps={{ sx: { bgcolor: 'rgba(30,30,30,0.95)', backdropFilter: 'blur(16px)' } }}
            >
              <MenuItem onClick={() => { handleMenuClose(); handleOpenAddGroup(); }}>
                <ListItemIcon><AddIcon sx={{ color: '#00ff9d' }} /></ListItemIcon>
                <ListItemText>添加分组</ListItemText>
              </MenuItem>
              <MenuItem onClick={() => { handleMenuClose(); handleExportData(); }}>
                <ListItemIcon><FileDownloadIcon sx={{ color: '#00ff9d' }} /></ListItemIcon>
                <ListItemText>导出备份</ListItemText>
              </MenuItem>
              <MenuItem onClick={() => { handleMenuClose(); handleOpenImport(); }}>
                <ListItemIcon><FileUploadIcon sx={{ color: '#00ff9d' }} /></ListItemIcon>
                <ListItemText>导入备份</ListItemText>
              </MenuItem>
              <Divider sx={{ my: 1 }} />
              <MenuItem onClick={() => { handleMenuClose(); handleLogout(); }}>
                <ListItemIcon><LogoutIcon sx={{ color: '#ff6b6b' }} /></ListItemIcon>
                <ListItemText>退出登录</ListItemText>
              </MenuItem>
            </Menu>
          </>
        )}

        {/* 登录弹窗 */}
        <Dialog open={isAuthRequired && !isAuthenticated} onClose={() => setIsAuthRequired(false)}>
          <LoginForm onLogin={handleLogin} loading={loginLoading} error={loginError} />
        </Dialog>

        {/* 设置弹窗 */}
        <Dialog open={openConfig} onClose={handleCloseConfig} maxWidth="sm" fullWidth>
          <DialogTitle>网站设置 <IconButton onClick={handleCloseConfig} sx={{ position: 'absolute', right: 8, top: 8 }}><CloseIcon /></IconButton></DialogTitle>
          <DialogContent>
            <Stack spacing={3} sx={{ mt: 2 }}>
              <TextField label="网站标题" name="site.title" value={tempConfigs['site.title']} onChange={handleConfigInputChange} fullWidth />
              <TextField label="网站名称" name="site.name" value={tempConfigs['site.name']} onChange={handleConfigInputChange} fullWidth />
              <TextField label="背景图URL" name="site.backgroundImage" value={tempConfigs['site.backgroundImage']} onChange={handleConfigInputChange} fullWidth helperText="支持 https 直链" />
              <Box>
                <Typography gutterBottom>背景透明度</Typography>
                <Slider
                  value={Number(tempConfigs['site.backgroundOpacity'] || 0.15)}
                  onChange={(_, v) => setTempConfigs({...tempConfigs, 'site.backgroundOpacity': String(v)})}
                  min={0} max={1} step={0.05}
                  valueLabelDisplay="auto"
                />
              </Box>
              <TextField
                label="自定义CSS"
                name="site.customCss"
                value={tempConfigs['site.customCss']}
                onChange={handleConfigInputChange}
                multiline
                rows={8}
                fullWidth
                helperText="这里可以写任意 CSS，会注入全局"
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseConfig}>取消</Button>
            <Button variant="contained" onClick={handleSaveConfig}>保存设置</Button>
          </DialogActions>
        </Dialog>

        {/* 导入弹窗 */}
        <Dialog open={openImport} onClose={handleCloseImport}>
          <DialogTitle>导入备份</DialogTitle>
          <DialogContent>
            <Button variant="contained" component="label">
              选择JSON文件
              <input type="file" hidden accept=".json" onChange={handleFileSelect} />
            </Button>
            {importFile && <Typography sx={{ mt: 2 }}>已选择：{importFile.name}</Typography>}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseImport}>取消</Button>
            <Button variant="contained" onClick={handleImportData} disabled={!importFile || importLoading}>
              {importLoading ? '导入中...' : '开始导入'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* 添加分组弹窗 */}
        <Dialog open={openAddGroup} onClose={handleCloseAddGroup}>
          <DialogTitle>添加新分组</DialogTitle>
          <DialogContent>
            <TextField autoFocus margin="dense" label="分组名称" name="name" value={newGroup.name} onChange={handleGroupInputChange} fullWidth />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseAddGroup}>取消</Button>
            <Button variant="contained" onClick={handleCreateGroup}>创建</Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Box>
  </ThemeProvider>
  );
}

export default App;       
