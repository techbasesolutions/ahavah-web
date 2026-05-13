/**
 * Pure XML stanza encoder / decoder for the ahavah XMPP-over-WebSocket
 * wire format.
 *
 * No side effects. No browser globals at module scope (DOMParser is read
 * at decode call time so the module imports cleanly in Node test contexts;
 * tests stub a parser when missing).
 *
 * @see docs/agent-prompts/phase-w-agent-4-wire-format.md
 */

import type { ChatEvent, ChatMessage, ChatThread } from "@/lib/chat-types";

const JABBER_CLIENT_NS = "jabber:client";
const FRAMING_NS = "urn:ietf:params:xml:ns:xmpp-framing";
const SASL_NS = "urn:ietf:params:xml:ns:xmpp-sasl";
const BIND_NS = "urn:ietf:params:xml:ns:xmpp-bind";
const RECEIPTS_NS = "urn:xmpp:receipts";
const INBOX_NS = "erlang-solutions.com:xmpp:inbox:0";
const FORWARD_NS = "urn:xmpp:forward:0";
const DELAY_NS = "urn:xmpp:delay";
const MAM_NS = "urn:xmpp:mam:2";
const RSM_NS = "http://jabber.org/protocol/rsm";
const X_DATA_NS = "jabber:x:data";
const CHAT_MARKERS_NS = "urn:xmpp:chat-markers:0";

const ATTR_ENTITIES: Array<[RegExp, string]> = [
  [/&/g, "&amp;"],
  [/</g, "&lt;"],
  [/>/g, "&gt;"],
  [/"/g, "&quot;"],
];

const BODY_ENTITIES: Array<[RegExp, string]> = [
  [/&/g, "&amp;"],
  [/</g, "&lt;"],
  [/>/g, "&gt;"],
];

function escapeAttr(value: string): string {
  let out = value;
  for (const [re, ent] of ATTR_ENTITIES) {
    out = out.replace(re, ent);
  }
  return out;
}

function escapeText(value: string): string {
  let out = value;
  for (const [re, ent] of BODY_ENTITIES) {
    out = out.replace(re, ent);
  }
  return out;
}

/**
 * Strip the @domain off a bare JID (`uuid@ahavah.app` → `uuid`).
 * Returns the input unchanged if no `@` is present.
 */
export function bareJid(jid: string | null | undefined): string {
  if (!jid) return "";
  const at = jid.indexOf("@");
  return at === -1 ? jid : jid.slice(0, at);
}

// ---------------------------------------------------------------------------
// Encoders — return XML strings to send over the WS.
// ---------------------------------------------------------------------------

/**
 * Stream opening frame. Sent twice: once before auth, once after SASL success.
 */
export function encodeOpen(domain: string): string {
  return `<open xmlns="${FRAMING_NS}" to="${escapeAttr(domain)}" version="1.0"/>`;
}

/**
 * SASL PLAIN auth — base64 of `\0<uuid>\0<token>`.
 *
 * Uses globalThis.btoa when available (browser), falls back to
 * Buffer.from(...).toString('base64') for Node test environments.
 */
export function encodeAuth(uuid: string, sessionToken: string): string {
  const raw = `\u0000${uuid}\u0000${sessionToken}`;
  const b64 = encodeBase64(raw);
  return `<auth xmlns="${SASL_NS}" mechanism="PLAIN">${b64}</auth>`;
}

function encodeBase64(raw: string): string {
  // Browser path.
  if (typeof globalThis !== "undefined" && typeof (globalThis as { btoa?: (s: string) => string }).btoa === "function") {
    // btoa only handles Latin-1; the input is ASCII (UUID + token), so safe.
    return (globalThis as { btoa: (s: string) => string }).btoa(raw);
  }
  // Node path.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buf = (globalThis as any).Buffer;
  if (buf?.from) {
    return buf.from(raw, "utf-8").toString("base64");
  }
  throw new Error("encodeBase64: no btoa or Buffer available");
}

/**
 * Resource bind request. Server returns bare JID regardless of resource.
 */
export function encodeBind(iqId: string, resource: string): string {
  return `<iq type="set" id="${escapeAttr(iqId)}"><bind xmlns="${BIND_NS}"><resource>${escapeText(resource)}</resource></bind></iq>`;
}

/**
 * Outbound chat message stanza. The id is echoed in the server's
 * duo_message_delivered ack — pass the same clientId you use to identify the
 * optimistic bubble.
 */
export function encodeMessage(params: {
  fromUuid: string;
  toUuid: string;
  clientId: string;
  body: string;
  domain: string;
}): string {
  const { fromUuid, toUuid, clientId, body, domain } = params;
  return (
    `<message` +
    ` type="chat"` +
    ` from="${escapeAttr(fromUuid)}@${escapeAttr(domain)}"` +
    ` to="${escapeAttr(toUuid)}@${escapeAttr(domain)}"` +
    ` id="${escapeAttr(clientId)}"` +
    ` xmlns="${JABBER_CLIENT_NS}">` +
    `<body>${escapeText(body)}</body>` +
    `<request xmlns="${RECEIPTS_NS}"/>` +
    `</message>`
  );
}

/**
 * Outbound typing indicator stanza. No body. id can be any short token —
 * the server doesn't track typing acks (no duo_typing_delivered exists).
 */
export function encodeTyping(params: {
  fromUuid: string;
  toUuid: string;
  domain: string;
  clientId?: string;
}): string {
  const { fromUuid, toUuid, domain, clientId } = params;
  const id = clientId ?? `typ-${Math.random().toString(36).slice(2, 10)}`;
  return (
    `<message` +
    ` type="typing"` +
    ` from="${escapeAttr(fromUuid)}@${escapeAttr(domain)}"` +
    ` to="${escapeAttr(toUuid)}@${escapeAttr(domain)}"` +
    ` id="${escapeAttr(id)}"` +
    ` xmlns="${JABBER_CLIENT_NS}"/>`
  );
}

/**
 * Inbox list query — returns recent threads on the same WS as inline result
 * stanzas (see decodeStanza handling of `<message><result xmlns="erlang-..."/></message>`).
 */
export function encodeInboxQuery(queryId: string): string {
  return `<iq type="set" id="${escapeAttr(queryId)}"><inbox xmlns="${INBOX_NS}" queryid="${escapeAttr(queryId)}"/></iq>`;
}

/**
 * MAM history query for a single peer thread.
 */
export function encodeHistoryQuery(params: {
  queryId: string;
  peerUuid: string;
  domain: string;
  max?: number;
  before?: string;
}): string {
  const { queryId, peerUuid, domain, max, before } = params;
  const maxN = max ?? 50;
  const beforeXml = before === undefined
    ? `<before></before>`
    : `<before>${escapeText(before)}</before>`;
  return (
    `<iq type="set" id="${escapeAttr(queryId)}">` +
    `<query xmlns="${MAM_NS}" queryid="${escapeAttr(queryId)}">` +
    `<x xmlns="${X_DATA_NS}" type="submit">` +
    `<field var="FORM_TYPE"><value>${escapeText(MAM_NS)}</value></field>` +
    `<field var="with"><value>${escapeAttr(peerUuid)}@${escapeAttr(domain)}</value></field>` +
    `</x>` +
    `<set xmlns="${RSM_NS}">` +
    `<max>${maxN}</max>` +
    beforeXml +
    `</set>` +
    `</query>` +
    `</iq>`
  );
}

/**
 * Mark-displayed receipt — clears server-side unread count for a peer thread.
 * No response. Best-effort.
 */
export function encodeMarkDisplayed(params: {
  fromUuid: string;
  toUuid: string;
  domain: string;
  receiptId?: string;
}): string {
  const { fromUuid, toUuid, domain, receiptId } = params;
  const id = receiptId ?? `disp-${Math.random().toString(36).slice(2, 10)}`;
  return (
    `<message to="${escapeAttr(toUuid)}@${escapeAttr(domain)}"` +
    ` from="${escapeAttr(fromUuid)}@${escapeAttr(domain)}">` +
    `<displayed xmlns="${CHAT_MARKERS_NS}" id="${escapeAttr(id)}"/>` +
    `</message>`
  );
}

/** Keep-alive ping. */
export function encodePing(): string {
  return `<duo_ping/>`;
}

// ---------------------------------------------------------------------------
// Stanza splitting — handles partial trailing frames and multi-stanza frames.
// ---------------------------------------------------------------------------

/**
 * Walk `buffer` and emit complete top-level XML elements; return the unparsed
 * trailing tail so the caller can prepend it to the next chunk.
 *
 * Algorithm: count tag-depth using a scanner that skips quoted attribute
 * values (so `<` inside `attr="<"` won't confuse the counter), comments,
 * CDATA, and processing instructions. Whitespace between top-level elements
 * is silently discarded.
 *
 * Self-closing elements (`<x/>`) are emitted at depth-0 transition.
 *
 * Returns `{ stanzas, rest }` — rest is the unconsumed trailing string
 * (e.g. an incomplete final element).
 */
export function splitStanzas(buffer: string): { stanzas: string[]; rest: string } {
  const stanzas: string[] = [];
  let i = 0;
  let depth = 0;
  let stanzaStart = -1;

  while (i < buffer.length) {
    // Skip top-level whitespace before a stanza starts.
    if (depth === 0 && stanzaStart === -1) {
      const ch = buffer.charCodeAt(i);
      // \t=9, \n=10, \r=13, space=32
      if (ch === 9 || ch === 10 || ch === 13 || ch === 32) {
        i++;
        continue;
      }
      if (buffer[i] !== "<") {
        // Unexpected content at depth 0 — drop one char and continue.
        i++;
        continue;
      }
      stanzaStart = i;
    }

    if (buffer[i] !== "<") {
      i++;
      continue;
    }

    // We're at a `<`. Determine: comment, CDATA, PI, close tag, or open tag.
    if (buffer.startsWith("<!--", i)) {
      const end = buffer.indexOf("-->", i + 4);
      if (end === -1) {
        // Incomplete comment — wait for more data.
        return { stanzas, rest: buffer.slice(stanzaStart === -1 ? i : stanzaStart) };
      }
      i = end + 3;
      continue;
    }
    if (buffer.startsWith("<![CDATA[", i)) {
      const end = buffer.indexOf("]]>", i + 9);
      if (end === -1) {
        return { stanzas, rest: buffer.slice(stanzaStart === -1 ? i : stanzaStart) };
      }
      i = end + 3;
      continue;
    }
    if (buffer.startsWith("<?", i)) {
      const end = buffer.indexOf("?>", i + 2);
      if (end === -1) {
        return { stanzas, rest: buffer.slice(stanzaStart === -1 ? i : stanzaStart) };
      }
      i = end + 2;
      continue;
    }

    // Determine close vs open tag.
    const isClose = buffer[i + 1] === "/";
    // Scan to matching `>`, skipping `>` inside attribute values.
    let j = i + 1;
    let inAttr: '"' | "'" | null = null;
    let selfClosing = false;
    while (j < buffer.length) {
      const c = buffer[j];
      if (inAttr) {
        if (c === inAttr) inAttr = null;
      } else {
        if (c === '"' || c === "'") {
          inAttr = c;
        } else if (c === ">") {
          selfClosing = buffer[j - 1] === "/";
          break;
        }
      }
      j++;
    }
    if (j >= buffer.length) {
      // Incomplete tag — buffer the rest.
      return { stanzas, rest: buffer.slice(stanzaStart === -1 ? i : stanzaStart) };
    }
    const tagEnd = j; // index of `>`

    if (isClose) {
      depth--;
    } else if (!selfClosing) {
      depth++;
    }

    i = tagEnd + 1;

    if (depth === 0 && stanzaStart !== -1) {
      stanzas.push(buffer.slice(stanzaStart, i));
      stanzaStart = -1;
    }
    if (depth < 0) {
      // Stray close tag — drop and reset.
      depth = 0;
      stanzaStart = -1;
    }
  }

  const rest = stanzaStart === -1 ? "" : buffer.slice(stanzaStart);
  return { stanzas, rest };
}

// ---------------------------------------------------------------------------
// Decoder — XML string → ChatEvent.
// ---------------------------------------------------------------------------

type DocLike = {
  documentElement: ElLike;
  getElementsByTagNameNS: (ns: string, tag: string) => ElLike[];
};
type ElLike = {
  tagName: string;
  localName: string;
  namespaceURI: string | null;
  attributes: { length: number; item: (i: number) => { name: string; value: string } | null };
  textContent: string | null;
  getAttribute: (name: string) => string | null;
  getAttributeNS: (ns: string | null, name: string) => string | null;
  getElementsByTagName: (tag: string) => ElLike[];
  getElementsByTagNameNS: (ns: string, tag: string) => ElLike[];
  children: ElLike[];
  firstElementChild: ElLike | null;
};

function parseXml(xml: string): DocLike | null {
  if (typeof DOMParser === "undefined") {
    return null;
  }
  try {
    const dp = new DOMParser();
    const doc = dp.parseFromString(xml, "application/xml");
    // Chromium / Firefox both return a <parsererror> root on failure.
    const root = doc.documentElement;
    if (!root || root.nodeName === "parsererror" || root.getElementsByTagName("parsererror").length > 0) {
      return null;
    }
    return doc as unknown as DocLike;
  } catch {
    return null;
  }
}

function localName(el: ElLike): string {
  // DOMParser localName is reliable; fall back to tagName split for safety.
  return el.localName || (el.tagName?.includes(":") ? el.tagName.split(":")[1] : el.tagName) || "";
}

/**
 * Decode a single stanza XML string to a ChatEvent.
 * Returns null when the stanza is malformed, irrelevant, or belongs to the
 * stream-handshake-only flow (we silently consume those).
 */
export function decodeStanza(xml: string, ownUuid: string): ChatEvent | null {
  const doc = parseXml(xml);
  if (!doc) return null;
  const root = doc.documentElement;
  const tag = localName(root);

  switch (tag) {
    case "success":
      // SASL success.
      if (root.namespaceURI === SASL_NS) {
        return { type: "auth-success" };
      }
      return null;
    case "failure":
      if (root.namespaceURI === SASL_NS) {
        return { type: "auth-fail", reason: "not-authorized" };
      }
      return null;
    case "duo_message_delivered":
      return decodeAck(root, "delivered");
    case "duo_message_blocked":
      return decodeBlockedAck(root);
    case "duo_message_not_unique":
      return decodeAck(root, "not-unique");
    case "duo_message_too_long":
      return decodeAck(root, "too-long");
    case "duo_server_error":
      return decodeAck(root, "server-error");
    case "duo_pong":
      // Keep-alive — silently consumed by the client; no UI surface.
      return null;
    case "duo_registration_successful":
      // Push-token registration ack — out of scope for this module.
      return null;
    case "message":
      return decodeMessage(root, ownUuid);
    case "iq":
      // <iq><fin .../></iq> terminates an inbox or MAM page — no event needed.
      return null;
    case "open":
    case "features":
      // Stream handshake artifacts — consumed by ChatClient state machine.
      return null;
    default:
      return null;
  }
}

function decodeAck(root: ElLike, result: "delivered" | "not-unique" | "too-long" | "server-error"): ChatEvent | null {
  const id = root.getAttribute("id");
  if (!id) return null;
  return { type: "message-ack", clientId: id, result };
}

function decodeBlockedAck(root: ElLike): ChatEvent | null {
  const id = root.getAttribute("id");
  if (!id) return null;
  const reason = root.getAttribute("reason");
  if (reason === "spam") {
    return { type: "message-ack", clientId: id, result: "blocked-spam" };
  }
  if (reason === "age-verification") {
    return { type: "message-ack", clientId: id, result: "verification-required" };
  }
  if (reason?.startsWith("rate-limited")) {
    return { type: "message-ack", clientId: id, result: "rate-limited", reason };
  }
  return { type: "message-ack", clientId: id, result: "blocked", reason: reason ?? undefined };
}

function decodeMessage(root: ElLike, ownUuid: string): ChatEvent | null {
  const type = root.getAttribute("type");
  const fromAttr = root.getAttribute("from") ?? "";
  const toAttr = root.getAttribute("to") ?? "";
  const id = root.getAttribute("id") ?? "";
  const fromUserId = bareJid(fromAttr);
  const toUserId = bareJid(toAttr);

  // Inbox-result frames: <message><result xmlns="erlang-..."/></message>.
  const inboxResults = childrenByNS(root, INBOX_NS, "result");
  if (inboxResults.length > 0) {
    const thread = decodeInboxResult(inboxResults[0], ownUuid);
    return thread ? { type: "inbox-result", threads: [thread] } : null;
  }

  // MAM-result frames: <message><result xmlns="urn:xmpp:mam:2"/></message>.
  const mamResults = childrenByNS(root, MAM_NS, "result");
  if (mamResults.length > 0) {
    const result = decodeMamResult(mamResults[0], ownUuid);
    return result ? { type: "history-result", threadId: result.threadId, messages: [result.message], queryId: result.queryId } : null;
  }

  if (type === "typing") {
    if (!fromUserId || !toUserId) return null;
    return { type: "typing-in", fromUserId, toUserId };
  }

  if (type === "chat" || !type) {
    const body = textOfFirstChild(root, "body");
    if (!body) return null;
    // Determine which side of the thread this message belongs to.
    const peer = fromUserId === ownUuid ? toUserId : fromUserId;
    const audioUuid = root.getAttribute("audio_uuid") ?? undefined;
    return {
      type: "message-in",
      message: {
        id: id || `srv-${Math.random().toString(36).slice(2, 10)}`,
        threadId: peer,
        fromUserId,
        toUserId,
        body,
        serverTime: new Date().toISOString(),
        status: "received",
        ...(audioUuid ? { audioUuid } : {}),
      },
    };
  }

  return null;
}

function childrenByNS(parent: ElLike, ns: string, local: string): ElLike[] {
  // Walk only direct children for reliability across namespace-vs-attribute
  // declarations (xmlns on the child element).
  const out: ElLike[] = [];
  const kids = parent.children;
  for (let i = 0; i < kids.length; i++) {
    const k = kids[i];
    if (localName(k) === local && (k.namespaceURI === ns || k.getAttribute("xmlns") === ns)) {
      out.push(k);
    }
  }
  return out;
}

function textOfFirstChild(parent: ElLike, local: string): string | null {
  const kids = parent.children;
  for (let i = 0; i < kids.length; i++) {
    const k = kids[i];
    if (localName(k) === local) {
      return k.textContent ?? "";
    }
  }
  return null;
}

function decodeInboxResult(result: ElLike, ownUuid: string): ChatThread | null {
  const unread = parseInt(result.getAttribute("unread") ?? "0", 10);
  // Walk into <forwarded><message><body>.
  const forwardedList = childrenByNS(result, FORWARD_NS, "forwarded");
  const forwarded = forwardedList[0];
  if (!forwarded) return null;
  const innerMessages = childrenByNS(forwarded, JABBER_CLIENT_NS, "message");
  const innerMessage = innerMessages[0] ?? forwarded.firstElementChild;
  if (!innerMessage) return null;
  const fromUserId = bareJid(innerMessage.getAttribute("from"));
  const toUserId = bareJid(innerMessage.getAttribute("to"));
  const body = textOfFirstChild(innerMessage, "body") ?? "";

  const peer = fromUserId === ownUuid ? toUserId : fromUserId;
  if (!peer) return null;

  // <delay stamp="..."/>
  const delays = childrenByNS(forwarded, DELAY_NS, "delay");
  const stamp = delays[0]?.getAttribute("stamp") ?? new Date().toISOString();

  const boxText = textOfFirstChild(result, "box");
  const box: "inbox" | "chats" = boxText === "chats" ? "chats" : "inbox";

  return {
    id: peer,
    withUserId: peer,
    lastMessage: { body, serverTime: stamp, fromUserId },
    unreadCount: unread,
    box,
  };
}

function decodeMamResult(
  result: ElLike,
  ownUuid: string,
): { threadId: string; queryId: string; message: ChatMessage } | null {
  const queryId = result.getAttribute("queryid") ?? "";
  const stanzaId = result.getAttribute("id") ?? "";
  const forwardedList = childrenByNS(result, FORWARD_NS, "forwarded");
  const forwarded = forwardedList[0];
  if (!forwarded) return null;
  const innerMessages = childrenByNS(forwarded, JABBER_CLIENT_NS, "message");
  const innerMessage = innerMessages[0] ?? forwarded.firstElementChild;
  if (!innerMessage) return null;
  const fromUserId = bareJid(innerMessage.getAttribute("from"));
  const toUserId = bareJid(innerMessage.getAttribute("to"));
  const body = textOfFirstChild(innerMessage, "body") ?? "";
  if (!body) return null;

  const peer = fromUserId === ownUuid ? toUserId : fromUserId;
  if (!peer) return null;

  const delays = childrenByNS(forwarded, DELAY_NS, "delay");
  const stamp = delays[0]?.getAttribute("stamp") ?? new Date().toISOString();

  return {
    threadId: peer,
    queryId,
    message: {
      id: stanzaId || innerMessage.getAttribute("id") || `mam-${Math.random().toString(36).slice(2, 10)}`,
      threadId: peer,
      fromUserId,
      toUserId,
      body,
      serverTime: stamp,
      status: fromUserId === ownUuid ? "sent" : "received",
    },
  };
}
