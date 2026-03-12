import { Skeleton, TableRow, TableCell, Box, Stack } from "@mui/material";

/**
 * Skeleton rows untuk tabel — meniru baris data agar loading terasa natural.
 * @param rows    Jumlah baris skeleton (default 5)
 * @param cols    Jumlah kolom (default 5)
 */
export function TableRowsSkeleton({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
    return (
        <>
            {Array.from({ length: rows }).map((_, i) => (
                <TableRow key={i}>
                    {Array.from({ length: cols }).map((_, j) => (
                        <TableCell key={j}>
                            <Skeleton variant="text" animation="wave" width={j === 0 ? 40 : "80%"} />
                        </TableCell>
                    ))}
                </TableRow>
            ))}
        </>
    );
}

/**
 * Skeleton untuk kartu statistik (SummaryCard / StatCard).
 * @param count  Jumlah kartu
 */
export function CardsSkeleton({ count = 4 }: { count?: number }) {
    return (
        <Stack direction="row" spacing={1.5} flexWrap="wrap">
            {Array.from({ length: count }).map((_, i) => (
                <Box key={i} sx={{ flex: "1 1 170px", minWidth: 150, border: "1px solid #e0e0e0", borderRadius: 1, p: 2 }}>
                    <Skeleton variant="text" width="55%" animation="wave" sx={{ mb: 0.5 }} />
                    <Skeleton variant="text" width="80%" height={36} animation="wave" />
                    <Skeleton variant="text" width="45%" animation="wave" />
                </Box>
            ))}
        </Stack>
    );
}

/**
 * Skeleton untuk halaman detail (baris-baris info vertikal).
 * @param rows Jumlah baris
 */
export function DetailSkeleton({ rows = 6 }: { rows?: number }) {
    return (
        <Stack spacing={1.5}>
            {Array.from({ length: rows }).map((_, i) => (
                <Stack key={i} direction="row" spacing={2} alignItems="center">
                    <Skeleton variant="text" width={120} animation="wave" />
                    <Skeleton variant="text" width="60%" animation="wave" />
                </Stack>
            ))}
        </Stack>
    );
}
