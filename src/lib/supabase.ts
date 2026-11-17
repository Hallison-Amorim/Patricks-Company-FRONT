import { createClient, type SupabaseClient } from '@supabase/supabase-js';

type PublicAuthConfig = { supabaseUrl: string; supabaseAnonKey: string };

const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';

function readBuildConfiguration(): PublicAuthConfig | null {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  return supabaseUrl && supabaseAnonKey ? { supabaseUrl, supabaseAnonKey } : null;
}

async function readApiConfiguration(): Promise<PublicAuthConfig | null> {
  try {
    const response = await fetch(`${apiUrl}/auth/config`);
    if (!response.ok) return null;
    const config = await response.json() as Partial<PublicAuthConfig>;
    return config.supabaseUrl && config.supabaseAnonKey
      ? { supabaseUrl: config.supabaseUrl, supabaseAnonKey: config.supabaseAnonKey }
      : null;
  } catch {
    return null;
  }
}

export async function createSupabaseClient(): Promise<SupabaseClient | null> {
  const config = readBuildConfiguration() ?? await readApiConfiguration();
  return config ? createClient(config.supabaseUrl, config.supabaseAnonKey) : null;
}
