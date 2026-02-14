import { useEffect, useState } from 'react';
import { useStore } from '@/store/useStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { Plus, Edit, Trash2, Check, X } from 'lucide-react';
import type { Product } from '@/models/types';
import { MOCK_ORGANIZATION_ID } from '@/models/types';
import { getProviderDisplayName } from '@/lib/providerUtils';
import { cn } from '@/lib/utils';

const ProductManagement = () => {
  const { products, loading, fetchProducts, addProduct, updateProduct, deleteProduct } = useStore();
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<Omit<Product, 'id' | 'createdAt' | 'organizationId'>>({
    name: '',
    productType: 'internet',
    isActive: true,
  });

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingProduct) {
      await updateProduct(editingProduct.id, formData);
    } else {
      await addProduct({
        ...formData,
        organizationId: MOCK_ORGANIZATION_ID,
      });
    }
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      name: '',
      productType: 'internet',
      isActive: true,
    });
    setEditingProduct(null);
    setShowForm(false);
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      productType: product.productType,
      isActive: product.isActive,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this product? This will affect all related customers and plans.')) {
      await deleteProduct(id);
    }
  };

  const toggleActive = async (product: Product) => {
    await updateProduct(product.id, { isActive: !product.isActive });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-foreground">Product Management</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Manage products (cable/internet). Multi-tenant ready — backend will isolate by organization.
          </p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Product
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>{editingProduct ? 'Edit Product' : 'Add New Product'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-foreground">
                    Product Name <span className="text-destructive">*</span>
                  </label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Cable, Internet 1"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-foreground">
                    Product Type <span className="text-destructive">*</span>
                  </label>
                  <Select
                    value={formData.productType}
                    onChange={(e) => setFormData({ ...formData, productType: e.target.value as 'cable' | 'internet' })}
                    required
                  >
                    <option value="cable">Cable</option>
                    <option value="internet">Internet</option>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Cable products enable payment tracking. Internet products do not.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-4 h-4 rounded border-border"
                />
                <label htmlFor="isActive" className="text-sm font-medium text-foreground">
                  Active (visible in front site)
                </label>
              </div>
              <div className="flex space-x-2">
                <Button type="submit">{editingProduct ? 'Update' : 'Create'} Product</Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="text-center py-12">Loading products...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map((product) => (
            <Card key={product.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{getProviderDisplayName(product.name)}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1 capitalize">
                      {product.productType}
                    </p>
                  </div>
                  <button
                    onClick={() => toggleActive(product)}
                    className={cn(
                      'p-1.5 rounded-md transition-colors',
                      product.isActive
                        ? 'text-green-600 hover:bg-green-50'
                        : 'text-gray-400 hover:bg-gray-50'
                    )}
                    title={product.isActive ? 'Deactivate' : 'Activate'}
                  >
                    {product.isActive ? (
                      <Check className="w-5 h-5" />
                    ) : (
                      <X className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 mb-4">
                  <span
                    className={cn(
                      'px-2 py-1 rounded-full text-xs font-medium',
                      product.isActive
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    )}
                  >
                    {product.isActive ? 'Active' : 'Inactive'}
                  </span>
                  <span
                    className={cn(
                      'px-2 py-1 rounded-full text-xs font-medium',
                      product.productType === 'cable'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-purple-100 text-purple-800'
                    )}
                  >
                    {product.productType === 'cable' ? 'Payment Enabled' : 'No Payment'}
                  </span>
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(product)}
                    className="flex-1"
                  >
                    <Edit className="w-4 h-4 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleDelete(product.id)}
                    className="flex-1"
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {products.length === 0 && !loading && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No products found. Add your first product to get started.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ProductManagement;
