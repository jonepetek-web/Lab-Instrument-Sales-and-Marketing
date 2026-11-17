import { Download, FileSpreadsheet, FileText } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import {
  PIPELINE_STAGES,
  type DeliveryRecord,
  type HistoricalSalesPoint,
  type InstallationRecord,
  type MarketingCampaign,
  type Opportunity,
  type OutstandingInvoice,
  type ServiceRequest,
} from '../types/platform.ts';
import { apiFetch } from '../utils/api.ts';
import { exportAnalyticsPDF, exportToCSV, exportToExcel } from '../utils/exporters.ts';

interface DashboardData {
  range: string;
  kpis: {
    totalRevenue: number;
    totalTarget: number;
    monthlyRevenue: number;
    monthlyTarget: number;
    annualRevenue: number;
    totalQuotations: number;
    pendingQuotations: number;
    wonCount: number;
    lostCount: number;
    newLeadsCount: number;
    activeCustomers: number;
    pipelineValue: number;
    weightedPipeline: number;
    outstandingPayments: number;
    openPurchaseOrders: number;
    lowStockProducts: number;
    totalSkus: number;
    upcomingDeliveries: number;
    pendingInstallations: number;
    openServiceTickets: number;
  };
  historicalSales: HistoricalSalesPoint[];
  opportunities: Opportunity[];
  salesRepStats: {
    id: string;
    name: string;
    territory: string;
    wonRevenue: number;
    activePipeline: number;
    dealsCount: number;
  }[];
  topInstruments: {
    id: string;
    name: string;
    modelNumber: string;
    category: string;
    unitsSold: number;
    revenue: number;
  }[];
  campaigns: MarketingCampaign[];
  deliveries: DeliveryRecord[];
  installations: InstallationRecord[];
  serviceRequests: ServiceRequest[];
  outstandingInvoices: OutstandingInvoice[];
  publicInquiriesCount: number;
}

export function DashboardView({ onNavigate }: { onNavigate: (tab: string) => void }) {
  const [range, setRange] = useState<'30D' | '90D' | 'YTD' | '12M'>('12M');
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  useEffect(() => {
    setLoading(true);
    apiFetch<DashboardData>(`/api/dashboard?range=${range}`)
      .then((res) => {
        setData(res);
        setError(null);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load dashboard.'))
      .finally(() => setLoading(false));
  }, [range]);

  const stageSummary = useMemo(() => {
    if (!data) return [];
    return PIPELINE_STAGES.map((stage) => {
      const items = data.opportunities.filter((o) => o.stage === stage);
      return {
        stage,
        count: items.length,
        value: items.reduce((s, o) => s + o.value, 0),
      };
    });
  }, [data]);

  const maxPipelineStageVal = useMemo(
    () => Math.max(1, ...stageSummary.map((s) => s.value)),
    [stageSummary]
  );

  if (loading && !data) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
            <div key={n} className="h-24 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-lg text-sm text-rose-700 dark:text-rose-300">
        {error || 'Unable to load dashboard telemetry.'}
      </div>
    );
  }

  const { kpis } = data;
  const targetAchievement = kpis.totalTarget > 0 ? Math.round((kpis.totalRevenue / kpis.totalTarget) * 100) : 0;

  // SVG Chart dimensions
  const chartW = 680;
  const chartH = 220;
  const padX = 48;
  const padY = 20;
  const maxRev = Math.max(
    1,
    ...data.historicalSales.flatMap((m) => [m.actualRevenue, m.targetRevenue])
  );
  const pointsCount = data.historicalSales.length;

  function xPos(idx: number) {
    if (pointsCount <= 1) return padX + (chartW - padX * 2) / 2;
    return padX + (idx / (pointsCount - 1)) * (chartW - padX * 2);
  }
  function yPos(val: number) {
    return chartH - padY - (val / maxRev) * (chartH - padY * 2);
  }

  const actualPath = data.historicalSales
    .map((m, i) => `${i === 0 ? 'M' : 'L'} ${xPos(i).toFixed(1)} ${yPos(m.actualRevenue).toFixed(1)}`)
    .join(' ');
  const targetPath = data.historicalSales
    .map((m, i) => `${i === 0 ? 'M' : 'L'} ${xPos(i).toFixed(1)} ${yPos(m.targetRevenue).toFixed(1)}`)
    .join(' ');

  function handleExportExcel() {
    if (!data) return;
    exportToExcel(`Helios_Executive_Report_${range}`, [
      {
        name: 'Monthly Revenue',
        rows: data.historicalSales.map((m) => ({
          Month: m.month,
          Actual_USD: m.actualRevenue,
          Target_USD: m.targetRevenue,
          Quotations: m.quotationsCount,
          Orders_Won: m.ordersWon,
        })),
      },
      {
        name: 'Salesperson Performance',
        rows: data.salesRepStats.map((r) => ({
          Salesperson: r.name,
          Territory: r.territory,
          Won_Revenue_USD: r.wonRevenue,
          Active_Pipeline_USD: r.activePipeline,
          Deals: r.dealsCount,
        })),
      },
    ]);
  }

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-slate-900 dark:text-white">
            Executive Commercial & Operations Dashboard
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Consolidated sales revenue, quotations, CRM pipeline, procurement, logistics, and service telemetry.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-md">
            {(['30D', '90D', 'YTD', '12M'] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRange(r)}
                className={`px-3 py-1 text-xs font-mono font-medium rounded transition-colors ${
                  range === r
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {r}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() =>
              exportToCSV(
                `helios_sales_${range}`,
                data.historicalSales.map((m) => ({ ...m }))
              )
            }
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800 whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" /> CSV
          </button>
          <button
            type="button"
            onClick={handleExportExcel}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800 whitespace-nowrap"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" /> Excel
          </button>
          <button
            type="button"
            onClick={() =>
              exportAnalyticsPDF(
                'Executive Sales Report',
                `Period: ${range}`,
                ['Month', 'Actual Revenue', 'Target Revenue', 'Quotations', 'Orders Won'],
                data.historicalSales.map((m) => [
                  m.month,
                  `$${m.actualRevenue.toLocaleString()}`,
                  `$${m.targetRevenue.toLocaleString()}`,
                  m.quotationsCount,
                  m.ordersWon,
                ])
              )
            }
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-900 text-white dark:bg-white dark:text-slate-900 rounded-md hover:bg-slate-800 dark:hover:bg-slate-200 whitespace-nowrap"
          >
            <FileText className="w-3.5 h-3.5" /> PDF
          </button>
        </div>
      </div>

      {/* Primary KPI Grid (All 18 Dashboard Metrics Covered) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg">
          <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
            Total Sales ({range})
          </div>
          <div className="text-xl font-mono font-bold tabular-nums mt-1">
            ${(kpis.totalRevenue / 1000000).toFixed(2)}M
          </div>
          <div className="text-[11px] font-mono text-emerald-700 dark:text-emerald-400 mt-1">
            {targetAchievement}% of ${(kpis.totalTarget / 1000000).toFixed(2)}M target
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg">
          <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
            Monthly / Annual Actual
          </div>
          <div className="text-xl font-mono font-bold tabular-nums mt-1">
            ${(kpis.monthlyRevenue / 1000).toFixed(0)}k
          </div>
          <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 mt-1">
            YTD: ${(kpis.annualRevenue / 1000000).toFixed(2)}M
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg">
          <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
            Quotations (Total / Pending)
          </div>
          <div className="text-xl font-mono font-bold tabular-nums mt-1">
            {kpis.totalQuotations} <span className="text-sm font-normal text-slate-400">/ {kpis.pendingQuotations}</span>
          </div>
          <div className="text-[11px] text-cyan-700 dark:text-cyan-400 mt-1 cursor-pointer hover:underline" onClick={() => onNavigate('quotations')}>
            Open Quotation Desk →
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg">
          <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
            Won vs Lost Deals
          </div>
          <div className="text-xl font-mono font-bold tabular-nums mt-1">
            {kpis.wonCount} <span className="text-sm font-normal text-slate-400">/ {kpis.lostCount}</span>
          </div>
          <div className="text-[11px] font-mono text-emerald-700 dark:text-emerald-400 mt-1">
            {Math.round((kpis.wonCount / Math.max(1, kpis.wonCount + kpis.lostCount)) * 100)}% Win Rate
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg">
          <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
            Active Pipeline (Weighted)
          </div>
          <div className="text-xl font-mono font-bold tabular-nums mt-1">
            ${(kpis.pipelineValue / 1000).toFixed(0)}k
          </div>
          <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 mt-1">
            Wtd: ${(kpis.weightedPipeline / 1000).toFixed(0)}k · {kpis.newLeadsCount} New Leads
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg">
          <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
            Receivables & POs
          </div>
          <div className="text-xl font-mono font-bold tabular-nums mt-1">
            ${(kpis.outstandingPayments / 1000).toFixed(0)}k
          </div>
          <div className="text-[11px] font-mono text-amber-700 dark:text-amber-400 mt-1">
            {kpis.openPurchaseOrders} Open POs · {kpis.activeCustomers} Active Accounts
          </div>
        </div>
      </div>

      {/* Operations Quick Status Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <button
          type="button"
          onClick={() => onNavigate('products')}
          className="text-left p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
        >
          <div className="text-xs text-slate-500 dark:text-slate-400">Inventory Status</div>
          <div className="text-base font-mono font-semibold tabular-nums mt-0.5">
            {kpis.totalSkus} SKUs · <span className="text-amber-700 dark:text-amber-400">{kpis.lowStockProducts} Low Stock</span>
          </div>
        </button>
        <button
          type="button"
          onClick={() => onNavigate('operations')}
          className="text-left p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
        >
          <div className="text-xs text-slate-500 dark:text-slate-400">Upcoming Deliveries</div>
          <div className="text-base font-mono font-semibold tabular-nums mt-0.5">
            {kpis.upcomingDeliveries} Active Shipments
          </div>
        </button>
        <button
          type="button"
          onClick={() => onNavigate('operations')}
          className="text-left p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
        >
          <div className="text-xs text-slate-500 dark:text-slate-400">Pending Installations</div>
          <div className="text-base font-mono font-semibold tabular-nums mt-0.5">
            {kpis.pendingInstallations} IQ/OQ Sites Queued
          </div>
        </button>
        <button
          type="button"
          onClick={() => onNavigate('operations')}
          className="text-left p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
        >
          <div className="text-xs text-slate-500 dark:text-slate-400">Service & Maintenance</div>
          <div className="text-base font-mono font-semibold tabular-nums mt-0.5">
            {kpis.openServiceTickets} Open Service Tickets
          </div>
        </button>
      </div>

      {/* Charts Row: Revenue vs Target & Pipeline Stages */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-display font-semibold">Sales Revenue vs Target</h2>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Solid Cyan: Actual Revenue · Dashed Slate: Commercial Target
              </div>
            </div>
            {hoverIdx !== null && data.historicalSales[hoverIdx] && (
              <div className="text-xs font-mono tabular-nums text-right">
                <div className="font-semibold">{data.historicalSales[hoverIdx].month}</div>
                <div className="text-cyan-700 dark:text-cyan-400">
                  Actual: ${data.historicalSales[hoverIdx].actualRevenue.toLocaleString()}
                </div>
                <div className="text-slate-500">
                  Target: ${data.historicalSales[hoverIdx].targetRevenue.toLocaleString()}
                </div>
              </div>
            )}
          </div>

          <div className="w-full overflow-x-auto">
            <svg viewBox={`0 0 ${chartW} ${chartH}`} className="w-full h-56 select-none">
              {[0.25, 0.5, 0.75, 1].map((f) => {
                const y = yPos(maxRev * f);
                return (
                  <g key={f}>
                    <line
                      x1={padX}
                      x2={chartW - padX}
                      y1={y}
                      y2={y}
                      className="stroke-slate-200 dark:stroke-slate-800"
                      strokeDasharray="2 3"
                    />
                    <text
                      x={padX - 6}
                      y={y + 3}
                      textAnchor="end"
                      className="fill-slate-400 text-[9px] font-mono"
                    >
                      ${Math.round((maxRev * f) / 1000)}k
                    </text>
                  </g>
                );
              })}

              <path
                d={targetPath}
                fill="none"
                className="stroke-slate-400 dark:stroke-slate-500"
                strokeWidth={1.75}
                strokeDasharray="5 4"
              />
              <path
                d={actualPath}
                fill="none"
                className="stroke-cyan-600 dark:stroke-cyan-400"
                strokeWidth={2.5}
              />

              {data.historicalSales.map((m, i) => (
                <g key={m.month}>
                  <circle
                    cx={xPos(i)}
                    cy={yPos(m.actualRevenue)}
                    r={hoverIdx === i ? 5 : 3.5}
                    className="fill-cyan-600 dark:fill-cyan-400 cursor-pointer"
                    onMouseEnter={() => setHoverIdx(i)}
                    onMouseLeave={() => setHoverIdx(null)}
                  />
                  <text
                    x={xPos(i)}
                    y={chartH - 4}
                    textAnchor="middle"
                    className="fill-slate-400 text-[9px] font-mono"
                  >
                    {m.month.slice(5)}
                  </text>
                </g>
              ))}
            </svg>
          </div>
        </div>

        <div className="lg:col-span-5 p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-display font-semibold">10-Stage Sales Pipeline</h2>
            <button
              type="button"
              onClick={() => onNavigate('crm')}
              className="text-xs text-cyan-700 dark:text-cyan-400 hover:underline"
            >
              Manage Pipeline →
            </button>
          </div>
          <div className="space-y-2">
            {stageSummary.map((st) => (
              <div key={st.stage} className="text-xs">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-slate-700 dark:text-slate-300 truncate max-w-[190px]">
                    {st.stage} ({st.count})
                  </span>
                  <span className="font-mono tabular-nums text-slate-600 dark:text-slate-400">
                    ${st.value.toLocaleString()}
                  </span>
                </div>
                <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      st.stage === 'Won'
                        ? 'bg-emerald-600'
                        : st.stage === 'Lost'
                        ? 'bg-rose-500'
                        : 'bg-cyan-600'
                    }`}
                    style={{ width: `${Math.max(st.value > 0 ? 4 : 0, (st.value / maxPipelineStageVal) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Analytical Tables: Salesperson Performance, Top Instruments, Campaign Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg">
          <h2 className="text-sm font-display font-semibold mb-3">Salesperson Performance</h2>
          <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
            {data.salesRepStats.map((rep) => (
              <div key={rep.id} className="py-2.5 flex items-center justify-between gap-3">
                <div>
                  <div className="font-semibold text-slate-900 dark:text-white">{rep.name}</div>
                  <div className="text-slate-500 dark:text-slate-400">{rep.territory} · {rep.dealsCount} deals</div>
                </div>
                <div className="text-right font-mono tabular-nums">
                  <div className="font-semibold text-emerald-700 dark:text-emerald-400">
                    ${(rep.wonRevenue / 1000).toFixed(0)}k won
                  </div>
                  <div className="text-slate-500">${(rep.activePipeline / 1000).toFixed(0)}k pipe</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg">
          <h2 className="text-sm font-display font-semibold mb-3">Top-Selling Instruments</h2>
          <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
            {data.topInstruments.map((inst) => (
              <div key={inst.id} className="py-2.5 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-semibold text-slate-900 dark:text-white truncate">{inst.name}</div>
                  <div className="text-slate-500 dark:text-slate-400 font-mono">
                    {inst.modelNumber} · {inst.unitsSold} units
                  </div>
                </div>
                <div className="font-mono font-semibold tabular-nums shrink-0">
                  ${(inst.revenue / 1000).toFixed(0)}k
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-display font-semibold">Marketing Campaign ROI</h2>
            <button
              type="button"
              onClick={() => onNavigate('marketing')}
              className="text-xs text-cyan-700 dark:text-cyan-400 hover:underline"
            >
              View Campaigns →
            </button>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
            {data.campaigns.slice(0, 4).map((cmp) => (
              <div key={cmp.id} className="py-2.5 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-semibold text-slate-900 dark:text-white truncate">{cmp.name}</div>
                  <div className="text-slate-500 dark:text-slate-400">
                    {cmp.channel} · {cmp.leadsGenerated} leads · {cmp.status}
                  </div>
                </div>
                <div className="font-mono font-semibold tabular-nums text-cyan-700 dark:text-cyan-400 shrink-0">
                  {cmp.roi > 0 ? `${cmp.roi}% ROI` : 'Queued'}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Outstanding Invoices & Operational Queues */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg">
          <h2 className="text-sm font-display font-semibold mb-3">Outstanding Payments</h2>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500">
                <th className="text-left py-2">Invoice</th>
                <th className="text-left py-2">Customer</th>
                <th className="text-right py-2">Due Date</th>
                <th className="text-right py-2">Amount</th>
                <th className="text-right py-2">State</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {data.outstandingInvoices.map((inv) => (
                <tr key={inv.id}>
                  <td className="py-2 font-mono">{inv.invoiceNumber}</td>
                  <td className="py-2">{inv.customerName}</td>
                  <td className="py-2 text-right font-mono tabular-nums">{inv.dueDate}</td>
                  <td className="py-2 text-right font-mono font-semibold tabular-nums">
                    ${inv.amount.toLocaleString()}
                  </td>
                  <td
                    className={`py-2 text-right font-medium ${
                      inv.status === 'Overdue'
                        ? 'text-rose-600 dark:text-rose-400'
                        : inv.status === 'Due Soon'
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-emerald-600 dark:text-emerald-400'
                    }`}
                  >
                    {inv.status}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg">
          <h2 className="text-sm font-display font-semibold mb-3">Upcoming Deliveries & Field Installations</h2>
          <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
            {data.deliveries.slice(0, 2).map((d) => (
              <div key={d.id} className="py-2.5 flex items-center justify-between gap-2">
                <div>
                  <div className="font-semibold">{d.productName}</div>
                  <div className="text-slate-500">
                    Delivery · {d.customerName} · {d.serialNumber}
                  </div>
                </div>
                <div className="text-right font-mono tabular-nums">
                  <div>{d.scheduledDate}</div>
                  <div className="text-cyan-700 dark:text-cyan-400">{d.status}</div>
                </div>
              </div>
            ))}
            {data.installations.slice(0, 2).map((ins) => (
              <div key={ins.id} className="py-2.5 flex items-center justify-between gap-2">
                <div>
                  <div className="font-semibold">{ins.installNumber} · {ins.customerName}</div>
                  <div className="text-slate-500">
                    IQ/OQ Installation · Eng: {ins.assignedEngineer}
                  </div>
                </div>
                <div className="text-right font-mono tabular-nums">
                  <div>{ins.scheduledDate}</div>
                  <div className="text-amber-600 dark:text-amber-400">{ins.status}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
