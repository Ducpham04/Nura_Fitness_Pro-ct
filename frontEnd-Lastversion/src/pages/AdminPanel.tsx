import { useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Activity,
  BarChart3,
  Dumbbell,
  Gift,
  Database,
  Edit3,
  ListChecks,
  Loader2,
  Plus,
  RefreshCcw,
  Save,
  Search,
  Shield,
  Target,
  Trash2,
  Utensils,
  Users,
  WalletCards,
  X,
} from 'lucide-react';
import { useAuthContext } from '../context/AuthContext';
import {
  adminModules,
  adminService,
  type AdminDashboardStats,
  type AdminFieldConfig,
  type AdminModuleConfig,
  type AdminModuleKey,
} from '../services/adminService';

type AdminTab = 'dashboard' | AdminModuleKey;

const navGroups: {
  label: string;
  description: string;
  items: { id: AdminTab; label: string; icon: typeof BarChart3 }[];
}[] = [
  {
    label: 'Command Center',
    description: 'System health and daily operations',
    items: [{ id: 'dashboard', label: 'Overview', icon: BarChart3 }],
  },
  {
    label: 'People Operations',
    description: 'Accounts, roles and body profile data',
    items: [
      { id: 'users', label: 'Accounts', icon: Users },
      { id: 'informationBody', label: 'Body Profiles', icon: Activity },
    ],
  },
  {
    label: 'Fitness Content',
    description: 'Goals, challenges and training programs',
    items: [
      { id: 'goals', label: 'Goal Taxonomy', icon: Target },
      { id: 'challenges', label: 'Challenge Library', icon: Dumbbell },
      { id: 'trainingPlans', label: 'Training Programs', icon: ListChecks },
      { id: 'trainingDetails', label: 'Program Schedule', icon: Database },
    ],
  },
  {
    label: 'Nutrition Operations',
    description: 'Ingredient catalog, dishes and recipe logic',
    items: [
      { id: 'foods', label: 'Ingredient Catalog', icon: Database },
      { id: 'dishes', label: 'Meal Catalog', icon: Utensils },
    ],
  },
  {
    label: 'Rewards & Finance',
    description: 'Reward inventory and point ledger',
    items: [
      { id: 'rewards', label: 'Reward Catalog', icon: Gift },
      { id: 'transactions', label: 'Point Ledger', icon: WalletCards },
    ],
  },
];

const moduleCopy: Record<AdminTab, { eyebrow: string; title: string; description: string }> = {
  dashboard: {
    eyebrow: 'Command Center',
    title: 'Admin Operations',
    description: 'Theo dõi sức khỏe vận hành và đi nhanh vào các workspace quản trị chính.',
  },
  users: {
    eyebrow: 'People Operations',
    title: 'User Accounts',
    description: 'Quản lý tài khoản, role và trạng thái truy cập của người dùng.',
  },
  goals: {
    eyebrow: 'Fitness Content',
    title: 'Goal Taxonomy',
    description: 'Quản lý mục tiêu nền cho challenge, training và onboarding.',
  },
  challenges: {
    eyebrow: 'Fitness Content',
    title: 'Challenge Library',
    description: 'Quản lý bài challenge, rule AI pose, video mẫu và trạng thái xuất bản.',
  },
  trainingPlans: {
    eyebrow: 'Fitness Content',
    title: 'Training Programs',
    description: 'Quản lý template kế hoạch tập luyện theo goal, độ khó và thời lượng.',
  },
  trainingDetails: {
    eyebrow: 'Fitness Content',
    title: 'Program Schedule',
    description: 'Quản lý từng ngày/bài trong training plan.',
  },
  foods: {
    eyebrow: 'Nutrition Operations',
    title: 'Ingredient Catalog',
    description: 'Quản lý master nguyên liệu, macro và dữ liệu nền cho meal solver.',
  },
  dishes: {
    eyebrow: 'Nutrition Operations',
    title: 'Meal Catalog & Recipes',
    description: 'Quản lý món ăn và công thức DishIngredient cho Smart Meal Plan.',
  },
  rewards: {
    eyebrow: 'Rewards & Finance',
    title: 'Reward Catalog',
    description: 'Quản lý phần thưởng, điểm đổi và tồn kho reward.',
  },
  transactions: {
    eyebrow: 'Rewards & Finance',
    title: 'Point Ledger',
    description: 'Theo dõi và điều chỉnh giao dịch điểm/thưởng của người dùng.',
  },
  informationBody: {
    eyebrow: 'People Operations',
    title: 'Body Profiles',
    description: 'Quản lý dữ liệu cơ thể/onboarding phục vụ cá nhân hóa.',
  },
};

const workspaceCards = navGroups
  .filter((group) => group.items[0]?.id !== 'dashboard')
  .map((group) => ({
    ...group,
    primaryTab: group.items[0].id,
    totalTools: group.items.length,
  }));

const dashboardCopy: Record<string, { title: string; description: string }> = {
  userStats: { title: 'Users', description: 'Tăng trưởng và trạng thái tài khoản' },
  challengeStats: { title: 'Challenges', description: 'Hoạt động challenge và submission' },
  trainingStats: { title: 'Training', description: 'Training plan và tiến độ luyện tập' },
  nutritionStats: { title: 'Nutrition', description: 'Smart meal plan và nutrition usage' },
  rewardStats: { title: 'Rewards', description: 'Reward catalog và đổi thưởng' },
};

function labelize(value: string) {
  return value
    .replace(/([A-Z])/g, ' $1')
    .replace(/[_-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^./, (char) => char.toUpperCase());
}

function unwrapDisplayValue(value: unknown): string {
  if (value === null || value === undefined) return '-';
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    return String(obj.name || obj.title || obj.email || obj.id || obj.dishName || '[object]');
  }
  if (typeof value === 'number') return Number.isInteger(value) ? value.toLocaleString() : value.toFixed(2);
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return String(value);
}

function getId(row: any, module: AdminModuleConfig) {
  return row?.[module.idField] ?? row?.id ?? row?.goalId ?? row?.challengeId ?? row?.txId ?? row?.rewardId;
}

function toPayload(form: Record<string, string | boolean>, fields: AdminFieldConfig[]) {
  return fields.reduce<Record<string, unknown>>((payload, field) => {
    const raw = form[field.name];
    if (raw === '' || raw === undefined) return payload;
    if (field.type === 'number') {
      payload[field.name] = Number(raw);
    } else if (field.type === 'boolean') {
      payload[field.name] = Boolean(raw);
    } else {
      payload[field.name] = raw;
    }
    return payload;
  }, {});
}

function pickColumns(rows: any[], module: AdminModuleConfig) {
  const preferred = [
    module.idField,
    'id',
    'name',
    'title',
    'dishName',
    'email',
    'fullName',
    'status',
    'dishRole',
    'difficultyLevel',
    'caloriesPer100g',
    'points',
  ];
  const keys = new Set<string>();
  preferred.forEach((key) => rows.some((row) => row && key in row) && keys.add(key));
  rows.slice(0, 5).forEach((row) => {
    Object.keys(row || {}).slice(0, 8).forEach((key) => {
      if (!['password', 'ingredients'].includes(key)) keys.add(key);
    });
  });
  return Array.from(keys).slice(0, 7);
}

function renderCellValue(column: string, value: unknown) {
  const normalized = String(value || '').toLowerCase();
  if (column.toLowerCase().includes('status') || column === 'isActive') {
    const positive = ['active', 'available', 'completed', 'success', 'true', 'yes'].includes(normalized);
    const warning = ['pending', 'paused', 'inactive'].includes(normalized);
    const className = positive
      ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
      : warning
        ? 'bg-amber-50 text-amber-700 ring-amber-200'
        : 'bg-slate-100 text-slate-600 ring-slate-200';
    return (
      <span className={`inline-flex rounded-md px-2 py-1 text-xs font-semibold ring-1 ${className}`}>
        {unwrapDisplayValue(value)}
      </span>
    );
  }
  return unwrapDisplayValue(value);
}

function EmptyPanel({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-10 text-center text-slate-500">
      {message}
    </div>
  );
}

function dashboardMetric(value: unknown) {
  const data = (value && typeof value === 'object' && 'data' in (value as Record<string, unknown>))
    ? (value as Record<string, unknown>).data
    : value;
  if (!data || typeof data !== 'object') return { primary: '-', details: [] as string[] };

  const entries = Object.entries(data as Record<string, unknown>)
    .filter(([, entryValue]) => typeof entryValue === 'number' || typeof entryValue === 'string' || typeof entryValue === 'boolean');
  const primary = entries.find(([, entryValue]) => typeof entryValue === 'number') || entries[0];
  return {
    primary: primary ? unwrapDisplayValue(primary[1]) : '-',
    details: entries
      .filter(([key]) => key !== primary?.[0])
      .slice(0, 3)
      .map(([key, entryValue]) => `${key}: ${unwrapDisplayValue(entryValue)}`),
  };
}

function FieldInput({
  field,
  value,
  onChange,
}: {
  field: AdminFieldConfig;
  value: string | boolean;
  onChange: (value: string | boolean) => void;
}) {
  const baseClass =
    'w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100';

  if (field.type === 'textarea') {
    return (
      <textarea
        className={`${baseClass} min-h-24 resize-y`}
        value={String(value || '')}
        onChange={(event) => onChange(event.target.value)}
      />
    );
  }

  if (field.type === 'select') {
    return (
      <select
        className={baseClass}
        value={String(value || '')}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">Select...</option>
        {field.options?.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    );
  }

  if (field.type === 'boolean') {
    return (
      <label className="flex items-center gap-3 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={Boolean(value)}
          onChange={(event) => onChange(event.target.checked)}
          className="h-4 w-4 accent-emerald-600"
        />
        Enabled
      </label>
    );
  }

  return (
    <input
      className={baseClass}
      type={field.type || 'text'}
      value={String(value || '')}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

export default function AdminPanel() {
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [rows, setRows] = useState<any[]>([]);
  const [dashboard, setDashboard] = useState<AdminDashboardStats>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState<Record<string, string | boolean>>({});
  const [ingredientDishId, setIngredientDishId] = useState('');
  const [ingredients, setIngredients] = useState<any[]>([]);
  const [ingredientFoodId, setIngredientFoodId] = useState('');
  const [ingredientCore, setIngredientCore] = useState(true);

  const activeModule = adminModules.find((module) => module.key === activeTab);
  const activeCopy = moduleCopy[activeTab];
  const activeGroup = navGroups.find((group) => group.items.some((item) => item.id === activeTab)) || navGroups[0];
  const columns = useMemo(() => (activeModule ? pickColumns(rows, activeModule) : []), [rows, activeModule]);
  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((row) => JSON.stringify(row).toLowerCase().includes(term));
  }, [rows, search]);

  useEffect(() => {
    if (user?.role === 'ADMIN') {
      void loadCurrentTab();
    }
  }, [activeTab, user?.role]);

  if (!user || user.role !== 'ADMIN') {
    return <Navigate to="/dashboard" replace />;
  }

  async function loadCurrentTab() {
    setError(null);
    setLoading(true);
    try {
      if (activeTab === 'dashboard') {
        setDashboard(await adminService.getDashboard());
        setRows([]);
      } else if (activeModule) {
        setRows(await adminService.list(activeModule));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load admin data');
    } finally {
      setLoading(false);
    }
  }

  function startCreate() {
    if (!activeModule) return;
    const initial = activeModule.fields.reduce<Record<string, string | boolean>>((next, field) => {
      next[field.name] = field.type === 'boolean' ? true : '';
      return next;
    }, {});
    setEditing({ mode: 'create' });
    setForm(initial);
  }

  function startEdit(row: any) {
    if (!activeModule) return;
    const initial = activeModule.fields.reduce<Record<string, string | boolean>>((next, field) => {
      const value = row?.[field.name];
      next[field.name] = field.type === 'boolean' ? Boolean(value) : value === undefined || value === null ? '' : String(value);
      return next;
    }, {});
    setEditing(row);
    setForm(initial);
  }

  async function saveForm() {
    if (!activeModule) return;
    setSaving(true);
    setError(null);
    try {
      const payload = toPayload(form, activeModule.fields);
      const id = editing?.mode === 'create' ? null : getId(editing, activeModule);
      const response = id
        ? await adminService.update(activeModule, id, payload)
        : await adminService.create(activeModule, payload);
      if (!response.success) {
        throw new Error(response.error?.message || 'Save failed');
      }
      setEditing(null);
      await loadCurrentTab();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function deleteRow(row: any) {
    if (!activeModule) return;
    const id = getId(row, activeModule);
    if (!id) return;
    setError(null);
    const response = await adminService.remove(activeModule, id);
    if (!response.success) {
      setError(response.error?.message || 'Delete failed');
      return;
    }
    await loadCurrentTab();
  }

  async function loadIngredients() {
    if (!ingredientDishId) return;
    setError(null);
    try {
      setIngredients(await adminService.listDishIngredients(ingredientDishId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load dish ingredients');
    }
  }

  async function addIngredient() {
    if (!ingredientDishId || !ingredientFoodId) return;
    const response = await adminService.addDishIngredient(ingredientDishId, {
      foodId: Number(ingredientFoodId),
      isCoreIngredient: ingredientCore,
    });
    if (!response.success) {
      setError(response.error?.message || 'Unable to add ingredient');
      return;
    }
    setIngredientFoodId('');
    await loadIngredients();
  }

  async function removeIngredient(ingredientId: number) {
    const response = await adminService.deleteDishIngredient(ingredientId);
    if (!response.success) {
      setError(response.error?.message || 'Unable to delete ingredient');
      return;
    }
    await loadIngredients();
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <aside className="fixed left-0 top-0 hidden h-screen w-72 border-r border-slate-200 bg-slate-950 p-5 md:block">
        <div className="mb-7 flex items-center gap-3 border-b border-white/10 px-2 pb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-400 text-slate-950">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <div className="font-grotesk text-lg font-bold text-white">FitChallenge</div>
            <div className="text-xs font-semibold uppercase tracking-widest text-slate-500">Admin Console</div>
          </div>
        </div>

        <nav className="space-y-5">
          {navGroups.map((group) => (
            <div key={group.label}>
              <div className="px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                {group.label}
              </div>
              <div className="mt-2 space-y-1">
                {group.items.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => {
                      setActiveTab(id);
                      setEditing(null);
                      setSearch('');
                    }}
                    className={`flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-left text-sm font-semibold transition ${
                      activeTab === id ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-400 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="truncate">{label}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <button
          onClick={() => navigate('/dashboard')}
          className="absolute bottom-5 left-5 right-5 flex items-center justify-center gap-2 rounded-lg border border-white/10 px-4 py-3 text-sm font-semibold text-slate-300 hover:bg-white/10"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to App
        </button>
      </aside>

      <main className="min-h-screen p-4 md:ml-72 md:p-6 lg:p-8">
        <div className="mb-4 md:hidden">
          <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-500">Admin workspace</label>
          <select
            value={activeTab}
            onChange={(event) => {
              setActiveTab(event.target.value as AdminTab);
              setEditing(null);
              setSearch('');
            }}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
          >
            {navGroups.map((group) => (
              <optgroup key={group.label} label={group.label}>
                {group.items.map((item) => (
                  <option key={item.id} value={item.id}>{item.label}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        <header className="mb-6 rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm lg:flex lg:items-center lg:justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">{activeCopy.eyebrow}</div>
            <h1 className="mt-1 font-grotesk text-2xl font-bold text-slate-950">
              {activeCopy.title}
            </h1>
            <p className="mt-1 max-w-3xl text-sm text-slate-500">{activeCopy.description}</p>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3 lg:mt-0">
            {activeModule && (
              <button
                onClick={startCreate}
                className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-emerald-700"
              >
                <Plus className="h-4 w-4" />
                New
              </button>
            )}
            <button
              onClick={() => void loadCurrentTab()}
              className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <RefreshCcw className="h-4 w-4" />
              Refresh
            </button>
          </div>
        </header>

        {error && (
          <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {activeTab === 'dashboard' ? (
          <div className="space-y-6">
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              {Object.entries(dashboard).map(([key, value]) => {
                const metric = dashboardMetric(value);
                const copy = dashboardCopy[key] || { title: labelize(key), description: 'System metric' };
                return (
                <div key={key} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div>
                      <div className="text-xs font-bold uppercase tracking-widest text-slate-500">{copy.title}</div>
                      <div className="mt-1 text-xs text-slate-500">{copy.description}</div>
                    </div>
                  </div>
                  <div className="font-grotesk text-3xl font-bold text-slate-950">{metric.primary}</div>
                  <div className="mt-4 space-y-1 text-xs text-slate-500">
                    {metric.details.length > 0 ? metric.details.map((detail) => <div key={detail}>{detail}</div>) : <div>No summary available</div>}
                  </div>
                </div>
                );
              })}
              {!loading && Object.keys(dashboard).length === 0 && <EmptyPanel message="No dashboard data loaded." />}
            </section>

            <section className="grid gap-4 lg:grid-cols-2">
              {workspaceCards.map((workspace) => (
                <button
                  key={workspace.label}
                  onClick={() => setActiveTab(workspace.primaryTab)}
                  className="rounded-xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-emerald-200 hover:bg-emerald-50/40"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">
                        Workspace
                      </div>
                      <h2 className="mt-1 font-grotesk text-xl font-bold text-slate-950">{workspace.label}</h2>
                      <p className="mt-1 text-sm text-slate-500">{workspace.description}</p>
                    </div>
                    <div className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-bold text-slate-600">
                      {workspace.totalTools} tools
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {workspace.items.map((item) => (
                      <span key={item.id} className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600">
                        {item.label}
                      </span>
                    ))}
                  </div>
                </button>
              ))}
            </section>
          </div>
        ) : (
          activeModule && (
            <section className="space-y-5">
              <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                <div className="mb-3 px-1">
                  <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                    {activeGroup.label}
                  </div>
                  <div className="mt-1 text-sm text-slate-500">{activeGroup.description}</div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {activeGroup.items.map(({ id, label }) => (
                    <button
                      key={id}
                      onClick={() => {
                        setActiveTab(id);
                        setEditing(null);
                        setSearch('');
                      }}
                      className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                        activeTab === id
                          ? 'bg-slate-950 text-white'
                          : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
                <div className="relative max-w-xl flex-1">
                  <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder={`Search ${activeCopy.title.toLowerCase()}...`}
                    className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <div className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-600">{filteredRows.length} records</div>
                  {search && (
                    <button
                      onClick={() => setSearch('')}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {loading ? (
                <div className="flex items-center justify-center rounded-xl border border-slate-200 bg-white p-16 text-slate-500 shadow-sm">
                  <Loader2 className="mr-3 h-5 w-5 animate-spin" />
                  Loading data
                </div>
              ) : filteredRows.length === 0 ? (
                <EmptyPanel message="No records found." />
              ) : (
                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 text-sm">
                      <thead className="bg-slate-50 text-left text-xs uppercase tracking-widest text-slate-500">
                        <tr>
                          {columns.map((column) => (
                            <th key={column} className="px-4 py-3 font-bold">
                              {column}
                            </th>
                          ))}
                          <th className="px-4 py-3 text-right font-bold">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredRows.map((row, index) => (
                          <tr key={getId(row, activeModule) || index} className="hover:bg-slate-50">
                            {columns.map((column) => (
                              <td key={column} className="max-w-64 truncate px-4 py-3 text-slate-700">
                                {renderCellValue(column, row?.[column])}
                              </td>
                            ))}
                            <td className="px-4 py-4">
                              <div className="flex justify-end gap-2">
                                <button
                                  onClick={() => startEdit(row)}
                                  className="rounded-md border border-slate-200 p-2 text-slate-600 hover:bg-slate-100"
                                  title="Edit"
                                >
                                  <Edit3 className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => void deleteRow(row)}
                                  className="rounded-md border border-red-200 p-2 text-red-600 hover:bg-red-50"
                                  title="Delete"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeModule.key === 'dishes' && (
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="mb-4">
                    <h2 className="font-grotesk text-xl font-bold text-slate-950">Dish Ingredients</h2>
                    <p className="text-sm text-slate-500">Quản lý công thức món ăn bằng cách gắn Food ID vào Dish ID.</p>
                  </div>
                  <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto_auto]">
                    <input
                      value={ingredientDishId}
                      onChange={(event) => setIngredientDishId(event.target.value)}
                      placeholder="Dish ID"
                      className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                    />
                    <input
                      value={ingredientFoodId}
                      onChange={(event) => setIngredientFoodId(event.target.value)}
                      placeholder="Food ID"
                      className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                    />
                    <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                      <input
                        type="checkbox"
                        checked={ingredientCore}
                        onChange={(event) => setIngredientCore(event.target.checked)}
                        className="h-4 w-4 accent-emerald-600"
                      />
                      Core
                    </label>
                    <div className="flex gap-2">
                      <button onClick={() => void loadIngredients()} className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                        Load
                      </button>
                      <button onClick={() => void addIngredient()} className="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-700">
                        Add
                      </button>
                    </div>
                  </div>
                  <div className="mt-4 grid gap-2">
                    {ingredients.map((item) => (
                      <div key={item.dishIngredientId} className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                        <span>
                          #{item.dishIngredientId} · {item.food?.name || `Food ${item.food?.foodId}`} · core:{' '}
                          {String(item.isCoreIngredient)}
                        </span>
                        <button
                          onClick={() => void removeIngredient(item.dishIngredientId)}
                          className="rounded-md border border-red-200 p-2 text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>
          )
        )}
      </main>

      {editing && activeModule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-auto rounded-xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold uppercase tracking-widest text-emerald-700">
                  {editing.mode === 'create' ? 'Create' : 'Edit'}
                </div>
                <h2 className="font-grotesk text-2xl font-bold text-slate-950">{activeCopy.title}</h2>
              </div>
              <button onClick={() => setEditing(null)} className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {activeModule.fields.map((field) => (
                <label key={field.name} className={field.type === 'textarea' ? 'md:col-span-2' : ''}>
                  <div className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-500">
                    {field.label}
                    {field.required && <span className="text-emerald-700"> *</span>}
                  </div>
                  <FieldInput
                    field={field}
                    value={form[field.name] ?? ''}
                    onChange={(value) => setForm((current) => ({ ...current, [field.name]: value }))}
                  />
                </label>
              ))}
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setEditing(null)} className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                Cancel
              </button>
              <button
                onClick={() => void saveForm()}
                disabled={saving}
                className="flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
