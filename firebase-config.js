// Firebase modüllerini CDN üzerinden çekiyoruz (Node.js gerektirmez)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  query,
  where,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.10.0/firebase-firestore.js";

// Senin Firebase projenin özel kimlik bilgileri
const firebaseConfig = {
  apiKey: "AIzaSyA3nfXsCVbP1IxTEbxBVoYEJf4pQOLg1Vg",
  authDomain: "guyapcekilis.firebaseapp.com",
  projectId: "guyapcekilis",
  storageBucket: "guyapcekilis.firebasestorage.app",
  messagingSenderId: "951263070386",
  appId: "1:951263070386:web:fdbc8760ec80b1501be1ab",
  measurementId: "G-83T8QBRH7N"
};

// Firebase'i başlatıyoruz
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Diğer dosyaların (admin.js, participant.js) veritabanına erişebilmesi için dışarı aktarıyoruz
export {
  db,
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  query,
  where,
  onSnapshot
};
