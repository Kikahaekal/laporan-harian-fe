// ─── Constants ────────────────────────────────────────────────────────────────

export const MONTHS = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

export const DAYS = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];

// ─── Types ────────────────────────────────────────────────────────────────────

export type PaymentStatus = "LUNAS" | "CICILAN" | "BELUM_LUNAS";

export type ReportStatus = "pending" | "approved" | "rejected";

export interface OutletMaster {
    id: number;
    code: string;
    name: string;
}

export interface ItemMaster {
    id: number;
    code: string;
    name: string;
    price?: number;
}

export interface ItemRow {
    item_id: string;
    qty_order: string;
    qty_sold: string;
    deposit: string;
}

export interface OutletGroup {
    outlet_id: string;
    items: ItemRow[];
    status?: ReportStatus;
}

export interface RowType {
    outlet_id: string;
    item_id: string;
    qty_order: string;
    qty_sold: string;
    deposit: string;
    status?: ReportStatus;
}

export type DataMapByOutlet = Record<string, Record<number, OutletGroup[]>>;

export const EMPTY_ITEM_ROW: ItemRow = { item_id: "", qty_order: "", qty_sold: "", deposit: "" };

export interface DailyReportPayload {
    rows: Array<{
        year?: number;
        month?: number;
        week: number;
        day_name: string;
        outlet_id: string;
        item_id: string;
        qty_order: number;
        qty_sold: number;
        deposit: number;
        status?: ReportStatus;
    }>;
}

export function getInitialDataByOutlet(): DataMapByOutlet {
    return DAYS.reduce((acc, day) => {
        acc[day] = {
            1: [{ outlet_id: "", items: [{ ...EMPTY_ITEM_ROW }] }],
            2: [{ outlet_id: "", items: [{ ...EMPTY_ITEM_ROW }] }],
            3: [{ outlet_id: "", items: [{ ...EMPTY_ITEM_ROW }] }],
            4: [{ outlet_id: "", items: [{ ...EMPTY_ITEM_ROW }] }],
        };
        return acc;
    }, {} as DataMapByOutlet);
}

export function groupRowsByOutlet(rows: Array<Record<string, any>>): OutletGroup[] {
    const map = new Map<string, OutletGroup>();
    rows.forEach((row) => {
        const outletId = String(row.outlet_id ?? "");
        if (!outletId) return;
        if (!map.has(outletId)) {
            map.set(outletId, {
                outlet_id: outletId,
                items: [],
                status: row.status,
            });
        }
        const group = map.get(outletId);
        if (group) {
            group.items.push({
                item_id: String(row.item_id ?? ""),
                qty_order: String(row.qty_order ?? ""),
                qty_sold: String(row.qty_sold ?? ""),
                deposit: String(row.deposit ?? ""),
            });
        }
    });
    return Array.from(map.values());
}

export function flattenOutletDataToRows(data: DataMapByOutlet, day: string, week: number) {
    const groups = data[day]?.[week] ?? [];
    const rows: DailyReportPayload["rows"] = [];
    groups.forEach((group) => {
        if (!group.outlet_id) return;
        group.items.forEach((item) => {
            if (!item.item_id) return;
            rows.push({
                day_name: day,
                week,
                outlet_id: group.outlet_id,
                item_id: item.item_id,
                qty_order: Number(item.qty_order || 0),
                qty_sold: Number(item.qty_sold || 0),
                deposit: Number(item.deposit || 0),
                status: group.status,
            });
        });
    });
    return rows;
}

export function calcTotals(rows: RowType[]) {
    return rows.reduce(
        (acc, row) => {
            const order = Number(row.qty_order || 0);
            const sold = Number(row.qty_sold || 0);
            acc.qty_order += order;
            acc.qty_sold += sold;
            acc.qty_remaining += order - sold;
            acc.deposit += Number(row.deposit || 0);
            return acc;
        },
        { qty_order: 0, qty_sold: 0, qty_remaining: 0, deposit: 0 }
    );
}

const DAY_INDEX: Record<string, number> = {
    Minggu: 0,
    Senin: 1,
    Selasa: 2,
    Rabu: 3,
    Kamis: 4,
    Jumat: 5,
    Sabtu: 6,
};

export function getDateForDayWeek(year: number, month: number, dayName: string, week: number) {
    const targetIndex = DAY_INDEX[dayName];
    if (targetIndex === undefined) return null;
    const daysInMonth = new Date(year, month, 0).getDate();
    let count = 0;
    for (let day = 1; day <= daysInMonth; day += 1) {
        const date = new Date(year, month - 1, day);
        if (date.getDay() === targetIndex) {
            count += 1;
            if (count === week) return date;
        }
    }
    return null;
}

export function formatDisplayDate(date: Date) {
    const d = String(date.getDate()).padStart(2, "0");
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const y = date.getFullYear();
    return `${d}/${m}/${y}`;
}

export interface SaleItem {
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
    payment_status?: PaymentStatus | null;
    note?: string | null;
    dropping_total?: string | number;
    outlet?: { id: number; code: string; name: string; address?: string };
    user?: { id: number; name: string };
    sale_items?: SaleItem[];
}
