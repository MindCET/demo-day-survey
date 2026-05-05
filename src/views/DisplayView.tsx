
import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, onSnapshot, doc, query, orderBy } from 'firebase/firestore';
import { Startup, GlobalSettings, Vote } from '../types';
import { Trophy, Users, BarChart3, QrCode } from 'lucide-react';
import Header from '../components/Header';

export default function DisplayView() {
  const [startups, setStartups] = useState<Startup[]>([]);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [settings, setSettings] = useState<GlobalSettings | null>(null);

  useEffect(() => {
    const unsubStartups = onSnapshot(query(collection(db, 'startups'), orderBy('order')), (snap) => {
      setStartups(snap.docs.map(d => ({ ...d.data(), id: d.id }) as Startup));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'startups'));

    const unsubVotes = onSnapshot(collection(db, 'votes'), (snap) => {
      setVotes(snap.docs.map(d => d.data() as Vote));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'votes'));

    const unsubSettings = onSnapshot(doc(db, 'config', 'global'), (snap) => {
      if (snap.exists()) setSettings(snap.data() as GlobalSettings);
    }, (error) => handleFirestoreError(error, OperationType.GET, 'config/global'));

    return () => { unsubStartups(); unsubVotes(); unsubSettings(); };
  }, []);

  const PodiumCard = ({ item, rank, maxAmount }: { item: any, rank: number, maxAmount: number }) => {
    if (!item) return <div className="h-full flex items-center justify-center text-white/10 italic">Waiting...</div>;
    const startup = startups.find(s => s.id === item.id);
    
    return (
      <motion.div 
        className="flex flex-col items-center justify-end w-full h-full"
      >
        <motion.div 
          layout
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="mb-4 flex flex-col items-center text-center px-4"
        >
          <div className={`w-20 h-20 rounded-2xl p-1 bg-white shadow-2xl mb-4 transform transition-transform duration-500 ${rank === 1 ? 'scale-125' : ''}`}>
             <img src={startup?.imageUrl} className="w-full h-full object-cover rounded-xl" alt="" />
          </div>
          <h3 className="text-2xl font-display font-black text-white">{item.name}</h3>
          <p className="text-mindcet-orange font-mono font-bold text-xl">${item.amount.toLocaleString()}</p>
        </motion.div>

        <motion.div 
          layout
          initial={{ height: 0 }}
          animate={{ height: `${Math.max((item.amount / maxAmount) * 100, 15)}%` }}
          transition={{ type: "spring", stiffness: 40, damping: 15 }}
          className={`w-full min-h-[4rem] rounded-t-3xl relative overflow-hidden flex flex-col items-center justify-start py-6 ${
            rank === 1 ? 'bg-gradient-to-b from-mindcet-orange to-orange-950/20 glass border-t-white/30' :
            rank === 2 ? 'bg-gradient-to-b from-gray-400/50 to-gray-900/20 glass border-t-white/30' :
            'bg-gradient-to-b from-orange-400/40 to-orange-900/20 glass border-t-white/30'
          }`}
        >
          <span className="text-6xl font-display font-black opacity-30 select-none">{rank}</span>
          {rank === 1 && <div className="absolute top-0 left-0 w-full h-full bg-white/5 animate-pulse" />}
        </motion.div>
      </motion.div>
    );
  };

  const [showingExamples, setShowingExamples] = useState(false);
  const [mockVotes, setMockVotes] = useState<Vote[]>([]);

  useEffect(() => {
    let interval: any;
    if (showingExamples && startups.length > 0) {
      interval = setInterval(() => {
        setMockVotes(prev => {
          const newVotes = startups.map(s => {
            const allocations: { [key: string]: number } = {};
            allocations[s.id] = Math.floor(Math.random() * 50000); // Increment by a smaller amount
            return {
              investorId: `mock_${s.id}_${Math.random()}`,
              allocations,
              totalAllocated: allocations[s.id],
              timestamp: new Date().toISOString()
            } as Vote;
          });
          return [...prev, ...newVotes];
        });
      }, 3000);
    } else {
      setMockVotes([]);
    }
    return () => clearInterval(interval);
  }, [showingExamples, startups]);

  const stats = useMemo(() => {
    const totals: { [id: string]: number } = {};
    startups.forEach(s => totals[s.id] = 0);
    
    const activeVotes = showingExamples ? mockVotes : votes;
    
    activeVotes.forEach(v => {
      Object.entries(v.allocations).forEach(([id, amount]) => {
        if (totals[id] !== undefined) totals[id] += (amount as number);
      });
    });

    return Object.entries(totals)
      .map(([id, amount]) => ({
        id,
        name: startups.find(s => s.id === id)?.name || 'Unknown',
        amount,
        percentage: (amount / (votes.length * (settings?.totalBudget || 1))) * 100
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [votes, startups, settings, showingExamples, mockVotes]);

  const maxAmount = Math.max(...stats.map(s => s.amount), 1);

  return (
    <div className="min-h-screen bg-mindcet-blue flex flex-col overflow-hidden">
      <div className="p-8 pb-0">
        <Header />
      </div>

      <div className="flex-1 flex flex-col p-12 pt-4">
        {/* Title Area */}
        <div className="mb-12 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-mindcet-orange/20 rounded-2xl flex items-center justify-center border border-mindcet-orange/50 shadow-[0_0_20px_rgba(242,148,51,0.2)]">
              <Trophy className="text-mindcet-orange w-8 h-8" />
            </div>
            <div>
              <h2 className="text-5xl font-display font-extrabold tracking-tight text-glow uppercase">Elite Portfolio</h2>
              <p className="text-white/40 font-medium tracking-widest uppercase mt-2">Active Investors: <span className="text-white">{votes.length}</span> | Aggregate Capital: <span className="text-white">${stats.reduce((s, x) => s + x.amount, 0).toLocaleString()}</span></p>
            </div>
          </div>
          
          <div className="glass p-4 rounded-2xl flex items-center gap-6 border-white/10">
             <div className="text-center">
                <p className="text-[10px] uppercase tracking-widest text-white/40 font-bold">Round Status</p>
                <div className="flex items-center gap-2 mt-1">
                   <div className={`w-2 h-2 rounded-full animate-pulse ${settings?.pollStatus === 'active' ? 'bg-green-500' : 'bg-red-500'}`} />
                   <span className="font-display font-bold text-sm uppercase">{settings?.pollStatus}</span>
                </div>
             </div>
             <div className="w-px h-8 bg-white/10" />
             <div className="bg-white p-2 rounded-lg">
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(window.location.origin)}&bgcolor=ffffff&color=2A3353`} 
                  alt="QR" 
                  className="w-12 h-12"
                />
             </div>
          </div>
        </div>

        {/* Podium Area (Top 3) */}
        <div className="flex justify-center items-end gap-8 flex-initial mb-16 h-[45vh]">
          <AnimatePresence>
            {[
              { item: stats[1], rank: 2 },
              { item: stats[0], rank: 1 },
              { item: stats[2], rank: 3 }
            ].map((entry) => {
              if (!entry.item) return null;
              return (
                <motion.div
                  layout
                  key={entry.item.id}
                  className={`h-full flex flex-col justify-end flex-1 max-w-[30%] ${
                    entry.rank === 1 ? 'scale-110 relative z-10' : 'relative z-0'
                  }`}
                  transition={{ type: "spring", stiffness: 60, damping: 15 }}
                >
                  <PodiumCard item={entry.item} rank={entry.rank} maxAmount={maxAmount} />
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* Remaining Startups (Grid/List) */}
        <div className="flex-1">
          <h4 className="text-xs font-bold text-white/30 tracking-[0.3em] uppercase mb-6 flex items-center gap-4">
             <div className="h-px flex-1 bg-white/10" />
             The Contenders
             <div className="h-px flex-1 bg-white/10" />
          </h4>
          <div className="grid grid-cols-4 gap-6">
            <AnimatePresence mode="popLayout">
              {stats.slice(3, 11).map((item, index) => (
                <motion.div 
                  key={item.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="glass p-4 rounded-2xl flex items-center gap-4 border-white/5"
                >
                  <div className="w-10 h-10 rounded-lg bg-white/5 overflow-hidden border border-white/10">
                    <img src={startups.find(s => s.id === item.id)?.imageUrl} className="w-full h-full object-cover" alt="" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h5 className="font-bold text-sm truncate">{item.name}</h5>
                    <p className="text-mindcet-orange font-mono text-xs font-bold">${item.amount.toLocaleString()}</p>
                  </div>
                  <span className="text-white/20 font-black text-xl">#{index + 4}</span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </div>
      
      {/* Footer / Ticker */}
      <div className="h-16 bg-white/5 border-t border-white/10 flex items-center px-12 overflow-hidden">
        <div className="flex animate-marquee whitespace-nowrap gap-12 text-sm font-medium text-white/40 uppercase tracking-[0.2em]">
          <span>INVEST IN THE FUTURE OF LEARNING</span>
          <span className="text-mindcet-orange">●</span>
          <span>MINDCET DEMO DAY 2024</span>
          <span className="text-mindcet-orange">●</span>
          <span>GLOBAL EDTECH ACCURACY</span>
          <span className="text-mindcet-orange">●</span>
          <span>TRANSFORMING EDUCATION THROUGH INNOVATION</span>
          <span className="text-mindcet-orange">●</span>
          <span>JOIN THE ELITE PORTFOLIO</span>
        </div>
      </div>
      
      {/* Examples Tooltip/Button */}
      <div className="fixed bottom-24 right-8 z-50">
        <button 
          onClick={() => setShowingExamples(!showingExamples)}
          className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all border ${
            showingExamples 
            ? 'bg-white text-mindcet-blue border-white' 
            : 'bg-white/5 text-white/40 border-white/10 hover:bg-white/10'
          } text-[10px] uppercase font-bold tracking-widest`}
        >
          {showingExamples ? 'Showing examples' : 'Show examples'}
          <div className={`w-3 h-3 rounded-full ${showingExamples ? 'bg-mindcet-orange animate-pulse' : 'bg-white/20'}`} />
        </button>
      </div>

      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          animation: marquee 30s linear infinite;
        }
      `}</style>
    </div>
  );
}
