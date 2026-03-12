
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

interface GroupCardProps {
  group: LinkGroup;
  onClick: () => void;
  onRefresh: () => void;
}

export const GroupCard = ({ group, onClick, onRefresh }: GroupCardProps) => {
  const { toast } = useToast();
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const linkCount = getLinks().filter(link => link.groupId === group.id).length;

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
        <ContextMenuTrigger>
          <div 
            className="group relative bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl p-4 cursor-pointer hover:bg-card/80 hover:border-border hover:shadow-lg transition-all duration-300 overflow-hidden"
            onClick={onClick}
          >
            {/* Pin indicator */}
            {group.pinned && (
              <div className="absolute top-2.5 right-2.5 z-10 w-5 h-5 rounded-lg bg-primary/90 flex items-center justify-center">
                <Pin size={10} className="text-white" />
              </div>
            )}

            {/* Content */}
            <div className="flex flex-col items-center text-center gap-3">
              {/* Group icon */}
              <div 
                className="w-12 h-12 rounded-2xl flex items-center justify-center border shadow-md"
                style={{ 
                  backgroundColor: group.color + '20',
                  borderColor: group.color + '30',
                }}
              >
                <Folder 
                  size={22} 
                  style={{ color: group.color }}
                />
              </div>

              {/* Group name */}
              <h3 className="font-semibold text-sm leading-tight line-clamp-2">
                {group.name}
              </h3>
            </div>
          </div>
        </ContextMenuTrigger>

        <ContextMenuContent className="glass-card border-border/50 min-w-[180px]">
          <ContextMenuItem onClick={onClick} className="flex items-center gap-3 px-4 py-3 rounded-xl">
            <ExternalLink size={16} />
            Open Group
          </ContextMenuItem>
          <ContextMenuSeparator className="bg-border/50" />
          <ContextMenuItem onClick={handleTogglePin} className="flex items-center gap-3 px-4 py-3 rounded-xl">
            {group.pinned ? <PinOff size={16} /> : <Pin size={16} />}
            {group.pinned ? 'Unpin' : 'Pin'}
          </ContextMenuItem>
          <ContextMenuItem onClick={() => setShowEditModal(true)} className="flex items-center gap-3 px-4 py-3 rounded-xl">
            <Edit size={16} />
            Edit
          </ContextMenuItem>
          <ContextMenuSeparator className="bg-border/50" />
          <ContextMenuItem 
            onClick={() => setShowDeleteConfirm(true)} 
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-destructive focus:text-destructive"
          >
            <Trash2 size={16} />
            Delete
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      {/* Edit Modal */}
      <EditGroupModal
        group={group}
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        onSave={onRefresh}
      />

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
          <div className="bg-card/95 backdrop-blur-xl border border-border/50 rounded-3xl p-8 max-w-sm w-full shadow-2xl">
            <h3 className="text-xl font-semibold mb-3">Delete Group</h3>
            <p className="text-muted-foreground mb-8 leading-relaxed">
              Are you sure you want to delete "<span className="font-medium text-foreground">{group.name}</span>" and its {linkCount} links? This action cannot be undone.
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-6 py-3 rounded-2xl bg-secondary/80 hover:bg-secondary/90 transition-all duration-300 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 px-6 py-3 rounded-2xl bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-all duration-300 font-medium"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
