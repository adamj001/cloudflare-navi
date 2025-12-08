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

// 💡 dnd-kit 新增：引入核心组件和工具函数
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';


import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUserCog, faSignOutAlt } from '@fortawesome/free-solid-svg-icons';
// 引入用于拖拽手柄的图标
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';

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
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete'; 
import ViewModuleIcon from '@mui/icons-material/ViewModule';


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
  'site.iconApi': 'https://www.google.com/s2/favicons?domain={domain}&sz=256',
  'site.searchBoxEnabled': 'true',
  'site.searchBoxGuestEnabled': 'true',
};

// 💡 dnd-kit 新增：可拖拽的 Tab 组件包装器
function SortableTab(props: any) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: props.value });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 2 : 1, // 拖拽时层级更高
    opacity: isDragging ? 0.5 : 1, // 拖拽时半透明
    cursor: 'grab'
  };
  return (
    <Tab {...props} ref={setNodeRef} style={style} {...attributes} {...listeners} 
      icon={<DragIndicatorIcon sx={{ fontSize: '1rem', opacity: 0.6, mr: 0.5 }} />}
      iconPosition="start"
    />
  );
}

// 💡 dnd-kit 新增：可拖拽的站点卡片包装器
const SortableSiteCard = ({ id, children, disabled }: { id: number, children: React.ReactNode, disabled?: boolean }) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id, disabled });
  
    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      zIndex: isDragging ? 100 : 'auto',
      opacity: isDragging ? 0.5 : 1,
      touchAction: 'none', // 防止移动端滚动干扰
    };
  
    return (
      <Box ref={setNodeRef} style={style} {...attributes} {...listeners} sx={{ height: '100%' }}>
         {children}
         {!disabled && (
          <Box sx={{ 
            position: 'absolute', 
            top: 8, 
            left: 8, 
            zIndex: 20, 
            cursor: 'grab',
            bgcolor: 'rgba(0,0,0,0.2)',
            borderRadius: '50%',
            p: 0.5,
            display: 'flex'
          }}>
             <DragIndicatorIcon fontSize="small" sx={{ color: 'white', opacity: 0.8 }} />
          </Box>
         )}
      </Box>
    );
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
          background: {
            default: darkMode ? '#121212' : '#f0f0f0',
            paper: darkMode ? '#1e1e1e' : '#ffffff',
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
  const [selectedTab, setSelectedTab] = useState<number | null>(null);
  const currentGroup = groups.find(g => g.id === selectedTab);
  const [sortMode, setSortMode] = useState<SortMode>(SortMode.None);
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

  // 💡 dnd-kit 新增：设置拖拽传感器
  const sensors = useSensors(
    useSensor(PointerSensor, {
        activationConstraint: {
            distance: 8, 
        }
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );
  
  // ▼▼▼▼▼▼▼▼▼▼ 核心修复：将 useMemo 移动到这里，必须在任何 return 之前！ ▼▼▼▼▼▼▼▼▼▼
  // 准备用于 SortableContext 的 items id 数组
  const groupIds = useMemo(() => groups.map(g => g.id!), [groups]);
  const siteIds = useMemo(() => currentGroup?.sites.map(s => s.id!) || [], [currentGroup]);
  // ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲

  const handleMenuOpen = (event: React.MouseEvent<HTMLButtonElement>) => {
    setMenuAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setMenuAnchorEl(null);
  };
  
  const handleSaveOrder = async () => {
      try {
          if (sortMode === SortMode.GroupSort) {
              const orders = groups.map((g, i) => ({ id: g.id!, order_num: i }));
              await api.updateGroupOrder(orders);
              handleError('分组顺序已保存');
          } else if (sortMode === SortMode.SiteSort && currentGroup) {
              const siteOrders = currentGroup.sites.map((site, index) => ({ id: site.id as number, order_num: index }));
              await api.updateSiteOrder(siteOrders);
              handleError('站点顺序已保存');
          }
          await fetchData();
          setSortMode(SortMode.None);
      } catch (error) {
        console.error('保存排序失败:', error);
        handleError('保存失败: ' + (error as Error).message);
      }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) {
      return;
    }

    if (sortMode === SortMode.GroupSort) {
        setGroups((items) => {
            const oldIndex = items.findIndex(i => i.id === active.id);
            const newIndex = items.findIndex(i => i.id === over.id);
            return arrayMove(items, oldIndex, newIndex);
        });
    } else if (sortMode === SortMode.SiteSort && currentGroup) {
        setGroups(prevGroups => {
            const groupIndex = prevGroups.findIndex(g => g.id === currentGroup.id);
            if(groupIndex === -1) return prevGroups;

            const currentSites = prevGroups[groupIndex].sites;
            const oldIndex = currentSites.findIndex(s => s.id === active.id);
            const newIndex = currentSites.findIndex(s => s.id === over.id);
            
            const newGroups = [...prevGroups];
            newGroups[groupIndex] = {
                ...newGroups[groupIndex],
                sites: arrayMove(currentSites, oldIndex, newIndex)
            };
            return newGroups;
        });
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
    setSortMode(SortMode.None);
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
      const groupsWithSites = await api.getGroupsWithSites();
      const sortedGroups = groupsWithSites.map(g => ({
        ...g,
        sites: g.sites.sort((a, b) => a.order_num - b.order_num)
      })).sort((a,b) => a.order_num - b.order_num);

      setGroups(sortedGroups);

      if (sortedGroups.length > 0 && selectedTab === null) {
        setSelectedTab(sortedGroups[0].id);
      } else if (selectedTab !== null && !sortedGroups.some(g => g.id === selectedTab)) {
        setSelectedTab(sortedGroups.length > 0 ? sortedGroups[0].id : null);
      }
    } catch (error) {
      console.error('加载数据失败:', error);
      handleError('加载数据失败: ' + (error instanceof Error ? error.message : '未知错误'));
    } finally {
      setLoading(false);
    }
  };

  const handleSiteDelete = async (siteId: number) => {
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

  const handleGroupDelete = async (groupId: number) => {
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

  const startSiteSort = () => {
    if (!currentGroup || currentGroup.sites.length === 0) {
        handleError("当前分组没有可排序的站点");
        return;
    }
    setSortMode(SortMode.SiteSort);
    handleMenuClose();
  };

  const cancelSort = async () => {
    setSortMode(SortMode.None);
    await fetchData();
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
  const { name, value } = e.target;
  setNewSite(prev => {
    let updated = { ...prev, [name]: value };
    if (name === 'url' && value.trim()) {
      try {
        const domain = extractDomain(value);
        if (domain) {
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

  // ▼▼▼▼▼▼▼▼▼▼ 这个 Early Return 必须在所有 Hooks 定义之后！ ▼▼▼▼▼▼▼▼▼▼
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
  // ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />

      <Snackbar open={snackbarOpen} autoHideDuration={6000} onClose={handleCloseSnackbar}>
        <Alert onClose={handleCloseSnackbar} severity="error" variant="filled" sx={{ width: '100%' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>

      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', color: 'text.primary', position: 'relative', overflow: 'hidden' }}>
        {configs['site.backgroundImage'] && isSecureUrl(configs['site.backgroundImage']) && (
          <>
            <Box
              sx={{
                position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                backgroundImage: `url(${configs['site.backgroundImage']})`,
                backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat',
                zIndex: 0,
                '&::before': {
                  content: '""', position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                  backgroundColor: darkMode ? 'rgba(0, 0, 0, 0.7)' : 'rgba(255, 255, 255, 0.3)',
                  zIndex: 1,
                },
              }}
            />
          </>
        )}

        {/* 顶部固定栏 */}
        <AppBar position="sticky" color="transparent" elevation={0} sx={{
            backdropFilter: 'blur(16px)',
            background: (t) => t.palette.mode === 'dark' ? 'rgba(18, 18, 18, 0.7)' : 'rgba(255, 255, 255, 0.7)',
            zIndex: 100, pt: 1,
          }}>
          <Container maxWidth="xl" sx={{ py: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h4" fontWeight="bold" sx={{ color: 'text.primary' }}>
                  {configs['site.name']}
                </Typography>
                
                {/* 管理按钮区域 */}
                <Stack direction="row" spacing={1} alignItems="center">
                  
                  {isAuthenticated && sortMode === SortMode.None && (
                    <>
                      {/* 主菜单按钮 */}
                      <IconButton onClick={handleMenuOpen} color="inherit">
                        <MenuIcon />
                      </IconButton>
                    </>
                  )}
                  
                  {isAuthenticated && sortMode !== SortMode.None && (
                    <>
                      <Button 
                        variant="contained" 
                        size="small" 
                        startIcon={<SaveIcon />} 
                        onClick={handleSaveOrder}
                        sx={{ 
                          bgcolor: sortMode === SortMode.GroupSort ? 'warning.main' : 'info.main',
                          '&:hover': {
                             bgcolor: sortMode === SortMode.GroupSort ? 'warning.dark' : 'info.dark',
                          }
                        }}
                      >
                          {sortMode === SortMode.GroupSort ? '保存分组排序' : '保存站点排序'}
                      </Button>
                      <Button variant="outlined" size="small" startIcon={<CancelIcon />} onClick={cancelSort}>
                          取消
                      </Button>
                    </>
                  )}

                  {isAuthenticated ? (
                    <IconButton 
                      color="error" size="medium" onClick={handleLogout} title="退出登录"
                      sx={{ 
                        width: 36, height: 36, padding: 0, transition: 'all 0.3s', 
                          boxShadow: (t) => t.shadows[6], bgcolor: 'error.main', color: 'white',
                          '&:hover': { boxShadow: '0 0 10px rgba(255,0,0,0.8)', transform: 'scale(1.1)', bgcolor: 'error.dark' } 
                      }}
                    >
                      <FontAwesomeIcon icon={faSignOutAlt} style={{ fontSize: '1.2rem' }} />
                    </IconButton>
                  ) : (
                    <IconButton 
                      color="primary" size="medium" onClick={() => setIsAuthRequired(true)} title="管理员登录"
                      sx={{ 
                          transition: 'all 0.3s', boxShadow: (t) => t.shadows[6], bgcolor: 'primary.main', color: 'black',
                        width: 36, height: 36, padding: 0,
                          '&:hover': { boxShadow: (t) => `0 0 10px ${t.palette.primary.main}80`, transform: 'scale(1.1)', bgcolor: 'primary.dark' } 
                      }}
                    >
                       <FontAwesomeIcon icon={faUserCog} style={{ fontSize: '1.2rem' }} />
                    </IconButton>
                  )}
                  <ThemeToggle darkMode={darkMode} onToggle={toggleTheme} />
                </Stack>
              </Box>
          </Container>
          
         {/* 菜单 Tabs */}
<Box 
    sx={{ 
        display: 'flex', py: 1, my: 1, mx: 'auto',
        width: { xs: '100%', md: 'fit-content' }, 
        justifyContent: { xs: 'flex-start', md: 'center' }, overflow: 'visible',
    }}
>
    <Paper 
      elevation={4} 
      sx={{ 
            width: { xs: '100%', md: 'auto' }, 
            backdropFilter: 'blur(16px)', 
            background: (t) => t.palette.mode === 'dark' ? 'rgba(30,30,30,0.8)' : 'rgba(255,255,255,0.8)', 
            borderRadius: 4, px: 1, py: 0.5,
            border: sortMode === SortMode.GroupSort ? (t) => `2px dashed ${t.palette.warning.main}` : 'none'
      }}
    >
    
    <DndContext 
      sensors={sensors} 
      collisionDetection={closestCenter} 
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={groupIds} strategy={horizontalListSortingStrategy}>
           <Tabs
              value={selectedTab || false}
              onChange={(_, v) => setSelectedTab(v as number)}
              variant="scrollable" scrollButtons="auto" allowScrollButtonsMobile
              sx={{
                '& .MuiTabs-scroller': { overflowX: 'auto', scrollbarWidth: 'none', '&::-webkit-scrollbar': { display: 'none' } },
                '& .MuiTabs-flexContainer': { gap: 1, flexWrap: 'nowrap', justifyContent: 'flex-start' },
                '& .MuiTab-root': {
                  fontWeight: 800, color: 'text.primary', fontSize: { xs: '0.85rem', sm: '1rem' },
                  minWidth: { xs: 60, sm: 80 }, py: 1.5, borderRadius: 3, transition: 'all 0.2s',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' },
                  pointerEvents: sortMode === SortMode.GroupSort ? 'none' : 'auto'
                },
                '& .MuiTabs-indicator': {
                  height: 4, borderRadius: 2, background: 'linear-gradient(90deg, #00ff9d, #00b86e)', boxShadow: '0 0 12px #00ff9d',
                  display: sortMode === SortMode.GroupSort ? 'none' : 'block'
                },
              }}
            >
              {groups.map(g => (
                sortMode === SortMode.GroupSort ? (
                  <SortableTab key={g.id} label={g.name} value={g.id} />
                ) : (
                  <Tab key={g.id} label={g.name} value={g.id} />
                )
              ))}

              {isAuthenticated && sortMode === SortMode.None && (
                <Tab
                  icon={<AddIcon />}
                  onClick={(e) => { e.preventDefault(); handleOpenAddGroup(); }}
                  sx={{ minWidth: { xs: 40, sm: 50 }, '&:hover': { bgcolor: 'rgba(0,255,157,0.1)' } }}
                  aria-label="添加分组"
                />
              )}
            </Tabs>
        </SortableContext>
    </DndContext>
            </Paper>
        </Box>
        </AppBar>

        {/* 主要内容区域 */}
        <Container maxWidth="xl" sx={{ py: 3, position: 'relative', zIndex: 2 }}>
          
          {/* 搜索框 */}
          {configs['site.searchBoxEnabled'] === 'true' && (viewMode === 'edit' || configs['site.searchBoxGuestEnabled'] === 'true') && sortMode === SortMode.None && (
            <Box sx={{ mb: 4, maxWidth: 600, mx: 'auto' }}>
              <SearchBox
                groups={groups.map(g => ({ ...g }))}
                sites={groups.flatMap(g => g.sites || [])}
              />
            </Box>
          )}
          
          {sortMode === SortMode.SiteSort && (
             <Alert severity="info" sx={{ mb: 3, mx: 'auto', maxWidth: 600, border: (t) => `1px solid ${t.palette.info.main}` }} icon={<DragIndicatorIcon />}>
                 正在排序模式：请拖动卡片调整顺序，完成后点击顶部“保存站点排序”。
             </Alert>
          )}

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
              <CircularProgress size={60} thickness={4} />
            </Box>
          ) : (
            <DndContext 
              sensors={sensors} 
              collisionDetection={closestCenter} 
              onDragEnd={handleDragEnd}
            >
              <SortableContext items={siteIds} strategy={rectSortingStrategy}>
                  <Box sx={{ 
                    display: 'grid', 
                    gridTemplateColumns: { xs: 'repeat(auto-fill, minmax(140px, 1fr))', md: 'repeat(6, 1fr)' },
                    gap: 3.5, 
                    pb: 10,
                    border: sortMode === SortMode.SiteSort ? (t) => `2px dashed ${t.palette.info.main}` : 'none',
                    borderRadius: 4,
                    p: sortMode === SortMode.SiteSort ? 2 : 0,
                    transition: 'all 0.3s'
                  }}>
                    {currentGroup?.sites?.map((site: Site) => {
                        const CardContent = (
                            <Paper
                                component={isAuthenticated && sortMode === SortMode.None ? 'div' : 'a'}
                                href={!isAuthenticated && sortMode === SortMode.None ? site.url : undefined}
                                target={!isAuthenticated && sortMode === SortMode.None ? '_blank' : undefined}
                                rel={!isAuthenticated && sortMode === SortMode.None ? 'noopener' : undefined}
                                onClick={(e: React.MouseEvent) => {
                                    if (sortMode !== SortMode.None) {
                                        e.preventDefault();
                                        return;
                                    }

                                    if (isAuthenticated) {
                                        setEditingSite(site);
                                        setEditSiteOpen(true);
                                    }
                                }}
                                sx={{
                                    p: 2.5,
                                    borderRadius: 4,
                                    bgcolor: darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                                    backdropFilter: 'blur(12px)',
                                    border: '1px solid rgba(255,255,255,0.12)',
                                    boxShadow: (t) => t.shadows[16] + ', 0 8px 32px rgba(0,0,0,0.3)',
                                    transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
                                    transform: 'translateY(0)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    textAlign: 'center',
                                    position: 'relative',
                                    cursor: sortMode !== SortMode.None ? 'grab' : (isAuthenticated ? 'pointer' : 'default'),
                                    textDecoration: 'none',
                                    color: 'inherit',
                                    height: '100%', 
                                    '&:hover': {
                                      ...(sortMode === SortMode.None && {
                                          transform: 'translateY(-10px) scale(1.05)', 
                                          boxShadow: (t) => t.shadows[24] + `, 0 0 40px ${t.palette.primary.main}50`, 
                                          bgcolor: darkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)',
                                          ...(isAuthenticated && { border: '2px solid #00ff9d' }),
                                      })
                                    },
                                }}
                                >
                                {isAuthenticated && sortMode === SortMode.None && (
                                    <Box sx={{ position: 'absolute', top: 6, right: 6, display: 'flex', gap: 0.5, zIndex: 10 }}>
                                    <IconButton size="small" onClick={(e) => { e.stopPropagation(); setEditingSite(site); setEditSiteOpen(true); }} sx={{ bgcolor: 'rgba(0,255,157,0.15)', color: '#00ff9d', '&:hover': { bgcolor: 'rgba(0,255,157,0.3)' }, }}>
                                        <EditIcon fontSize="small" />
                                    </IconButton>
                                    <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleSiteDelete(site.id!); }} sx={{ bgcolor: 'rgba(255,0,0,0.15)', color: '#ff4444', '&:hover': { bgcolor: 'rgba(255,0,0,0.3)' }, }}>
                                        <DeleteIcon fontSize="small" />
                                    </IconButton>
                                    </Box>
                                )}

                                <Box sx={{ width: 100, height: 100, mb: 1.5, borderRadius: 3, overflow: 'hidden', bgcolor: 'rgba(255,255,255,0.1)', p: 1.5 }}>
                                    <img
                                    src={site.icon || `https://www.google.com/s2/favicons?domain=${extractDomain(site.url)}&sz=256`}
                                    alt={site.name}
                                    style={{ width: '100%', height: '100%', objectFit: 'contain', pointerEvents: 'none' }}
                                    onError={(e) => {
                                        const isTextIcon = site.icon && site.icon.length > 0 && !site.icon.startsWith('http');
                                        const displayChar = isTextIcon ? site.icon.trim().charAt(0).toUpperCase() : (site.name?.trim().charAt(0).toUpperCase() || '?');
                                        const bgColor = darkMode ? '#1e1e1e' : '#f5f5f5'
                                        const textColor = darkMode ? '#ffffff' : '#000000'
                                        e.currentTarget.src = `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100" height="100" rx="20" fill="${bgColor}"/><text x="50" y="50" font-family="Arial,Helvetica,sans-serif" font-size="64" font-weight="bold" fill="${textColor}" text-anchor="middle" dominant-baseline="central">${displayChar}</text></svg>`)}`
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
                        );

                        if (sortMode === SortMode.SiteSort) {
                            return (
                                <SortableSiteCard key={site.id} id={site.id!}>
                                    {CardContent}
                                </SortableSiteCard>
                            );
                        }
                        return <Box key={site.id} sx={{ height: '100%' }}>{CardContent}</Box>;
                    })}

                  {isAuthenticated && currentGroup && sortMode === SortMode.None && (
                      <Paper
                          sx={{
                              p: 2.5, borderRadius: 4, bgcolor: darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.12)',
                              boxShadow: (t) => t.shadows[16] + ', 0 8px 32px rgba(0,0,0,0.3)', transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
                              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                              '&:hover': { transform: 'translateY(-10px) scale(1.05)', boxShadow: (t) => t.shadows[24] + `, 0 0 40px ${t.palette.primary.main}50`, bgcolor: darkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)', },
                              minHeight: '180px', height: '100%'
                          }}
                          onClick={() => handleOpenAddSite(currentGroup.id!)}
                      >
                          <AddIcon sx={{ fontSize: 64, color: 'primary.main' }} />
                          <Typography variant="subtitle2" fontWeight="bold" sx={{ mt: 1 }}>添加站点</Typography>
                      </Paper>
                  )}
              </Box>
              </SortableContext>
            </DndContext>
          )}

          <Menu anchorEl={menuAnchorEl} open={openMenu} onClose={handleMenuClose}>
            <MenuItem onClick={() => { setSortMode(SortMode.GroupSort); handleMenuClose(); }}>
              <ListItemIcon><SortIcon /></ListItemIcon>
              <ListItemText>编辑分组排序</ListItemText>
            </MenuItem>

            <MenuItem onClick={startSiteSort} disabled={!currentGroup || currentGroup.sites.length <= 1}>
              <ListItemIcon><ViewModuleIcon /></ListItemIcon>
              <ListItemText>编辑当前分组站点排序</ListItemText>
            </MenuItem>
            
            <Divider />
            
            <MenuItem onClick={() => { handleOpenConfig(); handleMenuClose(); }}>
              <ListItemIcon><SettingsIcon /></ListItemIcon>
              <ListItemText>网站设置</ListItemText>
            </MenuItem>
            
            <Divider />
            
            {currentGroup && (
                <MenuItem 
                    onClick={() => { handleGroupDelete(currentGroup.id!); handleMenuClose(); }} 
                    sx={{ color: 'error.main' }}
                    disabled={groups.length <= 1}
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
          </Menu>

          {sortMode === SortMode.None && (
          <Box sx={{ position: 'fixed', right: 24, bottom: 24, zIndex: 10 }}>
            <Paper component="a" href="https://github.com/adamj001/cloudflare-navi" target="_blank" rel="noopener" elevation={2}
              sx={{
                p: 1.5, borderRadius: 10, bgcolor: (t) => t.palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
                backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.1)', color: 'text.secondary', transition: 'all 0.3s ease',
                '&:hover': { bgcolor: (t) => t.palette.mode === 'dark' ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)', transform: 'translateY(-4px)', boxShadow: 4, },
                textDecoration: 'none',
              }}
            >
              <GitHubIcon />
            </Paper>
          </Box>
          )}
        </Container>

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
                  name="icon" 
                  onChange={handleSiteInputChange} 
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          size="small"
                          edge="end"
                          onClick={() => {
                            if (newSite.url) {
                              const domain = extractDomain(newSite.url);
                              if (domain) {
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
                  onChange={(e) => setEditingSite({ ...editingSite, icon: e.target.value })} 
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
