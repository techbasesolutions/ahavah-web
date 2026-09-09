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
  api.get.mockImplementation(async (path: string) => path === "/me" ? { citySet: true } : { "show my location": "Yes", ahavah_extra: { showOnMap: true } });
});

it("keeps the confirmed map value after a rejected opt-out", async () => {
  api.patch.mockRejectedValue(new Error("offline"));
  render(<PrivacyPage />);
  const toggle = screen.getByRole("switch", { name: "Show me on the map" });
  await waitFor(() => expect(toggle).toBeEnabled());
  expect(toggle).toHaveAttribute("aria-checked", "true");
  fireEvent.click(toggle);
  await screen.findByText(/Could not save. Your previous visibility still applies/);
  expect(toggle).toHaveAttribute("aria-checked", "true");
});

it("hydrates server opt-out and changes it only after confirmation", async () => {
  api.get.mockResolvedValue({ "show my location": "Yes", ahavah_extra: { showOnMap: false } });
  let confirm!: () => void;
  api.patch.mockReturnValue(new Promise<void>(resolve => { confirm = resolve; }));
  render(<PrivacyPage />);
  const toggle = screen.getByRole("switch", { name: "Show me on the map" });
  await waitFor(() => expect(toggle).toBeEnabled());
  expect(toggle).toHaveAttribute("aria-checked", "false");
  fireEvent.click(toggle);
  expect(toggle).toBeDisabled();
  expect(toggle).toHaveAttribute("aria-checked", "false");
  confirm();
  await waitFor(() => expect(toggle).toHaveAttribute("aria-checked", "true"));
});
