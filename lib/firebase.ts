import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
// import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
    apiKey: "AIzaSyA_ELKNbb7885De8EkkTEU7doCRTGrqzgo",
    authDomain: "veterinaria-7d0aa.firebaseapp.com",
    projectId: "veterinaria-7d0aa",
    storageBucket: "veterinaria-7d0aa.firebasestorage.app",
    messagingSenderId: "128138844990",
    appId: "1:128138844990:web:e1cc42898acfd25dca2a6f",
    measurementId: "G-B0FKK244HV"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
// const analytics = getAnalytics(app); // Analytics might fail in non-browser envs or if not configured, keeping it optional/commented for now or strictly client-side.

export { db };
