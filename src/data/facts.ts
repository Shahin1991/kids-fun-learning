export interface FactItem {
  id: string;
  label: string;
  emoji: string;
  fact: string;
  /** Spoken sound word, used by Vehicle World */
  sound?: string;
  /** Illustration path under /public; emoji is the fallback */
  art?: string;
}

export interface FactCategory {
  id: string;
  label: string;
  icon: string;
  items: FactItem[];
}
