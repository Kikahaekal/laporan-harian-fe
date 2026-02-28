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
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import LocalOfferIcon from "@mui/icons-material/LocalOffer";
import SearchIcon from "@mui/icons-material/Search";
import InventoryIcon from "@mui/icons-material/Inventory";
import apiBe from "../../lib/axiosBe";
import { TableRowsSkeleton } from "../../components/TableSkeleton";

interface ItemData {
  id: number;
  code: string;
  name: string;
  price: number;
  stock: number;
}

const EMPTY_FORM = { code: "", name: "", price: "", stock: "0" };

export default function Item() {
  const [items, setItems] = useState<ItemData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [open, setOpen] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);

  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [snack, setSnack] = useState<{ open: boolean; msg: string; severity: "success" | "error" }>({
    open: false, msg: "", severity: "success",
  });

  const showSnack = (msg: string, severity: "success" | "error" = "success") =>
    setSnack({ open: true, msg, severity });

  const fetchItems = async () => {
    try {
      setLoading(true);
      const res = await apiBe.get("/api/web/items");
      const raw = res.data;
      setItems(Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : []);
    } catch {
      showSnack("Gagal memuat data item.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchItems(); }, []);

  const filtered = items.filter(
    (i) =>
      i.name.toLowerCase().includes(search.toLowerCase()) ||
      i.code.toLowerCase().includes(search.toLowerCase())
  );

  const handleOpenAdd = () => {
    setIsEdit(false);
    setFormData({ ...EMPTY_FORM });
    setOpen(true);
  };

  const handleOpenEdit = (item: ItemData) => {
    setIsEdit(true);
    setEditId(item.id);
    setFormData({
      code: item.code,
      name: item.name,
      price: String(item.price),
      stock: String(item.stock ?? 0),
    });
    setOpen(true);
  };

  const handleSave = async () => {
    if (!formData.code || !formData.name || !formData.price) {
      showSnack("Kode, nama, dan harga wajib diisi!", "error");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...formData,
        price: Number(formData.price),
        stock: Number(formData.stock) || 0,
      };
      if (isEdit && editId) {
        await apiBe.put(`/api/web/items/${editId}`, payload);
      } else {
        await apiBe.post("/api/web/items", payload);
      }
      await fetchItems();
      setOpen(false);
      showSnack(isEdit ? "Item berhasil diperbarui." : "Item berhasil ditambahkan.");
    } catch (err: any) {
      showSnack(err.response?.data?.message || "Gagal menyimpan item.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await apiBe.delete(`/api/web/items/${deleteId}`);
      await fetchItems();
      setDeleteId(null);
      showSnack("Item berhasil dihapus.");
    } catch {
      showSnack("Gagal menghapus item.", "error");
    } finally {
      setDeleting(false);
    }
  };

  // Hitung total stok semua barang
  const totalStock = items.reduce((s, i) => s + (i.stock ?? 0), 0);
  const lowStock = items.filter((i) => (i.stock ?? 0) <= 5);

  return (
    <Box sx={{ p: 3, maxWidth: 1100, margin: "0 auto" }}>
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={1}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <LocalOfferIcon color="secondary" />
          <Typography variant="h5" fontWeight="bold">Data Barang</Typography>
          <Chip label={`${items.length} item`} size="small" variant="outlined" />
          <Chip
            icon={<InventoryIcon fontSize="small" />}
            label={`Total stok: ${totalStock.toLocaleString("id-ID")}`}
            size="small"
            color="primary"
            variant="outlined"
          />
          {lowStock.length > 0 && (
            <Chip label={`${lowStock.length} stok menipis`} size="small" color="warning" />
          )}
        </Stack>
        <Button variant="contained" color="secondary" startIcon={<AddIcon />} onClick={handleOpenAdd}>
          Tambah Barang
        </Button>
      </Stack>

      {/* Search */}
      <TextField
        size="small"
        placeholder="Cari nama atau kode barang..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        InputProps={{ startAdornment: <SearchIcon fontSize="small" sx={{ mr: 1, color: "text.disabled" }} /> }}
        sx={{ mb: 2, width: 300 }}
      />

      {/* Tabel */}
      <Paper elevation={2}>
        <TableContainer>
          <Table>
            <TableHead sx={{ bgcolor: "secondary.main" }}>
              <TableRow>
                <TableCell sx={{ color: "white", fontWeight: "bold", width: 45 }}>No</TableCell>
                <TableCell sx={{ color: "white", fontWeight: "bold" }}>Kode Barang</TableCell>
                <TableCell sx={{ color: "white", fontWeight: "bold" }}>Nama Barang</TableCell>
                <TableCell sx={{ color: "white", fontWeight: "bold" }} align="right">Harga Satuan</TableCell>
                <TableCell sx={{ color: "white", fontWeight: "bold" }} align="center">Stok Gudang</TableCell>
                <TableCell sx={{ color: "white", fontWeight: "bold", textAlign: "center" }}>Aksi</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRowsSkeleton rows={6} cols={6} />
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={6} align="center" sx={{ py: 3, color: "text.secondary" }}>Tidak ada data barang.</TableCell></TableRow>
              ) : (
                filtered.map((row, idx) => {
                  const stock = row.stock ?? 0;
                  const isLow = stock <= 5;
                  return (
                    <TableRow key={row.id} hover sx={isLow ? { bgcolor: "warning.50" } : {}}>
                      <TableCell>{idx + 1}</TableCell>
                      <TableCell sx={{ fontFamily: "monospace", fontWeight: 600 }}>{row.code}</TableCell>
                      <TableCell>{row.name}</TableCell>
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
                        <IconButton color="primary" size="small" onClick={() => handleOpenEdit(row)}>
                          <EditIcon />
                        </IconButton>
                        <IconButton color="error" size="small" onClick={() => setDeleteId(row.id)}>
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
      </Paper>

      {/* Form Dialog */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{isEdit ? "Edit Barang" : "Tambah Barang Baru"}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Kode Barang *"
              fullWidth
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              placeholder="Contoh: ITEM-A"
            />
            <TextField
              label="Nama Barang *"
              fullWidth
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
            <TextField
              label="Harga Satuan *"
              fullWidth
              type="number"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              InputProps={{
                startAdornment: <InputAdornment position="start">Rp</InputAdornment>,
              }}
            />
            <TextField
              label="Stok Gudang"
              fullWidth
              type="number"
              value={formData.stock}
              onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
              inputProps={{ min: 0 }}
              helperText={isEdit ? "Set stok manual (stok akan disesuaikan otomatis saat dropping/invoice)" : "Stok awal barang di gudang"}
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
          <Button onClick={() => setOpen(false)} color="inherit">Batal</Button>
          <Button onClick={handleSave} variant="contained" color="secondary" disabled={saving}>
            {saving ? "Menyimpan..." : "Simpan"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={deleteId !== null} onClose={() => setDeleteId(null)} maxWidth="xs">
        <DialogTitle>Hapus Barang?</DialogTitle>
        <DialogContent>
          <Typography>Data barang akan dihapus permanen. Yakin?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteId(null)} color="inherit">Batal</Button>
          <Button onClick={handleDelete} color="error" variant="contained" disabled={deleting}>
            {deleting ? "Menghapus..." : "Hapus"}
          </Button>
        </DialogActions>
      </Dialog>

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