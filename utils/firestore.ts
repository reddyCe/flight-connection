import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  serverTimestamp,
  Timestamp,
  type Firestore
} from 'firebase/firestore'
import type { FirestoreUser } from '~/types/firestore'

// Convert Firestore Timestamp to JavaScript Date
export function timestampToDate(timestamp: Timestamp | undefined): Date | undefined {
  return timestamp ? timestamp.toDate() : undefined
}

// Convert JavaScript Date to Firestore Timestamp
export function dateToTimestamp(date: Date): Timestamp {
  return Timestamp.fromDate(date)
}

// Get server timestamp for Firestore
export function getServerTimestamp() {
  return serverTimestamp()
}

// User document helpers

/**
 * Centralized user creation/update with retry logic
 * This ensures user documents are created reliably even with network issues
 */
export async function ensureUserDocument(
  db: Firestore,
  userId: string,
  userData: {
    email?: string | null
    displayName?: string | null
    firstName?: string
    lastName?: string
    photoURL?: string | null
    isAnonymous: boolean
    linkedProvider?: string
  }
) {
  const userRef = doc(db, 'users', userId)

  // Remove undefined values (Firestore doesn't accept them)
  const cleanUserData = Object.fromEntries(
    Object.entries(userData).filter(([_, value]) => value !== undefined)
  )

  // Retry logic with exponential backoff
  const maxRetries = 3
  let retryCount = 0
  let success = false

  while (retryCount < maxRetries && !success) {
    try {
      const docSnap = await getDoc(userRef)

      // Always use setDoc with merge to avoid overwriting existing good data
      await setDoc(userRef, {
        ...cleanUserData,
        lastActiveAt: serverTimestamp(),
        ...(docSnap.exists() ? {} : { createdAt: serverTimestamp() })
      }, { merge: true })

      success = true
      return userRef
    } catch (error: any) {
      retryCount++
      console.error(`[Firestore] Failed to save user document (attempt ${retryCount}/${maxRetries}):`, error)

      if (retryCount < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 500 * retryCount))
      } else {
        throw new Error(`Failed to create user document after ${maxRetries} attempts: ${error?.message}`)
      }
    }
  }

  return userRef
}

// Legacy function for backwards compatibility - redirects to ensureUserDocument
export async function createUser(db: Firestore, userId: string, isAnonymous: boolean) {
  return ensureUserDocument(db, userId, { isAnonymous })
}

export async function updateUserActivity(db: Firestore, userId: string) {
  const userRef = doc(db, 'users', userId)

  try {
    await updateDoc(userRef, {
      lastActiveAt: serverTimestamp()
    })
  } catch (error: any) {
    if (error.code !== 'not-found') {
      throw error
    }
  }
}

export async function getUser(db: Firestore, userId: string): Promise<FirestoreUser | null> {
  const userRef = doc(db, 'users', userId)
  const userSnap = await getDoc(userRef)
  return userSnap.exists() ? userSnap.data() as FirestoreUser : null
}