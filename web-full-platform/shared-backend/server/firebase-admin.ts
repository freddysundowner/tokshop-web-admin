import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

// Initialize Firebase Admin SDK
let adminApp;
try {
  // Check if Firebase Admin is already initialized
  const existingApps = getApps();
  if (existingApps.length === 0) {
    // Initialize using service account if available, or application default credentials
    const firebaseConfig = {
      projectId: process.env.VITE_FIREBASE_PROJECT_ID,
    };
    
    // For production, you would use a service account key
    // For development with Replit, we can use the project ID for basic operations
    adminApp = initializeApp(firebaseConfig);
  } else {
    adminApp = existingApps[0];
  }
} catch (error) {
  console.error('Firebase Admin initialization error:', error);
  // Initialize minimal config for development
  adminApp = initializeApp({
    projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  });
}

export const adminAuth = getAuth(adminApp);

// Verify Firebase ID token
export async function verifyFirebaseToken(idToken: string) {
  try {
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    return {
      success: true,
      uid: decodedToken.uid,
      email: decodedToken.email,
      provider: decodedToken.firebase.sign_in_provider,
      emailVerified: decodedToken.email_verified,
      name: decodedToken.name,
      picture: decodedToken.picture,
    };
  } catch (error) {
    console.error('Firebase token verification failed:', error);
    return {
      success: false,
      error: 'Invalid or expired Firebase token',
    };
  }
}