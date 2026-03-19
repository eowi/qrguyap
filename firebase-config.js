/* 
 * FIREBASE KURULUM TALİMATLARI
 * 1. https://console.firebase.google.com/ adresine gidin.
 * 2. Yeni bir proje oluşturun.
 * 3. Sol menüden "Build" > "Firestore Database" seçin ve veritabanını oluşturun. 
 *    (Test mode seçerek kuralları geçici olarak açık bırakabilirsiniz: `allow read, write: if true;`)
 * 4. "Project Overview" sayfasında "Web" (</>) ikonuna tıklayarak web uygulamanızı ekleyin.
 * 5. Size verilen firebaseConfig objesini aşağıdaki `firebaseConfig` değişkenine yapıştırın.
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, where, onSnapshot } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-firestore.js";

const firebaseConfig = {
  // BURAYA KENDİ FIREBASE AYARLARINIZI GİRİN. ÖRNEK:
  // apiKey: "AIza...",
  // authDomain: "proje-id.firebaseapp.com",
  // projectId: "proje-id",
  // storageBucket: "proje-id.appspot.com",
  // messagingSenderId: "123456789",
  // appId: "1:123456789:web:abcde"
};

let app, db;
try {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
} catch (e) {
  // Config hatalıysa devam eder ama firebase özellikleri çalışmaz
}

export { db, collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, where, onSnapshot };
