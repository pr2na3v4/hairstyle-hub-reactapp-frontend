import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { 
    getAuth, 
    GoogleAuthProvider, 
    signInWithPopup, 
    signOut, 
    onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

// 1. Firebase Configuration (FIXED KEYS)
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// 2. Initialize
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// Global Bridge
window.firebaseAuth = auth; 

/**
 * LOGIN FUNCTION
 */
export const googleLogin = async () => {
    console.log("🔑 Attempting Google Login...");
    try {
        const result = await signInWithPopup(auth, provider);
        const user = result.user;
        const token = await user.getIdToken();

        console.log("✅ Firebase Auth Success. Syncing with MongoDB...");

        // 1. Start the Sync (but don't let it block the redirect if it's slow)
        try {
            await fetch(`${API_BASE_URL}/users/sync`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    displayName: user.displayName,
                    photoURL: user.photoURL,
                    email: user.email
                })
            });
        } catch (syncErr) {
            console.error("⚠️ MongoDB Sync failed, but proceeding to profile:", syncErr);
        }

        // 2. IMMEDIATE REDIRECT
        console.log("🚀 Redirecting to profile...");
        window.location.assign("../profile/profile.html");

    } catch (err) {
        console.error("❌ Login Error:", err.code);
        alert("Login failed: " + err.message);
    }
};
/**
 * LOGOUT FUNCTION
 */
export const googleLogout = async () => {
    try {
        await signOut(auth);
        localStorage.clear(); // Clear all backup data
        console.log("👋 Logged out");
    } catch (err) {
        console.error("❌ Logout Error:", err);
    }
};

// Bind functions to window so HTML onclick works
window.googleLogin = googleLogin;
window.googleLogout = googleLogout;

/**
 * AUTH OBSERVER
 */
onAuthStateChanged(auth, (user) => {
    window.currentUser = user || null;
    
    // 1. Target existing elements ONLY
    const loginBtn = document.getElementById("googleLoginBtn");
    const avatarDiv = document.querySelector(".user-avatar");
    const nameEl = document.querySelector(".user-name");

    // ✅ SAFETY CHECK: If user exists, show profile info
    if (user) {
        if (loginBtn) loginBtn.style.display = "none";
        
        if (avatarDiv) {
            avatarDiv.style.display = "block";
            // Check if there is already an image, if not, create one
            let img = avatarDiv.querySelector('img');
            if (!img) {
                avatarDiv.innerHTML = `<a href="../profile/profile.html"><img src="${user.photoURL || ''}" class="nav-img" style="width:35px; border-radius:50%;"></a>`;
            } else {
                img.src = user.photoURL || '';
            }
        }
        
        if (nameEl) {
            nameEl.style.display = "block";
            nameEl.textContent = user.displayName ? user.displayName.split(' ')[0] : 'User';
        }

        console.log("👤 User Logged In:", user.displayName);

    } else {
        // ❌ NO USER: Safely reset elements without reading properties of null
        if (loginBtn) loginBtn.style.display = "flex";
        
        if (avatarDiv) {
            avatarDiv.style.display = "none";
            avatarDiv.innerHTML = "";
        }
        
        if (nameEl) {
            nameEl.style.display = "none";
            nameEl.textContent = "";
        }

        console.log("👤 User Logged Out");
    }

    // Notify other scripts
    window.dispatchEvent(new CustomEvent('authChanged', { detail: user }));
});
