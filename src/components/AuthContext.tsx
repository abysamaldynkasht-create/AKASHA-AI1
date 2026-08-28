import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth, db, OperationType, handleFirestoreError } from '../lib/firebase';
import { doc, getDoc, setDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { UserProfile, SubscriptionPlanId, UserSubscription } from '../types';
import { DEFAULT_PLANS, isProActive, resolveEffectiveSubscription } from '../lib/subscriptionConfig';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  profile: UserProfile | null;
  isAdmin: boolean;
  isPro: boolean;
  effectivePlan: SubscriptionPlanId;
  usageCount: number;
  usageLimit: number;
  remainingRequests: number;
  imageCount: number;
  imageLimit: number;
  remainingImages: number;
  upgradeSubscription: (planId?: SubscriptionPlanId) => Promise<{ success: boolean; message: string }>;
  cancelSubscription: () => Promise<{ success: boolean; message: string }>;
  incrementUsage: () => Promise<void>;
  incrementImageUsage: (count?: number) => Promise<void>;
  openPricingModal: () => void;
  closePricingModal: () => void;
  isPricingModalOpen: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  profile: null,
  isAdmin: false,
  isPro: false,
  effectivePlan: 'free',
  usageCount: 0,
  usageLimit: 20,
  remainingRequests: 20,
  imageCount: 0,
  imageLimit: 10,
  remainingImages: 10,
  upgradeSubscription: async () => ({ success: false, message: '' }),
  cancelSubscription: async () => ({ success: false, message: '' }),
  incrementUsage: async () => {},
  incrementImageUsage: async () => {},
  openPricingModal: () => {},
  closePricingModal: () => {},
  isPricingModalOpen: false,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isPricingModalOpen, setIsPricingModalOpen] = useState(false);

  const openPricingModal = () => setIsPricingModalOpen(true);
  const closePricingModal = () => setIsPricingModalOpen(false);

  // Compute reactive subscription details
  const subDetails = resolveEffectiveSubscription(profile);
  const isPro = subDetails.isActivePro || isAdmin;
  const effectivePlan = isAdmin && subDetails.effectivePlan === 'free' ? 'pro' : subDetails.effectivePlan;
  const usageLimit = isAdmin ? 10000 : subDetails.usageLimit;
  const usageCount = subDetails.usageCount;
  const remainingRequests = isAdmin ? 9999 : Math.max(0, usageLimit - usageCount);
  
  const imageLimit = isAdmin ? 10000 : subDetails.imageLimit;
  const imageCount = subDetails.imageCount;
  const remainingImages = isAdmin ? 9999 : Math.max(0, imageLimit - imageCount);

  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        setIsAdmin(currentUser.email === 'akashaai249@gmail.com');
        const today = new Date().toISOString().split('T')[0];

        try {
          const userRef = doc(db, 'users', currentUser.uid);
          const userDoc = await getDoc(userRef);

          if (!userDoc.exists()) {
            const initialPlan = DEFAULT_PLANS.free;
            const newProfile: UserProfile = {
              uid: currentUser.uid,
              email: currentUser.email || '',
              displayName: currentUser.displayName || 'User',
              photoURL: currentUser.photoURL || '',
              createdAt: new Date().toISOString(),
              plan: 'free',
              subscription_status: 'none',
              subscription_id: '',
              subscription_start: null,
              subscription_end: null,
              usage_limit: initialPlan.usage_limit,
              usage_count: 0,
              image_limit: initialPlan.image_limit,
              image_count: 0,
              last_reset_date: today,
              cancel_at_period_end: false,
            };
            await setDoc(userRef, newProfile);
            setProfile(newProfile);
          } else {
            const data = userDoc.data() as UserProfile;
            // Check if day changed to reset daily counts
            if (data.last_reset_date !== today) {
              const updatedData: Partial<UserProfile> = {
                usage_count: 0,
                image_count: 0,
                last_reset_date: today,
              };
              await updateDoc(userRef, updatedData);
              setProfile({ ...data, ...updatedData });
            } else {
              setProfile(data);
            }
          }
        } catch (error) {
          console.error("Error creating or fetching profile:", error);
        }

        // Real-time listener for the user document
        unsubscribeProfile = onSnapshot(doc(db, 'users', currentUser.uid), (docSnap) => {
          if (docSnap.exists()) {
            setProfile(docSnap.data() as UserProfile);
          }
        }, (error) => {
          handleFirestoreError(error, OperationType.GET, `users/${currentUser.uid}`);
        });

      } else {
        setProfile(null);
        setIsAdmin(false);
        if (unsubscribeProfile) {
          unsubscribeProfile();
          unsubscribeProfile = null;
        }
      }
      setLoading(false);
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) {
        unsubscribeProfile();
      }
    };
  }, []);

  // Server-verified Upgrade
  const upgradeSubscription = useCallback(async (planId: SubscriptionPlanId = 'pro') => {
    if (!user) {
      return { success: false, message: 'يرجى تسجيل الدخول أولاً للترقية.' };
    }

    try {
      // Call backend API
      const response = await fetch('/api/subscription/upgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.uid,
          planId,
          userEmail: user.email,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to upgrade subscription');
      }

      // Sync updated subscription info to Firestore user document
      if (data.subscription) {
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, {
          ...data.subscription,
          updatedAt: new Date().toISOString(),
        });
      }

      return {
        success: true,
        message: data.message || 'تم تفعيل اشتراك PRO بنجاح!',
      };
    } catch (error: any) {
      console.error('Subscription upgrade failed:', error);
      return {
        success: false,
        message: error.message || 'تعذر إتمام عملية الترقية، يرجى المحاولة لاحقاً.',
      };
    }
  }, [user]);

  // Server-verified Cancel
  const cancelSubscription = useCallback(async () => {
    if (!user) {
      return { success: false, message: 'يرجى تسجيل الدخول أولاً.' };
    }

    try {
      const response = await fetch('/api/subscription/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.uid }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to cancel subscription');
      }

      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        subscription_status: 'cancelled',
        cancel_at_period_end: true,
        updatedAt: new Date().toISOString(),
      });

      return {
        success: true,
        message: data.message || 'تم إلغاء التجديد التلقائي للاشتراك بنجاح.',
      };
    } catch (error: any) {
      console.error('Cancel subscription failed:', error);
      return {
        success: false,
        message: error.message || 'حدث خطأ أثناء إلغاء الاشتراك.',
      };
    }
  }, [user]);

  // Increment Usage locally & in Firestore
  const incrementUsage = useCallback(async () => {
    if (!user || !profile) return;
    const today = new Date().toISOString().split('T')[0];
    const isSameDay = profile.last_reset_date === today;
    const newCount = (isSameDay ? (profile.usage_count || 0) : 0) + 1;

    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        usage_count: newCount,
        last_reset_date: today,
      });
    } catch (error) {
      console.warn("Could not sync usage count to Firestore:", error);
    }
  }, [user, profile]);

  // Increment Image Usage locally & in Firestore
  const incrementImageUsage = useCallback(async (count = 1) => {
    if (!user || !profile || count <= 0) return;
    const today = new Date().toISOString().split('T')[0];
    const isSameDay = profile.last_reset_date === today;
    const newImageCount = (isSameDay ? (profile.image_count || 0) : 0) + count;

    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        image_count: newImageCount,
        last_reset_date: today,
      });
    } catch (error) {
      console.warn("Could not sync image count to Firestore:", error);
    }
  }, [user, profile]);

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      profile,
      isAdmin,
      isPro,
      effectivePlan,
      usageCount,
      usageLimit,
      remainingRequests,
      imageCount,
      imageLimit,
      remainingImages,
      upgradeSubscription,
      cancelSubscription,
      incrementUsage,
      incrementImageUsage,
      openPricingModal,
      closePricingModal,
      isPricingModalOpen,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
