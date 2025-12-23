import type { Timestamp } from 'firebase/firestore'

// User document in Firestore
export interface FirestoreUser {
  email?: string
  displayName?: string
  firstName?: string
  lastName?: string
  photoURL?: string
  isAnonymous: boolean
  linkedProvider?: 'google.com'
  linkedAt?: Timestamp
  createdAt: Timestamp
  lastActiveAt: Timestamp
}