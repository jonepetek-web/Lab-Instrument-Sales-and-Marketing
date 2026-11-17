import { Calendar, CheckCircle2, Globe, Lock, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import type {
  MarketingApprovalStatus,
  MarketingCampaign,
  MarketingChannel,
  Product,
  UserAccount,
} from '../types/platform.ts';
import { apiFetch } from '../utils/api.ts';

const FORMATS = [
  'LinkedIn Technical Post',
  'Facebook Laboratory Update',
  'Instagram Visual Caption',
  'Professional Email Campaign',
  'Product Launch Advertisement',
  'SEO Website Product Copy',
  'Scientific Application Article',
  'Marketing Slogans & Headlines',
];

export function MarketingView({ currentUser }: { currentUser: UserAccount }) {
  const [tab, setTab] = useState<'campaigns' | 'ai_studio' | 'calendar'>('campaigns');
  const [campaigns, setCampaigns] = useState<MarketingCampaign[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState<string | null>(null);

  // AI Studio state
  const [format, setFormat] = useState(FORMATS[0]);
  const [channel, setChannel] = useState<MarketingChannel>('LinkedIn');
  const [topic, setTopic] = useState('Sub-ppb PFAS & Nitrosamine Analytical Workflow');
  const [targetAudience, setTargetAudience] = useState('Pharmaceutical QA/QC & Environmental Lab Directors');
  const [productId, setProductId] = useState('');
  const [scheduledDate, setScheduledDate] = useState('2026-12-02');
  const [generating, setGenerating] = useState(false);
  const [aiDraft, setAiDraft] = useState<{
    contentTitle: string;
    contentBody: string;
    slogans: string[];
    seoKeywords: string[];
    suggestedCta: string;
    complianceCheckNote: string;
  } | null>(null);

  const canApprove = ['admin', 'sales_manager', 'marketing'].includes(currentUser.role);

  async function loadAll() {
    const [cmps, prods] = await Promise.all([
      apiFetch<MarketingCampaign[]>('/api/marketing'),
      apiFetch<Product[]>('/api/products'),
    ]);
    setCampaigns(cmps);
    setProducts(prods);
    if (prods[0] && !productId) setProductId(prods[0].id);
  }

  useEffect(() => {
    loadAll();
  }, []);

  async function handleGenerateContent(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setGenerating(true);
    try {
      const res = await apiFetch<typeof aiDraft>('/api/ai/marketing', {
        method: 'POST',
        body: JSON.stringify({ format, topic, targetAudience, productId }),
      });
      setAiDraft(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'AI content generation failed.');
    } finally {
      setGenerating(false);
    }
  }

  async function saveDraftToCampaigns() {
    if (!aiDraft) return;
    await apiFetch('/api/marketing', {
      method: 'POST',
      body: JSON.stringify({
        name: `${format}: ${topic}`,
        channel,
        campaignType: format,
        contentTitle: aiDraft.contentTitle,
        contentBody: aiDraft.contentBody,
        targetAudience,
        scheduledDate,
        cost: 1800,
      }),
    });
    setAiDraft(null);
    setTab('campaigns');
    loadAll();
  }

  async function updateCampaignStatus(id: string, status: MarketingApprovalStatus) {
    setError(null);
    try {
      const updated = await apiFetch<MarketingCampaign>(`/api/marketing/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      setCampaigns((prev) => prev.map((c) => (c.id === id ? updated : c)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update campaign status.');
    }
  }

  const totalReach = campaigns.reduce((s, c) => s + c.reach, 0);
  const totalLeads = campaigns.reduce((s, c) => s + c.leadsGenerated, 0);
  const totalCost = campaigns.reduce((s, c) => s + c.cost, 0);
  const totalRev = campaigns.reduce((s, c) => s + c.revenueAttributed, 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold">Digital Marketing & AI Content Studio</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Multi-channel campaign analytics, monthly calendar, AI content drafting, and mandatory human approval before publishing.
          </p>
        </div>

        <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-md">
          {(
            [
              { id: 'campaigns', label: 'Campaigns & ROI' },
              { id: 'ai_studio', label: 'AI Content Studio' },
              { id: 'calendar', label: 'Monthly Calendar' },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                tab === t.id
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Marketing Metrics Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg">
          <div className="text-xs text-slate-500">Total Campaign Reach</div>
          <div className="text-xl font-mono font-bold tabular-nums mt-1">{totalReach.toLocaleString()}</div>
        </div>
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg">
          <div className="text-xs text-slate-500">Marketing Leads Generated</div>
          <div className="text-xl font-mono font-bold tabular-nums mt-1">{totalLeads}</div>
        </div>
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg">
          <div className="text-xs text-slate-500">Total Spend</div>
          <div className="text-xl font-mono font-bold tabular-nums mt-1">${totalCost.toLocaleString()}</div>
        </div>
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg">
          <div className="text-xs text-slate-500">Attributed Revenue</div>
          <div className="text-xl font-mono font-bold tabular-nums text-emerald-700 dark:text-emerald-400 mt-1">
            ${totalRev.toLocaleString()}
          </div>
        </div>
      </div>

      {error && (
        <div className="p-3 text-xs bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 rounded-md">
          {error}
        </div>
      )}

      {tab === 'campaigns' && (
        <div className="space-y-4">
          {campaigns.map((cmp) => (
            <div
              key={cmp.id}
              className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg space-y-3"
            >
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                <div>
                  <div className="text-xs text-slate-500 flex items-center gap-2">
                    <span className="font-semibold text-cyan-700 dark:text-cyan-400">{cmp.channel}</span>
                    <span aria-hidden="true">·</span>
                    <span>{cmp.campaignType}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono">Scheduled: {cmp.scheduledDate}</span>
                  </div>
                  <h3 className="text-base font-display font-bold mt-1">{cmp.name}</h3>
                  <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 mt-1">
                    {cmp.contentTitle}
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 max-w-3xl leading-relaxed">
                    {cmp.contentBody}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <span
                    className={`text-xs font-medium ${
                      cmp.status === 'Published'
                        ? 'text-emerald-700 dark:text-emerald-400'
                        : cmp.status === 'Approved'
                        ? 'text-cyan-700 dark:text-cyan-400'
                        : 'text-amber-700 dark:text-amber-400'
                    }`}
                  >
                    ● {cmp.status}
                  </span>

                  {cmp.status === 'Draft' && (
                    <button
                      type="button"
                      onClick={() => updateCampaignStatus(cmp.id, 'Pending Approval')}
                      className="px-3 py-1.5 text-xs border border-slate-200 dark:border-slate-700 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      Submit for Human Review
                    </button>
                  )}

                  {(cmp.status === 'Draft' || cmp.status === 'Pending Approval') && canApprove && (
                    <button
                      type="button"
                      onClick={() => updateCampaignStatus(cmp.id, 'Approved')}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-cyan-700 text-white rounded-md hover:bg-cyan-800"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> Approve Content
                    </button>
                  )}

                  {cmp.status === 'Approved' ? (
                    <button
                      type="button"
                      onClick={() => updateCampaignStatus(cmp.id, 'Published')}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-emerald-700 text-white rounded-md hover:bg-emerald-800"
                    >
                      <Globe className="w-3.5 h-3.5" /> Publish Now
                    </button>
                  ) : cmp.status !== 'Published' ? (
                    <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
                      <Lock className="w-3 h-3" /> Approval required to publish
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-3 sm:grid-cols-7 gap-3 text-xs font-mono tabular-nums">
                <div>
                  <div className="text-[10px] text-slate-400">REACH</div>
                  <div>{cmp.reach.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400">IMPRESSIONS</div>
                  <div>{cmp.impressions.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400">CLICKS</div>
                  <div>{cmp.clicks.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400">LEADS</div>
                  <div>{cmp.leadsGenerated}</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400">CONV RATE</div>
                  <div>{cmp.conversionRate}%</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400">COST</div>
                  <div>${cmp.cost.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400">ROI</div>
                  <div className="text-emerald-700 dark:text-emerald-400">{cmp.roi}%</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'ai_studio' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <form
            onSubmit={handleGenerateContent}
            className="lg:col-span-5 p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg space-y-3.5 text-xs"
          >
            <div className="text-sm font-display font-semibold">AI Scientific Marketing Generator</div>
            <div>
              <label className="block font-medium mb-1">Content Format</label>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md"
              >
                {FORMATS.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-medium mb-1">Channel</label>
                <select
                  value={channel}
                  onChange={(e) => setChannel(e.target.value as MarketingChannel)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md"
                >
                  {(['LinkedIn', 'Email', 'Webinar', 'Conference', 'Facebook', 'Instagram', 'SEO Content'] as const).map(
                    (c) => <option key={c} value={c}>{c}</option>
                  )}
                </select>
              </div>
              <div>
                <label className="block font-medium mb-1">Scheduled Date</label>
                <input
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md font-mono"
                />
              </div>
            </div>
            <div>
              <label className="block font-medium mb-1">Featured Instrument</label>
              <select
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md"
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-medium mb-1">Topic / Scientific Angle</label>
              <input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md"
              />
            </div>
            <div>
              <label className="block font-medium mb-1">Target Audience</label>
              <input
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md"
              />
            </div>
            <button
              type="submit"
              disabled={generating}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-cyan-700 hover:bg-cyan-800 text-white font-semibold rounded-md disabled:opacity-60"
            >
              <Sparkles className="w-4 h-4" />
              {generating ? 'Drafting Scientific Content...' : 'Generate Campaign Draft'}
            </button>
          </form>

          <div className="lg:col-span-7 p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg space-y-4">
            {!aiDraft && !generating && (
              <div className="py-16 text-center text-xs text-slate-500">
                Configure your format, featured instrument, and scientific topic to generate an AI-assisted marketing draft for human review.
              </div>
            )}
            {generating && (
              <div className="py-16 text-center text-xs text-slate-500 animate-pulse">
                Generating verified technical copy and SEO keywords...
              </div>
            )}
            {aiDraft && !generating && (
              <div className="space-y-4 text-xs">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                  <span className="font-semibold text-amber-700 dark:text-amber-400">
                    Draft Status · Human Approval Required Before Publishing
                  </span>
                  <button
                    type="button"
                    onClick={saveDraftToCampaigns}
                    className="px-3 py-1.5 bg-cyan-700 text-white font-semibold rounded-md"
                  >
                    Save Draft to Approval Queue
                  </button>
                </div>

                <div>
                  <div className="text-slate-400 text-[11px]">HEADLINE</div>
                  <h3 className="text-base font-display font-bold mt-0.5">{aiDraft.contentTitle}</h3>
                </div>

                <div>
                  <div className="text-slate-400 text-[11px] mb-1">BODY COPY</div>
                  <pre className="whitespace-pre-wrap font-sans text-xs sm:text-sm leading-relaxed text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-950 p-4 rounded-md border border-slate-200 dark:border-slate-800">
                    {aiDraft.contentBody}
                  </pre>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <div className="font-semibold mb-1">Slogans</div>
                    <ul className="list-disc pl-4 space-y-1 text-slate-600 dark:text-slate-400">
                      {aiDraft.slogans.map((s, i) => <li key={i}>{s}</li>)}
                    </ul>
                  </div>
                  <div>
                    <div className="font-semibold mb-1">SEO Keywords & CTA</div>
                    <div className="text-slate-600 dark:text-slate-400">{aiDraft.seoKeywords.join(' · ')}</div>
                    <div className="mt-2 font-medium text-cyan-700 dark:text-cyan-400">
                      CTA: {aiDraft.suggestedCta}
                    </div>
                  </div>
                </div>
                <div className="text-[11px] text-slate-500">{aiDraft.complianceCheckNote}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'calendar' && (
        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg space-y-4">
          <div className="flex items-center gap-2 text-sm font-display font-semibold">
            <Calendar className="w-4 h-4 text-cyan-700 dark:text-cyan-400" />
            Monthly Marketing & Exhibition Schedule (November – December 2026)
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {campaigns
              .slice()
              .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate))
              .map((cmp) => (
                <div
                  key={cmp.id}
                  className="p-3.5 border border-slate-200 dark:border-slate-800 rounded-md bg-slate-50 dark:bg-slate-950/60 space-y-1.5 text-xs"
                >
                  <div className="font-mono font-semibold text-cyan-700 dark:text-cyan-400">
                    {cmp.scheduledDate}
                  </div>
                  <div className="font-semibold text-slate-900 dark:text-white">{cmp.name}</div>
                  <div className="text-slate-500">
                    {cmp.channel} · {cmp.status}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
