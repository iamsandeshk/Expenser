
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Folder, Palette, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { saveGroup, generateId } from '@/lib/storage';
import { useToast } from '@/hooks/use-toast';

interface AddGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: () => void;
}

const colors = [
  '#3B82F6', '#EF4444', '#10B981', '#F59E0B', 
  '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'
];

export const AddGroupModal = ({ isOpen, onClose, onAdd }: AddGroupModalProps) => {
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [selectedColor, setSelectedColor] = useState(colors[0]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newGroup = {
      id: generateId(),
      name: name.trim(),
      color: selectedColor,
      createdAt: new Date().toISOString(),
    };

    const saved = saveGroup(newGroup);
    if (!saved) return;
    onAdd();
    onClose();
    setName('');
    setSelectedColor(colors[0]);

    toast({
      title: "Group Created",
      description: `${name} group has been created successfully.`,
    });
  };

  const handleClose = () => {
    onClose();
    setName('');
    setSelectedColor(colors[0]);
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[10002] flex items-end justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={handleClose}>
      <div 
        className="w-full max-w-lg bg-card rounded-t-[2.5rem] p-7 pt-9 pb-16 space-y-6 animate-in slide-in-from-bottom-20 duration-300 shadow-2xl relative"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-2">
           <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
                 <Folder size={20} className="text-primary" />
              </div>
              <div>
                 <h2 className="text-xl font-bold tracking-tight">Create New Group</h2>
                 <p className="text-xs text-muted-foreground">Organize your links</p>
              </div>
           </div>
           <button onClick={handleClose} className="w-10 h-10 rounded-full bg-secondary/50 flex items-center justify-center hover:bg-secondary transition-colors">
              <X size={18} />
           </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2 px-1">
            <Label htmlFor="groupName" className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Group Name</Label>
            <Input
              id="groupName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter group name"
              className="input-liquid h-14 rounded-2xl bg-secondary/30 focus:bg-background transition-all"
              required
            />
          </div>

          <div className="space-y-3 px-1">
            <Label className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-muted-foreground ml-1">
              <Palette size={14} />
              Theme Color
            </Label>
            <div className="grid grid-cols-4 gap-4">
              {colors.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setSelectedColor(color)}
                  className={`relative w-full aspect-square rounded-2xl transition-all duration-200 group ${
                    selectedColor === color 
                      ? 'scale-110 shadow-lg shadow-black/10' 
                      : 'hover:scale-105 opacity-80 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: color }}
                >
                  {selectedColor === color && (
                    <div className="absolute inset-0 rounded-2xl ring-2 ring-foreground ring-offset-2 ring-offset-background" />
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 h-14 rounded-2xl bg-secondary/50 text-secondary-foreground font-bold hover:bg-secondary transition-all active:scale-[0.97]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-[2] h-14 rounded-2xl bg-primary text-primary-foreground font-black shadow-xl shadow-primary/20 hover:brightness-110 transition-all active:scale-[0.97] disabled:opacity-50"
              disabled={!name.trim()}
            >
              Create Group
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
