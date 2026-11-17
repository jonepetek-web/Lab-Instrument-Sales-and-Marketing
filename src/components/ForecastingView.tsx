import { Download, FileText, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { HistoricalSalesPoint } from '../types/platform.ts';
import { apiFetch } from '../utils/api.ts';
import { exportAnalyticsPDF, exportToExcel } from '../utils/exporters.ts';

interface ForecastResult {
  methodologySummary: string;
  monthlyForecasts: {
    month: string;
    projectedRevenue: number;
    lowBand: number;
    highBand: number;
    confidenceNote: string;
  }[];
  quarterlyProjections: {
    quarter: string;
    projectedRevenue: number;
    growthPercent: number;
  }[];
  annualProjectionUsd: number;
  productDemandForecast: {
    category: string;
    expectedDemandTrend: string;
    projectedUnitsNextQuarter: number;
    driver: string;
  }[];
  customerSegmentation: {
    segment: string;
    sharePercent: number;
    avgDealSizeUsd: number;
    outlook: string;
  }[];
  growthRecommendations: string[];
}

export function ForecastingView() {
  const [historical, setHistorical] = useState<HistoricalSalesPoint[]>([]);
  const [forecast, setForecast] = useState<ForecastResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<{ allHistoricalSales: HistoricalSalesPoint[] }>('/api/dashboard?range=12M')
      .then((res) => setHistorical(res.allHistoricalSales))
      .catch(() => {});
  }, []);

  async function runForecast() {
    setError(null);
    setLoading(true);
    try {
      const res = await apiFetch<ForecastResult>('/api/ai/forecast', {
        method: 'POST',
      });
      setForecast(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'AI forecasting failed.');
    } finally {
      setLoading(false);
    }
  }

  // Combined SVG timeline (Historical Actuals = Solid, AI Estimates = Dashed)
  const histPoints = historical.slice(-8);
  const aiPoints = forecast?.monthlyForecasts.slice(0, 6) || [];
  const totalCols = histPoints.length + aiPoints.length;
  const maxVal = Math.max(
    1,
    ...histPoints.map((h) => h.actualRevenue),
    ...aiPoints.map((a) => a.highBand || a.projectedRevenue)
  );
  const w = 720;
  const h = 230;
  const padX = 52;
  const padY = 24;

  const getX = (idx: number) =>
    totalCols <= 1 ? padX + (w - padX * 2) / 2 : padX + (idx / (totalCols - 1)) * (w - padX * 2);
  const getY = (val: number) => h - padY - (val / maxVal) * (h - padY * 2);

  const histPath = histPoints
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${getX(i).toFixed(1)} ${getY(p.actualRevenue).toFixed(1)}`)
    .join(' ');

  const aiPath =
    histPoints.length > 0 && aiPoints.length > 0
      ? [
          `M ${getX(histPoints.length - 1).toFixed(1)} ${getY(histPoints[histPoints.length - 1].actualRevenue).toFixed(1)}`,
          ...aiPoints.map(
            (p, i) => `L ${getX(histPoints.length + i).toFixed(1)} ${getY(p.projectedRevenue).toFixed(1)}`
          ),
        ].join(' ')
      : '';

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold">AI Sales Forecasting & Business Intelligence</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Distinguishes verified historical actuals from AI-generated monthly, quarterly, and annual projections.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={loading}
            onClick={runForecast}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-cyan-700 hover:bg-cyan-800 disabled:opacity-60 text-white rounded-md"
          >
            <Sparkles className="w-3.5 h-3.5" />
            {loading ? 'Computing AI Forecast...' : 'Generate AI Revenue Forecast'}
          </button>

          {forecast && (
            <>
              <button
                type="button"
                onClick={() =>
                  exportToExcel('Helios_AI_Sales_Forecast', [
                    {
                      name: 'Historical Actuals',
                      rows: historical.map((m) => ({
                        Month: m.month,
                        Actual_USD: m.actualRevenue,
                        Data_Type: 'Historical Actual',
                      })),
                    },
                    {
                      name: 'AI Estimates',
                      rows: forecast.monthlyForecasts.map((f) => ({
                        Month: f.month,
                        Projected_USD: f.projectedRevenue,
                        Low_Band_USD: f.lowBand,
                        High_Band_USD: f.highBand,
                        Data_Type: 'AI-Generated Estimate',
                      })),
                    },
                  ])
                }
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md"
              >
                <Download className="w-3.5 h-3.5" /> Excel
              </button>
              <button
                type="button"
                onClick={() =>
                  exportAnalyticsPDF(
                    'AI Sales Forecast Report',
                    'Historical Actuals vs AI-Generated Estimates',
                    ['Month', 'Projected Revenue (AI Estimate)', 'Confidence Range', 'Notes'],
                    forecast.monthlyForecasts.map((f) => [
                      f.month,
                      `$${f.projectedRevenue.toLocaleString()}`,
                      `$${f.lowBand.toLocaleString()} – $${f.highBand.toLocaleString()}`,
                      f.confidenceNote,
                    ])
                  )
                }
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-slate-900 text-white dark:bg-white dark:text-slate-900 rounded-md"
              >
                <FileText className="w-3.5 h-3.5" /> PDF
              </button>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-md text-xs text-rose-700 dark:text-rose-300">
          {error}
        </div>
      )}

      {/* Dual Chart: Historical Actuals vs AI-Generated Estimates */}
      <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-display font-semibold">
              Revenue Trajectory: Historical Actuals vs AI-Generated Estimates
            </h2>
            <div className="text-xs text-slate-500 mt-0.5">
              Solid Slate/Cyan Line = Verified Historical Actuals · Dashed Amber Line = AI-Generated Estimate
            </div>
          </div>
          {forecast && (
            <div className="text-right font-mono">
              <div className="text-[10px] text-amber-700 dark:text-amber-400 uppercase">
                AI Annual Projection (Estimate)
              </div>
              <div className="text-lg font-bold tabular-nums">
                ${forecast.annualProjectionUsd.toLocaleString()}
              </div>
            </div>
          )}
        </div>

        <div className="w-full overflow-x-auto">
          <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-56 select-none">
            {[0.25, 0.5, 0.75, 1].map((f) => {
              const y = getY(maxVal * f);
              return (
                <g key={f}>
                  <line x1={padX} x2={w - padX} y1={y} y2={y} className="stroke-slate-200 dark:stroke-slate-800" strokeDasharray="2 3" />
                  <text x={padX - 6} y={y + 3} textAnchor="end" className="fill-slate-400 text-[9px] font-mono">
                    ${Math.round((maxVal * f) / 1000)}k
                  </text>
                </g>
              );
            })}

            {histPath && <path d={histPath} fill="none" className="stroke-cyan-600 dark:stroke-cyan-400" strokeWidth={2.5} />}
            {aiPath && (
              <path
                d={aiPath}
                fill="none"
                className="stroke-amber-600 dark:stroke-amber-400"
                strokeWidth={2.5}
                strokeDasharray="6 4"
              />
            )}

            {histPoints.map((p, i) => (
              <g key={p.month}>
                <circle cx={getX(i)} cy={getY(p.actualRevenue)} r={3.5} className="fill-cyan-600 dark:fill-cyan-400" />
                <text x={getX(i)} y={h - 4} textAnchor="middle" className="fill-slate-500 text-[9px] font-mono">
                  {p.month.slice(2)}
                </text>
              </g>
            ))}

            {aiPoints.map((p, i) => {
              const idx = histPoints.length + i;
              return (
                <g key={p.month}>
                  <circle cx={getX(idx)} cy={getY(p.projectedRevenue)} r={3.5} className="fill-amber-600 dark:fill-amber-400" />
                  <text x={getX(idx)} y={h - 4} textAnchor="middle" className="fill-amber-600 text-[9px] font-mono">
                    {p.month} (Est)
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {!forecast && !loading && (
        <div className="p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-center text-xs text-slate-500">
          Click <strong>Generate AI Revenue Forecast</strong> above to analyze your 12-month historical run rate and open weighted CRM pipeline.
        </div>
      )}

      {forecast && (
        <div className="space-y-6">
          <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg text-xs text-amber-900 dark:text-amber-200">
            <strong>AI Estimate Basis:</strong> {forecast.methodologySummary}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {forecast.quarterlyProjections.map((q) => (
              <div
                key={q.quarter}
                className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg"
              >
                <div className="text-[11px] font-mono text-amber-700 dark:text-amber-400">
                  {q.quarter} · AI ESTIMATE
                </div>
                <div className="text-xl font-mono font-bold tabular-nums mt-1">
                  ${q.projectedRevenue.toLocaleString()}
                </div>
                <div className="text-xs font-mono text-emerald-700 dark:text-emerald-400 mt-1">
                  {q.growthPercent >= 0 ? '+' : ''}{q.growthPercent}% projected growth
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg">
              <h3 className="text-sm font-display font-semibold mb-3">Product Demand Forecast (AI Estimate)</h3>
              <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {forecast.productDemandForecast.map((pd, i) => (
                  <div key={i} className="py-2.5 flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold">{pd.category}</div>
                      <div className="text-slate-500">{pd.driver}</div>
                    </div>
                    <div className="text-right font-mono shrink-0">
                      <div className="text-cyan-700 dark:text-cyan-400">{pd.projectedUnitsNextQuarter} units/qtr</div>
                      <div className="text-[11px] text-slate-500">{pd.expectedDemandTrend}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg">
              <h3 className="text-sm font-display font-semibold mb-3">Customer Segmentation & Growth Actions</h3>
              <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs mb-4">
                {forecast.customerSegmentation.map((seg, i) => (
                  <div key={i} className="py-2 flex items-center justify-between gap-2">
                    <div>
                      <div className="font-semibold">{seg.segment}</div>
                      <div className="text-slate-500">{seg.outlook}</div>
                    </div>
                    <div className="font-mono text-right shrink-0">
                      <div>{seg.sharePercent}% share</div>
                      <div className="text-[11px] text-slate-500">Avg ${seg.avgDealSizeUsd.toLocaleString()}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
                <div className="text-xs font-semibold mb-2">Strategic Growth Recommendations</div>
                <ul className="list-disc pl-4 space-y-1 text-xs text-slate-600 dark:text-slate-300">
                  {forecast.growthRecommendations.map((rec, i) => (
                    <li key={i}>{rec}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
