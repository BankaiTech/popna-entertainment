import { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from '@/store/useStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { Plus, Edit, Trash2, Check, X, Lock, Lightbulb } from 'lucide-react';
import type { Product } from '@/models/types';
import { MOCK_ORGANIZATION_ID } from '@/models/types';
import { getProviderDisplayName } from '@/lib/providerUtils';
import { cn } from '@/lib/utils';
import { Dialog, DialogHeader, DialogBody, DialogFooter } from '@/components/ui/Dialog';
import ProductModal from '@/components/ProductModal';
import UpiPaymentModal from '@/components/UpiPaymentModal';
import { PLATFORM_UPI, hasPlatformUpi } from '@/config/platformUpi';
import { showError, showInfo } from '@/utils/toast';
import { useOrganizationStore } from '@/store/useOrganizationStore';
import { getTemplateById } from '@/config/industryTemplates';

const FREE_PRODUCT_LIMIT = 4;
const ADDITIONAL_PRODUCT_COST = 200;

const ProductManagement = () => {
  const { t } = useTranslation();
  const { products, loading, fetchProducts, addProduct, updateProduct, deleteProduct } = useStore();
  const { currentOrganization } = useOrganizationStore();
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showUpiModal, setShowUpiModal] = useState(false);

  const template = useMemo(
    () => currentOrganization?.industryType ? getTemplateById(currentOrganization.industryType) : undefined,
    [currentOrganization?.industryType]
  );

  const suggestedCategories = useMemo(() => {
    if (!template) return [];
    const existingNames = new Set(products.map((p) => p.name.toLowerCase()));
    return template.defaultCategories.filter((cat) => !existingNames.has(cat.toLowerCase()));
  }, [template, products]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleOpenAdd = () => {
    // Check if user has reached free limit
    if (products.length >= FREE_PRODUCT_LIMIT) {
      setShowPaymentModal(true);
    } else {
      setEditingProduct(null);
      setShowModal(true);
    }
  };

  const handleOpenEdit = (product: Product) => {
    setEditingProduct(product);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingProduct(null);
  };

  const handleSave = async (productData: Omit<Product, 'id' | 'createdAt' | 'organizationId'>) => {
    await addProduct({
      ...productData,
      organizationId: MOCK_ORGANIZATION_ID,
    });
    await fetchProducts();
  };

  const handleUpdate = async (id: number, productData: Omit<Product, 'id' | 'createdAt' | 'organizationId'>) => {
    await updateProduct(id, productData);
    await fetchProducts();
  };

  const handleDelete = async (id: number) => {
    if (confirm(t('productManagement.confirmDelete', 'Are you sure you want to delete this product? This will affect all related customers and plans.'))) {
      await deleteProduct(id);
      await fetchProducts();
    }
  };

  const toggleActive = async (product: Product) => {
    await updateProduct(product.id, { isActive: !product.isActive });
    await fetchProducts();
  };

  const handlePayForAdditionalProducts = () => {
    // Additional products: org pays platform - use our (platform) UPI
    setShowPaymentModal(false);
    if (hasPlatformUpi()) {
      setShowUpiModal(true);
    } else {
      showError(t('productManagement.platformUpiNotConfigured', 'Payment is not configured. Please contact support.'));
    }
  };

  const handlePaymentInitiated = () => {
    setShowUpiModal(false);
    showInfo('Payment initiated! Please share the payment screenshot or UTR number with admin for verification. Once verified, you can add more products.');
  };

  const handleQuickAdd = async (categoryName: string) => {
    if (products.length >= FREE_PRODUCT_LIMIT) {
      setShowPaymentModal(true);
      return;
    }
    await addProduct({
      name: categoryName,
      productType: 'cable',
      isActive: true,
      organizationId: MOCK_ORGANIZATION_ID,
    });
    await fetchProducts();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">{t('productManagement.title', 'Category Management')}</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {t('productManagement.description', 'Manage service categories and products. Used for filtering customers, complaints, and reports.')}
          </p>
          {template && (
            <p className="text-xs text-primary mt-1">
              {t('productManagement.industryHint', 'Industry: {{industry}}', { industry: t(template.labelKey) })}
            </p>
          )}
          <p className="text-xs text-muted-foreground mt-1">
            {products.length}/{FREE_PRODUCT_LIMIT} {t('productManagement.freeUsed', 'free products used')}. {t('productManagement.additionalCost', 'Additional products cost ₹{{cost}} each.', { cost: ADDITIONAL_PRODUCT_COST })}
          </p>
        </div>
        <Button onClick={handleOpenAdd} className="shrink-0">
          <Plus className="w-4 h-4 mr-2" />
          {t('productManagement.addProduct', 'Add Product')}
        </Button>
      </div>

      {suggestedCategories.length > 0 && (
        <div className="rounded-lg border border-dashed border-primary/40 bg-primary/5 dark:bg-primary/10 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb className="w-4 h-4 text-primary shrink-0" />
            <p className="text-sm font-medium text-foreground">
              {t('productManagement.suggestedCategories', 'Suggested categories for your industry')}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {suggestedCategories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => handleQuickAdd(cat)}
                className={cn(
                  'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
                  'bg-white dark:bg-gray-800 text-foreground border-border hover:border-primary hover:bg-primary/10 dark:hover:bg-primary/20'
                )}
              >
                <Plus className="w-3 h-3" />
                {cat}
              </button>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12">{t('productManagement.loading', 'Loading products...')}</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {products.map((product) => (
            <Card key={product.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-sm truncate">{getProviderDisplayName(product.name)}</CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5 capitalize">
                      {product.productType}
                    </p>
                  </div>
                  <button
                    onClick={() => toggleActive(product)}
                    className={cn(
                      'p-1 rounded-md transition-colors shrink-0',
                      product.isActive
                        ? 'text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30'
                        : 'text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                    )}
                    title={product.isActive ? t('productManagement.deactivate', 'Deactivate') : t('productManagement.activate', 'Activate')}
                  >
                    {product.isActive ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <X className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </CardHeader>
              <CardContent className="pt-2 pb-3">
                <div className="flex items-center gap-1 mb-3">
                  <span
                    className={cn(
                      'px-1.5 py-0.5 rounded-full text-[10px] font-medium',
                      product.isActive
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                    )}
                  >
                    {product.isActive ? t('productManagement.active', 'Active') : t('productManagement.inactive', 'Inactive')}
                  </span>
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 capitalize">
                    {product.productType}
                  </span>
                </div>
                <div className="flex gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenEdit(product)}
                    className="flex-1 text-xs h-7"
                  >
                    <Edit className="w-3 h-3 mr-1" />
                    {t('common.edit', 'Edit')}
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(product.id)}
                    className="flex-1 text-xs h-7"
                  >
                    <Trash2 className="w-3 h-3 mr-1" />
                    {t('common.delete', 'Delete')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {products.length === 0 && !loading && (
        <div className="py-12 text-center border border-border rounded-lg bg-muted/20">
          <p className="text-muted-foreground">{t('productManagement.emptyState', 'No products found. Add your first product to get started.')}</p>
        </div>
      )}

      <ProductModal
        isOpen={showModal}
        onClose={handleCloseModal}
        onSave={handleSave}
        onUpdate={handleUpdate}
        editingProduct={editingProduct}
      />

      {/* Payment Required - use Dialog for consistency */}
      <Dialog open={showPaymentModal} onClose={() => setShowPaymentModal(false)} size="sm">
        <DialogHeader
          title={t('productManagement.additionalProductLimitTitle', 'Additional Product Limit Reached')}
          onClose={() => setShowPaymentModal(false)}
        />
        <DialogBody className="p-4 sm:p-5">
          <div className="flex items-start gap-3 mb-4">
            <div className="p-2 rounded-full bg-primary/10 shrink-0">
              <Lock className="w-5 h-5 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground">
              {t('productManagement.additionalProductLimitDesc', "You've used all {{limit}} free products. To add more, pay ₹{{cost}} per additional product.", {
                limit: FREE_PRODUCT_LIMIT,
                cost: ADDITIONAL_PRODUCT_COST,
              })}
            </p>
          </div>
          <div className="bg-muted/50 rounded-lg p-4 border border-border">
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm font-medium text-foreground">
                {t('productManagement.additionalProduct', 'Additional Product')}
              </span>
              <span className="font-semibold text-foreground">₹{ADDITIONAL_PRODUCT_COST}</span>
            </div>
            <div className="flex justify-between items-center text-xs text-muted-foreground">
              <span>{t('productManagement.oneTimePayment', 'One-time payment')}</span>
              <span>{t('productManagement.perProduct', 'Per product')}</span>
            </div>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowPaymentModal(false)}>
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button onClick={handlePayForAdditionalProducts}>
            {t('productManagement.payAmount', 'Pay ₹{{amount}}', { amount: ADDITIONAL_PRODUCT_COST })}
          </Button>
        </DialogFooter>
      </Dialog>

      {/* UPI Payment Modal - additional products: platform (our) UPI only */}
      {hasPlatformUpi() && (
        <UpiPaymentModal
          isOpen={showUpiModal}
          onClose={() => setShowUpiModal(false)}
          upiId={PLATFORM_UPI.upiId}
          businessName={PLATFORM_UPI.businessName}
          amount={ADDITIONAL_PRODUCT_COST}
          description={t('productManagement.additionalProductPurchase', 'Additional Product Purchase')}
          transactionRef={`PROD${Date.now()}`}
          onPaymentInitiated={handlePaymentInitiated}
        />
      )}
    </div>
  );
};

export default ProductManagement;
