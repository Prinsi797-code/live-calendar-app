import AsyncStorage from '@react-native-async-storage/async-storage';

const ONBOARDING_COMPLETED_KEY = 'onboardingCompleted';
const LANGUAGE_SELECTED_KEY = 'languageSelected';

class OnboardingService {
  /**
   * Check if user has completed onboarding (language selection)
   */
  async isOnboardingCompleted(): Promise<boolean> {
    try {
      const completed = await AsyncStorage.getItem(ONBOARDING_COMPLETED_KEY);
      return completed === 'true';
    } catch (error) {
      console.error('Error checking onboarding status:', error);
      return false;
    }
  }

  /**
   * Mark onboarding as completed
   */
  async completeOnboarding(): Promise<void> {
    try {
      await AsyncStorage.setItem(ONBOARDING_COMPLETED_KEY, 'true');
      console.log('✅ Onboarding completed');
    } catch (error) {
      console.error('Error completing onboarding:', error);
    }
  }

  /**
   * Save selected language
   */
  async saveLanguage(language: string): Promise<void> {
    try {
      await AsyncStorage.setItem(LANGUAGE_SELECTED_KEY, language);
      console.log('✅ Language saved:', language);
    } catch (error) {
      console.error('Error saving language:', error);
    }
  }

  /**
   * Get saved language
   */
  async getLanguage(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(LANGUAGE_SELECTED_KEY);
    } catch (error) {
      console.error('Error getting language:', error);
      return null;
    }
  }

  /**
   * Reset onboarding (for testing)
   */
  async resetOnboarding(): Promise<void> {
    try {
      await AsyncStorage.removeItem(ONBOARDING_COMPLETED_KEY);
      await AsyncStorage.removeItem(LANGUAGE_SELECTED_KEY);
      console.log('🔄 Onboarding reset');
    } catch (error) {
      console.error('Error resetting onboarding:', error);
    }
  }
}

export default new OnboardingService();