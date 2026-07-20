import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';

import { SessionTimeoutWarning } from '@/components/layout/SessionTimeoutWarning';

describe('SessionTimeoutWarning (story 1.9)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('shows the warning after the idle period, then times out after the grace period', () => {
    const onTimeout = vi.fn();
    render(<SessionTimeoutWarning onTimeout={onTimeout} idleMs={1000} graceMs={500} />);

    // Nothing shown before idle elapses.
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(onTimeout).toHaveBeenCalledTimes(1);
  });

  it('lets the user stay signed in, cancelling the timeout', () => {
    const onTimeout = vi.fn();
    render(<SessionTimeoutWarning onTimeout={onTimeout} idleMs={1000} graceMs={500} />);

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    fireEvent.click(screen.getByRole('button', { name: /stay signed in/i }));

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(onTimeout).not.toHaveBeenCalled();
  });
});
