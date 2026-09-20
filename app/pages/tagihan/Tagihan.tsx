import { useState, useEffect, useCallback } from "react";
import {
  Wallet,
  Receipt,
  DollarSign,
  CheckCircle,
  AlertTriangle,
  Edit2,
  Search,
  X,
  AlertCircle,
  Loader2,
  ArrowLeft,
  Users
} from "lucide-react";
import { useSearchParams, useNavigate } from "react-router";
import apiBe from "../../lib/axiosBe";
import { MONTHS, type Sale, type PaymentStatus } from "../data/constant";
import { Pagination } from "../../components/Pagination";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmtRp = (v: number | string) =>
  "Rp " + Number(v).toLocaleString("id-ID");

const PAYMENT_STATUS_CONFIG: Record<
  PaymentStatus,
  { label: string; colorClass: string; icon: React.ReactNode }
> = {
  LUNAS: { label: "Lunas", colorClass: "bg-emerald-100 text-emerald-800 border-emerald-200", icon: <CheckCircle className="w-3.5 h-3.5" /> },
  CICILAN: { label: "Cicilan", colorClass: "bg-amber-100 text-amber-800 border-amber-200", icon: <AlertTriangle className="w-3.5 h-3.5" /> },
  BELUM_LUNAS: { label: "Belum Lunas", colorClass: "bg-red-100 text-red-800 border-red-200", icon: <Receipt className="w-3.5 h-3.5" /> },
};

function PaymentChip({ status }: { status: PaymentStatus | null }) {
  const cfg = PAYMENT_STATUS_CONFIG[status ?? "BELUM_LUNAS"];
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border shadow-sm ${cfg.colorClass}`}>
      {cfg.icon} {cfg.label}
    </span>
  );
}

function SummaryCard({ icon, label, value, sub, colorClass = "text-gray-900" }: {
  icon: React.ReactNode; label: string; value: string | number; sub?: string; colorClass?: string;
}) {
  return (
    <div className="flex-1 min-w-[140px] bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-2">
        <div className="p-2 rounded-xl bg-gray-50 border border-gray-100">
          {icon}
        </div>
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</span>
      </div>
      <div className={`text-2xl font-black ${colorClass} mb-1`}>{value}</div>
      {sub && <div className="text-xs text-gray-500 font-medium">{sub}</div>}
    </div>
  );
}

// ─── Component: Dialog Modal ─────────────────────────────────────────────────
function Modal({ open, onClose, title, children, actions }: { open: boolean; onClose: () => void; title: React.ReactNode; children: React.ReactNode; actions?: React.ReactNode }) {
  if (!open) return null;
  return (
    <>
      <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-[100]" onClick={onClose} />
      <div className="fixed inset-0 z-[101] flex items-center justify-center p-4 pointer-events-none">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm pointer-events-auto flex flex-col max-h-full">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div className="font-bold text-gray-900 text-lg flex items-center gap-2">{title}</div>
            <button onClick={onClose} className="text-gray-400 hover:bg-gray-100 hover:text-gray-600 rounded-full p-1.5 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="p-5 overflow-y-auto">
            {children}
          </div>
          {actions && (
            <div className="px-5 py-4 border-t border-gray-100 flex justify-end gap-2 bg-gray-50/50 rounded-b-2xl">
              {actions}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ─── Component: Toast Notification ───────────────────────────────────────────
function Toast({ open, msg, type, onClose }: { open: boolean; msg: string; type: "success" | "error"; onClose: () => void }) {
  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => onClose(), 3000);
      return () => clearTimeout(timer);
    }
  }, [open, onClose]);
  
  if (!open) return null;
  const isError = type === "error";
  
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[200] animate-in fade-in slide-in-from-bottom-4">
      <div className={`flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg border ${isError ? 'bg-red-50 border-red-200 text-red-800' : 'bg-emerald-50 border-emerald-200 text-emerald-800'}`}>
        {isError ? <AlertCircle className="w-5 h-5 flex-shrink-0" /> : <CheckCircle className="w-5 h-5 flex-shrink-0" />}
        <span className="text-sm font-medium">{msg}</span>
        <button onClick={onClose} className={`ml-2 p-1 rounded-full ${isError ? 'hover:bg-red-100' : 'hover:bg-emerald-100'}`}>
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface UserSummary {
  user_id: number;
  user_name: string;
  count_belum_lunas: number;
  count_cicilan: number;
  count_lunas: number;
  total_piutang: number;
}

const DAYS = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];
const getDayName = (dateStr: string) => {
  const map = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  return map[new Date(dateStr).getDay()];
};

export default function Tagihan() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  // ── States Level 1 (Summary by User) ──
  const [usersSummary, setUsersSummary] = useState<UserSummary[]>([]);
  const [summaryLoading, setSummaryLoading] = useState(true);
  
  // ── States Level 2 (Sales Detail per User) ──
  const [selectedUser, setSelectedUser] = useState<{ id: number; name: string } | null>(null);
  const [sales, setSales] = useState<Sale[]>([]);
  const [salesLoading, setSalesLoading] = useState(false);
  
  // ── Common States ──
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("BELUM_LUNAS,CICILAN");
  const [filterMonth, setFilterMonth] = useState<string>(String(new Date().getMonth() + 1));
  const [filterYear, setFilterYear] = useState<string>(String(new Date().getFullYear()));
  const [filterDay, setFilterDay] = useState<string>(
    ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"][new Date().getDay()]
  );

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // ── Dialog bayar ──
  const [payDialog, setPayDialog] = useState<Sale | null>(null);
  const [depositInput, setDepositInput] = useState("");
  const [saving, setSaving] = useState(false);

  // ── Snackbar ──
  const [snack, setSnack] = useState<{ open: boolean; msg: string; severity: "success" | "error" }>({
    open: false, msg: "", severity: "success",
  });
  const showSnack = (msg: string, severity: "success" | "error" = "success") =>
    setSnack({ open: true, msg, severity });

  // ── Fetch Level 1: Summary By User ──
  const fetchSummary = useCallback(async () => {
    setSummaryLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = {};
      if (filterMonth) {
        const y = filterYear || new Date().getFullYear().toString();
        const lDay = new Date(Number(y), Number(filterMonth), 0).getDate();
        params.from = `${y}-${filterMonth.padStart(2, "0")}-01`;
        params.to = `${y}-${filterMonth.padStart(2, "0")}-${String(lDay).padStart(2, "0")}`;
      } else if (filterYear) {
        params.from = `${filterYear}-01-01`;
        params.to = `${filterYear}-12-31`;
      }
      
      const res = await apiBe.get("/api/web/sales/summary-by-user", { params });
      setUsersSummary(res.data);
    } catch {
      setError("Gagal memuat rekap tagihan.");
    } finally {
      setSummaryLoading(false);
    }
  }, [filterMonth, filterYear]);

  // ── Fetch Level 2: Sales Detail ──
  const fetchSalesDetail = useCallback(async (userId: number) => {
    setSalesLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = { status: "INVOICED", user_id: String(userId), per_page: "5000" };
      if (filterMonth) {
        const y = filterYear || new Date().getFullYear().toString();
        const lDay = new Date(Number(y), Number(filterMonth), 0).getDate();
        params.from = `${y}-${filterMonth.padStart(2, "0")}-01`;
        params.to = `${y}-${filterMonth.padStart(2, "0")}-${String(lDay).padStart(2, "0")}`;
      } else if (filterYear) {
        params.from = `${filterYear}-01-01`;
        params.to = `${filterYear}-12-31`;
      }
      const res = await apiBe.get("/api/web/sales", { params });
      const raw = res.data;
      setSales(Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : []);
    } catch {
      setError("Gagal memuat detail tagihan.");
    } finally {
      setSalesLoading(false);
    }
  }, [filterMonth, filterYear]);

  // ── Handle Auto-Skip if ?q=nota is present ──
  useEffect(() => {
    const q = searchParams.get("q");
    if (q) {
      const autoSkip = async () => {
        try {
          const res = await apiBe.get("/api/web/sales", { params: { status: "INVOICED", per_page: "5000" } });
          const allSales: Sale[] = res.data?.data || [];
          const target = allSales.find(s => s.nota_number.toLowerCase().includes(q.toLowerCase()));
          if (target) {
            setSelectedUser({ id: target.user_id, name: target.user?.name ?? `User #${target.user_id}` });
            setSearch(q);
            setFilterStatus("ALL");
            setFilterDay("Semua");
          } else {
             fetchSummary();
          }
        } catch {
          fetchSummary();
        }
      };
      autoSkip();
    } else {
      fetchSummary();
    }
  }, [searchParams, fetchSummary]);

  // Refetch when filters change (Month/Year)
  useEffect(() => {
    if (selectedUser) {
      fetchSalesDetail(selectedUser.id);
    } else {
      fetchSummary();
    }
  }, [filterMonth, filterYear, selectedUser, fetchSummary, fetchSalesDetail]);


  // ── Derived Data Level 2 ──
  let filteredSales = sales;
  if (selectedUser) {
    if (filterStatus !== "ALL") {
      const allowed = filterStatus.split(",");
      filteredSales = filteredSales.filter((s) => allowed.includes(s.payment_status ?? "BELUM_LUNAS"));
    }
    if (filterDay !== "Semua") {
      filteredSales = filteredSales.filter(s => getDayName(s.transaction_date) === filterDay);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      filteredSales = filteredSales.filter(
        (s) =>
          s.nota_number.toLowerCase().includes(q) ||
          (s.outlet?.name ?? "").toLowerCase().includes(q) ||
          (s.outlet?.code ?? "").toLowerCase().includes(q)
      );
    }
  }

  const totalPages = Math.ceil((selectedUser ? filteredSales.length : usersSummary.length) / itemsPerPage);
  const paginatedSales = filteredSales.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const paginatedSummary = usersSummary.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterStatus, filterMonth, filterYear, filterDay, search, selectedUser]);

  // ── Update pembayaran ──
  const handleSavePayment = async () => {
    if (!payDialog) return;
    const dep = Number(depositInput);
    if (isNaN(dep) || dep < 0) {
      showSnack("Masukkan jumlah deposit yang valid.", "error");
      return;
    }
    setSaving(true);
    try {
      await apiBe.patch(`/api/web/sales/${payDialog.id}/payment`, { deposit: dep });
      showSnack("Status pembayaran berhasil diperbarui.");
      setPayDialog(null);
      if (selectedUser) fetchSalesDetail(selectedUser.id);
    } catch (err: any) {
      showSnack(err.response?.data?.message || "Gagal menyimpan pembayaran.", "error");
    } finally {
      setSaving(false);
    }
  };

  // ── Summary Cards Calculation ──
  let countBelumLunas = 0, countCicilan = 0, countLunas = 0, totalPiutang = 0;
  if (selectedUser) {
    totalPiutang = filteredSales.reduce((s, n) => s + Math.max(0, (Number(n.grand_total) || 0) - (Number(n.deposit) || 0)), 0);
    countBelumLunas = filteredSales.filter((s) => (s.payment_status ?? "BELUM_LUNAS") === "BELUM_LUNAS").length;
    countCicilan = filteredSales.filter((s) => s.payment_status === "CICILAN").length;
    countLunas = filteredSales.filter((s) => s.payment_status === "LUNAS").length;
  } else {
    countBelumLunas = usersSummary.reduce((s, u) => s + Number(u.count_belum_lunas), 0);
    countCicilan = usersSummary.reduce((s, u) => s + Number(u.count_cicilan), 0);
    countLunas = usersSummary.reduce((s, u) => s + Number(u.count_lunas), 0);
    totalPiutang = usersSummary.reduce((s, u) => s + Number(u.total_piutang), 0);
  }

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 3 }, (_, i) => currentYear - i);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {selectedUser ? (
             <button 
                onClick={() => { setSelectedUser(null); setSearch(""); }}
                className="p-3 bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900 rounded-2xl shadow-sm transition-colors"
                title="Kembali ke daftar Sales"
              >
                <ArrowLeft className="w-6 h-6" />
             </button>
          ) : (
            <div className="p-3 bg-blue-100 text-blue-600 rounded-2xl shadow-sm">
              <Wallet className="w-7 h-7" />
            </div>
          )}
          <div>
            <h1 className="text-2xl font-black text-gray-900 leading-tight">
              {selectedUser ? `Tagihan — ${selectedUser.name}` : "Tagihan per Sales"}
            </h1>
            <p className="text-sm text-gray-500 font-medium">
              {selectedUser ? "Detail nota dan status pembayaran outlet" : "Pilih akun sales untuk melihat detail tagihan"}
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-800 rounded-xl border border-red-200 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {(selectedUser ? salesLoading : summaryLoading) ? (
        <div className="flex flex-wrap gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex-1 min-w-[140px] bg-white border border-gray-200 rounded-2xl p-4 shadow-sm animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-16 mb-4"></div>
              <div className="h-8 bg-gray-200 rounded w-24 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-20"></div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-wrap gap-4">
          <SummaryCard
            icon={<Receipt className="w-5 h-5 text-red-500" />}
            label="Belum Lunas"
            value={countBelumLunas}
            colorClass="text-red-600"
            sub="nota"
          />
          <SummaryCard
            icon={<AlertTriangle className="w-5 h-5 text-amber-500" />}
            label="Cicilan"
            value={countCicilan}
            colorClass="text-amber-600"
            sub="nota"
          />
          <SummaryCard
            icon={<CheckCircle className="w-5 h-5 text-emerald-500" />}
            label="Lunas"
            value={countLunas}
            colorClass="text-emerald-600"
            sub="nota"
          />
          <SummaryCard
            icon={<DollarSign className="w-5 h-5 text-blue-500" />}
            label="Total Piutang"
            value={fmtRp(totalPiutang)}
            colorClass={totalPiutang > 0 ? "text-red-600" : "text-emerald-600"}
            sub="sisa belum dibayar"
          />
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
        {selectedUser && (
          <>
            <div className="relative w-full sm:w-64">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Cari nota / outlet..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-xl focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-gray-50 text-sm outline-none font-medium"
              />
            </div>
            
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full sm:w-auto px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none bg-gray-50 font-medium"
            >
              <option value="BELUM_LUNAS,CICILAN">Belum Lunas / Cicilan</option>
              <option value="BELUM_LUNAS">Belum Lunas</option>
              <option value="CICILAN">Cicilan</option>
              <option value="LUNAS">Lunas</option>
              <option value="ALL">Semua Status</option>
            </select>

          </>
        )}
        
        <div className="flex gap-3 ml-auto w-full sm:w-auto">
          <select
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
            className="w-full sm:w-36 px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none bg-gray-50 font-medium"
          >
            <option value="">Semua Bulan</option>
            {MONTHS.map((m, i) => <option key={i} value={String(i + 1)}>{m}</option>)}
          </select>
          <select
            value={filterYear}
            onChange={(e) => setFilterYear(e.target.value)}
            className="w-full sm:w-28 px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none bg-gray-50 font-medium"
          >
            {yearOptions.map((y) => <option key={y} value={String(y)}>{y}</option>)}
          </select>
        </div>
      </div>

      {selectedUser && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden mb-4">
          <div className="flex overflow-x-auto overflow-y-hidden border-b border-gray-200 scrollbar-hide">
            {["Semua", ...DAYS].map((d) => {
              const isSelected = d === filterDay;
              return (
                <button
                  key={d}
                  onClick={() => setFilterDay(d)}
                  className={`whitespace-nowrap flex-1 py-4 px-6 text-center text-sm font-bold border-b-2 transition-colors relative ${
                    isSelected
                      ? "border-blue-600 text-blue-700 bg-blue-50/50"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {d === "Semua" ? "SEMUA HARI" : d.toUpperCase()}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {!selectedUser ? (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-blue-600 text-white text-sm">
                  <th className="px-5 py-4 font-bold whitespace-nowrap">Nama Sales</th>
                  <th className="px-5 py-4 font-bold text-center">Belum Lunas</th>
                  <th className="px-5 py-4 font-bold text-center">Cicilan</th>
                  <th className="px-5 py-4 font-bold text-center">Lunas</th>
                  <th className="px-5 py-4 font-bold text-right">Total Piutang</th>
                  <th className="px-5 py-4 font-bold text-center w-24">Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {summaryLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 6 }).map((_, j) => (
                        <td key={j} className="px-5 py-4"><div className="h-4 bg-gray-100 rounded animate-pulse w-full"></div></td>
                      ))}
                    </tr>
                  ))
                ) : paginatedSummary.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-gray-500 font-medium">
                      Tidak ada data tagihan.
                    </td>
                  </tr>
                ) : (
                  paginatedSummary.map((u) => (
                    <tr key={u.user_id} className="hover:bg-blue-50/50 transition-colors">
                      <td className="px-5 py-4 font-bold text-gray-900 flex items-center gap-2">
                        <div className="bg-blue-100 p-2 rounded-full text-blue-600">
                          <Users className="w-4 h-4" />
                        </div>
                        {u.user_name}
                      </td>
                      <td className="px-5 py-4 text-center font-bold text-red-600">{u.count_belum_lunas}</td>
                      <td className="px-5 py-4 text-center font-bold text-amber-600">{u.count_cicilan}</td>
                      <td className="px-5 py-4 text-center font-bold text-emerald-600">{u.count_lunas}</td>
                      <td className="px-5 py-4 text-right font-black text-gray-900">{fmtRp(u.total_piutang)}</td>
                      <td className="px-5 py-4 text-center">
                        <button
                          onClick={() => setSelectedUser({ id: u.user_id, name: u.user_name })}
                          className="p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors"
                          title="Lihat Detail Tagihan"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {!summaryLoading && usersSummary.length > 0 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              totalItems={usersSummary.length}
              itemsPerPage={itemsPerPage}
            />
          )}
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-2">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-blue-600 text-white text-sm">
                  <th className="px-5 py-4 font-bold whitespace-nowrap">No Nota</th>
                  <th className="px-5 py-4 font-bold">Outlet</th>
                  <th className="px-5 py-4 font-bold whitespace-nowrap">Tgl Transaksi</th>
                  <th className="px-5 py-4 font-bold text-right whitespace-nowrap">Total Tagihan</th>
                  <th className="px-5 py-4 font-bold text-right whitespace-nowrap">Deposit</th>
                  <th className="px-5 py-4 font-bold text-right whitespace-nowrap">Sisa Tagihan</th>
                  <th className="px-5 py-4 font-bold whitespace-nowrap">Status</th>
                  <th className="px-5 py-4 font-bold text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {salesLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 8 }).map((_, j) => (
                        <td key={j} className="px-5 py-4"><div className="h-4 bg-gray-100 rounded animate-pulse w-full"></div></td>
                      ))}
                    </tr>
                  ))
                ) : paginatedSales.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-12 text-center text-gray-500 font-medium text-base">
                      {filterStatus.includes("BELUM_LUNAS") || filterStatus.includes("CICILAN")
                        ? "🎉 Tidak ada tagihan yang belum lunas!"
                        : "Tidak ada data yang sesuai filter."}
                    </td>
                  </tr>
                ) : (
                  paginatedSales.map((sale) => {
                    const grandTotal = Number(sale.grand_total) || 0;
                    const deposit = Number(sale.deposit) || 0;
                    const sisa = Math.max(0, grandTotal - deposit);
                    const ps = sale.payment_status ?? "BELUM_LUNAS";
                    return (
                      <tr
                        key={sale.id}
                        className={`hover:bg-blue-50/50 transition-colors ${
                          ps === "BELUM_LUNAS" ? "bg-red-50/30" : ps === "CICILAN" ? "bg-amber-50/30" : ""
                        }`}
                      >
                        <td className="px-5 py-3">
                          <span className="font-mono font-bold text-gray-900 bg-gray-100 px-2 py-1 rounded text-xs">
                            {sale.nota_number}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          {sale.outlet ? (
                            <div className="flex flex-col">
                              <span className="font-bold text-gray-900">{sale.outlet.name}</span>
                              <span className="text-xs text-gray-500">{sale.outlet.code} — {sale.outlet.visit_day ?? "-"}</span>
                            </div>
                          ) : (
                            <span className="text-gray-500">#{sale.outlet_id}</span>
                          )}
                        </td>
                        <td className="px-5 py-3 font-medium text-gray-600 whitespace-nowrap">
                          {new Date(sale.transaction_date).toLocaleDateString("id-ID", {
                            day: "2-digit", month: "short", year: "numeric"
                          })}
                        </td>
                        <td className="px-5 py-3 text-right font-bold text-gray-900 whitespace-nowrap">
                          {fmtRp(grandTotal)}
                        </td>
                        <td className="px-5 py-3 text-right whitespace-nowrap">
                          <span className={`font-semibold ${deposit > 0 ? "text-emerald-600" : "text-gray-400"}`}>
                            {deposit > 0 ? fmtRp(deposit) : "—"}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right whitespace-nowrap">
                          <span className={`font-black ${sisa > 0 ? "text-red-600" : "text-emerald-600"}`}>
                            {sisa > 0 ? fmtRp(sisa) : "✓ Lunas"}
                          </span>
                        </td>
                        <td className="px-5 py-3 whitespace-nowrap">
                          <PaymentChip status={ps as PaymentStatus} />
                        </td>
                        <td className="px-5 py-3 text-center">
                          <button
                            onClick={() => {
                              setPayDialog(sale);
                              setDepositInput(String(deposit));
                            }}
                            className="p-2 text-blue-600 hover:bg-blue-100 rounded-xl transition-colors"
                            title="Update Pembayaran"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          {!salesLoading && filteredSales.length > 0 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              totalItems={filteredSales.length}
              itemsPerPage={itemsPerPage}
            />
          )}
        </div>
      )}

      <Modal
        open={payDialog !== null}
        onClose={() => !saving && setPayDialog(null)}
        title={<><Wallet className="w-5 h-5 text-blue-600" /> Update Pembayaran</>}
        actions={
          <>
            <button onClick={() => setPayDialog(null)} disabled={saving} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-xl transition-colors">
              Batal
            </button>
            <button onClick={handleSavePayment} disabled={saving} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl disabled:opacity-50 transition-colors flex items-center gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Simpan"}
            </button>
          </>
        }
      >
        {payDialog && (
          <div className="space-y-4">
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 shadow-inner">
              <div className="mb-2">
                <p className="text-xs font-semibold text-gray-500 uppercase">Nota</p>
                <p className="font-mono font-bold text-gray-900">{payDialog.nota_number}</p>
              </div>
              <div className="mb-3">
                <p className="text-xs font-semibold text-gray-500 uppercase">Outlet</p>
                <p className="font-bold text-gray-900">{payDialog.outlet?.name ?? `#${payDialog.outlet_id}`}</p>
              </div>
              <div className="flex gap-4 p-3 bg-white rounded-lg border border-gray-100">
                <div className="flex-1">
                  <p className="text-xs font-semibold text-gray-500 uppercase">Total Tagihan</p>
                  <p className="font-black text-gray-900">{fmtRp(payDialog.grand_total)}</p>
                </div>
                <div className="w-px bg-gray-200"></div>
                <div className="flex-1">
                  <p className="text-xs font-semibold text-gray-500 uppercase">Sisa Tagihan</p>
                  <p className="font-black text-red-600">
                    {fmtRp(Math.max(0, Number(payDialog.grand_total) - Number(payDialog.deposit)))}
                  </p>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-900 mb-1.5">Jumlah Deposit / Pembayaran *</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 font-bold">Rp</span>
                </div>
                <input
                  type="number"
                  value={depositInput}
                  onChange={(e) => setDepositInput(e.target.value)}
                  onBlur={() => {
                    const maxValue = Number(payDialog.grand_total) || 0;
                    let value = Number(depositInput) || 0;
                    if (value > maxValue) value = maxValue;
                    value = Math.round(value / 100) * 100;
                    setDepositInput(value.toString());
                  }}
                  className="w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-lg font-bold shadow-sm"
                  min="0"
                  max={Number(payDialog.grand_total) || undefined}
                  step="500"
                />
              </div>
              <p className="mt-2 text-sm font-medium">
                {(() => {
                  const dep = Number(depositInput) || 0;
                  const total = Number(payDialog.grand_total) || 0;
                  if (dep >= total) return <span className="text-emerald-600 flex items-center gap-1"><CheckCircle className="w-4 h-4" /> Status akan menjadi LUNAS</span>;
                  if (dep > 0) return <span className="text-amber-600 flex items-center gap-1"><AlertTriangle className="w-4 h-4" /> Status akan menjadi CICILAN</span>;
                  return <span className="text-red-600 flex items-center gap-1"><Receipt className="w-4 h-4" /> Status akan menjadi BELUM LUNAS</span>;
                })()}
              </p>
            </div>
          </div>
        )}
      </Modal>

      <Toast
        open={snack.open}
        msg={snack.msg}
        type={snack.severity}
        onClose={() => setSnack((s) => ({ ...s, open: false }))}
      />
    </div>
  );
}
