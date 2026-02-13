import { useMemo } from "react";
import {
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TextField,
  IconButton,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Stack,
  Chip,
  Divider,
  Grid,
  Button,
  MenuItem
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
// Sesuaikan path import ini dengan struktur foldermu
import { type RowType, calcTotals } from "../data/constant"; 

interface WeeklySectionProps {
  week: number;
  rows: RowType[];
  // Props baru untuk Master Data
  masterOutlets: { id: string; name: string }[];
  masterItems: { id: string; name: string }[];
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

      <AccordionDetails>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
              <TableCell width="25%">Outlet</TableCell>
              <TableCell width="25%">Item</TableCell>
              <TableCell width="10%">Qty Order</TableCell>
              <TableCell width="10%">Qty Sold</TableCell>
              <TableCell width="5%">Sisa</TableCell>
              <TableCell width="20%">Deposit</TableCell>
              <TableCell width={50} align="center">Hapus</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row, idx) => {
              const order = Number(row.qty_order || 0);
              const sold = Number(row.qty_sold || 0);
              const sisa = order - sold;

              return (
                <TableRow key={idx} hover>
                  {/* KOLOM OUTLET (DROPDOWN) */}
                  <TableCell>
                    <TextField
                      select
                      size="small"
                      variant="standard"
                      fullWidth
                      value={row.outlet_id}
                      onChange={(e) => onUpdateRow(idx, "outlet_id", e.target.value)}
                    >
                        <MenuItem value=""><em>Pilih Outlet</em></MenuItem>
                        {masterOutlets.map((o) => (
                            <MenuItem key={o.id} value={o.id}>{o.name}</MenuItem>
                        ))}
                    </TextField>
                  </TableCell>

                  {/* KOLOM ITEM (DROPDOWN) */}
                  <TableCell>
                    <TextField
                      select
                      size="small"
                      variant="standard"
                      fullWidth
                      value={row.item_id}
                      onChange={(e) => onUpdateRow(idx, "item_id", e.target.value)}
                    >
                        <MenuItem value=""><em>Pilih Item</em></MenuItem>
                        {masterItems.map((item) => (
                            <MenuItem key={item.id} value={item.id}>{item.name}</MenuItem>
                        ))}
                    </TextField>
                  </TableCell>

                  <TableCell>
                    <TextField
                      size="small"
                      variant="standard"
                      type="number"
                      fullWidth
                      value={row.qty_order}
                      onChange={(e) => onUpdateRow(idx, "qty_order", e.target.value)}
                    />
                  </TableCell>

                  <TableCell>
                    <TextField
                      size="small"
                      variant="standard"
                      type="number"
                      fullWidth
                      value={row.qty_sold}
                      onChange={(e) => onUpdateRow(idx, "qty_sold", e.target.value)}
                    />
                  </TableCell>

                  <TableCell>
                    <Typography
                      variant="body2"
                      color={sisa !== 0 ? "error.main" : "text.secondary"}
                      fontWeight={sisa !== 0 ? "bold" : "normal"}
                    >
                      {sisa}
                    </Typography>
                  </TableCell>

                  <TableCell>
                    <TextField
                      size="small"
                      variant="standard"
                      type="number"
                      fullWidth
                      value={row.deposit}
                      onChange={(e) => onUpdateRow(idx, "deposit", e.target.value)}
                    />
                  </TableCell>

                  <TableCell align="center">
                    <IconButton size="small" onClick={() => onDeleteRow(idx)} color="error">
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        <Divider sx={{ my: 2 }} />

        {/* Footer Total & Tombol Tambah */}
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={8}>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
               <TextField
                  label="Total Order"
                  value={totals.qty_order}
                  size="small"
                  InputProps={{ readOnly: true }}
                  variant="filled"
                />
                <TextField
                  label="Total Sold"
                  value={totals.qty_sold}
                  size="small"
                  InputProps={{ readOnly: true }}
                  variant="filled"
                />
                <TextField
                  label="Total Sisa"
                  value={totals.qty_remaining}
                  size="small"
                  InputProps={{ readOnly: true }}
                  variant="filled"
                  error={totals.qty_remaining > 0}
                />
                 <TextField
                  label="Total Deposit"
                  value={totals.deposit}
                  size="small"
                  InputProps={{ readOnly: true }}
                  variant="filled"
                />
            </Stack>
          </Grid>
          <Grid item xs={12} md={4} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
             <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={onAddRow}
            >
              Tambah Baris
            </Button>
          </Grid>
        </Grid>
      </AccordionDetails>
    </Accordion>
  );
}