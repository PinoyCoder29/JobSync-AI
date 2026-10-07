import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { OTP_MAX_ATTEMPTS, OTP_RESEND_COOLDOWN_MS, checkPending, generateOtp, hashOtp, maskEmail, otpMatches, resendWaitMs } from "@/lib/auth/otp";
import { createSignupTicket, readSignupTicket } from "@/lib/auth/signup-ticket";
import { avatarColor, initialsOf } from "@/lib/avatar";
import { otpEmailContent } from "@/services/email/email.service";

beforeEach(() => { process.env.AUTH_SECRET = "unit-test-secret"; });

describe("OTP generation and hashing", () => {
  it("is always 6 digits and not constant", () => {
    const codes = new Set(Array.from({ length: 200 }, generateOtp));
    for (const c of codes) assert.match(c, /^\d{6}$/);
    assert.ok(codes.size > 150);
  });
  it("stores a hash, never the code, and the hash is bound to the email", () => {
    const h = hashOtp("a@x.com", "482193");
    assert.ok(!h.includes("482193"));
    assert.equal(otpMatches("a@x.com", "482193", h), true);
    assert.equal(otpMatches("b@x.com", "482193", h), false);
    assert.equal(otpMatches("a@x.com", "482194", h), false);
  });
  it("rejects malformed input and an emptied (invalidated) hash", () => {
    const h = hashOtp("a@x.com", "123456");
    assert.equal(otpMatches("a@x.com", "12345", h), false);
    assert.equal(otpMatches("a@x.com", "abcdef", h), false);
    assert.equal(otpMatches("a@x.com", "123456", ""), false);
  });
  it("hash depends on the server secret", () => {
    const a = hashOtp("a@x.com", "123456");
    process.env.AUTH_SECRET = "another-secret";
    assert.notEqual(a, hashOtp("a@x.com", "123456"));
  });
});

describe("OTP lifecycle rules", () => {
  const live = { codeHash: "x", codeExpiresAt: new Date(Date.now() + 60_000), attempts: 0 };
  it("open → expired → locked", () => {
    assert.equal(checkPending(live), "OPEN");
    assert.equal(checkPending({ ...live, codeExpiresAt: new Date(Date.now() - 1) }), "EXPIRED");
    assert.equal(checkPending({ ...live, attempts: OTP_MAX_ATTEMPTS }), "LOCKED");
    assert.equal(checkPending({ ...live, codeHash: "" }), "LOCKED"); // invalidated after success/too many tries
  });
  it("resend cooldown counts down", () => {
    const now = new Date();
    assert.equal(resendWaitMs(now, now), OTP_RESEND_COOLDOWN_MS);
    assert.equal(resendWaitMs(new Date(now.getTime() - OTP_RESEND_COOLDOWN_MS), now), 0);
  });
  it("masks the email", () => assert.equal(maskEmail("jaybee@gmail.com"), "j***@gmail.com"));
});

describe("signup ticket", () => {
  it("round-trips and expires", () => {
    const t = createSignupTicket("user1", 1_000);
    assert.equal(readSignupTicket(t, 2_000), "user1");
    assert.equal(readSignupTicket(t, 1_000 + 3 * 60_000), null);
  });
  it("rejects tampering and other secrets", () => {
    const t = createSignupTicket("user1");
    const [body, sig] = t.split(".");
    const forged = Buffer.from(JSON.stringify({ u: "admin", e: Date.now() + 99999 })).toString("base64url");
    assert.equal(readSignupTicket(`${forged}.${sig}`), null);
    assert.equal(readSignupTicket(`${body}.AAAA`), null);
    assert.equal(readSignupTicket(undefined), null);
    process.env.AUTH_SECRET = "different";
    assert.equal(readSignupTicket(t), null);
  });
});

describe("default avatar identity", () => {
  it("builds initials", () => {
    assert.equal(initialsOf("Jay-Vee Bico"), "JB");
    assert.equal(initialsOf("camille"), "C");
    assert.equal(initialsOf("  Maria  de la Cruz "), "MC");
    assert.equal(initialsOf(""), "?");
    assert.equal(initialsOf(null), "?");
  });
  it("colour is deterministic and from the palette", () => {
    assert.equal(avatarColor("Jay-Vee Bico"), avatarColor("jay-vee bico "));
    assert.match(avatarColor("Anyone"), /^#[0-9a-f]{6}$/);
  });
});

describe("OTP email", () => {
  it("contains the code, no password, and escapes the name", () => {
    const m = otpEmailContent('<b>Eve</b>', "482193", 5);
    assert.ok(m.subject.includes("482193") && m.text.includes("482193") && m.html.includes("482193"));
    assert.ok(!m.html.includes("<b>Eve</b>"));
    assert.ok(!/password/i.test(m.text.replace("If you didn't", "")));
  });
});
