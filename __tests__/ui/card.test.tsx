import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';

describe('Card Component', () => {
  it('renders card wrapper correctly', () => {
    render(
      <Card data-testid="card">
        <div>Content</div>
      </Card>
    );
    const card = screen.getByTestId('card');
    expect(card).toBeInTheDocument();
    expect(card).toHaveClass('rounded-xl', 'border');
  });

  it('renders CardHeader correctly', () => {
    render(
      <Card>
        <CardHeader data-testid="header">Header Content</CardHeader>
      </Card>
    );
    const header = screen.getByTestId('header');
    expect(header).toBeInTheDocument();
    expect(header).toHaveClass('flex', 'flex-col', 'space-y-1.5');
  });

  it('renders CardTitle correctly', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Test Title</CardTitle>
        </CardHeader>
      </Card>
    );
    expect(screen.getByText('Test Title')).toBeInTheDocument();
  });

  it('renders CardDescription correctly', () => {
    render(
      <Card>
        <CardHeader>
          <CardDescription>Test Description</CardDescription>
        </CardHeader>
      </Card>
    );
    expect(screen.getByText('Test Description')).toBeInTheDocument();
  });

  it('renders CardContent correctly', () => {
    render(
      <Card>
        <CardContent data-testid="content">Content Area</CardContent>
      </Card>
    );
    const content = screen.getByTestId('content');
    expect(content).toBeInTheDocument();
    expect(content).toHaveClass('p-6', 'pt-0');
  });

  it('renders CardFooter correctly', () => {
    render(
      <Card>
        <CardFooter data-testid="footer">Footer Content</CardFooter>
      </Card>
    );
    const footer = screen.getByTestId('footer');
    expect(footer).toBeInTheDocument();
    expect(footer).toHaveClass('flex', 'items-center');
  });

  it('renders complete card structure', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Complete Card</CardTitle>
          <CardDescription>This is a complete card example</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Main content goes here</p>
        </CardContent>
        <CardFooter>
          <button>Action</button>
        </CardFooter>
      </Card>
    );
    
    expect(screen.getByText('Complete Card')).toBeInTheDocument();
    expect(screen.getByText('This is a complete card example')).toBeInTheDocument();
    expect(screen.getByText('Main content goes here')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Action' })).toBeInTheDocument();
  });

  it('accepts custom className on all components', () => {
    render(
      <Card className="custom-card">
        <CardHeader className="custom-header">
          <CardTitle className="custom-title">Title</CardTitle>
        </CardHeader>
      </Card>
    );
    
    expect(screen.getByText('Title').closest('.custom-card')).toBeInTheDocument();
  });
});
