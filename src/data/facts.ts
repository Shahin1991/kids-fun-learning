export interface FactItem {
  id: string;
  label: string;
  emoji: string;
  fact: string;
  /** Spoken sound word, used by Vehicle World */
  sound?: string;
}

export interface FactCategory {
  id: string;
  label: string;
  icon: string;
  items: FactItem[];
}
