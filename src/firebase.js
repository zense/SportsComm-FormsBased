import { initializeApp } from "firebase/app";
import { getAuth, signInWithPopup, OAuthProvider, setPersistence, browserLocalPersistence, signOut } from "firebase/auth";

// Firebase config
const firebaseConfig = {
  apiKey: process.env.REACT_APP_API_KEY,
  authDomain: process.env.REACT_APP_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_PROJECT_ID,
  storageBucket: process.env.REACT_APP_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_APP_ID,
  measurementId: process.env.REACT_APP_MEASUREMENT_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Persist tokens across refresh
setPersistence(auth, browserLocalPersistence).catch(console.error);

// Microsoft OAuth provider
const microsoftProvider = new OAuthProvider("microsoft.com");
microsoftProvider.addScope("User.Read");
microsoftProvider.addScope("Files.Read");
microsoftProvider.addScope("Sites.Read.All");
microsoftProvider.setCustomParameters({ prompt: "select_account" });

// Sign in function
const signInWithMicrosoft = async () => {
  try {
    const result = await signInWithPopup(auth, microsoftProvider);
    const credential = OAuthProvider.credentialFromResult(result);
    const accessToken = credential?.accessToken;
    if (!accessToken) throw new Error("No Microsoft access token");

    // Store token
    sessionStorage.setItem("accessToken", accessToken);
    return { user: result.user, accessToken };
  } catch (err) {
    console.error("Microsoft login error:", err);
    throw err;
  }
};

// Logout function
const logout = async () => {
  await signOut(auth);
  sessionStorage.removeItem("accessToken");
};

export { auth, signInWithMicrosoft, logout };
