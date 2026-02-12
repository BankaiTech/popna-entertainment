import React from 'react';
import { cn } from '@/lib/utils';

interface Column<T> {
  key: string;
  header: string;
  render?: (item: T) => React.ReactNode;
  className?: string;
  headerClassName?: string;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  onRowClick?: (item: T) => void;
  emptyMessage?: string;
  className?: string;
  stickyHeader?: boolean;
}

export function DataTable<T extends { id: number | string }>({
  data,
  columns,
  onRowClick,
  emptyMessage = 'No data available',
  className,
  stickyHeader = false,
}: DataTableProps<T>) {
  if (data.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className={cn('overflow-x-auto rounded-card border border-border bg-card', className)}>
      <table className="w-full">
        <thead className={cn('bg-muted/30', stickyHeader && 'sticky top-0 z-10')}>
          <tr className="border-b-2 border-border">
            {columns.map((column) => (
              <th
                key={column.key}
                className={cn(
                  'text-left p-3 text-xs font-semibold uppercase tracking-wider text-foreground',
                  column.headerClassName
                )}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((item, index) => (
            <tr
              key={item.id}
              onClick={() => onRowClick?.(item)}
              className={cn(
                'border-b border-border transition-colors',
                onRowClick && 'cursor-pointer hover:bg-accent/50',
                index % 2 === 0 ? 'bg-card' : 'bg-muted/10'
              )}
            >
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={cn(
                    'p-3 text-sm font-normal text-muted-foreground',
                    column.className
                  )}
                >
                  {column.render
                    ? column.render(item)
                    : (item as any)[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
