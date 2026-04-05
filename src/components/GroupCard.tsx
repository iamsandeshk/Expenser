import { useState } from 'react';
import { Folder, Edit, Trash2, ExternalLink, Pin, PinOff } from 'lucide-react';
import { LinkGroup, deleteGroup, getLinks, toggleGroupPin } from '@/lib/storage';
import { useToast } from '@/hooks/use-toast';
import { EditGroupModal } from '@/components/modals/EditGroupModal';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator,
} from '@/components/ui/context-menu';
import { cn } from '@/lib/utils';

interface GroupCardProps {
  group: LinkGroup;
  onClick: () => void;
  onRefresh: () => void;
}

export const GroupCard = ({ group, onClick, onRefresh }: GroupCardProps) => {
  const { toast } = useToast();
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const groupLinks = getLinks().filter(link => link.groupId === group.id);
  const linkCount = groupLinks.length;
  const previewLinks = groupLinks.slice(0, 4);

  const handleDelete = () => {
    deleteGroup(group.id);
    onRefresh();
    toast({
      title: "Group Deleted",
      description: `${group.name} and its ${linkCount} links have been removed.`,
    });
  };

  const handleTogglePin = () => {
    toggleGroupPin(group.id);
    onRefresh();
    toast({
      title: group.pinned ? "Group Unpinned" : "Group Pinned",
      description: `${group.name} has been ${group.pinned ? 'unpinned' : 'pinned'}.`,
    });
  };

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div 
            className="group relative flex flex-col rounded-[2.25rem] cursor-pointer transition-all duration-500 active:scale-[0.94] overflow-hidden"
            onClick={onClick}
            style={{
              background: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border) / 0.5)',
              boxShadow: '0 12px 30px -15px hsl(var(--foreground) / 0.12)',
              aspectRatio: '0.85/1',
            }}
          >
            {/* Top Full-Width Preview Section */}
            <div 
               className="relative h-[55%] w-full flex items-center justify-center overflow-hidden transition-all duration-500 group-hover:h-[60%]"
               style={{ backgroundColor: group.color + '10' }}
            >
               {/* Decorative Gradient Overlay */}
               <div className="absolute inset-0 opacity-[0.2]" style={{ background: `linear-gradient(to bottom, ${group.color}, transparent)` }} />
               
               {/* Main Visual Representation */}
               <div className="relative z-10 w-full h-full flex items-center justify-center pt-2">
                  {/* Backdrop folder shape (blurred/soft) */}
                  <Folder 
                    size={80} 
                    className="absolute opacity-[0.05] transform -rotate-6 transition-all duration-700 group-hover:scale-150 group-hover:rotate-12"
                    style={{ color: group.color }}
                  />

                  {/* Icon Grid/Stack */}
                  <div className="grid grid-cols-2 gap-2 p-4 w-[75%] max-w-[120px]">
                     {previewLinks.length > 0 ? (
                        previewLinks.map((link, i) => (
                           <div key={link.id} className={cn(
                             "aspect-square rounded-[1rem] bg-white shadow-xl flex items-center justify-center overflow-hidden border border-black/5 transition-all duration-500",
                             i === 0 && "translate-x-1.5 translate-y-1.5 rotate-6 group-hover:translate-x-0 group-hover:translate-y-0 group-hover:rotate-0",
                             i === 1 && "-translate-x-1.5 translate-y-1.5 -rotate-6 group-hover:translate-x-0 group-hover:translate-y-0 group-hover:rotate-0",
                             i === 2 && "translate-x-1.5 -translate-y-1.5 -rotate-12 group-hover:translate-x-0 group-hover:translate-y-0 group-hover:rotate-0",
                             i === 3 && "-translate-x-1.5 -translate-y-1.5 rotate-12 group-hover:translate-x-0 group-hover:translate-y-0 group-hover:rotate-0"
                           )}>
                              <img 
                                src={link.favicon || `https://logo.clearbit.com/${new URL(link.url).hostname}?size=128`} 
                                className="w-[50%] h-[50%] object-contain" 
                                onError={e => e.currentTarget.style.display='none'} 
                              />
                           </div>
                        ))
                     ) : (
                        <div className="col-span-2 row-span-2 flex items-center justify-center opacity-20">
                           <Folder size={40} style={{ color: group.color }} />
                        </div>
                     )}
                  </div>
               </div>

               {/* Pin Badge Overlay */}
               {group.pinned && (
                 <div className="absolute top-4 right-4 z-20 w-8 h-8 rounded-2xl flex items-center justify-center shadow-lg transform rotate-12 bg-white border-2 border-primary/10 transition-transform group-hover:scale-110">
                   <Pin size={11} className="text-orange-500" strokeWidth={3} />
                 </div>
               )}
            </div>

            {/* Bottom Info Section */}
            <div className="flex-1 p-5 flex flex-col justify-center items-center text-center relative z-20 bg-card">
              <h3 className="font-black text-[15px] leading-tight line-clamp-2 text-foreground/90 group-hover:text-primary transition-colors duration-300 tracking-tight">
                {group.name}
              </h3>
              <div className="mt-2.5 flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary/40">
                 <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: group.color }} />
                 <span className="text-[10px] text-muted-foreground font-black uppercase tracking-widest leading-none">
                  {linkCount} {linkCount === 1 ? 'Entry' : 'Entries'}
                 </span>
              </div>
            </div>

            {/* Selection Highlight Ring */}
            <div className="absolute inset-0 rounded-[2.25rem] border-2 border-primary opacity-0 transition-opacity duration-300 group-active:opacity-20 pointer-events-none" />
          </div>
        </ContextMenuTrigger>

        <ContextMenuContent className="glass-card border-border/50 min-w-[200px] p-2 rounded-2xl shadow-2xl z-[500]">
          <ContextMenuItem onSelect={onClick} className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all active:scale-[0.98] cursor-pointer">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <ExternalLink size={16} strokeWidth={2.5} />
            </div>
            <span className="font-bold text-[14px]">Open Collection</span>
          </ContextMenuItem>
          
          <ContextMenuSeparator className="my-1.5 bg-border/40" />
          
          <ContextMenuItem onSelect={handleTogglePin} className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all active:scale-[0.98] cursor-pointer">
            <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center text-orange-500">
              {group.pinned ? <PinOff size={16} strokeWidth={2.5} /> : <Pin size={16} strokeWidth={2.5} />}
            </div>
            <span className="font-bold text-[14px]">{group.pinned ? 'Unpin' : 'Pin to Top'}</span>
          </ContextMenuItem>

          <ContextMenuItem onSelect={() => setShowEditModal(true)} className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all active:scale-[0.98] cursor-pointer">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500">
              <Edit size={16} strokeWidth={2.5} />
            </div>
            <span className="font-bold text-[14px]">Rename / Edit</span>
          </ContextMenuItem>

          <ContextMenuSeparator className="my-1.5 bg-border/40" />

          <ContextMenuItem 
            onSelect={() => setShowDeleteConfirm(true)} 
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-destructive focus:bg-destructive/10 focus:text-destructive transition-all active:scale-[0.98] cursor-pointer"
          >
            <div className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center text-destructive">
               <Trash2 size={16} strokeWidth={2.5} />
            </div>
            <span className="font-bold text-[14px]">Delete Collection</span>
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      <EditGroupModal group={group} isOpen={showEditModal} onClose={() => setShowEditModal(false)} onSave={onRefresh} />

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[1000] flex items-end justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={() => setShowDeleteConfirm(false)}>
           <div className="w-full max-w-md bg-card rounded-[2.5rem] p-7 pt-9 pb-10 space-y-6 animate-in slide-in-from-bottom-10 border border-border/10 duration-300 shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="text-center space-y-2">
                 <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4"><Trash2 size={28} className="text-destructive" /></div>
                 <h2 className="text-xl font-bold tracking-tight text-destructive">Destroy Group?</h2>
                 <p className="text-sm text-muted-foreground px-4 leading-relaxed tracking-tight">Erase "<span className="font-semibold text-foreground">{group.name}</span>"? This will also discard its {linkCount} items.</p>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-4">
                 <button onClick={() => setShowDeleteConfirm(false)} className="h-14 rounded-2xl bg-secondary/50 font-bold active:scale-95 transition-all">Keep</button>
                 <button onClick={handleDelete} className="h-14 rounded-2xl bg-destructive text-white font-black shadow-lg shadow-destructive/20 active:scale-95 transition-all">Destroy</button>
              </div>
           </div>
        </div>
      )}
    </>
  );
};
