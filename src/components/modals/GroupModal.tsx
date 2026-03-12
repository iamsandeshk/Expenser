
import { useState, useEffect } from 'react';
import { ArrowLeft, Plus, ExternalLink, Search } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { LinkGroup, getLinks, LinkItem } from '@/lib/storage';
import { LinkCard } from '@/components/LinkCard';
import { AddLinkModal } from '@/components/modals/AddLinkModal';

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

  const loadGroupLinks = () => {
    const allLinks = getLinks();
    const links = allLinks.filter(link => link.groupId === group.id);
    setGroupLinks(links);
  };

  useEffect(() => {
    loadGroupLinks();
  }, [group.id]);

  const filteredLinks = groupLinks.filter(link =>
    link.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    link.url.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleRefresh = () => {
    loadGroupLinks();
    onRefresh();
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="glass-card border-0 max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="p-2 rounded-xl hover:bg-secondary/50 transition-colors"
              >
                <ArrowLeft size={18} />
              </button>
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: group.color + '30' }}
              >
                <div 
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: group.color }}
                />
              </div>
              <span>{group.name}</span>
              <span className="text-sm text-muted-foreground">
                ({groupLinks.length} {groupLinks.length === 1 ? 'link' : 'links'})
              </span>
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-4 flex-1 overflow-hidden">
            {/* Search & Add */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={16} />
                <Input
                  placeholder="Search links in group..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 input-liquid"
                />
              </div>
              <button
                onClick={() => setShowAddLinkModal(true)}
                className="p-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                <Plus size={20} />
              </button>
            </div>

            {/* Links Grid */}
            <div className="flex-1 overflow-y-auto">
              {filteredLinks.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 pb-4">
                  {filteredLinks.map((link) => (
                    <LinkCard
                      key={link.id}
                      link={link}
                      onRefresh={handleRefresh}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <ExternalLink size={48} className="mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">
                    {searchQuery ? 'No Links Found' : 'No Links in Group'}
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    {searchQuery 
                      ? 'Try searching with different keywords'
                      : 'Add your first link to this group'
                    }
                  </p>
                  {!searchQuery && (
                    <button
                      onClick={() => setShowAddLinkModal(true)}
                      className="btn-primary flex items-center gap-2 mx-auto"
                    >
                      <Plus size={16} />
                      Add Link
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Link Modal with pre-selected group */}
      <AddLinkModal
        isOpen={showAddLinkModal}
        onClose={() => setShowAddLinkModal(false)}
        onAdd={handleRefresh}
      />
    </>
  );
};
