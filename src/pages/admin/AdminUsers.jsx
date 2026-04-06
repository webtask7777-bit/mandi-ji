import { useState, useEffect } from 'react';
import { Search, Shield, ShieldOff, UserCheck, UserX } from 'lucide-react';
import { apiFetchAuth, apiPut } from '../../api/client';
import { useToast } from '../../context/ToastContext';

function formatDate(isoStr) {
  if (!isoStr) return '-';
  try {
    return new Date(isoStr).toLocaleDateString('hi-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return isoStr;
  }
}

export default function AdminUsers() {
  const toast = useToast();
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  function loadUsers() {
    setLoading(true);
    apiFetchAuth('/admin/users')
      .then(data => { setUsers(data); setError(''); })
      .catch(err => setError(err.message || 'उपयोगकर्ता लोड करने में विफल'))
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadUsers(); }, []);

  async function toggleRole(user) {
    const newRole = user.role === 'admin' ? 'user' : 'admin';
    try {
      const updated = await apiPut(`/admin/users/${user.id}/role`, { role: newRole });
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, ...updated } : u));
      toast.success('भूमिका अपडेट हो गई');
    } catch (err) {
      toast.error(err.message || 'भूमिका बदलने में विफल');
    }
  }

  async function toggleStatus(user) {
    const newStatus = user.status === 'suspended' ? 'active' : 'suspended';
    try {
      const updated = await apiPut(`/admin/users/${user.id}/status`, { status: newStatus });
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, ...updated } : u));
      toast.success(newStatus === 'suspended' ? 'उपयोगकर्ता निलंबित' : 'उपयोगकर्ता सक्रिय');
    } catch (err) {
      toast.error(err.message || 'स्टेटस बदलने में विफल');
    }
  }

  const filtered = users.filter(u => {
    if (!search) return true;
    const q = search.toLowerCase();
    return u.name?.toLowerCase().includes(q) || u.phone?.includes(q) || u.email?.toLowerCase().includes(q);
  });

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="text-sm text-zinc-400 animate-pulse">लोड हो रहा है...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2">
        <Search size={14} className="text-zinc-500 shrink-0" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="उपयोगकर्ता खोजें (नाम, फ़ोन)..."
          className="bg-transparent text-sm text-foreground w-full outline-none placeholder:text-zinc-600"
        />
      </div>

      {error && (
        <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      {/* User Count */}
      <div className="text-xs text-zinc-500">
        {filtered.length} उपयोगकर्ता {search && `(खोज: "${search}")`}
      </div>

      {/* User List */}
      <div className="space-y-2">
        {filtered.map(user => (
          <div
            key={user.id}
            className={`bg-zinc-900 border rounded-xl px-4 py-3 ${
              user.status === 'suspended' ? 'border-red-500/20 opacity-60' : 'border-zinc-800'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-sm font-semibold text-foreground truncate">{user.name}</span>
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                    user.role === 'admin'
                      ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                      : 'bg-zinc-800 text-zinc-400'
                  }`}>
                    {user.role === 'admin' ? 'एडमिन' : 'उपयोगकर्ता'}
                  </span>
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                    user.kycStatus === 'verified'
                      ? 'bg-green-500/15 text-green-400 border border-green-500/30'
                      : 'bg-zinc-800 text-zinc-500'
                  }`}>
                    KYC: {user.kycStatus === 'verified' ? 'सत्यापित' : 'अनपूर्ण'}
                  </span>
                </div>
                <div className="text-[11px] text-zinc-500">
                  {user.phone} &middot; {formatDate(user.createdAt)}
                </div>
                {user.status === 'suspended' && (
                  <div className="text-[10px] text-red-400 mt-0.5">निलंबित</div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => toggleRole(user)}
                  title={user.role === 'admin' ? 'उपयोगकर्ता बनाएं' : 'एडमिन बनाएं'}
                  className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                    user.role === 'admin'
                      ? 'bg-amber-500/15 text-amber-400 hover:bg-amber-500/25'
                      : 'bg-zinc-800 text-zinc-500 hover:bg-zinc-700'
                  }`}
                >
                  {user.role === 'admin' ? <ShieldOff size={12} /> : <Shield size={12} />}
                </button>
                <button
                  onClick={() => toggleStatus(user)}
                  title={user.status === 'suspended' ? 'सक्रिय करें' : 'निलंबित करें'}
                  className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                    user.status === 'suspended'
                      ? 'bg-green-500/15 text-green-400 hover:bg-green-500/25'
                      : 'bg-zinc-800 text-zinc-500 hover:text-red-400 hover:bg-red-500/10'
                  }`}
                >
                  {user.status === 'suspended' ? <UserCheck size={12} /> : <UserX size={12} />}
                </button>
              </div>
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="text-center py-8 text-sm text-zinc-500">
            कोई उपयोगकर्ता नहीं मिला
          </div>
        )}
      </div>
    </div>
  );
}
