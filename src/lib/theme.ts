export type ThemeMode = 'light' | 'dark' | 'system';

const THEME_KEY = 'splitmate_theme';

export function getStoredTheme(): ThemeMode {
  const stored = localStorage.getItem(THEME_KEY);
  if (stored === 'light' || stored === 'dark' || stored === 'system') return stored;
  return 'system';
}

export function setStoredTheme(mode: ThemeMode): void {
  localStorage.setItem(THEME_KEY, mode);
  applyTheme(mode);
}

export function applyTheme(mode: ThemeMode): void {
  const root = document.documentElement;
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

  if (mode === 'dark' || (mode === 'system' && prefersDark)) {
    root.classList.remove('light');
  } else {
    root.classList.add('light');
  }
}

export function initTheme(): void {
  const mode = getStoredTheme();
  applyTheme(mode);

  // Listen for system changes when in 'system' mode
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (getStoredTheme() === 'system') {
      applyTheme('system');
    }
  });
}
