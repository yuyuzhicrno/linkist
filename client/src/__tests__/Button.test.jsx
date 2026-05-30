import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { Button } from '../components/ui/Button';

describe('Button Component', () => {
  test('renders children', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  test('applies primary variant by default', () => {
    const { container } = render(<Button>Primary</Button>);
    const button = container.querySelector('button');
    expect(button).toHaveClass('bg-[var(--accent)]', 'text-white');
  });

  test('applies secondary variant', () => {
    const { container } = render(<Button variant="secondary">Secondary</Button>);
    const button = container.querySelector('button');
    expect(button).toHaveClass('bg-[var(--surface-3)]');
  });

  test('is disabled when disabled prop is true', () => {
    render(<Button disabled>Disabled</Button>);
    const button = screen.getByText('Disabled');
    expect(button).toBeDisabled();
  });

  test('calls onClick handler', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Clickable</Button>);
    screen.getByText('Clickable').click();
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});