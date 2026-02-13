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
  InputAdornment
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import LocalOfferIcon from "@mui/icons-material/LocalOffer";
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

// Tipe Data Item
interface ItemData {
  id: number;
  code: string;
  name: string;
  price: number;
}

export default function Item() {
  const [items, setItems] = useState<ItemData[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal State
  const [open, setOpen] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  
  // Form State
  const [formData, setFormData] = useState({ code: "", name: "", price: "" });
  const [saving, setSaving] = useState(false);

  // LOAD DATA
  const fetchItems = async () => {
    try {
      setLoading(true);
      const res = await api.get("/api/items");
      setItems(res.data);
    } catch (error) {
      console.error("Gagal load items:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  // OPEN MODAL HANDLERS
  const handleOpenAdd = () => {
    setIsEdit(false);
    setFormData({ code: "", name: "", price: "" });
    setOpen(true);
  };

  const handleOpenEdit = (item: ItemData) => {
    setIsEdit(true);
    setEditId(item.id);
    setFormData({ 
      code: item.code, 
      name: item.name, 
      price: String(item.price)
    });
    setOpen(true);
  };

  const handleClose = () => setOpen(false);

  // ✅ SAVE HANDLER (DENGAN CSRF TOKEN)
  const handleSave = async () => {
    if (!formData.code || !formData.name || !formData.price) {
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
      
      const payload = {
        ...formData,
        price: Number(formData.price)
      };

      // Kirim request dengan header CSRF
      if (isEdit && editId) {
        await api.put(`/api/items/${editId}`, payload, {
          headers: {
            "X-XSRF-TOKEN": token || "",
          },
        });
      } else {
        await api.post("/api/items", payload, {
          headers: {
            "X-XSRF-TOKEN": token || "",
          },
        });
      }
      
      await fetchItems();
      handleClose();
    } catch (error: any) {
      console.error(error);
      alert(error.response?.data?.message || "Gagal menyimpan data.");
    } finally {
      setSaving(false);
    }
  };

  // ✅ DELETE HANDLER (DENGAN CSRF TOKEN)
  const handleDelete = async (id: number) => {
    if (!confirm("Yakin ingin menghapus item ini?")) return;
    
    try {
      // Ambil CSRF token
      let token = getCookie("XSRF-TOKEN");
      
      if (!token) {
        await api.get('/sanctum/csrf-cookie');
        await new Promise(resolve => setTimeout(resolve, 100));
        token = getCookie("XSRF-TOKEN");
      }

      // Kirim request dengan header CSRF
      await api.delete(`/api/items/${id}`, {
        headers: {
          "X-XSRF-TOKEN": token || "",
        },
      });
      
      fetchItems();
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
          <LocalOfferIcon color="secondary" /> Data Barang (Items)
        </Typography>
        <Button variant="contained" color="secondary" startIcon={<AddIcon />} onClick={handleOpenAdd}>
          Tambah Barang
        </Button>
      </Stack>

      {/* TABLE */}
      <Paper elevation={2}>
        <TableContainer>
          <Table>
            <TableHead sx={{ bgcolor: "secondary.main" }}>
              <TableRow>
                <TableCell sx={{ color: "white", fontWeight: "bold", width: "50px" }}>No</TableCell>
                <TableCell sx={{ color: "white", fontWeight: "bold" }}>Kode Barang</TableCell>
                <TableCell sx={{ color: "white", fontWeight: "bold" }}>Nama Barang</TableCell>
                <TableCell sx={{ color: "white", fontWeight: "bold" }}>Harga Satuan</TableCell>
                <TableCell sx={{ color: "white", fontWeight: "bold", textAlign: "center" }}>Aksi</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} align="center"><CircularProgress sx={{ mt: 2 }} /></TableCell>
                </TableRow>
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center">Tidak ada data barang.</TableCell>
                </TableRow>
              ) : (
                items.map((row, idx) => (
                  <TableRow key={row.id} hover>
                    <TableCell>{idx + 1}</TableCell>
                    <TableCell>{row.code}</TableCell>
                    <TableCell>{row.name}</TableCell>
                    <TableCell>
                      Rp {Number(row.price).toLocaleString("id-ID")}
                    </TableCell>
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

      {/* MODAL FORM */}
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>{isEdit ? "Edit Barang" : "Tambah Barang Baru"}</DialogTitle>
        <DialogContent>
          <Box component="form" sx={{ mt: 1, display: "flex", flexDirection: "column", gap: 2 }}>
            <TextField
              label="Kode Barang (misal: ITEM-A)"
              fullWidth
              variant="outlined"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
            />
            <TextField
              label="Nama Barang"
              fullWidth
              variant="outlined"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
            <TextField
              label="Harga Satuan"
              fullWidth
              type="number"
              variant="outlined"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              InputProps={{
                startAdornment: <InputAdornment position="start">Rp</InputAdornment>,
              }}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handleClose} color="inherit">Batal</Button>
          <Button onClick={handleSave} variant="contained" color="secondary" disabled={saving}>
            {saving ? "Menyimpan..." : "Simpan"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}