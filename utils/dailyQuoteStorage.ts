import AsyncStorage from '@react-native-async-storage/async-storage';

const QUOTE_API = 'https://calendar.adinsignia.com/quote.php';
const IMAGE_API = 'https://calendar.adinsignia.com/image.php';
const CACHE_KEY = 'daily_quote_cache_v2';

export type QuoteItem = { id: number; quote: string };
export type ImageItem = { id: number; image: string };

export type DailyQuoteData = {
  date: string;
  quoteId: number;
  quoteText: string;
  imageId: number;
  imageUrl: string;
};

const getTodayString = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`;
};

const getDayOfYear = (d: Date) => {
  const start = new Date(d.getFullYear(), 0, 0);
  const diff = d.getTime() - start.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
};

export const saveDailyQuoteData = async (quote: QuoteItem, image: ImageItem): Promise<void> => {
  try {
    const fresh: DailyQuoteData = {
      date: getTodayString(),
      quoteId: quote.id,
      quoteText: quote.quote,
      imageId: image.id,
      imageUrl: image.image,
    };
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(fresh));
  } catch (e) {
    console.log('saveDailyQuoteData error', e);
  }
};
export const fetchQuoteList = async (): Promise<QuoteItem[]> => {
  try {
    const res = await fetch(QUOTE_API);
    const json = await res.json();
    if (json?.status === 'success' && Array.isArray(json.data)) {
      return json.data;
    }
    return [];
  } catch (e) {
    console.log('fetchQuoteList error', e);
    return [];
  }
};

export const fetchImageList = async (): Promise<ImageItem[]> => {
  try {
    const res = await fetch(IMAGE_API);
    const json = await res.json();
    if (json?.status === 'success' && Array.isArray(json.data)) {
      return json.data;
    }
    return [];
  } catch (e) {
    console.log('fetchImageList error', e);
    return [];
  }
};

export const getDailyQuoteData = async (): Promise<DailyQuoteData | null> => {
  try {
    const today = getTodayString();
    const cachedRaw = await AsyncStorage.getItem(CACHE_KEY);
    if (cachedRaw) {
      const cached: DailyQuoteData = JSON.parse(cachedRaw);
      if (cached.date === today) {
        return cached;
      }
    }

    const [quotes, images] = await Promise.all([fetchQuoteList(), fetchImageList()]);
    if (!quotes.length || !images.length) return null;

    const dayIndex = getDayOfYear(new Date());
    const quote = quotes[dayIndex % quotes.length];
    const image = images[dayIndex % images.length];

    const fresh: DailyQuoteData = {
      date: today,
      quoteId: quote.id,
      quoteText: quote.quote,
      imageId: image.id,
      imageUrl: image.image,
    };

    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(fresh));
    return fresh;
  } catch (e) {
    console.log('getDailyQuoteData error', e);
    return null;
  }
};

export const getRandomQuote = (list: QuoteItem[], excludeId?: number): QuoteItem | null => {
  if (!list.length) return null;
  if (list.length === 1) return list[0];
  let pick = list[Math.floor(Math.random() * list.length)];
  let attempts = 0;
  while (pick.id === excludeId && attempts < 10) {
    pick = list[Math.floor(Math.random() * list.length)];
    attempts++;
  }
  return pick;
};

export const getRandomImage = (list: ImageItem[], excludeId?: number): ImageItem | null => {
  if (!list.length) return null;
  if (list.length === 1) return list[0];
  let pick = list[Math.floor(Math.random() * list.length)];
  let attempts = 0;
  while (pick.id === excludeId && attempts < 10) {
    pick = list[Math.floor(Math.random() * list.length)];
    attempts++;
  }
  return pick;
};