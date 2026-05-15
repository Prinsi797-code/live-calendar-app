import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import PurchaseManager from '../services/purchaseManager';

export function useTrial() {
  const [trialActive, setTrialActive] = useState(false);
  const [remainingDays, setRemainingDays] = useState(0);
  const [loading, setLoading] = useState(true);
  const [trialExpiredAndNotPremium, setTrialExpiredAndNotPremium] = useState(false);

  const checkTrial = useCallback(async () => {
    try {
      const isPremium = await PurchaseManager.isPremium();

      if (isPremium) {
        // Premium ya Apple trial active hai
        setTrialActive(false);
        setTrialExpiredAndNotPremium(false);
        setLoading(false);
        return;
      }

      setTrialActive(false);
      setTrialExpiredAndNotPremium(true);
    } catch {
      setTrialActive(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkTrial();
  }, []);

  // Premium nahi hai toh PremiumScreen open karo
  useEffect(() => {
    if (!loading && trialExpiredAndNotPremium) {
      const timer = setTimeout(() => {
        router.push('/PremiumScreen');
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [loading, trialExpiredAndNotPremium]);

  return { trialActive: false, remainingDays: 0, loading, refresh: checkTrial };
}