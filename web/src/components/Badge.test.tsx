import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Badge from './Badge';
import { FRAME_TYPE_OBSERVED, FRAME_TYPE_SYNTHETIC } from '../types';

describe('Badge Component', () => {
  it('renders OBSERVED badge with teal styling', () => {
    render(<Badge type={FRAME_TYPE_OBSERVED} />);
    const badge = screen.getByText('OBSERVED');
    expect(badge).toBeDefined();
    expect(screen.getByLabelText('Observed frame')).toBeDefined();
  });

  it('renders SYNTHETIC badge with amber styling and mandatory disclaimer', () => {
    render(<Badge type={FRAME_TYPE_SYNTHETIC} />);
    const badge = screen.getByText('SYNTHETIC');
    expect(badge).toBeDefined();
    expect(screen.getByLabelText(/Synthetic frame/i)).toBeDefined();
  });
});
