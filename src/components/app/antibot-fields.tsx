"use client";

import { useState } from "react";

import { antibotPayload, useTurnstile, type AntibotPayload } from "@/lib/antibot";
import { HoneypotField } from "@/components/app/honeypot-field";

/**
 * Single component that bundles the honeypot field + invisible Turnstile
 * widget for unauthenticated public forms. Drop one `<AntibotFields />`
 * into any form and call its `getPayload()` ref-returned function at
 * submit time to merge `website` + `turnstile_token` into the POST body.
 *
 * Both fields are no-op when their respective env var is unset, so this
 * component is safe to use today regardless of whether Cloudflare keys
 * have been provisioned.
 *
 * Usage:
 *   const antibotRef = useRef<AntibotHandle>(null);
 *   ...
 *   await postWaitlist(email, answers, antibotRef.current?.payload() ?? {});
 *   antibotRef.current?.reset();
 *   ...
 *   <AntibotFields ref={antibotRef} />
 */

import { forwardRef, useImperativeHandle } from "react";

export type AntibotHandle = {
  payload: () => AntibotPayload;
  reset: () => void;
};

export const AntibotFields = forwardRef<AntibotHandle>(function AntibotFields(_props, ref) {
  const [website, setWebsite] = useState("");
  const { ref: turnstileRef, token: turnstileToken, reset: resetTurnstile } = useTurnstile();

  useImperativeHandle(
    ref,
    () => ({
      payload: () => antibotPayload(website, turnstileToken),
      reset: () => {
        setWebsite("");
        resetTurnstile();
      },
    }),
    [website, turnstileToken, resetTurnstile],
  );

  return (
    <>
      <HoneypotField value={website} onChange={setWebsite} />
      {/* Turnstile widget container. `hidden` here serves the same role
          as display:none: the invisible Turnstile widget binds to this
          div but produces no layout/visual output. */}
      <div ref={turnstileRef} aria-hidden hidden />
    </>
  );
});
