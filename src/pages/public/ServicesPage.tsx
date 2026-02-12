import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '@/store/useStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Wifi, Radio } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Product } from '@/models/types';

const ServicesPage = () => {
  const { products, fetchActiveProducts, loading } = useStore();
  const [selectedFilter, setSelectedFilter] = useState<string>('All');

  useEffect(() => {
    fetchActiveProducts();
  }, [fetchActiveProducts]);

  // Get all active products
  const allProducts = Array.isArray(products) ? products.filter((p) => p.isActive) : [];

  // Get unique product names for filters (dynamically generated)
  const filterOptions = useMemo(() => {
    const uniqueNames = Array.from(new Set(allProducts.map((p) => p.name)));
    return ['All', ...uniqueNames];
  }, [allProducts]);

  // Filter products based on selection
  const filteredProducts = useMemo(() => {
    if (selectedFilter === 'All') {
      return allProducts;
    }
    return allProducts.filter((p) => p.name === selectedFilter);
  }, [allProducts, selectedFilter]);

  const getProductIcon = (productType: string) => {
    return productType === 'cable' ? Radio : Wifi;
  };

  const getProductGradient = (index: number) => {
    const gradients = [
      'from-blue-500 to-cyan-500',
      'from-orange-500 to-red-500',
      'from-green-500 to-emerald-500',
      'from-purple-500 to-pink-500',
      'from-indigo-500 to-blue-500',
      'from-pink-500 to-rose-500',
    ];
    return gradients[index % gradients.length];
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Page Title */}
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">Our Services</h1>
          <p className="text-lg text-gray-600">Choose from our wide range of services</p>
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

        {/* Services Grid */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-600">Loading services...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600">No services available for the selected filter.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProducts.map((product, index) => {
              const Icon = getProductIcon(product.productType);
              const gradient = getProductGradient(index);
              return (
                <Link
                  key={product.id}
                  to={`/${product.productType}/${product.name.toLowerCase()}`}
                  className="group"
                >
                  <Card className="hover:shadow-xl transition-all duration-300 h-full overflow-hidden hover:-translate-y-1 border border-gray-200">
                    <div className={`h-2 bg-gradient-to-r ${gradient}`}></div>
                    <CardHeader>
                      <div className="flex items-center justify-center mb-4">
                        <div
                          className={`p-4 rounded-2xl bg-gradient-to-br ${gradient} shadow-lg group-hover:scale-110 transition-transform duration-300`}
                        >
                          <Icon className="w-10 h-10 text-white" />
                        </div>
                      </div>
                      <CardTitle className="text-center text-xl text-gray-900">
                        {product.name} {product.productType === 'cable' ? 'Cable' : 'Internet'}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="text-center text-base text-gray-600">
                        View plans and pricing for {product.name}
                      </CardDescription>
                      <div className="mt-4 text-center">
                        <span className="text-primary font-medium group-hover:underline">View Plans →</span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ServicesPage;
