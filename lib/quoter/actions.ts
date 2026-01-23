'use server';

/**
 * Quoter Server Actions
 * 
 * Server-side mutations for quotes and quote items.
 * All actions enforce super-admin access via RLS.
 */

import { createServerClient } from '@/lib/supabase-server';
import { getUser } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getRateCardForPricingSet } from './rate-card';
import { calculatePanelLettersV1 } from './engine/panel-letters-v1';
import { PanelLettersV1Input, Quote, QuoteItem, PanelLettersV1Output } from './types';

// =============================================================================
// QUOTE ACTIONS
// =============================================================================

export interface CreateQuoteInput {
    customer_name?: string;
    customer_email?: string;
    customer_phone?: string;
    pricing_set_id: string;
}

export interface UpdateQuoteInput {
    id: string;
    customer_name?: string;
    customer_email?: string;
    customer_phone?: string;
    notes_internal?: string;
}

export async function createQuoteAction(input: CreateQuoteInput): Promise<{ id: string } | { error: string }> {
    const user = await getUser();
    if (!user) {
        return { error: 'Not authenticated' };
    }

    const supabase = await createServerClient();

    const { data, error } = await supabase
        .from('quotes')
        .insert({
            customer_name: input.customer_name || null,
            customer_email: input.customer_email || null,
            customer_phone: input.customer_phone || null,
            pricing_set_id: input.pricing_set_id,
            status: 'draft',
            created_by: user.id,
        })
        .select('id')
        .single();

    if (error) {
        console.error('Error creating quote:', error);
        return { error: error.message };
    }

    revalidatePath('/app/admin/quotes');
    return { id: data.id };
}

export async function updateQuoteAction(input: UpdateQuoteInput): Promise<{ success: boolean } | { error: string }> {
    const user = await getUser();
    if (!user) return { error: 'Not authenticated' };

    const supabase = await createServerClient();

    // Get original for audit
    const { data: original } = await supabase
        .from('quotes')
        .select('*')
        .eq('id', input.id)
        .single();

    const { error } = await supabase
        .from('quotes')
        .update({
            customer_name: input.customer_name,
            customer_email: input.customer_email,
            customer_phone: input.customer_phone,
            notes_internal: input.notes_internal,
            updated_at: new Date().toISOString(),
        })
        .eq('id', input.id);

    if (error) {
        console.error('Error updating quote:', error);
        return { error: error.message };
    }

    // Log audit
    await logQuoteAudit(supabase, {
        quote_id: input.id,
        user_id: user.id,
        user_email: user.email!,
        action: 'update_quote',
        summary: 'Updated customer details',
        old_data: original,
        new_data: input,
    });

    revalidatePath(`/app/admin/quotes/${input.id}`);
    revalidatePath('/app/admin/quotes');
    return { success: true };
}

export async function updateQuoteStatusAction(
    quoteId: string,
    status: Quote['status']
): Promise<{ success: boolean } | { error: string }> {
    const supabase = await createServerClient();

    const { error } = await supabase
        .from('quotes')
        .update({ status })
        .eq('id', quoteId);

    if (error) {
        console.error('Error updating quote status:', error);
        return { error: error.message };
    }

    revalidatePath(`/app/admin/quotes/${quoteId}`);
    revalidatePath('/app/admin/quotes');
    return { success: true };
}

export async function deleteQuoteAction(quoteId: string): Promise<{ success: boolean } | { error: string }> {
    const supabase = await createServerClient();

    const { error } = await supabase
        .from('quotes')
        .delete()
        .eq('id', quoteId);

    if (error) {
        console.error('Error deleting quote:', error);
        return { error: error.message };
    }

    revalidatePath('/app/admin/quotes');
    redirect('/app/admin/quotes');
}

// =============================================================================
// QUOTE ITEM ACTIONS
// =============================================================================

export interface RecalculateResult {
    ok: boolean;
    errors: string[];
    warnings: string[];
    line_total_pence: number;
    output: Record<string, unknown>;
}

/**
 * Recalculate panel letters v1 on the server.
 * Returns the full breakdown without persisting.
 */
export async function recalculatePanelLettersV1Action(
    pricingSetId: string,
    input: PanelLettersV1Input
): Promise<RecalculateResult> {
    try {
        const rateCard = await getRateCardForPricingSet(pricingSetId);
        const output = calculatePanelLettersV1(input, rateCard);

        return {
            ok: output.ok,
            errors: output.errors,
            warnings: output.warnings,
            line_total_pence: output.line_total_pence,
            output: output as unknown as Record<string, unknown>,
        };
    } catch (err) {
        console.error('Error recalculating:', err);
        return {
            ok: false,
            errors: [err instanceof Error ? err.message : 'Unknown error'],
            warnings: [],
            line_total_pence: 0,
            output: {},
        };
    }
}

/**
 * Add a panel letters v1 line item to a quote.
 * Recalculates server-side before persisting.
 */
export async function addQuoteItemAction(
    quoteId: string,
    input: PanelLettersV1Input
): Promise<{ id: string } | { error: string; errors?: string[] }> {
    const user = await getUser();
    if (!user) {
        return { error: 'Not authenticated' };
    }

    const supabase = await createServerClient();

    // Get the quote to find its pricing_set_id
    const { data: quote, error: quoteError } = await supabase
        .from('quotes')
        .select('pricing_set_id')
        .eq('id', quoteId)
        .single();

    if (quoteError || !quote) {
        return { error: 'Quote not found' };
    }

    // Recalculate server-side (never trust client calculation)
    const rateCard = await getRateCardForPricingSet(quote.pricing_set_id);
    const output = calculatePanelLettersV1(input, rateCard);

    if (!output.ok) {
        return { error: 'Validation failed', errors: output.errors };
    }

    // Insert the line item
    const { data, error } = await supabase
        .from('quote_items')
        .insert({
            quote_id: quoteId,
            item_type: 'panel_letters_v1',
            input_json: input,
            output_json: output,
            line_total_pence: output.line_total_pence,
            created_by: user.id,
        })
        .select('id')
        .single();

    if (error) {
        console.error('Error adding quote item:', error);
        return { error: error.message };
    }

    revalidatePath(`/app/admin/quotes/${quoteId}`);
    return { id: data.id };
}

/**
 * Update a panel letters v1 line item.
 */
export async function updateQuoteItemAction(
    quoteId: string,
    itemId: string,
    input: PanelLettersV1Input
): Promise<{ success: boolean } | { error: string; errors?: string[] }> {
    const user = await getUser();
    if (!user) return { error: 'Not authenticated' };

    const supabase = await createServerClient();

    // Get original for audit
    const { data: original } = await supabase
        .from('quote_items')
        .select('*')
        .eq('id', itemId)
        .single();

    // Get the quote to find its pricing_set_id
    const { data: quote, error: quoteError } = await supabase
        .from('quotes')
        .select('pricing_set_id')
        .eq('id', quoteId)
        .single();

    if (quoteError || !quote) {
        return { error: 'Quote not found' };
    }

    // Recalculate server-side
    const rateCard = await getRateCardForPricingSet(quote.pricing_set_id);
    const output = calculatePanelLettersV1(input, rateCard);

    if (!output.ok) {
        return { error: 'Validation failed', errors: output.errors };
    }

    // Update the line item
    const { error } = await supabase
        .from('quote_items')
        .update({
            input_json: input,
            output_json: output,
            line_total_pence: output.line_total_pence,
        })
        .eq('id', itemId)
        .eq('quote_id', quoteId);

    if (error) {
        console.error('Error updating quote item:', error);
        return { error: error.message };
    }

    // Log audit
    await logQuoteAudit(supabase, {
        quote_id: quoteId,
        user_id: user.id,
        user_email: user.email!,
        action: 'update_item',
        summary: `Updated item: ${output.ok ? 'Recalculated total £' + (output.line_total_pence / 100).toFixed(2) : 'Failed recalculation'}`,
        old_data: original,
        new_data: { input, output },
    });

    revalidatePath(`/app/admin/quotes/${quoteId}`);
    return { success: true };
}

/**
 * Delete a quote item.
 */
export async function deleteQuoteItemAction(
    quoteId: string,
    itemId: string
): Promise<{ success: boolean } | { error: string }> {
    const supabase = await createServerClient();

    const { error } = await supabase
        .from('quote_items')
        .delete()
        .eq('id', itemId)
        .eq('quote_id', quoteId);

    if (error) {
        console.error('Error deleting quote item:', error);
        return { error: error.message };
    }

    revalidatePath(`/app/admin/quotes/${quoteId}`);
    return { success: true };
}

// =============================================================================
// DATA FETCHING HELPERS (for use in server components)
// =============================================================================

export async function getQuotes(filters?: {
    status?: string;
    search?: string;
}): Promise<Quote[]> {
    const supabase = await createServerClient();

    let query = supabase
        .from('quotes')
        .select('*')
        .order('created_at', { ascending: false });

    if (filters?.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
    }

    if (filters?.search) {
        query = query.or(`quote_number.ilike.%${filters.search}%,customer_name.ilike.%${filters.search}%`);
    }

    const { data, error } = await query;

    if (error) {
        console.error('Error fetching quotes:', error);
        return [];
    }

    return data as Quote[];
}

export async function getQuoteWithItems(quoteId: string): Promise<{
    quote: Quote;
    items: QuoteItem[];
} | null> {
    const supabase = await createServerClient();

    const { data: quote, error: quoteError } = await supabase
        .from('quotes')
        .select('*')
        .eq('id', quoteId)
        .single();

    if (quoteError || !quote) {
        console.error('Error fetching quote:', quoteError);
        return null;
    }

    const { data: items, error: itemsError } = await supabase
        .from('quote_items')
        .select('*')
        .eq('quote_id', quoteId)
        .order('created_at', { ascending: true });

    if (itemsError) {
        console.error('Error fetching quote items:', itemsError);
        return null;
    }

    return {
        quote: quote as Quote,
        items: (items || []) as QuoteItem[],
    };
}

export async function getPricingSets(): Promise<Array<{ id: string; name: string; status: string }>> {
    const supabase = await createServerClient();

    const { data, error } = await supabase
        .from('pricing_sets')
        .select('id, name, status')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching pricing sets:', error);
        return [];
    }

    return data || [];
}

// =============================================================================
// DUPLICATION ACTIONS
// =============================================================================

/**
 * Duplicate a quote (creates new quote header with new quote_number, copies all items).
 */
export async function duplicateQuoteAction(
    quoteId: string
): Promise<{ id: string } | { error: string }> {
    const user = await getUser();
    if (!user) {
        return { error: 'Not authenticated' };
    }

    const supabase = await createServerClient();

    // Get original quote
    const { data: original, error: fetchError } = await supabase
        .from('quotes')
        .select('*')
        .eq('id', quoteId)
        .single();

    if (fetchError || !original) {
        return { error: 'Quote not found' };
    }

    // Create new quote (quote_number generated by DB trigger)
    const { data: newQuote, error: createError } = await supabase
        .from('quotes')
        .insert({
            customer_name: original.customer_name,
            customer_email: original.customer_email,
            customer_phone: original.customer_phone,
            pricing_set_id: original.pricing_set_id,
            notes_internal: original.notes_internal ? `Copied from ${original.quote_number}: ${original.notes_internal}` : `Copied from ${original.quote_number}`,
            status: 'draft',
            created_by: user.id,
        })
        .select('id')
        .single();

    if (createError || !newQuote) {
        console.error('Error creating duplicate quote:', createError);
        return { error: createError?.message || 'Failed to create quote' };
    }

    // Copy all items
    const { data: items } = await supabase
        .from('quote_items')
        .select('*')
        .eq('quote_id', quoteId);

    if (items && items.length > 0) {
        const newItems = items.map(item => ({
            quote_id: newQuote.id,
            item_type: item.item_type,
            input_json: item.input_json,
            output_json: item.output_json,
            line_total_pence: item.line_total_pence,
            created_by: user.id,
        }));

        await supabase.from('quote_items').insert(newItems);
    }

    revalidatePath('/app/admin/quotes');
    return { id: newQuote.id };
}

/**
 * Duplicate a line item within the same quote.
 */
export async function duplicateQuoteItemAction(
    quoteId: string,
    itemId: string
): Promise<{ id: string } | { error: string }> {
    const user = await getUser();
    if (!user) {
        return { error: 'Not authenticated' };
    }

    const supabase = await createServerClient();

    // Get original item
    const { data: original, error: fetchError } = await supabase
        .from('quote_items')
        .select('*')
        .eq('id', itemId)
        .eq('quote_id', quoteId)
        .single();

    if (fetchError || !original) {
        return { error: 'Item not found' };
    }

    // Create duplicate
    const { data: newItem, error: createError } = await supabase
        .from('quote_items')
        .insert({
            quote_id: quoteId,
            item_type: original.item_type,
            input_json: original.input_json,
            output_json: original.output_json,
            line_total_pence: original.line_total_pence,
            created_by: user.id,
        })
        .select('id')
        .single();

    if (createError || !newItem) {
        console.error('Error duplicating item:', createError);
        return { error: createError?.message || 'Failed to duplicate item' };
    }

    revalidatePath(`/app/admin/quotes/${quoteId}`);
    return { id: newItem.id };
}

// =============================================================================
// AUDIT HELPERS
// =============================================================================

async function logQuoteAudit(supabase: any, audit: {
    quote_id: string;
    user_id: string;
    user_email: string;
    action: string;
    summary: string;
    old_data?: any;
    new_data?: any;
}) {
    const { error } = await supabase
        .from('quote_audits')
        .insert(audit);

    if (error) {
        console.error('Error logging quote audit:', error);
    }
}
