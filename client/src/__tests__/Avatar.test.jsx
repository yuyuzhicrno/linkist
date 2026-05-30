import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { Avatar } from '../components/ui/Avatar';

describe('Avatar Component', () => {
  const mockUser = {
    id: '1',
    username: 'testuser',
    avatar: 'https://example.com/avatar.jpg'
  };

  test('renders with user avatar', () => {
    render(<Avatar user={mockUser} />);
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', 'https://example.com/avatar.jpg');
    expect(img).toHaveAttribute('alt', 'testuser');
  });

  test('renders with initials when no avatar', () => {
    const userWithoutAvatar = { id: '2', username: 'john' };
    render(<Avatar user={userWithoutAvatar} />);
    const elements = screen.getAllByText(/JO/);
    expect(elements.length).toBeGreaterThan(0);
  });

  test('renders question mark when no user', () => {
    render(<Avatar user={null} />);
    const div = screen.getByText('?');
    expect(div).toBeInTheDocument();
  });

  test('applies correct size classes', () => {
    const { container } = render(<Avatar user={mockUser} size="lg" />);
    const div = container.firstChild;
    expect(div).toHaveClass('w-12', 'h-12');
  });
});