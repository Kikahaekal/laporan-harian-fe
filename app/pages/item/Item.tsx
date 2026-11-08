import React, { useState, useEffect, useRef, useMemo } from "react";
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
  Info,
  Image as ImageIcon,
  Upload,
  ChevronDown,
  ChevronRight
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
  variant?: string | null;
  display_name?: string;
  price: number;
  stock: number;
  image?: string | null;
  image_url?: string | null;
  category_id: number | null;
  category?: CategoryData | null;
}

interface ProductGroup {
  key: string;
  name: string;
  baseCode: string;
  image_url: string | null;
  category_id: number | null;
  category: CategoryData | null;
  mainItem: ItemData;          // Barang utama (induk)
  childVariants: ItemData[];   // Daftar varian yang memiliki nilai `variant`
  allItems: ItemData[];        // Seluruh row di DB untuk grup ini
  totalStock: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const EMPTY_ITEM_FORM = {
  code: "",
  name: "",
  variant: "",
  price: "",
  stock: "0",
  category_id: "" as string | number,
};
const EMPTY_CAT_FORM = { name: "", description: "" };

// Helper: ekstrak kode dasar (base code) dari kode item pertama
function extractBaseCode(code: string, variant?: string | null): string {
  if (!code) return "BRG";
  if (variant) {
    const cleanVar = variant.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
    if (cleanVar && code.toUpperCase().endsWith("-" + cleanVar)) {
      return code.slice(0, -(cleanVar.length + 1));
    }
  }
  return code;
}

// ─── Component: Dialog Modal ─────────────────────────────────────────────────
function Modal({ open, onClose, title, children, actions }: { open: boolean; onClose: () => void; title: React.ReactNode; children: React.ReactNode; actions?: React.ReactNode }) {
  if (!open) return null;
  return (
    <>
      <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-[100]" onClick={onClose} />
      <div className="fixed inset-0 z-[101] flex items-center justify-center p-4 pointer-events-none">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md pointer-events-auto flex flex-col max-h-full">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">{title}</h3>
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
  // TAB 1 — DATA BARANG & VARIAN
  // ════════════════════════════════════════════════════════════

  const [items, setItems] = useState<ItemData[]>([]);
  const [categories, setCategories] = useState<CategoryData[]>([]);
  const [loadingItems, setLoadingItems] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState<string | number>("");

  // State untuk expand dropdown sub-baris varian per grup barang
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Mode modal:
  // - "add_product"  : Tambah Barang Baru (Foto, Kode, Nama Barang, Kategori, Harga, Stok)
  // - "edit_product" : Edit Barang Utama (Foto, Kode, Nama Barang, Kategori, Harga, Stok)
  // - "add_variant"  : Tambah Varian Baru (HANYA Nama Varian, Harga, Stok — Kode otomatis di backend)
  // - "edit_variant" : Edit Varian (HANYA Nama Varian, Harga, Stok)
  const [modalMode, setModalMode] = useState<"add_product" | "edit_product" | "add_variant" | "edit_variant">("add_product");
  const [itemOpen, setItemOpen] = useState(false);
  const [editItemId, setEditItemId] = useState<number | null>(null);
  const [itemForm, setItemForm] = useState({ ...EMPTY_ITEM_FORM });

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [removeImage, setRemoveImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [savingItem, setSavingItem] = useState(false);
  const [deleteItemId, setDeleteItemId] = useState<number | null>(null);
  const [deletingItem, setDeletingItem] = useState(false);

  // Bulk select
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);

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

  // Kelompokkan items berdasarkan Nama Barang:
  // - `mainItem`: item tanpa variant (barang induk), atau item pertama jika semuanya bervarian
  // - `childVariants`: HANYA item yang benar-benar memiliki nilai `variant` (sehingga barang induk tidak muncul ganda sebagai varian "Standar")
  const productGroups = useMemo<ProductGroup[]>(() => {
    const q = search.toLowerCase();
    const filtered = items.filter((i) => {
      const matchSearch =
        i.name.toLowerCase().includes(q) ||
        (i.variant ?? "").toLowerCase().includes(q) ||
        i.code.toLowerCase().includes(q);
      const matchCat = filterCategory === "" || i.category_id === Number(filterCategory);
      return matchSearch && matchCat;
    });

    const rawMap = new Map<string, ItemData[]>();
    filtered.forEach((item) => {
      const key = item.name.trim().toLowerCase();
      const list = rawMap.get(key) ?? [];
      list.push(item);
      rawMap.set(key, list);
    });

    const groups: ProductGroup[] = [];
    rawMap.forEach((groupItems, key) => {
      // Cari item induk (yang variant-nya kosong/null), jika tidak ada pakai item pertama
      const nonVariantItem = groupItems.find((i) => !i.variant || i.variant.trim() === "");
      const mainItem = nonVariantItem ?? groupItems[0];

      // Daftar varian anak HANYA yang memiliki nama variant (tidak menyertakan barang induk tanpa variant)
      const childVariants = groupItems.filter(
        (i) => i.variant && i.variant.trim() !== ""
      );

      const imageWithUrl = groupItems.find((i) => i.image_url)?.image_url ?? null;
      const catItem = groupItems.find((i) => i.category) ?? mainItem;
      const totalStock = groupItems.reduce((sum, i) => sum + (i.stock ?? 0), 0);

      groups.push({
        key,
        name: mainItem.name,
        baseCode: extractBaseCode(mainItem.code, mainItem.variant),
        image_url: imageWithUrl,
        category_id: catItem.category_id,
        category: catItem.category ?? null,
        mainItem,
        childVariants,
        allItems: groupItems,
        totalStock,
      });
    });

    return groups;
  }, [items, search, filterCategory]);

  const totalPages = Math.ceil(productGroups.length / itemsPerPage);
  const paginatedGroups = productGroups.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterCategory]);

  const toggleGroupExpand = (key: string) => {
    setExpandedGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleSelectGroup = (group: ProductGroup) => {
    const groupIds = group.allItems.map((v) => v.id);
    const allSelected = groupIds.every((id) => selectedIds.has(id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        groupIds.forEach((id) => next.delete(id));
      } else {
        groupIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allFilteredIds = useMemo(
    () => productGroups.flatMap((g) => g.allItems.map((v) => v.id)),
    [productGroups]
  );

  const toggleSelectAll = () => {
    if (selectedIds.size === allFilteredIds.length && allFilteredIds.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allFilteredIds));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    setBulkDeleting(true);
    try {
      await apiBe.post("/api/web/items/bulk-delete", { ids: Array.from(selectedIds) });
      await fetchItems();
      setSelectedIds(new Set());
      setConfirmBulkDelete(false);
      showSnack(`${selectedIds.size} item berhasil dihapus.`);
    } catch {
      showSnack("Gagal menghapus barang.", "error");
    } finally {
      setBulkDeleting(false);
    }
  };

  // 1. Tambah Barang Baru (Level Barang Utama)
  const handleOpenAddProduct = () => {
    setModalMode("add_product");
    setEditItemId(null);
    setItemForm({ ...EMPTY_ITEM_FORM });
    setImageFile(null);
    setImagePreview(null);
    setRemoveImage(false);
    setItemOpen(true);
  };

  // 2. Edit Barang Utama (Mengubah Nama Barang, Kategori, Foto, Kode, Harga, Stok)
  const handleOpenEditProduct = (group: ProductGroup) => {
    const item = group.mainItem;
    setModalMode("edit_product");
    setEditItemId(item.id);
    setItemForm({
      code: item.code,
      name: group.name,
      variant: item.variant ?? "",
      price: String(item.price),
      stock: String(item.stock ?? 0),
      category_id: group.category_id ?? "",
    });
    setImageFile(null);
    setImagePreview(group.image_url ?? null);
    setRemoveImage(false);
    setItemOpen(true);
  };

  // 3. Tambah Varian Baru (Hanya input Nama Varian, Harga, Stok; Kode dibuat otomatis di backend)
  const handleOpenAddVariantForGroup = (group: ProductGroup) => {
    setModalMode("add_variant");
    setEditItemId(null);
    setItemForm({
      code: "",
      name: group.name,
      variant: "",
      price: String(group.mainItem.price ?? ""),
      stock: "0",
      category_id: group.category_id ?? "",
    });
    setImageFile(null);
    setImagePreview(null);
    setRemoveImage(false);
    setExpandedGroups((prev) => ({ ...prev, [group.key]: true }));
    setItemOpen(true);
  };

  // 4. Edit Varian (Hanya input Nama Varian, Harga, Stok)
  const handleOpenEditVariant = (variantItem: ItemData) => {
    setModalMode("edit_variant");
    setEditItemId(variantItem.id);
    setItemForm({
      code: variantItem.code,
      name: variantItem.name,
      variant: variantItem.variant ?? "",
      price: String(variantItem.price),
      stock: String(variantItem.stock ?? 0),
      category_id: variantItem.category_id ?? "",
    });
    setImageFile(null);
    setImagePreview(null);
    setRemoveImage(false);
    setItemOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setRemoveImage(false);
    setImagePreview(URL.createObjectURL(file));
  };

  const isVariantModal = modalMode === "add_variant" || modalMode === "edit_variant";

  const handleSaveItem = async () => {
    if (isVariantModal) {
      if (!itemForm.variant.trim() || !itemForm.price) {
        showSnack("Nama varian dan harga wajib diisi!", "error");
        return;
      }
    } else {
      if (!itemForm.name.trim() || !itemForm.price) {
        showSnack("Nama barang dan harga wajib diisi!", "error");
        return;
      }
    }

    setSavingItem(true);
    try {
      const formData = new FormData();
      if (!isVariantModal && itemForm.code.trim() !== "") {
        formData.append("code", itemForm.code.trim());
      } else if (modalMode === "edit_variant") {
        formData.append("code", itemForm.code.trim());
      }

      formData.append("name", itemForm.name.trim());
      formData.append("variant", isVariantModal ? itemForm.variant.trim() : "");
      formData.append("price", String(Number(itemForm.price)));
      formData.append("stock", String(Number(itemForm.stock) || 0));

      if (itemForm.category_id !== "") {
        formData.append("category_id", String(itemForm.category_id));
      }

      if (!isVariantModal) {
        if (imageFile) {
          formData.append("image", imageFile);
        }
        if (removeImage) {
          formData.append("remove_image", "1");
        }
      }

      const isEdit = modalMode === "edit_product" || modalMode === "edit_variant";

      if (isEdit && editItemId) {
        formData.append("_method", "PUT");
        await apiBe.post(`/api/web/items/${editItemId}`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      } else {
        await apiBe.post("/api/web/items", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }
      await fetchItems();
      setItemOpen(false);
      showSnack(
        modalMode === "add_variant"
          ? "Varian baru berhasil ditambahkan."
          : modalMode === "edit_variant"
          ? "Varian berhasil diperbarui."
          : modalMode === "edit_product"
          ? "Data barang berhasil diperbarui."
          : "Barang baru berhasil ditambahkan."
      );
    } catch (err: any) {
      showSnack(err.response?.data?.message || "Gagal menyimpan data.", "error");
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
      showSnack("Data berhasil dihapus.");
    } catch {
      showSnack("Gagal menghapus barang (pastikan belum dipakai di transaksi).", "error");
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
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Master Barang & Varian</h1>
            <p className="text-xs text-gray-500">
              Kelola data barang utama (foto & kategori) beserta daftar varian ukurannya
            </p>
          </div>
        </div>
        <div className="flex w-full sm:w-auto">
          {activeTab === 0 && (
            <button
              onClick={handleOpenAddProduct}
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
              {productGroups.length} barang
            </span>
          </button>
          <button
            onClick={() => setActiveTab(1)}
            className={`flex items-center gap-2 px-6 py-4 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 1 ? 'border-indigo-600 text-indigo-700 bg-white' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-white/50'
            }`}
          >
            <Layers className="w-4 h-4" /> Kategori
            <span className={`px-2 py-0.5 rounded-full text-[10px] ${activeTab === 1 ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-200 text-gray-600'}`}>
              {categories.length}
            </span>
          </button>
        </div>

        {/* ══════════ TAB 0: DATA BARANG (GROUPED BY PRODUCT + DROPDOWN VARIAN) ══════════ */}
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

            {/* Bulk Action Bar */}
            {selectedIds.size > 0 && (
              <div className="flex items-center gap-3 mb-4 p-3 bg-red-50 border border-red-200 rounded-xl">
                <span className="text-sm font-medium text-red-800">{selectedIds.size} item dipilih</span>
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

            {/* Filter */}
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <div className="relative w-full sm:w-80">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Cari nama barang, varian, atau kode..."
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
                      <th className="px-3 py-3 font-semibold w-10 text-center">
                        <input
                          type="checkbox"
                          checked={allFilteredIds.length > 0 && selectedIds.size === allFilteredIds.length}
                          onChange={toggleSelectAll}
                          className="w-4 h-4 rounded accent-white cursor-pointer"
                        />
                      </th>
                      <th className="px-3 py-3 font-semibold w-10 text-center">No</th>
                      <th className="px-3 py-3 font-semibold w-16 text-center">Foto</th>
                      <th className="px-4 py-3 font-semibold">Nama Barang & Kode</th>
                      <th className="px-4 py-3 font-semibold">Varian</th>
                      <th className="px-4 py-3 font-semibold">Kategori</th>
                      <th className="px-4 py-3 font-semibold text-right">Harga/Pcs</th>
                      <th className="px-4 py-3 font-semibold text-center">Stok</th>
                      <th className="px-4 py-3 font-semibold text-center w-40">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-sm">
                    {loadingItems ? (
                      <TableRowsSkeleton rows={itemsPerPage} cols={9} />
                    ) : paginatedGroups.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                          Tidak ada data barang.
                        </td>
                      </tr>
                    ) : (
                      paginatedGroups.map((group, idx) => {
                        const actualIdx = (currentPage - 1) * itemsPerPage + idx + 1;
                        const main = group.mainItem;
                        const variantCount = group.childVariants.length;
                        const isExpanded = !!expandedGroups[group.key];
                        const stock = main.stock ?? 0;
                        const isLow = stock <= 5;
                        const allGroupSelected = group.allItems.every((v) => selectedIds.has(v.id));

                        return (
                          <React.Fragment key={group.key}>
                            {/* ── BARIS BARANG UTAMA (INDUK) ── */}
                            <tr className={`hover:bg-gray-50 transition-colors ${allGroupSelected ? "bg-blue-50/60" : ""}`}>
                              <td className="px-3 py-3 text-center">
                                <input
                                  type="checkbox"
                                  checked={allGroupSelected}
                                  onChange={() => toggleSelectGroup(group)}
                                  className="w-4 h-4 rounded accent-blue-600 cursor-pointer"
                                />
                              </td>
                              <td className="px-3 py-3 text-center text-gray-500 font-medium">{actualIdx}</td>
                              <td className="px-3 py-2 text-center">
                                {group.image_url ? (
                                  <img
                                    src={group.image_url}
                                    alt={group.name}
                                    className="w-11 h-11 rounded-lg object-cover border border-gray-200 mx-auto shadow-sm"
                                  />
                                ) : (
                                  <div className="w-11 h-11 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-400 mx-auto">
                                    <ImageIcon className="w-4 h-4" />
                                  </div>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                <div className="font-bold text-gray-900 text-sm">{group.name}</div>
                                <div className="font-mono text-xs text-gray-500 mt-0.5">{main.code}</div>
                              </td>

                              {/* Kolom Varian: Tombol Dropdown untuk melihat daftar varian di bawahnya */}
                              <td className="px-4 py-3">
                                {variantCount === 0 ? (
                                  <span className="text-xs text-gray-400">—</span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => toggleGroupExpand(group.key)}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 transition-colors"
                                  >
                                    {isExpanded ? (
                                      <ChevronDown className="w-3.5 h-3.5 text-purple-600" />
                                    ) : (
                                      <ChevronRight className="w-3.5 h-3.5 text-purple-600" />
                                    )}
                                    <span>
                                      {variantCount} Varian ({group.childVariants.map((v) => v.variant).join(", ")})
                                    </span>
                                  </button>
                                )}
                              </td>

                              <td className="px-4 py-3">
                                {group.category ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                                    <Layers className="w-3 h-3" /> {group.category.name}
                                  </span>
                                ) : (
                                  <span className="text-gray-300">—</span>
                                )}
                              </td>

                              <td className="px-4 py-3 text-right font-bold text-gray-800">
                                Rp {Number(main.price).toLocaleString("id-ID")}
                              </td>

                              <td className="px-4 py-3 text-center">
                                <span
                                  className={`inline-flex items-center justify-center min-w-[32px] px-2 py-0.5 rounded text-xs font-bold ${
                                    stock === 0
                                      ? "bg-red-500 text-white"
                                      : isLow
                                      ? "bg-amber-100 text-amber-800 border border-amber-200"
                                      : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  }`}
                                >
                                  {stock.toLocaleString("id-ID")}
                                </span>
                              </td>

                              {/* Tombol Aksi Barang Utama */}
                              <td className="px-4 py-3 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  <button
                                    onClick={() => handleOpenAddVariantForGroup(group)}
                                    title="Tambah Varian untuk Barang Ini"
                                    className="inline-flex items-center gap-1 px-2 py-1 text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg transition-colors"
                                  >
                                    <Plus className="w-3.5 h-3.5" /> Varian
                                  </button>
                                  <button
                                    onClick={() => handleOpenEditProduct(group)}
                                    title="Edit Barang Utama (Foto, Nama, Kategori)"
                                    className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => setDeleteItemId(main.id)}
                                    title="Hapus Barang"
                                    className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>

                            {/* ── SUB-BARIS VARIAN (HANYA TAMPIL VARIAN YANG DIINPUT, TANPA DUPLIKAT BARANG INDUK) ── */}
                            {isExpanded &&
                              group.childVariants.map((v) => {
                                const vStock = v.stock ?? 0;
                                const vLow = vStock <= 5;
                                return (
                                  <tr
                                    key={`sub-${v.id}`}
                                    className="bg-purple-50/25 hover:bg-purple-50/50 text-xs border-l-4 border-l-purple-400"
                                  >
                                    <td className="px-3 py-2.5 text-center">
                                      <input
                                        type="checkbox"
                                        checked={selectedIds.has(v.id)}
                                        onChange={() => toggleSelect(v.id)}
                                        className="w-3.5 h-3.5 rounded accent-purple-600 cursor-pointer"
                                      />
                                    </td>
                                    <td className="px-3 py-2.5 text-center text-purple-400">↳</td>
                                    <td className="px-3 py-2.5 text-center text-[10px] font-semibold text-purple-600">
                                      Varian
                                    </td>
                                    <td className="px-4 py-2.5 font-mono font-bold text-gray-700">
                                      {v.code}
                                    </td>
                                    <td className="px-4 py-2.5">
                                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-md font-bold bg-purple-100 text-purple-800 border border-purple-200">
                                        {v.variant}
                                      </span>
                                    </td>
                                    <td className="px-4 py-2.5 text-gray-400">—</td>
                                    <td className="px-4 py-2.5 text-right font-semibold text-gray-800">
                                      Rp {Number(v.price).toLocaleString("id-ID")}
                                    </td>
                                    <td className="px-4 py-2.5 text-center">
                                      <span
                                        className={`inline-flex items-center justify-center min-w-[28px] px-1.5 py-0.5 rounded font-bold ${
                                          vStock === 0
                                            ? "bg-red-500 text-white"
                                            : vLow
                                            ? "bg-amber-100 text-amber-800"
                                            : "bg-emerald-50 text-emerald-700"
                                        }`}
                                      >
                                        {vStock.toLocaleString("id-ID")}
                                      </span>
                                    </td>
                                    <td className="px-4 py-2.5 text-center">
                                      <div className="flex items-center justify-center gap-1">
                                        <button
                                          onClick={() => handleOpenEditVariant(v)}
                                          title="Edit Varian (Nama Varian, Harga, Stok)"
                                          className="p-1 text-blue-600 hover:bg-blue-100 rounded transition-colors"
                                        >
                                          <Edit2 className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                          onClick={() => setDeleteItemId(v.id)}
                                          title="Hapus Varian Ini"
                                          className="p-1 text-red-600 hover:bg-red-100 rounded transition-colors"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                          </React.Fragment>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
              
              {!loadingItems && productGroups.length > 0 && (
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                  totalItems={productGroups.length}
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
                                {itemCount} item
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
          DIALOGS — BARANG & VARIAN
      ════════════════════════════════════════════ */}

      <Modal
        open={itemOpen}
        onClose={() => setItemOpen(false)}
        title={
          modalMode === "add_variant"
            ? `Tambah Varian — ${itemForm.name}`
            : modalMode === "edit_variant"
            ? `Edit Varian — ${itemForm.name}`
            : modalMode === "edit_product"
            ? "Edit Barang"
            : "Tambah Barang Baru"
        }
        actions={
          <>
            <button onClick={() => setItemOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg">Batal</button>
            <button onClick={handleSaveItem} disabled={savingItem} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center gap-2">
              {savingItem ? <Loader2 className="w-4 h-4 animate-spin" /> : "Simpan"}
            </button>
          </>
        }
      >
        {isVariantModal ? (
          /* ── FORM KHUSUS VARIAN (Hanya Nama Varian, Harga, dan Stok) ── */
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nama Varian <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={itemForm.variant}
                onChange={(e) => setItemForm({ ...itemForm, variant: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-1 focus:ring-purple-500 focus:border-purple-500 outline-none text-sm"
                placeholder="Contoh: 150ml, 1000ml, vanila, coklat..."
                autoFocus
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Harga / Pcs <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">Rp</span>
                  </div>
                  <input
                    type="number"
                    value={itemForm.price}
                    onChange={(e) => setItemForm({ ...itemForm, price: e.target.value })}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-xl focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
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
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-xl focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                  />
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* ── FORM BARANG UTAMA (Foto, Kode, Nama Barang, Kategori, Harga, Stok) ── */
          <div className="space-y-4">
            {/* Foto Barang */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Foto Barang
              </label>
              <div className="flex items-center gap-4">
                {!removeImage && imagePreview ? (
                  <div className="relative w-16 h-16 rounded-xl overflow-hidden border border-gray-200 shadow-sm flex-shrink-0">
                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => {
                        setImageFile(null);
                        setImagePreview(null);
                        setRemoveImage(true);
                        if (fileInputRef.current) fileInputRef.current.value = "";
                      }}
                      className="absolute top-0.5 right-0.5 bg-red-600 text-white rounded-full p-0.5 shadow"
                      title="Hapus Foto"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-gray-100 border border-dashed border-gray-300 flex items-center justify-center text-gray-400 flex-shrink-0">
                    <ImageIcon className="w-6 h-6" />
                  </div>
                )}
                <div className="flex-1">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold transition-colors"
                  >
                    <Upload className="w-3.5 h-3.5" /> {!removeImage && imagePreview ? "Ganti Foto" : "Pilih Foto"}
                  </button>
                  <p className="text-[11px] text-gray-400 mt-1">
                    JPG, PNG, WEBP maks 5MB. Berlaku untuk semua varian barang ini.
                  </p>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Kode Barang <span className="text-xs text-gray-400 font-normal">(kosongkan jika ingin otomatis)</span>
              </label>
              <input
                type="text"
                value={itemForm.code}
                onChange={(e) => setItemForm({ ...itemForm, code: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm font-mono"
                placeholder="Contoh: ROTI"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nama Barang <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={itemForm.name}
                onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                placeholder="Contoh: Susu Sapi Murni"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Kategori</label>
              <select
                value={itemForm.category_id}
                onChange={(e) => setItemForm({ ...itemForm, category_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white text-sm"
              >
                <option value="">— Tanpa Kategori —</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Harga / Pcs <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">Rp</span>
                  </div>
                  <input
                    type="number"
                    value={itemForm.price}
                    onChange={(e) => setItemForm({ ...itemForm, price: e.target.value })}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-xl focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
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
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-xl focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={deleteItemId !== null}
        onClose={() => setDeleteItemId(null)}
        title="Hapus Data?"
        actions={
          <>
            <button onClick={() => setDeleteItemId(null)} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg">Batal</button>
            <button onClick={handleDeleteItem} disabled={deletingItem} className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg flex items-center gap-2">
              {deletingItem ? <Loader2 className="w-4 h-4 animate-spin" /> : "Hapus"}
            </button>
          </>
        }
      >
        <p className="text-gray-600">Data ini akan dihapus permanen. Yakin?</p>
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

      {/* ── Bulk Delete Confirmation ── */}
      <Modal
        open={confirmBulkDelete}
        onClose={() => setConfirmBulkDelete(false)}
        title={<><AlertCircle className="w-5 h-5 text-red-500" /> Hapus {selectedIds.size} Item?</>}
        actions={
          <>
            <button onClick={() => setConfirmBulkDelete(false)} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg">Batal</button>
            <button onClick={handleBulkDelete} disabled={bulkDeleting} className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg flex items-center gap-2">
              {bulkDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Hapus Semua"}
            </button>
          </>
        }
      >
        <p className="text-gray-600">Anda akan menghapus <strong>{selectedIds.size} item/varian</strong> secara permanen. Tindakan ini tidak dapat dibatalkan. Yakin ingin melanjutkan?</p>
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
