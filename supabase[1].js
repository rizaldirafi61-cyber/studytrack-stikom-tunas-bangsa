// StudyTrack STIKOM Tunas Bangsa
// Isi dua nilai ini dari Supabase Project Settings > API.
const SUPABASE_URL = "https://hikiuzgeknxbmnlsqwmo.supabase.co/rest/v1/";
const SUPABASE_ANON_KEY = "sb_publishable_aVRBKltM30WIzm99yeUw9A_2kGLyedC";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);
