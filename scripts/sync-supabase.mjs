import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Local admin script only. Use a service-role key here, never in the app.
// Run from the repository root with:
//   node --env-file=.env scripts/sync-supabase.mjs
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.\n' +
      'Set them in .env (server-side names, without the EXPO_PUBLIC_ prefix) and run:\n' +
      '  node --env-file=.env scripts/sync-supabase.mjs'
  );
  process.exit(1);
}

if (SUPABASE_SERVICE_ROLE_KEY.startsWith('sb_publishable_')) {
  console.error(
    'SUPABASE_SERVICE_ROLE_KEY looks like a publishable/anon key. ' +
      'Seeding the shared catalog requires a service-role key, and that key must never ship in the app.'
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// Extract books from curatedBooks.ts
const filePath = path.resolve('src/constants/curatedBooks.ts');
const content = fs.readFileSync(filePath, 'utf-8');

// Match each book block
const matches = [...content.matchAll(/id:\s*['"]([^'"]+)['"],\s*title:\s*['"]([^'"]+)['"],/g)];
console.log(`Found ${matches.length} books in curatedBooks.ts`);

async function syncAll() {
  const { data: existing, error: fetchErr } = await supabase.from('books').select('id');
  if (fetchErr) {
    console.error('Error fetching existing books:', fetchErr);
    return;
  }

  const existingIds = new Set((existing || []).map(b => b.id));
  console.log(`Supabase currently has ${existingIds.size} books.`);

  // Load evaluated list of books by extracting the object array
  // Using dynamic import with ts-node or compiled ts, or parse curatedBooks
  // Let's parse with a lightweight regex evaluator
  const bookBlocks = content.split(/\{\s*id:\s*['"]/g).slice(1);
  const booksToUpsert = [];
  const now = Date.now();

  let index = 0;
  for (const block of bookBlocks) {
    const idMatch = block.match(/^([^'"]+)['"]/);
    const titleMatch = block.match(/title:\s*["']([^"']+)["']/);
    const authorsMatch = block.match(/authors:\s*\[([^\]]+)\]/);
    const pageCountMatch = block.match(/pageCount:\s*(\d+)/);
    const thumbMatch = block.match(/thumbnailUrl:\s*["']([^"']+)["']/);
    const descMatch = block.match(/description:\s*["']([^"']+)["']/);

    if (idMatch && titleMatch) {
      const id = idMatch[1];
      const title = titleMatch[1];
      let authors = ['Unknown'];
      if (authorsMatch) {
        authors = [...authorsMatch[1].matchAll(/["']([^"']+)["']/g)].map(m => m[1]);
      }
      const total_pages = pageCountMatch ? parseInt(pageCountMatch[1], 10) : 300;
      const thumbnail_url = thumbMatch ? thumbMatch[1] : null;
      const description = descMatch ? descMatch[1] : null;

      booksToUpsert.push({
        id,
        title,
        authors,
        description,
        thumbnail_url,
        total_pages,
        current_page: 0,
        status: 'WANT_TO_READ',
        created_at: now - index * 60000,
        updated_at: now - index * 60000,
      });
      index++;
    }
  }

  console.log(`Parsed ${booksToUpsert.length} books to sync.`);

  // Upsert in batches of 20
  for (let i = 0; i < booksToUpsert.length; i += 20) {
    const batch = booksToUpsert.slice(i, i + 20);
    const { error } = await supabase.from('books').upsert(batch, { onConflict: 'id', ignoreDuplicates: true });
    if (error) {
      console.error(`Error syncing batch ${i}:`, error.message);
    } else {
      console.log(`Synced batch ${i} to ${i + batch.length}`);
    }
  }

  const { count } = await supabase.from('books').select('*', { count: 'exact', head: true });
  console.log(`\n🎉 Done! Supabase books table now contains: ${count} books.`);
}

syncAll().catch(console.error);
