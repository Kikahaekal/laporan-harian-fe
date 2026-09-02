import { useState, useMemo } from "react";
import {
  ChevronDown,
  ChevronRight,
  Store,
  Trash2,
  Plus
} from "lucide-react";
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
  const [expanded, setExpanded] = useState(week === 1);
  
  const totalItems = useMemo(() => groups.reduce((sum, g) => sum + g.items.length, 0), [groups]);
  const displayDate = useMemo(() => {
    const d = getDateForDayWeek(year, month, dayName, week);
    return d ? formatDisplayDate(d) : null;
  }, [year, month, dayName, week]);

  return (
    <div className="mb-3 border border-gray-200 rounded-xl bg-white overflow-hidden shadow-sm">
      {/* Accordion Header */}
      <button 
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex flex-wrap items-center gap-3 bg-gray-50/80 hover:bg-gray-100 transition-colors border-b border-gray-200"
      >
        {expanded ? <ChevronDown className="w-5 h-5 text-gray-500 flex-shrink-0" /> : <ChevronRight className="w-5 h-5 text-gray-500 flex-shrink-0" />}
        <span className="font-bold text-gray-900">Minggu {week}</span>
        
        {displayDate && (
          <span className="text-sm font-medium text-gray-500">
            Tanggal: {displayDate}
          </span>
        )}
        
        <div className="flex gap-2 ml-auto">
          <span className="px-2 py-0.5 border border-gray-300 bg-white text-gray-700 text-xs font-semibold rounded-full shadow-sm">
            {groups.length} outlet
          </span>
          <span className="px-2 py-0.5 border border-blue-200 bg-blue-50 text-blue-700 text-xs font-semibold rounded-full shadow-sm">
            {totalItems} baris item
          </span>
        </div>
      </button>

      {/* Accordion Content */}
      {expanded && (
        <div className="p-4 space-y-4">
          {displayDate && (
            <div className="w-40">
              <label className="block text-xs font-semibold text-gray-500 mb-1">Tanggal</label>
              <input 
                type="text" 
                value={displayDate} 
                readOnly 
                className="w-full px-3 py-1.5 bg-gray-100 border border-gray-200 rounded-lg text-sm text-gray-600 cursor-default outline-none"
              />
            </div>
          )}
          
          <div className="space-y-4">
            {groups.map((group, gIdx) => {
              const totals = itemRowTotals(group.items);
              const outletName = group.outlet_id ? masterOutlets.find((o) => String(o.code) === group.outlet_id)?.name ?? "" : "";

              return (
                <div key={gIdx} className="border border-gray-200 rounded-xl bg-gray-50 p-3 overflow-x-auto shadow-sm">
                  {/* Header Outlet & Status */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-3">
                    <div className="p-2 bg-white border border-gray-200 rounded-lg text-gray-500 flex-shrink-0">
                      <Store className="w-4 h-4" />
                    </div>
                    
                    <select
                      value={group.outlet_id}
                      onChange={(e) => onOutletChange(gIdx, e.target.value)}
                      disabled={readOnly}
                      className={`w-full sm:w-48 px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500 ${
                        group.outlet_id ? "bg-blue-50" : "bg-white"
                      } ${readOnly ? "opacity-75 cursor-not-allowed" : ""}`}
                    >
                      <option value="" disabled>Pilih Outlet</option>
                      {masterOutlets.map((o) => (
                        <option key={o.id} value={String(o.code)}>{`${o.code} — ${o.name}`}</option>
                      ))}
                    </select>

                    <select
                      value={group.status ?? "pending"}
                      onChange={(e) => onStatusChange(gIdx, e.target.value as ReportStatus)}
                      disabled={readOnly}
                      className={`w-full sm:w-40 px-3 py-2 border border-green-200 bg-green-50 text-green-800 rounded-lg text-sm font-medium outline-none focus:ring-2 focus:ring-green-500 ${
                        readOnly ? "opacity-75 cursor-not-allowed" : ""
                      }`}
                    >
                      {STATUS_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>

                    {outletName && (
                      <span className="text-xs font-semibold text-gray-500 flex-1 truncate">
                        {group.items.filter((i) => i.item_id).length} item
                      </span>
                    )}

                    {!readOnly && (
                      <button
                        onClick={() => onRemoveOutlet(gIdx)}
                        className="p-2 text-red-500 hover:bg-red-50 border border-transparent hover:border-red-100 rounded-lg transition-colors ml-auto flex-shrink-0"
                        title="Hapus Outlet"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Table Item */}
                  <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                          <th className="px-3 py-2 font-semibold text-gray-700 w-1/3">Item</th>
                          <th className="px-3 py-2 font-semibold text-gray-700 text-center w-1/6">Order</th>
                          <th className="px-3 py-2 font-semibold text-gray-700 text-center w-1/6">Sold</th>
                          <th className="px-3 py-2 font-semibold text-gray-700 text-right w-1/6">Deposit</th>
                          {!readOnly && <th className="px-3 py-2 w-12 text-center"></th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {group.items.map((item, iIdx) => (
                          <tr key={iIdx}>
                            <td className="px-2 py-1.5 align-middle">
                              <select
                                value={item.item_id}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  onItemChange(gIdx, iIdx, "item_id", val);
                                  const it = masterItems.find((m) => String(m.code) === val);
                                  if (it?.price != null && item.qty_sold) {
                                    onItemChange(gIdx, iIdx, "deposit", String(it.price * Number(item.qty_sold)));
                                  }
                                }}
                                disabled={readOnly}
                                className={`w-full px-2 py-1.5 border border-gray-200 rounded-md text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 ${
                                  item.item_id ? "bg-blue-50" : "bg-white"
                                } ${readOnly ? "opacity-75 cursor-not-allowed" : ""}`}
                              >
                                <option value="" disabled>Pilih Item</option>
                                {masterItems.map((m) => (
                                  <option key={m.id} value={String(m.code)}>{`${m.code} — ${m.name}`}</option>
                                ))}
                              </select>
                            </td>
                            <td className="px-2 py-1.5 align-middle">
                              <input
                                type="number"
                                min="0"
                                value={item.qty_order}
                                onChange={(e) => onItemChange(gIdx, iIdx, "qty_order", e.target.value)}
                                disabled={readOnly}
                                className={`w-full px-2 py-1.5 border border-gray-200 rounded-md text-sm text-center outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 ${
                                  item.qty_order ? "bg-blue-50" : "bg-white"
                                } ${readOnly ? "opacity-75 cursor-not-allowed" : ""}`}
                              />
                            </td>
                            <td className="px-2 py-1.5 align-middle">
                              <input
                                type="number"
                                min="0"
                                value={item.qty_sold}
                                onChange={(e) => {
                                  onItemChange(gIdx, iIdx, "qty_sold", e.target.value);
                                  const it = masterItems.find((m) => String(m.code) === item.item_id);
                                  if (it?.price != null) {
                                    onItemChange(gIdx, iIdx, "deposit", String(it.price * Number(e.target.value || 0)));
                                  }
                                }}
                                disabled={readOnly}
                                className={`w-full px-2 py-1.5 border border-gray-200 rounded-md text-sm text-center outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 ${
                                  item.qty_sold ? "bg-blue-50" : "bg-white"
                                } ${readOnly ? "opacity-75 cursor-not-allowed" : ""}`}
                              />
                            </td>
                            <td className="px-2 py-1.5 align-middle">
                              <input
                                type="number"
                                min="0"
                                value={item.deposit}
                                onChange={(e) => onItemChange(gIdx, iIdx, "deposit", e.target.value)}
                                disabled={readOnly}
                                className={`w-full px-2 py-1.5 border border-gray-200 rounded-md text-sm text-right outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 ${
                                  item.deposit ? "bg-blue-50" : "bg-white"
                                } ${readOnly ? "opacity-75 cursor-not-allowed" : ""}`}
                              />
                            </td>
                            {!readOnly && (
                              <td className="px-2 py-1.5 align-middle text-center">
                                <button
                                  onClick={() => onRemoveItem(gIdx, iIdx)}
                                  className="p-1.5 text-red-500 hover:bg-red-50 rounded-md transition-colors"
                                  title="Hapus baris"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Footer Outlet Group */}
                  <div className="flex flex-wrap items-center justify-between gap-3 mt-3 px-1">
                    <p className="text-xs font-semibold text-gray-500">
                      Total: Order {totals.qty_order} · Sold {totals.qty_sold} · Sisa {totals.qty_remaining} · Deposit {totals.deposit}
                    </p>
                    {!readOnly && (
                      <button 
                        onClick={() => onAddItem(gIdx)}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm font-semibold text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                        Tambah Item
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {!readOnly && (
              <button
                onClick={onAddOutlet}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-dashed border-gray-300 text-gray-600 hover:text-blue-600 hover:border-blue-400 hover:bg-blue-50 rounded-xl font-semibold transition-colors text-sm"
              >
                <Plus className="w-5 h-5" />
                Tambah Outlet
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
