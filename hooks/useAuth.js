import { useState, useEffect } from "react";
import { auth, db } from "@/lib/firebaseConfig";
import { onIdTokenChanged, signOut as firebaseSignOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

/**
 * Cookie utility helpers for writing/deleting client cookies
 */
const setCookie = (name, value, days = 7) => {
  if (typeof window !== "undefined") {
    const expires = new Date();
    expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
    document.cookie = `${name}=${value}; expires=${expires.toUTCString()}; path=/; SameSite=Lax; Secure`;
  }
};

const deleteCookie = (name) => {
  if (typeof window !== "undefined") {
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Lax; Secure`;
  }
};

/**
 * Provides authentication state and user profile information.
 * Tracks Firebase authentication changes and exposes auth-related utilities.
 * @returns {Object} Authentication state, user profile data, loading state, errors, and helper methods.
 */
export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Setup reactive cookie updates based on user and userProfile state
  useEffect(() => {
    const updateCookies = async () => {
      if (user) {
        try {
          const idToken = await user.getIdToken();
          setCookie("authToken", idToken);
          if (userProfile) {
            setCookie("userRole", userProfile.role);
          } else {
            deleteCookie("userRole");
          }
        } catch (err) {
          console.error("Error updating cookies reactively:", err);
        }
      } else {
        deleteCookie("authToken");
        deleteCookie("userRole");
      }
    };

    updateCookies();
  }, [user, userProfile]);

  useEffect(() => {
     if (!auth) {
    setLoading(false);
    return;
  }
    const unsubscribe = onIdTokenChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          // Get user profile from Firestore
          const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));

          if (userDoc.exists()) {
            const profileData = userDoc.data();
            setUser(firebaseUser);
            setUserProfile(profileData);
          } else {
            // User exists in Auth but no profile in Firestore
            setUser(firebaseUser);
            setUserProfile(null);
          }
        } else {
          setUser(null);
          setUserProfile(null);
        }

        setError(null);
      } catch (err) {
        console.error("Auth state change error:", err);
        setError(err.message);
        setUser(null);
        setUserProfile(null);
      } finally {
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  /**
   * Signs out the currently authenticated user and clears local auth state.
   * @returns {Promise<void>} Resolves when the user is successfully signed out.
   */
  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      setUser(null);
      setUserProfile(null);
    } catch (err) {
      console.error("Sign out error:", err);
      setError(err.message);
    }
  };

  return {
    user,
    userProfile,
    loading,
    error,
    signOut,
    isAuthenticated: !!user,
    hasProfile: !!userProfile,
  };
};

