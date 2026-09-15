import type { ReactNode } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
const api = vi.hoisted(() => ({ get: vi.fn(), patch: vi.fn() }));
vi.mock("@/lib/api-client", () => ({ apiClient: api }));
vi.mock("@/components/app/settings-shell", () => ({ SettingsShell: ({ children }: { children: ReactNode }) => <main>{children}</main> }));
vi.mock("@/components/ui/switch", () => ({ Switch: ({ checked, disabled, onCheckedChange, "aria-label": label }: { checked: boolean; disabled?: boolean; onCheckedChange?: (value: boolean) => void; "aria-label"?: string }) => <button role="switch" aria-label={label} aria-checked={checked} disabled={disabled} onClick={() => onCheckedChange?.(!checked)} /> }));
import PrivacyPage from "@/app/settings/privacy/page";

beforeEach(() => {
  api.get.mockReset(); api.patch.mockReset();
  api.get.mockImplementation(async (path: string) => (path === "/me" ? { citySet: true } : { spotlight_opt_in: false, ahavah_extra: {} }));
});

it("renders the Spotlight row off by default and PATCHes spotlight_opt_in", async () => {
  render(<PrivacyPage />);
  const sw = await screen.findByRole("switch", { name: "Feature me in Spotlight" });
  expect(sw).toHaveAttribute("aria-checked", "false");
  expect(screen.getByText("Spotlight")).toBeInTheDocument();
  api.patch.mockResolvedValue({});
  fireEvent.click(sw);
  await waitFor(() => expect(api.patch).toHaveBeenCalledWith("/profile-info", { spotlight_opt_in: true }));
  await waitFor(() => expect(sw).toHaveAttribute("aria-checked", "true"));
});

it("keeps the previous value when the PATCH fails", async () => {
  api.patch.mockRejectedValue(new Error("offline"));
  render(<PrivacyPage />);
  const sw = await screen.findByRole("switch", { name: "Feature me in Spotlight" });
  await waitFor(() => expect(sw).toBeEnabled());
  expect(sw).toHaveAttribute("aria-checked", "false");
  fireEvent.click(sw);
  await screen.findByText(/Could not save\. Your previous setting still applies/);
  expect(sw).toHaveAttribute("aria-checked", "false");
});
