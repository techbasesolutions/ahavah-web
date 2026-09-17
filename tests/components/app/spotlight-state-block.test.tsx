import { render, screen } from "@testing-library/react";
import { AlertCircle, Check, Clock } from "lucide-react";
import { expect, it } from "vitest";

import { SpotlightStateBlock } from "@/components/app/spotlight-state-block";

/**
 * SpotlightStateBlock is the "badge + heading + paragraph + optional
 * action" block extracted from the near-identical invalid/expired/error
 * (and, on the card page, rejected/photoRejected) JSX both
 * /spotlight/confirm/[token] and /spotlight/card/[token] used to carry
 * separately. Each existing page test already covers the state machine
 * end to end; this test covers the shared block's own contract across
 * a representative state from each tone: it renders the heading it is
 * given, and renders the action when one is passed (a warn-tone state
 * with a button action) or nothing extra when one is not (the card
 * page's `unavailable`/`paused` states pass no action at all, so an
 * ok-tone case here proves the block does not require one).
 */
it("renders each state's heading and action", () => {
  const cases = [
    {
      tone: "warn" as const,
      icon: AlertCircle,
      heading: "This link is not valid.",
      paragraph: "It may have been copied incompletely.",
      action: <button type="button">Open Settings, Privacy</button>,
      actionName: "Open Settings, Privacy",
    },
    {
      tone: "warn" as const,
      icon: Clock,
      heading: "This link has expired.",
      paragraph: "Ask to be featured again from Settings, Privacy.",
      action: <button type="button">Turn on Spotlight</button>,
      actionName: "Turn on Spotlight",
    },
    {
      tone: "ok" as const,
      icon: Check,
      heading: "You are in.",
      paragraph: "We will email you before anything is posted.",
      action: undefined,
      actionName: null,
    },
  ];

  for (const { tone, icon, heading, paragraph, action, actionName } of cases) {
    const { unmount } = render(
      <SpotlightStateBlock tone={tone} icon={icon} heading={heading} paragraph={paragraph} action={action} />,
    );
    expect(screen.getByRole("heading", { name: heading })).toBeInTheDocument();
    expect(screen.getByText(paragraph)).toBeInTheDocument();
    if (actionName) {
      expect(screen.getByRole("button", { name: actionName })).toBeInTheDocument();
    } else {
      expect(screen.queryByRole("button")).not.toBeInTheDocument();
    }
    unmount();
  }
});
