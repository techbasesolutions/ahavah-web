/**
 * Bot mitigation primitives for unauthenticated public forms.
 *
 * Two layers (matches service/antibot/__init__.py on the backend):
 *
 *  1. Honeypot — a hidden `website` form field. Real users never fill it
 *     (display:none + autocomplete=off + tabIndex=-1). Bots that scrape
 *     and submit every field do. The route silently pretends success so
 *     the bot can't detect rejection.
 *
 *  2. Cloudflare Turnstile — when NEXT_PUBLIC_TURNSTILE_SITE_KEY is set,
 *     useTurnstile() loads the Cloudflare script + renders an invisible
 *     widget that resolves to a one-shot token. When the env var is
 *     unset, the hook returns a stable `null` token so existing callers
 *     work unchanged. Zero-config rollout — flip the env var to activate.
 *
 * The backend treats both `website` and `turnstile_token` as optional;
 * when the backend secret is unset, Turnstile verification is a no-op.
 * So this whole module is safe to use today even before Cloudflare keys
 * are provisioned.
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";

export type AntibotPayload = {
  /** Honeypot value — always send (empty if real user). */
  website?: string;
  /** Turnstile token, or null when not enabled / not yet ready. */
  turnstile_token?: string | null;
};

declare global {
  interface Window {
    turnstile?: {
      render: (
        el: HTMLElement,
        opts: {
          sitekey: string;
          callback?: (token: string) => void;
          "error-callback"?: () => void;
          "expired-callback"?: () => void;
          theme?: "light" | "dark" | "auto";
          size?: "normal" | "compact" | "invisible";
        },
      ) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
  }
}

let scriptLoading: Promise<void> | null = null;

function loadTurnstileScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.turnstile) return Promise.resolve();
  if (scriptLoading) return scriptLoading;
  scriptLoading = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("turnstile script failed to load"));
    document.head.appendChild(s);
  });
  return scriptLoading;
}

/**
 * Hook that renders an invisible Turnstile widget into the returned ref
 * and exposes the most recent token. When NEXT_PUBLIC_TURNSTILE_SITE_KEY
 * is unset, the hook is a no-op: ref does nothing, token stays null.
 *
 * Pair with the backend's verify_turnstile() — both no-op when their
 * respective env var is blank, so the whole stack ships safely today.
 */
export function useTurnstile() {
  const ref = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    if (!SITE_KEY || !ref.current) return;
    let cancelled = false;
    void loadTurnstileScript()
      .then(() => {
        if (cancelled || !ref.current || !window.turnstile) return;
        widgetIdRef.current = window.turnstile.render(ref.current, {
          sitekey: SITE_KEY,
          size: "invisible",
          callback: (t) => setToken(t),
          "error-callback": () => setToken(null),
          "expired-callback": () => setToken(null),
        });
      })
      .catch(() => {
        // Script failed to load — frontend stays usable; backend will
        // still accept the request since verify_turnstile() returns
        // false-on-error only when a secret IS configured. If the
        // backend has the secret configured, the user will see a 403
        // and can retry — which will re-trigger script load.
      });
    return () => {
      cancelled = true;
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          // ignore
        }
      }
      widgetIdRef.current = null;
    };
  }, []);

  const reset = useCallback(() => {
    setToken(null);
    if (widgetIdRef.current && window.turnstile) {
      try {
        window.turnstile.reset(widgetIdRef.current);
      } catch {
        // ignore
      }
    }
  }, []);

  return {
    /** Attach to the invisible widget container. Safe to leave attached
     *  even when the site key is unset (no-op). */
    ref,
    /** Current Turnstile token, or null when not enabled / not yet ready. */
    token,
    /** Call after a successful submit to force a fresh token next time. */
    reset,
    /** True when Turnstile is configured at all (frontend env-var set). */
    enabled: Boolean(SITE_KEY),
  };
}

/**
 * Build the antibot payload to merge into a POST body. Call right before
 * the form submit. `website` should be the honeypot field's current value
 * (empty string when the user hasn't filled it, as expected).
 */
export function antibotPayload(
  website: string,
  turnstileToken: string | null,
): AntibotPayload {
  const out: AntibotPayload = {};
  if (website) out.website = website;
  if (turnstileToken) out.turnstile_token = turnstileToken;
  return out;
}
