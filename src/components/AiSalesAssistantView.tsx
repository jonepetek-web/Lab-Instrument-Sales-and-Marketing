import { Copy, Send, ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { Customer, Product } from '../types/platform.ts';
import { apiFetch } from '../utils/api.ts';

const MODES = [
  'Recommend Instruments',
  'Compare Models',
  'Explain Technical Specs',
  'Prepare Sales Proposal',
  'Draft Outreach Email',
  'Prepare Follow-Up Message',
  'Cross-Sell & Upsell Ideas',
  'Objection Handling',
  'Meeting Preparation Brief',
] as const;

export function AiSalesAssistantView() {
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [mode, setMode] = useState<string>(MODES[0]);
  const [customerId, setCustomerId] = useState<string>('');
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [query, setQuery] = useState(
    'Recommend the optimal chromatography and mass spectrometry setup for trace nitrosamine quantitation in pharmaceutical QC, including utility requirements and cross-sell consumables.'
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reply, setReply] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    Promise.all([
      apiFetch<Product[]>('/api/products'),
      apiFetch<Customer[]>('/api/customers'),
    ]).then(([prods, custs]) => {
      setProducts(prods);
      setCustomers(custs);
    });
  }, []);

  function toggleProduct(id: string) {
    setSelectedProductIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  async function handleAsk(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setError(null);
    setLoading(true);
    try {
      const res = await apiFetch<{ reply: string; groundedProductCount: number }>(
        '/api/ai/sales-assistant',
        {
          method: 'POST',
          body: JSON.stringify({
            mode,
            query,
            customerId: customerId || undefined,
            selectedProductIds,
          }),
        }
      );
      setReply(res.reply);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'AI Sales Assistant failed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-display font-bold">AI Scientific Sales Assistant</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Grounded exclusively on your verified product catalogue, datasheets, and CRM customer profiles — never fabricates unverified technical claims.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Controls Column */}
        <form
          onSubmit={handleAsk}
          className="lg:col-span-5 p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg space-y-4 text-xs"
        >
          <div>
            <label className="block font-semibold mb-1.5">Commercial Workflow Mode</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {MODES.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={`text-left px-2.5 py-2 rounded-md border transition-colors ${
                    mode === m
                      ? 'bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900 dark:border-white font-semibold'
                      : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block font-semibold mb-1">Target Customer Context (Optional)</label>
            <select
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md"
            >
              <option value="">General Inquiry (No Specific Customer)</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.institutionName} ({c.type})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold mb-1">
              Focus Instruments ({selectedProductIds.length || 'All Catalogue'})
            </label>
            <div className="max-h-40 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-md p-2 space-y-1 bg-slate-50 dark:bg-slate-950">
              {products.map((p) => (
                <label key={p.id} className="flex items-center gap-2 cursor-pointer py-0.5">
                  <input
                    type="checkbox"
                    checked={selectedProductIds.includes(p.id)}
                    onChange={() => toggleProduct(p.id)}
                  />
                  <span className="truncate">{p.name}</span>
                  <span className="font-mono text-[10px] text-slate-400 ml-auto shrink-0">
                    {p.modelNumber}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block font-semibold mb-1">Prompt / Customer Requirement</label>
            <textarea
              rows={4}
              required
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-xs"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-cyan-700 hover:bg-cyan-800 disabled:opacity-60 text-white font-semibold rounded-md"
          >
            <Send className="w-3.5 h-3.5" />
            {loading ? 'Analyzing Catalogue & Drafting...' : `Run ${mode}`}
          </button>
        </form>

        {/* Output Panel */}
        <div className="lg:col-span-7 p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg flex flex-col justify-between gap-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                <ShieldCheck className="w-4 h-4" />
                Verified Catalogue Grounding Active ({products.length} instruments loaded)
              </div>
              {reply && (
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(reply);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1800);
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs border border-slate-200 dark:border-slate-700 rounded hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  <Copy className="w-3.5 h-3.5" /> {copied ? 'Copied' : 'Copy'}
                </button>
              )}
            </div>

            {error && (
              <div className="p-3 text-xs bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 rounded-md">
                {error}
              </div>
            )}

            {!reply && !loading && !error && (
              <div className="py-16 text-center text-xs text-slate-500">
                Select a commercial mode, optionally bind a customer account or focus instruments, and click Run to generate a grounded scientific sales brief.
              </div>
            )}

            {loading && (
              <div className="py-16 text-center text-xs text-slate-500 animate-pulse">
                Synthesizing verified technical specifications and commercial positioning...
              </div>
            )}

            {reply && !loading && (
              <pre className="whitespace-pre-wrap font-sans text-xs sm:text-sm leading-relaxed text-slate-800 dark:text-slate-200 overflow-x-auto">
                {reply}
              </pre>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
