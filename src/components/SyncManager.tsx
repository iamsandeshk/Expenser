import { useState, useEffect } from 'react';
import { RefreshCw, X, Pencil, Check, Clock, AlertCircle, MessageSquare, Trash2, ShieldCheck } from 'lucide-react';
import { getPendingSyncUpdates, removePendingSyncUpdate, addRejectionUpdate, getRejectionUpdates, removeRejectionUpdate, getAccountProfile, generateId, savePersonProfile, applySyncUpdate, getPersonProfiles, updatePersonName } from '@/lib/storage';
import { MoneyDisplay } from './MoneyDisplay';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

export function SyncManager() {
  const [updates, setUpdates] = useState<any[]>([]);
  const [rejections, setRejections] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  
  // Name editing state
  const [editingSyncId, setEditingSyncId] = useState<string | null>(null);
  const [tempSyncName, setTempSyncName] = useState('');

  // Rejection State
  const [rejectingUpdate, setRejectingUpdate] = useState<any | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const refreshSyncStates = () => {
    const pending = getPendingSyncUpdates();
    const rejected = getRejectionUpdates();
    const profiles = getPersonProfiles() as Record<string, any>;
    
    // Map pending updates to use local profile names if email matches
    const mappedPending = pending.map(update => {
      if (update.fromEmail) {
        // Look up by email first
        const emailLower = update.fromEmail.toLowerCase();
        const existing = Object.values(profiles).find((p: any) => p.email?.toLowerCase() === emailLower);
        if (existing) {
          return { ...update, fromName: existing.name };
        }
      }
      return update;
    });

    setUpdates(mappedPending);
    setRejections(rejected);
    
    if (pending.length > 0 || rejected.length > 0) {
      setShowModal(true);
    } else {
      setShowModal(false);
    }
  };

  useEffect(() => {
    refreshSyncStates();
    const interval = setInterval(refreshSyncStates, 5000);
    window.addEventListener('storage', refreshSyncStates);
    window.addEventListener('splitmate_data_changed', refreshSyncStates);
    window.addEventListener('splitmate_sync_rejected', refreshSyncStates);
    window.addEventListener('splitmate_account_changed', refreshSyncStates);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', refreshSyncStates);
      window.removeEventListener('splitmate_data_changed', refreshSyncStates);
      window.removeEventListener('splitmate_sync_rejected', refreshSyncStates);
      window.removeEventListener('splitmate_account_changed', refreshSyncStates);
    };
  }, []);

  const handleAcceptOne = (update: any) => {
    // Determine the name to use
    let targetName = update.fromName;
    const profiles = getPersonProfiles() as Record<string, any>;

    // If edited via pencil icon, use that name
    if (editingSyncId === update.id && tempSyncName.trim()) {
      targetName = tempSyncName.trim();
    }

    // Now look up if we have an existing profile with this email or name
    if (update.fromEmail) {
      const emailLower = update.fromEmail.toLowerCase();
      const existing = Object.values(profiles).find((p: any) => p.email?.toLowerCase() === emailLower);
      
      if (existing) {
        if (targetName !== existing.name && editingSyncId === update.id) {
           // User explicitly RENAMED this person in the SyncManager
           // We should rename the existing profile across ALL records
           updatePersonName(existing.name, targetName);
        } else {
           // Otherwise, we just stick with the name we know for this email
           targetName = existing.name;
        }
      }
    }

    // Save/Update the profile and the update object before applying
    if (update.fromEmail) {
      savePersonProfile({ name: targetName, email: update.fromEmail });
    }
    
    update.fromName = targetName;
    update.expense.personName = targetName;

    applySyncUpdate(update);
    removePendingSyncUpdate(update.id);
    toast.success(`Accepted "${update.expense.reason}"`);
    setEditingSyncId(null);
    refreshSyncStates();
  };

  const startReject = (update: any) => {
    setRejectingUpdate(update);
    setRejectionReason('');
  };

  const submitReject = () => {
    if (!rejectionReason.trim()) {
      toast.error("Please provide a reason");
      return;
    }

    if (rejectingUpdate.fromEmail) {
      const myProfile = getAccountProfile();
      addRejectionUpdate({
        id: generateId(),
        recipientName: myProfile.name,
        senderEmail: myProfile.email || '',
        reason: rejectionReason,
        expense: rejectingUpdate.expense,
        originalExpense: rejectingUpdate.expense,
        timestamp: new Date().toISOString()
      } as any, rejectingUpdate.fromEmail);
    }

    removePendingSyncUpdate(rejectingUpdate.id);
    setRejectingUpdate(null);
    toast.info("Update declined");
    refreshSyncStates();
  };

  const handleClearRejections = () => {
    rejections.forEach(r => removeRejectionUpdate(r.id));
    refreshSyncStates();
  };

  return (
    <AnimatePresence>
      {showModal && (
        <div className="fixed inset-0 z-[10000] flex flex-col justify-end">
          {/* Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              handleClearRejections();
              setShowModal(false);
            }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Bottom Sheet */}
          <motion.div 
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="relative w-full max-h-[85vh] bg-card rounded-t-[3.5rem] border-t border-white/5 shadow-[0_-20px_50px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col"
          >
            {/* Grabber */}
            <div className="w-12 h-1.5 bg-white/10 rounded-full mx-auto mt-4 mb-4 shrink-0" />

            <div className="px-6 pb-4 flex items-center justify-between shrink-0">
               <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20">
                    <ShieldCheck className="text-primary" size={20} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold tracking-tight">Sync Center</h2>
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-50">Identity Verified Collaboration</p>
                  </div>
               </div>
               <button 
                 onClick={() => {
                   handleClearRejections();
                   setShowModal(false);
                 }}
                 className="w-10 h-10 rounded-full bg-secondary/50 flex items-center justify-center text-muted-foreground/60 active:scale-90 transition-all font-bold"
               >
                 <X size={20} />
               </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 pb-12 custom-scrollbar space-y-8">
              {/* Rejection Notifications First */}
              {rejections.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[11px] font-black uppercase tracking-[0.15em] text-destructive/80 flex items-center gap-2">
                       <AlertCircle size={14} />
                       Disputed Transactions ({rejections.length})
                    </h3>
                    <button onClick={handleClearRejections} className="text-[10px] font-bold text-muted-foreground hover:text-destructive active:scale-95 transition-all">CLEAR ALL</button>
                  </div>
                  
                  <div className="space-y-3">
                    {rejections.map((rej) => (
                      <div key={rej.id} className="p-5 bg-destructive/5 rounded-3xl border border-destructive/10 relative group">
                        <button 
                          onClick={() => { removeRejectionUpdate(rej.id); refreshSyncStates(); }}
                          className="absolute top-4 right-4 text-muted-foreground/20 group-hover:text-destructive transition-colors"
                        >
                          <X size={16} />
                        </button>
                        <div className="flex items-center gap-3 mb-3">
                           <div className="w-8 h-8 rounded-full bg-destructive/10 flex items-center justify-center text-destructive font-black text-xs">{rej.recipientName?.charAt(0)}</div>
                           <p className="text-sm font-bold">{rej.recipientName} declined your record</p>
                        </div>
                        <div className="bg-background/40 rounded-2xl p-4 mb-3 italic text-xs leading-relaxed opacity-80 border border-white/5">
                           "{rej.reason}"
                        </div>
                        <div className="flex justify-between items-center px-1 opacity-50 grayscale">
                           <span className="text-xs font-medium">{rej.originalExpense.reason}</span>
                           <MoneyDisplay amount={rej.originalExpense.amount} size="sm" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Pending Syncs */}
              {updates.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-[11px] font-black uppercase tracking-[0.15em] text-primary/80 flex items-center gap-2">
                    <Clock size={14} />
                    Incoming Requests ({updates.length})
                  </h3>

                  <div className="space-y-4">
                    {updates.map((update) => (
                      <div key={update.id} className="p-6 bg-secondary/20 rounded-[2.5rem] border border-white/5 space-y-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                             <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-black text-lg border border-primary/20">
                               {(editingSyncId === update.id ? tempSyncName : update.fromName)?.charAt(0).toUpperCase()}
                             </div>
                             <div>
                               {editingSyncId === update.id ? (
                                 <div className="flex items-center gap-1.5 animate-in slide-in-from-left-2 duration-300">
                                   <input 
                                     autoFocus
                                     className="bg-background/80 border border-primary/30 rounded-xl px-3 py-1.5 text-xs font-black uppercase tracking-tight w-36 outline-none focus:ring-2 ring-primary/10 transition-all shadow-inner"
                                     value={tempSyncName}
                                     onChange={(e) => setTempSyncName(e.target.value)}
                                     onKeyDown={(e) => e.key === 'Enter' && setEditingSyncId(null)}
                                   />
                                   <button 
                                     onClick={() => setEditingSyncId(null)} 
                                     className="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/20 active:scale-90 transition-all"
                                   >
                                     <Check size={14} strokeWidth={4} />
                                   </button>
                                 </div>
                               ) : (
                                 <div className="flex items-center gap-2">
                                   <h4 className="font-bold text-base">{update.fromName}</h4>
                                   <button 
                                     onClick={() => { setEditingSyncId(update.id); setTempSyncName(update.fromName); }}
                                     className="p-1.5 hover:bg-white/5 rounded-lg text-muted-foreground/40 hover:text-primary transition-all"
                                   >
                                     <Pencil size={12} />
                                   </button>
                                 </div>
                               )}
                               <p className="text-[10px] font-black text-muted-foreground/30 uppercase tracking-widest">{update.fromEmail}</p>
                             </div>
                          </div>
                          <span className="text-[10px] font-bold text-muted-foreground/40">{new Date(update.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>

                        <div className="bg-background/40 rounded-[2rem] p-5 border border-white/5 space-y-1">
                           <div className="flex justify-between items-end">
                              <div>
                                 <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/30 mb-1">Description</p>
                                 <p className="text-lg font-bold tracking-tight">"{update.expense.reason}"</p>
                              </div>
                              <div className="text-right">
                                 <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/30 mb-1">Amount</p>
                                 <MoneyDisplay amount={update.expense.amount} size="lg" className="text-2xl font-black text-white" />
                              </div>
                           </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                           <button 
                             onClick={() => startReject(update)}
                             className="h-14 rounded-2xl bg-secondary font-black uppercase tracking-widest text-[10px] text-muted-foreground active:scale-95 transition-all"
                           >
                             Decline
                           </button>
                           <button 
                             onClick={() => handleAcceptOne(update)}
                             className="h-14 rounded-2xl bg-primary text-white font-black uppercase tracking-widest text-[10px] shadow-lg shadow-primary/20 active:scale-95 transition-all font-bold"
                           >
                             Confirm
                           </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Rejection Portal (Nested Overlay effect) */}
            <AnimatePresence>
              {rejectingUpdate && (
                <motion.div 
                  initial={{ opacity: 0, scale: 1.1, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 1.1, y: 20 }}
                  className="absolute inset-0 z-[10001] bg-card p-8 flex flex-col justify-center"
                >
                   <div className="space-y-6 max-w-sm mx-auto w-full">
                      <div className="text-center">
                         <div className="w-20 h-20 bg-destructive/10 rounded-[2.5rem] flex items-center justify-center mx-auto mb-6 border border-destructive/20">
                            <MessageSquare className="text-destructive" size={32} />
                         </div>
                         <h3 className="text-2xl font-black tracking-tight">Decline Update</h3>
                         <p className="text-sm text-muted-foreground mt-2 font-medium">Explain why this doesn't look right so <span className="text-primary">{rejectingUpdate.fromName}</span> can fix it.</p>
                      </div>

                      <textarea
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        placeholder="e.g. Wrong amount, already paid..."
                        className="w-full bg-secondary/30 border border-border/10 rounded-[2rem] p-6 text-sm font-medium focus:ring-2 ring-primary/20 outline-none h-32 resize-none"
                        autoFocus
                      />

                      <div className="flex gap-3">
                         <button onClick={() => setRejectingUpdate(null)} className="flex-1 h-16 rounded-[1.5rem] bg-secondary text-sm font-black uppercase tracking-widest text-muted-foreground active:scale-95 transition-all">Cancel</button>
                         <button onClick={submitReject} className="flex-1 h-16 rounded-[1.5rem] bg-destructive text-white text-sm font-black uppercase tracking-widest shadow-xl shadow-destructive/20 active:scale-95 transition-all">Send & Decline</button>
                      </div>
                   </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
