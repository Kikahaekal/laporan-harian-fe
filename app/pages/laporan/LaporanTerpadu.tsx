import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router";
import {
    Box,
    Tabs,
    Tab,
    Typography,
    Paper,
    Stack,
    CircularProgress,
    Chip,
    Alert,
    IconButton,
    Tooltip,
    Snackbar,
    Card,
    CardContent,
    CardHeader,
    Divider,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    TableContainer,
    TextField,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Badge,
} from "@mui/material";
import StorefrontIcon from "@mui/icons-material/Storefront";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import DeleteIcon from "@mui/icons-material/Delete";
import SaveIcon from "@mui/icons-material/Save";
import EventNoteIcon from "@mui/icons-material/EventNote";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import SummarizeIcon from "@mui/icons-material/Summarize";
import apiBe from "../../lib/axiosBe";

// ─── Constants ────────────────────────────────────────────────────────────────

const DAYS = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];
const MONTHS = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];
const JS_DAY_TO_TAB = [6, 0, 1, 2, 3, 4, 5]; // Sunday=0 → tab 6 (Minggu)

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

interface Sale {
    id: number;
    nota_number: string;
    outlet_id: number;
    user_id: number;
    transaction_date: string;
    status: "DROPPING" | "INVOICED";
    deposit: string | number;
    grand_total: string | number;
    note?: string | null;
    outlet?: { id: number; code: string; name: string };
    user?: { id: number; name: string };
    sale_items?: SaleItem[];
}

interface OutletData {
    id: number;
    code: string;
    name: string;
    visit_day?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtRp(val: string | number | null | undefined) {
    return "Rp " + Number(val || 0).toLocaleString("id-ID");
}
function fmtDate(s: string) {
    if (!s) return "-";
    const d = new Date(s);
    return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}
function buildYears() {
    const y = new Date().getFullYear();
    return [y, y - 1, y - 2];
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
        <>
            <TableContainer>
                <Table size="small">
                    <TableHead>
                        <TableRow sx={{ bgcolor: "warning.50" }}>
                            <TableCell sx={{ fontWeight: 700 }}>Barang</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 700 }}>Dropping</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 700, color: "error.main" }}>Sisa</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 700, color: "info.main" }}>Stok Gudang</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 700 }}>Harga/unit</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {items.map((it) => {
                            const currentQty = editedQty[it.id] ?? it.qty_order;
                            // Sisa = qty_order - (terjual + retur). Saat DROPPING semua 0, jadi = qty_order
                            const sisa = currentQty - (it.qty_sold + it.qty_returned);
                            return (
                                <TableRow key={it.id} hover>
                                    <TableCell>
                                        <Typography variant="body2" fontWeight={600}>{it.item?.name ?? `Item #${it.item_id}`}</Typography>
                                        <Typography variant="caption" color="text.secondary">{it.item?.code}</Typography>
                                    </TableCell>
                                    <TableCell align="center">
                                        <TextField
                                            type="number"
                                            size="small"
                                            value={currentQty}
                                            onChange={(e) => {
                                                const v = parseInt(e.target.value, 10);
                                                onQtyChange(it.id, isNaN(v) || v < 0 ? 0 : v);
                                            }}
                                            inputProps={{ min: 0, style: { width: 56, textAlign: "center" } }}
                                            variant="outlined"
                                        />
                                    </TableCell>
                                    <TableCell align="center">
                                        <Chip
                                            label={sisa}
                                            size="small"
                                            color={sisa > 0 ? "error" : "default"}
                                            variant={sisa > 0 ? "filled" : "outlined"}
                                        />
                                    </TableCell>
                                    <TableCell align="center">
                                        {it.item?.stock !== undefined ? (
                                            <Chip
                                                label={it.item.stock}
                                                size="small"
                                                color={it.item.stock <= 0 ? "error" : it.item.stock <= 10 ? "warning" : "info"}
                                                variant="outlined"
                                            />
                                        ) : (
                                            <Typography variant="caption" color="text.disabled">—</Typography>
                                        )}
                                    </TableCell>
                                    <TableCell align="right">
                                        <Typography variant="body2">{fmtRp(it.price_at_moment)}</Typography>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </TableContainer>
            {/* Total harga dropping */}
            <Stack
                direction="row"
                justifyContent="flex-end"
                sx={{ px: 2, py: 0.75, bgcolor: "warning.50", borderTop: "1px solid", borderColor: "warning.200" }}
            >
                <Typography variant="body2" color="text.secondary" mr={1}>Total Dropping:</Typography>
                <Typography variant="body2" fontWeight={700} color="warning.dark">{fmtRp(total)}</Typography>
            </Stack>
        </>
    );
}

// ─── InvoicedItemTable (read-only) ────────────────────────────────────────────

function InvoicedItemTable({ items }: { items: SaleItem[] }) {
    return (
        <TableContainer>
            <Table size="small">
                <TableHead>
                    <TableRow sx={{ bgcolor: "success.50" }}>
                        <TableCell sx={{ fontWeight: 700 }}>Barang</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 700 }}>Order</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 700 }}>Terjual</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 700 }}>Retur</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 700, color: "error.main" }}>Sisa</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700 }}>Subtotal</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {items.map((it) => {
                        const sisa = it.qty_order - it.qty_sold - it.qty_returned;
                        return (
                            <TableRow key={it.id} hover>
                                <TableCell>
                                    <Typography variant="body2" fontWeight={600}>{it.item?.name ?? `Item #${it.item_id}`}</Typography>
                                    <Typography variant="caption" color="text.secondary">{it.item?.code}</Typography>
                                </TableCell>
                                <TableCell align="center">{it.qty_order}</TableCell>
                                <TableCell align="center">{it.qty_sold}</TableCell>
                                <TableCell align="center">{it.qty_returned}</TableCell>
                                <TableCell align="center">
                                    <Chip
                                        label={sisa}
                                        size="small"
                                        color={sisa > 0 ? "error" : "default"}
                                        variant={sisa > 0 ? "filled" : "outlined"}
                                    />
                                </TableCell>
                                <TableCell align="right">{fmtRp(it.subtotal)}</TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        </TableContainer>
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
    const isDropping = sale.status === "DROPPING";
    const items = sale.sale_items ?? [];

    // Deteksi nota carry-forward (DROPPING dari periode sebelumnya)
    const noteDate = sale.transaction_date ? new Date(sale.transaction_date) : null;
    const isCarryForward =
        isDropping &&
        noteDate !== null &&
        (noteDate.getFullYear() < selectedYear ||
            (noteDate.getFullYear() === selectedYear && noteDate.getMonth() + 1 < selectedMonth));

    // Editable state
    const [deposit, setDeposit] = useState(String(sale.deposit ?? ""));
    const [note, setNote] = useState(sale.note ?? "");
    // Editable qty per item (hanya untuk DROPPING)
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
            // Kirim item qty_order hanya untuk DROPPING
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
        <>
            <Paper
                variant="outlined"
                sx={{
                    mb: 1.5,
                    borderColor: isDropping ? "warning.main" : "success.main",
                    borderWidth: 1.5,
                    overflow: "hidden",
                }}
            >
                {/* ── Header nota ── */}
                <Stack
                    direction="row"
                    alignItems="center"
                    spacing={1.5}
                    sx={{
                        px: 2, py: 1,
                        bgcolor: isDropping ? "warning.50" : "success.50",
                        borderBottom: "1px solid",
                        borderColor: isDropping ? "warning.200" : "success.200",
                    }}
                >
                    <ReceiptLongIcon fontSize="small" color={isDropping ? "warning" : "success"} />
                    <Typography variant="body2" fontWeight={700} color={isDropping ? "warning.dark" : "success.dark"}>
                        {sale.nota_number}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">{fmtDate(sale.transaction_date)}</Typography>
                    <Chip
                        label={sale.status}
                        size="small"
                        color={isDropping ? "warning" : "success"}
                        sx={{ fontWeight: 700, fontSize: "0.7rem" }}
                    />
                    {/* Badge carry-forward jika dari bulan sebelumnya */}
                    {isCarryForward && (
                        <Chip
                            label={`Lanjutan ${MONTHS[(noteDate?.getMonth() ?? 0)]} ${noteDate?.getFullYear()}`}
                            size="small"
                            color="error"
                            variant="outlined"
                            sx={{ fontSize: "0.65rem", fontWeight: 700 }}
                        />
                    )}
                    {sale.user && (
                        <Typography variant="caption" color="text.secondary" sx={{ ml: "auto !important" }}>
                            Sales: {sale.user.name}
                        </Typography>
                    )}
                    {isDropping && (
                        <Tooltip title="Hapus Nota" placement="top">
                            <IconButton size="small" color="error" onClick={() => setDeleteOpen(true)}>
                                <DeleteIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    )}
                </Stack>

                {/* ── Item table ── */}
                <Box>
                    {isDropping ? (
                        <DroppingItemTable
                            items={items}
                            editedQty={editedQty}
                            onQtyChange={handleQtyChange}
                        />
                    ) : (
                        <InvoicedItemTable items={items} />
                    )}
                </Box>

                {/* ── Footer ── */}
                <Box
                    sx={{
                        px: 2, py: 1.5,
                        bgcolor: "grey.50",
                        borderTop: "1px solid",
                        borderColor: "divider",
                    }}
                >
                    {isDropping ? (
                        // DROPPING: editable deposit + note + simpan
                        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems="flex-end">
                            {/* <TextField
                                label="Deposit (Rp)"
                                size="small"
                                type="number"
                                value={deposit}
                                onChange={(e) => setDeposit(e.target.value)}
                                sx={{ width: 180 }}
                                inputProps={{ min: 0 }}
                            /> */}
                            <TextField
                                label="Catatan"
                                size="small"
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                sx={{ flex: 1 }}
                                placeholder="Tambahkan catatan..."
                            />
                            <Button
                                variant="contained"
                                size="small"
                                color="warning"
                                startIcon={saving ? <CircularProgress size={14} color="inherit" /> : <SaveIcon />}
                                onClick={handleSave}
                                disabled={saving}
                                sx={{ whiteSpace: "nowrap" }}
                            >
                                Simpan
                            </Button>
                        </Stack>
                    ) : (
                        // INVOICED: Deposit | Total sejajar, catatan di bawah
                        <Stack spacing={0.5}>
                            <Stack direction="row" spacing={3} alignItems="center">
                                <Stack direction="row" spacing={0.75} alignItems="baseline">
                                    <Typography variant="body2" color="text.secondary">Deposit:</Typography>
                                    <Typography variant="body1" fontWeight={700} color="success.dark">
                                        {fmtRp(sale.deposit)}
                                    </Typography>
                                </Stack>
                                <Stack direction="row" spacing={0.75} alignItems="baseline">
                                    <Typography variant="body2" color="text.secondary">Total:</Typography>
                                    <Typography variant="body1" fontWeight={700}>
                                        {fmtRp(sale.grand_total)}
                                    </Typography>
                                </Stack>
                            </Stack>
                            {sale.note && (
                                <Stack direction="row" spacing={0.75} alignItems="center">
                                    <Typography variant="caption" color="text.secondary">Catatan:</Typography>
                                    <Typography variant="body2" fontStyle="italic" color="text.secondary">
                                        {sale.note}
                                    </Typography>
                                </Stack>
                            )}
                        </Stack>
                    )}
                </Box>
            </Paper>

            {/* Delete confirm */}
            <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)} maxWidth="xs">
                <DialogTitle>Hapus Nota?</DialogTitle>
                <DialogContent>
                    <Typography>Nota <strong>{sale.nota_number}</strong> akan dihapus permanen. Yakin?</Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteOpen(false)} color="inherit">Batal</Button>
                    <Button onClick={handleDelete} color="error" variant="contained" disabled={deleting}>
                        {deleting ? "Menghapus..." : "Hapus"}
                    </Button>
                </DialogActions>
            </Dialog>

            <Snackbar
                open={snack.open}
                autoHideDuration={3000}
                onClose={() => setSnack((s) => ({ ...s, open: false }))}
                anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
            >
                <Alert severity={snack.sev} onClose={() => setSnack((s) => ({ ...s, open: false }))}>
                    {snack.msg}
                </Alert>
            </Snackbar>
        </>
    );
}

// ─── OutletCard ───────────────────────────────────────────────────────────────

function OutletCard({
    outlet,
    sales,
    onSaleUpdated,
    onSaleDeleted,
    selectedMonth,
    selectedYear,
}: {
    outlet: OutletData;
    sales: Sale[];
    onSaleUpdated: (updated: Sale) => void;
    onSaleDeleted: (id: number) => void;
    selectedMonth: number;
    selectedYear: number;
}) {
    const dropping = sales.filter((s) => s.status === "DROPPING");
    const invoiced = sales.filter((s) => s.status === "INVOICED");

    return (
        <Card variant="outlined" sx={{ mb: 2, borderRadius: 2 }}>
            <CardHeader
                avatar={<StorefrontIcon color="primary" />}
                title={
                    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                        <Typography variant="subtitle1" fontWeight={700}>{outlet.name}</Typography>
                        <Chip label={outlet.code} size="small" variant="outlined" sx={{ fontSize: "0.7rem" }} />
                        {outlet.visit_day && (
                            <Chip label={outlet.visit_day} size="small" color="primary" sx={{ fontSize: "0.7rem" }} />
                        )}
                    </Stack>
                }
                subheader={
                    <Stack direction="row" spacing={1} mt={0.25}>
                        {dropping.length > 0 && (
                            <Chip label={`${dropping.length} DROPPING`} size="small" color="warning" variant="outlined" />
                        )}
                        {invoiced.length > 0 && (
                            <Chip label={`${invoiced.length} INVOICED`} size="small" color="success" variant="outlined" />
                        )}
                        {sales.length === 0 && (
                            <Chip label="Belum ada transaksi" size="small" variant="outlined" />
                        )}
                    </Stack>
                }
                sx={{ pb: 0.5 }}
            />
            <Divider />
            <CardContent sx={{ pt: 1 }}>
                {sales.length === 0 ? (
                    <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
                        Tidak ada nota untuk outlet ini di periode yang dipilih.
                    </Typography>
                ) : (
                    <>
                        {dropping.map((s) => (
                            <NotaCard
                                key={s.id}
                                sale={s}
                                onSaved={onSaleUpdated}
                                onDeleted={onSaleDeleted}
                                selectedMonth={selectedMonth}
                                selectedYear={selectedYear}
                            />
                        ))}
                        {invoiced.map((s) => (
                            <NotaCard
                                key={s.id}
                                sale={s}
                                onSaved={onSaleUpdated}
                                onDeleted={onSaleDeleted}
                                selectedMonth={selectedMonth}
                                selectedYear={selectedYear}
                            />
                        ))}
                    </>
                )}
            </CardContent>
        </Card>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function LaporanTerpadu() {
    const navigate = useNavigate();
    const now = new Date();
    const todayTabIdx = JS_DAY_TO_TAB[now.getDay()];

    const [dayTab, setDayTab] = useState<number>(todayTabIdx);
    const [month, setMonth] = useState<number>(now.getMonth() + 1);
    const [year, setYear] = useState<number>(now.getFullYear());
    // 0 = semua minggu, 1-4 = filter per minggu
    const [week, setWeek] = useState<number>(0);

    const [outlets, setOutlets] = useState<OutletData[]>([]);
    const [salesMap, setSalesMap] = useState<Record<number, Sale[]>>({});
    const [loading, setLoading] = useState(false);
    const [loadingOutlets, setLoadingOutlets] = useState(false);

    const selectedDay = DAYS[dayTab];

    // Hitung range tanggal berdasarkan bulan/tahun/minggu yang dipilih
    const weekDateRange = (): { from: string; to: string } => {
        const pad = (n: number) => String(n).padStart(2, "0");
        const lastDay = new Date(year, month, 0).getDate(); // jumlah hari di bulan
        if (week === 0) {
            // Semua minggu
            return {
                from: `${year}-${pad(month)}-01`,
                to: `${year}-${pad(month)}-${pad(lastDay)}`,
            };
        }
        // Minggu 1-4: hari 1-7, 8-14, 15-21, 22-akhir
        const starts = [1, 8, 15, 22];
        const ends = [7, 14, 21, lastDay];
        const startDay = starts[week - 1];
        const endDay = Math.min(ends[week - 1], lastDay);
        return {
            from: `${year}-${pad(month)}-${pad(startDay)}`,
            to: `${year}-${pad(month)}-${pad(endDay)}`,
        };
    };
    const { from: fromDate, to: toDate } = weekDateRange();

    // ── Fetch outlets per hari ────────────────────────────────────────────────
    const fetchOutlets = useCallback(async () => {
        setLoadingOutlets(true);
        setOutlets([]);
        setSalesMap({});
        try {
            const res = await apiBe.get(`/api/web/outlets`, { params: { visit_day: selectedDay } });
            setOutlets(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            console.error("Gagal load outlets", err);
        } finally {
            setLoadingOutlets(false);
        }
    }, [selectedDay]);

    // ── Fetch sales per outlet: DROPPING tanpa filter tanggal (carry-forward),
    //    INVOICED hanya bulan yang dipilih
    const fetchSales = useCallback(async (outletList: OutletData[]) => {
        if (outletList.length === 0) return;
        setLoading(true);
        try {
            const results = await Promise.all(
                outletList.map(async (o) => {
                    try {
                        // Query 1: semua DROPPING aktif (tidak ada filter tanggal)
                        const droppingRes = await apiBe.get(`/api/web/sales`, {
                            params: { outlet_id: o.id, status: "DROPPING", per_page: 100 },
                        });
                        const droppingSales: Sale[] = droppingRes.data?.data ?? [];

                        // Query 2: INVOICED bulan ini saja
                        const invoicedRes = await apiBe.get(`/api/web/sales`, {
                            params: {
                                outlet_id: o.id,
                                status: "INVOICED",
                                from: fromDate,
                                to: toDate,
                                per_page: 100,
                            },
                        });
                        const invoicedSales: Sale[] = invoicedRes.data?.data ?? [];

                        return { outlet_id: o.id, sales: [...droppingSales, ...invoicedSales] };
                    } catch {
                        return { outlet_id: o.id, sales: [] };
                    }
                })
            );
            const map: Record<number, Sale[]> = {};
            results.forEach(({ outlet_id, sales }) => { map[outlet_id] = sales; });
            setSalesMap(map);
        } catch (err) {
            console.error("Gagal load sales", err);
        } finally {
            setLoading(false);
        }
    }, [fromDate, toDate]);

    useEffect(() => { fetchOutlets(); }, [fetchOutlets]);
    useEffect(() => { if (outlets.length > 0) fetchSales(outlets); }, [outlets, fetchSales]);

    // ── Handlers ─────────────────────────────────────────────────────────────
    const handleSaleUpdated = (updated: Sale) => {
        setSalesMap((prev) => {
            const existing = prev[updated.outlet_id] ?? [];
            return { ...prev, [updated.outlet_id]: existing.map((s) => (s.id === updated.id ? updated : s)) };
        });
    };

    const handleSaleDeleted = (saleId: number) => {
        setSalesMap((prev) => {
            const next = { ...prev };
            for (const key of Object.keys(next)) {
                next[Number(key)] = next[Number(key)].filter((s) => s.id !== saleId);
            }
            return next;
        });
    };

    const allSales = Object.values(salesMap).flat();
    const countDropping = allSales.filter((s) => s.status === "DROPPING").length;
    const countInvoiced = allSales.filter((s) => s.status === "INVOICED").length;

    return (
        <Box sx={{ p: { xs: 1.5, md: 2 }, maxWidth: 1100, mx: "auto" }}>
            {/* ── Page Header ── */}
            <Stack direction="row" alignItems="center" spacing={1.5} mb={2} flexWrap="wrap">
                <EventNoteIcon color="primary" fontSize="large" />
                <Box sx={{ flex: 1 }}>
                    <Typography variant="h6" fontWeight={700}>Monitor Nota</Typography>
                    <Typography variant="caption" color="text.secondary">
                        Pantau dan kelola nota dropping &amp; invoice per hari kunjungan
                    </Typography>
                </Box>
                <Button
                    variant="outlined"
                    startIcon={<SummarizeIcon />}
                    onClick={() => navigate(`/rekap-be?month=${month}&year=${year}`)}
                    size="small"
                >
                    Rekap Bulanan
                </Button>
            </Stack>

            {/* ── Filter Bulan + Tahun ── */}
            <Paper variant="outlined" sx={{ px: 2, py: 1.5, mb: 2 }}>
                <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
                    <CalendarMonthIcon color="action" fontSize="small" />
                    <FormControl size="small" sx={{ minWidth: 140 }}>
                        <InputLabel>Bulan</InputLabel>
                        <Select label="Bulan" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
                            {MONTHS.map((nama, i) => (
                                <MenuItem key={i} value={i + 1}>{nama}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <FormControl size="small" sx={{ minWidth: 100 }}>
                        <InputLabel>Tahun</InputLabel>
                        <Select label="Tahun" value={year} onChange={(e) => setYear(Number(e.target.value))}>
                            {buildYears().map((y) => (
                                <MenuItem key={y} value={y}>{y}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <FormControl size="small" sx={{ minWidth: 130 }}>
                        <InputLabel>Minggu</InputLabel>
                        <Select label="Minggu" value={week} onChange={(e) => setWeek(Number(e.target.value))}>
                            <MenuItem value={0}>Semua Minggu</MenuItem>
                            <MenuItem value={1}>Minggu 1 (tgl 1–7)</MenuItem>
                            <MenuItem value={2}>Minggu 2 (tgl 8–14)</MenuItem>
                            <MenuItem value={3}>Minggu 3 (tgl 15–21)</MenuItem>
                            <MenuItem value={4}>Minggu 4 (tgl 22–akhir)</MenuItem>
                        </Select>
                    </FormControl>
                    <Box sx={{ flex: 1 }} />
                    {!loading && !loadingOutlets && (
                        <Stack direction="row" spacing={1}>
                            <Chip icon={<StorefrontIcon fontSize="small" />} label={`${outlets.length} outlet`} size="small" variant="outlined" />
                            {countDropping > 0 && <Chip label={`${countDropping} DROPPING`} size="small" color="warning" />}
                            {countInvoiced > 0 && (
                                <Chip icon={<CheckCircleIcon fontSize="small" />} label={`${countInvoiced} INVOICED`} size="small" color="success" />
                            )}
                        </Stack>
                    )}
                </Stack>
            </Paper>

            {/* ── Day Tabs ── */}
            <Paper variant="outlined" sx={{ mb: 2, overflow: "hidden" }}>
                <Tabs
                    value={dayTab}
                    onChange={(_, v) => setDayTab(v)}
                    variant="scrollable"
                    scrollButtons="auto"
                    sx={{ borderBottom: 1, borderColor: "divider", minHeight: 44 }}
                >
                    {DAYS.map((d, i) => {
                        const isSelected = i === dayTab;
                        const cnt = isSelected ? outlets.length : undefined;
                        return (
                            <Tab
                                key={d}
                                label={
                                    cnt !== undefined && cnt > 0 ? (
                                        <Badge badgeContent={cnt} color="primary" sx={{ pr: 1 }}>{d}</Badge>
                                    ) : d
                                }
                                sx={{ fontWeight: 700, minHeight: 44, py: 1 }}
                            />
                        );
                    })}
                </Tabs>
                <Stack
                    direction="row"
                    spacing={1}
                    alignItems="center"
                    sx={{ px: 2, py: 1, bgcolor: "primary.50", borderBottom: "1px solid", borderColor: "divider" }}
                >
                    <Typography variant="caption" fontWeight={600} color="primary.main">
                        Hari Kunjungan: {selectedDay}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                        — {week > 0 ? `Minggu ${week} · ` : ""}{MONTHS[month - 1]} {year}
                    </Typography>
                    {(loading || loadingOutlets) && <CircularProgress size={14} sx={{ ml: 1 }} />}
                </Stack>
            </Paper>

            {/* ── Content ── */}
            {loadingOutlets ? (
                <Box sx={{ textAlign: "center", py: 6 }}>
                    <CircularProgress />
                    <Typography variant="body2" color="text.secondary" mt={2}>
                        Memuat outlet hari {selectedDay}...
                    </Typography>
                </Box>
            ) : outlets.length === 0 ? (
                <Paper variant="outlined" sx={{ textAlign: "center", py: 6, px: 2 }}>
                    <StorefrontIcon fontSize="large" color="disabled" />
                    <Typography variant="body1" color="text.secondary" mt={1}>
                        Tidak ada outlet dengan jadwal kunjungan <strong>{selectedDay}</strong>.
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                        Atur hari kunjungan outlet di menu Data Outlet.
                    </Typography>
                </Paper>
            ) : (
                <Box>
                    {loading && <Alert severity="info" sx={{ mb: 2 }}>Memuat data nota...</Alert>}
                    {outlets.map((outlet) => (
                        <OutletCard
                            key={outlet.id}
                            outlet={outlet}
                            sales={salesMap[outlet.id] ?? []}
                            onSaleUpdated={handleSaleUpdated}
                            onSaleDeleted={handleSaleDeleted}
                            selectedMonth={month}
                            selectedYear={year}
                        />
                    ))}
                </Box>
            )}
        </Box>
    );
}
