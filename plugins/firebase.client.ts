import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getFunctions } from 'firebase/functions'

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()

  const firebaseConfig = {
    apiKey: config.public.firebaseApiKey,
    authDomain: config.public.firebaseAuthDomain,
    projectId: config.public.firebaseProjectId,
    storageBucket: config.public.firebaseStorageBucket,
    messagingSenderId: config.public.firebaseMessagingSenderId,
    appId: config.public.firebaseAppId
  }

  // Check if config is valid (at least apiKey)
  if (!firebaseConfig.apiKey || firebaseConfig.apiKey === 'xxx') {
    console.warn('[Firebase] Config missing or invalid. Skipping initialization.')
    return {
      provide: {
        firebase: null,
        auth: null,
        db: null,
        firestore: null,
        functions: null
      }
    }
  }

  try {
    const app = initializeApp(firebaseConfig)
    const auth = getAuth(app)
    const db = getFirestore(app)
    const functions = getFunctions(app)

    console.log('[Firebase] Initialized successfully', {
      projectId: firebaseConfig.projectId,
      hasAuth: !!auth,
      hasDb: !!db,
      hasFunctions: !!functions
    })

    return {
      provide: {
        firebase: app,
        auth,
        db,
        firestore: db, // Provide as both $db and $firestore for consistency
        functions
      }
    }
  } catch (e) {
    console.error('[Firebase] Initialization failed:', e)
    return {
      provide: {
        firebase: null,
        auth: null,
        db: null,
        firestore: null,
        functions: null
      }
    }
  }
})
