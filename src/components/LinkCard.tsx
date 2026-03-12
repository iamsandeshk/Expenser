
import { useState } from 'react';
import { ExternalLink, Edit, Trash2, Pin, PinOff, Copy } from 'lucide-react';
import { LinkItem, deleteLink, toggleLinkPin } from '@/lib/storage';
import { useToast } from '@/hooks/use-toast';
import { EditLinkModal } from '@/components/modals/EditLinkModal';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator,
} from '@/components/ui/context-menu';

interface LinkCardProps {
  link: LinkItem;
  onRefresh: () => void;
  viewMode?: 'list' | 'grid';
}

export const LinkCard = ({ link, onRefresh, viewMode = 'list' }: LinkCardProps) => {
  const { toast } = useToast();
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleOpen = () => {
    window.open(link.url, '_blank', 'noopener,noreferrer');
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(link.url);
      toast({ title: "Link Copied", description: `${link.name} URL copied.` });
    } catch {
      const textArea = document.createElement('textarea');
      textArea.value = link.url;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      toast({ title: "Link Copied", description: `${link.name} URL copied.` });
    }
  };

  const handleDelete = () => {
    deleteLink(link.id);
    onRefresh();
    setShowDeleteConfirm(false);
    toast({ title: "Link Deleted", description: `${link.name} has been removed.` });
  };

  const handleTogglePin = () => {
    toggleLinkPin(link.id);
    onRefresh();
    toast({
      title: link.pinned ? "Link Unpinned" : "Link Pinned",
      description: `${link.name} has been ${link.pinned ? 'unpinned' : 'pinned'}.`,
    });
  };

  const getDomainFromUrl = (url: string) => {
    try { return new URL(url).hostname.replace('www.', ''); }
    catch { return url; }
  };

  const getFaviconUrl = (url: string) => {
    try {
      const domain = new URL(url).hostname;
      return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
    } catch { return null; }
  };

  const favicon = link.favicon || getFaviconUrl(link.url);

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger>
          {viewMode === 'grid' ? (
            <div
              className="group relative overflow-hidden rounded-[1.25rem] cursor-pointer transition-all duration-200 active:scale-[0.97]"
              onClick={handleOpen}
              style={{
                background: 'hsl(var(--card) / 0.8)',
                border: '1px solid hsl(var(--border) / 0.2)',
              }}
            >
              {/* Top gradient glow behind icon */}
              <div className="absolute inset-x-0 top-0 h-24 opacity-30"
                style={{
                  background: 'radial-gradient(ellipse 80% 100% at 50% 0%, hsl(var(--primary) / 0.25), transparent)',
                }} />

              {/* Icon area */}
              <div className="relative flex items-center justify-center pt-7 pb-5">
                <div className="w-16 h-16 rounded-[1.125rem] flex items-center justify-center overflow-hidden shadow-sm"
                  style={{ background: 'hsl(var(--secondary) / 0.8)', border: '1px solid hsl(var(--border) / 0.15)' }}>
                  {favicon ? (
                    <img src={favicon} alt="" className="w-8 h-8 object-contain"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  ) : (
                    <ExternalLink size={22} className="text-muted-foreground/50" />
                  )}
                </div>
                {link.pinned && (
                  <div className="absolute top-3 right-3">
                    <Pin size={10} className="text-primary" />
                  </div>
                )}
              </div>

              {/* Gradient fade from icon into text area */}
              <div className="relative">
                <div className="absolute inset-x-0 -top-8 h-8 pointer-events-none"
                  style={{ background: 'linear-gradient(to bottom, transparent, hsl(var(--card) / 0.8))' }} />
                <div className="relative px-3 pb-4 text-center">
                  <h3 className="font-bold text-[13px] truncate leading-tight">{link.name}</h3>
                  <p className="text-[10px] text-muted-foreground/70 truncate mt-1">
                    {getDomainFromUrl(link.url)}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div
              className="group flex items-center gap-3.5 px-3.5 py-3 rounded-2xl cursor-pointer transition-all duration-200"
              onClick={handleOpen}
              style={{
                background: 'hsl(var(--card) / 0.6)',
                border: '1px solid hsl(var(--border) / 0.3)',
              }}
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden"
                style={{ background: 'hsl(var(--secondary) / 0.6)', border: '1px solid hsl(var(--border) / 0.2)' }}>
                {favicon ? (
                  <img src={favicon} alt="" className="w-5 h-5 object-contain"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                ) : (
                  <ExternalLink size={16} className="text-muted-foreground/60" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  {link.pinned && <Pin size={10} className="text-primary flex-shrink-0" />}
                  <h3 className="font-semibold text-sm truncate">{link.name}</h3>
                </div>
                <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                  {getDomainFromUrl(link.url)}
                </p>
              </div>
              <ExternalLink size={14} className="text-muted-foreground/40 flex-shrink-0 group-hover:text-primary/60 transition-colors" />
            </div>
          )}
        </ContextMenuTrigger>

        <ContextMenuContent className="glass-card border-border/50 min-w-[180px]">
          <ContextMenuItem onClick={handleOpen} className="flex items-center gap-3 px-4 py-3 rounded-xl">
            <ExternalLink size={16} /> Open Link
          </ContextMenuItem>
          <ContextMenuItem onClick={handleCopyLink} className="flex items-center gap-3 px-4 py-3 rounded-xl">
            <Copy size={16} /> Copy Link
          </ContextMenuItem>
          <ContextMenuSeparator className="bg-border/50" />
          <ContextMenuItem onClick={handleTogglePin} className="flex items-center gap-3 px-4 py-3 rounded-xl">
            {link.pinned ? <PinOff size={16} /> : <Pin size={16} />}
            {link.pinned ? 'Unpin' : 'Pin'}
          </ContextMenuItem>
          <ContextMenuItem onClick={() => setShowEditModal(true)} className="flex items-center gap-3 px-4 py-3 rounded-xl">
            <Edit size={16} /> Edit
          </ContextMenuItem>
          <ContextMenuSeparator className="bg-border/50" />
          <ContextMenuItem onClick={() => setShowDeleteConfirm(true)} className="flex items-center gap-3 px-4 py-3 rounded-xl text-destructive focus:text-destructive">
            <Trash2 size={16} /> Delete
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      <EditLinkModal link={link} isOpen={showEditModal} onClose={() => setShowEditModal(false)} onSave={onRefresh} />

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
          <div className="ios-card-modern p-6 max-w-sm w-full">
            <h3 className="text-lg font-bold mb-2">Delete Link</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Delete "<span className="font-medium text-foreground">{link.name}</span>"? This can't be undone.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 h-11 rounded-2xl font-semibold text-sm"
                style={{ background: 'hsl(var(--secondary))', border: '1px solid hsl(var(--border) / 0.3)' }}>
                Cancel
              </button>
              <button onClick={handleDelete}
                className="flex-1 h-11 rounded-2xl font-semibold text-sm bg-destructive text-destructive-foreground">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
