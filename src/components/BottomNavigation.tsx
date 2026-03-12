
import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { Home, User, Users, Settings, ExternalLink } from 'lucide-react';
import { getTabConfig, type TabConfig } from '@/lib/storage';

interface BottomNavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const ALL_NAV_ITEMS = [
  { id: 'home',     label: 'Home',     icon: Home },
  { id: 'personal', label: 'Personal', icon: User },
  { id: 'shared',   label: 'Shared',   icon: Users },
  { id: 'links',    label: 'Links',    icon: ExternalLink },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export const BottomNavigation = ({ activeTab, onTabChange }: BottomNavigationProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pillStyle, setPillStyle] = useState({ left: 0, width: 0 });
  const [tabConfig, setTabConfigState] = useState<TabConfig[]>(getTabConfig());

  // Re-read tab config when window regains focus (after Settings changes)
  useEffect(() => {
    const onFocus = () => setTabConfigState(getTabConfig());
    window.addEventListener('splitmate_tab_config_changed', onFocus);
    return () => window.removeEventListener('splitmate_tab_config_changed', onFocus);
  }, []);

  const navItems = useMemo(() => {
    const configMap = new Map(tabConfig.map(t => [t.id, t]));
    return tabConfig
      .filter(t => t.visible)
      .map(t => ALL_NAV_ITEMS.find(n => n.id === t.id))
      .filter(Boolean) as typeof ALL_NAV_ITEMS;
  }, [tabConfig]);

  const updatePill = useCallback(() => {
    if (!containerRef.current) return;
    const activeEl = containerRef.current.querySelector(`[data-tab="${activeTab}"]`) as HTMLElement;
    if (activeEl) {
      setPillStyle({
        left: activeEl.offsetLeft,
        width: activeEl.offsetWidth,
      });
    }
  }, [activeTab]);

  useEffect(() => {
    updatePill();
    window.addEventListener('resize', updatePill);
    return () => window.removeEventListener('resize', updatePill);
  }, [updatePill]);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 flex justify-center pointer-events-none"
      style={{ paddingBottom: 'max(10px, env(safe-area-inset-bottom))' }}
    >
      <div
        className="pointer-events-auto mx-4 px-1 py-1 max-w-[400px] w-full"
        style={{
          background: 'hsl(var(--card) / 0.75)',
          backdropFilter: 'blur(48px) saturate(2)',
          WebkitBackdropFilter: 'blur(48px) saturate(2)',
          border: '1px solid hsl(var(--glass-border))',
          borderRadius: '1.75rem',
          boxShadow:
            '0 12px 48px -12px hsl(var(--glass-shadow)), 0 0 0 0.5px hsl(var(--glass-border))',
        }}
      >
        <div ref={containerRef} className="flex items-center justify-around relative">
          {/* Sliding active pill */}
          <div
            className="absolute top-0 bottom-0 rounded-2xl"
            style={{
              left: pillStyle.left,
              width: pillStyle.width,
              background: 'hsl(var(--primary) / 0.12)',
              transition: 'left 0.35s cubic-bezier(0.4, 0, 0.15, 1), width 0.35s cubic-bezier(0.4, 0, 0.15, 1)',
            }}
          />

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                data-tab={item.id}
                onClick={() => onTabChange(item.id)}
                className="flex flex-col items-center justify-center gap-[3px] rounded-2xl relative z-[1]"
                style={{
                  padding: '8px 14px',
                  transition: 'color 0.3s ease, transform 0.3s cubic-bezier(0.4, 0, 0.15, 1)',
                  color: isActive
                    ? 'hsl(var(--primary))'
                    : 'hsl(var(--foreground) / 0.45)',
                }}
              >
                <Icon
                  size={19}
                  strokeWidth={isActive ? 2.4 : 1.8}
                  style={{
                    transition: 'all 0.3s ease',
                    filter: isActive
                      ? 'drop-shadow(0 0 5px hsl(var(--primary) / 0.4))'
                      : 'none',
                  }}
                />
                <span
                  className="font-bold"
                  style={{
                    fontSize: '9.5px',
                    letterSpacing: '0.01em',
                    color: isActive ? 'hsl(var(--primary))' : 'hsl(var(--foreground) / 0.5)',
                    transition: 'color 0.25s ease',
                  }}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
