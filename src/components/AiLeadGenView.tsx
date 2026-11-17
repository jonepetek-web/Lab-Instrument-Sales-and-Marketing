import { AlertTriangle, CheckCircle2, Plus, Sparkles, Upload } from 'lucide-react';
import { useState } from 'react';
import { CUSTOMER_TYPES } from '../types/platform.ts';
import { apiFetch } from '../utils/api.ts';
import { parseSpreadsheetFile } from '../utils/exporters.ts';

interface GeneratedLead {
  institutionName: string;
  labType: string;
  country: string;
  city: string;
  department: string;
  priority: string;
  estimatedPotentialUsd: number;
  likelyRequirements: string;
  recommendedProducts: string[];
  rationale: string;
  contactVerificationStatus: string;
  verificationNote: string;
  sourceEmailIfProvided?: string;
}

export function AiLeadGenView() {
  const [industry, setIndustry] = useState('Pharmaceutical Companies');
  const [country, setCountry] = useState('Germany');
  const [city, setCity] = useState('Munich');
  const [labType, setLabType] = useState('GMP Analytical QC & Bioanalysis');
  const [researchField, setResearchField] = useState('Biologics, Nitrosamine Impurities & ICH Q3D');
  const [instrumentNeeds, setInstrumentNeeds] = useState('UHPLC, LC-MS/MS, Analytical Balances');
  const [uploadedRows, setUploadedRows] = useState<Record<string, string>[]>([]);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ summary: string; leads: GeneratedLead[] } | null>(null);
  const [importedKeys, setImportedKeys] = useState<Record<number, boolean>>({});

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const rows = await parseSpreadsheetFile(file);
    setUploadedRows(rows);
    setUploadedFileName(file.name);
  }

  async function handleRunLeadGen(mode: 'criteria' | 'csv') {
    setError(null);
    setLoading(true);
    setImportedKeys({});
    try {
      const payload =
        mode === 'csv'
          ? { uploadedRows }
          : { industry, country, city, labType, researchField, instrumentNeeds };
      const res = await apiFetch<{ summary: string; leads: GeneratedLead[] }>('/api/ai/leads', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'AI lead generation request failed.');
    } finally {
      setLoading(false);
    }
  }

  async function importToCrm(lead: GeneratedLead, idx: number) {
    const matchedSector =
      CUSTOMER_TYPES.find((t) => lead.labType.toLowerCase().includes(t.split(' ')[0].toLowerCase())) ||
      'Research Institutions';
    const customer = await apiFetch<{ id: string; institutionName: string; type: string }>(
      '/api/customers',
      {
        method: 'POST',
        body: JSON.stringify({
          institutionName: lead.institutionName,
          type: matchedSector,
          country: lead.country || country,
          city: lead.city || city,
          department: lead.department || lead.labType,
          contacts: lead.sourceEmailIfProvided
            ? [{ name: 'Imported Contact', title: 'Verify Role', email: lead.sourceEmailIfProvided, phone: '' }]
            : [],
          researchInterests: lead.rationale,
          instrumentRequirements: `${lead.likelyRequirements} (${lead.recommendedProducts.join(', ')})`,
          potentialValue: lead.estimatedPotentialUsd || 65000,
        }),
      }
    );

    await apiFetch('/api/opportunities', {
      method: 'POST',
      body: JSON.stringify({
        title: `${lead.institutionName} — ${lead.recommendedProducts[0] || 'Instrument Inquiry'}`,
        customerId: customer.id,
        customerName: customer.institutionName,
        customerType: matchedSector,
        stage: 'New Lead',
        value: lead.estimatedPotentialUsd || 65000,
        notes: `AI Classification Priority: ${lead.priority}. Verification: ${lead.verificationNote}`,
      }),
    });

    setImportedKeys((prev) => ({ ...prev, [idx]: true }));
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold">AI Lead Generation & Classification</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Identify institutional laboratory prospects or upload Excel/CSV lists for AI classification, product matching, and verification-flagged CRM import.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Target Criteria Form */}
        <div className="lg:col-span-7 p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg space-y-4">
          <div className="text-sm font-display font-semibold">01. Institutional Prospecting Criteria</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block font-medium text-slate-600 dark:text-slate-400 mb-1">Industry / Sector</label>
              <select
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md"
              >
                {CUSTOMER_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-medium text-slate-600 dark:text-slate-400 mb-1">Country</label>
              <input
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-600 dark:text-slate-400 mb-1">City / Cluster</label>
              <input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-600 dark:text-slate-400 mb-1">Laboratory Type</label>
              <input
                value={labType}
                onChange={(e) => setLabType(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block font-medium text-slate-600 dark:text-slate-400 mb-1">Research Field / Testing Scope</label>
              <input
                value={researchField}
                onChange={(e) => setResearchField(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block font-medium text-slate-600 dark:text-slate-400 mb-1">Instrument Requirements</label>
              <input
                value={instrumentNeeds}
                onChange={(e) => setInstrumentNeeds(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md"
              />
            </div>
          </div>

          <button
            type="button"
            disabled={loading}
            onClick={() => handleRunLeadGen('criteria')}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-cyan-700 hover:bg-cyan-800 disabled:opacity-60 text-white rounded-md"
          >
            <Sparkles className="w-3.5 h-3.5" />
            {loading ? 'Analyzing Target Market...' : 'Identify & Score Target Profiles'}
          </button>
        </div>

        {/* Excel / CSV Lead List Classifier */}
        <div className="lg:col-span-5 p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg flex flex-col justify-between gap-4">
          <div className="space-y-3">
            <div className="text-sm font-display font-semibold">02. Upload Excel / CSV Customer List</div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Upload conference delegate rosters, institutional directories, or existing Excel/CSV spreadsheets. AI classifies each lab, matches catalogue instruments, and flags unverified contact fields.
            </p>

            <label className="flex flex-col items-center justify-center p-6 border border-dashed border-slate-300 dark:border-slate-700 rounded-md cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-950/50 text-center">
              <Upload className="w-6 h-6 text-cyan-700 dark:text-cyan-400 mb-2" />
              <span className="text-xs font-medium">
                {uploadedFileName ? `${uploadedFileName} (${uploadedRows.length} rows parsed)` : 'Select .xlsx, .xls, or .csv file'}
              </span>
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>

          <button
            type="button"
            disabled={loading || uploadedRows.length === 0}
            onClick={() => handleRunLeadGen('csv')}
            className="w-full px-4 py-2 text-xs font-semibold bg-slate-900 text-white dark:bg-white dark:text-slate-900 disabled:opacity-40 rounded-md"
          >
            Classify & Prioritize Uploaded List
          </button>
        </div>
      </div>

      {/* Compliance Notice */}
      <div className="p-3.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
        <div>
          <strong>Data Integrity Policy:</strong> Contact details are never fabricated. AI-discovered institutional targets are explicitly flagged as requiring directory verification before outbound email or phone contact.
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-md text-xs text-rose-700 dark:text-rose-300">
          {error}
        </div>
      )}

      {result && (
        <div className="space-y-4">
          <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs">
            <div className="font-semibold text-slate-900 dark:text-white mb-1">Intelligence Summary</div>
            <p className="text-slate-600 dark:text-slate-300">{result.summary}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {result.leads.map((lead, idx) => (
              <div
                key={idx}
                className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg flex flex-col justify-between gap-3 text-xs"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-display font-bold text-sm text-slate-900 dark:text-white">
                        {lead.institutionName}
                      </div>
                      <div className="text-slate-500">
                        {lead.labType} · {lead.city}, {lead.country}
                      </div>
                    </div>
                    <span
                      className={`font-mono font-semibold ${
                        lead.priority === 'High'
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : lead.priority === 'Medium'
                          ? 'text-amber-700 dark:text-amber-400'
                          : 'text-slate-500'
                      }`}
                    >
                      {lead.priority} Priority
                    </span>
                  </div>

                  <p className="text-slate-600 dark:text-slate-300 leading-relaxed">{lead.rationale}</p>

                  <div>
                    <span className="font-semibold">Likely Requirements:</span> {lead.likelyRequirements}
                  </div>
                  <div>
                    <span className="font-semibold">Recommended Catalogue Systems:</span>{' '}
                    <span className="text-cyan-700 dark:text-cyan-400">{lead.recommendedProducts.join(' · ')}</span>
                  </div>
                  <div className="font-mono tabular-nums">
                    Est. Potential: ${(lead.estimatedPotentialUsd || 0).toLocaleString()}
                  </div>

                  <div className="p-2 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded text-[11px] text-amber-700 dark:text-amber-400">
                    {lead.contactVerificationStatus}: {lead.verificationNote}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                  {importedKeys[idx] ? (
                    <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-semibold">
                      <CheckCircle2 className="w-4 h-4" /> Added to CRM Pipeline
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => importToCrm(lead, idx)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-cyan-700 hover:bg-cyan-800 text-white font-semibold rounded-md"
                    >
                      <Plus className="w-3.5 h-3.5" /> Import to CRM Pipeline
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
