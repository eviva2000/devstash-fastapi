import type { ItemType } from "@/api/items";

export type CodeLanguage = {
  id: string;
  label: string;
};

const plainText: CodeLanguage = { id: "plaintext", label: "Plain Text" };
const shell: CodeLanguage = { id: "shell", label: "Shell" };

const languages = new Map<string, CodeLanguage>([
  ["c", { id: "c", label: "C" }],
  ["c++", { id: "cpp", label: "C++" }],
  ["cpp", { id: "cpp", label: "C++" }],
  ["c#", { id: "csharp", label: "C#" }],
  ["cs", { id: "csharp", label: "C#" }],
  ["csharp", { id: "csharp", label: "C#" }],
  ["css", { id: "css", label: "CSS" }],
  ["docker", { id: "dockerfile", label: "Dockerfile" }],
  ["dockerfile", { id: "dockerfile", label: "Dockerfile" }],
  ["go", { id: "go", label: "Go" }],
  ["html", { id: "html", label: "HTML" }],
  ["java", { id: "java", label: "Java" }],
  ["javascript", { id: "javascript", label: "JavaScript" }],
  ["js", { id: "javascript", label: "JavaScript" }],
  ["json", { id: "json", label: "JSON" }],
  ["jsx", { id: "javascript", label: "JavaScript JSX" }],
  ["kotlin", { id: "kotlin", label: "Kotlin" }],
  ["less", { id: "less", label: "Less" }],
  ["md", { id: "markdown", label: "Markdown" }],
  ["markdown", { id: "markdown", label: "Markdown" }],
  ["php", { id: "php", label: "PHP" }],
  ["plaintext", plainText],
  ["powershell", { id: "powershell", label: "PowerShell" }],
  ["ps1", { id: "powershell", label: "PowerShell" }],
  ["py", { id: "python", label: "Python" }],
  ["python", { id: "python", label: "Python" }],
  ["rb", { id: "ruby", label: "Ruby" }],
  ["ruby", { id: "ruby", label: "Ruby" }],
  ["rust", { id: "rust", label: "Rust" }],
  ["scss", { id: "scss", label: "SCSS" }],
  ["sql", { id: "sql", label: "SQL" }],
  ["swift", { id: "swift", label: "Swift" }],
  ["text", plainText],
  ["ts", { id: "typescript", label: "TypeScript" }],
  ["tsx", { id: "typescript", label: "TypeScript JSX" }],
  ["typescript", { id: "typescript", label: "TypeScript" }],
  ["xml", { id: "xml", label: "XML" }],
  ["yaml", { id: "yaml", label: "YAML" }],
  ["yml", { id: "yaml", label: "YAML" }],
]);

export function resolveCodeLanguage(
  itemType: Extract<ItemType, "snippet" | "command">,
  language?: string | null,
): CodeLanguage {
  if (itemType === "command") return shell;
  return languages.get(language?.trim().toLowerCase() ?? "") ?? plainText;
}
