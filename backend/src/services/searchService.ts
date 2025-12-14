import { VideoItem } from '../schemas/common.schema';
import { PorterStemmerRu, PorterStemmer } from 'natural';

// --- Types ---

type TokenType = 'PHRASE' | 'WORD';

interface QueryToken {
  value: string; // The raw string (normalized)
  stem?: string; // The word stem (if applicable)
  type: TokenType;
  required: boolean; // Was '+' used?
}

interface ScoredVideo {
  video: VideoItem;
  score: number;
}

// --- Helpers ---

/**
 * Normalizes text: Lowercase, remove accents, trim.
 * Keeps emojis and standard punctuation for phrase matching.
 */
const normalizeText = (text: string): string => {
  if (!text) return '';
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
};

/**
 * Generates a stem for a word using Russian or English algorithms.
 */
const getStem = (word: string): string => {
  // Simple heuristic: if contains Cyrillic, use RU stemmer
  if (/[а-яё]/i.test(word)) {
    return PorterStemmerRu.stem(word);
  }
  return PorterStemmer.stem(word);
};

/**
 * Parses a query string into structured tokens.
 * Supports:
 *  - "exact phrase"
 *  - +mandatory
 *  - simple terms
 */
const parseQuery = (rawQuery: string): QueryToken[] => {
  const normalized = normalizeText(rawQuery);
  const tokens: QueryToken[] = [];

  // Regex explanation:
  // Group 1 (+): Mandatory flag for phrase
  // Group 2: Content of quoted phrase
  // Group 3 (+): Mandatory flag for word
  // Group 4: Content of word
  const regex = /([+])?"([^"]+)"|([+])?([^\s"]+)/g;

  let match;
  while ((match = regex.exec(normalized)) !== null) {
    const isPhraseMandatory = !!match[1];
    const phraseContent = match[2];
    const isWordMandatory = !!match[3];
    const wordContent = match[4];

    if (phraseContent) {
      tokens.push({
        value: phraseContent,
        type: 'PHRASE',
        required: isPhraseMandatory,
      });
    } else if (wordContent) {
      tokens.push({
        value: wordContent,
        stem: getStem(wordContent),
        type: 'WORD',
        required: isWordMandatory,
      });
    }
  }

  console.log('Parsed query tokens', tokens);
  return tokens;
};

// --- Main Search Logic ---
export const searchVideos = (videos: VideoItem[], rawQuery: string): VideoItem[] => {
  const queryTokens = parseQuery(rawQuery);

  if (queryTokens.length === 0) return [];

  const scoredResults: ScoredVideo[] = videos.map((video) => {
    const rawTitle = video.title ?? video.filename ?? '';
    const normalizedTitle = normalizeText(rawTitle);

    // Tokenize title for word-based analysis (removing punctuation for clean word list)
    // Note: We keep normalizedTitle intact for Phrase matching
    const titleWords = normalizedTitle.split(/[^a-zа-яё0-9]+/i).filter(Boolean);
    const titleStems = titleWords.map((w) => getStem(w));

    let score = 0;
    let constraintsMet = true;

    for (const token of queryTokens) {
      let tokenScore = 0;
      let matchFound = false;

      if (token.type === 'PHRASE') {
        // --- Phrase Logic ---
        if (normalizedTitle.includes(token.value)) {
          tokenScore = 100; // High value for exact phrase
          matchFound = true;
        }
      } else {
        // --- Word Logic ---
        const { value, stem } = token;

        // 1. Exact Word Match (Highest Word Priority)
        if (titleWords.includes(value)) {
          tokenScore = 50;
          matchFound = true;
        }
        // 2. Stem Match (Lexical - "собеседования" vs "собеседование")
        else if (stem && titleStems.includes(stem)) {
          tokenScore = 30;
          matchFound = true;
        }
        // 3. Substring/Prefix Match (Fuzzy - "собес" in "собеседование")
        else if (titleWords.some((w) => w.includes(value))) {
          tokenScore = 10;
          matchFound = true;
        }
      }

      // Check Mandatory Constraint
      if (token.required && !matchFound) {
        constraintsMet = false;
        break; // Stop processing this video, it failed a requirement
      }

      // Add to total score (accumulate matches even if not required)
      score += tokenScore;
    }

    if (!constraintsMet) return { video, score: 0 };

    return { video, score };
  });

  return scoredResults
    .filter((item) => item.score > 0)
    .sort((a, b) => {
      // 1. Relevance
      if (b.score !== a.score) return b.score - a.score;

      // 2. Upload Date (Newest first) if available
      const dateA = a.video.upload_date || '';
      const dateB = b.video.upload_date || '';
      if (dateA && dateB) return dateB.localeCompare(dateA);

      // 3. Fallback to title
      const titleA = a.video.title ?? a.video.filename ?? '';
      const titleB = b.video.title ?? b.video.filename ?? '';
      return titleA.localeCompare(titleB);
    })
    .map((item) => item.video);
};
