import { supabase } from '@/services/supabase';

export interface UserProfile {
  id: string;
  username: string;
  created_at: number;
  updated_at: number;
}

interface ProfileRow {
  id: string;
  username: string;
  created_at: number | string;
  updated_at: number | string;
}

function mapRow(row: ProfileRow): UserProfile {
  return {
    id: row.id,
    username: row.username,
    created_at: Number(row.created_at),
    updated_at: Number(row.updated_at),
  };
}

/**
 * Normalizes username for consistent lookups (lowercased, trimmed).
 */
export function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}

/**
 * Validates format of username:
 * 3-24 characters, alphanumeric, underscores, hyphens, periods.
 */
export function isValidUsername(username: string): { valid: boolean; reason?: string } {
  const normalized = normalizeUsername(username);
  if (normalized.length < 3) {
    return { valid: false, reason: 'Username must be at least 3 characters long.' };
  }
  if (normalized.length > 24) {
    return { valid: false, reason: 'Username cannot exceed 24 characters.' };
  }
  if (!/^[a-zA-Z0-9_.-]+$/.test(normalized)) {
    return {
      valid: false,
      reason: 'Username can only contain letters, numbers, underscores, hyphens, and periods.',
    };
  }
  return { valid: true };
}

/**
 * Returns the signed-in user's profile. RLS ensures this can only ever return
 * the caller's own row.
 */
export async function getProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, created_at, updated_at')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ? mapRow(data as ProfileRow) : null;
}

/**
 * Checks username availability through a narrow SECURITY DEFINER RPC.
 * The profiles table itself is never readable by other users, so emails and
 * account identities cannot be enumerated.
 */
export async function isUsernameAvailable(username: string): Promise<boolean> {
  const normalized = normalizeUsername(username);
  const { data, error } = await supabase.rpc('is_username_available', {
    desired_username: normalized,
  });

  if (error) {
    throw new Error('Could not check username availability. Please try again.');
  }

  return data === true;
}

/**
 * Creates or updates the signed-in user's profile. The database's unique
 * lower(username) index is the final guard against duplicate usernames.
 */
export async function saveProfile(userId: string, username: string): Promise<UserProfile> {
  const normalized = normalizeUsername(username);
  const now = Date.now();

  const { data: existing, error: readError } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', userId)
    .maybeSingle();

  if (readError) {
    throw new Error(readError.message);
  }

  if (existing) {
    const { data, error } = await supabase
      .from('profiles')
      .update({ username: normalized, updated_at: now })
      .eq('id', userId)
      .select('id, username, created_at, updated_at')
      .single();

    if (error) {
      throw new Error(
        error.code === '23505'
          ? `The username "${normalized}" is already taken. Please choose another one.`
          : error.message
      );
    }

    return mapRow(data as ProfileRow);
  }

  const { data, error } = await supabase
    .from('profiles')
    .insert({
      id: userId,
      username: normalized,
      created_at: now,
      updated_at: now,
    })
    .select('id, username, created_at, updated_at')
    .single();

  if (error) {
    throw new Error(
      error.code === '23505'
        ? `The username "${normalized}" is already taken. Please choose another one.`
        : error.message
    );
  }

  return mapRow(data as ProfileRow);
}
