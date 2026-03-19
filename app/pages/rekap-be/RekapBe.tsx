import { useState, useEffect } from "react";
import {
    Box,
    Typography,
    Paper,
    Alert,
    Chip,
    Stack,
    Skeleton,
    Table,
    TableHead,
    TableRow,
    TableCell,
    TableBody,
    TableContainer,
    IconButton,
    Tooltip,
    Divider,
    Card,
    CardContent,
} from "@mui/material";
import BarChartIcon from "@mui/icons-material/BarChart";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import { useNavigate } from "react-router";
import apiBe from "../../lib/axiosBe";
import { MONTHS, type Sale } from "../data/constant";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getLast12Months(): { year: number; month: number }[] {
    const result: { year: number; month: number }[] = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        result.push({ year: d.getFullYear(), month: d.getMonth() + 1 });
    }
    return result;
}

function pad2(n: number) { return String(n).padStart(2, "0"); }
function fmtRp(val: number) { return "Rp " + val.toLocaleString("id-ID"); }

// ─── Types ────────────────────────────────────────────────────────────────────

interface MonthSummary {
    year: number;
    month: number;
    total: number;
    dropping: number;
    invoiced: number;
    grandTotal: number;
    totalDeposit: number;
    hasData: boolean;
}

interface GroupedSummary {
    [year: number]: MonthSummary[];
}

// ─── Summary Card ─────────────────────────────────────────────────────────────

function SummaryCard({ icon, label, value, color = "primary.main", sub }: {
    icon: React.ReactNode; label: string; value: string | number; color?: string; sub?: string;
}) {
    return (
        <Card variant="outlined" sx={{ flex: "1 1 160px", minWidth: 140 }}>
            <CardContent sx={{ py: "12px !important", px: 2 }}>
                <Stack direction="row" alignItems="center" spacing={0.75} mb={0.5}>
                    {icon}
                    <Typography variant="caption" color="text.secondary" fontWeight={600}>{label}</Typography>
                </Stack>
                <Typography variant="h6" fontWeight="bold" color={color} lineHeight={1.2}>{value}</Typography>
                {sub && <Typography variant="caption" color="text.secondary">{sub}</Typography>}
            </CardContent>
        </Card>
    );
}

// ──────────────────────────────────────────────────────────────────────────────

export default function RekapBe() {
    const navigate = useNavigate();
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [grouped, setGrouped] = useState<GroupedSummary>({});

    useEffect(() => {
        const fetchAllMonths = async () => {
            try {
                setLoading(true);
                const periods = getLast12Months();

                const results = await Promise.all(
                    periods.map(async ({ year, month }) => {
                        const lastDay = new Date(year, month, 0).getDate();
                        const from = `${year}-${pad2(month)}-01`;
                        const to = `${year}-${pad2(month)}-${pad2(lastDay)}`;
                        try {
                            const res = await apiBe.get("/api/web/sales", { params: { from, to, per_page: 500 } });
                            const raw = res.data;
                            const notas: Sale[] = Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : [];
                            const dropping = notas.filter((n) => n.status === "DROPPING").length;
                            const invoiced = notas.filter((n) => n.status === "INVOICED").length;
                            const grandTotal = notas.reduce((s, n) => s + Number(n.grand_total || 0), 0);
                            const totalDeposit = notas.reduce((s, n) => s + Number(n.deposit || 0), 0);
                            return { year, month, total: notas.length, dropping, invoiced, grandTotal, totalDeposit, hasData: notas.length > 0 };
                        } catch {
                            return { year, month, total: 0, dropping: 0, invoiced: 0, grandTotal: 0, totalDeposit: 0, hasData: false };
                        }
                    })
                );

                // Hanya tampilkan bulan yang ada datanya
                const withData = results.filter((r) => r.hasData);

                // Group per tahun
                const g: GroupedSummary = {};
                withData.forEach((r) => {
                    if (!g[r.year]) g[r.year] = [];
                    g[r.year].push(r);
                });
                setGrouped(g);
            } catch {
                setError("Gagal memuat data rekap. Pastikan server laporan-be berjalan.");
            } finally {
                setLoading(false);
            }
        };
        fetchAllMonths();
    }, []);

    const handleMonthClick = (year: number, month: number) => {
        navigate(`/rekap-be/detail?year=${year}&month=${month}`);
    };

    // ── Statistik bulan berjalan ──
    const currentMonthData = grouped[currentYear]?.find((m) => m.month === currentMonth);

    const years = Object.keys(grouped).map(Number).sort((a, b) => b - a);

    return (
        <Box sx={{ p: { xs: 1.5, sm: 2, md: 3 }, maxWidth: 960, margin: "0 auto" }}>

            {/* ── Page Header ── */}
            <Stack direction={{ xs: "column", sm: "row" }} alignItems={{ xs: "flex-start", sm: "center" }} spacing={1.5} mb={1} flexWrap="wrap">
                <BarChartIcon color="primary" sx={{ fontSize: 32 }} />
                <Box>
                    <Typography variant="h5" fontWeight="bold" lineHeight={1.2}>Rekap Kanvas</Typography>
                    <Typography variant="caption" color="text.secondary">
                        Ringkasan transaksi penjualan (Dropping & Invoice) dari aplikasi Android
                    </Typography>
                </Box>
            </Stack>

            <Divider sx={{ mb: 2.5 }} />

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            {/* ── Summary bulan berjalan ── */}
            {loading ? (
                <Stack direction="row" spacing={1.5} mb={3} flexWrap="wrap">
                    {[1, 2, 3, 4].map((i) => (
                        <Skeleton key={i} variant="rounded" width={160} height={72} animation="wave" />
                    ))}
                </Stack>
            ) : currentMonthData && (
                <Box mb={3}>
                    <Typography variant="subtitle2" fontWeight={700} color="text.secondary" mb={1}>
                        📅 Bulan Berjalan — {MONTHS[currentMonth - 1]} {currentYear}
                    </Typography>
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} flexWrap="wrap">
                        <SummaryCard
                            icon={<ReceiptLongIcon fontSize="small" color="action" />}
                            label="Total Nota"
                            value={currentMonthData.total}
                        />
                        <SummaryCard
                            icon={<CheckCircleIcon fontSize="small" color="success" />}
                            label="Invoiced"
                            value={currentMonthData.invoiced}
                            color="#2e7d32"
                        />
                        {currentMonthData.dropping > 0 && (
                            <SummaryCard
                                icon={<WarningAmberIcon fontSize="small" color="warning" />}
                                label="Belum Invoice"
                                value={currentMonthData.dropping}
                                color="warning.main"
                                sub="nota masih DROPPING"
                            />
                        )}
                        <SummaryCard
                            icon={<AttachMoneyIcon fontSize="small" color="primary" />}
                            label="Grand Total"
                            value={fmtRp(currentMonthData.grandTotal)}
                            color="primary.main"
                        />
                    </Stack>
                    {currentMonthData.dropping > 0 && (
                        <Alert severity="warning" sx={{ mt: 1.5, py: 0.5 }} icon={<WarningAmberIcon />}>
                            Ada <strong>{currentMonthData.dropping} nota</strong> yang belum di-invoice bulan ini. Segera selesaikan di aplikasi Android.
                        </Alert>
                    )}
                </Box>
            )}

            {/* ── Loading skeleton tabel ── */}
            {loading && (
                <Paper variant="outlined" sx={{ p: 0, overflow: "hidden" }}>
                    <Box sx={{ p: 1.5, bgcolor: "grey.50", borderBottom: "1px solid #eee" }}>
                        <Skeleton variant="text" width={100} />
                    </Box>
                    {[1, 2, 3, 4].map((i) => (
                        <Stack key={i} direction="row" spacing={2} alignItems="center" sx={{ px: 2, py: 1.5, borderBottom: i < 4 ? "1px solid #f0f0f0" : "none" }}>
                            <Skeleton variant="text" width={80} />
                            <Box sx={{ flex: 1 }} />
                            <Skeleton variant="rounded" width={55} height={22} />
                            <Skeleton variant="rounded" width={75} height={22} />
                            <Skeleton variant="rounded" width={110} height={22} />
                            <Skeleton variant="rounded" width={28} height={28} sx={{ borderRadius: "50%" }} />
                        </Stack>
                    ))}
                </Paper>
            )}

            {/* ── Tidak ada data ── */}
            {!loading && !error && years.length === 0 && (
                <Alert severity="info">Belum ada data transaksi dalam 12 bulan terakhir.</Alert>
            )}

            {/* ── Tabel per tahun ── */}
            {!loading && years.map((year) => (
                <Paper key={year} variant="outlined" sx={{ mb: 2.5, overflow: "hidden" }}>
                    {/* Header tahun */}
                    <Stack
                        direction="row"
                        alignItems="center"
                        spacing={1}
                        sx={{ px: 2, py: 1.25, bgcolor: year === currentYear ? "primary.main" : "grey.700" }}
                    >
                        <Typography variant="subtitle1" fontWeight={700} color="white">
                            Tahun {year}
                        </Typography>
                        <Chip
                            label={`${grouped[year].length} bulan`}
                            size="small"
                            sx={{ bgcolor: "rgba(255,255,255,0.2)", color: "white", fontWeight: 600, height: 20, fontSize: "0.7rem" }}
                        />
                        {year === currentYear && (
                            <Chip
                                label="Berjalan"
                                size="small"
                                color="warning"
                                sx={{ fontWeight: 700, height: 20, fontSize: "0.7rem" }}
                            />
                        )}
                    </Stack>

                    {/* Tabel bulan */}
                    <TableContainer sx={{ overflowX: "auto" }}>
                        <Table size="small">
                            <TableHead>
                                <TableRow sx={{ bgcolor: "grey.50" }}>
                                    <TableCell sx={{ fontWeight: 600, color: "text.secondary", width: 140 }}>Bulan</TableCell>
                                    <TableCell sx={{ fontWeight: 600, color: "text.secondary" }} align="center">Total Nota</TableCell>
                                    <TableCell sx={{ fontWeight: 600, color: "text.secondary" }} align="center">Invoiced</TableCell>
                                    <TableCell sx={{ fontWeight: 600, color: "text.secondary" }} align="center">Dropping</TableCell>
                                    <TableCell sx={{ fontWeight: 600, color: "text.secondary" }} align="right">Grand Total</TableCell>
                                    <TableCell sx={{ fontWeight: 600, color: "text.secondary" }} align="center">Detail</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {grouped[year].map((m) => {
                                    const isCurrent = m.year === currentYear && m.month === currentMonth;
                                    return (
                                        <TableRow
                                            key={m.month}
                                            hover
                                            sx={{
                                                cursor: "pointer",
                                                bgcolor: isCurrent ? "primary.50" : "inherit",
                                                "&:hover": { bgcolor: isCurrent ? "primary.100" : "grey.50" },
                                            }}
                                            onClick={() => handleMonthClick(m.year, m.month)}
                                        >
                                            <TableCell>
                                                <Stack direction="row" alignItems="center" spacing={1}>
                                                    <Typography variant="body2" fontWeight={isCurrent ? 700 : 500}>
                                                        {MONTHS[m.month - 1]}
                                                    </Typography>
                                                    {isCurrent && (
                                                        <Chip label="Ini" size="small" color="primary" sx={{ height: 18, fontSize: "0.65rem", fontWeight: 700 }} />
                                                    )}
                                                </Stack>
                                            </TableCell>

                                            <TableCell align="center">
                                                <Chip
                                                    label={m.total}
                                                    size="small"
                                                    variant="outlined"
                                                    sx={{ minWidth: 36, fontWeight: 600 }}
                                                />
                                            </TableCell>

                                            <TableCell align="center">
                                                {m.invoiced > 0 ? (
                                                    <Chip
                                                        label={m.invoiced}
                                                        size="small"
                                                        color="success"
                                                        variant="outlined"
                                                        sx={{ minWidth: 36, fontWeight: 600 }}
                                                    />
                                                ) : <Typography variant="caption" color="text.disabled">—</Typography>}
                                            </TableCell>

                                            <TableCell align="center">
                                                {m.dropping > 0 ? (
                                                    <Chip
                                                        label={m.dropping}
                                                        size="small"
                                                        color="warning"
                                                        sx={{ minWidth: 36, fontWeight: 700 }}
                                                    />
                                                ) : (
                                                    <Chip
                                                        label="✓"
                                                        size="small"
                                                        color="success"
                                                        variant="outlined"
                                                        sx={{ minWidth: 36, fontWeight: 600, fontSize: "0.7rem" }}
                                                    />
                                                )}
                                            </TableCell>

                                            <TableCell align="right">
                                                <Typography variant="body2" fontWeight={600} color={m.grandTotal > 0 ? "text.primary" : "text.disabled"}>
                                                    {m.grandTotal > 0 ? fmtRp(m.grandTotal) : "—"}
                                                </Typography>
                                            </TableCell>

                                            <TableCell align="center">
                                                <Tooltip title={`Lihat detail ${MONTHS[m.month - 1]} ${m.year}`}>
                                                    <IconButton size="small" color="primary">
                                                        <ArrowForwardIosIcon sx={{ fontSize: 14 }} />
                                                    </IconButton>
                                                </Tooltip>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Paper>
            ))}
        </Box>
    );
}
