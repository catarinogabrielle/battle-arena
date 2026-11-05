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
// 3. CARREGAMENTO DE DADOS DO JOGADOR & POPUP DE NICKNAME
// ==========================================
const savedPlayerRaw = localStorage.getItem('arenaPlayer');
const savedPlayer = JSON.parse(savedPlayerRaw || '{}');
const playerInfo = JSON.parse(localStorage.getItem('arenaPlayerInfo') || '{}');
const activeNickname = (savedPlayer.nickname || playerInfo.username || 'GUERREIRO').slice(0, 16);

if (nickInput) nickInput.value = activeNickname;
if (rankUserName) rankUserName.innerText = `${activeNickname} (VOCÊ)`;
if (rankTop1Name) rankTop1Name.innerText = activeNickname;

if (savedPlayer.charId) {
    const idx = characters.findIndex(c => c.id === savedPlayer.charId);
    if (idx !== -1) selectedCharIndex = idx;
}

// Elementos do Popup Personalizado de Nickname e Avisos
const nickModal = document.getElementById('nick-modal');
const modalNickInput = document.getElementById('modal-nick-input');
const nickModalAvatar = document.getElementById('nick-modal-avatar');
const btnSaveNickModal = document.getElementById('btn-save-nick-modal');
const btnCancelNick = document.getElementById('btn-cancel-nick');
const closeNickBtn = document.getElementById('close-nick-btn');
const btnRandomNick = document.getElementById('btn-random-nick');

const customPopupModal = document.getElementById('custom-popup-modal');
const customPopupTitle = document.getElementById('custom-popup-title');
const customPopupMsg = document.getElementById('custom-popup-msg');
const customPopupIcon = document.getElementById('custom-popup-icon');
const btnCustomPopupOk = document.getElementById('btn-custom-popup-ok');
let customPopupCallback = null;

function showArenaPopup(title, message, iconHtml = '<i class="fas fa-info-circle"></i>', onOk = null) {
    if (!customPopupModal) return;
    AudioEngine.play('click');
    if (customPopupTitle) customPopupTitle.innerText = title;
    if (customPopupMsg) customPopupMsg.innerText = message;
    if (customPopupIcon) customPopupIcon.innerHTML = iconHtml;
    customPopupCallback = onOk;
    customPopupModal.classList.remove('hidden');
}

if (btnCustomPopupOk && customPopupModal) {
    btnCustomPopupOk.addEventListener('click', () => {
        AudioEngine.play('click');
        customPopupModal.classList.add('hidden');
        if (typeof customPopupCallback === 'function') {
            const cb = customPopupCallback;
            customPopupCallback = null;
            cb();
        }
    });
}

function openNickModal() {
    if (!nickModal) return;
    AudioEngine.play('click');
    const char = characters[selectedCharIndex] || characters[0];
    if (nickModalAvatar) nickModalAvatar.src = char.img;
    if (modalNickInput) {
        modalNickInput.value = nickInput ? nickInput.value.trim() : activeNickname;
        setTimeout(() => {
            modalNickInput.focus();
            modalNickInput.select();
        }, 60);
    }
    nickModal.classList.remove('hidden');
}

function closeNickModal() {
    if (!nickModal) return;
    AudioEngine.play('click');
    nickModal.classList.add('hidden');
}

function confirmNickFromModal() {
    AudioEngine.play('play');
    const raw = modalNickInput ? modalNickInput.value.trim().toUpperCase() : '';
    const finalNick = (raw || 'GUERREIRO').slice(0, 16);
    if (nickInput) nickInput.value = finalNick;
    savePlayerData();
    if (nickModal) nickModal.classList.add('hidden');
}

if (btnSaveNickModal) btnSaveNickModal.addEventListener('click', confirmNickFromModal);
if (btnCancelNick) btnCancelNick.addEventListener('click', closeNickModal);
if (closeNickBtn) closeNickBtn.addEventListener('click', closeNickModal);

if (modalNickInput) {
    modalNickInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            confirmNickFromModal();
        }
    });
}

if (btnRandomNick && modalNickInput) {
    const sampleNicks = ['SHADOW_BR', 'TITAN_X', 'NOVA_KING', 'SOLAR_BLADE', 'DARK_WOLF', 'STORM_99', 'VALKYRIE', 'CYBER_HERO', 'OMEGA_PRO'];
    btnRandomNick.addEventListener('click', () => {
        AudioEngine.play('select');
        const pick = sampleNicks[Math.floor(Math.random() * sampleNicks.length)];
        modalNickInput.value = pick;
        modalNickInput.focus();
    });
}

// Abre o popup personalizado ao clicar no ícone de lápis ou se for o primeiro acesso
const btnEditNick = document.getElementById('btn-edit-nick');
if (btnEditNick) {
    btnEditNick.addEventListener('click', openNickModal);
}

if (!savedPlayerRaw) {
    window.addEventListener('load', () => {
        setTimeout(openNickModal, 300);
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
    RankingSystem.ensurePlayerEntry(config.nickname, config.charId);
    RankingSystem.render();
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
// 3.5 SISTEMA DE RANKING REAL (LOCAL + SERVIDOR)
// ==========================================
const RankingSystem = {
    defaultEntries: [
        { name: 'SHADOW_99', charId: 'elara', hero: 'ELARA', wins: 14, kills: 38, pts: 1460 },
        { name: 'VALKYRIE_X', charId: 'malacor', hero: 'MALACOR', wins: 11, kills: 29, pts: 1180 },
        { name: 'PHOENIX_BR', charId: 'morwen', hero: 'MORWEN', wins: 8, kills: 22, pts: 890 },
        { name: 'GHOST_STRIKE', charId: 'silas', hero: 'SILAS', wins: 6, kills: 17, pts: 680 },
        { name: 'SOLAR_KNIGHT', charId: 'kaelen', hero: 'KAELEN', wins: 4, kills: 12, pts: 450 }
    ],

    getList() {
        let list = [];
        try {
            list = JSON.parse(localStorage.getItem('arenaLeaderboard') || '[]');
        } catch (e) {
            list = [];
        }
        if (!Array.isArray(list) || list.length === 0) {
            list = [...this.defaultEntries];
            localStorage.setItem('arenaLeaderboard', JSON.stringify(list));
        }
        return list;
    },

    saveList(list) {
        localStorage.setItem('arenaLeaderboard', JSON.stringify(list));
    },

    ensurePlayerEntry(nickname, charId) {
        const cleanName = (nickname || 'GUERREIRO').trim().toUpperCase().slice(0, 16);
        const heroObj = characters.find(c => c.id === charId) || characters[0];
        const list = this.getList();
        let entry = list.find(item => item.name.toUpperCase() === cleanName);
        if (!entry) {
            entry = {
                name: cleanName,
                charId: heroObj.id,
                hero: heroObj.name,
                wins: 0,
                kills: 0,
                pts: 0
            };
            list.push(entry);
        } else {
            entry.charId = heroObj.id;
            entry.hero = heroObj.name;
        }
        this.saveList(list);
        return entry;
    },

    async syncWithServer() {
        const cfg = getPlayerConfig();
        const myEntry = this.ensurePlayerEntry(cfg.nickname, cfg.charId);
        try {
            // Envia pontuação do jogador atual se tiver pontos
            if (myEntry.pts > 0 || myEntry.wins > 0 || myEntry.kills > 0) {
                await fetch('/api/ranking', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(myEntry)
                });
            }
            const res = await fetch('/api/ranking');
            if (res.ok) {
                const remoteList = await res.json();
                if (Array.isArray(remoteList)) {
                    const localList = this.getList();
                    remoteList.forEach(rem => {
                        const existing = localList.find(l => l.name.toUpperCase() === rem.name.toUpperCase());
                        if (existing) {
                            existing.wins = Math.max(existing.wins || 0, rem.wins || 0);
                            existing.kills = Math.max(existing.kills || 0, rem.kills || 0);
                            existing.pts = Math.max(existing.pts || 0, rem.pts || 0);
                            existing.charId = rem.charId || existing.charId;
                            existing.hero = rem.hero || existing.hero;
                        } else {
                            localList.push(rem);
                        }
                    });
                    this.saveList(localList);
                }
            }
        } catch (e) {}
        this.render();
    },

    render() {
        const cfg = getPlayerConfig();
        const currentNick = cfg.nickname.toUpperCase();
        this.ensurePlayerEntry(currentNick, cfg.charId);

        const sorted = this.getList().sort((a, b) => (b.pts || 0) - (a.pts || 0) || (b.wins || 0) - (a.wins || 0));

        // Renderiza Pódio Top 3 (2º Prata, 1º Ouro, 3º Bronze)
        const podiumEl = document.getElementById('ranking-podium');
        if (podiumEl) {
            const p1 = sorted[0] || { name: currentNick, charId: 'kaelen', pts: 0 };
            const p2 = sorted[1] || { name: 'SHADOW_99', charId: 'elara', pts: 0 };
            const p3 = sorted[2] || { name: 'VALKYRIE_X', charId: 'malacor', pts: 0 };

            podiumEl.innerHTML = `
                <div class="podium-card silver">
                    <div class="podium-rank">2º</div>
                    <div class="podium-avatar"><img src="assets/${p2.charId || 'elara'}.png" alt="2º Lugar"></div>
                    <div class="podium-name">${escapeHtml(p2.name)}</div>
                    <div class="podium-pts">${(p2.pts || 0).toLocaleString('pt-BR')} PTS</div>
                </div>
                <div class="podium-card gold">
                    <div class="crown-icon"><i class="fas fa-crown"></i></div>
                    <div class="podium-rank">1º</div>
                    <div class="podium-avatar"><img src="assets/${p1.charId || 'kaelen'}.png" alt="1º Lugar"></div>
                    <div class="podium-name">${escapeHtml(p1.name)}</div>
                    <div class="podium-pts">${(p1.pts || 0).toLocaleString('pt-BR')} PTS</div>
                </div>
                <div class="podium-card bronze">
                    <div class="podium-rank">3º</div>
                    <div class="podium-avatar"><img src="assets/${p3.charId || 'malacor'}.png" alt="3º Lugar"></div>
                    <div class="podium-name">${escapeHtml(p3.name)}</div>
                    <div class="podium-pts">${(p3.pts || 0).toLocaleString('pt-BR')} PTS</div>
                </div>
            `;
        }

        // Renderiza Tabela Completa
        const tbody = document.getElementById('ranking-tbody');
        if (tbody) {
            tbody.innerHTML = sorted.slice(0, 12).map((row, idx) => {
                const isMe = row.name.toUpperCase() === currentNick;
                return `
                    <tr class="${isMe ? 'current-user-row' : ''}">
                        <td>#${idx + 1}</td>
                        <td><strong>${escapeHtml(row.name)}${isMe ? ' (VOCÊ)' : ''}</strong></td>
                        <td>${escapeHtml((row.hero || row.charId || 'KAELEN').toUpperCase())}</td>
                        <td>${row.wins || 0}</td>
                        <td>${row.kills || 0}</td>
                        <td class="pts-cell">${(row.pts || 0).toLocaleString('pt-BR')}</td>
                    </tr>
                `;
            }).join('');
        }
    }
};

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

        thumb.innerHTML = `
            <img src="${char.img}" alt="${char.name}" loading="lazy">
            <span class="thumb-name">${char.name}</span>
        `;

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
// 5. PWA: SERVICE WORKER & INSTALAÇÃO INTELIGENTE
// ==========================================
let deferredPWAInstallPrompt = null;
const btnInstallPwa = document.getElementById('btn-install-pwa');
const actionGrid = document.querySelector('.action-grid');

function hideInstallPwaButton() {
    if (btnInstallPwa) {
        btnInstallPwa.style.display = 'none';
    }
    if (actionGrid) {
        actionGrid.classList.add('pwa-installed');
    }
}

function showInstallPwaButton() {
    if (btnInstallPwa) {
        btnInstallPwa.style.display = '';
    }
    if (actionGrid) {
        actionGrid.classList.remove('pwa-installed');
    }
}

function isRunningAsInstalledPWA() {
    return window.matchMedia('(display-mode: standalone)').matches ||
           window.matchMedia('(display-mode: window-controls-overlay)').matches ||
           window.matchMedia('(display-mode: minimal-ui)').matches ||
           window.navigator.standalone === true ||
           document.referrer.includes('android-app://');
}

// Se já estiver rodando como App instalado ou já tiver sido instalado antes, oculta o botão imediatamente
if (isRunningAsInstalledPWA() || localStorage.getItem('arena_pwa_installed') === 'true') {
    localStorage.setItem('arena_pwa_installed', 'true');
    hideInstallPwaButton();
}

// Verifica também via API nativa getInstalledRelatedApps (Chrome/Android)
if ('getInstalledRelatedApps' in navigator) {
    navigator.getInstalledRelatedApps().then((apps) => {
        if (Array.isArray(apps) && apps.length > 0) {
            localStorage.setItem('arena_pwa_installed', 'true');
            hideInstallPwaButton();
        }
    }).catch(() => {});
}

// Monitora mudanças de display-mode em tempo real
try {
    window.matchMedia('(display-mode: standalone)').addEventListener('change', (e) => {
        if (e.matches) {
            localStorage.setItem('arena_pwa_installed', 'true');
            hideInstallPwaButton();
        }
    });
} catch (e) {}

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('service-worker.js').catch(() => {});
    });
}

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPWAInstallPrompt = e;
    // Se o navegador disparou beforeinstallprompt e não está em standalone, o app está disponível para instalar
    if (!isRunningAsInstalledPWA()) {
        localStorage.removeItem('arena_pwa_installed');
        showInstallPwaButton();
        if (btnInstallPwa) btnInstallPwa.classList.add('install-ready');
    }
});

window.addEventListener('appinstalled', () => {
    deferredPWAInstallPrompt = null;
    localStorage.setItem('arena_pwa_installed', 'true');
    hideInstallPwaButton();
});

if (btnInstallPwa) {
    btnInstallPwa.addEventListener('click', async () => {
        AudioEngine.play('click');
        if (isRunningAsInstalledPWA()) {
            localStorage.setItem('arena_pwa_installed', 'true');
            hideInstallPwaButton();
            return;
        }
        if (deferredPWAInstallPrompt) {
            deferredPWAInstallPrompt.prompt();
            const choice = await deferredPWAInstallPrompt.userChoice;
            if (choice && choice.outcome === 'accepted') {
                localStorage.setItem('arena_pwa_installed', 'true');
                hideInstallPwaButton();
            }
            deferredPWAInstallPrompt = null;
        } else {
            const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
            if (isIOS) {
                showArenaPopup('INSTALAR NO IPHONE / IPAD', '1. Toque no ícone de Compartilhar (no Safari)\n2. Selecione "Adicionar à Tela de Início"', '<i class="fab fa-apple"></i>');
            } else {
                showArenaPopup('INSTALAR APLICATIVO', 'No Chrome ou Edge, clique no ícone de instalar na barra de endereços ou no menu do navegador.', '<i class="fas fa-download"></i>');
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

// Botão de Ranking (Renderiza e Sincroniza Ranking Real)
RankingSystem.syncWithServer();
const btnRanking = document.getElementById('btn-ranking');
if (btnRanking && rankingModal) {
    btnRanking.addEventListener('click', () => {
        AudioEngine.play('click');
        RankingSystem.render();
        RankingSystem.syncWithServer();
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

// Botão Meu Nick (Abre o Popup Personalizado criado no jogo, sem prompt/alert do sistema)
const btnOptions = document.getElementById('btn-options');
if (btnOptions) {
    btnOptions.addEventListener('click', openNickModal);
}

// Fechamento de Modais ao clicar no fundo
[roomModal, rankingModal, guideModal, nickModal, customPopupModal].forEach(modalEl => {
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
        window.battleArenaSocket = socket;

        socket.on('connect', () => {
            socket.emit('get_rooms');
        });

        socket.on('lobby_updated', (room) => {
            socket.battleArenaRoom = room;
        });

        socket.on('room_list_updated', (rooms) => {
            renderRoomList(rooms);
        });

        socket.on('room_joined', (data) => {
            socket.battleArenaRoom = data.room;
            socket.battleArenaIsHost = data.isHost;
            const playerConfig = getPlayerConfig();
            localStorage.setItem('arenaPlayer', JSON.stringify(playerConfig));
            sessionStorage.setItem('arenaSession', JSON.stringify({
                isOnline: true,
                roomCode: data.code,
                isHost: data.isHost
            }));

            if (data.isHost && data.room && data.room.isPrivate) {
                showArenaPopup(
                    'SALA PRIVADA CRIADA!',
                    `Código de acesso: #${data.code}\nCompartilhe com seus amigos para entrarem!`,
                    '<i class="fas fa-key" style="color:#00ff88;"></i>',
                    () => { openArenaMatch(`arena.html?room=${data.code}`); }
                );
                return;
            }

            openArenaMatch(`arena.html?room=${data.code}`);
        });

        socket.on('join_error', (err) => {
            const arenaIsOpen = arenaEmbedOverlay && !arenaEmbedOverlay.classList.contains('hidden');
            if (!arenaIsOpen) {
                showArenaPopup('ERRO NA SALA', err.message || 'Erro ao entrar na sala.', '<i class="fas fa-exclamation-triangle" style="color:#ff3d68;"></i>');
            }
            const btn = document.getElementById('btn-confirm-create');
            if (btn) btn.innerHTML = '<span>CRIAR SALA</span> <i class="fas fa-rocket"></i>';
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
            <p><i class="fas fa-robot"></i> 5 Bots com Níveis Variados</p>
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

// Abre a Arena mantendo o Modo Tela Cheia e Paisagem sem recarregar a página
const arenaEmbedOverlay = document.getElementById('arena-embed-overlay');
const arenaEmbedFrame = document.getElementById('arena-embed-frame');
const isMobileTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || window.matchMedia('(pointer: coarse)').matches;

function enterGameModeFullscreen() {
    try {
        const doc = document.documentElement;
        if (!document.fullscreenElement) {
            if (doc.requestFullscreen) {
                doc.requestFullscreen().then(tryLockLandscape).catch(tryLockLandscape);
            } else if (doc.webkitRequestFullscreen) {
                doc.webkitRequestFullscreen();
                tryLockLandscape();
            } else {
                tryLockLandscape();
            }
        } else {
            tryLockLandscape();
        }
    } catch (e) {
        tryLockLandscape();
    }
}

function openArenaMatch(url) {
    if (roomModal) roomModal.classList.add('hidden');
    if (isMobileTouch) {
        enterGameModeFullscreen();
    }
    if (arenaEmbedOverlay && arenaEmbedFrame) {
        arenaEmbedFrame.src = url;
        arenaEmbedOverlay.classList.remove('hidden');
        setTimeout(() => {
            try { arenaEmbedFrame.focus(); } catch (e) {}
        }, 120);
    } else {
        window.location.href = url;
    }
}

window.closeArenaEmbed = function () {
    if (arenaEmbedOverlay && arenaEmbedFrame) {
        arenaEmbedOverlay.classList.add('hidden');
        arenaEmbedFrame.src = 'about:blank';
        RankingSystem.render();
        RankingSystem.syncWithServer();
    }
};

window.iniciarSolo = function () {
    AudioEngine.play('play');
    const playerConfig = getPlayerConfig();
    localStorage.setItem('arenaPlayer', JSON.stringify(playerConfig));
    sessionStorage.setItem('arenaSession', JSON.stringify({ isOnline: false, mode: 'solo' }));
    openArenaMatch('arena.html?mode=solo');
};

window.entrarNaSala = function (code) {
    AudioEngine.play('play');
    const playerConfig = getPlayerConfig();
    localStorage.setItem('arenaPlayer', JSON.stringify(playerConfig));

    if (isMobileTouch) enterGameModeFullscreen();

    if (socket && socket.connected) {
        socket.emit('join_room', { code: code, playerInfo: playerConfig });
    } else {
        sessionStorage.setItem('arenaSession', JSON.stringify({ isOnline: false, roomCode: code }));
        openArenaMatch(`arena.html?room=${code}`);
    }
};

// Entrar com Código
const inputCode = document.getElementById('input-room-code');
const btnJoinCode = document.getElementById('btn-join-code');
if (btnJoinCode && inputCode) {
    const submitCode = () => {
        const code = inputCode.value.trim().toUpperCase();
        if (!code) {
            showArenaPopup('CÓDIGO NECESSÁRIO', 'Por favor, informe o código da sala para entrar!', '<i class="fas fa-key" style="color:#ffd700;"></i>');
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

        if (isMobileTouch) enterGameModeFullscreen();

        if (socket && socket.connected) {
            socket.emit('create_room', {
                name: name,
                map: map,
                maxPlayers: players,
                isPrivate: isPrivate,
                fillBots: false,
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
                openArenaMatch('arena.html');
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
        enterGameModeFullscreen();
    });
}

window.addEventListener('load', tryLockLandscape);
document.addEventListener('touchstart', tryLockLandscape, { once: true, passive: true });
