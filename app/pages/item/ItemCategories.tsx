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
    Chip,
    Alert,
    Snackbar,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import CategoryIcon from "@mui/icons-material/Category";
import apiBe from "../../lib/axiosBe";
import { TableRowsSkeleton } from "../../components/TableSkeleton";

interface CategoryData {
    id: number;
    name: string;
    description?: string;
    items_count?: number;
}

const EMPTY_FORM = { name: "", description: "" };

export default function ItemCategories() {
    const [categories, setCategories] = useState<CategoryData[]>([]);
    const [loading, setLoading] = useState(true);

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

    const fetchCategories = async () => {
        try {
            setLoading(true);
            const res = await apiBe.get("/api/web/item-categories");
            const raw = res.data;
            setCategories(Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : []);
        } catch {
            showSnack("Gagal memuat data kategori.", "error");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchCategories(); }, []);

    const handleOpenAdd = () => {
        setIsEdit(false);
        setFormData({ ...EMPTY_FORM });
        setOpen(true);
    };

    const handleOpenEdit = (cat: CategoryData) => {
        setIsEdit(true);
        setEditId(cat.id);
        setFormData({ name: cat.name, description: cat.description ?? "" });
        setOpen(true);
    };

    const handleSave = async () => {
        if (!formData.name.trim()) {
            showSnack("Nama kategori wajib diisi!", "error");
            return;
        }
        setSaving(true);
        try {
            const payload = {
                name: formData.name.trim(),
                description: formData.description.trim() || null,
            };
            if (isEdit && editId) {
                await apiBe.put(`/api/web/item-categories/${editId}`, payload);
            } else {
                await apiBe.post("/api/web/item-categories", payload);
            }
            await fetchCategories();
            setOpen(false);
            showSnack(isEdit ? "Kategori berhasil diperbarui." : "Kategori berhasil ditambahkan.");
        } catch (err: any) {
            showSnack(err.response?.data?.message || "Gagal menyimpan kategori.", "error");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteId) return;
        setDeleting(true);
        try {
            await apiBe.delete(`/api/web/item-categories/${deleteId}`);
            await fetchCategories();
            setDeleteId(null);
            showSnack("Kategori berhasil dihapus.");
        } catch (err: any) {
            showSnack(err.response?.data?.message || "Gagal menghapus kategori.", "error");
        } finally {
            setDeleting(false);
        }
    };

    return (
        <Box sx={{ p: 3, maxWidth: 800, margin: "0 auto" }}>
            {/* Header */}
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={1}>
                <Stack direction="row" alignItems="center" spacing={1}>
                    <CategoryIcon color="info" />
                    <Typography variant="h5" fontWeight="bold">Kategori Barang</Typography>
                    <Chip label={`${categories.length} kategori`} size="small" variant="outlined" />
                </Stack>
                <Button variant="contained" color="info" startIcon={<AddIcon />} onClick={handleOpenAdd}>
                    Tambah Kategori
                </Button>
            </Stack>

            <Paper elevation={2}>
                <TableContainer>
                    <Table>
                        <TableHead sx={{ bgcolor: "info.main" }}>
                            <TableRow>
                                <TableCell sx={{ color: "white", fontWeight: "bold", width: 45 }}>No</TableCell>
                                <TableCell sx={{ color: "white", fontWeight: "bold" }}>Nama Kategori</TableCell>
                                <TableCell sx={{ color: "white", fontWeight: "bold" }}>Deskripsi</TableCell>
                                <TableCell sx={{ color: "white", fontWeight: "bold" }} align="center">Jumlah Barang</TableCell>
                                <TableCell sx={{ color: "white", fontWeight: "bold" }} align="center">Aksi</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loading ? (
                                <TableRowsSkeleton rows={4} cols={5} />
                            ) : categories.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} align="center" sx={{ py: 4, color: "text.secondary" }}>
                                        Belum ada kategori. Klik "Tambah Kategori" untuk membuat yang pertama.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                categories.map((cat, idx) => (
                                    <TableRow key={cat.id} hover>
                                        <TableCell>{idx + 1}</TableCell>
                                        <TableCell>
                                            <Stack direction="row" alignItems="center" spacing={1}>
                                                <CategoryIcon fontSize="small" color="info" />
                                                <Typography fontWeight={600}>{cat.name}</Typography>
                                            </Stack>
                                        </TableCell>
                                        <TableCell sx={{ color: "text.secondary" }}>
                                            {cat.description || <span style={{ color: "#bbb" }}>—</span>}
                                        </TableCell>
                                        <TableCell align="center">
                                            <Chip
                                                label={cat.items_count ?? 0}
                                                size="small"
                                                color={(cat.items_count ?? 0) > 0 ? "success" : "default"}
                                                variant="outlined"
                                                sx={{ fontWeight: 700, minWidth: 36 }}
                                            />
                                        </TableCell>
                                        <TableCell align="center">
                                            <IconButton color="primary" size="small" onClick={() => handleOpenEdit(cat)}>
                                                <EditIcon />
                                            </IconButton>
                                            <IconButton
                                                color="error"
                                                size="small"
                                                onClick={() => setDeleteId(cat.id)}
                                                disabled={(cat.items_count ?? 0) > 0}
                                                title={(cat.items_count ?? 0) > 0 ? "Tidak bisa hapus: masih ada barang dalam kategori ini" : ""}
                                            >
                                                <DeleteIcon />
                                            </IconButton>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>

            {/* Form Dialog */}
            <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>{isEdit ? "Edit Kategori" : "Tambah Kategori Baru"}</DialogTitle>
                <DialogContent>
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        <TextField
                            label="Nama Kategori *"
                            fullWidth
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="Contoh: Minuman, Makanan, Rokok"
                        />
                        <TextField
                            label="Deskripsi (opsional)"
                            fullWidth
                            multiline
                            rows={2}
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Keterangan tambahan tentang kategori ini"
                        />
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setOpen(false)} color="inherit">Batal</Button>
                    <Button onClick={handleSave} variant="contained" color="info" disabled={saving}>
                        {saving ? "Menyimpan..." : "Simpan"}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Delete Confirm */}
            <Dialog open={deleteId !== null} onClose={() => setDeleteId(null)} maxWidth="xs">
                <DialogTitle>Hapus Kategori?</DialogTitle>
                <DialogContent>
                    <Typography>Kategori akan dihapus permanen. Barang yang terkait akan kehilangan kategorinya. Yakin?</Typography>
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
