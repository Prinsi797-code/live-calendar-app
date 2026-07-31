// services/DevHelpers.ts
// This file contains helper functions for development/testing

import AsyncStorage from '@react-native-async-storage/async-storage';
import LocationService from './LocationService';
import OnboardingService from './OnboardingService';

class DevHelpers {
  /**
   * Reset entire app to first-time state
   */
  async resetToFirstTime(): Promise<void> {
    try {
      console.log('Resetting app to first-time state...');
      await OnboardingService.resetOnboarding();
      await LocationService.resetLocationFetch();
      await AsyncStorage.removeItem('selectedCountry');
      
      await AsyncStorage.removeItem('firstDayOfWeek');
      
      console.log('App reset complete! Restart the app to see first-time flow.');
    } catch (error) {
      console.error('Error resetting app:', error);
    }
  }

  /**
   * Complete onboarding manually (to skip language screen)
   */
  async completeOnboardingManually(): Promise<void> {
    try {
      console.log('Manually completing onboarding...');
      await OnboardingService.completeOnboarding();
      await OnboardingService.saveLanguage('en');
      console.log('Onboarding completed! Restart the app.');
    } catch (error) {
      console.error('Error completing onboarding:', error);
    }
  }

  /**
   * Check current app state
   */
  async checkAppState(): Promise<void> {
    try {
      console.log('===== Current App State =====');
      
      const onboardingCompleted = await OnboardingService.isOnboardingCompleted();
      console.log('Onboarding completed:', onboardingCompleted);

      const language = await OnboardingService.getLanguage();
      console.log('Saved language:', language);
      
      const locationFetched = await LocationService.hasLocationBeenFetched();
      console.log('Location fetched:', locationFetched);
      
      const country = await LocationService.getSelectedCountry();
      console.log('Selected country:', country);

      const firstDay = await AsyncStorage.getItem('firstDayOfWeek');
      console.log('First day of week:', firstDay);

      console.log('===========================');
    } catch (error) {
      console.error('Error checking app state:', error);
    }
  }

  /**
   * Clear all AsyncStorage (nuclear option)
   */
  async clearAllStorage(): Promise<void> {
    try {
      console.log('Clearing ALL AsyncStorage...');
      await AsyncStorage.clear();
      console.log('All storage cleared! Restart the app.');
    } catch (error) {
      console.error('Error clearing storage:', error);
    }
  }

  /**
   * Set specific country
   */
  async setCountry(countryName: string): Promise<void> {
    try {
      console.log('Setting country to:', countryName);
      await AsyncStorage.setItem('selectedCountry', countryName);
      await AsyncStorage.setItem('locationFetched', 'true');
      console.log('Country set!');
    } catch (error) {
      console.error('Error setting country:', error);
    }
  }
}

export default new DevHelpers();
