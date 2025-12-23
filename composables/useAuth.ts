import {
  signInAnonymously,
  onAuthStateChanged,
  type Auth,
  type User
} from 'firebase/auth'
import { ensureUserDocument } from '~/utils/firestore'

// Global auth state
const currentUser = ref<User | null>(null)
const isAuthReady = ref(false)
const authError = ref<string | null>(null)

export function useAuth() {
  const { $auth, $db } = useNuxtApp()

  // Initialize auth state listener (only once)
  const initAuthListener = () => {
    if (!$auth) {
      console.warn('Firebase Auth not initialized')
      isAuthReady.value = true
      return
    }

    onAuthStateChanged($auth as Auth, async (user) => {
      // If we detect an anonymous user, sign them out immediately
      // We no longer use anonymous auth - users must sign in with Google
      if (user?.isAnonymous) {
        console.warn('[Auth] Anonymous user detected - signing out')
        try {
          const { signOut } = await import('firebase/auth')
          await signOut($auth as Auth)
          currentUser.value = null
        } catch (error) {
          console.error('[Auth] Failed to sign out anonymous user:', error)
        }
        isAuthReady.value = true
        return
      }

      currentUser.value = user
      isAuthReady.value = true

      // Note: User document creation is now handled by the syncUserData Cloud Function
      // called immediately after sign-in in useFirebaseAuth.ts
      // This ensures we get the full user profile from Google's provider data
    })
  }

  // Sign in anonymously
  const signInAnonymous = async () => {
    if (!$auth) {
      throw new Error('Firebase Auth not initialized')
    }

    // If already authenticated, return current user
    if (currentUser.value) {
      return currentUser.value
    }

    try {
      authError.value = null
      const credential = await signInAnonymously($auth as Auth)

      // Create user document in Firestore
      if ($db && credential.user) {
        try {
          await createUser($db, credential.user.uid, true)
        } catch (error) {
          // User might already exist, that's okay
          console.log('User document may already exist:', error)
        }
      }

      return credential.user
    } catch (error: any) {
      authError.value = error.message
      console.error('Anonymous sign-in failed:', error)
      throw error
    }
  }

  // Ensure user is authenticated (sign in anonymously if not)
  const ensureAuth = async () => {
    if (currentUser.value) {
      return currentUser.value
    }

    return await signInAnonymous()
  }

  // Wait for auth to be ready
  const waitForAuth = () => {
    return new Promise<User | null>((resolve) => {
      if (isAuthReady.value) {
        resolve(currentUser.value)
        return
      }

      const unwatch = watch(isAuthReady, (ready) => {
        if (ready) {
          unwatch()
          resolve(currentUser.value)
        }
      })
    })
  }

  return {
    currentUser: readonly(currentUser),
    isAuthReady: readonly(isAuthReady),
    authError: readonly(authError),
    initAuthListener,
    signInAnonymous,
    ensureAuth,
    waitForAuth
  }
}
