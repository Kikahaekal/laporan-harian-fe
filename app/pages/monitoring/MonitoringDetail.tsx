import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router";
import {
    Box,
    Typography,
    Stack,
    Paper,
    Table,
    TableHead,
    TableRow,
    TableCell,
    TableBody,
    TableContainer,
    Chip,
    Alert,
    Button,
    Divider,
    Card,
    CardContent,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
} from "@mui/material";
import { CardsSkeleton, TableRowsSkeleton } from "../../components/TableSkeleton";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import StorefrontIcon from "@mui/icons-material/Storefront";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import PersonIcon from "@mui/icons-material/Person";
import apiBe from "../../lib/axiosBe";
import { type Sale } from "../data/constant";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatRupiah(val: string | number) {
    return Number(val || 0).toLocaleString("id-ID");
}

function formatDate(dateStr: string) {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}
function weekOfMonth(dateStr: string) {
    if (!dateStr) return 0;
    return Math.ceil(new Date(dateStr).getDate() / 7);
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <Stack direction="row" spacing={1} alignItems="baseline" flexWrap="wrap">
            <Typography variant="caption" color="text.secondary" sx={{ minWidth: 90, fontWeight: 600 }}>
                {label}
            </Typography>
            <Box>{children}</Box>
        </Stack>
    );
}

// ─── Component ────────────────────────────────────────────────────────────────

interface ClosedPhoto {
    id: number;
    outlet_id: number;
    closed_date: string;
    note?: string | null;
    photo_url?: string | null;
    user?: { id: number; name: string };
}

export default function MonitoringDetail() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [nota, setNota] = useState<Sale | null>(null);
    const [closedPhoto, setClosedPhoto] = useState<ClosedPhoto | null>(null);
    const [photoLoading, setPhotoLoading] = useState(false);
    const [photoOpen, setPhotoOpen] = useState(false);

    useEffect(() => {
        if (!id) return;
        const controller = new AbortController();
        const fetch = async () => {
            setLoading(true);
            setError(null);
            try {
                const res = await apiBe.get(`/api/web/sales/${id}`, { signal: controller.signal });
                setNota(res.data as Sale);
            } catch (err: any) {
                if (err.name !== "CanceledError") {
                    setError("Gagal memuat detail nota. Pastikan ID valid dan server berjalan.");
                }
            } finally {
                setLoading(false);
            }
        };
        fetch();
        return () => controller.abort();
    }, [id]);

    useEffect(() => {
        if (!nota?.outlet_id) return;
        let active = true;
        const load = async () => {
            setPhotoLoading(true);
            try {
                const res = await apiBe.get(`/api/mobile/outlets/${nota.outlet_id}/closed-photo`);
                if (!active) return;
                setClosedPhoto(res.data?.data ?? null);
            } catch (err: any) {
                if (!active) return;
                if (err?.response?.status === 404) {
                    setClosedPhoto(null);
                } else {
                    console.error("Gagal load foto tutup outlet", err);
                }
            } finally {
                if (active) setPhotoLoading(false);
            }
        };
        load();
        return () => {
            active = false;
        };
    }, [nota?.outlet_id]);

    const saleItems = nota?.sale_items ?? [];

    const totals = useMemo(
        () =>
            saleItems.reduce(
                (acc, item) => ({
                    qty_order: acc.qty_order + (item.qty_order || 0),
                    qty_sold: acc.qty_sold + (item.qty_sold || 0),
                    qty_returned: acc.qty_returned + (item.qty_returned || 0),
                    qty_sisa: acc.qty_sisa + ((item.qty_order || 0) - (item.qty_sold || 0) - (item.qty_returned || 0)),
                    subtotal: acc.subtotal + Number(item.subtotal || 0),
                }),
                { qty_order: 0, qty_sold: 0, qty_returned: 0, qty_sisa: 0, subtotal: 0 }
            ),
        [saleItems]
    );

    const sisa = nota ? Number(nota.grand_total || 0) - Number(nota.deposit || 0) : 0;

    if (loading) {
        return (
            <Box sx={{ p: 1.5, maxWidth: 900, margin: "0 auto" }}>
                <Button startIcon={<ArrowBackIcon />} onClick={() => navigate("/rekap-be")} sx={{ mb: 1.5 }} disabled>
                    Kembali ke Rekap
                </Button>
                <CardsSkeleton count={3} />
                <Paper variant="outlined" sx={{ mt: 2, p: 2 }}>
                    <TableContainer>
                        <Table size="small">
                            <TableBody>
                                <TableRowsSkeleton rows={5} cols={7} />
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Paper>
            </Box>
        );
    }

    if (error || !nota) {
        return (
            <Box sx={{ p: 3 }}>
                <Button startIcon={<ArrowBackIcon />} onClick={() => navigate("/laporan")} sx={{ mb: 2 }}>
                    Kembali
                </Button>
                <Alert severity="error">{error ?? "Nota tidak ditemukan."}</Alert>
            </Box>
        );
    }

    return (
        <Box sx={{ p: 1.5, maxWidth: 900, margin: "0 auto" }}>
            {/* Back button */}
            <Button startIcon={<ArrowBackIcon />} onClick={() => navigate("/rekap-be")} sx={{ mb: 1 }}>
                Kembali ke Rekap
            </Button>

            {/* Header */}
            <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1.5} flexWrap="wrap" gap={1}>
                <Stack direction="row" alignItems="center" spacing={1}>
                    <ReceiptLongIcon color="primary" />
                    <Typography variant="subtitle1" fontWeight="bold" sx={{ fontFamily: "monospace" }}>
                        {nota.nota_number}
                    </Typography>
                </Stack>
                <Chip
                    label={nota.status}
                    color={nota.status === "INVOICED" ? "success" : "warning"}
                    variant="filled"
                />
            </Stack>

            {/* Info Cards baris atas */}
            <Stack direction="row" spacing={1} mb={1.5} flexWrap="wrap" sx={{ "& > *": { flex: "1 1 180px" } }}>
                {/* Outlet */}
                <Card variant="outlined">
                    <CardContent sx={{ py: 1.25 }}>
                        <Stack direction="row" spacing={1} alignItems="flex-start">
                            <StorefrontIcon color="action" sx={{ mt: 0.25 }} />
                            <Box>
                                <Typography variant="caption" color="text.secondary" fontWeight={600}>Outlet</Typography>
                                {nota.outlet ? (
                                    <>
                                        <Typography variant="body2" fontWeight={600}>{nota.outlet.name}</Typography>
                                        <Typography variant="caption" color="text.secondary">{nota.outlet.code}</Typography>
                                    </>
                                ) : (
                                    <Typography variant="body2">ID #{nota.outlet_id}</Typography>
                                )}
                                <Box sx={{ mt: 0.75 }}>
                                    <Button
                                        size="small"
                                        variant="outlined"
                                        onClick={() => setPhotoOpen(true)}
                                        disabled={!closedPhoto || photoLoading}
                                    >
                                        {photoLoading ? "Memuat..." : "Preview Foto Tutup"}
                                    </Button>
                                </Box>
                            </Box>
                        </Stack>
                    </CardContent>
                </Card>

                {/* Tanggal */}
                <Card variant="outlined">
                    <CardContent sx={{ py: 1.25 }}>
                        <Stack direction="row" spacing={1} alignItems="flex-start">
                            <CalendarMonthIcon color="action" sx={{ mt: 0.25 }} />
                            <Box>
                                <Typography variant="caption" color="text.secondary" fontWeight={600}>Tanggal Transaksi</Typography>
                                <Typography variant="body2" fontWeight={600}>{formatDate(nota.transaction_date)}</Typography>
                                <Typography variant="caption" color="text.secondary">Minggu ke-{weekOfMonth(nota.transaction_date)}</Typography>
                            </Box>
                        </Stack>
                    </CardContent>
                </Card>

                {/* User */}
                <Card variant="outlined">
                    <CardContent sx={{ py: 1.25 }}>
                        <Stack direction="row" spacing={1} alignItems="flex-start">
                            <PersonIcon color="action" sx={{ mt: 0.25 }} />
                            <Box>
                                <Typography variant="caption" color="text.secondary" fontWeight={600}>User / Sales</Typography>
                                <Typography variant="body2" fontWeight={600}>{nota.user?.name ?? "-"}</Typography>
                            </Box>
                        </Stack>
                    </CardContent>
                </Card>
            </Stack>

            {/* Keuangan */}
            <Paper variant="outlined" sx={{ p: 1.5, mb: 1.5 }}>
                <Typography variant="subtitle2" fontWeight={600} mb={1}>Ringkasan Pembayaran</Typography>
                <Stack direction="row" spacing={3} flexWrap="wrap">
                    <Box>
                        <Typography variant="caption" color="text.secondary" fontWeight={600} display="block">Grand Total</Typography>
                        <Typography variant="h6" fontWeight="bold" color="primary">
                            Rp {formatRupiah(nota.grand_total)}
                        </Typography>
                    </Box>
                    <Box>
                        <Typography variant="caption" color="text.secondary" fontWeight={600} display="block">Deposit Diterima</Typography>
                        <Typography variant="h6" fontWeight="bold" color="success.main">
                            Rp {formatRupiah(nota.deposit)}
                        </Typography>
                    </Box>
                    <Box>
                        <Typography variant="caption" color="text.secondary" fontWeight={600} display="block">Sisa</Typography>
                        <Typography variant="h6" fontWeight="bold" color={sisa > 0 ? "error.main" : "text.secondary"}>
                            {sisa > 0 ? `Rp ${formatRupiah(sisa)}` : "Lunas"}
                        </Typography>
                    </Box>
                </Stack>
                {nota.note && (
                    <>
                        <Divider sx={{ my: 1.5 }} />
                        <InfoRow label="Catatan">
                            <Typography variant="body2">{nota.note}</Typography>
                        </InfoRow>
                    </>
                )}
            </Paper>

            {/* Tabel Sale Items */}
            <Paper variant="outlined">
                <Box sx={{ px: 1.5, py: 1, display: "flex", alignItems: "center", gap: 1 }}>
                    <Typography variant="subtitle2" fontWeight={600}>Detail Barang</Typography>
                    <Chip label={`${saleItems.length} item`} size="small" variant="outlined" />
                </Box>
                <Divider />

                {saleItems.length === 0 ? (
                    <Box sx={{ py: 4, textAlign: "center" }}>
                        <Typography color="text.secondary">Tidak ada data item pada nota ini.</Typography>
                    </Box>
                ) : (
                    <TableContainer>
                        <Table size="small">
                            <TableHead>
                                <TableRow sx={{ bgcolor: "grey.50" }}>
                                    <TableCell sx={{ fontWeight: 600 }}>Item</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }} align="center">Qty Order</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }} align="center">Qty Sold</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }} align="center">Qty Retur</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }} align="center">Sisa</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }} align="right">Harga</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }} align="right">Subtotal</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {saleItems.map((item) => (
                                    <TableRow key={item.id} hover>
                                        <TableCell>
                                            {item.item ? (
                                                <Stack>
                                                    <Typography variant="body2" fontWeight={600}>{item.item.code}</Typography>
                                                    <Typography variant="caption" color="text.secondary">{item.item.name}</Typography>
                                                </Stack>
                                            ) : (
                                                <Typography variant="body2">ID #{item.item_id}</Typography>
                                            )}
                                        </TableCell>
                                        <TableCell align="center">{item.qty_order}</TableCell>
                                        <TableCell align="center">{item.qty_sold}</TableCell>
                                        <TableCell align="center">
                                            {item.qty_returned > 0 ? (
                                                <Typography color="warning.main" fontWeight={600} variant="body2">
                                                    {item.qty_returned}
                                                </Typography>
                                            ) : (
                                                <Typography color="text.secondary" variant="body2">0</Typography>
                                            )}
                                        </TableCell>
                                        <TableCell align="center">
                                            {(() => {
                                                const sisa = item.qty_order - item.qty_sold - item.qty_returned;
                                                return sisa > 0 ? (
                                                    <Typography color="error.main" fontWeight={600} variant="body2">{sisa}</Typography>
                                                ) : (
                                                    <Typography color="text.secondary" variant="body2">0</Typography>
                                                );
                                            })()}
                                        </TableCell>
                                        <TableCell align="right">{formatRupiah(item.price_at_moment)}</TableCell>
                                        <TableCell align="right">
                                            <Typography fontWeight={500} variant="body2">
                                                {formatRupiah(item.subtotal)}
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                ))}

                                {/* Total Row */}
                                <TableRow sx={{ bgcolor: "grey.100" }}>
                                    <TableCell sx={{ fontWeight: 700 }}>TOTAL</TableCell>
                                    <TableCell align="center" sx={{ fontWeight: 700 }}>{totals.qty_order}</TableCell>
                                    <TableCell align="center" sx={{ fontWeight: 700 }}>{totals.qty_sold}</TableCell>
                                    <TableCell align="center" sx={{ fontWeight: 700, color: totals.qty_returned > 0 ? "warning.main" : "inherit" }}>
                                        {totals.qty_returned}
                                    </TableCell>
                                    <TableCell align="center" sx={{ fontWeight: 700, color: totals.qty_sisa > 0 ? "error.main" : "inherit" }}>
                                        {totals.qty_sisa}
                                    </TableCell>
                                    <TableCell />
                                    <TableCell align="right" sx={{ fontWeight: 700 }}>
                                        Rp {formatRupiah(totals.subtotal)}
                                    </TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </Paper>
            <Dialog open={photoOpen} onClose={() => setPhotoOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Foto Toko Tutup</DialogTitle>
                <DialogContent sx={{ pt: 1 }}>
                    {closedPhoto?.photo_url ? (
                        <Box
                            component="img"
                            src={closedPhoto.photo_url}
                            alt={`Foto tutup ${nota.outlet?.name ?? nota.outlet_id}`}
                            sx={{ width: "100%", borderRadius: 1, border: "1px solid", borderColor: "divider" }}
                        />
                    ) : (
                        <Typography color="text.secondary">Belum ada foto tutup untuk outlet ini hari ini.</Typography>
                    )}
                    {closedPhoto?.note && (
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
                            {closedPhoto.note}
                        </Typography>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setPhotoOpen(false)} color="inherit">Tutup</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
