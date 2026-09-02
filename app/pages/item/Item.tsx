import { useState, useEffect } from "react";
import {
  Tag,
  Plus,
  Search,
  Edit2,
  Trash2,
  Package,
  Layers,
  X,
  AlertCircle,
  CheckCircle,
  Loader2,
  Info
} from "lucide-react";
import apiBe from "../../lib/axiosBe";
import { TableRowsSkeleton } from "../../components/TableSkeleton";
import { Pagination } from "../../components/Pagination";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CategoryData {
  id: number;
  name: string;
  description?: string | null;
}

interface ItemData {
  id: number;
  code: string;
  name: string;
  price: number;
  stock: number;
  category_id: number | null;
  category?: CategoryData | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const EMPTY_ITEM_FORM = { code: "", name: "", price: "", stock: "0", category_id: "" as string | number };
const EMPTY_CAT_FORM = { name: "", description: "" };

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

// ──────────────────────────────────────────────────────────────────────────────

export default function Item() {
  const [activeTab, setActiveTab] = useState(0);

  // ── Snackbar shared ──
  const [snack, setSnack] = useState<{ open: boolean; msg: string; severity: "success" | "error" }>({
    open: false, msg: "", severity: "success",
  });
  const showSnack = (msg: string, severity: "success" | "error" = "success") =>
    setSnack({ open: true, msg, severity });

  // ════════════════════════════════════════════════════════════
  // TAB 1 — DATA BARANG
  // ════════════════════════════════════════════════════════════

  const [items, setItems] = useState<ItemData[]>([]);
  const [categories, setCategories] = useState<CategoryData[]>([]);
  const [loadingItems, setLoadingItems] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState<string | number>("");

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [itemOpen, setItemOpen] = useState(false);
  const [isItemEdit, setIsItemEdit] = useState(false);
  const [editItemId, setEditItemId] = useState<number | null>(null);
  const [itemForm, setItemForm] = useState({ ...EMPTY_ITEM_FORM });
  const [savingItem, setSavingItem] = useState(false);
  const [deleteItemId, setDeleteItemId] = useState<number | null>(null);
  const [deletingItem, setDeletingItem] = useState(false);

  const fetchCategories = async () => {
    try {
      const res = await apiBe.get("/api/web/item-categories");
      const raw = res.data;
      setCategories(Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : []);
    } catch { /* silent */ }
  };

  const fetchItems = async () => {
    try {
      setLoadingItems(true);
      const res = await apiBe.get("/api/web/items");
      const raw = res.data;
      setItems(Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : []);
    } catch {
      showSnack("Gagal memuat data item.", "error");
    } finally {
      setLoadingItems(false);
    }
  };

  useEffect(() => { fetchItems(); fetchCategories(); }, []);

  const filteredItems = items.filter((i) => {
    const matchSearch = i.name.toLowerCase().includes(search.toLowerCase()) ||
      i.code.toLowerCase().includes(search.toLowerCase());
    const matchCat = filterCategory === "" || i.category_id === Number(filterCategory);
    return matchSearch && matchCat;
  });

  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const paginatedItems = filteredItems.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterCategory]);

  const handleOpenAddItem = () => {
    setIsItemEdit(false);
    setItemForm({ ...EMPTY_ITEM_FORM });
    setItemOpen(true);
  };

  const handleOpenEditItem = (item: ItemData) => {
    setIsItemEdit(true);
    setEditItemId(item.id);
    setItemForm({
      code: item.code,
      name: item.name,
      price: String(item.price),
      stock: String(item.stock ?? 0),
      category_id: item.category_id ?? "",
    });
    setItemOpen(true);
  };

  const handleSaveItem = async () => {
    if (!itemForm.code || !itemForm.name || !itemForm.price) {
      showSnack("Kode, nama, dan harga wajib diisi!", "error");
      return;
    }
    setSavingItem(true);
    try {
      const payload = {
        code: itemForm.code,
        name: itemForm.name,
        price: Number(itemForm.price),
        stock: Number(itemForm.stock) || 0,
        category_id: itemForm.category_id !== "" ? Number(itemForm.category_id) : null,
      };
      if (isItemEdit && editItemId) {
        await apiBe.put(`/api/web/items/${editItemId}`, payload);
      } else {
        await apiBe.post("/api/web/items", payload);
      }
      await fetchItems();
      setItemOpen(false);
      showSnack(isItemEdit ? "Barang berhasil diperbarui." : "Barang berhasil ditambahkan.");
    } catch (err: any) {
      showSnack(err.response?.data?.message || "Gagal menyimpan barang.", "error");
    } finally {
      setSavingItem(false);
    }
  };

  const handleDeleteItem = async () => {
    if (!deleteItemId) return;
    setDeletingItem(true);
    try {
      await apiBe.delete(`/api/web/items/${deleteItemId}`);
      await fetchItems();
      setDeleteItemId(null);
      showSnack("Barang berhasil dihapus.");
    } catch {
      showSnack("Gagal menghapus barang.", "error");
    } finally {
      setDeletingItem(false);
    }
  };

  const totalStock = items.reduce((s, i) => s + (i.stock ?? 0), 0);
  const lowStock = items.filter((i) => (i.stock ?? 0) <= 5);

  // ════════════════════════════════════════════════════════════
  // TAB 2 — KATEGORI
  // ════════════════════════════════════════════════════════════

  const [loadingCats, setLoadingCats] = useState(false);
  const [catOpen, setCatOpen] = useState(false);
  const [isCatEdit, setIsCatEdit] = useState(false);
  const [editCatId, setEditCatId] = useState<number | null>(null);
  const [catForm, setCatForm] = useState({ ...EMPTY_CAT_FORM });
  const [savingCat, setSavingCat] = useState(false);
  const [deleteCatId, setDeleteCatId] = useState<number | null>(null);
  const [deletingCat, setDeletingCat] = useState(false);

  const [catCurrentPage, setCatCurrentPage] = useState(1);
  const catItemsPerPage = 10;
  
  const catTotalPages = Math.ceil(categories.length / catItemsPerPage);
  const paginatedCats = categories.slice((catCurrentPage - 1) * catItemsPerPage, catCurrentPage * catItemsPerPage);

  const fetchCategoriesFull = async () => {
    try {
      setLoadingCats(true);
      const res = await apiBe.get("/api/web/item-categories");
      const raw = res.data;
      setCategories(Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : []);
    } catch {
      showSnack("Gagal memuat kategori.", "error");
    } finally {
      setLoadingCats(false);
    }
  };

  const handleOpenAddCat = () => {
    setIsCatEdit(false);
    setCatForm({ ...EMPTY_CAT_FORM });
    setCatOpen(true);
  };

  const handleOpenEditCat = (cat: CategoryData) => {
    setIsCatEdit(true);
    setEditCatId(cat.id);
    setCatForm({ name: cat.name, description: cat.description ?? "" });
    setCatOpen(true);
  };

  const handleSaveCat = async () => {
    if (!catForm.name.trim()) {
      showSnack("Nama kategori wajib diisi!", "error");
      return;
    }
    setSavingCat(true);
    try {
      const payload = { name: catForm.name.trim(), description: catForm.description || null };
      if (isCatEdit && editCatId) {
        await apiBe.put(`/api/web/item-categories/${editCatId}`, payload);
      } else {
        await apiBe.post("/api/web/item-categories", payload);
      }
      await fetchCategoriesFull();
      setCatOpen(false);
      showSnack(isCatEdit ? "Kategori berhasil diperbarui." : "Kategori berhasil ditambahkan.");
    } catch (err: any) {
      showSnack(err.response?.data?.message || "Gagal menyimpan kategori.", "error");
    } finally {
      setSavingCat(false);
    }
  };

  const handleDeleteCat = async () => {
    if (!deleteCatId) return;
    setDeletingCat(true);
    try {
      await apiBe.delete(`/api/web/item-categories/${deleteCatId}`);
      await fetchCategoriesFull();
      setDeleteCatId(null);
      showSnack("Kategori berhasil dihapus.");
    } catch (err: any) {
      showSnack(err.response?.data?.message || "Gagal menghapus kategori (mungkin masih dipakai barang).", "error");
    } finally {
      setDeletingCat(false);
    }
  };

  useEffect(() => {
    if (activeTab === 1) fetchCategoriesFull();
  }, [activeTab]);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-100 rounded-xl text-blue-600">
            <Tag className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Master Barang</h1>
        </div>
        <div className="flex w-full sm:w-auto">
          {activeTab === 0 && (
            <button
              onClick={handleOpenAddItem}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-medium transition-colors shadow-sm w-full justify-center"
            >
              <Plus className="w-5 h-5" /> Tambah Barang
            </button>
          )}
          {activeTab === 1 && (
            <button
              onClick={handleOpenAddCat}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-medium transition-colors shadow-sm w-full justify-center"
            >
              <Plus className="w-5 h-5" /> Tambah Kategori
            </button>
          )}
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="flex overflow-x-auto border-b border-gray-200 bg-gray-50/50 scrollbar-hide">
          <button
            onClick={() => setActiveTab(0)}
            className={`flex items-center gap-2 px-6 py-4 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 0 ? 'border-blue-600 text-blue-700 bg-white' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-white/50'
            }`}
          >
            <Tag className="w-4 h-4" /> Data Barang
            <span className={`px-2 py-0.5 rounded-full text-[10px] ${activeTab === 0 ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
              {items.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab(1)}
            className={`flex items-center gap-2 px-6 py-4 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 1 ? 'border-indigo-600 text-indigo-700 bg-white' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-white/50'
            }`}
          >
            <Layers className="w-4 h-4" /> Kategori
            <span className={`px-2 py-0.5 rounded-full text-[10px] ${activeTab === 1 ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600'}`}>
              {categories.length}
            </span>
          </button>
        </div>

        {/* ══════════ TAB 0: DATA BARANG ══════════ */}
        {activeTab === 0 && (
          <div className="p-5">
            {/* Summary Chips */}
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <span className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 border border-gray-200 text-gray-700 rounded-lg text-xs font-semibold shadow-sm">
                <Package className="w-4 h-4" /> Total stok: {totalStock.toLocaleString("id-ID")}
              </span>
              {lowStock.length > 0 && (
                <span className="px-3 py-1.5 bg-amber-100 text-amber-800 rounded-lg text-xs font-bold shadow-sm">
                  {lowStock.length} stok menipis (≤5)
                </span>
              )}
            </div>

            {/* Filter */}
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <div className="relative w-full sm:w-72">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Cari nama atau kode barang..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-xl focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm outline-none"
                />
              </div>
              
              <div className="flex flex-col">
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="w-full sm:w-48 px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                >
                  <option value="">Semua Kategori</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Tabel Barang */}
            <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-blue-600 text-white text-sm">
                      <th className="px-4 py-3 font-semibold w-12 text-center">No</th>
                      <th className="px-4 py-3 font-semibold">Kode</th>
                      <th className="px-4 py-3 font-semibold">Nama Barang</th>
                      <th className="px-4 py-3 font-semibold">Kategori</th>
                      <th className="px-4 py-3 font-semibold text-right">Harga Satuan</th>
                      <th className="px-4 py-3 font-semibold text-center">Stok</th>
                      <th className="px-4 py-3 font-semibold text-center w-24">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-sm">
                    {loadingItems ? (
                      <TableRowsSkeleton rows={itemsPerPage} cols={7} />
                    ) : paginatedItems.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                          Tidak ada data barang.
                        </td>
                      </tr>
                    ) : (
                      paginatedItems.map((row, idx) => {
                        const actualIdx = (currentPage - 1) * itemsPerPage + idx + 1;
                        const stock = row.stock ?? 0;
                        const isLow = stock <= 5;
                        return (
                          <tr key={row.id} className={`hover:bg-gray-50 transition-colors ${isLow ? 'bg-amber-50/30' : ''}`}>
                            <td className="px-4 py-3 text-center text-gray-500">{actualIdx}</td>
                            <td className="px-4 py-3 font-mono font-bold text-gray-700 text-xs">{row.code}</td>
                            <td className="px-4 py-3 font-semibold text-gray-900">{row.name}</td>
                            <td className="px-4 py-3">
                              {row.category ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                                  <Layers className="w-3 h-3" /> {row.category.name}
                                </span>
                              ) : (
                                <span className="text-gray-300">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right font-medium text-gray-800">
                              Rp {Number(row.price).toLocaleString("id-ID")}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className={`inline-flex items-center justify-center min-w-[32px] px-2 py-0.5 rounded text-xs font-bold ${
                                stock === 0 ? 'bg-red-500 text-white' : isLow ? 'bg-amber-100 text-amber-800 border border-amber-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              }`}>
                                {stock.toLocaleString("id-ID")}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  onClick={() => handleOpenEditItem(row)}
                                  className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => setDeleteItemId(row.id)}
                                  className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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
              
              {!loadingItems && filteredItems.length > 0 && (
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                  totalItems={filteredItems.length}
                  itemsPerPage={itemsPerPage}
                />
              )}
            </div>
          </div>
        )}

        {/* ══════════ TAB 1: KATEGORI ══════════ */}
        {activeTab === 1 && (
          <div className="p-5">
            <p className="text-sm text-gray-500 mb-4">
              Kelola kategori barang. Kategori dipakai untuk mengelompokkan barang agar mudah difilter.
            </p>
            <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-indigo-600 text-white text-sm">
                      <th className="px-4 py-3 font-semibold w-12 text-center">No</th>
                      <th className="px-4 py-3 font-semibold">Nama Kategori</th>
                      <th className="px-4 py-3 font-semibold">Deskripsi</th>
                      <th className="px-4 py-3 font-semibold text-center">Jml Barang</th>
                      <th className="px-4 py-3 font-semibold text-center w-24">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-sm">
                    {loadingCats ? (
                      <TableRowsSkeleton rows={catItemsPerPage} cols={5} />
                    ) : paginatedCats.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                          Belum ada kategori. Klik "Tambah Kategori" untuk mulai.
                        </td>
                      </tr>
                    ) : (
                      paginatedCats.map((cat, idx) => {
                        const actualIdx = (catCurrentPage - 1) * catItemsPerPage + idx + 1;
                        const itemCount = items.filter((i) => i.category_id === cat.id).length;
                        return (
                          <tr key={cat.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-3 text-center text-gray-500">{actualIdx}</td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <Layers className="w-4 h-4 text-indigo-500" />
                                <span className="font-semibold text-gray-900">{cat.name}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-gray-600">
                              {cat.description || <span className="text-gray-300">—</span>}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${
                                itemCount > 0 ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-gray-50 text-gray-500 border-gray-200'
                              }`}>
                                {itemCount} barang
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  onClick={() => handleOpenEditCat(cat)}
                                  className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  disabled={itemCount > 0}
                                  onClick={() => setDeleteCatId(cat.id)}
                                  className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
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
              
              {!loadingCats && categories.length > 0 && (
                <Pagination
                  currentPage={catCurrentPage}
                  totalPages={catTotalPages}
                  onPageChange={setCatCurrentPage}
                  totalItems={categories.length}
                  itemsPerPage={catItemsPerPage}
                />
              )}
            </div>
            
            {categories.some((c) => items.filter((i) => i.category_id === c.id).length > 0) && (
              <div className="flex items-start gap-2 mt-4 p-3 bg-blue-50 text-blue-800 rounded-xl border border-blue-100">
                <Info className="w-5 h-5 flex-shrink-0" />
                <p className="text-xs">
                  Tombol hapus dinonaktifkan jika kategori masih memiliki barang. Pindahkan atau ubah kategori barang terlebih dahulu.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ════════════════════════════════════════════
          DIALOGS — BARANG
      ════════════════════════════════════════════ */}

      {/* Form Barang */}
      <Modal
        open={itemOpen}
        onClose={() => setItemOpen(false)}
        title={isItemEdit ? "Edit Barang" : "Tambah Barang Baru"}
        actions={
          <>
            <button onClick={() => setItemOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg">Batal</button>
            <button onClick={handleSaveItem} disabled={savingItem} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center gap-2">
              {savingItem ? <Loader2 className="w-4 h-4 animate-spin" /> : "Simpan"}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Kode Barang <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={itemForm.code}
              onChange={(e) => setItemForm({ ...itemForm, code: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="Contoh: ITEM-A"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nama Barang <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={itemForm.name}
              onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Kategori</label>
            <select
              value={itemForm.category_id}
              onChange={(e) => setItemForm({ ...itemForm, category_id: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
            >
              <option value="">— Tanpa Kategori —</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Harga Satuan <span className="text-red-500">*</span></label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-500 sm:text-sm">Rp</span>
              </div>
              <input
                type="number"
                value={itemForm.price}
                onChange={(e) => setItemForm({ ...itemForm, price: e.target.value })}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-xl focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Stok Gudang</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Package className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="number"
                min="0"
                value={itemForm.stock}
                onChange={(e) => setItemForm({ ...itemForm, stock: e.target.value })}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-xl focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
            <p className="mt-1 text-xs text-gray-500">
              {isItemEdit ? "Set stok manual (disesuaikan otomatis saat dropping/invoice)" : "Stok awal barang di gudang"}
            </p>
          </div>
        </div>
      </Modal>

      <Modal
        open={deleteItemId !== null}
        onClose={() => setDeleteItemId(null)}
        title="Hapus Barang?"
        actions={
          <>
            <button onClick={() => setDeleteItemId(null)} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg">Batal</button>
            <button onClick={handleDeleteItem} disabled={deletingItem} className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg flex items-center gap-2">
              {deletingItem ? <Loader2 className="w-4 h-4 animate-spin" /> : "Hapus"}
            </button>
          </>
        }
      >
        <p className="text-gray-600">Data barang akan dihapus permanen. Yakin?</p>
      </Modal>

      {/* ════════════════════════════════════════════
          DIALOGS — KATEGORI
      ════════════════════════════════════════════ */}

      <Modal
        open={catOpen}
        onClose={() => setCatOpen(false)}
        title={isCatEdit ? "Edit Kategori" : "Tambah Kategori Baru"}
        actions={
          <>
            <button onClick={() => setCatOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg">Batal</button>
            <button onClick={handleSaveCat} disabled={savingCat} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg flex items-center gap-2">
              {savingCat ? <Loader2 className="w-4 h-4 animate-spin" /> : "Simpan"}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nama Kategori <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={catForm.name}
              onChange={(e) => setCatForm({ ...catForm, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              placeholder="Contoh: Minuman, Makanan, dll."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Deskripsi</label>
            <textarea
              rows={2}
              value={catForm.description}
              onChange={(e) => setCatForm({ ...catForm, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none"
              placeholder="Opsional..."
            />
          </div>
        </div>
      </Modal>

      <Modal
        open={deleteCatId !== null}
        onClose={() => setDeleteCatId(null)}
        title="Hapus Kategori?"
        actions={
          <>
            <button onClick={() => setDeleteCatId(null)} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg">Batal</button>
            <button onClick={handleDeleteCat} disabled={deletingCat} className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg flex items-center gap-2">
              {deletingCat ? <Loader2 className="w-4 h-4 animate-spin" /> : "Hapus"}
            </button>
          </>
        }
      >
        <p className="text-gray-600">Kategori ini akan dihapus permanen. Yakin?</p>
      </Modal>

      {/* ── Snackbar ── */}
      <Toast
        open={snack.open}
        msg={snack.msg}
        type={snack.severity}
        onClose={() => setSnack((s) => ({ ...s, open: false }))}
      />
    </div>
  );
}
