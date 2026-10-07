import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { nextSteps } from "@/lib/assistant-steps";
import { buildScores, extractTopic, followUpDemo, recommendPractice, scoreAnswerDemo } from "@/lib/interview/demo";
import { INTERVIEW_TYPES } from "@/lib/interview-types";
import { assistantChatSchema, assistantReplySchema } from "@/lib/validations/assistant";
import { liveAnswerSchema, startLiveSchema } from "@/lib/validations/live-interview";

describe("demo interviewer adapts to the answer", () => {
  it("asks for an example when the answer is thin", () => assert.match(followUpDemo("I like it.", false).followUp ?? "", /specific example/));
  it("digs into something the candidate mentioned", () => {
    const long = "I built a booking system with React and PostgreSQL for a local clinic, handling appointments and reminders for several hundred patients every week, and I also wrote the deployment scripts myself.";
    assert.match(followUpDemo(long, false).followUp ?? "", /You mentioned react/i);
  });
  it("never asks two follow-ups in a row", () => assert.equal(followUpDemo("short", true).followUp, null));
  it("extracts topics", () => { assert.equal(extractTopic("we used Docker and Redis"), "docker"); assert.equal(extractTopic("nothing here at all"), null); });
});

describe("answer scoring and report maths", () => {
  it("rewards structured, specific answers over vague ones", () => {
    const good = scoreAnswerDemo("First I profiled the app because it was slow, then I decided to cache queries instead of rewriting them. As a result load time dropped 40% and I learned to measure before optimising.", []);
    const vague = scoreAnswerDemo("Maybe I think it was fine, I'm not sure.", []);
    assert.ok(good.score > vague.score + 15);
    for (const v of [good, vague]) for (const n of [v.score, v.communication, v.technical, v.confidence, v.problemSolving]) assert.ok(n >= 0 && n <= 100);
  });
  it("averages dimensions into the final report", () => {
    const s = buildScores([{ score: 80, communication: 90, technical: 70, confidence: 80, problemSolving: 60 }, { score: 60, communication: 70, technical: 50, confidence: 60, problemSolving: 40 }]);
    assert.deepEqual(s, { overall: 70, communication: 80, technicalKnowledge: 60, confidence: 70, problemSolving: 50 });
  });
  it("handles zero answers without NaN", () => assert.equal(buildScores([]).overall, 0));
  it("recommends practice from weak spots", () => {
    assert.ok(recommendPractice({ overall: 60, communication: 90, technicalKnowledge: 40, confidence: 90, problemSolving: 90 }, "HR").includes("TECHNICAL"));
    assert.ok(recommendPractice({ overall: 95, communication: 95, technicalKnowledge: 95, confidence: 95, problemSolving: 95 }, "TECHNICAL").length > 0);
  });
});

describe("live interview validation", () => {
  it("custom job interviews need a job or description", () => {
    assert.equal(startLiveSchema.safeParse({ type: "CUSTOM_JOB" }).success, false);
    assert.equal(startLiveSchema.safeParse({ type: "CUSTOM_JOB", jobDescription: "Build things" }).success, true);
  });
  it("defaults and bounds", () => {
    const v = startLiveSchema.parse({ type: "FRONTEND" });
    assert.equal(v.length, 6); assert.equal(v.difficulty, "MEDIUM");
    assert.equal(startLiveSchema.safeParse({ type: "HR", length: 99 }).success, false);
    assert.equal(startLiveSchema.safeParse({ type: "NOT_A_TYPE" }).success, false);
  });
  it("answers are trimmed, non-empty and capped", () => {
    assert.equal(liveAnswerSchema.safeParse({ questionId: "q", answer: " " }).success, false);
    assert.equal(liveAnswerSchema.safeParse({ questionId: "q", answer: "x".repeat(3001) }).success, false);
    assert.equal(liveAnswerSchema.parse({ questionId: "q", answer: "  hello there " }).answer, "hello there");
  });
  it("every interview type maps to a real category", () => { for (const t of Object.values(INTERVIEW_TYPES)) assert.ok(["HR", "BEHAVIORAL", "TECHNICAL", "SITUATIONAL"].includes(t.category)); });
});

describe("assistant", () => {
  it("caps history and message length", () => {
    assert.equal(assistantChatSchema.safeParse({ message: "hi", history: Array(9).fill({ role: "user", text: "x" }) }).success, false);
    assert.equal(assistantChatSchema.safeParse({ message: "x".repeat(1001) }).success, false);
    assert.equal(assistantChatSchema.safeParse({ message: "  " }).success, false);
  });
  it("the AI can only point at our own tools, never invent a link", () => {
    assert.equal(assistantReplySchema.safeParse({ reply: "x", tool: "https://evil.example" }).success, false);
    assert.equal(assistantReplySchema.parse({ reply: "x", tool: "INTERVIEW" }).tool, "INTERVIEW");
  });
  it("next steps come from real data and are capped at 4", () => {
    const steps = nextSteps({ resumeScore: null, atsScore: null, practiceSessions: 0, profilePercent: 40, gaps: [{ name: "TypeScript", priority: "High" }], suggestions: [], hasResume: true });
    assert.ok(steps.length <= 4 && steps.length >= 3);
    assert.ok(steps.some((s) => s.text.includes("TypeScript")));
    assert.deepEqual(nextSteps({ resumeScore: 95, atsScore: 90, practiceSessions: 5, profilePercent: 100, gaps: [], suggestions: [], hasResume: true }), []);
  });
});
