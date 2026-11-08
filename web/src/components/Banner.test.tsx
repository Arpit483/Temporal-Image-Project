import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Banner from './Banner';

describe('Persistent Warning Banner', () => {
  it('displays the exact mandatory warning text', () => {
    render(<Banner />);
    expect(
      screen.getByText(
        'Synthetic frames are model output, not observations. Not for forecasting or retrievals.'
      )
    ).toBeDefined();
  });
});
