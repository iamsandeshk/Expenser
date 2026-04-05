import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { Capacitor } from '@capacitor/core';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
import {
  browserLocalPersistence,
  getAuth,
  getRedirectResult,
  GoogleAuthProvider,
  indexedDBLocalPersistence,
  initializeAuth,
  onAuthStateChanged,
  setPersistence,
  signInWithCredential,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  type Auth,
  type User,
} from 'firebase/auth';
import { cordovaPopupRedirectResolver } from 'firebase/auth/cordova';

const firebaseConfig = {
  apiKey: 'AIzaSyBJ5SdoLInpi5-PPcqzxWz0UMS1Cq_Ibbg',
  authDomain: 'expensetracker-a2f34.firebaseapp.com',
  projectId: 'expensetracker-a2f34',
  storageBucket: 'expensetracker-a2f34.firebasestorage.app',
  messagingSenderId: '480038500173',
  appId: '1:480038500173:web:390e774d145fd6930a6904',
};

let app: FirebaseApp;
let auth: Auth;
let provider: GoogleAuthProvider;
const isNativePlatform = Capacitor.isNativePlatform();

function ensureFirebase() {
  if (!app) {
    app = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);
    auth = isNativePlatform
      ? initializeAuth(app, {
          persistence: indexedDBLocalPersistence,
          popupRedirectResolver: cordovaPopupRedirectResolver,
        })
      : getAuth(app);

    if (!isNativePlatform) {
      void setPersistence(auth, browserLocalPersistence).catch(() => {
        // Keep default persistence if browser local persistence cannot be set.
      });
    }

    provider = new GoogleAuthProvider();
    provider.addScope('profile');
    provider.addScope('email');
    provider.setCustomParameters({ prompt: 'select_account' });
  }
  return { auth, provider };
}

export function getFirebaseApp() {
  return ensureFirebase().auth.app;
}

export function getFirebaseAuth() {
  return ensureFirebase().auth;
}

export function getCurrentGoogleUser() {
  return ensureFirebase().auth.currentUser;
}

export function getGooglePhotoUrl(user: User | null): string | undefined {
  if (!user) return undefined;
  const direct = user.photoURL?.trim();
  if (direct) return direct;

  const providerPhoto = user.providerData.find((providerUser) => providerUser.providerId === 'google.com')?.photoURL?.trim();
  if (providerPhoto) return providerPhoto;

  return undefined;
}

export function subscribeGoogleAuth(listener: (user: User | null) => void) {
  const { auth: firebaseAuth } = ensureFirebase();

  if (isNativePlatform) {
    void getRedirectResult(firebaseAuth).catch(() => {
      // Redirect result can be empty on initial launch; ignore.
    });
  }

  return onAuthStateChanged(firebaseAuth, listener);
}

export async function signInWithGoogle() {
  const { auth: firebaseAuth, provider: googleProvider } = ensureFirebase();

  if (isNativePlatform) {
    try {
      const nativeResult = await FirebaseAuthentication.signInWithGoogle({
        skipNativeAuth: true,
        useCredentialManager: false,
        scopes: ['profile', 'email'],
      });

      const idToken = nativeResult.credential?.idToken;
      const accessToken = nativeResult.credential?.accessToken;

      if (idToken || accessToken) {
        const credential = GoogleAuthProvider.credential(idToken ?? null, accessToken ?? null);
        const result = await signInWithCredential(firebaseAuth, credential);
        await result.user.reload();
        return result.user;
      }

      const signedInUser = firebaseAuth.currentUser;
      if (signedInUser) {
        await signedInUser.reload();
        return signedInUser;
      }

      throw new Error('Native Google sign-in succeeded but Firebase user was not established. Verify SHA fingerprints and Android OAuth client setup.');
    } catch (error: any) {
      alert(`Native Sign In Error: ${error?.message || error}`);
      
      const redirectResult = await getRedirectResult(firebaseAuth).catch(() => null);
      if (redirectResult?.user) {
        await redirectResult.user.reload();
        return redirectResult.user;
      }

      // Fallback for environments where native Google auth is not configured.
      await signInWithRedirect(firebaseAuth, googleProvider);
      return null;
    }

    return null;
  }

  const result = await signInWithPopup(firebaseAuth, googleProvider);
  await result.user.reload();
  return result.user;
}

export async function signOutGoogle() {
  const { auth: firebaseAuth } = ensureFirebase();

  if (isNativePlatform) {
    await FirebaseAuthentication.signOut().catch(() => {
      // Ignore plugin sign-out failure and continue with Firebase sign-out.
    });
  }

  await signOut(firebaseAuth);
}
