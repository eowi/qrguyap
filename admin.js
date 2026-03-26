import { db, collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, where, onSnapshot } from './firebase-config.js';
import { CONSTANTS } from './constants.js';
import { fuzzyMatchName } from './fuzzyMatch.js';

document.addEventListener('DOMContentLoaded', () => {
    // Login checks
    const loginSection = document.getElementById('login-section');
    const dashboardSection = document.getElementById('dashboard-section');
    const loginForm = document.getElementById('login-form');
    const loginErrorMsg = document.getElementById('login-error');
    const logoutBtn = document.getElementById('logout-btn');

    function checkLogin() {
        if (localStorage.getItem(CONSTANTS.LOCAL_STORAGE_ADMIN_KEY) === 'true') {
            loginSection.classList.add('hidden');
            dashboardSection.classList.remove('hidden');
            initDashboard();
        } else {
            loginSection.classList.remove('hidden');
            dashboardSection.classList.add('hidden');
        }
    }

    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const id = document.getElementById('admin-id').value;
        const pass = document.getElementById('admin-pass').value;

        if ((id === CONSTANTS.MASTER_ADMIN_ID && pass === CONSTANTS.MASTER_ADMIN_PASS) ||
            (id === CONSTANTS.SECONDARY_ADMIN_ID && pass === CONSTANTS.SECONDARY_ADMIN_PASS)) {
            localStorage.setItem(CONSTANTS.LOCAL_STORAGE_ADMIN_KEY, 'true');
            checkLogin();
        } else {
            loginErrorMsg.textContent = CONSTANTS.MESSAGES.ERROR_LOGIN;
            loginErrorMsg.classList.remove('hidden');
        }
    });

    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem(CONSTANTS.LOCAL_STORAGE_ADMIN_KEY);
        window.location.reload();
    });

    checkLogin();

    // DASHBOARD LOGIC
    const createDrawForm = document.getElementById('create-draw-form');
    const drawsList = document.getElementById('draws-list');
    const managePanel = document.getElementById('draw-manage-panel');
    const manageTitle = document.getElementById('manage-title');
    const manageSession = document.getElementById('manage-session');
    const btnPresentation = document.getElementById('btn-presentation');
    const statTotal = document.getElementById('stat-total');

    const finalistArea = document.getElementById('finalists-area');
    const finalistList = document.getElementById('finalist-list');
    const finalistCount = document.getElementById('finalist-count');

    const randomizerBtn = document.getElementById('randomizer-btn');
    const winnerDisplay = document.getElementById('winner-display');
    const winnerName = document.getElementById('winner-name');

    const winnerInfoPanel = document.getElementById('winner-info-panel');
    const winnersListContainer = document.getElementById('winners-list-container');

    // Modals
    const participantModal = document.getElementById('participant-modal');
    const participantModalTitle = document.getElementById('participant-modal-title');
    const participantModalList = document.getElementById('participant-modal-list');
    const closeParticipantModal = document.getElementById('close-participant-modal');

    const qrModal = document.getElementById('qr-modal');
    const qrModalContent = document.getElementById('qr-modal-content');
    const qrModalTitle = document.getElementById('qr-modal-title');
    const closeQrModal = document.getElementById('close-qr-modal');

    const winnerModal = document.getElementById('winner-modal');
    const winnerModalInner = document.getElementById('winner-modal-inner');
    const closeWinnerModal = document.getElementById('close-winner-modal');
    const winnerModalName = document.getElementById('winner-modal-name');
    const winnerModalPhone = document.getElementById('winner-modal-phone');
    const winnerModalTime = document.getElementById('winner-modal-time');

    const btnShowModal = document.getElementById('btn-show-modal');
    const btnZoomQr = document.getElementById('btn-zoom-qr');

    // Modal Closers
    closeParticipantModal.onclick = () => participantModal.classList.add('hidden');
    closeQrModal.onclick = () => qrModal.classList.add('hidden');
    closeWinnerModal.onclick = () => {
        winnerModalInner.classList.remove('scale-100');
        winnerModalInner.classList.add('scale-95');
        setTimeout(() => winnerModal.classList.add('hidden'), 200);
    };

    let activeDrawId = null;
    let activeDrawName = "";
    let unsubscribeParticipants = null;
    let unsubscribeDraw = null;
    let currentWinners = [];
    let participantsData = [];
    let finalistsPool = [];

    async function initDashboard() {
        if (!db) {
            return;
        }
        // Listen draws
        onSnapshot(collection(db, CONSTANTS.COLLECTION_DRAWS), (snapshot) => {
            drawsList.innerHTML = '';
            if (snapshot.empty) {
                drawsList.innerHTML = '<li class="text-gray-500 text-sm">Henüz çekiliş yok.</li>';
                return;
            }
            snapshot.forEach((docSnap) => {
                const data = docSnap.data();
                const li = document.createElement('li');
                li.className = "flex justify-between items-center bg-gray-900 border border-gray-700 p-3 rounded hover:border-gray-500 transition cursor-pointer";
                li.innerHTML = `
          <div>
            <div class="font-bold text-gray-200">${data.name}</div>
            <div class="text-xs text-info text-gray-500">Oturum: ${data.session}</div>
          </div>
          <div class="flex gap-2">
            <button class="bg-red-600/20 text-red-400 border border-red-600/50 hover:bg-red-600 hover:text-white px-3 py-1 rounded text-xs transition z-10" id="del-${docSnap.id}">Sil</button>
            <button class="bg-blue-600/20 text-blue-400 border border-blue-600/50 hover:bg-blue-600 hover:text-white px-3 py-1 rounded text-xs transition">Yönet</button>
          </div>
        `;
                li.addEventListener('click', (e) => {
                    if (e.target.id === `del-${docSnap.id}`) return;
                    openDraw(docSnap.id, data.name, data.session);
                });

                drawsList.appendChild(li);

                // Delete Listener
                document.getElementById(`del-${docSnap.id}`).addEventListener('click', async (e) => {
                    e.stopPropagation();
                    if (confirm(`"${data.name}" çekilişini silmek istediğinize emin misiniz?`)) {
                        await deleteDoc(doc(db, CONSTANTS.COLLECTION_DRAWS, docSnap.id));
                        if (activeDrawId === docSnap.id) {
                            managePanel.classList.add('hidden');
                        }
                    }
                });
            });
        });
    }

    createDrawForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('draw-name').value.trim();
        const session = document.getElementById('draw-session').value;

        if (name && session && db) {
            await addDoc(collection(db, CONSTANTS.COLLECTION_DRAWS), { name, session, createdAt: new Date().toISOString() });
            createDrawForm.reset();
            alert(CONSTANTS.MESSAGES.SUCCESS_DRAW_CREATED);
        }
    });

    function openDraw(id, name, session) {
        if (unsubscribeParticipants) unsubscribeParticipants();
        if (unsubscribeDraw) unsubscribeDraw();

        activeDrawId = id;
        activeDrawName = name;
        managePanel.classList.remove('hidden');
        manageTitle.textContent = name;
        manageSession.textContent = "Oturum: " + session;

        // reset UI
        winnerDisplay.classList.add('hidden');
        winnerInfoPanel.classList.add('hidden');
        participantsData = [];
        currentWinners = [];

        // Listen to Draw Doc for Winner changes
        unsubscribeDraw = onSnapshot(doc(db, CONSTANTS.COLLECTION_DRAWS, activeDrawId), (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                if (data.winners && data.winners.length > 0) {
                    currentWinners = data.winners;
                    renderWinnersList(currentWinners);
                    winnerInfoPanel.classList.remove('hidden');
                } else {
                    currentWinners = [];
                    winnerInfoPanel.classList.add('hidden');
                }
                updateFinalistsPool(); // Refresh pool since winners changed
            }
        });

        function renderWinnersList(winners) {
            winnersListContainer.innerHTML = '';
            winners.forEach((w, index) => {
                const div = document.createElement('div');
                div.className = "flex justify-between items-center bg-gray-800/80 p-2 rounded border border-green-600/30";
                div.innerHTML = `
                    <div class="flex items-center gap-2 cursor-pointer w-full" id="winner-info-${index}">
                        <div class="text-green-400 font-bold ml-1">${w.fullName}</div>
                        <div class="text-xs text-gray-400 font-mono">(${w.phone})</div>
                    </div>
                    <button class="text-red-400 hover:text-red-700 ml-2 font-bold px-2 py-1 rounded bg-red-500/10 hover:bg-red-500/20 transition" id="del-winner-${index}">X</button>
                `;
                winnersListContainer.appendChild(div);

                document.getElementById(`winner-info-${index}`).addEventListener('click', () => {
                    winnerModalName.textContent = w.fullName;
                    winnerModalPhone.textContent = w.phone;
                    winnerModalTime.textContent = w.wonAt ? new Date(w.wonAt).toLocaleString('tr-TR', { dateStyle: 'medium', timeStyle: 'short' }) : "-";
                    winnerModal.classList.remove('hidden');
                    setTimeout(() => {
                        winnerModalInner.classList.remove('scale-95');
                        winnerModalInner.classList.add('scale-100');
                    }, 50);
                });

                document.getElementById(`del-winner-${index}`).addEventListener('click', async () => {
                   if (confirm(w.fullName + " kazananlar listesinden silinecek. Emin misiniz?")) {
                       const newWinners = currentWinners.filter((_, i) => i !== index);
                       await updateDoc(doc(db, CONSTANTS.COLLECTION_DRAWS, activeDrawId), {
                           winners: newWinners
                       });
                   }
                });
            });
        }

        // Setup Presentation Button
        btnPresentation.onclick = () => {
            const url = `winner.html?id=${id}&name=${encodeURIComponent(name)}&session=${session}`;
            window.open(url, '_blank');
        };

        generateQRCodes(id, name);
        listenToParticipants(id);
    }

    let qrInstance = null;
    function generateQRCodes(id, name) {
        const baseUrl = window.location.origin + window.location.pathname.replace('admin.html', 'index.html');
        const qrUrl = `${baseUrl}?draw=${id}&name=${encodeURIComponent(name)}`;

        if (!qrInstance) {
            qrInstance = new QRCode(document.getElementById("qr-code"), { 
                text: qrUrl, 
                width: 150, 
                height: 150, 
                colorDark: "#000000", 
                colorLight: "#ffffff" 
            });
        } else {
            qrInstance.clear();
            qrInstance.makeCode(qrUrl);
        }
        
        document.getElementById('qr-link').textContent = qrUrl;
    }

    function listenToParticipants(id) {
        if (unsubscribeParticipants) unsubscribeParticipants();

        const q = query(collection(db, CONSTANTS.COLLECTION_PARTICIPANTS), where("drawId", "==", id));
        unsubscribeParticipants = onSnapshot(q, (snapshot) => {
            participantsData = [];

            snapshot.forEach(docSnap => {
                participantsData.push(docSnap.data());
            });

            statTotal.textContent = participantsData.length;
            updateFinalistsPool();
        });
    }

    function updateFinalistsPool() {
        if (!participantsData) return;
        const winnerNames = currentWinners.map(w => w.fullName);
        const uniqueParticipantsMap = new Map();
        
        participantsData.forEach(p => {
           if (!winnerNames.includes(p.fullName)) {
               uniqueParticipantsMap.set(p.fullName, p);
           }
        });
        
        finalistsPool = Array.from(uniqueParticipantsMap.keys());
        
        finalistCount.textContent = `${finalistsPool.length} Kişi`;
        finalistList.innerHTML = finalistsPool.map(f => `<li class="border-b border-gray-700/50 pb-1 text-gray-300 font-semibold">${f}</li>`).join('');
    }

    // Modals logic for stat buttons
    btnShowModal.onclick = () => {
        participantModalTitle.textContent = "Katılımcı Listesi";
        renderParticipantModalList(participantsData);
        participantModal.classList.remove('hidden');
    };

    function renderParticipantModalList(arr) {
        if (arr.length === 0) {
            participantModalList.innerHTML = '<li class="p-4 text-center text-gray-500">Kayıt Bulunamadı.</li>';
            return;
        }
        participantModalList.innerHTML = arr.map(p => `
      <li class="p-3 hover:bg-gray-800/80 transition rounded flex justify-between items-center">
        <span class="font-semibold text-gray-200">${p.fullName}</span>
        <span class="text-xs text-gray-400 font-mono bg-gray-900 px-2 py-1 rounded">${p.phone || 'Yok'}</span>
      </li>
    `).join('');
    }

    // Large QR Modals logic
    btnZoomQr.onclick = () => {
        qrModalContent.innerHTML = document.getElementById('qr-code').innerHTML;
        qrModalTitle.textContent = "KATILIM QR'I";
        const el = qrModalContent.querySelector('img') || qrModalContent.querySelector('canvas');
        if (el) { el.style.width = '300px'; el.style.height = '300px'; }
        qrModal.classList.remove('hidden');
    };

    randomizerBtn.addEventListener('click', () => {
        if (finalistsPool.length === 0) {
            alert(CONSTANTS.MESSAGES.INFO_NO_FINALISTS);
            return;
        }

        // Shuffle animation
        winnerDisplay.classList.remove('hidden');
        let counter = 0;
        const interval = setInterval(() => {
            const ri = Math.floor(Math.random() * finalistsPool.length);
            winnerName.textContent = finalistsPool[ri];
            counter++;
            if (counter > 20) {
                clearInterval(interval);
                // Final Winner
                const finalWinner = finalistsPool[Math.floor(Math.random() * finalistsPool.length)];
                winnerName.textContent = finalWinner;

                // Confetti
                confetti({
                    particleCount: 150,
                    spread: 100,
                    origin: { y: 0.6 },
                    colors: ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6']
                });

                // Save Winners to Firebase
                const winnerDetails = participantsData.find(p => p.fullName === finalWinner) || { fullName: finalWinner, phone: 'Bilinmiyor' };
                const newWinners = [...currentWinners, {
                        fullName: winnerDetails.fullName,
                        phone: winnerDetails.phone || 'Bilinmiyor',
                        wonAt: new Date().toISOString()
                }];
                updateDoc(doc(db, CONSTANTS.COLLECTION_DRAWS, activeDrawId), {
                    winners: newWinners
                }).catch(e => console.error("Winner save error:", e));
            }
        }, 50);
    });

});
