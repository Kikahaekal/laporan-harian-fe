import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router";
import {
  Save,
  ArrowLeft,
  Calendar,
  AlertCircle,
  Loader2
} from "lucide-react";
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
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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
      setErrorMsg("Data kosong, tidak bisa disimpan.");
      return;
    }
    
    const payload = rows.map((row) => ({ ...row, year: queryYear, month: queryMonth }));
    
    if (!confirm("Yakin memperbarui laporan ini? Data lama bulan ini akan ditimpa.")) return;
    
    setIsSaving(true);
    setErrorMsg(null);
    try {
      await apiBe.post("/api/web/sales-reports/update", payload);
      alert("Laporan berhasil diperbarui!");
      navigate("/rekap-be");
    } catch (error: any) {
      setErrorMsg(error.response?.data?.message || "Gagal update laporan");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isValidParams) {
    return (
      <div className="p-8 text-center max-w-md mx-auto mt-10">
        <div className="bg-red-50 text-red-800 p-4 rounded-2xl flex flex-col items-center gap-3 border border-red-200">
          <AlertCircle className="w-8 h-8 text-red-500" />
          <p className="font-semibold">Parameter URL tidak valid.</p>
          <p className="text-sm">Silakan akses melalui halaman Rekap Laporan.</p>
          <button 
            onClick={() => navigate("/rekap-be")}
            className="mt-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-xl transition-colors"
          >
            Kembali ke Rekap
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20">
      {/* ── Header ── */}
      <div className="flex flex-col gap-4 mb-2">
        <button 
          onClick={() => navigate("/rekap-be")}
          className="flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-gray-800 self-start transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Kembali
        </button>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-100 text-blue-600 rounded-xl">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-gray-900 leading-tight">Edit Laporan</h1>
              <p className="text-sm font-medium text-gray-500">
                {MONTHS[queryMonth - 1]} {queryYear}
              </p>
            </div>
          </div>
          
          <button
            onClick={handleUpdate}
            disabled={isLoading || isSaving}
            className="flex items-center justify-center gap-2 px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold transition-colors disabled:opacity-50 w-full sm:w-auto shadow-sm"
          >
            {isSaving ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> Menyimpan...</>
            ) : (
              <><Save className="w-5 h-5" /> Simpan Perubahan</>
            )}
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 bg-red-50 text-red-800 border border-red-200 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <p className="text-sm font-medium">{errorMsg}</p>
        </div>
      )}

      {/* ── Tabs Hari ── */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto border-b border-gray-200">
          <div className="flex w-max min-w-full">
            {DAYS.map((d, i) => (
              <button
                key={d}
                onClick={() => setTab(i)}
                className={`flex-1 px-4 py-3 text-sm font-bold whitespace-nowrap border-b-2 transition-colors ${
                  tab === i
                    ? "border-blue-600 text-blue-700 bg-blue-50/50"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 sm:p-6 bg-gray-50/50 min-h-[400px]">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-64 gap-3 text-gray-500">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
              <p className="text-sm font-medium">Memuat data laporan...</p>
            </div>
          ) : (
            DAYS.map((day, dayIdx) => (
              <div key={day} className={tab === dayIdx ? "block" : "hidden animate-in fade-in zoom-in-95 duration-200"}>
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
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
