import AsyncStorage from '@react-native-async-storage/async-storage';

export interface MoodEntry {
  date: string; // YYYY-MM-DD
  mood: string; // one of MOOD_OPTIONS[].key
  reason?: string;
}

const STORAGE_KEY = 'moodEntries';

export const getAllMoodEntries = async (): Promise<Record<string, MoodEntry>> => {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (error) {
    console.log('Error loading mood entries:', error);
    return {};
  }
};

export const getMoodEntry = async (date: string): Promise<MoodEntry | null> => {
  const all = await getAllMoodEntries();
  return all[date] || null;
};

export const saveMoodEntry = async (entry: MoodEntry): Promise<void> => {
  try {
    const all = await getAllMoodEntries();
    all[entry.date] = entry;
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch (error) {
    console.log('Error saving mood entry:', error);
  }
};

export const deleteMoodEntry = async (date: string): Promise<void> => {
  try {
    const all = await getAllMoodEntries();
    delete all[date];
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch (error) {
    console.log('Error deleting mood entry:', error);
  }
};

export const MOOD_OPTIONS = [
  { key: 'awful', label: 'Awful',  image: require('../assets/emoji/awful.png') },
  { key: 'excellent', label: 'Excellent',  image: require('../assets/emoji/excellent.png') },
  { key: 'bad', label: 'Bad', image: require('../assets/emoji/bad.png') },
  { key: 'great', label: 'Great', image: require('../assets/emoji/great.png') },
  { key: 'poor', label: 'Poor', image: require('../assets/emoji/poor.png') },
  { key: 'neutral', label: 'Neutral', image: require('../assets/emoji/neutral.png') },
  { key: 'good', label: 'Good', image: require('../assets/emoji/good.png') },
];