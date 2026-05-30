import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { Input, Textarea } from '../components/ui/Input';

describe('Input Component', () => {
  test('renders with label', () => {
    render(<Input label="Username" />);
    expect(screen.getByText('Username')).toBeInTheDocument();
  });

  test('renders with placeholder', () => {
    render(<Input placeholder="Enter text" />);
    const input = screen.getByPlaceholderText('Enter text');
    expect(input).toBeInTheDocument();
  });

  test('displays error message', () => {
    render(<Input label="Email" error="Invalid email" />);
    expect(screen.getByText('Invalid email')).toBeInTheDocument();
    expect(screen.getByText('Invalid email')).toHaveClass('text-red-400');
  });

  test('accepts value', () => {
    render(<Input value="test value" />);
    const input = screen.getByDisplayValue('test value');
    expect(input).toBeInTheDocument();
  });
});

describe('Textarea Component', () => {
  test('renders with label', () => {
    render(<Textarea label="Content" />);
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  test('displays error message', () => {
    render(<Textarea label="Message" error="Too short" />);
    expect(screen.getByText('Too short')).toBeInTheDocument();
  });
});