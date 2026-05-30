import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { Card, Skeleton, Badge, Divider } from '../components/ui/Card';

describe('Card Component', () => {
  test('renders children', () => {
    render(<Card>Card content</Card>);
    expect(screen.getByText('Card content')).toBeInTheDocument();
  });

  test('applies hover effect when hover prop is true', () => {
    const { container } = render(<Card hover>Hoverable</Card>);
    const div = container.firstChild;
    expect(div).toHaveClass('hover:border-[var(--accent)]/30');
  });
});

describe('Badge Component', () => {
  test('renders children', () => {
    render(<Badge>Tag</Badge>);
    expect(screen.getByText('Tag')).toBeInTheDocument();
  });

  test('applies color', () => {
    const { container } = render(<Badge color="#ff0000">Red</Badge>);
    const span = container.querySelector('span');
    expect(span).toHaveStyle({ background: '#ff000020', color: '#ff0000' });
  });
});

describe('Divider Component', () => {
  test('renders divider', () => {
    const { container } = render(<Divider />);
    const hr = container.querySelector('hr');
    expect(hr).toHaveClass('border-[var(--border)]');
  });
});