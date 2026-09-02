import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router";
import {
  Store,
  Receipt,
  CheckCircle,
  Trash2,
  Save,
  CalendarClock,
  CalendarDays,
  FileText,
  AlertCircle,
  X,
  Loader2,
  ImageIcon,
  Search
} from "lucide-react";
import apiBe from "../lib/axiosBe";
import { getDateForDayWeek } from "../pages/data/constant";
import { Pagination } from "./Pagination";
import { OutletCard, type Sale, type OutletData, weekOfMonth, buildYears } from "./SharedNotaCards";

// ─── Constants ────────────────────────────────────────────────────────────────
const DAYS = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];
const MONTHS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];
const JS_DAY_TO_TAB = [6, 0, 1, 2, 3, 4, 5]; // Sunday=0 → tab 6 (Minggu)

// ─── Main Component ───────────────────────────────────────────────────────────
export function WeeklyMonitorSection({ hideHeader = false }: { hideHeader?: boolean }) {
  const navigate = useNavigate();
  const now = new Date();
  const todayTabIdx = JS_DAY_TO_TAB[now.getDay()];

  const [dayTab, setDayTab] = useState<number>(todayTabIdx);
  const [month, setMonth] = useState<number>(now.getMonth() + 1);
  const [year, setYear] = useState<number>(now.getFullYear());
  const [week, setWeek] = useState<number>(0);
  const [statusTab, setStatusTab] = useState<"ALL" | "DROPPING" | "INVOICED">("ALL");

  const [outlets, setOutlets] = useState<OutletData[]>([]);
  const [salesMap, setSalesMap] = useState<Record<number, Sale[]>>({});
  const [loading, setLoading] = useState(false);
  const [loadingOutlets, setLoadingOutlets] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Pagination for Outlets
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [users, setUsers] = useState<{ id: number; name: string }[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | "ALL">("ALL");

  const selectedDay = DAYS[dayTab];

  useEffect(() => {
    apiBe.get("/api/web/users").then(res => setUsers(res.data)).catch(console.error);
  }, []);

  useEffect(() => {
    const today = new Date();
    if (month === today.getMonth() + 1 && year === today.getFullYear()) {
      setWeek(weekOfMonth(today.toISOString()));
    } else {
      setWeek(0);
    }
    setCurrentPage(1);
    setSearchQuery("");
  }, [month, year]);

  const weekDateRange = (): { from: string; to: string } => {
    const pad = (n: number) => String(n).padStart(2, "0");
    const lastDay = new Date(year, month, 0).getDate();
    if (week === 0) {
      return { from: `${year}-${pad(month)}-01`, to: `${year}-${pad(month)}-${pad(lastDay)}` };
    }
    const starts = [1, 8, 15, 22];
    const ends = [7, 14, 21, lastDay];
    const startDay = starts[week - 1];
    const endDay = Math.min(ends[week - 1], lastDay);
    return { from: `${year}-${pad(month)}-${pad(startDay)}`, to: `${year}-${pad(month)}-${pad(endDay)}` };
  };
  
  const { from: fromDate, to: toDate } = weekDateRange();

  const fetchOutlets = useCallback(async () => {
    setLoadingOutlets(true);
    setOutlets([]);
    setSalesMap({});
    try {
      const params: any = { visit_day: selectedDay };
      if (selectedUserId !== "ALL") params.user_id = selectedUserId;
      const res = await apiBe.get(`/api/web/outlets`, { params });
      setOutlets(Array.isArray(res.data) ? res.data : []);
      setCurrentPage(1);
    } catch (err) {
      console.error("Gagal load outlets", err);
    } finally {
      setLoadingOutlets(false);
    }
  }, [selectedDay, selectedUserId]);

  const fetchSales = useCallback(async (outletList: OutletData[]) => {
    if (outletList.length === 0) return;
    setLoading(true);
    try {
      const map: Record<number, Sale[]> = {};
      const BATCH_SIZE = 3; // Batasi 3 outlet bersamaan agar server tidak kewalahan

      for (let i = 0; i < outletList.length; i += BATCH_SIZE) {
        const batch = outletList.slice(i, i + BATCH_SIZE);
        const batchResults = await Promise.all(
          batch.map(async (o) => {
            try {
              const [droppingRes, invoicedRes] = await Promise.all([
                apiBe.get(`/api/web/sales`, { params: { outlet_id: o.id, status: "DROPPING", per_page: 100 } }),
                apiBe.get(`/api/web/sales`, { params: { outlet_id: o.id, status: "INVOICED", from: fromDate, to: toDate, per_page: 100 } }),
              ]);
              const droppingSales: Sale[] = droppingRes.data?.data ?? [];
              const invoicedSales: Sale[] = invoicedRes.data?.data ?? [];
              return { outlet_id: o.id, sales: [...droppingSales, ...invoicedSales] };
            } catch {
              return { outlet_id: o.id, sales: [] };
            }
          })
        );
        batchResults.forEach(({ outlet_id, sales }) => { map[outlet_id] = sales; });
      }

      setSalesMap(map);
    } catch (err) {
      console.error("Gagal load sales", err);
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate]);

  useEffect(() => { fetchOutlets(); }, [fetchOutlets]);
  useEffect(() => { if (outlets.length > 0) fetchSales(outlets); }, [outlets, fetchSales]);

  const handleSaleUpdated = (updated: Sale) => {
    setSalesMap((prev) => {
      const existing = prev[updated.outlet_id] ?? [];
      return { ...prev, [updated.outlet_id]: existing.map((s) => (s.id === updated.id ? updated : s)) };
    });
  };

  const handleSaleDeleted = (saleId: number) => {
    setSalesMap((prev) => {
      const next = { ...prev };
      for (const key of Object.keys(next)) {
        next[Number(key)] = next[Number(key)].filter((s) => s.id !== saleId);
      }
      return next;
    });
  };

  const filteredSalesMap = useMemo(() => {
    if (statusTab === "ALL") return salesMap;
    const next: Record<number, Sale[]> = {};
    Object.entries(salesMap).forEach(([key, sales]) => {
      next[Number(key)] = sales.filter((s) => s.status === statusTab);
    });
    return next;
  }, [salesMap, statusTab]);
  
  const filteredOutlets = useMemo(() => {
    let result = outlets;
    
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(o => {
        if (o.name.toLowerCase().includes(q)) return true;
        const salesForOutlet = filteredSalesMap[o.id] || [];
        return salesForOutlet.some(s => s.nota_number?.toLowerCase().includes(q));
      });
    }
    
    if (statusTab !== "ALL") {
      result = result.filter(o => {
        const salesForOutlet = filteredSalesMap[o.id] || [];
        return salesForOutlet.length > 0;
      });
    }
    
    return result;
  }, [outlets, filteredSalesMap, searchQuery, statusTab]);

  const allSales = useMemo(() => {
    const validOutletIds = new Set(filteredOutlets.map(o => o.id));
    return Object.entries(filteredSalesMap)
      .filter(([outletId]) => validOutletIds.has(Number(outletId)))
      .map(([_, sales]) => sales)
      .flat();
  }, [filteredSalesMap, filteredOutlets]);
  
  const countDropping = allSales.filter((s) => s.status === "DROPPING").length;
  const countInvoiced = allSales.filter((s) => s.status === "INVOICED").length;
  const countBelumLunas = allSales.filter((s) => s.status === "INVOICED" && !(s.payment_status === "LUNAS" || Number(s.deposit) >= Number(s.grand_total))).length;

  const totalPages = Math.ceil(filteredOutlets.length / itemsPerPage);
  const paginatedOutlets = filteredOutlets.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {!hideHeader && (
        <>
          {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-100 rounded-xl text-emerald-600">
            <CalendarClock className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Monitor Nota</h1>
            <p className="text-sm text-gray-500">Pantau dan kelola nota dropping & invoice per hari kunjungan</p>
          </div>
        </div>
        <button
          onClick={() => navigate(`/rekap-be?month=${month}&year=${year}`)}
          className="flex items-center gap-2 bg-white border border-emerald-600 text-emerald-700 hover:bg-emerald-50 px-4 py-2.5 rounded-xl font-medium transition-colors shadow-sm w-full sm:w-auto justify-center"
        >
          <FileText className="w-5 h-5" /> Rekap Bulanan
        </button>
      </div>
        </>
      )}

      {/* ── Filter ── */}
      <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm flex flex-col gap-4">
        {/* ── Search Bar ── */}
        <div className="w-full">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Cari nomor nota atau nama outlet..."
              className="pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-emerald-500 focus:border-emerald-500 bg-gray-50 hover:bg-white transition-colors outline-none w-full shadow-sm"
            />
            <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          </div>
        </div>

        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 border-t border-gray-100 pt-4">
          <div className="flex items-center gap-3 flex-wrap">
            <CalendarDays className="w-5 h-5 text-gray-400 hidden sm:block" />
            
            <div className="flex flex-col">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Bulan</label>
              <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-emerald-500 focus:border-emerald-500 bg-gray-50 hover:bg-white transition-colors cursor-pointer outline-none">
                {MONTHS.map((nama, i) => <option key={i} value={i + 1}>{nama}</option>)}
              </select>
            </div>

            <div className="flex flex-col">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">User / Sales</label>
              <select value={selectedUserId} onChange={(e) => setSelectedUserId(e.target.value === "ALL" ? "ALL" : Number(e.target.value))} className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-emerald-500 focus:border-emerald-500 bg-gray-50 hover:bg-white transition-colors cursor-pointer outline-none">
                <option value="ALL">Semua User</option>
                {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
            
            <div className="flex flex-col">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Tahun</label>
              <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-emerald-500 focus:border-emerald-500 bg-gray-50 hover:bg-white transition-colors cursor-pointer outline-none">
                {buildYears().map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            
            <div className="flex flex-col">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Minggu</label>
              <select value={week} onChange={(e) => setWeek(Number(e.target.value))} className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-emerald-500 focus:border-emerald-500 bg-gray-50 hover:bg-white transition-colors cursor-pointer outline-none">
                <option value={0}>Semua Minggu</option>
                <option value={1}>Minggu 1 (1–7)</option>
                <option value={2}>Minggu 2 (8–14)</option>
                <option value={3}>Minggu 3 (15–21)</option>
                <option value={4}>Minggu 4 (22–akhir)</option>
              </select>
            </div>
          </div>
        
        <div className="xl:ml-auto shrink-0">
          {!loading && !loadingOutlets && (
            <div className="flex flex-wrap items-center xl:justify-end gap-2">
              <span className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 border border-gray-200 text-gray-700 rounded-lg text-xs font-semibold shadow-sm">
                <Store className="w-4 h-4" /> {filteredOutlets.length} outlet
              </span>
              {countDropping > 0 && (
                <span className="px-3 py-1.5 bg-amber-500 text-white rounded-lg text-xs font-bold shadow-sm">
                  {countDropping} DROPPING
                </span>
              )}
              {countInvoiced > 0 && (
                <span className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold shadow-sm">
                  <CheckCircle className="w-4 h-4" /> {countInvoiced} INVOICED
                </span>
              )}
              {countBelumLunas > 0 && (
                <button 
                  onClick={() => navigate("/tagihan")}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-red-100 text-red-800 border border-red-200 rounded-lg text-xs font-bold shadow-sm hover:bg-red-200 transition-colors cursor-pointer"
                >
                  <AlertCircle className="w-4 h-4" /> {countBelumLunas} BELUM LUNAS
                </button>
              )}
            </div>
          )}
        </div>
        </div>
      </div>

      {/* ── Day Tabs ── */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="flex overflow-x-auto overflow-y-hidden border-b border-gray-200 scrollbar-hide">
          {DAYS.map((d, i) => {
            const isSelected = i === dayTab;
            const cnt = isSelected ? outlets.length : undefined;
            return (
              <button
                key={d}
                onClick={() => setDayTab(i)}
                className={`whitespace-nowrap px-6 py-4 text-sm font-bold border-b-2 transition-colors relative ${
                  isSelected ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                {d}
                {cnt !== undefined && cnt > 0 && (
                  <span className="ml-2 inline-flex items-center justify-center bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full text-xs">
                    {cnt}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        
        <div className="bg-emerald-50 px-5 py-3 border-b border-gray-200 flex flex-wrap items-center gap-2">
          <span className="text-sm font-bold text-emerald-800">Hari Kunjungan: {selectedDay}</span>
          <span className="text-sm text-gray-500 font-medium">
            — {week > 0 ? `Minggu ke-${week} · ` : ""}{MONTHS[month - 1]} {year}
            {statusTab !== "ALL" ? ` · ${statusTab}` : ""}
          </span>
          {(loading || loadingOutlets) && <Loader2 className="w-4 h-4 text-emerald-600 animate-spin ml-2" />}
        </div>
        
        <div className="flex px-2 pt-2 gap-2 overflow-x-auto overflow-y-hidden scrollbar-hide border-b border-gray-200 bg-gray-50/50">
          {[
            { value: "ALL", label: `Semua (${Object.values(salesMap).flat().length})` },
            { value: "DROPPING", label: `Dropping (${Object.values(salesMap).flat().filter((s) => s.status === "DROPPING").length})` },
            { value: "INVOICED", label: `Invoiced (${Object.values(salesMap).flat().filter((s) => s.status === "INVOICED").length})` },
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => setStatusTab(tab.value as any)}
              className={`px-4 py-2 text-xs font-bold rounded-t-lg transition-colors border border-b-0 ${
                statusTab === tab.value 
                  ? 'bg-white text-gray-900 border-gray-200 shadow-sm relative z-10 translate-y-[1px]' 
                  : 'bg-transparent text-gray-500 border-transparent hover:bg-gray-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content ── */}
      <div>
        {loadingOutlets ? (
          <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-gray-200 border-dashed">
            <Loader2 className="w-10 h-10 text-emerald-500 animate-spin mb-4" />
            <p className="text-gray-500 font-medium">Memuat data outlet hari {selectedDay}...</p>
          </div>
        ) : outlets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 bg-white rounded-2xl border border-gray-200 border-dashed text-center">
            <Store className="w-16 h-16 text-gray-300 mb-4" />
            <p className="text-gray-600 font-medium mb-1">
              Tidak ada outlet dengan jadwal kunjungan <strong className="text-gray-900">{selectedDay}</strong>.
            </p>
            <p className="text-sm text-gray-400">Atur hari kunjungan outlet di menu Data Master.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {loading && (
              <div className="flex items-center gap-2 p-3 bg-blue-50 text-blue-700 border border-blue-200 rounded-xl mb-4 font-medium text-sm">
                <Loader2 className="w-4 h-4 animate-spin" /> Sedang memuat data nota...
              </div>
            )}
            {paginatedOutlets.map((outlet) => (
              <OutletCard
                key={outlet.id}
                outlet={outlet}
                sales={filteredSalesMap[outlet.id] ?? []}
                onSaleUpdated={handleSaleUpdated}
                onSaleDeleted={handleSaleDeleted}
                selectedDay={selectedDay}
                selectedWeek={week}
                selectedMonth={month}
                selectedYear={year}
              />
            ))}
            {!loadingOutlets && outlets.length > 0 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                totalItems={outlets.length}
                itemsPerPage={itemsPerPage}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
