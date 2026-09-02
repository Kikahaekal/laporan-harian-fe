import { useState, useEffect, useCallback } from "react";
import {
  Users as UsersIcon,
  Plus,
  Search,
  Edit2,
  Trash2,
  Store,
  Link2Off,
  Eye,
  EyeOff,
  X,
  AlertCircle,
  CheckCircle,
  Loader2,
  Info
} from "lucide-react";
import apiBe from "../../lib/axiosBe";
import { TableRowsSkeleton } from "../../components/TableSkeleton";
import { Pagination } from "../../components/Pagination";

interface UserData {
  id: number;
  name: string;
  email: string;
  role?: string;
}

interface OutletSimple {
  id: number;
  code: string;
  name: string;
}

const ROLES = ["admin", "sales"];
const EMPTY_FORM = { name: "", email: "", password: "", role: "sales" };

// ─── Component: Dialog Modal ─────────────────────────────────────────────────
function Modal({ open, onClose, title, children, actions }: { open: boolean; onClose: () => void; title: React.ReactNode; children: React.ReactNode; actions?: React.ReactNode }) {
  if (!open) return null;
  return (
    <>
      <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-[100]" onClick={onClose} />
      <div className="fixed inset-0 z-[101] flex items-center justify-center p-4 pointer-events-none">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md pointer-events-auto flex flex-col max-h-full">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div className="font-bold text-gray-900 text-lg flex items-center gap-2">{title}</div>
            <button onClick={onClose} className="text-gray-400 hover:bg-gray-100 hover:text-gray-600 rounded-full p-1.5 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="p-5 overflow-y-auto">
            {children}
          </div>
          {actions && (
            <div className="px-5 py-4 border-t border-gray-100 flex justify-end gap-2 bg-gray-50/50 rounded-b-2xl">
              {actions}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ─── Component: Toast Notification ───────────────────────────────────────────
function Toast({ open, msg, type, onClose }: { open: boolean; msg: string; type: "success" | "error"; onClose: () => void }) {
  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => onClose(), 3000);
      return () => clearTimeout(timer);
    }
  }, [open, onClose]);
  
  if (!open) return null;
  const isError = type === "error";
  
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[200] animate-in fade-in slide-in-from-bottom-4">
      <div className={`flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg border ${isError ? 'bg-red-50 border-red-200 text-red-800' : 'bg-emerald-50 border-emerald-200 text-emerald-800'}`}>
        {isError ? <AlertCircle className="w-5 h-5 flex-shrink-0" /> : <CheckCircle className="w-5 h-5 flex-shrink-0" />}
        <span className="text-sm font-medium">{msg}</span>
        <button onClick={onClose} className={`ml-2 p-1 rounded-full ${isError ? 'hover:bg-red-100' : 'hover:bg-emerald-100'}`}>
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export default function Users() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [open, setOpen] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  // ── Assign Outlet state ────────────────────────────────────────────────────
  const [outletDialogUser, setOutletDialogUser] = useState<UserData | null>(null);
  const [allOutlets, setAllOutlets] = useState<OutletSimple[]>([]);
  const [userOutlets, setUserOutlets] = useState<OutletSimple[]>([]);
  const [selectedOutletIds, setSelectedOutletIds] = useState<Set<number>>(new Set());
  const [outletLoading, setOutletLoading] = useState(false);

  const [snack, setSnack] = useState<{ open: boolean; msg: string; severity: "success" | "error" }>({
    open: false, msg: "", severity: "success",
  });
  const showSnack = (msg: string, severity: "success" | "error" = "success") =>
    setSnack({ open: true, msg, severity });

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await apiBe.get("/api/web/users");
      const raw = res.data;
      setUsers(Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : []);
    } catch {
      showSnack("Gagal memuat data pengguna.", "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchAllOutlets = async () => {
    try {
      const res = await apiBe.get("/api/web/outlets");
      const raw = res.data;
      setAllOutlets(Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : []);
    } catch { /* silent */ }
  };

  const fetchUserOutlets = useCallback(async (userId: number) => {
    try {
      setOutletLoading(true);
      const res = await apiBe.get(`/api/web/outlets?user_id=${userId}`);
      const raw = res.data;
      setUserOutlets(Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : []);
    } catch {
      showSnack("Gagal memuat outlet user.", "error");
    } finally {
      setOutletLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsers(); fetchAllOutlets(); }, []);

  const filtered = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginatedUsers = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  // ── User CRUD ──────────────────────────────────────────────────────────────
  const handleOpenAdd = () => {
    setIsEdit(false);
    setFormData({ ...EMPTY_FORM });
    setShowPw(false);
    setOpen(true);
  };

  const handleOpenEdit = (user: UserData) => {
    setIsEdit(true);
    setEditId(user.id);
    setFormData({ name: user.name, email: user.email, password: "", role: user.role ?? "sales" });
    setShowPw(false);
    setOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.email) {
      showSnack("Nama dan email wajib diisi!", "error");
      return;
    }
    if (!isEdit && !formData.password) {
      showSnack("Password wajib diisi untuk pengguna baru!", "error");
      return;
    }
    setSaving(true);
    try {
      const payload: Record<string, string> = {
        name: formData.name,
        email: formData.email,
        role: formData.role,
      };
      if (formData.password) payload.password = formData.password;

      if (isEdit && editId) {
        await apiBe.put(`/api/web/users/${editId}`, payload);
      } else {
        await apiBe.post("/api/web/users", payload);
      }
      await fetchUsers();
      setOpen(false);
      showSnack(isEdit ? "Pengguna berhasil diperbarui." : "Pengguna berhasil ditambahkan.");
    } catch (err: any) {
      showSnack(err.response?.data?.message || "Gagal menyimpan pengguna.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await apiBe.delete(`/api/web/users/${deleteId}`);
      await fetchUsers();
      setDeleteId(null);
      showSnack("Pengguna berhasil dihapus.");
    } catch {
      showSnack("Gagal menghapus pengguna.", "error");
    } finally {
      setDeleting(false);
    }
  };

  // ── Assign/Unassign Outlet ─────────────────────────────────────────────────
  const openOutletDialog = (user: UserData) => {
    setOutletDialogUser(user);
    setSelectedOutletIds(new Set());
    fetchUserOutlets(user.id);
  };

  const handleAssignOutlet = async () => {
    if (!outletDialogUser || selectedOutletIds.size === 0) return;
    
    try {
      await apiBe.post(`/api/web/users/${outletDialogUser.id}/outlets/bulk-assign`, {
        outlet_ids: Array.from(selectedOutletIds),
      });
      setSelectedOutletIds(new Set());
      await fetchUserOutlets(outletDialogUser.id);
      showSnack(`${selectedOutletIds.size} outlet berhasil di-assign.`);
    } catch (err: any) {
      showSnack(err.response?.data?.message || "Gagal assign outlet.", "error");
    }
  };

  const handleUnassignOutlet = async (outlet: OutletSimple) => {
    if (!outletDialogUser) return;
    try {
      await apiBe.delete(`/api/web/users/${outletDialogUser.id}/outlets/${outlet.id}`);
      fetchUserOutlets(outletDialogUser.id);
      showSnack(`Outlet "${outlet.name}" berhasil di-unassign.`);
    } catch {
      showSnack("Gagal unassign outlet.", "error");
    }
  };

  // Outlet yang belum di-assign ke user ini
  const availableOutlets = allOutlets.filter(
    (o) => !userOutlets.some((uo) => uo.id === o.id)
  );

  const deleteTarget = users.find((u) => u.id === deleteId);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-100 rounded-xl text-emerald-600">
            <UsersIcon className="w-6 h-6" />
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-gray-900">Manajemen Pengguna</h1>
            <span className="px-2.5 py-1 bg-gray-100 border border-gray-200 text-gray-700 rounded-lg text-xs font-semibold shadow-sm">
              {users.length} user
            </span>
          </div>
        </div>
        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-medium transition-colors shadow-sm w-full sm:w-auto justify-center"
        >
          <Plus className="w-5 h-5" /> Tambah Pengguna
        </button>
      </div>

      <div className="flex items-start gap-2 p-3 sm:p-4 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-100">
        <Info className="w-5 h-5 flex-shrink-0 mt-0.5" />
        <p className="text-sm">
          Pengguna yang ditambahkan di sini dapat login ke <strong>Aplikasi Android</strong> sebagai akun sales.
          Klik tombol ikon <Store className="w-4 h-4 inline mx-1" /> untuk mengatur outlet milik user.
        </p>
      </div>

      {/* Search */}
      <div className="relative w-full sm:w-80">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          placeholder="Cari nama atau email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-xl focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 bg-white shadow-sm text-sm outline-none"
        />
      </div>

      {/* Tabel */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-emerald-600 text-white text-sm">
                <th className="px-4 py-3.5 font-semibold w-12 text-center">No</th>
                <th className="px-4 py-3.5 font-semibold">Nama</th>
                <th className="px-4 py-3.5 font-semibold">Email</th>
                <th className="px-4 py-3.5 font-semibold">Role</th>
                <th className="px-4 py-3.5 font-semibold text-center w-32">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {loading ? (
                <TableRowsSkeleton rows={itemsPerPage} cols={5} />
              ) : paginatedUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                    Tidak ada data pengguna.
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((row, idx) => {
                  const actualIdx = (currentPage - 1) * itemsPerPage + idx + 1;
                  return (
                  <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-center text-gray-500">{actualIdx}</td>
                    <td className="px-4 py-3 font-semibold text-gray-900">{row.name}</td>
                    <td className="px-4 py-3 text-gray-500">{row.email}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
                        row.role === 'admin' 
                          ? 'bg-rose-50 text-rose-700 border-rose-200' 
                          : 'bg-blue-50 text-blue-700 border-blue-200'
                      }`}>
                        {row.role ?? "sales"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => openOutletDialog(row)}
                          className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                          title="Kelola Outlet"
                        >
                          <Store className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(row)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteId(row.id)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Hapus"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        
        {!loading && filtered.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            totalItems={filtered.length}
            itemsPerPage={itemsPerPage}
          />
        )}
      </div>

      {/* ── Dialog: Assign Outlet ──────────────────────────────────────── */}
      <Modal
        open={outletDialogUser !== null}
        onClose={() => setOutletDialogUser(null)}
        title={<><Store className="w-5 h-5 text-emerald-600" /> Outlet — {outletDialogUser?.name}</>}
        actions={
          <button onClick={() => setOutletDialogUser(null)} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg">
            Tutup
          </button>
        }
      >
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-bold text-gray-900 mb-2">Assign Outlet Baru</h4>
            <div className="flex flex-col gap-3">
              <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-xl p-2 bg-gray-50/50">
                {availableOutlets.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-2">Semua outlet sudah di-assign.</p>
                ) : (
                  availableOutlets.map((o) => (
                    <label key={o.id} className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded-lg cursor-pointer transition-colors">
                      <input
                        type="checkbox"
                        checked={selectedOutletIds.has(o.id)}
                        onChange={(e) => {
                          setSelectedOutletIds(prev => {
                            const next = new Set(prev);
                            if (e.target.checked) next.add(o.id);
                            else next.delete(o.id);
                            return next;
                          });
                        }}
                        className="w-4 h-4 rounded accent-emerald-600 cursor-pointer"
                      />
                      <span className="text-sm text-gray-700 font-medium">{o.code} — {o.name}</span>
                    </label>
                  ))
                )}
              </div>
              <button
                onClick={handleAssignOutlet}
                disabled={selectedOutletIds.size === 0}
                className="w-full px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl disabled:opacity-50 transition-colors"
              >
                Assign {selectedOutletIds.size > 0 ? `${selectedOutletIds.size} Outlet` : ''}
              </button>
            </div>
          </div>

          <hr className="border-gray-100" />

          <div>
            <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
              Outlet yang Dimiliki
              <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs">
                {userOutlets.length}
              </span>
            </h4>
            
            {outletLoading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="w-6 h-6 text-emerald-500 animate-spin" />
              </div>
            ) : userOutlets.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">
                Belum ada outlet yang di-assign ke user ini.
              </p>
            ) : (
              <ul className="border border-gray-200 rounded-xl divide-y divide-gray-100 bg-gray-50/30">
                {userOutlets.map((outlet) => (
                  <li key={outlet.id} className="flex items-center justify-between p-3 hover:bg-gray-50 transition-colors">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{outlet.name}</p>
                      <p className="text-xs text-gray-500 font-mono mt-0.5">{outlet.code}</p>
                    </div>
                    <button
                      onClick={() => handleUnassignOutlet(outlet)}
                      className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="Hapus dari user ini"
                    >
                      <Link2Off className="w-4 h-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </Modal>

      {/* ── Dialog: Form User ──────────────────────────────────────────── */}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={isEdit ? "Edit Pengguna" : "Tambah Pengguna Baru"}
        actions={
          <>
            <button onClick={() => setOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg">Batal</button>
            <button onClick={handleSave} disabled={saving} className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg flex items-center gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Simpan"}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nama Lengkap <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email <span className="text-red-500">*</span></label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {isEdit ? "Password Baru (kosongkan jika tidak diubah)" : "Password *"}
            </label>
            <div className="relative">
              <input
                type={showPw ? "text" : "password"}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full pl-3 pr-10 py-2 border border-gray-300 rounded-xl focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
              >
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 outline-none bg-white"
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r === "admin" ? "Admin (Web)" : "Sales (Android)"}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Modal>

      {/* ── Delete confirm ─────────────────────────────────────────────── */}
      <Modal
        open={deleteId !== null}
        onClose={() => setDeleteId(null)}
        title="Hapus Pengguna?"
        actions={
          <>
            <button onClick={() => setDeleteId(null)} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg">Batal</button>
            <button onClick={handleDelete} disabled={deleting} className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg flex items-center gap-2">
              {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Hapus"}
            </button>
          </>
        }
      >
        <p className="text-gray-600">
          Hapus pengguna <strong className="text-gray-900">{deleteTarget?.name}</strong> ({deleteTarget?.email})?
          Aksi ini tidak bisa dibatalkan.
        </p>
      </Modal>

      <Toast
        open={snack.open}
        msg={snack.msg}
        type={snack.severity}
        onClose={() => setSnack((s) => ({ ...s, open: false }))}
      />
    </div>
  );
}
