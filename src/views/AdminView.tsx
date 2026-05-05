
import { useState, useEffect } from 'react';
import { db, auth, handleFirestoreError, OperationType, seedDemoData, loginWithGoogle } from '../lib/firebase';
import { collection, onSnapshot, doc, updateDoc, deleteDoc, addDoc, query, orderBy, getDocs, writeBatch } from 'firebase/firestore';
import { Startup, GlobalSettings, PollStatus } from '../types';
import { Trash2, Edit, Plus, Save, Play, Square, RotateCcw, Database, Shield, Snowflake } from 'lucide-react';
import { motion } from 'motion/react';
import Header from '../components/Header';

export default function AdminView() {
  const [startups, setStartups] = useState<Startup[]>([]);
  const [settings, setSettings] = useState<GlobalSettings | null>(null);
  const [isEditingStartup, setIsEditingStartup] = useState<string | null>(null);
  const [newStartup, setNewStartup] = useState<Partial<Startup>>({ name: '', description: '', imageUrl: '' });
  const [isSeeding, setIsSeeding] = useState(false);
  const [user, setUser] = useState(auth.currentUser);

  useEffect(() => {
    const unsubAuth = auth.onAuthStateChanged((u) => {
      setUser(u);
    });

    const unsubStartups = onSnapshot(query(collection(db, 'startups'), orderBy('order')), (snap) => {
      setStartups(snap.docs.map(d => ({ ...d.data(), id: d.id }) as Startup));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'startups'));

    const unsubSettings = onSnapshot(doc(db, 'config', 'global'), (snap) => {
      if (snap.exists()) setSettings(snap.data() as GlobalSettings);
    }, (error) => handleFirestoreError(error, OperationType.GET, 'config/global'));

    return () => { unsubAuth(); unsubStartups(); unsubSettings(); };
  }, []);

  const handleSeed = async () => {
    if (!confirm("This will add dummy startups and 20 dummy votes. Continue?")) return;
    setIsSeeding(true);
    try {
      await seedDemoData();
      alert("Demo data seeded successfully!");
    } catch (e) {
      alert("Error seeding data.");
    } finally {
      setIsSeeding(false);
    }
  };

  const clearAllPoints = async () => {
    if (!confirm("Delete ALL startups and ALL votes?")) return;
    const sSnap = await getDocs(collection(db, 'startups'));
    sSnap.forEach(d => deleteDoc(d.ref));
    const vSnap = await getDocs(collection(db, 'votes'));
    vSnap.forEach(d => deleteDoc(d.ref));
  };

  const clearResults = async () => {
    if (!confirm("Delete ALL votes? Startups will remain.")) return;
    const vSnap = await getDocs(collection(db, 'votes'));
    vSnap.forEach(d => deleteDoc(d.ref));
  };

  const updateStatus = async (status: PollStatus) => {
    const ref = doc(db, 'config', 'global');
    await updateDoc(ref, { pollStatus: status });
  };

  const toggleFreeze = async () => {
    const ref = doc(db, 'config', 'global');
    await updateDoc(ref, { frozen: !settings?.frozen });
  };

  const addStartup = async () => {
    if (!newStartup.name) return;
    const ref = collection(db, 'startups');
    await addDoc(ref, {
      ...newStartup,
      order: startups.length,
      imageUrl: newStartup.imageUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${newStartup.name}`
    });
    setNewStartup({ name: '', description: '', imageUrl: '' });
  };

  const deleteStartup = async (id: string) => {
    await deleteDoc(doc(db, 'startups', id));
  };

  if (!settings) return null;

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-8 text-center bg-mindcet-blue">
        <Header />
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="glass p-10 rounded-3xl max-w-md w-full">
          <div className="w-20 h-20 bg-mindcet-orange/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Shield className="text-mindcet-orange w-10 h-10" />
          </div>
          <h2 className="text-2xl font-display font-bold mb-4">Admin Portal</h2>
          <p className="text-white/60 mb-8">Restricted access. Please identify yourself to manage the poll.</p>
          <button 
            onClick={() => loginWithGoogle()}
            className="w-full bg-white text-mindcet-blue hover:bg-gray-100 py-4 rounded-xl font-bold flex items-center justify-center gap-3 transition-all shadow-xl"
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" />
            ADMIN LOGIN
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20 p-4 md:p-8 max-w-5xl mx-auto">
      <Header />
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-10">
        {/* Settings Card */}
        <div className="glass p-6 rounded-2xl">
          <h2 className="text-xl font-display font-semibold mb-6 flex items-center gap-2">
            <Play className="text-mindcet-orange w-5 h-5" />
            Poll Controls
          </h2>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
              <span>Status: <b className="uppercase text-mindcet-orange ml-2">{settings.pollStatus}</b></span>
              <div className="flex gap-2">
                {settings.pollStatus !== PollStatus.ACTIVE && (
                  <button onClick={() => updateStatus(PollStatus.ACTIVE)} className="bg-green-600 hover:bg-green-500 p-2 rounded-lg transition-colors">
                    <Play size={20} />
                  </button>
                )}
                {settings.pollStatus === PollStatus.ACTIVE && (
                  <button onClick={() => updateStatus(PollStatus.ENDED)} className="bg-red-600 hover:bg-red-500 p-2 rounded-lg transition-colors">
                    <Square size={20} />
                  </button>
                )}
                <button onClick={() => updateStatus(PollStatus.DRAFT)} className="bg-gray-600 hover:bg-gray-500 p-2 rounded-lg transition-colors">
                  <RotateCcw size={20} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={toggleFreeze}
                className={`flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all border ${
                  settings.frozen
                    ? 'bg-cyan-500/20 border-cyan-400/50 text-cyan-300 hover:bg-cyan-500/30'
                    : 'bg-white/5 border-white/20 hover:bg-white/10'
                }`}
              >
                <Snowflake size={18} />
                {settings.frozen ? 'UNFREEZE' : 'FREEZE'}
              </button>
              <button
                onClick={() => updateStatus(PollStatus.ENDED)}
                disabled={settings.pollStatus === PollStatus.ENDED}
                className="flex items-center justify-center gap-2 bg-red-600/80 hover:bg-red-500/80 py-3 rounded-xl font-bold transition-all disabled:opacity-40"
              >
                <Square size={18} />
                STOP
              </button>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <button
                onClick={handleSeed}
                disabled={isSeeding}
                className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 py-3 rounded-xl font-bold transition-all disabled:opacity-50"
              >
                <Database size={18} />
                {isSeeding ? 'SEEDING...' : 'SEED DEMO'}
              </button>
              <button
                onClick={clearResults}
                className="flex items-center justify-center gap-2 bg-orange-900/40 hover:bg-orange-800/40 py-3 rounded-xl font-bold transition-all border border-orange-500/20"
              >
                <Trash2 size={18} />
                CLEAR RESULTS
              </button>
              <button
                onClick={clearAllPoints}
                className="flex items-center justify-center gap-2 bg-red-900/40 hover:bg-red-800/40 py-3 rounded-xl font-bold transition-all border border-red-500/20"
              >
                <Trash2 size={18} />
                CLEAR ALL
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-sm opacity-70">Total Budget ($)</label>
              <input 
                type="number" 
                value={settings.totalBudget} 
                onChange={(e) => updateDoc(doc(db, 'config', 'global'), { totalBudget: Number(e.target.value) })}
                className="w-full bg-white/5 border border-white/20 p-3 rounded-xl focus:outline-none focus:border-mindcet-orange transition-all"
              />
            </div>
          </div>
        </div>

        {/* Add Startup Card */}
        <div className="glass p-6 rounded-2xl">
          <h2 className="text-xl font-display font-semibold mb-6 flex items-center gap-2">
            <Plus className="text-mindcet-orange w-5 h-5" />
            Add Startup
          </h2>
          <div className="space-y-4">
            <input 
              placeholder="Startup Name"
              value={newStartup.name}
              onChange={e => setNewStartup({...newStartup, name: e.target.value})}
              className="w-full bg-white/5 border border-white/20 p-3 rounded-xl focus:outline-none focus:border-mindcet-orange"
            />
            <input 
              placeholder="Logo URL (optional)"
              value={newStartup.imageUrl}
              onChange={e => setNewStartup({...newStartup, imageUrl: e.target.value})}
              className="w-full bg-white/5 border border-white/20 p-3 rounded-xl focus:outline-none focus:border-mindcet-orange"
            />
            <textarea 
              placeholder="Description"
              value={newStartup.description}
              onChange={e => setNewStartup({...newStartup, description: e.target.value})}
              className="w-full bg-white/5 border border-white/20 p-3 rounded-xl focus:outline-none focus:border-mindcet-orange h-20"
            />
            <button onClick={addStartup} className="w-full bg-mindcet-orange hover:bg-orange-400 py-3 rounded-xl font-bold transition-all shadow-lg shadow-orange-900/20">
              SAVE STARTUP
            </button>
          </div>
        </div>
      </div>

      <div className="mt-12 bg-white/5 rounded-2xl overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-white/10">
            <tr>
              <th className="p-4">Name</th>
              <th className="p-4">Description</th>
              <th className="p-4 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {startups.map(s => (
              <tr key={s.id} className="border-t border-white/10 hover:bg-white/5 transition-colors">
                <td className="p-4 font-medium">{s.name}</td>
                <td className="p-4 text-sm opacity-70">{s.description}</td>
                <td className="p-4 text-center">
                  <button onClick={() => deleteStartup(s.id)} className="text-red-400 hover:text-red-300 p-2 transition-colors">
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
