export interface WorkoutPreview {
  id: string;
  name: string;
  sets: string;
  imageUrl: string;
  done: boolean;
}

export const MOCK_MACROS = {
  protein: { consumed: 112, goal: 160, unit: 'g', color: '#007AFF' },
  carbs: { consumed: 210, goal: 280, unit: 'g', color: '#CCFF00' },
  fat: { consumed: 48, goal: 65, unit: 'g', color: '#FF9F0A' },
  water: { consumed: 1.8, goal: 3.0, unit: 'L', color: '#30D158' },
};

export const MOCK_RECOVERY = {
  sleepHours: 6.5,
  sleepGoal: 8,
  sleepQuality: 72,
  energyLevel: 3,
  muscleReadiness: 'Moderate' as 'Low' | 'Moderate' | 'High',
  recommendation: 'rest' as 'rest' | 'light' | 'full',
  hrv: 58,
  restingHR: 64,
};

export const MOCK_LEVEL = {
  current: 14,
  currentPoints: 2340,
  nextLevelPoints: 3000,
  title: 'Iron Athlete',
  nextTitle: 'Bronze Warrior',
};

export const MOCK_MEALS_TODAY = [
  { id: 1, name: 'Sáng', icon: '🍳', logged: true, time: '07:30', cal: 520 },
  { id: 2, name: 'Trưa', icon: '🍱', logged: true, time: '12:00', cal: 680 },
  { id: 3, name: 'Snack', icon: '🥜', logged: false, time: '15:30', cal: null },
  { id: 4, name: 'Tối', icon: '🍽️', logged: false, time: '19:00', cal: null },
];

export const MOCK_SPEND_BREAKDOWN = [
  { label: 'Sáng', amount: 25000, icon: '🍳' },
  { label: 'Trưa', amount: 55000, icon: '🍱' },
  { label: 'Supplement', amount: 30000, icon: '💊' },
];

export const MOCK_UPCOMING = [
  { time: '18:00', label: 'Push Day – Ngực & Vai', tag: 'Strength' },
  { time: '20:00', label: 'Log bữa tối + macros', tag: 'Nutrition' },
];

export const MOCK_RECENT_PRS = [
  { exercise: 'Bench Press', value: '80 kg × 5', diff: '+5 kg' },
  { exercise: 'Squat', value: '100 kg × 3', diff: '+2.5 kg' },
];

export const MOCK_TODAY_WORKOUTS: WorkoutPreview[] = [
  { id: '1', name: 'Bench Press', sets: '4 × 8 reps • 75 kg', imageUrl: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400', done: true },
  { id: '2', name: 'Incline DB', sets: '3 × 10 reps • 24 kg', imageUrl: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=400', done: false },
  { id: '3', name: 'Cable Fly', sets: '3 × 12 reps • 15 kg', imageUrl: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400', done: false },
];
