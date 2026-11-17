import {
  Download,
  Edit3,
  Eye,
  FileSpreadsheet,
  FileText,
  Lock,
  Plus,
  Search,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import {
  PRODUCT_CATEGORIES,
  type Product,
  type ProductCategory,
  type UserAccount,
} from '../types/platform.ts';
import { apiFetch } from '../utils/api.ts';
import {
  exportProductDatasheetPDF,
  exportToCSV,
  exportToExcel,
  parseSpreadsheetFile,
} from '../utils/exporters.ts';
import { ResilientImage } from './ResilientImage.tsx';

export function ProductsView({ currentUser }: { currentUser: UserAccount }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'name' | 'price_desc' | 'stock_asc'>('name');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  const canManageProducts = ['admin', 'sales_manager', 'procurement'].includes(currentUser.role);
  const canSeeCost = ['admin', 'sales_manager'].includes(currentUser.role);

  async function loadProducts() {
    setLoading(true);
    try {
      const list = await apiFetch<Product[]>('/api/products');
      setProducts(list);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProducts();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = products.filter((p) => {
      const matchCat = categoryFilter === 'All' || p.category === categoryFilter;
      const matchQ =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.modelNumber.toLowerCase().includes(q) ||
        p.manufacturer.toLowerCase().includes(q) ||
        p.applications.some((a) => a.toLowerCase().includes(q));
      return matchCat && matchQ;
    });
    if (sortBy === 'price_desc') return [...list].sort((a, b) => b.sellingPrice - a.sellingPrice);
    if (sortBy === 'stock_asc') return [...list].sort((a, b) => a.stockQty - b.stockQty);
    return [...list].sort((a, b) => a.name.localeCompare(b.name));
  }, [products, search, categoryFilter, sortBy]);

  async function handleSaveProduct(e: React.FormEvent) {
    e.preventDefault();
    if (!editingProduct) return;
    if (editingProduct.id) {
      await apiFetch(`/api/products/${editingProduct.id}`, {
        method: 'PUT',
        body: JSON.stringify(editingProduct),
      });
      setStatusNotice(`Updated ${editingProduct.name}.`);
    } else {
      await apiFetch('/api/products', {
        method: 'POST',
        body: JSON.stringify(editingProduct),
      });
      setStatusNotice(`Added ${editingProduct.name} to catalogue.`);
    }
    setEditingProduct(null);
    loadProducts();
  }

  async function handleDeleteProduct(id: string, name: string) {
    await apiFetch(`/api/products/${id}`, { method: 'DELETE' });
    setStatusNotice(`Removed ${name} from catalogue.`);
    loadProducts();
  }

  async function handleImportSpreadsheet(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const rows = await parseSpreadsheetFile(file);
    const mapped = rows.map((r) => ({
      name: r.name || r.Name || r['Product Name'] || '',
      modelNumber: r.modelNumber || r.Model || r['Model Number'] || '',
      manufacturer: r.manufacturer || r.Manufacturer || 'OEM Partner',
      brand: r.brand || r.Brand || r.manufacturer || 'OEM',
      category: (r.category || r.Category || 'Analytical Instruments') as ProductCategory,
      sellingPrice: Number(r.sellingPrice || r['Selling Price'] || 15000),
      costPrice: Number(r.costPrice || r['Cost Price'] || 9500),
      stockQty: Number(r.stockQty || r.Stock || 5),
      warranty: r.warranty || '24 Months Standard',
      leadTimeDays: Number(r.leadTimeDays || 14),
      description: r.description || 'Imported instrument entry.',
      applications: r.applications || 'Analytical Laboratory Testing',
    }));
    const res = await apiFetch<{ importedCount: number }>('/api/products/import', {
      method: 'POST',
      body: JSON.stringify({ products: mapped }),
    });
    setStatusNotice(`Imported ${res.importedCount} instruments from ${file.name}.`);
    e.target.value = '';
    loadProducts();
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold">
            Scientific Instrument Product Database
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            17 verified equipment categories · Technical specs, datasheets, stock &{' '}
            {canSeeCost ? 'cost margin visibility enabled for your role.' : 'cost prices restricted to Admin/Sales Manager.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() =>
              exportToCSV(
                'helios_product_catalogue',
                filtered.map((p) => ({
                  Name: p.name,
                  Model: p.modelNumber,
                  Manufacturer: p.manufacturer,
                  Category: p.category,
                  SellingPriceUSD: p.sellingPrice,
                  ...(canSeeCost ? { CostPriceUSD: p.costPrice ?? 0 } : {}),
                  StockQty: p.stockQty,
                  LeadTimeDays: p.leadTimeDays,
                }))
              )
            }
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            <Download className="w-3.5 h-3.5" /> CSV
          </button>

          <button
            type="button"
            onClick={() =>
              exportToExcel('Helios_Instrument_Catalogue', [
                {
                  name: 'Products',
                  rows: filtered.map((p) => ({
                    Name: p.name,
                    Model: p.modelNumber,
                    Manufacturer: p.manufacturer,
                    Category: p.category,
                    SellingPriceUSD: p.sellingPrice,
                    ...(canSeeCost ? { CostPriceUSD: p.costPrice ?? 0 } : {}),
                    StockQty: p.stockQty,
                    Warranty: p.warranty,
                    LeadTimeDays: p.leadTimeDays,
                  })),
                },
              ])
            }
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" /> Excel
          </button>

          {canManageProducts && (
            <>
              <label className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer">
                <Upload className="w-3.5 h-3.5" /> Import Excel/CSV
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleImportSpreadsheet}
                  className="hidden"
                />
              </label>

              <button
                type="button"
                onClick={() =>
                  setEditingProduct({
                    name: '',
                    manufacturer: '',
                    brand: '',
                    modelNumber: '',
                    category: PRODUCT_CATEGORIES[0],
                    sellingPrice: 25000,
                    costPrice: 16500,
                    stockQty: 4,
                    warranty: '24 Months Standard Warranty',
                    leadTimeDays: 14,
                    description: '',
                    installationReqs: '',
                    maintenanceReqs: '',
                    applications: ['Analytical Quality Control'],
                    features: ['High-precision calibration'],
                    regulatoryCerts: ['CE Marked'],
                  })
                }
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-cyan-700 hover:bg-cyan-800 text-white rounded-md"
              >
                <Plus className="w-3.5 h-3.5" /> Add Instrument
              </button>
            </>
          )}
        </div>
      </div>

      {statusNotice && (
        <div className="p-3 text-xs bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200 dark:border-cyan-800 text-cyan-900 dark:text-cyan-200 rounded-md flex items-center justify-between">
          <span>{statusNotice}</span>
          <button type="button" onClick={() => setStatusNotice(null)}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Search, Category Filter & Sort */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by product name, model number, OEM, or application..."
            className="w-full pl-9 pr-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md"
          />
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md max-w-xs"
        >
          <option value="All">All 17 Instrument Categories ({products.length})</option>
          {PRODUCT_CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as 'name' | 'price_desc' | 'stock_asc')}
          className="px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md"
        >
          <option value="name">Sort: Name A–Z</option>
          <option value="price_desc">Sort: Selling Price High–Low</option>
          <option value="stock_asc">Sort: Stock Availability Low–High</option>
        </select>
      </div>

      {/* Product Data Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-950/60">
              <th className="text-left py-3 px-4 font-semibold">Instrument & Category</th>
              <th className="text-left py-3 px-3 font-semibold">OEM / Model</th>
              <th className="text-right py-3 px-3 font-semibold">Selling Price</th>
              {canSeeCost ? (
                <th className="text-right py-3 px-3 font-semibold">Cost / Margin</th>
              ) : (
                <th className="text-right py-3 px-3 font-semibold">Cost Access</th>
              )}
              <th className="text-right py-3 px-3 font-semibold">Stock / Lead</th>
              <th className="text-right py-3 px-4 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {loading ? (
              <tr>
                <td colSpan={6} className="py-10 text-center text-slate-500">
                  Loading scientific product catalogue...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-10 text-center text-slate-500">
                  No instruments match your search criteria.
                </td>
              </tr>
            ) : (
              filtered.map((p) => {
                const marginPct =
                  canSeeCost && p.costPrice && p.sellingPrice > 0
                    ? Math.round(((p.sellingPrice - p.costPrice) / p.sellingPrice) * 100)
                    : null;
                return (
                  <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-9 rounded overflow-hidden border border-slate-200 dark:border-slate-800 shrink-0">
                          <ResilientImage src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-slate-900 dark:text-white truncate max-w-xs">
                            {p.name}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-xs">
                            {p.category}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-medium">{p.manufacturer}</div>
                      <div className="font-mono text-slate-500">{p.modelNumber}</div>
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-semibold tabular-nums">
                      ${p.sellingPrice.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums">
                      {canSeeCost && p.costPrice !== undefined ? (
                        <div>
                          <div>${p.costPrice.toLocaleString()}</div>
                          <div className="text-[11px] text-emerald-700 dark:text-emerald-400">
                            {marginPct}% GM
                          </div>
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
                          <Lock className="w-3 h-3" /> Restricted
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div
                        className={`font-medium ${
                          p.stockQty > 3
                            ? 'text-emerald-700 dark:text-emerald-400'
                            : 'text-amber-700 dark:text-amber-400'
                        }`}
                      >
                        {p.stockQty} units · {p.stockStatus}
                      </div>
                      <div className="text-[11px] font-mono text-slate-500">{p.leadTimeDays}d lead</div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setSelectedProduct(p)}
                          title="View Details"
                          className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => exportProductDatasheetPDF(p)}
                          title="Download Datasheet PDF"
                          className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded"
                        >
                          <FileText className="w-3.5 h-3.5" />
                        </button>
                        {canManageProducts && (
                          <button
                            type="button"
                            onClick={() => setEditingProduct(p)}
                            title="Edit Product"
                            className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {['admin', 'sales_manager'].includes(currentUser.role) && (
                          <button
                            type="button"
                            onClick={() => handleDeleteProduct(p.id, p.name)}
                            title="Delete Product"
                            className="p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Product Detail Drawer */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex justify-end">
          <div className="bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 w-full max-w-xl h-full overflow-y-auto p-6 space-y-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs font-mono text-slate-500">
                  {selectedProduct.modelNumber} · {selectedProduct.datasheetCode}
                </div>
                <h2 className="text-xl font-display font-bold mt-1">{selectedProduct.name}</h2>
              </div>
              <button type="button" onClick={() => setSelectedProduct(null)}>
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="aspect-[16/10] rounded-md overflow-hidden border border-slate-200 dark:border-slate-800">
              <ResilientImage src={selectedProduct.imageUrl} alt={selectedProduct.name} className="w-full h-full object-cover" />
            </div>

            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              {selectedProduct.description}
            </p>

            <div className="grid grid-cols-2 gap-3 text-xs p-3.5 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-md">
              <div>
                <div className="text-slate-500">List Price</div>
                <div className="text-base font-mono font-bold tabular-nums">
                  ${selectedProduct.sellingPrice.toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-slate-500">Restricted Cost Price</div>
                <div className="text-base font-mono font-bold tabular-nums">
                  {canSeeCost && selectedProduct.costPrice !== undefined
                    ? `$${selectedProduct.costPrice.toLocaleString()}`
                    : 'Restricted'}
                </div>
              </div>
              <div>
                <div className="text-slate-500">Warranty</div>
                <div className="font-medium mt-0.5">{selectedProduct.warranty}</div>
              </div>
              <div>
                <div className="text-slate-500">Delivery Lead Time</div>
                <div className="font-mono mt-0.5">{selectedProduct.leadTimeDays} business days</div>
              </div>
            </div>

            <div>
              <h3 className="text-xs font-mono uppercase text-slate-500 mb-2">Verified Technical Specifications</h3>
              <div className="border border-slate-200 dark:border-slate-800 rounded-md divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                {Object.entries(selectedProduct.specs).map(([k, v]) => (
                  <div key={k} className="grid grid-cols-2 px-3 py-2">
                    <span className="text-slate-500">{k}</span>
                    <span className="font-mono">{v}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <div>
                <span className="font-semibold">Applications:</span> {selectedProduct.applications.join(' · ')}
              </div>
              <div>
                <span className="font-semibold">Key Features:</span> {selectedProduct.features.join(' · ')}
              </div>
              <div>
                <span className="font-semibold">Installation Requirements:</span> {selectedProduct.installationReqs}
              </div>
              <div>
                <span className="font-semibold">Maintenance Requirements:</span> {selectedProduct.maintenanceReqs}
              </div>
              <div>
                <span className="font-semibold">Certifications:</span> {selectedProduct.regulatoryCerts.join(', ')}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center gap-3">
              <button
                type="button"
                onClick={() => exportProductDatasheetPDF(selectedProduct)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-cyan-700 text-white rounded-md hover:bg-cyan-800"
              >
                <FileText className="w-4 h-4" /> Export PDF Datasheet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Modal */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveProduct}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-display font-bold">
                {editingProduct.id ? 'Edit Scientific Instrument' : 'Add New Scientific Instrument'}
              </h3>
              <button type="button" onClick={() => setEditingProduct(null)}>
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="sm:col-span-2">
                <label className="block font-medium mb-1">Product Name *</label>
                <input
                  required
                  value={editingProduct.name || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md"
                />
              </div>
              <div>
                <label className="block font-medium mb-1">Manufacturer *</label>
                <input
                  required
                  value={editingProduct.manufacturer || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, manufacturer: e.target.value, brand: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md"
                />
              </div>
              <div>
                <label className="block font-medium mb-1">Model Number *</label>
                <input
                  required
                  value={editingProduct.modelNumber || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, modelNumber: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block font-medium mb-1">Category *</label>
                <select
                  value={editingProduct.category || PRODUCT_CATEGORIES[0]}
                  onChange={(e) => setEditingProduct({ ...editingProduct, category: e.target.value as ProductCategory })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md"
                >
                  {PRODUCT_CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-medium mb-1">Selling Price (USD)</label>
                <input
                  type="number"
                  value={editingProduct.sellingPrice ?? 0}
                  onChange={(e) => setEditingProduct({ ...editingProduct, sellingPrice: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md font-mono"
                />
              </div>
              {canSeeCost && (
                <div>
                  <label className="block font-medium mb-1">Cost Price (USD · Restricted)</label>
                  <input
                    type="number"
                    value={editingProduct.costPrice ?? 0}
                    onChange={(e) => setEditingProduct({ ...editingProduct, costPrice: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md font-mono"
                  />
                </div>
              )}
              <div>
                <label className="block font-medium mb-1">Stock Quantity</label>
                <input
                  type="number"
                  value={editingProduct.stockQty ?? 0}
                  onChange={(e) => setEditingProduct({ ...editingProduct, stockQty: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md font-mono"
                />
              </div>
              <div>
                <label className="block font-medium mb-1">Lead Time (Days)</label>
                <input
                  type="number"
                  value={editingProduct.leadTimeDays ?? 14}
                  onChange={(e) => setEditingProduct({ ...editingProduct, leadTimeDays: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md font-mono"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block font-medium mb-1">Description</label>
                <textarea
                  rows={2}
                  value={editingProduct.description || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block font-medium mb-1">Installation Requirements</label>
                <input
                  value={editingProduct.installationReqs || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, installationReqs: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setEditingProduct(null)}
                className="px-4 py-2 text-xs font-medium border border-slate-300 dark:border-slate-700 rounded-md"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold bg-cyan-700 text-white rounded-md hover:bg-cyan-800"
              >
                Save Instrument
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
