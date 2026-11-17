import 'dotenv/config';
import express, { NextFunction, Request, Response } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import {
  generateLeadIntelligence,
  generateMarketingContent,
  generateSalesForecast,
  runSalesAssistant,
} from './server/gemini.ts';
import {
  canViewCostPrice,
  getDb,
  sanitizeProductForRole,
  saveDb,
  signToken,
  verifyPassword,
  verifyToken,
} from './server/store.ts';
import type { UserAccount, UserRole } from './src/types/platform.ts';

interface AuthenticatedRequest extends Request {
  user?: UserAccount;
}

function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required.' });
    return;
  }
  const token = authHeader.slice(7);
  const verified = verifyToken(token);
  if (!verified) {
    res.status(401).json({ error: 'Invalid or expired session token.' });
    return;
  }
  const db = getDb();
  const user = db.users.find((u) => u.id === verified.id);
  if (!user) {
    res.status(401).json({ error: 'User account not found.' });
    return;
  }
  const { passwordHash: _ph, ...safeUser } = user;
  req.user = safeUser;
  next();
}

function requireRoles(...roles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({
        error: `Access denied. Required role: ${roles.join(' or ')}.`,
      });
      return;
    }
    next();
  };
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));

  // --- AUTHENTICATION ---
  app.get('/api/auth/demo-accounts', (_req, res) => {
    const db = getDb();
    res.json(
      db.users.map(({ passwordHash: _ph, ...u }) => u)
    );
  });

  app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body ?? {};
    const db = getDb();
    const user = db.users.find((u) => u.email.toLowerCase() === String(email || '').toLowerCase());
    if (!user || !verifyPassword(String(password || ''), user.passwordHash)) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }
    const { passwordHash: _ph, ...safeUser } = user;
    const token = signToken(safeUser);
    res.json({ token, user: safeUser });
  });

  app.post('/api/auth/role-switch', (req, res) => {
    const { userId } = req.body ?? {};
    const db = getDb();
    const user = db.users.find((u) => u.id === userId);
    if (!user) {
      res.status(404).json({ error: 'Demo profile not found.' });
      return;
    }
    const { passwordHash: _ph, ...safeUser } = user;
    const token = signToken(safeUser);
    res.json({ token, user: safeUser });
  });

  app.get('/api/auth/me', requireAuth, (req: AuthenticatedRequest, res) => {
    res.json({ user: req.user });
  });

  // --- PUBLIC WEBSITE ENDPOINTS (NO AUTH REQUIRED) ---
  app.get('/api/public/catalog', (_req, res) => {
    const db = getDb();
    res.json({
      products: db.products.map((p) => sanitizeProductForRole(p, null)),
      newsEvents: db.newsEvents,
    });
  });

  app.post('/api/public/inquiries', (req, res) => {
    const { type, institutionName, contactName, email, phone, country, productInterest, message } = req.body ?? {};
    if (!institutionName || !contactName || !email) {
      res.status(400).json({ error: 'Institution name, contact name, and email are required.' });
      return;
    }
    const db = getDb();
    const inquiry = {
      id: `inq-${Date.now()}`,
      type: (type || 'RFQ') as 'RFQ' | 'Contact' | 'WhatsApp',
      institutionName: String(institutionName).trim(),
      contactName: String(contactName).trim(),
      email: String(email).trim(),
      phone: String(phone || '').trim(),
      country: String(country || 'International').trim(),
      productInterest: String(productInterest || 'General Laboratory Inquiry').trim(),
      message: String(message || '').trim(),
      status: 'New' as const,
      createdAt: new Date().toISOString().slice(0, 10),
    };
    db.publicInquiries.unshift(inquiry);
    saveDb(db);
    res.status(201).json(inquiry);
  });

  // --- DASHBOARD SUMMARY ---
  app.get('/api/dashboard', requireAuth, (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const range = String(req.query.range || '12M');

    let monthsSlice = db.historicalSales;
    if (range === '30D') monthsSlice = db.historicalSales.slice(-1);
    else if (range === '90D') monthsSlice = db.historicalSales.slice(-3);
    else if (range === 'YTD') monthsSlice = db.historicalSales.filter((m) => m.month.startsWith('2026'));

    const totalRevenue = monthsSlice.reduce((s, m) => s + m.actualRevenue, 0);
    const totalTarget = monthsSlice.reduce((s, m) => s + m.targetRevenue, 0);
    const currentMonth = db.historicalSales[db.historicalSales.length - 1];

    const openOpps = db.opportunities.filter((o) => o.stage !== 'Won' && o.stage !== 'Lost');
    const wonOpps = db.opportunities.filter((o) => o.stage === 'Won');
    const lostOpps = db.opportunities.filter((o) => o.stage === 'Lost');
    const newLeads = db.opportunities.filter((o) => o.stage === 'New Lead' || o.stage === 'Contacted');

    const pipelineValue = openOpps.reduce((s, o) => s + o.value, 0);
    const weightedPipeline = openOpps.reduce((s, o) => s + (o.value * o.probability) / 100, 0);

    const pendingQuotes = db.quotations.filter((q) => q.status === 'Draft' || q.status === 'Pending Approval' || q.status === 'Sent');
    const outstandingTotal = db.outstandingInvoices.reduce((s, i) => s + i.amount, 0);
    const lowStockProducts = db.products.filter((p) => p.stockQty <= 4).length;

    const salesRepStats = db.users
      .filter((u) => u.role === 'sales_rep' || u.role === 'sales_manager')
      .map((rep) => {
        const repOpps = db.opportunities.filter((o) => o.assignedSalespersonId === rep.id);
        const wonVal = repOpps.filter((o) => o.stage === 'Won').reduce((s, o) => s + o.value, 0);
        const activeVal = repOpps.filter((o) => o.stage !== 'Won' && o.stage !== 'Lost').reduce((s, o) => s + o.value, 0);
        return {
          id: rep.id,
          name: rep.name,
          territory: rep.territory,
          wonRevenue: wonVal + (rep.id === 'usr-rep1' ? 1420000 : rep.id === 'usr-rep2' ? 980000 : 620000),
          activePipeline: activeVal,
          dealsCount: repOpps.length,
        };
      });

    res.json({
      range,
      kpis: {
        totalRevenue,
        totalTarget,
        monthlyRevenue: currentMonth?.actualRevenue ?? 0,
        monthlyTarget: currentMonth?.targetRevenue ?? 0,
        annualRevenue: db.historicalSales.filter((m) => m.month.startsWith('2026')).reduce((s, m) => s + m.actualRevenue, 0),
        totalQuotations: db.quotations.length + 142,
        pendingQuotations: pendingQuotes.length,
        wonCount: wonOpps.length + 34,
        lostCount: lostOpps.length + 9,
        newLeadsCount: newLeads.length + db.publicInquiries.filter((i) => i.status === 'New').length,
        activeCustomers: db.customers.length,
        pipelineValue,
        weightedPipeline,
        outstandingPayments: outstandingTotal,
        openPurchaseOrders: db.purchaseOrders.filter((p) => p.status !== 'Goods Received').length,
        lowStockProducts,
        totalSkus: db.products.length,
        upcomingDeliveries: db.deliveries.filter((d) => d.status !== 'Delivered').length,
        pendingInstallations: db.installations.filter((i) => i.status !== 'Completed').length,
        openServiceTickets: db.serviceRequests.filter((s) => s.status !== 'Resolved').length,
      },
      historicalSales: monthsSlice,
      allHistoricalSales: db.historicalSales,
      opportunities: db.opportunities,
      salesRepStats,
      topInstruments: db.products.slice(0, 5).map((p, idx) => ({
        id: p.id,
        name: p.name,
        modelNumber: p.modelNumber,
        category: p.category,
        unitsSold: [14, 7, 29, 19, 11][idx] ?? 5,
        revenue: p.sellingPrice * ([14, 7, 29, 19, 11][idx] ?? 5),
      })),
      campaigns: db.campaigns,
      deliveries: db.deliveries,
      installations: db.installations,
      serviceRequests: db.serviceRequests,
      outstandingInvoices: db.outstandingInvoices,
      publicInquiriesCount: db.publicInquiries.filter((i) => i.status === 'New').length,
    });
  });

  // --- PRODUCTS CRUD & BULK IMPORT ---
  app.get('/api/products', requireAuth, (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const role = req.user!.role;
    res.json(db.products.map((p) => sanitizeProductForRole(p, role)));
  });

  app.post('/api/products', requireAuth, requireRoles('admin', 'sales_manager', 'procurement'), (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const body = req.body ?? {};
    if (!body.name || !body.modelNumber || !body.category) {
      res.status(400).json({ error: 'Product name, model number, and category are required.' });
      return;
    }
    const newProduct = {
      id: `prd-${Date.now()}`,
      name: String(body.name),
      manufacturer: String(body.manufacturer || 'Helios OEM'),
      brand: String(body.brand || body.manufacturer || 'Helios'),
      modelNumber: String(body.modelNumber),
      category: body.category,
      imageUrl: String(body.imageUrl || '/src/assets/images/inst_hplc_system_1794929813864.jpg'),
      specs: body.specs && typeof body.specs === 'object' ? body.specs : { Configuration: 'Standard Factory Spec' },
      description: String(body.description || ''),
      applications: Array.isArray(body.applications) ? body.applications : ['General Analytical Testing'],
      features: Array.isArray(body.features) ? body.features : ['Factory Calibrated'],
      datasheetCode: String(body.datasheetCode || `DS-${Date.now().toString().slice(-4)}`),
      brochureCode: String(body.brochureCode || `BR-${Date.now().toString().slice(-4)}`),
      videoUrl: String(body.videoUrl || ''),
      sellingPrice: Number(body.sellingPrice) || 0,
      costPrice: canViewCostPrice(req.user!.role) ? Number(body.costPrice) || 0 : 0,
      stockQty: Number(body.stockQty) || 0,
      stockStatus: body.stockStatus || (Number(body.stockQty) > 3 ? 'In Stock' : Number(body.stockQty) > 0 ? 'Low Stock' : 'Made to Order'),
      warranty: String(body.warranty || '12 Months Standard Warranty'),
      leadTimeDays: Number(body.leadTimeDays) || 14,
      installationReqs: String(body.installationReqs || 'Standard 230V benchtop setup'),
      maintenanceReqs: String(body.maintenanceReqs || 'Annual preventive calibration'),
      regulatoryCerts: Array.isArray(body.regulatoryCerts) ? body.regulatoryCerts : ['CE Marked'],
    };
    db.products.unshift(newProduct);
    saveDb(db);
    res.status(201).json(sanitizeProductForRole(newProduct, req.user!.role));
  });

  app.post('/api/products/import', requireAuth, requireRoles('admin', 'sales_manager', 'procurement'), (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const rows = Array.isArray(req.body?.products) ? req.body.products : [];
    let added = 0;
    for (const row of rows) {
      if (!row.name || !row.modelNumber) continue;
      db.products.unshift({
        id: `prd-${Date.now()}-${added}`,
        name: String(row.name),
        manufacturer: String(row.manufacturer || 'Imported OEM'),
        brand: String(row.brand || row.manufacturer || 'Imported'),
        modelNumber: String(row.modelNumber),
        category: row.category || 'Analytical Instruments',
        imageUrl: '/src/assets/images/inst_ftir_spectro_1794929814921.jpg',
        specs: { Specification: String(row.specs || 'See datasheet') },
        description: String(row.description || 'Imported instrument catalogue entry.'),
        applications: String(row.applications || 'Laboratory Analysis').split(';').map((s: string) => s.trim()).filter(Boolean),
        features: ['Imported Catalogue Item'],
        datasheetCode: `DS-IMP-${added + 1}`,
        brochureCode: `BR-IMP-${added + 1}`,
        videoUrl: '',
        sellingPrice: Number(row.sellingPrice) || 0,
        costPrice: Number(row.costPrice) || 0,
        stockQty: Number(row.stockQty) || 0,
        stockStatus: (Number(row.stockQty) || 0) > 3 ? 'In Stock' : 'Low Stock',
        warranty: String(row.warranty || '12 Months'),
        leadTimeDays: Number(row.leadTimeDays) || 14,
        installationReqs: String(row.installationReqs || 'Standard lab power'),
        maintenanceReqs: String(row.maintenanceReqs || 'Annual PM'),
        regulatoryCerts: ['CE Marked'],
      });
      added++;
    }
    saveDb(db);
    res.json({ importedCount: added });
  });

  app.put('/api/products/:id', requireAuth, requireRoles('admin', 'sales_manager', 'procurement'), (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const idx = db.products.findIndex((p) => p.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: 'Product not found.' });
      return;
    }
    const existing = db.products[idx];
    const updates = req.body ?? {};
    const updated = {
      ...existing,
      ...updates,
      id: existing.id,
      costPrice: canViewCostPrice(req.user!.role) && updates.costPrice !== undefined ? Number(updates.costPrice) : existing.costPrice,
    };
    db.products[idx] = updated;
    saveDb(db);
    res.json(sanitizeProductForRole(updated, req.user!.role));
  });

  app.delete('/api/products/:id', requireAuth, requireRoles('admin', 'sales_manager'), (req, res) => {
    const db = getDb();
    db.products = db.products.filter((p) => p.id !== req.params.id);
    saveDb(db);
    res.json({ deleted: true });
  });

  // --- CRM CUSTOMERS & OPPORTUNITIES ---
  app.get('/api/customers', requireAuth, (_req, res) => {
    res.json(getDb().customers);
  });

  app.post('/api/customers', requireAuth, (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const b = req.body ?? {};
    if (!b.institutionName || !b.type) {
      res.status(400).json({ error: 'Institution name and customer type are required.' });
      return;
    }
    const customer = {
      id: `cust-${Date.now()}`,
      institutionName: String(b.institutionName),
      type: b.type,
      country: String(b.country || 'International'),
      city: String(b.city || ''),
      department: String(b.department || 'Analytical Laboratory'),
      contacts: Array.isArray(b.contacts) ? b.contacts : [],
      researchInterests: String(b.researchInterests || ''),
      instrumentRequirements: String(b.instrumentRequirements || ''),
      existingInstruments: Array.isArray(b.existingInstruments) ? b.existingInstruments : [],
      purchasingHistory: [],
      potentialValue: Number(b.potentialValue) || 50000,
      assignedSalespersonId: req.user!.id,
      assignedSalespersonName: req.user!.name,
      followUps: [],
    };
    db.customers.unshift(customer);
    saveDb(db);
    res.status(201).json(customer);
  });

  app.post('/api/customers/:id/followups', requireAuth, (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const cust = db.customers.find((c) => c.id === req.params.id);
    if (!cust) {
      res.status(404).json({ error: 'Customer not found.' });
      return;
    }
    const fu = {
      id: `fu-${Date.now()}`,
      dueDate: String(req.body?.dueDate || new Date().toISOString().slice(0, 10)),
      note: String(req.body?.note || 'Follow-up scheduled'),
      completed: false,
      ownerName: req.user!.name,
    };
    cust.followUps.unshift(fu);
    saveDb(db);
    res.status(201).json(cust);
  });

  app.patch('/api/customers/:id/followups/:fuId', requireAuth, (req, res) => {
    const db = getDb();
    const cust = db.customers.find((c) => c.id === req.params.id);
    if (!cust) {
      res.status(404).json({ error: 'Customer not found.' });
      return;
    }
    const fu = cust.followUps.find((f) => f.id === req.params.fuId);
    if (fu) {
      fu.completed = Boolean(req.body?.completed);
      saveDb(db);
    }
    res.json(cust);
  });

  app.get('/api/opportunities', requireAuth, (_req, res) => {
    res.json(getDb().opportunities);
  });

  app.post('/api/opportunities', requireAuth, (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const b = req.body ?? {};
    const stageProbMap: Record<string, number> = {
      'New Lead': 15,
      Contacted: 25,
      'Qualified Lead': 35,
      'Technical Discussion': 45,
      'Product Demonstration': 55,
      'Quotation Submitted': 65,
      Negotiation: 80,
      'Purchase Order Received': 95,
      Won: 100,
      Lost: 0,
    };
    const stage = b.stage || 'New Lead';
    const opp = {
      id: `opp-${Date.now()}`,
      title: String(b.title || 'New Instrument Opportunity'),
      customerId: String(b.customerId || db.customers[0]?.id || ''),
      customerName: String(b.customerName || 'Prospective Lab'),
      customerType: b.customerType || 'Research Institutions',
      stage,
      value: Number(b.value) || 45000,
      probability: stageProbMap[stage] ?? 25,
      expectedCloseDate: String(b.expectedCloseDate || '2027-01-31'),
      assignedSalespersonId: req.user!.id,
      assignedSalespersonName: req.user!.name,
      interestedProductIds: Array.isArray(b.interestedProductIds) ? b.interestedProductIds : [],
      notes: String(b.notes || ''),
      createdAt: new Date().toISOString().slice(0, 10),
      updatedAt: new Date().toISOString().slice(0, 10),
    };
    db.opportunities.unshift(opp);
    saveDb(db);
    res.status(201).json(opp);
  });

  app.patch('/api/opportunities/:id', requireAuth, (req, res) => {
    const db = getDb();
    const opp = db.opportunities.find((o) => o.id === req.params.id);
    if (!opp) {
      res.status(404).json({ error: 'Opportunity not found.' });
      return;
    }
    const stageProbMap: Record<string, number> = {
      'New Lead': 15,
      Contacted: 25,
      'Qualified Lead': 35,
      'Technical Discussion': 45,
      'Product Demonstration': 55,
      'Quotation Submitted': 65,
      Negotiation: 80,
      'Purchase Order Received': 95,
      Won: 100,
      Lost: 0,
    };
    if (req.body?.stage) {
      opp.stage = req.body.stage;
      opp.probability = stageProbMap[req.body.stage] ?? opp.probability;
    }
    if (req.body?.notes !== undefined) opp.notes = String(req.body.notes);
    if (req.body?.value !== undefined) opp.value = Number(req.body.value);
    opp.updatedAt = new Date().toISOString().slice(0, 10);
    saveDb(db);
    res.json(opp);
  });

  // --- QUOTATIONS & WORKFLOW ---
  app.get('/api/quotations', requireAuth, (_req, res) => {
    res.json(getDb().quotations);
  });

  app.post('/api/quotations', requireAuth, (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const b = req.body ?? {};
    const qt = {
      id: `qt-${Date.now()}`,
      quoteNumber: `QT-2026-${1044 + db.quotations.length}`,
      templateType: b.templateType || 'Laboratory Instruments',
      customerId: String(b.customerId || ''),
      customerName: String(b.customerName || ''),
      customerContact: String(b.customerContact || ''),
      customerEmail: String(b.customerEmail || ''),
      customerLocation: String(b.customerLocation || ''),
      items: Array.isArray(b.items) ? b.items : [],
      subtotal: Number(b.subtotal) || 0,
      discountAmount: Number(b.discountAmount) || 0,
      taxRate: Number(b.taxRate) ?? 8,
      taxAmount: Number(b.taxAmount) || 0,
      totalAmount: Number(b.totalAmount) || 0,
      deliveryTerms: String(b.deliveryTerms || 'CIP Destination — 3 Weeks ARO'),
      paymentTerms: String(b.paymentTerms || '50% Advance, 50% Upon Delivery'),
      warrantyTerms: String(b.warrantyTerms || '24 Months Standard Warranty'),
      installationTraining: String(b.installationTraining || 'On-Site IQ/OQ & Operator Training Included'),
      validityDays: Number(b.validityDays) || 30,
      termsAndConditions: String(b.termsAndConditions || 'Standard Helios Analytical International Sales Terms apply.'),
      status: 'Draft' as const,
      createdBy: req.user!.name,
      createdAt: new Date().toISOString().slice(0, 10),
    };
    db.quotations.unshift(qt);
    saveDb(db);
    res.status(201).json(qt);
  });

  app.patch('/api/quotations/:id/status', requireAuth, (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const qt = db.quotations.find((q) => q.id === req.params.id);
    if (!qt) {
      res.status(404).json({ error: 'Quotation not found.' });
      return;
    }
    const nextStatus = req.body?.status;
    if (nextStatus === 'Approved' && !['admin', 'sales_manager'].includes(req.user!.role)) {
      res.status(403).json({ error: 'Only Admin or Sales Manager can approve quotations.' });
      return;
    }
    qt.status = nextStatus;
    if (nextStatus === 'Approved') {
      qt.approvedBy = req.user!.name;
    }
    saveDb(db);
    res.json(qt);
  });

  // --- MARKETING & HUMAN APPROVAL GATE ---
  app.get('/api/marketing', requireAuth, (_req, res) => {
    res.json(getDb().campaigns);
  });

  app.post('/api/marketing', requireAuth, (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const b = req.body ?? {};
    const cmp = {
      id: `cmp-${Date.now()}`,
      name: String(b.name || 'New Scientific Campaign'),
      channel: b.channel || 'LinkedIn',
      campaignType: String(b.campaignType || 'Product Launch'),
      status: 'Draft' as const,
      contentTitle: String(b.contentTitle || ''),
      contentBody: String(b.contentBody || ''),
      targetAudience: String(b.targetAudience || 'Analytical Laboratories'),
      scheduledDate: String(b.scheduledDate || new Date().toISOString().slice(0, 10)),
      reach: 0,
      impressions: 0,
      clicks: 0,
      leadsGenerated: 0,
      conversionRate: 0,
      cost: Number(b.cost) || 1500,
      revenueAttributed: 0,
      roi: 0,
      createdBy: req.user!.name,
      createdAt: new Date().toISOString().slice(0, 10),
    };
    db.campaigns.unshift(cmp);
    saveDb(db);
    res.status(201).json(cmp);
  });

  app.patch('/api/marketing/:id/status', requireAuth, (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const cmp = db.campaigns.find((c) => c.id === req.params.id);
    if (!cmp) {
      res.status(404).json({ error: 'Campaign not found.' });
      return;
    }
    const nextStatus = req.body?.status;
    // Enforce human approval before publishing
    if (nextStatus === 'Published' && cmp.status !== 'Approved') {
      res.status(400).json({ error: 'Human approval is required before publishing marketing content.' });
      return;
    }
    if (nextStatus === 'Approved' && !['admin', 'sales_manager', 'marketing'].includes(req.user!.role)) {
      res.status(403).json({ error: 'Only Admin, Sales Manager, or Marketing Lead can approve content.' });
      return;
    }
    cmp.status = nextStatus;
    if (nextStatus === 'Approved') {
      cmp.approvedBy = req.user!.name;
    }
    saveDb(db);
    res.json(cmp);
  });

  // --- INVENTORY, PROCUREMENT, DELIVERIES, INSTALLATIONS, SERVICE ---
  app.get('/api/operations', requireAuth, (_req, res) => {
    const db = getDb();
    res.json({
      inventoryUnits: db.inventoryUnits,
      suppliers: db.suppliers,
      purchaseOrders: db.purchaseOrders,
      deliveries: db.deliveries,
      installations: db.installations,
      serviceRequests: db.serviceRequests,
      publicInquiries: db.publicInquiries,
      users: db.users.map(({ passwordHash: _ph, ...u }) => u),
    });
  });

  app.post('/api/operations/inventory', requireAuth, requireRoles('admin', 'procurement', 'sales_manager'), (req, res) => {
    const db = getDb();
    const b = req.body ?? {};
    const product = db.products.find((p) => p.id === b.productId);
    const unit = {
      id: `inv-${Date.now()}`,
      productId: String(b.productId || ''),
      productName: product ? product.name : String(b.productName || 'Instrument Unit'),
      modelNumber: product ? product.modelNumber : String(b.modelNumber || 'N/A'),
      serialNumber: String(b.serialNumber || `SN-${Date.now().toString().slice(-6)}`),
      batchNumber: String(b.batchNumber || `B-${new Date().getFullYear()}-01`),
      warehouseLocation: String(b.warehouseLocation || 'Frankfurt Central Depot'),
      status: (b.status || 'Available') as 'Available' | 'Reserved' | 'In Transit' | 'Installed',
      receivedDate: new Date().toISOString().slice(0, 10),
      assignedCustomer: b.assignedCustomer ? String(b.assignedCustomer) : undefined,
    };
    db.inventoryUnits.unshift(unit);
    if (product && unit.status === 'Available') {
      product.stockQty += 1;
      product.stockStatus = product.stockQty > 3 ? 'In Stock' : 'Low Stock';
    }
    saveDb(db);
    res.status(201).json(unit);
  });

  app.post('/api/operations/purchase-orders', requireAuth, requireRoles('admin', 'procurement', 'sales_manager'), (req, res) => {
    const db = getDb();
    const b = req.body ?? {};
    const sup = db.suppliers.find((s) => s.id === b.supplierId);
    const po = {
      id: `po-${Date.now()}`,
      poNumber: `${b.type === 'Purchase Request' ? 'PR' : 'PO'}-2026-${503 + db.purchaseOrders.length}`,
      type: (b.type || 'Purchase Request') as 'Purchase Request' | 'Purchase Order',
      supplierId: String(b.supplierId || ''),
      supplierName: sup ? sup.name : String(b.supplierName || 'Approved OEM Supplier'),
      itemsSummary: String(b.itemsSummary || ''),
      quantity: Number(b.quantity) || 1,
      totalCost: Number(b.totalCost) || 0,
      status: 'Requested' as const,
      expectedDeliveryDate: String(b.expectedDeliveryDate || '2026-12-20'),
      createdAt: new Date().toISOString().slice(0, 10),
    };
    db.purchaseOrders.unshift(po);
    saveDb(db);
    res.status(201).json(po);
  });

  app.patch('/api/operations/purchase-orders/:id', requireAuth, requireRoles('admin', 'procurement', 'sales_manager'), (req, res) => {
    const db = getDb();
    const po = db.purchaseOrders.find((p) => p.id === req.params.id);
    if (!po) {
      res.status(404).json({ error: 'Purchase order not found.' });
      return;
    }
    po.status = req.body?.status || po.status;
    if (po.status === 'Ordered' && po.type === 'Purchase Request') {
      po.type = 'Purchase Order';
    }
    if (po.status === 'Goods Received') {
      po.receivedDate = new Date().toISOString().slice(0, 10);
    }
    saveDb(db);
    res.json(po);
  });

  app.patch('/api/operations/deliveries/:id', requireAuth, (req, res) => {
    const db = getDb();
    const del = db.deliveries.find((d) => d.id === req.params.id);
    if (!del) {
      res.status(404).json({ error: 'Delivery record not found.' });
      return;
    }
    del.status = req.body?.status || del.status;
    saveDb(db);
    res.json(del);
  });

  app.patch('/api/operations/installations/:id', requireAuth, (req, res) => {
    const db = getDb();
    const ins = db.installations.find((i) => i.id === req.params.id);
    if (!ins) {
      res.status(404).json({ error: 'Installation record not found.' });
      return;
    }
    if (req.body?.status) ins.status = req.body.status;
    if (Array.isArray(req.body?.checklistCompleted)) ins.checklistCompleted = req.body.checklistCompleted;
    saveDb(db);
    res.json(ins);
  });

  app.post('/api/operations/service', requireAuth, (req, res) => {
    const db = getDb();
    const b = req.body ?? {};
    const srv = {
      id: `srv-${Date.now()}`,
      ticketNumber: `SRV-2026-${773 + db.serviceRequests.length}`,
      customerName: String(b.customerName || ''),
      productName: String(b.productName || ''),
      serialNumber: String(b.serialNumber || ''),
      requestType: b.requestType || 'Preventive Maintenance',
      priority: b.priority || 'Routine',
      assignedEngineer: String(b.assignedEngineer || 'Tariq Al-Mansoor'),
      status: 'Open' as const,
      scheduledDate: String(b.scheduledDate || new Date().toISOString().slice(0, 10)),
      notes: String(b.notes || ''),
    };
    db.serviceRequests.unshift(srv);
    saveDb(db);
    res.status(201).json(srv);
  });

  app.patch('/api/operations/service/:id', requireAuth, (req, res) => {
    const db = getDb();
    const srv = db.serviceRequests.find((s) => s.id === req.params.id);
    if (!srv) {
      res.status(404).json({ error: 'Service ticket not found.' });
      return;
    }
    if (req.body?.status) srv.status = req.body.status;
    if (req.body?.notes !== undefined) srv.notes = String(req.body.notes);
    saveDb(db);
    res.json(srv);
  });

  app.post('/api/operations/inquiries/:id/convert', requireAuth, (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const inq = db.publicInquiries.find((i) => i.id === req.params.id);
    if (!inq) {
      res.status(404).json({ error: 'Inquiry not found.' });
      return;
    }
    const cust = {
      id: `cust-${Date.now()}`,
      institutionName: inq.institutionName,
      type: 'Private Testing Laboratories' as const,
      country: inq.country,
      city: '',
      department: 'Laboratory Procurement',
      contacts: [{ name: inq.contactName, title: 'Lab Representative', email: inq.email, phone: inq.phone }],
      researchInterests: inq.productInterest,
      instrumentRequirements: inq.message,
      existingInstruments: [],
      purchasingHistory: [],
      potentialValue: 75000,
      assignedSalespersonId: req.user!.id,
      assignedSalespersonName: req.user!.name,
      followUps: [],
    };
    db.customers.unshift(cust);
    db.opportunities.unshift({
      id: `opp-${Date.now()}`,
      title: `${inq.institutionName} — ${inq.productInterest}`,
      customerId: cust.id,
      customerName: cust.institutionName,
      customerType: cust.type,
      stage: 'New Lead',
      value: 75000,
      probability: 15,
      expectedCloseDate: '2027-01-31',
      assignedSalespersonId: req.user!.id,
      assignedSalespersonName: req.user!.name,
      interestedProductIds: [],
      notes: `Converted from website ${inq.type}: ${inq.message}`,
      createdAt: new Date().toISOString().slice(0, 10),
      updatedAt: new Date().toISOString().slice(0, 10),
    });
    inq.status = 'Converted to CRM';
    saveDb(db);
    res.json({ customer: cust, inquiry: inq });
  });

  // --- GEMINI AI ROUTES (SERVER-SIDE ONLY) ---
  app.post('/api/ai/leads', requireAuth, async (req, res) => {
    try {
      const db = getDb();
      const result = await generateLeadIntelligence({
        ...req.body,
        products: db.products,
      });
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'AI lead generation failed.' });
    }
  });

  app.post('/api/ai/sales-assistant', requireAuth, async (req, res) => {
    try {
      const db = getDb();
      const customer = req.body?.customerId
        ? db.customers.find((c) => c.id === req.body.customerId) ?? null
        : null;
      const result = await runSalesAssistant({
        mode: String(req.body?.mode || 'Recommend Instruments'),
        query: String(req.body?.query || ''),
        customerContext: customer,
        selectedProductIds: Array.isArray(req.body?.selectedProductIds) ? req.body.selectedProductIds : [],
        products: db.products,
      });
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'AI sales assistant failed.' });
    }
  });

  app.post('/api/ai/marketing', requireAuth, async (req, res) => {
    try {
      const db = getDb();
      const result = await generateMarketingContent({
        format: String(req.body?.format || 'LinkedIn Post'),
        topic: String(req.body?.topic || ''),
        targetAudience: String(req.body?.targetAudience || 'Analytical Laboratory Managers'),
        productId: req.body?.productId,
        tone: req.body?.tone,
        products: db.products,
      });
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'AI marketing generation failed.' });
    }
  });

  app.post('/api/ai/forecast', requireAuth, async (_req, res) => {
    try {
      const db = getDb();
      const result = await generateSalesForecast({
        historicalSales: db.historicalSales,
        opportunities: db.opportunities,
        products: db.products,
      });
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'AI forecasting failed.' });
    }
  });

  // --- VITE / STATIC FRONTEND SERVING ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('/{*splat}', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(3000, '0.0.0.0', () => {
    console.log('Helios Analytical server listening on http://0.0.0.0:3000');
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
