import { useState, useEffect, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router";
import {
    Box, Typography, Tabs, Tab, FormControl, InputLabel, Select, MenuItem,
    Stack, Paper, CircularProgress, Alert, Button, Chip, Divider,
    Table, TableHead, TableRow, TableCell, TableBody, TableContainer,
    Accordion, AccordionSummary, AccordionDetails, Card, CardContent,
    IconButton, Tooltip, Grid,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import StorefrontIcon from "@mui/icons-material/Storefront";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import CategoryIcon from "@mui/icons-material/Category";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import CalendarViewWeekIcon from "@mui/icons-material/CalendarViewWeek";
import apiBe from "../../lib/axiosBe";
import { MONTHS } from "../data/constant";
import { type Sale } from "../data/constant";
import { TableRowsSkeleton, CardsSkeleton } from "../../components/TableSkeleton";

// ─── Types ───────────────────────────────────────────────────────────────────

interface SaleItemDetail {
    id: number;
    item_id: number;
    qty_order: number;
    qty_sold: number;
    qty_returned: number;
    qty_expired: number;
    price_at_moment: number | string;
    subtotal: number | string;
    item?: { id: number; code: string; name: string };
}

interface SaleWithItems extends Sale {
    saleItems?: SaleItemDetail[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const DAYS_ID = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];
const DAY_JS = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

function fmtRupiah(val: string | number) { return Number(val || 0).toLocaleString("id-ID"); }
function fmtDate(s: string) {
    if (!s) return "-";
    const d = new Date(s);
    return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}
function weekOfMonth(s: string) { return Math.ceil(new Date(s).getDate() / 7); }
function dayName(s: string) { return DAY_JS[new Date(s).getDay()]; }
function pad2(n: number) { return String(n).padStart(2, "0"); }
function buildYears(): number[] {
    const y = new Date().getFullYear();
    return [y, y - 1, y - 2, y - 3];
}

// ─── Stat Card ───────────────────────────────────────────────────────────────

function StatCard({ icon, label, value, color = "#1976d2", sub }: {
    icon: React.ReactNode; label: string; value: string | number; color?: string; sub?: string;
}) {
    return (
        <Card variant="outlined" sx={{ flex: "1 1 140px" }}>
            <CardContent sx={{ py: "10px !important", px: 2 }}>
                <Stack direction="row" alignItems="center" spacing={0.5} mb={0.25}>
                    {icon}
                    <Typography variant="caption" color="text.secondary" fontWeight={600}>{label}</Typography>
                </Stack>
                <Typography variant="h6" fontWeight="bold" color={color} lineHeight={1.2}>{value}</Typography>
                {sub && <Typography variant="caption" color="text.secondary">{sub}</Typography>}
            </CardContent>
        </Card>
    );
}

// ─── Per-day tab panel ────────────────────────────────────────────────────────

function DayPanel({ value, index, children }: { value: number; index: number; children: React.ReactNode }) {
    if (value !== index) return null;
    return <Box sx={{ mt: 1 }}>{children}</Box>;
}

// ──────────────────────────────────────────────────────────────────────────────

export default function RekapBeDetail() {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();

    const now = new Date();
    const initYear = Number(searchParams.get("year")) || now.getFullYear();
    const initMonth = Number(searchParams.get("month")) || (now.getMonth() + 1);

    // Selector
    const [selectedYear, setSelectedYear] = useState(initYear);
    const [selectedMonth, setSelectedMonth] = useState(initMonth);

    // Main tab: 0 = Ringkasan, 1 = Per Hari
    const [mainTab, setMainTab] = useState(0);

    // Per-hari state
    const [dayTab, setDayTab] = useState(0);
    const [weekFilter, setWeekFilter] = useState(0);

    // Data
    const [isLoading, setIsLoading] = useState(false);
    const [allNotas, setAllNotas] = useState<SaleWithItems[]>([]);
    const [error, setError] = useState<string | null>(null);

    const lastDay = new Date(selectedYear, selectedMonth, 0).getDate();

    // Sync URL
    useEffect(() => {
        setSearchParams({ year: String(selectedYear), month: String(selectedMonth) }, { replace: true });
    }, [selectedYear, selectedMonth]);

    // Fetch
    useEffect(() => {
        const ctrl = new AbortController();
        const fetch = async () => {
            setIsLoading(true); setError(null); setAllNotas([]);
            try {
                const from = `${selectedYear}-${pad2(selectedMonth)}-01`;
                const to = `${selectedYear}-${pad2(selectedMonth)}-${pad2(lastDay)}`;
                const res = await apiBe.get("/api/web/sales", {
                    params: { from, to, per_page: 1000 },
                    signal: ctrl.signal,
                });
                const raw = res.data;
                const list: SaleWithItems[] =
                    Array.isArray(raw) ? raw :
                        Array.isArray(raw?.data) ? raw.data : [];
                setAllNotas(list);
            } catch (err: any) {
                if (err.name !== "CanceledError")
                    setError("Gagal memuat data. Pastikan server laporan-be berjalan.");
            } finally { setIsLoading(false); }
        };
        fetch();
        return () => ctrl.abort();
    }, [selectedYear, selectedMonth]);

    // ── Agregasi: Ringkasan ──────────────────────────────────────────────────

    const summary = useMemo(() => ({
        total: allNotas.length,
        invoiced: allNotas.filter((n) => n.status === "INVOICED").length,
        dropping: allNotas.filter((n) => n.status === "DROPPING").length,
        grandTotal: allNotas.reduce((s, n) => s + Number(n.grand_total || 0), 0),
        deposit: allNotas.reduce((s, n) => s + Number(n.deposit || 0), 0),
        outletCount: new Set(allNotas.map((n) => n.outlet_id)).size,
    }), [allNotas]);

    // Per-outlet
    const perOutlet = useMemo(() => {
        const map = new Map<number, { code: string; name: string; nota: number; grand: number; deposit: number }>();
        allNotas.forEach((n) => {
            const key = n.outlet_id;
            const prev = map.get(key) ?? { code: n.outlet?.code ?? "", name: n.outlet?.name ?? `#${key}`, nota: 0, grand: 0, deposit: 0 };
            map.set(key, { ...prev, nota: prev.nota + 1, grand: prev.grand + Number(n.grand_total || 0), deposit: prev.deposit + Number(n.deposit || 0) });
        });
        return Array.from(map.values()).sort((a, b) => b.grand - a.grand);
    }, [allNotas]);

    // Per-item
    const perItem = useMemo(() => {
        const map = new Map<number, { code: string; name: string; qtyOrder: number; qtySold: number; qtyRetur: number; qtyExpired: number; subtotal: number }>();
        allNotas.forEach((n) => {
            (n.saleItems ?? []).forEach((si) => {
                const key = si.item_id;
                const prev = map.get(key) ?? { code: si.item?.code ?? "", name: si.item?.name ?? `#${key}`, qtyOrder: 0, qtySold: 0, qtyRetur: 0, qtyExpired: 0, subtotal: 0 };
                map.set(key, {
                    ...prev,
                    qtyOrder: prev.qtyOrder + (si.qty_order || 0),
                    qtySold: prev.qtySold + (si.qty_sold || 0),
                    qtyRetur: prev.qtyRetur + (si.qty_returned || 0),
                    qtyExpired: prev.qtyExpired + (si.qty_expired || 0),
                    subtotal: prev.subtotal + Number(si.subtotal || 0),
                });
            });
        });
        return Array.from(map.values()).sort((a, b) => b.subtotal - a.subtotal);
    }, [allNotas]);

    // Per-minggu
    const perWeek = useMemo(() => {
        const map = new Map<number, { nota: number; grand: number; deposit: number; invoiced: number }>();
        allNotas.forEach((n) => {
            const w = weekOfMonth(n.transaction_date);
            const prev = map.get(w) ?? { nota: 0, grand: 0, deposit: 0, invoiced: 0 };
            map.set(w, {
                nota: prev.nota + 1,
                grand: prev.grand + Number(n.grand_total || 0),
                deposit: prev.deposit + Number(n.deposit || 0),
                invoiced: prev.invoiced + (n.status === "INVOICED" ? 1 : 0),
            });
        });
        return Array.from(map.entries()).sort((a, b) => a[0] - b[0]);
    }, [allNotas]);

    // Per-hari filtered
    const weekFiltered = useMemo(() => weekFilter === 0 ? allNotas : allNotas.filter((n) => weekOfMonth(n.transaction_date) === weekFilter), [allNotas, weekFilter]);
    const currentDay = DAYS_ID[dayTab];
    const dayNotas = useMemo(() => weekFiltered.filter((n) => dayName(n.transaction_date) === currentDay), [weekFiltered, currentDay]);
    const dayCountMap = useMemo(() => {
        const m: Record<string, number> = {};
        DAYS_ID.forEach((d) => { m[d] = weekFiltered.filter((n) => dayName(n.transaction_date) === d).length; });
        return m;
    }, [weekFiltered]);
    const weeksInDay = useMemo(() => Array.from(new Set(dayNotas.map((n) => weekOfMonth(n.transaction_date)))).sort((a, b) => a - b), [dayNotas]);

    return (
        <Box sx={{ p: 2, maxWidth: 1150, margin: "0 auto" }}>
            <Button startIcon={<ArrowBackIcon />} onClick={() => navigate("/rekap-be")} sx={{ mb: 1.5 }}>
                Kembali
            </Button>

            {/* ── Periode Selector ── */}
            <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                <Typography variant="subtitle2" color="text.secondary" mb={1} fontWeight={600}>Periode</Typography>
                <Stack direction="row" spacing={2} flexWrap="wrap" alignItems="center">
                    <FormControl size="small" sx={{ minWidth: 150 }}>
                        <InputLabel>Bulan</InputLabel>
                        <Select label="Bulan" value={selectedMonth} onChange={(e) => { setSelectedMonth(Number(e.target.value)); setWeekFilter(0); }}>
                            {MONTHS.map((name, idx) => <MenuItem key={idx + 1} value={idx + 1}>{name}</MenuItem>)}
                        </Select>
                    </FormControl>
                    <FormControl size="small" sx={{ minWidth: 110 }}>
                        <InputLabel>Tahun</InputLabel>
                        <Select label="Tahun" value={selectedYear} onChange={(e) => { setSelectedYear(Number(e.target.value)); setWeekFilter(0); }}>
                            {buildYears().map((y) => <MenuItem key={y} value={y}>{y}</MenuItem>)}
                        </Select>
                    </FormControl>
                    {!isLoading && allNotas.length > 0 && (
                        <Chip label={`${allNotas.length} nota bulan ini`} size="small" variant="outlined" color="primary" />
                    )}
                </Stack>
                <Typography variant="caption" color="text.secondary" mt={1} display="block">
                    Rekap <strong>{MONTHS[selectedMonth - 1]} {selectedYear}</strong> — semua nota dari aplikasi Android.
                </Typography>
            </Paper>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            {isLoading ? (
                <Box sx={{ p: 2 }}>
                    <CardsSkeleton count={6} />
                    <Box sx={{ mt: 3 }}>
                        <TableRowsSkeleton rows={4} cols={7} />
                    </Box>
                </Box>
            ) : allNotas.length === 0 && !isLoading ? (
                <Alert severity="info">Tidak ada data untuk {MONTHS[selectedMonth - 1]} {selectedYear}.</Alert>
            ) : (
                <Paper variant="outlined" sx={{ overflow: "hidden" }}>
                    {/* Main Tabs */}
                    <Tabs
                        value={mainTab}
                        onChange={(_, v) => setMainTab(v)}
                        sx={{ borderBottom: 1, borderColor: "divider", bgcolor: "grey.50" }}
                    >
                        <Tab label="📊 Ringkasan Bulanan" sx={{ fontWeight: 600 }} />
                        <Tab label="📅 Per Hari" sx={{ fontWeight: 600 }} />
                    </Tabs>

                    {/* ══════════════ TAB 0: RINGKASAN BULANAN ══════════════ */}
                    {mainTab === 0 && (
                        <Box sx={{ p: 2 }}>
                            {/* Summary Cards */}
                            <Stack direction="row" spacing={1.5} mb={3} flexWrap="wrap">
                                <StatCard icon={<ReceiptLongIcon fontSize="small" color="action" />} label="Total Nota" value={summary.total} />
                                <StatCard icon={<CheckCircleIcon fontSize="small" color="success" />} label="Invoiced" value={summary.invoiced} color="#2e7d32" />
                                <StatCard icon={<LocalShippingIcon fontSize="small" color="warning" />} label="Dropping Aktif" value={summary.dropping} color="#ed6c02" />
                                <StatCard icon={<AttachMoneyIcon fontSize="small" color="info" />} label="Total Grand Total" value={`Rp ${fmtRupiah(summary.grandTotal)}`} color="#0288d1" />
                                <StatCard icon={<AttachMoneyIcon fontSize="small" color="action" />} label="Total Deposit" value={`Rp ${fmtRupiah(summary.deposit)}`} sub={`Sisa: Rp ${fmtRupiah(summary.grandTotal - summary.deposit)}`} />
                                <StatCard icon={<StorefrontIcon fontSize="small" color="action" />} label="Outlet Unik" value={summary.outletCount} />
                            </Stack>

                            {/* Per-Minggu */}
                            <Typography variant="subtitle1" fontWeight={700} mb={1} sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                                <CalendarViewWeekIcon fontSize="small" /> Rekap Per Minggu
                            </Typography>
                            <TableContainer component={Paper} variant="outlined" sx={{ mb: 3 }}>
                                <Table size="small">
                                    <TableHead sx={{ bgcolor: "primary.main" }}>
                                        <TableRow>
                                            <TableCell sx={{ color: "white", fontWeight: 600 }}>Minggu</TableCell>
                                            <TableCell sx={{ color: "white", fontWeight: 600 }}>Periode Tanggal</TableCell>
                                            <TableCell sx={{ color: "white", fontWeight: 600 }} align="center">Jumlah Nota</TableCell>
                                            <TableCell sx={{ color: "white", fontWeight: 600 }} align="center">Invoiced</TableCell>
                                            <TableCell sx={{ color: "white", fontWeight: 600 }} align="right">Grand Total</TableCell>
                                            <TableCell sx={{ color: "white", fontWeight: 600 }} align="right">Deposit</TableCell>
                                            <TableCell sx={{ color: "white", fontWeight: 600 }} align="right">Sisa</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {perWeek.map(([w, d]) => {
                                            const wStart = (w - 1) * 7 + 1;
                                            const wEnd = Math.min(w * 7, lastDay);
                                            const sisa = d.grand - d.deposit;
                                            return (
                                                <TableRow key={w} hover>
                                                    <TableCell><Chip label={`Minggu ${w}`} size="small" variant="outlined" /></TableCell>
                                                    <TableCell sx={{ color: "text.secondary", fontSize: "0.8rem" }}>{wStart}–{wEnd} {MONTHS[selectedMonth - 1]}</TableCell>
                                                    <TableCell align="center">{d.nota}</TableCell>
                                                    <TableCell align="center">
                                                        <Chip label={d.invoiced} size="small" color="success" variant="outlined" />
                                                    </TableCell>
                                                    <TableCell align="right" sx={{ fontWeight: 500 }}>Rp {fmtRupiah(d.grand)}</TableCell>
                                                    <TableCell align="right">Rp {fmtRupiah(d.deposit)}</TableCell>
                                                    <TableCell align="right">
                                                        {sisa > 0
                                                            ? <Typography variant="body2" color="error.main" fontWeight={600}>Rp {fmtRupiah(sisa)}</Typography>
                                                            : <Typography variant="body2" color="success.main">—</Typography>}
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                        {/* Total row */}
                                        <TableRow sx={{ bgcolor: "grey.100" }}>
                                            <TableCell colSpan={2} sx={{ fontWeight: 700 }}>TOTAL BULAN</TableCell>
                                            <TableCell align="center" sx={{ fontWeight: 700 }}>{summary.total}</TableCell>
                                            <TableCell align="center" sx={{ fontWeight: 700 }}>{summary.invoiced}</TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 700, color: "primary.main" }}>Rp {fmtRupiah(summary.grandTotal)}</TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 700 }}>Rp {fmtRupiah(summary.deposit)}</TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 700, color: (summary.grandTotal - summary.deposit) > 0 ? "error.main" : "success.main" }}>
                                                {(summary.grandTotal - summary.deposit) > 0 ? `Rp ${fmtRupiah(summary.grandTotal - summary.deposit)}` : "—"}
                                            </TableCell>
                                        </TableRow>
                                    </TableBody>
                                </Table>
                            </TableContainer>

                            {/* Per-Outlet */}
                            <Typography variant="subtitle1" fontWeight={700} mb={1} sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                                <StorefrontIcon fontSize="small" /> Rekap Per Outlet
                            </Typography>
                            <TableContainer component={Paper} variant="outlined" sx={{ mb: 3 }}>
                                <Table size="small">
                                    <TableHead sx={{ bgcolor: "grey.700" }}>
                                        <TableRow>
                                            <TableCell sx={{ color: "white", fontWeight: 600 }}>Kode</TableCell>
                                            <TableCell sx={{ color: "white", fontWeight: 600 }}>Nama Outlet</TableCell>
                                            <TableCell sx={{ color: "white", fontWeight: 600 }} align="center">Nota</TableCell>
                                            <TableCell sx={{ color: "white", fontWeight: 600 }} align="right">Grand Total</TableCell>
                                            <TableCell sx={{ color: "white", fontWeight: 600 }} align="right">Deposit</TableCell>
                                            <TableCell sx={{ color: "white", fontWeight: 600 }} align="right">Sisa</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {perOutlet.map((o, idx) => {
                                            const sisa = o.grand - o.deposit;
                                            return (
                                                <TableRow key={idx} hover sx={{ bgcolor: idx % 2 === 0 ? "inherit" : "grey.50" }}>
                                                    <TableCell sx={{ fontFamily: "monospace", fontWeight: 600, fontSize: "0.8rem" }}>{o.code}</TableCell>
                                                    <TableCell>{o.name}</TableCell>
                                                    <TableCell align="center"><Chip label={o.nota} size="small" variant="outlined" /></TableCell>
                                                    <TableCell align="right">Rp {fmtRupiah(o.grand)}</TableCell>
                                                    <TableCell align="right">Rp {fmtRupiah(o.deposit)}</TableCell>
                                                    <TableCell align="right">
                                                        {sisa > 0
                                                            ? <Typography variant="body2" color="error.main" fontWeight={600}>Rp {fmtRupiah(sisa)}</Typography>
                                                            : <Typography variant="body2" color="success.main">Lunas</Typography>}
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </TableContainer>

                            {/* Per-Item */}
                            <Typography variant="subtitle1" fontWeight={700} mb={1} sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                                <CategoryIcon fontSize="small" /> Rekap Per Barang
                            </Typography>
                            <TableContainer component={Paper} variant="outlined">
                                <Table size="small">
                                    <TableHead sx={{ bgcolor: "secondary.main" }}>
                                        <TableRow>
                                            <TableCell sx={{ color: "white", fontWeight: 600 }}>Kode</TableCell>
                                            <TableCell sx={{ color: "white", fontWeight: 600 }}>Nama Barang</TableCell>
                                            <TableCell sx={{ color: "white", fontWeight: 600 }} align="right">Qty Order</TableCell>
                                            <TableCell sx={{ color: "white", fontWeight: 600 }} align="right">Qty Terjual</TableCell>
                                            <TableCell sx={{ color: "white", fontWeight: 600 }} align="right">Retur</TableCell>
                                            <TableCell sx={{ color: "white", fontWeight: 600 }} align="right">Kadaluarsa</TableCell>
                                            <TableCell sx={{ color: "white", fontWeight: 600 }} align="right">Subtotal</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {perItem.length === 0 ? (
                                            <TableRow><TableCell colSpan={7} align="center" sx={{ py: 3, color: "text.secondary" }}>
                                                Data item tidak tersedia (nota masih berstatus DROPPING).
                                            </TableCell></TableRow>
                                        ) : perItem.map((item, idx) => (
                                            <TableRow key={idx} hover sx={{ bgcolor: idx % 2 === 0 ? "inherit" : "grey.50" }}>
                                                <TableCell sx={{ fontFamily: "monospace", fontWeight: 600, fontSize: "0.8rem" }}>{item.code}</TableCell>
                                                <TableCell>{item.name}</TableCell>
                                                <TableCell align="right">{item.qtyOrder}</TableCell>
                                                <TableCell align="right" sx={{ fontWeight: 600, color: "success.main" }}>{item.qtySold}</TableCell>
                                                <TableCell align="right" sx={{ color: "warning.main" }}>{item.qtyRetur}</TableCell>
                                                <TableCell align="right" sx={{ color: "error.main" }}>{item.qtyExpired}</TableCell>
                                                <TableCell align="right" sx={{ fontWeight: 600 }}>Rp {fmtRupiah(item.subtotal)}</TableCell>
                                            </TableRow>
                                        ))}
                                        {perItem.length > 0 && (
                                            <TableRow sx={{ bgcolor: "grey.100" }}>
                                                <TableCell colSpan={3} sx={{ fontWeight: 700 }}>TOTAL</TableCell>
                                                <TableCell align="right" sx={{ fontWeight: 700 }}>
                                                    {perItem.reduce((s, i) => s + i.qtySold, 0)}
                                                </TableCell>
                                                <TableCell align="right" sx={{ fontWeight: 700 }}>
                                                    {perItem.reduce((s, i) => s + i.qtyRetur, 0)}
                                                </TableCell>
                                                <TableCell align="right" sx={{ fontWeight: 700 }}>
                                                    {perItem.reduce((s, i) => s + i.qtyExpired, 0)}
                                                </TableCell>
                                                <TableCell align="right" sx={{ fontWeight: 700, color: "primary.main" }}>
                                                    Rp {fmtRupiah(perItem.reduce((s, i) => s + i.subtotal, 0))}
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </Box>
                    )}

                    {/* ══════════════ TAB 1: PER HARI ══════════════ */}
                    {mainTab === 1 && (
                        <Box sx={{ p: 0 }}>
                            {/* Filter minggu dalam tab Per Hari */}
                            <Box sx={{ px: 2, py: 1.5, borderBottom: 1, borderColor: "divider", bgcolor: "grey.50" }}>
                                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                                    <Typography variant="body2" color="text.secondary">Filter Minggu:</Typography>
                                    {[0, 1, 2, 3, 4, 5].map((w) => {
                                        const wStart = w === 0 ? null : (w - 1) * 7 + 1;
                                        const wEnd = w === 0 ? null : Math.min(w * 7, lastDay);
                                        return (
                                            <Chip
                                                key={w}
                                                label={w === 0 ? "Semua" : `Minggu ${w} (${wStart}–${wEnd})`}
                                                size="small"
                                                variant={weekFilter === w ? "filled" : "outlined"}
                                                color={weekFilter === w ? "primary" : "default"}
                                                onClick={() => setWeekFilter(w)}
                                                sx={{ cursor: "pointer" }}
                                            />
                                        );
                                    })}
                                    {weekFilter > 0 && (
                                        <Chip label={`${weekFiltered.length} nota`} size="small" color="primary" variant="outlined" />
                                    )}
                                </Stack>
                            </Box>

                            {/* Day Tabs */}
                            <Tabs
                                value={dayTab}
                                onChange={(_, v) => setDayTab(v)}
                                variant="scrollable"
                                scrollButtons="auto"
                                sx={{ borderBottom: 1, borderColor: "divider" }}
                            >
                                {DAYS_ID.map((day) => (
                                    <Tab
                                        key={day}
                                        label={
                                            <Stack direction="row" spacing={0.5} alignItems="center">
                                                <span>{day.toUpperCase()}</span>
                                                {dayCountMap[day] > 0 && (
                                                    <Chip label={dayCountMap[day]} size="small" color="primary" sx={{ height: 18, fontSize: "0.65rem" }} />
                                                )}
                                            </Stack>
                                        }
                                        sx={{ fontWeight: 600 }}
                                    />
                                ))}
                            </Tabs>

                            <Box sx={{ p: 1.5, bgcolor: "grey.50", minHeight: 200 }}>
                                {DAYS_ID.map((day, dayIdx) => (
                                    <DayPanel key={day} value={dayTab} index={dayIdx}>
                                        {dayNotas.length === 0 ? (
                                            <Alert severity="info" sx={{ mt: 1 }}>
                                                Tidak ada nota untuk hari <strong>{day}</strong>
                                                {weekFilter > 0 ? `, Minggu ${weekFilter}` : ""} — {MONTHS[selectedMonth - 1]} {selectedYear}.
                                            </Alert>
                                        ) : (
                                            <Stack spacing={1.5}>
                                                {weeksInDay.map((wn) => {
                                                    const wnNotas = dayNotas.filter((n) => weekOfMonth(n.transaction_date) === wn);
                                                    const wStart = (wn - 1) * 7 + 1;
                                                    const wEnd = Math.min(wn * 7, lastDay);
                                                    const wGrand = wnNotas.reduce((s, n) => s + Number(n.grand_total || 0), 0);
                                                    const wDep = wnNotas.reduce((s, n) => s + Number(n.deposit || 0), 0);
                                                    return (
                                                        <Accordion key={wn} defaultExpanded elevation={0} variant="outlined">
                                                            <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ minHeight: 44, "& .MuiAccordionSummary-content": { my: 0.5 } }}>
                                                                <Stack direction="row" alignItems="center" spacing={1.5} flexWrap="wrap">
                                                                    <Typography variant="subtitle2" fontWeight={600}>
                                                                        Minggu {wn}
                                                                        <Typography component="span" variant="caption" color="text.secondary" ml={0.5}>(tgl {wStart}–{wEnd})</Typography>
                                                                    </Typography>
                                                                    <Chip label={`${wnNotas.length} nota`} size="small" variant="outlined" />
                                                                    <Chip label={`Deposit: Rp ${fmtRupiah(wDep)}`} size="small" color="info" variant="outlined" />
                                                                </Stack>
                                                            </AccordionSummary>
                                                            <AccordionDetails sx={{ pt: 0, px: 1.5, pb: 1.5 }}>
                                                                <TableContainer>
                                                                    <Table size="small">
                                                                        <TableHead>
                                                                            <TableRow sx={{ bgcolor: "grey.100" }}>
                                                                                <TableCell sx={{ fontWeight: 600 }}>No. Nota</TableCell>
                                                                                <TableCell sx={{ fontWeight: 600 }}>Tgl</TableCell>
                                                                                <TableCell sx={{ fontWeight: 600 }}>Outlet</TableCell>
                                                                                <TableCell sx={{ fontWeight: 600 }} align="right">Grand Total</TableCell>
                                                                                <TableCell sx={{ fontWeight: 600 }} align="right">Deposit</TableCell>
                                                                                <TableCell sx={{ fontWeight: 600 }} align="right">Sisa</TableCell>
                                                                                <TableCell sx={{ fontWeight: 600 }} align="center">Status</TableCell>
                                                                                <TableCell sx={{ fontWeight: 600 }} align="center"></TableCell>
                                                                            </TableRow>
                                                                        </TableHead>
                                                                        <TableBody>
                                                                            {wnNotas.map((nota) => {
                                                                                const sisa = Number(nota.grand_total || 0) - Number(nota.deposit || 0);
                                                                                return (
                                                                                    <TableRow key={nota.id} hover>
                                                                                        <TableCell sx={{ fontFamily: "monospace", fontSize: "0.78rem", fontWeight: 600 }}>{nota.nota_number}</TableCell>
                                                                                        <TableCell>{fmtDate(nota.transaction_date)}</TableCell>
                                                                                        <TableCell>
                                                                                            {nota.outlet ? (
                                                                                                <Stack>
                                                                                                    <Typography variant="body2" fontWeight={600}>{nota.outlet.code}</Typography>
                                                                                                    <Typography variant="caption" color="text.secondary">{nota.outlet.name}</Typography>
                                                                                                </Stack>
                                                                                            ) : `#${nota.outlet_id}`}
                                                                                        </TableCell>
                                                                                        <TableCell align="right">{fmtRupiah(nota.grand_total)}</TableCell>
                                                                                        <TableCell align="right">{fmtRupiah(nota.deposit)}</TableCell>
                                                                                        <TableCell align="right">
                                                                                            {sisa > 0 ? <Typography variant="body2" color="error.main" fontWeight={600}>{fmtRupiah(sisa)}</Typography>
                                                                                                : <Typography variant="body2" color="success.main">—</Typography>}
                                                                                        </TableCell>
                                                                                        <TableCell align="center">
                                                                                            <Chip label={nota.status} size="small" color={nota.status === "INVOICED" ? "success" : "warning"} sx={{ fontSize: "0.7rem" }} />
                                                                                        </TableCell>
                                                                                        <TableCell align="center">
                                                                                            <Tooltip title="Detail nota">
                                                                                                <IconButton size="small" onClick={() => navigate(`/monitoring/${nota.id}`)}>
                                                                                                    <OpenInNewIcon fontSize="small" />
                                                                                                </IconButton>
                                                                                            </Tooltip>
                                                                                        </TableCell>
                                                                                    </TableRow>
                                                                                );
                                                                            })}
                                                                            <TableRow sx={{ bgcolor: "grey.50" }}>
                                                                                <TableCell colSpan={3} sx={{ fontWeight: 700, fontSize: "0.75rem" }}>TOTAL MINGGU {wn}</TableCell>
                                                                                <TableCell align="right" sx={{ fontWeight: 700 }}>Rp {fmtRupiah(wGrand)}</TableCell>
                                                                                <TableCell align="right" sx={{ fontWeight: 700 }}>Rp {fmtRupiah(wDep)}</TableCell>
                                                                                <TableCell colSpan={3} />
                                                                            </TableRow>
                                                                        </TableBody>
                                                                    </Table>
                                                                </TableContainer>
                                                            </AccordionDetails>
                                                        </Accordion>
                                                    );
                                                })}
                                            </Stack>
                                        )}
                                    </DayPanel>
                                ))}
                            </Box>
                        </Box>
                    )}
                </Paper>
            )}
        </Box>
    );
}
