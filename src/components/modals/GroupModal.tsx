import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, Plus, ExternalLink, Search, X, Check, Copy, MoreHorizontal, LayoutGrid, List } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { LinkGroup, getLinks, LinkItem, moveLinksToGroup, getGroups } from '@/lib/storage';
import { LinkCard } from '@/components/LinkCard';
import { AddLinkModal } from '@/components/modals/AddLinkModal';
import { cn } from '@/lib/utils';

interface GroupModalProps {
  group: LinkGroup;
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => void;
}

export const GroupModal = ({ group, isOpen, onClose, onRefresh }: GroupModalProps) => {
  const [groupLinks, setGroupLinks] = useState<LinkItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddLinkModal, setShowAddLinkModal] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [selectedForMove, setSelectedForMove] = useState<string[]>([]);
  const [pickerSearch, setPickerSearch] = useState('');

  const loadGroupLinks = () => {
    const allLinks = getLinks();
    const links = allLinks.filter(link => link.groupId === group.id);
    setGroupLinks(links);
  };

  useEffect(() => {
    if (isOpen) {
      loadGroupLinks();
    }
  }, [group.id, isOpen]);

  const allOtherLinks = getLinks().filter(l => l.groupId !== group.id);
  const filteredOtherLinks = allOtherLinks.filter(link => 
    link.name.toLowerCase().includes(pickerSearch.toLowerCase()) ||
    link.url.toLowerCase().includes(pickerSearch.toLowerCase())
  );

  const filteredLinks = groupLinks.filter(link =>
    link.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    link.url.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleRefresh = () => {
    loadGroupLinks();
    onRefresh();
  };

  const handleMoveLinks = () => {
    if (selectedForMove.length === 0) return;
    moveLinksToGroup(selectedForMove, group.id);
    setSelectedForMove([]);
    setShowPicker(false);
    handleRefresh();
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[10001] flex items-end justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-350" onClick={onClose}>
      <div 
        className="w-full max-w-2xl h-[94vh] bg-card rounded-t-[3rem] flex flex-col animate-in slide-in-from-bottom-20 duration-500 shadow-2xl relative overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div 
          className="absolute inset-x-0 -top-20 h-80 opacity-[0.06] blur-[100px] pointer-events-none transform -rotate-12"
          style={{ background: group.color }}
        />

        <div className="w-full flex justify-center py-2.5 opacity-20 hover:opacity-40 transition-opacity">
           <div className="w-10 h-1 rounded-full bg-foreground" />
        </div>

        <div className="px-8 pb-5 pt-2">
           <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                 <button onClick={onClose} className="w-11 h-11 rounded-full bg-secondary/50 flex items-center justify-center hover:bg-secondary active:scale-95 transition-all group/back">
                    <ArrowLeft size={20} className="group-hover:-translate-x-0.5 transition-transform" />
                 </button>
                 <div className="flex items-center gap-4">
                    <div 
                       className="w-14 h-14 rounded-[1.75rem] flex items-center justify-center shadow-xl relative overflow-hidden"
                       style={{ background: 'hsl(var(--card))', border: '1.5px solid ' + group.color + '25' }}
                    >
                       <div className="absolute inset-0 opacity-[0.1]" style={{ background: group.color }} />
                       <div className="w-3.5 h-3.5 rounded-full shadow-inner ring-4 ring-background/10 z-10" style={{ backgroundColor: group.color }} />
                    </div>
                    <div>
                       <h2 className="text-2xl font-black tracking-tight leading-none">{group.name}</h2>
                       <div className="flex items-center gap-2.5 mt-2">
                          <span className="text-[10px] text-muted-foreground/50 font-black uppercase tracking-[0.12em] px-2.5 py-0.5 rounded-md bg-secondary/40">
                             {groupLinks.length} Items
                          </span>
                       </div>
                    </div>
                 </div>
              </div>
              <div className="flex items-center gap-2">
                 <button onClick={handleRefresh} className="w-11 h-11 rounded-full bg-secondary/30 flex items-center justify-center hover:bg-secondary transition-colors">
                    <MoreHorizontal size={20} />
                 </button>
              </div>
           </div>

           <div className="flex gap-3">
              <div className="relative flex-1 group">
                 <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground/50 transition-colors group-focus-within:text-primary" size={18} />
                 <Input
                   placeholder="Search categorized links..."
                   value={searchQuery}
                   onChange={(e) => setSearchQuery(e.target.value)}
                   className="pl-12 h-14 rounded-2xl bg-secondary/30 focus:bg-background border-border/10 focus:border-primary/40 focus:ring-4 focus:ring-primary/10 transition-all font-bold placeholder:text-muted-foreground/30 placeholder:font-black placeholder:uppercase placeholder:text-[10px] placeholder:tracking-widest"
                 />
              </div>
              <button
                onClick={() => setShowAddLinkModal(true)}
                className="w-14 h-14 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shadow-xl shadow-primary/30 hover:brightness-110 shadow-lg active:scale-90 transition-all font-black"
                title="Add link to group"
              >
                <Plus size={24} strokeWidth={3} />
              </button>
           </div>
        </div>

        <div className="flex-1 overflow-y-auto px-8 py-2 custom-scrollbar">
          {filteredLinks.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-2 gap-4 pb-32">
              {filteredLinks.map((link) => (
                <LinkCard
                  key={link.id}
                  link={link}
                  onRefresh={handleRefresh}
                  isGroupView={true}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in zoom-in-95 duration-500">
               <div 
                 className="w-24 h-24 rounded-[3rem] shadow-2xl flex items-center justify-center mb-8 relative group"
                 style={{ background: 'hsl(var(--card))', border: '1px solid ' + group.color + '20' }}
               >
                  <div className="absolute inset-0 opacity-[0.05] blur-xl scale-125" style={{ background: group.color }} />
                  <ExternalLink size={32} className="text-muted-foreground transition-all group-hover:scale-110 group-hover:rotate-6" />
               </div>
               <h3 className="text-2xl font-black mb-2 tracking-tight">
                  {searchQuery ? 'NotFoundException' : 'Category Empty'}
               </h3>
               <p className="text-sm text-muted-foreground max-w-[240px] mx-auto mb-10 leading-relaxed font-medium">
                  {searchQuery 
                    ? `We couldn't find any links matching "${searchQuery}" in this group`
                    : `No links have been categorized under ${group.name} yet.`
                  }
               </p>
               <div className="flex flex-col gap-3 w-full max-w-[220px]">
                  <button
                    onClick={() => setShowAddLinkModal(true)}
                    className="h-14 rounded-2xl bg-primary text-white font-black shadow-2xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 text-sm"
                  >
                    <Plus size={18} strokeWidth={3} />
                    Add First Link
                  </button>
                  {allOtherLinks.length > 0 && !searchQuery && (
                    <button
                      onClick={() => setShowPicker(true)}
                      className="h-14 rounded-2xl bg-secondary/80 text-foreground font-bold hover:bg-secondary flex items-center justify-center gap-3 transition-all active:scale-95 text-sm"
                    >
                      <LayoutGrid size={16} />
                      Pick Existing
                    </button>
                  )}
               </div>
            </div>
          )}
        </div>

        {groupLinks.length > 0 && allOtherLinks.length > 0 && !searchQuery && (
          <div className="absolute bottom-10 inset-x-0 px-8 flex justify-center pointer-events-none">
             <button
                onClick={() => setShowPicker(true)}
                className="h-16 px-10 rounded-[2rem] bg-foreground text-background font-black shadow-[0_20px_40px_-10px_rgba(0,0,0,0.3)] hover:scale-[1.05] transition-all active:scale-[0.97] flex items-center gap-4 pointer-events-auto group/fab"
             >
                <div className="w-8 h-8 rounded-xl bg-background/20 flex items-center justify-center group-hover/fab:rotate-90 transition-transform duration-500">
                   <Plus size={18} className="text-background" strokeWidth={3} />
                </div>
                <span className="text-sm tracking-tight">Move from Other Groups</span>
             </button>
          </div>
        )}

        {showPicker && (
          <div className="absolute inset-0 z-[120] bg-background rounded-t-[3rem] flex flex-col animate-in slide-in-from-bottom duration-500">
             <div className="p-8 pb-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                   <button onClick={() => setShowPicker(false)} className="w-11 h-11 rounded-full bg-secondary/50 flex items-center justify-center hover:bg-secondary active:scale-90 transition-all">
                      <ArrowLeft size={20} />
                   </button>
                   <div>
                      <h3 className="font-black text-xl tracking-tight leading-none">Pick Content</h3>
                      <div className="flex items-center gap-2 mt-2">
                        <div className="w-2 h-2 rounded-full" style={{ background: group.color }} />
                        <p className="text-[10px] text-muted-foreground uppercase font-black tracking-[0.15em]">Categorize to {group.name}</p>
                      </div>
                   </div>
                </div>
                <button onClick={() => setShowPicker(false)} className="w-11 h-11 rounded-full bg-secondary/30 flex items-center justify-center hover:bg-secondary transition-colors">
                   <X size={20} />
                </button>
             </div>

             <div className="px-8 py-4">
                <div className="relative group/picker">
                   <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground/40 transition-colors group-focus-within/picker:text-primary" size={18} />
                   <Input
                     placeholder="Search your library..."
                     value={pickerSearch}
                     onChange={(e) => setPickerSearch(e.target.value)}
                     className="pl-12 h-14 rounded-2xl bg-secondary/20 border-border/5 focus:bg-background focus:ring-4 focus:ring-primary/10 transition-all font-bold placeholder:text-muted-foreground/30 placeholder:uppercase placeholder:text-[9px] placeholder:tracking-[0.2em]"
                   />
                </div>
             </div>

             <div className="flex-1 overflow-y-auto px-8 space-y-3 pb-36 custom-scrollbar pt-2">
                {filteredOtherLinks.length > 0 ? (
                  filteredOtherLinks.map(link => {
                     const isSelected = selectedForMove.includes(link.id);
                     const linkGroup = getGroups().find(g => g.id === link.groupId);
                     
                     return (
                        <div 
                          key={link.id}
                          onClick={() => setSelectedForMove(prev => 
                            isSelected ? prev.filter(id => id !== link.id) : [...prev, link.id]
                          )}
                          className={cn(
                            "p-4 rounded-[1.75rem] border transition-all duration-300 flex items-center justify-between cursor-pointer group active:scale-[0.98]",
                            isSelected 
                              ? "bg-primary/5 border-primary/20 shadow-xl shadow-primary/5" 
                              : "bg-secondary/15 border-transparent hover:bg-secondary/35"
                          )}
                        >
                           <div className="flex items-center gap-4">
                              <div className="w-14 h-14 rounded-2xl bg-white shadow-sm flex items-center justify-center overflow-hidden border border-black/5 group-hover:scale-105 transition-transform duration-300">
                                 {link.favicon ? (
                                    <img src={link.favicon} className="w-7 h-7 object-contain" onError={(e) => e.currentTarget.style.display = 'none'} />
                                 ) : (
                                    <ExternalLink size={20} className="text-muted-foreground/30" />
                                 )}
                              </div>
                              <div className="text-left min-w-0">
                                 <p className="text-[15px] font-black truncate max-w-[160px] sm:max-w-[240px] leading-tight mb-1">{link.name}</p>
                                 <div className="flex items-center gap-2">
                                    {linkGroup ? (
                                       <div className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider" style={{ background: linkGroup.color + '15', color: linkGroup.color }}>
                                          {linkGroup.name}
                                       </div>
                                    ) : (
                                       <div className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-indigo-500/10 text-indigo-500">
                                          Uncategorized
                                       </div>
                                    )}
                                    <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                                    <p className="text-[10px] font-bold text-muted-foreground/50 truncate max-w-[100px]">{new URL(link.url).hostname}</p>
                                 </div>
                              </div>
                           </div>
                           <div className={cn(
                             "w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all duration-500",
                             isSelected 
                                ? "bg-primary border-primary scale-110 shadow-2xl shadow-primary/30" 
                                : "border-muted-foreground/15 bg-background/50"
                           )}>
                              {isSelected && <Check size={18} className="text-primary-foreground" strokeWidth={4} />}
                           </div>
                        </div>
                     );
                  })
                ) : (
                  <div className="py-20 text-center animate-in fade-in duration-500">
                     <p className="text-sm font-black text-muted-foreground uppercase tracking-widest opacity-30">Empty Library</p>
                  </div>
                )}
             </div>

             {selectedForMove.length > 0 && (
                <div className="absolute bottom-12 inset-x-0 px-8 flex justify-center animate-in slide-in-from-bottom-5 duration-400">
                   <button 
                     onClick={handleMoveLinks}
                     className="h-16 px-12 rounded-[2rem] bg-primary text-primary-foreground font-black shadow-2xl shadow-primary/40 hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-4 text-base"
                   >
                     Move To {group.name}
                     <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center">
                        <span className="text-xs font-black">{selectedForMove.length}</span>
                     </div>
                   </button>
                </div>
             )}
          </div>
        )}
      </div>

      <AddLinkModal
        isOpen={showAddLinkModal}
        onClose={() => setShowAddLinkModal(false)}
        onAdd={handleRefresh}
        targetGroupId={group.id}
      />
    </div>,
    document.body
  );
};
