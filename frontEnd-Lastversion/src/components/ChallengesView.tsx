import { useState, useEffect, memo } from 'react';
import { Search, Trophy, Clock, Users, Play, CheckCircle, ChevronRight, Video, Zap, Award, Loader2 } from 'lucide-react';
import { challengeService, type Challenge } from '../services/challengeService';
import { userService } from '../services/userService';

interface ChallengeUI {
  id: number;
  name: string;
  description: string;
  goal: 'lose' | 'muscle' | 'maintain' | 'endurance';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  duration: string;
  participants: number;
  reward_points: number;
  prize_usd?: number;
  image: string;
  exercise: string;
  minReps: number;
  passingScore: number;
  status: 'active' | 'ended' | 'upcoming';
  joined: boolean;
  submitted?: boolean;
  userScore?: number;
  ends_at: string;
}

function ChallengesView() {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterDifficulty, setFilterDifficulty] = useState('all');
  const [filterGoal, setFilterGoal] = useState('all');
  const [selectedChallenge, setSelectedChallenge] = useState<ChallengeUI | null>(null);

  const [backendGoals, setBackendGoals] = useState<any[]>([]);

  const mapDifficulty = (difficulty?: string): ChallengeUI['difficulty'] => {
    if (difficulty === 'EASY') return 'beginner';
    if (difficulty === 'HARD') return 'advanced';
    return 'intermediate';
  };

  useEffect(() => {
    loadChallenges();
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

  const loadChallenges = async () => {
    try {
      setLoading(true);
      const response = await challengeService.getAll();
      if (response.success && response.data) {
        setChallenges(response.data);
      } else {
        setError(response.error?.message || 'Failed to load challenges');
      }
    } catch (err) {
      setError('Failed to load challenges');
    } finally {
      setLoading(false);
    }
  };

  // Convert API data to UI format
  const displayChallenges = challenges.length > 0 ? challenges.map(challenge => ({
    id: challenge.id,
    name: challenge.title,
    description: challenge.description,
    goal: 'endurance' as 'lose' | 'muscle' | 'maintain' | 'endurance',
    difficulty: mapDifficulty(challenge.difficulty),
    duration: challenge.duration || `${challenge.durationDays} days`,
    participants: challenge.participants || 0,
    reward_points: challenge.rewardPoints || 0,
    prize_usd: challenge.prizeUsd,
    image: challenge.imageUrl || 'https://images.pexels.com/photos/4162583/pexels-photo-4162583.jpeg?auto=compress&cs=tinysrgb&w=400',
    exercise: challenge.exercise || (challenge.exerciseIds?.length ? `${challenge.exerciseIds.length} exercises` : 'Challenge event'),
    minReps: challenge.minReps || 0,
    passingScore: challenge.passingScore || 85,
    status: (challenge.status === 'ACTIVE' ? 'active' : challenge.status === 'INACTIVE' ? 'ended' : 'upcoming') as 'active' | 'ended' | 'upcoming',
    joined: challenge.joined || false,
    submitted: challenge.submitted || false,
    userScore: challenge.userScore,
    ends_at: challenge.endsAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  })) : [];

  // Fallback data if API fails
  const fallbackChallenges: ChallengeUI[] = [
    {
      id: 1,
      name: '100 Push-up Challenge',
      description: 'Complete 100 push-ups in one session with proper form tracking.',
      goal: 'muscle',
      difficulty: 'intermediate',
      duration: '1 week',
      participants: 342,
      reward_points: 500,
      prize_usd: 50,
      image: 'https://images.pexels.com/photos/4162583/pexels-photo-4162583.jpeg?auto=compress&cs=tinysrgb&w=400',
      exercise: 'Push-ups',
      minReps: 100,
      passingScore: 85,
      status: 'active',
      joined: true,
      submitted: false,
      ends_at: '2026-05-17',
    },
    {
      id: 2,
      name: 'Squat Marathon',
      description: 'Complete 200 squats with proper form in under 10 minutes.',
      goal: 'muscle',
      difficulty: 'advanced',
      duration: '2 weeks',
      participants: 128,
      reward_points: 750,
      prize_usd: 75,
      image: 'https://images.pexels.com/photos/1552252/pexels-photo-1552252.jpeg?auto=compress&cs=tinysrgb&w=400',
      exercise: 'Squats',
      minReps: 200,
      passingScore: 90,
      status: 'active',
      joined: false,
      submitted: false,
      ends_at: '2026-05-24',
    },
  ];

  const challengesToShow = challenges.length > 0 ? displayChallenges : fallbackChallenges;

  const filtered = challengesToShow.filter(challenge =>
    (filterDifficulty === 'all' || challenge.difficulty === filterDifficulty) &&
    (filterGoal === 'all' || challenge.goal === filterGoal) &&
    challenge.name.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-lime" />
      </div>
    );
  }

  if (error && challenges.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-neutral-400 mb-4">{error}</p>
        <button onClick={loadChallenges} className="btn-lime px-4 py-2 text-xs">
          Retry
        </button>
      </div>
    );
  }

  if (selectedChallenge) {
    return (
      <div className="space-y-6 animate-fade-in">
        <button onClick={() => setSelectedChallenge(null)} className="sticky top-0 text-lime font-grotesk font-semibold text-sm flex items-center gap-1 hover:gap-2 transition-all bg-charcoal/50 backdrop-blur py-2 z-10">
          ← Back to challenges
        </button>

        <div className="grid lg:grid-cols-3 gap-6 pb-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="relative h-80 rounded-3xl overflow-hidden">
              <img src={selectedChallenge.image} alt={selectedChallenge.name} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-charcoal to-transparent" />
              <div className="absolute bottom-6 left-6 right-6">
                <h1 className="font-grotesk font-bold text-3xl text-white mb-2">{selectedChallenge.name}</h1>
                <div className="flex items-center gap-4">
                  <span className="glass-lime rounded-full px-4 py-1.5 text-lime text-sm font-grotesk font-bold">
                    {selectedChallenge.difficulty}
                  </span>
                  <span className="glass rounded-full px-4 py-1.5 text-neutral-300 text-sm font-grotesk">
                    {selectedChallenge.duration}
                  </span>
                  {selectedChallenge.status === 'active' && (
                    <span className="glass-electric rounded-full px-4 py-1.5 text-electric text-sm font-grotesk">
                      Active
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="glass rounded-3xl p-6 border border-white/5">
              <h2 className="font-grotesk font-bold text-xl text-white mb-4">Challenge Details</h2>
              <p className="text-neutral-200 leading-relaxed mb-6">{selectedChallenge.description}</p>
              
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="glass rounded-2xl p-4 border border-white/5">
                  <div className="flex items-center gap-2 mb-2">
                    <Trophy className="w-4 h-4 text-lime" />
                    <span className="text-neutral-400 text-xs">Reward</span>
                  </div>
                  <div className="font-grotesk font-bold text-white text-lg">{selectedChallenge.reward_points} pts</div>
                  {selectedChallenge.prize_usd && (
                    <div className="text-neutral-400 text-xs">${selectedChallenge.prize_usd}</div>
                  )}
                </div>
                <div className="glass rounded-2xl p-4 border border-white/5">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="w-4 h-4 text-electric" />
                    <span className="text-neutral-400 text-xs">Participants</span>
                  </div>
                  <div className="font-grotesk font-bold text-white text-lg">{selectedChallenge.participants}</div>
                </div>
              </div>

              <h3 className="font-grotesk font-semibold text-white mb-3">Requirements</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-neutral-400 text-sm">Exercise</span>
                  <span className="text-white text-sm font-medium">{selectedChallenge.exercise}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400 text-sm">Minimum Reps</span>
                  <span className="text-white text-sm font-medium">{selectedChallenge.minReps}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400 text-sm">Passing Score</span>
                  <span className="text-white text-sm font-medium">{selectedChallenge.passingScore}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400 text-sm">Ends</span>
                  <span className="text-white text-sm font-medium">{new Date(selectedChallenge.ends_at).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="glass rounded-3xl p-6 border border-white/5">
              <h3 className="font-grotesk font-bold text-white mb-4">Your Progress</h3>
              {selectedChallenge.joined ? (
                <div className="space-y-4">
                  {selectedChallenge.submitted ? (
                    <div className="text-center py-4">
                      <CheckCircle className="w-12 h-12 text-lime mx-auto mb-2" />
                      <p className="text-white font-grotesk font-semibold">Submitted!</p>
                      <p className="text-neutral-400 text-sm">Score: {selectedChallenge.userScore || 0}%</p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-neutral-200 text-sm mb-4">You've joined this challenge. Record your attempt to complete it.</p>
                      <button className="w-full btn-electric py-3 text-sm font-grotesk font-semibold active:scale-[0.98] transition-transform duration-150 ease-out flex items-center justify-center gap-2">
                        <Video className="w-4 h-4" />
                        Record Attempt
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <p className="text-neutral-200 text-sm mb-4">Join this challenge to start competing.</p>
                  <button className="w-full btn-lime py-3 text-sm font-grotesk font-semibold active:scale-[0.98] transition-transform duration-150 ease-out">
                    Join Challenge
                  </button>
                </div>
              )}
            </div>

            <div className="glass-electric rounded-3xl p-5 border-glow-electric">
              <div className="flex items-center gap-3 mb-3">
                <Zap className="w-5 h-5 text-electric" />
                <span className="font-grotesk font-bold text-white text-sm">Pro Tips</span>
              </div>
              <ul className="space-y-2">
                <li className="flex items-start gap-2 text-neutral-200 text-sm">
                  <Award className="w-4 h-4 text-electric mt-0.5 flex-shrink-0" />
                  <span>Focus on form over speed for better scores</span>
                </li>
                <li className="flex items-start gap-2 text-neutral-200 text-sm">
                  <Award className="w-4 h-4 text-electric mt-0.5 flex-shrink-0" />
                  <span>Record in a well-lit area for best AI analysis</span>
                </li>
                <li className="flex items-start gap-2 text-neutral-200 text-sm">
                  <Award className="w-4 h-4 text-electric mt-0.5 flex-shrink-0" />
                  <span>Warm up properly to prevent injury</span>
                </li>
              </ul>
            </div>
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
          <h1 className="font-grotesk font-bold text-2xl text-white">Challenges</h1>
          <p className="text-neutral-400 text-sm mt-1">Compete and earn rewards</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
          <input
            type="text"
            placeholder="Search challenges..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-charcoal border border-white/5 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:border-lime/20 transition-all"
          />
        </div>
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
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map(challenge => (
          <button
            key={challenge.id}
            onClick={() => setSelectedChallenge(challenge)}
            className="text-left group transition-all duration-300 hover:-translate-y-1"
          >
            <div className="glass rounded-3xl overflow-hidden border border-white/5 hover:border-lime/20 transition-all h-full">
              <div className="relative h-48">
                <img src={challenge.image} alt={challenge.name} className="w-full h-full object-cover" loading="lazy" />
                <div className="absolute inset-0 bg-gradient-to-t from-charcoal to-transparent" />
                <div className="absolute top-4 right-4">
                  <span className={`glass rounded-full px-3 py-1 text-xs font-grotesk font-bold ${difficultyColors[challenge.difficulty]}`}>
                    {challenge.difficulty}
                  </span>
                </div>
                {challenge.joined && (
                  <div className="absolute top-4 left-4">
                    <div className="glass-lime rounded-full px-3 py-1 text-xs font-grotesk font-bold text-lime flex items-center gap-1">
                      <Play className="w-3 h-3" />
                      Joined
                    </div>
                  </div>
                )}
                {challenge.status === 'active' && (
                  <div className="absolute bottom-4 left-4">
                    <div className="glass-electric rounded-full px-3 py-1 text-xs font-grotesk font-bold text-electric flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Active
                    </div>
                  </div>
                )}
              </div>
              
              <div className="p-6">
                <h3 className="font-grotesk font-bold text-lg text-white mb-2 group-hover:text-lime transition-colors">
                  {challenge.name}
                </h3>
                <p className="text-neutral-400 text-sm mb-4 line-clamp-2">{challenge.description}</p>
                
                <div className="flex items-center gap-4 mb-4 text-xs">
                  <div className="flex items-center gap-1">
                    <Users className="w-3 h-3 text-neutral-500" />
                    <span className="text-neutral-400">{challenge.participants}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Trophy className="w-3 h-3 text-lime" />
                    <span className="text-white font-medium">{challenge.reward_points} pts</span>
                  </div>
                  {challenge.prize_usd && (
                    <div className="flex items-center gap-1">
                      <Zap className="w-3 h-3 text-electric" />
                      <span className="text-electric font-medium">${challenge.prize_usd}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <span className="glass rounded-full px-2 py-1 text-neutral-400 text-xs">{getGoalLabel(challenge.goal)}</span>
                  <span className="text-neutral-500 text-xs">{challenge.duration}</span>
                </div>

                <button className="w-full mt-3 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.06] text-white text-xs font-grotesk font-semibold transition-all flex items-center justify-center gap-1">
                  View Details <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

export default memo(ChallengesView);
