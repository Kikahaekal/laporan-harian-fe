import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router";
import { ArrowLeft, Store, Receipt, CalendarDays, User, AlertCircle, Image as ImageIcon, X } from "lucide-react";
import apiBe from "../../lib/axiosBe";
import { type Sale } from "../data/constant";
import { Pagination } from "../../components/Pagination";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatRupiah(val: string | number) {
  return Number(val || 0).toLocaleString("id-ID");
}

function formatDate(dateStr: string) {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}
function weekOfMonth(dateStr: string) {
  if (!dateStr) return 0;
  return Math.ceil(new Date(dateStr).getDate() / 7);
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline gap-2">
      <span className="min-w-[90px] text-xs font-bold text-gray-500 uppercase tracking-wider">
        {label}
      </span>
      <div>{children}</div>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

interface ClosedPhoto {
  id: number;
  outlet_id: number;
  closed_date: string;
  note?: string | null;
  photo_url?: string | null;
  user?: { id: number; name: string };
}

export default function MonitoringDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nota, setNota] = useState<Sale | null>(null);
  const [closedPhoto, setClosedPhoto] = useState<ClosedPhoto | null>(null);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [photoOpen, setPhotoOpen] = useState(false);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    if (!id) return;
    const controller = new AbortController();
    const fetch = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await apiBe.get(`/api/web/sales/${id}`, { signal: controller.signal });
        setNota(res.data as Sale);
      } catch (err: any) {
        if (err.name !== "CanceledError") {
          setError("Gagal memuat detail nota. Pastikan ID valid dan server berjalan.");
        }
      } finally {
        setLoading(false);
      }
    };
    fetch();
    return () => controller.abort();
  }, [id]);

  useEffect(() => {
    if (!nota?.outlet_id) return;
    let active = true;
    const load = async () => {
      setPhotoLoading(true);
      try {
        // Fetch dari history dan ambil photo terbaru hari itu
        const res = await apiBe.get(`/api/web/outlets/${nota.outlet_id}/closed-photos`);
        if (!active) return;
        
        const list: ClosedPhoto[] = res.data?.data ?? [];
        const expectedDate = (nota.transaction_date ?? "").slice(0, 10);
        const match = list.find(p => (p.closed_date ?? "").slice(0, 10) === expectedDate) ?? null;
        
        setClosedPhoto(match);
      } catch (err: any) {
        if (!active) return;
        if (err?.response?.status === 404) {
          setClosedPhoto(null);
        } else {
          console.error("Gagal load foto tutup outlet", err);
        }
      } finally {
        if (active) setPhotoLoading(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [nota?.outlet_id]);

  const saleItems = nota?.sale_items ?? [];
  const totalPages = Math.ceil(saleItems.length / itemsPerPage);
  const paginatedSaleItems = saleItems.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const totals = useMemo(
    () =>
      saleItems.reduce(
        (acc, item) => ({
          qty_order: acc.qty_order + (item.qty_order || 0),
          qty_sold: acc.qty_sold + (item.qty_sold || 0),
          qty_returned: acc.qty_returned + (item.qty_returned || 0),
          qty_sisa: acc.qty_sisa + ((item.qty_order || 0) - (item.qty_sold || 0) - (item.qty_returned || 0)),
          subtotal: acc.subtotal + Number(item.subtotal || 0),
        }),
        { qty_order: 0, qty_sold: 0, qty_returned: 0, qty_sisa: 0, subtotal: 0 }
      ),
    [saleItems]
  );

  const sisa = nota ? Number(nota.grand_total || 0) - Number(nota.deposit || 0) : 0;

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <button disabled className="flex items-center gap-2 text-sm font-semibold text-gray-400 cursor-not-allowed">
          <ArrowLeft className="w-4 h-4" /> Kembali ke Rekap
        </button>
        <div className="flex flex-wrap gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex-1 min-w-[180px] bg-white border border-gray-200 rounded-2xl p-4 shadow-sm animate-pulse">
              <div className="flex gap-3">
                <div className="w-8 h-8 bg-gray-200 rounded-lg"></div>
                <div className="flex-1 space-y-2 py-1">
                  <div className="h-3 bg-gray-200 rounded w-16"></div>
                  <div className="h-4 bg-gray-200 rounded w-24"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-40 mb-6"></div>
          {[1, 2, 3, 4].map(i => <div key={i} className="h-12 bg-gray-100 rounded-lg"></div>)}
        </div>
      </div>
    );
  }

  if (error || !nota) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <button onClick={() => navigate("/laporan")} className="flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-gray-800 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Kembali
        </button>
        <div className="p-4 bg-red-50 text-red-800 border border-red-200 rounded-xl flex items-center gap-3 shadow-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p className="font-medium">{error ?? "Nota tidak ditemukan."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20">
      {/* Back button */}
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-gray-800 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Kembali
      </button>

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-100 text-blue-600 rounded-xl shadow-sm">
            <Receipt className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-black text-gray-900 font-mono tracking-tight">
            {nota.nota_number}
          </h1>
        </div>
        <span className={`px-4 py-1.5 rounded-full text-sm font-bold uppercase tracking-wider shadow-sm ${
          nota.status === "INVOICED"
            ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
            : "bg-amber-100 text-amber-800 border border-amber-200"
        }`}>
          {nota.status}
        </span>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Outlet */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-start gap-4">
            <div className="p-2.5 bg-gray-100 text-gray-600 rounded-xl">
              <Store className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Outlet</h3>
              {nota.outlet ? (
                <>
                  <p className="font-bold text-gray-900 leading-tight">{nota.outlet.name}</p>
                  <p className="text-sm font-medium text-gray-500">{nota.outlet.code}</p>
                </>
              ) : (
                <p className="font-bold text-gray-900">ID #{nota.outlet_id}</p>
              )}
              <div className="mt-3">
                <button
                  onClick={() => setPhotoOpen(true)}
                  disabled={!closedPhoto || photoLoading}
                  className={`text-xs font-bold px-3 py-1.5 rounded-lg border flex items-center gap-1.5 transition-colors ${
                    !closedPhoto || photoLoading
                      ? "border-gray-200 text-gray-400 bg-gray-50 cursor-not-allowed"
                      : "border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100 shadow-sm"
                  }`}
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                  {photoLoading ? "Memuat..." : "Preview Foto Tutup"}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Tanggal */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-start gap-4">
            <div className="p-2.5 bg-gray-100 text-gray-600 rounded-xl">
              <CalendarDays className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Tanggal Transaksi</h3>
              <p className="font-bold text-gray-900 leading-tight">{formatDate(nota.transaction_date)}</p>
              <p className="text-sm font-medium text-gray-500">Minggu ke-{weekOfMonth(nota.transaction_date)}</p>
            </div>
          </div>
        </div>

        {/* User */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-start gap-4">
            <div className="p-2.5 bg-gray-100 text-gray-600 rounded-xl">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">User / Sales</h3>
              <p className="font-bold text-gray-900 leading-tight">{nota.user?.name ?? "-"}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Keuangan */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 sm:p-6 shadow-sm">
        <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">Ringkasan Pembayaran</h2>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
            <span className="text-xs font-bold text-blue-600/80 uppercase tracking-wider block mb-1">Grand Total</span>
            <span className="text-2xl font-black text-blue-700">Rp {formatRupiah(nota.grand_total)}</span>
          </div>
          
          <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
            <span className="text-xs font-bold text-emerald-600/80 uppercase tracking-wider block mb-1">Deposit Diterima</span>
            <span className="text-2xl font-black text-emerald-700">Rp {formatRupiah(nota.deposit)}</span>
          </div>
          
          <div className={`p-4 rounded-xl border ${sisa > 0 ? 'bg-red-50 border-red-100' : 'bg-gray-50 border-gray-200'}`}>
            <span className={`text-xs font-bold uppercase tracking-wider block mb-1 ${sisa > 0 ? 'text-red-600/80' : 'text-gray-500'}`}>
              Sisa
            </span>
            <span className={`text-2xl font-black ${sisa > 0 ? 'text-red-600' : 'text-gray-400'}`}>
              {sisa > 0 ? `Rp ${formatRupiah(sisa)}` : "Lunas"}
            </span>
          </div>
        </div>

        {nota.note && (
          <>
            <hr className="my-5 border-gray-200" />
            <InfoRow label="Catatan">
              <p className="text-gray-700 font-medium">{nota.note}</p>
            </InfoRow>
          </>
        )}
      </div>

      {/* Tabel Sale Items */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200 bg-gray-50/50 flex items-center gap-3">
          <h2 className="font-bold text-gray-900">Detail Barang</h2>
          <span className="px-2.5 py-1 bg-white border border-gray-200 text-gray-700 rounded-lg text-xs font-bold shadow-sm">
            {saleItems.length} item
          </span>
        </div>

        {saleItems.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-gray-500 font-medium">Tidak ada data item pada nota ini.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-gray-800 text-white">
                <tr>
                  <th className="px-5 py-3 font-semibold">Item</th>
                  <th className="px-5 py-3 font-semibold text-center">Qty Order</th>
                  <th className="px-5 py-3 font-semibold text-center">Qty Sold</th>
                  <th className="px-5 py-3 font-semibold text-center">Qty Retur</th>
                  <th className="px-5 py-3 font-semibold text-center">Sisa</th>
                  <th className="px-5 py-3 font-semibold text-right">Harga</th>
                  <th className="px-5 py-3 font-semibold text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {paginatedSaleItems.map((item, idx) => (
                  <tr key={item.id} className={`hover:bg-gray-50 transition-colors ${idx % 2 !== 0 ? 'bg-gray-50/50' : ''}`}>
                    <td className="px-5 py-4">
                      {item.item ? (
                        <div className="flex flex-col">
                          <span className="font-bold text-gray-900">{item.item.code}</span>
                          <span className="text-xs text-gray-500 font-medium">{item.item.name}</span>
                        </div>
                      ) : (
                        <span className="font-medium text-gray-900">ID #{item.item_id}</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-center font-medium">{item.qty_order}</td>
                    <td className="px-5 py-4 text-center font-bold text-emerald-600">{item.qty_sold}</td>
                    <td className="px-5 py-4 text-center">
                      {item.qty_returned > 0 ? (
                        <span className="font-bold text-amber-600">{item.qty_returned}</span>
                      ) : (
                        <span className="text-gray-300 font-medium">0</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-center">
                      {(() => {
                        const sisa = item.qty_order - item.qty_sold - item.qty_returned;
                        return sisa > 0 ? (
                          <span className="font-bold text-red-600">{sisa}</span>
                        ) : (
                          <span className="text-gray-300 font-medium">0</span>
                        );
                      })()}
                    </td>
                    <td className="px-5 py-4 text-right font-medium">Rp {formatRupiah(item.price_at_moment)}</td>
                    <td className="px-5 py-4 text-right font-bold text-gray-900">Rp {formatRupiah(item.subtotal)}</td>
                  </tr>
                ))}

                {/* Total Row */}
                <tr className="bg-gray-50/80 border-t-2 border-gray-200">
                  <td className="px-5 py-4 font-black text-gray-900 tracking-wider">TOTAL</td>
                  <td className="px-5 py-4 text-center font-black text-gray-900">{totals.qty_order}</td>
                  <td className="px-5 py-4 text-center font-black text-emerald-600">{totals.qty_sold}</td>
                  <td className={`px-5 py-4 text-center font-black ${totals.qty_returned > 0 ? 'text-amber-600' : 'text-gray-400'}`}>
                    {totals.qty_returned}
                  </td>
                  <td className={`px-5 py-4 text-center font-black ${totals.qty_sisa > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                    {totals.qty_sisa}
                  </td>
                  <td className="px-5 py-4"></td>
                  <td className="px-5 py-4 text-right font-black text-blue-700">
                    Rp {formatRupiah(totals.subtotal)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
        {saleItems.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            totalItems={saleItems.length}
            itemsPerPage={itemsPerPage}
          />
        )}
      </div>

      {/* Photo Modal */}
      {photoOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-gray-500" /> Foto Toko Tutup
              </h3>
              <button 
                onClick={() => setPhotoOpen(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 overflow-y-auto">
              {closedPhoto?.photo_url ? (
                <div className="rounded-xl overflow-hidden border border-gray-200 bg-gray-50 shadow-inner">
                  <img
                    src={closedPhoto.photo_url}
                    alt={`Foto tutup ${nota.outlet?.name ?? nota.outlet_id}`}
                    className="w-full h-auto object-contain max-h-[60vh]"
                  />
                </div>
              ) : (
                <div className="p-8 text-center bg-gray-50 rounded-xl border border-gray-200 border-dashed">
                  <AlertCircle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500 font-medium">Belum ada foto tutup untuk outlet ini hari ini.</p>
                </div>
              )}
              
              {closedPhoto?.note && (
                <div className="mt-4 p-3 bg-amber-50 text-amber-800 border border-amber-200 rounded-xl text-sm font-medium">
                  <strong>Catatan:</strong> {closedPhoto.note}
                </div>
              )}
            </div>
            
            <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end">
              <button 
                onClick={() => setPhotoOpen(false)}
                className="px-5 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold rounded-xl transition-colors shadow-sm"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
