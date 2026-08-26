import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, expect, test, vi } from "vitest";

import { MarkdownEditor } from "@/components/items/markdown-editor";

afterEach(() => vi.restoreAllMocks());

function EditableMarkdown({ initialValue = "Initial text" }) {
  const [value, setValue] = useState(initialValue);
  return (
    <MarkdownEditor
      id="content"
      label="Content"
      value={value}
      onChange={setValue}
    />
  );
}

test("defaults editable content to Write and previews the controlled value", async () => {
  const user = userEvent.setup();
  render(<EditableMarkdown />);

  expect(screen.getByRole("tab", { name: "Write" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  expect(screen.getByRole("tab", { name: "Preview" })).toHaveAttribute(
    "aria-selected",
    "false",
  );
  const content = screen.getByRole("textbox", { name: "Content" });
  await user.clear(content);
  await user.type(content, "# Updated heading");
  await user.click(screen.getByRole("tab", { name: "Preview" }));

  expect(
    screen.getByRole("heading", { name: "Updated heading", level: 1 }),
  ).toBeVisible();
  expect(
    screen.queryByRole("textbox", { name: "Content" }),
  ).not.toBeInTheDocument();
  await user.click(screen.getByRole("tab", { name: "Write" }));
  expect(screen.getByRole("textbox", { name: "Content" })).toHaveValue(
    "# Updated heading",
  );
});

test("moves and activates tabs with the expected keyboard controls", async () => {
  const user = userEvent.setup();
  render(<EditableMarkdown initialValue="# Keyboard preview" />);
  const writeTab = screen.getByRole("tab", { name: "Write" });
  const previewTab = screen.getByRole("tab", { name: "Preview" });

  await user.tab();
  expect(writeTab).toHaveFocus();
  await user.keyboard("{ArrowRight}");
  expect(previewTab).toHaveFocus();
  expect(previewTab).toHaveAttribute("aria-selected", "true");
  expect(
    screen.getByRole("heading", { name: "Keyboard preview" }),
  ).toBeVisible();

  await user.keyboard("{Home}");
  expect(writeTab).toHaveFocus();
  expect(writeTab).toHaveAttribute("aria-selected", "true");
});

test("renders read-only GitHub Flavored Markdown without an editable field", () => {
  const markdown = `# Heading

~~removed~~ and \`inline\` and https://example.com

- [x] complete
- item

1. first

> quoted

\`\`\`ts
const answer = 42
\`\`\`

| Name | Value |
| --- | --- |
| Answer | 42 |

<script>alert("unsafe")</script>`;

  const { container } = render(
    <MarkdownEditor value={markdown} label="Read-only content" readOnly />,
  );

  expect(screen.queryByRole("tab", { name: "Write" })).not.toBeInTheDocument();
  expect(screen.getByRole("tab", { name: "Preview" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  expect(
    screen.getByRole("heading", { name: "Heading", level: 1 }),
  ).toBeVisible();
  expect(screen.getByText("removed").tagName).toBe("DEL");
  expect(screen.getByText("inline").tagName).toBe("CODE");
  expect(
    screen.getByRole("link", { name: "https://example.com" }),
  ).toHaveAttribute("href", "https://example.com");
  expect(screen.getByRole("checkbox")).toBeChecked();
  expect(screen.getByRole("table")).toBeVisible();
  expect(screen.getByText("const answer = 42").tagName).toBe("CODE");
  expect(container.querySelector("blockquote")).not.toBeNull();
  expect(container.querySelector("script")).toBeNull();
  expect(container.querySelector(".markdown-preview")).not.toBeNull();
});

test("copies raw Markdown and reports success accessibly", async () => {
  const user = userEvent.setup();
  render(<EditableMarkdown initialValue="# Copy me" />);
  const writeText = vi
    .spyOn(navigator.clipboard, "writeText")
    .mockResolvedValue(undefined);

  await user.click(screen.getByRole("button", { name: "Copy Markdown" }));

  expect(writeText).toHaveBeenCalledWith("# Copy me");
  expect(screen.getByRole("status")).toHaveTextContent("Copied");
});

test("reports clipboard failure without changing the Markdown", async () => {
  const user = userEvent.setup();
  render(<EditableMarkdown initialValue="Keep this" />);
  vi.spyOn(navigator.clipboard, "writeText").mockRejectedValue(
    new Error("clipboard unavailable"),
  );

  await user.click(screen.getByRole("button", { name: "Copy Markdown" }));

  expect(screen.getByRole("status")).toHaveTextContent("Copy failed");
  expect(screen.getByRole("textbox", { name: "Content" })).toHaveValue(
    "Keep this",
  );
});
