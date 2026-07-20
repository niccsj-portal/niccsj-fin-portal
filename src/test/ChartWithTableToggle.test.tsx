import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

import { ChartWithTableToggle } from '@/components/charts/ChartWithTableToggle';

/**
 * Story 7.3 — the reusable chart/table toggle. Asserts the chart is shown by
 * default, the table is reachable by an accessible control, and the toggle
 * exposes pressed state (keyboard + screen-reader friendly, NFR §5).
 */
describe('ChartWithTableToggle (story 7.3)', () => {
  function renderToggle() {
    render(
      <ChartWithTableToggle
        ariaLabel="Income by category"
        chart={<div>CHART CONTENT</div>}
        table={<div>TABLE CONTENT</div>}
      />,
    );
  }

  it('shows the chart first and hides the table', () => {
    renderToggle();
    expect(screen.getByText('CHART CONTENT')).toBeInTheDocument();
    expect(screen.queryByText('TABLE CONTENT')).not.toBeInTheDocument();
  });

  it('swaps to the table when "View as table" is pressed', () => {
    renderToggle();
    fireEvent.click(screen.getByRole('button', { name: /view as table/i }));
    expect(screen.getByText('TABLE CONTENT')).toBeInTheDocument();
    expect(screen.queryByText('CHART CONTENT')).not.toBeInTheDocument();
  });

  it('marks the active view with aria-pressed', () => {
    renderToggle();
    const chartBtn = screen.getByRole('button', { name: /view as chart/i });
    const tableBtn = screen.getByRole('button', { name: /view as table/i });
    expect(chartBtn).toHaveAttribute('aria-pressed', 'true');
    expect(tableBtn).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(tableBtn);
    expect(chartBtn).toHaveAttribute('aria-pressed', 'false');
    expect(tableBtn).toHaveAttribute('aria-pressed', 'true');
  });

  it('labels the toggle group for screen readers', () => {
    renderToggle();
    expect(
      screen.getByRole('group', { name: /income by category: view as chart or table/i }),
    ).toBeInTheDocument();
  });
});
