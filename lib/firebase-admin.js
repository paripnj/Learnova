import admin from "firebase-admin";

let firebaseInitialized = false;
let initializationError = null;

const initializeFirebase = () => {
  // Already initialized
  if (firebaseInitialized && admin.apps.length) {
    return;
  }

  // Prevent repeated failed initialization attempts
  if (initializationError) {
    throw initializationError;
  }

  try {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

    // Validate required env variables
    if (!projectId || !privateKey || !clientEmail) {
      throw new Error("Missing Firebase Admin environment variables");
    }

    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        privateKey,
        clientEmail,
      }),
    });

    firebaseInitialized = true;

    console.log("Firebase Admin initialized successfully");
  } catch (error) {
    // Firebase initialization error
  }
};

/**
 * Verifies a Firebase ID token using the Firebase Admin SDK.
 * @param {string} token - The Firebase ID token string to verify.
 * @returns {Promise<Object|null>} The decoded token payload if valid, or null if verification fails.
 * @example
 * const decoded = await verifyFirebaseToken(idToken);
 * if (decoded) return decoded.uid;
 */
export const verifyFirebaseToken = async (token) => {
  try {
    initializeFirebase();

    const decodedToken = await admin.auth().verifyIdToken(token);

    return {
      valid: true,
      decodedToken,
    };
  } catch (error) {
    return null;
  }
};

export const getUserProfile = async (uid) => {
  try {
    initializeFirebase();

    const userDoc = await admin
      .firestore()
      .collection("users")
      .doc(uid)
      .get();

    if (!userDoc.exists) return null;

    return userDoc.data();
  } catch (error) {
    return null;
  }
};
