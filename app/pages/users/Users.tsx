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
    CircularProgress,
    Stack,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Chip,
    Alert,
    Snackbar,
    InputAdornment,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import ManageAccountsIcon from "@mui/icons-material/ManageAccounts";
import SearchIcon from "@mui/icons-material/Search";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import apiBe from "../../lib/axiosBe";

interface UserData {
    id: number;
    name: string;
    email: string;
    role?: string;
}

const ROLES = ["admin", "sales"];

const EMPTY_FORM = {
    name: "",
    email: "",
    password: "",
    role: "sales",
};

export default function Users() {
    const [users, setUsers] = useState<UserData[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");

    const [open, setOpen] = useState(false);
    const [isEdit, setIsEdit] = useState(false);
    const [editId, setEditId] = useState<number | null>(null);
    const [formData, setFormData] = useState({ ...EMPTY_FORM });
    const [saving, setSaving] = useState(false);
    const [showPw, setShowPw] = useState(false);

    const [deleteId, setDeleteId] = useState<number | null>(null);
    const [deleting, setDeleting] = useState(false);

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

    useEffect(() => { fetchUsers(); }, []);

    const filtered = users.filter(
        (u) =>
            u.name.toLowerCase().includes(search.toLowerCase()) ||
            u.email.toLowerCase().includes(search.toLowerCase())
    );

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
            // Kalau edit dan password kosong, jangan kirim password
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

    const deleteTarget = users.find((u) => u.id === deleteId);

    return (
        <Box sx={{ p: 3, maxWidth: 900, margin: "0 auto" }}>
            {/* Header */}
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={1}>
                <Typography variant="h5" fontWeight="bold" sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <ManageAccountsIcon color="primary" /> Manajemen Pengguna
                    <Chip label={`${users.length} user`} size="small" variant="outlined" sx={{ ml: 1 }} />
                </Typography>
                <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenAdd}>
                    Tambah Pengguna
                </Button>
            </Stack>

            <Alert severity="info" sx={{ mb: 2 }}>
                Pengguna yang ditambahkan di sini dapat login ke <strong>Aplikasi Android</strong> sebagai akun sales.
            </Alert>

            {/* Search */}
            <TextField
                size="small"
                placeholder="Cari nama atau email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                InputProps={{ startAdornment: <SearchIcon fontSize="small" sx={{ mr: 1, color: "text.disabled" }} /> }}
                sx={{ mb: 2, width: 300 }}
            />

            {/* Tabel */}
            <Paper elevation={2}>
                <TableContainer>
                    <Table>
                        <TableHead sx={{ bgcolor: "primary.main" }}>
                            <TableRow>
                                <TableCell sx={{ color: "white", fontWeight: "bold", width: 45 }}>No</TableCell>
                                <TableCell sx={{ color: "white", fontWeight: "bold" }}>Nama</TableCell>
                                <TableCell sx={{ color: "white", fontWeight: "bold" }}>Email</TableCell>
                                <TableCell sx={{ color: "white", fontWeight: "bold" }}>Role</TableCell>
                                <TableCell sx={{ color: "white", fontWeight: "bold", textAlign: "center" }}>Aksi</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loading ? (
                                <TableRow><TableCell colSpan={5} align="center"><CircularProgress sx={{ mt: 2 }} /></TableCell></TableRow>
                            ) : filtered.length === 0 ? (
                                <TableRow><TableCell colSpan={5} align="center" sx={{ py: 3, color: "text.secondary" }}>Tidak ada data pengguna.</TableCell></TableRow>
                            ) : (
                                filtered.map((row, idx) => (
                                    <TableRow key={row.id} hover>
                                        <TableCell>{idx + 1}</TableCell>
                                        <TableCell sx={{ fontWeight: 500 }}>{row.name}</TableCell>
                                        <TableCell sx={{ color: "text.secondary", fontSize: "0.85rem" }}>{row.email}</TableCell>
                                        <TableCell>
                                            <Chip
                                                label={row.role ?? "sales"}
                                                size="small"
                                                color={row.role === "admin" ? "error" : "primary"}
                                                variant="outlined"
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
                                ))
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>

            {/* Form Dialog */}
            <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>{isEdit ? "Edit Pengguna" : "Tambah Pengguna Baru"}</DialogTitle>
                <DialogContent>
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        <TextField
                            label="Nama Lengkap *"
                            fullWidth
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        />
                        <TextField
                            label="Email *"
                            type="email"
                            fullWidth
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        />
                        <TextField
                            label={isEdit ? "Password Baru (kosongkan jika tidak diubah)" : "Password *"}
                            type={showPw ? "text" : "password"}
                            fullWidth
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            InputProps={{
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton size="small" onClick={() => setShowPw((v) => !v)}>
                                            {showPw ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                                        </IconButton>
                                    </InputAdornment>
                                ),
                            }}
                        />
                        <FormControl fullWidth>
                            <InputLabel>Role</InputLabel>
                            <Select
                                label="Role"
                                value={formData.role}
                                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                            >
                                {ROLES.map((r) => (
                                    <MenuItem key={r} value={r}>
                                        {r === "admin" ? "Admin (Web)" : "Sales (Android)"}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setOpen(false)} color="inherit">Batal</Button>
                    <Button onClick={handleSave} variant="contained" disabled={saving}>
                        {saving ? "Menyimpan..." : "Simpan"}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Delete Confirm */}
            <Dialog open={deleteId !== null} onClose={() => setDeleteId(null)} maxWidth="xs">
                <DialogTitle>Hapus Pengguna?</DialogTitle>
                <DialogContent>
                    <Typography>
                        Hapus pengguna <strong>{deleteTarget?.name}</strong> ({deleteTarget?.email})?
                        Aksi ini tidak bisa dibatalkan.
                    </Typography>
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
