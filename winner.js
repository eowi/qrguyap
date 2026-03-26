import { db, collection, getDocs, doc, query, where, onSnapshot, updateDoc } from './firebase-config.js';
import { CONSTANTS } from './constants.js';
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
    let currentWinners = [];
    window.finalistDetails = {};

    try {
        const q = query(collection(db, CONSTANTS.COLLECTION_PARTICIPANTS), where("drawId", "==", drawId));
        const snapshot = await getDocs(q);

        snapshot.forEach(docSnap => {
            const d = docSnap.data();
            window.finalistDetails[d.fullName] = d;
        });

        // Live Sync: Listen for winner
        onSnapshot(doc(db, CONSTANTS.COLLECTION_DRAWS, drawId), (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                if (data.winners && data.winners.length > 0) {
                    currentWinners = data.winners;
                    const lastWinner = currentWinners[currentWinners.length - 1];

                    // Display Winner
                    startState.classList.remove('hidden'); // keep button visible to draw again
                    startState.classList.add('mb-8'); // add some margin
                    determineBtn.innerHTML = '<div class="absolute inset-0 bg-gradient-to-r from-blue-500 to-green-500 opacity-0 group-hover:opacity-100 transition duration-300"></div><span class="relative z-10 flex items-center justify-center gap-4">🎯 SONRAKİ ÇEKİLİŞ 🎯</span>';

                    winnerState.classList.remove('hidden');
                    winnerState.classList.remove('scale-0');
                    winnerState.classList.add('scale-100');

                    winnerNameEl.textContent = lastWinner.fullName;
                    
                    // Prev winners
                    const prevContainer = document.getElementById('previous-winners-container');
                    const prevList = document.getElementById('previous-winners-list');
                    if (currentWinners.length > 1) {
                        prevList.innerHTML = '';
                        currentWinners.slice(0, currentWinners.length - 1).reverse().forEach(w => {
                            const el = document.createElement('div');
                            el.className = 'bg-gray-800 border-2 border-green-500/30 text-green-100 font-bold px-5 py-2 rounded-full text-base shadow-lg';
                            el.textContent = w.fullName;
                            prevList.appendChild(el);
                        });
                        prevContainer.classList.remove('hidden');
                        setTimeout(() => {
                           prevContainer.classList.remove('opacity-0', 'translate-y-4');
                        }, 50);
                    } else {
                        prevContainer.classList.add('hidden');
                    }

                    // triggerConfetti();
                } else {
                    currentWinners = [];
                    startState.classList.remove('hidden');
                    startState.classList.remove('mb-8');
                    determineBtn.innerHTML = '<div class="absolute inset-0 bg-gradient-to-r from-blue-500 to-green-500 opacity-0 group-hover:opacity-100 transition duration-300"></div><span class="relative z-10 flex items-center justify-center gap-4">🎯 ÇEKİLİŞİ BAŞLAT 🎯</span>';
                    winnerState.classList.add('hidden');
                }
                updatePool();
            }
        });

        function updatePool() {
            const winnerNames = currentWinners.map(w => w.fullName);
            finalistsPool = Object.keys(window.finalistDetails).filter(name => !winnerNames.includes(name));

            if (finalistsPool.length > 0) {
                infoEl.textContent = `${finalistsPool.length} Katılımcı Havuzda`;
                determineBtn.disabled = false;
                determineBtn.classList.remove('cursor-not-allowed', 'opacity-50');
            } else {
                infoEl.textContent = "Havuzda çekiliş için katılımcı kalmadı.";
                determineBtn.disabled = true;
                determineBtn.classList.add('cursor-not-allowed', 'opacity-50');
            }
        }

    } catch (err) {
        infoEl.textContent = "Veriler çekilirken hata oluştu.";
        console.error(err);
    }

    function triggerConfetti() {
        // Avoid multiple confetti intervals
        if (window._confettiRunning) return;
        window._confettiRunning = true;

        // Huge Confetti Effect Continously
        const end = Date.now() + 5 * 1000;
        const colors = ['#bb0000', '#ffffff', '#ffd700', '#3b82f6', '#10b981'];

        (function frame() {
            confetti({
                particleCount: 8,
                angle: 60,
                spread: 120,
                origin: { x: 0 },
                colors: colors
            });
            confetti({
                particleCount: 8,
                angle: 120,
                spread: 120,
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
        determineBtn.disabled = true;
        determineBtn.classList.add('cursor-not-allowed', 'opacity-50');
        winnerState.classList.add('hidden');

        // Shuffle Animation
        winnerState.classList.remove('hidden');
        winnerState.classList.add('scale-100');
        let counter = 0;
        const interval = setInterval(() => {
            const ri = Math.floor(Math.random() * finalistsPool.length);
            winnerNameEl.textContent = finalistsPool[ri];
            counter++;

            if (counter > 40) { // approx 2 seconds
                clearInterval(interval);

                const finalWinner = finalistsPool[Math.floor(Math.random() * finalistsPool.length)];
                winnerNameEl.textContent = finalWinner;

                triggerConfetti();

                // Save to DB
                try {
                    const winnerDetails = window.finalistDetails[finalWinner];
                    const newWinners = [...currentWinners, {
                        fullName: finalWinner,
                        phone: winnerDetails ? (winnerDetails.phone || 'Bilinmiyor') : 'Bilinmiyor',
                        wonAt: new Date().toISOString()
                    }];
                    updateDoc(doc(db, CONSTANTS.COLLECTION_DRAWS, drawId), {
                        winners: newWinners
                    });
                } catch (e) {
                    console.error("Presentation DB Write Error:", e);
                }
            }
        }, 50);
    });
});
