import { useEffect, useState } from 'react';
import { useStore } from '@/store/useStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { Plus, Edit, Trash2 } from 'lucide-react';
import type { Plan, Provider } from '@/models/types';
import { getProviderDisplayName } from '@/lib/providerUtils';
import { formatCurrencyINR } from '@/lib/utils';
import PlanModal from '@/components/PlanModal';

// Plan add/edit converted fully to dialog-based UI

const Catalog = () => {
  const { plans, loading, fetchPlans, addPlan, updatePlan, deletePlan, products, fetchProducts } = useStore();
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [showModal, setShowModal] = useState(false);

  const { initialize } = useStore();

  useEffect(() => {
    const loadData = async () => {
      await initialize();
      await fetchProducts();
      await fetchPlans();
    };
    loadData();
  }, [fetchPlans, fetchProducts, initialize]);

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
    if (confirm('Are you sure you want to delete this plan?')) {
      await deletePlan(id);
      await fetchPlans();
    }
  };

  // Multi-tenant ready — get providers from products dynamically
  const providers = Array.isArray(products) && products.length > 0
    ? products.map((p) => p.name as Provider)
    : ['GTPL', 'BSNL', 'Railwire', 'Krishiinet'] as Provider[]; // Fallback

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">Catalog</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Services, plans, pricing, GST, installation charges. Controlled from admin; front site reflects this catalog.
          </p>
        </div>
        <Button onClick={handleOpenAdd} className="w-full sm:w-auto">
          <Plus className="w-4 h-4 mr-2" />
          Add Plan
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-12">Loading plans...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.map((plan) => {
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
                      <span className="text-sm text-muted-foreground">Price:</span>
                      <span className="font-semibold">{formatCurrencyINR(plan.price)}/month</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">GST:</span>
                      <span className="font-semibold">{plan.gstRate}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Final Price:</span>
                      <span className="font-bold text-primary">{formatCurrencyINR(finalPrice)}/month</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Installation:</span>
                      <span className="font-semibold">{formatCurrencyINR(plan.installationAmount)}</span>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">{plan.description}</p>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm" onClick={() => handleOpenEdit(plan)} className="flex-1">
                      <Edit className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleDelete(plan.id)} className="flex-1">
                      <Trash2 className="w-4 h-4 mr-1" />
                      Delete
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
