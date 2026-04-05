import { createClient } from '@supabase/supabase-js';

// --- CLOUD CONFIGURATION ---
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('[ExeLodge] Supabase credentials missing from environment variables.');
}

let supabase;
try {
  supabase = createClient(SUPABASE_URL || 'https://placeholder.supabase.co', SUPABASE_KEY || 'placeholder');
} catch (e) {
  console.error('[Supabase] createClient failed:', e);
}

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
    landlordName: p.landlords?.name, // Joined from landlords table
    streathamMins: p.streatham_mins,
    stLukesMins: p.st_lukes_mins,
    billsIncluded: p.bills_included,
    directUrl: p.direct_url,
    externalUrl: p.external_url || p.direct_url,
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
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error('Supabase environment variables are not set. Ensure you have EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY defined in your Netlify Environment Variables or .env file.');
  }
}

// ─── Landlords ────────────────────────────────────────────────────────────────

export async function getLandlords() {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('landlords')
      .select('*')
      .order('name');
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

export async function getProperties(filters = {}) {
  if (!supabase) return [];
  try {
    // We join landlords(name) to get the landlord name in the same query
    // Selecting all necessary columns explicitly
    let query = supabase.from('properties').select('id, address, price_pppw, beds, baths, area, image_url, external_url, landlord_id, last_scraped, landlords(name)');

    if (filters.search) {
      query = query.or(`address.ilike.%${filters.search}%,postcode.ilike.%${filters.search}%,area.ilike.%${filters.search}%`);
    }

    if (filters.areas && filters.areas.length > 0 && !filters.areas.includes('All')) {
      query = query.in('area', filters.areas);
    }

    if (filters.minBeds) {
      query = query.gte('beds', filters.minBeds);
    }

    if (filters.maxPrice) {
      query = query.lte('price_pppw', filters.maxPrice);
    }

    if (filters.billsIncluded !== null && filters.billsIncluded !== undefined) {
      query = query.eq('bills_included', filters.billsIncluded);
    }

    if (filters.campus === 'Streatham') {
      query = query.order('streatham_mins', { ascending: true });
    } else if (filters.campus === "St Luke's") {
      query = query.order('st_lukes_mins', { ascending: true });
    }

    const { data, error } = await query;
    if (error) {
      return [];
    }

    return data.map(mapProperty);
  } catch (e) {
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
      .order('created_at', { ascending: false });
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
    // Attempt to get user if they are logged in, but don't require it for 'Post Anonymously'
    const { data: authData } = await supabase.auth.getUser();
    const user = authData?.user;
    
    const { error } = await supabase.from('reviews').insert([{
      user_id: user?.id || null, // Allow null for anonymous posts
      landlord_id: review.landlordId,
      overall_rating: review.overallRating,
      maintenance: review.maintenance,
      deposit: review.deposit,
      condition: review.condition,
      communication: review.communication,
      would_rent_again: review.wouldRentAgain,
      review: sanitizeText(review.review),
      verified: review.verified,
      property_address: sanitizeText(review.propertyAddress),
      academic_year: review.academicYear,
    }]);
    
    if (error) {
      return false;
    }
    return true;
  } catch (e) {
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
