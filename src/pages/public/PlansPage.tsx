import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useLocation } from 'react-router-dom';
import { useStore } from '@/store/useStore';
import { plansApi } from '@/api/plans';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import PlanRequestModal from '@/components/PlanRequestModal';
import { formatCurrencyINR } from '@/lib/utils';
import { cn } from '@/lib/utils';
import type { Plan } from '@/models/types';

const PlansPage = () => {
  const { products, fetchActiveProducts } = useStore();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const productNameParam = searchParams.get('productName');
  const [selectedFilter, setSelectedFilter] = useState<string>('All');
  const [selectedPlan, setSelectedPlan] = useState<{ plan: Plan; productId: number; productName: string } | null>(null);
  const [showModal, setShowModal] = useState(false);

  // Scroll to top on mount and when location/search params change
  useEffect(() => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'smooth',
    });
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (productNameParam) {
      // Match product name exactly (case-sensitive)
      const allActiveProducts = Array.isArray(products) ? products.filter((p) => p.isActive) : [];
      const matchedProduct = allActiveProducts.find(
        (p) => p.name.toLowerCase() === productNameParam.toLowerCase()
      );
      if (matchedProduct) {
        setSelectedFilter(matchedProduct.name);
      }
    }
  }, [productNameParam, products]);
  useEffect(() => {
    const loadData = async () => {
      try {
        await fetchActiveProducts();
        const allPlans = await plansApi.getAll();
        setPlans(allPlans);
      } catch (error) {
        console.error('Error loading plans:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [fetchActiveProducts]);

  // Get unique product names for filters (dynamically generated from products)
  const filterOptions = useMemo(() => {
    const allActiveProducts = Array.isArray(products) ? products.filter((p) => p.isActive) : [];
    const uniqueNames = Array.from(new Set(allActiveProducts.map((p) => p.name)));
    return ['All', ...uniqueNames];
  }, [products]);

  // Filter plans based on selection
  const filteredPlans = useMemo(() => {
    if (selectedFilter === 'All') {
      return plans;
    }
    // Filter plans where provider matches selected product name
    return plans.filter((plan) => plan.provider === selectedFilter);
  }, [plans, selectedFilter]);

  const calculateFinalPrice = (price: number, gstRate: number) => {
    return price + (price * gstRate) / 100;
  };

  // Get productId from plan provider name
  const getProductId = (providerName: string): number => {
    const product = Array.isArray(products) 
      ? products.find((p) => p.name === providerName)
      : null;
    return product?.id || 0;
  };

  const handleGetPlan = (plan: Plan) => {
    const productId = getProductId(plan.provider);
    const product = Array.isArray(products) 
      ? products.find((p) => p.name === plan.provider)
      : null;
    const productName = product?.name || plan.provider;
    
    setSelectedPlan({ plan, productId, productName });
    setShowModal(true);
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Page Title */}
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">All Plans</h1>
          <p className="text-lg text-gray-600">Choose from our comprehensive range of plans</p>
        </div>

        {/* Filter Section */}
        <div className="mb-8">
          <div className="flex flex-wrap items-center gap-2 justify-center">
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
                {filter}
              </button>
            ))}
          </div>
        </div>

        {/* Plans Grid */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-600">Loading plans...</p>
          </div>
        ) : filteredPlans.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600">No plans available for the selected filter.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPlans.map((plan) => {
              const finalPrice = calculateFinalPrice(plan.price, plan.gstRate);
              return (
                <Card key={plan.id} className="flex flex-col h-[400px] hover:shadow-xl transition-all duration-300 border border-gray-200">
                  <CardHeader className="flex-shrink-0 pb-3">
                    <div className="flex items-start justify-between mb-2">
                      <CardTitle className="text-xl text-gray-900 flex-1 pr-2 line-clamp-2 min-h-[3rem]">
                        {plan.planName}
                      </CardTitle>
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700 whitespace-nowrap flex-shrink-0">
                        {plan.provider}
                      </span>
                    </div>
                    <CardDescription className="text-sm text-gray-600 line-clamp-2 min-h-[2.5rem]">
                      {plan.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col">
                    <div className="space-y-2 mb-4 flex-1">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Service:</span>
                        <span className="font-semibold text-gray-900">{plan.provider}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Base Price:</span>
                        <span className="font-semibold text-gray-900">{formatCurrencyINR(plan.price)}/month</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">GST ({plan.gstRate}%):</span>
                        <span className="font-semibold text-gray-900">
                          {formatCurrencyINR((plan.price * plan.gstRate) / 100)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center border-t border-gray-200 pt-2 mt-2">
                        <span className="text-sm font-semibold text-gray-900">Final Price:</span>
                        <span className="text-lg font-bold text-primary">{formatCurrencyINR(finalPrice)}/month</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Installation:</span>
                        <span className="font-semibold text-gray-900">{formatCurrencyINR(plan.installationAmount)}</span>
                      </div>
                    </div>
                    <div className="mt-auto pt-4">
                      <Button 
                        className="w-full"
                        onClick={() => handleGetPlan(plan)}
                      >
                        Get This Plan
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Plan Request Modal */}
      {selectedPlan && (
        <PlanRequestModal
          plan={selectedPlan.plan}
          productId={selectedPlan.productId}
          productName={selectedPlan.productName}
          isOpen={showModal}
          onClose={() => {
            setShowModal(false);
            setSelectedPlan(null);
          }}
          onSuccess={() => {
            // Optionally show success message or refresh data
          }}
        />
      )}
    </div>
  );
};

export default PlansPage;
