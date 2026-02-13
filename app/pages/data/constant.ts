// ================= TYPES =================
export type RowType = {
  outlet_id: string; // Nanti diisi code dari API
  item_id: string;   // Nanti diisi code dari API
  qty_order: string;
  qty_sold: string;
  deposit: string;
};

export type WeekMap = Record<number, RowType[]>;
export type DataMap = Record<string, WeekMap>;

// ================= CONSTANTS UI =================
export const DAYS = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];
export const MONTHS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

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