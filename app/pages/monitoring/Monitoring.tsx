import { useState, useEffect, useMemo } from "react";
import {
    Box, Typography, Stack, Paper, Table, TableHead, TableRow, TableCell,
    TableBody, TableContainer, Chip, Alert, Button,
    FormControl, InputLabel, Select, MenuItem, Divider, IconButton, Tooltip,
    Dialog, DialogTitle, DialogContent, DialogActions,
    Snackbar, Tabs, Tab, Card, CardContent, Badge,
} from "@mui/material";
import { TableRowsSkeleton, CardsSkeleton } from "../../components/TableSkeleton";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import CategoryIcon from "@mui/icons-material/Category";
import BarChartIcon from "@mui/icons-material/BarChart";
import { useNavigate } from "react-router";
import apiBe from "../../lib/axiosBe";
import { MONTHS, type Sale } from "../data/constant";

// ─── Types ───────────────────────────────────────────────────────────────────

interface SaleItem {
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

interface SaleFull extends Sale {
    saleItems?: SaleItem[];
}

// ─── Constants ───────────────────────────────────────────────────────────────

const DAYS_ID = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];
const DAY_JS_TO_ID = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtRupiah(val: string | number) { return Number(val || 0).toLocaleString("id-ID"); }
function fmtDate(s: string) {
    if (!s) return "-";
    const d = new Date(s);
    return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}
function weekOfMonth(s: string) { return Math.ceil(new Date(s).getDate() / 7); }
function dayNameId(s: string) { return DAY_JS_TO_ID[new Date(s).getDay()]; }
function pad2(n: number) { return String(n).padStart(2, "0"); }
function buildYears(): number[] {
    const y = new Date().getFullYear();
    return [y, y - 1, y - 2, y - 3];
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({ label, value, sub, color = "primary.main" }: {
    label: string; value: string | number; sub?: string; color?: string;
}) {
    return (
        <Card variant="outlined" sx={{ flex: "1 1 140px" }}>
            <CardContent sx={{ py: "10px !important", px: 2 }}>
                <Typography variant="caption" color="text.secondary" fontWeight={600}>{label}</Typography>
                <Typography variant="h6" fontWeight="bold" color={color} lineHeight={1.3}>{value}</Typography>
                {sub && <Typography variant="caption" color="text.secondary">{sub}</Typography>}
            </CardContent>
        </Card>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Monitoring() {
    const navigate = useNavigate();
    const now = new Date();

    // ── Periode selector ──
    const [selectedYear, setSelectedYear] = useState(now.getFullYear());
    const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
    const [weekFilter, setWeekFilter] = useState(0); // 0 = semua
    const [dayTab, setDayTab] = useState<number | "all">("all"); // "all" atau 0-6 (index DAYS_ID)

    // ── Data ──
    const [loading, setLoading] = useState(false);
    const [allNotas, setAllNotas] = useState<SaleFull[]>([]);
    const [error, setError] = useState<string | null>(null);
    const lastDay = new Date(selectedYear, selectedMonth, 0).getDate();

    // ── Edit dialog ──
    const [editNota, setEditNota] = useState<SaleFull | null>(null);
    const [editDeposit, setEditDeposit] = useState("");
    const [editNote, setEditNote] = useState("");
    const [saving, setSaving] = useState(false);

    // ── Delete dialog ──
    const [deleteNota, setDeleteNota] = useState<SaleFull | null>(null);
    const [deleting, setDeleting] = useState(false);

    // ── Snackbar ──
    const [snack, setSnack] = useState<{ open: boolean; msg: string; severity: "success" | "error" }>({
        open: false, msg: "", severity: "success",
    });
    const showSnack = (msg: string, sev: "success" | "error" = "success") =>
        setSnack({ open: true, msg, severity: sev });

    // ── Fetch ──
    useEffect(() => {
        const ctrl = new AbortController();
        (async () => {
            setLoading(true);
            setError(null);
            setAllNotas([]);
            try {
                const from = `${selectedYear}-${pad2(selectedMonth)}-01`;
                const to = `${selectedYear}-${pad2(selectedMonth)}-${pad2(lastDay)}`;
                const res = await apiBe.get("/api/web/sales", {
                    params: { from, to, per_page: 1000 },
                    signal: ctrl.signal,
                });
                const raw = res.data;
                const list: SaleFull[] = Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : [];
                setAllNotas(list);
            } catch (err: any) {
                if (err.name !== "CanceledError")
                    setError("Gagal memuat data. Pastikan server laporan-be berjalan.");
            } finally { setLoading(false); }
        })();
        return () => ctrl.abort();
    }, [selectedYear, selectedMonth]);

    // ── Filtered: by week ──
    const weekFiltered = useMemo(() =>
        weekFilter === 0 ? allNotas : allNotas.filter((n) => weekOfMonth(n.transaction_date) === weekFilter),
        [allNotas, weekFilter]
    );

    // ── Filtered: by day ──
    const dayFiltered = useMemo(() =>
        dayTab === "all"
            ? weekFiltered
            : weekFiltered.filter((n) => dayNameId(n.transaction_date) === DAYS_ID[dayTab as number]),
        [weekFiltered, dayTab]
    );

    // ── Day count map (untuk badge tab hari) ──
    const dayCountMap = useMemo(() => {
        const m: Record<string, number> = {};
        DAYS_ID.forEach((d) => { m[d] = weekFiltered.filter((n) => dayNameId(n.transaction_date) === d).length; });
        return m;
    }, [weekFiltered]);

    // ── Summary keseluruhan bulan ──
    const summary = useMemo(() => ({
        total: allNotas.length,
        invoiced: allNotas.filter((n) => n.status === "INVOICED").length,
        dropping: allNotas.filter((n) => n.status === "DROPPING").length,
        grandTotal: allNotas.reduce((s, n) => s + Number(n.grand_total || 0), 0),
        deposit: allNotas.reduce((s, n) => s + Number(n.deposit || 0), 0),
    }), [allNotas]);

    // ── Edit handlers ──
    const handleOpenEdit = (nota: SaleFull) => {
        setEditNota(nota);
        setEditDeposit(String(nota.deposit ?? 0));
        setEditNote(nota.note ?? "");
    };
    const handleSaveEdit = async () => {
        if (!editNota) return;
        setSaving(true);
        try {
            await apiBe.put(`/api/web/sales/${editNota.id}`, {
                deposit: Number(editDeposit),
                note: editNote,
            });
            showSnack("Nota berhasil diperbarui.");
            setEditNota(null);
            // refresh
            setAllNotas((prev) =>
                prev.map((n) => n.id === editNota.id
                    ? { ...n, deposit: String(Number(editDeposit)), note: editNote }
                    : n)
            );
        } catch (err: any) {
            showSnack(err.response?.data?.message || "Gagal menyimpan perubahan.", "error");
        } finally { setSaving(false); }
    };

    // ── Delete handlers ──
    const handleConfirmDelete = async () => {
        if (!deleteNota) return;
        setDeleting(true);
        try {
            await apiBe.delete(`/api/web/sales/${deleteNota.id}`);
            showSnack("Nota berhasil dihapus.");
            setAllNotas((prev) => prev.filter((n) => n.id !== deleteNota.id));
            setDeleteNota(null);
        } catch (err: any) {
            showSnack(err.response?.data?.message || "Gagal menghapus nota.", "error");
        } finally { setDeleting(false); }
    };

    return (
        <Box sx={{ p: 2, maxWidth: 1200, margin: "0 auto" }}>
            {/* ── Header ── */}
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2} flexWrap="wrap" gap={1}>
                <Stack direction="row" alignItems="center" spacing={1}>
                    <ReceiptLongIcon color="primary" />
                    <Typography variant="h6" fontWeight="bold">Monitor Nota</Typography>
                    {!loading && <Chip label={`${allNotas.length} nota bulan ini`} size="small" variant="outlined" />}
                </Stack>
                <Stack direction="row" spacing={1}>
                    <Tooltip title="Kelola Data Barang / Item">
                        <Button variant="outlined" size="small" startIcon={<CategoryIcon />} onClick={() => navigate("/item")}>
                            Data Barang
                        </Button>
                    </Tooltip>
                    <Tooltip title="Lihat rekap agregasi bulanan">
                        <Button
                            variant="contained"
                            color="secondary"
                            size="small"
                            startIcon={<BarChartIcon />}
                            onClick={() => navigate(`/rekap-be/detail?year=${selectedYear}&month=${selectedMonth}`)}
                        >
                            📊 Rekap {MONTHS[selectedMonth - 1]}
                        </Button>
                    </Tooltip>
                </Stack>
            </Stack>

            {/* ── Periode Panel ── */}
            <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" mb={1}>
                    Pilih Periode
                </Typography>
                <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
                    <FormControl size="small" sx={{ minWidth: 150 }}>
                        <InputLabel>Bulan</InputLabel>
                        <Select label="Bulan" value={selectedMonth} onChange={(e) => { setSelectedMonth(Number(e.target.value)); setWeekFilter(0); setDayTab("all"); }}>
                            {MONTHS.map((name, idx) => <MenuItem key={idx + 1} value={idx + 1}>{name}</MenuItem>)}
                        </Select>
                    </FormControl>
                    <FormControl size="small" sx={{ minWidth: 110 }}>
                        <InputLabel>Tahun</InputLabel>
                        <Select label="Tahun" value={selectedYear} onChange={(e) => { setSelectedYear(Number(e.target.value)); setWeekFilter(0); setDayTab("all"); }}>
                            {buildYears().map((y) => <MenuItem key={y} value={y}>{y}</MenuItem>)}
                        </Select>
                    </FormControl>
                </Stack>

                {/* Filter Minggu */}
                {!loading && allNotas.length > 0 && (
                    <Stack direction="row" spacing={1} mt={1.5} alignItems="center" flexWrap="wrap">
                        <Typography variant="caption" color="text.secondary" fontWeight={600}>Minggu:</Typography>
                        {[0, 1, 2, 3, 4, 5].map((w) => {
                            const wStart = w === 0 ? null : (w - 1) * 7 + 1;
                            const wEnd = w === 0 ? null : Math.min(w * 7, lastDay);
                            const count = w === 0
                                ? allNotas.length
                                : allNotas.filter((n) => weekOfMonth(n.transaction_date) === w).length;
                            if (w > 0 && count === 0) return null;
                            return (
                                <Chip
                                    key={w}
                                    label={w === 0 ? `Semua (${count})` : `Minggu ${w} · ${wStart}–${wEnd} (${count})`}
                                    size="small"
                                    variant={weekFilter === w ? "filled" : "outlined"}
                                    color={weekFilter === w ? "primary" : "default"}
                                    onClick={() => { setWeekFilter(w); setDayTab("all"); }}
                                    sx={{ cursor: "pointer" }}
                                />
                            );
                        })}
                    </Stack>
                )}
            </Paper>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            {/* ── Summary Cards ── */}
            {loading ? (
                <CardsSkeleton count={5} />
            ) : allNotas.length > 0 && (
                <Stack direction="row" spacing={1.5} mb={2} flexWrap="wrap">
                    <StatCard label="Total Nota" value={summary.total} />
                    <StatCard label="Invoiced" value={summary.invoiced} color="success.main" />
                    <StatCard label="Dropping Aktif" value={summary.dropping} color="warning.main" />
                    <StatCard label="Grand Total" value={`Rp ${fmtRupiah(summary.grandTotal)}`} color="info.main" />
                    <StatCard
                        label="Deposit"
                        value={`Rp ${fmtRupiah(summary.deposit)}`}
                        sub={`Sisa: Rp ${fmtRupiah(summary.grandTotal - summary.deposit)}`}
                    />
                </Stack>
            )}

            {loading ? (
                <Paper variant="outlined">
                    <TableContainer>
                        <Table size="small">
                            <TableHead>
                                <TableRow sx={{ bgcolor: "primary.main" }}>
                                    {["#", "No. Nota", "Tgl / Hari", "Outlet", "Items", "Grand Total", "Deposit", "Sisa", "Status", "Aksi"].map((h) => (
                                        <TableCell key={h} sx={{ color: "white", fontWeight: 600 }}>{h}</TableCell>
                                    ))}
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                <TableRowsSkeleton rows={6} cols={10} />
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Paper>
            ) : allNotas.length === 0 ? (
                <Alert severity="info">Tidak ada data untuk {MONTHS[selectedMonth - 1]} {selectedYear}.</Alert>
            ) : (
                <Paper variant="outlined" sx={{ overflow: "hidden" }}>
                    {/* ── Day Tabs ── */}
                    <Tabs
                        value={dayTab}
                        onChange={(_, v) => setDayTab(v)}
                        variant="scrollable"
                        scrollButtons="auto"
                        sx={{ borderBottom: 1, borderColor: "divider", bgcolor: "grey.50" }}
                    >
                        <Tab
                            value="all"
                            label={
                                <Stack direction="row" spacing={0.5} alignItems="center">
                                    <span>SEMUA</span>
                                    <Chip label={weekFiltered.length} size="small" color="primary" sx={{ height: 18, fontSize: "0.65rem" }} />
                                </Stack>
                            }
                            sx={{ fontWeight: 600 }}
                        />
                        {DAYS_ID.map((day, idx) => (
                            <Tab
                                key={day}
                                value={idx}
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

                    {/* ── Info bar ── */}
                    <Box sx={{ px: 2, py: 1, bgcolor: "grey.50", borderBottom: 1, borderColor: "divider" }}>
                        <Stack direction="row" spacing={1.5} alignItems="center">
                            <Typography variant="caption" color="text.secondary">
                                Menampilkan <strong>{dayFiltered.length}</strong> nota
                                {dayTab !== "all" ? ` — Hari ${DAYS_ID[dayTab as number]}` : ""}
                                {weekFilter > 0 ? `, Minggu ${weekFilter}` : ""}
                                {" — "}{MONTHS[selectedMonth - 1]} {selectedYear}
                            </Typography>
                            <Stack direction="row" spacing={0.5}>
                                <Chip label={`Invoiced: ${dayFiltered.filter((n) => n.status === "INVOICED").length}`} size="small" color="success" variant="outlined" />
                                <Chip label={`Dropping: ${dayFiltered.filter((n) => n.status === "DROPPING").length}`} size="small" color="warning" variant="outlined" />
                            </Stack>
                        </Stack>
                    </Box>

                    {dayFiltered.length === 0 ? (
                        <Box sx={{ py: 5, textAlign: "center" }}>
                            <Typography color="text.secondary">
                                Tidak ada nota untuk hari <strong>{dayTab !== "all" ? DAYS_ID[dayTab as number] : ""}</strong>
                                {weekFilter > 0 ? `, Minggu ${weekFilter}` : ""}.
                            </Typography>
                        </Box>
                    ) : (
                        <TableContainer>
                            <Table size="small">
                                <TableHead>
                                    <TableRow sx={{ bgcolor: "primary.main" }}>
                                        <TableCell sx={{ color: "white", fontWeight: 600 }}>#</TableCell>
                                        <TableCell sx={{ color: "white", fontWeight: 600 }}>No. Nota</TableCell>
                                        <TableCell sx={{ color: "white", fontWeight: 600 }}>Tgl / Hari</TableCell>
                                        <TableCell sx={{ color: "white", fontWeight: 600 }}>Outlet</TableCell>
                                        <TableCell sx={{ color: "white", fontWeight: 600 }}>Items</TableCell>
                                        <TableCell sx={{ color: "white", fontWeight: 600 }} align="right">Grand Total</TableCell>
                                        <TableCell sx={{ color: "white", fontWeight: 600 }} align="right">Deposit</TableCell>
                                        <TableCell sx={{ color: "white", fontWeight: 600 }} align="right">Sisa</TableCell>
                                        <TableCell sx={{ color: "white", fontWeight: 600 }} align="center">Status</TableCell>
                                        <TableCell sx={{ color: "white", fontWeight: 600 }} align="center">Aksi</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {dayFiltered.map((nota, idx) => {
                                        const sisa = Number(nota.grand_total || 0) - Number(nota.deposit || 0);
                                        const hariNota = dayNameId(nota.transaction_date);
                                        const mingguNota = weekOfMonth(nota.transaction_date);
                                        return (
                                            <TableRow key={nota.id} hover>
                                                <TableCell sx={{ color: "text.disabled", fontSize: "0.75rem" }}>{idx + 1}</TableCell>
                                                <TableCell>
                                                    <Typography variant="body2" fontFamily="monospace" fontWeight={600} fontSize="0.78rem">
                                                        {nota.nota_number}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Typography variant="body2">{fmtDate(nota.transaction_date)}</Typography>
                                                    <Stack direction="row" spacing={0.5} mt={0.25}>
                                                        <Chip label={hariNota} size="small" variant="outlined" sx={{ fontSize: "0.65rem", height: 18 }} />
                                                        <Chip label={`Minggu ${mingguNota}`} size="small" variant="outlined" sx={{ fontSize: "0.65rem", height: 18 }} />
                                                    </Stack>
                                                </TableCell>
                                                <TableCell>
                                                    {nota.outlet ? (
                                                        <Stack>
                                                            <Typography variant="body2" fontWeight={600}>{nota.outlet.code}</Typography>
                                                            <Typography variant="caption" color="text.secondary">{nota.outlet.name}</Typography>
                                                        </Stack>
                                                    ) : <Typography variant="body2" color="text.disabled">#{nota.outlet_id}</Typography>}
                                                </TableCell>
                                                <TableCell>
                                                    {nota.saleItems && nota.saleItems.length > 0 ? (
                                                        <Stack spacing={0.25}>
                                                            {nota.saleItems.slice(0, 2).map((si) => (
                                                                <Typography key={si.id} variant="caption" color="text.secondary">
                                                                    {si.item?.name ?? `#${si.item_id}`} × {si.qty_order}
                                                                </Typography>
                                                            ))}
                                                            {nota.saleItems.length > 2 && (
                                                                <Typography variant="caption" color="text.disabled">
                                                                    +{nota.saleItems.length - 2} lainnya
                                                                </Typography>
                                                            )}
                                                        </Stack>
                                                    ) : <Typography variant="caption" color="text.disabled">—</Typography>}
                                                </TableCell>
                                                <TableCell align="right">
                                                    <Typography variant="body2" fontWeight={500}>Rp {fmtRupiah(nota.grand_total)}</Typography>
                                                </TableCell>
                                                <TableCell align="right">Rp {fmtRupiah(nota.deposit)}</TableCell>
                                                <TableCell align="right">
                                                    {sisa > 0
                                                        ? <Typography variant="body2" color="error.main" fontWeight={600}>Rp {fmtRupiah(sisa)}</Typography>
                                                        : <Typography variant="body2" color="success.main">—</Typography>}
                                                </TableCell>
                                                <TableCell align="center">
                                                    <Chip
                                                        label={nota.status}
                                                        size="small"
                                                        color={nota.status === "INVOICED" ? "success" : "warning"}
                                                        sx={{ fontSize: "0.7rem" }}
                                                    />
                                                </TableCell>
                                                <TableCell align="center">
                                                    <Stack direction="row" justifyContent="center" spacing={0.25}>
                                                        <Tooltip title="Detail nota">
                                                            <IconButton size="small" onClick={() => navigate(`/monitoring/${nota.id}`)}>
                                                                <OpenInNewIcon fontSize="small" />
                                                            </IconButton>
                                                        </Tooltip>
                                                        <Tooltip title="Edit deposit / catatan">
                                                            <IconButton size="small" color="primary" onClick={() => handleOpenEdit(nota)}>
                                                                <EditIcon fontSize="small" />
                                                            </IconButton>
                                                        </Tooltip>
                                                        <Tooltip title={nota.status === "INVOICED" ? "Nota INVOICED tidak bisa dihapus" : "Hapus nota"}>
                                                            <span>
                                                                <IconButton
                                                                    size="small"
                                                                    color="error"
                                                                    disabled={nota.status === "INVOICED"}
                                                                    onClick={() => setDeleteNota(nota)}
                                                                >
                                                                    <DeleteIcon fontSize="small" />
                                                                </IconButton>
                                                            </span>
                                                        </Tooltip>
                                                    </Stack>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    )}

                    {/* ── Footer summary ── */}
                    {dayFiltered.length > 0 && (
                        <Box sx={{ px: 2, py: 1, borderTop: 1, borderColor: "divider", bgcolor: "grey.50" }}>
                            <Stack direction="row" spacing={3} flexWrap="wrap">
                                <Typography variant="caption" color="text.secondary">
                                    Grand Total: <strong>Rp {fmtRupiah(dayFiltered.reduce((s, n) => s + Number(n.grand_total || 0), 0))}</strong>
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    Deposit: <strong>Rp {fmtRupiah(dayFiltered.reduce((s, n) => s + Number(n.deposit || 0), 0))}</strong>
                                </Typography>
                            </Stack>
                        </Box>
                    )}
                </Paper>
            )}

            {/* ── Dialog Edit Deposit/Catatan ── */}
            <Dialog open={editNota !== null} onClose={() => setEditNota(null)} maxWidth="sm" fullWidth>
                <DialogTitle>
                    Edit Nota — <Typography component="span" fontFamily="monospace" fontWeight={600}>{editNota?.nota_number}</Typography>
                </DialogTitle>
                <DialogContent>
                    <Stack spacing={2.5} sx={{ mt: 1 }}>
                        <Alert severity="info" sx={{ py: 0.5 }}>
                            Hanya <strong>Deposit</strong> dan <strong>Catatan</strong> yang dapat diubah dari web.
                            Data penjualan (qty, grand total) dikelola oleh aplikasi Android.
                        </Alert>
                        <Box component="div">
                            <Typography variant="subtitle2" gutterBottom>Deposit</Typography>
                            <input
                                type="number"
                                value={editDeposit}
                                onChange={(e) => setEditDeposit(e.target.value)}
                                style={{ width: "100%", padding: "10px", fontSize: "1rem", border: "1px solid #ccc", borderRadius: 6 }}
                                placeholder="Masukkan jumlah deposit..."
                            />
                        </Box>
                        <Box component="div">
                            <Typography variant="subtitle2" gutterBottom>Catatan</Typography>
                            <textarea
                                value={editNote}
                                onChange={(e) => setEditNote(e.target.value)}
                                rows={3}
                                style={{ width: "100%", padding: "10px", fontSize: "1rem", border: "1px solid #ccc", borderRadius: 6, resize: "vertical" }}
                                placeholder="Tambahkan catatan jika ada..."
                            />
                        </Box>
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setEditNota(null)} color="inherit">Batal</Button>
                    <Button onClick={handleSaveEdit} variant="contained" disabled={saving}>
                        {saving ? "Menyimpan..." : "Simpan"}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* ── Dialog Konfirmasi Hapus ── */}
            <Dialog open={deleteNota !== null} onClose={() => setDeleteNota(null)} maxWidth="xs">
                <DialogTitle>Hapus Nota?</DialogTitle>
                <DialogContent>
                    <Typography gutterBottom>
                        Hapus nota <Typography component="span" fontFamily="monospace" fontWeight={600}>{deleteNota?.nota_number}</Typography>?
                    </Typography>
                    <Alert severity="warning" sx={{ mt: 1 }}>
                        Nota dan seluruh item di dalamnya akan dihapus <strong>permanen</strong>.
                    </Alert>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteNota(null)} color="inherit">Batal</Button>
                    <Button onClick={handleConfirmDelete} color="error" variant="contained" disabled={deleting}>
                        {deleting ? "Menghapus..." : "Hapus Permanen"}
                    </Button>
                </DialogActions>
            </Dialog>

            <Snackbar
                open={snack.open}
                autoHideDuration={3000}
                onClose={() => setSnack((s) => ({ ...s, open: false }))}
                anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
            >
                <Alert severity={snack.severity} onClose={() => setSnack((s) => ({ ...s, open: false }))}>
                    {snack.msg}
                </Alert>
            </Snackbar>
        </Box>
    );
}
