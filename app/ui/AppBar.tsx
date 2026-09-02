import * as React from 'react';
import {
  Menu, UserCircle, LayoutDashboard, FileText, BarChart2,
  User, LogOut, Tags, Store, Users, Wallet, X
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router';
import { useAuth } from "~/context/AuthContext";

export default function MenuAppBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, user, isAdmin } = useAuth();

  const [isDrawerOpen, setIsDrawerOpen] = React.useState<boolean>(false);
  const [isProfileOpen, setIsProfileOpen] = React.useState<boolean>(false);

  // ── Kanvas — monitoring transaksi Android ──
  const menuKanvas: Record<string, { title: string; icon: React.ReactNode }> = {
    '/rekap-be': { title: 'Rekap Kanvas', icon: <BarChart2 className="w-5 h-5 text-indigo-500" /> },
  };

  // ── Laporan Manual ──
  const menuLaporan: Record<string, { title: string; icon: React.ReactNode }> = {
    '/': { title: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5 text-gray-500" /> },
    '/laporan': { title: 'Laporan & Monitor', icon: <FileText className="w-5 h-5 text-emerald-500" /> },
  };

  // ── Data Master ──
  const masterDataConfigFull: Record<string, { title: string; icon: React.ReactNode; adminOnly?: boolean }> = {
    '/outlet': { title: 'Outlet', icon: <Store className="w-5 h-5 text-orange-500" /> },
    '/item': { title: 'Item / Barang', icon: <Tags className="w-5 h-5 text-blue-500" /> },
    '/tagihan': { title: 'Tagihan', icon: <Wallet className="w-5 h-5 text-red-500" />, adminOnly: true },
    '/users': { title: 'Pengguna', icon: <Users className="w-5 h-5 text-purple-500" />, adminOnly: true },
  };
  
  const masterDataConfig = Object.fromEntries(
    Object.entries(masterDataConfigFull).filter(([, v]) => isAdmin || !v.adminOnly)
  );

  const allMenus = { ...menuLaporan, ...menuKanvas, ...masterDataConfig };
  const currentPath = Object.keys(allMenus).find((path) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path)
  );
  const pageTitle = currentPath ? allMenus[currentPath as keyof typeof allMenus].title : 'Dashboard';

  const handleLogout = async () => { setIsProfileOpen(false); await logout(); };
  const handlePageChange = (path: string) => { navigate(path); setIsDrawerOpen(false); };

  const renderMenuList = (config: Record<string, { title: string; icon: React.ReactNode }>) =>
    Object.entries(config).map(([path, { title, icon }]) => {
      const isActive = path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);
      return (
        <li key={path}>
          <button
            onClick={() => handlePageChange(path)}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
              isActive ? "bg-emerald-50 text-emerald-700 font-medium" : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            {icon}
            <span>{title}</span>
          </button>
        </li>
      );
    });

  return (
    <>
      {/* HEADER */}
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-40">
        <div className="flex items-center justify-between px-4 h-16">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsDrawerOpen(true)}
              className="p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors focus:outline-none"
            >
              <Menu className="w-6 h-6" />
            </button>
            <h1 className="text-lg font-semibold text-gray-800">{pageTitle}</h1>
          </div>
          
          <div className="relative">
            <button
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="flex items-center gap-2 p-1.5 rounded-full hover:bg-gray-100 transition-colors focus:outline-none"
            >
              <UserCircle className="w-7 h-7 text-gray-600" />
            </button>
            
            {/* PROFILE DROPDOWN */}
            {isProfileOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsProfileOpen(false)}></div>
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50 overflow-hidden">
                  <div className="px-4 py-2.5 border-b border-gray-50 flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-400" />
                    <span className="text-sm font-medium text-gray-700 truncate">
                      {user?.name}
                    </span>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Logout</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* SIDEBAR BACKDROP */}
      {isDrawerOpen && (
        <div 
          className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50 transition-opacity"
          onClick={() => setIsDrawerOpen(false)}
        ></div>
      )}

      {/* SIDEBAR DRAWER */}
      <aside 
        className={`fixed inset-y-0 left-0 w-72 bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col ${
          isDrawerOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="h-16 flex items-center justify-between px-4 border-b border-gray-100">
          <span className="font-bold text-lg text-emerald-700">POS Distributor</span>
          <button 
            onClick={() => setIsDrawerOpen(false)}
            className="p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
          <div>
            <h3 className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Umum</h3>
            <ul className="space-y-1">
              {renderMenuList(menuLaporan)}
            </ul>
          </div>
          
          <div>
            <h3 className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Kanvas</h3>
            <ul className="space-y-1">
              {renderMenuList(menuKanvas)}
            </ul>
          </div>
          
          <div>
            <h3 className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Data Master</h3>
            <ul className="space-y-1">
              {renderMenuList(masterDataConfig)}
            </ul>
          </div>
        </div>
      </aside>
    </>
  );
}