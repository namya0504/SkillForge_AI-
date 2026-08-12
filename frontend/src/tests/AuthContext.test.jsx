import { render, screen, act, waitFor } from '@testing-library/react';
import { AuthContext, AuthProvider } from '../context/AuthContext';
import { vi } from 'vitest';
import { authAPI } from '../services/api';

vi.mock('../services/api', () => ({
  authAPI: {
    getMe: vi.fn(),
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn()
  }
}));

const TestComponent = () => {
  return (
    <AuthContext.Consumer>
      {({ user, loading, login, error }) => (
        <div>
          <span data-testid="loading">{loading ? 'true' : 'false'}</span>
          <span data-testid="user">{user ? user.email : 'null'}</span>
          <span data-testid="error">{error || 'null'}</span>
          <button onClick={() => login('test@example.com', 'pass123')}>Login</button>
        </div>
      )}
    </AuthContext.Consumer>
  );
};

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches user on mount', async () => {
    authAPI.getMe.mockResolvedValueOnce({ user: { email: 'user@example.com' } });
    
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    expect(screen.getByTestId('loading')).toHaveTextContent('true');
    
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });
    
    expect(screen.getByTestId('user')).toHaveTextContent('user@example.com');
  });

  it('handles login success', async () => {
    authAPI.getMe.mockRejectedValueOnce(new Error('Not logged in'));
    authAPI.login.mockResolvedValueOnce({ user: { email: 'login@example.com' } });
    
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );
    
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });

    act(() => {
      screen.getByText('Login').click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('login@example.com');
    });
  });
});
