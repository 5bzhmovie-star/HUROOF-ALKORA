"use client";
import { memo, useEffect, useState } from 'react';
import { ar } from './api';

// Isolate the 1-second clock from the room/board: React does not redraw
// 25–49 hexagonal cells just to update the visible timer.
export const LiveSeconds = memo(function LiveSeconds({ deadline, fallback, offsetMs = 0 }: {
  deadline: number | null | undefined;
  fallback: number;
  offsetMs?: number;
}) {
  const secondsAt = () => deadline ? Math.max(0, Math.ceil((deadline - Date.now() - offsetMs) / 1000)) : fallback;
  const [seconds, setSeconds] = useState(secondsAt);
  useEffect(() => {
    if (!deadline) { setSeconds(fallback); return; }
    const update = () => setSeconds(previous => {
      const next = secondsAt();
      return previous === next ? previous : next;
    });
    update();
    const interval = setInterval(update, 200);
    return () => clearInterval(interval);
  }, [deadline, fallback, offsetMs]);
  return <b className={deadline && seconds <= 3 ? 'urgent' : undefined}>{ar(seconds)}</b>;
});
