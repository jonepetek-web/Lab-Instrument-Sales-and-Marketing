import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import type {
  Customer,
  HistoricalSalesPoint,
  Opportunity,
  Product,
} from '../src/types/platform.ts';

function getClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === '' || apiKey === 'MY_GEMINI_API_KEY') {
    throw new Error(
      'GEMINI_API_KEY is not configured. Add a valid Gemini API key in Settings > Secrets to run AI workflows.'
    );
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function buildCatalogContext(products: Product[]): string {
  return products
    .map((p) => {
      const specsList = Object.entries(p.specs)
        .map(([k, v]) => `${k}: ${v}`)
        .join('; ');
      return `[ID: ${p.id}] ${p.name} | Brand: ${p.brand} | Manufacturer: ${p.manufacturer} | Model: ${p.modelNumber} | Category: ${p.category} | Price: $${p.sellingPrice.toLocaleString()} | Stock: ${p.stockStatus} (${p.stockQty} units, Lead Time: ${p.leadTimeDays}d) | Warranty: ${p.warranty} | Certs: ${p.regulatoryCerts.join(', ')} | Specs: ${specsList} | Applications: ${p.applications.join(', ')} | Installation: ${p.installationReqs} | Maintenance: ${p.maintenanceReqs}`;
    })
    .join('\n');
}

export async function generateLeadIntelligence(params: {
  industry?: string;
  country?: string;
  city?: string;
  labType?: string;
  researchField?: string;
  instrumentNeeds?: string;
  uploadedRows?: Record<string, string>[];
  products: Product[];
}) {
  const ai = getClient();
  const catalogContext = buildCatalogContext(params.products);

  const isCsvMode = Array.isArray(params.uploadedRows) && params.uploadedRows.length > 0;
  const prompt = isCsvMode
    ? `Analyze and classify the following uploaded institutional lead records for a scientific laboratory instruments distributor.
For each lead, classify its laboratory category, infer likely instrument requirements from our VERIFIED CATALOGUE below, assign a priority (High/Medium/Low), recommend specific models from our catalogue, and explicitly mark contact details that require human verification before outreach.
CRITICAL: NEVER fabricate or invent email addresses or phone numbers not present in the input. If email/phone is missing or generic, set contactVerificationStatus to "Needs Verification".

UPLOADED RECORDS:
${JSON.stringify(params.uploadedRows?.slice(0, 25), null, 2)}

VERIFIED PRODUCT CATALOGUE:
${catalogContext}`
    : `Act as a scientific laboratory market intelligence analyst. Based on the target parameters below, generate realistic institutional buyer profiles (types of real hospital departments, university faculties, regulatory testing agencies, pharmaceutical QC departments, or industrial laboratories that match this profile) to guide a salesperson's prospecting research.
CRITICAL COMPLIANCE RULE: DO NOT fabricate personal emails or phone numbers. Leave direct contact email/phone as "Verify via institutional directory" and set contactVerificationStatus to "Requires Verification". Clearly distinguish verified catalogue recommendations from prospecting hypotheses.

TARGET PARAMETERS:
- Industry / Sector: ${params.industry || 'Any'}
- Country: ${params.country || 'Global'}
- City / Region: ${params.city || 'Any'}
- Laboratory Type: ${params.labType || 'Analytical / R&D'}
- Research Field: ${params.researchField || 'General Laboratory Testing'}
- Instrument Requirements: ${params.instrumentNeeds || 'Open'}

VERIFIED PRODUCT CATALOGUE:
${catalogContext}`;

  const response = await ai.models.generateContent({
    model: 'gemini-4-hydrogen',
    contents: prompt,
    config: {
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          summary: { type: Type.STRING },
          leads: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                institutionName: { type: Type.STRING },
                labType: { type: Type.STRING },
                country: { type: Type.STRING },
                city: { type: Type.STRING },
                department: { type: Type.STRING },
                priority: { type: Type.STRING },
                estimatedPotentialUsd: { type: Type.NUMBER },
                likelyRequirements: { type: Type.STRING },
                recommendedProducts: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                rationale: { type: Type.STRING },
                contactVerificationStatus: { type: Type.STRING },
                verificationNote: { type: Type.STRING },
                sourceEmailIfProvided: { type: Type.STRING },
              },
              required: [
                'institutionName',
                'labType',
                'priority',
                'likelyRequirements',
                'recommendedProducts',
                'rationale',
                'contactVerificationStatus',
                'verificationNote',
              ],
            },
          },
        },
        required: ['summary', 'leads'],
      },
    },
  });

  return JSON.parse((response.text ?? '{}').trim());
}

export async function runSalesAssistant(params: {
  mode: string;
  query: string;
  customerContext?: Customer | null;
  selectedProductIds?: string[];
  products: Product[];
}) {
  const ai = getClient();
  const focusProducts =
    params.selectedProductIds && params.selectedProductIds.length > 0
      ? params.products.filter((p) => params.selectedProductIds!.includes(p.id))
      : params.products;

  const catalogContext = buildCatalogContext(focusProducts);
  const fullSummary = params.products
    .map((p) => `${p.name} (${p.modelNumber}, ${p.category}, $${p.sellingPrice})`)
    .join('; ');

  const customerBlock = params.customerContext
    ? `TARGET CUSTOMER PROFILE:
- Institution: ${params.customerContext.institutionName} (${params.customerContext.type})
- Location: ${params.customerContext.city}, ${params.customerContext.country}
- Department: ${params.customerContext.department}
- Research Interests: ${params.customerContext.researchInterests}
- Stated Requirements: ${params.customerContext.instrumentRequirements}
- Existing Instruments: ${params.customerContext.existingInstruments.join(', ') || 'None recorded'}`
    : 'No specific customer selected — provide general technical sales guidance.';

  const systemInstruction = `You are the Senior Scientific Sales Engineer Assistant for Helios Analytical, an international supplier of laboratory instruments.
STRICT ACCURACY MANDATE:
1. Use ONLY the verified product catalogue, technical specifications, warranties, and regulatory certifications provided below as your knowledge base.
2. NEVER invent technical specifications, detection limits, prices, or regulatory certifications (e.g. FDA/CE/ISO) that are not explicitly listed in the verified catalogue. If a customer asks for a spec or certification not present in the data, explicitly state: "Requires confirmation from manufacturer datasheet."
3. Structure your response cleanly with clear headings, bullet points, or comparison markdown tables so a field sales specialist can immediately copy-paste or use it in a client meeting.`;

  const prompt = `TASK MODE: ${params.mode}

${customerBlock}

USER REQUEST:
${params.query}

FOCUS CATALOGUE DETAILS:
${catalogContext}

OTHER AVAILABLE CATALOGUE MODELS FOR CROSS-SELL / UPSELL:
${fullSummary}`;

  const response = await ai.models.generateContent({
    model: 'gemini-4-hydrogen',
    contents: prompt,
    config: {
      systemInstruction,
      thinkingConfig: { thinkingLevel: ThinkingLevel.MEDIUM },
    },
  });

  return {
    reply: response.text || 'No response generated.',
    modelUsed: 'gemini-4-hydrogen',
    groundedProductCount: focusProducts.length,
  };
}

export async function generateMarketingContent(params: {
  format: string;
  topic: string;
  targetAudience: string;
  productId?: string;
  tone?: string;
  products: Product[];
}) {
  const ai = getClient();
  const product = params.products.find((p) => p.id === params.productId);
  const productContext = product
    ? buildCatalogContext([product])
    : buildCatalogContext(params.products.slice(0, 6));

  const prompt = `Generate scientific B2B marketing content for Helios Analytical.
FORMAT REQUESTED: ${params.format}
CAMPAIGN TOPIC / ANGLE: ${params.topic}
TARGET AUDIENCE: ${params.targetAudience}
TONE: ${params.tone || 'Authoritative, technical, empirically credible — zero hype or buzzwords'}

STRICT GROUNDING RULES:
- Base all instrument performance claims strictly on the verified catalogue details below.
- Do not fabricate certifications or unverified performance benchmarks.
- Output structured JSON with headline/title, primary copy body, SEO keywords, and suggested CTA.

VERIFIED INSTRUMENT CONTEXT:
${productContext}`;

  const response = await ai.models.generateContent({
    model: 'gemini-4-hydrogen',
    contents: prompt,
    config: {
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          contentTitle: { type: Type.STRING },
          contentBody: { type: Type.STRING },
          slogans: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          seoKeywords: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          suggestedCta: { type: Type.STRING },
          complianceCheckNote: { type: Type.STRING },
        },
        required: ['contentTitle', 'contentBody', 'slogans', 'seoKeywords', 'suggestedCta', 'complianceCheckNote'],
      },
    },
  });

  return JSON.parse((response.text ?? '{}').trim());
}

export async function generateSalesForecast(params: {
  historicalSales: HistoricalSalesPoint[];
  opportunities: Opportunity[];
  products: Product[];
}) {
  const ai = getClient();

  const openPipeline = params.opportunities
    .filter((o) => o.stage !== 'Won' && o.stage !== 'Lost')
    .map((o) => ({
      title: o.title,
      customerType: o.customerType,
      stage: o.stage,
      value: o.value,
      probability: o.probability,
      expectedCloseDate: o.expectedCloseDate,
    }));

  const prompt = `Analyze the following historical monthly revenue actuals and open CRM sales pipeline for Helios Analytical (scientific laboratory instruments distributor) and generate an AI-driven forecast.
CRITICAL REQUIREMENT: Clearly distinguish historical actuals from AI-generated estimates. Base your projections mathematically on historical run rate, seasonality, and weighted open pipeline.

HISTORICAL MONTHLY ACTUALS (USD):
${JSON.stringify(params.historicalSales)}

OPEN PIPELINE OPPORTUNITIES:
${JSON.stringify(openPipeline)}

TOP CATALOGUE CATEGORIES:
${params.products.map((p) => `${p.name} (${p.category}, $${p.sellingPrice})`).join('; ')}`;

  const response = await ai.models.generateContent({
    model: 'gemini-4-hydrogen',
    contents: prompt,
    config: {
      thinkingConfig: { thinkingLevel: ThinkingLevel.MEDIUM },
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          methodologySummary: { type: Type.STRING },
          monthlyForecasts: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                month: { type: Type.STRING },
                projectedRevenue: { type: Type.NUMBER },
                lowBand: { type: Type.NUMBER },
                highBand: { type: Type.NUMBER },
                confidenceNote: { type: Type.STRING },
              },
              required: ['month', 'projectedRevenue', 'lowBand', 'highBand', 'confidenceNote'],
            },
          },
          quarterlyProjections: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                quarter: { type: Type.STRING },
                projectedRevenue: { type: Type.NUMBER },
                growthPercent: { type: Type.NUMBER },
              },
              required: ['quarter', 'projectedRevenue', 'growthPercent'],
            },
          },
          annualProjectionUsd: { type: Type.NUMBER },
          productDemandForecast: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                category: { type: Type.STRING },
                expectedDemandTrend: { type: Type.STRING },
                projectedUnitsNextQuarter: { type: Type.NUMBER },
                driver: { type: Type.STRING },
              },
              required: ['category', 'expectedDemandTrend', 'projectedUnitsNextQuarter', 'driver'],
            },
          },
          customerSegmentation: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                segment: { type: Type.STRING },
                sharePercent: { type: Type.NUMBER },
                avgDealSizeUsd: { type: Type.NUMBER },
                outlook: { type: Type.STRING },
              },
              required: ['segment', 'sharePercent', 'avgDealSizeUsd', 'outlook'],
            },
          },
          growthRecommendations: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
        },
        required: [
          'methodologySummary',
          'monthlyForecasts',
          'quarterlyProjections',
          'annualProjectionUsd',
          'productDemandForecast',
          'customerSegmentation',
          'growthRecommendations',
        ],
      },
    },
  });

  return JSON.parse((response.text ?? '{}').trim());
}
