// Catalog filter aligned with frontsite
import { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from '@/store/useStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { Plus, Edit, Trash2 } from 'lucide-react';
import type { Plan } from '@/models/types';
import { getProviderDisplayName } from '@/lib/providerUtils';
import { formatCurrencyINR, cn } from '@/lib/utils';
import PlanModal from '@/components/PlanModal';

// Plan add/edit converted fully to dialog-based UI

const Catalog = () => {
  const { t } = useTranslation();
  const { plans, loading, fetchPlans, addPlan, updatePlan, deletePlan, products, fetchProducts } = useStore();
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<string>('All');

  const { initialize } = useStore();

  useEffect(() => {
    const loadData = async () => {
      await initialize();
      await fetchProducts();
      await fetchPlans();
    };
    loadData();
  }, [fetchPlans, fetchProducts, initialize]);

  // Dynamic filter options from products (same pattern as PlansPage)
  const filterOptions = useMemo(() => {
    const allProducts = Array.isArray(products) ? products.filter((p) => p.isActive) : [];
    const uniqueNames = Array.from(new Set(allProducts.map((p) => p.name)));
    return ['All', ...uniqueNames];
  }, [products]);

  // Filter plans based on selected product
  const filteredPlans = useMemo(() => {
    if (selectedFilter === 'All') return plans;
    return plans.filter((plan) => plan.provider === selectedFilter);
  }, [plans, selectedFilter]);

  const handleOpenAdd = () => {
    setEditingPlan(null);
    setShowModal(true);
  };

  const handleOpenEdit = (plan: Plan) => {
    setEditingPlan(plan);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingPlan(null);
  };

  const handleSave = async (planData: Omit<Plan, 'id'>) => {
    await addPlan(planData);
    await fetchPlans();
  };

  const handleUpdate = async (id: number, planData: Omit<Plan, 'id'>) => {
    await updatePlan(id, planData);
    await fetchPlans();
  };

  const handleDelete = async (id: number) => {
    if (confirm(t('catalog.confirmDelete', 'Are you sure you want to delete this plan?'))) {
      await deletePlan(id);
      await fetchPlans();
    }
  };

  // Products fully dynamic — no hardcoded service names. Options from Admin → Settings → Products only.
  const providers = Array.isArray(products) ? products.map((p) => p.name) : [];

  return (
    <div className="space-y-3">
      {/* Product Filter + Add Button */}
      <div className="flex flex-wrap items-center gap-2">
        {filterOptions.map((filter) => (
          <button
            key={filter}
            onClick={() => setSelectedFilter(filter)}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200',
              selectedFilter === filter
                ? 'bg-primary text-white shadow-md'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            )}
          >
            {filter === 'All' ? t('catalog.filterAll', 'All') : getProviderDisplayName(filter, products)}
          </button>
        ))}
        <div className="ml-auto">
          <Button onClick={handleOpenAdd} size="xs">
            <Plus className="w-3.5 h-3.5" />
            {t('catalog.addPlan', 'Add Plan')}
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">{t('catalog.loading', 'Loading plans...')}</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPlans.map((plan) => {
            const finalPrice = plan.price + (plan.price * plan.gstRate) / 100;
            return (
              <Card key={plan.id} className="hover:shadow-lg transition-all duration-300">
                <CardHeader>
                  <CardTitle>{plan.planName}</CardTitle>
                  <p className="text-sm text-muted-foreground">{getProviderDisplayName(plan.provider, products)}</p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">{t('catalog.price', 'Price')}:</span>
                      <span className="font-semibold">{formatCurrencyINR(plan.price)}/{t('catalog.month', 'month')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">{t('catalog.gst', 'GST')}:</span>
                      <span className="font-semibold">{plan.gstRate}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">{t('catalog.finalPrice', 'Final Price')}:</span>
                      <span className="font-bold text-primary">{formatCurrencyINR(finalPrice)}/{t('catalog.month', 'month')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">{t('catalog.installation', 'Installation')}:</span>
                      <span className="font-semibold">{formatCurrencyINR(plan.installationAmount)}</span>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">{plan.description}</p>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm" onClick={() => handleOpenEdit(plan)} className="flex-1">
                      <Edit className="w-4 h-4 mr-1" />
                      {t('common.edit', 'Edit')}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleDelete(plan.id)} className="flex-1">
                      <Trash2 className="w-4 h-4 mr-1" />
                      {t('common.delete', 'Delete')}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <PlanModal
        isOpen={showModal}
        onClose={handleCloseModal}
        onSave={handleSave}
        onUpdate={handleUpdate}
        editingPlan={editingPlan}
        providers={providers}
      />
    </div>
  );
};

export default Catalog;
