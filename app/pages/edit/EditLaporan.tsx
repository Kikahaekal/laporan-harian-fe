import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router";
import {
  Box,
  Tabs,
  Tab,
  Typography,
  TextField,
  Grid,
  Paper,
  Button,
  Stack,
  CircularProgress,
  Alert
} from "@mui/material";
import SaveIcon from "@mui/icons-material/Save";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import api from "../../lib/axios"; 

import { DAYS, MONTHS, getInitialData, type RowType, type DataMap, EMPTY_ROW } from "../data/constant";
import WeeklySection from "../laporan/WeeklySection";

// ✅ TAMBAHKAN FUNGSI getCookie (SAMA SEPERTI DI AuthContext)
const getCookie = (name: string) => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    const cookieValue = parts.pop()?.split(";").shift();
    return cookieValue ? decodeURIComponent(cookieValue) : undefined;
  }
};

// Helper Component
function DayPanel({ value, index, children }: { value: number; index: number; children: React.ReactNode }) {
  if (value !== index) return null;
  return <Box sx={{ mt: 2 }}>{children}</Box>;
}

export default function EditLaporan() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const queryYear = Number(searchParams.get("year"));
  const queryMonth = Number(searchParams.get("month"));
  const isValidParams = queryYear && queryMonth;

  // STATE UI
  const [tab, setTab] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // STATE DATA
  const [data, setData] = useState<DataMap>(() => getInitialData());
  const [outlets, setOutlets] = useState<{ id: string; name: string }[]>([]);
  const [items, setItems] = useState<{ id: string; name: string; price?: number }[]>([]);

  // 1. FETCH MASTER DATA & REPORT DATA SAAT LOAD
  useEffect(() => {
    if (!isValidParams) return;

    const controller = new AbortController();
    
    const initPage = async () => {
      setIsLoading(true);
      try {
        // A. Fetch Master Data (Outlet & Item)
        const [resOutlet, resItem] = await Promise.all([
          api.get('/api/outlets', { signal: controller.signal }),
          api.get('/api/items', { signal: controller.signal })
        ]);
        
        const masterOutlets = resOutlet.data.map((o: any) => ({ id: o.code, name: o.name }));
        const masterItems = resItem.data.map((i: any) => ({ id: i.code, name: i.name, price: Number(i.price) }));
        
        setOutlets(masterOutlets);
        setItems(masterItems);

        // B. Fetch Data Laporan yang sudah ada di Database
        const resReport = await api.get('/api/sales-reports', {
            params: { month: queryMonth, year: queryYear },
            signal: controller.signal
        });
        
        const dbRows = resReport.data;
        const newData = getInitialData();

        // Mapping Data DB ke Grid UI
        if (dbRows.length > 0) {
            dbRows.forEach((row: any) => {
                const dayNameRaw = row.day_name || "";
                const dayName = dayNameRaw.charAt(0).toUpperCase() + dayNameRaw.slice(1).toLowerCase();
                const weekNum = row.week;

                if (newData[dayName] && newData[dayName][weekNum]) {
                    const currentRows = newData[dayName][weekNum];
                    
                    if (currentRows.length === 1 && currentRows[0].outlet_id === "") {
                        newData[dayName][weekNum] = [];
                    }

                    newData[dayName][weekNum].push({
                        outlet_id: row.outlet_code,
                        item_id: row.item_code,
                        qty_order: String(row.qty_order),
                        qty_sold: String(row.qty_sold),
                        deposit: String(row.deposit),
                    });
                }
            });
        }
        setData(newData);

      } catch (err: any) {
        if (err.name !== 'CanceledError') console.error("Error init edit:", err);
      } finally {
        setIsLoading(false);
      }
    };

    initPage();
    return () => controller.abort();
  }, [queryYear, queryMonth, isValidParams]);

  // ================= HANDLERS GRID =================

  const handleChangeCell = (day: string, week: number, idx: number, field: keyof RowType, value: string) => {
    setData((prev) => {
      const copy = { ...prev };
      copy[day] = { ...copy[day] }; 
      copy[day][week] = [...copy[day][week]]; 
      copy[day][week][idx] = { ...copy[day][week][idx], [field]: value };
      
      // Auto hitung deposit jika qty_sold diisi
      if (field === 'qty_sold' || field === 'item_id') {
          const row = copy[day][week][idx];
          const item = items.find(i => i.id === row.item_id);
          if (item && row.qty_sold) {
              row.deposit = String(item.price! * Number(row.qty_sold));
          }
      }
      return copy;
    });
  };

  const addRow = (day: string, week: number) => {
    setData((prev) => ({
      ...prev,
      [day]: { ...prev[day], [week]: [...prev[day][week], { ...EMPTY_ROW }] },
    }));
  };

  const deleteRow = (day: string, week: number, idx: number) => {
    setData((prev) => {
      const currentRows = prev[day][week];
      let newRows = currentRows.filter((_, i) => i !== idx);
      if (newRows.length === 0) newRows = [{ ...EMPTY_ROW }];
      return { ...prev, [day]: { ...prev[day], [week]: newRows } };
    });
  };

  // ================= SAVE HANDLER (UPDATE) =================
  const handleUpdate = async () => {
    // 1. Kumpulkan Data Payload
    const payload: any[] = [];
    DAYS.forEach((day) => {
      Object.entries(data[day]).forEach(([weekStr, rows]) => {
        const week = Number(weekStr);
        rows.forEach((r) => {
          if (!r.outlet_id && !r.item_id && !r.qty_order) return;
          
          payload.push({
            day_name: day.toLowerCase(),
            week, 
            month: queryMonth,
            year: queryYear,
            outlet_id: r.outlet_id,
            item_id: r.item_id,
            qty_order: Number(r.qty_order || 0),
            qty_sold: Number(r.qty_sold || 0),
            deposit: Number(r.deposit || 0),
          });
        });
      });
    });

    // 2. Validasi Kosong
    if (payload.length === 0) {
        alert("Data kosong, tidak bisa disimpan.");
        return;
    }

    // 3. Konfirmasi User
    if (!confirm("Apakah Anda yakin ingin memperbarui data laporan ini? Data lama bulan ini akan ditimpa dengan data baru.")) return;

    setIsSaving(true);
    try {
      // ✅ AMBIL CSRF TOKEN DENGAN CARA YANG BENAR
      let token = getCookie("XSRF-TOKEN");
      
      // Jika token belum ada, ambil dulu dari endpoint csrf-cookie
      if (!token) {
        await api.get("/sanctum/csrf-cookie");
        await new Promise(resolve => setTimeout(resolve, 100)); // Delay 100ms
        token = getCookie("XSRF-TOKEN");
      }

      // ✅ KIRIM REQUEST DENGAN HEADER CSRF
      await api.post('/api/sales-reports/update', payload, {
        headers: {
          "X-XSRF-TOKEN": token || "",
        },
      });
      
      alert("Laporan berhasil diperbarui!");
      navigate('/rekap');
      
    } catch (error: any) {
      console.error(error);
      const msg = error.response?.data?.message || "Gagal update";
      alert("Error: " + msg);
    } finally {
      setIsSaving(false);
    }
  };

  // Jika URL tidak valid
  if (!isValidParams) {
    return (
        <Box sx={{p:4, textAlign:'center'}}>
            <Alert severity="error">Parameter URL tidak valid. Harap akses melalui halaman Rekap.</Alert>
            <Button sx={{mt:2}} variant="contained" onClick={() => navigate('/rekap')}>Kembali ke Rekap</Button>
        </Box>
    )
  }

  return (
    <Box sx={{ p: 3, maxWidth: 1200, margin: "0 auto" }}>
      {/* TOMBOL KEMBALI */}
      <Button startIcon={<ArrowBackIcon/>} onClick={() => navigate('/rekap')} sx={{ mb: 2 }}>
          Kembali
      </Button>

      {/* HEADER & TOMBOL SIMPAN */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" fontWeight="bold">
            Edit Laporan: {MONTHS[queryMonth - 1]} {queryYear}
        </Typography>
        
        <Button 
          variant="contained" 
          color="warning"
          size="large" 
          startIcon={isSaving ? <CircularProgress size={20} color="inherit"/> : <SaveIcon />}
          onClick={handleUpdate}
          disabled={isLoading || isSaving}
        >
           {isSaving ? "Menyimpan..." : "Simpan Perubahan"}
        </Button>
      </Stack>

      {/* INFORMASI PERIODE (READ ONLY) */}
      <Paper sx={{ p: 2, mb: 3, bgcolor: '#fff3e0' }} elevation={1}>
        <Grid container spacing={2} alignItems="center">
            <Grid item xs={12}>
                <Typography variant="body2" color="text.secondary">
                    <b>Mode Edit:</b> Silakan ubah data di tabel bawah. Tahun dan Bulan terkunci.
                </Typography>
            </Grid>
          <Grid item xs={6} md={3}>
            <TextField 
                fullWidth size="small" label="Bulan" 
                value={MONTHS[queryMonth - 1]} 
                disabled
                variant="filled"
            />
          </Grid>
          <Grid item xs={6} md={3}>
            <TextField 
                fullWidth size="small" label="Tahun" 
                value={queryYear} 
                disabled
                variant="filled"
            />
          </Grid>
        </Grid>
      </Paper>

      {/* TABEL DATA GRID */}
      <Paper elevation={1} sx={{ bgcolor: 'background.paper' }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto" sx={{ borderBottom: 1, borderColor: 'divider' }}>
          {DAYS.map((d) => <Tab key={d} label={d} sx={{ fontWeight: 'bold' }} />)}
        </Tabs>

        <Box sx={{ p: 2, bgcolor: '#fafafa', minHeight: '500px' }}>
            {isLoading && <Box sx={{textAlign:'center', p:4}}><CircularProgress/></Box>}
            
            {!isLoading && DAYS.map((day, dayIdx) => (
            <DayPanel key={day} value={tab} index={dayIdx}>
                {[1, 2, 3, 4].map((week) => (
                <WeeklySection
                    key={week}
                    week={week}
                    rows={data[day][week]}
                    masterOutlets={outlets}
                    masterItems={items}
                    onAddRow={() => addRow(day, week)}
                    onDeleteRow={(idx) => deleteRow(day, week, idx)}
                    onUpdateRow={(idx, field, val) => handleChangeCell(day, week, idx, field, val)}
                />
                ))}
            </DayPanel>
            ))}
        </Box>
      </Paper>
    </Box>
  );
}