import AsyncStorage from '@react-native-async-storage/async-storage';

const LOCATION_API_URL = 'https://ipapi.co/json/';
const LOCATION_FETCHED_KEY = 'locationFetched';
const SELECTED_COUNTRY_KEY = 'selectedCountry';
const FETCH_TIMEOUT = 5000;

const COUNTRY_NAME_MAP: Record<string, string> = {
  'Afghanistan': 'Afghanistan',
  'Albania': 'Albania',
  'Algeria': 'Algeria',
  'Angola': 'Angola',
  'Andorra': 'Andorra',
  'Anguilla': 'Anguilla',
  'Argentina': 'Argentina',
  'Australia': 'Australia',
  'Bahamas': 'Bahamas',
  'Bangladesh': 'Bangladesh',
  'Barbados': 'Barbados',
  'Belarus': 'Belarus',
  'Belgium': 'Belgium',
  'Belize': 'Belize',
  'Benin': 'Benin',
  'Bermuda': 'Bermuda',
  'Bhutan': 'Bhutan',
  'Bolivia': 'Bolivia',
  'Botswana': 'Botswana',
  'Brazil': 'Brazil',
  'Bulgaria': 'Bulgaria',
  'Burundi': 'Burundi',
  'Cambodia': 'Cambodia',
  'Cameroon': 'Cameroon',
  'India': 'India',
  'United States': 'United States',
  'United Kingdom': 'United Kingdom',
  'South Korea': 'South Korea',
  'United Arab Emirates': 'United Arab Emirates',
  'Venezuela': 'Venezuela',
  'Vietnam': 'Vietnam',
  'Yemen': 'Yemen',
  'Zambia': 'Zambia',
  'Zimbabwe': 'Zimbabwe',
};

class LocationService {
  async fetchAndSaveUserCountry(): Promise<string | null> {
    try {
      const alreadyFetched = await AsyncStorage.getItem(LOCATION_FETCHED_KEY);
      if (alreadyFetched === 'true') {
        console.log('📍 Location already fetched, skipping...');
        return null;
      }

      console.log('🌍 Fetching user location...');

      const fetchPromise = fetch(LOCATION_API_URL, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      const timeoutPromise = new Promise<Response>((_, reject) =>
        setTimeout(() => reject(new Error('Location fetch timeout')), FETCH_TIMEOUT)
      );

      const response = await Promise.race([fetchPromise, timeoutPromise]);

      if (!response.ok) {
        throw new Error('Failed to fetch location');
      }

      const data = await response.json();

      if (data.country_name) {
        const detectedCountry = data.country_name;

        console.log('Detected country:', detectedCountry);

        const mappedCountry = COUNTRY_NAME_MAP[detectedCountry] || detectedCountry;

        await this.saveCountryWithTimeout(mappedCountry);
        await AsyncStorage.setItem(LOCATION_FETCHED_KEY, 'true');

        return mappedCountry;
      } else {
        await this.setDefaultCountry();
        return 'United Kingdom';
      }
    } catch (error) {
      console.error('Error fetching location:', error);
      await this.setDefaultCountry();
      return 'United Kingdom';
    }
  }

  private async saveCountryWithTimeout(country: string): Promise<void> {
    const savePromise = AsyncStorage.setItem(SELECTED_COUNTRY_KEY, country);
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Save timeout')), 2000)
    );

    try {
      await Promise.race([savePromise, timeoutPromise]);
    } catch (error) {
      console.error('Error saving country with timeout:', error);
      throw error;
    }
  }

  async setDefaultCountry(): Promise<void> {
    try {
      await this.saveCountryWithTimeout('United Kingdom');
      await AsyncStorage.setItem(LOCATION_FETCHED_KEY, 'true');
      console.log('📍 Set default country: United Kingdom');
    } catch (error) {
      console.error('Error setting default country:', error);
    }
  }

  async getSelectedCountry(): Promise<string> {
    try {
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Get timeout')), 2000)
      );
      const getPromise = AsyncStorage.getItem(SELECTED_COUNTRY_KEY);

      const country = await Promise.race([getPromise, timeoutPromise]) as string | null;
      return country || 'United Kingdom';
    } catch (error) {
      console.error('Error getting selected country:', error);
      return 'United Kingdom';
    }
  }

  async resetLocationFetch(): Promise<void> {
    try {
      await AsyncStorage.removeItem(LOCATION_FETCHED_KEY);
      console.log('Location fetch flag reset');
    } catch (error) {
      console.error('Error resetting location fetch:', error);
    }
  }

  async hasLocationBeenFetched(): Promise<boolean> {
    try {
      const fetched = await AsyncStorage.getItem(LOCATION_FETCHED_KEY);
      return fetched === 'true';
    } catch (error) {
      return false;
    }
  }
}

export default new LocationService();