import { describe, expect, it } from "vitest";
import { acquireBodyScrollLock } from "./body-scroll-lock";

function fakeDocument(overflow = "") {
  return {
    body: { style: { overflow } },
  } as unknown as Document;
}

describe("body scroll lock", () => {
  it("restores overflow only after every overlapping lock is released", () => {
    const doc = fakeDocument("auto");
    const releasePanel = acquireBodyScrollLock(doc);
    const releaseModal = acquireBodyScrollLock(doc);

    releasePanel();
    expect(doc.body.style.overflow).toBe("hidden");

    releaseModal();
    expect(doc.body.style.overflow).toBe("auto");
  });

  it("makes release idempotent", () => {
    const doc = fakeDocument();
    const release = acquireBodyScrollLock(doc);

    release();
    release();

    expect(doc.body.style.overflow).toBe("");
  });
});
