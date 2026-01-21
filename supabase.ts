import { createClient } from '@supabase/supabase-js';

// .env 파일에 있는 주소와 열쇠를 가져옵니다
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// 연결을 시작합니다!
export const supabase = createClient(supabaseUrl, supabaseAnonKey);