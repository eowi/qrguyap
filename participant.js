import { db, collection, addDoc } from './firebase-config.js';
import { CONSTANTS } from './constants.js';

document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const drawId = urlParams.get('draw');
  const stage = urlParams.get('stage'); // 'start' or 'end'
  const drawName = urlParams.get('name') || "Çekiliş";

  const form = document.getElementById('participation-form');
  const errorMsg = document.getElementById('error-msg');
  const successState = document.getElementById('success-state');
  const successMsg = document.getElementById('success-msg');
  const formTitle = document.getElementById('form-title');

  if (urlParams.has('name')) {
    formTitle.textContent = decodeURIComponent(drawName) + " Katılımı";
  }

  if (!drawId || !stage) {
    errorMsg.textContent = CONSTANTS.MESSAGES.ERROR_MISSING_DRAW;
    errorMsg.classList.remove('hidden');
    form.classList.add('hidden');
    return;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fname = document.getElementById('fname').value.trim();
    const lname = document.getElementById('lname').value.trim();

    if (!fname || !lname) {
      errorMsg.textContent = CONSTANTS.MESSAGES.ERROR_FILL_FORM;
      errorMsg.classList.remove('hidden');
      return;
    }

    try {
      const fullName = `${fname} ${lname}`;
      
      if (db) {
         await addDoc(collection(db, CONSTANTS.COLLECTION_PARTICIPANTS), {
           drawId: drawId,
           stage: stage,
           fullName: fullName,
           timestamp: new Date().toISOString()
         });
      }

      form.classList.add('hidden');
      errorMsg.classList.add('hidden');
      
      // "{Cekilis_Ismi} Katılımınız Gerçekleşmiştir."
      successMsg.textContent = CONSTANTS.MESSAGES.SUCCESS_PARTICIPATION.replace('{Cekilis_Ismi}', decodeURIComponent(drawName));
      successState.classList.remove('hidden');

    } catch (err) {
      errorMsg.textContent = "Bir hata oluştu. Veritabanı bağlantısını (Firebase) kontrol edin.";
      errorMsg.classList.remove('hidden');
    }
  });
});
