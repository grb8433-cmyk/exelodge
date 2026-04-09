import { supabase } from '../lib/supabase';

import { AREA_COORDS } from '../data/seeds';

// ─── Utility ──────────────────────────────────────────────────────────────────

/**
 * Basic sanitization to prevent XSS.
 */
function sanitizeText(text) {
  if (!text) return '';
  return text.replace(/<[^>]*>?/gm, '');
}

/**
 * Helper to map snake_case DB results back to camelCase app objects.
 */
function mapProperty(p) {
  if (!p) return null;
  return {
    ...p,
    pricePppw: p.price_pppw,
    landlordId: p.landlord_id,
    landlordName: p.landlord_id, // Now a plain string in the table
    billsIncluded: p.bills_included,
    externalUrl: p.external_url,
    imageUrl: p.image_url,
    lastScraped: p.last_scraped,
  };
}

function mapReview(r) {
  if (!r) return null;
  return {
    ...r,
    landlordId: r.landlord_id,
    overallRating: r.overall_rating,
    wouldRentAgain: r.would_rent_again,
    propertyAddress: r.property_address,
    academicYear: r.academic_year,
    date: r.created_at?.split('T')[0],
  };
}

// ─── Initialisation ───────────────────────────────────────────────────────────

/**
 * In Cloud Mode, we no longer seed locally. 
 * Data management is handled via the Supabase Dashboard.
 */
export async function initializeData() {
  // No-op: Supabase is initialized in src/lib/supabase.ts with hardcoded credentials.
  return Promise.resolve();
}

// ─── Landlords ────────────────────────────────────────────────────────────────

export async function getLandlords() {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('landlords')
      .select('*')
      .order('name')
      .limit(50);
    if (error) {
      return [];
    }
    return data;
  } catch (e) {
    return [];
  }
}

export async function getLandlordById(id) {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('landlords')
      .select('*')
      .eq('id', id)
      .single();
    if (error) return null;
    return data;
  } catch (e) {
    return null;
  }
}

export async function getLandlordsWithStats() {
  const [landlords, reviews] = await Promise.all([
    getLandlords(),
    getReviews(),
  ]);

  return landlords.map((l) => {
    const landlordReviews = reviews.filter((r) => r.landlordId === l.id);
    const breakdown = computeRatingBreakdown(landlordReviews);
    return {
      ...l,
      avgRating: landlordReviews.length > 0 ? (breakdown?.overallRating || 0) : 0,
      reviewCount: landlordReviews.length,
      ratings: breakdown,
    };
  });
}

// ─── Properties ───────────────────────────────────────────────────────────────

export async function getProperties(filters = {}, page = 0) {
  const pageSize = 24;
  if (!supabase) return [];
  try {
    // 1. Break the Supabase query into a builder pattern - NO JOINS
    let query = supabase.from('properties').select('*').eq('is_available', true);

    // 2. Conditionally apply filters ONLY if they hold valid, non-default values
    
    // Search Query (address or area)
    if (filters.search && filters.search.trim() !== '') {
      query = query.or(`address.ilike.%${filters.search.trim()}%,area.ilike.%${filters.search.trim()}%`);
    }

    // Areas
    if (filters.areas && filters.areas.length > 0 && !filters.areas.includes('All')) {
      query = query.in('area', filters.areas);
    }

    // Min Beds
    if (filters.minBeds && filters.minBeds > 0) {
      query = query.gte('beds', filters.minBeds);
    }

    // Max Price (e.g. if 1000 is the 'Any' cap, don't filter)
    if (filters.maxPrice && filters.maxPrice > 0 && filters.maxPrice < 1000) {
      query = query.lte('price_pppw', filters.maxPrice);
    }

    // Bills Included
    if (filters.billsIncluded !== null && filters.billsIncluded !== undefined) {
      query = query.eq('bills_included', filters.billsIncluded);
    }

    // 3. Add ordering and range at the end
    const from = page * pageSize;
    const to = from + pageSize - 1;
    query = query.order('id', { ascending: false }).range(from, to);

    const { data, error } = await query;
    
    if (error) {
      return [];
    }

    return (data || []).map(mapProperty);
  } catch (e) {
    console.error("DEBUG - Fetch Crash:", e);
    return [];
  }
}

export async function getPropertyById(id) {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('properties')
      .select('*')
      .eq('id', id)
      .single();
    if (error) return null;
    return mapProperty(data);
  } catch (e) {
    return null;
  }
}

export async function getPropertiesByLandlord(landlordId) {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('properties')
      .select('*')
      .eq('landlord_id', landlordId);
    if (error) return [];
    return data.map(mapProperty);
  } catch (e) {
    return [];
  }
}

// ─── Reviews ──────────────────────────────────────────────────────────────────

export async function getReviews() {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('reviews')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) return [];
    return data.map(mapReview);
  } catch (e) {
    return [];
  }
}

export async function getReviewsByLandlord(landlordId) {
  const all = await getReviews();
  return all.filter((r) => r.landlordId === landlordId);
}

export { supabase };

export async function submitReview(review) {
  if (!supabase) return false;
  try {
    const { data: authData } = await supabase.auth.getUser();
    const user = authData?.user;
    
    // Payload mapped strictly to existing DB columns
    const payload = {
      landlord_id: review.landlordId,
      overall_rating: review.overallRating,
      maintenance: review.maintenance,
      communication: review.communication,
      deposit: review.deposit,
      review: sanitizeText(review.review),
      verified: review.verified,
      property_address: sanitizeText(review.propertyAddress),
      academic_year: review.academicYear,
    };

    const { error } = await supabase.from('reviews').insert([payload]);
    
    if (error) {
      console.error("Supabase Insert Error:", error);
      return false;
    }
    return true;
  } catch (e) {
    console.error("submitReview Exception:", e);
    return false;
  }
}

export function computeRatingBreakdown(reviews) {
  if (!reviews.length) return null;
  const keys = ['overallRating', 'maintenance', 'deposit', 'condition', 'communication', 'wouldRentAgain'];
  const totals = {};
  keys.forEach((k) => {
    const sum = reviews.reduce((acc, r) => acc + (r[k] || 0), 0);
    totals[k] = sum / reviews.length;
  });
  return totals;
}
