import { useState, useRef, useCallback, useEffect } from 'react';
import { Download, Upload, Trash2, Info, Moon, Sun, Monitor, Smartphone, Database, FileJson, AlertTriangle, Check, X, ChevronRight, ChevronLeft, Shield, Coins, LayoutGrid, Eye, EyeOff, GripVertical, Heart, Palette, Coffee } from 'lucide-react';
import { exportAllData, importData, getPersonalExpenses, getSharedExpenses, getLinks, getGroups, clearPersonalExpenses, clearSharedExpenses, clearLinksData, clearAllData, getCurrency, setCurrency, CURRENCIES, setOnboardingDone, getTabConfig, setTabConfig, type TabConfig } from '@/lib/storage';
import { getStoredTheme, setStoredTheme, type ThemeMode } from '@/lib/theme';
import { useToast } from '@/hooks/use-toast';

type DeleteStep = 'closed' | 'select' | 'confirm';

export function SettingsTab() {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [theme, setTheme] = useState<ThemeMode>(getStoredTheme());
  const [deleteStep, setDeleteStep] = useState<DeleteStep>('closed');
  const [deleteSelections, setDeleteSelections] = useState({ personal: false, shared: false, links: false });
  const [selectedCurrency, setSelectedCurrency] = useState(getCurrency().code);
  const [tabs, setTabs] = useState<TabConfig[]>(getTabConfig());
  const [showCustomize, setShowCustomize] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOffsetY, setDragOffsetY] = useState(0);
  const dragStartY = useRef(0);
  const dragItemHeight = useRef(0);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const itemRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const { toast } = useToast();

  const handleCurrencyChange = (code: string) => {
    setSelectedCurrency(code);
    setCurrency(code);
    toast({ title: 'Currency Updated', description: `Now using ${CURRENCIES.find(c => c.code === code)?.name}` });
  };

  const personalCount = getPersonalExpenses().length;
  const sharedCount = getSharedExpenses().length;
  const linksCount = getLinks().length;
  const groupsCount = getGroups().length;

  const handleThemeChange = (mode: ThemeMode) => {
    setTheme(mode);
    setStoredTheme(mode);
  };

  const TAB_LABELS: Record<string, string> = {
    home: 'Home', personal: 'Personal', shared: 'Shared', links: 'Links', settings: 'Settings',
  };

  const saveTabConfig = (newTabs: TabConfig[]) => {
    setTabs(newTabs);
    setTabConfig(newTabs);
    window.dispatchEvent(new Event('splitmate_tab_config_changed'));
  };

  const toggleTabVisibility = (id: string) => {
    if (id === 'settings') return;
    const newTabs = tabs.map(t => t.id === id ? { ...t, visible: !t.visible } : t);
    saveTabConfig(newTabs);
  };

  const handleDragStart = (index: number, clientY: number) => {
    const el = itemRefs.current.get(index);
    if (el) dragItemHeight.current = el.offsetHeight + 8;
    setDragIndex(index);
    setDragOffsetY(0);
    dragStartY.current = clientY;
  };

  const handleDragMove = useCallback((clientY: number) => {
    if (dragIndex === null) return;
    const delta = clientY - dragStartY.current;
    setDragOffsetY(delta);
    const steps = Math.round(delta / dragItemHeight.current);
    if (steps !== 0) {
      const newIndex = Math.max(0, Math.min(tabs.length - 1, dragIndex + steps));
      if (newIndex !== dragIndex) {
        const newTabs = [...tabs];
        const [moved] = newTabs.splice(dragIndex, 1);
        newTabs.splice(newIndex, 0, moved);
        setTabs(newTabs);
        setDragIndex(newIndex);
        setDragOffsetY(0);
        dragStartY.current = clientY;
      }
    }
  }, [dragIndex, tabs]);

  const handleDragEnd = useCallback(() => {
    if (dragIndex !== null) {
      saveTabConfig(tabs);
      setDragIndex(null);
      setDragOffsetY(0);
    }
  }, [dragIndex, tabs]);

  const handleLongPressStart = (index: number, clientY: number) => {
    longPressTimer.current = setTimeout(() => {
      handleDragStart(index, clientY);
      if (navigator.vibrate) navigator.vibrate(30);
    }, 200);
  };

  const handleLongPressCancel = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  useEffect(() => {
    return () => { if (longPressTimer.current) clearTimeout(longPressTimer.current); };
  }, []);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const data = exportAllData();
      const fileName = `splitmate-backup-${new Date().toISOString().split('T')[0]}.json`;
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();

      // Small delay before cleanup
      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 200);

      toast({ title: "Exported!", description: `Saved as ${fileName}` });
    } catch {
      toast({ title: "Export Failed", description: "Unable to save the file.", variant: "destructive" });
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const text = await file.text();
      const success = importData(text);
      if (success) {
        toast({ title: "Imported!", description: "Data restored successfully." });
        setTimeout(() => window.location.reload(), 800);
      } else {
        toast({ title: "Import Failed", description: "Invalid file format.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Import Failed", description: "Couldn't read the file.", variant: "destructive" });
    } finally {
      setIsImporting(false);
      event.target.value = '';
    }
  };

  const toggleDeleteSelection = (key: 'personal' | 'shared' | 'links') => {
    setDeleteSelections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const selectAllForDelete = () => {
    const allSelected = deleteSelections.personal && deleteSelections.shared && deleteSelections.links;
    setDeleteSelections({ personal: !allSelected, shared: !allSelected, links: !allSelected });
  };

  const selectedDeleteCount = () => {
    let count = 0;
    if (deleteSelections.personal) count += personalCount;
    if (deleteSelections.shared) count += sharedCount;
    if (deleteSelections.links) count += linksCount + groupsCount;
    return count;
  };

  const handleConfirmDelete = () => {
    const allSelected = deleteSelections.personal && deleteSelections.shared && deleteSelections.links;
    if (deleteSelections.personal) clearPersonalExpenses();
    if (deleteSelections.shared) clearSharedExpenses();
    if (deleteSelections.links) clearLinksData();
    // Reset onboarding when all data is cleared so user sees welcome screen again
    if (allSelected) {
      localStorage.removeItem('splitmate_onboarding_done');
    }

    const parts = [];
    if (deleteSelections.personal) parts.push('personal expenses');
    if (deleteSelections.shared) parts.push('shared expenses');
    if (deleteSelections.links) parts.push('links & groups');

    toast({ title: "Data Deleted", description: `Cleared ${parts.join(', ')}.` });
    setDeleteStep('closed');
    setDeleteSelections({ personal: false, shared: false, links: false });
    setTimeout(() => window.location.reload(), 800);
  };

  const hasAnySelection = deleteSelections.personal || deleteSelections.shared || deleteSelections.links;

  return (
    <div className="p-4 space-y-4" style={{ paddingBottom: '120px' }}>
      {/* Header */}
      <div className="pt-4 pb-1">
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground">Preferences & data management</p>
      </div>

      {/* Appearance */}
      <div className="ios-card-modern p-4 space-y-3">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-primary/15 rounded-xl flex items-center justify-center">
            <Sun size={13} className="text-primary" />
          </div>
          <h2 className="font-semibold text-sm">Appearance</h2>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {([
            { mode: 'light' as ThemeMode, icon: Sun, label: 'Light' },
            { mode: 'dark' as ThemeMode, icon: Moon, label: 'Dark' },
            { mode: 'system' as ThemeMode, icon: Monitor, label: 'System' },
          ]).map(({ mode, icon: Icon, label }) => (
            <button
              key={mode}
              onClick={() => handleThemeChange(mode)}
              className="flex flex-col items-center gap-1.5 py-3 rounded-2xl border transition-all duration-200"
              style={{
                background: theme === mode ? 'hsl(var(--primary) / 0.12)' : 'hsl(var(--secondary) / 0.5)',
                borderColor: theme === mode ? 'hsl(var(--primary) / 0.35)' : 'hsl(var(--border) / 0.25)',
                transform: theme === mode ? 'scale(1.02)' : 'scale(1)',
              }}
            >
              <Icon size={18} style={{ color: theme === mode ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))' }} />
              <span className="text-[11px] font-semibold" style={{ color: theme === mode ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))' }}>
                {label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Customization */}
      <div className="ios-card-modern p-4 space-y-3">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-primary/15 rounded-xl flex items-center justify-center">
            <Palette size={13} className="text-primary" />
          </div>
          <h2 className="font-semibold text-sm">Customization</h2>
        </div>
        <button
          onClick={() => setShowCustomize(true)}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-semibold text-sm"
          style={{ background: 'hsl(var(--secondary))', border: '1px solid hsl(var(--border) / 0.4)' }}
        >
          <Palette size={16} className="text-primary" />
          <span className="flex-1 text-left">Currency, Tabs & Layout</span>
          <ChevronRight size={14} className="opacity-40" />
        </button>
      </div>

      {/* Data Overview - compact */}
      <div className="ios-card-modern p-4 space-y-3">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-primary/15 rounded-xl flex items-center justify-center">
            <Database size={13} className="text-primary" />
          </div>
          <h2 className="font-semibold text-sm">Your Data</h2>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="text-center p-3 rounded-xl" style={{ background: 'hsl(var(--primary) / 0.08)', border: '1px solid hsl(var(--primary) / 0.12)' }}>
            <p className="text-xl font-bold text-primary">{personalCount}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Personal</p>
          </div>
          <div className="text-center p-3 rounded-xl" style={{ background: 'hsl(var(--success) / 0.08)', border: '1px solid hsl(var(--success) / 0.12)' }}>
            <p className="text-xl font-bold text-success">{sharedCount}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Shared</p>
          </div>
          <div className="text-center p-3 rounded-xl" style={{ background: 'hsl(var(--warning) / 0.08)', border: '1px solid hsl(var(--warning) / 0.12)' }}>
            <p className="text-xl font-bold text-warning">{linksCount + groupsCount}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Links</p>
          </div>
        </div>
      </div>

      {/* Backup & Restore */}
      <div className="ios-card-modern p-4 space-y-3">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-secondary rounded-xl flex items-center justify-center">
            <FileJson size={13} className="text-muted-foreground" />
          </div>
          <h2 className="font-semibold text-sm">Backup & Restore</h2>
        </div>

        <div className="space-y-2">
          {/* Export as JSON file */}
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-semibold text-sm disabled:opacity-50"
            style={{
              background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary-glow)))',
              color: 'hsl(var(--primary-foreground))',
              boxShadow: '0 4px 14px -4px hsl(var(--primary) / 0.4)',
            }}
          >
            <Download size={16} />
            <span className="flex-1 text-left">{isExporting ? 'Saving…' : 'Save Backup as JSON'}</span>
            <ChevronRight size={14} className="opacity-60" />
          </button>

          {/* Import */}
          <div className="relative">
            <input
              type="file"
              accept=".json"
              onChange={handleImport}
              disabled={isImporting}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              id="import-file"
            />
            <label
              htmlFor="import-file"
              className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-semibold text-sm cursor-pointer"
              style={{ background: 'hsl(var(--secondary))', border: '1px solid hsl(var(--border) / 0.4)' }}
            >
              <Upload size={16} />
              <span className="flex-1 text-left">{isImporting ? 'Importing…' : 'Restore from JSON'}</span>
              <ChevronRight size={14} className="opacity-40" />
            </label>
          </div>
        </div>

        <p className="text-[10px] text-muted-foreground">
          Exports all expenses, shared balances, links & groups as a JSON file.
        </p>
      </div>

      {/* Danger Zone */}
      <div className="ios-card-modern p-4 space-y-3" style={{ border: '1px solid hsl(var(--danger) / 0.15)' }}>
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-xl flex items-center justify-center" style={{ background: 'hsl(var(--danger) / 0.12)' }}>
            <Shield size={13} style={{ color: 'hsl(var(--danger))' }} />
          </div>
          <h2 className="font-semibold text-sm" style={{ color: 'hsl(var(--danger))' }}>Danger Zone</h2>
        </div>

        <button
          onClick={() => {
            setDeleteStep('select');
            setDeleteSelections({ personal: false, shared: false, links: false });
          }}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-semibold text-sm transition-colors duration-150"
          style={{
            background: 'hsl(var(--danger) / 0.08)',
            border: '1px solid hsl(var(--danger) / 0.15)',
            color: 'hsl(var(--danger))',
          }}
        >
          <Trash2 size={16} />
          <span className="flex-1 text-left">Delete Data…</span>
          <ChevronRight size={14} className="opacity-50" />
        </button>

        <p className="text-[10px] text-muted-foreground">
          Choose exactly what to delete. You'll be asked to confirm twice.
        </p>
      </div>

      {/* About */}
      <div className="ios-card-modern p-4 space-y-3">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-secondary rounded-xl flex items-center justify-center">
            <Info size={13} className="text-muted-foreground" />
          </div>
          <h2 className="font-semibold text-sm">About</h2>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary-glow)))', boxShadow: '0 4px 12px -4px hsl(var(--primary) / 0.4)' }}>
            <Smartphone size={20} color="white" />
          </div>
          <div>
            <p className="font-semibold text-sm">SplitMate</p>
            <p className="text-[11px] text-muted-foreground">v2.0 · 100% offline · your data stays local</p>
          </div>
        </div>
      </div>

      {/* Support Developer */}
      <div className="ios-card-modern p-4 space-y-3" style={{ border: '1px solid hsl(var(--primary) / 0.12)' }}>
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-xl flex items-center justify-center" style={{ background: 'hsl(338, 70%, 55% / 0.12)' }}>
            <Coffee size={13} style={{ color: 'hsl(338, 70%, 55%)' }} />
          </div>
          <h2 className="font-semibold text-sm">Support the Developer</h2>
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed">
          SplitMate is free & ad-free. If it helps you, consider buying me a coffee!
        </p>

        <a
          href="https://buymeacoffee.com/iamsandeshk"
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl font-semibold text-sm no-underline active:scale-[0.97] transition-transform"
          style={{
            background: '#FFDD00',
            color: '#000000',
            boxShadow: '0 4px 14px -4px rgba(255, 221, 0, 0.4)',
          }}
        >
          <Coffee size={18} />
          <span className="flex-1 text-left">Buy me a coffee</span>
          <ChevronRight size={14} className="opacity-60" />
        </a>

        <p className="text-[10px] text-muted-foreground text-center">
          Thank you for your support! ❤️
        </p>
      </div>

      {/* ── Customization Full-Page ── */}
      {showCustomize && (
        <div
          className="fixed inset-0 z-[9999] flex flex-col"
          style={{ background: 'hsl(var(--background))' }}
          onTouchMove={(e) => { if (dragIndex !== null) { e.preventDefault(); handleDragMove(e.touches[0].clientY); } }}
          onTouchEnd={() => { handleLongPressCancel(); handleDragEnd(); }}
          onMouseMove={(e) => { if (dragIndex !== null) handleDragMove(e.clientY); }}
          onMouseUp={() => { handleLongPressCancel(); handleDragEnd(); }}
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-5 pt-12 pb-4">
            <button
              onClick={() => setShowCustomize(false)}
              className="w-10 h-10 rounded-2xl flex items-center justify-center"
              style={{ background: 'hsl(var(--secondary))', border: '1px solid hsl(var(--border) / 0.3)' }}
            >
              <ChevronLeft size={18} />
            </button>
            <div className="flex-1">
              <h1 className="text-xl font-bold">Customization</h1>
              <p className="text-xs text-muted-foreground">Currency & tab layout</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-5 pb-8 space-y-5">
            {/* Currency section */}
            <div>
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-7 h-7 bg-primary/15 rounded-xl flex items-center justify-center">
                  <Coins size={13} className="text-primary" />
                </div>
                <h2 className="font-semibold text-sm">Currency</h2>
                <span className="text-[10px] text-muted-foreground ml-auto">{CURRENCIES.find(c => c.code === selectedCurrency)?.name}</span>
              </div>
              <div className="grid grid-cols-5 gap-1.5">
                {CURRENCIES.map((c) => (
                  <button
                    key={c.code}
                    onClick={() => handleCurrencyChange(c.code)}
                    className="flex flex-col items-center gap-0.5 py-2.5 rounded-xl border transition-all duration-200"
                    style={{
                      background: selectedCurrency === c.code ? 'hsl(var(--primary) / 0.12)' : 'hsl(var(--card))',
                      borderColor: selectedCurrency === c.code ? 'hsl(var(--primary) / 0.35)' : 'hsl(var(--border) / 0.25)',
                      transform: selectedCurrency === c.code ? 'scale(1.05)' : 'scale(1)',
                    }}
                  >
                    <span className="text-base font-bold" style={{ color: selectedCurrency === c.code ? 'hsl(var(--primary))' : 'hsl(var(--foreground))' }}>{c.symbol}</span>
                    <span className="text-[9px] font-medium" style={{ color: selectedCurrency === c.code ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))' }}>{c.code}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Divider */}
            <div className="h-px" style={{ background: 'hsl(var(--border) / 0.3)' }} />

            {/* Tab reorder section */}
            <div>
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-7 h-7 bg-primary/15 rounded-xl flex items-center justify-center">
                  <LayoutGrid size={13} className="text-primary" />
                </div>
                <h2 className="font-semibold text-sm">Tab Order</h2>
                <span className="text-[10px] text-muted-foreground ml-auto">Hold & drag to reorder</span>
              </div>
              <div className="space-y-2">
                {tabs.map((tab, index) => {
                  const isSettingsTab = tab.id === 'settings';
                  const isDragging = dragIndex === index;
                  return (
                    <div
                      key={tab.id}
                      ref={(el) => { if (el) itemRefs.current.set(index, el); }}
                      className="flex items-center gap-3 px-4 py-4 rounded-2xl select-none"
                      style={{
                        position: 'relative',
                        zIndex: isDragging ? 50 : 1,
                        background: isDragging ? 'hsl(var(--primary) / 0.08)' : tab.visible ? 'hsl(var(--card))' : 'hsl(var(--card) / 0.4)',
                        border: `1.5px solid ${isDragging ? 'hsl(var(--primary) / 0.3)' : 'hsl(var(--border) / 0.25)'}`,
                        opacity: tab.visible ? 1 : 0.45,
                        transform: isDragging ? `translateY(${dragOffsetY}px) scale(1.03)` : 'translateY(0) scale(1)',
                        boxShadow: isDragging ? '0 12px 32px -6px hsl(var(--primary) / 0.25)' : 'none',
                        transition: isDragging ? 'none' : 'all 0.25s cubic-bezier(0.4, 0, 0.15, 1)',
                      }}
                      onTouchStart={(e) => handleLongPressStart(index, e.touches[0].clientY)}
                      onTouchEnd={handleLongPressCancel}
                      onMouseDown={(e) => { e.preventDefault(); handleLongPressStart(index, e.clientY); }}
                      onMouseUp={handleLongPressCancel}
                    >
                      {/* Drag handle */}
                      <div
                        className="w-8 h-8 rounded-xl flex items-center justify-center touch-none"
                        style={{ background: isDragging ? 'hsl(var(--primary) / 0.12)' : 'hsl(var(--secondary) / 0.6)' }}
                      >
                        <GripVertical size={16} className={isDragging ? 'text-primary' : 'text-muted-foreground'} />
                      </div>

                      {/* Tab name */}
                      <span className="flex-1 font-semibold text-sm">{TAB_LABELS[tab.id] || tab.id}</span>

                      {/* Toggle */}
                      {isSettingsTab ? (
                        <span className="text-[10px] text-muted-foreground font-medium px-3 py-1.5 rounded-xl"
                          style={{ background: 'hsl(var(--secondary))' }}>
                          Always on
                        </span>
                      ) : (
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleTabVisibility(tab.id); }}
                          className="w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200"
                          style={{
                            background: tab.visible ? 'hsl(var(--primary) / 0.12)' : 'hsl(var(--secondary))',
                            border: `1px solid ${tab.visible ? 'hsl(var(--primary) / 0.2)' : 'hsl(var(--border) / 0.15)'}`,
                          }}
                        >
                          {tab.visible ? (
                            <Eye size={16} className="text-primary" />
                          ) : (
                            <EyeOff size={16} className="text-muted-foreground" />
                          )}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
              <p className="text-[10px] text-muted-foreground text-center mt-3">
                Hidden tabs won't show in the bottom bar. Settings is always visible.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Modal ── */}
      {deleteStep !== 'closed' && (
        <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-4"
          style={{ background: 'hsl(0 0% 0% / 0.6)', backdropFilter: 'blur(8px)' }}
          onClick={() => setDeleteStep('closed')}
        >
          <div
            className="w-full max-w-md rounded-3xl overflow-hidden"
            style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border) / 0.5)' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Step 1: Select what to delete */}
            {deleteStep === 'select' && (
              <div className="p-5 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: 'hsl(var(--danger) / 0.12)' }}>
                    <Trash2 size={18} style={{ color: 'hsl(var(--danger))' }} />
                  </div>
                  <div>
                    <h3 className="font-bold text-base">Delete Data</h3>
                    <p className="text-xs text-muted-foreground">Choose what to remove</p>
                  </div>
                </div>

                {/* Select all */}
                <button
                  onClick={selectAllForDelete}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-muted-foreground"
                  style={{ background: 'hsl(var(--secondary) / 0.5)' }}
                >
                  <div className="w-5 h-5 rounded-md border flex items-center justify-center"
                    style={{
                      background: deleteSelections.personal && deleteSelections.shared && deleteSelections.links ? 'hsl(var(--danger))' : 'transparent',
                      borderColor: deleteSelections.personal && deleteSelections.shared && deleteSelections.links ? 'hsl(var(--danger))' : 'hsl(var(--border))',
                    }}>
                    {deleteSelections.personal && deleteSelections.shared && deleteSelections.links && <Check size={12} color="white" />}
                  </div>
                  Select All
                </button>

                {/* Personal */}
                <button
                  onClick={() => toggleDeleteSelection('personal')}
                  className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-150 text-left"
                  style={{
                    background: deleteSelections.personal ? 'hsl(var(--danger) / 0.08)' : 'hsl(var(--secondary) / 0.5)',
                    border: `1px solid ${deleteSelections.personal ? 'hsl(var(--danger) / 0.25)' : 'hsl(var(--border) / 0.25)'}`,
                  }}
                >
                  <div className="w-5 h-5 rounded-md border flex items-center justify-center flex-shrink-0"
                    style={{
                      background: deleteSelections.personal ? 'hsl(var(--danger))' : 'transparent',
                      borderColor: deleteSelections.personal ? 'hsl(var(--danger))' : 'hsl(var(--border))',
                    }}>
                    {deleteSelections.personal && <Check size={12} color="white" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">Personal Expenses</p>
                    <p className="text-[11px] text-muted-foreground">{personalCount} expense{personalCount !== 1 ? 's' : ''} will be deleted</p>
                  </div>
                  <span className="text-lg font-bold" style={{ color: deleteSelections.personal ? 'hsl(var(--danger))' : 'hsl(var(--muted-foreground))' }}>
                    {personalCount}
                  </span>
                </button>

                {/* Shared */}
                <button
                  onClick={() => toggleDeleteSelection('shared')}
                  className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-150 text-left"
                  style={{
                    background: deleteSelections.shared ? 'hsl(var(--danger) / 0.08)' : 'hsl(var(--secondary) / 0.5)',
                    border: `1px solid ${deleteSelections.shared ? 'hsl(var(--danger) / 0.25)' : 'hsl(var(--border) / 0.25)'}`,
                  }}
                >
                  <div className="w-5 h-5 rounded-md border flex items-center justify-center flex-shrink-0"
                    style={{
                      background: deleteSelections.shared ? 'hsl(var(--danger))' : 'transparent',
                      borderColor: deleteSelections.shared ? 'hsl(var(--danger))' : 'hsl(var(--border))',
                    }}>
                    {deleteSelections.shared && <Check size={12} color="white" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">Shared Expenses</p>
                    <p className="text-[11px] text-muted-foreground">{sharedCount} transaction{sharedCount !== 1 ? 's' : ''} & all balances</p>
                  </div>
                  <span className="text-lg font-bold" style={{ color: deleteSelections.shared ? 'hsl(var(--danger))' : 'hsl(var(--muted-foreground))' }}>
                    {sharedCount}
                  </span>
                </button>

                {/* Links */}
                <button
                  onClick={() => toggleDeleteSelection('links')}
                  className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-150 text-left"
                  style={{
                    background: deleteSelections.links ? 'hsl(var(--danger) / 0.08)' : 'hsl(var(--secondary) / 0.5)',
                    border: `1px solid ${deleteSelections.links ? 'hsl(var(--danger) / 0.25)' : 'hsl(var(--border) / 0.25)'}`,
                  }}
                >
                  <div className="w-5 h-5 rounded-md border flex items-center justify-center flex-shrink-0"
                    style={{
                      background: deleteSelections.links ? 'hsl(var(--danger))' : 'transparent',
                      borderColor: deleteSelections.links ? 'hsl(var(--danger))' : 'hsl(var(--border))',
                    }}>
                    {deleteSelections.links && <Check size={12} color="white" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">Links & Groups</p>
                    <p className="text-[11px] text-muted-foreground">{linksCount} link{linksCount !== 1 ? 's' : ''}, {groupsCount} group{groupsCount !== 1 ? 's' : ''}</p>
                  </div>
                  <span className="text-lg font-bold" style={{ color: deleteSelections.links ? 'hsl(var(--danger))' : 'hsl(var(--muted-foreground))' }}>
                    {linksCount + groupsCount}
                  </span>
                </button>

                {/* Actions */}
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => setDeleteStep('closed')}
                    className="flex-1 px-4 py-3 rounded-2xl font-semibold text-sm"
                    style={{ background: 'hsl(var(--secondary))', border: '1px solid hsl(var(--border) / 0.3)' }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => hasAnySelection && setDeleteStep('confirm')}
                    disabled={!hasAnySelection}
                    className="flex-1 px-4 py-3 rounded-2xl font-semibold text-sm disabled:opacity-30 transition-opacity"
                    style={{
                      background: 'hsl(var(--danger))',
                      color: 'white',
                      boxShadow: hasAnySelection ? '0 4px 12px -4px hsl(var(--danger) / 0.5)' : 'none',
                    }}
                  >
                    Continue ({selectedDeleteCount()})
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Final confirmation */}
            {deleteStep === 'confirm' && (
              <div className="p-5 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: 'hsl(var(--danger) / 0.15)' }}>
                    <AlertTriangle size={18} style={{ color: 'hsl(var(--danger))' }} />
                  </div>
                  <div>
                    <h3 className="font-bold text-base" style={{ color: 'hsl(var(--danger))' }}>Are you sure?</h3>
                    <p className="text-xs text-muted-foreground">This cannot be undone</p>
                  </div>
                </div>

                {/* Summary of what's being deleted */}
                <div className="rounded-2xl p-3.5 space-y-2" style={{ background: 'hsl(var(--danger) / 0.06)', border: '1px solid hsl(var(--danger) / 0.12)' }}>
                  <p className="text-xs font-semibold" style={{ color: 'hsl(var(--danger))' }}>Will be permanently deleted:</p>
                  {deleteSelections.personal && (
                    <div className="flex items-center gap-2 text-sm">
                      <X size={12} style={{ color: 'hsl(var(--danger))' }} />
                      <span>{personalCount} personal expense{personalCount !== 1 ? 's' : ''}</span>
                    </div>
                  )}
                  {deleteSelections.shared && (
                    <div className="flex items-center gap-2 text-sm">
                      <X size={12} style={{ color: 'hsl(var(--danger))' }} />
                      <span>{sharedCount} shared transaction{sharedCount !== 1 ? 's' : ''} + all balances</span>
                    </div>
                  )}
                  {deleteSelections.links && (
                    <div className="flex items-center gap-2 text-sm">
                      <X size={12} style={{ color: 'hsl(var(--danger))' }} />
                      <span>{linksCount} link{linksCount !== 1 ? 's' : ''} & {groupsCount} group{groupsCount !== 1 ? 's' : ''}</span>
                    </div>
                  )}
                  <div className="pt-1.5 mt-1.5" style={{ borderTop: '1px solid hsl(var(--danger) / 0.1)' }}>
                    <p className="text-xs font-bold" style={{ color: 'hsl(var(--danger))' }}>Total: {selectedDeleteCount()} items</p>
                  </div>
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => setDeleteStep('select')}
                    className="flex-1 px-4 py-3 rounded-2xl font-semibold text-sm"
                    style={{ background: 'hsl(var(--secondary))', border: '1px solid hsl(var(--border) / 0.3)' }}
                  >
                    Go Back
                  </button>
                  <button
                    onClick={handleConfirmDelete}
                    className="flex-1 px-4 py-3 rounded-2xl font-bold text-sm"
                    style={{
                      background: 'hsl(var(--danger))',
                      color: 'white',
                      boxShadow: '0 4px 12px -4px hsl(var(--danger) / 0.5)',
                    }}
                  >
                    Delete Forever
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
