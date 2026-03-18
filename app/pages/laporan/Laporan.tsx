import { useState, useEffect } from "react";
import {
  Box,
  Tabs,
  Tab,
  Typography,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  Button,
  Stack,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  Table,
  TableBody,
  TableRow,
  TableCell,
  TableHead,
  TableContainer,
} from "@mui/material";
import SaveIcon from "@mui/icons-material/Save";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import SummarizeIcon from "@mui/icons-material/Summarize";
import VisibilityIcon from "@mui/icons-material/Visibility";
import { useNavigate } from "react-router";
import apiBe from "../../lib/axiosBe";

import {
  DAYS,
  MONTHS,
  getInitialDataByOutlet,
  groupRowsByOutlet,
  flattenOutletDataToRows,
  type DataMapByOutlet,
  type OutletMaster,
  type ItemMaster,
  type DailyReportPayload,
  type ItemRow,
  type ReportStatus,
  EMPTY_ITEM_ROW,
} from "../data/constant";
import WeeklySectionByOutlet from "./WeeklySectionByOutlet";

function DayPanel({ value, index, children }: { value: number; index: number; children: React.ReactNode }) {
  if (value !== index) return null;
  return <Box sx={{ mt: 1 }}>{children}</Box>;
}

function normalizeReportRows(rows: any[]) {
  return rows.map((row) => ({
    ...row,
    outlet_id: row.outlet_code ?? row.outlet_id ?? "",
    item_id: row.item_code ?? row.item_id ?? "",
  }));
}

export default function Laporan() {
  const navigate = useNavigate();
  const now = new Date();
  const [tab, setTab] = useState<number>(0);
  const [month, setMonth] = useState<number>(now.getMonth() + 1);
  const [year, setYear] = useState<number>(now.getFullYear());
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [hasExistingData, setHasExistingData] = useState<boolean>(false);
  const [rekapDone, setRekapDone] = useState<boolean>(false);
  const [rekapDialogOpen, setRekapDialogOpen] = useState<boolean>(false);
  const [rekapSummary, setRekapSummary] = useState<{
    jumlahToko: number;
    totalDroping: number;
    targetToko: number;
    targetDro: number;
    kekuranganToko: number;
    kekuranganDro: number;
  } | null>(null);
  const [loadingSummary, setLoadingSummary] = useState<boolean>(false);
  const [data, setData] = useState<DataMapByOutlet>(() => getInitialDataByOutlet());
  const [outlets, setOutlets] = useState<OutletMaster[]>([]);
  const [items, setItems] = useState<ItemMaster[]>([]);

  const DEFAULT_TARGET_TOKO = 50;
  const DEFAULT_TARGET_DRO = 2000;

  useEffect(() => {
    const controller = new AbortController();
    const fetchMasters = async () => {
      try {
        const [resOutlet, resItem] = await Promise.all([
          apiBe.get("/api/web/outlets", { signal: controller.signal }),
          apiBe.get("/api/web/items", { signal: controller.signal }),
        ]);
        setOutlets(resOutlet.data.map((o: any) => ({ id: o.id, code: o.code, name: o.name })));
        setItems(resItem.data.map((i: any) => ({ id: i.id, code: i.code, name: i.name, price: Number(i.price) })));
      } catch (err: any) {
        if (err.name !== "CanceledError") console.error("Gagal load master data", err);
      }
    };
    fetchMasters();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const fetchReport = async () => {
      setIsLoading(true);
      try {
        const newData = getInitialDataByOutlet();
        const res = await apiBe.get("/api/web/sales-reports", { params: { month, year }, signal: controller.signal });
        const dbRows = normalizeReportRows(res.data as any[]);

        if (dbRows.length > 0) {
          setHasExistingData(true);
          const allNonPending = dbRows.every((r: any) => (r.status || "pending") !== "pending");
          setRekapDone(allNonPending);
          DAYS.forEach((dayName) => {
            [1, 2, 3, 4].forEach((weekNum) => {
              const rowsForDayWeek = dbRows.filter(
                (r: any) => {
                  const d = (r.day_name || "").charAt(0).toUpperCase() + (r.day_name || "").slice(1).toLowerCase();
                  return d === dayName && r.week === weekNum;
                }
              );
              if (rowsForDayWeek.length > 0) {
                newData[dayName][weekNum] = groupRowsByOutlet(rowsForDayWeek);
              }
            });
          });
        } else {
          setHasExistingData(false);
          setRekapDone(false);
        }
        setData(newData);
      } catch (err: any) {
        if (err.name !== "CanceledError") console.error("Error fetch laporan", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchReport();
    return () => controller.abort();
  }, [month, year]);

  const updateGroups = (day: string, week: number, updater: (groups: typeof data[string][number]) => typeof data[string][number]) => {
    setData((prev) => ({
      ...prev,
      [day]: { ...prev[day], [week]: updater(prev[day][week]) },
    }));
  };

  const handleOutletChange = (day: string, week: number, groupIdx: number, outlet_id: string) => {
    if (hasExistingData) return;
    updateGroups(day, week, (groups) => {
      const next = [...groups];
      next[groupIdx] = { ...next[groupIdx], outlet_id };
      return next;
    });
  };

  const handleStatusChange = (day: string, week: number, groupIdx: number, status: ReportStatus) => {
    if (hasExistingData) return;
    updateGroups(day, week, (groups) => {
      const next = [...groups];
      next[groupIdx] = { ...next[groupIdx], status };
      return next;
    });
  };

  const handleItemChange = (day: string, week: number, groupIdx: number, itemIdx: number, field: keyof ItemRow, value: string) => {
    if (hasExistingData) return;
    updateGroups(day, week, (groups) => {
      const next = groups.map((g, i) => {
        if (i !== groupIdx) return g;
        const newItems = g.items.map((it, j) => (j === itemIdx ? { ...it, [field]: value } : it));
        if (field === "qty_sold" || field === "item_id") {
          const row = newItems[itemIdx];
          const item = items.find((m) => String(m.code) === row.item_id);
          if (item?.price != null && row.qty_sold) newItems[itemIdx] = { ...row, deposit: String(item.price * Number(row.qty_sold)) };
        }
        return { ...g, items: newItems };
      });
      return next;
    });
  };

  const handleAddItem = (day: string, week: number, groupIdx: number) => {
    if (hasExistingData) return;
    updateGroups(day, week, (groups) => {
      const next = groups.map((g, i) => (i === groupIdx ? { ...g, items: [...g.items, { ...EMPTY_ITEM_ROW }] } : g));
      return next;
    });
  };

  const handleRemoveItem = (day: string, week: number, groupIdx: number, itemIdx: number) => {
    if (hasExistingData) return;
    updateGroups(day, week, (groups) => {
      const next = groups.map((g, i) => {
        if (i !== groupIdx) return g;
        const newItems = g.items.filter((_, j) => j !== itemIdx);
        return { ...g, items: newItems.length ? newItems : [{ ...EMPTY_ITEM_ROW }] };
      });
      return next;
    });
  };

  const handleAddOutlet = (day: string, week: number) => {
    if (hasExistingData) return;
    updateGroups(day, week, (groups) => [...groups, { outlet_id: "", items: [{ ...EMPTY_ITEM_ROW }] }]);
  };

  const handleRemoveOutlet = (day: string, week: number, groupIdx: number) => {
    if (hasExistingData) return;
    updateGroups(day, week, (groups) => {
      const next = groups.filter((_, i) => i !== groupIdx);
      return next.length ? next : [{ outlet_id: "", items: [{ ...EMPTY_ITEM_ROW }] }];
    });
  };

  const handleSubmit = async () => {
    if (hasExistingData) {
      alert("Data bulan ini sudah diisi. Silakan ke menu Rekap untuk mengedit.");
      return;
    }
    const rows: DailyReportPayload["rows"] = [];
    DAYS.forEach((day) => {
      [1, 2, 3, 4].forEach((week) => {
        flattenOutletDataToRows(data, day, week).forEach((row) => rows.push(row));
      });
    });
    if (rows.length === 0) {
      alert("Tidak ada data untuk disimpan.");
      return;
    }
    setIsSaving(true);
    try {
      await apiBe.post(
        "/api/web/sales-reports",
        rows.map((row) => ({ ...row, year, month }))
      );
      alert("Berhasil disimpan!");
      setHasExistingData(true);
    } catch (error: any) {
      alert("Error: " + (error.response?.data?.message || "Gagal simpan"));
    } finally {
      setIsSaving(false);
    }
  };

  const handleRekap = () => {
    navigate(`/edit?year=${year}&month=${month}`);
  };

  const handleOpenRekapPenjualan = async () => {
    setRekapDialogOpen(true);
    setLoadingSummary(true);
    setRekapSummary(null);
    try {
      const res = await apiBe.get("/api/web/sales-reports", { params: { month, year } });
      const rows = normalizeReportRows((res.data as any[]) || []);
      const outletCodes = new Set(rows.map((r: any) => r.outlet_id ?? "").filter(Boolean));
      const jumlahToko = outletCodes.size;
      const totalDroping = rows.reduce((sum: number, r: any) => sum + (Number(r.deposit) || 0), 0);
      const targetToko = DEFAULT_TARGET_TOKO;
      const targetDro = DEFAULT_TARGET_DRO;
      const kekuranganToko = Math.max(0, targetToko - jumlahToko);
      const kekuranganDro = Math.max(0, targetDro - totalDroping);
      setRekapSummary({
        jumlahToko,
        totalDroping: Math.round(totalDroping),
        targetToko,
        targetDro,
        kekuranganToko,
        kekuranganDro,
      });
    } catch (err) {
      console.error("Gagal load rekap penjualan", err);
      setRekapSummary(null);
    } finally {
      setLoadingSummary(false);
    }
  };

  const buttonsDisabled = rekapDone;

  return (
    <Box sx={{ p: 2, maxWidth: 1000, margin: "0 auto" }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1.5} flexWrap="wrap" gap={1}>
        <Typography variant="h6" fontWeight="bold">Input Laporan Penjualan</Typography>
        <Stack direction="row" spacing={1} flexWrap="wrap" alignItems="center">
          <Button
            variant="contained"
            color={hasExistingData ? "inherit" : "primary"}
            size="medium"
            startIcon={hasExistingData ? <CheckCircleIcon color="success" /> : isSaving ? <CircularProgress size={18} /> : <SaveIcon />}
            onClick={handleSubmit}
            disabled={isLoading || isSaving || hasExistingData || buttonsDisabled}
            sx={{ opacity: hasExistingData || buttonsDisabled ? 0.7 : 1, pointerEvents: hasExistingData || buttonsDisabled ? "none" : "auto" }}
          >
            {isLoading ? "Memuat..." : hasExistingData ? "Sudah Diisi" : isSaving ? "Menyimpan..." : "Simpan Laporan"}
          </Button>
          <Button
            variant="contained"
            color="secondary"
            size="medium"
            startIcon={<SummarizeIcon />}
            onClick={handleRekap}
            disabled={isLoading || buttonsDisabled}
          >
            Rekap
          </Button>
          <Button
            variant="outlined"
            size="medium"
            startIcon={<VisibilityIcon />}
            onClick={handleOpenRekapPenjualan}
            disabled={isLoading || !hasExistingData}
          >
            Lihat Rekap Penjualan
          </Button>
        </Stack>
      </Stack>

      {/* Dialog Rekap Penjualan Bulanan */}
      <Dialog open={rekapDialogOpen} onClose={() => setRekapDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Rekap Penjualan — {MONTHS[month - 1]} {year}
        </DialogTitle>
        <DialogContent>
          {loadingSummary && (
            <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
              <CircularProgress />
            </Box>
          )}
          {!loadingSummary && rekapSummary && (
            <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
              <Table size="small" sx={{ "& td, & th": { border: "1px solid", borderColor: "divider" } }}>
                <TableBody>
                  <TableRow>
                    <TableCell sx={{ bgcolor: "warning.light", fontWeight: 700, width: "50%" }}>Jumlah toko</TableCell>
                    <TableCell colSpan={2} sx={{ bgcolor: "warning.light", fontWeight: 700 }}>Total droping</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ bgcolor: "error.light", color: "error.contrastText", fontWeight: 700, fontSize: "1.1rem" }}>
                      {rekapSummary.jumlahToko}
                    </TableCell>
                    <TableCell colSpan={2} sx={{ bgcolor: "info.light", color: "info.contrastText", fontWeight: 700, fontSize: "1.1rem" }}>
                      {rekapSummary.totalDroping.toLocaleString("id-ID")}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ bgcolor: "grey.200", fontWeight: 700 }}>TARGET TOKO</TableCell>
                    <TableCell sx={{ bgcolor: "grey.200", fontWeight: 700 }}>PENCAPAIAN</TableCell>
                    <TableCell sx={{ bgcolor: "grey.200", fontWeight: 700 }}>TARGET DRO</TableCell>
                    <TableCell sx={{ bgcolor: "grey.200", fontWeight: 700 }}>PENCAPAIAN</TableCell>
                    <TableCell sx={{ bgcolor: "grey.200", fontWeight: 700 }}>KEKURANGAN</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>{rekapSummary.targetToko}</TableCell>
                    <TableCell>{rekapSummary.jumlahToko}</TableCell>
                    <TableCell>{rekapSummary.targetDro.toLocaleString("id-ID")}</TableCell>
                    <TableCell>{rekapSummary.totalDroping.toLocaleString("id-ID")}</TableCell>
                    <TableCell sx={{ bgcolor: rekapSummary.kekuranganDro > 0 ? "error.light" : "transparent", color: rekapSummary.kekuranganDro > 0 ? "error.contrastText" : "inherit", fontWeight: 600 }}>
                      {rekapSummary.kekuranganDro > 0 ? rekapSummary.kekuranganDro.toLocaleString("id-ID") : "—"}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          )}
          {!loadingSummary && !rekapSummary && rekapDialogOpen && (
            <Typography color="text.secondary">Tidak ada data rekap untuk periode ini.</Typography>
          )}
        </DialogContent>
      </Dialog>

      <Paper variant="outlined" sx={{ p: 1.5, mb: 2 }}>
        <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" gutterBottom>Periode</Typography>
        <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
          <FormControl size="small" variant="outlined" sx={{ minWidth: 140 }}>
            <InputLabel>Bulan</InputLabel>
            <Select label="Bulan" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
              {MONTHS.map((nama, i) => (
                <MenuItem key={i} value={i + 1}>{nama}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField size="small" variant="outlined" label="Tahun" type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} sx={{ width: 100 }} inputProps={{ min: 2020, max: 2100 }} />
          {rekapDone && (
            <Typography color="error" variant="caption" fontWeight="bold">Periode ini sudah direkap. Tombol Simpan dan Rekap dinonaktifkan.</Typography>
          )}
          {hasExistingData && !rekapDone && (
            <Typography color="error" variant="caption" fontWeight="bold">Data periode ini terkunci. Edit via Rekap.</Typography>
          )}
        </Stack>
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
          Satu outlet bisa berisi banyak item. Tambah outlet/item per hari (tab) dan per minggu.
        </Typography>
      </Paper>

      <Paper variant="outlined" sx={{ overflow: "hidden" }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto" sx={{ borderBottom: 1, borderColor: "divider", minHeight: 40 }}>
          {DAYS.map((d) => (
            <Tab key={d} label={d} sx={{ fontWeight: 600, minHeight: 40, py: 1 }} />
          ))}
        </Tabs>
        <Box sx={{ p: 1.5, bgcolor: "grey.50", minHeight: 360 }}>
          {isLoading && (
            <Box sx={{ textAlign: "center", py: 4 }}>
              <CircularProgress />
            </Box>
          )}
          {!isLoading &&
            DAYS.map((day, dayIdx) => (
              <DayPanel key={day} value={tab} index={dayIdx}>
                {[1, 2, 3, 4].map((week) => (
                  <WeeklySectionByOutlet
                    key={week}
                    week={week}
                    dayName={day}
                    year={year}
                    month={month}
                    groups={data[day][week]}
                    masterOutlets={outlets}
                    masterItems={items}
                    readOnly={hasExistingData}
                    onOutletChange={(gIdx, v) => handleOutletChange(day, week, gIdx, v)}
                    onStatusChange={(gIdx, status) => handleStatusChange(day, week, gIdx, status)}
                    onItemChange={(gIdx, iIdx, field, v) => handleItemChange(day, week, gIdx, iIdx, field, v)}
                    onAddItem={(gIdx) => handleAddItem(day, week, gIdx)}
                    onRemoveItem={(gIdx, iIdx) => handleRemoveItem(day, week, gIdx, iIdx)}
                    onAddOutlet={() => handleAddOutlet(day, week)}
                    onRemoveOutlet={(gIdx) => handleRemoveOutlet(day, week, gIdx)}
                  />
                ))}
              </DayPanel>
            ))}
        </Box>
      </Paper>
    </Box>
  );
}
