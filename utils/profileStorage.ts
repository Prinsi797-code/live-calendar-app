import AsyncStorage from '@react-native-async-storage/async-storage';

export interface UserProfile {
  name: string;
  photoUri: string | null;
}

const PROFILE_KEY = 'userProfile';

export const getProfile = async (): Promise<UserProfile> => {
  try {
    const raw = await AsyncStorage.getItem(PROFILE_KEY);
    return raw ? JSON.parse(raw) : { name: '', photoUri: null };
  } catch (error) {
    console.log('Error loading profile:', error);
    return { name: '', photoUri: null };
  }
};

export const saveProfile = async (profile: UserProfile): Promise<void> => {
  try {
    await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  } catch (error) {
    console.log('Error saving profile:', error);
  }
};