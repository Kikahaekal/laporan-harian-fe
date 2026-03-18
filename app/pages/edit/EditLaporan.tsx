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
  Alert,
} from "@mui/material";
import SaveIcon from "@mui/icons-material/Save";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import apiBe from "../../lib/axiosBe";

import {
  DAYS,
  MONTHS,
  getInitialDataByOutlet,
  groupRowsByOutlet,
  flattenOutletDataToRows,
  type DataMapByOutlet,
  type OutletGroup,
  type OutletMaster,
  type ItemMaster,
  type DailyReportPayload,
  type ItemRow,
  type ReportStatus,
  EMPTY_ITEM_ROW,
} from "../data/constant";
import WeeklySectionByOutlet from "../laporan/WeeklySectionByOutlet";


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

export default function EditLaporan() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryYear = Number(searchParams.get("year"));
  const queryMonth = Number(searchParams.get("month"));
  const isValidParams = queryYear && queryMonth;

  const [tab, setTab] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [data, setData] = useState<DataMapByOutlet>(() => getInitialDataByOutlet());
  const [outlets, setOutlets] = useState<OutletMaster[]>([]);
  const [items, setItems] = useState<ItemMaster[]>([]);

  useEffect(() => {
    if (!isValidParams) return;
    const controller = new AbortController();
    const initPage = async () => {
      setIsLoading(true);
      try {
        const [resOutlet, resItem, resReport] = await Promise.all([
          apiBe.get("/api/web/outlets", { signal: controller.signal }),
          apiBe.get("/api/web/items", { signal: controller.signal }),
          apiBe.get("/api/web/sales-reports", { params: { month: queryMonth, year: queryYear }, signal: controller.signal }),
        ]);
        setOutlets(resOutlet.data.map((o: any) => ({ id: o.id, code: o.code, name: o.name })));
        setItems(resItem.data.map((i: any) => ({ id: i.id, code: i.code, name: i.name, price: Number(i.price) })));
        const dbRows = normalizeReportRows(resReport.data as any[]);
        const newData = getInitialDataByOutlet();
        if (dbRows.length > 0) {
          DAYS.forEach((dayName) => {
            [1, 2, 3, 4].forEach((weekNum) => {
              const rowsForDayWeek = dbRows.filter((r: any) => {
                const d = (r.day_name || "").charAt(0).toUpperCase() + (r.day_name || "").slice(1).toLowerCase();
                return d === dayName && r.week === weekNum;
              });
              if (rowsForDayWeek.length > 0) newData[dayName][weekNum] = groupRowsByOutlet(rowsForDayWeek);
            });
          });
        }
        setData(newData);
      } catch (err: any) {
        if (err.name !== "CanceledError") console.error("Error init edit:", err);
      } finally {
        setIsLoading(false);
      }
    };
    initPage();
    return () => controller.abort();
  }, [queryYear, queryMonth, isValidParams]);

  const updateGroups = (day: string, week: number, updater: (groups: OutletGroup[]) => OutletGroup[]) => {
    setData((prev) => ({
      ...prev,
      [day]: { ...prev[day], [week]: updater(prev[day][week]) },
    }));
  };

  const handleOutletChange = (day: string, week: number, groupIdx: number, outlet_id: string) => {
    updateGroups(day, week, (groups) => {
      const next = [...groups];
      next[groupIdx] = { ...next[groupIdx], outlet_id };
      return next;
    });
  };

  const handleStatusChange = (day: string, week: number, groupIdx: number, status: ReportStatus) => {
    updateGroups(day, week, (groups) => {
      const next = [...groups];
      next[groupIdx] = { ...next[groupIdx], status };
      return next;
    });
  };

  const handleItemChange = (day: string, week: number, groupIdx: number, itemIdx: number, field: keyof ItemRow, value: string) => {
    updateGroups(day, week, (groups) => {
      return groups.map((g, i) => {
        if (i !== groupIdx) return g;
        const newItems = g.items.map((it, j) => (j === itemIdx ? { ...it, [field]: value } : it));
        if (field === "qty_sold" || field === "item_id") {
          const row = newItems[itemIdx];
          const item = items.find((m) => String(m.code) === row.item_id);
          if (item?.price != null && row.qty_sold) newItems[itemIdx] = { ...row, deposit: String(item.price * Number(row.qty_sold)) };
        }
        return { ...g, items: newItems };
      });
    });
  };

  const handleAddItem = (day: string, week: number, groupIdx: number) => {
    updateGroups(day, week, (groups) =>
      groups.map((g, i) => (i === groupIdx ? { ...g, items: [...g.items, { ...EMPTY_ITEM_ROW }] } : g))
    );
  };

  const handleRemoveItem = (day: string, week: number, groupIdx: number, itemIdx: number) => {
    updateGroups(day, week, (groups) =>
      groups.map((g, i) => {
        if (i !== groupIdx) return g;
        const newItems = g.items.filter((_, j) => j !== itemIdx);
        return { ...g, items: newItems.length ? newItems : [{ ...EMPTY_ITEM_ROW }] };
      })
    );
  };

  const handleAddOutlet = (day: string, week: number) => {
    updateGroups(day, week, (groups) => [...groups, { outlet_id: "", items: [{ ...EMPTY_ITEM_ROW }] }]);
  };

  const handleRemoveOutlet = (day: string, week: number, groupIdx: number) => {
    updateGroups(day, week, (groups) => {
      const next = groups.filter((_, i) => i !== groupIdx);
      return next.length ? next : [{ outlet_id: "", items: [{ ...EMPTY_ITEM_ROW }] }];
    });
  };

  const handleUpdate = async () => {
    const rows: DailyReportPayload["rows"] = [];
    DAYS.forEach((day) => {
      [1, 2, 3, 4].forEach((week) => {
        flattenOutletDataToRows(data, day, week).forEach((row) => rows.push(row));
      });
    });
    if (rows.length === 0) {
      alert("Data kosong, tidak bisa disimpan.");
      return;
    }
    const payload = rows.map((row) => ({ ...row, year: queryYear, month: queryMonth }));
    if (!confirm("Yakin memperbarui laporan ini? Data lama bulan ini akan ditimpa.")) return;
    setIsSaving(true);
    try {
      await apiBe.post("/api/web/sales-reports/update", payload);
      alert("Laporan berhasil diperbarui!");
      navigate("/rekap-be");
    } catch (error: any) {
      alert("Error: " + (error.response?.data?.message || "Gagal update"));
    } finally {
      setIsSaving(false);
    }
  };

  if (!isValidParams) {
    return (
      <Box sx={{ p: 4, textAlign: "center" }}>
        <Alert severity="error">Parameter URL tidak valid. Akses melalui halaman Rekap.</Alert>
        <Button sx={{ mt: 2 }} variant="contained" onClick={() => navigate("/rekap-be")}>Kembali ke Rekap</Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2, maxWidth: 1000, margin: "0 auto" }}>
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate("/rekap-be")} sx={{ mb: 1.5 }}>Kembali</Button>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1.5} flexWrap="wrap" gap={1}>
        <Typography variant="h6" fontWeight="bold">Edit Laporan: {MONTHS[queryMonth - 1]} {queryYear}</Typography>
        <Button
          variant="contained"
          color="warning"
          size="medium"
          startIcon={isSaving ? <CircularProgress size={18} color="inherit" /> : <SaveIcon />}
          onClick={handleUpdate}
          disabled={isLoading || isSaving}
        >
          {isSaving ? "Menyimpan..." : "Simpan Perubahan"}
        </Button>
      </Stack>

      <Paper variant="outlined" sx={{ p: 1.5, mb: 2, bgcolor: "#fff8e1" }}>
        <Typography variant="caption" color="text.secondary" fontWeight={600}>Periode (read-only)</Typography>
        <Stack direction="row" spacing={2} sx={{ mt: 0.5 }}>
          <TextField size="small" label="Bulan" value={MONTHS[queryMonth - 1]} disabled variant="outlined" sx={{ width: 140 }} />
          <TextField size="small" label="Tahun" value={queryYear} disabled variant="outlined" sx={{ width: 100 }} />
        </Stack>
      </Paper>

      <Paper variant="outlined" sx={{ overflow: "hidden" }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto" sx={{ borderBottom: 1, borderColor: "divider", minHeight: 40 }}>
          {DAYS.map((d) => (
            <Tab key={d} label={d} sx={{ fontWeight: 600, minHeight: 40, py: 1 }} />
          ))}
        </Tabs>
        <Box sx={{ p: 1.5, bgcolor: "grey.50", minHeight: 360 }}>
          {isLoading && (
            <Box sx={{ textAlign: "center", py: 4 }}><CircularProgress /></Box>
          )}
          {!isLoading &&
            DAYS.map((day, dayIdx) => (
              <DayPanel key={day} value={tab} index={dayIdx}>
                {[1, 2, 3, 4].map((week) => (
                  <WeeklySectionByOutlet
                    key={week}
                    week={week}
                    dayName={day}
                    year={queryYear}
                    month={queryMonth}
                    groups={data[day][week]}
                    masterOutlets={outlets}
                    masterItems={items}
                    readOnly={false}
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
