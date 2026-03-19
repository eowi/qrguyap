import { db, collection, addDoc, getDocs, doc, query, where, onSnapshot } from './firebase-config.js';
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

    if (id === CONSTANTS.MASTER_ADMIN_ID && pass === CONSTANTS.MASTER_ADMIN_PASS) {
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
  const statStart = document.getElementById('stat-start');
  const statEnd = document.getElementById('stat-end');
  
  const runFuzzyBtn = document.getElementById('run-fuzzy-btn');
  const finalistArea = document.getElementById('finalists-area');
  const finalistList = document.getElementById('finalist-list');
  const finalistCount = document.getElementById('finalist-count');
  
  const randomizerBtn = document.getElementById('randomizer-btn');
  const winnerDisplay = document.getElementById('winner-display');
  const winnerName = document.getElementById('winner-name');

  let activeDrawId = null;
  let activeDrawName = "";
  let unsubscribeParticipants = null;
  let participantsData = { start: [], end: [] };
  let finalistsPool = [];

  async function initDashboard() {
    if(!db) {
       return;
    }
    // Listen draws
    onSnapshot(collection(db, CONSTANTS.COLLECTION_DRAWS), (snapshot) => {
      drawsList.innerHTML = '';
      if(snapshot.empty) {
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
          <button class="bg-blue-600/20 text-blue-400 border border-blue-600/50 hover:bg-blue-600 hover:text-white px-3 py-1 rounded text-xs transition">Yönet</button>
        `;
        li.addEventListener('click', () => openDraw(docSnap.id, data.name, data.session));
        drawsList.appendChild(li);
      });
    });
  }

  createDrawForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('draw-name').value.trim();
    const session = document.getElementById('draw-session').value;
    
    if(name && session && db) {
      await addDoc(collection(db, CONSTANTS.COLLECTION_DRAWS), { name, session, createdAt: new Date().toISOString() });
      createDrawForm.reset();
      alert(CONSTANTS.MESSAGES.SUCCESS_DRAW_CREATED);
    }
  });

  function openDraw(id, name, session) {
    activeDrawId = id;
    activeDrawName = name;
    managePanel.classList.remove('hidden');
    manageTitle.textContent = name;
    manageSession.textContent = "Oturum: " + session;
    
    // reset UI
    finalistArea.classList.add('hidden');
    winnerDisplay.classList.add('hidden');
    participantsData = { start: [], end: [] };

    // Setup Presentation Button
    btnPresentation.onclick = () => {
      const url = `winner.html?id=${id}&name=${encodeURIComponent(name)}&session=${session}`;
      window.open(url, '_blank');
    };

    generateQRCodes(id, name);
    listenToParticipants(id);
  }

  function generateQRCodes(id, name) {
    const baseUrl = window.location.origin + window.location.pathname.replace('admin.html', 'index.html');
    const startUrl = `${baseUrl}?draw=${id}&stage=${CONSTANTS.STAGE_START}&name=${encodeURIComponent(name)}`;
    const endUrl = `${baseUrl}?draw=${id}&stage=${CONSTANTS.STAGE_END}&name=${encodeURIComponent(name)}`;
    
    document.getElementById('qr-start').innerHTML = '';
    document.getElementById('qr-end').innerHTML = '';

    new QRCode(document.getElementById("qr-start"), { text: startUrl, width: 150, height: 150, colorDark : "#000000", colorLight : "#ffffff" });
    new QRCode(document.getElementById("qr-end"), { text: endUrl, width: 150, height: 150, colorDark : "#000000", colorLight : "#ffffff" });

    document.getElementById('qr-start-link').textContent = startUrl;
    document.getElementById('qr-end-link').textContent = endUrl;
  }

  function listenToParticipants(id) {
    if(unsubscribeParticipants) unsubscribeParticipants();
    
    const q = query(collection(db, CONSTANTS.COLLECTION_PARTICIPANTS), where("drawId", "==", id));
    unsubscribeParticipants = onSnapshot(q, (snapshot) => {
      participantsData.start = [];
      participantsData.end = [];
      
      snapshot.forEach(docSnap => {
        const d = docSnap.data();
        if(d.stage === CONSTANTS.STAGE_START) participantsData.start.push(d.fullName);
        else if(d.stage === CONSTANTS.STAGE_END) participantsData.end.push(d.fullName);
      });

      statStart.textContent = participantsData.start.length;
      statEnd.textContent = participantsData.end.length;
    });
  }

  runFuzzyBtn.addEventListener('click', () => {
    finalistsPool = [];
    // Start listesindeki her isim için, end listesinde fuzzy match ara.
    // Eşleşenleri al (Basit algoritma, duplicate handle edilmeli gerçekte ama prototype için yeterli)
    
    // Copy for tracking matched end elements so we don't match same end element twice
    let availableEnds = [...participantsData.end];

    participantsData.start.forEach(startName => {
      for(let i=0; i < availableEnds.length; i++) {
        if(fuzzyMatchName(startName, availableEnds[i])) {
           finalistsPool.push(startName); // Finalist ismi
           availableEnds.splice(i, 1); // Remove from available
           break;
        }
      }
    });

    // Remove duplicates from finalist pool if a start user registered multiple times
    finalistsPool = [...new Set(finalistsPool)];

    finalistCount.textContent = `${finalistsPool.length} Kişi`;
    finalistList.innerHTML = finalistsPool.map(f => `<li class="border-b border-gray-700/50 pb-1">${f}</li>`).join('');
    
    finalistArea.classList.remove('hidden');
    winnerDisplay.classList.add('hidden'); // Reset winner
  });

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
       if(counter > 20) {
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
       }
    }, 50);
  });

});
