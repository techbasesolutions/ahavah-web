/**
 * Tests for chat-stanza encoder/decoder. Wire-format literals lifted from
 * the backend's bash integration fixtures (test/functionality4/xmpp*.sh)
 * so any drift between client + server shows up as a test failure here.
 *
 * @see docs/agent-prompts/phase-w-agent-4-wire-format.md
 */

import { describe, expect, it } from "vitest";

import {
  bareJid,
  decodeStanza,
  encodeAuth,
  encodeBind,
  encodeHistoryQuery,
  encodeInboxQuery,
  encodeMarkDisplayed,
  encodeMessage,
  encodeOpen,
  encodePing,
  encodeTyping,
  splitStanzas,
} from "@/lib/chat-stanza";

const OWN_UUID = "11111111-1111-1111-1111-111111111111";
const PEER_UUID = "22222222-2222-2222-2222-222222222222";
const DOMAIN = "ahavah.app";

// ---------------------------------------------------------------------------
// bareJid
// ---------------------------------------------------------------------------

describe("bareJid", () => {
  it("strips @domain", () => {
    expect(bareJid("uuid@ahavah.app")).toBe("uuid");
    expect(bareJid("uuid@ahavah.app/web")).toBe("uuid");
  });
  it("returns input unchanged when no @", () => {
    expect(bareJid("uuid")).toBe("uuid");
  });
  it("handles empty / null", () => {
    expect(bareJid("")).toBe("");
    expect(bareJid(null)).toBe("");
    expect(bareJid(undefined)).toBe("");
  });
});

// ---------------------------------------------------------------------------
// Encoders — byte-for-byte against backend fixtures
// ---------------------------------------------------------------------------

describe("encodeOpen", () => {
  it("emits XMPP framing open stanza", () => {
    expect(encodeOpen("ahavah.app")).toBe(
      `<open xmlns="urn:ietf:params:xml:ns:xmpp-framing" to="ahavah.app" version="1.0"/>`,
    );
  });
});

describe("encodeAuth", () => {
  it("emits SASL PLAIN with base64(\\0uuid\\0token)", () => {
    const out = encodeAuth("uuid", "tok");
    // base64 of \0uuid\0tok
    const expected = `AHV1aWQAdG9r`;
    expect(out).toBe(
      `<auth xmlns="urn:ietf:params:xml:ns:xmpp-sasl" mechanism="PLAIN">${expected}</auth>`,
    );
  });
});

describe("encodeBind", () => {
  it("emits resource-bind iq", () => {
    expect(encodeBind("bind1", "web")).toBe(
      `<iq type="set" id="bind1"><bind xmlns="urn:ietf:params:xml:ns:xmpp-bind"><resource>web</resource></bind></iq>`,
    );
  });
});

describe("encodeMessage", () => {
  it("matches backend test fixture shape", () => {
    const out = encodeMessage({
      fromUuid: OWN_UUID,
      toUuid: PEER_UUID,
      clientId: "id1",
      body: "hello user 2",
      domain: DOMAIN,
    });
    // Compare against the bash fixture (test/functionality4/xmpp.sh) modulo
    // its leading whitespace + line breaks, which lxml normalizes away.
    expect(out).toBe(
      `<message type="chat" from="${OWN_UUID}@ahavah.app" to="${PEER_UUID}@ahavah.app" id="id1" xmlns="jabber:client"><body>hello user 2</body><request xmlns="urn:xmpp:receipts"/></message>`,
    );
  });

  it("escapes &, <, > in body", () => {
    const out = encodeMessage({
      fromUuid: OWN_UUID,
      toUuid: PEER_UUID,
      clientId: "x",
      body: `A & B <c> "d"`,
      domain: DOMAIN,
    });
    expect(out).toContain(`<body>A &amp; B &lt;c&gt; "d"</body>`);
  });

  it("escapes & in attribute values (clientId)", () => {
    const out = encodeMessage({
      fromUuid: OWN_UUID,
      toUuid: PEER_UUID,
      clientId: `id"with&amp`,
      body: "ok",
      domain: DOMAIN,
    });
    expect(out).toContain(`id="id&quot;with&amp;amp"`);
  });
});

describe("encodeTyping", () => {
  it("emits type=typing message with no body, both true/false rendered the same way", () => {
    const trueOut = encodeTyping({ fromUuid: OWN_UUID, toUuid: PEER_UUID, domain: DOMAIN, clientId: "t1" });
    expect(trueOut).toBe(
      `<message type="typing" from="${OWN_UUID}@ahavah.app" to="${PEER_UUID}@ahavah.app" id="t1" xmlns="jabber:client"/>`,
    );
    // "false" (paused) is expressed by NOT sending — encoder still emits the
    // same shape; the caller just stops calling it. We verify it stays
    // self-closing with no body so it cannot be misread as a chat send.
    expect(trueOut).not.toContain("<body>");
  });
});

describe("encodeInboxQuery", () => {
  it("emits inbox iq matching backend fixture", () => {
    expect(encodeInboxQuery("q42")).toBe(
      `<iq type="set" id="q42"><inbox xmlns="erlang-solutions.com:xmpp:inbox:0" queryid="q42"/></iq>`,
    );
  });
});

describe("encodeHistoryQuery", () => {
  it("emits MAM iq with form fields + RSM page", () => {
    const out = encodeHistoryQuery({
      queryId: "1",
      peerUuid: PEER_UUID,
      domain: DOMAIN,
      max: 3,
      before: undefined,
    });
    expect(out).toBe(
      `<iq type="set" id="1">` +
      `<query xmlns="urn:xmpp:mam:2" queryid="1">` +
      `<x xmlns="jabber:x:data" type="submit">` +
      `<field var="FORM_TYPE"><value>urn:xmpp:mam:2</value></field>` +
      `<field var="with"><value>${PEER_UUID}@ahavah.app</value></field>` +
      `</x>` +
      `<set xmlns="http://jabber.org/protocol/rsm">` +
      `<max>3</max><before></before>` +
      `</set>` +
      `</query>` +
      `</iq>`,
    );
  });
  it("renders before stanza id when paginating backwards", () => {
    const out = encodeHistoryQuery({
      queryId: "2",
      peerUuid: PEER_UUID,
      domain: DOMAIN,
      max: 50,
      before: "ABC123",
    });
    expect(out).toContain(`<before>ABC123</before>`);
  });
});

describe("encodeMarkDisplayed", () => {
  it("emits chat-markers displayed receipt", () => {
    const out = encodeMarkDisplayed({
      fromUuid: OWN_UUID,
      toUuid: PEER_UUID,
      domain: DOMAIN,
      receiptId: "d1",
    });
    expect(out).toBe(
      `<message to="${PEER_UUID}@ahavah.app" from="${OWN_UUID}@ahavah.app">` +
      `<displayed xmlns="urn:xmpp:chat-markers:0" id="d1"/>` +
      `</message>`,
    );
  });
});

describe("encodePing", () => {
  it("emits <duo_ping/>", () => {
    expect(encodePing()).toBe(`<duo_ping/>`);
  });
});

// ---------------------------------------------------------------------------
// splitStanzas — frame-boundary handling
// ---------------------------------------------------------------------------

describe("splitStanzas", () => {
  it("splits one complete stanza", () => {
    const out = splitStanzas(`<duo_pong preferred_interval="10000" preferred_timeout="5000"/>`);
    expect(out.stanzas).toEqual([`<duo_pong preferred_interval="10000" preferred_timeout="5000"/>`]);
    expect(out.rest).toBe("");
  });

  it("splits two concatenated stanzas", () => {
    const a = `<duo_pong preferred_interval="10000" preferred_timeout="5000"/>`;
    const b = `<duo_message_delivered id="id1"/>`;
    const out = splitStanzas(a + b);
    expect(out.stanzas).toEqual([a, b]);
    expect(out.rest).toBe("");
  });

  it("splits three with whitespace between them", () => {
    const a = `<x/>`;
    const b = `<y/>`;
    const c = `<z/>`;
    const out = splitStanzas(`${a}\n  ${b}\t${c}\n`);
    expect(out.stanzas).toEqual([a, b, c]);
    expect(out.rest).toBe("");
  });

  it("handles a partial trailing stanza", () => {
    const complete = `<duo_pong/>`;
    const partial = `<message type="chat" from="a@ahavah.app" `;
    const out = splitStanzas(complete + partial);
    expect(out.stanzas).toEqual([complete]);
    expect(out.rest).toBe(partial);
  });

  it("preserves > inside double-quoted attr values", () => {
    const stanza = `<message id="weird>id">text</message>`;
    const out = splitStanzas(stanza);
    expect(out.stanzas).toEqual([stanza]);
    expect(out.rest).toBe("");
  });

  it("preserves > inside single-quoted attr values", () => {
    const stanza = `<message id='weird>id'>text</message>`;
    const out = splitStanzas(stanza);
    expect(out.stanzas).toEqual([stanza]);
  });

  it("handles nested elements without splitting prematurely", () => {
    const stanza = `<message xmlns="jabber:client" id="m1"><result xmlns="erlang-solutions.com:xmpp:inbox:0" unread="1"><forwarded xmlns="urn:xmpp:forward:0"><delay stamp="t"/><message><body>hi</body></message></forwarded></result></message>`;
    const out = splitStanzas(stanza);
    expect(out.stanzas).toEqual([stanza]);
  });

  it("returns empty result for empty input", () => {
    expect(splitStanzas("")).toEqual({ stanzas: [], rest: "" });
  });

  it("ignores stray whitespace at start", () => {
    expect(splitStanzas("\n\t  <x/>")).toEqual({ stanzas: ["<x/>"], rest: "" });
  });

  it("handles XML comments inside a stanza", () => {
    const stanza = `<message><!-- ignored --><body>hi</body></message>`;
    const out = splitStanzas(stanza);
    expect(out.stanzas).toEqual([stanza]);
  });
});

// ---------------------------------------------------------------------------
// decodeStanza — every event variant
// ---------------------------------------------------------------------------

describe("decodeStanza", () => {
  it("returns null on malformed XML", () => {
    expect(decodeStanza(`<not-closed`, OWN_UUID)).toBeNull();
    expect(decodeStanza(``, OWN_UUID)).toBeNull();
    expect(decodeStanza(`<<<>>>`, OWN_UUID)).toBeNull();
  });

  it("decodes SASL success", () => {
    const out = decodeStanza(
      `<success xmlns="urn:ietf:params:xml:ns:xmpp-sasl"/>`,
      OWN_UUID,
    );
    expect(out).toEqual({ type: "auth-success" });
  });

  it("decodes SASL failure", () => {
    const out = decodeStanza(
      `<failure xmlns="urn:ietf:params:xml:ns:xmpp-sasl"><not-authorized/></failure>`,
      OWN_UUID,
    );
    expect(out).toEqual({ type: "auth-fail", reason: "not-authorized" });
  });

  it("decodes inbound chat message", () => {
    const stanza =
      `<message xmlns="jabber:client" from="${PEER_UUID}@ahavah.app" to="${OWN_UUID}@ahavah.app" id="srv-1" type="chat">` +
      `<body>hello user 2</body>` +
      `<request xmlns="urn:xmpp:receipts"/>` +
      `</message>`;
    const out = decodeStanza(stanza, OWN_UUID);
    expect(out?.type).toBe("message-in");
    if (out?.type !== "message-in") return;
    expect(out.message.body).toBe("hello user 2");
    expect(out.message.fromUserId).toBe(PEER_UUID);
    expect(out.message.toUserId).toBe(OWN_UUID);
    expect(out.message.threadId).toBe(PEER_UUID);
    expect(out.message.status).toBe("received");
    expect(out.message.id).toBe("srv-1");
  });

  it("decodes typing indicator", () => {
    const stanza =
      `<message xmlns="jabber:client" type="typing" from="${PEER_UUID}@ahavah.app" to="${OWN_UUID}@ahavah.app" id="t1"/>`;
    const out = decodeStanza(stanza, OWN_UUID);
    expect(out).toEqual({ type: "typing-in", fromUserId: PEER_UUID, toUserId: OWN_UUID });
  });

  it("decodes duo_message_delivered ack", () => {
    const out = decodeStanza(`<duo_message_delivered id="id1"/>`, OWN_UUID);
    expect(out).toEqual({ type: "message-ack", clientId: "id1", result: "delivered" });
  });

  it("decodes duo_message_blocked with no reason", () => {
    const out = decodeStanza(`<duo_message_blocked id="id1"/>`, OWN_UUID);
    expect(out).toMatchObject({ type: "message-ack", clientId: "id1", result: "blocked" });
  });

  it("decodes duo_message_blocked spam", () => {
    const out = decodeStanza(`<duo_message_blocked id="id1" reason="spam"/>`, OWN_UUID);
    expect(out).toMatchObject({ type: "message-ack", clientId: "id1", result: "blocked-spam" });
  });

  it("decodes duo_message_blocked rate-limited", () => {
    const out = decodeStanza(
      `<duo_message_blocked id="id999" reason="rate-limited-1day" subreason="unverified-basics"/>`,
      OWN_UUID,
    );
    expect(out).toMatchObject({
      type: "message-ack",
      clientId: "id999",
      result: "rate-limited",
      reason: "rate-limited-1day",
    });
  });

  it("decodes duo_message_blocked age-verification", () => {
    const out = decodeStanza(
      `<duo_message_blocked id="id1" reason="age-verification"/>`,
      OWN_UUID,
    );
    expect(out).toMatchObject({ type: "message-ack", clientId: "id1", result: "verification-required" });
  });

  it("decodes duo_message_not_unique", () => {
    const out = decodeStanza(`<duo_message_not_unique id="id2"/>`, OWN_UUID);
    expect(out).toMatchObject({ type: "message-ack", clientId: "id2", result: "not-unique" });
  });

  it("decodes duo_message_too_long", () => {
    const out = decodeStanza(`<duo_message_too_long id="id3"/>`, OWN_UUID);
    expect(out).toMatchObject({ type: "message-ack", clientId: "id3", result: "too-long" });
  });

  it("decodes duo_server_error", () => {
    const out = decodeStanza(`<duo_server_error id="id4"/>`, OWN_UUID);
    expect(out).toMatchObject({ type: "message-ack", clientId: "id4", result: "server-error" });
  });

  it("silently consumes duo_pong (returns null)", () => {
    expect(decodeStanza(`<duo_pong preferred_interval="10000" preferred_timeout="5000"/>`, OWN_UUID)).toBeNull();
  });

  it("silently consumes open + features", () => {
    expect(
      decodeStanza(
        `<open xmlns="urn:ietf:params:xml:ns:xmpp-framing" from="ahavah.app" id="x" version="1.0"/>`,
        OWN_UUID,
      ),
    ).toBeNull();
  });

  it("decodes inbox-result frame (backend fixture)", () => {
    const stanza =
      `<message xmlns="jabber:client" from="${OWN_UUID}@ahavah.app" to="${OWN_UUID}@ahavah.app" id="id1">` +
      `<result xmlns="erlang-solutions.com:xmpp:inbox:0" unread="1" queryid="q1">` +
      `<forwarded xmlns="urn:xmpp:forward:0">` +
      `<delay xmlns="urn:xmpp:delay" stamp="2026-05-12T15:33:11.123456Z"/>` +
      `<message xmlns="jabber:client" from="${PEER_UUID}@ahavah.app" to="${OWN_UUID}@ahavah.app" id="id1" type="chat">` +
      `<body>from user 2 to user 1</body>` +
      `<request xmlns="urn:xmpp:receipts"/>` +
      `</message>` +
      `</forwarded>` +
      `<read>false</read>` +
      `<box>inbox</box>` +
      `<archive>false</archive>` +
      `<mute>0</mute>` +
      `</result>` +
      `</message>`;
    const out = decodeStanza(stanza, OWN_UUID);
    expect(out?.type).toBe("inbox-result");
    if (out?.type !== "inbox-result") return;
    expect(out.threads).toHaveLength(1);
    const t = out.threads[0];
    expect(t.id).toBe(PEER_UUID);
    expect(t.unreadCount).toBe(1);
    expect(t.box).toBe("inbox");
    expect(t.lastMessage?.body).toBe("from user 2 to user 1");
    expect(t.lastMessage?.fromUserId).toBe(PEER_UUID);
    expect(t.lastMessage?.serverTime).toBe("2026-05-12T15:33:11.123456Z");
  });

  it("decodes MAM result frame", () => {
    const stanza =
      `<message xmlns="jabber:client" from="${OWN_UUID}@ahavah.app" to="${OWN_UUID}@ahavah.app" id="wrap1">` +
      `<result xmlns="urn:xmpp:mam:2" queryid="1" id="ABCD">` +
      `<forwarded xmlns="urn:xmpp:forward:0">` +
      `<delay xmlns="urn:xmpp:delay" stamp="2026-05-12T15:33:11.123456Z"/>` +
      `<message xmlns="jabber:client" from="${PEER_UUID}@ahavah.app" id="orig" to="${OWN_UUID}@ahavah.app" type="chat">` +
      `<body>3rd message</body>` +
      `<request xmlns="urn:xmpp:receipts"/>` +
      `</message>` +
      `</forwarded>` +
      `</result>` +
      `</message>`;
    const out = decodeStanza(stanza, OWN_UUID);
    expect(out?.type).toBe("history-result");
    if (out?.type !== "history-result") return;
    expect(out.threadId).toBe(PEER_UUID);
    expect(out.queryId).toBe("1");
    expect(out.messages).toHaveLength(1);
    expect(out.messages[0].body).toBe("3rd message");
    expect(out.messages[0].status).toBe("received");
    expect(out.messages[0].id).toBe("ABCD");
  });

  it("classifies my own MAM message as status=sent", () => {
    const stanza =
      `<message xmlns="jabber:client" from="${OWN_UUID}@ahavah.app" to="${OWN_UUID}@ahavah.app" id="wrap1">` +
      `<result xmlns="urn:xmpp:mam:2" queryid="1" id="ABCD">` +
      `<forwarded xmlns="urn:xmpp:forward:0">` +
      `<delay xmlns="urn:xmpp:delay" stamp="2026-05-12T15:33:11.123456Z"/>` +
      `<message xmlns="jabber:client" from="${OWN_UUID}@ahavah.app" id="orig" to="${PEER_UUID}@ahavah.app" type="chat">` +
      `<body>hello</body>` +
      `</message>` +
      `</forwarded>` +
      `</result>` +
      `</message>`;
    const out = decodeStanza(stanza, OWN_UUID);
    if (out?.type !== "history-result") throw new Error("expected history-result");
    expect(out.messages[0].status).toBe("sent");
    expect(out.messages[0].threadId).toBe(PEER_UUID);
  });

  it("returns null for unknown top-level element", () => {
    expect(decodeStanza(`<unknown_thing/>`, OWN_UUID)).toBeNull();
  });

  it("decodes audio_uuid when present on message", () => {
    const stanza =
      `<message xmlns="jabber:client" from="${PEER_UUID}@ahavah.app" to="${OWN_UUID}@ahavah.app" id="m" type="chat" audio_uuid="abc">` +
      `<body>voice</body>` +
      `</message>`;
    const out = decodeStanza(stanza, OWN_UUID);
    if (out?.type !== "message-in") throw new Error("expected message-in");
    expect(out.message.audioUuid).toBe("abc");
  });
});
