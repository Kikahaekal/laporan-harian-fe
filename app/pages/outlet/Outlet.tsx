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
  Stack
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import StoreIcon from "@mui/icons-material/Store";
import api from "../../lib/axios";

// ✅ TAMBAHKAN FUNGSI getCookie
const getCookie = (name: string) => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    const cookieValue = parts.pop()?.split(";").shift();
    return cookieValue ? decodeURIComponent(cookieValue) : undefined;
  }
};

// Tipe Data Outlet
interface OutletData {
  id: number;
  code: string;
  name: string;
}

export default function Outlet() {
  // STATE DATA
  const [outlets, setOutlets] = useState<OutletData[]>([]);
  const [loading, setLoading] = useState(true);
  
  // STATE MODAL
  const [open, setOpen] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  
  // STATE FORM
  const [formData, setFormData] = useState({ code: "", name: "" });
  const [saving, setSaving] = useState(false);

  // 1. LOAD DATA
  const fetchOutlets = async () => {
    try {
      setLoading(true);
      const res = await api.get("/api/outlets");
      setOutlets(res.data);
    } catch (error) {
      console.error("Gagal load outlet:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOutlets();
  }, []);

  // 2. HANDLER BUKA MODAL
  const handleOpenAdd = () => {
    setIsEdit(false);
    setFormData({ code: "", name: "" });
    setOpen(true);
  };

  const handleOpenEdit = (outlet: OutletData) => {
    setIsEdit(true);
    setEditId(outlet.id);
    setFormData({ code: outlet.code, name: outlet.name });
    setOpen(true);
  };

  const handleClose = () => setOpen(false);

  // ✅ 3. HANDLER SIMPAN (DENGAN CSRF TOKEN)
  const handleSave = async () => {
    if (!formData.code || !formData.name) {
      return alert("Semua field harus diisi!");
    }
    
    setSaving(true);
    try {
      // Ambil CSRF token
      let token = getCookie("XSRF-TOKEN");
      
      if (!token) {
        await api.get('/sanctum/csrf-cookie');
        await new Promise(resolve => setTimeout(resolve, 100));
        token = getCookie("XSRF-TOKEN");
      }
      
      // Kirim request dengan header CSRF
      if (isEdit && editId) {
        await api.put(`/api/outlets/${editId}`, formData, {
          headers: {
            "X-XSRF-TOKEN": token || "",
          },
        });
      } else {
        await api.post("/api/outlets", formData, {
          headers: {
            "X-XSRF-TOKEN": token || "",
          },
        });
      }
      
      await fetchOutlets(); 
      handleClose();
    } catch (error: any) {
      console.error(error);
      alert(error.response?.data?.message || "Gagal menyimpan data.");
    } finally {
      setSaving(false);
    }
  };

  // ✅ 4. HANDLER HAPUS (DENGAN CSRF TOKEN)
  const handleDelete = async (id: number) => {
    if (!confirm("Yakin ingin menghapus outlet ini?")) return;

    try {
      // Ambil CSRF token
      let token = getCookie("XSRF-TOKEN");
      
      if (!token) {
        await api.get('/sanctum/csrf-cookie');
        await new Promise(resolve => setTimeout(resolve, 100));
        token = getCookie("XSRF-TOKEN");
      }

      // Kirim request dengan header CSRF
      await api.delete(`/api/outlets/${id}`, {
        headers: {
          "X-XSRF-TOKEN": token || "",
        },
      });
      
      fetchOutlets();
    } catch (error) {
      console.error(error);
      alert("Gagal menghapus data.");
    }
  };

  return (
    <Box sx={{ p: 3, maxWidth: 1000, margin: "0 auto" }}>
      {/* HEADER */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <StoreIcon color="primary" /> Data Outlet
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenAdd}>
          Tambah Outlet
        </Button>
      </Stack>

      {/* TABEL DATA */}
      <Paper elevation={2}>
        <TableContainer>
          <Table>
            <TableHead sx={{ bgcolor: "primary.main" }}>
              <TableRow>
                <TableCell sx={{ color: "white", fontWeight: "bold", width: "50px" }}>No</TableCell>
                <TableCell sx={{ color: "white", fontWeight: "bold" }}>Kode Outlet</TableCell>
                <TableCell sx={{ color: "white", fontWeight: "bold" }}>Nama Outlet</TableCell>
                <TableCell sx={{ color: "white", fontWeight: "bold", textAlign: "center" }}>Aksi</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} align="center"><CircularProgress sx={{ mt: 2 }} /></TableCell>
                </TableRow>
              ) : outlets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} align="center">Tidak ada data outlet.</TableCell>
                </TableRow>
              ) : (
                outlets.map((row, idx) => (
                  <TableRow key={row.id} hover>
                    <TableCell>{idx + 1}</TableCell>
                    <TableCell>{row.code}</TableCell>
                    <TableCell>{row.name}</TableCell>
                    <TableCell align="center">
                      <IconButton color="primary" size="small" onClick={() => handleOpenEdit(row)}>
                        <EditIcon />
                      </IconButton>
                      <IconButton color="error" size="small" onClick={() => handleDelete(row.id)}>
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

      {/* MODAL FORM (Create/Edit) */}
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>{isEdit ? "Edit Outlet" : "Tambah Outlet Baru"}</DialogTitle>
        <DialogContent>
          <Box component="form" sx={{ mt: 1, display: "flex", flexDirection: "column", gap: 2 }}>
            <TextField
              label="Kode Outlet (misal: OUT-001)"
              fullWidth
              variant="outlined"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
            />
            <TextField
              label="Nama Outlet"
              fullWidth
              variant="outlined"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handleClose} color="inherit">Batal</Button>
          <Button onClick={handleSave} variant="contained" disabled={saving}>
            {saving ? "Menyimpan..." : "Simpan"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}