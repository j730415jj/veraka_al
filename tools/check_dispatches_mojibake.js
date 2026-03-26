import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://yglnvedpjtxtzjprkhjp.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlnbG52ZWRwanR4dHpqcHJraGpwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1NDEwMDIsImV4cCI6MjA4NDExNzAwMn0.EjbYEn5Mgo3fTHC_j3hGGsxpCQIBoTb-cBOjEWS3rC8';

const supabase = createClient(supabaseUrl, supabaseKey);

const isLikelyMojibake = (s) => {
  if (!s || typeof s !== 'string') return false;
  // heuristic: presence of sequences like "챘" or "챙" or many high-ASCII chars
  return /[\xC0-\xFF]/.test(s) && /[\u00C0-\u00FF]/.test(s);
};

const repair = (s) => {
  if (!s) return s;
  try {
    const buf = Buffer.from(s, 'binary');
    return buf.toString('utf8');
  } catch (e) {
    return s;
  }
};

(async () => {
  console.log('Fetching latest 30 dispatches...');
  const { data, error } = await supabase.from('dispatches').select('*').order('created_at', { ascending: false }).limit(30);
  if (error) { console.error('Supabase error:', error); process.exit(1); }
  if (!data || data.length === 0) { console.log('No dispatches found.'); process.exit(0); }

  const samples = data.map(d => ({ id: d.id, client_name: d.client_name, origin: d.origin, destination: d.destination }));
  console.log('Sample rows (raw):');
  console.table(samples);

  const moji = samples.filter(r => isLikelyMojibake(r.client_name) || isLikelyMojibake(r.origin) || isLikelyMojibake(r.destination));
  console.log('\nRows that look like mojibake:', moji.length);
  moji.slice(0,10).forEach(r => {
    console.log('--- id', r.id);
    console.log('client_name =>', r.client_name, '-> repaired =>', repair(r.client_name));
    console.log('origin      =>', r.origin, '-> repaired =>', repair(r.origin));
    console.log('destination =>', r.destination, '-> repaired =>', repair(r.destination));
  });

  console.log('\nTo fix records, run: node tools/check_dispatches_mojibake.js fix');

  if (process.argv[2] === 'fix') {
    console.log('Running fix...');
    for (const d of data) {
      const need = isLikelyMojibake(d.client_name) || isLikelyMojibake(d.origin) || isLikelyMojibake(d.destination);
      if (!need) continue;
      const newRow = {
        client_name: repair(d.client_name),
        origin: repair(d.origin),
        destination: repair(d.destination)
      };
      const { error: upErr } = await supabase.from('dispatches').update(newRow).eq('id', d.id);
      if (upErr) console.error('Failed to update', d.id, upErr);
      else console.log('Updated', d.id);
    }
  }

  process.exit(0);
})();
