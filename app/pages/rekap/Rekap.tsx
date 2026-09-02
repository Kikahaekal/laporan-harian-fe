import { useState, useEffect } from "react";
import { useNavigate } from "react-router"; 
import { 
  FolderOpen, 
  Calendar, 
  ChevronDown, 
  ChevronRight, 
  Edit2, 
  AlertCircle,
  Loader2,
  Clock,
  CheckCircle,
  XCircle
} from "lucide-react";
import apiBe from "../../lib/axiosBe";
import { MONTHS } from "../data/constant"; 

interface PeriodData {
  year: number;
  month: number;
}

interface GroupedPeriods {
  [year: number]: number[];
}

interface StatusCount {
  pending: number;
  approved: number;
  rejected: number;
}

export default function Rekap() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [groupedData, setGroupedData] = useState<GroupedPeriods>({});
  const [statusByPeriod, setStatusByPeriod] = useState<Record<string, StatusCount>>({});
  const [error, setError] = useState<string | null>(null);
  
  // State for expanded accordions
  const [expandedYears, setExpandedYears] = useState<Record<number, boolean>>({});

  useEffect(() => {
    const fetchPeriods = async () => {
      try {
        setLoading(true);
        const response = await apiBe.get("/api/web/sales-reports/periods");
        const rawData: PeriodData[] = response.data;

        const grouped = rawData.reduce((acc, curr) => {
          const { year, month } = curr;
          if (!acc[year]) {
            acc[year] = [];
          }
          acc[year].push(month);
          return acc;
        }, {} as GroupedPeriods);

        setGroupedData(grouped);
        
        // Auto-expand current year
        const currentYear = new Date().getFullYear();
        if (grouped[currentYear]) {
          setExpandedYears({ [currentYear]: true });
        } else if (Object.keys(grouped).length > 0) {
          // Or expand the most recent year
          const latestYear = Math.max(...Object.keys(grouped).map(Number));
          setExpandedYears({ [latestYear]: true });
        }
      } catch (err) {
        console.error("Gagal ambil periode:", err);
        setError("Gagal memuat data rekap.");
      } finally {
        setLoading(false);
      }
    };

    fetchPeriods();
  }, []);

  // Fetch status ringkasan per periode
  useEffect(() => {
    if (Object.keys(groupedData).length === 0) return;

    const periods: { year: number; month: number }[] = [];
    Object.keys(groupedData)
      .map(Number)
      .forEach((year) => {
        groupedData[year].forEach((month) => {
          periods.push({ year, month });
        });
      });

    const fetchStatusForPeriods = async () => {
      try {
        const next: Record<string, StatusCount> = {};
        const BATCH_SIZE = 3;

        for (let i = 0; i < periods.length; i += BATCH_SIZE) {
          const batch = periods.slice(i, i + BATCH_SIZE);
          const results = await Promise.all(
            batch.map(({ year, month }) =>
              apiBe.get("/api/web/sales-reports", { params: { year, month } }).then((res) => ({
                year,
                month,
                rows: res.data as { status?: string }[],
              }))
            )
          );
          results.forEach(({ year, month, rows }) => {
            const key = `${year}-${month}`;
            next[key] = { pending: 0, approved: 0, rejected: 0 };
            rows.forEach((row) => {
              const s = row.status ?? "pending";
              if (s === "pending") next[key].pending += 1;
              else if (s === "approved") next[key].approved += 1;
              else next[key].rejected += 1;
            });
          });
        }

        setStatusByPeriod(next);
      } catch (err) {
        console.error("Gagal ambil ringkasan status:", err);
      }
    };

    fetchStatusForPeriods();
  }, [groupedData]);

  const toggleYear = (year: number) => {
    setExpandedYears(prev => ({
      ...prev,
      [year]: !prev[year]
    }));
  };

  const handleMonthClick = (year: number, month: number) => {
    navigate(`/edit?year=${year}&month=${month}`);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-3 bg-blue-100 text-blue-600 rounded-2xl shadow-sm">
          <FolderOpen className="w-7 h-7" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-gray-900 leading-tight">Rekap Laporan</h1>
          <p className="text-sm text-gray-500 font-medium">Lihat dan edit laporan penjualan per periode</p>
        </div>
      </div>

      {loading && (
        <div className="flex flex-col items-center justify-center py-12 gap-3 text-gray-500">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          <p className="font-medium">Memuat data rekap...</p>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 text-red-800 border border-red-200 rounded-xl flex items-center gap-3 shadow-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p className="font-medium">{error}</p>
        </div>
      )}

      {!loading && !error && Object.keys(groupedData).length === 0 && (
        <div className="p-8 text-center bg-gray-50 border border-gray-200 rounded-2xl">
          <FolderOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-gray-900 mb-1">Belum ada data</h3>
          <p className="text-gray-500">Belum ada data laporan yang tersimpan dalam sistem.</p>
        </div>
      )}

      {/* RENDER ACCORDION PER TAHUN */}
      <div className="space-y-4">
        {!loading && Object.keys(groupedData)
          .map(Number)
          .sort((a, b) => b - a)
          .map((year) => {
            const isExpanded = !!expandedYears[year];
            
            return (
              <div key={year} className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                <button 
                  onClick={() => toggleYear(year)}
                  className="w-full flex items-center justify-between p-4 sm:p-5 bg-gray-50/50 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {isExpanded ? 
                      <ChevronDown className="w-5 h-5 text-gray-400" /> : 
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    }
                    <h2 className="text-lg font-bold text-gray-900">Tahun {year}</h2>
                  </div>
                  <span className="px-3 py-1 bg-white border border-gray-200 text-gray-600 rounded-full text-xs font-bold shadow-sm">
                    {groupedData[year].length} Bulan
                  </span>
                </button>
                
                {isExpanded && (
                  <div className="border-t border-gray-100">
                    <ul className="divide-y divide-gray-100">
                      {groupedData[year].sort((a, b) => b - a).map((monthIndex) => {
                        const status = statusByPeriod[`${year}-${monthIndex}`];
                        
                        return (
                          <li key={monthIndex}>
                            <button 
                              onClick={() => handleMonthClick(year, monthIndex)}
                              className="w-full flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-5 hover:bg-blue-50/50 transition-colors group text-left gap-4"
                            >
                              <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-gray-100 text-gray-500 rounded-xl group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
                                  <Calendar className="w-5 h-5" />
                                </div>
                                <div>
                                  <h3 className="font-bold text-gray-900 text-base">{MONTHS[monthIndex - 1]}</h3>
                                  <p className="text-xs text-gray-500 font-medium">Laporan Penjualan</p>
                                </div>
                              </div>

                              <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
                                {status && (
                                  <>
                                    {status.pending > 0 && (
                                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                        <Clock className="w-3.5 h-3.5" /> {status.pending} Pending
                                      </span>
                                    )}
                                    {status.approved > 0 && (
                                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                        <CheckCircle className="w-3.5 h-3.5" /> {status.approved} Approved
                                      </span>
                                    )}
                                    {status.rejected > 0 && (
                                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-200">
                                        <XCircle className="w-3.5 h-3.5" /> {status.rejected} Rejected
                                      </span>
                                    )}
                                  </>
                                )}
                                
                                <div className="flex items-center gap-1 ml-2 text-blue-600 font-semibold text-sm px-3 py-1.5 rounded-lg group-hover:bg-blue-100 transition-colors">
                                  <span>Edit</span>
                                  <Edit2 className="w-4 h-4" />
                                </div>
                              </div>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </div>
            );
          })}
      </div>
    </div>
  );
}
