import { useState, useEffect, useMemo, useCallback } from 'react';
// 假设这些导入是正确的
import { NavigationClient } from './API/client'; 
import { MockNavigationClient } from './API/mock';
import { Site, Group } from './API/http';
import { GroupWithSites } from './types'; // 假设 GroupWithSites 在 types.ts 中
// 假设这些导入是正确的
import ThemeToggle from './components/ThemeToggle'; 
// ⚠️ 假设 GroupCard 和 SortableGroupItem 的定义现在在 App.tsx 内部，或者它们被正确导入
// import GroupCard from './components/GroupCard'; 
// import SortableGroupItem from './components/SortableGroupItem'; 
import LoginForm from './components/LoginForm';
import SearchBox from './components/SearchBox';
import { sanitizeCSS, isSecureUrl, extractDomain } from './utils/url';
import { SearchResultItem } from './utils/search';
import './App.css';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';

// Material UI 导入
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
import LogoutIcon from '@mui/icons-material/Logout';
import MenuIcon from '@mui/icons-material/Menu';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import HomeIcon from '@mui/icons-material/Home';


// ⚠️ 修正 1: 将 SortMode 定义为字符串联合类型，解决 TS2322 错误
export type SortModeType = 'None' | 'GroupSort' | 'SiteSort';

// 排序模式枚举 (使用字符串值，并基于上面的类型)
export enum SortMode {
  None = 'None',
  GroupSort = 'GroupSort',
  SiteSort = 'SiteSort',
}

// ⚠️ 修正 2A: 假设 GroupCardProps 的定义在这里，并添加 cardSx
interface GroupCardProps {
  group: GroupWithSites;
  sortMode: SortModeType; // 使用上面定义的类型
  currentSortingGroupId: number | null;
  viewMode: 'readonly' | 'edit';
  onUpdate: (site: Site) => Promise<void>;
  onDelete: (siteId: number) => Promise<void>;
  onSaveSiteOrder: (groupId: number, sites: Site[]) => Promise<void>;
  onStartSiteSort: (groupId: number) => void;
  onAddSite: (groupId: number) => void;
  onUpdateGroup: (group: Group) => Promise<void>;
  onDeleteGroup: (groupId: number) => Promise<void>;
  configs: Record<string, string>;
  cardSx: any; // ⚡ 核心修正: 解决 Property 'cardSx' does not exist 错误
}

// ⚠️ 修正 2B: 假设 SortableGroupItemProps 的定义在这里，并添加 cardSx
interface SortableGroupItemProps {
  id: string;
  group: GroupWithSites;
  cardSx: any; // ⚡ 核心修正: 解决 Property 'cardSx' does not exist 错误
}

// ⚠️ 修正 3: 如果 GroupCard 和 SortableGroupItem 的实现代码在 App.tsx 中，它们也需要被包含。
// 由于我没有看到您的实现，我将暂时跳过它们，假设您已经把它们的代码粘贴到 App.tsx 中。
// 只需要确保 GroupCard 和 SortableGroupItem 的实现使用了上面定义的 Props 即可。
// 如果它们是从外部导入的，请检查它们的原始文件并进行修正 2A 和 2B。

// 根据环境选择使用真实API还是模拟API
const isDevEnvironment = import.meta.env.DEV;
const useRealApi = import.meta.env.VITE_USE_REAL_API === 'true';

const api =
  isDevEnvironment && !useRealApi
    ? new MockNavigationClient()
    : new NavigationClient(isDevEnvironment ? 'http://localhost:8788/api' : '/api');

// 默认配置
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

// 新增视图模式枚举
enum MainView {
  Home = 'Home',
  Management = 'Management', 
}

// 定义立体感卡片样式
const CardStyle = {
  bgcolor: 'grey.900', 
  color: 'white',
  p: 2,
  borderRadius: 2,
  boxShadow: (theme: any) =>
    theme.palette.mode === 'dark'
      ? '0px 8px 10px -5px rgba(0,0,0,0.4), 0px 16px 24px 2px rgba(0,0,0,0.28), 0px 6px 30px 5px rgba(0,0,0,0.24)'
      : '0px 8px 10px -5px rgba(0,0,0,0.2), 0px 16px 24px 2px rgba(0,0,0,0.14), 0px 6px 30px 5px rgba(0,0,0,0.12)',
  transition: 'transform 0.3s ease-in-out, box-shadow 0.3s ease-in-out',
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: (theme: any) =>
      theme.palette.mode === 'dark'
        ? '0px 12px 17px 2px rgba(0,0,0,0.4), 0px 20px 36px 5px rgba(0,0,0,0.28), 0px 8px 40px 7px rgba(0,0,0,0.24)'
        : '0px 12px 17px 2px rgba(0,0,0,0.2), 0px 20px 36px 5px rgba(0,0,0,0.14), 0px 8px 40px 7px rgba(0,0,0,0.12)',
  },
};

function App() {
  // ... (保持所有 Hooks 状态不变)

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
          ...(darkMode && {
            background: {
              default: '#121212', 
              paper: '#1e1e1e',
            },
            text: {
              primary: '#ffffff',
              secondary: 'rgba(255, 255, 255, 0.7)',
            },
          }),
        },
      }),
    [darkMode]
  );

  const toggleTheme = () => {
    setDarkMode(!darkMode);
    localStorage.setItem('theme', !darkMode ? 'dark' : 'light');
  };

  const [groups, setGroups] = useState<GroupWithSites[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>(SortMode.None); // 保持使用 SortMode
  const [currentSortingGroupId, setCurrentSortingGroupId] = useState<number | null>(null);

  // 认证状态
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [isAuthRequired, setIsAuthRequired] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);

  type ViewMode = 'readonly' | 'edit';
  const [viewMode, setViewMode] = useState<ViewMode>('readonly');

  const [currentView, setCurrentView] = useState<MainView>(MainView.Home);
  const handleViewChange = (event: React.SyntheticEvent, newValue: MainView) => {
    setCurrentView(newValue);
    cancelSort();
    handleMenuClose(); 
  };
  
  // 配置状态
  const [configs, setConfigs] = useState<Record<string, string>>(DEFAULT_CONFIGS);
  const [openConfig, setOpenConfig] = useState(false);
  const [tempConfigs, setTempConfigs] = useState<Record<string, string>>(DEFAULT_CONFIGS);

  // 配置传感器
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 1, 
        delay: 0, 
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 100, 
        tolerance: 3, 
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // 其他状态管理
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
  const [importResultOpen, setImportResultOpen] = useState(false);
  const [importResultMessage, setImportResultMessage] = useState('');

  // ... (保持所有菜单/错误/配置/登录/登出/数据处理回调函数不变)
  const handleMenuOpen = (event: React.MouseEvent<HTMLButtonElement>) => {
    setMenuAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setMenuAnchorEl(null);
  };

  const handleError = useCallback((errorMessage: string) => {
    setSnackbarMessage(errorMessage);
    setSnackbarOpen(true);
    console.error(errorMessage);
  }, []);

  const fetchConfigs = useCallback(async () => {
    try {
      const configsData = await api.getConfigs();
      setConfigs({
        ...DEFAULT_CONFIGS,
        ...configsData,
      });
      setTempConfigs({
        ...DEFAULT_CONFIGS,
        ...configsData,
      });
    } catch (error) {
      console.error('加载配置失败:', error);
    }
  }, []);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const groupsWithSites = await api.getGroupsWithSites();

      setGroups(groupsWithSites);
    } catch (error) {
      console.error('加载数据失败:', error);
      handleError('加载数据失败: ' + (error instanceof Error ? error.message : '未知错误'));

      if (error instanceof Error && error.message.includes('认证')) {
        setIsAuthRequired(true);
        setIsAuthenticated(false);
      }
    } finally {
      setLoading(false);
    }
  }, [handleError]);


  const checkAuthStatus = useCallback(async () => {
    try {
      setIsAuthChecking(true);
      const result = await api.checkAuthStatus();

      if (!result) {
        if (api.isLoggedIn()) {
          api.logout();
        }
        setIsAuthenticated(false);
        setIsAuthRequired(false);
        setViewMode('readonly');
      } else {
        setIsAuthenticated(true);
        setIsAuthRequired(false);
        setViewMode('edit');
      }

      await fetchData();
      await fetchConfigs();
    } catch (error) {
      console.error('认证检查失败:', error);
      setIsAuthenticated(false);
      setIsAuthRequired(false);
      setViewMode('readonly');
      
      try {
        await fetchData();
        await fetchConfigs();
      } catch (e) {
        console.error('加载公开数据失败:', e);
      }
    } finally {
      setIsAuthChecking(false);
    }
  }, [fetchData, fetchConfigs]);

  const handleLogin = async (username: string, password: string, rememberMe: boolean = false) => {
    try {
      setLoginLoading(true);
      setLoginError(null);

      const loginResponse = await api.login(username, password, rememberMe);

      if (loginResponse?.success) {
        setIsAuthenticated(true);
        setIsAuthRequired(false);
        setViewMode('edit');
        setCurrentView(MainView.Management); 
        await fetchData();
        await fetchConfigs();
      } else {
        const message = loginResponse?.message || '用户名或密码错误';
        handleError(message);
        setLoginError(message);
        setIsAuthenticated(false);
        setViewMode('readonly');
        return;
      }
    } catch (error) {
      handleError('登录失败: ' + (error instanceof Error ? error.message : '未知错误'));
      setIsAuthenticated(false);
      setViewMode('readonly');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = async () => {
    await api.logout();
    setIsAuthenticated(false);
    setIsAuthRequired(false);
    setViewMode('readonly');
    setCurrentView(MainView.Home); 

    await fetchData();
    await fetchConfigs();

    handleMenuClose();

    setSnackbarMessage('已退出登录，当前为访客模式');
    setSnackbarOpen(true);
  };

  useEffect(() => {
    checkAuthStatus();
    setSortMode(SortMode.None);
    setCurrentSortingGroupId(null);
  }, [checkAuthStatus]);


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
      if (el) {
        el.remove();
      }
    };
  }, [configs]);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const handleCloseSnackbar = () => {
    setSnackbarOpen(false);
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

  const handleSaveGroupOrder = async () => {
    try {
      const groupOrders = groups.map((group, index) => ({
        id: group.id as number,
        order_num: index,
      }));

      const result = await api.updateGroupOrder(groupOrders);

      if (result) {
        await fetchData();
      } else {
        throw new Error('分组排序更新失败');
      }

      setSortMode(SortMode.None);
      setCurrentSortingGroupId(null);
    } catch (error) {
      console.error('更新分组排序失败:', error);
      handleError('更新分组排序失败: ' + (error as Error).message);
    }
  };

  const handleSaveSiteOrder = async (groupId: number, sites: Site[]) => {
    try {
      const siteOrders = sites.map((site, index) => ({
        id: site.id as number,
        order_num: index,
      }));

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

  const startGroupSort = () => {
    setSortMode(SortMode.GroupSort);
    setCurrentSortingGroupId(null);
    handleMenuClose();
  };

  const startSiteSort = (groupId: number) => {
    setSortMode(SortMode.SiteSort);
    setCurrentSortingGroupId(groupId);
  };

  const cancelSort = () => {
    setSortMode(SortMode.None);
    setCurrentSortingGroupId(null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) return;

    if (active.id !== over.id) {
      const oldIndex = groups.findIndex((group) => group.id.toString() === active.id);
      const newIndex = groups.findIndex((group) => group.id.toString() === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        setGroups(arrayMove(groups, oldIndex, newIndex));
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
    try {
      await api.deleteGroup(groupId);
      await fetchData(); 
    } catch (error) {
      console.error('删除分组失败:', error);
      handleError('删除分组失败: ' + (error as Error).message);
    }
  };

  const handleOpenAddGroup = () => {
    setNewGroup({ name: '', order_num: groups.length, is_public: 1 });
    setOpenAddGroup(true);
    handleMenuClose();
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
      setNewGroup({ name: '', order_num: 0 });
    } catch (error) {
      console.error('创建分组失败:', error);
      handleError('创建分组失败: ' + (error as Error).message);
    }
  };

  const handleOpenAddSite = (groupId: number) => {
    const group = groups.find((g) => g.id === groupId);
    const maxOrderNum = group?.sites.length
      ? Math.max(...group.sites.map((s) => s.order_num)) + 1
      : 0;

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
    handleMenuClose();
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
      setLoading(true);

      const allSites: Site[] = groups.flatMap((group) => group.sites || []);

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
      handleError('导出数据失败: ' + (error instanceof Error ? error.message : '未知错误'));
    } finally {
      setLoading(false);
    }
    handleMenuClose();
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

          if (!importData.groups || !Array.isArray(importData.groups)) {
            throw new Error('导入文件格式错误：缺少分组数据');
          }
          if (!importData.sites || !Array.isArray(importData.sites)) {
            throw new Error('导入文件格式错误：缺少站点数据');
          }
          if (!importData.configs || typeof importData.configs !== 'object') {
            throw new Error('导入文件格式错误：缺少配置数据');
          }

          const result = await api.importData(importData);

          if (!result.success) {
            throw new Error(result.error || '导入失败');
          }

          const stats = result.stats;
          if (stats) {
            const summary = [
              `导入成功！`,
              `分组：发现${stats.groups.total}个，新建${stats.groups.created}个，合并${stats.groups.merged}个`,
              `卡片：发现${stats.sites.total}个，新建${stats.sites.created}个，更新${stats.sites.updated}个，跳过${stats.sites.skipped}个`,
            ].join('\n');

            setImportResultMessage(summary);
            setImportResultOpen(true);
          }

          await fetchData();
          await fetchConfigs();
          handleCloseImport();
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
      handleError('导入数据失败: ' + (error instanceof Error ? error.message : '未知错误'));
    } finally {
      setImportLoading(false);
    }
  };

  const renderLoginForm = () => {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'background.default',
        }}
      >
        <Paper elevation={10} sx={{ ...CardStyle, p: 4, width: '90%', maxWidth: '400px' }}>
          <LoginForm onLogin={handleLogin} loading={loginLoading} error={loginError} />
        </Paper>
      </Box>
    );
  };

  // 渲染主内容区域
  const renderMainContent = () => {
    // 渲染首页内容
    if (currentView === MainView.Home) {
      return (
        <Stack spacing={5} sx={{ mt: 4 }}>
          {groups.map((group) => (
            <Box key={`group-${group.id}`} id={`group-${group.id}`}>
              {/* ⚠️ 修正 4A: GroupCard 调用 */}
              {/* 假设 GroupCard 组件的定义存在于 App.tsx 内部或已正确导入 */}
              {/* 如果 GroupCard 是一个外部组件，请忽略这一段注释 */}
              <GroupCard
                group={group}
                // 使用字符串枚举值
                sortMode={SortMode.None} 
                currentSortingGroupId={currentSortingGroupId}
                viewMode={viewMode}
                onUpdate={handleSiteUpdate}
                onDelete={handleSiteDelete}
                onSaveSiteOrder={handleSaveSiteOrder}
                onStartSiteSort={startSiteSort}
                onAddSite={handleOpenAddSite}
                onUpdateGroup={handleGroupUpdate}
                onDeleteGroup={handleGroupDelete}
                configs={configs}
                cardSx={CardStyle} 
              />
            </Box>
          ))}
        </Stack>
      );
    }

    // 渲染管理内容区域
    if (currentView === MainView.Management) {
      if (viewMode !== 'edit' && sortMode === SortMode.None) {
        return (
          <Box sx={{ mt: 4 }}>
            <Alert severity='info'>请先登录管理员账号以管理网站数据。</Alert>
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
              <Button
                variant='contained'
                color='primary'
                onClick={() => setIsAuthRequired(true)}
              >
                管理员登录
              </Button>
            </Box>
          </Box>
        );
      }

      // 渲染排序中的内容
      if (sortMode !== SortMode.None) {
        return (
          <Box sx={{ mt: 4 }}>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                mb: 3,
                p: 2,
                borderRadius: 2,
                bgcolor: 'background.paper',
              }}
            >
              <Typography variant='h6' fontWeight='bold'>
                {sortMode === SortMode.GroupSort ? '分组排序模式' : '站点排序模式 (请在对应分组内操作)'}
              </Typography>
              <Stack direction='row' spacing={1}>
                {sortMode === SortMode.GroupSort && (
                  <Button
                    variant='contained'
                    color='primary'
                    startIcon={<SaveIcon />}
                    onClick={handleSaveGroupOrder}
                    size='small'
                  >
                    保存分组顺序
                  </Button>
                )}
                <Button
                  variant='outlined'
                  color='inherit'
                  startIcon={<CancelIcon />}
                  onClick={cancelSort}
                  size='small'
                >
                  取消编辑
                </Button>
              </Stack>
            </Box>
            
            {/* 拖拽排序区域 */}
            {sortMode === SortMode.GroupSort ? (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={groups.map((group) => group.id.toString())}
                  strategy={verticalListSortingStrategy}
                >
                  <Stack
                    spacing={2}
                    sx={{
                      '& > *': {
                        transition: 'none',
                      },
                    }}
                  >
                    {/* ⚠️ 修正 4B: SortableGroupItem 调用 */}
                    {/* 假设 SortableGroupItem 组件的定义存在于 App.tsx 内部或已正确导入 */}
                    {groups.map((group) => (
                      <SortableGroupItem 
                        key={group.id} 
                        id={group.id.toString()} 
                        group={group} 
                        cardSx={CardStyle} 
                      />
                    ))}
                  </Stack>
                </SortableContext>
              </DndContext>
            ) : (
              <Stack spacing={5}>
                {groups.map((group) => (
                  <Box key={`group-${group.id}`} id={`group-${group.id}`}>
                    {/* ⚠️ 修正 4C: GroupCard 调用 (SiteSort) */}
                    <GroupCard
                      group={group}
                      // 修正：直接传递 SiteSort 字符串值
                      sortMode={SortMode.SiteSort} 
                      currentSortingGroupId={currentSortingGroupId}
                      viewMode={viewMode}
                      onUpdate={handleSiteUpdate}
                      onDelete={handleSiteDelete}
                      onSaveSiteOrder={handleSaveSiteOrder}
                      onStartSiteSort={startSiteSort}
                      onAddSite={handleOpenAddSite}
                      onUpdateGroup={handleGroupUpdate}
                      onDeleteGroup={handleGroupDelete}
                      configs={configs}
                      cardSx={CardStyle}
                    />
                  </Box>
                ))}
              </Stack>
            )}
          </Box>
        );
      }

      // 默认管理视图：显示所有卡片，允许 CRUD 操作
      return (
        <Stack spacing={5} sx={{ mt: 4 }}>
          {groups.map((group) => (
            <Box key={`group-${group.id}`} id={`group-${group.id}`}>
              {/* ⚠️ 修正 4D: GroupCard 调用 (None) */}
              <GroupCard
                group={group}
                // 修正：使用字符串枚举值
                sortMode={SortMode.None}
                currentSortingGroupId={currentSortingGroupId}
                viewMode={viewMode}
                onUpdate={handleSiteUpdate}
                onDelete={handleSiteDelete}
                onSaveSiteOrder={handleSaveSiteOrder}
                onStartSiteSort={startSiteSort}
                onAddSite={handleOpenAddSite}
                onUpdateGroup={handleGroupUpdate}
                onDeleteGroup={handleGroupDelete}
                configs={configs}
                cardSx={CardStyle}
              />
            </Box>
          ))}
        </Stack>
      );
    }
    
    return null;
  };

  // 如果正在检查认证状态，显示加载界面
  if (isAuthChecking) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box
          sx={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'background.default',
          }}
        >
          <CircularProgress size={60} thickness={4} />
        </Box>
      </ThemeProvider>
    );
  }

  // 如果需要认证但未认证，显示登录界面
  if (isAuthRequired && !isAuthenticated) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {renderLoginForm()}
      </ThemeProvider>
    );
  }


  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />

      {/* Snackbar 和 Dialogs 部分保持不变 */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity='error'
          variant='filled'
          sx={{ width: '100%' }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>

      <Snackbar
        open={importResultOpen}
        autoHideDuration={6000}
        onClose={() => setImportResultOpen(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setImportResultOpen(false)}
          severity='success'
          variant='filled'
          sx={{
            width: '100%',
            whiteSpace: 'pre-line',
            backgroundColor: (theme) => (theme.palette.mode === 'dark' ? '#2e7d32' : undefined),
            color: (theme) => (theme.palette.mode === 'dark' ? '#fff' : undefined),
            '& .MuiAlert-icon': {
              color: (theme) => (theme.palette.mode === 'dark' ? '#fff' : undefined),
            },
          }}
        >
          {importResultMessage}
        </Alert>
      </Snackbar>

      <Box
        sx={{
          minHeight: '100vh',
          bgcolor: 'background.default',
          color: 'text.primary',
          transition: 'all 0.3s ease-in-out',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* 背景图片 */}
        {configs['site.backgroundImage'] && isSecureUrl(configs['site.backgroundImage']) && (
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
                backgroundColor: (theme) =>
                  theme.palette.mode === 'dark'
                    ? 'rgba(0, 0, 0, ' + (1 - Number(configs['site.backgroundOpacity'])) + ')'
                    : 'rgba(255, 255, 255, ' +
                      (1 - Number(configs['site.backgroundOpacity'])) +
                      ')',
                zIndex: 1,
              },
            }}
          />
        )}

        <Container
          maxWidth='lg'
          sx={{
            py: 4,
            px: { xs: 2, sm: 3, md: 4 },
            position: 'relative',
            zIndex: 2,
          }}
        >
          {/* 顶部标题和控制区 */}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              flexDirection: 'column',
              mb: 2,
              gap: 1,
            }}
          >
            {/* 右上角控制按钮：主题、菜单/登录 */}
            <Stack
              direction='row'
              spacing={1}
              alignItems='center'
              sx={{
                position: 'absolute',
                top: { xs: 8, sm: 16 },
                right: { xs: 8, sm: 16 },
              }}
            >
              <ThemeToggle darkMode={darkMode} onToggle={toggleTheme} />
              
              {viewMode === 'edit' ? (
                <>
                  <IconButton 
                    color='inherit' 
                    onClick={handleMenuOpen} 
                    aria-controls={openMenu ? 'navigation-menu' : undefined}
                    aria-haspopup='true'
                    aria-expanded={openMenu ? 'true' : undefined}
                  >
                    <MenuIcon />
                  </IconButton>
                  <Menu
                    id='navigation-menu'
                    anchorEl={menuAnchorEl}
                    open={openMenu}
                    onClose={handleMenuClose}
                    MenuListProps={{ 'aria-labelledby': 'navigation-button' }}
                  >
                    <MenuItem onClick={handleOpenAddGroup}>
                      <ListItemIcon><AddIcon fontSize='small' /></ListItemIcon>
                      <ListItemText>新增分组</ListItemText>
                    </MenuItem>
                    <MenuItem onClick={startGroupSort}>
                      <ListItemIcon><SortIcon fontSize='small' /></ListItemIcon>
                      <ListItemText>编辑排序</ListItemText>
                    </MenuItem>
                    <MenuItem onClick={handleOpenConfig}>
                      <ListItemIcon><SettingsIcon fontSize='small' /></ListItemIcon>
                      <ListItemText>网站设置</ListItemText>
                    </MenuItem>
                    <Divider />
                    <MenuItem onClick={handleExportData}>
                      <ListItemIcon><FileDownloadIcon fontSize='small' /></ListItemIcon>
                      <ListItemText>导出数据</ListItemText>
                    </MenuItem>
                    <MenuItem onClick={handleOpenImport}>
                      <ListItemIcon><FileUploadIcon fontSize='small' /></ListItemIcon>
                      <ListItemText>导入数据</ListItemText>
                    </MenuItem>
                    <Divider />
                    <MenuItem onClick={handleLogout} sx={{ color: 'error.main' }}>
                      <ListItemIcon sx={{ color: 'error.main' }}><LogoutIcon fontSize='small' /></ListItemIcon>
                      <ListItemText>退出登录</ListItemText>
                    </MenuItem>
                  </Menu>
                </>
              ) : (
                <Button
                  variant='contained'
                  color='primary'
                  onClick={() => setIsAuthRequired(true)}
                  size='small'
                  sx={{ minWidth: 'auto' }}
                >
                  登录
                </Button>
              )}
            </Stack>

            {/* 网站名称 (居中) */}
            <Typography
              variant='h3'
              component='h1'
              fontWeight='bold'
              color='text.primary'
              sx={{
                fontSize: { xs: '1.75rem', sm: '2.5rem', md: '3rem' },
                textAlign: 'center',
                mt: { xs: 4, sm: 0 },
              }}
            >
              {configs['site.name']}
            </Typography>
          </Box>

          {/* 主菜单 (Tabs - 居中) */}
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 4, display: 'flex', justifyContent: 'center' }}>
            <Tabs
              value={currentView}
              onChange={handleViewChange}
              aria-label='main navigation tabs'
              centered
              sx={{
                '& .MuiTabs-indicator': { 
                  backgroundColor: 'primary.main',
                },
                '& .MuiTab-root': {
                  fontWeight: 'bold',
                  minWidth: { xs: 'auto', sm: 120 },
                },
              }}
            >
              <Tab 
                icon={<HomeIcon />} 
                label='首页' 
                value={MainView.Home} 
                iconPosition='start' 
              />
              {viewMode === 'edit' && (
                <Tab 
                  icon={<SettingsIcon />} 
                  label='管理' 
                  value={MainView.Management} 
                  iconPosition='start' 
                />
              )}
            </Tabs>
          </Box>


          {/* 搜索框 */}
          {(() => {
            const searchBoxEnabled = configs['site.searchBoxEnabled'] === 'true';
            const guestEnabled = configs['site.searchBoxGuestEnabled'] === 'true';

            if (!searchBoxEnabled || (viewMode === 'readonly' && !guestEnabled)) {
              return null;
            }

            if (currentView !== MainView.Home) {
              return null;
            }

            return (
              <Paper 
                elevation={10} 
                sx={{ 
                  ...CardStyle, 
                  bgcolor: 'background.paper', 
                  p: 2, 
                  mb: 4,
                  boxShadow: (theme: any) => 
                    theme.palette.mode === 'dark' 
                      ? '0px 0px 10px 0px rgba(255,255,255,0.1)' 
                      : '0px 0px 10px 0px rgba(0,0,0,0.1)',
                }}
              >
                <SearchBox
                  groups={groups.map((g) => ({
                    id: g.id,
                    name: g.name,
                    order_num: g.order_num,
                    is_public: g.is_public,
                    created_at: g.created_at,
                    updated_at: g.updated_at,
                  }))}
                  sites={groups.flatMap((g) => g.sites || [])}
                  onInternalResultClick={(result: SearchResultItem) => {
                    if (result.type === 'group') {
                      const groupElement = document.getElementById(`group-${result.id}`);
                      groupElement?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    } else if (result.type === 'site' && result.groupId) {
                      const groupElement = document.getElementById(`group-${result.groupId}`);
                      groupElement?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                  }}
                />
              </Paper>
            );
          })()}

          {/* 主内容区域 */}
          {loading && (
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '200px',
              }}
            >
              <CircularProgress size={60} thickness={4} />
            </Box>
          )}

          {!loading && !error && renderMainContent()}
          
          {/* 对话框部分 (保持不变) */}
          <Dialog
            open={openAddGroup}
            onClose={handleCloseAddGroup}
            maxWidth='md'
            fullWidth
            PaperProps={{
              sx: {
                m: { xs: 2, sm: 3, md: 4 },
                width: { xs: 'calc(100% - 32px)', sm: '80%', md: '70%', lg: '60%' },
                maxWidth: { sm: '600px' },
              },
            }}
          >
            <DialogTitle>
              新增分组
              <IconButton
                aria-label='close'
                onClick={handleCloseAddGroup}
                sx={{
                  position: 'absolute',
                  right: 8,
                  top: 8,
                }}
              >
                <CloseIcon />
              </IconButton>
            </DialogTitle>
            <DialogContent>
              <DialogContentText sx={{ mb: 2 }}>请输入新分组的信息</DialogContentText>
              <TextField
                autoFocus
                margin='dense'
                id='group-name'
                name='name'
                label='分组名称'
                type='text'
                fullWidth
                variant='outlined'
                value={newGroup.name}
                onChange={handleGroupInputChange}
                sx={{ mb: 2 }}
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={newGroup.is_public !== 0}
                    onChange={(e) =>
                      setNewGroup({ ...newGroup, is_public: e.target.checked ? 1 : 0 })
                    }
                    color='primary'
                  />
                }
                label={
                  <Box>
                    <Typography variant='body1'>
                      {newGroup.is_public !== 0 ? '公开分组' : '私密分组'}
                    </Typography>
                    <Typography variant='caption' color='text.secondary'>
                      {newGroup.is_public !== 0
                        ? '所有访客都可以看到此分组'
                        : '只有管理员登录后才能看到此分组'}
                    </Typography>
                  </Box>
                }
              />
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 3 }}>
              <Button onClick={handleCloseAddGroup} variant='outlined'>
                取消
              </Button>
              <Button onClick={handleCreateGroup} variant='contained' color='primary'>
                创建
              </Button>
            </DialogActions>
          </Dialog>


          <Dialog
            open={openAddSite}
            onClose={handleCloseAddSite}
            maxWidth='md'
            fullWidth
            PaperProps={{
              sx: {
                m: { xs: 2, sm: 'auto' },
                width: { xs: 'calc(100% - 32px)', sm: 'auto' },
              },
            }}
          >
            <DialogTitle>
              新增站点
              <IconButton
                aria-label='close'
                onClick={handleCloseAddSite}
                sx={{
                  position: 'absolute',
                  right: 8,
                  top: 8,
                }}
              >
                <CloseIcon />
              </IconButton>
            </DialogTitle>
            <DialogContent>
              <DialogContentText sx={{ mb: 2 }}>请输入新站点的信息</DialogContentText>
              <Stack spacing={2}>
                <Box
                  sx={{
                    display: 'flex',
                    gap: 2,
                    flexDirection: { xs: 'column', sm: 'row' },
                  }}
                >
                  <Box sx={{ flex: 1 }}>
                    <TextField
                      autoFocus
                      margin='dense'
                      id='site-name'
                      name='name'
                      label='站点名称'
                      type='text'
                      fullWidth
                      variant='outlined'
                      value={newSite.name}
                      onChange={handleSiteInputChange}
                    />
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <TextField
                      margin='dense'
                      id='site-url'
                      name='url'
                      label='站点URL'
                      type='url'
                      fullWidth
                      variant='outlined'
                      value={newSite.url}
                      onChange={handleSiteInputChange}
                    />
                  </Box>
                </Box>
                <TextField
                  margin='dense'
                  id='site-icon'
                  name='icon'
                  label='图标URL'
                  type='url'
                  fullWidth
                  variant='outlined'
                  value={newSite.icon}
                  onChange={handleSiteInputChange}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position='end'>
                        <IconButton
                          onClick={() => {
                            if (!newSite.url) {
                              handleError('请先输入站点URL');
                              return;
                            }
                            const domain = extractDomain(newSite.url);
                            if (domain) {
                              const actualIconApi =
                                configs['site.iconApi'] ||
                                'https://www.faviconextractor.com/favicon/{domain}?larger=true';
                              const iconUrl = actualIconApi.replace('{domain}', domain);
                              setNewSite({
                                ...newSite,
                                icon: iconUrl,
                              });
                            } else {
                              handleError('无法从URL中获取域名');
                            }
                          }}
                          edge='end'
                          title='自动获取图标'
                        >
                          <AutoFixHighIcon />
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
                <TextField
                  margin='dense'
                  id='site-description'
                  name='description'
                  label='站点描述'
                  type='text'
                  fullWidth
                  variant='outlined'
                  value={newSite.description}
                  onChange={handleSiteInputChange}
                />
                <TextField
                  margin='dense'
                  id='site-notes'
                  name='notes'
                  label='备注'
                  type='text'
                  fullWidth
                  multiline
                  rows={2}
                  variant='outlined'
                  value={newSite.notes}
                  onChange={handleSiteInputChange}
                />

                <FormControlLabel
                  control={
                    <Switch
                      checked={newSite.is_public !== 0}
                      onChange={(e) =>
                        setNewSite({ ...newSite, is_public: e.target.checked ? 1 : 0 })
                      }
                      color='primary'
                    />
                  }
                  label={
                    <Box>
                      <Typography variant='body1'>
                        {newSite.is_public !== 0 ? '公开站点' : '私密站点'}
                      </Typography>
                      <Typography variant='caption' color='text.secondary'>
                        {newSite.is_public !== 0
                          ? '所有访客都可以看到此站点'
                          : '只有管理员登录后才能看到此站点'}
                      </Typography>
                    </Box>
                  }
                />
              </Stack>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 3 }}>
              <Button onClick={handleCloseAddSite} variant='outlined'>
                取消
              </Button>
              <Button onClick={handleCreateSite} variant='contained' color='primary'>
                创建
              </Button>
            </DialogActions>
          </Dialog>

          <Dialog
            open={openConfig}
            onClose={handleCloseConfig}
            maxWidth='sm'
            fullWidth
            PaperProps={{
              sx: {
                m: { xs: 2, sm: 3, md: 4 },
                width: { xs: 'calc(100% - 32px)', sm: '80%', md: '70%', lg: '60%' },
                maxWidth: { sm: '600px' },
              },
            }}
          >
            <DialogTitle>
              网站设置
              <IconButton
                aria-label='close'
                onClick={handleCloseConfig}
                sx={{
                  position: 'absolute',
                  right: 8,
                  top: 8,
                }}
              >
                <CloseIcon />
              </IconButton>
            </DialogTitle>
            <DialogContent>
              <DialogContentText sx={{ mb: 2 }}>配置网站的基本信息和外观</DialogContentText>
              <Stack spacing={2}>
                <TextField
                  margin='dense'
                  id='site-title'
                  name='site.title'
                  label='网站标题 (浏览器标签)'
                  type='text'
                  fullWidth
                  variant='outlined'
                  value={tempConfigs['site.title']}
                  onChange={handleConfigInputChange}
                />
                <TextField
                  margin='dense'
                  id='site-name'
                  name='site.name'
                  label='网站名称 (显示在页面中)'
                  type='text'
                  fullWidth
                  variant='outlined'
                  value={tempConfigs['site.name']}
                  onChange={handleConfigInputChange}
                />
                <Box sx={{ mb: 1 }}>
                  <Typography variant='subtitle1' gutterBottom>
                    获取图标API设置
                  </Typography>
                  <TextField
                    margin='dense'
                    id='site-icon-api'
                    name='site.iconApi'
                    label='获取图标API URL'
                    type='text'
                    fullWidth
                    variant='outlined'
                    value={tempConfigs['site.iconApi']}
                    onChange={handleConfigInputChange}
                    placeholder='https://example.com/favicon/{domain}'
                    helperText='输入获取图标API的地址，使用 {domain} 作为域名占位符'
                  />
                </Box>
                <Box sx={{ mb: 1 }}>
                  <Typography variant='subtitle1' gutterBottom>
                    背景图片设置
                  </Typography>
                  <TextField
                    margin='dense'
                    id='site-background-image'
                    name='site.backgroundImage'
                    label='背景图片URL'
                    type='url'
                    fullWidth
                    variant='outlined'
                    value={tempConfigs['site.backgroundImage']}
                    onChange={handleConfigInputChange}
                    placeholder='https://example.com/background.jpg'
                    helperText='输入图片URL，留空则不使用背景图片'
                  />

                  <Box sx={{ mt: 2, mb: 1 }}>
                    <Typography
                      variant='body2'
                      color='text.secondary'
                      id='background-opacity-slider'
                      gutterBottom
                    >
                      背景蒙版透明度: {Number(tempConfigs['site.backgroundOpacity']).toFixed(2)}
                    </Typography>
                    <Slider
                      aria-labelledby='background-opacity-slider'
                      name='site.backgroundOpacity'
                      min={0}
                      max={1}
                      step={0.01}
                      valueLabelDisplay='auto'
                      value={Number(tempConfigs['site.backgroundOpacity'])}
                      onChange={(_, value) => {
                        setTempConfigs({
                          ...tempConfigs,
                          'site.backgroundOpacity': String(value),
                        });
                      }}
                    />
                    <Typography variant='caption' color='text.secondary'>
                      值越大，背景图片越清晰，内容可能越难看清
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ mb: 1 }}>
                  <Typography variant='subtitle1' gutterBottom>
                    搜索框功能设置
                  </Typography>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={tempConfigs['site.searchBoxEnabled'] === 'true'}
                        onChange={(e) =>
                          setTempConfigs({
                            ...tempConfigs,
                            'site.searchBoxEnabled': e.target.checked ? 'true' : 'false',
                          })
                        }
                        color='primary'
                      />
                    }
                    label={
                      <Box>
                        <Typography variant='body1'>启用搜索框</Typography>
                        <Typography variant='caption' color='text.secondary'>
                          控制是否在页面中显示搜索框功能
                        </Typography>
                      </Box>
                    }
                  />
                  {tempConfigs['site.searchBoxEnabled'] === 'true' && (
                    <FormControlLabel
                      control={
                        <Switch
                          checked={tempConfigs['site.searchBoxGuestEnabled'] === 'true'}
                          onChange={(e) =>
                            setTempConfigs({
                              ...tempConfigs,
                              'site.searchBoxGuestEnabled': e.target.checked ? 'true' : 'false',
                            })
                          }
                          color='primary'
                        />
                      }
                      label={
                        <Box>
                          <Typography variant='body1'>访客可用搜索框</Typography>
                          <Typography variant='caption' color='text.secondary'>
                            允许未登录的访客使用搜索功能
                          </Typography>
                        </Box>
                      }
                      sx={{ ml: 4, mt: 1 }}
                    />
                  )}
                </Box>
                <TextField
                  margin='dense'
                  id='site-custom-css'
                  name='site.customCss'
                  label='自定义CSS'
                  type='text'
                  fullWidth
                  multiline
                  rows={6}
                  variant='outlined'
                  value={tempConfigs['site.customCss']}
                  onChange={handleConfigInputChange}
                  placeholder='/* 自定义样式 */\nbody { }'
                />
              </Stack>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 3 }}>
              <Button onClick={handleCloseConfig} variant='outlined'>
                取消
              </Button>
              <Button onClick={handleSaveConfig} variant='contained' color='primary'>
                保存设置
              </Button>
            </DialogActions>
          </Dialog>

          <Dialog
            open={openImport}
            onClose={handleCloseImport}
            maxWidth='sm'
            fullWidth
            PaperProps={{
              sx: {
                m: { xs: 2, sm: 'auto' },
                width: { xs: 'calc(100% - 32px)', sm: 'auto' },
              },
            }}
          >
            <DialogTitle>
              导入数据
              <IconButton
                aria-label='close'
                onClick={handleCloseImport}
                sx={{
                  position: 'absolute',
                  right: 8,
                  top: 8,
                }}
              >
                <CloseIcon />
              </IconButton>
            </DialogTitle>
            <DialogContent>
              <DialogContentText sx={{ mb: 2 }}>
                请选择要导入的JSON文件，导入将覆盖现有数据。
              </DialogContentText>
              <Box sx={{ mb: 2 }}>
                <Button
                  variant='outlined'
                  component='label'
                  startIcon={<FileUploadIcon />}
                  sx={{ mb: 2 }}
                >
                  选择文件
                  <input type='file' hidden accept='.json' onChange={handleFileSelect} />
                </Button>
                {importFile && (
                  <Typography variant='body2' sx={{ mt: 1 }}>
                    已选择: {importFile.name}
                  </Typography>
                )}
              </Box>
              {importError && (
                <Alert severity='error' sx={{ mb: 2 }}>
                  {importError}
                </Alert>
              )}
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 3 }}>
              <Button onClick={handleCloseImport} variant='outlined'>
                取消
              </Button>
              <Button
                onClick={handleImportData}
                variant='contained'
                color='primary'
                disabled={!importFile || importLoading}
                startIcon={importLoading ? <CircularProgress size={20} /> : <FileUploadIcon />}
              >
                {importLoading ? '导入中...' : '导入'}
              </Button>
            </DialogActions>
          </Dialog>

          {/* GitHub角标 (保持不变) */}
          <Box
            sx={{
              position: 'fixed',
              bottom: { xs: 8, sm: 16 },
              right: { xs: 8, sm: 16 },
              zIndex: 10,
            }}
          >
            <Paper
              component='a'
              href='https://github.com/zqq-nuli/Navihive'
              target='_blank'
              rel='noopener noreferrer'
              elevation={2}
              sx={{
                display: 'flex',
                alignItems: 'center',
                p: 1,
                borderRadius: 10,
                bgcolor: 'background.paper',
                color: 'text.secondary',
                transition: 'all 0.3s ease-in-out',
                '&:hover': {
                  bgcolor: 'action.hover',
                  color: 'text.primary',
                  boxShadow: 4,
                },
                textDecoration: 'none',
              }}
            >
              <GitHubIcon />
            </Paper>
          </Box>
        </Container>
      </Box>
    </ThemeProvider>
  );
}

// ⚠️ 重要提醒: 
// 如果 GroupCard 和 SortableGroupItem 的定义在 App.tsx 中，
// 请将它们的函数组件定义放在 App 函数之后、export default App 之前，
// 并确保它们使用了上面定义的 GroupCardProps 和 SortableGroupItemProps 接口。
/*
const GroupCard = ({ ...props }: GroupCardProps) => { ... };
const SortableGroupItem = ({ ...props }: SortableGroupItemProps) => { ... };
*/


export default App;
