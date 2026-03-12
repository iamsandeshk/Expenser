// Local Storage Management for SplitMate

export interface PersonalExpense {
  id: string;
  amount: number;
  reason: string;
  category: string;
  date: string;
  createdAt: string;
}

export interface SharedExpense {
  id: string;
  amount: number;
  reason: string;
  paidBy: string; // 'me' or person name
  forPerson: string; // person name or 'me'
  personName: string;
  date: string;
  createdAt: string;
  settled: boolean;
}

export interface PersonBalance {
  name: string;
  totalGiven: number; // Amount they gave me
  totalOwed: number;  // Amount I gave them
  netBalance: number; // Positive = they owe me, Negative = I owe them
  transactions: SharedExpense[];
}

export interface LinkItem {
  id: string;
  name: string;
  url: string;
  favicon?: string;
  title?: string;
  previewImage?: string;
  createdAt: string;
  groupId?: string;
  pinned?: boolean;
}

export interface LinkGroup {
  id: string;
  name: string;
  color: string;
  createdAt: string;
  pinned?: boolean;
}

const STORAGE_KEYS = {
  PERSONAL_EXPENSES: 'splitmate_personal_expenses',
  SHARED_EXPENSES: 'splitmate_shared_expenses',
  SETTINGS: 'splitmate_settings',
  ONBOARDING_DONE: 'splitmate_onboarding_done',
  CURRENCY: 'splitmate_currency',
};

const LINKS_STORAGE_KEYS = {
  LINKS: 'splitmate_links',
  GROUPS: 'splitmate_link_groups'
};

// Currency
export interface CurrencyInfo {
  code: string;
  symbol: string;
  name: string;
  locale: string;
}

export const CURRENCIES: CurrencyInfo[] = [
  { code: 'INR', symbol: '₹', name: 'Indian Rupee', locale: 'en-IN' },
  { code: 'USD', symbol: '$', name: 'US Dollar', locale: 'en-US' },
  { code: 'EUR', symbol: '€', name: 'Euro', locale: 'de-DE' },
  { code: 'GBP', symbol: '£', name: 'British Pound', locale: 'en-GB' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen', locale: 'ja-JP' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', locale: 'en-AU' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar', locale: 'en-CA' },
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham', locale: 'ar-AE' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar', locale: 'en-SG' },
  { code: 'BRL', symbol: 'R$', name: 'Brazilian Real', locale: 'pt-BR' },
];

export function getCurrency(): CurrencyInfo {
  const stored = localStorage.getItem(STORAGE_KEYS.CURRENCY);
  if (stored) {
    const found = CURRENCIES.find(c => c.code === stored);
    if (found) return found;
  }
  return CURRENCIES[0]; // default INR
}

export function setCurrency(code: string): void {
  localStorage.setItem(STORAGE_KEYS.CURRENCY, code);
}

export function isOnboardingDone(): boolean {
  return localStorage.getItem(STORAGE_KEYS.ONBOARDING_DONE) === 'true';
}

export function setOnboardingDone(): void {
  localStorage.setItem(STORAGE_KEYS.ONBOARDING_DONE, 'true');
}

// Personal Expenses
export function savePersonalExpense(expense: PersonalExpense): void {
  const expenses = getPersonalExpenses();
  expenses.push(expense);
  localStorage.setItem(STORAGE_KEYS.PERSONAL_EXPENSES, JSON.stringify(expenses));
}

export function getPersonalExpenses(): PersonalExpense[] {
  const stored = localStorage.getItem(STORAGE_KEYS.PERSONAL_EXPENSES);
  return stored ? JSON.parse(stored) : [];
}

export function deletePersonalExpense(id: string): void {
  const expenses = getPersonalExpenses().filter(e => e.id !== id);
  localStorage.setItem(STORAGE_KEYS.PERSONAL_EXPENSES, JSON.stringify(expenses));
}

// Shared Expenses
export function saveSharedExpense(expense: SharedExpense): void {
  const expenses = getSharedExpenses();
  expenses.push(expense);
  localStorage.setItem(STORAGE_KEYS.SHARED_EXPENSES, JSON.stringify(expenses));
  
  // If someone paid for me, add it as personal expense too
  if (expense.paidBy !== 'me' && expense.forPerson === 'me') {
    const personalExpense: PersonalExpense = {
      id: generateId(),
      amount: expense.amount,
      reason: expense.reason + ` (paid by ${expense.personName})`,
      category: 'Other',
      date: expense.date,
      createdAt: expense.createdAt
    };
    savePersonalExpense(personalExpense);
  }
}

export function getSharedExpenses(): SharedExpense[] {
  const stored = localStorage.getItem(STORAGE_KEYS.SHARED_EXPENSES);
  return stored ? JSON.parse(stored) : [];
}

export function deleteSharedExpense(id: string): void {
  const expenses = getSharedExpenses().filter(e => e.id !== id);
  localStorage.setItem(STORAGE_KEYS.SHARED_EXPENSES, JSON.stringify(expenses));
}

export function settleExpenseWithPerson(personName: string): void {
  const expenses = getSharedExpenses();
  expenses.forEach(expense => {
    if (expense.personName === personName && !expense.settled) {
      expense.settled = true;
    }
  });
  localStorage.setItem(STORAGE_KEYS.SHARED_EXPENSES, JSON.stringify(expenses));
}

// Balance Calculations
export function getPersonBalances(): PersonBalance[] {
  const expenses = getSharedExpenses();
  const peopleMap = new Map<string, PersonBalance>();
  
  expenses.forEach(expense => {
    if (!peopleMap.has(expense.personName)) {
      peopleMap.set(expense.personName, {
        name: expense.personName,
        totalGiven: 0,
        totalOwed: 0,
        netBalance: 0,
        transactions: []
      });
    }
    
    const person = peopleMap.get(expense.personName)!;
    person.transactions.push(expense);
    
    if (!expense.settled) {
      if (expense.paidBy === 'me' && expense.forPerson === expense.personName) {
        // I paid for them - they owe me
        person.totalOwed += expense.amount;
      } else if (expense.paidBy === expense.personName && expense.forPerson === 'me') {
        // They paid for me - I owe them
        person.totalGiven += expense.amount;
      }
    }
  });
  
  // Calculate net balances
  peopleMap.forEach(person => {
    person.netBalance = person.totalOwed - person.totalGiven;
  });
  
  return Array.from(peopleMap.values());
}

export function getUniquePersonNames(): string[] {
  const expenses = getSharedExpenses();
  const names = new Set<string>();
  expenses.forEach(expense => {
    if (expense.personName) {
      names.add(expense.personName);
    }
  });
  return Array.from(names).sort();
}

// Categories for Personal Expenses
export const EXPENSE_CATEGORIES = [
  'Food & Dining',
  'Transportation',
  'Shopping',
  'Entertainment',
  'Bills & Utilities',
  'Healthcare',
  'Education',
  'Travel',
  'Groceries',
  'Other'
];

// Export/Import
export function exportAllData(): string {
  return JSON.stringify({
    personalExpenses: getPersonalExpenses(),
    sharedExpenses: getSharedExpenses(),
    links: getLinks(),
    groups: getGroups(),
    exportedAt: new Date().toISOString(),
    version: '2.0'
  }, null, 2);
}

export function importData(jsonData: string): boolean {
  try {
    const data = JSON.parse(jsonData);
    
    if (data.personalExpenses) {
      localStorage.setItem(STORAGE_KEYS.PERSONAL_EXPENSES, JSON.stringify(data.personalExpenses));
    }
    
    if (data.sharedExpenses) {
      localStorage.setItem(STORAGE_KEYS.SHARED_EXPENSES, JSON.stringify(data.sharedExpenses));
    }

    if (data.links) {
      localStorage.setItem(LINKS_STORAGE_KEYS.LINKS, JSON.stringify(data.links));
    }

    if (data.groups) {
      localStorage.setItem(LINKS_STORAGE_KEYS.GROUPS, JSON.stringify(data.groups));
    }
    
    return true;
  } catch (error) {
    console.error('Failed to import data:', error);
    return false;
  }
}

// Partial clear functions
export function clearPersonalExpenses(): void {
  localStorage.removeItem(STORAGE_KEYS.PERSONAL_EXPENSES);
}

export function clearSharedExpenses(): void {
  localStorage.removeItem(STORAGE_KEYS.SHARED_EXPENSES);
}

export function clearLinksData(): void {
  localStorage.removeItem(LINKS_STORAGE_KEYS.LINKS);
  localStorage.removeItem(LINKS_STORAGE_KEYS.GROUPS);
}

export function clearAllData(): void {
  localStorage.removeItem(STORAGE_KEYS.PERSONAL_EXPENSES);
  localStorage.removeItem(STORAGE_KEYS.SHARED_EXPENSES);
  localStorage.removeItem(LINKS_STORAGE_KEYS.LINKS);
  localStorage.removeItem(LINKS_STORAGE_KEYS.GROUPS);
}

// Tab Configuration
export interface TabConfig {
  id: string;
  visible: boolean;
}

const DEFAULT_TABS: TabConfig[] = [
  { id: 'home', visible: true },
  { id: 'personal', visible: true },
  { id: 'shared', visible: true },
  { id: 'links', visible: true },
  { id: 'settings', visible: true },
];

export function getTabConfig(): TabConfig[] {
  try {
    const raw = localStorage.getItem('splitmate_tab_config');
    if (!raw) return DEFAULT_TABS;
    const parsed = JSON.parse(raw) as TabConfig[];
    // Ensure all default tabs are present (in case new tabs added later)
    const ids = new Set(parsed.map(t => t.id));
    for (const dt of DEFAULT_TABS) {
      if (!ids.has(dt.id)) parsed.push(dt);
    }
    return parsed;
  } catch {
    return DEFAULT_TABS;
  }
}

export function setTabConfig(config: TabConfig[]): void {
  localStorage.setItem('splitmate_tab_config', JSON.stringify(config));
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Links Management
export function saveLink(link: LinkItem): void {
  const links = getLinks();
  const existingIndex = links.findIndex(l => l.id === link.id);
  if (existingIndex >= 0) {
    links[existingIndex] = link;
  } else {
    links.push(link);
  }
  localStorage.setItem(LINKS_STORAGE_KEYS.LINKS, JSON.stringify(links));
}

export function getLinks(): LinkItem[] {
  const stored = localStorage.getItem(LINKS_STORAGE_KEYS.LINKS);
  return stored ? JSON.parse(stored) : [];
}

export function deleteLink(id: string): void {
  const links = getLinks().filter(l => l.id !== id);
  localStorage.setItem(LINKS_STORAGE_KEYS.LINKS, JSON.stringify(links));
}

export function toggleLinkPin(id: string): void {
  const links = getLinks();
  const link = links.find(l => l.id === id);
  if (link) {
    link.pinned = !link.pinned;
    localStorage.setItem(LINKS_STORAGE_KEYS.LINKS, JSON.stringify(links));
  }
}

// Groups Management
export function saveGroup(group: LinkGroup): void {
  const groups = getGroups();
  const existingIndex = groups.findIndex(g => g.id === group.id);
  if (existingIndex >= 0) {
    groups[existingIndex] = group;
  } else {
    groups.push(group);
  }
  localStorage.setItem(LINKS_STORAGE_KEYS.GROUPS, JSON.stringify(groups));
}

export function getGroups(): LinkGroup[] {
  const stored = localStorage.getItem(LINKS_STORAGE_KEYS.GROUPS);
  return stored ? JSON.parse(stored) : [];
}

export function deleteGroup(id: string): void {
  // Delete all links in the group first
  const links = getLinks().filter(l => l.groupId !== id);
  localStorage.setItem(LINKS_STORAGE_KEYS.LINKS, JSON.stringify(links));
  
  // Delete the group
  const groups = getGroups().filter(g => g.id !== id);
  localStorage.setItem(LINKS_STORAGE_KEYS.GROUPS, JSON.stringify(groups));
}

export function toggleGroupPin(id: string): void {
  const groups = getGroups();
  const group = groups.find(g => g.id === id);
  if (group) {
    group.pinned = !group.pinned;
    localStorage.setItem(LINKS_STORAGE_KEYS.GROUPS, JSON.stringify(groups));
  }
}

// Fetch metadata for a URL
export async function fetchLinkMetadata(url: string): Promise<Partial<LinkItem>> {
  try {
    // Simple favicon extraction
    const domain = new URL(url).hostname;
    const favicon = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
    
    // For now, we'll use the domain as title since we can't fetch HTML in browser
    const title = domain.replace('www.', '');
    
    return {
      favicon,
      title
    };
  } catch (error) {
    console.error('Failed to fetch metadata:', error);
    return {};
  }
}
