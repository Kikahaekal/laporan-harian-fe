import { useState, useEffect, useCallback } from "react";
import {
    Box, Typography, Paper, Alert, Chip, Stack,
    Skeleton, Table, TableHead, TableRow, TableCell,
    TableBody, TableContainer, IconButton, Tooltip,
    Divider, Card, CardContent, TextField, Dialog,
    DialogTitle, DialogContent, DialogActions,
    Button, InputAdornment, FormControl, InputLabel,
    Select, MenuItem, Snackbar,
} from "@mui/material";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import EditIcon from "@mui/icons-material/Edit";
import SearchIcon from "@mui/icons-material/Search";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import apiBe from "../../lib/axiosBe";
import { MONTHS, type Sale, type PaymentStatus } from "../data/constant";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmtRp = (v: number | string) =>
    "Rp " + Number(v).toLocaleString("id-ID");

const PAYMENT_STATUS_CONFIG: Record<
    PaymentStatus,
    { label: string; color: "success" | "warning" | "error"; icon: React.ReactNode }
> = {
    LUNAS: { label: "Lunas", color: "success", icon: <CheckCircleIcon fontSize="small" /> },
    CICILAN: { label: "Cicilan", color: "warning", icon: <WarningAmberIcon fontSize="small" /> },
    BELUM_LUNAS: { label: "Belum Lunas", color: "error", icon: <ReceiptLongIcon fontSize="small" /> },
};

function PaymentChip({ status }: { status: PaymentStatus | null }) {
    const cfg = PAYMENT_STATUS_CONFIG[status ?? "BELUM_LUNAS"];
    return (
        <Chip
            icon={cfg.icon as any}
            label={cfg.label}
            color={cfg.color}
            size="small"
            sx={{ fontWeight: 700 }}
        />
    );
}

function SummaryCard({ icon, label, value, sub, color = "text.primary" }: {
    icon: React.ReactNode; label: string; value: string | number; sub?: string; color?: string;
}) {
    return (
        <Card
            variant="outlined"
            sx={{ flex: { xs: "0 0 auto", sm: "1 1 150px" }, minWidth: { xs: 0, sm: 130 } }}
        >
            <CardContent
                sx={{
                    py: { xs: 0.75, sm: 0.75 },
                    px: { xs: 1, sm: 1.25 },
                    "&:last-child": { pb: { xs: 0.75, sm: 0.75 } },
                }}
            >
                <Stack spacing={0.35}>
                    <Stack direction="row" alignItems="center" spacing={0.75}>
                        {icon}
                        <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ lineHeight: 1, fontSize: { xs: "0.68rem", sm: "0.75rem" } }}>
                            {label}
                        </Typography>
                    </Stack>
                    <Typography
                        variant="subtitle1"
                        fontWeight={700}
                        color={color}
                        lineHeight={1}
                        sx={{ fontSize: { xs: "0.9rem", sm: "1rem" } }}
                    >
                        {value}
                    </Typography>
                    {sub && (
                        <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1, fontSize: { xs: "0.65rem", sm: "0.75rem" } }}>
                            {sub}
                        </Typography>
                    )}
                </Stack>
            </CardContent>
        </Card>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Tagihan() {
    const [sales, setSales] = useState<Sale[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // ── Filters ──
    const [filterStatus, setFilterStatus] = useState<string>("BELUM_LUNAS,CICILAN"); // default: belum lunas + cicilan
    const [filterMonth, setFilterMonth] = useState<string>("");
    const [filterYear, setFilterYear] = useState<string>(String(new Date().getFullYear()));
    const [search, setSearch] = useState("");

    // ── Dialog bayar ──
    const [payDialog, setPayDialog] = useState<Sale | null>(null);
    const [depositInput, setDepositInput] = useState("");
    const [saving, setSaving] = useState(false);

    // ── Snackbar ──
    const [snack, setSnack] = useState<{ open: boolean; msg: string; severity: "success" | "error" }>({
        open: false, msg: "", severity: "success",
    });
    const showSnack = (msg: string, severity: "success" | "error" = "success") =>
        setSnack({ open: true, msg, severity });

    // ── Fetch ──
    const fetchSales = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const params: Record<string, string> = { status: "INVOICED", per_page: "500" };
            if (filterMonth) {
                const y = filterYear || new Date().getFullYear().toString();
                const lDay = new Date(Number(y), Number(filterMonth), 0).getDate();
                params.from = `${y}-${filterMonth.padStart(2, "0")}-01`;
                params.to = `${y}-${filterMonth.padStart(2, "0")}-${String(lDay).padStart(2, "0")}`;
            } else if (filterYear) {
                params.from = `${filterYear}-01-01`;
                params.to = `${filterYear}-12-31`;
            }
            const res = await apiBe.get("/api/web/sales", { params });
            const raw = res.data;
            let list: Sale[] = Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : [];

            // Filter payment_status di client (BE belum support filter ini)
            if (filterStatus !== "ALL") {
                const allowed = filterStatus.split(",");
                list = list.filter((s) => {
                    const ps = s.payment_status ?? "BELUM_LUNAS";
                    return allowed.includes(ps);
                });
            }

            // Filter search
            if (search.trim()) {
                const q = search.toLowerCase();
                list = list.filter(
                    (s) =>
                        s.nota_number.toLowerCase().includes(q) ||
                        (s.outlet?.name ?? "").toLowerCase().includes(q) ||
                        (s.outlet?.code ?? "").toLowerCase().includes(q)
                );
            }

            setSales(list);
        } catch {
            setError("Gagal memuat data tagihan.");
        } finally {
            setLoading(false);
        }
    }, [filterStatus, filterMonth, filterYear, search]);

    useEffect(() => { fetchSales(); }, [fetchSales]);

    // ── Update pembayaran ──
    const handleSavePayment = async () => {
        if (!payDialog) return;
        const dep = Number(depositInput);
        if (isNaN(dep) || dep < 0) {
            showSnack("Masukkan jumlah deposit yang valid.", "error");
            return;
        }
        setSaving(true);
        try {
            await apiBe.patch(`/api/web/sales/${payDialog.id}/payment`, { deposit: dep });
            showSnack("Status pembayaran berhasil diperbarui.");
            setPayDialog(null);
            await fetchSales();
        } catch (err: any) {
            showSnack(err.response?.data?.message || "Gagal menyimpan pembayaran.", "error");
        } finally {
            setSaving(false);
        }
    };

    // ── Summary ──
    const totalPiutang = sales.reduce((s, n) => {
        const total = Number(n.grand_total) || 0;
        const dep = Number(n.deposit) || 0;
        return s + Math.max(0, total - dep);
    }, 0);
    const countBelumLunas = sales.filter((s) => (s.payment_status ?? "BELUM_LUNAS") === "BELUM_LUNAS").length;
    const countCicilan = sales.filter((s) => s.payment_status === "CICILAN").length;
    const countLunas = sales.filter((s) => s.payment_status === "LUNAS").length;

    // ── Year options ──
    const currentYear = new Date().getFullYear();
    const yearOptions = Array.from({ length: 3 }, (_, i) => currentYear - i);

    return (
        <Box sx={{ p: { xs: 1, sm: 1.5, md: 2 }, maxWidth: 1100, margin: "0 auto" }}>

            {/* ── Header ── */}
            <Stack direction={{ xs: "column", sm: "row" }} alignItems={{ xs: "flex-start", sm: "center" }} spacing={1} mb={1} flexWrap="wrap">
                <AccountBalanceWalletIcon color="primary" sx={{ fontSize: 32 }} />
                <Box>
                    <Typography variant="h5" fontWeight="bold" lineHeight={1.2}>Tagihan</Typography>
                    <Typography variant="caption" color="text.secondary">
                        Monitor status pembayaran invoice dari seluruh outlet
                    </Typography>
                </Box>
            </Stack>
            <Divider sx={{ mb: 2 }} />

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            {/* ── Summary Cards ── */}
            {loading ? (
                <Stack direction="row" spacing={1.5} mb={2.5} flexWrap="wrap">
                    {[1, 2, 3, 4].map((i) => <Skeleton key={i} variant="rounded" width={160} height={72} />)}
                </Stack>
            ) : (
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1} mb={2} flexWrap="wrap">
                    <SummaryCard
                        icon={<ReceiptLongIcon fontSize="small" color="error" />}
                        label="Belum Lunas"
                        value={countBelumLunas}
                        color="error.main"
                        sub="nota"
                    />
                    <SummaryCard
                        icon={<WarningAmberIcon fontSize="small" color="warning" />}
                        label="Cicilan"
                        value={countCicilan}
                        color="warning.main"
                        sub="nota"
                    />
                    <SummaryCard
                        icon={<CheckCircleIcon fontSize="small" color="success" />}
                        label="Lunas"
                        value={countLunas}
                        color="success.main"
                        sub="nota"
                    />
                    <SummaryCard
                        icon={<AttachMoneyIcon fontSize="small" color="primary" />}
                        label="Total Piutang"
                        value={fmtRp(totalPiutang)}
                        color={totalPiutang > 0 ? "error.main" : "success.main"}
                        sub="sisa belum dibayar"
                    />
                </Stack>
            )}

            {/* ── Filter Bar ── */}
            <Stack direction={{ xs: "column", sm: "row" }} spacing={0.75} mb={1.5} flexWrap="wrap">
                <TextField
                    size="small"
                    placeholder="Cari nota / outlet..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    sx={{ width: { xs: "100%", sm: 220 } }}
                    InputProps={{ startAdornment: <SearchIcon fontSize="small" sx={{ mr: 1, color: "text.disabled" }} /> }}
                />
                <FormControl size="small" sx={{ minWidth: 170, width: { xs: "100%", sm: "auto" } }}>
                    <InputLabel>Status Bayar</InputLabel>
                    <Select
                        label="Status Bayar"
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                    >
                        <MenuItem value="BELUM_LUNAS,CICILAN">Belum Lunas / Cicilan</MenuItem>
                        <MenuItem value="BELUM_LUNAS">Belum Lunas</MenuItem>
                        <MenuItem value="CICILAN">Cicilan</MenuItem>
                        <MenuItem value="LUNAS">Lunas</MenuItem>
                        <MenuItem value="ALL">Semua</MenuItem>
                    </Select>
                </FormControl>
                <FormControl size="small" sx={{ minWidth: 120, width: { xs: "100%", sm: "auto" } }}>
                    <InputLabel>Tahun</InputLabel>
                    <Select label="Tahun" value={filterYear} onChange={(e) => setFilterYear(e.target.value)}>
                        {yearOptions.map((y) => <MenuItem key={y} value={String(y)}>{y}</MenuItem>)}
                    </Select>
                </FormControl>
                <FormControl size="small" sx={{ minWidth: 130, width: { xs: "100%", sm: "auto" } }}>
                    <InputLabel>Bulan</InputLabel>
                    <Select label="Bulan" value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)}>
                        <MenuItem value="">Semua Bulan</MenuItem>
                        {MONTHS.map((m, i) => <MenuItem key={i} value={String(i + 1)}>{m}</MenuItem>)}
                    </Select>
                </FormControl>
            </Stack>

            {/* ── Tabel Tagihan ── */}
            <Paper variant="outlined" sx={{ overflow: "hidden" }}>
                <TableContainer sx={{ overflowX: "auto" }}>
                    <Table size="small" sx={{ minWidth: 900 }}>
                        <TableHead>
                            <TableRow sx={{ bgcolor: "primary.main" }}>
                                {["No Nota", "Outlet", "Tgl Transaksi", "Total Tagihan", "Deposit", "Sisa Tagihan", "Status", "Aksi"].map((h) => (
                                    <TableCell key={h} sx={{ color: "white", fontWeight: 700, whiteSpace: "nowrap" }}
                                        align={["Total Tagihan", "Deposit", "Sisa Tagihan"].includes(h) ? "right" : "left"}
                                    >
                                        {h}
                                    </TableCell>
                                ))}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <TableRow key={i}>
                                        {Array.from({ length: 8 }).map((_, j) => (
                                            <TableCell key={j}><Skeleton variant="text" /></TableCell>
                                        ))}
                                    </TableRow>
                                ))
                            ) : sales.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} align="center" sx={{ py: 4, color: "text.secondary" }}>
                                        {filterStatus.includes("BELUM_LUNAS") || filterStatus.includes("CICILAN")
                                            ? "🎉 Tidak ada tagihan yang belum lunas!"
                                            : "Tidak ada data yang sesuai filter."}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                sales.map((sale) => {
                                    const grandTotal = Number(sale.grand_total) || 0;
                                    const deposit = Number(sale.deposit) || 0;
                                    const sisa = Math.max(0, grandTotal - deposit);
                                    const ps = sale.payment_status ?? "BELUM_LUNAS";
                                    return (
                                        <TableRow
                                            key={sale.id}
                                            hover
                                            sx={{
                                                bgcolor: ps === "BELUM_LUNAS" ? "error.50" : ps === "CICILAN" ? "warning.50" : "inherit",
                                            }}
                                        >
                                            <TableCell>
                                                <Typography variant="body2" fontFamily="monospace" fontWeight={600}>
                                                    {sale.nota_number}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                {sale.outlet ? (
                                                    <Stack>
                                                        <Typography variant="body2" fontWeight={600}>{sale.outlet.name}</Typography>
                                                        <Typography variant="caption" color="text.secondary">{sale.outlet.code}</Typography>
                                                    </Stack>
                                                ) : `#${sale.outlet_id}`}
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="body2" noWrap>
                                                    {new Date(sale.transaction_date).toLocaleDateString("id-ID", {
                                                        day: "2-digit", month: "short", year: "numeric"
                                                    })}
                                                </Typography>
                                            </TableCell>
                                            <TableCell align="right">
                                                <Typography variant="body2" fontWeight={600}>{fmtRp(grandTotal)}</Typography>
                                            </TableCell>
                                            <TableCell align="right">
                                                <Typography
                                                    variant="body2"
                                                    color={deposit > 0 ? "success.main" : "text.disabled"}
                                                    fontWeight={deposit > 0 ? 600 : 400}
                                                >
                                                    {deposit > 0 ? fmtRp(deposit) : "—"}
                                                </Typography>
                                            </TableCell>
                                            <TableCell align="right">
                                                <Typography
                                                    variant="body2"
                                                    fontWeight={700}
                                                    color={sisa > 0 ? "error.main" : "success.main"}
                                                >
                                                    {sisa > 0 ? fmtRp(sisa) : "✓ Lunas"}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                <PaymentChip status={ps as PaymentStatus} />
                                            </TableCell>
                                            <TableCell>
                                                <Tooltip title="Update Pembayaran">
                                                    <IconButton
                                                        size="small"
                                                        color="primary"
                                                        onClick={() => {
                                                            setPayDialog(sale);
                                                            setDepositInput(String(deposit));
                                                        }}
                                                    >
                                                        <EditIcon fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>

            {/* ── Dialog Update Pembayaran ── */}
            <Dialog open={payDialog !== null} onClose={() => !saving && setPayDialog(null)} maxWidth="xs" fullWidth>
                <DialogTitle sx={{ pb: 1 }}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                        <AccountBalanceWalletIcon color="primary" />
                        <span>Update Pembayaran</span>
                    </Stack>
                </DialogTitle>
                <Divider />
                <DialogContent sx={{ pt: 2 }}>
                    {payDialog && (
                        <Stack spacing={2}>
                            <Box sx={{ bgcolor: "grey.50", borderRadius: 1, p: 1.5 }}>
                                <Typography variant="caption" color="text.secondary">Nota</Typography>
                                <Typography variant="body2" fontWeight={700} fontFamily="monospace">{payDialog.nota_number}</Typography>
                                <Typography variant="caption" color="text.secondary">Outlet: </Typography>
                                <Typography variant="caption" fontWeight={600}>{payDialog.outlet?.name ?? `#${payDialog.outlet_id}`}</Typography>
                                <Stack direction="row" spacing={2} mt={0.5}>
                                    <Box>
                                        <Typography variant="caption" color="text.secondary">Total Tagihan</Typography>
                                        <Typography variant="body2" fontWeight={700}>{fmtRp(payDialog.grand_total)}</Typography>
                                    </Box>
                                    <Box>
                                        <Typography variant="caption" color="text.secondary">Sisa</Typography>
                                        <Typography variant="body2" fontWeight={700} color="error.main">
                                            {fmtRp(Math.max(0, Number(payDialog.grand_total) - Number(payDialog.deposit)))}
                                        </Typography>
                                    </Box>
                                </Stack>
                            </Box>

                            <TextField
                                label="Jumlah Deposit / Pembayaran *"
                                type="number"
                                fullWidth
                                value={depositInput}
                                onChange={(e) => {
                                    const value = e.target.value;
                                    setDepositInput(value);
                                }}
                                onBlur={() => {
                                    const maxValue = Number(payDialog.grand_total) || 0;
                                    let value = Number(depositInput) || 0;

                                    // Batasi maksimal sesuai grand_total
                                    if (value > maxValue) value = maxValue;

                                    // Bulatkan ke kelipatan 1000
                                    value = Math.round(value / 100) * 100;

                                    setDepositInput(value.toString());
                                }}
                                InputProps={{
                                    startAdornment: <InputAdornment position="start">Rp</InputAdornment>,
                                }}
                                inputProps={{
                                    min: 0,
                                    max: Number(payDialog.grand_total) || undefined,
                                    step: 500,
                                }}
                                helperText={(() => {
                                    const dep = Number(depositInput) || 0;
                                    const total = Number(payDialog.grand_total) || 0;
                                    if (dep >= total) return "✅ Status akan menjadi LUNAS";
                                    if (dep > 0) return "⚠️ Status akan menjadi CICILAN";
                                    return "❌ Status akan menjadi BELUM LUNAS";
                                })()}
                            />
                        </Stack>
                    )}
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setPayDialog(null)} color="inherit" disabled={saving}>Batal</Button>
                    <Button onClick={handleSavePayment} variant="contained" disabled={saving}>
                        {saving ? "Menyimpan..." : "Simpan"}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* ── Snackbar ── */}
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
