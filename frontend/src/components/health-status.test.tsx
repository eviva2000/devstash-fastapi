import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { beforeEach, expect, test, vi } from "vitest";

import { fetchHealth } from "@/api/health";
import { HealthStatus } from "@/components/health-status";

vi.mock("@/api/health", () => ({
  fetchHealth: vi.fn(),
}));

const fetchHealthMock = vi.mocked(fetchHealth);

beforeEach(() => {
  fetchHealthMock.mockReset();
});

test("shows a loading state while checking the API", () => {
  fetchHealthMock.mockReturnValue(new Promise(() => undefined));

  render(<HealthStatus />);

  expect(screen.getByRole("status")).toHaveTextContent("Checking API");
});

test("shows a healthy state when the API responds", async () => {
  fetchHealthMock.mockResolvedValue({ status: "ok" });

  render(<HealthStatus />);

  expect(await screen.findByText("API connected")).toBeVisible();
});

test("shows an unavailable state and supports retrying", async () => {
  fetchHealthMock
    .mockRejectedValueOnce(new Error("offline"))
    .mockResolvedValueOnce({ status: "ok" });
  const user = userEvent.setup();

  render(<HealthStatus />);

  await screen.findByText("API unavailable");
  await user.click(screen.getByRole("button", { name: "Retry" }));

  expect(await screen.findByText("API connected")).toBeVisible();
  expect(fetchHealthMock).toHaveBeenCalledTimes(2);
});
