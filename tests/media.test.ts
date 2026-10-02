import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { AppError } from "@/lib/errors";
import { hit, enforceRateLimit, resetRateLimits } from "@/lib/rate-limit";
import { buildPublicId, getOptimizedUrl, signParams } from "@/lib/storage/cloudinary";
import { sniffImageType, validateImageFile } from "@/services/media/image-validation";

const png = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
const jpg = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0]);
const webp = Uint8Array.from([...Buffer.from("RIFF"), 0, 0, 0, 0, ...Buffer.from("WEBP")]);
const exe = Uint8Array.from([0x4d, 0x5a, 0x90, 0x00, 0, 0, 0, 0]);

const fileOf = (bytes: Uint8Array, name: string, type: string) => ({ name, type, size: bytes.length, arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer });
const MB5 = 5 * 1024 * 1024;

describe("image validation", () => {
  it("recognises real image headers", () => {
    assert.equal(sniffImageType(png), "image/png");
    assert.equal(sniffImageType(jpg), "image/jpeg");
    assert.equal(sniffImageType(webp), "image/webp");
    assert.equal(sniffImageType(exe), null);
  });
  it("accepts a valid image", async () => assert.equal((await validateImageFile(fileOf(png, "me.png", "image/png"), MB5)).mimeType, "image/png"));
  it("rejects a disguised executable", async () => {
    await assert.rejects(validateImageFile(fileOf(exe, "me.png", "image/png"), MB5), (e) => e instanceof AppError && /valid image/.test(e.message));
  });
  it("rejects unsupported types", async () => {
    await assert.rejects(validateImageFile(fileOf(png, "me.gif", "image/gif"), MB5), AppError);
  });
  it("rejects an extension that doesn't match the type", async () => {
    await assert.rejects(validateImageFile(fileOf(png, "me.jpg", "image/png"), MB5), /extension/);
  });
  it("rejects oversized and empty files", async () => {
    await assert.rejects(validateImageFile({ ...fileOf(png, "a.png", "image/png"), size: MB5 + 1 }, MB5), /too large/);
    await assert.rejects(validateImageFile(fileOf(new Uint8Array(), "a.png", "image/png"), MB5), /empty/);
  });
});

describe("cloudinary helpers", () => {
  it("signs params exactly as Cloudinary documents (sorted, sha1, secret appended)", () => {
    assert.equal(signParams({ timestamp: 1315060510, public_id: "sample" }, "abcd"), signParams({ public_id: "sample", timestamp: 1315060510 }, "abcd"));
    assert.equal(signParams({ b: 2, a: 1 }, "s"), signParams({ a: 1, b: 2 }, "s"));
    assert.notEqual(signParams({ a: 1 }, "s1"), signParams({ a: 1 }, "s2"));
    assert.match(signParams({ a: 1 }, "s"), /^[0-9a-f]{40}$/);
  });
  it("builds predictable-but-unique public ids", () => {
    const a = buildPublicId("jobsync/users/avatars", "user1");
    const b = buildPublicId("jobsync/users/avatars", "user1");
    assert.match(a, /^jobsync\/users\/avatars\/user1_[0-9a-f]{8}$/);
    assert.notEqual(a, b);
  });
  it("inserts transformations into Cloudinary URLs only", () => {
    assert.equal(getOptimizedUrl("https://res.cloudinary.com/demo/image/upload/v1/x.jpg", "avatar"), "https://res.cloudinary.com/demo/image/upload/c_fill,g_auto,w_256,h_256,q_auto,f_auto/v1/x.jpg");
    assert.equal(getOptimizedUrl("https://lh3.googleusercontent.com/a.jpg", "avatar"), "https://lh3.googleusercontent.com/a.jpg");
  });
});

describe("rate limiting", () => {
  beforeEach(() => resetRateLimits());
  const rule = { limit: 2, windowMs: 1000, label: "tests" };

  it("allows up to the limit then blocks", () => {
    assert.equal(hit("k", rule, 0).allowed, true);
    assert.equal(hit("k", rule, 1).allowed, true);
    const blocked = hit("k", rule, 2);
    assert.equal(blocked.allowed, false);
    assert.ok(blocked.retryAfterSec >= 1);
  });
  it("recovers after the window and isolates keys", () => {
    hit("k", rule, 0); hit("k", rule, 1);
    assert.equal(hit("other", rule, 2).allowed, true);
    assert.equal(hit("k", rule, 1500).allowed, true);
  });
  it("throws a user-safe RATE_LIMITED error", () => {
    for (let i = 0; i < 20; i++) enforceRateLimit("u", "block");
    assert.throws(() => enforceRateLimit("u", "block"), (e) => e instanceof AppError && e.code === "RATE_LIMITED");
  });
});
