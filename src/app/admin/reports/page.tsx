"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Pill } from "@/components/kibo-ui/pill";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/app/empty-state";
import {
  PageHeader,
  PageHeaderTitle,
  PageShell,
} from "@/components/app/page-shell";

import { apiClient, ApiError } from "@/lib/api-client";
import { useProfile } from "@/lib/use-profile";
import { isAdminOrMod } from "@/lib/profile-schema";

/**
 * /admin/reports — moderator-gated abuse-report listing.
 *
 * Closes the bouncing-mailbox gap: DUO_REPORT_EMAIL on the droplet
 * still points at Duolicious sample addresses (ahavah@example.com
 * etc.), so abuse reports persist only in the `skipped` table with
 * `reported = TRUE`. Until that env points at a real mailbox, this
 * page is the only operator-visible surface for triaging.
 *
 * Auth (defense in depth):
 *   1. Client-side: profile.roles must include 'admin' or 'mod' —
 *      page renders a Forbidden empty state otherwise. Doesn't actually
 *      protect anything (the data isn't fetched until the gate
 *      passes), it just stops the network call.
 *   2. Server-side: GET /admin/reports re-validates roles in
 *      service.moderation.get_admin_reports. Anyone bypassing the
 *      client gate still gets 403 from the server.
 */

type AdminReport = {
  created_at: string;
  reporter_id: number;
  reporter_uuid: string;
  reporter_name: string;
  reporter_email: string;
  reported_id: number;
  reported_uuid: string;
  reported_name: string;
  reported_email: string;
  reported_active: boolean;
  reported_verification_required: boolean;
  reason: string;
};

type ReportsResponse = {
  reports: ReadonlyArray<AdminReport>;
  count: number;
};

type State =
  | { kind: "loading" }
  | { kind: "happy"; reports: ReadonlyArray<AdminReport> }
  | { kind: "empty" }
  | { kind: "forbidden" }
  | { kind: "error"; message: string };

export default function AdminReportsPage() {
  const { profile, loaded } = useProfile();
  const [state, setState] = useState<State>({ kind: "loading" });
  const [reloadKey, setReloadKey] = useState(0);

  const isAuthorized = isAdminOrMod(profile);

  useEffect(() => {
    // Wait for the profile to load before deciding what to render —
    // otherwise a brief render-before-fetch window flashes the
    // "Forbidden" surface to legitimate admins.
    if (!loaded) return;
    if (!isAuthorized) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setState({ kind: "forbidden" });
      return;
    }

    let cancelled = false;
    setState({ kind: "loading" });
    void apiClient
      .get<ReportsResponse>("/admin/reports")
      .then((res) => {
        if (cancelled) return;
        if (!res.reports || res.reports.length === 0) {
          setState({ kind: "empty" });
        } else {
          setState({ kind: "happy", reports: res.reports });
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 403) {
          setState({ kind: "forbidden" });
          return;
        }
        const msg =
          err instanceof ApiError
            ? err.message
            : err instanceof Error
              ? err.message
              : "Couldn't load reports.";
        setState({ kind: "error", message: msg });
      });
    return () => {
      cancelled = true;
    };
  }, [loaded, isAuthorized, reloadKey]);

  return (
    <PageShell>
      <PageHeader>
        <Button
          variant="ghost"
          size="icon-tap"
          render={<Link href="/profile" prefetch={false} />}
          aria-label="Back to profile"
        >
          <ArrowLeft />
        </Button>
        <PageHeaderTitle>Abuse reports</PageHeaderTitle>
      </PageHeader>

      <div className="px-5 pb-12 pt-4">
        {state.kind === "loading" ? (
          <div className="space-y-3" aria-busy="true" aria-live="polite">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-24 w-full rounded-2xl" />
            ))}
          </div>
        ) : state.kind === "forbidden" ? (
          <EmptyState
            variant="you-blocked-everyone"
            title="Moderator access required"
            description="This surface is only available to operators with the admin or mod role on their account."
            action={{ label: "Back to profile", href: "/profile" }}
          />
        ) : state.kind === "error" ? (
          <ErrorState
            title="Couldn't load reports"
            description={state.message}
            retry={{ onClick: () => setReloadKey((k) => k + 1) }}
          />
        ) : state.kind === "empty" ? (
          <EmptyState
            variant="no-messages"
            title="Inbox zero — no open reports"
            description="Anyone the community blocks with a report reason shows up here."
          />
        ) : (
          <ReportsList reports={state.reports} />
        )}
      </div>
    </PageShell>
  );
}

function ReportsList({ reports }: { reports: ReadonlyArray<AdminReport> }) {
  return (
    <section
      role="region"
      aria-label="Abuse reports"
      className="space-y-3"
    >
      <p className="text-caption text-text-secondary">
        Showing {reports.length} most recent. Server caps at 200.
      </p>
      {reports.map((r) => (
        <Card
          key={`${r.reporter_id}-${r.reported_id}-${r.created_at}`}
          tone="elevated"
          size="sm"
        >
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-meta font-medium leading-tight text-white">
                  {r.reporter_name} reported {r.reported_name}
                </p>
                <p className="mt-0.5 text-caption leading-tight text-text-secondary">
                  {formatStamp(r.created_at)}
                </p>
              </div>
              <div className="flex flex-wrap justify-end gap-1.5">
                {!r.reported_active ? (
                  <Pill variant="lavender" size="sm">
                    Account inactive
                  </Pill>
                ) : null}
                {r.reported_verification_required ? (
                  <Pill variant="lavender" size="sm">
                    Verification flagged
                  </Pill>
                ) : null}
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-3">
            <p className="rounded-lg bg-bg-canvas/40 px-3 py-2 text-caption italic text-white/85">
              &ldquo;{r.reason || "(no reason given)"}&rdquo;
            </p>

            <dl className="grid grid-cols-1 gap-1 text-caption text-text-secondary">
              <div className="flex justify-between gap-2">
                <dt>Reporter</dt>
                <dd className="truncate text-right text-white">
                  {r.reporter_email}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt>Reported</dt>
                <dd className="truncate text-right text-white">
                  {r.reported_email}
                </dd>
              </div>
            </dl>

            <div className="flex flex-wrap gap-2">
              <Button
                variant="link"
                size="sm"
                render={
                  <Link
                    href={`/profile/${r.reported_uuid}?from=admin`}
                    prefetch={false}
                  />
                }
              >
                View reported profile →
              </Button>
              <Button
                variant="link"
                size="sm"
                className="text-text-secondary"
                render={
                  <Link
                    href={`/profile/${r.reporter_uuid}?from=admin`}
                    prefetch={false}
                  />
                }
              >
                View reporter profile →
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </section>
  );
}

function formatStamp(iso: string): string {
  // Backend ships timestamps without timezone (created_at is timestamp
  // without time zone). Treat as UTC for display consistency.
  const d = new Date(iso.endsWith("Z") || iso.includes("+") ? iso : iso + "Z");
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
