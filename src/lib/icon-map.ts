/**
 * Canonical icon assignments for token actions across the app.
 * Imported from lucide-react. Use these exports at every consumer site
 * for these actions — NEVER import the underlying lucide icons directly
 * for boost / super-like / rewind / like, so a future icon change
 * happens in ONE place.
 *
 * Decisions (per 2026-05-19 PDF "/Profile" icon-consistency feedback):
 * - Boost      = Zap        (energetic, distinct shape; was a mix of
 *                            Sparkles on /tokens + Zap/Sparkles in
 *                            BoostCard)
 * - SuperLike  = Star       (priority/prominence, clearly distinct from
 *                            the regular Like Heart; was Sparkles on
 *                            /discover and Heart on /tokens — both wrong
 *                            because each collided with another action)
 * - Rewind     = Undo2      ("undo last pass" — a curved undo arrow,
 *                            shared by the /discover Back button and the
 *                            /tokens Rewind card. NOTE: distinct from the
 *                            page-navigation BackButton's ArrowLeft —
 *                            "go back a page" != "undo a swipe decision".
 *                            Was RotateCcw until 2026-05-20.)
 * - Like       = Heart      (mutual interest; unchanged)
 *
 * Match celebration uses NO icon — the lime "It's a match!" pill is the
 * celebration (the old Sparkles brand-mark was removed 2026-05-19).
 */
import { Heart, Star, Undo2, Zap } from "lucide-react";

export const TokenActionIcon = {
  Boost: Zap,
  SuperLike: Star,
  Rewind: Undo2,
  Like: Heart,
} as const;
