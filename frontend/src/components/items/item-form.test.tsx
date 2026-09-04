import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { expect, test, vi } from "vitest";

import { ItemForm } from "@/components/items/item-form";

vi.mock("@/components/items/lazy-code-editor", () => ({
  LazyCodeEditor: ({
    label,
    value,
    onChange,
  }: {
    label: string;
    value: string;
    onChange: (value: string) => void;
  }) => (
    <textarea
      aria-label={label}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  ),
}));

test("uses the design-system combobox to select an item type", async () => {
  const user = userEvent.setup();
  const onSubmit = vi.fn().mockResolvedValue(undefined);
  render(
    <ItemForm
      submitLabel="Create item"
      onCancel={vi.fn()}
      onSubmit={onSubmit}
    />,
  );

  const itemType = screen.getByRole("combobox", { name: "Type" });
  expect(itemType.tagName).toBe("BUTTON");

  await user.click(itemType);
  await user.click(screen.getByRole("option", { name: "Command" }));
  await user.type(screen.getByRole("textbox", { name: "Title" }), "List files");
  await user.type(screen.getByRole("textbox", { name: "Content" }), "ls");
  await user.click(screen.getByRole("button", { name: "Create item" }));

  expect(onSubmit).toHaveBeenCalledWith({
    title: "List files",
    content: "ls",
    item_type: "command",
    language: null,
  });
});
