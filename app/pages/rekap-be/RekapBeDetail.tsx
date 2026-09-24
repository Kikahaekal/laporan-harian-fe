import { useState, useEffect, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router";
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Store,
  Receipt,
  Truck,
  CheckCircle,
  DollarSign,
  Package,
  ExternalLink,
  CalendarDays,
  Search,
  AlertCircle,
  Loader2,
  Users
} from "lucide-react";
import apiBe from "../../lib/axiosBe";
import { MONTHS } from "../data/constant";
import { type Sale } from "../data/constant";
import { Pagination } from "../../components/Pagination";

// ─── Types ───────────────────────────────────────────────────────────────────

interface SaleItemDetail {
  id: number;
  item_id: number;
  qty_order: number;
  qty_sold: number;
  qty_returned: number;
  price_at_moment: number | string;
  subtotal: number | string;
  item?: { id: number; code: string; name: string };
}

interface SaleWithItems extends Sale {
  saleItems?: SaleItemDetail[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const DAYS_ID = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];
const DAY_JS = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

function fmtRupiah(val: string | number) { return Number(val || 0).toLocaleString("id-ID"); }

function toJakartaDate(s: string) {
  if (!s) return new Date();
  return new Date(new Date(s).toLocaleString("en-US", { timeZone: "Asia/Jakarta" }));
}

function fmtDate(s: string) {
  if (!s) return "-";
  const d = toJakartaDate(s);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}
function weekOfMonth(s: string) { return Math.ceil(toJakartaDate(s).getDate() / 7); }
function dayName(s: string) { return DAY_JS[toJakartaDate(s).getDay()]; }
function pad2(n: number) { return String(n).padStart(2, "0"); }
function buildYears(): number[] {
  const y = new Date().getFullYear();
  return [y, y - 1, y - 2, y - 3];
}

// ─── Stat Card ───────────────────────────────────────────────────────────────

function StatCard({ icon, label, value, colorClass = "text-blue-600", bgClass = "bg-blue-50", sub }: {
  icon: React.ReactNode; label: string; value: string | number; colorClass?: string; bgClass?: string; sub?: string;
}) {
  return (
    <div className="flex-1 min-w-[140px] bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-2">
        <div className={`p-2 rounded-xl ${bgClass} ${colorClass}`}>
          {icon}
        </div>
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</span>
      </div>
      <div className={`text-xl font-black ${colorClass} mb-1 leading-tight`}>{value}</div>
      {sub && <div className="text-xs text-gray-500 font-medium">{sub}</div>}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────

export default function RekapBeDetail() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const now = new Date();
  const initYear = Number(searchParams.get("year")) || now.getFullYear();
  const initMonth = Number(searchParams.get("month")) || (now.getMonth() + 1);
  const initMainTab = Number(searchParams.get("tab")) === 1 ? 1 : 0;
  const initDayTab = Math.min(Math.max(Number(searchParams.get("day")) || 0, 0), DAYS_ID.length - 1);
  const initWeekFilter = Math.max(Number(searchParams.get("week")) || 0, 0);
  const initUser = searchParams.get("user") || "all";
  const initSearch = searchParams.get("q") || "";

  // Selector
  const [selectedYear, setSelectedYear] = useState(initYear);
  const [selectedMonth, setSelectedMonth] = useState(initMonth);

  // Main tab: 0 = Ringkasan, 1 = Per Hari
  const [mainTab, setMainTab] = useState(initMainTab);

  // Per-hari state
  const [dayTab, setDayTab] = useState(initDayTab);
  const [weekFilter, setWeekFilter] = useState(initWeekFilter);
  const [search, setSearch] = useState(initSearch);
  
  // Accordion state
  const [expandedWeeks, setExpandedWeeks] = useState<Record<number, boolean>>({});

  // User filter state
  const [salesUsers, setSalesUsers] = useState<{id: number; name: string}[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>(initUser);

  useEffect(() => {
    apiBe.get("/api/web/users").then(res => {
      const raw = res.data;
      const list = Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : [];
      setSalesUsers(list.filter((user: { role?: string }) => user.role === "sales"));
    }).catch(console.error);
  }, []);

  // Pagination states
  const [outletPage, setOutletPage] = useState(1);
  const [itemPage, setItemPage] = useState(1);
  const itemsPerPage = 10;

  // Data
  const [isLoading, setIsLoading] = useState(false);
  const [allNotas, setAllNotas] = useState<SaleWithItems[]>([]);
  const [error, setError] = useState<string | null>(null);

  const lastDay = new Date(selectedYear, selectedMonth, 0).getDate();

  // Sync URL
  useEffect(() => {
    const params: Record<string, string> = {
      year: String(selectedYear),
      month: String(selectedMonth),
    };
    if (mainTab === 1) params.tab = "1";
    if (dayTab > 0) params.day = String(dayTab);
    if (weekFilter > 0) params.week = String(weekFilter);
    if (selectedUser !== "all") params.user = selectedUser;
    if (search.trim()) params.q = search;
    setSearchParams(params, { replace: true });
  }, [selectedYear, selectedMonth, mainTab, dayTab, weekFilter, selectedUser, search, setSearchParams]);

  // Fetch
  useEffect(() => {
    const ctrl = new AbortController();
    const fetch = async () => {
      setIsLoading(true); setError(null); setAllNotas([]);
      try {
        const from = `${selectedYear}-${pad2(selectedMonth)}-01`;
        const to = `${selectedYear}-${pad2(selectedMonth)}-${pad2(lastDay)}`;
        const res = await apiBe.get("/api/web/sales", {
          params: {
            from,
            to,
            per_page: 1000,
            ...(selectedUser !== "all" ? { user_id: selectedUser } : {}),
          },
          signal: ctrl.signal,
        });
        const raw = res.data;
        const list: SaleWithItems[] =
          Array.isArray(raw) ? raw :
            Array.isArray(raw?.data) ? raw.data : [];
        setAllNotas(list);
      } catch (err: any) {
        if (err.name !== "CanceledError")
          setError("Gagal memuat data. Pastikan server laporan-be berjalan.");
      } finally { setIsLoading(false); }
    };
    fetch();
    return () => ctrl.abort();
  }, [selectedYear, selectedMonth, selectedUser, lastDay]);
  
  const toggleWeekAccordion = (week: number) => {
    setExpandedWeeks(prev => ({ ...prev, [week]: !prev[week] }));
  };

  // ── Agregasi: Ringkasan ──────────────────────────────────────────────────

  const filteredNotas = useMemo(() => {
    let result = allNotas;
    if (selectedUser !== "all") {
      result = result.filter(n => String(n.user_id) === selectedUser);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((n) =>
        n.nota_number.toLowerCase().includes(q) ||
        (n.outlet?.name ?? "").toLowerCase().includes(q) ||
        (n.outlet?.code ?? "").toLowerCase().includes(q)
      );
    }
    return result;
  }, [allNotas, search, selectedUser]);

  const summary = useMemo(() => ({
    total: filteredNotas.length,
    invoiced: filteredNotas.filter((n) => n.status === "INVOICED").length,
    dropping: filteredNotas.filter((n) => n.status === "DROPPING").length,
    grandTotal: filteredNotas.reduce((s, n) => s + Number(n.grand_total || 0), 0),
    deposit: filteredNotas.reduce((s, n) => s + Number(n.deposit || 0), 0),
    outletCount: new Set(filteredNotas.map((n) => n.outlet_id)).size,
  }), [filteredNotas]);

  // Per-outlet
  const perOutlet = useMemo(() => {
    const map = new Map<number, { code: string; name: string; nota: number; grand: number; deposit: number }>();
    filteredNotas.forEach((n) => {
      const key = n.outlet_id;
      const prev = map.get(key) ?? { code: n.outlet?.code ?? "", name: n.outlet?.name ?? `#${key}`, nota: 0, grand: 0, deposit: 0 };
      map.set(key, { ...prev, nota: prev.nota + 1, grand: prev.grand + Number(n.grand_total || 0), deposit: prev.deposit + Number(n.deposit || 0) });
    });
    return Array.from(map.values()).sort((a, b) => b.grand - a.grand);
  }, [filteredNotas]);

  // Per-item
  const perItem = useMemo(() => {
    const map = new Map<number, { code: string; name: string; qtyOrder: number; qtySold: number; qtyRetur: number; qtySisa: number; subtotal: number }>();
    filteredNotas.forEach((n) => {
      (n.saleItems ?? []).forEach((si) => {
        const key = si.item_id;
        const prev = map.get(key) ?? { code: si.item?.code ?? "", name: si.item?.name ?? `#${key}`, qtyOrder: 0, qtySold: 0, qtyRetur: 0, qtySisa: 0, subtotal: 0 };
        map.set(key, {
          ...prev,
          qtyOrder: prev.qtyOrder + (si.qty_order || 0),
          qtySold: prev.qtySold + (si.qty_sold || 0),
          qtyRetur: prev.qtyRetur + (si.qty_returned || 0),
          qtySisa: prev.qtySisa + ((si.qty_order || 0) - (si.qty_sold || 0) - (si.qty_returned || 0)),
          subtotal: prev.subtotal + Number(si.subtotal || 0),
        });
      });
    });
    return Array.from(map.values()).sort((a, b) => b.subtotal - a.subtotal);
  }, [filteredNotas]);

  // Paginated Data
  const outletTotalPages = Math.ceil(perOutlet.length / itemsPerPage);
  const paginatedOutlet = useMemo(() => perOutlet.slice((outletPage - 1) * itemsPerPage, outletPage * itemsPerPage), [perOutlet, outletPage, itemsPerPage]);

  const itemTotalPages = Math.ceil(perItem.length / itemsPerPage);
  const paginatedItem = useMemo(() => perItem.slice((itemPage - 1) * itemsPerPage, itemPage * itemsPerPage), [perItem, itemPage, itemsPerPage]);

  useEffect(() => {
    setOutletPage(1);
    setItemPage(1);
  }, [search, selectedMonth, selectedYear, selectedUser]);

  // Per-minggu
  const perWeek = useMemo(() => {
    const map = new Map<number, { nota: number; grand: number; deposit: number; invoiced: number }>();
    filteredNotas.forEach((n) => {
      const w = weekOfMonth(n.transaction_date);
      const prev = map.get(w) ?? { nota: 0, grand: 0, deposit: 0, invoiced: 0 };
      map.set(w, {
        nota: prev.nota + 1,
        grand: prev.grand + Number(n.grand_total || 0),
        deposit: prev.deposit + Number(n.deposit || 0),
        invoiced: prev.invoiced + (n.status === "INVOICED" ? 1 : 0),
      });
    });
    return Array.from(map.entries()).sort((a, b) => a[0] - b[0]);
  }, [filteredNotas]);

  // Per-hari filtered
  const weekFiltered = useMemo(() => weekFilter === 0 ? filteredNotas : filteredNotas.filter((n) => weekOfMonth(n.transaction_date) === weekFilter), [filteredNotas, weekFilter]);
  const currentDay = DAYS_ID[dayTab];
  const dayNotas = useMemo(() => weekFiltered.filter((n) => dayName(n.transaction_date) === currentDay), [weekFiltered, currentDay]);
  const dayCountMap = useMemo(() => {
    const m: Record<string, number> = {};
    DAYS_ID.forEach((d) => { m[d] = weekFiltered.filter((n) => dayName(n.transaction_date) === d).length; });
    return m;
  }, [weekFiltered]);
  const weeksInDay = useMemo(() => Array.from(new Set(dayNotas.map((n) => weekOfMonth(n.transaction_date)))).sort((a, b) => a - b), [dayNotas]);
  
  // Set default expanded weeks when switching days
  useEffect(() => {
    const initialExpanded: Record<number, boolean> = {};
    weeksInDay.forEach(w => { initialExpanded[w] = true; });
    setExpandedWeeks(initialExpanded);
  }, [weeksInDay]);

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20">
      <button 
        onClick={() => navigate("/rekap-be")} 
        className="flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-gray-800 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Kembali
      </button>

      {/* ── Periode Selector ── */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
        <h2 className="text-sm font-bold text-gray-500 mb-3 uppercase tracking-wider">Periode</h2>
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center flex-wrap">
          <select
            value={selectedMonth}
            onChange={(e) => { setSelectedMonth(Number(e.target.value)); setWeekFilter(0); }}
            className="px-4 py-2.5 border border-gray-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white min-w-[150px]"
          >
            {MONTHS.map((name, idx) => <option key={idx + 1} value={idx + 1}>{name}</option>)}
          </select>
          
          <select
            value={selectedYear}
            onChange={(e) => { setSelectedYear(Number(e.target.value)); setWeekFilter(0); }}
            className="px-4 py-2.5 border border-gray-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white min-w-[110px]"
          >
            {buildYears().map((y) => <option key={y} value={y}>{y}</option>)}
          </select>

          <select
            value={selectedUser}
            onChange={(e) => setSelectedUser(e.target.value)}
            className="px-4 py-2.5 border border-gray-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white min-w-[150px]"
          >
            <option value="all">Semua Sales</option>
            {salesUsers.map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
          
          <div className="relative flex-1 min-w-[220px]">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Cari nota / outlet..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white shadow-sm text-sm outline-none font-medium"
            />
          </div>
          
          {!isLoading && allNotas.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="px-3 py-1.5 border border-blue-200 bg-blue-50 text-blue-700 rounded-lg text-xs font-bold shadow-sm whitespace-nowrap">
                {allNotas.length} nota {selectedUser === "all" ? "bulan ini" : "sales ini"}
              </span>
              {filteredNotas.length !== allNotas.length && (
                <span className="px-3 py-1.5 border border-amber-200 bg-amber-50 text-amber-700 rounded-lg text-xs font-bold shadow-sm whitespace-nowrap">
                  {filteredNotas.length} hasil
                </span>
              )}
            </div>
          )}
        </div>
        <p className="text-sm text-gray-500 mt-3 font-medium">
          Rekap <strong className="text-gray-900">{MONTHS[selectedMonth - 1]} {selectedYear}</strong> — semua nota dari aplikasi Android.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-800 border border-red-200 rounded-xl flex items-start gap-3 shadow-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-12 gap-3 text-gray-500">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          <p className="font-medium">Memuat data detail...</p>
        </div>
      ) : allNotas.length === 0 && !isLoading ? (
        <div className="p-8 text-center bg-blue-50 border border-blue-200 rounded-2xl text-blue-800">
          <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-80" />
          <p className="font-semibold text-lg">Tidak ada data untuk {MONTHS[selectedMonth - 1]} {selectedYear}.</p>
        </div>
      ) : (
        <>
          {filteredNotas.length === 0 && (
            <div className="p-4 bg-blue-50 text-blue-800 border border-blue-200 rounded-xl mb-4 font-medium">
              Tidak ada data yang sesuai pencarian.
            </div>
          )}
          
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
            {/* Main Tabs */}
            <div className="flex border-b border-gray-200 bg-gray-50/50">
              <button
                onClick={() => setMainTab(0)}
                className={`flex-1 sm:flex-none px-6 py-4 text-sm font-bold transition-colors border-b-2 ${
                  mainTab === 0
                    ? "border-blue-600 text-blue-700 bg-white"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                }`}
              >
                📊 Ringkasan Bulanan
              </button>
              <button
                onClick={() => setMainTab(1)}
                className={`flex-1 sm:flex-none px-6 py-4 text-sm font-bold transition-colors border-b-2 ${
                  mainTab === 1
                    ? "border-blue-600 text-blue-700 bg-white"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                }`}
              >
                📅 Per Hari
              </button>
            </div>

            {/* ══════════════ TAB 0: RINGKASAN BULANAN ══════════════ */}
            {mainTab === 0 && (
              <div className="p-4 sm:p-6 space-y-8 animate-in fade-in duration-300">
                {/* Summary Cards */}
                <div className="flex flex-wrap gap-4">
                  <StatCard icon={<Receipt className="w-5 h-5" />} label="Total Nota" value={summary.total} colorClass="text-gray-700" bgClass="bg-gray-100" />
                  <StatCard icon={<CheckCircle className="w-5 h-5" />} label="Invoiced" value={summary.invoiced} colorClass="text-emerald-700" bgClass="bg-emerald-100" />
                  <StatCard icon={<Truck className="w-5 h-5" />} label="Dropping Aktif" value={summary.dropping} colorClass="text-amber-600" bgClass="bg-amber-100" />
                  <StatCard icon={<DollarSign className="w-5 h-5" />} label="Total Grand Total" value={`Rp ${fmtRupiah(summary.grandTotal)}`} colorClass="text-blue-600" bgClass="bg-blue-100" />
                  <StatCard icon={<DollarSign className="w-5 h-5" />} label="Total Deposit" value={`Rp ${fmtRupiah(summary.deposit)}`} colorClass="text-indigo-600" bgClass="bg-indigo-100" sub={`Sisa: Rp ${fmtRupiah(summary.grandTotal - summary.deposit)}`} />
                  <StatCard icon={<Store className="w-5 h-5" />} label="Outlet Unik" value={summary.outletCount} colorClass="text-purple-600" bgClass="bg-purple-100" />
                </div>

                {/* Per-Minggu */}
                <div>
                  <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-3">
                    <CalendarDays className="w-5 h-5 text-blue-600" /> Rekap Per Minggu
                  </h3>
                  <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-blue-600 text-white">
                          <tr>
                            <th className="px-4 py-3 font-semibold">Minggu</th>
                            <th className="px-4 py-3 font-semibold">Periode Tanggal</th>
                            <th className="px-4 py-3 font-semibold text-center">Jumlah Nota</th>
                            <th className="px-4 py-3 font-semibold text-center">Invoiced</th>
                            <th className="px-4 py-3 font-semibold text-right">Grand Total</th>
                            <th className="px-4 py-3 font-semibold text-right">Deposit</th>
                            <th className="px-4 py-3 font-semibold text-right">Sisa</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white">
                          {perWeek.map(([w, d]) => {
                            const wStart = (w - 1) * 7 + 1;
                            const wEnd = Math.min(w * 7, lastDay);
                            const sisa = d.grand - d.deposit;
                            return (
                              <tr key={w} className="hover:bg-blue-50/50 transition-colors">
                                <td className="px-4 py-3">
                                  <span className="px-2.5 py-1 bg-gray-100 border border-gray-200 text-gray-700 rounded-lg text-xs font-bold shadow-sm">Minggu {w}</span>
                                </td>
                                <td className="px-4 py-3 text-gray-500 font-medium text-xs">
                                  {wStart}–{wEnd} {MONTHS[selectedMonth - 1]}
                                </td>
                                <td className="px-4 py-3 text-center font-semibold">{d.nota}</td>
                                <td className="px-4 py-3 text-center">
                                  <span className="px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg text-xs font-bold shadow-sm">
                                    {d.invoiced}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-right font-bold">Rp {fmtRupiah(d.grand)}</td>
                                <td className="px-4 py-3 text-right">Rp {fmtRupiah(d.deposit)}</td>
                                <td className="px-4 py-3 text-right">
                                  {sisa > 0
                                    ? <span className="font-bold text-red-600">Rp {fmtRupiah(sisa)}</span>
                                    : <span className="font-bold text-emerald-600">—</span>}
                                </td>
                              </tr>
                            );
                          })}
                          {/* Total row */}
                          <tr className="bg-gray-50/80 border-t-2 border-gray-200">
                            <td colSpan={2} className="px-4 py-3 font-black text-gray-900">TOTAL BULAN</td>
                            <td className="px-4 py-3 text-center font-black text-gray-900">{summary.total}</td>
                            <td className="px-4 py-3 text-center font-black text-gray-900">{summary.invoiced}</td>
                            <td className="px-4 py-3 text-right font-black text-blue-700">Rp {fmtRupiah(summary.grandTotal)}</td>
                            <td className="px-4 py-3 text-right font-black text-gray-900">Rp {fmtRupiah(summary.deposit)}</td>
                            <td className="px-4 py-3 text-right font-black">
                              <span className={(summary.grandTotal - summary.deposit) > 0 ? "text-red-600" : "text-emerald-600"}>
                                {(summary.grandTotal - summary.deposit) > 0 ? `Rp ${fmtRupiah(summary.grandTotal - summary.deposit)}` : "—"}
                              </span>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Per-Outlet */}
                <div>
                  <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-3">
                    <Store className="w-5 h-5 text-gray-600" /> Rekap Per Outlet
                  </h3>
                  <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-gray-800 text-white">
                          <tr>
                            <th className="px-4 py-3 font-semibold">Kode</th>
                            <th className="px-4 py-3 font-semibold">Nama Outlet</th>
                            <th className="px-4 py-3 font-semibold text-center">Nota</th>
                            <th className="px-4 py-3 font-semibold text-right">Grand Total</th>
                            <th className="px-4 py-3 font-semibold text-right">Deposit</th>
                            <th className="px-4 py-3 font-semibold text-right">Sisa</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white">
                          {paginatedOutlet.map((o, idx) => {
                            const sisa = o.grand - o.deposit;
                            return (
                              <tr key={idx} className={`hover:bg-gray-100 transition-colors ${idx % 2 !== 0 ? 'bg-gray-50/50' : ''}`}>
                                <td className="px-4 py-3 font-mono font-bold text-xs text-gray-600">{o.code}</td>
                                <td className="px-4 py-3 font-semibold">{o.name}</td>
                                <td className="px-4 py-3 text-center">
                                  <span className="px-2.5 py-1 bg-white border border-gray-200 text-gray-700 rounded-lg text-xs font-bold shadow-sm">{o.nota}</span>
                                </td>
                                <td className="px-4 py-3 text-right font-medium">Rp {fmtRupiah(o.grand)}</td>
                                <td className="px-4 py-3 text-right font-medium">Rp {fmtRupiah(o.deposit)}</td>
                                <td className="px-4 py-3 text-right">
                                  {sisa > 0
                                    ? <span className="font-bold text-red-600">Rp {fmtRupiah(sisa)}</span>
                                    : <span className="font-bold text-emerald-600">Lunas</span>}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    {!isLoading && perOutlet.length > 0 && (
                      <Pagination
                        currentPage={outletPage}
                        totalPages={outletTotalPages}
                        onPageChange={setOutletPage}
                        totalItems={perOutlet.length}
                        itemsPerPage={itemsPerPage}
                      />
                    )}
                  </div>
                </div>

                {/* Per-Item */}
                <div>
                  <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-3">
                    <Package className="w-5 h-5 text-indigo-600" /> Rekap Per Barang
                  </h3>
                  <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-indigo-600 text-white">
                          <tr>
                            <th className="px-4 py-3 font-semibold">Kode</th>
                            <th className="px-4 py-3 font-semibold">Nama Barang</th>
                            <th className="px-4 py-3 font-semibold text-right">Qty Order</th>
                            <th className="px-4 py-3 font-semibold text-right">Qty Terjual</th>
                            <th className="px-4 py-3 font-semibold text-right">Retur</th>
                            <th className="px-4 py-3 font-semibold text-right">Sisa</th>
                            <th className="px-4 py-3 font-semibold text-right">Subtotal</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white">
                          {paginatedItem.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="px-4 py-8 text-center text-gray-500 font-medium">
                                Data item tidak tersedia (nota masih berstatus DROPPING).
                              </td>
                            </tr>
                          ) : paginatedItem.map((item, idx) => (
                            <tr key={idx} className={`hover:bg-indigo-50/50 transition-colors ${idx % 2 !== 0 ? 'bg-gray-50/50' : ''}`}>
                              <td className="px-4 py-3 font-mono font-bold text-xs text-gray-600">{item.code}</td>
                              <td className="px-4 py-3 font-medium">{item.name}</td>
                              <td className="px-4 py-3 text-right">{item.qtyOrder}</td>
                              <td className="px-4 py-3 text-right font-bold text-emerald-600">{item.qtySold}</td>
                              <td className="px-4 py-3 text-right font-medium text-amber-600">{item.qtyRetur}</td>
                              <td className="px-4 py-3 text-right font-bold">
                                <span className={item.qtySisa > 0 ? "text-red-600" : "text-gray-400"}>{item.qtySisa}</span>
                              </td>
                              <td className="px-4 py-3 text-right font-bold">Rp {fmtRupiah(item.subtotal)}</td>
                            </tr>
                          ))}
                          {perItem.length > 0 && (
                            <tr className="bg-gray-50/80 border-t-2 border-gray-200">
                              <td colSpan={2} className="px-4 py-3 font-black text-gray-900">TOTAL</td>
                              <td className="px-4 py-3 text-right font-black text-gray-900">
                                {perItem.reduce((s, i) => s + i.qtyOrder, 0)}
                              </td>
                              <td className="px-4 py-3 text-right font-black text-emerald-600">
                                {perItem.reduce((s, i) => s + i.qtySold, 0)}
                              </td>
                              <td className="px-4 py-3 text-right font-black text-amber-600">
                                {perItem.reduce((s, i) => s + i.qtyRetur, 0)}
                              </td>
                              <td className="px-4 py-3 text-right font-black">
                                <span className={perItem.reduce((s, i) => s + i.qtySisa, 0) > 0 ? "text-red-600" : "text-gray-500"}>
                                  {perItem.reduce((s, i) => s + i.qtySisa, 0)}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right font-black text-blue-700">
                                Rp {fmtRupiah(perItem.reduce((s, i) => s + i.subtotal, 0))}
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                    {!isLoading && perItem.length > 0 && (
                      <Pagination
                        currentPage={itemPage}
                        totalPages={itemTotalPages}
                        onPageChange={setItemPage}
                        totalItems={perItem.length}
                        itemsPerPage={itemsPerPage}
                      />
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ══════════════ TAB 1: PER HARI ══════════════ */}
            {mainTab === 1 && (
              <div className="animate-in fade-in duration-300">
                {/* Filter minggu dalam tab Per Hari */}
                <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex items-center gap-3 overflow-x-auto">
                  <span className="text-sm font-bold text-gray-500 whitespace-nowrap">Filter Minggu:</span>
                  <div className="flex gap-2">
                    {[0, 1, 2, 3, 4, 5].map((w) => {
                      const wStart = w === 0 ? null : (w - 1) * 7 + 1;
                      const wEnd = w === 0 ? null : Math.min(w * 7, lastDay);
                      return (
                        <button
                          key={w}
                          onClick={() => setWeekFilter(w)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors border shadow-sm ${
                            weekFilter === w
                              ? "bg-blue-600 text-white border-blue-600"
                              : "bg-white text-gray-600 border-gray-200 hover:bg-gray-100 hover:text-gray-900"
                          }`}
                        >
                          {w === 0 ? "Semua" : `Minggu ${w} (${wStart}–${wEnd})`}
                        </button>
                      );
                    })}
                  </div>
                  {weekFilter > 0 && (
                    <span className="ml-auto px-3 py-1.5 bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold whitespace-nowrap shadow-sm">
                      {weekFiltered.length} nota
                    </span>
                  )}
                </div>

                {/* Day Tabs */}
                <div className="flex border-b border-gray-200 overflow-x-auto bg-white">
                  {DAYS_ID.map((day, idx) => (
                    <button
                      key={day}
                      onClick={() => setDayTab(idx)}
                      className={`flex-1 min-w-[120px] px-4 py-3 text-sm font-bold whitespace-nowrap transition-colors border-b-2 flex items-center justify-center gap-2 ${
                        dayTab === idx
                          ? "border-blue-600 text-blue-700 bg-blue-50/50"
                          : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      {day.toUpperCase()}
                      {dayCountMap[day] > 0 && (
                        <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                          dayTab === idx ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700"
                        }`}>
                          {dayCountMap[day]}
                        </span>
                      )}
                    </button>
                  ))}
                </div>

                <div className="p-4 sm:p-6 bg-gray-50/50 min-h-[300px]">
                  {dayNotas.length === 0 ? (
                    <div className="p-4 bg-blue-50 text-blue-800 border border-blue-200 rounded-xl font-medium flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                      <p>
                        Tidak ada nota untuk hari <strong className="font-bold">{currentDay}</strong>
                        {weekFilter > 0 ? `, Minggu ${weekFilter}` : ""} — {MONTHS[selectedMonth - 1]} {selectedYear}.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {weeksInDay.map((wn) => {
                        const wnNotas = dayNotas.filter((n) => weekOfMonth(n.transaction_date) === wn);
                        const wStart = (wn - 1) * 7 + 1;
                        const wEnd = Math.min(wn * 7, lastDay);
                        const wGrand = wnNotas.reduce((s, n) => s + Number(n.grand_total || 0), 0);
                        const wDep = wnNotas.reduce((s, n) => s + Number(n.deposit || 0), 0);
                        const isExpanded = !!expandedWeeks[wn];

                        return (
                          <div key={wn} className="border border-gray-200 rounded-2xl bg-white overflow-hidden shadow-sm">
                            {/* Accordion Header */}
                            <button
                              onClick={() => toggleWeekAccordion(wn)}
                              className="w-full flex items-center justify-between p-4 bg-white hover:bg-gray-50 transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                {isExpanded ? <ChevronDown className="w-5 h-5 text-gray-500" /> : <ChevronRight className="w-5 h-5 text-gray-500" />}
                                <h4 className="font-bold text-gray-900">
                                  Minggu {wn} <span className="text-sm font-medium text-gray-500 ml-1">(tgl {wStart}–{wEnd})</span>
                                </h4>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="px-2.5 py-1 border border-gray-200 text-gray-700 bg-gray-50 rounded-lg text-xs font-bold shadow-sm">
                                  {wnNotas.length} nota
                                </span>
                                <span className="px-2.5 py-1 border border-blue-200 text-blue-700 bg-blue-50 rounded-lg text-xs font-bold shadow-sm hidden sm:inline-block">
                                  Deposit: Rp {fmtRupiah(wDep)}
                                </span>
                              </div>
                            </button>

                            {/* Accordion Content */}
                            {isExpanded && (
                              <div className="border-t border-gray-100 p-4 pt-0">
                                <div className="mt-4 border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                                  <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm whitespace-nowrap">
                                      <thead className="bg-gray-100 text-gray-700">
                                        <tr>
                                          <th className="px-4 py-3 font-semibold">No. Nota</th>
                                          <th className="px-4 py-3 font-semibold">Tgl</th>
                                          <th className="px-4 py-3 font-semibold">Outlet</th>
                                          <th className="px-4 py-3 font-semibold text-right">Grand Total</th>
                                          <th className="px-4 py-3 font-semibold text-right">Deposit</th>
                                          <th className="px-4 py-3 font-semibold text-right">Sisa</th>
                                          <th className="px-4 py-3 font-semibold text-center">Status</th>
                                          <th className="px-4 py-3 font-semibold text-center"></th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-gray-100 bg-white">
                                        {wnNotas.map((nota) => {
                                          const sisa = Number(nota.grand_total || 0) - Number(nota.deposit || 0);
                                          return (
                                            <tr key={nota.id} className="hover:bg-blue-50/50 transition-colors">
                                              <td className="px-4 py-3 font-mono text-[11px] font-bold text-gray-700">{nota.nota_number}</td>
                                              <td className="px-4 py-3 font-medium">{fmtDate(nota.transaction_date)}</td>
                                              <td className="px-4 py-3">
                                                {nota.outlet ? (
                                                  <div className="flex flex-col">
                                                    <span className="font-bold text-gray-900">{nota.outlet.name}</span>
                                                    <span className="text-xs text-gray-500 font-medium">{nota.outlet.code}</span>
                                                  </div>
                                                ) : <span className="text-gray-500 font-medium">#{nota.outlet_id}</span>}
                                              </td>
                                              <td className="px-4 py-3 text-right font-medium">Rp {fmtRupiah(nota.grand_total)}</td>
                                              <td className="px-4 py-3 text-right font-medium">Rp {fmtRupiah(nota.deposit)}</td>
                                              <td className="px-4 py-3 text-right">
                                                {sisa > 0
                                                  ? <span className="font-bold text-red-600">Rp {fmtRupiah(sisa)}</span>
                                                  : <span className="font-bold text-emerald-600">—</span>}
                                              </td>
                                              <td className="px-4 py-3 text-center">
                                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                                                  nota.status === "INVOICED"
                                                    ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                                    : "bg-amber-100 text-amber-800 border border-amber-200"
                                                }`}>
                                                  {nota.status}
                                                </span>
                                              </td>
                                              <td className="px-4 py-3 text-center">
                                                <button
                                                  onClick={() => navigate(`/monitoring/${nota.id}`)}
                                                  className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors inline-flex"
                                                  title="Detail nota"
                                                >
                                                  <ExternalLink className="w-4 h-4" />
                                                </button>
                                              </td>
                                            </tr>
                                          );
                                        })}
                                        {/* Total Mingguan */}
                                        <tr className="bg-gray-50/80 border-t-2 border-gray-200">
                                          <td colSpan={3} className="px-4 py-3 font-black text-gray-700 text-xs tracking-wider">TOTAL MINGGU {wn}</td>
                                          <td className="px-4 py-3 text-right font-black text-gray-900">Rp {fmtRupiah(wGrand)}</td>
                                          <td className="px-4 py-3 text-right font-black text-gray-900">Rp {fmtRupiah(wDep)}</td>
                                          <td colSpan={3}></td>
                                        </tr>
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
