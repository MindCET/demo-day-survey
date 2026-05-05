
import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { db, auth, handleFirestoreError, OperationType, loginWithGoogle } from '../lib/firebase';
import { collection, onSnapshot, doc, setDoc, query, orderBy, getDoc } from 'firebase/firestore';
import { Startup, GlobalSettings, PollStatus, Vote } from '../types';
import { Wallet, Info, CheckCircle2, TrendingUp, Volume2, VolumeX } from 'lucide-react';
import Header from '../components/Header';
import confetti from 'canvas-confetti';
import useSound from 'use-sound';

export default function InvestorView() {
  const [startups, setStartups] = useState<Startup[]>([]);
  const [settings, setSettings] = useState<GlobalSettings | null>(null);
  const [allocations, setAllocations] = useState<{ [id: string]: number }>({});
  const [submitted, setSubmitted] = useState(false);
  const [isMuted, setIsMuted] = useState(true);

  // Sound effects
  const [playClick] = useSound('https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3', { volume: 0.5 });
  const [playSuccess] = useSound('https://assets.mixkit.co/active_storage/sfx/2013/2013-preview.mp3', { volume: 0.5 });

  const [user, setUser] = useState(auth.currentUser);

  useEffect(() => {
    const unsubAuth = auth.onAuthStateChanged((u) => {
      setUser(u);
      if (u) checkVoted(u.uid);
    });

    const unsubStartups = onSnapshot(query(collection(db, 'startups'), orderBy('order')), (snap) => {
      setStartups(snap.docs.map(d => ({ ...d.data(), id: d.id }) as Startup));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'startups'));

    const unsubSettings = onSnapshot(doc(db, 'config', 'global'), (snap) => {
      if (snap.exists()) setSettings(snap.data() as GlobalSettings);
    }, (error) => handleFirestoreError(error, OperationType.GET, 'config/global'));

    return () => { 
      unsubAuth();
      unsubStartups(); 
      unsubSettings(); 
    };
  }, []);

  const checkVoted = async (uid: string) => {
    const voteSnap = await getDoc(doc(db, 'votes', uid));
    if (voteSnap.exists()) {
      setAllocations((voteSnap.data() as Vote).allocations);
      setSubmitted(true);
    }
  };

  const handleLogin = async () => {
    await loginWithGoogle();
  };

  const totalAllocated = useMemo(() => 
    Object.values(allocations).reduce((sum, val) => (sum as number) + (val as number), 0)
  , [allocations]);

  const budgetRemaining = (settings?.totalBudget || 0) - totalAllocated;

  const handleUpdateAllocation = (id: string, amount: number) => {
    const currentVal = allocations[id] || 0;
    const diff = amount - currentVal;
    
    if (budgetRemaining - diff >= 0 && amount >= 0) {
      setAllocations(prev => ({ ...prev, [id]: amount }));
      if (!isMuted) playClick();
    }
  };

  const submitVote = async () => {
    if (!auth.currentUser || !settings) return;
    if (settings.pollStatus !== PollStatus.ACTIVE) return;

    const voteRef = doc(db, 'votes', auth.currentUser.uid);
    await setDoc(voteRef, {
      investorId: auth.currentUser.uid,
      allocations,
      totalAllocated,
      timestamp: new Date().toISOString()
    });
    
    setSubmitted(true);
    if (!isMuted) playSuccess();
    confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#F29433', '#FFFFFF', '#6366F1']
    });
  };

  if (!settings) return null;

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-8 text-center bg-mindcet-blue">
        <Header />
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="glass p-10 rounded-3xl max-w-md w-full">
          <div className="w-20 h-20 bg-mindcet-orange/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <TrendingUp className="text-mindcet-orange w-10 h-10" />
          </div>
          <h2 className="text-2xl font-display font-bold mb-4">Elite Investor Portal</h2>
          <p className="text-white/60 mb-8">Welcome to MindCET Demo Day. Identify yourself as an investor to start allocating capital.</p>
          <button 
            onClick={handleLogin}
            className="w-full bg-white text-mindcet-blue hover:bg-gray-100 py-4 rounded-xl font-bold flex items-center justify-center gap-3 transition-all shadow-xl"
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" />
            ENTER AS INVESTOR
          </button>
        </motion.div>
      </div>
    );
  }

  if (settings.pollStatus === PollStatus.DRAFT) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-8 text-center bg-mindcet-blue">
        <Header />
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass p-10 rounded-3xl max-w-md">
          <div className="w-20 h-20 bg-mindcet-orange/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Wallet className="text-mindcet-orange w-10 h-10" />
          </div>
          <h2 className="text-2xl font-display font-bold mb-4">Investment Round Coming Soon</h2>
          <p className="text-white/60 mb-8">The elite investor portal is preparing for your allocations. Please wait for the event host to open the round.</p>
          <div className="animate-pulse flex space-x-2 justify-center">
            <div className="w-2 h-2 bg-mindcet-orange rounded-full"></div>
            <div className="w-2 h-2 bg-mindcet-orange rounded-full"></div>
            <div className="w-2 h-2 bg-mindcet-orange rounded-full"></div>
          </div>
        </motion.div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen p-4 md:p-8 bg-mindcet-blue flex flex-col items-center">
        <Header />
        <motion.div 
          initial={{ y: 20, opacity: 0 }} 
          animate={{ y: 0, opacity: 1 }} 
          className="glass p-8 rounded-3xl w-full max-w-lg text-center mt-12 bg-gradient-to-b from-white/10 to-transparent"
        >
          <div className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-green-500/50">
            <CheckCircle2 className="text-green-500 w-12 h-12" />
          </div>
          <h2 className="text-3xl font-display font-bold mb-4 text-glow">Allocations Confirmed!</h2>
          <p className="text-lg text-white/70 mb-8 font-light italic">"A wise investment is the first step towards a revolution in learning."</p>
          
          <div className="space-y-4 mb-10 text-left">
            {startups.filter(s => allocations[s.id] > 0).map(s => (
              <div key={s.id} className="flex justify-between items-center p-4 bg-white/5 rounded-xl border border-white/10">
                <span className="font-medium">{s.name}</span>
                <span className="font-display font-bold text-mindcet-orange">${allocations[s.id].toLocaleString()}</span>
              </div>
            ))}
          </div>

          <p className="text-sm opacity-50 mb-0">Watch the main screen for real-time results.</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-40 p-4 md:p-8 max-w-lg mx-auto">
      <Header />
      
      {/* Wallet Summary Sticky */}
      <motion.div 
        layout
        className="sticky top-4 z-50 glass-dark p-6 rounded-2xl shadow-2xl mb-8 border-t-white/30"
      >
        <div className="flex justify-between items-end">
          <div>
            <p className="text-xs uppercase tracking-widest text-white/50 mb-1 font-bold">Investable Capital</p>
            <h3 className="text-4xl font-display font-extrabold text-white">
              ${budgetRemaining.toLocaleString()}
            </h3>
          </div>
          <button 
            onClick={() => setIsMuted(!isMuted)} 
            className="p-2 rounded-full hover:bg-white/10 transition-colors"
          >
            {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
          </button>
        </div>
        
        {/* Progress Bar */}
        <div className="w-full h-2 bg-white/10 rounded-full mt-6 overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${(totalAllocated / settings.totalBudget) * 100}%` }}
            className="h-full bg-gradient-to-r from-mindcet-orange to-orange-300 shadow-[0_0_10px_rgba(242,148,51,0.5)]"
          />
        </div>
      </motion.div>

      <div className="space-y-6">
        <AnimatePresence>
          {startups.map((startup, idx) => (
            <motion.div 
              key={startup.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className={`p-6 rounded-2xl transition-all duration-300 border ${allocations[startup.id] > 0 ? 'bg-white/10 border-mindcet-orange/50' : 'bg-white/5 border-white/10'}`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center overflow-hidden border border-white/10">
                    <img src={startup.imageUrl} alt={startup.name} className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <h4 className="font-display font-bold text-lg">{startup.name}</h4>
                    <p className="text-xs text-white/40 line-clamp-1">{startup.description}</p>
                  </div>
                </div>
                {allocations[startup.id] > 0 && (
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="bg-mindcet-orange/20 px-2 py-1 rounded-md text-[10px] font-bold text-mindcet-orange border border-mindcet-orange/30">
                    SELECTED
                  </motion.div>
                )}
              </div>

              <div className="space-y-4">
                <div className="flex justify-between text-sm">
                  <span className="opacity-50">Allocation</span>
                  <span className="font-mono font-bold text-mindcet-orange">${(allocations[startup.id] || 0).toLocaleString()}</span>
                </div>
                <input 
                  type="range"
                  min="0"
                  max={Math.min(settings.totalBudget / 2, (allocations[startup.id] || 0) + budgetRemaining)}
                  step="5000"
                  value={allocations[startup.id] || 0}
                  onChange={(e) => handleUpdateAllocation(startup.id, Number(e.target.value))}
                  className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-mindcet-orange"
                />
                <div className="grid grid-cols-4 gap-2">
                  {[0, 25000, 50000, 100000].map(amount => (
                    <button
                      key={amount}
                      onClick={() => handleUpdateAllocation(startup.id, amount)}
                      disabled={amount > (allocations[startup.id] || 0) + budgetRemaining}
                      className={`text-[10px] py-2 rounded-lg font-bold border transition-all ${
                        allocations[startup.id] === amount 
                        ? 'bg-mindcet-orange border-none text-white' 
                        : 'bg-white/5 border-white/10 hover:bg-white/10'
                      } disabled:opacity-20`}
                    >
                      {amount === 0 ? 'CLEAR' : `$${(amount/1000)}K`}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Submit Button */}
      <motion.div 
        className="fixed bottom-0 left-0 w-full p-6 bg-gradient-to-t from-mindcet-blue to-transparent pb-10"
      >
        <button 
          onClick={submitVote}
          disabled={totalAllocated === 0}
          className={`w-full max-w-md mx-auto flex items-center justify-center gap-3 py-5 rounded-2xl font-display font-bold text-xl transition-all shadow-xl ${
            totalAllocated > 0 
            ? 'bg-mindcet-orange hover:bg-orange-400 active:scale-95 shadow-orange-900/40 text-white' 
            : 'bg-white/10 text-white/20 cursor-not-allowed'
          }`}
        >
          <TrendingUp />
          FINALIZE INVESTMENT
        </button>
      </motion.div>
    </div>
  );
}
