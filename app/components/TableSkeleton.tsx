/**
 * Skeleton rows untuk tabel — meniru baris data agar loading terasa natural.
 * @param rows    Jumlah baris skeleton (default 5)
 * @param cols    Jumlah kolom (default 5)
 */
export function TableRowsSkeleton({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
    return (
        <>
            {Array.from({ length: rows }).map((_, i) => (
                <tr key={i} className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors">
                    {Array.from({ length: cols }).map((_, j) => (
                        <td key={j} className="px-4 py-3 whitespace-nowrap">
                            <div 
                                className={`h-4 bg-gray-200 rounded animate-pulse ${j === 0 ? 'w-10' : 'w-4/5'}`}
                            ></div>
                        </td>
                    ))}
                </tr>
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
        <div className="flex flex-wrap gap-4">
            {Array.from({ length: count }).map((_, i) => (
                <div key={i} className="flex-1 min-w-[150px] border border-gray-200 rounded-xl p-4 bg-white shadow-sm">
                    <div className="h-4 bg-gray-200 rounded animate-pulse w-1/2 mb-3"></div>
                    <div className="h-8 bg-gray-200 rounded animate-pulse w-4/5 mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded animate-pulse w-1/3"></div>
                </div>
            ))}
        </div>
    );
}

/**
 * Skeleton untuk halaman detail (baris-baris info vertikal).
 * @param rows Jumlah baris
 */
export function DetailSkeleton({ rows = 6 }: { rows?: number }) {
    return (
        <div className="space-y-4">
            {Array.from({ length: rows }).map((_, i) => (
                <div key={i} className="flex flex-row items-center gap-4">
                    <div className="h-4 bg-gray-200 rounded animate-pulse w-[120px]"></div>
                    <div className="h-4 bg-gray-200 rounded animate-pulse flex-1 max-w-[60%]"></div>
                </div>
            ))}
        </div>
    );
}
