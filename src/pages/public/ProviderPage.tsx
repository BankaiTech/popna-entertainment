import { useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import type { Provider } from '@/models/types';
import { getProviderDisplayName } from '@/lib/providerUtils';
import { formatCurrencyINR } from '@/lib/utils';

interface ProviderPageProps {
  provider: Provider;
}

const ProviderPage = ({ provider }: ProviderPageProps) => {
  const { plans, products, loading, fetchPlansByProvider, fetchActiveProducts, companyProfile, fetchCompanyProfile } = useStore();

  useEffect(() => {
    const loadData = async () => {
      try {
        await fetchCompanyProfile();
        await fetchActiveProducts();
        await fetchPlansByProvider(provider);
      } catch (error) {
        console.error('Error loading provider page:', error);
      }
    };
    loadData();
  }, [provider, fetchPlansByProvider, fetchActiveProducts, fetchCompanyProfile]);

  const calculateFinalPrice = (price: number, gstRate: number) => {
    return price + (price * gstRate) / 100;
  };

  const handleRequestConnection = (planName: string) => {
    alert(`Connection request for ${planName} has been submitted! We will contact you soon.`);
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">Loading plans...</div>
      </div>
    );
  }

  // Multi-tenant ready — get product info dynamically; display name via getProviderDisplayName
  const product = (products || []).find((p) => p.name === provider);
  const providerDisplayName = getProviderDisplayName(provider);
  const isCable = product?.productType === 'cable';
  const serviceLabel = isCable ? 'Cable Plans' : 'Internet Plans';
  const serviceDescription = isCable
    ? 'Choose the right cable plan for your home or business'
    : 'Choose the perfect plan for your internet needs';
  
  // Multi-tenant ready — company name from settings
  const companyName = companyProfile?.companyName || 'BankaiTech';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-foreground mb-4">{providerDisplayName} — {serviceLabel}</h1>
        <p className="text-lg text-muted-foreground">
          {serviceDescription}
        </p>
      </div>

      {plans.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No plans available for {provider} at the moment.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.map((plan) => {
            const finalPrice = calculateFinalPrice(plan.price, plan.gstRate);
            return (
              <Card key={plan.id} className="flex flex-col">
                <CardHeader>
                  <CardTitle>{plan.planName}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col">
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Base Price:</span>
                      <span className="font-semibold">{formatCurrencyINR(plan.price)}/month</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">GST ({plan.gstRate}%):</span>
                      <span className="font-semibold">
                        {formatCurrencyINR((plan.price * plan.gstRate) / 100)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center border-t border-border pt-2">
                      <span className="text-sm font-semibold">Final Price:</span>
                      <span className="text-lg font-bold text-primary">{formatCurrencyINR(finalPrice)}/month</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Installation:</span>
                      <span className="font-semibold">{formatCurrencyINR(plan.installationAmount)}</span>
                    </div>
                  </div>
                  <Button
                    className="w-full mt-auto"
                    onClick={() => handleRequestConnection(plan.planName)}
                  >
                    Request Connection
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ProviderPage;
