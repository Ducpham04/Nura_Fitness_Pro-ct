import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, Check, Scale, Activity, User, Target, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthContext } from '../context/AuthContext';
import { userService } from '../services/userService';

interface EditForm {
  age: string;
  weight: string;
  height: string;
  gender: string;   // MALE | FEMALE
  goal: string;
  budget: string;   // VND/ngày
  activityLevel: string; // sedentary | light | moderate | very
}

/** Cùng bộ giá trị + mô tả với Onboarding — mức vận động THẬT hằng ngày. */
const ACTIVITY_OPTIONS: Array<{ id: string; label: string; desc: string }> = [
  { id: 'sedentary', label: 'Ít vận động',    desc: 'Văn phòng, ít đi lại trong ngày' },
  { id: 'light',     label: 'Vận động nhẹ',   desc: 'Đi bộ / tập nhẹ vài buổi mỗi tuần' },
  { id: 'moderate',  label: 'Vận động đều',   desc: 'Tập 3–5 ngày mỗi tuần' },
  { id: 'very',      label: 'Vận động nhiều', desc: 'Cường độ cao gần như mỗi ngày' },
];

export default function ProfileEditPage() {
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [goals, setGoals] = useState<any[]>([]);
  const [showRegenPrompt, setShowRegenPrompt] = useState(false);
  const [form, setForm] = useState<EditForm>({
    age: '', weight: '', height: '', gender: '', goal: '', budget: '', activityLevel: '',
  });

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [body, goalsRes, health] = await Promise.all([
          userService.getBodyProfile(),
          userService.getGoals(),
          userService.getHealthProfile().catch(() => null),
        ]);
        if (!mounted) return;
        const b = body as any;
        // Mức vận động: nguồn thật là HealthProfile.dailyActivityLevel (từ onboarding)
        const rawActivity = ((health as any)?.dailyActivityLevel || '').toLowerCase();
        const knownActivity = ACTIVITY_OPTIONS.some(o => o.id === rawActivity) ? rawActivity : '';
        if (b) {
          setForm({
            age: b.age?.toString() || '',
            weight: b.weight?.toString() || '',
            height: b.height?.toString() || '',
            gender: b.gender || '',
            goal: b.goal || '',
            budget: b.targetBudgetPerDay?.toString() || '',
            activityLevel: knownActivity,
          });
        }
        const gData = (goalsRes?.data as any)?.data || goalsRes?.data;
        if (Array.isArray(gData)) setGoals(gData);
      } catch (e) {
        console.error('Load profile edit failed:', e);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [user?.id]);

  const update = (field: keyof EditForm, value: string) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const canSave = !!(form.age && form.weight && form.height && form.gender && form.goal);

  const handleSave = async () => {
    if (!canSave) {
      toast.error('Vui lòng nhập đủ số đo cơ bản');
      return;
    }
    setSaving(true);
    try {
      await userService.postBodyProfile({
        height: parseFloat(form.height),
        weight: parseFloat(form.weight),
        age: parseInt(form.age),
        gender: form.gender,
        goal: form.goal,
        // Backend đồng bộ giá trị này vào cả HealthProfile.dailyActivityLevel
        ...(form.activityLevel ? { activityLevel: form.activityLevel } : {}),
      } as any);

      if (form.budget && user?.id) {
        await userService.updateBudgetLimit(user.id, parseInt(form.budget));
      }

      toast.success('Đã cập nhật hồ sơ — chỉ số đã được tính lại');
      // Kế hoạch ăn/tập là snapshot lúc tạo → gợi ý tạo lại thay vì im lặng
      setShowRegenPrompt(true);
    } catch (e) {
      console.error('Save profile failed:', e);
      toast.error('Lưu hồ sơ thất bại, thử lại sau');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-lime animate-spin" />
      </div>
    );
  }

  const numFields: Array<{ field: keyof EditForm; label: string; unit: string; icon: any }> = [
    { field: 'age', label: 'Tuổi', unit: 'tuổi', icon: User },
    { field: 'weight', label: 'Cân nặng', unit: 'kg', icon: Scale },
    { field: 'height', label: 'Chiều cao', unit: 'cm', icon: Activity },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-4 py-4 animate-fade-in pb-24">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/dashboard/profile')}
          className="w-9 h-9 rounded-xl border border-white/[0.08] bg-white/[0.03] flex items-center justify-center text-neutral-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="font-grotesk font-bold text-xl text-white">Chỉnh sửa hồ sơ</h1>
          <p className="text-neutral-500 text-xs">Cập nhật số đo & mục tiêu để AI điều chỉnh kế hoạch</p>
        </div>
      </div>

      {/* Số đo cơ thể */}
      <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-5 space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Scale className="w-4 h-4 text-neutral-500" /> Thông số cơ thể
        </h3>
        {numFields.map(({ field, label, unit, icon: Icon }) => (
          <div key={field}>
            <label className="text-neutral-400 text-xs font-medium uppercase tracking-wider mb-2 block">{label}</label>
            <div className="relative">
              <Icon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-600" />
              <input
                type="number"
                value={form[field]}
                onChange={e => update(field, e.target.value)}
                className="w-full bg-white/[0.06] border border-white/10 rounded-2xl pl-11 pr-16 py-3.5 text-white focus:outline-none focus:border-lime/40 transition-all"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-500 text-sm">{unit}</span>
            </div>
          </div>
        ))}

        {/* Giới tính */}
        <div>
          <label className="text-neutral-400 text-xs font-medium uppercase tracking-wider mb-2 block">Giới tính</label>
          <div className="grid grid-cols-2 gap-3">
            {[{ v: 'MALE', l: 'Nam' }, { v: 'FEMALE', l: 'Nữ' }].map(({ v, l }) => (
              <button key={v} type="button" onClick={() => update('gender', v)}
                className={`p-3.5 rounded-2xl border transition-all flex items-center justify-center gap-2 ${
                  form.gender === v ? 'bg-lime/10 border-lime/40 text-lime' : 'bg-white/[0.06] border-white/10 text-neutral-300 hover:border-white/20'
                }`}>
                <User className="w-5 h-5" />
                <span className="font-grotesk font-semibold text-sm">{l}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Mức độ vận động */}
      <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-5 space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Activity className="w-4 h-4 text-neutral-500" /> Mức độ vận động hằng ngày
        </h3>
        <p className="text-neutral-500 text-xs -mt-2">
          Ảnh hưởng trực tiếp tới lượng calo khuyến nghị & kế hoạch AI — chọn đúng mức thực tế.
        </p>
        <div className="grid grid-cols-2 gap-3">
          {ACTIVITY_OPTIONS.map(opt => (
            <button key={opt.id} type="button" onClick={() => update('activityLevel', opt.id)}
              className={`p-3.5 rounded-2xl text-left border transition-all ${
                form.activityLevel === opt.id ? 'bg-lime/10 border-lime/30 text-lime' : 'bg-white/[0.06] border-white/5 text-white'
              }`}>
              <div className="font-grotesk font-semibold text-sm">{opt.label}</div>
              <div className="text-[10px] text-neutral-500 mt-1 line-clamp-1">{opt.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Mục tiêu */}
      <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-5 space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Target className="w-4 h-4 text-neutral-500" /> Mục tiêu tập luyện
        </h3>
        {goals.length > 0 ? (
          <div className="grid grid-cols-2 gap-3">
            {goals.map((g: any) => (
              <button key={g.id} type="button" onClick={() => update('goal', g.name)}
                className={`p-3.5 rounded-2xl text-left border transition-all ${
                  form.goal === g.name ? 'bg-lime/10 border-lime/30 text-lime' : 'bg-white/[0.06] border-white/5 text-white'
                }`}>
                <div className="font-grotesk font-semibold text-sm">{g.name}</div>
                {g.description && <div className="text-[10px] text-neutral-500 mt-1 line-clamp-1">{g.description}</div>}
              </button>
            ))}
          </div>
        ) : (
          <input
            type="text"
            value={form.goal}
            onChange={e => update('goal', e.target.value)}
            placeholder="Nhập mục tiêu"
            className="w-full bg-white/[0.06] border border-white/10 rounded-2xl px-4 py-3.5 text-white focus:outline-none focus:border-lime/40"
          />
        )}
      </div>

      {/* Ngân sách */}
      <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-5 space-y-3">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Wallet className="w-4 h-4 text-neutral-500" /> Ngân sách ăn uống / ngày
        </h3>
        <div className="relative">
          <input
            type="number"
            value={form.budget}
            onChange={e => update('budget', e.target.value)}
            placeholder="80000"
            step={5000}
            className="w-full bg-white/[0.06] border border-white/10 rounded-2xl px-4 pr-16 py-3.5 text-white focus:outline-none focus:border-lime/40"
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-500 text-sm">VND</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {[50000, 80000, 120000, 200000].map(v => (
            <button key={v} type="button" onClick={() => update('budget', v.toString())}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                form.budget === v.toString() ? 'bg-lime/10 border-lime/30 text-lime' : 'bg-white/[0.04] border-white/10 text-neutral-400 hover:text-white'
              }`}>
              {(v / 1000).toFixed(0)}k
            </button>
          ))}
        </div>
      </div>

      {/* Save */}
      <button
        onClick={handleSave}
        disabled={!canSave || saving}
        className={`w-full rounded-2xl py-4 flex items-center justify-center gap-2 text-sm font-grotesk font-bold transition-all ${
          canSave && !saving ? 'btn-lime' : 'bg-white/[0.06] text-neutral-500 cursor-not-allowed'
        }`}
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
        {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
      </button>

      {/* Gợi ý tạo lại kế hoạch sau khi hồ sơ đổi — plan là snapshot lúc tạo */}
      {showRegenPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => { setShowRegenPrompt(false); navigate('/dashboard/profile'); }}>
          <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-[#12161d] p-6 space-y-4"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-full bg-lime/15 flex items-center justify-center">
                <Check className="w-5 h-5 text-lime" />
              </div>
              <h3 className="font-grotesk font-bold text-white">Chỉ số đã được tính lại</h3>
            </div>
            <p className="text-neutral-400 text-sm leading-relaxed">
              Kế hoạch ăn & lịch tập hiện tại vẫn dựa trên hồ sơ cũ.
              Tạo lại kế hoạch để AI áp dụng thông số mới của bạn.
            </p>
            <div className="space-y-2">
              <button onClick={() => navigate('/dashboard/diet')}
                className="w-full btn-lime rounded-2xl py-3 text-sm font-grotesk font-bold">
                Tạo lại kế hoạch ăn
              </button>
              <button onClick={() => navigate('/dashboard/workout')}
                className="w-full rounded-2xl py-3 text-sm font-grotesk font-bold border border-white/10 bg-white/[0.06] text-white">
                Tạo lại lịch tập
              </button>
              <button onClick={() => { setShowRegenPrompt(false); navigate('/dashboard/profile'); }}
                className="w-full rounded-2xl py-2.5 text-xs text-neutral-500 hover:text-neutral-300">
                Để sau — chỉ số mới vẫn được áp dụng trên Tổng quan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
