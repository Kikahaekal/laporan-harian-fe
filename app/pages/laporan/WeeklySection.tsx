import { useMemo } from "react";
import {
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  TextField,
  IconButton,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Stack,
  Chip,
  Divider,
  Box,
  Button,
  MenuItem,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
// Sesuaikan path import ini dengan struktur foldermu
import { type RowType, type OutletMaster, type ItemMaster, calcTotals } from "../data/constant";

interface WeeklySectionProps {
  week: number;
  rows: RowType[];
  masterOutlets: OutletMaster[];
  masterItems: ItemMaster[];
  onUpdateRow: (idx: number, field: keyof RowType, val: string) => void;
  onAddRow: () => void;
  onDeleteRow: (idx: number) => void;
}

export default function WeeklySection({
  week,
  rows,
  masterOutlets,
  masterItems,
  onUpdateRow,
  onAddRow,
  onDeleteRow,
}: WeeklySectionProps) {
  
  const totals = useMemo(() => calcTotals(rows), [rows]);

  return (
    <Accordion defaultExpanded={week === 1} sx={{ mb: 2 }}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Stack direction="row" alignItems="center" spacing={2} sx={{ width: '100%' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: "bold", width: "100px" }}>
            Minggu {week}
          </Typography>
          
          {/* Info Badge di Header Accordion */}
          <Chip label={`Order: ${totals.qty_order}`} size="small" color="primary" variant="outlined" />
          <Chip 
            label={`Sisa: ${totals.qty_remaining}`} 
            size="small" 
            color={totals.qty_remaining > 0 ? "warning" : "default"} 
            variant="outlined" 
          />
        </Stack>
      </AccordionSummary>

      <AccordionDetails sx={{ pt: 0 }}>
        <TableContainer>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600, bgcolor: "grey.100", minWidth: 140 }}>Outlet</TableCell>
                <TableCell sx={{ fontWeight: 600, bgcolor: "grey.100", minWidth: 140 }}>Item</TableCell>
                <TableCell sx={{ fontWeight: 600, bgcolor: "grey.100", width: 90 }} align="center">Qty Order</TableCell>
                <TableCell sx={{ fontWeight: 600, bgcolor: "grey.100", width: 90 }} align="center">Qty Sold</TableCell>
                <TableCell sx={{ fontWeight: 600, bgcolor: "grey.100", width: 56 }} align="center">Sisa</TableCell>
                <TableCell sx={{ fontWeight: 600, bgcolor: "grey.100", width: 100 }} align="right">Deposit</TableCell>
                <TableCell sx={{ fontWeight: 600, bgcolor: "grey.100", width: 90 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 600, bgcolor: "grey.100", width: 56 }} align="center">Hapus</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row, idx) => {
                const order = Number(row.qty_order || 0);
                const sold = Number(row.qty_sold || 0);
                const sisa = order - sold;

                return (
                  <TableRow key={idx} hover sx={{ "&:nth-of-type(even)": { bgcolor: "action.hover" } }}>
                    <TableCell>
                      <TextField
                        select
                        size="small"
                        variant="outlined"
                        fullWidth
                        placeholder="Pilih Outlet"
                        value={row.outlet_id}
                        onChange={(e) => onUpdateRow(idx, "outlet_id", e.target.value)}
                        sx={{ "& .MuiInputBase-root": { backgroundColor: "background.paper" } }}
                      >
                        <MenuItem value=""><em>Pilih Outlet</em></MenuItem>
                        {masterOutlets.map((o) => (
                          <MenuItem key={o.id} value={String(o.id)}>{o.name}</MenuItem>
                        ))}
                      </TextField>
                    </TableCell>
                    <TableCell>
                      <TextField
                        select
                        size="small"
                        variant="outlined"
                        fullWidth
                        placeholder="Pilih Item"
                        value={row.item_id}
                        onChange={(e) => onUpdateRow(idx, "item_id", e.target.value)}
                        sx={{ "& .MuiInputBase-root": { backgroundColor: "background.paper" } }}
                      >
                        <MenuItem value=""><em>Pilih Item</em></MenuItem>
                        {masterItems.map((item) => (
                          <MenuItem key={item.id} value={String(item.id)}>{item.name}</MenuItem>
                        ))}
                      </TextField>
                    </TableCell>
                    <TableCell align="center">
                      <TextField
                        size="small"
                        variant="outlined"
                        type="number"
                        fullWidth
                        value={row.qty_order}
                        onChange={(e) => onUpdateRow(idx, "qty_order", e.target.value)}
                        inputProps={{ min: 0 }}
                        sx={{ "& .MuiInputBase-root": { backgroundColor: "background.paper" } }}
                      />
                    </TableCell>
                    <TableCell align="center">
                      <TextField
                        size="small"
                        variant="outlined"
                        type="number"
                        fullWidth
                        value={row.qty_sold}
                        onChange={(e) => onUpdateRow(idx, "qty_sold", e.target.value)}
                        inputProps={{ min: 0 }}
                        sx={{ "& .MuiInputBase-root": { backgroundColor: "background.paper" } }}
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Typography
                        variant="body2"
                        color={sisa !== 0 ? "error.main" : "text.secondary"}
                        fontWeight={sisa !== 0 ? "bold" : "normal"}
                      >
                        {sisa}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <TextField
                        size="small"
                        variant="outlined"
                        type="number"
                        fullWidth
                        value={row.deposit}
                        onChange={(e) => onUpdateRow(idx, "deposit", e.target.value)}
                        inputProps={{ min: 0 }}
                        sx={{ "& .MuiInputBase-root": { backgroundColor: "background.paper" } }}
                      />
                    </TableCell>

                    <TableCell>
                      {row.status ? (
                        <Chip
                          size="small"
                          label={row.status === "pending" ? "Pending" : row.status === "approved" ? "Approved" : "Rejected"}
                          color={row.status === "pending" ? "warning" : row.status === "approved" ? "success" : "error"}
                          variant="outlined"
                        />
                      ) : (
                        <Typography variant="body2" color="text.secondary">Baru</Typography>
                      )}
                    </TableCell>
                    <TableCell align="center">
                      <IconButton size="small" onClick={() => onDeleteRow(idx)} color="error" aria-label="Hapus baris">
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>

        <Divider sx={{ my: 2 }} />

        <Box sx={{ display: "flex", gap: 2, alignItems: "center", flexWrap: "wrap" }}>
          <Box sx={{ flex: "1 1 480px" }}>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2} flexWrap="wrap">
              <TextField label="Total Order" value={totals.qty_order} size="small" InputProps={{ readOnly: true }} variant="outlined" sx={{ minWidth: 100 }} />
              <TextField label="Total Sold" value={totals.qty_sold} size="small" InputProps={{ readOnly: true }} variant="outlined" sx={{ minWidth: 100 }} />
              <TextField label="Total Sisa" value={totals.qty_remaining} size="small" InputProps={{ readOnly: true }} variant="outlined" error={totals.qty_remaining > 0} sx={{ minWidth: 100 }} />
              <TextField label="Total Deposit" value={totals.deposit} size="small" InputProps={{ readOnly: true }} variant="outlined" sx={{ minWidth: 120 }} />
            </Stack>
          </Box>
          <Box sx={{ flex: "1 1 180px", display: "flex", justifyContent: { xs: "flex-start", md: "flex-end" } }}>
            <Button variant="outlined" startIcon={<AddIcon />} onClick={onAddRow}>
              Tambah Baris
            </Button>
          </Box>
        </Box>
      </AccordionDetails>
    </Accordion>
  );
}
