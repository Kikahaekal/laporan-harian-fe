import * as React from 'react';
import { 
  AppBar, Box, Toolbar, Typography, IconButton, 
  Drawer, List, ListItem, ListItemButton, ListItemText, ListItemIcon,
  MenuItem, Menu, Divider
} from '@mui/material';
import {
  Menu as MenuIcon,
  AccountCircle,
  Dashboard as DashboardIcon,
  Assessment as LaporanIcon,
  History as RekapIcon,
  Person as PersonIcon,
  Logout as LogoutIcon
} from '@mui/icons-material';
import { useLocation, useNavigate } from 'react-router';
import { useAuth } from "~/context/AuthContext"; 

export default function MenuAppBar() {
  const location = useLocation();
  const navigate = useNavigate();
  
  const { logout, user } = useAuth(); 

  const [isDrawerOpen, setIsDrawerOpen] = React.useState<boolean>(false);
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);

  const menuConfig: Record<string, { title: string; icon: React.ReactNode }> = {
    '/': { title: 'Dashboard', icon: <DashboardIcon /> },
    '/laporan': { title: 'Laporan', icon: <LaporanIcon /> },
    '/rekap': { title: 'Rekap', icon: <RekapIcon /> },
  };

  const currentPath = Object.keys(menuConfig).find(path => 
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path)
  );

  const pageTitle = currentPath ? menuConfig[currentPath].title : 'Dashboard';

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    handleClose();
    await logout();
  };

  const handlePageChange = (path: string) => {
    navigate(path);
    setIsDrawerOpen(false);
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static">
        <Toolbar>
          <IconButton
            size="large"
            edge="start"
            color="inherit"
            aria-label="menu"
            sx={{ mr: 2 }}
            onClick={() => setIsDrawerOpen(true)}
          >
            <MenuIcon />
          </IconButton>
          
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            {pageTitle}
          </Typography>

          <div>
            <IconButton
              size="large"
              aria-label="account of current user"
              onClick={handleMenu}
              color="inherit"
            >
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
                <ListItemIcon>
                  <PersonIcon fontSize="small" />
                </ListItemIcon>
                Profile ({user?.name}) 
              </MenuItem>
              <Divider />
              
              <MenuItem onClick={handleLogout} sx={{ color: 'error.main' }}>
                <ListItemIcon sx={{ color: 'error.main' }}>
                  <LogoutIcon fontSize="small" />
                </ListItemIcon>
                Logout
              </MenuItem>
            </Menu>
          </div>
        </Toolbar>
      </AppBar>

      <Drawer
        anchor="left"
        open={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
      >
        <Box sx={{ width: 250 }} role="presentation">
          <List>
            {Object.entries(menuConfig).map(([path, { title, icon }]) => (
              <ListItem key={path} disablePadding>
                <ListItemButton 
                  onClick={() => handlePageChange(path)}
                  selected={location.pathname === path}
                >
                  <ListItemIcon>
                    {icon}
                  </ListItemIcon>
                  <ListItemText primary={title} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Box>
      </Drawer>
    </Box>
  );
}