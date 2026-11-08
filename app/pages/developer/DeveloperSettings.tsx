import { useEffect, useState } from "react";
import { Navigate } from "react-router";
import {
  Terminal,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Loader2,
  AlertCircle,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Database,
} from "lucide-react";
import apiBe from "../../lib/axiosBe";
import { useAuth } from "../../context/AuthContext";

interface ArtisanCommandItem {
  key: string;
  title: string;
  description: string;
  buttonLabel: string;
}

interface MigrationItem {
  name: string;
  status: "RAN" | "PENDING";
  batch: number | null;
}

interface MigrationStatusResponse {
  environment: string;
  laravel_version: string;
  php_version: string;
  total_count: number;
  ran_count: number;
  pending_count: number;
  migrations: MigrationItem[];
}

const ARTISAN_COMMANDS: ArtisanCommandItem[] = [
  {
    key: "migrate",
    title: "php artisan migrate",
    description:
      "Menjalankan migration database yang belum dieksekusi (tanpa menghapus data yang sudah ada).",
    buttonLabel: "Jalankan php artisan migrate",
  },
  {
    key: "optimize:clear",
    title: "php artisan optimize:clear",
    description:
      "Membersihkan cache config, route, view, dan cache aplikasi.",
    buttonLabel: "Jalankan php artisan optimize:clear",
  },
  {
    key: "view:cache",
    title: "php artisan view:cache",
    description:
      "Membangun ulang cache Blade view agar render lebih cepat.",
    buttonLabel: "Jalankan php artisan view:cache",
  },
  {
    key: "route:cache",
    title: "php artisan route:cache",
    description:
      "Membuat cache route untuk meningkatkan performa routing.",
    buttonLabel: "Jalankan php artisan route:cache",
  },
  {
    key: "config:cache",
    title: "php artisan config:cache",
    description:
      "Menggabungkan config ke file cache untuk performa lebih baik.",
    buttonLabel: "Jalankan php artisan config:cache",
  },
  {
    key: "storage:link",
    title: "php artisan storage:link",
    description:
      "Membuat symbolic link public/storage ke storage/app/public untuk akses file/foto.",
    buttonLabel: "Jalankan php artisan storage:link",
  },
];

export default function DeveloperSettings() {
  const { isAdmin } = useAuth();

  const [expandedKeys, setExpandedKeys] = useState<Record<string, boolean>>({
    migrate: true,
  });
  const [runningKey, setRunningKey] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<{
    command: string;
    message: string;
    output: string;
    isError: boolean;
    timestamp: string;
  } | null>(null);

  const [statusData, setStatusData] = useState<MigrationStatusResponse | null>(
    null
  );
  const [loadingStatus, setLoadingStatus] = useState<boolean>(true);
  const [showMigrationList, setShowMigrationList] = useState<boolean>(false);

  const fetchStatus = async () => {
    try {
      setLoadingStatus(true);
      const res = await apiBe.get<MigrationStatusResponse>(
        "/api/web/developer/status"
      );
      setStatusData(res.data);
    } catch (err) {
      console.error("Gagal memuat status migration:", err);
    } finally {
      setLoadingStatus(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchStatus();
    }
  }, [isAdmin]);

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  const toggleExpand = (key: string) => {
    setExpandedKeys((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleRunCommand = async (item: ArtisanCommandItem) => {
    if (runningKey) return;

    setRunningKey(item.key);
    try {
      const res = await apiBe.post("/api/web/developer/run", {
        command: item.key,
      });

      const now = new Date().toLocaleTimeString("id-ID");
      setLastResult({
        command: res.data?.command || item.title,
        message: res.data?.message || `Berhasil menjalankan ${item.title}`,
        output: res.data?.output || "",
        isError: false,
        timestamp: now,
      });

      if (res.data?.migrations) {
        setStatusData(res.data.migrations);
      } else if (item.key === "migrate") {
        await fetchStatus();
      }
    } catch (err: any) {
      const now = new Date().toLocaleTimeString("id-ID");
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        `Gagal menjalankan ${item.title}`;
      const out = err?.response?.data?.output || msg;
      setLastResult({
        command: item.title,
        message: msg,
        output: out,
        isError: true,
        timestamp: now,
      });
    } finally {
      setRunningKey(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2.5">
            <Terminal className="w-6 h-6 text-emerald-600" />
            Pengaturan Developer & Artisan
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Jalankan migrasi database baru dan kelola cache server secara aman.
          </p>
        </div>

        <button
          onClick={fetchStatus}
          disabled={loadingStatus}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors self-start sm:self-auto"
        >
          <RefreshCw
            className={`w-4 h-4 ${loadingStatus ? "animate-spin" : ""}`}
          />
          Refresh Status
        </button>
      </div>

      {/* Info Proteksi Data */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-emerald-900 space-y-1">
          <p className="font-semibold">
            Data Database Dijamin Aman (Non-Destructive Migration)
          </p>
          <p className="text-emerald-800 leading-relaxed">
            Perintah <code className="font-mono font-semibold bg-emerald-100 px-1.5 py-0.5 rounded">php artisan migrate</code> hanya mengeksekusi file migration baru yang belum pernah dijalankan (status <em>Pending</em>) tanpa menghapus tabel atau data yang sudah ada. Perintah perusak data seperti <code className="font-mono bg-emerald-100 px-1 py-0.5 rounded">migrate:fresh</code>, <code className="font-mono bg-emerald-100 px-1 py-0.5 rounded">migrate:refresh</code>, dan <code className="font-mono bg-emerald-100 px-1 py-0.5 rounded">db:wipe</code> dikunci permanen di server.
          </p>
        </div>
      </div>

      {/* Ringkasan Status Migration */}
      {statusData && (
        <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gray-100 text-gray-700">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-gray-900">
                  Status Tabel Migration Database
                </h2>
                <p className="text-xs text-gray-500">
                  Env: <span className="font-medium">{statusData.environment}</span> • Laravel {statusData.laravel_version} • PHP {statusData.php_version}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {statusData.ran_count} Sudah Dijalankan
              </span>
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                  statusData.pending_count > 0
                    ? "bg-amber-100 text-amber-800"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                {statusData.pending_count} Belum Dieksekusi
              </span>
              <button
                onClick={() => setShowMigrationList(!showMigrationList)}
                className="text-xs font-medium text-emerald-700 hover:text-emerald-800 underline ml-1"
              >
                {showMigrationList ? "Sembunyikan Detail" : "Lihat Daftar File"}
              </button>
            </div>
          </div>

          {showMigrationList && (
            <div className="border-t border-gray-100 pt-3 max-h-64 overflow-y-auto space-y-1.5">
              {statusData.migrations.map((m) => (
                <div
                  key={m.name}
                  className="flex items-center justify-between text-xs px-3 py-2 rounded-lg bg-gray-50 font-mono"
                >
                  <span className="text-gray-800 truncate pr-3">{m.name}</span>
                  {m.status === "RAN" ? (
                    <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 font-sans font-medium flex-shrink-0">
                      Selesai (Batch #{m.batch})
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-sans font-semibold flex-shrink-0">
                      Pending (Belum Dieksekusi)
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Daftar Command Artisan (Sesuai Tema Light/Emerald Admin) */}
      <div className="space-y-3">
        {ARTISAN_COMMANDS.map((item) => {
          const isExpanded = !!expandedKeys[item.key];
          const isRunning = runningKey === item.key;

          return (
            <div
              key={item.key}
              className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden transition-all hover:border-gray-300"
            >
              {/* Header Kartu */}
              <button
                type="button"
                onClick={() => toggleExpand(item.key)}
                className="w-full text-left px-5 py-4 flex items-center justify-between gap-4 hover:bg-gray-50/80 transition-colors"
              >
                <div>
                  <div className="flex items-center gap-2.5">
                    <h3 className="text-base font-bold text-gray-900 font-mono">
                      {item.title}
                    </h3>
                    {item.key === "migrate" &&
                      statusData &&
                      statusData.pending_count > 0 && (
                        <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                          {statusData.pending_count} migration baru
                        </span>
                      )}
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {item.description}
                  </p>
                </div>
                <div className="text-gray-400 flex-shrink-0">
                  {isExpanded ? (
                    <ChevronUp className="w-5 h-5" />
                  ) : (
                    <ChevronDown className="w-5 h-5" />
                  )}
                </div>
              </button>

              {/* Body Aksi Tombol */}
              {isExpanded && (
                <div className="px-5 py-3.5 border-t border-gray-100 bg-gray-50/70">
                  <button
                    type="button"
                    onClick={() => handleRunCommand(item)}
                    disabled={runningKey !== null}
                    className="inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-medium text-sm px-4 py-2.5 rounded-xl shadow-sm transition-colors"
                  >
                    {isRunning && (
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                    )}
                    <span>
                      {isRunning ? `Menjalankan ${item.title}...` : item.buttonLabel}
                    </span>
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Output Log Eksekusi */}
      {lastResult && (
        <div
          className={`rounded-2xl border p-4 space-y-2.5 shadow-sm ${
            lastResult.isError
              ? "bg-red-50 border-red-200 text-red-900"
              : "bg-white border-gray-200 text-gray-900"
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {lastResult.isError ? (
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
              ) : (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              )}
              <span className="text-sm font-semibold">{lastResult.message}</span>
            </div>
            <span className="text-xs text-gray-500 font-mono">
              {lastResult.timestamp}
            </span>
          </div>

          <pre className="text-xs font-mono bg-gray-900 rounded-xl p-3.5 overflow-x-auto whitespace-pre-wrap text-gray-100 border border-gray-800">
            <code>{`$ ${lastResult.command}\n${lastResult.output}`}</code>
          </pre>
        </div>
      )}
    </div>
  );
}

