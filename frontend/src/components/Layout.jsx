import { Box, Drawer, AppBar, Toolbar, Typography, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Avatar, IconButton, Divider } from '@mui/material';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import BugReportIcon from '@mui/icons-material/BugReport';
import NewReleasesIcon from '@mui/icons-material/NewReleases';
import LogoutIcon from '@mui/icons-material/Logout';
import { supabase } from '../lib/supabase';

const drawerWidth = 240;

export default function Layout({ session }) {
    const navigate = useNavigate();
    const location = useLocation();
    const user = session?.user;

    const handleLogout = async () => {
        await supabase.auth.signOut();
    };

    const menuItems = [
        { text: '이슈 목록', path: '/issues', icon: <BugReportIcon /> },
        { text: '버전 관리', path: '/versions', icon: <NewReleasesIcon /> },
    ];

    return (
        <Box sx={{ display: 'flex' }}>
            {/* 1. 상단 헤더 (Top Bar) */}
            <AppBar position="fixed" sx={{ width: `calc(100% - ${drawerWidth}px)`, ml: `${drawerWidth}px`, bgcolor: '#1976d2' }}>
                <Toolbar>
                    <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1, fontWeight: 'bold' }}>
                        QC-SYSTEM
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar src={user?.user_metadata?.avatar_url} sx={{ width: 32, height: 32 }} />
                        <Typography variant="body2">{user?.user_metadata?.full_name}님</Typography>
                        <IconButton color="inherit" onClick={handleLogout} title="로그아웃">
                            <LogoutIcon />
                        </IconButton>
                    </Box>
                </Toolbar>
            </AppBar>

            {/* 2. 좌측 고정 메뉴 (Side Menu) */}
            <Drawer
                sx={{
                    width: drawerWidth,
                    flexShrink: 0,
                    '& .MuiDrawer-paper': { width: drawerWidth, boxSizing: 'border-box', bgcolor: '#f8f9fa' },
                }}
                variant="permanent"
                anchor="left"
            >
                <Toolbar sx={{ justifyContent: 'center' }}>
                    <Typography variant="h6" fontWeight="bold" color="primary">
                        MENU
                    </Typography>
                </Toolbar>
                <Divider />
                <List>
                    {menuItems.map((item) => (
                        <ListItem key={item.text} disablePadding>
                            <ListItemButton
                                onClick={() => navigate(item.path)}
                                selected={location.pathname === item.path}
                                sx={{ '&.Mui-selected': { bgcolor: '#e3f2fd' } }}
                            >
                                <ListItemIcon sx={{ color: location.pathname === item.path ? '#1976d2' : 'inherit' }}>
                                    {item.icon}
                                </ListItemIcon>
                                <ListItemText primary={item.text} sx={{ color: location.pathname === item.path ? '#1976d2' : 'inherit' }} />
                            </ListItemButton>
                        </ListItem>
                    ))}
                </List>
            </Drawer>

            {/* 3. 중앙 작업 공간 (메뉴를 누를 때마다 이 안의 내용(Outlet)만 바뀝니다) */}
            <Box component="main" sx={{ flexGrow: 1, bgcolor: '#f5f5f5', p: 3, minHeight: '100vh', width: `calc(100vw - ${drawerWidth}px)`, overflowX: 'hidden' }}>
                <Toolbar /> {/* 상단 헤더 높이만큼 여백 확보 */}
                <Outlet />
            </Box>
        </Box>
    );
}