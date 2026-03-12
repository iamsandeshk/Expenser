
import { useState } from 'react';
import { X, Link as LinkIcon, Loader } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { saveLink, fetchLinkMetadata, generateId, getGroups } from '@/lib/storage';
import { useToast } from '@/hooks/use-toast';

interface AddLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: () => void;
}

export const AddLinkModal = ({ isOpen, onClose, onAdd }: AddLinkModalProps) => {
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [groupId, setGroupId] = useState<string>('none');
  const [isLoading, setIsLoading] = useState(false);

  const groups = getGroups();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !url.trim()) return;

    setIsLoading(true);
    try {
      // Ensure URL has protocol
      const validUrl = url.startsWith('http') ? url : `https://${url}`;
      
      // Fetch metadata
      const metadata = await fetchLinkMetadata(validUrl);

      const newLink = {
        id: generateId(),
        name: name.trim(),
        url: validUrl,
        groupId: groupId === 'none' ? undefined : groupId,
        createdAt: new Date().toISOString(),
        ...metadata
      };

      saveLink(newLink);
      onAdd();
      onClose();
      setName('');
      setUrl('');
      setGroupId('none');

      toast({
        title: "Link Added",
        description: `${name} has been saved successfully.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add link. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      onClose();
      setName('');
      setUrl('');
      setGroupId('none');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="glass-card border-0 max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LinkIcon size={20} />
            Add New Link
          </DialogTitle>
          <DialogDescription>
            Add a website URL to save for quick access later.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter link name"
              className="input-liquid"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="url">URL</Label>
            <Input
              id="url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
              className="input-liquid"
              required
            />
          </div>

          {groups.length > 0 && (
            <div className="space-y-2">
              <Label>Group (Optional)</Label>
              <Select value={groupId} onValueChange={setGroupId}>
                <SelectTrigger className="input-liquid">
                  <SelectValue placeholder="Select a group" />
                </SelectTrigger>
                <SelectContent className="glass-card">
                  <SelectItem value="none">No Group</SelectItem>
                  {groups.map((group) => (
                    <SelectItem key={group.id} value={group.id}>
                      {group.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              onClick={handleClose}
              variant="secondary"
              className="flex-1"
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 btn-primary"
              disabled={isLoading || !name.trim() || !url.trim()}
            >
              {isLoading ? (
                <>
                  <Loader size={16} className="animate-spin mr-2" />
                  Adding...
                </>
              ) : (
                'Add Link'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
