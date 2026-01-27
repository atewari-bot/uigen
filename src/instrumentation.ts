// Fix for Node.js 22+ experimental localStorage that breaks when --localstorage-file is not properly configured
// This needs to run synchronously before any other code

// Immediately fix broken localStorage
if (typeof globalThis.localStorage !== "undefined") {
  try {
    // Test if localStorage methods work
    if (typeof globalThis.localStorage.getItem !== "function") {
      // @ts-ignore - localStorage exists but is broken, remove it
      delete globalThis.localStorage;
    }
  } catch {
    // @ts-ignore - localStorage is broken, remove it
    delete globalThis.localStorage;
  }
}

export async function register() {
  // Additional async setup if needed
}
