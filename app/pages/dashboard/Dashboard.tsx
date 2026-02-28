import { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Stack,
  Card,
  CardContent,
  Button,
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  Chip,
  CircularProgress,
  Alert,
  Divider,
} from "@mui/material";
import AssessmentIcon from "@mui/icons-material/Assessment";
import HistoryIcon from "@mui/icons-material/History";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import BarChartIcon from "@mui/icons-material/BarChart";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import StorefrontIcon from "@mui/icons-material/Storefront";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import { useNavigate } from "react-router";
import apiBe from "../../lib/axiosBe";
import { type Sale } from "../data/constant";

function todayRange() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const today = `${y}-${m}-${d}`;
  return { from: today, to: today, label: `${d}/${m}/${y}` };
}

function monthRange() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const lastDay = new Date(y, now.getMonth() + 1, 0).getDate();
  return {
    from: `${y}-${m}-01`,
    to: `${y}-${m}-${String(lastDay).padStart(2, "0")}`,
    label: `${now.toLocaleString("id-ID", { month: "long" })} ${y}`,
  };
}

function formatRupiah(val: string | number) {
  const n = Number(val || 0);
  return n.toLocaleString("id-ID");
}

function formatDate(dateStr: string) {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

interface SummaryCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color?: "primary" | "success" | "warning" | "error" | "info";
  sub?: string;
}

function SummaryCard({ icon, label, value, color = "primary", sub }: SummaryCardProps) {
  const colorMap = {
    primary: "#1976d2",
    success: "#2e7d32",
    warning: "#ed6c02",
    error: "#d32f2f",
    info: "#0288d1",
  };
  return (
    <Card variant="outlined" sx={{ flex: "1 1 200px", minWidth: 170 }}>
      <CardContent sx={{ pb: "12px !important" }}>
        <Stack direction="row" alignItems="flex-start" justifyContent="space-between">
          <Box>
            <Typography variant="caption" color="text.secondary" fontWeight={600} display="block">
              {label}
            </Typography>
            <Typography variant="h4" fontWeight="bold" color={colorMap[color]} sx={{ mt: 0.5 }}>
              {value}
            </Typography>
            {sub && (
              <Typography variant="caption" color="text.secondary">
                {sub}
              </Typography>
            )}
          </Box>
          <Box sx={{ color: colorMap[color], opacity: 0.8, mt: 0.5 }}>{icon}</Box>
        </Stack>
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { from, to, label: todayLabel } = todayRange();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [todayNota, setTodayNota] = useState<Sale[]>([]);
  const [monthNota, setMonthNota] = useState<Sale[]>([]);

  const { from: mFrom, to: mTo, label: monthLabel } = monthRange();

  useEffect(() => {
    const fetchAll = async () => {
      try {
        setLoading(true);
        const [todayRes, monthRes] = await Promise.all([
          apiBe.get("/api/web/sales", { params: { from, to, per_page: 1000 } }),
          apiBe.get("/api/web/sales", { params: { from: mFrom, to: mTo, per_page: 1000 } }),
        ]);
        const toList = (raw: any): Sale[] =>
          Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : [];
        setTodayNota(toList(todayRes.data));
        setMonthNota(toList(monthRes.data));
      } catch (err) {
        console.error("Gagal load dashboard:", err);
        setError("Gagal memuat data. Pastikan server laporan-be berjalan.");
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  const dropping = todayNota.filter((n) => n.status === "DROPPING").length;
  const invoiced = todayNota.filter((n) => n.status === "INVOICED").length;
  const totalDeposit = monthNota.reduce((sum, n) => sum + Number(n.deposit || 0), 0);
  const totalGrandTotal = monthNota.reduce((sum, n) => sum + Number(n.grand_total || 0), 0);
  const recentNota = todayNota.slice(0, 8);

  return (
    <Box sx={{ p: 3, maxWidth: 1100, margin: "0 auto" }}>
      {/* Header */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={3} flexWrap="wrap" gap={1}>
        <Box>
          <Typography variant="h5" fontWeight="bold">
            Dashboard Monitoring
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Hari ini: {todayLabel}
          </Typography>
        </Box>
      </Stack>

      {/* Error state */}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Summary Cards */}
      <Stack direction="row" spacing={1.5} mb={3} flexWrap="wrap" sx={{ "& > *": { flex: "1 1 180px" } }}>
        <SummaryCard
          icon={<ReceiptLongIcon sx={{ fontSize: 36 }} />}
          label="Total Nota Hari Ini"
          value={loading ? "—" : todayNota.length}
          color="primary"
        />
        <SummaryCard
          icon={<LocalShippingIcon sx={{ fontSize: 36 }} />}
          label="DROPPING Aktif"
          value={loading ? "—" : dropping}
          color="warning"
          sub="Menunggu invoice"
        />
        <SummaryCard
          icon={<CheckCircleIcon sx={{ fontSize: 36 }} />}
          label="INVOICED Hari Ini"
          value={loading ? "—" : invoiced}
          color="success"
        />
        <SummaryCard
          icon={<AttachMoneyIcon sx={{ fontSize: 36 }} />}
          label={`Total Deposit — ${monthLabel}`}
          value={loading ? "—" : `Rp ${formatRupiah(totalDeposit)}`}
          color="info"
          sub={`dari Rp ${formatRupiah(totalGrandTotal)} total tagihan`}
        />
      </Stack>

      {/* Quick Actions */}
      <Stack direction="row" spacing={1.5} mb={3} flexWrap="wrap">
        <Button variant="contained" startIcon={<ReceiptLongIcon />} onClick={() => navigate("/monitoring")}>
          Monitor Nota
        </Button>
        <Button
          variant="contained"
          color="secondary"
          startIcon={<BarChartIcon />}
          onClick={() => {
            const now = new Date();
            navigate(`/rekap-be/detail?year=${now.getFullYear()}&month=${now.getMonth() + 1}`);
          }}
        >
          📊 Rekap Bulan Ini
        </Button>
        <Button variant="outlined" startIcon={<AssessmentIcon />} onClick={() => navigate("/laporan")}>
          Laporan Harian
        </Button>
      </Stack>


      <Divider sx={{ mb: 3 }} />

      {/* Tabel Nota Hari Ini */}
      <Paper variant="outlined">
        <Box sx={{ px: 2, py: 1.5, display: "flex", alignItems: "center", gap: 1 }}>
          <StorefrontIcon color="action" />
          <Typography variant="subtitle1" fontWeight={600}>
            Nota Hari Ini
          </Typography>
          {!loading && (
            <Chip label={`${todayNota.length} nota`} size="small" variant="outlined" sx={{ ml: 0.5 }} />
          )}
        </Box>
        <Divider />

        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 5 }}>
            <CircularProgress />
          </Box>
        ) : recentNota.length === 0 ? (
          <Box sx={{ py: 4, textAlign: "center" }}>
            <Typography color="text.secondary">Belum ada nota transaksi hari ini.</Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: "grey.50" }}>
                  <TableCell sx={{ fontWeight: 600 }}>No. Nota</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Tanggal</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Outlet ID</TableCell>
                  <TableCell sx={{ fontWeight: 600 }} align="right">Grand Total</TableCell>
                  <TableCell sx={{ fontWeight: 600 }} align="right">Deposit</TableCell>
                  <TableCell sx={{ fontWeight: 600 }} align="center">Status</TableCell>
                  <TableCell sx={{ fontWeight: 600 }} align="center">Aksi</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {recentNota.map((nota) => {
                  const sisa = Number(nota.grand_total || 0) - Number(nota.deposit || 0);
                  return (
                    <TableRow key={nota.id} hover>
                      <TableCell sx={{ fontFamily: "monospace", fontWeight: 600, fontSize: "0.8rem" }}>
                        {nota.nota_number}
                      </TableCell>
                      <TableCell>{formatDate(nota.transaction_date)}</TableCell>
                      <TableCell>
                        {nota.outlet ? (
                          <Stack direction="row" spacing={0.5} alignItems="center">
                            <Typography variant="body2" fontWeight={600}>{nota.outlet.code}</Typography>
                            <Typography variant="caption" color="text.secondary">{nota.outlet.name}</Typography>
                          </Stack>
                        ) : (
                          `#${nota.outlet_id}`
                        )}
                      </TableCell>
                      <TableCell align="right">{formatRupiah(nota.grand_total)}</TableCell>
                      <TableCell align="right">{formatRupiah(nota.deposit)}</TableCell>
                      <TableCell align="center">
                        <Chip
                          label={nota.status}
                          size="small"
                          color={nota.status === "INVOICED" ? "success" : "warning"}
                          variant="filled"
                          sx={{ fontSize: "0.7rem" }}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => navigate(`/monitoring/${nota.id}`)}
                        >
                          Detail
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {!loading && todayNota.length > 0 && (
          <Box sx={{ px: 2, py: 1, borderTop: 1, borderColor: "divider", display: "flex", justifyContent: "flex-end" }}>
            <Button size="small" endIcon={<ReceiptLongIcon />} onClick={() => navigate("/monitoring")}>
              Lihat Semua Nota
            </Button>
          </Box>
        )}
      </Paper>
    </Box>
  );
}