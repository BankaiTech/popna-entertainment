import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Package, AlertTriangle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { useDashboardData } from '@/hooks/useDashboardData';
import { formatCurrencyINR } from '@/lib/utils';

const GRADIENTS = [
  'from-blue-500 to-cyan-500',
  'from-violet-500 to-purple-500',
  'from-emerald-500 to-green-500',
  'from-amber-500 to-yellow-500',
  'from-rose-500 to-pink-500',
  'from-indigo-500 to-blue-500',
  'from-teal-500 to-emerald-500',
  'from-orange-500 to-amber-500',
];

export default function InventoryByCategoryWidget() {
  const { t } = useTranslation();
  const { categories, inventoryProducts } = useDashboardData();

  const categoryStats = useMemo(() => {
    return categories.map((category: { id: number; name: string; code?: string }, index: number) => {
      const products = inventoryProducts.filter(
        (p: { categoryId?: number }) => p.categoryId === category.id
      );
      const productCount = products.length;
      const totalStock = products.reduce((sum: number, p: { currentStock?: number }) => sum + (p.currentStock ?? 0), 0);
      const stockValue = products.reduce(
        (sum: number, p: { currentStock?: number; price: number }) => sum + (p.currentStock ?? 0) * (p.price ?? 0),
        0
      );
      const lowStockCount = products.filter(
        (p: { currentStock?: number; stockAlert?: number }) => p.currentStock != null && p.stockAlert != null && p.currentStock <= p.stockAlert && p.currentStock > 0
      ).length;
      const outOfStock = products.filter((p: { currentStock?: number }) => (p.currentStock ?? 0) === 0).length;

      return {
        id: category.id,
        name: category.name,
        productCount,
        totalStock,
        stockValue,
        lowStockCount,
        outOfStock,
        gradient: GRADIENTS[index % GRADIENTS.length],
      };
    });
  }, [categories, inventoryProducts]);

  return (
    <Card className="overflow-hidden">
      <div className="h-1 bg-gradient-to-r from-teal-500 to-cyan-500" />
      <CardHeader className="py-3">
        <CardTitle className="text-sm sm:text-base">
          {t('dashboard.inventoryByCategory', 'Inventory by Category')}
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-4">
        {categoryStats.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            {t('dashboard.noCategories', 'No categories found')}
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {categoryStats.map((cat: typeof categoryStats[number]) => (
              <div
                key={cat.id}
                className="rounded-lg border bg-card overflow-hidden hover:shadow-sm transition-shadow"
              >
                <div className={`h-1 bg-gradient-to-r ${cat.gradient}`} />
                <div className="p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    <h4 className="text-sm font-semibold truncate">{cat.name}</h4>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <p className="text-muted-foreground">
                        {t('dashboard.products', 'Products')}
                      </p>
                      <p className="font-semibold">{cat.productCount}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">
                        {t('dashboard.totalStock', 'Total Stock')}
                      </p>
                      <p className="font-semibold">{cat.totalStock.toLocaleString('en-IN')}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">
                        {t('dashboard.stockValue', 'Stock Value')}
                      </p>
                      <p className="font-semibold">{formatCurrencyINR(cat.stockValue)}</p>
                    </div>
                    <div>
                      {cat.lowStockCount > 0 || cat.outOfStock > 0 ? (
                        <>
                          <p className="text-muted-foreground flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3 text-amber-500" />
                            {t('dashboard.alerts', 'Alerts')}
                          </p>
                          <p className="font-semibold text-amber-600 dark:text-amber-400">
                            {cat.lowStockCount > 0 &&
                              `${cat.lowStockCount} ${t('dashboard.low', 'low')}`}
                            {cat.lowStockCount > 0 && cat.outOfStock > 0 && ', '}
                            {cat.outOfStock > 0 &&
                              `${cat.outOfStock} ${t('dashboard.out', 'out')}`}
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="text-muted-foreground">
                            {t('dashboard.status', 'Status')}
                          </p>
                          <p className="font-semibold text-green-600 dark:text-green-400">
                            {t('dashboard.healthy', 'Healthy')}
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
