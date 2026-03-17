// ================= TYPES =================
export type ReportStatus = "pending" | "approved" | "rejected";

// ── Types untuk laporan-be (Transaksi Sales dari Android) ──────────────────
export type SaleStatus = "DROPPING" | "INVOICED";
export type PaymentStatus = "LUNAS" | "BELUM_LUNAS" | "CICILAN";

export type SaleItem = {
  id: number;
  sale_id: number;
  item_id: number;
  qty_order: number;
  qty_sold: number;
  qty_returned: number;

  price_at_moment: string;
  subtotal: string;
  item?: { id: number; code: string; name: string };
};

export type Sale = {
  id: number;
  nota_number: string;
  outlet_id: number;
  user_id: number;
  transaction_date: string;
  status: SaleStatus;
  payment_status: PaymentStatus | null;
  deposit: string;
  grand_total: string;
  dropping_total?: string;
  note: string | null;
  closed_photo?: string | null;
  closed_photo_url?: string | null;
  outlet?: { id: number; code: string; name: string };
  user?: { id: number; name: string };
  sale_items?: SaleItem[];
};

/** Satu baris item di dalam satu outlet (value dropdown = string) */
export type ItemRow = {
  item_id: string;
  qty_order: string;
  qty_sold: string;
  deposit: string;
};

/** Satu grup outlet dengan banyak item (untuk tampilan: 1 outlet → banyak item) */
export type OutletGroup = {
  outlet_id: string;
  status?: ReportStatus;
  items: ItemRow[];
};

/** Data per (day, week) = array grup outlet */
export type WeekDataByOutlet = Record<number, OutletGroup[]>;
export type DataMapByOutlet = Record<string, WeekDataByOutlet>;

/** Legacy: grid flat (untuk kompatibilitas jika masih dipakai) */
export type RowType = {
  outlet_id: string;
  item_id: string;
  qty_order: string;
  qty_sold: string;
  deposit: string;
  id?: number;
  status?: ReportStatus;
};

/** Master for dropdowns; id from API, value in UI = String(id) */
export type OutletMaster = { id: number; name: string };
export type ItemMaster = { id: number; name: string; price?: number };

/** Payload for POST/PUT daily report (sales-reports); outlet_id and item_id as number */
export type DailyReportRow = {
  day_name: string;
  week: number;
  outlet_id: number;
  item_id: number;
  qty_order: number;
  qty_sold: number;
  deposit: number;
  status?: ReportStatus;
};
export type DailyReportPayload = {
  year: number;
  month: number;
  rows: DailyReportRow[];
};

export type WeekMap = Record<number, RowType[]>;
export type DataMap = Record<string, WeekMap>;

// ================= CONSTANTS UI =================
export const DAYS = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];
export const MONTHS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

/** Senin=1, Selasa=2, ..., Minggu=0 (sesuai JS getDay(): 0=Sun, 1=Mon, ...) */
const DAY_NAME_TO_JS_WEEKDAY: Record<string, number> = {
  Senin: 1, Selasa: 2, Rabu: 3, Kamis: 4, Jumat: 5, Sabtu: 6, Minggu: 0,
};

/**
 * Tanggal untuk (hari, minggu) dalam bulan/tahun.
 * Misal: Senin minggu 1 Feb 2026 = 2 Feb 2026.
 */
export function getDateForDayWeek(year: number, month: number, dayName: string, week: number): Date | null {
  const W = DAY_NAME_TO_JS_WEEKDAY[dayName];
  if (W === undefined) return null;
  const first = new Date(year, month - 1, 1);
  const dowFirst = first.getDay();
  const firstOccurrence = 1 + ((W - dowFirst + 7) % 7);
  const dayOfMonth = firstOccurrence + (week - 1) * 7;
  const lastDay = new Date(year, month, 0).getDate();
  if (dayOfMonth < 1 || dayOfMonth > lastDay) return null;
  return new Date(year, month - 1, dayOfMonth);
}

/** Format tanggal untuk tampilan (dd/MM/yyyy) */
export function formatDisplayDate(d: Date): string {
  const day = d.getDate();
  const month = d.getMonth() + 1;
  const y = d.getFullYear();
  return `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}/${y}`;
}

export const EMPTY_ITEM_ROW: ItemRow = {
  item_id: "",
  qty_order: "",
  qty_sold: "",
  deposit: "",
};

export const EMPTY_ROW: RowType = {
  outlet_id: "",
  item_id: "",
  qty_order: "",
  qty_sold: "",
  deposit: "",
};

// ================= UTILS (Rumus Hitung) =================
export const calcTotals = (rows: RowType[]) => {
  if (!rows) {
    return { qty_order: 0, qty_sold: 0, qty_remaining: 0, deposit: 0 };
  }

  return rows.reduce(
    (acc, r) => {
      const order = Number(r.qty_order || 0);
      const sold = Number(r.qty_sold || 0);
      const deposit = Number(r.deposit || 0);

      acc.qty_order += order;
      acc.qty_sold += sold;
      acc.qty_remaining += order - sold;
      acc.deposit += deposit;
      return acc;
    },
    { qty_order: 0, qty_sold: 0, qty_remaining: 0, deposit: 0 }
  );
};

export const getInitialData = (): DataMap => {
  const data: DataMap = {};

  DAYS.forEach((d) => {
    data[d] = {
      1: [{ ...EMPTY_ROW }],
      2: [{ ...EMPTY_ROW }],
      3: [{ ...EMPTY_ROW }],
      4: [{ ...EMPTY_ROW }],
    };
  });

  return data;
};

/** Initial data struktur per-outlet: tiap (day, week) punya 1 grup outlet kosong */
export const getInitialDataByOutlet = (): DataMapByOutlet => {
  const data: DataMapByOutlet = {};
  DAYS.forEach((d) => {
    data[d] = {
      1: [{ outlet_id: "", status: "pending", items: [{ ...EMPTY_ITEM_ROW }] }],
      2: [{ outlet_id: "", status: "pending", items: [{ ...EMPTY_ITEM_ROW }] }],
      3: [{ outlet_id: "", status: "pending", items: [{ ...EMPTY_ITEM_ROW }] }],
      4: [{ outlet_id: "", status: "pending", items: [{ ...EMPTY_ITEM_ROW }] }],
    };
  });
  return data;
};

/** Flatten DataMapByOutlet → rows untuk API (day_name, week, outlet_id, item_id, ...) */
export const flattenOutletDataToRows = (
  data: DataMapByOutlet,
  dayName: string,
  week: number
): DailyReportRow[] => {
  const rows: DailyReportRow[] = [];
  const groups = data[dayName]?.[week] ?? [];
  groups.forEach((g) => {
    const oId = Number(g.outlet_id);
    if (!oId) return;
    const status = g.status ?? "pending";
    g.items.forEach((it) => {
      const iId = Number(it.item_id);
      if (!iId) return;
      rows.push({
        day_name: dayName.toLowerCase(),
        week,
        outlet_id: oId,
        item_id: iId,
        qty_order: Number(it.qty_order || 0),
        qty_sold: Number(it.qty_sold || 0),
        deposit: Number(it.deposit || 0),
        status,
      });
    });
  });
  return rows;
};

/** Group flat API rows (untuk day+week) → OutletGroup[] */
export const groupRowsByOutlet = (
  flatRows: Array<{
    outlet_id?: number;
    outlet?: { id: number };
    item_id?: number;
    item?: { id: number };
    qty_order: number;
    qty_sold: number;
    deposit: number;
    status?: string;
  }>
): OutletGroup[] => {
  const byOutlet = new Map<string, { items: ItemRow[]; status?: ReportStatus }>();
  flatRows.forEach((row) => {
    const oId = row.outlet?.id ?? row.outlet_id;
    const iId = row.item?.id ?? row.item_id;
    if (oId == null || iId == null) return;
    const key = String(oId);
    if (!byOutlet.has(key)) byOutlet.set(key, { items: [], status: (row.status as ReportStatus) ?? "pending" });
    byOutlet.get(key)!.items.push({
      item_id: String(iId),
      qty_order: String(row.qty_order),
      qty_sold: String(row.qty_sold),
      deposit: String(row.deposit),
    });
  });
  return Array.from(byOutlet.entries()).map(([outlet_id, { items, status }]) => ({ outlet_id, status: status ?? "pending", items }));
};
