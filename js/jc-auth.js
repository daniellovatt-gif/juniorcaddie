/**
 * JuniorCaddie — shared auth helpers (Supabase Auth + household bootstrap)
 *
 * IMPORTANT: these credentials point at the STAGING Supabase project
 * (kyjgpordhmsjpltsavyf), because that's where the households/adults/juniors
 * schema and the create_household / accept_household_invite RPCs live today.
 * Production (amwwngkktfxqrpisxqza) does not have this schema yet.
 * Swap these two constants when the account model is merged to production.
 */
const JC_SUPABASE_URL = 'https://kyjgpordhmsjpltsavyf.supabase.co';
const JC_SUPABASE_KEY = 'sb_publishable_2vrOQfrVXvf1jS6ohLdbBA_F1_vuZR9';

const jcSupabase = supabase.createClient(JC_SUPABASE_URL, JC_SUPABASE_KEY);

/**
 * An invite token can arrive two ways: on the URL (?invite=...) the first time
 * someone lands on signup.html, or — after they click the email confirmation
 * link and get redirected back with a fresh session but no query string —
 * from sessionStorage, where we stashed it. This function handles both.
 */
function jcGetInviteToken() {
  const fromUrl = new URLSearchParams(window.location.search).get('invite');
  if (fromUrl) {
    sessionStorage.setItem('jc_invite_token', fromUrl);
    return fromUrl;
  }
  return sessionStorage.getItem('jc_invite_token');
}

function jcGetPendingName() {
  return sessionStorage.getItem('jc_pending_display_name') || null;
}

function jcSetPendingName(name) {
  if (name) sessionStorage.setItem('jc_pending_display_name', name);
}

function jcClearPending() {
  sessionStorage.removeItem('jc_invite_token');
  sessionStorage.removeItem('jc_pending_display_name');
}

/**
 * Makes sure the currently signed-in user has an `adults` row — either
 * joining an invited household or creating a brand new one. Idempotent and
 * safe to call on every page load (login, signup, account). Returns the
 * household_id, or null if nobody is signed in.
 */
async function jcEnsureMembership() {
  const { data: { user } } = await jcSupabase.auth.getUser();
  if (!user) return null;

  const { data: existing, error: existingErr } = await jcSupabase
    .from('adults')
    .select('household_id')
    .eq('id', user.id)
    .maybeSingle();

  if (existingErr) throw existingErr;
  if (existing) {
    jcClearPending();
    return existing.household_id;
  }

  const token = jcGetInviteToken();
  const displayName = jcGetPendingName();

  if (token) {
    const { data, error } = await jcSupabase.rpc('accept_household_invite', {
      p_token: token,
      p_display_name: displayName
    });
    if (error) throw error;
    jcClearPending();
    return data;
  }

  const { data, error } = await jcSupabase.rpc('create_household', {
    p_display_name: displayName
  });
  if (error) throw error;
  jcClearPending();
  return data;
}

/** Turns raw Supabase error text into copy a parent won't wince at. */
function jcFriendlyAuthError(message) {
  const m = (message || '').toLowerCase();
  if (m.includes('already registered') || m.includes('already exists') || m.includes('user already')) {
    return "That email's already got an account — try logging in instead.";
  }
  if (m.includes('invalid login credentials')) {
    return 'Email or password not recognised — check them and try again.';
  }
  if (m.includes('email not confirmed')) {
    return 'Please confirm your email first — check your inbox for the link we sent.';
  }
  if (m.includes('invite')) {
    return message; // our own RPC error messages are already parent-friendly
  }
  if (m.includes('household already has two adults') || m.includes('cap')) {
    return 'This household already has two adults linked. If that seems wrong, contact whoever invited you.';
  }
  return message || 'Something went wrong — please try again.';
}
