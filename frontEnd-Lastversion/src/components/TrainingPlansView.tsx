import React, { useState, useEffect, memo } from 'react';
import { Search, Filter, Star, Clock, TrendingUp, Play, CheckCircle, Lock, ChevronRight, Loader2, Zap } from 'lucide-react';
import { trainingService, type TrainingPlan } from '../services/trainingService';
import CyberpunkWorkoutModal from './CyberpunkWorkoutModal';

interface Plan {
  id: number | string;
  name: string;
  goal: 'lose' | 'muscle' | 'maintain' | 'endurance';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  duration: string;
  weeksCount: number;
  workoutsPerWeek: number;
  daysPerWeek: number;
  rating: number;
  reviews: number;
  image: string;
  description: string;
  features: string[];
  started: boolean;
  progress?: number;
}

function TrainingPlansView() {
  const [plans, setPlans] = useState<TrainingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterGoal, setFilterGoal] = useState<string>('all');
  const [filterDifficulty, setFilterDifficulty] = useState<string>('all');
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [aiModalOpen, setAiModalOpen] = useState(false);

  const [backendGoals, setBackendGoals] = useState<any[]>([]);

  useEffect(() => {
    loadTrainingPlans();
    fetchGoals();
  }, []);

  const fetchGoals = async () => {
    try {
      const response = await userService.getGoals();
      if (response.success && response.data) {
        const data = (response.data as any).data || response.data;
        if (Array.isArray(data)) setBackendGoals(data);
      }
    } catch (err) {
      console.error("Failed to fetch goals:", err);
    }
  };

  const loadTrainingPlans = async () => {
    try {
      setLoading(true);
      const response = await trainingService.getTrainingPlans();
      if (response.success && response.data) {
        setPlans(response.data);
      } else {
        setError(response.error?.message || 'Failed to load training plans');
      }
    } catch (err) {
      setError('Failed to load training plans');
    } finally {
      setLoading(false);
    }
  };

  const handleAiSuccess = (data: any) => {
    console.log("AI Workout Plan generated:", data);
    loadTrainingPlans();
    setAiModalOpen(false);
  };

  // Convert API data to display format
  const displayPlans = plans.length > 0 ? plans.map((plan, index) => ({
    id: plan.id || `plan-${index}`, // Ensure unique ID
    name: plan.title,
    goal: (plan.goal || 'muscle') as 'lose' | 'muscle' | 'maintain' | 'endurance',
    difficulty: plan.difficulty.toLowerCase() as 'beginner' | 'intermediate' | 'advanced',
    duration: `${plan.durationDays} days`,
    weeksCount: Math.ceil(plan.durationDays / 7),
    workoutsPerWeek: plan.workoutsPerWeek || 3,
    daysPerWeek: plan.workoutsPerWeek || 3,
    rating: plan.rating || 4.5,
    reviews: plan.reviews || 0,
    image: plan.imageUrl || 'https://images.pexels.com/photos/4162590/pexels-photo-4162590.jpeg?auto=compress&cs=tinysrgb&w=400',
    description: plan.description,
    features: plan.features || ['Full body workouts', 'Progressive overload'],
    started: plan.started || false,
    progress: plan.progress || 0,
  })) : [];

  // Fallback data if API fails
  const fallbackPlans: Plan[] = [
    {
      id: 1,
      name: 'Beginner Strength Builder',
      goal: 'muscle',
      difficulty: 'beginner',
      duration: '8 weeks',
      weeksCount: 8,
      workoutsPerWeek: 3,
      daysPerWeek: 3,
      rating: 4.8,
      reviews: 342,
      image: 'https://images.pexels.com/photos/4162590/pexels-photo-4162590.jpeg?auto=compress&cs=tinysrgb&w=400',
      description: 'Perfect for beginners. Build foundational strength with 3 days per week.',
      features: ['Full body workouts', 'Bodyweight & dumbbells', 'Progressive overload', 'Form coaching'],
      started: true,
      progress: 35,
    },
    {
      id: 2,
      name: 'Advanced Hypertrophy Split',
      goal: 'muscle',
      difficulty: 'advanced',
      duration: '12 weeks',
      weeksCount: 12,
      workoutsPerWeek: 5,
      daysPerWeek: 5,
      rating: 4.9,
      reviews: 521,
      image: 'https://images.pexels.com/photos/4162590/pexels-photo-4162590.jpeg?auto=compress&cs=tinysrgb&w=400',
      description: 'Advanced muscle building with 5-day split routine.',
      features: ['Muscle group splits', 'Progressive overload', 'Advanced techniques', 'Recovery protocols'],
      started: false,
      progress: 0,
    },
  ];

  const plansToShow = plans.length > 0 ? displayPlans : fallbackPlans;

  const filtered = plansToShow.filter(p =>
    (filterGoal === 'all' || p.goal === filterGoal) &&
    (filterDifficulty === 'all' || p.difficulty === filterDifficulty) &&
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-lime" />
      </div>
    );
  }

  if (error && plans.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-neutral-400 mb-4">{error}</p>
        <button onClick={loadTrainingPlans} className="btn-lime px-4 py-2 text-xs">
          Retry
        </button>
      </div>
    );
  }

  if (selectedPlan) {
    return (
      <div className="space-y-6 animate-fade-in max-h-[calc(100vh-200px)] overflow-y-auto">
        <button onClick={() => setSelectedPlan(null)} className="sticky top-0 text-lime font-grotesk font-semibold text-sm flex items-center gap-1 hover:gap-2 transition-all bg-charcoal/50 backdrop-blur py-2 z-10">
          ← Back to plans
        </button>

        <div className="grid lg:grid-cols-3 gap-6 pb-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="relative h-80 rounded-3xl overflow-hidden">
              <img src={selectedPlan.image} alt={selectedPlan.name} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-charcoal to-transparent" />
              <div className="absolute bottom-6 left-6 right-6">
                <h1 className="font-grotesk font-bold text-3xl text-white mb-2">{selectedPlan.name}</h1>
                <div className="flex items-center gap-4">
                  <span className="glass-lime rounded-full px-4 py-1.5 text-lime text-sm font-grotesk font-bold">
                    {selectedPlan.difficulty}
                  </span>
                  <span className="glass rounded-full px-4 py-1.5 text-neutral-300 text-sm font-grotesk">
                    {selectedPlan.duration}
                  </span>
                </div>
              </div>
            </div>

            <div className="glass rounded-3xl p-6 border border-white/5">
              <h2 className="font-grotesk font-bold text-xl text-white mb-4">About this plan</h2>
              <p className="text-neutral-200 leading-relaxed mb-6">{selectedPlan.description}</p>
              
              <h3 className="font-grotesk font-semibold text-white mb-3">Features</h3>
              <ul className="space-y-2">
                {selectedPlan.features.map((feature, i) => (
                  <li key={i} className="flex items-center gap-2 text-neutral-200 text-sm">
                    <CheckCircle className="w-4 h-4 text-lime" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="space-y-6">
            <div className="glass rounded-3xl p-6 border border-white/5">
              <h3 className="font-grotesk font-bold text-white mb-4">Plan Details</h3>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-neutral-400 text-sm">Duration</span>
                  <span className="text-white text-sm font-medium">{selectedPlan.duration}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400 text-sm">Workouts/Week</span>
                  <span className="text-white text-sm font-medium">{selectedPlan.workoutsPerWeek}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400 text-sm">Difficulty</span>
                  <span className="text-white text-sm font-medium capitalize">{selectedPlan.difficulty}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400 text-sm">Goal</span>
                  <span className="text-white text-sm font-medium capitalize">{selectedPlan.goal}</span>
                </div>
              </div>
            </div>

            {selectedPlan.started && (
              <div className="glass rounded-3xl p-6 border border-white/5">
                <h3 className="font-grotesk font-bold text-white mb-4">Your Progress</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-neutral-400 text-sm">Completed</span>
                    <span className="text-white text-sm font-medium">{selectedPlan.progress}%</span>
                  </div>
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-lime rounded-full transition-all duration-700"
                      style={{ width: `${selectedPlan.progress}%` }}
                    />
                  </div>
                </div>
              </div>
            )}

            <button className="w-full btn-lime py-3 text-sm font-grotesk font-semibold active:scale-[0.98] transition-transform duration-150 ease-out">
              {selectedPlan.started ? 'Continue Training' : 'Start This Plan'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const getGoalLabel = (goalName: string) => {
    const goal = backendGoals.find(g => g.name === goalName);
    return goal ? goal.name : goalName;
  };

  const difficultyColors = {
    beginner: 'text-lime',
    intermediate: 'text-electric',
    advanced: 'text-warning'
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-grotesk font-bold text-2xl text-white">Training Plans</h1>
          <p className="text-neutral-400 text-sm mt-1">Choose a plan that fits your goals</p>
        </div>
        <button 
          onClick={() => setAiModalOpen(true)}
          className="flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-electric text-white font-grotesk font-bold text-sm shadow-lg shadow-electric/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
        >
          <Zap className="w-4 h-4" fill="currentColor" />
          GENERATE AI PLAN
        </button>
      </div>

      {aiModalOpen && (
        <CyberpunkWorkoutModal 
          onClose={() => setAiModalOpen(false)} 
          onSuccess={handleAiSuccess} 
        />
      )}

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
          <input
            type="text"
            placeholder="Search plans..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-charcoal border border-white/5 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:border-lime/20 transition-all"
          />
        </div>
        <select
          value={filterGoal}
          onChange={(e) => setFilterGoal(e.target.value)}
          className="px-4 py-2 bg-charcoal border border-white/5 rounded-xl text-white focus:outline-none focus:border-lime/20 transition-all"
        >
          <option value="all">All Goals</option>
          {backendGoals.map(g => (
            <option key={g.id} value={g.name}>{g.name}</option>
          ))}
        </select>
        <select
          value={filterDifficulty}
          onChange={(e) => setFilterDifficulty(e.target.value)}
          className="px-4 py-2 bg-charcoal border border-white/5 rounded-xl text-white focus:outline-none focus:border-lime/20 transition-all"
        >
          <option value="all">All Levels</option>
          <option value="beginner">Beginner</option>
          <option value="intermediate">Intermediate</option>
          <option value="advanced">Advanced</option>
        </select>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map(plan => (
          <div
            key={plan.id}
            className="text-left group transition-all duration-300 hover:-translate-y-1"
          >
            <button
              onClick={() => setSelectedPlan(plan)}
              className="w-full h-full"
            >
              <div className="glass rounded-3xl overflow-hidden border border-white/5 hover:border-lime/20 transition-all h-full">
                <div className="relative h-48">
                  <img src={plan.image} alt={plan.name} className="w-full h-full object-cover" loading="lazy" />
                  <div className="absolute inset-0 bg-gradient-to-t from-charcoal to-transparent" />
                  <div className="absolute top-4 right-4">
                    <span className={`glass rounded-full px-3 py-1 text-xs font-grotesk font-bold ${difficultyColors[plan.difficulty]}`}>
                      {plan.difficulty}
                    </span>
                  </div>
                  {plan.started && (
                    <div className="absolute top-4 left-4">
                      <div className="glass-lime rounded-full px-3 py-1 text-xs font-grotesk font-bold text-lime flex items-center gap-1">
                        <Play className="w-3 h-3" />
                        In Progress
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="p-6">
                  <h3 className="font-grotesk font-bold text-lg text-white mb-2 group-hover:text-lime transition-colors">
                    {plan.name}
                  </h3>
                  <p className="text-neutral-400 text-sm mb-4 line-clamp-2">{plan.description}</p>
                  
                  <div className="flex items-center gap-4 mb-4 text-xs">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-neutral-500" />
                      <span className="text-neutral-400">{plan.duration}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <TrendingUp className="w-3 h-3 text-neutral-500" />
                      <span className="text-neutral-400">{plan.workoutsPerWeek}/week</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Star className="w-3 h-3 text-lime" />
                      <span className="text-white font-medium">{plan.rating}</span>
                      <span className="text-neutral-500">({plan.reviews})</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="glass rounded-full px-2 py-1 text-neutral-400 text-xs">{getGoalLabel(plan.goal)}</span>
                  </div>

                  <div className="w-full mt-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-grotesk font-semibold transition-all flex items-center justify-center gap-1">
                    View Details <ChevronRight className="w-3 h-3" />
                  </div>
                </div>
              </div>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default memo(TrainingPlansView);
