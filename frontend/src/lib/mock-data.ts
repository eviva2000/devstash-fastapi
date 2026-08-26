export type ResourceType = {
  slug: string;
  label: string;
  count: number;
  color: "blue" | "violet" | "orange" | "yellow" | "slate" | "pink" | "emerald";
};
export type Collection = {
  id: string;
  name: string;
  description: string;
  itemCount: number;
  favorite: boolean;
  accent: "blue" | "yellow" | "orange" | "violet" | "slate";
  types: string[];
};
export type DashboardItem = {
  id: string;
  title: string;
  description: string;
  type: "snippet" | "prompt" | "command" | "note";
  tags: string[];
  favorite: boolean;
  date: string;
};

export const resourceTypes: ResourceType[] = [
  { slug: "snippets", label: "Snippets", count: 8, color: "blue" },
  { slug: "prompts", label: "Prompts", count: 18, color: "violet" },
  { slug: "commands", label: "Commands", count: 15, color: "orange" },
  { slug: "notes", label: "Notes", count: 12, color: "yellow" },
  { slug: "files", label: "Files", count: 5, color: "slate" },
  { slug: "images", label: "Images", count: 3, color: "pink" },
  { slug: "links", label: "Links", count: 8, color: "emerald" },
];
export const collections: Collection[] = [
  {
    id: "react-patterns",
    name: "React Patterns",
    description: "Common React patterns and hooks",
    itemCount: 12,
    favorite: true,
    accent: "blue",
    types: ["snippet", "note", "link"],
  },
  {
    id: "python-snippets",
    name: "Python Snippets",
    description: "Useful Python code snippets",
    itemCount: 8,
    favorite: false,
    accent: "blue",
    types: ["snippet", "note"],
  },
  {
    id: "context-files",
    name: "Context Files",
    description: "AI context files for projects",
    itemCount: 5,
    favorite: true,
    accent: "slate",
    types: ["file", "note"],
  },
  {
    id: "interview-prep",
    name: "Interview Prep",
    description: "Technical interview preparation",
    itemCount: 24,
    favorite: false,
    accent: "yellow",
    types: ["note", "snippet", "link", "prompt"],
  },
  {
    id: "git-commands",
    name: "Git Commands",
    description: "Frequently used git commands",
    itemCount: 15,
    favorite: true,
    accent: "orange",
    types: ["command", "note"],
  },
  {
    id: "ai-prompts",
    name: "AI Prompts",
    description: "Curated AI prompts for coding",
    itemCount: 18,
    favorite: false,
    accent: "violet",
    types: ["prompt", "snippet", "note"],
  },
];
export const recentItems: DashboardItem[] = [
  {
    id: "auth-hook",
    title: "useAuth Hook",
    description: "Custom authentication hook for React applications",
    type: "snippet",
    tags: ["react", "auth", "hooks"],
    favorite: true,
    date: "Jan 15",
  },
  {
    id: "api-errors",
    title: "API Error Handling Pattern",
    description: "Fetch wrapper with exponential backoff retry logic",
    type: "snippet",
    tags: ["api", "typescript"],
    favorite: false,
    date: "Jan 12",
  },
  {
    id: "docker-clean",
    title: "Clean Docker workspace",
    description: "Remove unused containers, networks, and images",
    type: "command",
    tags: ["docker"],
    favorite: true,
    date: "Jan 10",
  },
  {
    id: "review-prompt",
    title: "Pull Request Review",
    description: "A focused prompt for reviewing code changes",
    type: "prompt",
    tags: ["ai", "review"],
    favorite: false,
    date: "Jan 9",
  },
  {
    id: "typing-note",
    title: "Python Typing Notes",
    description: "Modern typing patterns for Python 3.12",
    type: "note",
    tags: ["python", "typing"],
    favorite: false,
    date: "Jan 8",
  },
  {
    id: "rebase",
    title: "Interactive Rebase",
    description: "Clean up local commits before opening a PR",
    type: "command",
    tags: ["git"],
    favorite: true,
    date: "Jan 7",
  },
];
export const dashboardUser = {
  name: "John Doe",
  email: "john@example.com",
  initials: "JD",
};
