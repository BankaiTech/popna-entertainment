import { useEffect, useState } from 'react';
import { useStore } from '@/store/useStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { Plus, Edit, Trash2 } from 'lucide-react';
import type { Plan, Provider } from '@/models/types';
import { MOCK_ORGANIZATION_ID } from '@/models/types';
import { getProviderDisplayName } from '@/lib/providerUtils';

const Catalog = () => {
  const { plans, loading, fetchPlans, addPlan, updatePlan, deletePlan } = useStore();
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<Omit<Plan, 'id'>>({
    organizationId: MOCK_ORGANIZATION_ID,
    provider: 'GTPL',
    planName: '',
    imageUrl: 'https://via.placeholder.com/400x300', // Default placeholder
    price: 0,
    gstRate: 18,
    installationAmount: 0,
    description: '',
  });

  const { initialize } = useStore();

  useEffect(() => {
    const loadData = async () => {
      await initialize();
      await fetchPlans();
    };
    loadData();
  }, [fetchPlans, initialize]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingPlan) {
      await updatePlan(editingPlan.id, formData);
    } else {
      await addPlan(formData);
    }
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      organizationId: MOCK_ORGANIZATION_ID,
      provider: 'GTPL',
      planName: '',
      imageUrl: 'https://via.placeholder.com/400x300',
      price: 0,
      gstRate: 18,
      installationAmount: 0,
      description: '',
    });
    setEditingPlan(null);
    setShowForm(false);
  };

  const handleEdit = (plan: Plan) => {
    setEditingPlan(plan);
    setFormData({
      organizationId: plan.organizationId,
      provider: plan.provider,
      planName: plan.planName,
      imageUrl: plan.imageUrl,
      price: plan.price,
      gstRate: plan.gstRate,
      installationAmount: plan.installationAmount,
      description: plan.description,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this plan?')) {
      await deletePlan(id);
    }
  };

  const providers: Provider[] = ['GTPL', 'BSNL', 'Railwire', 'Krishiinet'];

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">Catalog</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Services, plans, pricing, GST, installation charges. Controlled from admin; front site reflects this catalog.
          </p>
        </div>
        <Button onClick={() => setShowForm(true)} className="w-full sm:w-auto">
          <Plus className="w-4 h-4 mr-2" />
          Add Plan
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>{editingPlan ? 'Edit Plan' : 'Add New Plan'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Service / Provider</label>
                  <Select
                    value={formData.provider}
                    onChange={(e) => setFormData({ ...formData, provider: e.target.value as Provider })}
                    required
                  >
                    {providers.map((provider) => (
                      <option key={provider} value={provider}>
                        {getProviderDisplayName(provider)}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Plan Name</label>
                  <Input
                    value={formData.planName}
                    onChange={(e) => setFormData({ ...formData, planName: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Price (₹)</label>
                  <Input
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                    required
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">GST Rate (%)</label>
                  <Input
                    type="number"
                    value={formData.gstRate}
                    onChange={(e) => setFormData({ ...formData, gstRate: Number(e.target.value) })}
                    required
                    min="0"
                    max="100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Installation Amount (₹)</label>
                  <Input
                    type="number"
                    value={formData.installationAmount}
                    onChange={(e) => setFormData({ ...formData, installationAmount: Number(e.target.value) })}
                    required
                    min="0"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Description</label>
                <textarea
                  className="flex min-h-[80px] w-full rounded-lg border-2 border-border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  required
                />
              </div>
              <div className="flex space-x-2">
                <Button type="submit">{editingPlan ? 'Update' : 'Create'} Plan</Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

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
                  <p className="text-sm text-muted-foreground">{getProviderDisplayName(plan.provider)}</p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Price:</span>
                      <span className="font-semibold">₹{plan.price}/month</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">GST:</span>
                      <span className="font-semibold">{plan.gstRate}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Final Price:</span>
                      <span className="font-bold text-primary">₹{finalPrice.toFixed(2)}/month</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Installation:</span>
                      <span className="font-semibold">₹{plan.installationAmount}</span>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">{plan.description}</p>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm" onClick={() => handleEdit(plan)} className="flex-1">
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
    </div>
  );
};

export default Catalog;
