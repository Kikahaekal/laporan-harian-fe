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
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import StoreIcon from "@mui/icons-material/Store";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import SearchIcon from "@mui/icons-material/Search";
import apiBe from "../../lib/axiosBe";
import MapPicker from "../../components/MapPicker";

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

export default function Outlet() {
  const [outlets, setOutlets] = useState<OutletData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

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

  // Snackbar
  const [snack, setSnack] = useState<{ open: boolean; msg: string; severity: "success" | "error" }>({
    open: false, msg: "", severity: "success",
  });

  const showSnack = (msg: string, severity: "success" | "error" = "success") =>
    setSnack({ open: true, msg, severity });

  const fetchOutlets = async () => {
    try {
      setLoading(true);
      const res = await apiBe.get("/api/web/outlets");
      const raw = res.data;
      setOutlets(Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : []);
    } catch {
      showSnack("Gagal memuat data outlet.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOutlets(); }, []);

  const filtered = outlets.filter(
    (o) =>
      o.name.toLowerCase().includes(search.toLowerCase()) ||
      o.code.toLowerCase().includes(search.toLowerCase())
  );

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
    <Box sx={{ p: 3, maxWidth: 1100, margin: "0 auto" }}>
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={1}>
        <Typography variant="h5" fontWeight="bold" sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <StoreIcon color="primary" /> Data Outlet
          <Chip label={`${outlets.length} outlet`} size="small" variant="outlined" sx={{ ml: 1 }} />
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenAdd}>
          Tambah Outlet
        </Button>
      </Stack>

      {/* Search */}
      <TextField
        size="small"
        placeholder="Cari nama atau kode outlet..."
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
                <TableCell sx={{ color: "white", fontWeight: "bold" }}>Kode</TableCell>
                <TableCell sx={{ color: "white", fontWeight: "bold" }}>Nama Outlet</TableCell>
                <TableCell sx={{ color: "white", fontWeight: "bold" }}>Alamat</TableCell>
                <TableCell sx={{ color: "white", fontWeight: "bold" }}>Hari Kunjungan</TableCell>
                <TableCell sx={{ color: "white", fontWeight: "bold", textAlign: "center" }}>Aksi</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={6} align="center"><CircularProgress sx={{ mt: 2 }} /></TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={6} align="center" sx={{ py: 3, color: "text.secondary" }}>Tidak ada data outlet.</TableCell></TableRow>
              ) : (
                filtered.map((row, idx) => (
                  <TableRow key={row.id} hover>
                    <TableCell>{idx + 1}</TableCell>
                    <TableCell sx={{ fontFamily: "monospace", fontWeight: 600 }}>{row.code}</TableCell>
                    <TableCell>{row.name}</TableCell>
                    <TableCell sx={{ maxWidth: 200 }}>
                      <Typography variant="body2" noWrap title={row.address}>
                        {row.address || <span style={{ color: "#bbb" }}>—</span>}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {row.visit_day ? (
                        <Chip label={row.visit_day} size="small" color="info" variant="outlined" />
                      ) : <span style={{ color: "#bbb" }}>—</span>}
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
        <DialogTitle>{isEdit ? "Edit Outlet" : "Tambah Outlet Baru"}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Kode Outlet *"
              fullWidth
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              placeholder="Contoh: OUT-001"
            />
            <TextField
              label="Nama Outlet *"
              fullWidth
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
            <TextField
              label="Alamat"
              fullWidth
              multiline
              rows={2}
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            />
            <FormControl fullWidth>
              <InputLabel>Hari Kunjungan</InputLabel>
              <Select
                label="Hari Kunjungan"
                value={formData.visit_day}
                onChange={(e) => setFormData({ ...formData, visit_day: e.target.value })}
              >
                <MenuItem value="">— Tidak Ditentukan —</MenuItem>
                {VISIT_DAYS.map((d) => <MenuItem key={d} value={d}>{d}</MenuItem>)}
              </Select>
            </FormControl>
            <Stack direction="row" spacing={1} alignItems="flex-start" flexWrap="wrap">
              <TextField
                label="Latitude" size="small"
                value={formData.coor_latitude === "" ? "" : formData.coor_latitude}
                inputProps={{ readOnly: true }}
                sx={{ flex: "1 1 120px" }}
              />
              <TextField
                label="Longitude" size="small"
                value={formData.coor_longitude === "" ? "" : formData.coor_longitude}
                inputProps={{ readOnly: true }}
                sx={{ flex: "1 1 120px" }}
              />
              <Button
                variant="outlined"
                startIcon={<LocationOnIcon />}
                onClick={() => setMapPickerOpen(true)}
                sx={{ alignSelf: "center" }}
              >
                Pilih Peta
              </Button>
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpen(false)} color="inherit">Batal</Button>
          <Button onClick={handleSave} variant="contained" disabled={saving}>
            {saving ? "Menyimpan..." : "Simpan"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={deleteId !== null} onClose={() => setDeleteId(null)} maxWidth="xs">
        <DialogTitle>Hapus Outlet?</DialogTitle>
        <DialogContent>
          <Typography>Data outlet akan dihapus permanen. Yakin?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteId(null)} color="inherit">Batal</Button>
          <Button onClick={handleDelete} color="error" variant="contained" disabled={deleting}>
            {deleting ? "Menghapus..." : "Hapus"}
          </Button>
        </DialogActions>
      </Dialog>

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