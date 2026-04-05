import { createClient } from '@supabase/supabase-js';

// --- CLOUD CONFIGURATION ---
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.warn('[ExeLodge] Supabase credentials missing from environment variables.');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

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
    streathamMins: p.streatham_mins,
    stLukesMins: p.st_lukes_mins,
    billsIncluded: p.bills_included,
    directUrl: p.direct_url,
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

function mapProfile(p) {
  if (!p) return null;
  return {
    ...p,
    displayName: p.display_name,
    areaPreferences: p.area_preferences,
    socialStyle: p.social_style,
    sleepSchedule: p.sleep_schedule,
    lookingFor: p.looking_for,
    budgetMin: p.budget_min,
    budgetMax: p.budget_max,
  };
}

// ─── Initialisation ───────────────────────────────────────────────────────────

/**
 * In Cloud Mode, we no longer seed locally. 
 * Data management is handled via the Supabase Dashboard.
 */
export async function initializeData() {
  console.log('[ExeLodge] Connected to Supabase Cloud Bridge.');
}

// ─── Landlords ────────────────────────────────────────────────────────────────

export async function getLandlords() {
  const { data, error } = await supabase
    .from('landlords')
    .select('*')
    .order('name');
  if (error) {
    console.error('[Supabase] getLandlords error:', error);
    return [];
  }
  return data;
}

export async function getLandlordById(id) {
  const { data, error } = await supabase
    .from('landlords')
    .select('*')
    .eq('id', id)
    .single();
  if (error) return null;
  return data;
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
  let query = supabase.from('properties').select('*');

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
    console.error('[Supabase] getProperties error:', error);
    return [];
  }

  return data.map(mapProperty);
}

export async function getPropertyById(id) {
  const { data, error } = await supabase
    .from('properties')
    .select('*')
    .eq('id', id)
    .single();
  if (error) return null;
  return mapProperty(data);
}

export async function getPropertiesByLandlord(landlordId) {
  const { data, error } = await supabase
    .from('properties')
    .select('*')
    .eq('landlord_id', landlordId);
  if (error) return [];
  return data.map(mapProperty);
}

// ─── Reviews ──────────────────────────────────────────────────────────────────

export async function getReviews() {
  const { data, error } = await supabase
    .from('reviews')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) return [];
  return data.map(mapReview);
}

export async function getReviewsByLandlord(landlordId) {
  const all = await getReviews();
  return all.filter((r) => r.landlordId === landlordId);
}

export { supabase };

export async function submitReview(review) {
  const { data: { user } } = await supabase.auth.getUser();
  
  const { error } = await supabase.from('reviews').insert([{
    user_id: user?.id,
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
    console.error('[Supabase] submitReview error:', error);
    return false;
  }
  return true;
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

// ─── Housemate Profiles ───────────────────────────────────────────────────────

export async function getHousemateProfiles() {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) return [];
  return data.map(mapProfile);
}

export async function getInterests() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('interests')
    .select('profile_id')
    .eq('user_id', user.id);
  if (error) return [];
  return data.map(i => i.profile_id);
}

export async function addInterest(profileId) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { error } = await supabase.from('interests').upsert({
    user_id: user.id,
    profile_id: profileId,
  });
  return !error;
}

export async function getMatches() {
  const profiles = await getHousemateProfiles();
  const interests = await getInterests();
  
  // Logical match: User liked them AND they are marked as pre-interested
  // In production, you would check for a reciprocal record in the 'interests' table.
  return profiles.filter((p) => interests.includes(p.id) && p.pre_interested);
}

// ─── Messaging ────────────────────────────────────────────────────────────────

export async function getMessages(profileId) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .or(`and(sender_id.eq.${user.id},receiver_profile_id.eq.${profileId}),and(sender_id.eq.${profileId},receiver_profile_id.eq.${user.id})`)
    .order('created_at', { ascending: true });
  
  if (error) return [];
  return data.map(m => ({
    id: m.id,
    text: m.text,
    sender: m.sender_id === user.id ? 'me' : 'them',
    timestamp: m.created_at,
  }));
}

export async function sendMessage(profileId, text) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { error } = await supabase.from('messages').insert([{
    sender_id: user.id,
    receiver_profile_id: profileId,
    text: sanitizeText(text),
  }]);
  return !error;
}

// ─── My Profile ───────────────────────────────────────────────────────────────

export async function getMyProfile() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();
  
  if (error) return null;
  return mapProfile(data);
}

export async function saveMyProfile(profile) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    console.error('[Supabase] Must be authenticated to save profile.');
    return false;
  }

  const payload = {
    user_id: user.id,
    display_name: profile.displayName,
    age: profile.age,
    gender: profile.gender,
    course: profile.course,
    year: profile.year,
    budget_min: profile.budgetMin,
    budget_max: profile.budgetMax,
    area_preferences: profile.areaPreferences,
    social_style: profile.socialStyle,
    cleanliness: profile.cleanliness,
    sleep_schedule: profile.sleepSchedule,
    languages: profile.languages,
    smoking: profile.smoking,
    drinking: profile.drinking,
    pets: profile.pets,
    looking_for: profile.lookingFor,
    notes: sanitizeText(profile.notes),
  };

  const { error } = await supabase
    .from('profiles')
    .upsert(payload, { onConflict: 'user_id' });
  
  if (error) {
    console.error('[Supabase] saveMyProfile error:', error);
    return false;
  }
  return true;
}
