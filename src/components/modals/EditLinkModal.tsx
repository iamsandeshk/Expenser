
import { useState } from 'react';
import { Edit, Loader } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { saveLink, fetchLinkMetadata, getGroups, LinkItem } from '@/lib/storage';
import { useToast } from '@/hooks/use-toast';

interface EditLinkModalProps {
  link: LinkItem;
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

export const EditLinkModal = ({ link, isOpen, onClose, onSave }: EditLinkModalProps) => {
  const { toast } = useToast();
  const [name, setName] = useState(link.name);
  const [url, setUrl] = useState(link.url);
  const [groupId, setGroupId] = useState(link.groupId || 'none');
  const [isLoading, setIsLoading] = useState(false);

  const groups = getGroups();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !url.trim()) return;

    setIsLoading(true);
    try {
      const validUrl = url.startsWith('http') ? url : `https://${url}`;
      let metadata = {};
      
      // Fetch new metadata if URL changed
      if (validUrl !== link.url) {
        metadata = await fetchLinkMetadata(validUrl);
      }

      const updatedLink = {
        ...link,
        name: name.trim(),
        url: validUrl,
        groupId: groupId === 'none' ? undefined : groupId,
        ...metadata
      };

      saveLink(updatedLink);
      onSave();
      onClose();

      toast({
        title: "Link Updated",
        description: `${name} has been updated successfully.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update link. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="glass-card border-0 max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit size={20} />
            Edit Link
          </DialogTitle>
          <DialogDescription>
            Update the link details and organization.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="editName">Name</Label>
            <Input
              id="editName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter link name"
              className="input-liquid"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="editUrl">URL</Label>
            <Input
              id="editUrl"
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
              <Label>Group</Label>
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
              onClick={onClose}
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
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
