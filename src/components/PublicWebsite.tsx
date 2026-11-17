import {
  ArrowRight,
  Building2,
  Check,
  Download,
  FileText,
  FlaskConical,
  Globe,
  Layers,
  Mail,
  MessageCircle,
  Moon,
  Phone,
  Scale,
  Search,
  ShieldCheck,
  Sun,
  Wrench,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { PRODUCT_CATEGORIES, type NewsEvent, type Product } from '../types/platform.ts';
import { apiFetch } from '../utils/api.ts';
import { exportProductDatasheetPDF } from '../utils/exporters.ts';
import { ResilientImage } from './ResilientImage.tsx';

interface PublicWebsiteProps {
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onOpenStaffLogin: () => void;
  isAuthenticated: boolean;
  onReturnToWorkspace: () => void;
}

const HERO_LAB_IMG = '/src/assets/images/hero_analytical_lab_1794929812978.jpg';

const BRANDS = [
  { name: 'Agilent Technologies', focus: 'UHPLC, GC & Mass Spectrometry' },
  { name: 'SCIEX', focus: 'Triple Quadrupole & QTOF LC-MS/MS' },
  { name: 'Bruker Optics', focus: 'FTIR, Raman & Material Spectroscopy' },
  { name: 'Bio-Rad Laboratories', focus: 'Real-Time qPCR & Genomics' },
  { name: 'Mettler Toledo', focus: 'Analytical Balances & Karl Fischer' },
  { name: 'Eppendorf', focus: 'High-Speed Centrifuges & Liquid Handling' },
  { name: 'Thermo Scientific', focus: 'CO2 Incubators & Nucleic Acid Extraction' },
  { name: 'PHCbi', focus: '-86 °C Ultra-Low Biobank Freezers' },
];

const APPLICATIONS = [
  {
    title: '01. Pharmaceutical Nitrosamine & ICH Q3D Compliance',
    detail: 'Validated sub-ppb LC-MS/MS and ICP-MS workflows supporting 21 CFR Part 11 audit trails and GMP batch release.',
  },
  {
    title: '02. Clinical Molecular Diagnostics & Biobanking',
    detail: 'High-throughput 6-plex qPCR thermal cycling, automated nucleic acid extraction, and dual-compressor -86 °C sample preservation.',
  },
  {
    title: '03. Environmental PFAS & Heavy Metals Monitoring',
    detail: 'Ultra-low TOC Type 1 water purification paired with 1300-bar UHPLC and EPA 200.8 ICP-MS trace elemental detection.',
  },
  {
    title: '04. Petrochemical & Industrial Quality Control',
    detail: 'Automated Karl Fischer moisture titration, ASTM D2887 gas chromatography, and ATR-FTIR raw material verification.',
  },
];

const INDUSTRIES = [
  'Pharmaceutical & Biopharma GMP',
  'Hospitals & Reference Pathology',
  'Universities & Academic Centers',
  'Government & Regulatory Agencies',
  'Food, Beverage & Mycotoxin Labs',
  'Environmental & Water Utilities',
  'Oil, Gas & Petrochemicals',
  'Contract Testing Organizations (CRO)',
];

const TURNKEY_SOLUTIONS = [
  {
    title: 'Complete Analytical QC Suite',
    scope: 'Chromatography, Mass Spec, Analytical Weighing & Type 1 Water',
    deliverable: 'Includes bench layout, N2 gas generation sizing, UPS power specification, and IQ/OQ/PQ commissioning.',
  },
  {
    title: 'Molecular Diagnostics & BSL-2 Lab',
    scope: 'Biosafety Cabinets, Nucleic Acid Extractors, qPCR & -86 °C Freezers',
    deliverable: 'Includes airflow certification (EN 12469), LIS integration, and operator bio-safety training.',
  },
  {
    title: 'University Teaching & Core Research Lab',
    scope: 'Benchtop FTIR/UV-Vis, Centrifuges, Incubators & Autoclaves',
    deliverable: 'Includes multi-year preventive maintenance coverage and curriculum method kits.',
  },
];

export function PublicWebsite({
  darkMode,
  onToggleDarkMode,
  onOpenStaffLogin,
  isAuthenticated,
  onReturnToWorkspace,
}: PublicWebsiteProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [newsEvents, setNewsEvents] = useState<NewsEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [showCompareDrawer, setShowCompareDrawer] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showWhatsAppBox, setShowWhatsAppBox] = useState(false);
  const [waMessage, setWaMessage] = useState(
    'Hello Helios Analytical, our laboratory would like technical pricing and lead-time details for:'
  );

  // RFQ & Contact Form state
  const [rfqForm, setRfqForm] = useState({
    type: 'RFQ' as 'RFQ' | 'Contact',
    institutionName: '',
    contactName: '',
    email: '',
    phone: '',
    country: '',
    productInterest: '',
    message: '',
  });
  const [rfqSubmitting, setRfqSubmitting] = useState(false);
  const [rfqSuccess, setRfqSuccess] = useState<string | null>(null);
  const [rfqError, setRfqError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<{ products: Product[]; newsEvents: NewsEvent[] }>('/api/public/catalog')
      .then((res) => {
        setProducts(res.products);
        setNewsEvents(res.newsEvents);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchCat = selectedCategory === 'All' || p.category === selectedCategory;
      const q = search.trim().toLowerCase();
      const matchSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.modelNumber.toLowerCase().includes(q) ||
        p.manufacturer.toLowerCase().includes(q) ||
        p.applications.some((a) => a.toLowerCase().includes(q));
      return matchCat && matchSearch;
    });
  }, [products, selectedCategory, search]);

  const compareProducts = useMemo(
    () => products.filter((p) => compareIds.includes(p.id)),
    [products, compareIds]
  );

  function toggleCompare(id: string) {
    setCompareIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 3) return [...prev.slice(1), id];
      return [...prev, id];
    });
  }

  function prefillRfqWithProduct(product: Product) {
    setRfqForm((f) => ({
      ...f,
      type: 'RFQ',
      productInterest: `${product.name} (${product.modelNumber})`,
    }));
    const el = document.getElementById('request-quote');
    el?.scrollIntoView({ behavior: 'smooth' });
  }

  async function handleRfqSubmit(e: React.FormEvent) {
    e.preventDefault();
    setRfqError(null);
    setRfqSuccess(null);
    if (!rfqForm.institutionName || !rfqForm.contactName || !rfqForm.email) {
      setRfqError('Please provide your institution name, contact name, and email address.');
      return;
    }
    setRfqSubmitting(true);
    try {
      await apiFetch('/api/public/inquiries', {
        method: 'POST',
        body: JSON.stringify(rfqForm),
      });
      setRfqSuccess(
        'Your inquiry has been logged directly into our Engineering & Quotations desk. An application specialist will respond within 1 business day.'
      );
      setRfqForm({
        type: 'RFQ',
        institutionName: '',
        contactName: '',
        email: '',
        phone: '',
        country: '',
        productInterest: '',
        message: '',
      });
    } catch (err) {
      setRfqError(err instanceof Error ? err.message : 'Unable to submit request.');
    } finally {
      setRfqSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      {/* STRICT 3-ZONE TOP BAR CONTRACT */}
      <header className="sticky top-0 z-40 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-950/95 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-8">
          <a
            href="#home"
            className="text-lg font-display font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap shrink-0"
          >
            Helios Analytical
          </a>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-300">
            <a href="#products" className="hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0">
              Products
            </a>
            <a href="#solutions" className="hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0">
              Solutions
            </a>
            <a href="#services" className="hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0">
              Services
            </a>
            <a href="#about" className="hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0">
              About
            </a>
            <a href="#contact" className="hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0">
              Contact
            </a>
          </nav>

          <div className="flex items-center shrink-0">
            <a
              href="#request-quote"
              className="px-4 py-2 text-xs font-semibold text-white bg-cyan-700 hover:bg-cyan-800 dark:bg-cyan-600 dark:hover:bg-cyan-500 rounded-md transition-colors whitespace-nowrap shrink-0"
            >
              Request Quote
            </a>
          </div>
        </div>
      </header>

      {/* HERO SECTION */}
      <section id="home" className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="max-w-7xl mx-auto px-6 py-12 lg:py-16 grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
          <div className="lg:col-span-6 flex flex-col justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 text-xs font-medium text-slate-500 dark:text-slate-400 mb-4">
                <span>ISO 9001 & 17025 Supply Partner</span>
                <span aria-hidden="true">·</span>
                <span>Global Laboratory Commissioning</span>
                <span aria-hidden="true">·</span>
                <span>17 Instrument Categories</span>
              </div>

              <h1
                className="font-display font-bold tracking-tight text-slate-900 dark:text-white leading-[1.08]"
                style={{ fontSize: 'clamp(2.25rem, 3.6vw, 3.35rem)', textWrap: 'balance' }}
              >
                Precision Laboratory Instrumentation & Turnkey Commissioning
              </h1>

              <p className="mt-5 text-base text-slate-600 dark:text-slate-300 leading-relaxed max-w-xl">
                Helios Analytical supplies, installs, qualifies, and services analytical chromatography, mass spectrometry, molecular biology, and cold-chain laboratory systems across pharmaceutical, clinical, academic, and industrial facilities worldwide.
              </p>

              <div className="mt-7 flex flex-wrap items-center gap-3">
                <a
                  href="#products"
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold bg-slate-900 text-white dark:bg-white dark:text-slate-900 rounded-md hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors whitespace-nowrap shrink-0"
                >
                  Explore Catalogue <ArrowRight className="w-4 h-4" />
                </a>
                <button
                  type="button"
                  onClick={isAuthenticated ? onReturnToWorkspace : onOpenStaffLogin}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
                >
                  {isAuthenticated ? 'Open Management Workspace' : 'Staff & Operations Portal'}
                </button>
                <button
                  type="button"
                  onClick={onToggleDarkMode}
                  aria-label="Toggle color theme"
                  className="inline-flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium border border-slate-200 dark:border-slate-800 rounded-md text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
                >
                  {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                  {darkMode ? 'Light' : 'Dark'}
                </button>
              </div>
            </div>
          </div>

          <div className="lg:col-span-6">
            <div className="relative h-full min-h-[280px] rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800">
              <ResilientImage
                src={HERO_LAB_IMG}
                alt="Modern analytical chemistry and life sciences laboratory equipped with chromatography and mass spectrometry instrumentation"
                title="Helios Analytical Reference Facility"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-slate-950/20 to-transparent flex items-end p-6">
                <div className="text-white">
                  <div className="text-xs font-mono text-cyan-300">FRANKFURT METROLOGY HUB · IQ / OQ / PQ</div>
                  <div className="text-sm font-medium mt-1">
                    Factory-authorized distribution, pre-delivery calibration, and 24-hour field engineering dispatch.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* VERIFIED PROOF STRIP */}
        <div className="border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60">
          <div className="max-w-7xl mx-auto px-6 py-5 grid grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <div className="text-2xl font-mono font-bold tabular-nums text-slate-900 dark:text-white">1,420+</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Instruments Commissioned Globally</div>
            </div>
            <div>
              <div className="text-2xl font-mono font-bold tabular-nums text-slate-900 dark:text-white">98.7%</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">First-Visit IQ/OQ Qualification Pass Rate</div>
            </div>
            <div>
              <div className="text-2xl font-mono font-bold tabular-nums text-slate-900 dark:text-white">17</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Specialized Laboratory Equipment Categories</div>
            </div>
            <div>
              <div className="text-2xl font-mono font-bold tabular-nums text-slate-900 dark:text-white">&lt; 24 hrs</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Application Chemist & Service Response</div>
            </div>
          </div>
        </div>
      </section>

      {/* PRODUCTS & INTERACTIVE CATALOGUE */}
      <section id="products" className="py-14 max-w-7xl mx-auto px-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
          <div>
            <div className="text-xs font-mono uppercase tracking-wider text-cyan-700 dark:text-cyan-400">
              Verified Instrument Catalogue
            </div>
            <h2 className="text-2xl lg:text-3xl font-display font-bold text-slate-900 dark:text-white mt-1">
              Scientific Instruments & Laboratory Systems
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search model, OEM, application..."
                className="pl-9 pr-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md w-64 focus:outline-none focus:ring-2 focus:ring-cyan-600"
              />
            </div>

            {compareIds.length > 0 && (
              <button
                type="button"
                onClick={() => setShowCompareDrawer(true)}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-cyan-700 text-white rounded-md hover:bg-cyan-800 transition-colors whitespace-nowrap shrink-0"
              >
                <Scale className="w-4 h-4" />
                Compare ({compareIds.length}/3)
              </button>
            )}
          </div>
        </div>

        {/* Category Filter Bar */}
        <div className="mt-5 flex items-center gap-2 overflow-x-auto pb-2">
          <button
            type="button"
            onClick={() => setSelectedCategory('All')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
              selectedCategory === 'All'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            All Categories ({products.length})
          </button>
          {PRODUCT_CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                selectedCategory === cat
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                  : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Product Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div
                key={n}
                className="h-96 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 animate-pulse"
              />
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="mt-8 p-12 text-center border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900">
            <FlaskConical className="w-8 h-8 text-slate-400 mx-auto mb-3" />
            <div className="text-base font-semibold">No instruments matched your search</div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Clear your category or keyword filter, or submit a custom sourcing request below.
            </p>
            <button
              type="button"
              onClick={() => {
                setSelectedCategory('All');
                setSearch('');
              }}
              className="mt-4 px-4 py-2 text-xs font-semibold bg-slate-900 text-white dark:bg-white dark:text-slate-900 rounded-md"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
            {filteredProducts.map((product) => {
              const isCompared = compareIds.includes(product.id);
              return (
                <div
                  key={product.id}
                  className="flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
                >
                  <div className="aspect-[4/3] w-full overflow-hidden border-b border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800">
                    <ResilientImage
                      src={product.imageUrl}
                      alt={product.name}
                      title={product.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="p-5 flex-1 flex flex-col justify-between gap-4">
                    <div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2 truncate">
                        <span className="font-mono">{product.modelNumber}</span>
                        <span aria-hidden="true">·</span>
                        <span>{product.manufacturer}</span>
                      </div>
                      <h3 className="text-base font-display font-semibold text-slate-900 dark:text-white mt-1.5 leading-snug">
                        {product.name}
                      </h3>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 line-clamp-2 leading-relaxed">
                        {product.description}
                      </p>

                      <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                        <span className="font-mono font-semibold tabular-nums text-slate-900 dark:text-white text-sm">
                          ${product.sellingPrice.toLocaleString()}
                        </span>
                        <span
                          className={
                            product.stockStatus === 'In Stock'
                              ? 'text-emerald-700 dark:text-emerald-400 font-medium'
                              : 'text-amber-700 dark:text-amber-400 font-medium'
                          }
                        >
                          ● {product.stockStatus} ({product.leadTimeDays}d lead)
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setSelectedProduct(product)}
                        className="px-2.5 py-2 text-xs font-medium border border-slate-200 dark:border-slate-700 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap"
                      >
                        Specs
                      </button>
                      <button
                        type="button"
                        onClick={() => exportProductDatasheetPDF(product)}
                        className="inline-flex items-center justify-center gap-1 px-2.5 py-2 text-xs font-medium border border-slate-200 dark:border-slate-700 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap"
                      >
                        <Download className="w-3.5 h-3.5" /> PDF
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleCompare(product.id)}
                        className={`px-2.5 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                          isCompared
                            ? 'bg-cyan-700 text-white'
                            : 'border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        {isCompared ? 'Selected' : 'Compare'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* BRANDS, APPLICATIONS, INDUSTRIES & TURNKEY SOLUTIONS */}
      <section id="solutions" className="py-14 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="max-w-7xl mx-auto px-6 space-y-14">
          {/* Authorized OEM Brands */}
          <div>
            <div className="text-xs font-mono uppercase tracking-wider text-cyan-700 dark:text-cyan-400">
              Authorized OEM Partners
            </div>
            <h2 className="text-2xl font-display font-bold mt-1">Global Instrument Manufacturers</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
              {BRANDS.map((b) => (
                <div
                  key={b.name}
                  className="p-4 border border-slate-200 dark:border-slate-800 rounded-lg bg-slate-50 dark:bg-slate-950/60"
                >
                  <div className="font-display font-semibold text-sm text-slate-900 dark:text-white">{b.name}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{b.focus}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Applications & Industries Split */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 pt-4 border-t border-slate-200 dark:border-slate-800">
            <div className="lg:col-span-7">
              <div className="text-xs font-mono uppercase tracking-wider text-cyan-700 dark:text-cyan-400">
                Applications
              </div>
              <h2 className="text-2xl font-display font-bold mt-1">Validated Analytical Workflows</h2>
              <div className="mt-5 divide-y divide-slate-200 dark:divide-slate-800 border-t border-b border-slate-200 dark:border-slate-800">
                {APPLICATIONS.map((app) => (
                  <div key={app.title} className="py-4">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{app.title}</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{app.detail}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-5">
              <div className="text-xs font-mono uppercase tracking-wider text-cyan-700 dark:text-cyan-400">
                Industries Served
              </div>
              <h2 className="text-2xl font-display font-bold mt-1">Institutional Sectors</h2>
              <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {INDUSTRIES.map((ind) => (
                  <div
                    key={ind}
                    className="p-3.5 border border-slate-200 dark:border-slate-800 rounded-md text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2"
                  >
                    <Building2 className="w-4 h-4 text-cyan-700 dark:text-cyan-400 shrink-0" />
                    <span>{ind}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Turnkey Laboratory Solutions */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
            <div className="text-xs font-mono uppercase tracking-wider text-cyan-700 dark:text-cyan-400">
              Laboratory Solutions
            </div>
            <h2 className="text-2xl font-display font-bold mt-1">Turnkey Laboratory Packages</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
              {TURNKEY_SOLUTIONS.map((sol) => (
                <div
                  key={sol.title}
                  className="p-6 border border-slate-200 dark:border-slate-800 rounded-lg bg-slate-50 dark:bg-slate-950/60 flex flex-col justify-between gap-4"
                >
                  <div>
                    <Layers className="w-5 h-5 text-cyan-700 dark:text-cyan-400 mb-3" />
                    <h3 className="text-base font-display font-semibold">{sol.title}</h3>
                    <div className="text-xs font-medium text-cyan-700 dark:text-cyan-400 mt-1.5">{sol.scope}</div>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-3 leading-relaxed">
                      {sol.deliverable}
                    </p>
                  </div>
                  <a
                    href="#request-quote"
                    onClick={() =>
                      setRfqForm((f) => ({ ...f, type: 'RFQ', productInterest: sol.title }))
                    }
                    className="text-xs font-semibold text-slate-900 dark:text-white inline-flex items-center gap-1 hover:underline"
                  >
                    Request Turnkey Proposal <ArrowRight className="w-3.5 h-3.5" />
                  </a>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* SERVICES, TECHNICAL SUPPORT, ABOUT & NEWS */}
      <section id="services" className="py-14 max-w-7xl mx-auto px-6 space-y-14">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg">
            <div className="flex items-center gap-2 text-cyan-700 dark:text-cyan-400 text-xs font-mono uppercase">
              <Wrench className="w-4 h-4" /> Lifecycle Services
            </div>
            <h2 className="text-xl font-display font-bold mt-2">
              Installation, IQ/OQ Qualification & Preventive Maintenance
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
              Factory-certified field engineers execute site utility audits, NIST-traceable calibration, USP &lt;1058&gt; / 21 CFR Part 11 analytical instrument qualification, and annual SLA service contracts.
            </p>
            <ul className="mt-4 space-y-2 text-sm text-slate-700 dark:text-slate-300">
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600" /> On-site IQ/OQ/PQ qualification binders & raw trace data
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600" /> Guaranteed 24-hour remote triage & 48-hour dispatch SLA
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600" /> Genuine OEM spare parts, columns, lamps & calibration kits
              </li>
            </ul>
          </div>

          <div id="about" className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg">
            <div className="flex items-center gap-2 text-cyan-700 dark:text-cyan-400 text-xs font-mono uppercase">
              <ShieldCheck className="w-4 h-4" /> About Helios Analytical & Technical Support
            </div>
            <h2 className="text-xl font-display font-bold mt-2">
              Single-Partner Accountability from Procurement to Metrology
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
              Headquartered in Frankfurt with regional cold-chain and metrology hubs in Dubai and Singapore, Helios Analytical bridges international laboratory instrument OEMs with end-user clinical, regulatory, and R&D laboratories.
            </p>
            <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800 grid grid-cols-2 gap-4 text-xs">
              <div>
                <div className="font-semibold text-slate-900 dark:text-white">Technical Support Desk</div>
                <div className="text-slate-500 dark:text-slate-400 mt-1">support@heliosanalytical.com</div>
                <div className="font-mono text-slate-700 dark:text-slate-300 mt-0.5">+49 69 5550 8200</div>
              </div>
              <div>
                <div className="font-semibold text-slate-900 dark:text-white">Application Method Help</div>
                <div className="text-slate-500 dark:text-slate-400 mt-1">apps@heliosanalytical.com</div>
                <div className="text-slate-500 dark:text-slate-400 mt-0.5">Mon–Fri 07:00–19:00 CET</div>
              </div>
            </div>
          </div>
        </div>

        {/* News & Events */}
        <div>
          <div className="text-xs font-mono uppercase tracking-wider text-cyan-700 dark:text-cyan-400">
            News & Events
          </div>
          <h2 className="text-2xl font-display font-bold mt-1">Exhibitions, Webinars & Facility Updates</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-5">
            {newsEvents.map((ev) => (
              <div
                key={ev.id}
                className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg"
              >
                <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
                  <span>{ev.category}</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono tabular-nums">{ev.date}</span>
                  <span aria-hidden="true">·</span>
                  <span>{ev.location}</span>
                </div>
                <h3 className="text-base font-display font-semibold mt-2 leading-snug">{ev.title}</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">{ev.summary}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* REQUEST A QUOTATION & CONTACT US */}
      <section
        id="request-quote"
        className="py-14 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
      >
        <div id="contact" className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-5 space-y-6">
            <div>
              <div className="text-xs font-mono uppercase tracking-wider text-cyan-700 dark:text-cyan-400">
                Contact & Quotations Desk
              </div>
              <h2 className="text-2xl lg:text-3xl font-display font-bold mt-1">
                Request a Formal Quotation or Technical Consultation
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-3 leading-relaxed">
                Submit your instrument specifications, laboratory capacity targets, or tender documentation. All public requests feed directly into our CRM & Quotations engineering queue.
              </p>
            </div>

            <div className="space-y-3 text-sm text-slate-700 dark:text-slate-300 pt-2">
              <div className="flex items-center gap-3">
                <Globe className="w-4 h-4 text-cyan-700 dark:text-cyan-400" />
                <span>Frankfurt HQ · Dubai Logistics Hub · Singapore APAC Center</span>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-cyan-700 dark:text-cyan-400" />
                <span>quotes@heliosanalytical.com</span>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="w-4 h-4 text-cyan-700 dark:text-cyan-400" />
                <span className="font-mono">+49 69 5550 8100</span>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowWhatsAppBox(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white rounded-md transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                Direct WhatsApp Instrument Inquiry
              </button>
            </div>
          </div>

          <div className="lg:col-span-7">
            <form
              onSubmit={handleRfqSubmit}
              className="p-6 border border-slate-200 dark:border-slate-800 rounded-lg bg-slate-50 dark:bg-slate-950/60 space-y-4"
            >
              <div className="flex items-center gap-2">
                {(['RFQ', 'Contact'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setRfqForm((f) => ({ ...f, type: t }))}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                      rfqForm.type === t
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                        : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {t === 'RFQ' ? 'Request a Quotation' : 'General Contact Inquiry'}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Institution / Company Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={rfqForm.institutionName}
                    onChange={(e) => setRfqForm({ ...rfqForm, institutionName: e.target.value })}
                    placeholder="e.g. Basel University Hospital Lab"
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Contact Person *
                  </label>
                  <input
                    type="text"
                    required
                    value={rfqForm.contactName}
                    onChange={(e) => setRfqForm({ ...rfqForm, contactName: e.target.value })}
                    placeholder="Full Name & Title"
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Institutional Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={rfqForm.email}
                    onChange={(e) => setRfqForm({ ...rfqForm, email: e.target.value })}
                    placeholder="name@institution.org"
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Phone / Country
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={rfqForm.phone}
                      onChange={(e) => setRfqForm({ ...rfqForm, phone: e.target.value })}
                      placeholder="+41 ..."
                      className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md"
                    />
                    <input
                      type="text"
                      value={rfqForm.country}
                      onChange={(e) => setRfqForm({ ...rfqForm, country: e.target.value })}
                      placeholder="Country"
                      className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Instrument(s) or Turnkey Solution of Interest
                </label>
                <input
                  type="text"
                  value={rfqForm.productInterest}
                  onChange={(e) => setRfqForm({ ...rfqForm, productInterest: e.target.value })}
                  placeholder="e.g. QuantIon 7500 LC-MS/MS, NexaChrom UHPLC, IQ/OQ Package"
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Application Requirements & Delivery Timeline
                </label>
                <textarea
                  rows={3}
                  value={rfqForm.message}
                  onChange={(e) => setRfqForm({ ...rfqForm, message: e.target.value })}
                  placeholder="Specify sample throughput, regulatory compliance (GMP/ISO 17025), or site readiness..."
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md"
                />
              </div>

              {rfqError && (
                <div className="p-3 text-xs text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 rounded-md">
                  {rfqError}
                </div>
              )}
              {rfqSuccess && (
                <div className="p-3 text-xs text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-md">
                  {rfqSuccess}
                </div>
              )}

              <button
                type="submit"
                disabled={rfqSubmitting}
                className="px-5 py-2.5 text-sm font-semibold bg-cyan-700 hover:bg-cyan-800 disabled:opacity-60 text-white rounded-md transition-colors"
              >
                {rfqSubmitting ? 'Submitting Request...' : 'Submit Inquiry to Quotations Desk'}
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* QUIET FOOTER */}
      <footer className="border-t border-slate-200 dark:border-slate-800 py-8 px-6 max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
        <div>© 2026 Helios Analytical GmbH · Scientific Laboratory Instrumentation</div>
        <div className="flex items-center gap-6">
          <a href="#products" className="hover:text-slate-900 dark:hover:text-white">Catalogue</a>
          <a href="#services" className="hover:text-slate-900 dark:hover:text-white">IQ/OQ Services</a>
          <button
            type="button"
            onClick={isAuthenticated ? onReturnToWorkspace : onOpenStaffLogin}
            className="hover:text-slate-900 dark:hover:text-white font-medium"
          >
            {isAuthenticated ? 'Management Workspace' : 'Internal Staff Login'}
          </button>
        </div>
      </footer>

      {/* PRODUCT DETAIL MODAL */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs font-mono text-slate-500 dark:text-slate-400">
                  {selectedProduct.modelNumber} · {selectedProduct.manufacturer}
                </div>
                <h3 className="text-xl font-display font-bold mt-1">{selectedProduct.name}</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedProduct(null)}
                className="p-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="aspect-[4/3] rounded-md overflow-hidden border border-slate-200 dark:border-slate-800">
                <ResilientImage
                  src={selectedProduct.imageUrl}
                  alt={selectedProduct.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="text-sm space-y-2.5">
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">{selectedProduct.description}</p>
                <div className="font-mono font-bold text-lg tabular-nums">
                  ${selectedProduct.sellingPrice.toLocaleString()}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Warranty: {selectedProduct.warranty} · Lead Time: {selectedProduct.leadTimeDays} days
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-300">
                  Certifications: {selectedProduct.regulatoryCerts.join(', ')}
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-mono uppercase tracking-wider text-slate-500 mb-2">
                Technical Specifications
              </h4>
              <div className="border border-slate-200 dark:border-slate-800 rounded-md divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                {Object.entries(selectedProduct.specs).map(([k, v]) => (
                  <div key={k} className="grid grid-cols-2 px-3 py-2">
                    <span className="font-medium text-slate-600 dark:text-slate-400">{k}</span>
                    <span className="font-mono text-slate-900 dark:text-slate-100">{v}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <div className="font-semibold mb-1">Installation Requirements</div>
                <p className="text-slate-600 dark:text-slate-400">{selectedProduct.installationReqs}</p>
              </div>
              <div>
                <div className="font-semibold mb-1">Maintenance Requirements</div>
                <p className="text-slate-600 dark:text-slate-400">{selectedProduct.maintenanceReqs}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => exportProductDatasheetPDF(selectedProduct)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium border border-slate-300 dark:border-slate-700 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <FileText className="w-4 h-4" /> Download Datasheet PDF
              </button>
              <button
                type="button"
                onClick={() => {
                  const prod = selectedProduct;
                  setSelectedProduct(null);
                  prefillRfqWithProduct(prod);
                }}
                className="px-4 py-2 text-xs font-semibold bg-cyan-700 text-white rounded-md hover:bg-cyan-800"
              >
                Request Formal Quotation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SIDE-BY-SIDE COMPARISON DRAWER */}
      {showCompareDrawer && compareProducts.length > 0 && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-lg font-display font-bold">Instrument Comparison</h3>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setCompareIds([]);
                    setShowCompareDrawer(false);
                  }}
                  className="text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white"
                >
                  Clear All
                </button>
                <button
                  type="button"
                  onClick={() => setShowCompareDrawer(false)}
                  className="p-1 text-slate-500 hover:text-slate-900 dark:hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <table className="w-full text-xs mt-4 border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800">
                  <th className="text-left py-2.5 pr-4 font-semibold text-slate-500 w-40">Parameter</th>
                  {compareProducts.map((p) => (
                    <th key={p.id} className="text-left py-2.5 px-3 font-display font-semibold text-sm">
                      {p.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                <tr>
                  <td className="py-2.5 pr-4 text-slate-500">Manufacturer / Model</td>
                  {compareProducts.map((p) => (
                    <td key={p.id} className="py-2.5 px-3 font-mono">
                      {p.manufacturer} · {p.modelNumber}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 text-slate-500">List Price</td>
                  {compareProducts.map((p) => (
                    <td key={p.id} className="py-2.5 px-3 font-mono font-semibold tabular-nums">
                      ${p.sellingPrice.toLocaleString()}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 text-slate-500">Lead Time / Stock</td>
                  {compareProducts.map((p) => (
                    <td key={p.id} className="py-2.5 px-3">
                      {p.stockStatus} ({p.leadTimeDays} days)
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 text-slate-500">Warranty</td>
                  {compareProducts.map((p) => (
                    <td key={p.id} className="py-2.5 px-3">{p.warranty}</td>
                  ))}
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 text-slate-500">Key Specs</td>
                  {compareProducts.map((p) => (
                    <td key={p.id} className="py-2.5 px-3 space-y-1">
                      {Object.entries(p.specs).map(([k, v]) => (
                        <div key={k}>
                          <span className="text-slate-500">{k}:</span>{' '}
                          <span className="font-mono">{v}</span>
                        </div>
                      ))}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 text-slate-500">Actions</td>
                  {compareProducts.map((p) => (
                    <td key={p.id} className="py-3 px-3">
                      <button
                        type="button"
                        onClick={() => {
                          setShowCompareDrawer(false);
                          prefillRfqWithProduct(p);
                        }}
                        className="px-3 py-1.5 bg-cyan-700 text-white rounded-md font-semibold"
                      >
                        Quote This Model
                      </button>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* WHATSAPP INQUIRY MODAL */}
      {showWhatsAppBox && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-display font-semibold">
                <MessageCircle className="w-4 h-4 text-emerald-600" />
                WhatsApp Scientific Sales Desk
              </div>
              <button type="button" onClick={() => setShowWhatsAppBox(false)}>
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Send an immediate instrument availability or quotation inquiry to our regional specialists (+49 69 5550 8100).
            </p>
            <textarea
              rows={3}
              value={waMessage}
              onChange={(e) => setWaMessage(e.target.value)}
              className="w-full p-2.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md"
            />
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={async () => {
                  await apiFetch('/api/public/inquiries', {
                    method: 'POST',
                    body: JSON.stringify({
                      type: 'WhatsApp',
                      institutionName: 'WhatsApp Direct Prospect',
                      contactName: 'Website Visitor',
                      email: 'whatsapp-inquiry@pending.verify',
                      productInterest: 'WhatsApp Inquiry',
                      message: waMessage,
                    }),
                  }).catch(() => {});
                  setShowWhatsAppBox(false);
                }}
                className="px-3 py-2 text-xs font-medium border border-slate-300 dark:border-slate-700 rounded-md"
              >
                Log Inquiry Here
              </button>
              <a
                href={`https://wa.me/496955508100?text=${encodeURIComponent(waMessage)}`}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white rounded-md"
              >
                Open WhatsApp Chat
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
