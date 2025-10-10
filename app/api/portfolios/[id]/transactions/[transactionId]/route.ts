import { NextRequest, NextResponse } from 'next/server';
import { createAuthenticatedClient } from '@/lib/supabase';
import { sanitizeInput } from '@/lib/sanitize';
import { CacheService } from '@/lib/redis';

/**
 * Validates portfolio ownership and transaction existence
 */
async function validateTransactionAccess(
  token: string,
  portfolioId: string,
  transactionId: string
): Promise<{ error?: NextResponse }> {
  const supabase = createAuthenticatedClient(token);

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      error: NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      ),
    };
  }

  // Check portfolio exists and is owned by user
  const { data: portfolio, error: portfolioError } = await supabase
    .from('portfolios')
    .select('id')
    .eq('id', portfolioId)
    .eq('user_id', user.id)
    .single();

  if (portfolioError || !portfolio) {
    return {
      error: NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Access denied to portfolio' } },
        { status: 403 }
      ),
    };
  }

  // Check transaction exists and belongs to portfolio
  const { data: transaction, error: transactionError } = await supabase
    .from('transactions')
    .select('id')
    .eq('id', transactionId)
    .eq('portfolio_id', portfolioId)
    .single();

  if (transactionError || !transaction) {
    return {
      error: NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Transaction not found' } },
        { status: 404 }
      ),
    };
  }

  return {};
}

/**
 * Validates update fields
 */
function validateUpdateFields(body: {
  quantity?: number;
  price_per_unit?: number;
  notes?: string;
}): { error?: NextResponse } {
  const { quantity, price_per_unit, notes } = body;

  // Validate at least one field is being updated
  if (quantity === undefined && price_per_unit === undefined && notes === undefined) {
    return {
      error: NextResponse.json(
        { error: { code: 'MISSING_FIELDS', message: 'At least one field required for update' } },
        { status: 400 }
      ),
    };
  }

  // Validate quantity if provided
  if (quantity !== undefined && quantity <= 0) {
    return {
      error: NextResponse.json(
        { error: { code: 'INVALID_QUANTITY', message: 'Quantity must be positive' } },
        { status: 400 }
      ),
    };
  }

  // Validate price if provided
  if (price_per_unit !== undefined && price_per_unit <= 0) {
    return {
      error: NextResponse.json(
        { error: { code: 'INVALID_PRICE', message: 'Price must be positive' } },
        { status: 400 }
      ),
    };
  }

  return {};
}

/**
 * PATCH /api/portfolios/[id]/transactions/[transactionId]
 * Update a transaction
 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string; transactionId: string }> }
) {
  const params = await context.params;
  const { id: portfolioId, transactionId } = params;

  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');

  if (!token) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
      { status: 401 }
    );
  }

  const validationResult = await validateTransactionAccess(token, portfolioId, transactionId);
  if (validationResult.error) {
    return validationResult.error;
  }

  const body = await request.json();
  
  const fieldValidation = validateUpdateFields(body);
  if (fieldValidation.error) {
    return fieldValidation.error;
  }

  const { quantity, price_per_unit, notes } = body;
  const supabase = createAuthenticatedClient(token);

  // Build update object
  const updateData: {
    quantity?: number;
    price_per_unit?: number;
    notes?: string | null;
    updated_at: string;
  } = {
    updated_at: new Date().toISOString(),
  };

  if (quantity !== undefined) updateData.quantity = quantity;
  if (price_per_unit !== undefined) updateData.price_per_unit = price_per_unit;
  if (notes !== undefined) {
    updateData.notes = notes ? sanitizeInput(notes) : null;
  }

  const { data: transaction, error } = await supabase
    .from('transactions')
    .update(updateData)
    .eq('id', transactionId)
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: { code: 'DATABASE_ERROR', message: 'Failed to update transaction' } },
      { status: 500 }
    );
  }

  // T023: Invalidate cache after successful transaction update
  await CacheService.invalidatePortfolio(portfolioId);

  return NextResponse.json({ data: transaction }, { status: 200 });
}

/**
 * DELETE /api/portfolios/[id]/transactions/[transactionId]
 * Delete a specific transaction
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string; transactionId: string }> }
) {
  const params = await context.params;
  const { id: portfolioId, transactionId } = params;

  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');

  if (!token) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
      { status: 401 }
    );
  }

  const validationResult = await validateTransactionAccess(token, portfolioId, transactionId);
  if (validationResult.error) {
    return validationResult.error;
  }

  const supabase = createAuthenticatedClient(token);

  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', transactionId);

  if (error) {
    return NextResponse.json(
      { error: { code: 'DATABASE_ERROR', message: 'Failed to delete transaction' } },
      { status: 500 }
    );
  }

  // T024: Invalidate cache after successful transaction deletion
  await CacheService.invalidatePortfolio(portfolioId);

  return new NextResponse(null, { status: 204 });
}
