import { NavLink, Routes, Route, Navigate } from 'react-router-dom';
import { LogOut, Leaf } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import AdminDashboard from './AdminDashboard';
import AdminUsers from './AdminUsers';
import AdminListings from './AdminListings';
import AdminEwayBills from './AdminEwayBills';
import AdminAnalytics from './AdminAnalytics';
import AdminPages from './AdminPages';
import AdminBlog from './AdminBlog';
import AdminBanners from './AdminBanners';
import AdminCropInfo from './AdminCropInfo';
import AdminNotifications from './AdminNotifications';

const NAV_TABS = [
  { path: '', label: 'डैशबोर्ड', end: true },
  { path: 'users', label: 'उपयोगकर्ता' },
  { path: 'listings', label: 'लिस्टिंग' },
  { path: 'eway-bills', label: 'E-way Bills' },
  { path: 'analytics', label: 'एनालिटिक्स' },
  { path: 'pages', label: 'पेज' },
  { path: 'blog', label: 'ब्लॉग' },
  { path: 'banners', label: 'बैनर' },
  { path: 'crop-info', label: 'फसल जानकारी' },
  { path: 'notifications', label: 'सूचनाएं' },
];

export default function AdminLayout() {
  const { logout } = useAuth();

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-zinc-950 border-b border-zinc-800">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-green-500 flex items-center justify-center">
              <Leaf size={16} className="text-green-950" strokeWidth={2.5} />
            </div>
            <div>
              <div className="text-sm font-extrabold tracking-tight">
                मंडी<span className="text-amber-500">जी</span>{' '}
                <span className="text-xs font-normal text-zinc-500">Admin</span>
              </div>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-400 hover:text-red-400 hover:border-red-500/30 transition-colors"
          >
            <LogOut size={12} />
            लॉग आउट
          </button>
        </div>

        {/* Nav Tabs */}
        <div className="flex overflow-x-auto px-4 gap-1 pb-2 scrollbar-thin">
          {NAV_TABS.map(tab => (
            <NavLink
              key={tab.path}
              to={tab.path}
              end={tab.end}
              className={({ isActive }) =>
                `flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-green-500 text-green-950 font-bold'
                    : 'bg-zinc-900 text-zinc-400 hover:text-foreground hover:bg-zinc-800'
                }`
              }
            >
              {tab.label}
            </NavLink>
          ))}
        </div>
      </header>

      {/* Content */}
      <main className="p-4">
        <Routes>
          <Route index element={<AdminDashboard />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="listings" element={<AdminListings />} />
          <Route path="eway-bills" element={<AdminEwayBills />} />
          <Route path="analytics" element={<AdminAnalytics />} />
          <Route path="pages" element={<AdminPages />} />
          <Route path="blog" element={<AdminBlog />} />
          <Route path="banners" element={<AdminBanners />} />
          <Route path="crop-info" element={<AdminCropInfo />} />
          <Route path="notifications" element={<AdminNotifications />} />
          <Route path="*" element={<Navigate to="" replace />} />
        </Routes>
      </main>
    </div>
  );
}
