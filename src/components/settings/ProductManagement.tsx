import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from '@/store/useStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { Plus, Edit, Trash2, Check, X, Lock } from 'lucide-react';
import type { Product } from '@/models/types';
import { MOCK_ORGANIZATION_ID } from '@/models/types';
import { getProviderDisplayName } from '@/lib/providerUtils';
import { cn } from '@/lib/utils';
import ProductModal from '@/components/ProductModal';

const FREE_PRODUCT_LIMIT = 4;
const ADDITIONAL_PRODUCT_COST = 200;

const ProductManagement = () => {
  const { t } = useTranslation();
  const { products, loading, fetchProducts, addProduct, updateProduct, deleteProduct } = useStore();
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

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
    // Mock payment - Replace with real payment gateway
    alert(`Payment of ₹${ADDITIONAL_PRODUCT_COST} required. Redirecting to payment gateway...`);
    setShowPaymentModal(false);
    // After successful payment, allow adding more products
    setShowModal(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold text-foreground">{t('productManagement.title', 'Product Management')}</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {t('productManagement.description', 'Manage products (cable/internet). Multi-tenant ready — backend will isolate by organization.')}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {products.length}/{FREE_PRODUCT_LIMIT} free products used. Additional products cost ₹{ADDITIONAL_PRODUCT_COST} each.
          </p>
        </div>
        <Button onClick={handleOpenAdd}>
          <Plus className="w-4 h-4 mr-2" />
          {t('productManagement.addProduct', 'Add Product')}
        </Button>
      </div>

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
                        ? 'text-green-600 hover:bg-green-50'
                        : 'text-gray-400 hover:bg-gray-50'
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
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    )}
                  >
                    {product.isActive ? t('productManagement.active', 'Active') : t('productManagement.inactive', 'Inactive')}
                  </span>
                  <span
                    className={cn(
                      'px-1.5 py-0.5 rounded-full text-[10px] font-medium',
                      product.productType === 'cable'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-purple-100 text-purple-800'
                    )}
                  >
                    {product.productType === 'cable' ? t('productManagement.cable', 'Cable') : t('productManagement.internet', 'Internet')}
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

      {/* Payment Required Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="w-full max-w-md bg-card rounded-lg shadow-xl border border-border p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-full bg-blue-100">
                <Lock className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold">Additional Product Limit Reached</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              You've used all {FREE_PRODUCT_LIMIT} free products. To add more products, please pay ₹{ADDITIONAL_PRODUCT_COST} for each additional product.
            </p>
            <div className="bg-muted/50 rounded-lg p-4 mb-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm">Additional Product</span>
                <span className="font-semibold">₹{ADDITIONAL_PRODUCT_COST}</span>
              </div>
              <div className="flex justify-between items-center text-xs text-muted-foreground">
                <span>One-time payment</span>
                <span>Per product</span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowPaymentModal(false)} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handlePayForAdditionalProducts} className="flex-1">
                Pay ₹{ADDITIONAL_PRODUCT_COST}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductManagement;
