import {
  GoogleAuthProvider,
  signInWithPopup,
  linkWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User
} from 'firebase/auth'
import { httpsCallable } from 'firebase/functions'
import { ensureUserDocument } from '~/utils/firestore'

// Helper function to parse displayName into first and last name
function parseDisplayName(displayName: string | null): { firstName?: string; lastName?: string } {
  if (!displayName) return {}

  const parts = displayName.trim().split(/\s+/)
  if (parts.length === 0) return {}
  if (parts.length === 1) return { firstName: parts[0] }

  // Take first part as firstName, rest as lastName
  const firstName = parts[0]
  const lastName = parts.slice(1).join(' ')

  return { firstName, lastName }
}

export function useFirebaseAuth() {
  const { $auth, $db, $functions } = useNuxtApp()
  const user = ref<User | null>(null)
  const loading = ref(true)

  const signInWithGoogle = async () => {
    if (!$auth) {
      console.error('[GoogleAuth] Firebase Auth not initialized')
      throw new Error('Firebase Auth not initialized')
    }

    if (!$functions) {
      console.error('[GoogleAuth] Firebase Functions not initialized')
      throw new Error('Firebase Functions not initialized')
    }

    const provider = new GoogleAuthProvider()
    // Request profile and email scopes explicitly
    provider.addScope('profile')
    provider.addScope('email')

    try {
      console.log('[GoogleAuth] Starting Google sign-in...')
      const result = await signInWithPopup($auth, provider)

      console.log('[GoogleAuth] Sign-in successful!', {
        uid: result.user.uid,
        email: result.user.email,
        displayName: result.user.displayName,
        photoURL: result.user.photoURL,
        emailVerified: result.user.emailVerified,
        isAnonymous: result.user.isAnonymous,
        metadata: result.user.metadata
      })

      // Call Cloud Function to get full user data from Google
      // The Admin SDK can access the full provider data that the client SDK can't
      try {
        console.log('[GoogleAuth] Calling syncUserData Cloud Function to get full profile...')
        const syncUserDataFn = httpsCallable($functions, 'syncUserData')
        const syncResult = await syncUserDataFn({})

        console.log('[GoogleAuth] User data synced from Cloud Function:', syncResult.data)
      } catch (error) {
        console.error('[GoogleAuth] Failed to sync user data from Cloud Function:', error)
        // Fallback: Still try to create user doc with whatever data we have
        if ($db && result.user) {
          try {
            const { firstName, lastName } = parseDisplayName(result.user.displayName)
            console.log('[GoogleAuth] Falling back to client-side user creation')
            await ensureUserDocument($db, result.user.uid, {
              isAnonymous: false,
              email: result.user.email,
              displayName: result.user.displayName,
              firstName,
              lastName,
              photoURL: result.user.photoURL,
              linkedProvider: 'google.com'
            })
          } catch (fallbackError) {
            console.error('[GoogleAuth] Fallback user creation also failed:', fallbackError)
          }
        }
      }

      return result.user
    } catch (error: any) {
      console.error('[GoogleAuth] Sign-in error:', error)
      console.error('[GoogleAuth] Error code:', error.code)
      console.error('[GoogleAuth] Error message:', error.message)
      throw error
    }
  }

  // Link anonymous account to Google account
  const linkGoogleAccount = async () => {
    if (!$auth || !$auth.currentUser) {
      throw new Error('No user to upgrade')
    }

    if (!$functions) {
      throw new Error('Firebase Functions not initialized')
    }

    const currentUser = $auth.currentUser
    const provider = new GoogleAuthProvider()
    // Request profile and email scopes explicitly
    provider.addScope('profile')
    provider.addScope('email')

    try {
      console.log('[GoogleAuth] Linking anonymous account to Google...', {
        anonymousUid: currentUser.uid
      })

      // Link credential to existing anonymous account
      const result = await linkWithPopup(currentUser, provider)

      console.log('[GoogleAuth] Account linked successfully!', {
        uid: result.user.uid,
        email: result.user.email,
        displayName: result.user.displayName,
        photoURL: result.user.photoURL,
        isAnonymous: result.user.isAnonymous
      })

      // Call Cloud Function to get full user data from Google
      try {
        console.log('[GoogleAuth] Calling syncUserData Cloud Function after linking...')
        const syncUserDataFn = httpsCallable($functions, 'syncUserData')
        const syncResult = await syncUserDataFn({})

        console.log('[GoogleAuth] User data synced from Cloud Function after linking:', syncResult.data)
      } catch (error) {
        console.error('[GoogleAuth] Failed to sync user data from Cloud Function:', error)
        // Fallback
        if ($db && result.user) {
          try {
            const { firstName, lastName } = parseDisplayName(result.user.displayName)
            console.log('[GoogleAuth] Falling back to client-side user update after linking')
            await ensureUserDocument($db, result.user.uid, {
              linkedProvider: 'google.com',
              isAnonymous: false,
              email: result.user.email,
              displayName: result.user.displayName,
              firstName,
              lastName,
              photoURL: result.user.photoURL
            })
          } catch (fallbackError) {
            console.error('[GoogleAuth] Fallback user update also failed:', fallbackError)
          }
        }
      }

      return result.user
    } catch (error: any) {
      if (error.code === 'auth/credential-already-in-use') {
        console.log('[GoogleAuth] Credential already in use - signing in with existing account instead')

        // The Google account already exists, so sign out anonymous and sign in with Google
        try {
          await firebaseSignOut($auth)
          console.log('[GoogleAuth] Signed out anonymous user')

          // Sign in with the existing Google account
          const signInResult = await signInWithPopup($auth, provider)
          console.log('[GoogleAuth] Signed in with existing Google account:', {
            uid: signInResult.user.uid,
            email: signInResult.user.email,
            displayName: signInResult.user.displayName
          })

          return signInResult.user
        } catch (signInError) {
          console.error('[GoogleAuth] Failed to sign in with existing account:', signInError)
          throw new Error('Failed to sign in with existing Google account')
        }
      }
      console.error('[GoogleAuth] Account linking error:', error)
      console.error('[GoogleAuth] Error code:', error.code)
      throw error
    }
  }

  const signOutUser = async () => {
    if (!$auth) return
    try {
      await firebaseSignOut($auth)
    } catch (error) {
      console.error('Sign Out Error:', error)
    }
  }

  onMounted(() => {
    if ($auth) {
      const unsubscribe = onAuthStateChanged($auth, (firebaseUser) => {
        user.value = firebaseUser
        loading.value = false
      })

      // Cleanup subscription on unmount
      onUnmounted(() => unsubscribe())
    } else {
      loading.value = false
    }
  })

  return {
    user,
    loading,
    signInWithGoogle,
    linkGoogleAccount,
    signOut: signOutUser
  }
}
