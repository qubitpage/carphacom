'use client';

import React, { useState, useEffect } from 'react';
import { ChevronDown, Download, AlertCircle } from 'lucide-react';

interface Category {
  name: string;
  category_id: number;
  product_count: number;
  products: Array<{
    id: number;
    sku: string;
    name: string;
    price: { distribution: number; retail: number };
    stock: number;
  }>;
}

export default function MyPNIImportPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState<{ type: string; text: string } | null>(null);

  // Fetch categories on load
  useEffect(() => {
    const fetchCategories = async () => {
      setLoading(true);
      try {
        const response = await fetch('/app/api/suppliers/mypni/import-products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'fetch-products' })
        });
        const data = await response.json();
        if (data.success) {
          setCategories(data.categories);
        }
      } catch (error) {
        setMessage({ type: 'error', text: `Error: ${error}` });
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, []);

  const toggleCategory = (catName: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(catName)) {
      newExpanded.delete(catName);
    } else {
      newExpanded.add(catName);
    }
    setExpandedCategories(newExpanded);
  };

  const toggleProduct = (productId: number) => {
    const newSelected = new Set(selected);
    if (newSelected.has(productId)) {
      newSelected.delete(productId);
    } else {
      newSelected.add(productId);
    }
    setSelected(newSelected);
  };

  const selectAllInCategory = (category: Category) => {
    const newSelected = new Set(selected);
    const allIds = category.products.map(p => p.id);
    
    const allSelected = allIds.every(id => newSelected.has(id));
    allIds.forEach(id => {
      if (allSelected) {
        newSelected.delete(id);
      } else {
        newSelected.add(id);
      }
    });
    
    setSelected(newSelected);
  };

  const handleImport = async () => {
    if (selected.size === 0) {
      setMessage({ type: 'warning', text: 'Please select products to import' });
      return;
    }

    setImporting(true);
    try {
      const response = await fetch('/app/api/suppliers/mypni/import-products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'import-products',
          productIds: Array.from(selected)
        })
      });

      const data = await response.json();
      if (data.success) {
        setMessage({
          type: 'success',
          text: `Imported ${data.imported} products successfully`
        });
        setSelected(new Set());
      } else {
        setMessage({ type: 'error', text: 'Import failed' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: `Error: ${error}` });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">MyPNI Product Importer</h1>
          <p className="text-slate-400">
            Total products available: {categories.reduce((sum, c) => sum + c.product_count, 0)}
          </p>
        </div>

        {message && (
          <div
            className={`mb-6 p-4 rounded border-l-4 flex gap-3 ${
              message.type === 'error'
                ? 'bg-red-900/20 border-red-500 text-red-200'
                : message.type === 'warning'
                ? 'bg-yellow-900/20 border-yellow-500 text-yellow-200'
                : 'bg-green-900/20 border-green-500 text-green-200'
            }`}
          >
            <AlertCircle size={20} className="flex-shrink-0" />
            <span>{message.text}</span>
          </div>
        )}

        {loading ? (
          <div className="text-center py-12">Loading categories...</div>
        ) : (
          <>
            {/* Summary */}
            <div className="mb-6 p-4 bg-slate-900 rounded border border-slate-700">
              <p>
                Selected: <span className="font-bold text-blue-400">{selected.size}</span> products
              </p>
            </div>

            {/* Categories */}
            <div className="space-y-4">
              {categories.map(category => (
                <div
                  key={category.name}
                  className="border border-slate-700 rounded overflow-hidden bg-slate-900"
                >
                  {/* Category Header */}
                  <div
                    className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-800 transition"
                    onClick={() => toggleCategory(category.name)}
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <ChevronDown
                        size={20}
                        className={`transition transform ${
                          expandedCategories.has(category.name) ? 'rotate-180' : ''
                        }`}
                      />
                      <div>
                        <h3 className="font-semibold">{category.name}</h3>
                        <p className="text-sm text-slate-400">
                          {category.product_count} products
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        selectAllInCategory(category);
                      }}
                      className="px-3 py-1 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 rounded text-sm transition"
                    >
                      Select All
                    </button>
                  </div>

                  {/* Product List */}
                  {expandedCategories.has(category.name) && (
                    <div className="border-t border-slate-700 divide-y divide-slate-700">
                      {category.products.map(product => (
                        <div
                          key={product.id}
                          className="p-4 flex items-center gap-3 hover:bg-slate-800/50 transition"
                        >
                          <input
                            type="checkbox"
                            checked={selected.has(product.id)}
                            onChange={() => toggleProduct(product.id)}
                            className="w-5 h-5 rounded border-slate-600"
                          />
                          <div className="flex-1">
                            <p className="font-medium">{product.name}</p>
                            <div className="flex gap-4 text-sm text-slate-400 mt-1">
                              <span>SKU: {product.sku}</span>
                              <span>Stock: {product.stock}</span>
                              <span>Retail: {product.price.retail} RON</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Import Button */}
            <div className="mt-8 flex gap-4">
              <button
                onClick={handleImport}
                disabled={importing || selected.size === 0}
                className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-slate-700 disabled:text-slate-500 rounded font-semibold transition"
              >
                <Download size={20} />
                {importing ? 'Importing...' : `Import ${selected.size} Products`}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
