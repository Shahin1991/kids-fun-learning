export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: "first-star", title: "First Star", description: "Earned your very first star!", icon: "⭐" },
  { id: "star-collector", title: "Star Collector", description: "Collected 10 stars", icon: "🌟" },
  { id: "memory-master", title: "Memory Master", description: "Finished a hard memory game", icon: "🧠" },
  { id: "idea-machine", title: "Idea Machine", description: "Thought of 10 or more alternate uses", icon: "💡" },
  { id: "bubble-popper", title: "Bubble Popper", description: "Popped 10 bubbles in one game", icon: "🫧" },
];

export function getAchievement(id: string): Achievement | undefined {
  return ACHIEVEMENTS.find((a) => a.id === id);
}
