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
  CircularProgress,
  Paper,
  Divider,
  Alert,
  Chip,
  Stack
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import EditIcon from "@mui/icons-material/Edit";
import FolderIcon from "@mui/icons-material/Folder";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import { useNavigate } from "react-router"; 
import apiBe from "../../lib/axiosBe";

// Pastikan path import ini benar sesuai struktur foldermu
// Mengambil MONTHS dari folder laporan
import { MONTHS } from "../data/constant"; 

// Tipe data response API
interface PeriodData {
  year: number;
  month: number;
}

// Tipe data grouping: { "2026": [3, 2, 1] }
interface GroupedPeriods {
  [year: number]: number[];
}

interface StatusCount {
  pending: number;
  approved: number;
  rejected: number;
}

export default function Rekap() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [groupedData, setGroupedData] = useState<GroupedPeriods>({});
  const [statusByPeriod, setStatusByPeriod] = useState<Record<string, StatusCount>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPeriods = async () => {
      try {
        setLoading(true);
        const response = await apiBe.get("/api/web/sales-reports/periods");
        const rawData: PeriodData[] = response.data;

        const grouped = rawData.reduce((acc, curr) => {
          const { year, month } = curr;
          if (!acc[year]) {
            acc[year] = [];
          }
          acc[year].push(month);
          return acc;
        }, {} as GroupedPeriods);

        setGroupedData(grouped);
      } catch (err) {
        console.error("Gagal ambil periode:", err);
        setError("Gagal memuat data rekap.");
      } finally {
        setLoading(false);
      }
    };

    fetchPeriods();
  }, []);

  // Fetch status ringkasan per periode (setelah groupedData ada)
  useEffect(() => {
    if (Object.keys(groupedData).length === 0) return;

    const periods: { year: number; month: number }[] = [];
    Object.keys(groupedData)
      .map(Number)
      .forEach((year) => {
        groupedData[year].forEach((month) => {
          periods.push({ year, month });
        });
      });

    const fetchStatusForPeriods = async () => {
      try {
        const results = await Promise.all(
          periods.map(({ year, month }) =>
            apiBe.get("/api/web/sales-reports", { params: { year, month } }).then((res) => ({
              year,
              month,
              rows: res.data as { status?: string }[],
            }))
          )
        );
        const next: Record<string, StatusCount> = {};
        results.forEach(({ year, month, rows }) => {
          const key = `${year}-${month}`;
          next[key] = { pending: 0, approved: 0, rejected: 0 };
          rows.forEach((row) => {
            const s = row.status ?? "pending";
            if (s === "pending") next[key].pending += 1;
            else if (s === "approved") next[key].approved += 1;
            else next[key].rejected += 1;
          });
        });
        setStatusByPeriod(next);
      } catch (err) {
        console.error("Gagal ambil ringkasan status:", err);
      }
    };

    fetchStatusForPeriods();
  }, [groupedData]);

  // Navigasi ke Halaman Edit dengan Query Params
  const handleMonthClick = (year: number, month: number) => {
    navigate(`/edit?year=${year}&month=${month}`);
  };

  return (
    <Box sx={{ p: 3, maxWidth: 800, margin: "0 auto" }}>
      <Typography variant="h4" fontWeight="bold" mb={3} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <FolderIcon fontSize="large" color="primary" /> Rekap Laporan
      </Typography>

      {loading && (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {error && <Alert severity="error">{error}</Alert>}

      {!loading && !error && Object.keys(groupedData).length === 0 && (
        <Alert severity="info">Belum ada data laporan yang tersimpan.</Alert>
      )}

      {/* RENDER ACCORDION PER TAHUN */}
      {!loading && Object.keys(groupedData)
        .map(Number)
        .sort((a, b) => b - a) // Urutkan tahun terbaru di atas
        .map((year) => (
          <Accordion key={year} defaultExpanded={year === new Date().getFullYear()}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="h6" fontWeight="bold">
                Tahun {year}
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Paper variant="outlined">
                <List disablePadding>
                  {groupedData[year].map((monthIndex, idx) => (
                    <div key={monthIndex}>
                      {idx > 0 && <Divider />} 
                      
                      <ListItemButton onClick={() => handleMonthClick(year, monthIndex)}>
                        <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', flexWrap: 'wrap', gap: 1 }}>
                            <CalendarMonthIcon color="action" sx={{ mr: 2 }} />
                            
                            <ListItemText 
                              primary={MONTHS[monthIndex - 1]} 
                              primaryTypographyProps={{ fontWeight: 500 }}
                            />

                            {statusByPeriod[`${year}-${monthIndex}`] && (
                              <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ flex: 1, justifyContent: 'flex-end' }}>
                                {statusByPeriod[`${year}-${monthIndex}`].pending > 0 && (
                                  <Chip size="small" label={`${statusByPeriod[`${year}-${monthIndex}`].pending} Pending`} color="warning" variant="outlined" />
                                )}
                                {statusByPeriod[`${year}-${monthIndex}`].approved > 0 && (
                                  <Chip size="small" label={`${statusByPeriod[`${year}-${monthIndex}`].approved} Approved`} color="success" variant="outlined" />
                                )}
                                {statusByPeriod[`${year}-${monthIndex}`].rejected > 0 && (
                                  <Chip size="small" label={`${statusByPeriod[`${year}-${monthIndex}`].rejected} Rejected`} color="error" variant="outlined" />
                                )}
                              </Stack>
                            )}
                            
                            <Typography variant="body2" color="primary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                Edit <EditIcon fontSize="small" />
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