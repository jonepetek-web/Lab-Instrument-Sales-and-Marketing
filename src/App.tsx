import {
  BarChart3,
  Bot,
  Briefcase,
  FileSpreadsheet,
  Globe,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Menu,
  Microscope,
  Moon,
  PackageCheck,
  Shield,
  Sparkles,
  Sun,
  TrendingUp,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { AdminTeamView } from './components/AdminTeamView.tsx';
import { AiLeadGenView } from './components/AiLeadGenView.tsx';
import { AiSalesAssistantView } from './components/AiSalesAssistantView.tsx';
import { CrmPipelineView } from './components/CrmPipelineView.tsx';
import { DashboardView } from './components/DashboardView.tsx';
import { ForecastingView } from './components/ForecastingView.tsx';
import { LoginModal } from './components/LoginModal.tsx';
import { MarketingView } from './components/MarketingView.tsx';
import { OperationsView } from './components/OperationsView.tsx';
import { ProductsView } from './components/ProductsView.tsx';
import { PublicWebsite } from './components/PublicWebsite.tsx';
import { QuotationsView } from './components/QuotationsView.tsx';
import type { UserAccount } from './types/platform.ts';
import { apiFetch, getStoredToken, setStoredToken } from './utils/api.ts';

type WorkspaceTab =
  | 'dashboard'
  | 'products'
  | 'crm'
  | 'ai_leads'
  | 'ai_sales'
  | 'quotations'
  | 'marketing'
  | 'forecasting'
  | 'operations'
  | 'admin';

const NAV_ITEMS: { id: WorkspaceTab; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'dashboard', label: 'Executive Dashboard', icon: LayoutDashboard },
  { id: 'products', label: 'Instrument Catalogue', icon: Microscope },
  { id: 'crm', label: 'Sales CRM & Pipeline', icon: Briefcase },
  { id: 'ai_leads', label: 'AI Lead Generation', icon: Sparkles },
  { id: 'ai_sales', label: 'AI Sales Assistant', icon: Bot },
  { id: 'quotations', label: 'Quotations & PDFs', icon: FileSpreadsheet },
  { id: 'marketing', label: 'Marketing & AI Studio', icon: Megaphone },
  { id: 'forecasting', label: 'AI Sales Forecasting', icon: TrendingUp },
  { id: 'operations', label: 'Inventory & Service', icon: PackageCheck },
  { id: 'admin', label: 'Roles & Governance', icon: Shield },
];

export default function App() {
  const [darkMode, setDarkMode] = useState(false);
  const [surface, setSurface] = useState<'website' | 'workspace'>('website');
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('dashboard');
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) root.classList.add('dark');
    else root.classList.remove('dark');
  }, [darkMode]);

  useEffect(() => {
    const token = getStoredToken();
    if (!token) return;
    apiFetch<{ user: UserAccount }>('/api/auth/me')
      .then((res) => {
        setCurrentUser(res.user);
      })
      .catch(() => {
        setStoredToken(null);
      });
  }, []);

  function handleLogout() {
    setStoredToken(null);
    setCurrentUser(null);
    setSurface('website');
  }

  if (surface === 'website' || !currentUser) {
    return (
      <>
        <PublicWebsite
          darkMode={darkMode}
          onToggleDarkMode={() => setDarkMode((d) => !d)}
          onOpenStaffLogin={() => setShowLoginModal(true)}
          isAuthenticated={Boolean(currentUser)}
          onReturnToWorkspace={() => setSurface('workspace')}
        />
        {showLoginModal && (
          <LoginModal
            onClose={() => setShowLoginModal(false)}
            onAuthenticated={(user) => {
              setCurrentUser(user);
              setShowLoginModal(false);
              setSurface('workspace');
            }}
          />
        )}
      </>
    );
  }

  const activeNav = NAV_ITEMS.find((n) => n.id === activeTab);

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="h-16 px-5 flex items-center border-b border-slate-200 dark:border-slate-800">
          <span className="text-base font-display font-bold tracking-tight whitespace-nowrap">
            Helios Analytical
          </span>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-slate-900 text-white dark:bg-cyan-700 dark:text-white'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
          <button
            type="button"
            onClick={() => setSurface('website')}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-cyan-700 dark:text-cyan-400 border border-slate-200 dark:border-slate-800 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            <Globe className="w-4 h-4" /> Public Catalogue Site
          </button>

          <div className="p-2.5 rounded-md bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 text-xs">
            <div className="font-semibold truncate">{currentUser.name}</div>
            <div className="text-[11px] text-slate-500 truncate">{currentUser.title}</div>
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowLoginModal(true)}
                className="text-[11px] text-cyan-700 dark:text-cyan-400 hover:underline"
              >
                Switch Role
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-rose-600"
              >
                <LogOut className="w-3 h-3" /> Sign Out
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden bg-slate-950/60 flex">
          <div className="w-72 bg-white dark:bg-slate-900 h-full p-4 flex flex-col justify-between border-r border-slate-200 dark:border-slate-800">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
                <span className="font-display font-bold">Helios Analytical</span>
                <button type="button" onClick={() => setMobileMenuOpen(false)}>
                  <X className="w-5 h-5" />
                </button>
              </div>
              <nav className="mt-4 space-y-1">
                {NAV_ITEMS.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setActiveTab(item.id);
                        setMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-md ${
                        activeTab === item.id
                          ? 'bg-slate-900 text-white dark:bg-cyan-700'
                          : 'text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>
            <div className="space-y-2 border-t border-slate-200 dark:border-slate-800 pt-3">
              <button
                type="button"
                onClick={() => {
                  setSurface('website');
                  setMobileMenuOpen(false);
                }}
                className="w-full px-3 py-2 text-xs font-medium border border-slate-200 dark:border-slate-800 rounded-md"
              >
                Public Catalogue Site
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="w-full px-3 py-2 text-xs font-medium text-rose-600 border border-slate-200 dark:border-slate-800 rounded-md"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-16 px-6 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-1.5 border border-slate-200 dark:border-slate-800 rounded-md"
            >
              <Menu className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 truncate">
              <BarChart3 className="w-4 h-4 text-cyan-700 dark:text-cyan-400 shrink-0" />
              <span>Workspace</span>
              <span>/</span>
              <span className="font-semibold text-slate-900 dark:text-white truncate">
                {activeNav?.label}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setDarkMode((d) => !d)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-slate-200 dark:border-slate-800 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap"
            >
              {darkMode ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
              {darkMode ? 'Light' : 'Dark'}
            </button>

            <button
              type="button"
              onClick={() => setShowLoginModal(true)}
              className="px-3 py-1.5 text-xs font-medium bg-slate-100 dark:bg-slate-800 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 whitespace-nowrap"
            >
              {currentUser.name} ({currentUser.role})
            </button>
          </div>
        </header>

        <main className="flex-1 p-6 max-w-[1440px] w-full mx-auto">
          {activeTab === 'dashboard' && <DashboardView onNavigate={(t) => setActiveTab(t as WorkspaceTab)} />}
          {activeTab === 'products' && <ProductsView currentUser={currentUser} />}
          {activeTab === 'crm' && <CrmPipelineView />}
          {activeTab === 'ai_leads' && <AiLeadGenView />}
          {activeTab === 'ai_sales' && <AiSalesAssistantView />}
          {activeTab === 'quotations' && <QuotationsView currentUser={currentUser} />}
          {activeTab === 'marketing' && <MarketingView currentUser={currentUser} />}
          {activeTab === 'forecasting' && <ForecastingView />}
          {activeTab === 'operations' && <OperationsView currentUser={currentUser} />}
          {activeTab === 'admin' && <AdminTeamView currentUser={currentUser} />}
        </main>
      </div>

      {showLoginModal && (
        <LoginModal
          onClose={() => setShowLoginModal(false)}
          onAuthenticated={(user) => {
            setCurrentUser(user);
            setShowLoginModal(false);
          }}
        />
      )}
    </div>
  );
}
