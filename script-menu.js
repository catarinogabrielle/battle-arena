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
const netStatusEl = document.getElementById('net-status');
const netStatusText = document.getElementById('net-status-text');

// Recupera apelido salvo se houver
const savedPlayerInfo = JSON.parse(localStorage.getItem('arenaPlayer') || '{}');
if (savedPlayerInfo.nickname) {
    nickElement.innerText = savedPlayerInfo.nickname;
}
if (savedPlayerInfo.charId) {
    const idx = characters.findIndex(c => c.id === savedPlayerInfo.charId);
    if (idx !== -1) selectedCharIndex = idx;
}

function renderRoster() {
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

            mainImg.style.opacity = '0';
            setTimeout(() => {
                mainImg.src = char.img;
                mainName.innerText = char.name;
                mainClass.innerText = char.class;
                mainImg.style.opacity = '1';
            }, 150);
        });
        rosterContainer.appendChild(btn);
    });

    // Atualiza com o selecionado inicial
    const initChar = characters[selectedCharIndex];
    if (initChar) {
        mainImg.src = initChar.img;
        mainName.innerText = initChar.name;
        mainClass.innerText = initChar.class;
    }
}
renderRoster();

function getLocalPlayerConfig() {
    const char = characters[selectedCharIndex];
    return {
        nickname: nickElement.innerText.trim() || 'GUERREIRO',
        color: char.color,
        weapon: char.weapon,
        charId: char.id
    };
}

// Salva apelido ao editar
nickElement.addEventListener('blur', () => {
    localStorage.setItem('arenaPlayer', JSON.stringify(getLocalPlayerConfig()));
});

// ==========================================
// CONEXÃO COM O SERVIDOR SOCKET.IO
// ==========================================
let socket = null;
let currentRoom = null;
let isCurrentHost = false;

function initSocketConnection() {
    try {
        const serverUrl = window.location.protocol.startsWith('http') ? window.location.origin : 'http://localhost:3000';
        if (typeof io !== 'undefined') {
            socket = io(serverUrl, { reconnectionAttempts: 5, timeout: 5000 });

            socket.on('connect', () => {
                console.log('✅ Conectado ao servidor multiplayer!');
                netStatusEl.className = 'net-status-badge online';
                netStatusText.innerText = 'ONLINE';
            });

            socket.on('disconnect', () => {
                console.warn('⚠️ Desconectado do servidor!');
                netStatusEl.className = 'net-status-badge offline';
                netStatusText.innerText = 'OFFLINE';
            });

            socket.on('connect_error', () => {
                netStatusEl.className = 'net-status-badge offline';
                netStatusText.innerText = 'OFFLINE';
            });

            socket.on('room_list_updated', (rooms) => {
                renderPublicRooms(rooms);
            });

            socket.on('room_joined', (data) => {
                currentRoom = data.room;
                isCurrentHost = data.isHost;
                renderLobbyView(data.room, data.isHost);
            });

            socket.on('lobby_updated', (roomData) => {
                currentRoom = roomData;
                isCurrentHost = (socket && socket.id === roomData.hostId);
                renderLobbyView(roomData, isCurrentHost);
            });

            socket.on('match_starting', (data) => {
                const btnStart = document.getElementById('btn-start-match');
                if (btnStart) {
                    btnStart.innerHTML = `<i class="fas fa-spinner fa-spin"></i> PREPARANDO ARENA...`;
                    btnStart.disabled = true;
                }

                // Salva a sessão multiplayer
                sessionStorage.setItem('multiplayerSession', JSON.stringify({
                    isOnline: true,
                    roomCode: currentRoom.code,
                    player: getLocalPlayerConfig()
                }));
                localStorage.setItem('arenaPlayer', JSON.stringify(getLocalPlayerConfig()));

                setTimeout(() => {
                    window.location.href = `arena.html?mode=online&room=${currentRoom.code}`;
                }, 1000);
            });

            socket.on('join_error', (data) => {
                alert(`❌ ${data.message || 'Erro ao entrar na sala!'}`);
                const btnConfirm = document.getElementById('btn-confirm-create');
                if (btnConfirm) btnConfirm.innerHTML = 'CRIAR SALA <i class="fas fa-rocket"></i>';
            });
        }
    } catch (e) {
        console.error('Falha ao inicializar Socket.io:', e);
        netStatusEl.className = 'net-status-badge offline';
        netStatusText.innerText = 'OFFLINE';
    }
}

// Inicia após pequeno delay para garantir carregamento de scripts
setTimeout(initSocketConnection, 200);

// ==========================================
// NAVEGAÇÃO DE TELAS DO MODAL
// ==========================================
const modal = document.getElementById('room-modal');
const modalTitle = document.getElementById('modal-main-title');
const viewList = document.getElementById('view-room-list');
const viewCreate = document.getElementById('view-create-room');
const viewLobby = document.getElementById('view-room-lobby');
const viewSolo = document.getElementById('view-solo-setup');

function switchModalView(viewName) {
    [viewList, viewCreate, viewLobby, viewSolo].forEach(v => {
        if (v) v.classList.add('hidden');
    });

    modal.classList.remove('hidden');

    if (viewName === 'list') {
        viewList.classList.remove('hidden');
        modalTitle.innerHTML = '<i class="fas fa-globe"></i> ARENA MULTIPLAYER';
        if (socket && socket.connected) {
            socket.emit('get_rooms');
        }
    } else if (viewName === 'create') {
        viewCreate.classList.remove('hidden');
        modalTitle.innerHTML = '<i class="fas fa-plus-circle"></i> CRIAR NOVA SALA';
    } else if (viewName === 'lobby') {
        viewLobby.classList.remove('hidden');
        modalTitle.innerHTML = '<i class="fas fa-users-cog"></i> LOBBY DA SALA';
    } else if (viewName === 'solo') {
        viewSolo.classList.remove('hidden');
        modalTitle.innerHTML = '<i class="fas fa-robot"></i> TREINO CONTRA IA';
    }
}

document.getElementById('btn-play').onclick = () => switchModalView('list');
document.getElementById('btn-solo').onclick = () => switchModalView('solo');

document.getElementById('close-modal-btn').onclick = () => {
    if (currentRoom) {
        if (confirm('Deseja realmente sair da sala atual?')) {
            if (socket) socket.emit('leave_room');
            currentRoom = null;
            modal.classList.add('hidden');
        }
    } else {
        modal.classList.add('hidden');
    }
};

modal.addEventListener('click', (e) => {
    if (e.target === modal) {
        if (currentRoom) {
            if (confirm('Deseja realmente sair da sala atual?')) {
                if (socket) socket.emit('leave_room');
                currentRoom = null;
                modal.classList.add('hidden');
            }
        } else {
            modal.classList.add('hidden');
        }
    }
});

document.getElementById('btn-show-create').onclick = () => switchModalView('create');
document.getElementById('btn-cancel-create').onclick = () => switchModalView('list');
document.getElementById('btn-cancel-solo').onclick = () => modal.classList.add('hidden');

// ==========================================
// LISTA DE SALAS PÚBLICAS
// ==========================================
function renderPublicRooms(roomsList) {
    const listEl = document.getElementById('room-list');
    listEl.innerHTML = '';

    if (!roomsList || roomsList.length === 0) {
        listEl.innerHTML = `
            <div class="empty-rooms">
                <i class="fas fa-inbox"></i>
                <p>Nenhuma sala pública aberta no momento.</p>
                <span>Crie uma nova sala para seus amigos ou jogue contra a IA!</span>
            </div>
        `;
        return;
    }

    roomsList.forEach(sala => {
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
                <button class="btn-enter-room" ${isFull ? 'disabled' : ''} onclick="joinRoomByCode('${sala.code}')">
                    ${isFull ? 'LOTADA' : 'ENTRAR'}
                </button>
            </div>
        `;
        listEl.appendChild(li);
    });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.innerText = text;
    return div.innerHTML;
}

window.joinRoomByCode = function (code) {
    if (!socket || !socket.connected) {
        alert('Servidor offline! Inicie o servidor com "npm start" para jogar multiplayer.');
        return;
    }
    socket.emit('join_room', {
        code: code,
        playerInfo: getLocalPlayerConfig()
    });
};

document.getElementById('btn-join-by-code').onclick = () => {
    const input = document.getElementById('input-room-code');
    const code = input.value.trim().toUpperCase();
    if (!code) {
        alert('Digite o código da sala!');
        return;
    }
    joinRoomByCode(code);
};

document.getElementById('btn-refresh-rooms').onclick = () => {
    if (socket && socket.connected) {
        socket.emit('get_rooms');
    }
};

// ==========================================
// CRIAÇÃO DE SALA
// ==========================================
document.getElementById('btn-confirm-create').onclick = () => {
    if (!socket || !socket.connected) {
        alert('Servidor multiplayer offline! Certifique-se de executar "npm start".');
        return;
    }

    const roomName = document.getElementById('new-room-name').value.trim() || 'Arena dos Campeões';
    const roomMap = document.getElementById('new-room-map').value;
    const maxPlayers = document.getElementById('new-room-players').value;
    const botDiff = document.getElementById('new-room-bot-diff').value;
    const fillBots = document.getElementById('new-room-fill-bots').checked;
    const isPrivate = document.getElementById('new-room-private').checked;

    const btn = document.getElementById('btn-confirm-create');
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> CRIANDO...';

    socket.emit('create_room', {
        name: roomName,
        map: roomMap,
        maxPlayers: maxPlayers,
        isPrivate: isPrivate,
        fillBots: fillBots,
        botDifficulty: botDiff,
        playerInfo: getLocalPlayerConfig()
    });
};

// ==========================================
// LOBBY DA SALA (SAGUÃO)
// ==========================================
function renderLobbyView(room, isHost) {
    switchModalView('lobby');

    document.getElementById('lobby-room-name').innerText = room.name;
    document.getElementById('lobby-map-name').innerText = room.map;
    document.getElementById('lobby-capacity-info').innerText = `${room.players.length}/${room.maxPlayers} Jogadores`;
    document.getElementById('lobby-room-code').innerText = `#${room.code}`;

    const grid = document.getElementById('lobby-players-grid');
    grid.innerHTML = '';

    room.players.forEach(p => {
        const card = document.createElement('div');
        card.className = `lobby-player-card ${p.isHost ? 'host' : ''}`;
        const heroData = characters.find(c => c.id === p.charId) || characters[0];

        card.innerHTML = `
            <div class="card-avatar" style="border-color: ${p.color}">
                <img src="${heroData.img}" alt="${heroData.name}">
            </div>
            <div class="card-meta">
                <div class="card-name" style="color: ${p.color}">
                    ${escapeHtml(p.name)}
                </div>
                <div class="card-hero">${heroData.name} &bull; ${heroData.weapon.toUpperCase()}</div>
            </div>
            <div class="card-badges">
                ${p.isHost ? '<span class="badge host"><i class="fas fa-crown"></i> HOST</span>' : ''}
                ${p.isBot ? `<span class="badge bot"><i class="fas fa-robot"></i> BOT</span>` : (p.ready ? '<span class="badge ready"><i class="fas fa-check"></i> PRONTO</span>' : '<span class="badge waiting">AGUARDANDO</span>')}
                ${isHost && p.isBot ? `<button class="btn-remove-bot" title="Remover Bot" onclick="removeBot('${p.id}')"><i class="fas fa-times"></i></button>` : ''}
            </div>
        `;
        grid.appendChild(card);
    });

    // Vagas vazias
    const emptySlots = room.maxPlayers - room.players.length;
    for (let i = 0; i < emptySlots; i++) {
        const emptyCard = document.createElement('div');
        emptyCard.className = 'lobby-player-card empty';
        emptyCard.innerHTML = `
            <div class="card-avatar empty-avatar"><i class="fas fa-user-plus"></i></div>
            <div class="card-meta">
                <div class="card-name">Vaga Aberta</div>
                <div class="card-hero">Aguardando jogador...</div>
            </div>
        `;
        grid.appendChild(emptyCard);
    }

    // Controle dos Botões
    const btnAddBot = document.getElementById('btn-add-bot');
    const btnStart = document.getElementById('btn-start-match');
    const btnReady = document.getElementById('btn-toggle-ready');

    if (isHost) {
        btnAddBot.style.display = (room.players.length < room.maxPlayers) ? 'inline-flex' : 'none';
        btnStart.style.display = 'inline-flex';
        btnReady.style.display = 'none';

        // Pode iniciar se tiver pelo menos 2 participantes
        if (room.players.length >= 2) {
            btnStart.disabled = false;
            btnStart.innerHTML = `<i class="fas fa-play"></i> INICIAR BATALHA (${room.players.length} Jogadores)`;
        } else {
            btnStart.disabled = true;
            btnStart.innerHTML = `<i class="fas fa-clock"></i> AGUARDANDO ADVERSÁRIO...`;
        }
    } else {
        btnAddBot.style.display = 'none';
        btnStart.style.display = 'none';
        btnReady.style.display = 'inline-flex';

        const me = room.players.find(p => socket && p.id === socket.id);
        if (me && me.ready) {
            btnReady.className = 'btn-ready active';
            btnReady.innerHTML = '<i class="fas fa-times"></i> CANCELAR PRONTO';
        } else {
            btnReady.className = 'btn-ready';
            btnReady.innerHTML = '<i class="fas fa-check"></i> ESTOU PRONTO';
        }
    }
}

window.removeBot = function (botId) {
    if (socket && isCurrentHost) {
        socket.emit('remove_bot', { botId: botId });
    }
};

document.getElementById('btn-add-bot').onclick = () => {
    if (socket && isCurrentHost) {
        socket.emit('add_bot');
    }
};

document.getElementById('btn-toggle-ready').onclick = () => {
    if (socket) {
        socket.emit('toggle_ready');
    }
};

document.getElementById('btn-start-match').onclick = () => {
    if (socket && isCurrentHost) {
        socket.emit('start_match');
    }
};

document.getElementById('btn-leave-lobby').onclick = () => {
    if (socket) {
        socket.emit('leave_room');
    }
    currentRoom = null;
    isCurrentHost = false;
    switchModalView('list');
};

document.getElementById('btn-copy-code').onclick = () => {
    if (!currentRoom) return;
    navigator.clipboard.writeText(currentRoom.code).then(() => {
        const badge = document.getElementById('btn-copy-code');
        const origHtml = badge.innerHTML;
        badge.innerHTML = `<span class="code-label" style="color: #00ff88;">COPIADO!</span> <strong>#${currentRoom.code}</strong> <i class="fas fa-check"></i>`;
        setTimeout(() => badge.innerHTML = origHtml, 2000);
    });
};

// ==========================================
// TREINO SOLO VS IA (OFFLINE / LOCAL)
// ==========================================
document.getElementById('btn-start-solo').onclick = () => {
    const diff = document.getElementById('solo-difficulty').value;
    const botCount = parseInt(document.getElementById('solo-bot-count').value);

    const soloConfig = {
        mode: 'solo',
        difficulty: diff,
        botCount: botCount,
        player: getLocalPlayerConfig()
    };

    sessionStorage.setItem('soloSession', JSON.stringify(soloConfig));
    sessionStorage.removeItem('multiplayerSession');
    localStorage.setItem('arenaPlayer', JSON.stringify(getLocalPlayerConfig()));

    window.location.href = `arena.html?mode=solo&diff=${diff}&bots=${botCount}`;
};

// Global para compatibilidade
window.entrarNoJogo = function () {
    switchModalView('list');
};
