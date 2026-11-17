import { CheckCircle2, Plus, Truck, Wrench, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import type {
  DeliveryRecord,
  InstallationRecord,
  InventoryUnit,
  Product,
  PublicInquiry,
  PurchaseOrder,
  ServiceRequest,
  Supplier,
  UserAccount,
} from '../types/platform.ts';
import { apiFetch } from '../utils/api.ts';

interface OperationsPayload {
  inventoryUnits: InventoryUnit[];
  suppliers: Supplier[];
  purchaseOrders: PurchaseOrder[];
  deliveries: DeliveryRecord[];
  installations: InstallationRecord[];
  serviceRequests: ServiceRequest[];
  publicInquiries: PublicInquiry[];
}

export function OperationsView({ currentUser }: { currentUser: UserAccount }) {
  const [tab, setTab] = useState<'inventory' | 'procurement' | 'deliveries' | 'service' | 'inquiries'>('inventory');
  const [data, setData] = useState<OperationsPayload | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [showAddUnit, setShowAddUnit] = useState(false);
  const [showAddPo, setShowAddPo] = useState(false);
  const [showAddTicket, setShowAddTicket] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const [newUnit, setNewUnit] = useState({
    productId: '',
    serialNumber: '',
    batchNumber: '',
    warehouseLocation: 'Frankfurt Central Depot · Bay A1',
    status: 'Available',
  });

  const [newPo, setNewPo] = useState({
    type: 'Purchase Request',
    supplierId: '',
    itemsSummary: '',
    quantity: 1,
    totalCost: 25000,
    expectedDeliveryDate: '2026-12-22',
  });

  const [newTicket, setNewTicket] = useState({
    customerName: '',
    productName: '',
    serialNumber: '',
    requestType: 'Calibration',
    priority: 'Routine',
    scheduledDate: '2026-11-25',
    notes: '',
  });

  const canManageProcurement = ['admin', 'sales_manager', 'procurement'].includes(currentUser.role);

  async function loadAll() {
    const [ops, prods] = await Promise.all([
      apiFetch<OperationsPayload>('/api/operations'),
      apiFetch<Product[]>('/api/products'),
    ]);
    setData(ops);
    setProducts(prods);
    if (prods[0] && !newUnit.productId) setNewUnit((u) => ({ ...u, productId: prods[0].id }));
    if (ops.suppliers[0] && !newPo.supplierId) setNewPo((p) => ({ ...p, supplierId: ops.suppliers[0].id }));
  }

  useEffect(() => {
    loadAll();
  }, []);

  async function handleAddInventoryUnit(e: React.FormEvent) {
    e.preventDefault();
    await apiFetch('/api/operations/inventory', {
      method: 'POST',
      body: JSON.stringify(newUnit),
    });
    setShowAddUnit(false);
    setNotice('Serial/Batch inventory unit logged.');
    loadAll();
  }

  async function handleAddPo(e: React.FormEvent) {
    e.preventDefault();
    await apiFetch('/api/operations/purchase-orders', {
      method: 'POST',
      body: JSON.stringify(newPo),
    });
    setShowAddPo(false);
    setNotice(`${newPo.type} created.`);
    loadAll();
  }

  async function updatePoStatus(id: string, status: string) {
    await apiFetch(`/api/operations/purchase-orders/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    loadAll();
  }

  async function updateDeliveryStatus(id: string, status: string) {
    await apiFetch(`/api/operations/deliveries/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    loadAll();
  }

  async function updateInstallation(id: string, status: string) {
    await apiFetch(`/api/operations/installations/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    loadAll();
  }

  async function handleAddTicket(e: React.FormEvent) {
    e.preventDefault();
    await apiFetch('/api/operations/service', {
      method: 'POST',
      body: JSON.stringify(newTicket),
    });
    setShowAddTicket(false);
    setNotice('Service ticket created.');
    loadAll();
  }

  async function updateTicketStatus(id: string, status: string) {
    await apiFetch(`/api/operations/service/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    loadAll();
  }

  async function convertInquiryToCrm(id: string) {
    await apiFetch(`/api/operations/inquiries/${id}/convert`, { method: 'POST' });
    setNotice('Website inquiry converted into CRM Customer & New Lead opportunity.');
    loadAll();
  }

  if (!data) {
    return <div className="p-8 text-xs text-slate-500">Loading operations and procurement data...</div>;
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold">
            Inventory, Procurement, Installations & Service
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Serial & batch tracking, OEM suppliers, purchase orders, goods received, deliveries, IQ/OQ commissioning, and after-sales service.
          </p>
        </div>

        <div className="flex flex-wrap p-1 bg-slate-100 dark:bg-slate-800 rounded-md gap-1">
          {(
            [
              { id: 'inventory', label: `Serial & Batch (${data.inventoryUnits.length})` },
              { id: 'procurement', label: `Procurement & POs (${data.purchaseOrders.length})` },
              { id: 'deliveries', label: `Deliveries & IQ/OQ (${data.deliveries.length + data.installations.length})` },
              { id: 'service', label: `Service Tickets (${data.serviceRequests.length})` },
              { id: 'inquiries', label: `Website RFQs (${data.publicInquiries.length})` },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded whitespace-nowrap ${
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

      {notice && (
        <div className="p-3 text-xs bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200 dark:border-cyan-800 rounded-md flex justify-between">
          <span>{notice}</span>
          <button type="button" onClick={() => setNotice(null)}><X className="w-4 h-4" /></button>
        </div>
      )}

      {tab === 'inventory' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            {canManageProcurement && (
              <button
                type="button"
                onClick={() => setShowAddUnit(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-cyan-700 text-white rounded-md"
              >
                <Plus className="w-3.5 h-3.5" /> Register Serial / Batch Unit
              </button>
            )}
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 bg-slate-50 dark:bg-slate-950/60">
                  <th className="text-left py-3 px-4">Instrument & Model</th>
                  <th className="text-left py-3 px-3">Serial Number</th>
                  <th className="text-left py-3 px-3">Batch / Lot #</th>
                  <th className="text-left py-3 px-3">Warehouse / Site</th>
                  <th className="text-left py-3 px-3">Received</th>
                  <th className="text-right py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {data.inventoryUnits.map((u) => (
                  <tr key={u.id}>
                    <td className="py-2.5 px-4">
                      <div className="font-semibold">{u.productName}</div>
                      <div className="font-mono text-[11px] text-slate-500">{u.modelNumber}</div>
                    </td>
                    <td className="py-2.5 px-3 font-mono font-medium">{u.serialNumber}</td>
                    <td className="py-2.5 px-3 font-mono">{u.batchNumber}</td>
                    <td className="py-2.5 px-3">
                      <div>{u.warehouseLocation}</div>
                      {u.assignedCustomer && <div className="text-[11px] text-cyan-700 dark:text-cyan-400">{u.assignedCustomer}</div>}
                    </td>
                    <td className="py-2.5 px-3 font-mono">{u.receivedDate}</td>
                    <td className="py-2.5 px-4 text-right font-medium">{u.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'procurement' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-display font-semibold">Purchase Requests & Purchase Orders</h2>
            {canManageProcurement && (
              <button
                type="button"
                onClick={() => setShowAddPo(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-cyan-700 text-white rounded-md"
              >
                <Plus className="w-3.5 h-3.5" /> New Purchase Request / PO
              </button>
            )}
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 bg-slate-50 dark:bg-slate-950/60">
                  <th className="text-left py-3 px-4">Reference</th>
                  <th className="text-left py-3 px-3">Supplier</th>
                  <th className="text-left py-3 px-3">Items</th>
                  <th className="text-right py-3 px-3">Total Cost</th>
                  <th className="text-left py-3 px-3">Status</th>
                  <th className="text-right py-3 px-4">Workflow</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {data.purchaseOrders.map((po) => (
                  <tr key={po.id}>
                    <td className="py-2.5 px-4">
                      <div className="font-mono font-semibold">{po.poNumber}</div>
                      <div className="text-[11px] text-slate-500">{po.type} · ETA {po.expectedDeliveryDate}</div>
                    </td>
                    <td className="py-2.5 px-3">{po.supplierName}</td>
                    <td className="py-2.5 px-3">{po.itemsSummary}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-semibold tabular-nums">
                      ${po.totalCost.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 font-medium">{po.status}</td>
                    <td className="py-2.5 px-4 text-right">
                      {canManageProcurement && po.status === 'Requested' && (
                        <button
                          type="button"
                          onClick={() => updatePoStatus(po.id, 'Approved')}
                          className="px-2.5 py-1 text-[11px] bg-cyan-700 text-white rounded"
                        >
                          Approve
                        </button>
                      )}
                      {canManageProcurement && po.status === 'Approved' && (
                        <button
                          type="button"
                          onClick={() => updatePoStatus(po.id, 'Ordered')}
                          className="px-2.5 py-1 text-[11px] bg-slate-900 text-white dark:bg-white dark:text-slate-900 rounded"
                        >
                          Issue PO
                        </button>
                      )}
                      {canManageProcurement && po.status === 'Ordered' && (
                        <button
                          type="button"
                          onClick={() => updatePoStatus(po.id, 'Goods Received')}
                          className="px-2.5 py-1 text-[11px] bg-emerald-700 text-white rounded"
                        >
                          Mark Goods Received
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div>
            <h2 className="text-sm font-display font-semibold mb-3">Authorized OEM Supplier Database</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {data.suppliers.map((sup) => (
                <div key={sup.id} className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs space-y-1">
                  <div className="font-semibold text-sm">{sup.name}</div>
                  <div className="text-slate-500">{sup.country} · {sup.rating}</div>
                  <div className="font-mono text-[11px]">{sup.contactEmail}</div>
                  <div className="text-cyan-700 dark:text-cyan-400">
                    Avg Lead Time: {sup.leadTimeAvgDays}d · {sup.categories.join(', ')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'deliveries' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg space-y-3">
            <div className="flex items-center gap-2 text-sm font-display font-semibold">
              <Truck className="w-4 h-4 text-cyan-700 dark:text-cyan-400" /> Instrument Deliveries
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {data.deliveries.map((d) => (
                <div key={d.id} className="py-3 flex items-center justify-between gap-3">
                  <div>
                    <div className="font-semibold">{d.deliveryNumber} · {d.customerName}</div>
                    <div className="text-slate-500">{d.productName} ({d.serialNumber})</div>
                    <div className="text-[11px] text-slate-400">{d.carrier} · ETA {d.scheduledDate}</div>
                  </div>
                  <select
                    value={d.status}
                    onChange={(e) => updateDeliveryStatus(d.id, e.target.value)}
                    className="px-2 py-1 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded"
                  >
                    <option value="Scheduled">Scheduled</option>
                    <option value="In Transit">In Transit</option>
                    <option value="Delivered">Delivered</option>
                  </select>
                </div>
              ))}
            </div>
          </div>

          <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg space-y-3">
            <div className="flex items-center gap-2 text-sm font-display font-semibold">
              <CheckCircle2 className="w-4 h-4 text-cyan-700 dark:text-cyan-400" /> Field Installations (IQ/OQ/PQ)
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {data.installations.map((ins) => (
                <div key={ins.id} className="py-3 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{ins.installNumber} · {ins.customerName}</span>
                    <select
                      value={ins.status}
                      onChange={(e) => updateInstallation(ins.id, e.target.value)}
                      className="px-2 py-1 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded"
                    >
                      <option value="Pending">Pending</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Completed">Completed</option>
                    </select>
                  </div>
                  <div className="text-slate-500">
                    {ins.productName} ({ins.serialNumber}) · Eng: {ins.assignedEngineer}
                  </div>
                  <div className="text-[11px] text-cyan-700 dark:text-cyan-400">
                    Milestones: {ins.checklistCompleted.join(' → ')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'service' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setShowAddTicket(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-cyan-700 text-white rounded-md"
            >
              <Wrench className="w-3.5 h-3.5" /> Log Service / Calibration Ticket
            </button>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 bg-slate-50 dark:bg-slate-950/60">
                  <th className="text-left py-3 px-4">Ticket # & Type</th>
                  <th className="text-left py-3 px-3">Customer & Instrument</th>
                  <th className="text-left py-3 px-3">Priority & Schedule</th>
                  <th className="text-left py-3 px-3">Engineer Notes</th>
                  <th className="text-right py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {data.serviceRequests.map((srv) => (
                  <tr key={srv.id}>
                    <td className="py-3 px-4">
                      <div className="font-mono font-semibold">{srv.ticketNumber}</div>
                      <div className="text-[11px] text-slate-500">{srv.requestType}</div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-medium">{srv.customerName}</div>
                      <div className="text-[11px] text-slate-500">{srv.productName} · {srv.serialNumber}</div>
                    </td>
                    <td className="py-3 px-3">
                      <div className={srv.priority === 'Critical' ? 'text-rose-600 font-semibold' : ''}>{srv.priority}</div>
                      <div className="font-mono text-[11px] text-slate-500">{srv.scheduledDate}</div>
                    </td>
                    <td className="py-3 px-3 max-w-xs text-slate-600 dark:text-slate-400">{srv.notes}</td>
                    <td className="py-3 px-4 text-right">
                      <select
                        value={srv.status}
                        onChange={(e) => updateTicketStatus(srv.id, e.target.value)}
                        className="px-2 py-1 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded"
                      >
                        <option value="Open">Open</option>
                        <option value="Dispatched">Dispatched</option>
                        <option value="Resolved">Resolved</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'inquiries' && (
        <div className="space-y-3">
          {data.publicInquiries.map((inq) => (
            <div
              key={inq.id}
              className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs"
            >
              <div className="space-y-1">
                <div className="font-mono text-[11px] text-cyan-700 dark:text-cyan-400">
                  {inq.type} · {inq.createdAt} · {inq.country}
                </div>
                <div className="text-sm font-display font-bold">{inq.institutionName}</div>
                <div className="text-slate-600 dark:text-slate-300">
                  {inq.contactName} ({inq.email} {inq.phone ? `· ${inq.phone}` : ''})
                </div>
                <div className="text-slate-500">
                  Interest: {inq.productInterest} — {inq.message}
                </div>
              </div>
              <div className="shrink-0">
                {inq.status === 'Converted to CRM' ? (
                  <span className="text-emerald-700 dark:text-emerald-400 font-semibold">
                    ● Converted to CRM Lead
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => convertInquiryToCrm(inq.id)}
                    className="px-3.5 py-2 bg-cyan-700 text-white font-semibold rounded-md hover:bg-cyan-800"
                  >
                    Convert to CRM Account & Deal
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      {showAddUnit && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
          <form onSubmit={handleAddInventoryUnit} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg max-w-md w-full p-6 space-y-3 text-xs">
            <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-display font-bold">Register Inventory Serial / Batch</h3>
              <button type="button" onClick={() => setShowAddUnit(false)}><X className="w-4 h-4" /></button>
            </div>
            <div>
              <label className="block font-medium mb-1">Product</label>
              <select value={newUnit.productId} onChange={(e) => setNewUnit({ ...newUnit, productId: e.target.value })} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md">
                {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block font-medium mb-1">Serial Number *</label>
              <input required value={newUnit.serialNumber} onChange={(e) => setNewUnit({ ...newUnit, serialNumber: e.target.value })} placeholder="SN-2026-..." className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md font-mono" />
            </div>
            <div>
              <label className="block font-medium mb-1">Batch / Lot Number</label>
              <input value={newUnit.batchNumber} onChange={(e) => setNewUnit({ ...newUnit, batchNumber: e.target.value })} placeholder="B-2026-..." className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md font-mono" />
            </div>
            <div>
              <label className="block font-medium mb-1">Warehouse Location</label>
              <input value={newUnit.warehouseLocation} onChange={(e) => setNewUnit({ ...newUnit, warehouseLocation: e.target.value })} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setShowAddUnit(false)} className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-md">Cancel</button>
              <button type="submit" className="px-4 py-2 bg-cyan-700 text-white font-semibold rounded-md">Save Unit</button>
            </div>
          </form>
        </div>
      )}

      {showAddPo && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
          <form onSubmit={handleAddPo} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg max-w-md w-full p-6 space-y-3 text-xs">
            <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-display font-bold">New Purchase Request / Order</h3>
              <button type="button" onClick={() => setShowAddPo(false)}><X className="w-4 h-4" /></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-medium mb-1">Type</label>
                <select value={newPo.type} onChange={(e) => setNewPo({ ...newPo, type: e.target.value })} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md">
                  <option value="Purchase Request">Purchase Request</option>
                  <option value="Purchase Order">Purchase Order</option>
                </select>
              </div>
              <div>
                <label className="block font-medium mb-1">Supplier</label>
                <select value={newPo.supplierId} onChange={(e) => setNewPo({ ...newPo, supplierId: e.target.value })} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md">
                  {data.suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block font-medium mb-1">Items Summary *</label>
              <input required value={newPo.itemsSummary} onChange={(e) => setNewPo({ ...newPo, itemsSummary: e.target.value })} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-medium mb-1">Total Cost (USD)</label>
                <input type="number" value={newPo.totalCost} onChange={(e) => setNewPo({ ...newPo, totalCost: Number(e.target.value) })} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md font-mono" />
              </div>
              <div>
                <label className="block font-medium mb-1">Expected Delivery</label>
                <input type="date" value={newPo.expectedDeliveryDate} onChange={(e) => setNewPo({ ...newPo, expectedDeliveryDate: e.target.value })} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md font-mono" />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setShowAddPo(false)} className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-md">Cancel</button>
              <button type="submit" className="px-4 py-2 bg-cyan-700 text-white font-semibold rounded-md">Submit Request</button>
            </div>
          </form>
        </div>
      )}

      {showAddTicket && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
          <form onSubmit={handleAddTicket} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg max-w-md w-full p-6 space-y-3 text-xs">
            <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-display font-bold">Create Service & Maintenance Ticket</h3>
              <button type="button" onClick={() => setShowAddTicket(false)}><X className="w-4 h-4" /></button>
            </div>
            <div>
              <label className="block font-medium mb-1">Customer Institution *</label>
              <input required value={newTicket.customerName} onChange={(e) => setNewTicket({ ...newTicket, customerName: e.target.value })} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md" />
            </div>
            <div>
              <label className="block font-medium mb-1">Instrument *</label>
              <input required value={newTicket.productName} onChange={(e) => setNewTicket({ ...newTicket, productName: e.target.value })} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-medium mb-1">Request Type</label>
                <select value={newTicket.requestType} onChange={(e) => setNewTicket({ ...newTicket, requestType: e.target.value })} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md">
                  <option value="Preventive Maintenance">Preventive Maintenance</option>
                  <option value="Calibration">Calibration</option>
                  <option value="Repair">Repair</option>
                  <option value="Application Support">Application Support</option>
                </select>
              </div>
              <div>
                <label className="block font-medium mb-1">Priority</label>
                <select value={newTicket.priority} onChange={(e) => setNewTicket({ ...newTicket, priority: e.target.value })} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md">
                  <option value="Routine">Routine</option>
                  <option value="Urgent">Urgent</option>
                  <option value="Critical">Critical</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block font-medium mb-1">Issue / Scope Notes</label>
              <textarea rows={2} value={newTicket.notes} onChange={(e) => setNewTicket({ ...newTicket, notes: e.target.value })} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setShowAddTicket(false)} className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-md">Cancel</button>
              <button type="submit" className="px-4 py-2 bg-cyan-700 text-white font-semibold rounded-md">Log Ticket</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
