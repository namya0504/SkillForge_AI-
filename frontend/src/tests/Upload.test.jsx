import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Upload from '../pages/Upload/Upload';
import { vi } from 'vitest';

// Mock useAuth
vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'test-user', email: 'test@example.com' } })
}));

// Mock react-router-dom
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  Link: ({ children, to }) => <a href={to}>{children}</a>
}));

// Mock API
vi.mock('../services/api', () => ({
  resumeAPI: {
    upload: vi.fn()
  },
  jobAPI: {
    getStatus: vi.fn()
  }
}));

import { resumeAPI } from '../services/api';

describe('Upload Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders upload zone correctly', () => {
    render(<Upload />);
    expect(screen.getByText(/Drag & drop your resume here/i)).toBeInTheDocument();
  });

  it('validates file size (limit 5MB)', async () => {
    const { container } = render(<Upload />);
    
    const file = new File([''], 'huge.pdf', { type: 'application/pdf' });
    Object.defineProperty(file, 'size', { value: 6 * 1024 * 1024 }); // 6MB
    
    const input = container.querySelector('input[type="file"]');
    fireEvent.change(input, { target: { files: [file] } });
    
    expect(await screen.findByText(/File size must be less than 5MB/i)).toBeInTheDocument();
    expect(resumeAPI.upload).not.toHaveBeenCalled();
  });

  it('validates file type (only pdf/docx)', async () => {
    const { container } = render(<Upload />);
    
    const file = new File(['hello'], 'resume.txt', { type: 'text/plain' });
    
    const input = container.querySelector('input[type="file"]');
    fireEvent.change(input, { target: { files: [file] } });
    
    expect(await screen.findByText(/Please upload a PDF or DOCX file/i)).toBeInTheDocument();
    expect(resumeAPI.upload).not.toHaveBeenCalled();
  });
});
