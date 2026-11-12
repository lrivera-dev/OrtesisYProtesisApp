import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";

import {
    getAuth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

import {
    getFirestore,
    doc,
    setDoc,
    getDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

import { getStorage } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-storage.js";

const firebaseConfig = {
    apiKey: "AIzaSyDJrG9cSsMGl-hKrO8Wmxixs3N5C8mM-AM",
    authDomain: "ortesisyprotesis.firebaseapp.com",
    projectId: "ortesisyprotesis",
    storageBucket: "ortesisyprotesis.firebasestorage.app",
    messagingSenderId: "601750351119",
    appId: "1:601750351119:web:d31607fe4dcdf05d0d627a"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export async function registerUser({ nombre, apellido, email, password }) {
    const credential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
    );

    const user = credential.user;

    const profile = {
        nombre,
        apellido,
        email,
        role: "cliente",
        createdAt: serverTimestamp()
    };

    await setDoc(doc(db, "usuarios", user.uid), profile);

    return { user, profile };
}

export async function loginUser(email, password) {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    const user = credential.user;

    const profileSnapshot = await getDoc(doc(db, "usuarios", user.uid));

    if (!profileSnapshot.exists()) {
        throw new Error("La cuenta no tiene un perfil registrado.");
    }

    return {
        user,
        profile: profileSnapshot.data()
    };
}

export function logoutUser() {
    return signOut(auth);
}

export function observeAuth(callback) {
    return onAuthStateChanged(auth, callback);
}