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
  Alert
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import EditIcon from "@mui/icons-material/Edit";
import FolderIcon from "@mui/icons-material/Folder";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import { useNavigate } from "react-router"; 
import api from "../../lib/axios"; 

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

export default function Rekap() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [groupedData, setGroupedData] = useState<GroupedPeriods>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPeriods = async () => {
      try {
        setLoading(true);
        // Panggil endpoint baru: ambil daftar tahun/bulan yg tersedia
        const response = await api.get("/api/sales-reports/periods");
        const rawData: PeriodData[] = response.data;

        // GROUPING: Ubah array flat menjadi object berdasarkan tahun
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
                        <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                            <CalendarMonthIcon color="action" sx={{ mr: 2 }} />
                            
                            <ListItemText 
                              // monthIndex - 1 karena array bulan mulai dari 0 (Januari = index 0)
                              primary={MONTHS[monthIndex - 1]} 
                              primaryTypographyProps={{ fontWeight: 500 }}
                            />
                            
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