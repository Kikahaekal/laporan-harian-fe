import * as React from 'react';
import {
  AppBar, Box, Toolbar, Typography, IconButton,
  Drawer, List, ListItem, ListItemButton, ListItemText, ListItemIcon,
  MenuItem, Menu, Divider, ListSubheader
} from '@mui/material';
import {
  Menu as MenuIcon,
  AccountCircle,
  Dashboard as DashboardIcon,
  Assessment as LaporanIcon,
  BarChart as KanvasIcon,
  ReceiptLong as MonitoringIcon,
  Person as PersonIcon,
  Logout as LogoutIcon,
  Category as CategoryIcon,
  Store as StoreIcon,
  ManageAccounts as ManageAccountsIcon,
} from '@mui/icons-material';
import { useLocation, useNavigate } from 'react-router';
import { useAuth } from "~/context/AuthContext";

export default function MenuAppBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, user } = useAuth();

  const [isDrawerOpen, setIsDrawerOpen] = React.useState<boolean>(false);
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);

  // ── Kanvas — monitoring transaksi Android ──
  const menuKanvas: Record<string, { title: string; icon: React.ReactNode }> = {
    '/rekap-be': { title: 'Rekap Kanvas', icon: <KanvasIcon color="secondary" /> },
  };


  // ── Laporan Manual ──
  const menuLaporan: Record<string, { title: string; icon: React.ReactNode }> = {
    '/': { title: 'Dashboard', icon: <DashboardIcon /> },
    '/laporan': { title: 'Laporan & Monitor', icon: <LaporanIcon /> },
  };


  // ── Data Master ──
  const masterDataConfig: Record<string, { title: string; icon: React.ReactNode }> = {
    '/outlet': { title: 'Outlet', icon: <StoreIcon /> },
    '/item': { title: 'Item / Barang', icon: <CategoryIcon /> },
    '/users': { title: 'Pengguna', icon: <ManageAccountsIcon /> },
  };

  const allMenus = { ...menuLaporan, ...menuKanvas, ...masterDataConfig };
  const currentPath = Object.keys(allMenus).find((path) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path)
  );
  const pageTitle = currentPath ? allMenus[currentPath].title : 'Dashboard';

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => setAnchorEl(event.currentTarget);
  const handleClose = () => setAnchorEl(null);
  const handleLogout = async () => { handleClose(); await logout(); };
  const handlePageChange = (path: string) => { navigate(path); setIsDrawerOpen(false); };

  const renderMenuList = (config: Record<string, { title: string; icon: React.ReactNode }>) =>
    Object.entries(config).map(([path, { title, icon }]) => (
      <ListItem key={path} disablePadding>
        <ListItemButton
          onClick={() => handlePageChange(path)}
          selected={path === '/' ? location.pathname === '/' : location.pathname.startsWith(path)}
        >
          <ListItemIcon>{icon}</ListItemIcon>
          <ListItemText primary={title} />
        </ListItemButton>
      </ListItem>
    ));

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static">
        <Toolbar>
          <IconButton size="large" edge="start" color="inherit" aria-label="menu" sx={{ mr: 2 }} onClick={() => setIsDrawerOpen(true)}>
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>{pageTitle}</Typography>
          <div>
            <IconButton size="large" aria-label="account" onClick={handleMenu} color="inherit">
              <AccountCircle />
            </IconButton>
            <Menu
              anchorEl={anchorEl}
              anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
              keepMounted
              transformOrigin={{ vertical: 'top', horizontal: 'right' }}
              open={Boolean(anchorEl)}
              onClose={handleClose}
            >
              <MenuItem onClick={handleClose}>
                <ListItemIcon><PersonIcon fontSize="small" /></ListItemIcon>
                Profile ({user?.name})
              </MenuItem>
              <Divider />
              <MenuItem onClick={handleLogout} sx={{ color: 'error.main' }}>
                <ListItemIcon sx={{ color: 'error.main' }}><LogoutIcon fontSize="small" /></ListItemIcon>
                Logout
              </MenuItem>
            </Menu>
          </div>
        </Toolbar>
      </AppBar>

      <Drawer anchor="left" open={isDrawerOpen} onClose={() => setIsDrawerOpen(false)}>
        <Box sx={{ width: 260 }} role="presentation">
          <List subheader={<ListSubheader>Umum</ListSubheader>}>
            {renderMenuList(menuLaporan)}
          </List>
          <Divider />
          <List subheader={<ListSubheader>Kanvas</ListSubheader>}>
            {renderMenuList(menuKanvas)}
          </List>
          <Divider />
          <List subheader={<ListSubheader>Data Master</ListSubheader>}>
            {renderMenuList(masterDataConfig)}
          </List>
        </Box>
      </Drawer>
    </Box>
  );
}