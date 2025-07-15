import React from 'react';
import { render, screen } from '@testing-library/react';
import PageHeader from './PageHeader';

describe('PageHeader', () => {
  test('renders title correctly', () => {
    const title = 'Test Tournament';
    render(<PageHeader title={title} />);

    expect(screen.getByText(title)).toBeInTheDocument();
  });

  test('renders with action button when provided', () => {
    const title = 'Test Tournament';
    const action = <button>Create New</button>;

    render(<PageHeader title={title} action={action} />);

    expect(screen.getByText(title)).toBeInTheDocument();
    expect(screen.getByText('Create New')).toBeInTheDocument();
  });

  test('renders without action when not provided', () => {
    const title = 'Test Tournament';

    render(<PageHeader title={title} />);

    expect(screen.getByText(title)).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
