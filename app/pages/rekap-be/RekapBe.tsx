import { useState, useEffect } from "react";
import {
    Box,
    Typography,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    List,
    ListItemButton,
    ListItemText,
    Skeleton,
    Paper,
    Divider,
    Alert,
    Chip,
    Stack,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import VisibilityIcon from "@mui/icons-material/Visibility";
import BarChartIcon from "@mui/icons-material/BarChart";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import { useNavigate } from "react-router";
import apiBe from "../../lib/axiosBe";
import { MONTHS, type Sale } from "../data/constant";

// Bangun daftar 12 bulan terakhir (dari sekarang mundur)
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

interface MonthSummary {
    year: number;
    month: number;
    total: number;
    dropping: number;
    invoiced: number;
    totalDeposit: number;
    hasData: boolean;
}

interface GroupedSummary {
    [year: number]: MonthSummary[];
}

export default function RekapBe() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [grouped, setGrouped] = useState<GroupedSummary>({});

    useEffect(() => {
        const fetchAllMonths = async () => {
            try {
                setLoading(true);
                const periods = getLast12Months();

                // Fetch semua bulan secara parallel
                const results = await Promise.all(
                    periods.map(async ({ year, month }) => {
                        const lastDay = new Date(year, month, 0).getDate();
                        const from = `${year}-${pad2(month)}-01`;
                        const to = `${year}-${pad2(month)}-${pad2(lastDay)}`;
                        try {
                            const res = await apiBe.get("/api/web/sales", { params: { from, to } });
                            const raw = res.data;
                            const notas: Sale[] = Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : [];
                            const dropping = notas.filter((n) => n.status === "DROPPING").length;
                            const invoiced = notas.filter((n) => n.status === "INVOICED").length;
                            const totalDeposit = notas.reduce((s, n) => s + Number(n.deposit || 0), 0);
                            return { year, month, total: notas.length, dropping, invoiced, totalDeposit, hasData: notas.length > 0 };
                        } catch {
                            return { year, month, total: 0, dropping: 0, invoiced: 0, totalDeposit: 0, hasData: false };
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
            } catch (err) {
                console.error("Gagal load rekap:", err);
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

    const totalYears = Object.keys(grouped).length;

    return (
        <Box sx={{ p: 3, maxWidth: 800, margin: "0 auto" }}>
            <Stack direction="row" alignItems="center" spacing={1} mb={1}>
                <BarChartIcon color="primary" fontSize="large" />
                <Typography variant="h4" fontWeight="bold">
                    Rekap Kanvas
                </Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary" mb={3}>
                Data transaksi penjualan dari app Android (Dropping & Invoice). Klik bulan untuk melihat detail per minggu.
            </Typography>

            {loading && (
                <Paper variant="outlined" sx={{ p: 2 }}>
                    {Array.from({ length: 4 }).map((_, i) => (
                        <Stack key={i} direction="row" spacing={2} alignItems="center" sx={{ py: 1.5, borderBottom: i < 3 ? "1px solid #eee" : "none" }}>
                            <Skeleton variant="circular" width={28} height={28} animation="wave" />
                            <Skeleton variant="text" width={100} animation="wave" />
                            <Box sx={{ flex: 1 }} />
                            <Skeleton variant="rounded" width={70} height={22} animation="wave" />
                            <Skeleton variant="rounded" width={90} height={22} animation="wave" />
                            <Skeleton variant="rounded" width={80} height={22} animation="wave" />
                        </Stack>
                    ))}
                </Paper>
            )}

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            {!loading && !error && totalYears === 0 && (
                <Alert severity="info">
                    Belum ada data transaksi dalam 12 bulan terakhir.
                </Alert>
            )}

            {!loading &&
                Object.keys(grouped)
                    .map(Number)
                    .sort((a, b) => b - a)
                    .map((year) => (
                        <Accordion key={year} defaultExpanded={year === new Date().getFullYear()} sx={{ mb: 1 }}>
                            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                <Stack direction="row" alignItems="center" spacing={1}>
                                    <Typography variant="h6" fontWeight="bold">
                                        Tahun {year}
                                    </Typography>
                                    <Chip
                                        label={`${grouped[year].length} bulan`}
                                        size="small"
                                        variant="outlined"
                                    />
                                </Stack>
                            </AccordionSummary>
                            <AccordionDetails sx={{ pt: 0 }}>
                                <Paper variant="outlined">
                                    <List disablePadding>
                                        {grouped[year].map((m, idx) => (
                                            <div key={m.month}>
                                                {idx > 0 && <Divider />}
                                                <ListItemButton onClick={() => handleMonthClick(m.year, m.month)}>
                                                    <Box sx={{ display: "flex", alignItems: "center", width: "100%", flexWrap: "wrap", gap: 1 }}>
                                                        <CalendarMonthIcon color="action" sx={{ mr: 1 }} />
                                                        <ListItemText
                                                            primary={MONTHS[m.month - 1]}
                                                            primaryTypographyProps={{ fontWeight: 500 }}
                                                        />
                                                        <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ flex: 1, justifyContent: "flex-end" }}>
                                                            <Chip size="small" label={`${m.total} nota`} variant="outlined" />
                                                            {m.dropping > 0 && (
                                                                <Chip size="small" label={`${m.dropping} Dropping`} color="warning" variant="outlined" />
                                                            )}
                                                            {m.invoiced > 0 && (
                                                                <Chip size="small" label={`${m.invoiced} Invoiced`} color="success" variant="outlined" />
                                                            )}
                                                            {m.totalDeposit > 0 && (
                                                                <Chip
                                                                    size="small"
                                                                    label={`Dep: ${m.totalDeposit.toLocaleString("id-ID")}`}
                                                                    color="info"
                                                                    variant="outlined"
                                                                />
                                                            )}
                                                        </Stack>
                                                        <Typography variant="body2" color="primary" sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                                                            Lihat Detail <VisibilityIcon fontSize="small" />
                                                        </Typography>
                                                    </Box>
                                                </ListItemButton>
                                            </div>
                                        ))}
                                    </List>
                                </Paper>
                            </AccordionDetails>
                        </Accordion>
                    ))}
        </Box>
    );
}
