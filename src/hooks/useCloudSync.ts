import { useEffect } from "react";
import {
  subscribeToMySyncUpdates,
  acknowledgeUpdate
} from '@/integrations/firebase/sync';

import {
  STORAGE_KEYS,
  saveSharedExpense,
  getPersonProfiles,
  savePersonProfile,
  getAccountProfile
} from '@/lib/storage';

import { subscribeGoogleAuth } from '@/integrations/firebase/auth';
import { toast } from 'sonner';

export function useCloudSync() {

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    // ✅ Persistent dedupe
    const processedIds = new Set<string>(
      JSON.parse(localStorage.getItem('processed_sync_ids') || '[]')
    );

    const saveProcessedIds = () => {
      localStorage.setItem(
        'processed_sync_ids',
        JSON.stringify([...processedIds])
      );
    };

    const processUpdates = async (updates: any[]) => {
      for (const update of updates) {
        try {
          if (!update?.id || !update?.expense) {
            if (update?.syncDocId) await acknowledgeUpdate(update.syncDocId, update.syncCollection);
            continue;
          }

          // 🚫 duplicate
          if (processedIds.has(update.id)) {
            await acknowledgeUpdate(update.syncDocId, update.syncCollection);
            continue;
          }

          processedIds.add(update.id);
          saveProcessedIds();

          // 📡 Sync Group Metadata BEFORE operations
          if (update.groupName && update.expense?.groupId) {
            const groups = JSON.parse(localStorage.getItem('splitmate_friend_groups') || '[]');
            let group = groups.find((g: any) => g.id === update.expense.groupId);
            let changed = false;

            const resolveMember = (mName: string) => {
               if (mName === getAccountProfile().name) return 'me';
               return mName;
            };

            const incomingMembers = update.groupMembers 
              ? update.groupMembers.map(resolveMember) 
              : ['me', update.fromName || update.expense.personName];

            if (!group) {
              group = {
                id: update.expense.groupId,
                name: update.groupName,
                members: [...new Set(incomingMembers)],
                color: '#3b82f6',
                syncEmails: []
              };
              groups.push(group);
              changed = true;
            } else {
              // Merge any new incoming members
              incomingMembers.forEach((m: string) => {
                if (m && !group.members.includes(m)) {
                  group.members.push(m);
                  changed = true;
                }
              });
            }

            if (update.syncEmails && Array.isArray(update.syncEmails)) {
              const myEmail = getAccountProfile().email || '';
              // syncEmails from sender = everyone except that specific peer
              // so we should add sender's email too
              const toMerge = [...update.syncEmails];
              if (update.fromEmail && !toMerge.includes(update.fromEmail)) toMerge.push(update.fromEmail);
              const incomingOthers = toMerge.filter((e: string) => e.toLowerCase() !== myEmail.toLowerCase());
              const merged = [...new Set([...(group.syncEmails || []), ...incomingOthers])];
              if (JSON.stringify(group.syncEmails) !== JSON.stringify(merged)) {
                group.syncEmails = merged;
                changed = true;
              }
            }

            // 🔥 Smart cross-alias resolution using memberEmails payload
            if (update.memberEmails && typeof update.memberEmails === 'object') {
              const myEmail = (getAccountProfile().email || '').toLowerCase();
              const myProfiles = JSON.parse(localStorage.getItem('splitmate_person_profiles') || '{}');
              if (!group.memberEmails) group.memberEmails = {};

              Object.entries(update.memberEmails).forEach(([rawName, emailRaw]) => {
                const email = (emailRaw as string).toLowerCase();
                let resolvedName = rawName;

                if (email === myEmail) {
                  resolvedName = 'me';
                } else {
                  // Do I already know a profile with this email?
                  const match = Object.values(myProfiles).find((p: any) => p.email?.toLowerCase() === email);
                  if (match) resolvedName = (match as any).name;
                }

                // If the resolved name differs from the raw name, the raw name is an alias
                // → remove the stale alias from members + memberEmails
                if (resolvedName !== rawName) {
                  const aliasIdx = group.members.indexOf(rawName);
                  if (aliasIdx !== -1) {
                    group.members.splice(aliasIdx, 1);
                    changed = true;
                  }
                  // Remove stale memberEmails key for the old alias
                  if (group.memberEmails[rawName]) {
                    delete group.memberEmails[rawName];
                    changed = true;
                  }
                  // Also migrate expenses that reference the old alias in raw localStorage
                  const rawExpenses = JSON.parse(localStorage.getItem(STORAGE_KEYS.SHARED_EXPENSES) || '[]');
                  let expensesMigrated = false;
                  rawExpenses.forEach((e: any) => {
                    if (e.groupId === group.id) {
                      if (e.paidBy === rawName) { e.paidBy = resolvedName; expensesMigrated = true; }
                      if (e.forPerson === rawName) { e.forPerson = resolvedName; expensesMigrated = true; }
                      if (e.splitParticipants) {
                        e.splitParticipants = e.splitParticipants.map((p: string) => p === rawName ? resolvedName : p);
                        expensesMigrated = true;
                      }
                    }
                  });
                  if (expensesMigrated) {
                    localStorage.setItem(STORAGE_KEYS.SHARED_EXPENSES, JSON.stringify(rawExpenses));
                  }
                }

                // Ensure resolved name is in members list
                if (resolvedName && !group.members.includes(resolvedName)) {
                  group.members.push(resolvedName);
                  changed = true;
                }

                // Map email to resolved name
                if (resolvedName && group.memberEmails[resolvedName] !== email) {
                  group.memberEmails[resolvedName] = email;
                  changed = true;
                }
              });
            }

            // 🔥 Resolve manager from stable managerEmail field
            if (update.managerEmail) {
              const myEmail = (getAccountProfile().email || '').toLowerCase();
              const managerEmailLower = update.managerEmail.toLowerCase();
              let resolvedManagerName: string | undefined;

              if (managerEmailLower === myEmail) {
                resolvedManagerName = 'me';
              } else {
                // Find in memberEmails
                const existingEntry = Object.entries(group.memberEmails || {}).find(
                  ([, email]) => (email as string).toLowerCase() === managerEmailLower
                );
                if (existingEntry) resolvedManagerName = existingEntry[0];
                else {
                  // Fallback: find name by fromEmail/fromName
                  if (update.fromEmail?.toLowerCase() === managerEmailLower) resolvedManagerName = update.fromName;
                }
              }

              // Always persist managerEmail regardless of name resolution
              if (group.managerEmail !== managerEmailLower) {
                group.managerEmail = managerEmailLower;
                changed = true;
              }
              if (resolvedManagerName && group.managerName !== resolvedManagerName) {
                group.managerName = resolvedManagerName;
                changed = true;
              }
            }

            // Fallback for sender auto-mapping if not passed in memberEmails
            if (update.fromEmail && update.fromName && group.members.includes(update.fromName)) {
              if (!group.memberEmails) group.memberEmails = {};
              if (group.memberEmails[update.fromName] !== update.fromEmail) {
                group.memberEmails[update.fromName] = update.fromEmail;
                changed = true;
              }
            }

            if (changed) {
              localStorage.setItem('splitmate_friend_groups', JSON.stringify(groups));
              window.dispatchEvent(new Event('splitmate_friend_groups_changed'));
            }
          }

          // ➕ ADD (NOW PENDING APPROVAL)
          if (update.type === 'added') {
             const myEmail = getAccountProfile().email || '';
             const key = `${STORAGE_KEYS.PENDING_SYNC_UPDATES}_${myEmail.toLowerCase()}`;
             const pending = JSON.parse(localStorage.getItem(key) || '[]');
             
             const exists = pending.some((u: any) => u.expense.id === update.expense.id);
             const alreadyInLedger = JSON.parse(localStorage.getItem(STORAGE_KEYS.SHARED_EXPENSES) || '[]')
               .some((e: any) => e.id === update.expense.id);

             if (!exists && !alreadyInLedger) {
               pending.push(update);
               localStorage.setItem(key, JSON.stringify(pending));
               window.dispatchEvent(new Event('splitmate_data_changed'));
               toast.info(`New record from ${update.fromName || 'friend'} requested.`);
             }
          }

          // 🗑 DELETE
          else if (update.type === 'deleted') {
            let expenses = JSON.parse(
              localStorage.getItem(STORAGE_KEYS.SHARED_EXPENSES) || '[]'
            );

            const expenseToDelete = expenses.find((e: any) => e.id === update.expense.id);
            if (expenseToDelete && expenseToDelete.category === 'Settlement') {
               expenses.forEach((e: any) => {
                 if (e.personName === expenseToDelete.personName && e.settled) {
                   e.settled = false;
                 }
               });
            }

            const next = expenses.filter(
              (e: any) => e.id !== update.expense.id
            );

            localStorage.setItem(
              STORAGE_KEYS.SHARED_EXPENSES,
              JSON.stringify(next)
            );

            window.dispatchEvent(new Event('splitmate_data_changed'));
          }

          // 🛑 REJECTION
          else if (update.type === 'rejection') {
             const myEmail = getAccountProfile().email || '';
             const key = `${STORAGE_KEYS.REJECTION_NOTIFICATIONS}_${myEmail.toLowerCase()}`;
             const rejected = JSON.parse(localStorage.getItem(key) || '[]');
             rejected.push({
               id: update.id,
               recipientName: update.recipientName || update.fromName,
               senderEmail: update.fromEmail,
               reason: update.reason,
               originalExpense: update.originalExpense,
               timestamp: update.timestamp
             });
             localStorage.setItem(key, JSON.stringify(rejected));
             window.dispatchEvent(new Event('splitmate_sync_rejected'));
             toast.error(`Transaction declined by ${update.fromName || 'peer'}`);
          }

          // ✏️ UPDATE
          else if (update.type === 'updated') {
            const expenses = JSON.parse(
              localStorage.getItem(STORAGE_KEYS.SHARED_EXPENSES) || '[]'
            );

            const exp = expenses.find(
              (e: any) => e.id === update.expense.id
            );

            if (exp) {
              exp.reason = update.expense.reason;

              localStorage.setItem(
                STORAGE_KEYS.SHARED_EXPENSES,
                JSON.stringify(expenses)
              );

              window.dispatchEvent(new Event('splitmate_data_changed'));
            }
          }

          // ✅ acknowledge
          await acknowledgeUpdate(update.syncDocId, update.syncCollection);

        } catch (err) {
          console.error("Sync failed:", err);
        }
      }
    };

    // 🚀 start listener after auth
    const startRealtime = () => {
      if (unsubscribe) unsubscribe();

      unsubscribe = subscribeToMySyncUpdates(async (updates) => {
        await processUpdates(updates);
      });
    };

    // 🔐 auth listener
    const unsubscribeAuth = subscribeGoogleAuth((user) => {
      if (user?.email) {
        startRealtime();
      } else {
        if (unsubscribe) {
          unsubscribe();
          unsubscribe = null;
        }
      }
    });

    // 🧹 cleanup
    return () => {
      unsubscribeAuth();
      if (unsubscribe) unsubscribe();
    };

  }, []);
}

const fixDuplicatePersons = () => {
  const persons = JSON.parse(localStorage.getItem("splitmate_persons") || "[]");
  const expenses = JSON.parse(localStorage.getItem(STORAGE_KEYS.SHARED_EXPENSES) || "[]");

  // map email → name
  const emailMap: Record<string, string> = {};
  persons.forEach((p: any) => {
    if (p.email) emailMap[p.email] = p.name;
  });

  let changed = false;

  const updatedExpenses = expenses.map((exp: any) => {
    const email = persons.find((p: any) => p.name === exp.personName)?.email;

    if (email && emailMap[email] && exp.personName !== emailMap[email]) {
      changed = true;
      return {
        ...exp,
        personName: emailMap[email] // 🔥 force correct name
      };
    }

    return exp;
  });

  if (changed) {
    localStorage.setItem(
      STORAGE_KEYS.SHARED_EXPENSES,
      JSON.stringify(updatedExpenses)
    );

    console.log("✅ Fixed duplicate person names");
  }
};