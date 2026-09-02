import { useState, useEffect } from "react";
import {
  BarChart2,
  ChevronRight,
  Receipt,
  CheckCircle,
  AlertTriangle,
  DollarSign,
  AlertCircle,
  Loader2
} from "lucide-react";
import { useNavigate } from "react-router";
import apiBe from "../../lib/axiosBe";
import { MONTHS, type Sale } from "../data/constant";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getLast12Months(): { year: number; month: number }[] {
  const result: { year: number; month: number }[] = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    result.push({ year: d.getFullYear(), month: d.getMonth() + 1 });
  }
  return result;
}

function pad2(n: number) { return String(n).padStart(2, "0"); }
function fmtRp(val: number) { return "Rp " + val.toLocaleString("id-ID"); }

// ─── Types ────────────────────────────────────────────────────────────────────

interface MonthSummary {
  year: number;
  month: number;
  total: number;
  dropping: number;
  invoiced: number;
  grandTotal: number;
  totalDeposit: number;
  hasData: boolean;
}

interface GroupedSummary {
  [year: number]: MonthSummary[];
}

// ─── Summary Card ─────────────────────────────────────────────────────────────

function SummaryCard({ icon, label, value, colorClass = "text-blue-600", bgClass = "bg-blue-50", sub }: {
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
      <div className={`text-2xl font-black ${colorClass} mb-1 leading-tight`}>{value}</div>
      {sub && <div className="text-xs text-gray-500 font-medium">{sub}</div>}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────

export default function RekapBe() {
  const navigate = useNavigate();
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [grouped, setGrouped] = useState<GroupedSummary>({});

  useEffect(() => {
    const fetchAllMonths = async () => {
      try {
        setLoading(true);
        const periods = getLast12Months();

        const allResults: { year: number; month: number; total: number; dropping: number; invoiced: number; grandTotal: number; totalDeposit: number; hasData: boolean }[] = [];
        const BATCH_SIZE = 3;

        for (let i = 0; i < periods.length; i += BATCH_SIZE) {
          const batch = periods.slice(i, i + BATCH_SIZE);
          const batchResults = await Promise.all(
            batch.map(async ({ year, month }) => {
              const lastDay = new Date(year, month, 0).getDate();
              const from = `${year}-${pad2(month)}-01`;
              const to = `${year}-${pad2(month)}-${pad2(lastDay)}`;
              try {
                const res = await apiBe.get("/api/web/sales", { params: { from, to, per_page: 500 } });
                const raw = res.data;
                const notas: Sale[] = Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : [];
                const dropping = notas.filter((n) => n.status === "DROPPING").length;
                const invoiced = notas.filter((n) => n.status === "INVOICED").length;
                const grandTotal = notas.reduce((s, n) => s + Number(n.grand_total || 0), 0);
                const totalDeposit = notas.reduce((s, n) => s + Number(n.deposit || 0), 0);
                return { year, month, total: notas.length, dropping, invoiced, grandTotal, totalDeposit, hasData: notas.length > 0 };
              } catch {
                return { year, month, total: 0, dropping: 0, invoiced: 0, grandTotal: 0, totalDeposit: 0, hasData: false };
              }
            })
          );
          allResults.push(...batchResults);
        }

        // Hanya tampilkan bulan yang ada datanya
        const withData = allResults.filter((r) => r.hasData);

        // Group per tahun
        const g: GroupedSummary = {};
        withData.forEach((r) => {
          if (!g[r.year]) g[r.year] = [];
          g[r.year].push(r);
        });
        setGrouped(g);
      } catch {
        setError("Gagal memuat data rekap. Pastikan server laporan-be berjalan.");
      } finally {
        setLoading(false);
      }
    };
    fetchAllMonths();
  }, []);

  const handleMonthClick = (year: number, month: number) => {
    navigate(`/rekap-be/detail?year=${year}&month=${month}`);
  };

  // ── Statistik bulan berjalan ──
  const currentMonthData = grouped[currentYear]?.find((m) => m.month === currentMonth);

  const years = Object.keys(grouped).map(Number).sort((a, b) => b - a);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* ── Page Header ── */}
      <div className="flex items-center gap-3">
        <div className="p-3 bg-blue-100 text-blue-600 rounded-2xl shadow-sm">
          <BarChart2 className="w-7 h-7" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-gray-900 leading-tight">Rekap Kanvas</h1>
          <p className="text-sm text-gray-500 font-medium">Ringkasan transaksi penjualan (Dropping & Invoice) dari aplikasi Android</p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-800 border border-red-200 rounded-xl flex items-center gap-3 shadow-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p className="font-medium">{error}</p>
        </div>
      )}

      {/* ── Loading Spinner ── */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-12 gap-3 text-gray-500">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          <p className="font-medium">Memuat data rekap...</p>
        </div>
      )}

      {/* ── Summary bulan berjalan ── */}
      {!loading && currentMonthData && (
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider">
            📅 Bulan Berjalan — {MONTHS[currentMonth - 1]} {currentYear}
          </h2>
          <div className="flex flex-wrap gap-4">
            <SummaryCard
              icon={<Receipt className="w-5 h-5" />}
              label="Total Nota"
              value={currentMonthData.total}
              colorClass="text-gray-700"
              bgClass="bg-gray-100"
            />
            <SummaryCard
              icon={<CheckCircle className="w-5 h-5" />}
              label="Invoiced"
              value={currentMonthData.invoiced}
              colorClass="text-emerald-700"
              bgClass="bg-emerald-100"
            />
            {currentMonthData.dropping > 0 && (
              <SummaryCard
                icon={<AlertTriangle className="w-5 h-5" />}
                label="Belum Invoice"
                value={currentMonthData.dropping}
                colorClass="text-amber-600"
                bgClass="bg-amber-100"
                sub="nota masih DROPPING"
              />
            )}
            <SummaryCard
              icon={<DollarSign className="w-5 h-5" />}
              label="Grand Total"
              value={fmtRp(currentMonthData.grandTotal)}
              colorClass="text-blue-600"
              bgClass="bg-blue-100"
            />
          </div>
          {currentMonthData.dropping > 0 && (
            <div className="p-3 bg-amber-50 text-amber-800 border border-amber-200 rounded-xl flex items-start gap-2 shadow-sm">
              <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <p className="text-sm">
                Ada <strong className="font-bold">{currentMonthData.dropping} nota</strong> yang belum di-invoice bulan ini. Segera selesaikan di aplikasi Android.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Tidak ada data ── */}
      {!loading && !error && years.length === 0 && (
        <div className="p-8 text-center bg-gray-50 border border-gray-200 rounded-2xl">
          <p className="text-gray-500 font-medium">Belum ada data transaksi dalam 12 bulan terakhir.</p>
        </div>
      )}

      {/* ── Tabel per tahun ── */}
      <div className="space-y-6">
        {!loading && years.map((year) => (
          <div key={year} className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
            {/* Header tahun */}
            <div className={`px-5 py-3 flex items-center gap-3 ${year === currentYear ? 'bg-blue-600 text-white' : 'bg-gray-800 text-white'}`}>
              <h3 className="font-bold text-lg">Tahun {year}</h3>
              <span className="px-2.5 py-0.5 bg-white/20 rounded-full text-xs font-semibold">
                {grouped[year].length} bulan
              </span>
              {year === currentYear && (
                <span className="px-2.5 py-0.5 bg-amber-500 text-white rounded-full text-xs font-bold shadow-sm">
                  Berjalan
                </span>
              )}
            </div>

            {/* Tabel bulan */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm whitespace-nowrap">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 border-b border-gray-200">
                    <th className="px-5 py-3 font-semibold w-1/4">Bulan</th>
                    <th className="px-5 py-3 font-semibold text-center w-32">Total Nota</th>
                    <th className="px-5 py-3 font-semibold text-center w-32">Invoiced</th>
                    <th className="px-5 py-3 font-semibold text-center w-32">Dropping</th>
                    <th className="px-5 py-3 font-semibold text-right">Grand Total</th>
                    <th className="px-5 py-3 font-semibold text-center w-16">Detail</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {grouped[year].map((m) => {
                    const isCurrent = m.year === currentYear && m.month === currentMonth;
                    return (
                      <tr
                        key={m.month}
                        onClick={() => handleMonthClick(m.year, m.month)}
                        className={`cursor-pointer transition-colors ${
                          isCurrent ? "bg-blue-50/50 hover:bg-blue-100/50" : "hover:bg-gray-50"
                        }`}
                      >
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <span className={`font-medium ${isCurrent ? 'text-blue-900 font-bold' : 'text-gray-900'}`}>
                              {MONTHS[m.month - 1]}
                            </span>
                            {isCurrent && (
                              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-[10px] font-bold uppercase tracking-wider">
                                Ini
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="px-5 py-4 text-center">
                          <span className="px-2.5 py-1 border border-gray-200 text-gray-700 rounded-lg text-xs font-bold bg-white shadow-sm">
                            {m.total}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-center">
                          {m.invoiced > 0 ? (
                            <span className="px-2.5 py-1 border border-emerald-200 text-emerald-700 bg-emerald-50 rounded-lg text-xs font-bold shadow-sm">
                              {m.invoiced}
                            </span>
                          ) : <span className="text-gray-300">—</span>}
                        </td>

                        <td className="px-5 py-4 text-center">
                          {m.dropping > 0 ? (
                            <span className="px-2.5 py-1 border border-amber-200 text-amber-700 bg-amber-50 rounded-lg text-xs font-bold shadow-sm">
                              {m.dropping}
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 border border-emerald-200 text-emerald-600 bg-emerald-50 rounded-lg text-xs font-bold shadow-sm">
                              ✓
                            </span>
                          )}
                        </td>

                        <td className="px-5 py-4 text-right">
                          <span className={`font-bold ${m.grandTotal > 0 ? 'text-gray-900' : 'text-gray-400'}`}>
                            {m.grandTotal > 0 ? fmtRp(m.grandTotal) : "—"}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-center">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-blue-600 hover:bg-blue-100 transition-colors mx-auto" title={`Lihat detail ${MONTHS[m.month - 1]} ${m.year}`}>
                            <ChevronRight className="w-5 h-5" />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
