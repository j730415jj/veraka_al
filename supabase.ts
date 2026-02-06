import { createClient } from '@supabase/supabase-js';

// 🔥 사장님이 주신 주소와 키를 직접 넣었습니다. (무조건 작동함)
const supabaseUrl = 'https://yglnvedpjtxtzjprkhjp.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlnbG52ZWRwanR4dHpqcHJraGpwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1NDEwMDIsImV4cCI6MjA4NDExNzAwMn0.EjbYEn5Mgo3fTHC_j3hGGsxpCQIBoTb-cBOjEWS3rC8';

export const supabase = createClient(supabaseUrl, supabaseKey);