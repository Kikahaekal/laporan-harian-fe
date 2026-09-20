import { useState, useEffect, useMemo } from "react";
import {
  Store,
  Receipt,
  CheckCircle,
  Trash2,
  Save,
  AlertCircle,
  X,
  Loader2,
  ImageIcon,
  AlertTriangle,
  ArrowRight
} from "lucide-react";
import { useNavigate } from "react-router";
import apiBe from "../lib/axiosBe";
import { getDateForDayWeek } from "../pages/data/constant";

const MONTHS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

// ─── Types ────────────────────────────────────────────────────────────────────
interface SaleItem {
  id: number;
  sale_id: number;
  item_id: number;
  qty_order: number;
  qty_sold: number;
  qty_returned: number;
  price_at_moment: string | number;
  subtotal: string | number;
  item?: { id: number; code: string; name: string; stock?: number };
}

export interface Sale {
  id: number;
  nota_number: string;
  outlet_id: number;
  user_id: number;
  transaction_date: string;
  status: "DROPPING" | "INVOICED";
  deposit: string | number;
  grand_total: string | number;
  payment_status?: "LUNAS" | "CICILAN" | "BELUM_LUNAS";
  note?: string | null;
  outlet?: { id: number; code: string; name: string };
  user?: { id: number; name: string };
  sale_items?: SaleItem[];
}

export interface OutletData {
  id: number;
  code: string;
  name: string;
  visit_day?: string;
}

interface ClosedPhoto {
  id: number;
  outlet_id: number;
  closed_date: string;
  note?: string | null;
  photo_url?: string | null;
  user?: { id: number; name: string };
  created_at?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function fmtRp(val: string | number | null | undefined) {
  return "Rp " + Number(val || 0).toLocaleString("id-ID");
}
export function fmtDate(s: string) {
  if (!s) return "-";
  const d = new Date(s);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}
export const DAYS = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];
export function weekOfMonth(s: string) {
  if (!s) return 0;
  const jakartaDate = new Date(new Date(s).toLocaleString("en-US", { timeZone: "Asia/Jakarta" }));
  return Math.ceil(jakartaDate.getDate() / 7);
}
export function buildYears() {
  const y = new Date().getFullYear();
  return [y + 1, y, y - 1, y - 2];
}

// ─── Component: Dialog Modal ─────────────────────────────────────────────────
function Modal({ open, onClose, title, children, actions }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode; actions?: React.ReactNode }) {
  if (!open) return null;
  return (
    <>
      <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-[100]" onClick={onClose} />
      <div className="fixed inset-0 z-[101] flex items-center justify-center p-4 pointer-events-none">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md pointer-events-auto flex flex-col max-h-full">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h3 className="font-bold text-gray-900 text-lg">{title}</h3>
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

// ─── DroppingItemTable (qty editable) ────────────────────────────────────────
function DroppingItemTable({
  items,
  editedQty,
  onQtyChange,
}: {
  items: SaleItem[];
  editedQty: Record<number, number>;
  onQtyChange: (itemId: number, qty: number) => void;
}) {
  const total = items.reduce((sum, it) => {
    const qty = editedQty[it.id] ?? it.qty_order;
    return sum + qty * Number(it.price_at_moment || 0);
  }, 0);

  return (
    <div className="flex flex-col">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-amber-50 border-b border-amber-200 text-amber-900">
              <th className="px-3 py-2 font-semibold">Barang</th>
              <th className="px-3 py-2 font-semibold text-center">Dropping</th>
              <th className="px-3 py-2 font-semibold text-center text-red-600">Sisa</th>
              <th className="px-3 py-2 font-semibold text-center text-blue-600">Stok Gudang</th>
              <th className="px-3 py-2 font-semibold text-right">Harga/unit</th>
              <th className="px-3 py-2 font-semibold text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.map((it) => {
              const currentQty = editedQty[it.id] ?? it.qty_order;
              const sisa = currentQty - (it.qty_sold + it.qty_returned);
              const rowTotal = currentQty * Number(it.price_at_moment || 0);
              return (
                <tr key={it.id} className="hover:bg-gray-50/50">
                  <td className="px-3 py-2">
                    <p className="font-semibold text-gray-800">{it.item?.name ?? `Item #${it.item_id}`}</p>
                    <p className="text-gray-500">{it.item?.code}</p>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <input
                      type="number"
                      value={currentQty}
                      onChange={(e) => {
                        const v = parseInt(e.target.value, 10);
                        onQtyChange(it.id, isNaN(v) || v < 0 ? 0 : v);
                      }}
                      min="0"
                      className="w-16 text-center border border-gray-300 rounded px-2 py-1 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                    />
                  </td>
                  <td className="px-3 py-2 text-center">
                    <span className={`inline-flex px-2 py-0.5 rounded font-medium ${sisa > 0 ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-600"}`}>
                      {sisa}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-center">
                    {it.item?.stock !== undefined ? (
                      <span className={`inline-flex px-2 py-0.5 rounded font-medium border ${it.item.stock <= 0 ? "border-red-200 text-red-700" : it.item.stock <= 10 ? "border-amber-200 text-amber-700" : "border-blue-200 text-blue-700"}`}>
                        {it.item.stock}
                      </span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right text-gray-700 font-medium">
                    {fmtRp(it.price_at_moment)}
                  </td>
                  <td className="px-3 py-2 text-right font-semibold text-gray-800">
                    {fmtRp(rowTotal)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="flex justify-end items-center gap-2 px-4 py-2 bg-amber-50/50 border-t border-amber-100">
        <span className="text-xs text-amber-700">Total Dropping:</span>
        <span className="font-bold text-amber-900">{fmtRp(total)}</span>
      </div>
    </div>
  );
}

// ─── InvoicedItemTable (read-only) ────────────────────────────────────────────
function InvoicedItemTable({ items }: { items: SaleItem[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs border-collapse">
        <thead>
          <tr className="bg-emerald-50 border-b border-emerald-200 text-emerald-900">
            <th className="px-3 py-2 font-semibold">Barang</th>
            <th className="px-3 py-2 font-semibold text-center">Order</th>
            <th className="px-3 py-2 font-semibold text-center">Terjual</th>
            <th className="px-3 py-2 font-semibold text-center">Retur</th>
            <th className="px-3 py-2 font-semibold text-center text-red-600">Sisa</th>
            <th className="px-3 py-2 font-semibold text-right">Subtotal</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {items.map((it) => {
            const sisa = it.qty_order - it.qty_sold - it.qty_returned;
            return (
              <tr key={it.id} className="hover:bg-gray-50/50">
                <td className="px-3 py-2">
                  <p className="font-semibold text-gray-800">{it.item?.name ?? `Item #${it.item_id}`}</p>
                  <p className="text-gray-500">{it.item?.code}</p>
                </td>
                <td className="px-3 py-2 text-center font-medium text-gray-700">{it.qty_order}</td>
                <td className="px-3 py-2 text-center font-medium text-emerald-700">{it.qty_sold}</td>
                <td className="px-3 py-2 text-center font-medium text-gray-600">{it.qty_returned}</td>
                <td className="px-3 py-2 text-center">
                  <span className={`inline-flex px-2 py-0.5 rounded font-medium ${sisa > 0 ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-600"}`}>
                    {sisa}
                  </span>
                </td>
                <td className="px-3 py-2 text-right font-semibold text-gray-800">
                  {fmtRp(it.subtotal)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── NotaCard ────────────────────────────────────────────────────────────────
function NotaCard({
  sale,
  onSaved,
  onDeleted,
  selectedMonth,
  selectedYear,
}: {
  sale: Sale;
  onSaved: (updated: Sale) => void;
  onDeleted: (id: number) => void;
  selectedMonth: number;
  selectedYear: number;
}) {
  const navigate = useNavigate();
  const isDropping = sale.status === "DROPPING";
  const items = sale.sale_items ?? [];
  const weekLabel = `Minggu ke-${weekOfMonth(sale.transaction_date)}`;

  const noteDate = sale.transaction_date ? new Date(sale.transaction_date) : null;
  const isCarryForward =
    isDropping &&
    noteDate !== null &&
    (noteDate.getFullYear() < selectedYear ||
      (noteDate.getFullYear() === selectedYear && noteDate.getMonth() + 1 < selectedMonth));

  const [deposit, setDeposit] = useState(String(sale.deposit ?? ""));
  const [note, setNote] = useState(sale.note ?? "");
  const [editedQty, setEditedQty] = useState<Record<number, number>>(
    Object.fromEntries(items.map((it) => [it.id, it.qty_order]))
  );
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [snack, setSnack] = useState<{ open: boolean; msg: string; sev: "success" | "error" }>({
    open: false, msg: "", sev: "success",
  });

  const handleQtyChange = (itemId: number, qty: number) => {
    setEditedQty((prev) => ({ ...prev, [itemId]: qty }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      type Payload = {
        deposit: number | null;
        note: string | null;
        items?: { id: number; qty_order: number }[];
      };
      const payload: Payload = {
        deposit: deposit === "" ? null : Number(deposit),
        note: note || null,
      };
      if (isDropping) {
        payload.items = Object.entries(editedQty).map(([id, qty_order]) => ({
          id: Number(id),
          qty_order,
        }));
      }
      const res = await apiBe.put(`/api/web/sales/${sale.id}`, payload);
      onSaved(res.data.sale);
      setSnack({ open: true, msg: "Nota berhasil disimpan.", sev: "success" });
    } catch (err: any) {
      setSnack({ open: true, msg: err.response?.data?.message ?? "Gagal simpan.", sev: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await apiBe.delete(`/api/web/sales/${sale.id}`);
      setDeleteOpen(false);
      onDeleted(sale.id);
    } catch (err: any) {
      setSnack({ open: true, msg: err.response?.data?.message ?? "Gagal hapus.", sev: "error" });
      setDeleting(false);
    }
  };

  return (
    <div className={`mb-3 border-[1.5px] rounded-xl overflow-hidden shadow-sm ${isDropping ? 'border-amber-400' : 'border-emerald-500'}`}>
      {/* ── Header nota ── */}
      <div className={`px-4 py-2 flex flex-col sm:flex-row sm:items-center gap-2 border-b ${isDropping ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'}`}>
        <div className="flex items-center gap-2 flex-wrap flex-1">
          <Receipt className={`w-4 h-4 ${isDropping ? 'text-amber-600' : 'text-emerald-600'}`} />
          <span className={`font-bold text-sm ${isDropping ? 'text-amber-800' : 'text-emerald-800'}`}>
            {sale.nota_number}
          </span>
          <span className="text-xs text-gray-500">{fmtDate(sale.transaction_date)}</span>
          <span className="px-2 py-0.5 border border-gray-300 rounded text-[10px] font-bold text-gray-600 bg-white shadow-sm">
            {weekLabel}
          </span>
          <span className={`px-2 py-0.5 rounded text-[10px] font-bold text-white shadow-sm ${isDropping ? 'bg-amber-500' : 'bg-emerald-600'}`}>
            {sale.status}
          </span>
          
          {isCarryForward && (
            <span className="px-2 py-0.5 border border-red-300 rounded text-[10px] font-bold text-red-600 bg-white">
              Lanjutan {MONTHS[(noteDate?.getMonth() ?? 0)]} {noteDate?.getFullYear()}
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-3">
          {sale.user && (
            <span className="text-xs text-gray-500 font-medium">Sales: {sale.user.name}</span>
          )}
          {isDropping && (
            <button 
              onClick={() => setDeleteOpen(true)}
              className="p-1 text-red-500 hover:bg-red-100 rounded-lg transition-colors"
              title="Hapus Nota"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* ── Summary Bar ── */}
      <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 flex flex-wrap gap-4 items-center">
        <span className="text-xs text-gray-500 font-medium">{items.length} item</span>
        <span className="text-xs text-gray-500 font-medium">Total: {fmtRp(sale.grand_total)}</span>
        <span className="text-xs text-gray-500 font-medium">Deposit: {fmtRp(sale.deposit)}</span>
      </div>

      {/* ── Table Area ── */}
      <div className="bg-white">
        {isDropping ? (
          <DroppingItemTable
            items={items}
            editedQty={editedQty}
            onQtyChange={handleQtyChange}
          />
        ) : (
          <InvoicedItemTable items={items} />
        )}
      </div>

      {/* ── Footer ── */}
      <div className="px-4 py-3 bg-white border-t border-gray-200">
        {isDropping ? (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-400 mb-1">Catatan dari Sales</label>
              {sale.note ? (
                <div className="w-full px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 italic h-[34px] flex items-center overflow-hidden text-ellipsis whitespace-nowrap">
                  {sale.note}
                </div>
              ) : (
                <div className="w-full px-3 py-1.5 bg-gray-50/50 border border-dashed border-gray-200 rounded-lg text-sm text-gray-400 italic h-[34px] flex items-center">
                  Tidak ada catatan
                </div>
              )}
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex justify-center items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-5 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-70"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Simpan
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex gap-4">
                <div className="flex items-baseline gap-2">
                  <span className="text-xs text-gray-500 font-medium">Deposit:</span>
                  <span className="text-sm font-bold text-emerald-700">{fmtRp(sale.deposit)}</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-xs text-gray-500 font-medium">Total:</span>
                  <span className="text-sm font-bold text-gray-900">{fmtRp(sale.grand_total)}</span>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2">
                {(sale.payment_status === "LUNAS" || Number(sale.deposit) >= Number(sale.grand_total)) ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border shadow-sm bg-emerald-100 text-emerald-800 border-emerald-200">
                    <CheckCircle className="w-3.5 h-3.5" /> Lunas
                  </span>
                ) : sale.payment_status === "CICILAN" || (Number(sale.deposit) > 0 && Number(sale.deposit) < Number(sale.grand_total)) ? (
                  <button 
                    onClick={() => navigate(`/tagihan?q=${sale.nota_number}`)}
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border shadow-sm bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-200 hover:text-amber-900 transition-colors cursor-pointer"
                  >
                    <AlertTriangle className="w-3.5 h-3.5" /> Cicilan
                    <ArrowRight className="w-3 h-3 ml-1" />
                  </button>
                ) : (
                  <button 
                    onClick={() => navigate(`/tagihan?q=${sale.nota_number}`)}
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border shadow-sm bg-red-100 text-red-800 border-red-200 hover:bg-red-200 hover:text-red-900 transition-colors cursor-pointer"
                  >
                    <Receipt className="w-3.5 h-3.5" /> Belum Lunas
                    <ArrowRight className="w-3 h-3 ml-1" />
                  </button>
                )}
              </div>
            </div>
            {sale.note && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400 font-medium">Catatan:</span>
                <span className="text-xs italic text-gray-600">{sale.note}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modals & Toasts */}
      <Modal open={deleteOpen} onClose={() => setDeleteOpen(false)} title="Hapus Nota?">
        <p className="text-gray-600">Nota <strong className="text-gray-900">{sale.nota_number}</strong> akan dihapus permanen. Apakah Anda yakin?</p>
      </Modal>
      {deleteOpen && (
        <div className="fixed z-[102] flex gap-2 right-4 bottom-4">
           {/* Ini workaround karena layout modal saya memisahkan actions ke props, 
               tapi untuk kemudahan saya pasang custom action div di bawah. */}
        </div>
      )}
      <Modal 
        open={deleteOpen} 
        onClose={() => setDeleteOpen(false)} 
        title="Hapus Nota?"
        actions={
          <>
            <button onClick={() => setDeleteOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg">Batal</button>
            <button onClick={handleDelete} disabled={deleting} className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg flex items-center gap-2">
              {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Hapus"}
            </button>
          </>
        }
      >
        <p className="text-gray-600">Nota <strong className="text-gray-900">{sale.nota_number}</strong> akan dihapus permanen. Apakah Anda yakin?</p>
      </Modal>

      <Toast open={snack.open} msg={snack.msg} type={snack.sev} onClose={() => setSnack(s => ({ ...s, open: false }))} />
    </div>
  );
}

// ─── OutletCard ───────────────────────────────────────────────────────────────
export function OutletCard({
  outlet,
  sales,
  onSaleUpdated,
  onSaleDeleted,
  selectedDay,
  selectedWeek,
  selectedMonth,
  selectedYear,
}: {
  outlet: OutletData;
  sales: Sale[];
  onSaleUpdated: (updated: Sale) => void;
  onSaleDeleted: (id: number) => void;
  selectedDay: string;
  selectedWeek: number;
  selectedMonth: number;
  selectedYear: number;
}) {
  const dropping = sales.filter((s) => s.status === "DROPPING");
  const invoiced = sales.filter((s) => s.status === "INVOICED");
  const [closedPhoto, setClosedPhoto] = useState<ClosedPhoto | null>(null);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [photoOpen, setPhotoOpen] = useState(false);

  const expectedDate = useMemo(() => {
    if (selectedWeek === 0) return null;
    const d = getDateForDayWeek(selectedYear, selectedMonth, selectedDay, selectedWeek);
    if (!d) return null;
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }, [selectedYear, selectedMonth, selectedDay, selectedWeek]);

  const hasInvoicedOnDate = useMemo(() => {
    if (!expectedDate) return false;
    return sales.some(
      (s) =>
        s.status === "INVOICED" &&
        (s.transaction_date ?? "").slice(0, 10) === expectedDate
    );
  }, [sales, expectedDate]);

  const hasDropping = useMemo(() => sales.some((s) => s.status === "DROPPING"), [sales]);

  useEffect(() => {
    if (!expectedDate || hasInvoicedOnDate) {
      setClosedPhoto(null);
      return;
    }
    let active = true;
    const load = async () => {
      setPhotoLoading(true);
      try {
        const res = await apiBe.get(`/api/web/outlets/${outlet.id}/closed-photos`);
        if (!active) return;
        const list: ClosedPhoto[] = res.data?.data ?? [];
        
        // Helper: normalize any date string to YYYY-MM-DD in local timezone
        const toLocalDate = (d: string) => {
          if (!d) return "";
          const dt = new Date(d);
          return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
        };
        
        const match = list.find((p) => toLocalDate(p.closed_date ?? "") === expectedDate) ?? null;
        setClosedPhoto(match);
      } catch (err: any) {
        if (!active) return;
        console.error("Gagal load foto tutup outlet", err);
        setClosedPhoto(null);
      } finally {
        if (active) setPhotoLoading(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [expectedDate, hasInvoicedOnDate, outlet.id]);

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm mb-4 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
            <Store className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-gray-900 text-base">{outlet.name}</h3>
              <span className="px-2 py-0.5 border border-gray-200 rounded-full text-xs font-medium text-gray-600">
                {outlet.code}
              </span>
              {outlet.visit_day && (
                <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-100 rounded-full text-xs font-medium">
                  {outlet.visit_day}
                </span>
              )}
            </div>
            
            <div className="mt-2 flex items-center gap-2 flex-wrap">
              {dropping.length > 0 && (
                <span className="px-2 py-0.5 border border-amber-300 text-amber-700 bg-amber-50 rounded text-xs font-bold">
                  {dropping.length} DROPPING
                </span>
              )}
              {invoiced.length > 0 && (
                <span className="px-2 py-0.5 border border-emerald-300 text-emerald-700 bg-emerald-50 rounded text-xs font-bold">
                  {invoiced.length} INVOICED
                </span>
              )}
              {sales.length === 0 && (
                <span className="text-xs text-gray-500">Belum ada transaksi</span>
              )}
            </div>
          </div>
        </div>

        {/* Cek status Toko Tutup */}
        <div className="flex items-center gap-2">
          {expectedDate && !hasInvoicedOnDate && closedPhoto && (
            <>
              <span className="px-2.5 py-1 bg-red-100 text-red-800 font-bold text-xs rounded shadow-sm">
                TUTUP
              </span>
              <button 
                onClick={() => setPhotoOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-medium hover:bg-gray-50 transition-colors"
              >
                <ImageIcon className="w-3.5 h-3.5" /> Foto
              </button>
            </>
          )}
          {expectedDate && !hasInvoicedOnDate && !closedPhoto && photoLoading && (
            <span className="px-2 py-1 flex items-center gap-1 text-xs font-medium text-gray-500">
              <Loader2 className="w-3 h-3 animate-spin" /> Cek tutup...
            </span>
          )}
        </div>
      </div>

      <div className="p-4 sm:p-5 bg-gray-50/30">
        {sales.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">Tidak ada nota untuk outlet ini di periode yang dipilih.</p>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
            {/* Kolom Dropping */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-amber-600" />
                <h4 className="text-sm font-bold text-amber-800">Dropping</h4>
              </div>
              {dropping.length > 0 ? (
                <div className="flex flex-col gap-4 flex-1">
                  {dropping.map((s) => (
                    <NotaCard key={s.id} sale={s} onSaved={onSaleUpdated} onDeleted={onSaleDeleted} selectedMonth={selectedMonth} selectedYear={selectedYear} />
                  ))}
                </div>
              ) : (
                <div className="border-2 border-dashed border-amber-200 rounded-xl p-8 flex flex-col items-center justify-center text-amber-500/70 bg-amber-50/50 flex-1 min-h-[200px] w-full">
                  <Receipt className="w-10 h-10 mb-3 opacity-50" />
                  <p className="text-sm font-medium">Dropping belum dilakukan</p>
                </div>
              )}
            </div>

            {/* Kolom Invoice */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                <h4 className="text-sm font-bold text-emerald-800">Invoice</h4>
              </div>
              {invoiced.length > 0 ? (
                <div className="flex flex-col gap-4 flex-1">
                  {invoiced.map((s) => (
                    <NotaCard key={s.id} sale={s} onSaved={onSaleUpdated} onDeleted={onSaleDeleted} selectedMonth={selectedMonth} selectedYear={selectedYear} />
                  ))}
                </div>
              ) : (
                <div className="border-2 border-dashed border-emerald-200 rounded-xl p-8 flex flex-col items-center justify-center text-emerald-500/70 bg-emerald-50/50 flex-1 min-h-[200px] w-full">
                  <CheckCircle className="w-10 h-10 mb-3 opacity-50" />
                  <p className="text-sm font-medium">Invoice belum dilakukan</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <Modal 
        open={photoOpen} 
        onClose={() => setPhotoOpen(false)} 
        title="Foto Toko Tutup"
        actions={<button onClick={() => setPhotoOpen(false)} className="px-4 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg text-sm font-medium">Tutup</button>}
      >
        {closedPhoto?.photo_url ? (
          <img
            src={closedPhoto.photo_url}
            alt={`Foto tutup ${outlet.name}`}
            className="w-full rounded-xl border border-gray-200 shadow-sm"
          />
        ) : (
          <p className="text-gray-500 text-sm">Belum ada foto tutup untuk outlet ini pada tanggal tersebut.</p>
        )}
        <div className="mt-4 space-y-1">
          {closedPhoto?.user?.name && (
            <p className="text-sm text-gray-600"><span className="font-medium text-gray-800">Dilaporkan oleh:</span> {closedPhoto.user.name}</p>
          )}
          {closedPhoto?.created_at && (
            <p className="text-sm text-gray-600"><span className="font-medium text-gray-800">Waktu:</span> {new Date(closedPhoto.created_at).toLocaleString("id-ID")}</p>
          )}
          {closedPhoto?.note && (
            <p className="text-sm text-gray-600 mt-2 p-3 bg-gray-50 rounded-lg italic border border-gray-100">{closedPhoto.note}</p>
          )}
        </div>
      </Modal>
    </div>
  );
}

