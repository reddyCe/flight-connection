import { ref, watch } from 'vue'
import { doc, onSnapshot } from 'firebase/firestore'
import type { FirestoreUser } from '~/types/firestore'

/**
 * Composable to fetch user profile data from Firestore
 * This is necessary because Firebase Auth's user object doesn't always have displayName/photoURL
 * even when Google provides them. The Cloud Function saves the complete profile to Firestore.
 */

// Global state for user profile from Firestore
const userProfile = ref<FirestoreUser | null>(null)
const isProfileLoading = ref(true)
let unsubscribe: (() => void) | null = null

export function useUserProfile() {
  const { currentUser } = useAuth()
  const { $db } = useNuxtApp()

  // Watch for auth changes and subscribe to user document
  watch(currentUser, (user) => {
    // Clean up previous subscription
    if (unsubscribe) {
      unsubscribe()
      unsubscribe = null
    }

    if (!user || user.isAnonymous) {
      userProfile.value = null
      isProfileLoading.value = false
      return
    }

    if (!$db) {
      console.warn('[UserProfile] Firestore not initialized')
      isProfileLoading.value = false
      return
    }

    // Subscribe to user document in Firestore
    isProfileLoading.value = true
    const userRef = doc($db, 'users', user.uid)

    unsubscribe = onSnapshot(userRef, (snapshot) => {
      if (snapshot.exists()) {
        userProfile.value = snapshot.data() as FirestoreUser
        console.log('[UserProfile] User profile loaded from Firestore:', {
          displayName: userProfile.value.displayName,
          hasPhoto: !!userProfile.value.photoURL,
          email: userProfile.value.email
        })
      } else {
        console.warn('[UserProfile] User document does not exist in Firestore')
        userProfile.value = null
      }
      isProfileLoading.value = false
    }, (error) => {
      console.error('[UserProfile] Error fetching user document:', error)
      isProfileLoading.value = false
    })
  }, { immediate: true })

  return {
    userProfile: readonly(userProfile),
    isProfileLoading: readonly(isProfileLoading)
  }
}
