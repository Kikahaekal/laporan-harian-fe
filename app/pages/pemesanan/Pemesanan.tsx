import { useState, useEffect, useMemo } from "react";
import {
  ClipboardList,
  Search,
  Printer,
  MapPin,
  Store,
  User,
  CalendarDays,
  CheckCircle,
  Clock,
  XCircle,
  Trash2,
  X,
  AlertCircle,
  Loader2,
  Truck,
  Eye
} from "lucide-react";
import apiBe from "../../lib/axiosBe";
import { Pagination } from "../../components/Pagination";
import { TableRowsSkeleton } from "../../components/TableSkeleton";

interface OrderItemData {
  id: number;
  order_id: number;
  item_id: number;
  qty_order: number;
  price_at_moment: string | number;
  subtotal: string | number;
  item?: {
    id: number;
    code: string;
    name: string;
    variant?: string | null;
    image_url?: string | null;
  };
}

interface OrderData {
  id: number;
  order_number: string;
  outlet_id: number;
  user_id: number;
  area_category: "dalam_kota" | "luar_kota";
  order_date: string;
  delivery_date: string;
  status: "PENDING" | "DELIVERED" | "CANCELLED";
  sale_id?: number | null;
  grand_total: string | number;
  note?: string | null;
  outlet?: {
    id: number;
    code: string;
    name: string;
    address?: string;
    visit_day?: string;
  };
  user?: {
    id: number;
    name: string;
    email?: string;
    area_category?: string;
  };
  sale?: {
    id: number;
    nota_number: string;
    status: string;
    transaction_date: string;
  } | null;
  order_items?: OrderItemData[];
}

function fmtRp(val: string | number | null | undefined) {
  return "Rp " + Number(val || 0).toLocaleString("id-ID");
}

function fmtDate(s?: string) {
  if (!s) return "-";
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

export default function Pemesanan() {
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [areaFilter, setAreaFilter] = useState<"all" | "dalam_kota" | "luar_kota">("all");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "PENDING" | "DELIVERED" | "CANCELLED">("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [selectedOrder, setSelectedOrder] = useState<OrderData | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<OrderData | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [snack, setSnack] = useState<{ open: boolean; msg: string; type: "success" | "error" }>({
    open: false,
    msg: "",
    type: "success",
  });

  const showSnack = (msg: string, type: "success" | "error" = "success") =>
    setSnack({ open: true, msg, type });

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await apiBe.get("/api/web/orders", { params: { per_page: 300 } });
      const raw = res.data;
      const list = Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : [];
      setOrders(list);
    } catch {
      showSnack("Gagal memuat data pemesanan.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const matchArea = areaFilter === "all" || o.area_category === areaFilter;
      const matchStatus = statusFilter === "ALL" || o.status === statusFilter;
      const q = search.trim().toLowerCase();
      const matchSearch =
        !q ||
        o.order_number.toLowerCase().includes(q) ||
        (o.outlet?.name ?? "").toLowerCase().includes(q) ||
        (o.outlet?.code ?? "").toLowerCase().includes(q) ||
        (o.user?.name ?? "").toLowerCase().includes(q);
      return matchArea && matchStatus && matchSearch;
    });
  }, [orders, areaFilter, statusFilter, search]);

  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
  const paginatedOrders = filteredOrders.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [areaFilter, statusFilter, search]);

  const pendingDalamKota = orders.filter(
    (o) => o.status === "PENDING" && o.area_category === "dalam_kota"
  ).length;
  const pendingLuarKota = orders.filter(
    (o) => o.status === "PENDING" && o.area_category === "luar_kota"
  ).length;
  const deliveredCount = orders.filter((o) => o.status === "DELIVERED").length;

  const handleDeleteOrder = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiBe.delete(`/api/web/orders/${deleteTarget.id}`);
      await fetchOrders();
      setDeleteTarget(null);
      showSnack("Pemesanan berhasil dihapus.");
    } catch (err: any) {
      showSnack(err.response?.data?.message || "Gagal menghapus pemesanan.", "error");
    } finally {
      setDeleting(false);
    }
  };

  const handlePrintReceipt = (order: OrderData) => {
    const items = order.order_items ?? [];
    const totalQty = items.reduce((s, i) => s + (i.qty_order || 0), 0);
    const areaLabel = order.area_category === "luar_kota" ? "Luar Kota" : "Dalam Kota";

    const rowsHtml = items
      .map((oi) => {
        const name = oi.item?.name ?? `Item #${oi.item_id}`;
        const variant = oi.item?.variant ? ` (${oi.item.variant})` : "";
        return `
          <tr>
            <td style="padding:4px 0; border-bottom:1px dashed #ddd;">
              <div style="font-weight:bold;">${name}${variant}</div>
              <div style="font-size:11px; color:#555;">${oi.qty_order} pcs x ${fmtRp(oi.price_at_moment)}</div>
            </td>
            <td style="padding:4px 0; border-bottom:1px dashed #ddd; text-align:right; font-weight:bold; vertical-align:bottom;">
              ${fmtRp(oi.subtotal)}
            </td>
          </tr>
        `;
      })
      .join("");

    const printWin = window.open("", "_blank", "width=400,height=650");
    if (!printWin) return;

    printWin.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Struk Pemesanan - ${order.order_number}</title>
          <style>
            body {
              font-family: 'Courier New', Courier, monospace;
              width: 300px;
              margin: 0 auto;
              padding: 12px;
              font-size: 12px;
              color: #111;
            }
            .center { text-align: center; }
            .divider { border-top: 1px dashed #000; margin: 8px 0; }
            table { width: 100%; border-collapse: collapse; }
            .meta td { padding: 2px 0; font-size: 11px; }
          </style>
        </head>
        <body>
          <div class="center">
            <div style="font-weight:bold; font-size:14px;">PT. PINANG MAJU SEJAHTERA</div>
            <div style="font-size:11px; margin-top:2px;">STRUK PEMESANAN BARANG (TO)</div>
          </div>
          <div class="divider"></div>
          <table class="meta">
            <tr><td>No. Order</td><td>: <strong>${order.order_number}</strong></td></tr>
            <tr><td>Tgl Pesan</td><td>: ${fmtDate(order.order_date)}</td></tr>
            <tr><td>Jadwal Antar</td><td>: ${fmtDate(order.delivery_date)}</td></tr>
            <tr><td>Kategori Area</td><td>: <strong>${areaLabel}</strong></td></tr>
            <tr><td>Sales TO</td><td>: ${order.user?.name ?? "-"}</td></tr>
            <tr><td>Outlet</td><td>: <strong>${order.outlet?.name ?? "-"}</strong> (${order.outlet?.code ?? "-"})</td></tr>
          </table>
          <div class="divider"></div>
          <table>
            ${rowsHtml}
          </table>
          <div class="divider"></div>
          <table>
            <tr>
              <td>Total Barang</td>
              <td style="text-align:right; font-weight:bold;">${totalQty} pcs</td>
            </tr>
            <tr>
              <td style="font-size:13px; font-weight:bold;">ESTIMASI TOTAL</td>
              <td style="text-align:right; font-size:13px; font-weight:bold;">${fmtRp(order.grand_total)}</td>
            </tr>
          </table>
          ${order.note ? `<div class="divider"></div><div style="font-size:11px;">Catatan: ${order.note}</div>` : ""}
          <div class="divider"></div>
          <div class="center" style="font-size:10px; color:#555; margin-top:8px;">
            Dicetak: ${new Date().toLocaleString("id-ID")}<br/>
            Terima kasih atas pemesanan Anda
          </div>
          <script>
            window.onload = function() { window.print(); };
          </script>
        </body>
      </html>
    `);
    printWin.document.close();
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-amber-100 rounded-xl text-amber-700">
            <ClipboardList className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Pemesanan Sales (TO) & Struk</h1>
            <p className="text-xs text-gray-500">
              Daftar pemesanan H-1 dari Sales TO untuk antrian Map Akun Pengantaran (Dalam Kota & Luar Kota)
            </p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-emerald-700 uppercase">Antrian Dalam Kota</span>
            <p className="text-2xl font-black text-gray-900 mt-1">{pendingDalamKota} Outlet</p>
            <span className="text-xs text-gray-500">Menunggu pengantaran (PENDING)</span>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <MapPin className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-indigo-700 uppercase">Antrian Luar Kota</span>
            <p className="text-2xl font-black text-gray-900 mt-1">{pendingLuarKota} Outlet</p>
            <span className="text-xs text-gray-500">Menunggu pengantaran (PENDING)</span>
          </div>
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <MapPin className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-blue-700 uppercase">Sudah Diantar (Dropping)</span>
            <p className="text-2xl font-black text-gray-900 mt-1">{deliveredCount} Pesanan</p>
            <span className="text-xs text-gray-500">Otomatis terhubung ke nota Dropping</span>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Truck className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filter & Table Card */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-5 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            {/* Search */}
            <div className="relative w-full lg:w-80">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Cari no. order, outlet, atau sales..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="block w-full pl-9 pr-3 py-2 border border-gray-300 rounded-xl focus:ring-1 focus:ring-amber-500 focus:border-amber-500 text-sm outline-none"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Area Filter */}
              <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
                <button
                  onClick={() => setAreaFilter("all")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                    areaFilter === "all" ? "bg-white text-gray-900 shadow-sm" : "text-gray-600"
                  }`}
                >
                  Semua Area
                </button>
                <button
                  onClick={() => setAreaFilter("dalam_kota")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                    areaFilter === "dalam_kota" ? "bg-emerald-600 text-white shadow-sm" : "text-gray-600"
                  }`}
                >
                  Dalam Kota
                </button>
                <button
                  onClick={() => setAreaFilter("luar_kota")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                    areaFilter === "luar_kota" ? "bg-indigo-600 text-white shadow-sm" : "text-gray-600"
                  }`}
                >
                  Luar Kota
                </button>
              </div>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="px-3 py-2 border border-gray-300 rounded-xl text-xs font-bold bg-white outline-none"
              >
                <option value="ALL">Semua Status</option>
                <option value="PENDING">PENDING (Menunggu Antar)</option>
                <option value="DELIVERED">DELIVERED (Sudah Dropping)</option>
                <option value="CANCELLED">CANCELLED (Batal)</option>
              </select>
            </div>
          </div>

          <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-amber-600 text-white text-sm">
                    <th className="px-4 py-3 font-semibold">No. Order</th>
                    <th className="px-4 py-3 font-semibold">Outlet</th>
                    <th className="px-4 py-3 font-semibold">Sales TO</th>
                    <th className="px-4 py-3 font-semibold">Area Pengantaran</th>
                    <th className="px-4 py-3 font-semibold">Tgl Pesan → Antar</th>
                    <th className="px-4 py-3 font-semibold text-right">Total</th>
                    <th className="px-4 py-3 font-semibold text-center">Status</th>
                    <th className="px-4 py-3 font-semibold text-center">Aksi / Struk</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                  {loading ? (
                    <TableRowsSkeleton rows={itemsPerPage} cols={8} />
                  ) : paginatedOrders.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                        Belum ada data pemesanan (Order TO).
                      </td>
                    </tr>
                  ) : (
                    paginatedOrders.map((row) => (
                      <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 font-mono font-bold text-xs text-gray-800">
                          {row.order_number}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-gray-900">{row.outlet?.name ?? `#${row.outlet_id}`}</div>
                          <div className="text-xs text-gray-500 font-mono">{row.outlet?.code}</div>
                        </td>
                        <td className="px-4 py-3 text-gray-700 font-medium">
                          {row.user?.name ?? "-"}
                        </td>
                        <td className="px-4 py-3">
                          {row.area_category === "luar_kota" ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                              <MapPin className="w-3 h-3" /> Luar Kota
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <MapPin className="w-3 h-3" /> Dalam Kota
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-600">
                          <div>Pesan: <strong>{fmtDate(row.order_date)}</strong></div>
                          <div>Antar: <strong>{fmtDate(row.delivery_date)}</strong></div>
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-gray-900">
                          {fmtRp(row.grand_total)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {row.status === "DELIVERED" ? (
                            <div className="flex flex-col items-center gap-0.5">
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                                <CheckCircle className="w-3 h-3" /> Diantar
                              </span>
                              {row.sale?.nota_number && (
                                <span className="text-[10px] font-mono text-gray-500">{row.sale.nota_number}</span>
                              )}
                            </div>
                          ) : row.status === "CANCELLED" ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800">
                              <XCircle className="w-3 h-3" /> Batal
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                              <Clock className="w-3 h-3" /> Menunggu
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => setSelectedOrder(row)}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Lihat Detail"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handlePrintReceipt(row)}
                              className="p-1.5 text-amber-700 hover:bg-amber-50 rounded-lg transition-colors"
                              title="Cetak Struk Pemesanan"
                            >
                              <Printer className="w-4 h-4" />
                            </button>
                            {row.status !== "DELIVERED" && (
                              <button
                                onClick={() => setDeleteTarget(row)}
                                className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Hapus Pemesanan"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {!loading && filteredOrders.length > 0 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                totalItems={filteredOrders.length}
                itemsPerPage={itemsPerPage}
              />
            )}
          </div>
        </div>
      </div>

      {/* Modal Detail & Struk */}
      {selectedOrder && (
        <>
          <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-[100]" onClick={() => setSelectedOrder(null)} />
          <div className="fixed inset-0 z-[101] flex items-center justify-center p-4 pointer-events-none">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg pointer-events-auto flex flex-col max-h-[90vh]">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                  <ClipboardList className="w-5 h-5 text-amber-600" />
                  Detail Pemesanan — {selectedOrder.order_number}
                </h3>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="text-gray-400 hover:bg-gray-100 rounded-full p-1.5"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-5 overflow-y-auto space-y-4">
                <div className="grid grid-cols-2 gap-3 text-xs bg-gray-50 p-3.5 rounded-xl border border-gray-200">
                  <div>
                    <span className="text-gray-400 block">Outlet</span>
                    <strong className="text-gray-900 text-sm">{selectedOrder.outlet?.name}</strong>
                    <span className="block text-gray-500 font-mono">{selectedOrder.outlet?.code}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block">Sales Pemesan (TO)</span>
                    <strong className="text-gray-900 text-sm">{selectedOrder.user?.name}</strong>
                    <span className="block text-gray-500">
                      Area: {selectedOrder.area_category === "luar_kota" ? "Luar Kota" : "Dalam Kota"}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400 block">Tanggal Pesan</span>
                    <strong className="text-gray-800">{fmtDate(selectedOrder.order_date)}</strong>
                  </div>
                  <div>
                    <span className="text-gray-400 block">Target Pengantaran</span>
                    <strong className="text-gray-800">{fmtDate(selectedOrder.delivery_date)}</strong>
                  </div>
                </div>

                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-gray-100 text-gray-700">
                      <tr>
                        <th className="px-3 py-2">Barang & Varian</th>
                        <th className="px-3 py-2 text-center">Qty</th>
                        <th className="px-3 py-2 text-right">Harga/Pcs</th>
                        <th className="px-3 py-2 text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {(selectedOrder.order_items ?? []).map((oi) => (
                        <tr key={oi.id}>
                          <td className="px-3 py-2">
                            <span className="font-semibold text-gray-900">
                              {oi.item?.name ?? `Item #${oi.item_id}`}
                            </span>
                            {oi.item?.variant && (
                              <span className="ml-1.5 px-1.5 py-0.5 bg-purple-50 text-purple-700 border border-purple-200 rounded text-[10px] font-bold">
                                {oi.item.variant}
                              </span>
                            )}
                            <span className="block text-gray-400 font-mono">{oi.item?.code}</span>
                          </td>
                          <td className="px-3 py-2 text-center font-bold">{oi.qty_order}</td>
                          <td className="px-3 py-2 text-right">{fmtRp(oi.price_at_moment)}</td>
                          <td className="px-3 py-2 text-right font-bold">{fmtRp(oi.subtotal)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-between items-center px-3 py-2 bg-amber-50 rounded-xl border border-amber-200">
                  <span className="text-xs font-bold text-amber-800">Total Pemesanan</span>
                  <span className="text-base font-black text-amber-900">{fmtRp(selectedOrder.grand_total)}</span>
                </div>

                {selectedOrder.note && (
                  <p className="text-xs text-gray-600 italic bg-gray-50 p-3 rounded-xl border border-gray-100">
                    Catatan: {selectedOrder.note}
                  </p>
                )}
              </div>
              <div className="px-5 py-4 border-t border-gray-100 flex justify-end gap-2 bg-gray-50 rounded-b-2xl">
                <button
                  onClick={() => handlePrintReceipt(selectedOrder)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-sm font-medium"
                >
                  <Printer className="w-4 h-4" /> Cetak Struk
                </button>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 rounded-xl"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Modal Konfirmasi Hapus */}
      {deleteTarget && (
        <>
          <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-[100]" onClick={() => setDeleteTarget(null)} />
          <div className="fixed inset-0 z-[101] flex items-center justify-center p-4 pointer-events-none">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md pointer-events-auto p-5 space-y-4">
              <h3 className="font-bold text-gray-900 text-lg">Hapus Pemesanan?</h3>
              <p className="text-sm text-gray-600">
                Pemesanan <strong>{deleteTarget.order_number}</strong> untuk outlet{" "}
                <strong>{deleteTarget.outlet?.name}</strong> akan dihapus permanen.
              </p>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setDeleteTarget(null)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                  Batal
                </button>
                <button
                  onClick={handleDeleteOrder}
                  disabled={deleting}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg flex items-center gap-2"
                >
                  {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Hapus"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Toast */}
      {snack.open && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[200]">
          <div
            className={`flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg border ${
              snack.type === "error"
                ? "bg-red-50 border-red-200 text-red-800"
                : "bg-emerald-50 border-emerald-200 text-emerald-800"
            }`}
          >
            {snack.type === "error" ? (
              <AlertCircle className="w-5 h-5" />
            ) : (
              <CheckCircle className="w-5 h-5" />
            )}
            <span className="text-sm font-medium">{snack.msg}</span>
            <button onClick={() => setSnack((s) => ({ ...s, open: false }))} className="ml-2">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
