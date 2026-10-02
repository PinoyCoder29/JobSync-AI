import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { canAppearInDiscovery, canViewProfile, effectiveVisibility } from "@/lib/permissions/profile";
import { canCancelRequest, canRemoveConnection, canRespondToRequest, pairKeyFor, relationshipState, rerequestAllowed } from "@/lib/permissions/network";
import { scorePerson } from "@/lib/recommendations/people";
import { safeHttpUrl } from "@/lib/safe-url";

describe("profile visibility", () => {
  const base = { viewerId: "viewer", ownerId: "owner", connected: false, blocked: false };

  it("public profiles are visible to strangers", () => assert.equal(canViewProfile({ ...base, visibility: "PUBLIC" }), true));
  it("connections-only needs a connection", () => {
    assert.equal(canViewProfile({ ...base, visibility: "CONNECTIONS_ONLY" }), false);
    assert.equal(canViewProfile({ ...base, visibility: "CONNECTIONS_ONLY", connected: true }), true);
  });
  it("private is hidden from everyone but the owner", () => {
    assert.equal(canViewProfile({ ...base, visibility: "PRIVATE", connected: true }), false);
    assert.equal(canViewProfile({ ...base, viewerId: "owner", visibility: "PRIVATE" }), true);
  });
  it("a block overrides public visibility", () => assert.equal(canViewProfile({ ...base, visibility: "PUBLIC", blocked: true }), false));
  it("signed-out viewers only see public profiles", () => {
    assert.equal(canViewProfile({ ...base, viewerId: null, visibility: "PUBLIC" }), true);
    assert.equal(canViewProfile({ ...base, viewerId: null, visibility: "CONNECTIONS_ONLY" }), false);
  });
  it("legacy profileVisible=false always means PRIVATE", () => {
    assert.equal(effectiveVisibility({ visibility: "PUBLIC", profileVisible: false }), "PRIVATE");
    assert.equal(effectiveVisibility(null), "PRIVATE");
    assert.equal(effectiveVisibility({ visibility: "CONNECTIONS_ONLY", profileVisible: true }), "CONNECTIONS_ONLY");
  });
  it("only public profiles are suggested", () => {
    assert.equal(canAppearInDiscovery("PUBLIC"), true);
    assert.equal(canAppearInDiscovery("CONNECTIONS_ONLY"), false);
  });
});

describe("connection permissions", () => {
  const pending = { status: "PENDING", requesterId: "a", addresseeId: "b" } as const;
  const accepted = { status: "ACCEPTED", requesterId: "a", addresseeId: "b" } as const;

  it("only the receiver can accept/reject", () => {
    assert.equal(canRespondToRequest("b", pending), true);
    assert.equal(canRespondToRequest("a", pending), false);
    assert.equal(canRespondToRequest("c", pending), false);
    assert.equal(canRespondToRequest("b", accepted), false);
  });
  it("only the sender can withdraw", () => {
    assert.equal(canCancelRequest("a", pending), true);
    assert.equal(canCancelRequest("b", pending), false);
  });
  it("either side can remove an accepted connection, strangers cannot", () => {
    assert.equal(canRemoveConnection("a", accepted), true);
    assert.equal(canRemoveConnection("b", accepted), true);
    assert.equal(canRemoveConnection("c", accepted), false);
    assert.equal(canRemoveConnection("a", pending), false);
  });
  it("derives the relationship state for the UI", () => {
    assert.equal(relationshipState("a", "a", null, false), "SELF");
    assert.equal(relationshipState("a", "b", null, false), "NONE");
    assert.equal(relationshipState("a", "b", pending, false), "PENDING_SENT");
    assert.equal(relationshipState("b", "a", pending, false), "PENDING_RECEIVED");
    assert.equal(relationshipState("a", "b", accepted, false), "CONNECTED");
    assert.equal(relationshipState("a", "b", { ...pending, status: "REJECTED" }, false), "NONE");
    assert.equal(relationshipState("a", "b", accepted, true), "BLOCKED_BY_ME");
  });
  it("pair key is the same in both directions", () => assert.equal(pairKeyFor("x", "y"), pairKeyFor("y", "x")));
  it("enforces a cooldown after a rejection", () => {
    const now = new Date("2026-10-02T00:00:00Z");
    assert.equal(rerequestAllowed(new Date("2026-09-30T00:00:00Z"), now), false);
    assert.equal(rerequestAllowed(new Date("2026-09-01T00:00:00Z"), now), true);
    assert.equal(rerequestAllowed(null, now), true);
  });
});

describe("people scoring", () => {
  const me = { skills: ["React", "TypeScript", "SQL"], targetRoles: ["Frontend Developer"], location: "Calamba" };

  it("scores shared skills, roles and location, case-insensitively, with reasons", () => {
    const result = scorePerson(me, { skills: ["react", "typescript", "Go"], targetRoles: ["frontend developer"], location: "calamba" });
    assert.equal(result.score, 3 * 2 + 2 + 2);
    assert.equal(result.reasons.length, 3);
    assert.match(result.reasons[0], /2 shared skills/);
  });
  it("returns zero with no reasons when nothing is shared", () => {
    assert.deepEqual(scorePerson(me, { skills: ["Rust"], targetRoles: [], location: null }), { score: 0, reasons: [] });
  });
  it("caps how many skills can count", () => {
    const many = Array.from({ length: 20 }, (_, i) => `s${i}`);
    assert.equal(scorePerson({ skills: many, targetRoles: [], location: null }, { skills: many, targetRoles: [], location: null }).score, 15);
  });
  it("does not double count duplicate skills", () => {
    assert.equal(scorePerson(me, { skills: ["React", "react", "REACT"], targetRoles: [], location: null }).score, 3);
  });
});

describe("safeHttpUrl", () => {
  it("allows http(s) only", () => {
    assert.equal(safeHttpUrl("https://example.com/a"), "https://example.com/a");
    assert.equal(safeHttpUrl("javascript:alert(1)"), null);
    assert.equal(safeHttpUrl("data:text/html,x"), null);
    assert.equal(safeHttpUrl("not a url"), null);
    assert.equal(safeHttpUrl(null), null);
  });
});
