
import { useState, useEffect } from 'react';
import { Plus, Search, Folder, ExternalLink, Pin, X, Bookmark, Globe, LayoutGrid, List } from 'lucide-react';
import { getLinks, getGroups, LinkItem, LinkGroup } from '@/lib/storage';
import { AddLinkModal } from '@/components/modals/AddLinkModal';
import { AddGroupModal } from '@/components/modals/AddGroupModal';
import { LinkCard } from '@/components/LinkCard';
import { GroupCard } from '@/components/GroupCard';
import { GroupModal } from '@/components/modals/GroupModal';

export const LinksTab = () => {
  const [links, setLinks] = useState<LinkItem[]>([]);
  const [groups, setGroups] = useState<LinkGroup[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [showAddLinkModal, setShowAddLinkModal] = useState(false);
  const [showAddGroupModal, setShowAddGroupModal] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<LinkGroup | null>(null);
  const [linkViewMode, setLinkViewMode] = useState<'list' | 'grid'>(() => {
    return (localStorage.getItem('splitmate_links_view') as 'list' | 'grid') || 'list';
  });

  const loadData = () => {
    setLinks(getLinks());
    setGroups(getGroups());
  };

  useEffect(() => {
    loadData();
  }, []);

  const q = searchQuery.toLowerCase();
  const filteredLinks = links
    .filter(link => !link.groupId && (link.name.toLowerCase().includes(q) || link.url.toLowerCase().includes(q)))
    .sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  const filteredGroups = groups
    .filter(group =>
      group.name.toLowerCase().includes(q) ||
      getLinks().some(link => link.groupId === group.id && link.name.toLowerCase().includes(q))
    )
    .sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  const pinnedGroups = filteredGroups.filter(g => g.pinned);
  const unpinnedGroups = filteredGroups.filter(g => !g.pinned);
  const pinnedLinks = filteredLinks.filter(l => l.pinned);
  const unpinnedLinks = filteredLinks.filter(l => !l.pinned);
  const allGroups = [...pinnedGroups, ...unpinnedGroups];
  const allLinks = [...pinnedLinks, ...unpinnedLinks];
  const hasContent = allGroups.length > 0 || allLinks.length > 0;
  const totalItems = links.filter(l => !l.groupId).length + groups.length;

  return (
    <div className="p-4 space-y-4" style={{ paddingBottom: '120px' }}>
      {/* Header */}
      <div className="pt-4 pb-1">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Links</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {totalItems > 0 ? `${groups.length} groups · ${links.filter(l => !l.groupId).length} links` : 'Your bookmarks & groups'}
            </p>
          </div>
          <div className="flex gap-2">
            {totalItems > 0 && (
              <button
                onClick={() => { setShowSearch(!showSearch); if (showSearch) setSearchQuery(''); }}
                className="w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-200"
                style={{
                  background: showSearch ? 'hsl(var(--primary) / 0.15)' : 'hsl(var(--secondary))',
                  border: `1px solid ${showSearch ? 'hsl(var(--primary) / 0.3)' : 'hsl(var(--border) / 0.4)'}`,
                }}
              >
                {showSearch ? <X size={16} className="text-primary" /> : <Search size={16} className="text-muted-foreground" />}
              </button>
            )}
            <button
              onClick={() => setShowAddGroupModal(true)}
              className="w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-200"
              style={{ background: 'hsl(var(--secondary))', border: '1px solid hsl(var(--border) / 0.4)' }}
            >
              <Folder size={17} className="text-muted-foreground" />
            </button>
            <button
              onClick={() => setShowAddLinkModal(true)}
              className="w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-200"
              style={{
                background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary-glow)))',
                boxShadow: '0 4px 12px -3px hsl(var(--primary) / 0.4)',
              }}
            >
              <Plus size={17} color="white" />
            </button>
          </div>
        </div>
      </div>

      {/* Search (toggle) */}
      {showSearch && (
        <div className="relative">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            autoFocus
            placeholder="Search links & groups..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 h-11 rounded-2xl text-sm bg-card/50 border border-border/30 outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/15 transition-all"
          />
        </div>
      )}

      {/* Groups Section */}
      {allGroups.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold text-muted-foreground text-[11px] uppercase tracking-widest px-0.5 flex items-center gap-1.5">
            <Folder size={11} /> Groups
            <span className="text-muted-foreground/50 ml-auto text-[10px] font-medium normal-case tracking-normal">{allGroups.length}</span>
          </h3>
          <div className="grid grid-cols-3 gap-2.5">
            {allGroups.map((group) => (
              <GroupCard
                key={group.id}
                group={group}
                onClick={() => setSelectedGroup(group)}
                onRefresh={loadData}
              />
            ))}
          </div>
        </div>
      )}

      {/* Links Section */}
      {allLinks.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold text-muted-foreground text-[11px] uppercase tracking-widest px-0.5 flex items-center gap-1.5">
            <Globe size={11} /> Links
            <span className="text-muted-foreground/50 ml-auto text-[10px] font-medium normal-case tracking-normal flex items-center gap-2">
              <button
                onClick={() => {
                  const next = linkViewMode === 'list' ? 'grid' : 'list';
                  setLinkViewMode(next);
                  localStorage.setItem('splitmate_links_view', next);
                }}
                className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
                style={{ background: 'hsl(var(--secondary) / 0.8)', border: '1px solid hsl(var(--border) / 0.3)' }}
              >
                {linkViewMode === 'list' ? <LayoutGrid size={13} /> : <List size={13} />}
              </button>
              {allLinks.length}
            </span>
          </h3>
          <div className={linkViewMode === 'grid' ? 'grid grid-cols-2 gap-3' : 'space-y-2'}>
            {allLinks.map((link) => (
              <LinkCard
                key={link.id}
                link={link}
                onRefresh={loadData}
                viewMode={linkViewMode}
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!hasContent && !searchQuery && (
        <div className="flex flex-col items-center justify-center pt-16 pb-8">
          <div className="relative mb-6">
            <div className="w-20 h-20 rounded-[1.75rem] flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, hsl(var(--primary) / 0.12), hsl(var(--accent) / 0.08))',
                border: '1px solid hsl(var(--primary) / 0.1)',
              }}>
              <Bookmark size={32} className="text-primary/60" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border) / 0.4)' }}>
              <Globe size={14} className="text-muted-foreground" />
            </div>
          </div>
          <h3 className="text-lg font-bold mb-1">Save your links</h3>
          <p className="text-sm text-muted-foreground text-center max-w-[240px] mb-7 leading-relaxed">
            Bookmark websites, organize with groups, and access them anytime
          </p>
          <div className="flex gap-2.5">
            <button
              onClick={() => setShowAddGroupModal(true)}
              className="px-5 py-3 rounded-2xl text-sm font-semibold flex items-center gap-2"
              style={{ background: 'hsl(var(--secondary))', border: '1px solid hsl(var(--border) / 0.4)' }}
            >
              <Folder size={15} /> New Group
            </button>
            <button
              onClick={() => setShowAddLinkModal(true)}
              className="px-5 py-3 rounded-2xl text-sm font-semibold flex items-center gap-2"
              style={{
                background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary-glow)))',
                color: 'white',
                boxShadow: '0 4px 14px -4px hsl(var(--primary) / 0.5)',
              }}
            >
              <Plus size={15} /> Add Link
            </button>
          </div>
        </div>
      )}

      {/* No Search Results */}
      {!hasContent && searchQuery && (
        <div className="flex flex-col items-center pt-16 pb-8">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: 'hsl(var(--muted) / 0.4)' }}>
            <Search size={22} className="text-muted-foreground/60" />
          </div>
          <p className="font-semibold text-sm">No results found</p>
          <p className="text-xs text-muted-foreground mt-1">Nothing matches "{searchQuery}"</p>
        </div>
      )}

      {/* Modals */}
      <AddLinkModal isOpen={showAddLinkModal} onClose={() => setShowAddLinkModal(false)} onAdd={loadData} />
      <AddGroupModal isOpen={showAddGroupModal} onClose={() => setShowAddGroupModal(false)} onAdd={loadData} />
      {selectedGroup && (
        <GroupModal group={selectedGroup} isOpen={!!selectedGroup} onClose={() => setSelectedGroup(null)} onRefresh={loadData} />
      )}
    </div>
  );
};
