/**
 * BATTLE ARENA: LAST ONE STANDING - MODERN MENU CONTROLLER
 * Full Web Audio SFX, Clean Champion Showcase & Multiplayer Realtime
 */

// ==========================================
// 1. ROSTER DE CAMPEÕES
// ==========================================
const characters = [
    {
        id: 'kaelen',
        name: 'KAELEN',
        class: 'GUERREIRO DO SOL',
        img: 'assets/kaelen.png',
        color: '#00d2ff',
        weapon: 'melee'
    },
    {
        id: 'elara',
        name: 'ELARA',
        class: 'PATRULHEIRA DA FLORESTA',
        img: 'assets/elara.png',
        color: '#00ff88',
        weapon: 'ranged'
    },
    {
        id: 'malacor',
        name: 'MALACOR',
        class: 'MAGO DAS SOMBRAS',
        img: 'assets/malacor.png',
        color: '#b19cd9',
        weapon: 'ranged'
    },
    {
        id: 'lyra',
        name: 'LYRA',
        class: 'SACERDOTISA DA LUZ',
        img: 'assets/lyra.png',
        color: '#ffd700',
        weapon: 'melee'
    },
    {
        id: 'silas',
        name: 'SILAS',
        class: 'ASSASSINO DA NÉVOA',
        img: 'assets/silas.png',
        color: '#ffffff',
        weapon: 'melee'
    },
    {
        id: 'morwen',
        name: 'MORWEN',
        class: 'INVOCADORA ELEMENTAL',
        img: 'assets/morwen.png',
        color: '#ff3d68',
        weapon: 'ranged'
    }
];

let selectedCharIndex = 0;

// Elementos da interface
const rosterContainer = document.getElementById('roster-container');
const mainImg = document.getElementById('main-hero-img');
const hudAvatarImg = document.getElementById('hud-avatar-img');
const nickInput = document.getElementById('player-nickname-input');
const rankUserName = document.getElementById('rank-user-name');
const rankTop1Name = document.getElementById('rank-top1-name');

// ==========================================
// 2. SISTEMA DE ÁUDIO SINTETIZADO (WEB AUDIO)
// ==========================================
const AudioEngine = {
    ctx: null,
    muted: localStorage.getItem('arena_sound_muted') === 'true',

    init() {
        if (!this.ctx) {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (AudioCtx) this.ctx = new AudioCtx();
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    },

    play(type) {
        if (this.muted) return;
        try {
            this.init();
            if (!this.ctx) return;
            const now = this.ctx.currentTime;

            if (type === 'hover') {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(420, now);
                osc.frequency.exponentialRampToValueAtTime(640, now + 0.04);
                gain.gain.setValueAtTime(0.025, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
                osc.connect(gain);
                gain.connect(this.ctx.destination);
                osc.start(now);
                osc.stop(now + 0.04);
            } else if (type === 'select') {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(240, now);
                osc.frequency.exponentialRampToValueAtTime(560, now + 0.12);
                gain.gain.setValueAtTime(0.07, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
                osc.connect(gain);
                gain.connect(this.ctx.destination);
                osc.start(now);
                osc.stop(now + 0.12);
            } else if (type === 'play') {
                const osc1 = this.ctx.createOscillator();
                const osc2 = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc1.type = 'sawtooth';
                osc2.type = 'sine';
                osc1.frequency.setValueAtTime(120, now);
                osc1.frequency.exponentialRampToValueAtTime(480, now + 0.28);
                osc2.frequency.setValueAtTime(70, now);
                osc2.frequency.exponentialRampToValueAtTime(240, now + 0.28);
                gain.gain.setValueAtTime(0.12, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);
                osc1.connect(gain);
                osc2.connect(gain);
                gain.connect(this.ctx.destination);
                osc1.start(now);
                osc2.start(now);
                osc1.stop(now + 0.32);
                osc2.stop(now + 0.32);
            } else if (type === 'click') {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(700, now);
                gain.gain.setValueAtTime(0.04, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);
                osc.connect(gain);
                gain.connect(this.ctx.destination);
                osc.start(now);
                osc.stop(now + 0.035);
            }
        } catch (e) {}
    },

    toggle() {
        this.muted = !this.muted;
        localStorage.setItem('arena_sound_muted', this.muted);
        return this.muted;
    }
};

// Botão de som no Header
const btnSound = document.getElementById('btn-toggle-sound');
const soundIcon = document.getElementById('sound-icon');
if (btnSound && soundIcon) {
    const updateSoundUI = () => {
        if (AudioEngine.muted) {
            soundIcon.className = 'fas fa-volume-mute';
            btnSound.style.opacity = '0.5';
        } else {
            soundIcon.className = 'fas fa-volume-up';
            btnSound.style.opacity = '1';
        }
    };
    updateSoundUI();
    btnSound.addEventListener('click', () => {
        const isMuted = AudioEngine.toggle();
        updateSoundUI();
        if (!isMuted) AudioEngine.play('click');
    });
}

// Botão de Tela Cheia
const btnFullscreen = document.getElementById('btn-toggle-fullscreen');
if (btnFullscreen) {
    btnFullscreen.addEventListener('click', () => {
        AudioEngine.play('click');
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(() => {});
        } else {
            document.exitFullscreen().catch(() => {});
        }
    });
}

// ==========================================
// 3. CARREGAMENTO DE DADOS DO JOGADOR (NICKNAME DIRETO)
// ==========================================
const savedPlayer = JSON.parse(localStorage.getItem('arenaPlayer') || '{}');
const playerInfo = JSON.parse(localStorage.getItem('arenaPlayerInfo') || '{}');
const activeNickname = (savedPlayer.nickname || playerInfo.username || 'GUERREIRO').slice(0, 16);

if (nickInput) nickInput.value = activeNickname;
if (rankUserName) rankUserName.innerText = `${activeNickname} (VOCÊ)`;
if (rankTop1Name) rankTop1Name.innerText = activeNickname;

if (savedPlayer.charId) {
    const idx = characters.findIndex(c => c.id === savedPlayer.charId);
    if (idx !== -1) selectedCharIndex = idx;
}

// Edição de Nickname direta no Input
const btnEditNick = document.getElementById('btn-edit-nick');
if (btnEditNick && nickInput) {
    btnEditNick.addEventListener('click', () => {
        AudioEngine.play('click');
        nickInput.focus();
        nickInput.select();
    });
}

if (nickInput) {
    nickInput.addEventListener('input', () => savePlayerData());
    nickInput.addEventListener('blur', () => {
        if (!nickInput.value.trim()) nickInput.value = 'GUERREIRO';
        savePlayerData();
    });
    nickInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            nickInput.blur();
        }
    });
}

function savePlayerData() {
    const config = getPlayerConfig();
    localStorage.setItem('arenaPlayer', JSON.stringify(config));
    if (rankUserName) rankUserName.innerText = `${config.nickname} (VOCÊ)`;
    if (rankTop1Name) rankTop1Name.innerText = config.nickname;
}

function getPlayerConfig() {
    const char = characters[selectedCharIndex] || characters[0];
    const rawNick = nickInput ? nickInput.value.trim().toUpperCase() : 'GUERREIRO';
    return {
        nickname: (rawNick || 'GUERREIRO').slice(0, 16),
        color: char.color,
        weapon: char.weapon,
        charId: char.id
    };
}

// ==========================================
// 4. SELEÇÃO & RENDERIZAÇÃO DO ROSTER
// ==========================================
function updateHeroDetails(char) {
    document.documentElement.style.setProperty('--hero-theme-color', char.color);
    if (hudAvatarImg) hudAvatarImg.src = char.img;
}

function renderRoster() {
    if (!rosterContainer) return;
    rosterContainer.innerHTML = '';

    characters.forEach((char, index) => {
        const thumb = document.createElement('div');
        thumb.classList.add('char-thumb');
        if (index === selectedCharIndex) thumb.classList.add('active');

        thumb.innerHTML = `<img src="${char.img}" alt="${char.name}" loading="lazy">`;

        thumb.addEventListener('mouseenter', () => AudioEngine.play('hover'));

        thumb.addEventListener('click', () => {
            if (selectedCharIndex === index) return;
            selectedCharIndex = index;
            AudioEngine.play('select');

            document.querySelectorAll('.char-thumb').forEach(t => t.classList.remove('active'));
            thumb.classList.add('active');

            if (mainImg) {
                mainImg.style.opacity = '0';
                setTimeout(() => {
                    mainImg.src = char.img;
                    updateHeroDetails(char);
                    mainImg.style.opacity = '1';
                }, 120);
            }

            savePlayerData();
        });

        rosterContainer.appendChild(thumb);
    });

    const initialHero = characters[selectedCharIndex] || characters[0];
    if (mainImg) mainImg.src = initialHero.img;
    updateHeroDetails(initialHero);
}

renderRoster();

// ==========================================
// 5. PWA: SERVICE WORKER & INSTALAÇÃO
// ==========================================
let deferredPWAInstallPrompt = null;
const btnInstallPwa = document.getElementById('btn-install-pwa');

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('service-worker.js').catch(() => {});
    });
}

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPWAInstallPrompt = e;
    if (btnInstallPwa) btnInstallPwa.classList.add('install-ready');
});

window.addEventListener('appinstalled', () => {
    deferredPWAInstallPrompt = null;
    if (btnInstallPwa) {
        btnInstallPwa.innerHTML = '<div class="action-btn-icon"><i class="fas fa-check"></i></div><span>Instalado</span>';
        setTimeout(() => { btnInstallPwa.style.display = 'none'; }, 3000);
    }
});

if (btnInstallPwa) {
    btnInstallPwa.addEventListener('click', async () => {
        AudioEngine.play('click');
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
                alert('✅ Battle Arena já está instalado e rodando como aplicativo!');
            } else if (isIOS) {
                alert('📱 Para instalar no iPhone/iPad:\n1. Toque no ícone de Compartilhar (no Safari)\n2. Selecione "Adicionar à Tela de Início"');
            } else {
                alert('💡 Para instalar o Battle Arena:\nNo Chrome ou Edge, clique no ícone de instalar na barra de navegação ou no menu de opções.');
            }
        }
    });
}

// ==========================================
// 6. MODAIS & BOTÕES DE AÇÃO (TREINO IA, MULTIPLAYER, RANKING, GUIA)
// ==========================================
const roomModal = document.getElementById('room-modal');
const rankingModal = document.getElementById('ranking-modal');
const guideModal = document.getElementById('guide-modal');

// Botão Direto: Modo Treino (vs IA)
const btnPlaySolo = document.getElementById('btn-play-solo');
if (btnPlaySolo) {
    btnPlaySolo.addEventListener('mouseenter', () => AudioEngine.play('hover'));
    btnPlaySolo.addEventListener('click', () => {
        window.iniciarSolo();
    });
}

// Botão de Salas Multiplayer Online
const btnPlay = document.getElementById('btn-play');
if (btnPlay) {
    btnPlay.addEventListener('mouseenter', () => AudioEngine.play('hover'));
    btnPlay.addEventListener('click', () => {
        AudioEngine.play('play');
        if (roomModal) {
            switchModalTab('rooms');
            roomModal.classList.remove('hidden');
            carregarSalas();
        }
    });
}

// Botão de Ranking
const btnRanking = document.getElementById('btn-ranking');
if (btnRanking && rankingModal) {
    btnRanking.addEventListener('click', () => {
        AudioEngine.play('click');
        rankingModal.classList.remove('hidden');
    });
}
const closeRankingBtn = document.getElementById('close-ranking-btn');
if (closeRankingBtn && rankingModal) {
    closeRankingBtn.addEventListener('click', () => {
        AudioEngine.play('click');
        rankingModal.classList.add('hidden');
    });
}

// Botão de Guia de Controles
const btnGuide = document.getElementById('btn-guide');
if (btnGuide && guideModal) {
    btnGuide.addEventListener('click', () => {
        AudioEngine.play('click');
        guideModal.classList.remove('hidden');
    });
}
const closeGuideBtn = document.getElementById('close-guide-btn');
if (closeGuideBtn && guideModal) {
    closeGuideBtn.addEventListener('click', () => {
        AudioEngine.play('click');
        guideModal.classList.add('hidden');
    });
}

// Botão Meu Nick (Edição rápida de Nickname)
const btnOptions = document.getElementById('btn-options');
if (btnOptions) {
    btnOptions.addEventListener('click', () => {
        AudioEngine.play('click');
        const currentUser = nickInput ? nickInput.value.trim() : 'GUERREIRO';
        const newNick = prompt('✏️ DIGITE SEU NICKNAME PARA JOGAR:', currentUser);
        if (newNick && newNick.trim()) {
            const clean = newNick.trim().toUpperCase().slice(0, 16);
            if (nickInput) nickInput.value = clean;
            savePlayerData();
        }
    });
}

// Fechamento de Modais ao clicar no fundo
[roomModal, rankingModal, guideModal].forEach(modalEl => {
    if (modalEl) {
        modalEl.addEventListener('click', (e) => {
            if (e.target === modalEl) {
                AudioEngine.play('click');
                modalEl.classList.add('hidden');
            }
        });
    }
});

// Fechar Modal de Salas
const closeRoomBtn = document.getElementById('close-modal-btn');
if (closeRoomBtn && roomModal) {
    closeRoomBtn.addEventListener('click', () => {
        AudioEngine.play('click');
        roomModal.classList.add('hidden');
    });
}

// Tabs do Modal de Salas
const tabRooms = document.getElementById('tab-rooms');
const tabCreate = document.getElementById('tab-create');
const viewList = document.getElementById('view-room-list');
const viewCreate = document.getElementById('view-create-room');

function switchModalTab(tab) {
    AudioEngine.play('click');
    if (tab === 'rooms') {
        tabRooms.classList.add('active');
        tabCreate.classList.remove('active');
        viewList.classList.remove('hidden');
        viewCreate.classList.add('hidden');
        carregarSalas();
    } else {
        tabCreate.classList.add('active');
        tabRooms.classList.remove('active');
        viewCreate.classList.remove('hidden');
        viewList.classList.add('hidden');
    }
}

if (tabRooms) tabRooms.addEventListener('click', () => switchModalTab('rooms'));
if (tabCreate) tabCreate.addEventListener('click', () => switchModalTab('create'));

const btnShowCreate = document.getElementById('btn-show-create');
if (btnShowCreate) btnShowCreate.addEventListener('click', () => switchModalTab('create'));

const btnCancelCreate = document.getElementById('btn-cancel-create');
if (btnCancelCreate) btnCancelCreate.addEventListener('click', () => switchModalTab('rooms'));

const btnRefreshRooms = document.getElementById('btn-refresh-rooms');
if (btnRefreshRooms) {
    btnRefreshRooms.addEventListener('click', () => {
        AudioEngine.play('click');
        carregarSalas();
    });
}

// ==========================================
// 7. MULTIPLAYER EM TEMPO REAL (SOCKET.IO)
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
            console.warn('Socket.io indisponível. Rodando modo offline com bots.');
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
                alert(`🎮 Sala Privada Criada!\nCódigo: #${data.code}\nCompartilhe com seus amigos!`);
            }

            window.location.href = `arena.html?room=${data.code}`;
        });

        socket.on('join_error', (err) => {
            alert(`❌ ${err.message || 'Erro ao entrar na sala.'}`);
            const btn = document.getElementById('btn-confirm-create');
            if (btn) btn.innerHTML = '<span>CRIAR E INICIAR</span> <i class="fas fa-rocket"></i>';
        });

    } catch (e) {
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
    const listContainer = document.getElementById('room-list');
    if (!listContainer) return;
    listContainer.innerHTML = '';

    // 1. Treino Solo vs IA
    const soloLi = document.createElement('li');
    soloLi.classList.add('room-item');
    soloLi.innerHTML = `
        <div class="room-info">
            <h4>Batalha Solo (vs IA Inteligente)</h4>
            <p><i class="fas fa-robot"></i> 5 Bots com Esquiva e Combate Tático</p>
        </div>
        <div class="room-status">
            <span class="player-count"><i class="fas fa-user-shield"></i> Treino</span>
            <button class="btn-enter-room" onclick="iniciarSolo()">JOGAR</button>
        </div>
    `;
    listContainer.appendChild(soloLi);

    // 2. Salas Públicas
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
            listContainer.appendChild(li);
        });
    }
}

function carregarSalasOffline() {
    const salasMock = [
        { name: "Arena dos Campeões", map: "Hexágono Cósmico", players: 3, max: 4, code: "LOS01" },
        { name: "Brawl Galáctico", map: "Abismo Escuro", players: 1, max: 2, code: "LOS02" }
    ];
    renderRoomList(salasMock);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.innerText = text;
    return div.innerHTML;
}

window.iniciarSolo = function () {
    AudioEngine.play('play');
    const playerConfig = getPlayerConfig();
    localStorage.setItem('arenaPlayer', JSON.stringify(playerConfig));
    sessionStorage.setItem('arenaSession', JSON.stringify({ isOnline: false, mode: 'solo' }));
    window.location.href = 'arena.html?mode=solo';
};

window.entrarNaSala = function (code) {
    AudioEngine.play('play');
    const playerConfig = getPlayerConfig();
    localStorage.setItem('arenaPlayer', JSON.stringify(playerConfig));

    if (socket && socket.connected) {
        socket.emit('join_room', { code: code, playerInfo: playerConfig });
    } else {
        sessionStorage.setItem('arenaSession', JSON.stringify({ isOnline: false, roomCode: code }));
        window.location.href = `arena.html?room=${code}`;
    }
};

// Entrar com Código
const inputCode = document.getElementById('input-room-code');
const btnJoinCode = document.getElementById('btn-join-code');
if (btnJoinCode && inputCode) {
    const submitCode = () => {
        const code = inputCode.value.trim().toUpperCase();
        if (!code) {
            alert('Por favor, informe o código da sala!');
            return;
        }
        entrarNaSala(code);
    };
    btnJoinCode.addEventListener('click', submitCode);
    inputCode.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') submitCode();
    });
}

// Criar Sala
const btnConfirmCreate = document.getElementById('btn-confirm-create');
if (btnConfirmCreate) {
    btnConfirmCreate.addEventListener('click', () => {
        AudioEngine.play('play');
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
            }, 400);
        }
    });
}

// ==========================================
// 8. ORIENTAÇÃO LANDSCAPE OBRIGATÓRIA
// ==========================================
function tryLockLandscape() {
    try {
        if (screen.orientation && screen.orientation.lock) {
            screen.orientation.lock('landscape').catch(() => {});
        }
    } catch (e) {}
}

const btnRotateFs = document.getElementById('btn-fullscreen-rotate');
if (btnRotateFs) {
    btnRotateFs.addEventListener('click', () => {
        const doc = document.documentElement;
        if (doc.requestFullscreen) doc.requestFullscreen().then(tryLockLandscape).catch(tryLockLandscape);
        else if (doc.webkitRequestFullscreen) { doc.webkitRequestFullscreen(); tryLockLandscape(); }
        else tryLockLandscape();
    });
}

window.addEventListener('load', tryLockLandscape);
document.addEventListener('touchstart', tryLockLandscape, { once: true });
