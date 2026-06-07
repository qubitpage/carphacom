'use client';

import React, { useState, useEffect } from 'react';

interface TieredPrice {
  min_qty: number;
  max_qty: number | null;
  price: number;
}

interface Product {
  id: string;
  title: string;
  sku: string;
  rrp_price: number;
  tiered_pricing: TieredPrice[];
  description: string;
  stock_supplier: number;
  box_size: number;
}

export default function TieredPricingDemo() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedQty, setSelectedQty] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch test products
    const fetchProducts = async () => {
      try {
        const response = await fetch('/app/api/suppliers/mypni/import-products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'fetch-products' })
        });
        
        // For demo, use hardcoded test products
        const demoProducts: Product[] = [
          {
            id: 'prod_test_radio_01',
            title: 'Station Radio PNI HP 60',
            sku: 'PNI-HP60',
            rrp_price: 132,
            description: 'Profesional CB radio station',
            stock_supplier: 930,
            box_size: 20,
            tiered_pricing: [
              { min_qty: 1, max_qty: 2, price: 100 },
              { min_qty: 3, max_qty: 4, price: 98 },
              { min_qty: 5, max_qty: 9, price: 95 },
              { min_qty: 10, max_qty: 19, price: 93 },
              { min_qty: 20, max_qty: null, price: 90 }
            ]
          },
          {
            id: 'prod_test_mic_01',
            title: 'Microfon CB PNI 4 pini',
            sku: 'PNI-MIC4PIN',
            rrp_price: 85,
            description: 'Microfon profesional cu conectare 4 pini',
            stock_supplier: 150,
            box_size: 10,
            tiered_pricing: [
              { min_qty: 1, max_qty: 4, price: 65 },
              { min_qty: 5, max_qty: 9, price: 62 },
              { min_qty: 10, max_qty: 19, price: 60 },
              { min_qty: 20, max_qty: null, price: 58 }
            ]
          },
          {
            id: 'prod_test_suport_01',
            title: 'Suport Antenă Magnetic PNI',
            sku: 'PNI-SUPORT-MAG',
            rrp_price: 45,
            description: 'Suport magnetic pentru antene CB',
            stock_supplier: 500,
            box_size: 50,
            tiered_pricing: [
              { min_qty: 1, max_qty: 9, price: 35 },
              { min_qty: 10, max_qty: 24, price: 33 },
              { min_qty: 25, max_qty: null, price: 31 }
            ]
          }
        ];

        setProducts(demoProducts);
        
        // Initialize quantities
        const initialQty: Record<string, number> = {};
        demoProducts.forEach(p => {
          initialQty[p.id] = 1;
        });
        setSelectedQty(initialQty);
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  const getPriceForQuantity = (tieredPricing: TieredPrice[], qty: number) => {
    let price = tieredPricing[0].price; // default
    for (const tier of tieredPricing) {
      if (qty >= tier.min_qty && (!tier.max_qty || qty <= tier.max_qty)) {
        price = tier.price;
        break;
      }
    }
    return price;
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ro-RO', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(price);
  };

  if (loading) {
    return <div className="text-center py-20">Se încarcă produse...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-slate-100 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-12">
          <h1 className="text-4xl font-bold mb-3 bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
            📦 Tiered Pricing Demo
          </h1>
          <p className="text-slate-300 text-lg">
            Produse cu preț dinamic pe cantitate. RRP (Recommended Retail Price) se ajustează după cantitate comandată.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
          {products.map(product => {
            const qty = selectedQty[product.id] || 1;
            const currentPrice = getPriceForQuantity(product.tiered_pricing, qty);
            const total = currentPrice * qty;

            return (
              <div
                key={product.id}
                className="bg-slate-800/80 backdrop-blur border border-slate-700/50 rounded-xl overflow-hidden hover:border-blue-500/50 transition-all"
              >
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600/20 to-cyan-600/20 border-b border-slate-700 p-6">
                  <h2 className="text-xl font-bold text-white mb-2">{product.title}</h2>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-300 text-sm">SKU: {product.sku}</span>
                    <span className="bg-blue-600/30 text-blue-300 px-3 py-1 rounded-full text-xs font-semibold">
                      RRP: {formatPrice(product.rrp_price)} lei
                    </span>
                  </div>
                </div>

                {/* Body */}
                <div className="p-6 space-y-6">
                  {/* Description */}
                  <p className="text-slate-400 text-sm">{product.description}</p>

                  {/* Stock Info */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-900/50 rounded-lg p-3">
                      <p className="text-xs text-slate-400 uppercase tracking-wide">Stoc</p>
                      <p className="text-lg font-bold text-green-400">{product.stock_supplier} buc</p>
                    </div>
                    <div className="bg-slate-900/50 rounded-lg p-3">
                      <p className="text-xs text-slate-400 uppercase tracking-wide">Box</p>
                      <p className="text-lg font-bold text-blue-400">{product.box_size} buc/bax</p>
                    </div>
                  </div>

                  {/* Quantity Selector */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-300 mb-3">
                      Cantitate comandată:
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        min="1"
                        value={qty}
                        onChange={(e) =>
                          setSelectedQty(prev => ({
                            ...prev,
                            [product.id]: Math.max(1, parseInt(e.target.value) || 1)
                          }))
                        }
                        className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      />
                      <span className="text-slate-400 py-2 px-3">buc</span>
                    </div>
                  </div>

                  {/* Tiered Pricing Table */}
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
                      Preț pe Cantitate (Fără TVA)
                    </p>
                    <div className="space-y-2">
                      {product.tiered_pricing.map((tier, idx) => {
                        const isSelected = qty >= tier.min_qty && (!tier.max_qty || qty <= tier.max_qty);
                        const rangeLabel = tier.max_qty
                          ? `${tier.min_qty}-${tier.max_qty} buc`
                          : `${tier.min_qty}+ buc`;

                        return (
                          <div
                            key={idx}
                            className={`flex justify-between items-center p-3 rounded-lg transition-all ${
                              isSelected
                                ? 'bg-green-600/20 border border-green-500/50'
                                : 'bg-slate-900/30 border border-slate-700/30'
                            }`}
                          >
                            <span className={`text-sm ${isSelected ? 'text-green-300 font-semibold' : 'text-slate-400'}`}>
                              {rangeLabel}
                            </span>
                            <span className={`font-bold ${isSelected ? 'text-green-400 text-lg' : 'text-slate-300'}`}>
                              {formatPrice(tier.price)} lei
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Current Price Display */}
                  <div className="bg-gradient-to-r from-green-600/20 to-emerald-600/20 border border-green-500/50 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <p className="text-slate-400 text-sm mb-1">Preț unitar la {qty} buc:</p>
                        <p className="text-3xl font-bold text-green-400">{formatPrice(currentPrice)} lei</p>
                      </div>
                      {currentPrice < product.rrp_price && (
                        <div className="text-right">
                          <p className="text-xs text-slate-400">Reducere vs RRP:</p>
                          <p className="text-lg font-bold text-green-400">
                            -{formatPrice(product.rrp_price - currentPrice)} lei
                          </p>
                          <p className="text-xs text-green-300">
                            {Math.round(((product.rrp_price - currentPrice) / product.rrp_price) * 100)}% off
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Total */}
                    <div className="border-t border-green-500/30 pt-3">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-300">Total (fără TVA):</span>
                        <span className="text-2xl font-bold text-green-300">{formatPrice(total)} lei</span>
                      </div>
                    </div>
                  </div>

                  {/* Add to Cart Button */}
                  <button className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-bold py-3 rounded-lg transition-all transform hover:scale-105 active:scale-95">
                    🛒 Adaugă în Coș ({qty} buc)
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Info Section */}
        <div className="mt-12 bg-slate-800/50 border border-slate-700/50 rounded-xl p-8">
          <h3 className="text-xl font-bold mb-4 text-slate-200">ℹ️ Cum funcționează Tiered Pricing?</h3>
          <div className="grid md:grid-cols-3 gap-6 text-slate-300">
            <div>
              <p className="font-semibold text-blue-400 mb-2">1️⃣ Cantitate mică (1-2)</p>
              <p className="text-sm">Preț mai mare, doar pentru começi mici. Ideal pentru testare.</p>
            </div>
            <div>
              <p className="font-semibold text-green-400 mb-2">2️⃣ Cantitate medie (5-10)</p>
              <p className="text-sm">Preț redus. Discount progresiv la comandă mai mare.</p>
            </div>
            <div>
              <p className="font-semibold text-cyan-400 mb-2">3️⃣ Cantitate mare (20+)</p>
              <p className="text-sm">Preț wholesale. Cea mai bună ofertă pentru comenzi în vrac.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
