import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, expect, test, vi } from "vitest";

import { CodeEditor } from "@/components/items/code-editor";
import { resolveCodeLanguage } from "@/lib/code-language";

vi.mock("@/lib/monaco-setup", () => ({}));

vi.mock("@monaco-editor/react", () => ({
  default: ({
    value,
    language,
    height,
    onChange,
    options,
    theme,
  }: {
    value: string;
    language: string;
    height: number;
    onChange: (value: string) => void;
    options: { ariaLabel: string; readOnly: boolean };
    theme: string;
  }) => (
    <textarea
      aria-label={options.ariaLabel}
      data-height={height}
      data-language={language}
      data-theme={theme}
      readOnly={options.readOnly}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  ),
}));

afterEach(() => vi.restoreAllMocks());

function EditableCode({ maxLength = 50_000 }: { maxLength?: number }) {
  const [value, setValue] = useState("const answer = 42;");
  return (
    <CodeEditor
      value={value}
      language={{ id: "typescript", label: "TypeScript" }}
      label="Content"
      maxLength={maxLength}
      onChange={setValue}
    />
  );
}

test("renders Monaco configuration and updates controlled source", async () => {
  const user = userEvent.setup();
  render(<EditableCode />);
  const editor = screen.getByRole("textbox", { name: "Content" });

  expect(editor).toHaveAttribute("data-language", "typescript");
  expect(editor).toHaveAttribute("data-theme", "devstash-dark");
  expect(Number(editor.getAttribute("data-height"))).toBeLessThanOrEqual(356);
  expect(screen.getByText("TypeScript")).toBeVisible();

  await user.clear(editor);
  await user.type(editor, "export const ready = true;");
  expect(editor).toHaveValue("export const ready = true;");
});

test("enforces maximum length and exposes validation metadata", async () => {
  const user = userEvent.setup();
  render(
    <div>
      <CodeEditor
        value=""
        language={{ id: "plaintext", label: "Plain Text" }}
        label="Content"
        maxLength={5}
        ariaInvalid
        ariaDescribedBy="content-error"
        onChange={() => undefined}
      />
      <span id="content-error">Content is invalid.</span>
    </div>,
  );

  const group = screen.getByRole("group", { name: "Content code editor" });
  expect(group).toHaveAttribute("aria-invalid", "true");
  expect(group).toHaveAttribute("aria-describedby", "content-error");

  render(<EditableCode maxLength={5} />);
  const editors = screen.getAllByRole("textbox", { name: "Content" });
  await user.clear(editors[1]);
  await user.type(editors[1], "1234567");
  expect(editors[1]).toHaveValue("12345");
});

test("renders selectable read-only source with decorative window controls", () => {
  render(
    <CodeEditor
      value="npm run build"
      language={{ id: "shell", label: "Shell" }}
      label="Command content"
      readOnly
    />,
  );

  expect(
    screen.getByRole("textbox", { name: "Command content" }),
  ).toHaveAttribute("readonly");
  expect(
    screen.getByRole("group", { name: "Command content code editor" }),
  ).toHaveAttribute("aria-readonly", "true");
  expect(screen.getByText("Shell")).toBeVisible();
  expect(screen.getByTestId("window-controls")).toHaveAttribute(
    "aria-hidden",
    "true",
  );
  expect(screen.getByTestId("window-controls").children).toHaveLength(3);
});

test("copies raw source and reports clipboard results accessibly", async () => {
  const user = userEvent.setup();
  render(<EditableCode />);
  const writeText = vi
    .spyOn(navigator.clipboard, "writeText")
    .mockResolvedValueOnce(undefined)
    .mockRejectedValueOnce(new Error("clipboard unavailable"));
  const copyButton = screen.getByRole("button", { name: "Copy code" });

  await user.click(copyButton);
  expect(writeText).toHaveBeenCalledWith("const answer = 42;");
  expect(screen.getByRole("status")).toHaveTextContent("Copied");

  await user.click(copyButton);
  expect(screen.getByRole("status")).toHaveTextContent("Copy failed");
});

test("resolves command, supported snippet, and fallback languages", () => {
  expect(resolveCodeLanguage("command", null)).toEqual({
    id: "shell",
    label: "Shell",
  });
  expect(resolveCodeLanguage("snippet", "ts")).toEqual({
    id: "typescript",
    label: "TypeScript",
  });
  expect(resolveCodeLanguage("snippet", "brainfuck")).toEqual({
    id: "plaintext",
    label: "Plain Text",
  });
});
