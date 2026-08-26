import { render, screen, within } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { expect, test } from "vitest";

import { DashboardPage } from "@/components/dashboard/dashboard-page";

function renderDashboard() {
  return render(
    <MemoryRouter>
      <DashboardPage />
    </MemoryRouter>,
  );
}

test("renders dashboard overview and typed navigation links", () => {
  renderDashboard();
  expect(screen.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  expect(screen.getByText("Total items")).toBeVisible();
  expect(
    screen
      .getAllByRole("link")
      .find((link) => link.getAttribute("href") === "/items/snippets"),
  ).toBeVisible();
  const recentSection = screen.getByRole("heading", {
    name: "Recent items",
  }).parentElement;
  expect(recentSection).not.toBeNull();
  expect(
    within(recentSection!).getAllByRole("heading", { level: 3 }),
  ).toHaveLength(6);
  expect(
    screen.queryByRole("heading", { name: "Pinned" }),
  ).not.toBeInTheDocument();
});

test("collapses and expands the desktop sidebar", async () => {
  const user = userEvent.setup();
  renderDashboard();
  await user.click(screen.getByRole("button", { name: "Collapse sidebar" }));
  expect(screen.getByRole("button", { name: "Expand sidebar" })).toBeVisible();
  await user.click(screen.getByRole("button", { name: "Expand sidebar" }));
  expect(
    screen.getByRole("button", { name: "Collapse sidebar" }),
  ).toBeVisible();
});

test("opens the mobile drawer and closes it with Escape", async () => {
  const user = userEvent.setup();
  renderDashboard();
  const openNavigation = screen.getByRole("button", {
    name: "Open navigation",
  });
  await user.click(openNavigation);
  expect(
    screen.getByRole("dialog", { name: "Mobile navigation" }),
  ).toBeVisible();
  expect(
    screen.getByRole("button", { name: "Close navigation" }),
  ).toHaveFocus();
  await user.keyboard("{Escape}");
  expect(
    screen.queryByRole("dialog", { name: "Mobile navigation" }),
  ).not.toBeInTheDocument();
  expect(openNavigation).toHaveFocus();
});
