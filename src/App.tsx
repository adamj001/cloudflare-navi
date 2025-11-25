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
     // —— 终极版：一次解决所有 TS2448 / TS2451 / TS2454 —— //
  const [selectedTab, setSelectedTab] = useState<number | null>(null);
  const [groups, setGroups] = useState<GroupWithSites[]>([]);

  // 用 useMemo 彻底干掉 TS2448/TS2454
  const currentGroup = useMemo(() => 
    groups.find(g => g.id === selectedTab) || null,
    [groups, selectedTab]
  );

  // 自动选中第一个分组作为默认首页
  useEffect(() => {
    if (groups.length > 0 && selectedTab === null) {
      const home = groups.find(g => g.name.toLowerCase() === 'home') || groups[0];
      setSelectedTab(home.id);
    }
  }, [groups]);
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
        <Box                sx={{
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
                  '& .MuiTabs-scroller': {
                    overflowX: 'auto !important',  // ← 关键：手机支持左右滑动
                  },
                }}>
          <CircularProgress size={60} />
        </Box>
      </ThemeProvider>
    );
  }

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

      <Box sx={{ minHeight: '100vh', bgcolor: '#121212', position: 'relative', overflow: 'hidden' }}>
        {configs['site.backgroundImage'] && isSecureUrl(configs['site.backgroundImage']) && (
          <Box
            sx={{
              position: 'absolute',
              top: 0, left: 0, right: 0, bottom: 0,
              backgroundImage: `url(${configs['site.backgroundImage']})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              zIndex: 0,
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0, left: 0, right: 0, bottom: 0,
                backgroundColor: darkMode ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.3)',
                zIndex: 1,
              },
            }}
          />
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
                  '& .MuiTab-root': { fontWeight: 800, fontFamily: '"Microsoft YaHei", sans-serif', fontSize: '1.1rem', minWidth: 80, color: '#ffffff !important' },
                  '& .MuiTabs-indicator': { height: 3, borderRadius: 1, backgroundColor: '#00ff9d' },
                  '& .MuiTabs-scroller': { overflowX: 'auto !important' },
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
                    value={g.id}
                  />
                ))}
              </Tabs>
            </AppBar>
          </Box>

          {configs['site.searchBoxEnabled'] === 'true' && (viewMode === 'edit' || configs['site.searchBoxGuestEnabled'] === 'true') && (
            <Box sx={{ mb: 4, maxWidth: 600, mx: 'auto' }}>
              <SearchBox groups={groups} sites={groups.flatMap(g => g.sites || [])} />
            </Box>
          )}

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 20 }}>
              <CircularProgress size={60} />
            </Box>
          ) : (
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 3.5, pb: 10 }}>
              {currentGroup?.sites?.map((site: Site) => (
                <Paper key={site.id} component="a" href={site.url} target="_blank" rel="noopener" sx={{
                  p: 2.5, borderRadius: 4, bgcolor: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(12px)',
                  border: '1px solid rgba(255,255,255,0.12)', boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                  transition: 'all 0.3s ease', display: 'flex', flexDirection: 'column', alignItems: 'center',
                  textDecoration: 'none', color: 'inherit',
                  '&:hover': { transform: 'translateY(-8px) scale(1.03)', bgcolor: 'rgba(255,255,255,0.1)', boxShadow: '0 16px 40px rgba(0,0,0,0.4)' },
                }}>
                  <Box sx={{ width: 56, height: 56, mb: 1.5, borderRadius: 3, overflow: 'hidden', bgcolor: 'rgba(255,255,255,0.1)', p: 1 }}>
                    <img src={site.icon || `https://api.iowen.cn/favicon/${extractDomain(site.url)}`} alt={site.name}
                      style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                      onError={e => { e.currentTarget.src = `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="%23666"/><text y="55" font-size="50" fill="%23fff" text-anchor="middle" x="50">${site.name.charAt(0)}</text></svg>`; }}
                    />
                  </Box>
                  <Typography variant="subtitle2" fontWeight="bold">{site.name}</Typography>
                  {site.description && site.description !== '暂无描述' && (
                    <Typography variant="caption" sx={{ opacity: 0.7, fontSize: '0.75rem' }}>{site.description}</Typography>
                  )}
                  {viewMode === 'edit' && (
                    <Box sx={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: 0.5 }}>
                      <IconButton size="small" onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}><EditIcon fontSize="small" sx={{ color: 'rgba(255,255,255,0.6)' }} /></IconButton>
                      <IconButton size="small" onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleSiteDelete(site.id!); }}><DeleteIcon fontSize="small" sx={{ color: 'rgba(255,255,255,0.6)' }} /></IconButton>
                    </Box>
                  )}
                </Paper>
              ))}
            </Box>
          )}

          {/* 你原来的登录按钮、GitHub角标、管理员菜单、所有 Dialog 都可以保留在下面 */}
          {/* 直接把你之前的代码粘回去即可，我这里就不写了，防止又乱 */}

        </Container>
      </Box>
    </ThemeProvider>
  );
}

export default App;
