import { useMemo } from "react";
import {
  Box,
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
  Button,
  MenuItem,
  Paper,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import StorefrontIcon from "@mui/icons-material/Storefront";
import { type OutletGroup, type ItemRow, type OutletMaster, type ItemMaster, type ReportStatus, getDateForDayWeek, formatDisplayDate } from "../data/constant";

const STATUS_OPTIONS: { value: ReportStatus; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

interface WeeklySectionByOutletProps {
  week: number;
  dayName: string;
  year: number;
  month: number;
  groups: OutletGroup[];
  masterOutlets: OutletMaster[];
  masterItems: ItemMaster[];
  readOnly?: boolean;
  onOutletChange: (groupIdx: number, outlet_id: string) => void;
  onStatusChange: (groupIdx: number, status: ReportStatus) => void;
  onItemChange: (groupIdx: number, itemIdx: number, field: keyof ItemRow, value: string) => void;
  onAddItem: (groupIdx: number) => void;
  onRemoveItem: (groupIdx: number, itemIdx: number) => void;
  onAddOutlet: () => void;
  onRemoveOutlet: (groupIdx: number) => void;
}

function itemRowTotals(items: ItemRow[]) {
  return items.reduce(
    (acc, it) => {
      const order = Number(it.qty_order || 0);
      const sold = Number(it.qty_sold || 0);
      acc.qty_order += order;
      acc.qty_sold += sold;
      acc.qty_remaining += order - sold;
      acc.deposit += Number(it.deposit || 0);
      return acc;
    },
    { qty_order: 0, qty_sold: 0, qty_remaining: 0, deposit: 0 }
  );
}

export default function WeeklySectionByOutlet({
  week,
  dayName,
  year,
  month,
  groups,
  masterOutlets,
  masterItems,
  readOnly = false,
  onOutletChange,
  onStatusChange,
  onItemChange,
  onAddItem,
  onRemoveItem,
  onAddOutlet,
  onRemoveOutlet,
}: WeeklySectionByOutletProps) {
  const totalItems = useMemo(() => groups.reduce((sum, g) => sum + g.items.length, 0), [groups]);
  const displayDate = useMemo(() => {
    const d = getDateForDayWeek(year, month, dayName, week);
    return d ? formatDisplayDate(d) : null;
  }, [year, month, dayName, week]);

  const inputSx = (hasValue: boolean) => ({
    "& .MuiInputBase-root": {
      backgroundColor: hasValue ? "#e3f2fd" : "background.paper",
      fontSize: "0.8125rem",
    },
    "& .MuiOutlinedInput-input": { py: 0.75 },
  });

  return (
    <Accordion defaultExpanded={week === 1} sx={{ mb: 1.5 }} elevation={0} variant="outlined">
      <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ minHeight: 40, "& .MuiAccordionSummary-content": { my: 0.5 } }}>
        <Stack direction="row" alignItems="center" spacing={1.5} sx={{ width: "100%" }} flexWrap="wrap">
          <Typography variant="subtitle2" fontWeight={600}>
            Minggu {week}
          </Typography>
          {displayDate && (
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
              Tanggal: {displayDate}
            </Typography>
          )}
          <Chip label={`${groups.length} outlet`} size="small" variant="outlined" />
          <Chip label={`${totalItems} baris item`} size="small" variant="outlined" color="primary" />
        </Stack>
      </AccordionSummary>
      <AccordionDetails sx={{ pt: 0, px: 1.5, pb: 1.5 }}>
        {displayDate && (
          <TextField
            label="Tanggal"
            value={displayDate}
            size="small"
            variant="outlined"
            disabled
            sx={{ mb: 1.5, maxWidth: 160, "& .MuiInputBase-input": { cursor: "default" } }}
            inputProps={{ readOnly: true }}
          />
        )}
        <Stack spacing={1.5}>
          {groups.map((group, gIdx) => {
            const totals = itemRowTotals(group.items);
            const outletName = group.outlet_id ? masterOutlets.find((o) => String(o.code) === group.outlet_id)?.name ?? "" : "";

            return (
              <Paper key={gIdx} variant="outlined" sx={{ p: 1, bgcolor: "grey.50", overflowX: "auto" }}>
                <Stack direction={{ xs: "column", sm: "row" }} alignItems={{ xs: "stretch", sm: "center" }} spacing={1} sx={{ mb: 1 }} flexWrap="wrap">
                  <StorefrontIcon fontSize="small" color="action" />
                  <TextField
                    select
                    size="small"
                    label="Pilih Outlet"
                    variant="outlined"
                    placeholder="Pilih Outlet"
                    value={group.outlet_id}
                    onChange={(e) => onOutletChange(gIdx, e.target.value)}
                    disabled={readOnly}
                    sx={{ minWidth: 180, width: { xs: "100%", sm: "auto" }, "& .MuiInputBase-root": { backgroundColor: group.outlet_id ? "#e3f2fd" : "background.paper" }, "& .MuiOutlinedInput-input": { py: 1 } }}
                  >
                    {masterOutlets.map((o) => (
                      <MenuItem key={o.id} value={String(o.code)}>{`${o.code} — ${o.name}`}</MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    select
                    size="medium"
                    variant="outlined"
                    label="Status Pembayaran"
                    value={group.status ?? "pending"}
                    onChange={(e) => onStatusChange(gIdx, e.target.value as ReportStatus)}
                    disabled={readOnly}
                    sx={{ minWidth: 150, width: { xs: "100%", sm: "auto" }, "& .MuiInputBase-root": { backgroundColor: "#e8f5e9" }, "& .MuiOutlinedInput-input": { py: 0.5 } }}
                  >
                    {STATUS_OPTIONS.map((opt) => (
                      <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                    ))}
                  </TextField>
                  {outletName && (
                    <Typography variant="caption" color="text.secondary" noWrap sx={{ flex: 1 }}>
                      {group.items.filter((i) => i.item_id).length} item
                    </Typography>
                  )}
                  {!readOnly && (
                    <IconButton size="small" onClick={() => onRemoveOutlet(gIdx)} color="error" aria-label="Hapus outlet">
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  )}
                </Stack>

                <Table size="small" sx={{ minWidth: 520, tableLayout: { xs: "auto", sm: "fixed" }, "& td, & th": { py: 0.5, px: 0.75, verticalAlign: "middle" } }}>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600, width: { xs: "auto", sm: "34%" } }}>Item</TableCell>
                      <TableCell sx={{ fontWeight: 600, width: { xs: "auto", sm: "16%" } }} align="center">Order</TableCell>
                      <TableCell sx={{ fontWeight: 600, width: { xs: "auto", sm: "16%" } }} align="center">Sold</TableCell>
                      <TableCell sx={{ fontWeight: 600, width: { xs: "auto", sm: "16%" } }} align="right">Deposit</TableCell>
                      {!readOnly && <TableCell sx={{ width: { xs: 40, sm: 48 } }} align="center" />}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {group.items.map((item, iIdx) => (
                      <TableRow key={iIdx}>
                        <TableCell padding="none" sx={{ verticalAlign: "middle" }}>
                          <TextField
                            select
                            size="small"
                            placeholder="Pilih Item"
                            variant="outlined"
                            fullWidth
                            value={item.item_id}
                            onChange={(e) => {
                              const val = e.target.value;
                              onItemChange(gIdx, iIdx, "item_id", val);
                              const it = masterItems.find((m) => String(m.code) === val);
                              if (it?.price != null && item.qty_sold) onItemChange(gIdx, iIdx, "deposit", String(it.price * Number(item.qty_sold)));
                            }}
                            disabled={readOnly}
                            sx={{ ...inputSx(!!item.item_id), "& .MuiOutlinedInput-input": { py: 0.75 }, "& .MuiInputLabel-root": { display: "none" } }}
                          >
                            {masterItems.map((m) => (
                              <MenuItem key={m.id} value={String(m.code)}>{`${m.code} — ${m.name}`}</MenuItem>
                            ))}
                          </TextField>
                        </TableCell>
                        <TableCell padding="none" align="center" sx={{ verticalAlign: "middle" }}>
                          <TextField
                            size="small"
                            variant="outlined"
                            type="number"
                            fullWidth
                            value={item.qty_order}
                            onChange={(e) => onItemChange(gIdx, iIdx, "qty_order", e.target.value)}
                            disabled={readOnly}
                            inputProps={{ min: 0 }}
                            sx={{ ...inputSx(!!item.qty_order), "& .MuiOutlinedInput-input": { py: 0.75, textAlign: "center" } }}
                          />
                        </TableCell>
                        <TableCell padding="none" align="center" sx={{ verticalAlign: "middle" }}>
                          <TextField
                            size="small"
                            variant="outlined"
                            type="number"
                            fullWidth
                            value={item.qty_sold}
                            onChange={(e) => {
                              onItemChange(gIdx, iIdx, "qty_sold", e.target.value);
                              const it = masterItems.find((m) => String(m.code) === item.item_id);
                              if (it?.price != null) onItemChange(gIdx, iIdx, "deposit", String(it.price * Number(e.target.value || 0)));
                            }}
                            disabled={readOnly}
                            inputProps={{ min: 0 }}
                            sx={{ ...inputSx(!!item.qty_sold), "& .MuiOutlinedInput-input": { py: 0.75, textAlign: "center" } }}
                          />
                        </TableCell>
                        <TableCell padding="none" align="right" sx={{ verticalAlign: "middle" }}>
                          <TextField
                            size="small"
                            variant="outlined"
                            type="number"
                            fullWidth
                            value={item.deposit}
                            onChange={(e) => onItemChange(gIdx, iIdx, "deposit", e.target.value)}
                            disabled={readOnly}
                            inputProps={{ min: 0 }}
                            sx={{ ...inputSx(!!item.deposit), "& .MuiOutlinedInput-input": { py: 0.75, textAlign: "right" } }}
                          />
                        </TableCell>
                        {!readOnly && (
                          <TableCell padding="none" align="center">
                            <IconButton size="small" onClick={() => onRemoveItem(gIdx, iIdx)} color="error">
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mt: 0.5, px: 0.5 }} flexWrap="wrap" gap={0.5}>
                  <Typography variant="caption" color="text.secondary">
                    Total: Order {totals.qty_order} · Sold {totals.qty_sold} · Sisa {totals.qty_remaining} · Deposit {totals.deposit}
                  </Typography>
                  {!readOnly && (
                    <Button size="small" startIcon={<AddIcon />} onClick={() => onAddItem(gIdx)} variant="text">
                      Tambah Item
                    </Button>
                  )}
                </Stack>
              </Paper>
            );
          })}

          {!readOnly && (
            <Button
              variant="outlined"
              size="small"
              startIcon={<AddIcon />}
              onClick={onAddOutlet}
              fullWidth
              sx={{ borderStyle: "dashed" }}
            >
              Tambah Outlet
            </Button>
          )}
        </Stack>
      </AccordionDetails>
    </Accordion>
  );
}
