import { useState, useEffect, useMemo, useRef } from 'react';
import { NavigationClient } from './API/client';
import { MockNavigationClient } from './API/mock';
import { GroupWithSites } from './types';
// import ThemeToggle from './components/ThemeToggle'; // 不再需要
import LoginForm from './components/LoginForm';
import SearchBox from './components/SearchBox';
import WeatherWidget from './components/WeatherWidget';
import EditGroupDialog from './components/EditGroupDialog';
import { sanitizeCSS, isSecureUrl, extractDomain } from './utils/url';
import './App.css';

// 💡 dnd-kit 新增：引入核心组件和工具函数
import {
  DndContext,
  closestCenter,
  KeyboardSensor,  
  useSensor,
  useSensors,
  DragEndEvent,
  MouseSensor,
  TouchSensor,
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

// ✨✨✨ 修改部分：引入 Lucide 图标 ✨✨✨
import { UserCog, LogOut, Sun, Moon } from 'lucide-react'; 

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
  Tooltip,
  Select,
  FormControl,
  InputLabel,
  SelectChangeEvent,
  Backdrop, 
  LinearProgress,
  Theme,
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
// 引入或直接使用我们之前在 http.ts 中导出的新树状接口
import { Site, Group, GroupTreeNode } from './API/http'; 
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';

const isDevEnvironment = import.meta.env.DEV;
const useRealApi = import.meta.env.VITE_USE_REAL_API === 'true';
// ✨ 控制导入导出进度条的状态
  
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
   'site.desktopColumns': '6', // 👈 新增这一行，默认 6 列
};

function SortableTab(props: any) {
  const { disabled, onLongPress, ...tabProps } = props;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: props.value, disabled });

  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 100 : 'auto',
    opacity: isDragging ? 0.5 : 1,
    touchAction: disabled ? 'auto' : 'none',
  };

  const handlePointerDown = () => {
    if (!onLongPress) return;
    longPressTimer.current = setTimeout(() => {
      onLongPress();
    }, 300);
  };
  const handlePointerUp = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  return (
  <div
    ref={setNodeRef}
    style={style}
    {...attributes}
    {...(disabled ? {} : listeners)}
    onPointerDown={handlePointerDown}
    onPointerUp={handlePointerUp}
    onPointerLeave={handlePointerUp}
  >
    <Tab
      {...tabProps}
      // ← 删掉 icon 和 iconPosition 两行
    />
  </div>
);
}

const SortableSiteCard = ({ id, children, disabled, onLongPress }: { 
  id: number, 
  children: React.ReactNode, 
  disabled?: boolean,
  onLongPress?: () => void
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id, disabled });
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const style = {
  transform: CSS.Transform.toString(transform),
  transition,
  zIndex: isDragging ? 100 : 'auto',
  opacity: isDragging ? 0.5 : 1,
  touchAction: disabled ? 'auto' : 'none',  // ← 排序模式下完全禁用，非排序模式(disabled=true)恢复auto
};

  const handlePointerDown = () => {
  if (!onLongPress) return;  // ← 只判断 onLongPress，不判断 disabled
  longPressTimer.current = setTimeout(() => {
    onLongPress();
  }, 300);
};

  const handlePointerUp = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  return (
    <div
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      // ↓ 关键：阻止冒泡，防止触发外层网格的滑动切换逻辑
      onPointerMove={(e) => { e.stopPropagation(); }}
      style={{ 
        height: '100%',
        userSelect: 'none',
        WebkitUserSelect: 'none' as any,
      }}
    >
      <Box
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        sx={{ 
          height: '100%', 
          position: 'relative',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          WebkitTouchCallout: 'none',
        }}
      >
        {children}
      </Box>
    </div>
  );
};

function App() {
  const [syncProgress, setSyncProgress] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncStatusText, setSyncStatusText] = useState<string>('');
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
// 新拟态弹窗样式，根据明暗模式自动切换
const neumorphicDialog = {
  borderRadius: '20px',
  border: 'none',
  ...(darkMode ? {
    background: '#1e1e1e',
    boxShadow: '8px 8px 20px #0a0a0a, -8px -8px 20px #323232',
  } : {
    background: '#f0f0f0',
    boxShadow: '8px 8px 20px #c8c8c8, -8px -8px 20px #ffffff',
  }),
};
// 玻璃态弹窗样式（所有弹窗统一用这个）
const glassDialog = {
  borderRadius: '24px',
  background: darkMode
    ? 'rgba(20, 25, 45, 0.35)'     // 带蓝紫色调，不是纯灰
    : 'rgba(238, 242, 247, 0.35)',
  backdropFilter: 'blur(24px)',
  WebkitBackdropFilter: 'blur(24px)',
  border: darkMode
    ? '1px solid rgba(100,120,255,0.15)'  // 带色边框
    : '1px solid rgba(255,255,255,0.5)',
  boxShadow: darkMode
    ? '0 8px 32px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.08)'
    : '0 20px 60px rgba(165,180,200,0.25)',
  p: 1,
};

const glassBackdrop = {
  backdropFilter: 'blur(8px)',
  WebkitBackdropFilter: 'blur(8px)',
  background: darkMode ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.2)',
};

const neumorphicButton = {
  borderRadius: '12px',
  boxShadow: darkMode
    ? '4px 4px 10px #0a0a0a, -4px -4px 10px #323232'
    : '4px 4px 10px #c8c8c8, -4px -4px 10px #ffffff',
  border: 'none',
  '&:hover': {
    boxShadow: darkMode
      ? '2px 2px 6px #0a0a0a, -2px -2px 6px #323232'
      : '2px 2px 6px #c8c8c8, -2px -2px 6px #ffffff',
  },
  '&:active': {
    boxShadow: darkMode
      ? 'inset 3px 3px 8px #0a0a0a, inset -3px -3px 8px #323232'
      : 'inset 3px 3px 8px #c8c8c8, inset -3px -3px 8px #ffffff',
  },
};

const [groups, setGroups] = useState<GroupTreeNode[]>([]);

  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<number | null>(null);
  const [selectedSubTab, setSelectedSubTab] = useState<number | null>(null);
  const currentGroup = groups.find(g => g.id === selectedTab);
  const cardAreaSwipeRef = useRef({
    startX: 0,
    startY: 0,
    pointerId: null as number | null,
    didSwipe: false,
  });
  const tabLongPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suppressCardClickRef = useRef(false);
  const [sortMode, setSortMode] = useState<SortMode>(SortMode.None);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [isAuthRequired, setIsAuthRequired] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);
  const pendingSortRef = useRef(false); // 在 App 组件顶部加这个
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
  const [editGroupOpen, setEditGroupOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);

  // 💡 dnd-kit 新增：设置拖拽传感器
 const sensors = useSensors(
  useSensor(MouseSensor, {
    activationConstraint: { distance: 8 },
  }),
 useSensor(TouchSensor, {
  activationConstraint: { 
    delay: 200,
    tolerance: 8,
  },
}),

  useSensor(KeyboardSensor, {
    coordinateGetter: sortableKeyboardCoordinates,
  })
);
 // 新增菜单专用 sensors，长按 500ms 激活
const groupSensors = useSensors(
  useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
  useSensor(TouchSensor, { activationConstraint: { delay: 500, tolerance: 5 } }),
  useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
); 
  // 核心修复：将 useMemo 移动到这里，必须在任何 return 之前！
  const groupIds = useMemo(() => groups.map(g => g.id!), [groups]);
  const siteIds = useMemo(() => currentGroup?.sites.map(s => s.id!) || [], [currentGroup]);

  const handleMenuOpen = (event: React.MouseEvent<HTMLButtonElement>) => {
    setMenuAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setMenuAnchorEl(null);
  };
  
  const handleDragEnd = (event: DragEndEvent) => {
  const { active, over } = event;

  if (!over || active.id === over.id) {
    setSortMode(SortMode.None);
    return;
  }

  if (sortMode === SortMode.GroupSort) {
    setGroups((items) => {
      const oldIndex = items.findIndex(i => i.id === active.id);
      const newIndex = items.findIndex(i => i.id === over.id);
      const newItems = arrayMove(items, oldIndex, newIndex);
      // ✅ 在 setter 里直接拿到新顺序，立即保存
      const orders = newItems.map((g, i) => ({ id: g.id!, order_num: i }));
      api.updateGroupOrder(orders).catch(e => console.error('保存排序失败:', e));
      return newItems;
    });
    setSortMode(SortMode.None);

  } else if (sortMode === SortMode.SiteSort) {
    setGroups(prevGroups => {
      const targetGroupIndex = prevGroups.findIndex(g => g.id === currentGroup?.id);
      if (targetGroupIndex === -1) return prevGroups;
      const targetGroup = prevGroups[targetGroupIndex];
      const newGroups = [...prevGroups];

      const isSubMenu = targetGroup.sub_menus?.length && selectedSubTab !== targetGroup.id;
      const subIndex = isSubMenu
        ? targetGroup.sub_menus!.findIndex(sub => sub.id === selectedSubTab)
        : -1;
      const targetSites = isSubMenu
        ? targetGroup.sub_menus![subIndex].sites
        : targetGroup.sites;

      const oldIndex = targetSites.findIndex(s => s.id === active.id);
      const newIndex = targetSites.findIndex(s => s.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return prevGroups;

      const newSites = arrayMove(targetSites, oldIndex, newIndex);
      // ✅ 立即保存新顺序
      const siteOrders = newSites.map((site, i) => ({ id: site.id as number, order_num: i }));
      api.updateSiteOrder(siteOrders).catch(e => console.error('保存排序失败:', e));

      if (isSubMenu) {
        newGroups[targetGroupIndex] = {
          ...newGroups[targetGroupIndex],
          sub_menus: newGroups[targetGroupIndex].sub_menus!.map((sub, idx) =>
            idx === subIndex ? { ...sub, sites: newSites } : sub
          ),
        };
      } else {
        newGroups[targetGroupIndex] = { ...newGroups[targetGroupIndex], sites: newSites };
      }
      return newGroups;
    });
    setSortMode(SortMode.None);
  }
};

  const switchAdjacentGroup = (direction: 'previous' | 'next') => {
  if (sortMode !== SortMode.None || groups.length <= 1 || selectedTab === null) {
    return;
  }

  const currentIndex = groups.findIndex((group) => group.id === selectedTab);
  if (currentIndex === -1) return;

  const nextIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
  const nextGroup = groups[nextIndex];
  if (nextGroup?.id) {
    setSelectedTab(nextGroup.id);
    setSelectedSubTab(nextGroup.id);  // ← 改这里，不管有没有子菜单，都用主菜单id
  }
};
 
  const handleCardAreaPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
  if (sortMode !== SortMode.None || groups.length <= 1 || !event.isPrimary) return;
  cardAreaSwipeRef.current = {
    startX: event.clientX,
    startY: event.clientY,
    pointerId: event.pointerId,
    didSwipe: false,
  };
  // event.currentTarget.setPointerCapture(event.pointerId);
};

// ← 新增 pointerMove 处理
const handleCardAreaPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
  if (sortMode !== SortMode.None) return; // ← 加这行
  const swipe = cardAreaSwipeRef.current;
  if (swipe.pointerId !== event.pointerId || swipe.didSwipe) return;

  const deltaX = event.clientX - swipe.startX;
  const deltaY = event.clientY - swipe.startY;

  // 水平位移超过 30px 且水平分量大于垂直分量就触发
  const isHorizontalSwipe = Math.abs(deltaX) >= 45 && Math.abs(deltaX) > Math.abs(deltaY) * 1.5;

  if (isHorizontalSwipe) {
    swipe.didSwipe = true;
    suppressCardClickRef.current = true;
    switchAdjacentGroup(deltaX < 0 ? 'next' : 'previous');
    window.setTimeout(() => { suppressCardClickRef.current = false; }, 0);
  }
};

const handleCardAreaPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
  if (sortMode !== SortMode.None) return; // ← 加这行
  const swipe = cardAreaSwipeRef.current;
  if (event.currentTarget.hasPointerCapture(event.pointerId)) {
    event.currentTarget.releasePointerCapture(event.pointerId);
  }
  // pointerMove 没触发时的兜底（极短距离快速划）
  if (swipe.pointerId === event.pointerId && !swipe.didSwipe) {
    const deltaX = event.clientX - swipe.startX;
    const deltaY = event.clientY - swipe.startY;
    if (Math.abs(deltaX) >= 50 && Math.abs(deltaX) > Math.abs(deltaY) * 1.5) {
      suppressCardClickRef.current = true;
      switchAdjacentGroup(deltaX < 0 ? 'next' : 'previous');
      window.setTimeout(() => { suppressCardClickRef.current = false; }, 0);
    }
  }
};

  const handleCardAreaPointerCancel = (event: React.PointerEvent<HTMLDivElement>) => {
  // ❌ 删掉 releasePointerCapture 相关逻辑
  cardAreaSwipeRef.current.pointerId = null;
};

  const handleCardAreaClick = (event: React.MouseEvent<HTMLDivElement>) => {
  if (suppressCardClickRef.current) {
    event.preventDefault();
    // 删掉 stopPropagation —— 不要在 capture 阶段拦截，避免误伤子元素的 click
    suppressCardClickRef.current = false;
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
      const loginResponse = await api.login(username, password, false); 
      
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
      const groupsWithSites = (await api.getGroupsWithSites()) as GroupTreeNode[];
      
      const sortedGroups = groupsWithSites.map((g: GroupTreeNode) => ({
        ...g,
        sites: (g.sites || []).sort((a, b) => a.order_num - b.order_num),
        sub_menus: (g.sub_menus || []).map((sub: GroupTreeNode) => ({
          ...sub,
          sites: (sub.sites || []).sort((a, b) => a.order_num - b.order_num)
        })).sort((a, b) => a.order_num - b.order_num)
      })).sort((a, b) => a.order_num - b.order_num);

                setGroups(sortedGroups);

      if (sortedGroups.length > 0) {
        setSelectedTab(prev => {
          if (prev === null) return sortedGroups[0].id!;
          if (!sortedGroups.some(g => g.id === prev)) return sortedGroups[0].id!;
          return prev;
        });
        setSelectedSubTab(prev => {
          if (prev === null) return sortedGroups[0].id!;
          const allIds = new Set<number>();
          sortedGroups.forEach(g => {
            allIds.add(g.id!);
            g.sub_menus?.forEach(sub => allIds.add(sub.id!));
          });
          if (!allIds.has(prev)) return sortedGroups[0].id!;
          return prev;
        });
      } else {
        setSelectedTab(null);
        setSelectedSubTab(null);
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
  // 先找顶级，再找子菜单
  const group = groups.find(g => g.id === groupId)
    ?? groups.flatMap(g => g.sub_menus ?? []).find(s => s.id === groupId);
  const maxOrderNum = group?.sites?.length
    ? Math.max(...group.sites.map(s => s.order_num)) + 1
    : 0;
  setNewSite({
    name: '', url: '', icon: '', description: '', notes: '',
    group_id: groupId,
    order_num: maxOrderNum,
    is_public: 1,
  });
    setOpenAddSite(true);

  };

  const handleCloseAddSite = () => {
    setOpenAddSite(false);
  };

 const handleSiteInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
  const { name, value } = e.target;
  
  setNewSite(prev => {
    let updated = { ...prev, [name]: value };
    
    // ✨ 智能保底优化：只有当用户【第一次】输入 URL，且图标框目前还是空的（或者处于初始状态）时，才触发自动抓取
    if (name === 'url' && value.trim()) {
      // 如果用户之前已经手动改过图标，或者点过 [Horse] 等按钮，我们绝不盲目覆盖它
      const isIconEmpty = !prev.icon || prev.icon.trim() === '';
      
      if (isIconEmpty) {
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
    // ✅ 新增校验
    if (!newSite.group_id) {
      handleError('请选择所属分组');
      return;
    }
    // ✅ 计算当前分组最大 order_num，新卡片放最后
    const targetGroup = groups.find(g => g.id === newSite.group_id)
      || groups.flatMap(g => g.sub_menus || []).find(sub => sub.id === newSite.group_id);
    
    const existingSites = targetGroup?.sites || [];
    const maxOrder = existingSites.length > 0
      ? Math.max(...existingSites.map(s => s.order_num))
      : -1;
    await api.createSite({ ...newSite, order_num: maxOrder + 1 } as Site);
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
const [openExportResult, setOpenExportResult] = useState(false);
const [exportResult, setExportResult] = useState<{
  success: boolean;
  fileName?: string;
  groupCount?: number;
  siteCount?: number;
  fileSize?: string;
  error?: string;
} | null>(null);

  const handleExportData = async () => {
  try {
    setIsSyncing(true);
    setSyncStatusText('正在整理数据...');

    const allSites: Site[] = [];
    groups.forEach((group) => {
      if (group.sites?.length) allSites.push(...group.sites);
      group.sub_menus?.forEach(sub => {
        if (sub.sites?.length) allSites.push(...sub.sites);
      });
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

    setIsSyncing(false);

    // 显示成功 Dialog
    setExportResult({
      success: true,
      fileName: exportFileName,
      groupCount: groups.length,
      siteCount: allSites.length,
      fileSize: (new Blob([dataStr]).size / 1024).toFixed(1),
    });
    setOpenExportResult(true);

  } catch (error) {
    setIsSyncing(false);
    setExportResult({ success: false, error: (error as Error).message });
    setOpenExportResult(true);
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

 const handleImportData = async (file?: File) => {
  const targetFile = file ?? importFile;  // 优先用传入的，没有就用 state 里的
  if (!targetFile) {
    handleError('请选择要导入的文件');
    return;
  }
  try {
    setImportLoading(true);
    setImportError(null);
    setIsSyncing(true);
    setSyncProgress(15);
    setSyncStatusText('正在读取备份文件...');

    const fileReader = new FileReader();
    fileReader.readAsText(targetFile, 'UTF-8');

    fileReader.onload = async (e) => {
      try {
        if (!e.target?.result) throw new Error('读取文件失败');

        setSyncProgress(40);
        setSyncStatusText('正在解析数据...');

        const importData = JSON.parse(e.target.result as string);

        setSyncProgress(60);
        setSyncStatusText('正在写入数据库...');

        const result = await api.importData(importData);
        if (!result.success) throw new Error(result.error || '导入失败');

        setSyncProgress(85);
        setSyncStatusText('正在刷新页面数据...');

        await fetchData();
        await fetchConfigs();

        setSyncProgress(100);
        setSyncStatusText('导入成功！');

        handleCloseImport();
        handleError('导入成功！');

        setTimeout(() => {
          setIsSyncing(false);
          setSyncProgress(0);
          setSyncStatusText('');
        }, 1000);

      } catch (error) {
        console.error('解析导入数据失败:', error);
        handleError('解析导入数据失败: ' + (error instanceof Error ? error.message : '未知错误'));
        setIsSyncing(false);
        setSyncProgress(0);
      } finally {
        setImportLoading(false);
      }
    };

    fileReader.onerror = () => {
      handleError('读取文件失败');
      setImportLoading(false);
      setIsSyncing(false);
      setSyncProgress(0);
    };

  } catch (error) {
    console.error('导入数据失败:', error);
    handleError('导入数据失败: ' + (error as Error).message);
    setIsSyncing(false);
    setSyncProgress(0);
  }
};

    // ✨ 提取公用的站点卡片渲染函数
  const renderSiteCard = (site: Site) => {
    const CardContent = (
      <Paper
        // 关键改动：如果是管理员且非排序，用 div 触发弹窗；如果是普通访客，在电脑端也一律作为 a 标签
        component={isAuthenticated && sortMode === SortMode.None ? 'div' : 'a'}
        href={sortMode === SortMode.None ? site.url : undefined}
        target={sortMode === SortMode.None ? '_blank' : undefined}
        rel={sortMode === SortMode.None ? 'noopener' : undefined}
        onClick={(e: React.MouseEvent) => {
            // 1. 如果正在进行站点排序，禁止任何跳转和弹窗
            if (sortMode !== SortMode.None) { 
                e.preventDefault(); 
                return; 
            }
            
            // 2. 如果是管理员登录状态，点击触发编辑弹窗
            if (isAuthenticated) { 
                e.preventDefault(); // ✨ 阻止 a 标签的默认跳转，改为弹窗编辑
                setEditingSite(site); 
                setEditSiteOpen(true); 
            }
            // 3. ✨ 普通访客状态下，不拦截事件，让 href 默认在电脑端新窗口打开
        }}
        sx={{
            p: 2.5, borderRadius: 4,
            bgcolor: darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
            backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.12)',
            boxShadow: (t) => t.shadows[16] + ', 0 8px 32px rgba(0,0,0,0.3)',
            transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
            transform: 'translateY(0)', display: 'flex', flexDirection: 'column',
            alignItems: 'center', textAlign: 'center', position: 'relative',
            cursor: sortMode !== SortMode.None ? 'grab' : (isAuthenticated ? 'pointer' : 'default'),
            textDecoration: 'none', color: 'inherit', height: '100%', 
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
       {/* ✨ 修改：将卡片的编辑和删除图标分别绝对定位到左上角和右上角 */}
        {isAuthenticated && sortMode === SortMode.None && (
          <>
            {/* 左上角：编辑站点 */}
            <Box sx={{ position: 'absolute', top: 8, left: 8, zIndex: 10 }}>
              <IconButton 
                size="small" 
                onClick={(e) => { 
                  e.stopPropagation(); 
                  e.nativeEvent.stopImmediatePropagation(); // ← 新增这行
                  setEditingSite(site); 
                  setEditSiteOpen(true); 
                }} 
                sx={{ 
                  bgcolor: darkMode ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.8)',
                  color: '#00ff9d', 
                  border: '1px solid rgba(0,255,157,0.3)',
                  '&:hover': { bgcolor: '#00ff9d', color: 'black' }, 
                }}
              >
                  <EditIcon fontSize="small" />
              </IconButton>
            </Box>

            {/* 右上角：删除站点 */}
            <Box sx={{ position: 'absolute', top: 8, right: 8, zIndex: 10 }}>
              <IconButton 
                size="small" 
                onClick={(e) => { 
                  e.stopPropagation(); 
                  e.nativeEvent.stopImmediatePropagation(); // ← 新增这行

                  handleSiteDelete(site.id!); 
                }} 
                sx={{ 
                  bgcolor: darkMode ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.8)',
                  color: '#ff4444', 
                  border: '1px solid rgba(255,0,0,0.3)',
                  '&:hover': { bgcolor: '#ff4444', color: 'white' }, 
                }}
              >
                  <DeleteIcon fontSize="small" />
              </IconButton>
            </Box>
          </>
        )}

        <Box sx={{ width: 100, height: 100, mb: 1.5, borderRadius: 3, overflow: 'hidden', bgcolor: 'rgba(255,255,255,0.1)', p: 1.5 }}>
            <img
              src={site.icon || `https://www.google.com/s2/favicons?domain=${extractDomain(site.url)}&sz=256`}
              alt={site.name} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'contain', pointerEvents: 'none' }}
              onError={(e) => {
                  const isTextIcon = site.icon && site.icon.length > 0 && !site.icon.startsWith('http');
                  const displayChar = isTextIcon ? site.icon.trim().charAt(0).toUpperCase() : (site.name?.trim().charAt(0).toUpperCase() || '?');
                  const bgColor = darkMode ? '#1e1e1e' : '#f5f5f5';
                  const textColor = darkMode ? '#ffffff' : '#000000';
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
     return CardContent; 
    
  };

  // ✨ 提取公用的“添加站点”占位卡片
  const renderAddSiteCard = (targetGroupId: number) => {
    return (
      <Paper
          sx={{
              p: 2.5, borderRadius: 4, bgcolor: darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.12)',
              boxShadow: (t) => t.shadows[16] + ', 0 8px 32px rgba(0,0,0,0.3)', transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
              '&:hover': { transform: 'translateY(-10px) scale(1.05)', boxShadow: (t) => t.shadows[24] + `, 0 0 40px ${t.palette.primary.main}50`, bgcolor: darkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)', },
              minHeight: '180px', height: '100%'
          }}
          onClick={() => handleOpenAddSite(targetGroupId)}
      >
          <AddIcon sx={{ fontSize: 64, color: 'primary.main' }} />
          <Typography variant="subtitle2" fontWeight="bold" sx={{ mt: 1 }}>添加站点</Typography>
      </Paper>
    );
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

      <Box sx={{ 
  minHeight: '100vh', 
  bgcolor: 'background.default', 
  color: 'text.primary', 
  position: 'relative', 
  overflow: 'hidden',
  // 暗色模式加渐变背景，让玻璃效果可见
  background: darkMode 
    ? 'linear-gradient(135deg, #0d1117 0%, #1a1f2e 30%, #0f1923 60%, #1a1025 100%)'
    : undefined,
}}>
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
        <AppBar position="fixed" color="transparent" elevation={0} sx={{
          background: (t) => t.palette.mode === 'dark' ? 'rgba(18, 18, 18, 0.7)' : 'rgba(255, 255, 255, 0.7)',
          zIndex: 1200, pt: 0.5,
        }}>
   
          <Container maxWidth="xl" sx={{ py: 0.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                {/* Logo 区域 */}
                <Box sx={{ position: 'relative', height: '48px', width: 'auto', display: 'flex', alignItems: 'center' }}>
                    <img 
                      src="/logo-transp.svg" 
                      alt="WebNav Hub Logo Dark" 
                      loading="eager" 
                      style={{ height: '48px', width: 'auto', display: darkMode ? 'block' : 'none', transition: 'opacity 0.2s' }} 
                    />
                    <img 
                      src="/logo-transp.svg" 
                      alt="WebNav Hub Logo Light" 
                      loading="eager"
                      style={{ height: '48px', width: 'auto', display: darkMode ? 'none' : 'block', transition: 'opacity 0.2s' }} 
                    />
                    <Box sx={{ display: 'flex', flexDirection: 'column', lineHeight: 1, ml: 1.5 }}>
                        <Typography variant="h5" component="div" sx={{ fontWeight: 700, fontSize: { xs: '1.25rem', md: '1.5rem' }, lineHeight: 1.1, letterSpacing: '-0.5px', fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif' }}>
                            <span style={{ color: darkMode ? '#90caf9' : '#3E6B96' }}>WebNav</span>&nbsp;<span style={{ color: '#E67365' }}>Hub</span>
                        </Typography>
                        <Typography variant="caption" noWrap sx={{ color: darkMode ? '#b0bec5' : '#5F7D95', fontSize: { xs: '0.65rem', md: '0.75rem' }, fontWeight: 500, letterSpacing: '0.2px' }}>
                            Your Organized Internet Gateway
                        </Typography>
                    </Box>
                </Box>

                {/* 管理按钮区域 */}
                <Stack direction="row" spacing={1} alignItems="center">
                    <WeatherWidget />
                    {isAuthenticated && sortMode === SortMode.None && (
                      <IconButton onClick={handleMenuOpen} color="inherit">
                        <MenuIcon />
                      </IconButton>
                    )}
                    
                    
                    {isAuthenticated ? (
                      <IconButton color="error" size="medium" onClick={handleLogout} title="退出登录" sx={{ width: 36, height: 36, padding: 0, transition: 'all 0.3s', boxShadow: (t) => t.shadows[6], bgcolor: 'error.main', color: 'white', '&:hover': { boxShadow: '0 0 10px rgba(255,0,0,0.8)', transform: 'scale(1.1)', bgcolor: 'error.dark' } }}>
                        <LogOut size={20} />
                      </IconButton>
                    ) : (
                      <IconButton color="primary" size="medium" onClick={() => setIsAuthRequired(true)} title="管理员登录" sx={{ transition: 'all 0.3s', boxShadow: (t) => t.shadows[6], bgcolor: 'primary.main', color: 'black', width: 36, height: 36, padding: 0, '&:hover': { boxShadow: (t) => `0 0 10px ${t.palette.primary.main}80`, transform: 'scale(1.1)', bgcolor: 'primary.dark' } }}>
                        <UserCog size={20} />
                      </IconButton>
                    )}
                    
                    <IconButton onClick={toggleTheme} color="inherit" title={darkMode ? "切换到亮色模式" : "切换到暗黑模式"} sx={{ width: 40, height: 40, transition: 'all 0.3s', color: darkMode ? '#fb8c00' : '#64748b', '&:hover': { bgcolor: darkMode ? 'rgba(251, 140, 0, 0.1)' : 'rgba(100, 116, 139, 0.1)', transform: 'rotate(15deg)' } }}>
                      {darkMode ? <Sun size={24} /> : <Moon size={24} />}
                    </IconButton>
                </Stack>
              </Box>
          </Container>
          
          {/* 菜单大面板（包含主、子双层级菜单） */}
          <Box sx={{ display: 'flex', py: 0.5, my: 0.5, mx: 'auto', width: { xs: '100%', md: 'fit-content' }, justifyContent: { xs: 'flex-start', md: 'center' }, overflow: 'visible' }}>
            <Paper elevation={4} sx={{ width: { xs: '100%', md: 'auto' }, backdropFilter: 'blur(16px)', background: (t) => t.palette.mode === 'dark' ? 'rgba(30,30,30,0.8)' : 'rgba(255,255,255,0.8)', borderRadius: 4, px: 2, py: 1, border: 'none' }}>
              
              {/* ================= 🟢 第一层：顶级主菜单 Tabs ================= */}
               <DndContext
  sensors={sensors}
  collisionDetection={closestCenter}
  onDragStart={() => {
    // Tab 区域拖拽开始 = 确认进入 GroupSort（如果还没进入）
    setSortMode(SortMode.GroupSort);
  }}
  onDragEnd={handleDragEnd}
  onDragCancel={() => {
    setSortMode(SortMode.None);
  }}
>           
               <SortableContext items={groupIds} strategy={horizontalListSortingStrategy}>
  <Tabs
    value={sortMode === SortMode.GroupSort ? false : (selectedTab || false)}
    onChange={(_, v) => {
  const newGroup = groups.find(g => g.id === v);
  setSelectedTab(v as number);
  
  // 始终默认显示主菜单的直属内容
  setSelectedSubTab(v as number); 
}}
    variant="scrollable"
    scrollButtons="auto"
    allowScrollButtonsMobile
    sx={{ /* 保持原来的样式不变 */ }}
  >
    {groups.map(g => {
      const isGroupSorting = sortMode === SortMode.GroupSort;

      // 只在非排序时显示编辑/删除按钮
      const tabLabel = (
  <Box sx={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
    <span>{g.name}</span>
    {isAuthenticated && !isGroupSorting && (
      <>
        {/* 左上角：编辑 */}
        <IconButton
          size="small"
          onClick={(e) => { e.stopPropagation(); setEditingGroup(g); setEditGroupOpen(true); }}
          sx={{
            position: 'absolute', top: -18, left: -10, zIndex: 10,
            p: 0.2, bgcolor: 'background.paper', boxShadow: 1,
            color: 'primary.main',
            '&:hover': { bgcolor: 'primary.main', color: 'black' },
            className: 'tab-action-btn'
          }}
        >
          <EditIcon sx={{ fontSize: '0.75rem' }} />
        </IconButton>

        {/* 右上角：删除 */}
        <IconButton
          size="small"
          onClick={(e) => { e.stopPropagation(); handleGroupDelete(g.id!); }}
          disabled={groups.length <= 1}
          sx={{
            position: 'absolute', top: -18, right: -16, zIndex: 10,
            p: 0.2, bgcolor: 'background.paper', boxShadow: 1,
            color: 'error.main',
            '&:hover': { bgcolor: 'error.main', color: 'white' },
            className: 'tab-action-btn'
          }}
        >
          <DeleteIcon sx={{ fontSize: '0.75rem' }} />
        </IconButton>
      </>
    )}
  </Box>
);

      return (
        <SortableTab
          key={g.id}
          label={tabLabel}
          value={g.id}
          disabled={!isGroupSorting}          // ← 非排序时禁用拖拽
          onLongPress={isAuthenticated ? () => setSortMode(SortMode.GroupSort) : undefined}
          sx={{ px: isAuthenticated ? 2.5 : 1.5, minHeight: '48px', transition: 'all 0.2s ease', '& .tab-action-btn': { visibility: 'hidden', opacity: 0, transition: 'all 0.2s ease' }, '&:hover .tab-action-btn': { visibility: 'visible', opacity: 1 } }}
        />
      );
    })}

    {isAuthenticated && (
      <Tab icon={<AddIcon />} onClick={(e) => { e.preventDefault(); handleOpenAddGroup(); }}
        sx={{ minWidth: { xs: 40, sm: 50 }, '&:hover': { bgcolor: 'rgba(0,255,157,0.1)' } }} aria-label="添加分组" />
    )}
  </Tabs>
</SortableContext>
              </DndContext>

              {/* ================= 🔵 第二层：二级子菜单切换标签条 ================= */}
              {currentGroup && currentGroup.sub_menus && currentGroup.sub_menus.length > 0 && (
                <Box sx={{ mt: 2.5, pt: 2, borderTop: (t) => `1px solid ${t.palette.mode === 'dark' ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)'}`, display: 'flex', gap: 1.5, justifyContent: { xs: 'flex-start', md: 'center' }, flexWrap: 'nowrap', overflowX: 'auto', scrollbarWidth: 'none', '&::-webkit-scrollbar': { display: 'none' } }}>
                  <Button variant={selectedSubTab === currentGroup.id ? "contained" : "text"} size="small" onClick={() => setSelectedSubTab(currentGroup.id!)} sx={{ borderRadius: 2, fontWeight: 800, color: selectedSubTab === currentGroup.id ? 'black' : 'text.primary', textTransform: 'none' }}>
                    全部直属
                  </Button>

                  {currentGroup.sub_menus.map((subMenu: GroupTreeNode) => (
                    <Box key={subMenu.id} sx={{ position: 'relative', padding: isAuthenticated ? '0 18px' : '0' }}>
                      <Button variant={selectedSubTab === subMenu.id ? "contained" : "text"} size="small" onClick={() => setSelectedSubTab(subMenu.id)} sx={{ borderRadius: 2, fontWeight: 800, color: selectedSubTab === subMenu.id ? 'black' : 'text.primary', textTransform: 'none', whiteSpace: 'nowrap' }}>
                        {subMenu.name}
                      </Button>
                      {isAuthenticated && (
                        <>
                          <IconButton size="small" onClick={(e) => { e.stopPropagation(); setEditingGroup(subMenu); setEditGroupOpen(true); }} sx={{ position: 'absolute', top: -6, left: -4, zIndex: 10, p: 0.1, bgcolor: 'background.paper', boxShadow: 1, color: 'primary.main', '&:hover': { bgcolor: 'primary.main', color: 'black' } }}>
                            <EditIcon sx={{ fontSize: '0.65rem' }} />
                          </IconButton>
                          <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleGroupDelete(subMenu.id!); }} sx={{ position: 'absolute', top: -6, right: -4, zIndex: 10, p: 0.1, bgcolor: 'background.paper', boxShadow: 1, color: 'error.main', '&:hover': { bgcolor: 'error.main', color: 'white' } }}>
                            <DeleteIcon sx={{ fontSize: '0.65rem' }} />
                          </IconButton>
                        </>
                      )}
                    </Box>
                  ))}
                </Box>
              )}

            </Paper>
          </Box>
          
        </AppBar>
        {/* Header 占位符，防止内容被 fixed header 遮挡 */}
        <Box sx={{
          height: {
            xs: currentGroup?.sub_menus && currentGroup.sub_menus.length > 0 ? '185px' : '140px',
            md: currentGroup?.sub_menus && currentGroup.sub_menus.length > 0 ? '175px' : '130px',
          }
        }} />

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
          
                              {/* ... 上方是搜索框等内容 ... */}

                     {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
              <CircularProgress size={60} thickness={4} />
            </Box>
          ) : (
            <Box sx={{ pb: 10 }}>
             
              {/* ================= 2. 动态挑选的站点网格 ================= */}
              {(() => {
                let targetRenderGroup = currentGroup;
                
                 if (currentGroup && currentGroup.sub_menus && currentGroup.sub_menus.length > 0) {
                   const subMatch = currentGroup.sub_menus.find(sub => sub.id === selectedSubTab);
                    if (subMatch) {
                      // selectedSubTab 匹配到了某个子菜单
                     targetRenderGroup = subMatch;
                    } else {
                      // 没匹配到（包括 selectedSubTab 是当前主菜单id或旧主菜单id的情况）
                      // 显示直属内容，不做替换，targetRenderGroup 保持 currentGroup
                    }
                  }                            

                if (!targetRenderGroup) return null;

                const currentGroupSiteIds = targetRenderGroup.sites?.map(s => s.id!) || [];

                return (
                  <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={() => {
                if (pendingSortRef.current) {
                  setSortMode(SortMode.SiteSort);
                  pendingSortRef.current = false;
                }
              }}
              onDragEnd={handleDragEnd}
              onDragCancel={() => {
                pendingSortRef.current = false;
                setSortMode(SortMode.None);
              }}
            > 
                    <SortableContext items={currentGroupSiteIds} strategy={rectSortingStrategy}>
                      <Box 
                      onPointerDown={handleCardAreaPointerDown}
                      onPointerMove={handleCardAreaPointerMove}   // ← 新增
        onPointerUp={handleCardAreaPointerUp}
        onPointerCancel={handleCardAreaPointerCancel}
       onClick={handleCardAreaClick}
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: {
                          xs: 'repeat(auto-fill, minmax(140px, 1fr))',
                           md: `repeat(${Number(configs['site.desktopColumns'] || 6)}, 1fr)`
                          },
                          gap: 3.5,
                          border: 'none', 
                          borderRadius: 4,
                          p: 0,
                          transition: 'all 0.3s',
                          
                          }}>
                        {targetRenderGroup.sites?.map((site: Site) => (
                         <SortableSiteCard
                          key={site.id}
                          id={site.id!}
                          disabled={!isAuthenticated || (sortMode !== SortMode.None && sortMode !== SortMode.SiteSort)}
                          onLongPress={() => {
                            if (isAuthenticated && sortMode === SortMode.None) {
                              pendingSortRef.current = true;
                            }
                          }}
                            >                       
                            {renderSiteCard(site)}
                            </SortableSiteCard>
                          ))}
                        
                        {isAuthenticated && sortMode === SortMode.None && (
                          renderAddSiteCard(targetRenderGroup.id!)
                        )}
                      </Box>
                    </SortableContext>
                  </DndContext>
                );
              })()}
            </Box>
          )}

         
          <Menu anchorEl={menuAnchorEl} open={openMenu} onClose={handleMenuClose}>
            
                        
            <Divider />
            
            <MenuItem onClick={() => { handleOpenConfig(); handleMenuClose(); }}>
              <ListItemIcon><SettingsIcon /></ListItemIcon>
              <ListItemText>网站设置</ListItemText>
            </MenuItem>
            
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
        
        {/* 导入数据 */}
<Dialog open={openImport} onClose={handleCloseImport} maxWidth="sm" fullWidth
  >
          <DialogTitle>导入数据</DialogTitle>
          <DialogContent>
            <DialogContentText sx={{ mb: 2 }}>请上传您之前导出的 JSON 备份文件。</DialogContentText>
            <input
              type="file"
              accept=".json"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) setImportFile(file);
              }}
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
              disabled={!importFile || importLoading}
              onClick={() => importFile && handleImportData(importFile)}
              startIcon={importLoading ? <CircularProgress size={16} color="inherit" /> : <AddIcon />}
            >
              {importLoading ? '导入中...' : '开始导入'}
            </Button>
          </DialogActions>
        </Dialog>
        {/* 登录 */}
<Dialog open={isAuthRequired && !isAuthenticated} onClose={() => setIsAuthRequired(false)}
 PaperProps={{ sx: glassDialog }}
BackdropProps={{ sx: glassBackdrop }}>
  <LoginForm onLogin={handleLogin} loading={loginLoading} error={loginError} />
</Dialog>

                {/* ================= 新增分组弹窗 ================= */}
       
              {/* 新增分组 */}
                <Dialog open={openAddGroup} onClose={handleCloseAddGroup} maxWidth="sm" fullWidth
                 PaperProps={{ sx: glassDialog }} BackdropProps={{ sx: glassBackdrop }}>
          <DialogTitle>新增分组 <IconButton onClick={handleCloseAddGroup} sx={{ position: 'absolute', right: 8, top: 8 }}><CloseIcon /></IconButton></DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 2 }}>
              <TextField autoFocus fullWidth label="分组名称" value={newGroup.name || ''} name="name" onChange={handleGroupInputChange} />
              
              {/* ✨ 新增：选择父级菜单，使其变身为子菜单 */}
              <FormControl fullWidth>
                <InputLabel id="add-group-parent-label">所属父级菜单 (留空则为顶级)</InputLabel>
                <Select
                  labelId="add-group-parent-label"
                  value={newGroup.parent_id || ''}
                  label="所属父级菜单 (留空则为顶级)"
                  onChange={(e) => setNewGroup({ ...newGroup, parent_id: e.target.value ? Number(e.target.value) : null })}
                >
                  <MenuItem value=""><em>无 (作为顶级菜单)</em></MenuItem>
                  {groups.filter(g => !g.parent_id && g.id !== newGroup.id).map(g => (
                    <MenuItem key={g.id} value={g.id}>{g.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControlLabel control={<Switch checked={newGroup.is_public === 1} onChange={e => setNewGroup({ ...newGroup, is_public: e.target.checked ? 1 : 0 })} />} label="公开分组" />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseAddGroup}
            sx={{
                ...neumorphicButton,
                color: 'text.secondary',
                background: darkMode ? '#1e1e1e' : '#f0f0f0',
              }}
            >
              取消
          </Button>
            <Button variant="contained" onClick={handleCreateGroup}
            sx={{
                ...neumorphicButton,
                background: 'linear-gradient(135deg, #00ff9d 0%, #00cc7a 100%)',
                color: '#000',
                fontWeight: 600,
                boxShadow: darkMode
                  ? '4px 4px 10px #0a0a0a, -2px -2px 6px #00ff9d33'
                  : '4px 4px 10px #a0d4b8, -2px -2px 6px #ffffff',
              }}
            >
              创建
              </Button>
          </DialogActions>
        </Dialog>

        {/* ================= ✨ 新增：编辑分组弹窗 ================= */}
        {/* 编辑分组 */}
<Dialog open={editGroupOpen} onClose={() => setEditGroupOpen(false)} maxWidth="sm" fullWidth
 PaperProps={{ sx: glassDialog }}
            BackdropProps={{ sx: glassBackdrop }}>

          <DialogTitle>编辑分组 <IconButton onClick={() => setEditGroupOpen(false)} sx={{ position: 'absolute', right: 8, top: 8 }}><CloseIcon /></IconButton></DialogTitle>
             {editingGroup && (          
            <DialogContent>
              <Stack spacing={2} sx={{ mt: 2 }}>
                <TextField 
                  autoFocus 
                  fullWidth 
                  label="分组名称" 
                  value={editingGroup.name || ''} 
                  onChange={(e) => setEditingGroup({ ...editingGroup, name: e.target.value })} 
                />
                
                {/* ✨ 允许在编辑时修改或绑定 parent_id 归类为子菜单 */}
                <FormControl fullWidth>
                  <InputLabel id="edit-group-parent-label">所属父级菜单 (转换层级)</InputLabel>
                  <Select
                    labelId="edit-group-parent-label"
                    value={editingGroup.parent_id || ''}
                    label="所属父级菜单 (转换层级)"
                    onChange={(e) => setEditingGroup({ ...editingGroup, parent_id: e.target.value ? Number(e.target.value) : null })}
                  >
                    <MenuItem value=""><em>无 (转换为顶级菜单)</em></MenuItem>
                    {/* 过滤掉自身，防止自己成为自己的父级造成死循环 */}
                    {groups.filter(g => !g.parent_id && g.id !== editingGroup.id).map(g => (
                      <MenuItem key={g.id} value={g.id}>{g.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControlLabel 
                  control={
                    <Switch 
                      checked={editingGroup.is_public === 1} 
                      onChange={e => setEditingGroup({ ...editingGroup, is_public: e.target.checked ? 1 : 0 })} 
                    />
                  } 
                  label="公开分组" 
                />
              </Stack>
            </DialogContent>
          )}
          <DialogActions>
            <Button onClick={() => setEditGroupOpen(false)}
              sx={{
                ...neumorphicButton,
                color: 'text.secondary',
                background: darkMode ? '#1e1e1e' : '#f0f0f0',
              }}
              >
              取消
            </Button>
            <Button 
              variant="contained" 
              onClick={async () => {
                if (editingGroup?.id) {
                  try {
                    await api.updateGroup(editingGroup.id, editingGroup);
                    await fetchData();
                    setEditGroupOpen(false);
                    handleError('分组修改成功');
                  } catch (err) {
                    handleError('修改分组失败: ' + (err as Error).message);
                  }
                }
              }}
            >
              保存修改
            </Button>
          </DialogActions>
        </Dialog>


          {/* ================= ✨ 双级联动版：新增站点弹窗 ================= */}
       <Dialog open={openAddSite} onClose={handleCloseAddSite} maxWidth="sm" fullWidth
 PaperProps={{ sx: glassDialog }}
BackdropProps={{ sx: glassBackdrop }}>
          <DialogTitle sx={{ fontWeight: 800, pb: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            新增站点
            <IconButton onClick={handleCloseAddSite} sx={{ bgcolor: darkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)' }}><CloseIcon /></IconButton>
          </DialogTitle>
          
          {(() => {
  let selectedGroup = groups.find(g => g.id === newSite.group_id);
  let currentMainGroupId: number;

  if (selectedGroup) {
    currentMainGroupId = selectedGroup.id!;
  } else {
    const parentGroup = groups.find(g =>
      g.sub_menus?.some(sub => sub.id === newSite.group_id)
    );
    currentMainGroupId = parentGroup?.id ?? newSite.group_id ?? 0;
  }

  const mainGroupObj = groups.find(g => g.id === currentMainGroupId);
  const hasSubMenus = mainGroupObj?.sub_menus && mainGroupObj.sub_menus.length > 0;
            return (
              <DialogContent>
                <Stack spacing={3} sx={{ mt: 1 }}>
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 700, mb: 1, opacity: 0.8 }}>站点名称</Typography>
                    <TextField fullWidth name="name" value={newSite.name || ''} onChange={handleSiteInputChange} InputProps={{ sx: { borderRadius: '14px', bgcolor: 'background.paper' } }} />
                  </Box>
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 700, mb: 1, opacity: 0.8 }}>网站跳转 URL</Typography>
                    <TextField fullWidth name="url" value={newSite.url || ''} onChange={handleSiteInputChange} InputProps={{ sx: { borderRadius: '14px', bgcolor: 'background.paper' } }} />
                  </Box>
                  {/* 第一级：选择主菜单 */}
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 700, mb: 1, opacity: 0.8, fontSize: '0.95rem' }}>
                      所属主菜单
                    </Typography>
                    <FormControl fullWidth variant="outlined">
                      <Select
                        value={currentMainGroupId || ''}
                        IconComponent={KeyboardArrowDownIcon}
                        onChange={(e) => {
                    const newMainId = Number(e.target.value);
                    const targetMainGroup = groups.find(g => g.id === newMainId);
                    if (targetMainGroup?.sub_menus && targetMainGroup.sub_menus.length > 0) {
                      const firstSubId = targetMainGroup.sub_menus[0].id;
                      if (firstSubId) {
                        setNewSite({ ...newSite, group_id: firstSubId });
                      }
                    } else {
                    setNewSite({ ...newSite, group_id: newMainId });
                  }
                }}
                        sx={{
                          borderRadius: '16px',
                          bgcolor: darkMode ? '#252932' : '#ffffff',
                          boxShadow: darkMode ? '3px 3px 6px #0a0b0e, -3px -3px 6px #2d333f' : '3px 3px 6px #d1d9e6, -3px -3px 6px #ffffff',
                          '& fieldset': { border: 'none' },
                          fontWeight: 700, '.MuiSelect-select': { py: 1.8 }
                        }}
                      >
                        {groups.filter(g => !g.parent_id).map((mainGroup) => (
                          <MenuItem key={mainGroup.id} value={mainGroup.id}>📁 {mainGroup.name}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Box>

                  {/* 第二级：按需出现子菜单 */}
                  {hasSubMenus && (
                    <Box sx={{ animation: 'fadeIn 0.3s ease' }}>
                      <Typography variant="body2" sx={{ fontWeight: 700, mb: 1, opacity: 0.8, fontSize: '0.95rem', color: 'text.primary' }}>
                        └── 归属子菜单
                      </Typography>
                      <FormControl fullWidth variant="outlined">
                        <Select
                          value={newSite.group_id || ''}
                          IconComponent={KeyboardArrowDownIcon}
                          onChange={(e) => setNewSite({ ...newSite, group_id: Number(e.target.value) })}
                          sx={{
                            borderRadius: '16px',
                            bgcolor: darkMode ? '#1f232b' : '#f4f7fa',
                            boxShadow: darkMode ? 'inset 2px 2px 5px #0a0b0e, inset -2px -2px 5px #2d333f' : 'inset 2px 2px 5px #c8d0dc, inset -2px -2px 5px #ffffff',
                            '& fieldset': { border: 'none' },
                            fontWeight: 700, '.MuiSelect-select': { py: 1.5 }
                          }}
                        >
                          {mainGroupObj?.sub_menus.map((sub) => (
                            <MenuItem key={sub.id} value={sub.id}>📄 {sub.name}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Box>
                  )}

                  {/* 基础输入项 */}
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 700, mb: 1.5, opacity: 0.8, fontSize: '0.95rem' }}>Logo 图片链接（可选）</Typography>
                    <Box sx={{ display: 'flex', gap: 1.5, mb: 2, overflowX: 'auto', pb: 0.5, scrollbarWidth: 'none', '&::-webkit-scrollbar': { display: 'none' } }}>
                      {['Google', 'DDG', 'Horse', 'Direct'].map((name) => (
                        <Button key={name} variant="contained" size="small"
                          onClick={() => {
                            if (!newSite.url) { handleError('请先输入网站跳转 URL'); return; }
                            const domain = extractDomain(newSite.url);
                            if (domain) {
                              const protocol = newSite.url.startsWith('https') ? 'https' : 'http';
                              const templates: Record<string, string> = {
                                Google: 'https://www.google.com/s2/favicons?domain={domain}&sz=256',
                                DDG: 'https://icons.duckduckgo.com/ip3/{domain}.ico',
                                Horse: 'https://icon.horse/icon/{domain}',
                                Direct: '{protocol}://{domain}/favicon.ico'
                              };
                              setNewSite({ ...newSite, icon: templates[name].replace('{domain}', domain).replace('{protocol}', protocol) });
                            }
                          }}
                          sx={{ borderRadius: '12px', textTransform: 'none', fontWeight: 700, px: 2, py: 0.8, bgcolor: darkMode ? '#252932' : '#ffffff', color: darkMode ? '#ffffff' : '#4a5568', boxShadow: darkMode ? '3px 3px 6px #111318, -3px -3px 6px #2f3542' : '3px 3px 6px #d1d9e6, -3px -3px 6px #ffffff', '&:hover': { bgcolor: 'primary.main', color: 'black', boxShadow: 'none' } }}
                        >
                          {name}
                        </Button>
                      ))}
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <TextField fullWidth placeholder="或留空自动获取..." value={newSite.icon || ''} name="icon" onChange={handleSiteInputChange} InputProps={{ sx: { borderRadius: '16px', bgcolor: darkMode ? '#14161d' : '#e6ecf4', boxShadow: darkMode ? 'inset 2px 2px 5px #0a0b0e, inset -2px -2px 5px #1e212a' : 'inset 2px 2px 5px #b8b0c5, inset -2px -2px 5px #ffffff', '& fieldset': { border: 'none' }, fontWeight: 600, color: 'text.primary' } }} />
                      <Box sx={{ width: 56, height: 56, minWidth: 56, borderRadius: '16px', display: 'grid', placeItems: 'center', p: 1, bgcolor: darkMode ? '#252932' : '#ffffff', boxShadow: darkMode ? '4px 4px 10px #0a0b0e, -4px -4px 10px #242932' : '4px 4px 10px #c8d0dc, -4px -4px 10px #ffffff' }}>
                        <img src={newSite.icon || `https://www.google.com/s2/favicons?domain=${extractDomain(newSite.url || 'github.com')}&sz=256`} style={{ width: '100%', height: '100%', objectFit: 'contain' }} onError={(e) => { e.currentTarget.src = "/logo-transp.svg"; }} />
                      </Box>
                    </Box>
                  </Box>

                  
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 700, mb: 1, opacity: 0.8 }}>描述（可选）</Typography>
                    <TextField fullWidth multiline rows={2} placeholder="简短描述..." name="description" value={newSite.description || ''} onChange={handleSiteInputChange} InputProps={{ sx: { borderRadius: '14px', bgcolor: 'background.paper' } }} />
                  </Box>
                </Stack>
              </DialogContent>
            );
          })()}
          <DialogActions sx={{ p: 3, gap: 1 }}>
            <Button onClick={handleCloseAddSite} sx={{ fontWeight: 700, textTransform: 'none', color: 'text.secondary' }}>取消</Button>
            <Button variant="contained" onClick={handleCreateSite} sx={{ borderRadius: '12px', px: 3, fontWeight: 700, textTransform: 'none', boxShadow: 'none' }}>创建站点</Button>
          </DialogActions>
        </Dialog>
        
          {/* ================= ✨ 双级联动版：编辑站点弹窗 ================= */}
        <Dialog open={editSiteOpen} onClose={() => setEditSiteOpen(false)} maxWidth="sm" fullWidth
 PaperProps={{ sx: glassDialog }}
BackdropProps={{ sx: glassBackdrop }}>
        
          <DialogTitle sx={{ fontWeight: 800, pb: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            编辑站点设置
            <IconButton onClick={() => setEditSiteOpen(false)} sx={{ bgcolor: darkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)' }}><CloseIcon /></IconButton>
          </DialogTitle>

          {editingSite && (() => {
  // 先在顶级菜单里找
  let selectedGroup = groups.find(g => g.id === editingSite.group_id);
  let currentMainGroupId: number;

  if (selectedGroup) {
    // 找到了 → 说明 group_id 本身就是顶级菜单
    currentMainGroupId = selectedGroup.id!;
  } else {
    // 没找到 → 说明 group_id 是某个子菜单的 id，去 sub_menus 里翻
    const parentGroup = groups.find(g =>
      g.sub_menus?.some(sub => sub.id === editingSite.group_id)
    );
    currentMainGroupId = parentGroup?.id ?? editingSite.group_id ?? 0;
  }

  const mainGroupObj = groups.find(g => g.id === currentMainGroupId);
  const hasSubMenus = mainGroupObj?.sub_menus && mainGroupObj.sub_menus.length > 0;

            return (
              <DialogContent>
                <Stack spacing={3} sx={{ mt: 1 }}>
                 <Box>
                    <Typography variant="body2" sx={{ fontWeight: 700, mb: 1, opacity: 0.8 }}>站点名称</Typography>
                    <TextField fullWidth value={editingSite.name || ''} onChange={(e) => setEditingSite({ ...editingSite, name: e.target.value })} InputProps={{ sx: { borderRadius: '14px', bgcolor: 'background.paper' } }} />
                  </Box>
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 700, mb: 1, opacity: 0.8 }}>网站跳转 URL</Typography>
                    <TextField fullWidth value={editingSite.url || ''} onChange={(e) => setEditingSite({ ...editingSite, url: e.target.value })} InputProps={{ sx: { borderRadius: '14px', bgcolor: 'background.paper' } }} />
                  </Box> 
                  {/* 1️⃣ 第一级下拉框：永久出现的“所属主菜单” */}
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 700, mb: 1, opacity: 0.8, fontSize: '0.95rem' }}>
                      所属主菜单
                    </Typography>
                    <FormControl fullWidth variant="outlined">
                      <Select
                        value={currentMainGroupId}
                        IconComponent={KeyboardArrowDownIcon}
                        onChange={(e) => {
                          const newMainId = Number(e.target.value);
                          const targetMainGroup = groups.find(g => g.id === newMainId);
                          
                          // ✨ 联动核心逻辑：
                          // 如果切换到的这个新主菜单名下【有子菜单】，默认帮用户选中它的第一个子菜单 ID
                          if (targetMainGroup?.sub_menus && targetMainGroup.sub_menus.length > 0) {
                            setEditingSite({ ...editingSite, group_id: targetMainGroup.sub_menus[0].id });
                          } else {
                            // 如果【没有子菜单】，卡片直接彻底归属于这个主菜单本身
                            setEditingSite({ ...editingSite, group_id: newMainId });
                          }
                        }}
                        sx={{
                          borderRadius: '16px',
                          bgcolor: darkMode ? '#252932' : '#ffffff',
                          boxShadow: darkMode ? '3px 3px 6px #0a0b0e, -3px -3px 6px #2d333f' : '3px 3px 6px #d1d9e6, -3px -3px 6px #ffffff',
                          '& fieldset': { border: 'none' },
                          fontWeight: 700, '.MuiSelect-select': { py: 1.8 }
                        }}
                      >
                        {/* 这里只纯粹列出顶级主菜单 */}
                        {groups.filter(g => !g.parent_id).map((mainGroup) => (
                          <MenuItem key={mainGroup.id} value={mainGroup.id}>
                            📁 {mainGroup.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Box>

                  {/* 2️⃣ 第二级下拉框：✨ 只有当前主菜单下孕育了子菜单时，才会像魔术一样显示出来 */}
                  {hasSubMenus && (
                    <Box sx={{ animation: 'fadeIn 0.3s ease' }}>
                      <Typography variant="body2" sx={{ fontWeight: 700, mb: 1, opacity: 0.8, fontSize: '0.95rem', color: 'primary.main' }}>
                        └── 归属子菜单
                      </Typography>
                      <FormControl fullWidth variant="outlined">
                        <Select
                          value={editingSite.group_id} // 真正绑定并决定卡片落脚点的 group_id
                          IconComponent={KeyboardArrowDownIcon}
                          onChange={(e) => setEditingSite({ ...editingSite, group_id: Number(e.target.value) })}
                          sx={{
                            borderRadius: '16px',
                            bgcolor: darkMode ? '#1f232b' : '#f4f7fa',
                            boxShadow: darkMode ? 'inset 2px 2px 5px #0a0b0e, inset -2px -2px 5px #2d333f' : 'inset 2px 2px 5px #c8d0dc, inset -2px -2px 5px #ffffff',
                            '& fieldset': { border: 'none' },
                            fontWeight: 700, '.MuiSelect-select': { py: 1.5 }
                          }}
                        >
                          {mainGroupObj?.sub_menus.map((sub) => (
                            <MenuItem key={sub.id} value={sub.id}>
                              📄 {sub.name}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Box>
                  )}

                  {/* 🟢 顺次对接你上一步刚做好的超高端多入口新拟态 Logo 区域 */}
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 700, mb: 1.5, opacity: 0.8, fontSize: '0.95rem' }}>
                      Logo 图片链接（可选）
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1.5, mb: 2, overflowX: 'auto', pb: 0.5, scrollbarWidth: 'none', '&::-webkit-scrollbar': { display: 'none' } }}>
                      {[
                        { name: 'Google', icon: 'https://www.google.com/s2/favicons?domain={domain}&sz=256' },
                        { name: 'DDG', icon: 'https://icons.duckduckgo.com/ip3/{domain}.ico' },
                        { name: 'Horse', icon: 'https://icon.horse/icon/{domain}' },
                        { name: 'Direct', icon: '{protocol}://{domain}/favicon.ico' }
                      ].map((apiItem) => (
                        <Button key={apiItem.name} variant="contained" size="small"
                          onClick={() => {
                            if (!editingSite.url) { handleError('请先输入网站跳转 URL'); return; }
                            const domain = extractDomain(editingSite.url);
                            if (domain) {
                              const protocol = editingSite.url.startsWith('https') ? 'https' : 'http';
                              setEditingSite({ ...editingSite, icon: apiItem.icon.replace('{domain}', domain).replace('{protocol}', protocol) });
                            }
                          }}
                          sx={{ borderRadius: '12px', textTransform: 'none', fontWeight: 700, px: 2, py: 0.8, bgcolor: darkMode ? '#252932' : '#ffffff', color: darkMode ? '#ffffff' : '#4a5568', boxShadow: darkMode ? '3px 3px 6px #111318, -3px -3px 6px #2f3542' : '3px 3px 6px #d1d9e6, -3px -3px 6px #ffffff', '&:hover': { bgcolor: 'primary.main', color: 'black', boxShadow: 'none' } }}
                        >
                          {apiItem.name}
                        </Button>
                      ))}
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <TextField fullWidth placeholder="或留空自动获取..." value={editingSite.icon || ''} onChange={(e) => setEditingSite({ ...editingSite, icon: e.target.value })} InputProps={{ sx: { borderRadius: '16px', bgcolor: darkMode ? '#14161d' : '#e6ecf4', boxShadow: darkMode ? 'inset 2px 2px 5px #0a0b0e, inset -2px -2px 5px #1e212a' : 'inset 2px 2px 5px #b8b0c5, inset -2px -2px 5px #ffffff', '& fieldset': { border: 'none' }, fontWeight: 600, color: 'text.primary' } }} />
                      <Box sx={{ width: 56, height: 56, minWidth: 56, borderRadius: '16px', display: 'grid', placeItems: 'center', p: 1, bgcolor: darkMode ? '#252932' : '#ffffff', boxShadow: darkMode ? '4px 4px 10px #0a0b0e, -4px -4px 10px #242932' : '4px 4px 10px #c8d0dc, -4px -4px 10px #ffffff' }}>
                        <img src={editingSite.icon || `https://www.google.com/s2/favicons?domain=${extractDomain(editingSite.url || 'github.com')}&sz=256`} style={{ width: '100%', height: '100%', objectFit: 'contain' }} onError={(e) => { e.currentTarget.src = "/logo-transp.svg"; }} />
                      </Box>
                    </Box>
                  </Box>

                  
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 700, mb: 1, opacity: 0.8 }}>描述（可选）</Typography>
                    <TextField fullWidth multiline rows={2} placeholder="简短描述..." value={editingSite.description || ''} onChange={(e) => setEditingSite({ ...editingSite, description: e.target.value })} InputProps={{ sx: { borderRadius: '14px', bgcolor: 'background.paper' } }} />
                  </Box>
                  <FormControlLabel control={<Switch checked={editingSite.is_public === 1} onChange={e => setEditingSite({ ...editingSite, is_public: e.target.checked ? 1 : 0 })} />} label="公开可见" sx={{ ml: 0.5, fontWeight: 'bold' }} />
                </Stack>
              </DialogContent>
            );
          })()}

          <DialogActions sx={{ p: 3, gap: 1 }}>
            <Button onClick={() => setEditSiteOpen(false)} sx={{ fontWeight: 700, textTransform: 'none', color: 'text.secondary' }}>取消</Button>
            <Button variant="contained" onClick={async () => { if (editingSite?.id) { await api.updateSite(editingSite.id, editingSite); await fetchData(); setEditSiteOpen(false); handleError('保存成功！'); } }} sx={{ borderRadius: '12px', px: 3, fontWeight: 700, textTransform: 'none', boxShadow: 'none' }}>保存修改</Button>
          </DialogActions>
        </Dialog>
       {/* 导出结果 */}
<Dialog open={openExportResult} onClose={() => setOpenExportResult(false)} maxWidth="xs" fullWidth
 PaperProps={{ sx: glassDialog }}
BackdropProps={{ sx: glassBackdrop }}>
  <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
    {exportResult?.success
      ? <><CheckCircleOutlineIcon color="success" /> 导出成功</>
      : <><ErrorOutlineIcon color="error" /> 导出失败</>
    }
  </DialogTitle>
  <DialogContent>
    {exportResult?.success ? (
      <Stack spacing={1.5}>
        <Alert severity="success">备份文件已下载到您的设备</Alert>
        <Box sx={{ bgcolor: 'action.hover', borderRadius: 1, p: 1.5 }}>
          <Typography variant="body2" color="text.secondary">文件名</Typography>
          <Typography variant="body2" fontFamily="monospace">{exportResult.fileName}</Typography>
        </Box>
        <Stack direction="row" spacing={2}>
          <Box sx={{ flex: 1, textAlign: 'center', bgcolor: 'action.hover', borderRadius: 1, p: 1 }}>
            <Typography variant="h5" color="primary">{exportResult.groupCount}</Typography>
            <Typography variant="caption" color="text.secondary">个分组</Typography>
          </Box>
          <Box sx={{ flex: 1, textAlign: 'center', bgcolor: 'action.hover', borderRadius: 1, p: 1 }}>
            <Typography variant="h5" color="primary">{exportResult.siteCount}</Typography>
            <Typography variant="caption" color="text.secondary">个站点</Typography>
          </Box>
          <Box sx={{ flex: 1, textAlign: 'center', bgcolor: 'action.hover', borderRadius: 1, p: 1 }}>
            <Typography variant="h5" color="primary">{exportResult.fileSize}</Typography>
            <Typography variant="caption" color="text.secondary">KB</Typography>
          </Box>
        </Stack>
      </Stack>
    ) : (
      <Alert severity="error">导出失败：{exportResult?.error}</Alert>
    )}
  </DialogContent>
  <DialogActions>
    <Button onClick={() => setOpenExportResult(false)} variant="contained">确定</Button>
  </DialogActions>
</Dialog>
        {/* ⚙️ 网站设置弹窗（原本就在这里的代码） */}
        <Dialog open={openConfig} onClose={handleCloseConfig} maxWidth="sm" fullWidth
 PaperProps={{ sx: glassDialog }}
BackdropProps={{ sx: glassBackdrop }}>
          <DialogTitle>网站设置 <IconButton onClick={handleCloseConfig} sx={{ position: 'absolute', right: 8, top: 8 }}><CloseIcon /></IconButton></DialogTitle>
          <DialogContent>
            <Stack spacing={2}>
              <TextField label="网站标题" value={tempConfigs['site.title']} onChange={handleConfigInputChange} name="site.title" fullWidth />
              <TextField label="网站名称" value={tempConfigs['site.name']} onChange={handleConfigInputChange} name="site.name" fullWidth />
              <TextField label="背景图片URL" value={tempConfigs['site.backgroundImage']} onChange={handleConfigInputChange} name="site.backgroundImage" fullWidth />
              
              <Box>
                <Typography variant="caption" color="text.secondary">背景遮罩透明度</Typography>
                <Slider 
                    value={Number(tempConfigs['site.backgroundOpacity'])} 
                    onChange={(_, v) => setTempConfigs({...tempConfigs, 'site.backgroundOpacity': String(v)})} 
                    min={0} max={1} step={0.05} 
                />
              </Box>

              <Box>
                <Typography variant="caption" color="text.secondary">
                桌面端每行显示数量: {tempConfigs['site.desktopColumns'] || 6}
                </Typography>
                <Slider 
                value={Number(tempConfigs['site.desktopColumns'] || 6)} 
                onChange={(_, v) => setTempConfigs({...tempConfigs, 'site.desktopColumns': String(v)})} 
                min={3}  // 最少3列
                max={10} // 最多10列（你可以自己改这个上限）
                step={1} 
                marks
                valueLabelDisplay="auto"
                />
              </Box>

              <TextField label="自定义CSS" value={tempConfigs['site.customCss']} onChange={handleConfigInputChange} name="site.customCss" multiline rows={6} fullWidth />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseConfig}
            sx={{
            ...neumorphicButton,
            color: 'text.secondary',
            background: darkMode ? '#1e1e1e' : '#f0f0f0',
          }}
            >
              取消
              </Button>
            <Button 
            variant="contained" 
            onClick={handleSaveConfig}
            sx={{
              ...neumorphicButton,
              color: 'text.secondary',
              background: darkMode ? '#1e1e1e' : '#f0f0f0',
              }} 
              >
              保存
              </Button>
          </DialogActions>
        </Dialog>

       {/* 进度条覆盖层，isSyncing 时显示 */}
{isSyncing && (
  <Box sx={{
    position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999,
    bgcolor: 'rgba(0,0,0,0.6)', display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center', height: '100vh',
    gap: 2,
  }}>
    <Typography variant="h6" color="white">{syncStatusText}</Typography>
    <Box sx={{ width: '40%', minWidth: 300 }}>
      <LinearProgress
        variant="determinate"
        value={syncProgress}
        sx={{ height: 10, borderRadius: 5 }}
      />
    </Box>
    <Typography color="white">{syncProgress}%</Typography>
  </Box>
)}
        
      </Box> {/* 这是整个网页最外层的闭合大 Box */}
    </ThemeProvider>
  );
}

export default App;