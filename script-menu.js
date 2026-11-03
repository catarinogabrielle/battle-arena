// ==========================================
// ROSTER DE PERSONAGENS E STATUS
// ==========================================
const characters = [
    { id: 'kaelen', name: 'KAELEN', class: 'GUERREIRO DO SOL', img: 'assets/kaelen.png', color: '#00d2ff', weapon: 'melee' },
    { id: 'elara', name: 'ELARA', class: 'PATRULHEIRA DA FLORESTA', img: 'assets/elara.png', color: '#A7FF83', weapon: 'ranged' },
    { id: 'malacor', name: 'MALACOR', class: 'MAGO DAS SOMBRAS', img: 'assets/malacor.png', color: '#B19CD9', weapon: 'ranged' },
    { id: 'lyra', name: 'LYRA', class: 'SACERDOTISA DA LUZ', img: 'assets/lyra.png', color: '#F0E68C', weapon: 'melee' },
    { id: 'silas', name: 'SILAS', class: 'ASSASSINO DA NÉVOA', img: 'assets/silas.png', color: '#ffffff', weapon: 'melee' },
    { id: 'morwen', name: 'MORWEN', class: 'INVOCADORA DOS ELEMENTOS', img: 'assets/morwen.png', color: '#ff3d68', weapon: 'ranged' }
];

let selectedCharIndex = 0;
const rosterContainer = document.getElementById('roster-container');
const mainImg = document.getElementById('main-hero-img');
const mainName = document.getElementById('main-hero-name');
const mainClass = document.getElementById('main-hero-class');
const nickElement = document.getElementById('player-nickname');

// Carrega nickname salvo se houver
const savedPlayer = JSON.parse(localStorage.getItem('arenaPlayer') || '{}');
const playerInfo = JSON.parse(localStorage.getItem('arenaPlayerInfo') || '{}');
const activeNickname = savedPlayer.nickname || playerInfo.username;
if (activeNickname && nickElement) {
    nickElement.innerText = activeNickname;
}
if (savedPlayer.charId) {
    const idx = characters.findIndex(c => c.id === savedPlayer.charId);
    if (idx !== -1) selectedCharIndex = idx;
}

function renderRoster() {
    if (!rosterContainer) return;
    rosterContainer.innerHTML = '';
    characters.forEach((char, index) => {
        const btn = document.createElement('div');
        btn.classList.add('char-thumb');
        if (index === selectedCharIndex) btn.classList.add('active');

        btn.innerHTML = `<img src="${char.img}" alt="${char.name}">`;

        btn.addEventListener('click', () => {
            selectedCharIndex = index;
            document.querySelectorAll('.char-thumb').forEach(t => t.classList.remove('active'));
            btn.classList.add('active');

            if (mainImg) {
                mainImg.style.opacity = '0';
                setTimeout(() => {
                    mainImg.src = char.img;
                    if (mainName) mainName.innerText = char.name;
                    if (mainClass) mainClass.innerText = char.class;
                    mainImg.style.opacity = '1';
                }, 150);
            }
        });
        rosterContainer.appendChild(btn);
    });

    const initChar = characters[selectedCharIndex];
    if (initChar && mainImg) {
        mainImg.src = initChar.img;
        if (mainName) mainName.innerText = initChar.name;
        if (mainClass) mainClass.innerText = initChar.class;
    }
}
renderRoster();

function getPlayerConfig() {
    return {
        nickname: nickElement ? nickElement.innerText.trim() : 'CATARINO',
        color: characters[selectedCharIndex].color,
        weapon: characters[selectedCharIndex].weapon,
        charId: characters[selectedCharIndex].id
    };
}

if (nickElement) {
    nickElement.addEventListener('blur', () => {
        localStorage.setItem('arenaPlayer', JSON.stringify(getPlayerConfig()));
    });
}

// ==========================================
// PWA: SERVICE WORKER & BOTÃO DE INSTALAÇÃO
// ==========================================
let deferredPWAInstallPrompt = null;
const btnInstallPwa = document.getElementById('btn-install-pwa');

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('service-worker.js')
            .then(reg => console.log('✅ ServiceWorker registrado com sucesso:', reg.scope))
            .catch(err => console.log('❌ Falha ao registrar ServiceWorker:', err));
    });
}

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPWAInstallPrompt = e;
    console.log('📱 PWA pronto para instalação');
    if (btnInstallPwa) {
        btnInstallPwa.classList.add('install-ready');
    }
});

window.addEventListener('appinstalled', () => {
    console.log('🎉 Battle Arena instalado com sucesso!');
    deferredPWAInstallPrompt = null;
    if (btnInstallPwa) {
        btnInstallPwa.innerHTML = '<div class="orb-icon"><i class="fas fa-check"></i></div><span>App Instalado</span>';
        setTimeout(() => { btnInstallPwa.style.display = 'none'; }, 3000);
    }
});

if (btnInstallPwa) {
    btnInstallPwa.addEventListener('click', async () => {
        if (deferredPWAInstallPrompt) {
            deferredPWAInstallPrompt.prompt();
            const choice = await deferredPWAInstallPrompt.userChoice;
            if (choice && choice.outcome === 'accepted') {
                btnInstallPwa.style.display = 'none';
            }
            deferredPWAInstallPrompt = null;
        } else {
            const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
            const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;

            if (isStandalone) {
                alert('✅ O Battle Arena já está instalado e rodando como aplicativo!');
            } else if (isIOS) {
                alert('📱 Para instalar no iPhone/iPad:\n1. Toque no botão de Compartilhar (ícone com seta para cima no Safari)\n2. Role para baixo e selecione "Adicionar à Tela de Início"');
            } else {
                alert('💡 Para instalar o App:\nNo Chrome ou Edge, clique no ícone de instalar na barra de navegação ou no menu de 3 pontos > "Instalar Battle Arena".');
            }
        }
    });
}

const btnOptions = document.getElementById('btn-options');
if (btnOptions) {
    btnOptions.addEventListener('click', () => {
        const currentUser = (nickElement ? nickElement.innerText.trim() : 'Jogador');
        const action = confirm(`⚙️ OPÇÕES DE CONTA\n\nJogador atual: ${currentUser}\n\nDeseja sair da conta e ir para a Tela de Login?`);
        if (action) {
            localStorage.removeItem('ygaming_token');
            window.location.href = 'login.html';
        }
    });
}

const btnRanking = document.getElementById('btn-ranking');
if (btnRanking) {
    btnRanking.addEventListener('click', () => {
        alert('🏆 RANKING GLOBAL (Temporada 1)\n\n1º - CATARINO (2.850 pts)\n2º - SHADOW_BLADE (2.610 pts)\n3º - VALKYRIE (2.420 pts)\n4º - PHOENIX (2.190 pts)\n\nJogue partidas ranqueadas na Arena para subir na tabela!');
    });
}

// ==========================================
// MODAL & MULTIPLAYER EM TEMPO REAL
// ==========================================
const modal = document.getElementById('room-modal');
const viewList = document.getElementById('view-room-list');
const viewCreate = document.getElementById('view-create-room');
const modalTitle = document.getElementById('modal-main-title');

// Botões do Modal
const btnPlay = document.getElementById('btn-play');
if (btnPlay) {
    btnPlay.onclick = () => {
        viewCreate.classList.add('hidden');
        viewList.classList.remove('hidden');
        modalTitle.innerHTML = '<i class="fas fa-globe"></i> ARENA MULTIPLAYER';
        modal.classList.remove('hidden');
        carregarSalas();
    };
}

const closeBtn = document.getElementById('close-modal-btn');
if (closeBtn) closeBtn.onclick = () => modal.classList.add('hidden');

if (modal) {
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.add('hidden');
    });
}

const btnShowCreate = document.getElementById('btn-show-create');
if (btnShowCreate) {
    btnShowCreate.onclick = () => {
        viewList.classList.add('hidden');
        setTimeout(() => {
            viewCreate.classList.remove('hidden');
            modalTitle.innerHTML = '<i class="fas fa-plus-circle"></i> CRIAR NOVA SALA';
        }, 150);
    };
}

const btnCancelCreate = document.getElementById('btn-cancel-create');
if (btnCancelCreate) {
    btnCancelCreate.onclick = () => {
        viewCreate.classList.add('hidden');
        setTimeout(() => {
            viewList.classList.remove('hidden');
            modalTitle.innerHTML = '<i class="fas fa-globe"></i> ARENA MULTIPLAYER';
        }, 150);
    };
}

// ==========================================
// INTEGRAÇÃO COM SERVIDOR VIA SOCKET.IO
// ==========================================
let socket = null;

function loadSocketIO(onReady) {
    if (typeof io !== 'undefined') {
        onReady();
        return;
    }
    const script = document.createElement('script');
    script.src = '/socket.io/socket.io.js';
    script.onload = onReady;
    script.onerror = () => {
        const cdn = document.createElement('script');
        cdn.src = 'https://cdn.socket.io/4.7.5/socket.io.min.js';
        cdn.onload = onReady;
        cdn.onerror = () => {
            console.warn('Socket.io indisponível. Funcionando em modo offline.');
            carregarSalasOffline();
        };
        document.head.appendChild(cdn);
    };
    document.head.appendChild(script);
}

loadSocketIO(() => {
    try {
        const url = window.location.protocol.startsWith('http') ? window.location.origin : 'http://localhost:3000';
        socket = io(url, { reconnectionAttempts: 3, timeout: 4000 });

        socket.on('connect', () => {
            console.log('✅ Conectado ao servidor multiplayer');
            socket.emit('get_rooms');
        });

        socket.on('room_list_updated', (rooms) => {
            renderRoomList(rooms);
        });

        socket.on('room_joined', (data) => {
            const playerConfig = getPlayerConfig();
            localStorage.setItem('arenaPlayer', JSON.stringify(playerConfig));
            sessionStorage.setItem('arenaSession', JSON.stringify({
                isOnline: true,
                roomCode: data.code,
                isHost: data.isHost
            }));

            if (data.isHost && data.room && data.room.isPrivate) {
                alert(`🎮 Sala Privada Criada!\nCódigo de Acesso: #${data.code}\nCompartilhe com seus amigos para jogarem juntos!`);
            }

            window.location.href = `arena.html?room=${data.code}`;
        });

        socket.on('join_error', (err) => {
            alert(`❌ ${err.message || 'Erro ao entrar na sala.'}`);
            const btn = document.getElementById('btn-confirm-create');
            if (btn) btn.innerHTML = 'CRIAR E ENTRAR <i class="fas fa-rocket"></i>';
        });

    } catch (e) {
        console.warn('Erro ao conectar ao Socket.io:', e);
        carregarSalasOffline();
    }
});

function carregarSalas() {
    if (socket && socket.connected) {
        socket.emit('get_rooms');
    } else {
        carregarSalasOffline();
    }
}

function renderRoomList(rooms) {
    const roomListContainer = document.getElementById('room-list');
    if (!roomListContainer) return;
    roomListContainer.innerHTML = '';

    // 1. Opção Fixa Sempre Disponível: Treino Solo vs IA Avançada
    const soloLi = document.createElement('li');
    soloLi.classList.add('room-item');
    soloLi.innerHTML = `
        <div class="room-info">
            <h4>Batalha Solo (vs IA)</h4>
            <p><i class="fas fa-robot"></i> 5 Bots com Esquiva e Kiting Tático</p>
        </div>
        <div class="room-status">
            <span class="player-count"><i class="fas fa-user-shield"></i> Treino</span>
            <button class="btn-enter-room" onclick="iniciarSolo()">JOGAR</button>
        </div>
    `;
    roomListContainer.appendChild(soloLi);

    // 2. Salas Públicas do Servidor
    if (rooms && rooms.length > 0) {
        rooms.forEach(sala => {
            const li = document.createElement('li');
            li.classList.add('room-item');
            const isFull = sala.players >= sala.max;
            li.innerHTML = `
                <div class="room-info">
                    <h4>${escapeHtml(sala.name)}</h4>
                    <p><i class="fas fa-map-marker-alt"></i> ${sala.map} &bull; Código: <b>#${sala.code}</b></p>
                </div>
                <div class="room-status">
                    <span class="player-count ${isFull ? 'full' : ''}">
                        <i class="fas fa-users"></i> ${sala.players}/${sala.max}
                    </span>
                    <button class="btn-enter-room" ${isFull ? 'disabled' : ''} onclick="entrarNaSala('${sala.code}')">
                        ${isFull ? 'LOTADA' : 'ENTRAR'}
                    </button>
                </div>
            `;
            roomListContainer.appendChild(li);
        });
    }
}

function carregarSalasOffline() {
    const salasMock = [
        { nome: "Arena dos Campeões", mapa: "Hexágono Cósmico", jogadores: 3, max: 4, code: "LOS01" },
        { nome: "Brawl Amigável", mapa: "Abismo Escuro", jogadores: 1, max: 2, code: "LOS02" }
    ];
    renderRoomList(salasMock);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.innerText = text;
    return div.innerHTML;
}

// ==========================================
// AÇÕES DE ENTRADA E CRIAÇÃO
// ==========================================
window.iniciarSolo = function () {
    const playerConfig = getPlayerConfig();
    localStorage.setItem('arenaPlayer', JSON.stringify(playerConfig));
    sessionStorage.setItem('arenaSession', JSON.stringify({ isOnline: false, mode: 'solo' }));
    window.location.href = 'arena.html?mode=solo';
};

window.entrarNaSala = function (code) {
    const playerConfig = getPlayerConfig();
    localStorage.setItem('arenaPlayer', JSON.stringify(playerConfig));

    if (socket && socket.connected) {
        socket.emit('join_room', { code: code, playerInfo: playerConfig });
    } else {
        sessionStorage.setItem('arenaSession', JSON.stringify({ isOnline: false, roomCode: code }));
        window.location.href = `arena.html?room=${code}`;
    }
};

window.entrarNoJogo = function () {
    iniciarSolo();
};

// Entrar por Código
const codeInput = document.querySelector('.join-code-box input');
const codeBtn = document.querySelector('.btn-join-code');

if (codeBtn && codeInput) {
    const triggerJoinCode = () => {
        const code = codeInput.value.trim().toUpperCase();
        if (!code) {
            alert('Por favor, digite o código da sala!');
            return;
        }
        entrarNaSala(code);
    };

    codeBtn.onclick = triggerJoinCode;
    codeInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') triggerJoinCode();
    });
}

// Criar e Entrar
const btnConfirmCreate = document.getElementById('btn-confirm-create');
if (btnConfirmCreate) {
    btnConfirmCreate.onclick = () => {
        const name = document.getElementById('new-room-name').value.trim() || 'Sala Privada';
        const map = document.getElementById('new-room-map').value;
        const players = parseInt(document.getElementById('new-room-players').value) || 4;
        const isPrivate = document.getElementById('new-room-private').checked;

        btnConfirmCreate.innerHTML = '<i class="fas fa-spinner fa-spin"></i> CRIANDO...';

        const playerConfig = getPlayerConfig();
        localStorage.setItem('arenaPlayer', JSON.stringify(playerConfig));

        if (socket && socket.connected) {
            socket.emit('create_room', {
                name: name,
                map: map,
                maxPlayers: players,
                isPrivate: isPrivate,
                fillBots: true,
                playerInfo: playerConfig
            });
        } else {
            setTimeout(() => {
                sessionStorage.setItem('arenaSession', JSON.stringify({
                    isOnline: false,
                    name: name,
                    map: map,
                    maxPlayers: players
                }));
                window.location.href = 'arena.html';
            }, 500);
        }
    };
}
