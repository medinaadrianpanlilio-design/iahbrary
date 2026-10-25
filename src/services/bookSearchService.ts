import { CURATED_BOOKS, CuratedBook } from '@/constants/curatedBooks';

export interface SearchBookResult {
  id: string;
  title: string;
  authors: string[];
  description?: string;
  thumbnailUrl?: string;
  pageCount: number;
  publishedDate?: string;
  isCurated?: boolean;
}

function cleanThumbnailUrl(url?: string): string | undefined {
  if (!url) return undefined;
  let clean = url;
  if (clean.startsWith('http://')) {
    clean = clean.replace('http://', 'https://');
  }
  // Remove curl edge effect that distorts Google covers
  clean = clean.replace('&edge=curl', '');
  return clean;
}

export async function searchBooks(query: string): Promise<SearchBookResult[]> {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return [];

  // 1. Search Curated Catalog for instant high-res matches
  const curatedMatches: SearchBookResult[] = CURATED_BOOKS.filter(
    (b) =>
      b.title.toLowerCase().includes(trimmed) ||
      b.authors.some((a) => a.toLowerCase().includes(trimmed))
  ).map((b) => ({
    id: b.id,
    title: b.title,
    authors: b.authors,
    description: b.description,
    thumbnailUrl: b.thumbnailUrl,
    pageCount: b.pageCount,
    isCurated: true,
  }));

  // 2. Search Online APIs (Google Books with automatic Open Library fallback)
  let onlineResults: SearchBookResult[] = [];

  // Try Google Books first
  try {
    const encodedQuery = encodeURIComponent(query.trim());
    const url = `https://www.googleapis.com/books/v1/volumes?q=${encodedQuery}&maxResults=20&printType=books`;
    const response = await fetch(url);
    if (response.ok) {
      const data = await response.json();
      if (data.items && Array.isArray(data.items)) {
        onlineResults = data.items.map((item: any) => {
          const volume = item.volumeInfo || {};

          let isbn: string | undefined;
          if (Array.isArray(volume.industryIdentifiers)) {
            const isbn13 = volume.industryIdentifiers.find((i: any) => i.type === 'ISBN_13');
            const isbn10 = volume.industryIdentifiers.find((i: any) => i.type === 'ISBN_10');
            isbn = isbn13?.identifier || isbn10?.identifier;
          }

          let thumbnail =
            volume.imageLinks?.thumbnail ||
            volume.imageLinks?.smallThumbnail ||
            volume.imageLinks?.medium ||
            volume.imageLinks?.large;

          thumbnail = cleanThumbnailUrl(thumbnail);

          if (!thumbnail && isbn) {
            thumbnail = `https://covers.openlibrary.org/b/isbn/${isbn}-M.jpg?default=false`;
          }

          return {
            id: item.id || Math.random().toString(36).substring(7),
            title: volume.title || 'Untitled',
            authors: volume.authors || ['Unknown Author'],
            description: volume.description,
            thumbnailUrl: thumbnail,
            pageCount: volume.pageCount || 280,
            publishedDate: volume.publishedDate,
            isCurated: false,
          };
        });
      }
    }
  } catch (error) {
    console.warn('Google Books API failed, falling back to Open Library:', error);
  }

  // 3. Fallback to Open Library if Google Books returned 0 results or was rate-limited (HTTP 429)
  if (onlineResults.length === 0) {
    try {
      const encodedQuery = encodeURIComponent(query.trim());
      const olUrl = `https://openlibrary.org/search.json?q=${encodedQuery}&limit=20`;
      const olResponse = await fetch(olUrl);
      if (olResponse.ok) {
        const olData = await olResponse.json();
        if (olData.docs && Array.isArray(olData.docs)) {
          onlineResults = olData.docs
            .filter((doc: any) => doc.title && doc.author_name && doc.author_name.length > 0)
            .map((doc: any) => {
              const coverId = doc.cover_i;
              const thumbnail = coverId
                ? `https://covers.openlibrary.org/b/id/${coverId}-M.jpg`
                : undefined;

              const workKey = (doc.key || '').replace('/works/', '') || Math.random().toString(36).substring(7);

              return {
                id: `ol_${workKey}`,
                title: doc.title,
                authors: doc.author_name || ['Unknown Author'],
                description: doc.first_sentence ? String(doc.first_sentence) : undefined,
                thumbnailUrl: thumbnail,
                pageCount: doc.number_of_pages_median || 300,
                publishedDate: doc.first_publish_year ? String(doc.first_publish_year) : undefined,
                isCurated: false,
              };
            });
        }
      }
    } catch (olError) {
      console.error('Error searching Open Library:', olError);
    }
  }

  // Filter out any titles that match our curated results to avoid duplicates
  const filteredOnline = onlineResults.filter((book: SearchBookResult) => {
    return !curatedMatches.some(
      (c) => c.title.toLowerCase() === book.title.toLowerCase()
    );
  });

  return [...curatedMatches, ...filteredOnline];
}
