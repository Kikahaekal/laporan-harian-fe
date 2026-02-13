import { useState, useEffect } from "react";
import {
  Box,
  Tabs,
  Tab,
  Typography,
  TextField,
  Select,
  MenuItem,
  Grid,
  Paper,
  Button,
  Stack,
  CircularProgress,
  Alert
} from "@mui/material";
import SaveIcon from "@mui/icons-material/Save";
import CheckCircleIcon from "@mui/icons-material/CheckCircle"; // Icon baru opsional
import api from "../../lib/axios"; 

import { DAYS, MONTHS, getInitialData, type RowType, type DataMap, EMPTY_ROW } from "../data/constant";
import WeeklySection from "./WeeklySection";

function DayPanel({ value, index, children }: { value: number; index: number; children: React.ReactNode }) {
  if (value !== index) return null;
  return <Box sx={{ mt: 2 }}>{children}</Box>;
}

export default function Laporan(): JSX.Element {
  const now = new Date();

  // STATE UI
  const [tab, setTab] = useState<number>(0);
  const [month, setMonth] = useState<number>(now.getMonth() + 1);
  const [year, setYear] = useState<number>(now.getFullYear());
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false); // Tambahan state saving

  // STATE LOGIC
  const [hasExistingData, setHasExistingData] = useState<boolean>(false); // <--- STATE BARU

  // STATE DATA
  const [data, setData] = useState<DataMap>(() => getInitialData());
  const [outlets, setOutlets] = useState<{ id: string; name: string }[]>([]);
  const [items, setItems] = useState<{ id: string; name: string; price?: number }[]>([]);

  // 1. FETCH MASTER DATA (Sekali saat load)
  useEffect(() => {
    const controller = new AbortController();
    const fetchMasters = async () => {
      try {
        const [resOutlet, resItem] = await Promise.all([
          api.get('/api/outlets', { signal: controller.signal }),
          api.get('/api/items', { signal: controller.signal })
        ]);
        setOutlets(resOutlet.data.map((o: any) => ({ id: o.code, name: o.name })));
        setItems(resItem.data.map((i: any) => ({ id: i.code, name: i.name, price: Number(i.price) })));
      } catch (err: any) {
        if (err.name !== 'CanceledError') console.error("Gagal load master data", err);
      }
    };
    fetchMasters();
    return () => controller.abort();
  }, []);

  // 2. FETCH REPORT DATA (Setiap ganti Bulan/Tahun)
  useEffect(() => {
    const controller = new AbortController();
    
    const fetchReport = async () => {
        setIsLoading(true);
        try {
            // Reset ke kosong dulu
            const newData = getInitialData();
            
            const res = await api.get('/api/sales-reports', {
                params: { month, year },
                signal: controller.signal
            });

            const dbRows = res.data;

            // LOGIC UTAMA: Cek ketersediaan data
            if (dbRows.length > 0) {
                setHasExistingData(true); // Disable tombol
                
                // --- Mapping Data DB ke Tabel UI (Read Only Mode) ---
                dbRows.forEach((row: any) => {
                    const dayNameRaw = row.day_name || "";
                    // Pastikan format Title Case: "senin" -> "Senin"
                    const dayName = dayNameRaw.charAt(0).toUpperCase() + dayNameRaw.slice(1).toLowerCase();
                    const weekNum = row.week;

                    if (newData[dayName] && newData[dayName][weekNum]) {
                         const currentRows = newData[dayName][weekNum];
                         // Hapus row kosong default jika ada data masuk
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

            } else {
                setHasExistingData(false); // Enable tombol
            }

            setData(newData);

        } catch (err: any) {
            if (err.name !== 'CanceledError') console.error("Error fetch laporan", err);
        } finally {
            setIsLoading(false);
        }
    }

    fetchReport();
    return () => controller.abort();
  }, [month, year]);

  // ================= HANDLERS =================

  const handleChangeCell = (day: string, week: number, idx: number, field: keyof RowType, value: string) => {
    // Opsional: Cegah edit jika data sudah ada (Double protection)
    if (hasExistingData) return; 

    setData((prev) => {
      const copy = { ...prev };
      copy[day] = { ...copy[day] }; 
      copy[day][week] = [...copy[day][week]]; 
      copy[day][week][idx] = { ...copy[day][week][idx], [field]: value };
      
      // Auto hitung deposit jika item & sold diisi
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
    if (hasExistingData) return;
    setData((prev) => ({
      ...prev,
      [day]: { ...prev[day], [week]: [...prev[day][week], { ...EMPTY_ROW }] },
    }));
  };

  const deleteRow = (day: string, week: number, idx: number) => {
    if (hasExistingData) return;
    setData((prev) => {
      const currentRows = prev[day][week];
      let newRows = currentRows.filter((_, i) => i !== idx);
      if (newRows.length === 0) newRows = [{ ...EMPTY_ROW }];
      return { ...prev, [day]: { ...prev[day], [week]: newRows } };
    });
  };

  const handleSubmit = async () => {
    if (hasExistingData) {
        alert("Data bulan ini sudah diisi. Silakan ke menu Rekap untuk mengedit.");
        return;
    }

    const payload: any[] = [];
    DAYS.forEach((day) => {
      Object.entries(data[day]).forEach(([weekStr, rows]) => {
        const week = Number(weekStr);
        rows.forEach((r) => {
          if (!r.outlet_id && !r.item_id && !r.qty_order) return;
          payload.push({
            day_name: day.toLowerCase(),
            week, month, year,
            outlet_id: r.outlet_id,
            item_id: r.item_id,
            qty_order: Number(r.qty_order || 0),
            qty_sold: Number(r.qty_sold || 0),
            deposit: Number(r.deposit || 0),
          });
        });
      });
    });

    if (payload.length === 0) {
        alert("Tidak ada data untuk disimpan.");
        return;
    }

    setIsSaving(true);
    try {
      await api.get('/sanctum/csrf-cookie');
      await api.post('/api/sales-reports', payload);
      alert("Berhasil disimpan!");
      
      // Refresh status agar tombol jadi disabled setelah simpan sukses
      setHasExistingData(true); 
      
    } catch (error: any) {
      const msg = error.response?.data?.message || "Gagal simpan";
      alert("Error: " + msg);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Box sx={{ p: 3, maxWidth: 1200, margin: "0 auto" }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" fontWeight="bold">Input Laporan Penjualan</Typography>
        
        {/* BUTTON DENGAN LOGIC DISABLE */}
        <Button 
          variant="contained" 
          color={hasExistingData ? "inherit" : "primary"} // Warna abu-abu jika disabled
          size="large" 
          startIcon={hasExistingData ? <CheckCircleIcon color="success"/> : (isSaving ? <CircularProgress size={20}/> : <SaveIcon />)}
          onClick={handleSubmit}
          disabled={isLoading || isSaving || hasExistingData} // <--- Disable di sini
          sx={{ 
            opacity: hasExistingData ? 0.7 : 1,
            pointerEvents: hasExistingData ? 'none' : 'auto'
          }}
        >
           {isLoading ? "Memuat..." : (hasExistingData ? "Laporan Sudah Diisi" : (isSaving ? "Menyimpan..." : "Simpan Laporan"))}
        </Button>
      </Stack>

      <Paper sx={{ p: 2, mb: 3 }} elevation={2}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={3}>
            <Select fullWidth size="small" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
              {MONTHS.map((namaBulan, i) => <MenuItem key={i} value={i + 1}>{namaBulan}</MenuItem>)}
            </Select>
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField fullWidth size="small" type="number" label="Tahun" value={year} onChange={(e) => setYear(Number(e.target.value))} />
          </Grid>
          {/* Info Status Text Tambahan */}
          {hasExistingData && (
              <Grid item xs={12} md={6} sx={{display:'flex', alignItems:'center'}}>
                  <Typography color="error" variant="body2" fontWeight="bold">
                      * Data untuk periode ini sudah terkunci.
                  </Typography>
              </Grid>
          )}
        </Grid>
      </Paper>

      {/* Sisa UI (Tabs & WeeklySection) sama seperti sebelumnya... */}
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