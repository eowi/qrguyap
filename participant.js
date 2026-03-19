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
  const welcomeMsg = document.getElementById('welcome-msg');

  if (urlParams.has('name')) {
    formTitle.textContent = decodeURIComponent(drawName) + " Katılımı";
  }

  if (!drawId || !stage) {
    form.classList.add('hidden');
    formTitle.classList.add('hidden');
    if(welcomeMsg) welcomeMsg.classList.remove('hidden');
    return;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fname = document.getElementById('fname').value.trim();
    const lname = document.getElementById('lname').value.trim();
    const phone = document.getElementById('phone').value.trim();

    if (!fname || !lname || !phone) {
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
           phone: phone,
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
