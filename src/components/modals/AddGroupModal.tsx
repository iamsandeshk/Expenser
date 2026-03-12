
import { useState } from 'react';
import { Folder, Palette } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
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

    saveGroup(newGroup);
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

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="glass-card border-0 max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Folder size={20} />
            Create New Group
          </DialogTitle>
          <DialogDescription>
            Organize your links by creating a new group with a custom color.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="groupName">Group Name</Label>
            <Input
              id="groupName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter group name"
              className="input-liquid"
              required
            />
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Palette size={16} />
              Color
            </Label>
            <div className="grid grid-cols-4 gap-3">
              {colors.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setSelectedColor(color)}
                  className={`w-12 h-12 rounded-xl transition-all ${
                    selectedColor === color 
                      ? 'ring-2 ring-foreground ring-offset-2 ring-offset-background scale-110' 
                      : 'hover:scale-105'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              onClick={handleClose}
              variant="secondary"
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 btn-primary"
              disabled={!name.trim()}
            >
              Create Group
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
