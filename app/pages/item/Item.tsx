import { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Stack,
  InputAdornment,
  Chip,
  Alert,
  Snackbar,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tabs,
  Tab,
  Divider,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import LocalOfferIcon from "@mui/icons-material/LocalOffer";
import SearchIcon from "@mui/icons-material/Search";
import InventoryIcon from "@mui/icons-material/Inventory";
import CategoryIcon from "@mui/icons-material/Category";
import apiBe from "../../lib/axiosBe";
import { TableRowsSkeleton } from "../../components/TableSkeleton";

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

  // ── Fetch kategori saat tab berpindah ke tab 2 ──
  useEffect(() => {
    if (activeTab === 1) fetchCategoriesFull();
  }, [activeTab]);

  // ════════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════════

  return (
    <Box sx={{ p: 3, maxWidth: 1100, margin: "0 auto" }}>
      {/* ── Page Header ── */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2} flexWrap="wrap" gap={1}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <LocalOfferIcon color="secondary" />
          <Typography variant="h5" fontWeight="bold">Master Barang</Typography>
        </Stack>
        <Stack direction="row" spacing={1}>
          {activeTab === 0 && (
            <Button variant="contained" color="secondary" startIcon={<AddIcon />} onClick={handleOpenAddItem}>
              Tambah Barang
            </Button>
          )}
          {activeTab === 1 && (
            <Button variant="contained" color="info" startIcon={<AddIcon />} onClick={handleOpenAddCat}>
              Tambah Kategori
            </Button>
          )}
        </Stack>
      </Stack>

      {/* ── Tabs ── */}
      <Paper variant="outlined" sx={{ mb: 2, overflow: "hidden" }}>
        <Tabs
          value={activeTab}
          onChange={(_, v) => setActiveTab(v)}
          sx={{ borderBottom: 1, borderColor: "divider", bgcolor: "grey.50" }}
        >
          <Tab
            icon={<LocalOfferIcon fontSize="small" />}
            iconPosition="start"
            label={
              <Stack direction="row" spacing={0.75} alignItems="center">
                <span>Data Barang</span>
                <Chip label={items.length} size="small" color="secondary" sx={{ height: 18, fontSize: "0.65rem" }} />
              </Stack>
            }
            sx={{ fontWeight: 700, minHeight: 48 }}
          />
          <Tab
            icon={<CategoryIcon fontSize="small" />}
            iconPosition="start"
            label={
              <Stack direction="row" spacing={0.75} alignItems="center">
                <span>Kategori</span>
                <Chip label={categories.length} size="small" color="info" sx={{ height: 18, fontSize: "0.65rem" }} />
              </Stack>
            }
            sx={{ fontWeight: 700, minHeight: 48 }}
          />
        </Tabs>

        {/* ══════════ TAB 0: DATA BARANG ══════════ */}
        {activeTab === 0 && (
          <Box sx={{ p: 2 }}>
            {/* Summary Chips */}
            <Stack direction="row" spacing={1} mb={2} flexWrap="wrap">
              <Chip
                icon={<InventoryIcon fontSize="small" />}
                label={`Total stok: ${totalStock.toLocaleString("id-ID")}`}
                size="small" color="primary" variant="outlined"
              />
              {lowStock.length > 0 && (
                <Chip label={`${lowStock.length} stok menipis (≤5)`} size="small" color="warning" />
              )}
            </Stack>

            {/* Filter */}
            <Stack direction="row" spacing={1} mb={2} flexWrap="wrap">
              <TextField
                size="small"
                placeholder="Cari nama atau kode barang..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                InputProps={{ startAdornment: <SearchIcon fontSize="small" sx={{ mr: 1, color: "text.disabled" }} /> }}
                sx={{ width: 280 }}
              />
              <FormControl size="small" sx={{ minWidth: 180 }}>
                <InputLabel>Filter Kategori</InputLabel>
                <Select
                  label="Filter Kategori"
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                >
                  <MenuItem value="">Semua Kategori</MenuItem>
                  {categories.map((c) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
                </Select>
              </FormControl>
            </Stack>

            {/* Tabel Barang */}
            <TableContainer component={Paper} elevation={1}>
              <Table>
                <TableHead sx={{ bgcolor: "secondary.main" }}>
                  <TableRow>
                    <TableCell sx={{ color: "white", fontWeight: "bold", width: 45 }}>No</TableCell>
                    <TableCell sx={{ color: "white", fontWeight: "bold" }}>Kode</TableCell>
                    <TableCell sx={{ color: "white", fontWeight: "bold" }}>Nama Barang</TableCell>
                    <TableCell sx={{ color: "white", fontWeight: "bold" }}>Kategori</TableCell>
                    <TableCell sx={{ color: "white", fontWeight: "bold" }} align="right">Harga Satuan</TableCell>
                    <TableCell sx={{ color: "white", fontWeight: "bold" }} align="center">Stok</TableCell>
                    <TableCell sx={{ color: "white", fontWeight: "bold" }} align="center">Aksi</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loadingItems ? (
                    <TableRowsSkeleton rows={6} cols={7} />
                  ) : filteredItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 3, color: "text.secondary" }}>
                        Tidak ada data barang.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredItems.map((row, idx) => {
                      const stock = row.stock ?? 0;
                      const isLow = stock <= 5;
                      return (
                        <TableRow key={row.id} hover sx={isLow ? { bgcolor: "warning.50" } : {}}>
                          <TableCell>{idx + 1}</TableCell>
                          <TableCell sx={{ fontFamily: "monospace", fontWeight: 600 }}>{row.code}</TableCell>
                          <TableCell>{row.name}</TableCell>
                          <TableCell>
                            {row.category ? (
                              <Chip
                                icon={<CategoryIcon fontSize="small" />}
                                label={row.category.name}
                                size="small"
                                color="info"
                                variant="outlined"
                              />
                            ) : <span style={{ color: "#bbb" }}>—</span>}
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2" fontWeight={500}>
                              Rp {Number(row.price).toLocaleString("id-ID")}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Chip
                              label={stock.toLocaleString("id-ID")}
                              size="small"
                              color={stock === 0 ? "error" : isLow ? "warning" : "success"}
                              variant={stock === 0 ? "filled" : "outlined"}
                              sx={{ fontWeight: 700, minWidth: 48 }}
                            />
                          </TableCell>
                          <TableCell align="center">
                            <IconButton color="primary" size="small" onClick={() => handleOpenEditItem(row)}>
                              <EditIcon />
                            </IconButton>
                            <IconButton color="error" size="small" onClick={() => setDeleteItemId(row.id)}>
                              <DeleteIcon />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}

        {/* ══════════ TAB 1: KATEGORI ══════════ */}
        {activeTab === 1 && (
          <Box sx={{ p: 2 }}>
            <Typography variant="body2" color="text.secondary" mb={2}>
              Kelola kategori barang. Kategori dipakai untuk mengelompokkan barang agar mudah difilter.
            </Typography>
            <TableContainer component={Paper} elevation={1}>
              <Table>
                <TableHead sx={{ bgcolor: "info.main" }}>
                  <TableRow>
                    <TableCell sx={{ color: "white", fontWeight: "bold", width: 45 }}>No</TableCell>
                    <TableCell sx={{ color: "white", fontWeight: "bold" }}>Nama Kategori</TableCell>
                    <TableCell sx={{ color: "white", fontWeight: "bold" }}>Deskripsi</TableCell>
                    <TableCell sx={{ color: "white", fontWeight: "bold" }} align="center">Jml Barang</TableCell>
                    <TableCell sx={{ color: "white", fontWeight: "bold" }} align="center">Aksi</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loadingCats ? (
                    <TableRowsSkeleton rows={4} cols={5} />
                  ) : categories.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} align="center" sx={{ py: 3, color: "text.secondary" }}>
                        Belum ada kategori. Klik "Tambah Kategori" untuk mulai.
                      </TableCell>
                    </TableRow>
                  ) : (
                    categories.map((cat, idx) => {
                      const itemCount = items.filter((i) => i.category_id === cat.id).length;
                      return (
                        <TableRow key={cat.id} hover>
                          <TableCell>{idx + 1}</TableCell>
                          <TableCell>
                            <Stack direction="row" spacing={1} alignItems="center">
                              <CategoryIcon fontSize="small" color="info" />
                              <Typography variant="body2" fontWeight={600}>{cat.name}</Typography>
                            </Stack>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" color="text.secondary">
                              {cat.description || <span style={{ color: "#bbb" }}>—</span>}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Chip
                              label={`${itemCount} barang`}
                              size="small"
                              color={itemCount > 0 ? "secondary" : "default"}
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell align="center">
                            <IconButton color="primary" size="small" onClick={() => handleOpenEditCat(cat)}>
                              <EditIcon />
                            </IconButton>
                            <IconButton
                              color="error"
                              size="small"
                              disabled={itemCount > 0}
                              onClick={() => setDeleteCatId(cat.id)}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            {categories.some((c) => items.filter((i) => i.category_id === c.id).length > 0) && (
              <Alert severity="info" sx={{ mt: 1.5 }} icon={false}>
                <Typography variant="caption">
                  Tombol hapus dinonaktifkan jika kategori masih memiliki barang. Pindahkan atau ubah kategori barang terlebih dahulu.
                </Typography>
              </Alert>
            )}
          </Box>
        )}
      </Paper>

      {/* ════════════════════════════════════════════
          DIALOGS — BARANG
      ════════════════════════════════════════════ */}

      {/* Form Barang */}
      <Dialog open={itemOpen} onClose={() => setItemOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{isItemEdit ? "Edit Barang" : "Tambah Barang Baru"}</DialogTitle>
        <Divider />
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Kode Barang *"
              fullWidth
              value={itemForm.code}
              onChange={(e) => setItemForm({ ...itemForm, code: e.target.value })}
              placeholder="Contoh: ITEM-A"
            />
            <TextField
              label="Nama Barang *"
              fullWidth
              value={itemForm.name}
              onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
            />
            <FormControl fullWidth>
              <InputLabel>Kategori</InputLabel>
              <Select
                label="Kategori"
                value={itemForm.category_id}
                onChange={(e) => setItemForm({ ...itemForm, category_id: e.target.value })}
              >
                <MenuItem value="">— Tanpa Kategori —</MenuItem>
                {categories.map((c) => (
                  <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Harga Satuan *"
              fullWidth
              type="number"
              value={itemForm.price}
              onChange={(e) => setItemForm({ ...itemForm, price: e.target.value })}
              InputProps={{ startAdornment: <InputAdornment position="start">Rp</InputAdornment> }}
            />
            <TextField
              label="Stok Gudang"
              fullWidth
              type="number"
              value={itemForm.stock}
              onChange={(e) => setItemForm({ ...itemForm, stock: e.target.value })}
              inputProps={{ min: 0 }}
              helperText={isItemEdit ? "Set stok manual (disesuaikan otomatis saat dropping/invoice)" : "Stok awal barang di gudang"}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <InventoryIcon fontSize="small" color="action" />
                  </InputAdornment>
                ),
              }}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setItemOpen(false)} color="inherit">Batal</Button>
          <Button onClick={handleSaveItem} variant="contained" color="secondary" disabled={savingItem}>
            {savingItem ? "Menyimpan..." : "Simpan"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Hapus Barang */}
      <Dialog open={deleteItemId !== null} onClose={() => setDeleteItemId(null)} maxWidth="xs">
        <DialogTitle>Hapus Barang?</DialogTitle>
        <DialogContent>
          <Typography>Data barang akan dihapus permanen. Yakin?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteItemId(null)} color="inherit">Batal</Button>
          <Button onClick={handleDeleteItem} color="error" variant="contained" disabled={deletingItem}>
            {deletingItem ? "Menghapus..." : "Hapus"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ════════════════════════════════════════════
          DIALOGS — KATEGORI
      ════════════════════════════════════════════ */}

      {/* Form Kategori */}
      <Dialog open={catOpen} onClose={() => setCatOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{isCatEdit ? "Edit Kategori" : "Tambah Kategori Baru"}</DialogTitle>
        <Divider />
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Nama Kategori *"
              fullWidth
              value={catForm.name}
              onChange={(e) => setCatForm({ ...catForm, name: e.target.value })}
              placeholder="Contoh: Minuman, Makanan, dll."
            />
            <TextField
              label="Deskripsi"
              fullWidth
              multiline
              rows={2}
              value={catForm.description}
              onChange={(e) => setCatForm({ ...catForm, description: e.target.value })}
              placeholder="Opsional..."
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setCatOpen(false)} color="inherit">Batal</Button>
          <Button onClick={handleSaveCat} variant="contained" color="info" disabled={savingCat}>
            {savingCat ? "Menyimpan..." : "Simpan"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Hapus Kategori */}
      <Dialog open={deleteCatId !== null} onClose={() => setDeleteCatId(null)} maxWidth="xs">
        <DialogTitle>Hapus Kategori?</DialogTitle>
        <DialogContent>
          <Typography>Kategori ini akan dihapus permanen. Yakin?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteCatId(null)} color="inherit">Batal</Button>
          <Button onClick={handleDeleteCat} color="error" variant="contained" disabled={deletingCat}>
            {deletingCat ? "Menghapus..." : "Hapus"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Snackbar ── */}
      <Snackbar
        open={snack.open}
        autoHideDuration={3000}
        onClose={() => setSnack((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity={snack.severity} onClose={() => setSnack((s) => ({ ...s, open: false }))}>
          {snack.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
}