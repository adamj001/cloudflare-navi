// src/App.tsx —— 2025 年终极版顶部 Tabs 导航站（正式版）
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
// import LogoutIcon from '@mui/icons-material/Logout'; // 💡 已删除导入
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
  // 主题
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved ? saved === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  const theme = useMemo(() => createTheme({ palette: { mode: darkMode ? 'dark' : 'light' } }), [darkMode]);
  const toggleTheme = () => {
    setDarkMode(prev => {
      localStorage.setItem('theme', prev ? 'light' : 'dark');
      return !prev;
    });
  };

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
      } catch {
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
      const fetchedGroups = await api.getGroupsWithSites();
      setGroups(fetchedGroups);
      // 确保在数据更新后，如果当前选中项被删除，则切换到第一个分组
      if (selectedTab !== null && !fetchedGroups.some(g => g.id === selectedTab)) {
         setSelectedTab(fetchedGroups.length > 0 ? fetchedGroups[0].id : null);
      } else if (selectedTab === null && fetchedGroups.length > 0) {
         setSelectedTab(fetchedGroups[0].id);
      }
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

      {/* 全局错误提示 */}
      <Snackbar open={snackbarOpen} autoHideDuration={6000} onClose={() => setSnackbarOpen(false)}>
        <Alert severity="error" onClose={() => setSnackbarOpen(false)}>{snackbarMessage}</Alert>
      </Snackbar>

      {/* 登录弹窗 */}
      <Dialog open={isAuthRequired && !isAuthenticated} onClose={() => setIsAuthRequired(false)}>
        <LoginForm onLogin={handleLogin} loading={loginLoading} error={loginError} />
      </Dialog>

      <Box sx={{ minHeight: '100vh', position: 'relative', overflow: 'hidden' }}>
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
                // 根据主题设置背景蒙版颜色和透明度
                bgcolor: darkMode ? 'rgba(0,0,0,0.85)' : 'rgba(255,255,255,0.85)',
                opacity: 1 - Number(configs['site.backgroundOpacity'] || 0.15),
              },
            }}
          />
        )}

        {/* 顶部导航栏 (AppBar) */}
        <AppBar 
          position="sticky" 
          elevation={0} 
          sx={{ 
            // 应用半透明和毛玻璃效果
            backdropFilter: 'blur(12px)', 
            bgcolor: (t) => t.palette.mode === 'dark' ? 'rgba(18, 18, 18, 0.7)' : 'rgba(255, 255, 255, 0.7)',
            // 确保在内容之上
            zIndex: 100, 
            py: 0
          }}
        >
          {/* 第一行：标题和管理按钮 */}
          <Toolbar sx={{ justifyContent: 'space-between', px: { xs: 2, sm: 3, md: 4 } }}>
            <Typography variant="h4" fontWeight="bold">{configs['site.name']}</Typography>

            <Stack direction="row" spacing={1} alignItems="center">
              {sortMode !== SortMode.None ? (
                <>
                  <Button variant="contained" size="small" startIcon={<SaveIcon />} onClick={handleSaveGroupOrder}>
                    保存
                  </Button>
                  <Button variant="outlined" size="small" startIcon={<CancelIcon />} onClick={() => setSortMode(SortMode.None)}>
                    取消
                  </Button>
                </>
              ) : (
                <>
                  {viewMode === 'edit' && (
                    <>
                      <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={() => setOpenAddGroup(true)}>
                        新分组
                      </Button>
                      <IconButton onClick={e => setMenuAnchorEl(e.currentTarget)}>
                        <MenuIcon />
                      </IconButton>
                    </>
                  )}
                  {viewMode === 'readonly' && (
                    <Button variant="contained" size="small" onClick={() => setIsAuthRequired(true)}>
                      登录管理
                    </Button>
                  )}
                </>
              )}
              <ThemeToggle darkMode={darkMode} onToggle={toggleTheme} />
            </Stack>
          </Toolbar>
          
          {/* 第二行：主菜单 Tabs (已居中) */}
          {groups.length > 0 && sortMode === SortMode.None && (
            <Container maxWidth="xl" sx={{ px: { xs: 0, sm: 0, md: 0 } }}>
                <Tabs
                  value={selectedTab || false}
                  onChange={(_, v) => setSelectedTab(v as number)}
                  variant="scrollable"
                  scrollButtons="auto"
                  allowScrollButtonsMobile
                  // 💡 关键修改：使 Tabs 居中
                  centered 
                  sx={{ 
                    '.MuiTabs-indicator': { height: 3, borderRadius: 1 },
                    px: { xs: 1, sm: 2, md: 3 } 
                  }}
                >
                  {groups.map(g => (
                    <Tab 
                      key={g.id} 
                      label={g.name} 
                      value={g.id} 
                      sx={{ bgcolor: 'transparent' }}
                    />
                  ))}
                </Tabs>
            </Container>
          )}

        </AppBar>

        <Container maxWidth="xl" sx={{ py: 3, pt: { xs: 3, sm: 3, md: 3 }, position: 'relative', zIndex: 2 }}>
          {/* 搜索框 */}
          {configs['site.searchBoxEnabled'] === 'true' && (viewMode === 'edit' || configs['site.searchBoxGuestEnabled'] === 'true') && (
            <Box sx={{ mb: 4, maxWidth: 600, mx: 'auto', mt: 2 }}>
              <SearchBox groups={groups} sites={groups.flatMap(g => g.sites || [])} />
            </Box>
          )}

          {/* 主内容 */}
          {loading ? (
            <Box sx={{ display: 'grid', placeItems: 'center', minHeight: 400 }}>
              <CircularProgress />
            </Box>
          ) : (
            groups
              // 只筛选当前选中的 Tab 对应的分组
              .filter(g => g.id === selectedTab)
              .map(group => (
                <Box key={group.id} id={`group-${group.id}`}>
                  {/* 💡 隐藏 Group 标题已通过 GroupCard 组件内部修改实现 */}
                  <GroupCard
                    group={group}
                    sortMode={sortMode === SortMode.SiteSort && currentSortingGroupId === group.id ? 'SiteSort' : 'None'}
                    currentSortingGroupId={currentSortingGroupId}
                    viewMode={viewMode}
                    onUpdate={async (site) => { if (site.id) await api.updateSite(site.id, site); await fetchData(); }}
                    onDelete={async (id) => { await api.deleteSite(id); await fetchData(); }}
                    onSaveSiteOrder={async (gid, sites) => {
                      const orders = sites.map((s, i) => ({ id: s.id!, order_num: i }));
                      await api.updateSiteOrder(orders);
                      await fetchData();
                      setSortMode(SortMode.None);
                    }}
                    onStartSiteSort={() => {
                      setSortMode(SortMode.SiteSort);
                      setCurrentSortingGroupId(group.id!);
                    }}
                    onAddSite={(gid) => {
                      setNewSite({ ...newSite, group_id: gid, order_num: (group.sites?.length || 0) + 1 });
                      setOpenAddSite(true);
                    }}
                    onUpdateGroup={async (g) => { if (g.id) await api.updateGroup(g.id, g); await fetchData(); }}
                    onDeleteGroup={async (id) => { await api.deleteGroup(id); await fetchData(); }}
                    configs={configs}
                  />
                </Box>
              ))
          )}
        </Container>

        {/* 右上角菜单 */}
        <Menu anchorEl={menuAnchorEl} open={Boolean(menuAnchorEl)} onClose={() => setMenuAnchorEl(null)}>
          <MenuItem onClick={() => { setSortMode(SortMode.GroupSort); setMenuAnchorEl(null); }}>
            <ListItemIcon><SortIcon /></ListItemIcon>编辑分组排序
          </MenuItem>
          <MenuItem onClick={() => { setOpenConfig(true); setMenuAnchorEl(null); }}>
            <ListItemIcon><SettingsIcon /></ListItemIcon>网站设置
          </MenuItem>
          <Divider />
          <MenuItem onClick={() => { handleExportData(); setMenuAnchorEl(null); }}>
            <ListItemIcon><FileDownloadIcon /></ListItemIcon>导出数据
          </MenuItem>
          <MenuItem onClick={() => { setOpenImport(true); setMenuAnchorEl(null); }}>
            <ListItemIcon><FileUploadIcon /></ListItemIcon>导入数据
          </MenuItem>
          {isAuthenticated && (
            <>
              <Divider />
              {/* 💡 退出登录：图标已移除，但保留空的 ListItemIcon 保持对齐 */}
              <MenuItem onClick={handleLogout} sx={{ color: 'error.main' }}>
                <ListItemIcon sx={{ color: 'error.main' }}></ListItemIcon>
                <ListItemText>退出登录</ListItemText>
              </MenuItem>
            </>
          )}
        </Menu>

        {/* 新增分组对话框 */}
        <Dialog open={openAddGroup} onClose={() => setOpenAddGroup(false)} maxWidth="sm" fullWidth>
          <DialogTitle>新增分组 <IconButton onClick={() => setOpenAddGroup(false)} sx={{ position: 'absolute', right: 8, top: 8 }}><CloseIcon /></IconButton></DialogTitle>
          <DialogContent>
            <TextField autoFocus fullWidth label="分组名称" value={newGroup.name || ''} onChange={e => setNewGroup({ ...newGroup, name: e.target.value })} sx={{ mt: 2 }} />
            <FormControlLabel control={<Switch checked={newGroup.is_public === 1} onChange={e => setNewGroup({ ...newGroup, is_public: e.target.checked ? 1 : 0 })} />} label="公开分组" />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenAddGroup(false)}>取消</Button>
            <Button variant="contained" onClick={handleCreateGroup}>创建</Button>
          </DialogActions>
        </Dialog>

        {/* 新增站点对话框（保持你原来的完整逻辑） */}
        <Dialog open={openAddSite} onClose={() => setOpenAddSite(false)} maxWidth="md" fullWidth>
          <DialogTitle>新增站点 <IconButton onClick={() => setOpenAddSite(false)} sx={{ position: 'absolute', right: 8, top: 8 }}><CloseIcon /></IconButton></DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 2 }}>
              <TextField label="站点名称" value={newSite.name || ''} onChange={e => setNewSite({ ...newSite, name: e.target.value })} fullWidth />
              <TextField label="站点URL" value={newSite.url || ''} onChange={e => setNewSite({ ...newSite, url: e.target.value })} fullWidth />
              <TextField
                label="图标URL（可留空自动获取）"
                value={newSite.icon || ''}
                onChange={e => setNewSite({ ...newSite, icon: e.target.value })}
                fullWidth
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => {
                        if (newSite.url) {
                          const domain = extractDomain(newSite.url);
                          if (domain) {
                            const iconUrl = (configs['site.iconApi'] || 'https://www.faviconextractor.com/favicon/{domain}?larger=true').replace('{domain}', domain);
                            setNewSite({ ...newSite, icon: iconUrl });
                          }
                        }
                      }}>
                        <AutoFixHighIcon />
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
              <TextField label="描述" value={newSite.description || ''} onChange={e => setNewSite({ ...newSite, description: e.target.value })} fullWidth />
              <FormControlLabel control={<Switch checked={newSite.is_public === 1} onChange={e => setNewSite({ ...newSite, is_public: e.target.checked ? 1 : 0 })} />} label="公开站点" />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenAddSite(false)}>取消</Button>
            <Button variant="contained" onClick={handleCreateSite}>创建</Button>
          </DialogActions>
        </Dialog>

        {/* 网站设置对话框（保持完整） */}
        <Dialog open={openConfig} onClose={() => setOpenConfig(false)} maxWidth="sm" fullWidth>
          <DialogTitle>网站设置 <IconButton onClick={() => setOpenConfig(false)} sx={{ position: 'absolute', right: 8, top: 8 }}><CloseIcon /></IconButton></DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 2 }}>
              <TextField label="网站标题" name="site.title" value={tempConfigs['site.title']} onChange={e => setTempConfigs({ ...tempConfigs, [e.target.name]: e.target.value })} />
              <TextField label="网站名称" name="site.name" value={tempConfigs['site.name']} onChange={e => setTempConfigs({ ...tempConfigs, [e.target.name]: e.target.value })} />
              <TextField label="背景图片URL" name="site.backgroundImage" value={tempConfigs['site.backgroundImage']} onChange={e => setTempConfigs({ ...tempConfigs, [e.target.name]: e.target.value })} />
              <Box>
                <Typography>背景透明度: {Number(tempConfigs['site.backgroundOpacity']).toFixed(2)}</Typography>
                <Slider
                  value={Number(tempConfigs['site.backgroundOpacity'])}
                  onChange={(_, v) => setTempConfigs({ ...tempConfigs, 'site.backgroundOpacity': String(v) })}
                  step={0.01}
                  min={0}
                  max={1}
                />
              </Box>
              <TextField label="自定义CSS" name="site.customCss" value={tempConfigs['site.customCss']} onChange={e => setTempConfigs({ ...tempConfigs, [e.target.name]: e.target.value })} multiline rows={6} />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenConfig(false)}>取消</Button>
            <Button variant="contained" onClick={handleSaveConfig}>保存</Button>
          </DialogActions>
        </Dialog>

        {/* GitHub 角标 */}
        <Box sx={{ position: 'fixed', bottom: 16, right: 16, zIndex: 10 }}>
          <Paper component="a" href="https://github.com/zqq-nuli/Navihive" target="_blank" elevation={3} sx={{ p: 1.5, borderRadius: 10, bgcolor: 'background.paper', '&:hover': { bgcolor: 'action.hover' } }}>
            <GitHubIcon />
          </Paper>
        </Box>
      </Box>
    </ThemeProvider>
  );
}
