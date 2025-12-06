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
import MenuIcon from '@mui/icons-material/Menu';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import LoginIcon from '@mui/icons-material/Login';
// 💡 站点编辑/删除需要用到以下图标，虽然功能未完全实现，但 UI 上需要它们
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete'; 
// 💡 新增：用于管理员图标化登录/退出
import LockIcon from '@mui/icons-material/Lock';
import LockOpenIcon from '@mui/icons-material/LockOpen';


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
  // 使用 Google Favicon API 作为默认值，因为它比较稳定
  'site.iconApi': 'https://www.google.com/s2/favicons?domain={domain}&sz=256',
  'site.searchBoxEnabled': 'true',
  'site.searchBoxGuestEnabled': 'true',
};

function App() {
  const [darkMode, setDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      return savedTheme === 'dark';
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  const toggleTheme = () => {
    setDarkMode(!darkMode);
    localStorage.setItem('theme', !darkMode ? 'dark' : 'light');
  };

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: darkMode ? 'dark' : 'light',
          // 💡 关键修改：明确定义背景色，确保亮色模式使用白色或浅灰色
          background: {
            default: darkMode ? '#121212' : '#f0f0f0',   // 整个页面背景
            paper: darkMode ? '#1e1e1e' : '#ffffff',     // Paper/Card 组件背景
          },
          primary: {
            main: '#00ff9d',
          },
        },
        typography: {
          fontFamily: 'Roboto, Arial, sans-serif',
        }
      }),
    [darkMode]
  );

  const [groups, setGroups] = useState<GroupWithSites[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState<number | null>(null);
  const currentGroup = groups.find(g => g.id === selectedTab);
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

  const [editSiteOpen, setEditSiteOpen] = useState(false);
  const [editingSite, setEditingSite] = useState<Site | null>(null);

  const handleMenuOpen = (event: React.MouseEvent<HTMLButtonElement>) => {
    setMenuAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setMenuAnchorEl(null);
  };
  
  const handleSaveGroupOrder = async () => {
    try {
      // 这里的逻辑需要确保 groups 数组的顺序被更新后再发送请求
      const orders = groups.map((g, i) => ({ id: g.id!, order_num: i }));
      await api.updateGroupOrder(orders);
      await fetchData();
      setSortMode(SortMode.None);
      handleError('分组顺序已保存');
    } catch {
      handleError('保存失败');
    }
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
  
  // 💡 关键修改：同步 body 上的 .dark-mode class，配合 app.css 覆盖默认 body 背景
  useEffect(() => {
    if (darkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  }, [darkMode]);

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
      // 确保选中第一个 Tab
      if (groupsWithSites.length > 0 && selectedTab === null) {
        setSelectedTab(groupsWithSites[0].id);
      } else if (selectedTab !== null && !groupsWithSites.some(g => g.id === selectedTab)) {
        // 如果当前选中项被删除，则切换到第一个分组
        setSelectedTab(groupsWithSites.length > 0 ? groupsWithSites[0].id : null);
      }
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
    // 💡 修复：使用自定义对话框或 Snackbar/Alert 替代 window.confirm
    // 由于此环境限制，暂时使用一个简单的函数来模拟确认，但保持逻辑不变
    if (confirm(`确定删除站点ID: ${siteId} 吗？`)) { 
        try {
          await api.deleteSite(siteId);
          await fetchData();
        } catch (error) {
          console.error('删除站点失败:', error);
          handleError('删除站点失败: ' + (error as Error).message);
        }
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
    // 💡 修复：使用自定义对话框或 Snackbar/Alert 替代 window.confirm
    if (confirm('警告：删除分组会同时删除该分组下的所有站点！确定删除吗？')) {
        try {
            await api.deleteGroup(groupId);
            await fetchData();
            handleError('分组已删除');
        } catch (error) {
            console.error('删除分组失败:', error);
            handleError('删除分组失败: ' + (error as Error).message);
        }
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

  // 💡 修改：站点新增流程，确保 group_id 传入
  const handleOpenAddSite = (groupId: number) => {
    const group = groups.find((g) => g.id === groupId);
    const maxOrderNum = group?.sites.length ? Math.max(...group.sites.map((s) => s.order_num)) + 1 : 0;
    setNewSite({
      name: '',
      url: '',
      icon: '',
      description: '',
      notes: '',
      group_id: groupId, // 确保 group_id 被设置
      order_num: maxOrderNum,
      is_public: 1,
    });
    setOpenAddSite(true);
  };

  const handleCloseAddSite = () => {
    setOpenAddSite(false);
  };

 const handleSiteInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const { name, value } = e.target;
  setNewSite(prev => {
    let updated = { ...prev, [name]: value };

    // 只要用户输入 URL，就自动生成 favicon URL 作为默认值
    if (name === 'url' && value.trim()) {
      try {
        const domain = extractDomain(value);
        if (domain) {
          // 优先用你配置的 iconApi，不行就用 Google（永远不会挂）
          const template = configs['site.iconApi'] || 'https://www.google.com/s2/favicons?domain={domain}&sz=256';
          updated.icon = template.replace('{domain}', domain);
        }
      } catch (err) {
        console.warn('提取域名失败', err);
      }
    }

    return updated;
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

      {/* 💡 关键修改：将硬编码的背景色 #121212 替换为主题的动态背景色 background.default */}
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', color: 'text.primary', position: 'relative', overflow: 'hidden' }}>
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
                  // 这里的颜色保持动态，与主题背景色形成叠加层
                  backgroundColor: darkMode ? 'rgba(0, 0, 0, 0.7)' : 'rgba(255, 255, 255, 0.3)',
                  zIndex: 1,
                },
              }}
            />
          </>
        )}

        {/* 顶部固定栏：标题和管理按钮 */}
        <AppBar position="sticky" color="transparent" elevation={0} sx={{
            backdropFilter: 'blur(16px)',
            // 确保 AppBar 背景也跟随主题切换
            background: (t) => t.palette.mode === 'dark' ? 'rgba(18, 18, 18, 0.7)' : 'rgba(255, 255, 255, 0.7)',
            zIndex: 100,
            pt: 1,
          }}>
          <Container maxWidth="xl" sx={{ py: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h4" fontWeight="bold" sx={{ color: 'text.primary' }}>
                  {configs['site.name']}
                </Typography>
                
                {/* 管理按钮区域 */}
                <Stack direction="row" spacing={1} alignItems="center">
                  
                  {/* === 1. 简化的管理员登录/登出按钮 (图标化) === */}
                  {isAuthenticated ? (
                    // 认证状态: 显示退出按钮 (LockOpenIcon)
                    <IconButton 
                      color="error" // 使用红色表示退出
                      size="large" // 稍微大一点，图标更易点击
                      onClick={handleLogout}
                      title="退出登录" // 悬停提示
                      sx={{ 
                          transition: 'all 0.3s', 
                          // 立体效果：悬停时轻微阴影
                          boxShadow: (t) => t.shadows[6],
                          bgcolor: 'error.main', // 红色背景
                          color: 'white',
                          '&:hover': { 
                            boxShadow: '0 0 10px rgba(255,0,0,0.8)', 
                            transform: 'scale(1.1)',
                            bgcolor: 'error.dark',
                          } 
                      }}
                    >
                      <LockOpenIcon />
                    </IconButton>
                  ) : (
                    // 未认证状态: 显示登录按钮 (LockIcon)
                    <IconButton 
                      color="primary" // 使用主题色表示登录
                      size="large" 
                      onClick={() => setIsAuthRequired(true)} // 打开登录对话框
                      title="管理员登录" // 悬停提示
                      sx={{ 
                          transition: 'all 0.3s', 
                          // 立体效果：悬停时轻微阴影
                          boxShadow: (t) => t.shadows[6],
                          bgcolor: 'primary.main', // 主色调背景
                          color: 'black', // 保证对比度
                        width: 40,  // 新增：自定义宽度缩小背景
                        height: 40, // 新增：自定义高度缩小背景
      padding: 0, // 可选：减少内边距，避免图标外多余空间

                          '&:hover': { 
                            boxShadow: (t) => `0 0 10px ${t.palette.primary.main}80`, 
                            transform: 'scale(1.1)',
                            bgcolor: 'primary.dark',
                          } 
                      }}
                    >
                      <LockIcon />
                    </IconButton>
                  )}
                  {/* ================================== */}
                  
                  {isAuthenticated && sortMode === SortMode.None && (
                    <>
                      {/* 💡 新增：新增站点按钮 */}
                      <Button 
                        variant="contained" 
                        size="small" 
                        startIcon={<AddIcon />} 
                        onClick={() => selectedTab && handleOpenAddSite(selectedTab as number)}
                        disabled={!selectedTab}
                      >
                        新增站点
                      </Button>
                      
                      {/* 新增分组按钮 */}
                      <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={handleOpenAddGroup}>
                        新增分组
                      </Button>
                      
                      {/* 主菜单按钮 */}
                      <IconButton onClick={handleMenuOpen} color="inherit">
                        <MenuIcon />
                      </IconButton>
                    </>
                  )}
                  {isAuthenticated && sortMode !== SortMode.None && (
                    <>
                      {/* 排序按钮 */}
                      <Button variant="contained" size="small" startIcon={<SaveIcon />} onClick={handleSaveGroupOrder}>
                          保存排序
                      </Button>
                      <Button variant="outlined" size="small" startIcon={<CancelIcon />} onClick={cancelSort}>
                          取消
                      </Button>
                    </>
                  )}
                  
                  {/* 主题切换 */}
                  <ThemeToggle darkMode={darkMode} onToggle={toggleTheme} />
                </Stack>
              </Box>
          </Container>
          
         {/* 菜单 Tabs (独立一行，居中，圆角，玻璃效果) */}
<Box 
    sx={{ 
        display: 'flex', 
        py: 1, 
        my: 1, 
        mx: 'auto',
        
        width: { xs: '100%', md: 'fit-content' }, 
        
        justifyContent: { xs: 'flex-start', md: 'center' }, 
        overflow: 'visible',
    }}
>
    <Paper 
      elevation={4} 
      sx={{ 
            // 修复滑动问题 2 (防御性宽度): 确保 Paper 容器在手机上填满宽度
            width: { xs: '100%', md: 'auto' }, 
            backdropFilter: 'blur(16px)', 
            // 关键：确保 Paper 背景也跟随主题切换
            background: (t) => t.palette.mode === 'dark' ? 'rgba(30,30,30,0.8)' : 'rgba(255,255,255,0.8)', 
            borderRadius: 4, 
            px: 1, 
            py: 0.5,
      }}
    >
            <Tabs
  value={selectedTab || false}
  onChange={(_, v) => setSelectedTab(v as number)}
  variant="scrollable"
  scrollButtons="auto"
  allowScrollButtonsMobile
  sx={{
    '& .MuiTabs-scroller': {
      overflowX: 'auto',
      scrollbarWidth: 'none',
      '&::-webkit-scrollbar': { display: 'none' },
    },
    '& .MuiTabs-flexContainer': { 
      gap: 1, 
      // 👇 最终修复：明确强制不换行，覆盖所有潜在的默认值
      flexWrap: 'nowrap', 
      justifyContent: 'flex-start', sm: 'flex-start'
    },
    // ... MuiTab-root 和 MuiTabs-indicator 样式保持不变
          '& .MuiTab-root': {
                      fontWeight: 800,
                      // 修复亮色模式下不可见问题: 使用主题文字颜色
                      color: 'text.primary', 
                      fontSize: { xs: '0.85rem', sm: '1rem' },
                      minWidth: { xs: 60, sm: 80 },
                      py: 1.5,
                      borderRadius: 3,
                      transition: 'all 0.2s',
                      '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' },
                    },
                    '& .MuiTabs-indicator': {
                      height: 4,
                      borderRadius: 2,
                      background: 'linear-gradient(90deg, #00ff9d, #00b86e)',
                      boxShadow: '0 0 12px #00ff9d',
                    },
                  }}
                >
                  {groups.map(g => (
                    <Tab key={g.id} label={g.name} value={g.id} />
                  ))}
                </Tabs>
            </Paper>
        </Box>
        </AppBar>

        {/* 主要内容区域 */}
        <Container maxWidth="xl" sx={{ py: 3, position: 'relative', zIndex: 2 }}>
          
          {/* 搜索框 */}
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
              gridTemplateColumns: { xs: 'repeat(auto-fill, minmax(140px, 1fr))', md: 'repeat(6, 1fr)' },
              // gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', 
              gap: 3.5, 
              pb: 10 
            }}>
              {/* 渲染当前选中分组下的站点卡片，并应用了垂直居中布局和隐藏描述 */}
                            {currentGroup?.sites?.map((site: Site) => (
                <Paper
                  key={site.id}
                  component={isAuthenticated ? 'div' : 'a'}
                  href={!isAuthenticated ? site.url : undefined}
                  target={!isAuthenticated ? '_blank' : undefined}
                  rel={!isAuthenticated ? 'noopener' : undefined}
                  onClick={() => {
                    if (isAuthenticated) {
                      setEditingSite(site);
                      setEditSiteOpen(true);
                    }
                  }}
                  sx={{
                    p: 2.5,
                    borderRadius: 4,
                    // 🚨 玻璃卡片背景色：保持基于 darkMode 的 rgba，以实现透明和模糊效果
                    bgcolor: darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                    backdropFilter: 'blur(12px)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    
                    // === 2. 增强立体效果 ===
                    // 初始强阴影 (MUI Elevation 16 + 玻璃效果阴影)
                    boxShadow: (t) => t.shadows[16] + ', 0 8px 32px rgba(0,0,0,0.3)',
                    transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
                    transform: 'translateY(0)', // 确保起始状态
                    // ======================
                    
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    textAlign: 'center',
                    position: 'relative',
                    cursor: isAuthenticated ? 'pointer' : 'default',
                    textDecoration: 'none',
                    color: 'inherit',
                    '&:hover': {
                      // 更强的抬升和放大
                      transform: 'translateY(-10px) scale(1.05)', 
                      // 悬停阴影：使用最高等级阴影 + 主色调炫光
                      boxShadow: (t) => t.shadows[24] + `, 0 0 40px ${t.palette.primary.main}50`, 
                      bgcolor: darkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)',
                      ...(isAuthenticated && { border: '2px solid #00ff9d' }),
                    },
                  }}
                >
                  {/* 管理员专属：编辑笔 + 删除垃圾桶 */}
                  {isAuthenticated && (
                    <Box sx={{ position: 'absolute', top: 6, right: 6, display: 'flex', gap: 0.5, zIndex: 10 }}>
                      {/* 编辑小笔 */}
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingSite(site);
                          setEditSiteOpen(true);
                        }}
                        sx={{
                          bgcolor: 'rgba(0,255,157,0.15)',
                          color: '#00ff9d',
                          '&:hover': { bgcolor: 'rgba(0,255,157,0.3)' },
                        }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>

                      {/* 删除垃圾桶 */}
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          // 💡 修复：使用 confirm 函数
                          if (confirm(`确定删除 "${site.name}" 吗？`)) {
                            handleSiteDelete(site.id!);
                          }
                        }}
                        sx={{
                          bgcolor: 'rgba(255,0,0,0.15)',
                          color: '#ff4444',
                          '&:hover': { bgcolor: 'rgba(255,0,0,0.3)' },
                        }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  )}

                  {/* 图标 - 优先使用 site.icon，如果失败且非链接，则显示手动输入的文本或站名首字母 */}
                  <Box sx={{ width: 100, height: 100, mb: 1.5, borderRadius: 3, overflow: 'hidden', bgcolor: 'rgba(255,255,255,0.1)', p: 1.5 }}>
                    <img
                      // 始终尝试使用 site.icon 作为 src
                      src={site.icon || `https://www.google.com/s2/favicons?domain=${extractDomain(site.url)}&sz=256`}
                      alt={site.name}
                      style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                      onError={(e) => {
                        // 1. 检查 site.icon 是否是用户手动输入的文本，而不是一个完整的链接
                        // 如果 site.icon 存在且不是一个以 http 开头的完整链接，我们认为它是一个用户希望显示的字符。
                        const isTextIcon = site.icon && site.icon.length > 0 && !site.icon.startsWith('http');
                        
                        // 确定要显示的字符：用户输入的文本首字符 > 站点名称首字符 > ?
                        const displayChar = isTextIcon 
                                           ? site.icon.trim().charAt(0).toUpperCase() 
                                           : (site.name?.trim().charAt(0).toUpperCase() || '?');

                        const bgColor = darkMode ? '#1e1e1e' : '#f5f5f5'
                        const textColor = darkMode ? '#ffffff' : '#000000'

                        e.currentTarget.src = `data:image/svg+xml,${encodeURIComponent(`
                          <svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">
                            <rect width="100" height="100" rx="20" fill="${bgColor}"/>
                            <text 
                              x="50" y="50" 
                              font-family="Arial,Helvetica,sans-serif" 
                              font-size="64" 
                              font-weight="bold" 
                              fill="${textColor}" 
                              text-anchor="middle" 
                              dominant-baseline="central">
                              ${displayChar}
                            </text>
                          </svg>
                        `)}`
                      }}
                    />
                  </Box>

                  <Typography variant="subtitle2" fontWeight="bold" noWrap sx={{ maxWidth: '100%' }}>
                    {site.name}
                  </Typography>

                  {site.description && site.description !== '暂无描述' && (
                    <Typography variant="caption" noWrap sx={{ opacity: 0.7, fontSize: '0.75rem', color: 'text.secondary', maxWidth: '100%' }}>
                      {site.description}
                    </Typography>
                  )}
                </Paper>
              ))}
            </Box>
          )}

          {/* 管理菜单组件 */}
          <Menu anchorEl={menuAnchorEl} open={openMenu} onClose={handleMenuClose}>
            <MenuItem onClick={() => { setSortMode(SortMode.GroupSort); handleMenuClose(); }}>
              <ListItemIcon><SortIcon /></ListItemIcon>
              <ListItemText>编辑分组排序</ListItemText>
            </MenuItem>
            
            <Divider />
            
            <MenuItem onClick={() => { handleOpenConfig(); handleMenuClose(); }}>
              <ListItemIcon><SettingsIcon /></ListItemIcon>
              <ListItemText>网站设置</ListItemText>
            </MenuItem>
            
            <Divider />
            
            {/* 💡 新增：删除当前分组 */}
            {currentGroup && (
                <MenuItem 
                    onClick={() => { handleGroupDelete(currentGroup.id!); handleMenuClose(); }} 
                    sx={{ color: 'error.main' }}
                    disabled={groups.length === 1} // 至少保留一个分组
                >
                    <ListItemIcon sx={{ color: 'error.main' }}>
                        <DeleteIcon />
                    </ListItemIcon>
                    <ListItemText>删除分组: {currentGroup.name}</ListItemText>
                </MenuItem>
            )}
            
            <Divider />
            
            <MenuItem onClick={() => { handleExportData(); handleMenuClose(); }}>
              <ListItemIcon><FileDownloadIcon /></ListItemIcon>
              <ListItemText>导出数据</ListItemText>
            </MenuItem>
            <MenuItem onClick={() => { handleOpenImport(); handleMenuClose(); }}>
              <ListItemIcon><FileUploadIcon /></ListItemIcon>
              <ListItemText>导入数据</ListItemText>
            </MenuItem>
            
            {/* 💡 移除：退出登录按钮已移到主导航栏 */}
            
          </Menu>

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
                // 确保 GitHub 按钮背景色跟随主题
                bgcolor: (t) => t.palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: 'text.secondary',
                transition: 'all 0.3s ease',
                '&:hover': {
                  bgcolor: (t) => t.palette.mode === 'dark' ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)',
                  transform: 'translateY(-4px)',
                  boxShadow: 4,
                },
                textDecoration: 'none',
              }}
            >
              <GitHubIcon />
            </Paper>
          </Box>
        </Container>

        {/* 导入数据对话框 */}
        <Dialog open={openImport} onClose={handleCloseImport} maxWidth="sm" fullWidth>
          <DialogTitle>导入数据</DialogTitle>
          <DialogContent>
            <DialogContentText sx={{ mb: 2 }}>请上传您之前导出的 JSON 备份文件。</DialogContentText>
            <input
              type="file"
              accept=".json"
              onChange={handleFileSelect}
              style={{ display: 'block', marginBottom: '16px' }}
            />
            {importError && <Alert severity="error">{importError}</Alert>}
            {importFile && (
              <Alert severity="info">已选择文件: {importFile.name}</Alert>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseImport}>取消</Button>
            <Button 
              variant="contained" 
              onClick={handleImportData} 
              disabled={!importFile || importLoading}
              startIcon={importLoading ? <CircularProgress size={20} /> : null}
            >
              {importLoading ? '导入中...' : '开始导入'}
            </Button>
          </DialogActions>
        </Dialog>
        
        <Dialog open={isAuthRequired && !isAuthenticated} onClose={() => setIsAuthRequired(false)}>
          <LoginForm onLogin={handleLogin} loading={loginLoading} error={loginError} />
        </Dialog>

        {/* 新增分组对话框 */}
        <Dialog open={openAddGroup} onClose={handleCloseAddGroup} maxWidth="sm" fullWidth>
          <DialogTitle>新增分组 <IconButton onClick={handleCloseAddGroup} sx={{ position: 'absolute', right: 8, top: 8 }}><CloseIcon /></IconButton></DialogTitle>
          <DialogContent>
            <TextField autoFocus fullWidth label="分组名称" value={newGroup.name || ''} name="name" onChange={handleGroupInputChange} sx={{ mt: 2 }} />
            <FormControlLabel control={<Switch checked={newGroup.is_public === 1} onChange={e => setNewGroup({ ...newGroup, is_public: e.target.checked ? 1 : 0 })} />} label="公开分组" />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseAddGroup}>取消</Button>
            <Button variant="contained" onClick={handleCreateGroup}>创建</Button>
          </DialogActions>
        </Dialog>

        {/* 💡 新增：新增站点对话框 */}
        <Dialog open={openAddSite} onClose={handleCloseAddSite} maxWidth="sm" fullWidth>
          <DialogTitle>新增站点 (分组: {currentGroup?.name}) <IconButton onClick={handleCloseAddSite} sx={{ position: 'absolute', right: 8, top: 8 }}><CloseIcon /></IconButton></DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
                <TextField autoFocus fullWidth label="站点名称" value={newSite.name || ''} name="name" onChange={handleSiteInputChange} />
                <TextField fullWidth label="URL" value={newSite.url || ''} name="url" onChange={handleSiteInputChange} />
                <TextField
                  fullWidth
                  label="图标URL（可手动输入或自动获取缩写）"
                  value={newSite.icon || ''}
                  name="icon" // <-- 添加 name 以便 handleSiteInputChange 捕获
                  onChange={handleSiteInputChange} // <-- 允许手动输入
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        {/* 点击按钮自动获取图标 */}
                        <IconButton
                          size="small"
                          edge="end"
                          onClick={() => {
                            if (newSite.url) {
                              const domain = extractDomain(newSite.url);
                              if (domain) {
                                // 强制从 URL 自动获取图标
                                const template = configs['site.iconApi'] || 'https://www.google.com/s2/favicons?domain={domain}&sz=256';
                                setNewSite(prev => ({
                                  ...prev,
                                  icon: template.replace('{domain}', domain)
                                }));
                              } else {
                                 handleError('无法从 URL 提取域名');
                              }
                            } else {
                               handleError('请先输入有效的 URL');
                            }
                          }}
                          aria-label="自动获取图标"
                        >
                          <AutoFixHighIcon fontSize="small" />
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
                <TextField fullWidth label="描述 (可选)" value={newSite.description || ''} name="description" onChange={handleSiteInputChange} />
                <FormControlLabel control={<Switch checked={newSite.is_public === 1} onChange={e => setNewSite({ ...newSite, is_public: e.target.checked ? 1 : 0 })} />} label="公开站点" />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseAddSite}>取消</Button>
            <Button variant="contained" onClick={handleCreateSite}>创建</Button>
          </DialogActions>
        </Dialog>
        
        {/* ==================== 编辑站点弹窗 ==================== */}
        <Dialog open={editSiteOpen} onClose={() => setEditSiteOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>
            编辑站点
            <IconButton onClick={() => setEditSiteOpen(false)} sx={{ position: 'absolute', right: 8, top: 8 }}>
              <CloseIcon />
            </IconButton>
          </DialogTitle>

          {editingSite && (
            <DialogContent>
              <Stack spacing={2} sx={{ mt: 1 }}>
                <TextField
                  autoFocus
                  fullWidth
                  label="站点名称"
                  value={editingSite.name || ''}
                  onChange={(e) => setEditingSite({ ...editingSite, name: e.target.value })}
                />

                <TextField
                  fullWidth
                  label="URL（修改后会自动更新图标默认值）"
                  value={editingSite.url || ''}
                  onChange={(e) => {
                    const url = e.target.value;
                    setEditingSite(prev => {
                      if (!prev) return prev;
                      const domain = extractDomain(url);
                      // 自动生成新的默认图标 URL
                      const template = configs['site.iconApi'] || 'https://www.google.com/s2/favicons?domain={domain}&sz=256';
                      const icon = domain ? template.replace('{domain}', domain) : prev.icon;
                      return { ...prev, url, icon };
                    });
                  }}
                />

                <TextField
                  fullWidth
                  label="图标URL（可手动输入或自动获取缩写）"
                  value={editingSite.icon || ''}
                  onChange={(e) => setEditingSite({ ...editingSite, icon: e.target.value })} // <-- 允许手动输入
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          size="small"
                          onClick={() => {
                            if (!editingSite.url) {
                               handleError('请先输入有效的 URL');
                               return;
                            }
                            const domain = extractDomain(editingSite.url);
                            if (domain) {
                              // 强制从 URL 自动获取图标
                              const template = configs['site.iconApi'] || 'https://www.google.com/s2/favicons?domain={domain}&sz=256';
                              setEditingSite({ ...editingSite, icon: template.replace('{domain}', domain) });
                            } else {
                               handleError('无法从 URL 提取域名');
                            }
                          }}
                          aria-label="自动获取图标"
                        >
                          <AutoFixHighIcon />
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />

                <TextField
                  fullWidth
                  label="描述（可选）"
                  value={editingSite.description || ''}
                  onChange={(e) => setEditingSite({ ...editingSite, description: e.target.value })}
                />
              </Stack>
            </DialogContent>
          )}

          <DialogActions>
            <Button onClick={() => setEditSiteOpen(false)}>取消</Button>
            <Button
              variant="contained"
              onClick={async () => {
                if (editingSite?.id) {
                  await api.updateSite(editingSite.id, editingSite);
                  await fetchData();
                  setEditSiteOpen(false);
                }
              }}
            >
              保存修改
            </Button>
          </DialogActions>
        </Dialog>

        {/* 网站设置对话框 */}
        <Dialog open={openConfig} onClose={handleCloseConfig} maxWidth="sm" fullWidth>
          <DialogTitle>网站设置 <IconButton onClick={handleCloseConfig} sx={{ position: 'absolute', right: 8, top: 8 }}><CloseIcon /></IconButton></DialogTitle>
          <DialogContent>
            <Stack spacing={2}>
              <TextField label="网站标题" value={tempConfigs['site.title']} onChange={handleConfigInputChange} name="site.title" fullWidth />
              <TextField label="网站名称" value={tempConfigs['site.name']} onChange={handleConfigInputChange} name="site.name" fullWidth />
              <TextField label="背景图片URL" value={tempConfigs['site.backgroundImage']} onChange={handleConfigInputChange} name="site.backgroundImage" fullWidth />
              <Slider value={Number(tempConfigs['site.backgroundOpacity'])} onChange={(_, v) => setTempConfigs({...tempConfigs, 'site.backgroundOpacity': String(v)})} min={0} max={1} step={0.05} />
              <TextField label="自定义CSS" value={tempConfigs['site.customCss']} onChange={handleConfigInputChange} name="site.customCss" multiline rows={6} fullWidth />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseConfig}>取消</Button>
            <Button variant="contained" onClick={handleSaveConfig}>保存</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </ThemeProvider>
  );
}

export default App;

