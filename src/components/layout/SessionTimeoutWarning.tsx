import { useCallback, useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';

/**
 * Idle session-timeout warning (backlog 1.9, UX §4.4).
 *
 * After `idleMs` of no user activity a warning is shown; if the user does not
 * act within `graceMs`, `onTimeout` fires (the app signs them out). Any
 * activity (pointer / key / click) before the warning resets the idle timer;
 * while the warning is visible the user must explicitly choose "Stay signed
 * in" to continue, which is the standard accessible pattern (the dialog traps
 * attention rather than dismissing on incidental movement).
 *
 * Defaults: warn at 25 minutes idle, then 60 seconds to respond.
 */
interface SessionTimeoutWarningProps {
  onTimeout: () => void;
  idleMs?: number;
  graceMs?: number;
}

const DEFAULT_IDLE_MS = 25 * 60 * 1000;
const DEFAULT_GRACE_MS = 60 * 1000;
const ACTIVITY_EVENTS = ['mousedown', 'keydown', 'touchstart', 'scroll'] as const;

export function SessionTimeoutWarning({
  onTimeout,
  idleMs = DEFAULT_IDLE_MS,
  graceMs = DEFAULT_GRACE_MS,
}: SessionTimeoutWarningProps) {
  const [warning, setWarning] = useState(false);
  const warningRef = useRef(false);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const graceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = useCallback(() => {
    if (idleTimer.current) clearTimeout(idleTimer.current);
    if (graceTimer.current) clearTimeout(graceTimer.current);
  }, []);

  const startIdleTimer = useCallback(() => {
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => {
      warningRef.current = true;
      setWarning(true);
      graceTimer.current = setTimeout(() => {
        warningRef.current = false;
        setWarning(false);
        onTimeout();
      }, graceMs);
    }, idleMs);
  }, [idleMs, graceMs, onTimeout]);

  const staySignedIn = useCallback(() => {
    if (graceTimer.current) clearTimeout(graceTimer.current);
    warningRef.current = false;
    setWarning(false);
    startIdleTimer();
  }, [startIdleTimer]);

  useEffect(() => {
    startIdleTimer();

    const onActivity = () => {
      // Only incidental activity *before* the warning resets the timer. While
      // the warning is up the user must explicitly choose to stay signed in.
      if (!warningRef.current) startIdleTimer();
    };
    for (const evt of ACTIVITY_EVENTS) {
      window.addEventListener(evt, onActivity, { passive: true });
    }

    return () => {
      clearTimers();
      for (const evt of ACTIVITY_EVENTS) {
        window.removeEventListener(evt, onActivity);
      }
    };
  }, [startIdleTimer, clearTimers]);

  if (!warning) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-ink-900/60 p-4">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="session-timeout-title"
        aria-describedby="session-timeout-desc"
        className="w-full max-w-sm rounded-lg bg-surface-0 p-6 shadow-pop"
      >
        <h2 id="session-timeout-title" className="font-serif text-h2 font-semibold text-brand-900">
          Still there?
        </h2>
        <p id="session-timeout-desc" className="mt-2 text-body-sm text-ink-700">
          You've been inactive for a while. For your security, you'll be signed out soon unless you
          choose to stay.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onTimeout}>
            Sign out
          </Button>
          <Button type="button" onClick={staySignedIn}>
            Stay signed in
          </Button>
        </div>
      </div>
    </div>
  );
}
