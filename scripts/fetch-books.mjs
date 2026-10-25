/**
 * fetch-books.mjs  (v3 — Open Library Search API)
 * -------------------------------------------------
 * Fetches popular, modern books using Open Library's free search API.
 * No API key, no rate limits, no quota.
 *
 * Usage:
 *   node scripts/fetch-books.mjs
 *   node scripts/fetch-books.mjs --category romance --limit 30
 *   node scripts/fetch-books.mjs --category all --limit 20
 *
 * Categories: trending | scifi | growth | thriller | classics | romance | history | all
 *
 * Output: ready-to-paste TypeScript for src/constants/curatedBooks.ts
 */

// Open Library search queries per category
// Using their search API: https://openlibrary.org/search.json
const CATEGORY_QUERIES = {
  trending: [
    { subject: 'fiction', sort: 'editions', year: '2000', label: 'popular fiction' },
    { subject: 'adventure_stories', sort: 'editions', year: '2000', label: 'adventure' },
  ],
  scifi: [
    { subject: 'science_fiction', sort: 'editions', year: '1980', label: 'modern sci-fi' },
    { subject: 'fantasy_fiction', sort: 'editions', year: '1990', label: 'modern fantasy' },
  ],
  growth: [
    { subject: 'self-help', sort: 'editions', year: '2000', label: 'self-help' },
    { subject: 'psychology', sort: 'editions', year: '2000', label: 'psychology' },
  ],
  thriller: [
    { subject: 'thriller', sort: 'editions', year: '1990', label: 'thriller' },
    { subject: 'mystery_and_detective_stories', sort: 'editions', year: '2000', label: 'mystery' },
  ],
  classics: [
    { subject: 'fiction', sort: 'editions', year: '1800', label: 'classic fiction' },
    { subject: 'poetry', sort: 'editions', year: '1800', label: 'classic poetry' },
  ],
  romance: [
    { subject: 'romance', sort: 'editions', year: '2000', label: 'modern romance' },
    { subject: 'love_stories', sort: 'editions', year: '1990', label: 'love stories' },
  ],
  history: [
    { subject: 'biography', sort: 'editions', year: '2000', label: 'biography' },
    { subject: 'history', sort: 'editions', year: '2000', label: 'history' },
  ],
};

const args = process.argv.slice(2);
const getArg = (flag) => {
  const idx = args.indexOf(flag);
  return idx !== -1 ? args[idx + 1] : null;
};

const targetCategory = getArg('--category') || 'all';
const limitPerQuery = parseInt(getArg('--limit') || '20', 10);

// Titles already in the app — skip to avoid duplicates
const EXISTING_TITLES = new Set([
  'dune', 'tomorrow, and tomorrow, and tomorrow', 'yellowface', 'lessons in chemistry',
  'project hail mary', 'the hobbit', 'the way of kings', 'the three-body problem',
  'atomic habits', 'the psychology of money', 'deep work', "can't hurt me",
  'the silent patient', 'the housemaid', 'gone girl',
  '1984', 'the great gatsby', 'to kill a mockingbird',
  'fourth wing', 'intermezzo', 'james', 'all fours', 'the women',
  "ender's game", 'neuromancer', 'the name of the wind', 'hyperion',
  'the martian', 'the fellowship of the ring', 'a game of thrones',
  'words of radiance', "the hitchhiker's guide to the galaxy",
  'thinking, fast and slow', 'the 7 habits of highly effective people',
  "man's search for meaning", 'the subtle art of not giving a f*ck',
  'show your work!', 'ikigai',
  'the 4-hour workweek', 'mindset',
  'the girl on the train', 'big little lies', 'the da vinci code',
  'no country for old men', 'verity', 'the girl with the dragon tattoo', 'in the woods',
  'brave new world', 'crime and punishment', 'jane eyre', 'pride and prejudice',
  'the catcher in the rye', 'of mice and men', 'moby-dick',
  'it ends with us', 'beach read', 'book lovers', 'happy place',
  'normal people', 'outlander', 'the notebook',
  'sapiens', 'becoming', 'born a crime',
  'educated', 'steve jobs', 'alexander hamilton',
  'a short history of nearly everything', 'guns, germs, and steel',
  'the diary of a young girl',
]);

const seenTitles = new Set(EXISTING_TITLES);
const seenIds = new Set();

function normalizeTitle(t) {
  return (t || '').toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
}

function escapeStr(str) {
  return (str || '')
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n|\r/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 350);
}

async function fetchBooks(queryObj, category, limit) {
  const url = `https://openlibrary.org/search.json?subject=${encodeURIComponent(queryObj.subject)}&sort=${queryObj.sort}&lang=eng&first_publish_year=${queryObj.year}&limit=${limit}`;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.error(`  ✗ HTTP ${res.status} for: ${queryObj.label}`);
      return [];
    }
    const data = await res.json();
    const docs = data.docs || [];

    const results = [];
    for (const doc of docs) {
      const title = (doc.title || '').trim();
      if (!title) continue;

      const titleKey = normalizeTitle(title);
      if (seenTitles.has(titleKey)) continue;

      // Must have a cover
      const coverId = doc.cover_i;
      if (!coverId) continue;

      // Must have authors
      const authors = doc.author_name || [];
      if (!authors.length) continue;

      // Build a stable, unique ID from the OL work key
      const workKey = (doc.key || '').replace('/works/', '').toLowerCase();
      const id = `curated_ol_${workKey}`;
      if (seenIds.has(id)) continue;

      const pageCount = doc.number_of_pages_median || 280;

      // Use first sentence as description if available
      const firstSentence = doc.first_sentence
        ? (Array.isArray(doc.first_sentence) ? doc.first_sentence[0] : doc.first_sentence)
        : '';

      const description = firstSentence
        ? String(firstSentence).substring(0, 300)
        : `${title} by ${authors[0]}.`;

      seenTitles.add(titleKey);
      seenIds.add(id);

      results.push({
        id,
        title,
        authors: authors.slice(0, 3),
        category,
        pageCount,
        thumbnailUrl: `https://covers.openlibrary.org/b/id/${coverId}-M.jpg`,
        description,
      });
    }
    return results;
  } catch (err) {
    console.error(`  ✗ Error on "${queryObj.label}":`, err.message);
    return [];
  }
}

function formatEntry(book) {
  const authorsArr = book.authors.map((a) => `"${escapeStr(a)}"`).join(', ');
  return `  {
    id: '${book.id}',
    title: "${escapeStr(book.title)}",
    authors: [${authorsArr}],
    category: '${book.category}',
    pageCount: ${book.pageCount},
    thumbnailUrl: '${book.thumbnailUrl}',
    description: "${escapeStr(book.description)}",
  },`;
}

async function main() {
  const categories =
    targetCategory === 'all'
      ? Object.keys(CATEGORY_QUERIES)
      : [targetCategory];

  if (categories.some((c) => !CATEGORY_QUERIES[c])) {
    console.error(`Unknown category. Valid: all, ${Object.keys(CATEGORY_QUERIES).join(', ')}`);
    process.exit(1);
  }

  console.log(`\n📚 Fetching via Open Library Search API (free, no key)`);
  console.log(`   Categories: ${categories.join(', ')} | Limit: ${limitPerQuery}/query\n`);

  const allEntries = [];

  for (const category of categories) {
    const queries = CATEGORY_QUERIES[category];
    console.log(`\n🔖 ${category.toUpperCase()}`);
    const categoryEntries = [];

    for (const qObj of queries) {
      process.stdout.write(`   ${qObj.label}... `);
      const books = await fetchBooks(qObj, category, limitPerQuery);
      console.log(`${books.length} new books`);
      categoryEntries.push(...books);
      await new Promise((r) => setTimeout(r, 200)); // gentle pacing
    }

    allEntries.push({ category, entries: categoryEntries });
  }

  // ─── OUTPUT ───────────────────────────────────────────────────────────────
  console.log('\n\n' + '='.repeat(70));
  console.log('// ✅ PASTE INSIDE CURATED_BOOKS array in curatedBooks.ts');
  console.log('// (before the closing ];)');
  console.log('='.repeat(70) + '\n');

  let total = 0;
  for (const { category, entries } of allEntries) {
    if (!entries.length) continue;
    console.log(`\n  // ─── ${category.toUpperCase()} (Open Library) ───`);
    for (const book of entries) {
      console.log(formatEntry(book));
      total++;
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log(`✅ Done — ${total} new entries generated.`);
  console.log('='.repeat(70) + '\n');
}

main();
