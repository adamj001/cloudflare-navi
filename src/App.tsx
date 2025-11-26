import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Container,
  CssBaseline,
  ThemeProvider,
  CircularProgress,
  Typography,
  Snackbar,
  Alert,
  Stack,
  Menu,
  MenuItem,
  Button,
  IconButton,
  Tooltip,
  useMediaQuery,
  useTheme as useMuiTheme,
  Paper, // 引入 Paper 组件
} from '@mui/material';
import Tabs from '@mui/material/Tabs'; // 引入 Tabs
import Tab from '@mui/material/Tab'; // 引入 Tab
import {
  Settings as SettingsIcon,
  Login as LoginIcon,
  Add as AddIcon,
  Sort as SortIcon,
  Cancel as CancelIcon,
  Menu as MenuIcon,
  Reorder as ReorderIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import GroupCard from './components/GroupCard';
import ThemeToggle from './components/ThemeToggle';
import SearchBox from './components/SearchBox';
import AddSiteDialog from './components/AddSiteDialog';
import ManageGroupsDialog from './components/ManageGroupsDialog';
import AddGroupDialog from './components/AddGroupDialog';
import SortableGroupItem from './components/SortableGroupItem';
import LoginDialog from './components/LoginDialog';
import ManageConfigsDialog from './components/ManageConfigsDialog';
import GitHubCorner from './components/GitHubCorner';

// DND 导入
import {
  DndContext,
  closestCenter,
  useSensors,
  useSensor,
  MouseSensor,
  TouchSensor,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';

// API 导入
import api from './services/api';

// 主题导入
import { lightTheme, darkTheme } from './theme';

// 接口定义（保持不变）
interface Site {
  id: number;
  group_id: number;
  name: string;
  url: string;
  icon?: string;
  order_index: number;
}

interface Group {
  id: number;
  name: string;
  order_index: number;
  is_public: 0 | 1;
}

interface GroupWithSites extends Group {
  sites: Site[];
}

interface Configs {
  [key: string]: string;
}

// 枚举定义（保持不变）
enum ViewMode {
  View = 'view',
  Edit = 'edit',
}

enum SortMode {
  None = 'None',
  GroupSort = 'GroupSort',
  SiteSort = 'SiteSort',
}

// **App 组件开始**
function App() {
  const [darkMode, setDarkMode] = useState(
    () => window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
  );
  const theme = useMemo(() => (darkMode ? darkTheme : lightTheme), [darkMode]);
  const toggleTheme = useCallback(() => {
    setDarkMode((prev) => !prev);
  }, []);

  // --- 核心状态 ---
  const [groups, setGroups] = useState<GroupWithSites[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 视图和排序模式
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.View);
  const [sortMode, setSortMode] = useState<SortMode>(SortMode.None);
  const [currentSortingGroupId, setCurrentSortingGroupId] = useState<number | null>(null);

  // 认证状态
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [isAuthRequired, setIsAuthRequired] = useState(false); // 站点是否需要认证

  // **新增状态 1：跟踪当前选中的分组 ID**
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  
  // 配置
  const [configs, setConfigs] = useState<Configs>({});

  // Dialogs 状态
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error' | 'info'>('success');
  const [addSiteDialogOpen, setAddSiteDialogOpen] = useState(false);
  const [addGroupDialogOpen, setAddGroupDialogOpen] = useState(false);
  const [manageGroupsDialogOpen, setManageGroupsDialogOpen] = useState(false);
  const [manageConfigsDialogOpen, setManageConfigsDialogOpen] = useState(false);
  const [loginDialogOpen, setLoginDialogOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null); // Menu 锚点

  // MUI 媒体查询
  const muiTheme = useMuiTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('sm'));
  const sensors = useSensors(
    useSensor(MouseSensor),
    useSensor(TouchSensor)
  );
  
  // --- 数据获取与初始化 ---
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. 获取站点和分组数据
      const groupsWithSites = await api.getGroupsWithSites();
      setGroups(groupsWithSites);

      // **关键修改 A：设置默认选中的分组ID**
      if (groupsWithSites.length > 0 && selectedGroupId === null) {
        setSelectedGroupId(groupsWithSites[0].id);
      }

      // 2. 获取配置
      const configsData = await api.getConfigs();
      setConfigs(configsData);

      // 3. 检查站点是否需要认证
      setIsAuthRequired(configsData['site.auth_required'] === '1');
    } catch (error: any) {
      if (error.response?.status === 401) {
        // 如果数据获取失败是由于未认证，则不设置错误，只显示登录
        setIsAuthenticated(false);
      } else {
        setError('数据加载失败。请检查后端服务。');
        console.error('Data fetching error:', error);
      }
    } finally {
      setLoading(false);
    }
  };

  const checkAuth = useCallback(async () => {
    setIsAuthChecking(true);
    try {
      const auth = await api.checkAuth();
      setIsAuthenticated(auth.authenticated);
      if (auth.authenticated) {
        setViewMode(ViewMode.Edit);
      } else {
        setViewMode(ViewMode.View);
      }
    } catch (error) {
      setIsAuthenticated(false);
      setViewMode(ViewMode.View);
      console.error('Auth check failed:', error);
    } finally {
      setIsAuthChecking(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    checkAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  // --- Tab 切换处理函数 ---
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setSelectedGroupId(newValue);
    // 切换 Tab 时取消任何排序模式
    if (sortMode !== SortMode.None) {
      cancelSort();
    }
  };

  // **计算当前选中的分组 (Group) 对象**
  const currentGroup = useMemo(() => {
    return groups.find(g => g.id === selectedGroupId) || null;
  }, [groups, selectedGroupId]);

  // --- 通用 UI 和状态处理函数 ---
  const showSnackbar = (message: string, severity: 'success' | 'error' | 'info' = 'success') => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  };

  const handleSnackbarClose = (event: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === 'clickaway') {
      return;
    }
    setSnackbarOpen(false);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  // --- 排序相关函数 ---
  const startGroupSort = () => {
    setSortMode(SortMode.GroupSort);
    handleMenuClose();
    showSnackbar('已进入分组拖拽排序模式。', 'info');
  };

  const startSiteSort = (groupId: number) => {
    setSortMode(SortMode.SiteSort);
    setCurrentSortingGroupId(groupId);
    handleMenuClose();
    showSnackbar('已进入站点拖拽排序模式。', 'info');
  };

  const cancelSort = () => {
    setSortMode(SortMode.None);
    setCurrentSortingGroupId(null);
    showSnackbar('已退出排序模式。', 'info');
  };

  const saveGroupOrder = async () => {
    try {
      const orderData = groups.map((g, index) => ({
        id: g.id,
        order_index: index,
      }));
      await api.saveGroupOrder(orderData);
      showSnackbar('分组顺序保存成功！');
      cancelSort();
    } catch (error) {
      showSnackbar('分组顺序保存失败。', 'error');
      console.error('Save group order failed:', error);
    }
  };

  const handleSaveSiteOrder = async (groupId: number, sites: Site[]) => {
    try {
      const orderData = sites.map((s, index) => ({
        id: s.id,
        order_index: index,
      }));
      await api.saveSiteOrder(groupId, orderData);
      showSnackbar('站点顺序保存成功！');
      cancelSort();
    } catch (error) {
      showSnackbar('站点顺序保存失败。', 'error');
      console.error('Save site order failed:', error);
    }
  };

  const handleDragEnd = ({ active, over }: any) => {
    if (sortMode !== SortMode.GroupSort || !over || active.id === over.id) return;

    const oldIndex = groups.findIndex((g) => g.id.toString() === active.id.toString());
    const newIndex = groups.findIndex((g) => g.id.toString() === over.id.toString());

    if (oldIndex !== newIndex) {
      setGroups((items) => arrayMove(items, oldIndex, newIndex));
      showSnackbar('分组顺序已更改，请点击保存按钮生效。', 'info');
    }
  };

  // --- CRUD 操作函数 ---

  // 站点
  const handleSiteUpdate = async (groupId: number, updatedSite: Site) => {
    try {
      await api.updateSite(updatedSite);
      await fetchData();
      showSnackbar('站点更新成功！');
    } catch (error) {
      showSnackbar('站点更新失败。', 'error');
    }
  };

  const handleSiteDelete = async (siteId: number) => {
    try {
      await api.deleteSite(siteId);
      await fetchData();
      showSnackbar('站点删除成功！');
    } catch (error) {
      showSnackbar('站点删除失败。', 'error');
    }
  };

  const handleOpenAddSite = (groupId: number | null) => {
    if (groupId !== null) {
      setSelectedGroupId(groupId); // 确保在正确的 Group 下添加
    }
    setAddSiteDialogOpen(true);
  };

  const handleSiteAdded = async () => {
    await fetchData();
    setAddSiteDialogOpen(false);
    showSnackbar('站点添加成功！');
  };

  // 分组
  const handleGroupUpdate = async (updatedGroup: Group) => {
    try {
      await api.updateGroup(updatedGroup);
      await fetchData();
      showSnackbar('分组更新成功！');
    } catch (error) {
      showSnackbar('分组更新失败。', 'error');
    }
  };

  const handleGroupDelete = async (groupId: number) => {
    try {
      await api.deleteGroup(groupId);
      
      // 如果删除的是当前选中的 Tab，自动切换到第一个 Tab
      if (selectedGroupId === groupId) {
        setSelectedGroupId(groups.length > 1 ? groups.find(g => g.id !== groupId)?.id || null : null);
      }
      
      await fetchData();
      showSnackbar('分组删除成功！');
    } catch (error) {
      showSnackbar('分组删除失败。', 'error');
    }
  };

  const handleGroupAdded = async () => {
    await fetchData();
    setAddGroupDialogOpen(false);
    showSnackbar('分组添加成功！');
  };

  // 登录/登出
  const handleLogin = async (data: { password: string }) => {
    try {
      await api.login(data);
      setIsAuthenticated(true);
      setViewMode(ViewMode.Edit);
      setLoginDialogOpen(false);
      await fetchData();
      showSnackbar('登录成功！', 'success');
    } catch (error: any) {
      showSnackbar(error.response?.data?.message || '登录失败，请检查密码。', 'error');
    }
  };

  const handleLogout = async () => {
    try {
      await api.logout();
      setIsAuthenticated(false);
      setViewMode(ViewMode.View);
      setSortMode(SortMode.None);
      showSnackbar('已安全登出。', 'info');
    } catch (error) {
      showSnackbar('登出失败。', 'error');
    }
  };

  // 配置
  const handleConfigsUpdated = async () => {
    setManageConfigsDialogOpen(false);
    await fetchData(); // 重新拉取配置和数据
    showSnackbar('配置更新成功！', 'success');
  };

  // 渲染登录表单
  const renderLoginForm = () => {
    if (isAuthRequired && !isAuthenticated && !isAuthChecking && !loading) {
      return (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '40vh',
            textAlign: 'center',
            py: 4,
          }}
        >
          <Alert severity='warning' sx={{ mb: 3 }}>
            此导航站需要管理员权限才能查看内容。
          </Alert>
          <Button
            variant='contained'
            startIcon={<LoginIcon />}
            onClick={() => setLoginDialogOpen(true)}
          >
            管理员登录
          </Button>
        </Box>
      );
    }
    return null;
  };

  // 如果需要认证且未认证，直接显示登录表单
  if (isAuthRequired && !isAuthenticated && !isAuthChecking) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box
          sx={{
            minHeight: '100vh',
            backgroundColor: 'background.default',
            color: 'text.primary',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
          }}
        >
          <Container maxWidth='sm'>
            {renderLoginForm()}
          </Container>
          <Snackbar
            open={snackbarOpen}
            autoHideDuration={4000}
            onClose={handleSnackbarClose}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
          >
            <Alert onClose={handleSnackbarClose} severity={snackbarSeverity} sx={{ width: '100%' }}>
              {snackbarMessage}
            </Alert>
          </Snackbar>
        </Box>
      </ThemeProvider>
    );
  }


  // --- 主渲染 ---
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={4000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Alert onClose={handleSnackbarClose} severity={snackbarSeverity} sx={{ width: '100%' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>

      <Box
        sx={{
          minHeight: '100vh',
          // 背景图片和蒙版逻辑（保持不变）
          backgroundImage: configs['site.background_image'] ? `url(${configs['site.background_image']})` : 'none',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundAttachment: 'fixed',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
            zIndex: 1,
          },
          color: 'text.primary',
          transition: 'all 0.3s ease-in-out',
          position: 'relative',
          overflow: 'hidden',
          pt: sortMode === SortMode.None ? { xs: '0px', md: '0px' } : '0px',
        }}
      >
        <GitHubCorner configUrl={configs['site.github_corner_url']} />

        <Container
          maxWidth='lg'
          sx={{
            py: 4,
            px: { xs: 2, sm: 3, md: 4 },
            position: 'relative',
            zIndex: 2,
          }}
        >
          {/* 头部标题和管理按钮 - 保持不变 */}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mb: 3, // 减少与 Tab 栏的间距
              flexDirection: { xs: 'column', sm: 'row' },
              gap: { xs: 2, sm: 0 },
            }}
          >
            <Typography
              variant='h3'
              component='h1'
              fontWeight='bold'
              color='text.primary'
              sx={{
                fontSize: { xs: '1.75rem', sm: '2.125rem', md: '3rem' },
                textAlign: { xs: 'center', sm: 'left' },
                textShadow: '2px 2px 4px rgba(0,0,0,0.5)',
              }}
            >
              {configs['site.name'] || '我的导航站'}
            </Typography>
            <Stack
              direction='row'
              spacing={1}
              alignItems='center'
              sx={{
                flexShrink: 0,
              }}
            >
              {sortMode === SortMode.GroupSort && (
                <Button
                  variant='contained'
                  color='success'
                  onClick={saveGroupOrder}
                  startIcon={<ReorderIcon />}
                >
                  保存分组顺序
                </Button>
              )}
              {sortMode !== SortMode.None && (
                <Button
                  variant='outlined'
                  color='error'
                  onClick={cancelSort}
                  startIcon={<CancelIcon />}
                >
                  取消排序
                </Button>
              )}
              {isAuthenticated && sortMode === SortMode.None && (
                <Tooltip title={viewMode === ViewMode.View ? '进入编辑模式' : '退出编辑模式'}>
                  <IconButton
                    color={viewMode === ViewMode.Edit ? 'warning' : 'primary'}
                    onClick={() => setViewMode((prev) => (prev === ViewMode.View ? ViewMode.Edit : ViewMode.View))}
                    size='large'
                  >
                    {viewMode === ViewMode.View ? <LoginIcon /> : <CloseIcon />}
                  </IconButton>
                </Tooltip>
              )}
              {isMobile ? (
                <>
                  <IconButton
                    color='inherit'
                    onClick={handleMenuOpen}
                    size='large'
                  >
                    <MenuIcon />
                  </IconButton>
                  <Menu
                    anchorEl={anchorEl}
                    open={Boolean(anchorEl)}
                    onClose={handleMenuClose}
                  >
                    {isAuthenticated && viewMode === ViewMode.Edit && (
                      <MenuItem onClick={() => { setAddGroupDialogOpen(true); handleMenuClose(); }}>
                        <AddIcon sx={{ mr: 1 }} /> 新增分组
                      </MenuItem>
                    )}
                    {isAuthenticated && viewMode === ViewMode.Edit && (
                      <MenuItem onClick={startGroupSort}>
                        <SortIcon sx={{ mr: 1 }} /> 分组排序
                      </MenuItem>
                    )}
                    {isAuthenticated && viewMode === ViewMode.Edit && (
                      <MenuItem onClick={() => { setManageConfigsDialogOpen(true); handleMenuClose(); }}>
                        <SettingsIcon sx={{ mr: 1 }} /> 配置管理
                      </MenuItem>
                    )}
                    {isAuthenticated && (
                      <MenuItem onClick={handleLogout}>
                        <LoginIcon sx={{ mr: 1 }} /> 退出登录
                      </MenuItem>
                    )}
                    {!isAuthenticated && (
                      <MenuItem onClick={() => { setLoginDialogOpen(true); handleMenuClose(); }}>
                        <LoginIcon sx={{ mr: 1 }} /> 管理员登录
                      </MenuItem>
                    )}
                  </Menu>
                </>
              ) : (
                <>
                  {isAuthenticated && viewMode === ViewMode.Edit && (
                    <Tooltip title='新增分组'>
                      <IconButton
                        color='primary'
                        onClick={() => setAddGroupDialogOpen(true)}
                        size='large'
                      >
                        <AddIcon />
                      </IconButton>
                    </Tooltip>
                  )}
                  {isAuthenticated && viewMode === ViewMode.Edit && (
                    <Tooltip title='分组排序'>
                      <IconButton
                        color='primary'
                        onClick={startGroupSort}
                        size='large'
                      >
                        <SortIcon />
                      </IconButton>
                    </Tooltip>
                  )}
                  {isAuthenticated && viewMode === ViewMode.Edit && (
                    <Tooltip title='配置管理'>
                      <IconButton
                        color='primary'
                        onClick={() => setManageConfigsDialogOpen(true)}
                        size='large'
                      >
                        <SettingsIcon />
                      </IconButton>
                    </Tooltip>
                  )}
                  {isAuthenticated ? (
                    <Tooltip title='退出登录'>
                      <IconButton
                        color='error'
                        onClick={handleLogout}
                        size='large'
                      >
                        <LoginIcon />
                      </IconButton>
                    </Tooltip>
                  ) : (
                    <Tooltip title='管理员登录'>
                      <IconButton
                        color='info'
                        onClick={() => setLoginDialogOpen(true)}
                        size='large'
                      >
                        <LoginIcon />
                      </IconButton>
                    </Tooltip>
                  )}
                </>
              )}
              <ThemeToggle darkMode={darkMode} onToggle={toggleTheme} />
            </Stack>
          </Box>

          {/* **关键修改 B：顶部 Tab 导航栏 (Paper + Tabs)** */}
          {groups.length > 0 && sortMode === SortMode.None && (
            <Paper
              elevation={4}
              sx={{
                // 粘性定位
                position: 'sticky',
                top: 0,
                zIndex: 10,
                mb: 4, // 与内容区保持间距
                // 毛玻璃和半透明样式
                bgcolor: (t) => t.palette.mode === 'dark' ? 'rgba(30,30,30,0.6)' : 'rgba(255,255,255,0.6)',
                backdropFilter: 'blur(16px)',
                // 样式
                borderRadius: 4,
                overflow: 'hidden',
                mx: 'auto',
                width: '100%',
              }}
            >
              <Tabs
                value={selectedGroupId}
                onChange={handleTabChange}
                variant='scrollable'
                scrollButtons='auto'
                allowScrollButtonsMobile
                aria-label='Group navigation tabs'
                sx={{
                  // 调整 Tab 指示器和文字样式
                  '& .MuiTabs-indicator': {
                    // 自定义指示器颜色
                    backgroundColor: '#00ff9d',
                    height: 3,
                    borderRadius: 1,
                  },
                }}
              >
                {groups.map((group) => (
                  <Tab
                    key={group.id}
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center', py: 0.5 }}>
                        <Typography variant='subtitle1' fontWeight={selectedGroupId === group.id ? 'bold' : 'normal'}>
                           {group.name}
                        </Typography>
                        {group.is_public === 0 && viewMode === 'edit' && (
                          <Typography variant='caption' sx={{ ml: 1, color: 'warning.main' }}>(私密)</Typography>
                        )}
                      </Box>
                    }
                    value={group.id}
                    // 应用选中 Tab 的高亮颜色
                    sx={{ 
                      minHeight: 48,
                      color: selectedGroupId === group.id 
                        ? (t) => t.palette.mode === 'dark' ? '#00ff9d' : t.palette.primary.main
                        : 'text.secondary',
                      transition: 'color 0.3s',
                      opacity: 1,
                    }}
                  />
                ))}
              </Tabs>
            </Paper>
          )}

          {/* 搜索框 - 保持不变 */}
          <SearchBox
            groups={groups}
            currentGroup={currentGroup} // 搜索时，可以只搜索当前 Tab 的内容
            showSnackbar={showSnackbar}
            searchEngine={configs['site.search_engine']}
          />

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

          {!loading && !error && (
            <Box
              sx={{
                '& > *': { mb: 5 },
                minHeight: '100px',
              }}
            >
              {/* **关键修改 C：只渲染当前选中的 GroupCard** */}
              {sortMode === SortMode.None && currentGroup && (
                <Box key={`group-${currentGroup.id}`} id={`group-${currentGroup.id}`}>
                  <GroupCard
                    group={currentGroup}
                    sortMode={'None'}
                    currentSortingGroupId={null}
                    viewMode={viewMode}
                    onUpdate={handleSiteUpdate}
                    onDelete={handleSiteDelete}
                    onSaveSiteOrder={handleSaveSiteOrder}
                    onStartSiteSort={startSiteSort}
                    onAddSite={handleOpenAddSite}
                    onUpdateGroup={handleGroupUpdate}
                    onDeleteGroup={handleGroupDelete}
                    configs={configs}
                  />
                </Box>
              )}
              
              {/* **关键修改 D：分组排序模式下，渲染所有 SortableGroupItem** */}
              {sortMode === SortMode.GroupSort && (
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
                      {groups.map((group) => (
                        <SortableGroupItem key={group.id} id={group.id.toString()} group={group} />
                      ))}
                    </Stack>
                  </SortableContext>
                </DndContext>
              )}
              
              {/* **关键修改 E：站点排序模式下，只渲染当前排序的分组** */}
              {sortMode === SortMode.SiteSort && currentSortingGroupId !== null && (
                <Box key={`group-${currentSortingGroupId}`} id={`group-${currentSortingGroupId}`}>
                    <GroupCard
                        group={groups.find(g => g.id === currentSortingGroupId)!}
                        sortMode={'SiteSort'}
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
                    />
                </Box>
              )}
              
              {groups.length === 0 && !loading && (
                  <Alert severity="info">
                      当前没有可显示的分组。请登录管理员账户并添加分组。
                  </Alert>
              )}

            </Box>
          )}
          
          {error && (
            <Alert severity="error">{error}</Alert>
          )}
          
          {/* --- Dialogs --- */}
          <AddSiteDialog
            open={addSiteDialogOpen}
            onClose={() => setAddSiteDialogOpen(false)}
            onSiteAdded={handleSiteAdded}
            groups={groups}
            showSnackbar={showSnackbar}
            defaultGroupId={selectedGroupId} // 默认选中当前 Tab 对应的 Group
          />

          <AddGroupDialog
            open={addGroupDialogOpen}
            onClose={() => setAddGroupDialogOpen(false)}
            onGroupAdded={handleGroupAdded}
            showSnackbar={showSnackbar}
          />

          <ManageGroupsDialog
            open={manageGroupsDialogOpen}
            onClose={() => setManageGroupsDialogOpen(false)}
            groups={groups}
            onGroupUpdate={handleGroupUpdate}
            onGroupDelete={handleGroupDelete}
            showSnackbar={showSnackbar}
          />

          <ManageConfigsDialog
            open={manageConfigsDialogOpen}
            onClose={() => setManageConfigsDialogOpen(false)}
            onConfigsUpdated={handleConfigsUpdated}
            initialConfigs={configs}
            showSnackbar={showSnackbar}
          />

          <LoginDialog
            open={loginDialogOpen}
            onClose={() => setLoginDialogOpen(false)}
            onLogin={handleLogin}
            showSnackbar={showSnackbar}
          />
        </Container>
      </Box>
    </ThemeProvider>
  );
}

export default App;
