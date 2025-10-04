import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Skeleton } from '@/components/ui/skeleton';

describe('Skeleton Component', () => {
  it('renders skeleton element', () => {
    render(<Skeleton data-testid="skeleton" />);
    const skeleton = screen.getByTestId('skeleton');
    expect(skeleton).toBeInTheDocument();
  });

  it('applies animate-pulse class', () => {
    render(<Skeleton data-testid="skeleton" />);
    const skeleton = screen.getByTestId('skeleton');
    expect(skeleton).toHaveClass('animate-pulse');
  });

  it('applies rounded background styling', () => {
    render(<Skeleton data-testid="skeleton" />);
    const skeleton = screen.getByTestId('skeleton');
    expect(skeleton).toHaveClass('rounded-md', 'bg-primary/10');
  });

  it('accepts custom className', () => {
    render(<Skeleton className="h-10 w-full" data-testid="skeleton" />);
    const skeleton = screen.getByTestId('skeleton');
    expect(skeleton).toHaveClass('h-10', 'w-full');
  });

  it('renders multiple skeletons for loading state', () => {
    render(
      <div>
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-3/4 mb-2" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    );
    
    const skeletons = screen.getAllByRole('generic').filter(el => 
      el.className.includes('animate-pulse')
    );
    expect(skeletons.length).toBeGreaterThanOrEqual(3);
  });
});
