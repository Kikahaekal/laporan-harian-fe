import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import apiBe from "../../lib/axiosBe";
import { type Sale } from "../data/constant";
import { CardsSkeleton, TableRowsSkeleton } from "../../components/TableSkeleton";
import {
  FileText,
  Truck,
  CheckCircle,
  Banknote,
  AlertCircle,
  Store,
  ChevronRight,
  BarChart2,
  Loader2,
  Wallet
} from "lucide-react";
import { WeeklyMonitorSection } from "../../components/WeeklyMonitorSection";
import { OutletMap } from "../../components/OutletMap";
import { type OutletData } from "../data/constant";

function todayRange() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const today = `${y}-${m}-${d}`;
  return { from: today, to: today, label: `${d}/${m}/${y}` };
}

function monthRange() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const lastDay = new Date(y, now.getMonth() + 1, 0).getDate();
  return {
    from: `${y}-${m}-01`,
    to: `${y}-${m}-${String(lastDay).padStart(2, "0")}`,
    label: `${now.toLocaleString("id-ID", { month: "long" })} ${y}`,
  };
}

function formatRupiah(val: string | number) {
  const n = Number(val || 0);
  return n.toLocaleString("id-ID");
}

function formatDate(dateStr: string) {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

interface SummaryCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  colorClass: string;
  sub?: string;
}

function SummaryCard({ icon, label, value, colorClass, sub }: SummaryCardProps) {
  return (
    <div className="flex-1 min-w-[200px] bg-white border border-gray-100 rounded-2xl shadow-sm p-4 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start gap-2">
        <div className="space-y-1">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</span>
          <h3 className={`text-2xl sm:text-3xl font-bold ${colorClass}`}>{value}</h3>
          {sub && <p className="text-xs text-gray-400">{sub}</p>}
        </div>
        <div className={`p-2 rounded-xl bg-gray-50 ${colorClass}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { from, to, label: todayLabel } = todayRange();
  const { from: mFrom, to: mTo, label: monthLabel } = monthRange();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [todayNota, setTodayNota] = useState<Sale[]>([]);
  const [monthNota, setMonthNota] = useState<Sale[]>([]);
  const [outlets, setOutlets] = useState<OutletData[]>([]);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        setLoading(true);
        const [todayRes, monthRes, outletsRes] = await Promise.all([
          apiBe.get("/api/web/sales", { params: { from, to, per_page: 1000 } }),
          apiBe.get("/api/web/sales", { params: { from: mFrom, to: mTo, per_page: 1000 } }),
          apiBe.get("/api/web/outlets")
        ]);
        const toList = (raw: any): Sale[] =>
          Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : [];
        setTodayNota(toList(todayRes.data));
        setMonthNota(toList(monthRes.data));
        
        // Outlets Data
        const outList = Array.isArray(outletsRes.data) ? outletsRes.data : outletsRes.data?.data ?? [];
        setOutlets(outList);
      } catch (err) {
        console.error("Gagal load dashboard:", err);
        setError("Gagal memuat data. Pastikan server laporan-be berjalan.");
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  const dropping = todayNota.filter((n) => n.status === "DROPPING").length;
  const invoiced = todayNota.filter((n) => n.status === "INVOICED").length;
  const totalDeposit = monthNota.reduce((sum, n) => sum + Number(n.deposit || 0), 0);
  const totalGrandTotal = monthNota.reduce((sum, n) => sum + Number(n.grand_total || 0), 0);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard Monitoring</h1>
          <p className="text-sm text-gray-500">Hari ini: {todayLabel}</p>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 text-red-800 border border-red-200 rounded-xl">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Summary Cards */}
      {loading ? (
        <CardsSkeleton count={4} />
      ) : (
        <div className="flex flex-wrap gap-4">
          <SummaryCard
            icon={<FileText className="w-8 h-8" />}
            label="Total Nota Hari Ini"
            value={todayNota.length}
            colorClass="text-blue-600"
          />
          <SummaryCard
            icon={<Truck className="w-8 h-8" />}
            label="DROPPING Aktif"
            value={dropping}
            colorClass="text-amber-500"
            sub="Menunggu invoice"
          />
          <SummaryCard
            icon={<CheckCircle className="w-8 h-8" />}
            label="INVOICED Hari Ini"
            value={invoiced}
            colorClass="text-emerald-600"
          />
          <SummaryCard
            icon={<Banknote className="w-8 h-8" />}
            label={`Total Deposit — ${monthLabel}`}
            value={`Rp ${formatRupiah(totalDeposit)}`}
            colorClass="text-indigo-600"
            sub={`dari Rp ${formatRupiah(totalGrandTotal)} total tagihan`}
          />
        </div>
      )}

      {/* Quick Actions Shortcuts */}
      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-3">Akses Cepat</h2>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => {
              const now = new Date();
              navigate(`/rekap-be/detail?year=${now.getFullYear()}&month=${now.getMonth() + 1}`);
            }}
            className="flex flex-1 min-w-[140px] items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-3 rounded-xl font-medium transition-colors shadow-sm"
          >
            <BarChart2 className="w-5 h-5" />
            Rekap Bulanan
          </button>
          <button
            onClick={() => navigate("/tagihan")}
            className="flex flex-1 min-w-[140px] items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-xl font-medium transition-colors shadow-sm"
          >
            <Wallet className="w-5 h-5" />
            Tagihan
          </button>
          <button
            onClick={() => navigate("/outlet")}
            className="flex flex-1 min-w-[140px] items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-3 rounded-xl font-medium transition-colors shadow-sm"
          >
            <Store className="w-5 h-5" />
            Data Outlet
          </button>
          <button
            onClick={() => navigate("/item")}
            className="flex flex-1 min-w-[140px] items-center justify-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-5 py-3 rounded-xl font-medium transition-colors shadow-sm"
          >
            <FileText className="w-5 h-5" />
            Data Barang
          </button>
          <button
            onClick={() => navigate("/users")}
            className="flex flex-1 min-w-[140px] items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-5 py-3 rounded-xl font-medium transition-colors shadow-sm"
          >
            <Store className="w-5 h-5" />
            Data User
          </button>
        </div>
      </div>

      {/* Maps */}
      <div className="pt-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">Peta Lokasi Outlet</h2>
          <span className="text-sm text-gray-500 font-medium bg-gray-100 px-3 py-1 rounded-full">
            {outlets.filter(o => o.coor_latitude && o.coor_longitude).length} titik tersedia
          </span>
        </div>
        {loading ? (
          <div className="w-full h-[500px] bg-gray-100 rounded-2xl flex items-center justify-center animate-pulse">
            <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
          </div>
        ) : (
          <OutletMap outlets={outlets} />
        )}
      </div>
    </div>
  );
}
