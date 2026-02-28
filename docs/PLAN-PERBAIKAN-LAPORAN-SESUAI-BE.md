# Plan Perbaikan Laporan Harian FE agar Sesuai dengan BE (Sales + Sale Items)

Backend sekarang memakai struktur **sales** (header) + **sale_items** (detail) dengan FK berbasis **id**. Dokumen ini memandu penyesuaian frontend.

---

## Ringkasan perubahan BE yang harus diikuti FE

| Sebelum (sales-reports) | Sesudah (sales) |
|------------------------|-----------------|
| Satu baris = satu kombinasi outlet + item + day + week + month + year | Satu transaksi = satu **nota** (sales) dengan banyak **baris item** (sale_items) |
| FK pakai `outlet_code`, `item_code` | FK pakai `outlet_id`, `item_id` (integer) |
| Filter laporan: `year`, `month` | Filter: `year` + `month` atau `transaction_date` atau `from` & `to` |
| Kolom: day_name, week, qty_order, qty_sold, deposit | Header: nota_number, transaction_date, outlet_id, user_id, grand_total, deposit, status, note. Detail: item_id, qty_order, qty_sold, price_at_moment, subtotal |

**Endpoint baru (pakai ini untuk fitur laporan transaksi):**

- `GET /api/sales?year=&month=` → daftar transaksi (Sale[]) dalam periode
- `GET /api/sales/periods` → daftar periode `[{ year, month }]` (untuk Rekap)
- `GET /api/sales/:id` → satu transaksi + items
- `POST /api/sales` → buat transaksi (nota + items)
- `PUT /api/sales/:id` → update transaksi + items
- `DELETE /api/sales/:id` → hapus transaksi

**Master data (tetap):** `GET /api/outlets`, `GET /api/items` — response tetap berisi `id` dan `code`. Untuk **sales** wajib kirim **id** (integer), bukan code.

---

## Alur UI yang disarankan (sesuai BE)

1. **Input Laporan** → input **satu transaksi per nota**: pilih tanggal, outlet, nomor nota, lalu tambah baris item (item, qty order, qty sold, harga saat itu). Simpan = `POST /api/sales`.
2. **Rekap** → pilih periode (tahun/bulan) dari `GET /api/sales/periods`, lalu tampilkan daftar transaksi bulan itu dari `GET /api/sales?year=&month=`. Klik satu transaksi → ke halaman **Edit** atau detail.
3. **Edit** → ambil `GET /api/sales/:id`, form edit header (outlet, tanggal, status, deposit, note) + tabel item (item_id, qty_order, qty_sold, price_at_moment). Simpan = `PUT /api/sales/:id`.

---

## Langkah perbaikan per file / fitur

### 1. Type & constant ([app/pages/data/constant.ts](app/pages/data/constant.ts))

- **Types untuk Sales (transaksi baru):**
  - Tambah tipe untuk **Sale** (id, nota_number, outlet_id, user_id, transaction_date, status, deposit, grand_total, note, sale_items?).
  - Tambah tipe **SaleItem** (id, sale_id, item_id, qty_order, qty_sold, price_at_moment, subtotal, item?).
  - Payload create: `{ nota_number, outlet_id, transaction_date, status?, deposit?, note?, items: [{ item_id, qty_order, qty_sold, price_at_moment }] }`.
- **Master untuk form transaksi:** simpan outlet/item dengan **id** (number) dan nama untuk tampilan; saat panggil API sales gunakan `outlet_id` dan `item_id` (number).
- Tetap pertahankan tipe/constant lama (RowType, DataMap, dll.) hanya jika masih dipakai untuk halaman legacy; jika seluruhnya pindah ke sales, bisa diganti bertahap.

### 2. Master data (Outlet & Item)

- Response API: `outlets` dan `items` sudah punya `id` (number). Di FE simpan di state sebagai `{ id: number, code: string, name: string }` (atau minimal `id` + `name`).
- Di **form transaksi (sales)** gunakan **id** saat submit: `outlet_id: number`, `items[].item_id: number`. Jangan lagi kirim `code` untuk sales.

### 3. Halaman Laporan ([app/pages/laporan/Laporan.tsx](app/pages/laporan/Laporan.tsx))

**Opsi A — Ganti ke “Input Transaksi” (disarankan):**

- Ganti isi halaman jadi form **satu transaksi per nota**:
  - Input: Tanggal (transaction_date), Outlet (dropdown by id), Nomor Nota (nota_number).
  - Tabel baris item: Item (dropdown by id), Qty Order, Qty Sold, Harga saat itu (price_at_moment). Tombol tambah/hapus baris.
  - Hitung grand_total dari jumlah (qty_sold * price_at_moment) per baris (bisa tampil saja; BE juga hitung).
  - Opsional: Deposit, Status, Note.
- Saat simpan: kumpulkan payload sesuai `SaleStoreRequest`, panggil `POST /api/sales`. Tidak lagi pakai `day_name`, `week`, `outlet_id`/`item_id` sebagai code.

**Opsi B — Tetap grid per hari/minggu:**

- Perlu endpoint BE tambahan yang meng-agregasi `sales` + `sale_items` ke format “per day/week” (atau per transaction_date) agar grid tetap terisi. Itu di luar scope dokumen ini; koordinasi dengan BE.

### 4. Halaman Rekap ([app/pages/rekap/Rekap.tsx](app/pages/rekap/Rekap.tsx))

- Ganti sumber periode: panggil `GET /api/sales/periods` (bukan `/api/sales-reports/periods`).
- Response tetap `[{ year, month }]`. Grouping tampilan (accordion tahun → bulan) bisa tetap.
- Saat user klik satu bulan: navigasi ke daftar transaksi bulan itu, misalnya `/rekap/:year/:month` atau query `?year=&month=`, lalu di halaman itu panggil `GET /api/sales?year=&month=` dan tampilkan daftar nota (nota_number, tanggal, outlet, grand_total). Dari sini bisa link ke **Edit** per transaksi (`/edit/:saleId` atau `?saleId=`).

### 5. Halaman Edit ([app/pages/edit/EditLaporan.tsx](app/pages/edit/EditLaporan.tsx))

- Ubah dari “edit laporan satu periode (bulan)” jadi **edit satu transaksi (satu nota)**.
- Route: terima **sale id** (misalnya `/edit/:id` atau query `?id=`).
- Load: `GET /api/sales/:id` → isi form header (nota_number read-only), transaction_date, outlet_id, status, deposit, note, dan tabel sale_items (item_id, qty_order, qty_sold, price_at_moment).
- Master: tetap ambil outlets & items (pakai id di dropdown).
- Simpan: `PUT /api/sales/:id` dengan payload sesuai `SaleUpdateRequest` (outlet_id, transaction_date, status, deposit, note, items[]).

### 6. Komponen grid lama (WeeklySection, dll.)

- Jika Laporan sudah pakai form “satu transaksi per nota”, komponen grid per hari/minggu (WeeklySection, struktur DataMap/RowType) tidak dipakai lagi untuk flow baru. Bisa tetap ada untuk legacy atau dihapus setelah semua pindah ke sales.
- Jika buat form transaksi baru, buat komponen “Form Nota” + “Tabel Sale Items” yang memetakan ke `POST /api/sales` dan `PUT /api/sales/:id`.

### 7. Status & Chip di Rekap

- Di BE sales, status = `pending` | `paid` | `cancelled`. Sesuaikan tampilan Chip/status di Rekap dan Edit dengan nilai ini (bukan lagi approved/rejected dari sales_reports jika tidak dipakai).

---

## Checklist singkat

- [ ] Type Sale & SaleItem dan payload store/update didefinisikan di FE.
- [ ] Semua panggilan API sales memakai `outlet_id` dan `item_id` (integer dari master).
- [ ] Laporan: form input satu transaksi (nota + items) → `POST /api/sales`.
- [ ] Rekap: `GET /api/sales/periods`, lalu daftar transaksi `GET /api/sales?year=&month=`, link ke Edit per sale.
- [ ] Edit: `GET /api/sales/:id`, form + tabel items, `PUT /api/sales/:id`.
- [ ] Master (outlets/items) di state menyimpan `id` dan dipakai untuk dropdown di form sales.

Setelah ini, FE laporan harian akan selaras dengan struktur BE (sales + sale_items) dan siap dipakai untuk laporan harian berbasis transaksi per nota.
