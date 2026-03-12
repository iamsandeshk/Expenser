
import { useState } from 'react';
import { Edit, Palette } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { saveGroup, LinkGroup } from '@/lib/storage';
import { useToast } from '@/hooks/use-toast';

interface EditGroupModalProps {
  group: LinkGroup;
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

const colors = [
  '#3B82F6', '#EF4444', '#10B981', '#F59E0B', 
  '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'
];

export const EditGroupModal = ({ group, isOpen, onClose, onSave }: EditGroupModalProps) => {
  const { toast } = useToast();
  const [name, setName] = useState(group.name);
  const [selectedColor, setSelectedColor] = useState(group.color);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const updatedGroup = {
      ...group,
      name: name.trim(),
      color: selectedColor,
    };

    saveGroup(updatedGroup);
    onSave();
    onClose();

    toast({
      title: "Group Updated",
      description: `${name} has been updated successfully.`,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="glass-card border-0 max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit size={20} />
            Edit Group
          </DialogTitle>
          <DialogDescription>
            Update the group name and customize its color.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="editGroupName">Group Name</Label>
            <Input
              id="editGroupName"
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
              onClick={onClose}
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
              Save Changes
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
