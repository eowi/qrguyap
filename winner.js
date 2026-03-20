import { db, collection, getDocs, doc, query, where, onSnapshot } from './firebase-config.js';
import { CONSTANTS } from './constants.js';
import { fuzzyMatchName } from './fuzzyMatch.js';

document.addEventListener('DOMContentLoaded', async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const drawId = urlParams.get('id');
  const session = urlParams.get('session');
  let drawName = urlParams.get('name');

  const drawNameEl = document.getElementById('draw-name');
  const drawSessionEl = document.getElementById('draw-session');
  const infoEl = document.getElementById('participant-info');
  const determineBtn = document.getElementById('determine-winner-btn');
  const startState = document.getElementById('start-state');
  const winnerState = document.getElementById('winner-state');
  const winnerNameEl = document.getElementById('winner-name');

  if (!drawId) {
    drawNameEl.textContent = "Geçersiz Çekiliş Linki";
    infoEl.textContent = "ID bulunamadı.";
    return;
  }

  if (drawName) {
    drawNameEl.textContent = `${decodeURIComponent(drawName)} çekilişinin kazananı`;
  }
  if (session) {
    drawSessionEl.textContent = `Oturum: ${session}`;
    drawSessionEl.classList.remove('hidden');
  }

  let finalistsPool = [];

  try {
    const q = query(collection(db, CONSTANTS.COLLECTION_PARTICIPANTS), where("drawId", "==", drawId));
    const snapshot = await getDocs(q);
    
    let startList = [];
    let endList = [];

    snapshot.forEach(docSnap => {
      const d = docSnap.data();
      if (d.stage === CONSTANTS.STAGE_START) startList.push(d.fullName);
      else if (d.stage === CONSTANTS.STAGE_END) endList.push(d.fullName);
    });

    let availableEnds = [...endList];

    startList.forEach(startName => {
      for(let i=0; i < availableEnds.length; i++) {
        if(fuzzyMatchName(startName, availableEnds[i])) {
           finalistsPool.push(startName);
           availableEnds.splice(i, 1);
           break;
        }
      }
    });

    finalistsPool = [...new Set(finalistsPool)];

    if(finalistsPool.length > 0) {
      infoEl.textContent = `${finalistsPool.length} Katılımcı`;
      determineBtn.disabled = false;
      determineBtn.classList.remove('cursor-not-allowed', 'opacity-50');
    } else {
      determineBtn.disabled = true;
      determineBtn.classList.add('cursor-not-allowed', 'opacity-50');
      infoEl.textContent = "Havuzda henüz eşleşen katılımcı bulunmuyor.";
    }

    // Live Sync: Listen for winner
    onSnapshot(doc(db, CONSTANTS.COLLECTION_DRAWS, drawId), (docSnap) => {
      if(docSnap.exists()) {
        const data = docSnap.data();
        if(data.winner) {
          // Instant display without shuffle
          startState.classList.add('hidden');
          winnerState.classList.remove('hidden');
          winnerState.classList.remove('scale-0');
          winnerState.classList.add('scale-100');
          
          winnerNameEl.textContent = data.winner.fullName;
          triggerConfetti();
        }
      }
    });

  } catch (err) {
    infoEl.textContent = "Veriler çekilirken hata oluştu.";
    console.error(err);
  }

  function triggerConfetti() {
    // Avoid multiple confetti intervals
    if(window._confettiRunning) return;
    window._confettiRunning = true;
    
    // Huge Confetti Effect Continously
    const end = Date.now() + 5 * 1000;
    const colors = ['#bb0000', '#ffffff', '#ffd700', '#3b82f6', '#10b981'];

    (function frame() {
      confetti({
        particleCount: 8,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: colors
      });
      confetti({
        particleCount: 8,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: colors
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      } else {
        window._confettiRunning = false;
      }
    }());
  }

  determineBtn.addEventListener('click', () => {
    if (finalistsPool.length === 0) return;

    // Transition OUT Start State
    startState.classList.add('hidden');
    
    // Transition IN Winner State
    winnerState.classList.remove('hidden');
    // timeout for css transform transition
    setTimeout(() => {
      winnerState.classList.remove('scale-0');
      winnerState.classList.add('scale-100');
    }, 50);

    // Shuffle Animation
    let counter = 0;
    const interval = setInterval(() => {
       const ri = Math.floor(Math.random() * finalistsPool.length);
       winnerNameEl.textContent = finalistsPool[ri];
       counter++;
       
       if(counter > 40) { // approx 2 seconds
         clearInterval(interval);
         
         const finalWinner = finalistsPool[Math.floor(Math.random() * finalistsPool.length)];
         winnerNameEl.textContent = finalWinner;
         
         triggerConfetti();
       }
    }, 50);
  });
});
