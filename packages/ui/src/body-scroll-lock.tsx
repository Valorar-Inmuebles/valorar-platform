"use client";

import { useEffect } from "react";

type ScrollLockState = {
  count: number;
  previousOverflow: string;
};

const states = new WeakMap<Document, ScrollLockState>();

export function acquireBodyScrollLock(doc: Document = document) {
  const state = states.get(doc) ?? {
    count: 0,
    previousOverflow: doc.body.style.overflow,
  };

  if (state.count === 0) {
    state.previousOverflow = doc.body.style.overflow;
    doc.body.style.overflow = "hidden";
  }
  state.count += 1;
  states.set(doc, state);

  let released = false;
  return () => {
    if (released) return;
    released = true;
    state.count = Math.max(0, state.count - 1);
    if (state.count === 0) {
      doc.body.style.overflow = state.previousOverflow;
      states.delete(doc);
    }
  };
}

export function useBodyScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked) return;
    return acquireBodyScrollLock();
  }, [locked]);
}
