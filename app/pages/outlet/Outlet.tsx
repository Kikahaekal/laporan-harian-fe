import { useState, useEffect } from "react";
import {
  Store,
  Plus,
  Search,
  MapPin,
  Edit2,
  Trash2,
  X,
  AlertCircle,
  CheckCircle,
  Loader2,
  Users
} from "lucide-react";
import apiBe from "../../lib/axiosBe";
import MapPicker from "../../components/MapPicker";
import { TableRowsSkeleton } from "../../components/TableSkeleton";
import { Pagination } from "../../components/Pagination";

const DEFAULT_LAT = 0.918;
const DEFAULT_LNG = 104.51;

const VISIT_DAYS = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];

interface OutletData {
  id: number;
  code: string;
  name: string;
  address?: string;
  visit_day?: string;
  coor_latitude?: number;
  coor_longitude?: number;
}

const EMPTY_FORM = {
  code: "",
  name: "",
  address: "",
  visit_day: "" as string,
  coor_latitude: DEFAULT_LAT as number | "",
  coor_longitude: DEFAULT_LNG as number | "",
};

// ─── Component: Dialog Modal ─────────────────────────────────────────────────
function Modal({ open, onClose, title, children, actions }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode; actions?: React.ReactNode }) {
  if (!open) return null;
  return (
    <>
      <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-[100]" onClick={onClose} />
      <div className="fixed inset-0 z-[101] flex items-center justify-center p-4 pointer-events-none">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md pointer-events-auto flex flex-col max-h-full">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h3 className="font-bold text-gray-900 text-lg">{title}</h3>
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

export default function Outlet() {
  const [outlets, setOutlets] = useState<OutletData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterDay, setFilterDay] = useState("");
  const [filterUser, setFilterUser] = useState("");
  const [usersList, setUsersList] = useState<{id: number; name: string}[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Modal
  const [open, setOpen] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [mapPickerOpen, setMapPickerOpen] = useState(false);

  // Delete confirm
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [checkingDelete, setCheckingDelete] = useState(false);
  const [conflictModal, setConflictModal] = useState<{ open: boolean; outletId: number | null; relations: any }>({ open: false, outletId: null, relations: null });

  // Bulk select
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map(o => o.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    setBulkDeleting(true);
    try {
      await apiBe.post("/api/web/outlets/bulk-delete", { ids: Array.from(selectedIds) });
      await fetchOutlets();
      setSelectedIds(new Set());
      setConfirmBulkDelete(false);
      showSnack(`${selectedIds.size} outlet berhasil dihapus.`);
    } catch {
      showSnack("Gagal menghapus outlet.", "error");
    } finally {
      setBulkDeleting(false);
    }
  };

  // Snackbar
  const [snack, setSnack] = useState<{ open: boolean; msg: string; severity: "success" | "error" }>({
    open: false, msg: "", severity: "success",
  });

  const showSnack = (msg: string, severity: "success" | "error" = "success") =>
    setSnack({ open: true, msg, severity });

  const fetchOutlets = async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = {};
      if (filterUser) params.user_id = filterUser;
      const res = await apiBe.get("/api/web/outlets", { params });
      const raw = res.data;
      setOutlets(Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : []);
    } catch {
      showSnack("Gagal memuat data outlet.", "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await apiBe.get("/api/web/users");
      const raw = res.data;
      setUsersList(Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : []);
    } catch {
      // silently fail
    }
  };

  useEffect(() => { fetchUsers(); }, []);
  useEffect(() => { fetchOutlets(); }, [filterUser]);

  const filtered = outlets.filter((o) => {
    const matchSearch = o.name.toLowerCase().includes(search.toLowerCase()) ||
                        o.code.toLowerCase().includes(search.toLowerCase());
    const matchDay = filterDay === "" || o.visit_day === filterDay;
    return matchSearch && matchDay;
  });

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginatedOutlets = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Reset to page 1 on search or filter
  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterDay, filterUser]);

  const handleOpenAdd = () => {
    setIsEdit(false);
    setFormData({ ...EMPTY_FORM });
    setOpen(true);
  };

  const handleOpenEdit = (outlet: OutletData) => {
    setIsEdit(true);
    setEditId(outlet.id);
    setFormData({
      code: outlet.code,
      name: outlet.name,
      address: outlet.address ?? "",
      visit_day: outlet.visit_day ?? "",
      coor_latitude: outlet.coor_latitude ?? DEFAULT_LAT,
      coor_longitude: outlet.coor_longitude ?? DEFAULT_LNG,
    });
    setOpen(true);
  };

  const latNum = typeof formData.coor_latitude === "number" ? formData.coor_latitude : null;
  const lngNum = typeof formData.coor_longitude === "number" ? formData.coor_longitude : null;

  const handleSave = async () => {
    if (!formData.code || !formData.name) {
      showSnack("Kode dan Nama outlet wajib diisi!", "error");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        code: formData.code,
        name: formData.name,
        address: formData.address,
        visit_day: formData.visit_day || null,
        coor_latitude: latNum,
        coor_longitude: lngNum,
      };
      if (isEdit && editId) {
        await apiBe.put(`/api/web/outlets/${editId}`, payload);
      } else {
        await apiBe.post("/api/web/outlets", payload);
      }
      await fetchOutlets();
      setOpen(false);
      showSnack(isEdit ? "Outlet berhasil diperbarui." : "Outlet berhasil ditambahkan.");
    } catch (err: any) {
      showSnack(err.response?.data?.message || "Gagal menyimpan outlet.", "error");
    } finally {
      setSaving(false);
    }
  };

  
  const handleCheckDelete = async (id: number) => {
    setCheckingDelete(true);
    try {
      const res = await apiBe.get(`/api/web/outlets/${id}/check-relations`);
      if (res.data.total_relations > 0) {
        setConflictModal({ open: true, outletId: id, relations: res.data });
      } else {
        setDeleteId(id);
      }
    } catch {
      showSnack("Gagal memeriksa data outlet.", "error");
    } finally {
      setCheckingDelete(false);
    }
  };

  const handleForceDelete = async () => {
    if (!conflictModal.outletId) return;
    setDeleting(true);
    try {
      await apiBe.delete(`/api/web/outlets/${conflictModal.outletId}?force=1`);
      await fetchOutlets();
      setConflictModal({ open: false, outletId: null, relations: null });
      showSnack("Outlet dan seluruh transaksinya berhasil dihapus.");
    } catch {
      showSnack("Gagal menghapus paksa outlet.", "error");
    } finally {
      setDeleting(false);
    }
  };

  const handleDetachUsers = async () => {
    if (!conflictModal.outletId) return;
    setDeleting(true);
    try {
      await apiBe.post(`/api/web/outlets/${conflictModal.outletId}/detach-users`);
      await fetchOutlets();
      setConflictModal({ open: false, outletId: null, relations: null });
      showSnack("Akses user berhasil dilepaskan dari outlet ini.");
    } catch {
      showSnack("Gagal melepaskan akses user.", "error");
    } finally {
      setDeleting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await apiBe.delete(`/api/web/outlets/${deleteId}`);
      await fetchOutlets();
      setDeleteId(null);
      showSnack("Outlet berhasil dihapus.");
    } catch {
      showSnack("Gagal menghapus outlet.", "error");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-100 rounded-xl text-emerald-600">
            <Store className="w-6 h-6" />
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-gray-900">Data Outlet</h1>
            <span className="px-2.5 py-1 bg-gray-100 border border-gray-200 text-gray-700 rounded-lg text-xs font-semibold shadow-sm">
              {outlets.length} outlet
            </span>
          </div>
        </div>
        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-medium transition-colors shadow-sm w-full sm:w-auto justify-center"
        >
          <Plus className="w-5 h-5" /> Tambah Outlet
        </button>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative w-full sm:w-72">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Cari nama atau kode outlet..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-xl focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 bg-white shadow-sm text-sm"
            />
          </div>
          
          <div className="relative w-full sm:w-56">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Users className="h-4 w-4 text-gray-400" />
            </div>
            <select
              value={filterUser}
              onChange={(e) => setFilterUser(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 outline-none bg-white shadow-sm appearance-none"
            >
              <option value="">Semua User</option>
              {usersList.map(u => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Day Tab Filter */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="flex overflow-x-auto overflow-y-hidden border-b border-gray-200 scrollbar-hide">
            {["", ...VISIT_DAYS].map((day) => {
              const isSelected = filterDay === day;
              return (
                <button
                  key={day || "all-days"}
                  onClick={() => setFilterDay(day)}
                  className={`whitespace-nowrap px-6 py-4 text-sm font-bold border-b-2 transition-colors ${
                    isSelected
                      ? "border-emerald-600 text-emerald-700 bg-emerald-50/50"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {day || "Semua Hari"}
                </button>
              );
            })}
          </div>
          <div className="bg-emerald-50 px-5 py-3 flex items-center gap-2">
            <span className="text-sm font-bold text-emerald-800">
              Hari Kunjungan: {filterDay || "Semua Hari"}
            </span>
            <span className="text-sm text-gray-500 font-medium">
              - {filtered.length} outlet
            </span>
          </div>
        </div>
      </div>

      {/* Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 mb-4 p-3 bg-red-50 border border-red-200 rounded-xl">
          <span className="text-sm font-medium text-red-800">{selectedIds.size} outlet dipilih</span>
          <button
            onClick={() => setConfirmBulkDelete(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Trash2 className="w-4 h-4" /> Hapus Terpilih
          </button>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm font-medium transition-colors"
          >
            Batal
          </button>
        </div>
      )}

      {/* Tabel */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-emerald-600 text-white text-sm">
                <th className="px-4 py-3.5 font-semibold w-10 text-center">
                  <input type="checkbox" checked={filtered.length > 0 && selectedIds.size === filtered.length} onChange={toggleSelectAll} className="w-4 h-4 rounded accent-white cursor-pointer" />
                </th>
                <th className="px-4 py-3.5 font-semibold w-12 text-center">No</th>
                <th className="px-4 py-3.5 font-semibold">Kode</th>
                <th className="px-4 py-3.5 font-semibold">Nama Outlet</th>
                <th className="px-4 py-3.5 font-semibold">Alamat</th>
                <th className="px-4 py-3.5 font-semibold text-center">Hari Kunjungan</th>
                <th className="px-4 py-3.5 font-semibold text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {loading ? (
                <TableRowsSkeleton rows={itemsPerPage} cols={6} />
              ) : paginatedOutlets.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    Tidak ada data outlet.
                  </td>
                </tr>
              ) : (
                paginatedOutlets.map((row, idx) => {
                  const actualIdx = (currentPage - 1) * itemsPerPage + idx + 1;
                  return (
                  <tr key={row.id} className={`hover:bg-gray-50 transition-colors ${selectedIds.has(row.id) ? 'bg-emerald-50' : ''}`}>
                    <td className="px-4 py-3 text-center">
                      <input type="checkbox" checked={selectedIds.has(row.id)} onChange={() => toggleSelect(row.id)} className="w-4 h-4 rounded accent-emerald-600 cursor-pointer" />
                    </td>
                    <td className="px-4 py-3 text-center text-gray-500">{actualIdx}</td>
                    <td className="px-4 py-3 font-mono font-bold text-gray-700 text-xs">{row.code}</td>
                    <td className="px-4 py-3 font-semibold text-gray-900">{row.name}</td>
                    <td className="px-4 py-3 text-gray-600 max-w-[200px] truncate" title={row.address}>
                      {row.address || <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {row.visit_day ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                          {row.visit_day}
                        </span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleOpenEdit(row)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleCheckDelete(row.id)}
                          disabled={checkingDelete}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
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

      {/* Form Dialog */}
      <Modal 
        open={open} 
        onClose={() => setOpen(false)} 
        title={isEdit ? "Edit Outlet" : "Tambah Outlet Baru"}
        actions={
          <>
            <button onClick={() => setOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg">
              Batal
            </button>
            <button 
              onClick={handleSave} 
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg flex items-center gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Simpan"}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Kode Outlet <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              placeholder="Contoh: OUT-001"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nama Outlet <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Alamat</label>
            <textarea
              rows={2}
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 outline-none resize-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Hari Kunjungan</label>
            <select
              value={formData.visit_day}
              onChange={(e) => setFormData({ ...formData, visit_day: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 outline-none bg-white"
            >
              <option value="">— Tidak Ditentukan —</option>
              {VISIT_DAYS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 items-end">
            <div className="flex-1 w-full">
              <label className="block text-xs font-medium text-gray-500 mb-1">Latitude</label>
              <input
                readOnly
                type="text"
                value={formData.coor_latitude === "" ? "" : formData.coor_latitude}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl bg-gray-50 text-gray-600 outline-none text-sm"
              />
            </div>
            <div className="flex-1 w-full">
              <label className="block text-xs font-medium text-gray-500 mb-1">Longitude</label>
              <input
                readOnly
                type="text"
                value={formData.coor_longitude === "" ? "" : formData.coor_longitude}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl bg-gray-50 text-gray-600 outline-none text-sm"
              />
            </div>
            <button
              onClick={() => setMapPickerOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 font-medium text-sm transition-colors"
            >
              <MapPin className="w-4 h-4" /> Peta
            </button>
          </div>
        </div>
      </Modal>

      
      {/* Conflict Modal */}
      <Modal
        open={conflictModal.open}
        onClose={() => setConflictModal({ open: false, outletId: null, relations: null })}
        title={
          <div className="flex items-center gap-2 text-amber-600">
            <AlertCircle className="w-5 h-5" />
            <span>Peringatan Konflik Penghapusan</span>
          </div>
        }
        actions={
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:justify-end">
            <button
              onClick={() => setConflictModal({ open: false, outletId: null, relations: null })}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
            >
              Batal
            </button>
            <button
              onClick={handleDetachUsers}
              disabled={deleting}
              className="px-4 py-2 text-sm font-medium text-amber-700 bg-amber-100 hover:bg-amber-200 rounded-lg"
            >
              {deleting ? "Memproses..." : "Lepaskan Akses User"}
            </button>
            <button
              onClick={handleForceDelete}
              disabled={deleting}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg"
            >
              {deleting ? "Memproses..." : "Hapus Paksa Semua"}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <p className="text-gray-700 text-sm">
            Outlet ini tidak dapat langsung dihapus karena masih terhubung dengan data berikut:
          </p>
          <ul className="list-disc pl-5 text-sm text-gray-600 space-y-1">
            {conflictModal.relations?.users_count > 0 && <li>Terhubung dengan <strong>{conflictModal.relations.users_count}</strong> Akun Sales</li>}
            {conflictModal.relations?.sales_count > 0 && <li>Memiliki <strong>{conflictModal.relations.sales_count}</strong> Riwayat Transaksi (Dropping/Tagihan)</li>}
            {conflictModal.relations?.closed_photos_count > 0 && <li>Memiliki <strong>{conflictModal.relations.closed_photos_count}</strong> Foto Tutup Outlet</li>}
            {conflictModal.relations?.sales_reports_count > 0 && <li>Memiliki <strong>{conflictModal.relations.sales_reports_count}</strong> Riwayat Laporan Harian/Bulanan</li>}
          </ul>
          <p className="text-sm text-gray-500 border-t pt-3 mt-3">
            Pilih <strong>Lepaskan Akses User</strong> jika Anda hanya ingin outlet ini tidak muncul lagi di HP Sales tanpa menghapus riwayat transaksinya. 
            Pilih <strong>Hapus Paksa Semua</strong> jika Anda benar-benar ingin menghilangkan outlet ini beserta seluruh riwayatnya dari database.
          </p>
        </div>
      </Modal>

      {/* Delete Confirm Dialog */}
      <Modal 
        open={deleteId !== null} 
        onClose={() => setDeleteId(null)} 
        title="Hapus Outlet?"
        actions={
          <>
            <button onClick={() => setDeleteId(null)} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg">
              Batal
            </button>
            <button 
              onClick={handleDelete} 
              disabled={deleting}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg flex items-center gap-2"
            >
              {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Hapus"}
            </button>
          </>
        }
      >
        <p className="text-gray-600">Data outlet akan dihapus permanen. Yakin?</p>
      </Modal>

      <MapPicker
        open={mapPickerOpen}
        onClose={() => setMapPickerOpen(false)}
        initialLat={latNum ?? undefined}
        initialLng={lngNum ?? undefined}
        onConfirm={(lat, lng) => {
          setFormData((prev) => ({ ...prev, coor_latitude: lat, coor_longitude: lng }));
          setMapPickerOpen(false);
        }}
      />

      {/* ── Bulk Delete Confirmation ── */}
      <Modal
        open={confirmBulkDelete}
        onClose={() => setConfirmBulkDelete(false)}
        title={<><AlertCircle className="w-5 h-5 text-red-500 inline-block mr-1" /> Hapus {selectedIds.size} Outlet?</>}
        actions={
          <>
            <button onClick={() => setConfirmBulkDelete(false)} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg">Batal</button>
            <button onClick={handleBulkDelete} disabled={bulkDeleting} className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg flex items-center gap-2">
              {bulkDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Hapus Semua"}
            </button>
          </>
        }
      >
        <p className="text-gray-600">Anda akan menghapus <strong>{selectedIds.size} outlet</strong> secara permanen. Tindakan ini tidak dapat dibatalkan. Yakin ingin melanjutkan?</p>
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
