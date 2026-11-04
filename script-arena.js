/**
 * BATTLE ARENA - LAST ONE STANDING
 * Engine de Combate com Suporte a Mobile Touch (Joystick Virtual) e PWA
 */

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Registro de PWA Service Worker na Arena
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('service-worker.js').catch(() => {});
    });
}

const elements = {
    aliveCount: document.getElementById('alive-count'),
    killFeed: document.getElementById('kill-feed'),
    p1Hp: document.getElementById('p1-hp-fill'),
    p1PipsContainer: document.getElementById('p1-pips-container'),
    p1EnergyText: document.getElementById('p1-energy-text'),
    p1Reloader: document.getElementById('p1-reloader'),
    p1LoaderInner: document.querySelector('.loader-inner'),
    damageOverlay: document.getElementById('damage-overlay'),
    playerHud: document.getElementById('player-hud'),
    spectatorUI: document.getElementById('spectator-ui'),
    spellWarning: document.getElementById('spell-warning'),
    gameOver: document.getElementById('game-over-screen'),
    winnerText: document.getElementById('winner-text'),
    rankingList: document.getElementById('ranking-list'),
    weaponNameHud: document.getElementById('hud-weapon-name'),
    playerNameHud: document.getElementById('player-name-hud'),
    zoneHud: document.querySelector('.hud-zone')
};

// Dados do Jogador e da Sessão
const savedData = JSON.parse(localStorage.getItem('arenaPlayer')) || {
    nickname: "PLAYER", color: "#00d2ff", weapon: "melee", charId: "kaelen"
};

const urlParams = new URLSearchParams(window.location.search);
const roomParam = urlParams.get('room');
const sessionData = JSON.parse(sessionStorage.getItem('arenaSession') || 'null');
const isOnlineRequested = !!roomParam || (sessionData && sessionData.isOnline);

// Resolução lógica padronizada (Garante que a arena no Mobile tenha exatamente a mesma escala e proporção do PC!)
const LOGICAL_HEIGHT = 960;
function resizeCanvas() {
    const aspect = Math.max(1.35, Math.min(2.3, window.innerWidth / Math.max(1, window.innerHeight)));
    canvas.height = LOGICAL_HEIGHT;
    canvas.width = Math.round(LOGICAL_HEIGHT * aspect);
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

function toCanvasCoords(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    return {
        x: (clientX - rect.left) * (canvas.width / Math.max(1, rect.width)),
        y: (clientY - rect.top) * (canvas.height / Math.max(1, rect.height))
    };
}

const CONFIG = {
    speedWalk: 3.4,
    speedRun: 6.8,
    meleeDamage: 45,
    rangedDamage: 28,
    zoneDamage: 1.5,
    zoneShrinkSpeed: 0.16,
    reloadFrames: 180,
    regenDelay: 250,
    regenAmount: 0.6,
    zoneDelayFrames: 1800 // 30 segundos
};

const keys = {};
const mouse = { x: canvas.width / 2, y: canvas.height / 2, clicked: false, attackTriggered: false };
const touchJoy = { active: false, vx: 0, vy: 0, angle: 0, manualAim: false };

window.addEventListener('keydown', e => keys[e.code] = true);
window.addEventListener('keyup', e => keys[e.code] = false);
window.addEventListener('mousemove', e => {
    const pos = toCanvasCoords(e.clientX, e.clientY);
    mouse.x = pos.x;
    mouse.y = pos.y;
});
window.addEventListener('mousedown', e => {
    if (e.button === 0 && !isTouchDevice) {
        const pos = toCanvasCoords(e.clientX, e.clientY);
        mouse.x = pos.x;
        mouse.y = pos.y;
        mouse.clicked = true;
        mouse.attackTriggered = true;
    }
});
window.addEventListener('mouseup', e => {
    if (e.button === 0) mouse.clicked = false;
});

// ==========================================
// CONTROLES MOBILE / TOUCH (JOYSTICK 360° ANALÓGICO & MIRA INTELIGENTE)
// ==========================================
const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || window.matchMedia('(pointer: coarse)').matches;
const mobileControlsLayer = document.getElementById('mobile-controls');
const joystickZone = document.getElementById('joystick-zone');
const joystickBase = document.getElementById('joystick-base');
const joystickStick = document.getElementById('joystick-stick');
const btnTouchSprint = document.getElementById('btn-touch-sprint');
const btnTouchAttack = document.getElementById('btn-touch-attack');
const hudControlsHint = document.getElementById('hud-controls-hint');

// Busca o inimigo vivo mais próximo para Mira Inteligente no Mobile
function findNearestEnemyForPlayer(p1) {
    if (!p1 || !Game || !Game.players) return null;
    let nearest = null;
    let minDist = Infinity;
    for (const p of Game.players) {
        if (p !== p1 && p.alive) {
            const d = Math.hypot(p.x - p1.x, p.y - p1.y);
            if (d < minDist) {
                minDist = d;
                nearest = p;
            }
        }
    }
    return nearest ? { target: nearest, dist: minDist } : null;
}

if (isTouchDevice && mobileControlsLayer) {
    mobileControlsLayer.style.display = 'block';
    if (hudControlsHint) hudControlsHint.style.display = 'none';

    let joystickActive = false;
    let joystickTouchId = null;

    joystickZone.addEventListener('touchstart', (e) => {
        e.preventDefault();
        const touch = e.changedTouches[0];
        joystickTouchId = touch.identifier;
        joystickActive = true;
        updateJoystick(touch);
    }, { passive: false });

    window.addEventListener('touchmove', (e) => {
        if (!joystickActive) return;
        for (let i = 0; i < e.changedTouches.length; i++) {
            if (e.changedTouches[i].identifier === joystickTouchId) {
                e.preventDefault();
                updateJoystick(e.changedTouches[i]);
                break;
            }
        }
    }, { passive: false });

    const endJoystick = (e) => {
        for (let i = 0; i < e.changedTouches.length; i++) {
            if (e.changedTouches[i].identifier === joystickTouchId) {
                joystickActive = false;
                joystickTouchId = null;
                touchJoy.active = false;
                touchJoy.vx = 0;
                touchJoy.vy = 0;
                joystickStick.style.transform = 'translate(0px, 0px)';
                keys['KeyW'] = false;
                keys['KeyS'] = false;
                keys['KeyA'] = false;
                keys['KeyD'] = false;
                break;
            }
        }
    };

    window.addEventListener('touchend', endJoystick);
    window.addEventListener('touchcancel', endJoystick);

    function updateJoystick(touch) {
        const rect = joystickBase.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        const dx = touch.clientX - centerX;
        const dy = touch.clientY - centerY;
        const dist = Math.hypot(dx, dy);
        const angle = Math.atan2(dy, dx);

        const maxDist = Math.max(32, rect.width * 0.38);
        const clampedDist = Math.min(dist, maxDist);
        const stickX = Math.cos(angle) * clampedDist;
        const stickY = Math.sin(angle) * clampedDist;

        joystickStick.style.transform = `translate(${stickX}px, ${stickY}px)`;

        // Movimentação analógica 360° fluida
        if (dist > 6) {
            const intensity = Math.min(1, (dist - 6) / (maxDist - 6));
            touchJoy.active = true;
            touchJoy.vx = Math.cos(angle) * intensity;
            touchJoy.vy = Math.sin(angle) * intensity;
            touchJoy.angle = angle;

            // Compatibilidade com servidor online
            keys['KeyW'] = touchJoy.vy < -0.25;
            keys['KeyS'] = touchJoy.vy > 0.25;
            keys['KeyA'] = touchJoy.vx < -0.25;
            keys['KeyD'] = touchJoy.vx > 0.25;

            if (!touchJoy.manualAim) {
                const p1 = Game.players.find(p => p.id === 'P1' || p.id === Game.localPlayerId);
                if (p1) {
                    mouse.x = p1.x + Math.cos(angle) * 140;
                    mouse.y = p1.y + Math.sin(angle) * 140;
                }
            }
        } else {
            touchJoy.active = false;
            touchJoy.vx = 0;
            touchJoy.vy = 0;
            keys['KeyW'] = false;
            keys['KeyS'] = false;
            keys['KeyA'] = false;
            keys['KeyD'] = false;
        }
    }

    // Botão de Sprint Touch
    if (btnTouchSprint) {
        btnTouchSprint.addEventListener('touchstart', (e) => {
            e.preventDefault();
            keys['Space'] = true;
            btnTouchSprint.classList.add('active');
        }, { passive: false });

        const endSprint = () => {
            keys['Space'] = false;
            btnTouchSprint.classList.remove('active');
        };
        btnTouchSprint.addEventListener('touchend', endSprint);
        btnTouchSprint.addEventListener('touchcancel', endSprint);
    }

    // Botão de Ataque Touch (com Mira Automática Inteligente + Arraste Opcional)
    let attackTouchId = null;
    if (btnTouchAttack) {
        btnTouchAttack.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.changedTouches[0];
            attackTouchId = touch.identifier;
            btnTouchAttack.classList.add('active');

            // Mira automática no inimigo mais próximo dentro do alcance
            const p1 = Game.players.find(p => p.id === 'P1' || p.id === Game.localPlayerId);
            if (p1) {
                const nearestInfo = findNearestEnemyForPlayer(p1);
                const autoRange = p1.weapon === 'melee' ? 240 : 620;
                if (nearestInfo && nearestInfo.dist <= autoRange) {
                    const t = nearestInfo.target;
                    mouse.x = t.x + (t.vx || 0) * 6;
                    mouse.y = t.y + (t.vy || 0) * 6;
                } else {
                    mouse.x = p1.x + Math.cos(touchJoy.angle) * 150;
                    mouse.y = p1.y + Math.sin(touchJoy.angle) * 150;
                }
            }
            mouse.clicked = true;
            mouse.attackTriggered = true;
        }, { passive: false });

        btnTouchAttack.addEventListener('touchmove', (e) => {
            for (let i = 0; i < e.changedTouches.length; i++) {
                if (e.changedTouches[i].identifier === attackTouchId) {
                    e.preventDefault();
                    const t = e.changedTouches[i];
                    const rect = btnTouchAttack.getBoundingClientRect();
                    const dx = t.clientX - (rect.left + rect.width / 2);
                    const dy = t.clientY - (rect.top + rect.height / 2);
                    if (Math.hypot(dx, dy) > 14) {
                        touchJoy.manualAim = true;
                        const aimAng = Math.atan2(dy, dx);
                        const p1 = Game.players.find(p => p.id === 'P1' || p.id === Game.localPlayerId);
                        if (p1) {
                            mouse.x = p1.x + Math.cos(aimAng) * 180;
                            mouse.y = p1.y + Math.sin(aimAng) * 180;
                        }
                    }
                    break;
                }
            }
        }, { passive: false });

        const endAttack = () => {
            attackTouchId = null;
            touchJoy.manualAim = false;
            mouse.clicked = false;
            btnTouchAttack.classList.remove('active');
        };
        btnTouchAttack.addEventListener('touchend', endAttack);
        btnTouchAttack.addEventListener('touchcancel', endAttack);
    }
}

// ==========================================
// CLASSE PROJÉTIL
// ==========================================
class Projectile {
    constructor(x, y, angle, color, ownerId, ownerName, charId) {
        this.x = x;
        this.y = y;
        this.vx = Math.cos(angle) * 16;
        this.vy = Math.sin(angle) * 16;
        this.radius = 5;
        this.color = color;
        this.ownerId = ownerId;
        this.ownerName = ownerName;
        this.life = 120;
        this.charId = charId;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.life--;
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        let angle = Math.atan2(this.vy, this.vx);
        ctx.rotate(angle);

        if (this.charId === 'elara') {
            ctx.shadowBlur = 3;
            ctx.shadowColor = "rgba(0,0,0,0.5)";
            ctx.fillStyle = "#5c3a21";
            ctx.fillRect(-15, -1.5, 25, 3);
            ctx.fillStyle = "#333";
            ctx.fillRect(8, -2, 2, 4);
            ctx.fillStyle = "#e0e0e0";
            ctx.beginPath();
            ctx.moveTo(10, -4);
            ctx.lineTo(22, 0);
            ctx.lineTo(10, 4);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = "#A7FF83";
            ctx.beginPath();
            ctx.moveTo(-10, -1.5);
            ctx.lineTo(-18, -6);
            ctx.lineTo(-15, -1.5);
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(-10, 1.5);
            ctx.lineTo(-18, 6);
            ctx.lineTo(-15, 1.5);
            ctx.fill();
        } else if (this.charId === 'morwen') {
            ctx.shadowBlur = 20;
            ctx.shadowColor = "#ff0000";
            for (let i = 0; i < 6; i++) {
                let trailX = -(Math.random() * 25);
                let trailY = (Math.random() * 12) - 6;
                let trailSize = (Math.random() * 5) + 2;
                ctx.fillStyle = `rgba(255, ${Math.random() * 100}, 0, ${Math.random() + 0.2})`;
                ctx.beginPath();
                ctx.arc(trailX, trailY, trailSize, 0, Math.PI * 2);
                ctx.fill();
            }
            let flicker = Math.random() * 4;
            ctx.fillStyle = "rgba(200, 20, 0, 0.8)";
            ctx.beginPath();
            ctx.arc(0, 0, this.radius + 6 + flicker, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = "#ff6a00";
            ctx.beginPath();
            ctx.arc(3, 0, this.radius + 2 + (flicker / 2), 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = "#fff566";
            ctx.beginPath();
            ctx.arc(5, 0, this.radius - 1, 0, Math.PI * 2);
            ctx.fill();
        } else if (this.charId === 'malacor') {
            ctx.shadowBlur = 15;
            ctx.shadowColor = "#B19CD9";
            ctx.fillStyle = "#4B0082";
            ctx.beginPath();
            for (let i = 0; i < 8; i++) {
                let r = this.radius + (Math.random() * 8);
                let a = (i / 8) * Math.PI * 2;
                ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
            }
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = "black";
            ctx.beginPath();
            ctx.arc(0, 0, this.radius * 0.6, 0, Math.PI * 2);
            ctx.fill();
        } else {
            ctx.shadowBlur = 10;
            ctx.shadowColor = this.color;
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }
}

// ==========================================
// ==========================================
// PERFIS DE HABILIDADE DA IA (SIMULAÇÃO DE JOGADORES REAIS)
// ==========================================
const AI_TIERS = {
    easy: {
        label: 'Iniciante',
        speedMult: 0.78,
        cooldownMult: 1.65,
        aimError: 0.30,
        leadMult: 0.15,
        dodgeChance: 0.22,
        canSprint: false,
        aggroRange: 640
    },
    medium: {
        label: 'Intermediário',
        speedMult: 0.87,
        cooldownMult: 1.25,
        aimError: 0.16,
        leadMult: 0.55,
        dodgeChance: 0.50,
        canSprint: true,
        aggroRange: 760
    },
    hard: {
        label: 'Veterano',
        speedMult: 0.94,
        cooldownMult: 1.05,
        aimError: 0.07,
        leadMult: 0.85,
        dodgeChance: 0.78,
        canSprint: true,
        aggroRange: 860
    }
};

// ==========================================
// CLASSE JOGADOR (CLIENTE & IA MULTI-NÍVEL)
// ==========================================
class Player {
    constructor(id, name, color, x, y, isBot, weaponType, controls, charId, aiTier = 'medium') {
        this.id = id;
        this.name = name;
        this.color = color;
        this.x = x;
        this.y = y;
        this.radius = 22;
        this.hp = 500;
        this.maxHp = 500;
        this.alive = true;
        this.isBot = isBot;
        this.weapon = weaponType;
        this.controls = controls;
        this.charId = charId;
        this.kills = 0;

        this.aiTier = aiTier;
        this.aiProfile = AI_TIERS[aiTier] || AI_TIERS.medium;

        this.angle = 0;
        this.cooldown = 0;
        this.attackFrame = 0;
        this.maxAttackFrames = 15;
        this.maxAmmo = (this.charId === 'elara') ? 4 : (weaponType === 'melee' ? 5 : 2);
        this.currentAmmo = this.maxAmmo;
        this.reloadTimer = 0;
        this.healAura = 0;
        this.lastDamageTimer = 0;

        this.vx = 0;
        this.vy = 0;
        this.botState = 'WANDER';
        this.wanderTarget = null;
        this.currentTarget = null;
        this.strafeDir = Math.random() > 0.5 ? 1 : -1;
        this.strafeTimer = 0;
        this.dodgeCooldown = 0;
        this.willDodgeCurrent = false;
    }

    update() {
        if (!this.alive) return;
        let oldX = this.x;
        let oldY = this.y;

        this.lastDamageTimer++;
        if (this.lastDamageTimer > CONFIG.regenDelay && this.hp < this.maxHp) {
            this.hp = Math.min(this.maxHp, this.hp + CONFIG.regenAmount);
        }

        if (this.reloadTimer > 0) {
            this.reloadTimer--;
            if (this.reloadTimer <= 0) this.currentAmmo = this.maxAmmo;
        }

        let sWalk = CONFIG.speedWalk;
        let sRun = CONFIG.speedRun;
        if (this.charId === 'silas') {
            sWalk *= 1.3;
            sRun *= 1.3;
        }

        let moveX = 0;
        let moveY = 0;

        if (!this.isBot) {
            let speed = keys['Space'] ? sRun : sWalk;

            if (touchJoy.active) {
                moveX = touchJoy.vx * speed;
                moveY = touchJoy.vy * speed;
            } else {
                if (keys[this.controls.up]) moveY -= speed;
                if (keys[this.controls.down]) moveY += speed;
                if (keys[this.controls.left]) moveX -= speed;
                if (keys[this.controls.right]) moveX += speed;

                if (moveX !== 0 && moveY !== 0) {
                    moveX *= 0.7071;
                    moveY *= 0.7071;
                }
            }

            // No mobile, se estiver atacando sem mira manual, foca no inimigo mais próximo no alcance
            if (isTouchDevice && mouse.clicked && !touchJoy.manualAim) {
                const nearestInfo = findNearestEnemyForPlayer(this);
                const autoRange = this.weapon === 'melee' ? 240 : 620;
                if (nearestInfo && nearestInfo.dist <= autoRange) {
                    const t = nearestInfo.target;
                    mouse.x = t.x + (t.vx || 0) * 6;
                    mouse.y = t.y + (t.vy || 0) * 6;
                }
            }

            this.angle = Math.atan2(mouse.y - this.y, mouse.x - this.x);

            if (mouse.clicked && this.cooldown <= 0 && this.currentAmmo > 0 && this.reloadTimer <= 0) {
                this.attack();
            }

            if (this.hp < 150) elements.damageOverlay.classList.add('pulse-red');
            else elements.damageOverlay.classList.remove('pulse-red');
        } else {
            // ==========================================
            // IA COM NÍVEIS VARIADOS (FÁCIL, MÉDIO, DIFÍCIL)
            // ==========================================
            const prof = this.aiProfile;
            let speed = sWalk * prof.speedMult;
            let distToZone = Math.hypot(this.x - Game.zone.x, this.y - Game.zone.y);
            if (this.dodgeCooldown > 0) this.dodgeCooldown--;

            // 1. ZONA SEGURA (PRIORIDADE ABSOLUTA)
            if (distToZone > Game.zone.radius - 75) {
                this.angle = Math.atan2(Game.zone.y - this.y, Game.zone.x - this.x);
                moveX = Math.cos(this.angle) * sRun * 0.98;
                moveY = Math.sin(this.angle) * sRun * 0.98;
                this.botState = 'ZONE_FLEE';
            } else {
                // 2. ESQUIVA DE PROJÉTEIS BASEADA NO NÍVEL DO BOT
                let incomingProj = null;
                for (let pr of Game.projectiles) {
                    if (pr.ownerId !== this.id) {
                        let d = Math.hypot(pr.x - this.x, pr.y - this.y);
                        if (d < 200) {
                            let prAngle = Math.atan2(pr.vy, pr.vx);
                            let toBotAngle = Math.atan2(this.y - pr.y, this.x - pr.x);
                            let diffAngle = Math.abs(prAngle - toBotAngle);
                            if (diffAngle < 0.45 || diffAngle > Math.PI * 2 - 0.45) {
                                incomingProj = pr;
                                break;
                            }
                        }
                    }
                }

                if (incomingProj && this.dodgeCooldown <= 0) {
                    this.willDodgeCurrent = Math.random() < prof.dodgeChance;
                    this.dodgeCooldown = 35;
                }

                if (incomingProj && this.willDodgeCurrent) {
                    const prAngle = Math.atan2(incomingProj.vy, incomingProj.vx);
                    const dodgeAngle = prAngle + (Math.PI / 2) * this.strafeDir;
                    const dodgeSpd = prof.canSprint ? sRun * 0.92 : speed * 1.1;
                    moveX = Math.cos(dodgeAngle) * dodgeSpd;
                    moveY = Math.sin(dodgeAngle) * dodgeSpd;
                    this.botState = 'DODGING';
                } else {
                    // 3. SELEÇÃO DE ALVO COM SISTEMA ANTI-FOCUS (EVITA TODOS OS BOTS FOCAREM SÓ NO JOGADOR)
                    let bestTarget = null;
                    let bestScore = Infinity;

                    // Conta quantos outros bots já estão focando no jogador P1
                    let botsTargetingP1 = 0;
                    Game.players.forEach(other => {
                        if (other.isBot && other !== this && other.alive && other.currentTarget && other.currentTarget.id === 'P1') {
                            botsTargetingP1++;
                        }
                    });

                    Game.players.forEach(p => {
                        if (p !== this && p.alive) {
                            let d = Math.hypot(p.x - this.x, p.y - this.y);
                            let score = d;
                            // Penaliza focar no jogador humano se já houver outro bot focando nele (faz os bots lutarem entre si também)
                            if (p.id === 'P1' && botsTargetingP1 >= 1 && d > 190) {
                                score += 320 * botsTargetingP1;
                            }
                            // Leve preferência por alvos com vida muito baixa apenas para bots médios/difíceis
                            if (prof !== AI_TIERS.easy && p.hp < 140 && d < 420) {
                                score -= 90;
                            }
                            if (score < bestScore) {
                                bestScore = score;
                                bestTarget = p;
                            }
                        }
                    });

                    this.currentTarget = bestTarget;
                    let closest = this.currentTarget;
                    let minDist = closest ? Math.hypot(closest.x - this.x, closest.y - this.y) : Infinity;

                    // 4. KITING DURANTE RECARGA
                    if (this.reloadTimer > 0 && closest && minDist < 320 && prof !== AI_TIERS.easy) {
                        this.botState = 'KITING';
                        this.angle = Math.atan2(this.y - closest.y, this.x - closest.x);
                        moveX = Math.cos(this.angle + (this.strafeDir * 0.45)) * speed;
                        moveY = Math.sin(this.angle + (this.strafeDir * 0.45)) * speed;
                    } else if (this.hp < this.maxHp * 0.22 && closest && minDist < 460 && this.lastDamageTimer < 140 && prof !== AI_TIERS.easy) {
                        this.botState = 'FLEE';
                        this.angle = Math.atan2(this.y - closest.y, this.x - closest.x);
                        moveX = Math.cos(this.angle) * speed * 1.05;
                        moveY = Math.sin(this.angle) * speed * 1.05;
                    } else if (closest && minDist < prof.aggroRange) {
                        this.botState = 'ATTACK';
                        this.strafeTimer--;
                        if (this.strafeTimer <= 0) {
                            this.strafeDir *= -1;
                            this.strafeTimer = 40 + Math.random() * 60;
                        }

                        // MIRA PREDITIVA AJUSTADA PELO NÍVEL DO BOT
                        const leadFactor = Math.min(14, minDist / 20) * prof.leadMult;
                        let aimX = closest.x + (closest.vx || 0) * leadFactor;
                        let aimY = closest.y + (closest.vy || 0) * leadFactor;
                        this.angle = Math.atan2(aimY - this.y, aimX - this.x);

                        if (this.weapon === 'melee') {
                            if (minDist > 85) {
                                const useSprint = prof.canSprint && minDist > 140 && minDist < 280;
                                const approachSpeed = useSprint ? sRun * 0.86 : speed * 1.04;
                                const weaveAmp = prof === AI_TIERS.easy ? 0.1 : 0.28;
                                const weave = Math.sin((Game.frameCount + this.id.charCodeAt(1) * 20) * 0.07) * weaveAmp;
                                moveX = Math.cos(this.angle + weave) * approachSpeed;
                                moveY = Math.sin(this.angle + weave) * approachSpeed;
                            } else if (minDist < 46) {
                                moveX = -Math.cos(this.angle) * speed * 0.45;
                                moveY = -Math.sin(this.angle) * speed * 0.45;
                            } else {
                                moveX = Math.cos(this.angle + (Math.PI / 2 * this.strafeDir)) * speed * 0.8;
                                moveY = Math.sin(this.angle + (Math.PI / 2 * this.strafeDir)) * speed * 0.8;
                            }

                            if (minDist < 92 && this.cooldown <= 0 && this.currentAmmo > 0 && this.reloadTimer <= 0) {
                                this.angle += (Math.random() - 0.5) * prof.aimError;
                                this.attack();
                            }
                        } else {
                            if (minDist < 195) {
                                moveX = -Math.cos(this.angle) * speed * 0.95;
                                moveY = -Math.sin(this.angle) * speed * 0.95;
                            } else if (minDist > 360) {
                                moveX = Math.cos(this.angle) * speed * 0.95;
                                moveY = Math.sin(this.angle) * speed * 0.95;
                            } else {
                                moveX = Math.cos(this.angle + (Math.PI / 2 * this.strafeDir)) * speed * 0.82;
                                moveY = Math.sin(this.angle + (Math.PI / 2 * this.strafeDir)) * speed * 0.82;
                            }

                            if (minDist < 540 && this.cooldown <= 0 && this.currentAmmo > 0 && this.reloadTimer <= 0) {
                                let error = (Math.random() - 0.5) * prof.aimError * (minDist > 260 ? 1.35 : 0.85);
                                this.angle += error;
                                this.attack();
                            }
                        }
                    } else {
                        // WANDER
                        this.botState = 'WANDER';
                        if (!this.wanderTarget || Math.hypot(this.wanderTarget.x - this.x, this.wanderTarget.y - this.y) < 35) {
                            let r = Game.zone.radius * Math.random() * 0.6;
                            let theta = Math.random() * Math.PI * 2;
                            this.wanderTarget = {
                                x: Game.zone.x + r * Math.cos(theta),
                                y: Game.zone.y + r * Math.sin(theta)
                            };
                        }
                        this.angle = Math.atan2(this.wanderTarget.y - this.y, this.wanderTarget.x - this.x);
                        moveX = Math.cos(this.angle) * speed * 0.65;
                        moveY = Math.sin(this.angle) * speed * 0.65;
                    }
                }
            }
        }

        this.x += moveX;
        this.y += moveY;
        this.vx = this.x - oldX;
        this.vy = this.y - oldY;

        this.x = Math.max(this.radius, Math.min(canvas.width - this.radius, this.x));
        this.y = Math.max(this.radius, Math.min(canvas.height - this.radius, this.y));

        if (this.cooldown > 0) this.cooldown--;
        if (this.attackFrame > 0) this.attackFrame--;

        if (Math.hypot(this.x - Game.zone.x, this.y - Game.zone.y) > Game.zone.radius) {
            this.takeDamage(CONFIG.zoneDamage, "Tempestade Cósmica");
        }

        if (this.id === 'P1') this.updateUI();
    }

    attack() {
        this.attackFrame = this.maxAttackFrames;
        this.currentAmmo--;
        const cdMult = this.isBot ? this.aiProfile.cooldownMult : 1;
        if (this.currentAmmo <= 0) this.reloadTimer = Math.round(CONFIG.reloadFrames * cdMult);

        if (this.charId === 'lyra') {
            this.hp = Math.min(this.maxHp, this.hp + 40);
            this.healAura = 20;
        }

        if (this.weapon === 'melee') {
            this.cooldown = Math.round(20 * cdMult);
            let range = (this.charId === 'silas') ? 75 : 95;
            Game.players.forEach(p => {
                if (p !== this && p.alive) {
                    let d = Math.hypot(p.x - this.x, p.y - this.y);
                    let angT = Math.atan2(p.y - this.y, p.x - this.x);
                    let diffAngle = Math.abs(angT - this.angle);
                    while (diffAngle > Math.PI) diffAngle = Math.abs(diffAngle - Math.PI * 2);

                    if (d < range && diffAngle < Math.PI / 2.2) {
                        p.takeDamage(CONFIG.meleeDamage, this.name);
                        p.x += Math.cos(angT) * 40;
                        p.y += Math.sin(angT) * 40;
                    }
                }
            });
        } else {
            this.cooldown = Math.round(32 * cdMult);
            Game.projectiles.push(new Projectile(this.x, this.y, this.angle, this.color, this.id, this.name, this.charId));
        }
    }

    takeDamage(amount, killer) {
        if (!this.alive) return;
        this.hp -= amount;
        this.lastDamageTimer = 0;
        if (this.hp <= 0) {
            this.alive = false;
            this.hp = 0;
            const killerPlayer = Game.players.find(p => p.name === killer);
            if (killerPlayer && killerPlayer !== this) {
                killerPlayer.kills = (killerPlayer.kills || 0) + 1;
            }
            Game.eliminatedOrder.push({
                name: this.name,
                color: this.color,
                charId: this.charId,
                kills: this.kills || 0
            });
            Game.addKillMsg(this.name, killer, this.color);
            if (this.id === 'P1') Game.startSpectating();
            Game.checkWin();
        }
    }

    updateUI() {
        let hpPercent = Math.max(0, (this.hp / this.maxHp) * 100);
        elements.p1Hp.style.width = hpPercent + '%';

        if (hpPercent <= 30) {
            elements.p1Hp.style.background = "#ff3d68";
            elements.p1Hp.style.boxShadow = "0 0 15px #ff3d68";
        } else {
            elements.p1Hp.style.background = "#00d2ff";
            elements.p1Hp.style.boxShadow = "none";
        }

        const pips = elements.p1PipsContainer.children;
        if (this.reloadTimer > 0) {
            elements.p1EnergyText.innerText = "WAIT";
            elements.p1Reloader.classList.remove('hidden');
            let pct = (1 - (this.reloadTimer / CONFIG.reloadFrames)) * 100;
            elements.p1LoaderInner.style.background = `conic-gradient(#00ff88 ${pct}%, transparent ${pct}%)`;
            for (let i = 0; i < this.maxAmmo; i++) {
                if (pips[i]) pips[i].className = 'pip consumed';
            }
        } else {
            elements.p1EnergyText.innerText = `${this.currentAmmo}/${this.maxAmmo}`;
            elements.p1Reloader.classList.add('hidden');
            for (let i = 0; i < this.maxAmmo; i++) {
                if (pips[i]) pips[i].className = i < this.currentAmmo ? 'pip filled' : 'pip';
            }
        }
    }

    draw() {
        if (!this.alive) return;

        // Halo indicador sob o jogador principal para fácil visualização no Mobile e PC
        if (!this.isBot && (this.id === 'P1' || this.id === Game.localPlayerId)) {
            ctx.save();
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius + 9, 0, Math.PI * 2);
            ctx.strokeStyle = "rgba(0, 255, 136, 0.55)";
            ctx.lineWidth = 2.5;
            ctx.setLineDash([6, 4]);
            ctx.stroke();
            ctx.restore();
        }

        if (this.healAura > 0) {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius + 15, 0, Math.PI * 2);
            ctx.fillStyle = "rgba(255, 215, 0, 0.4)";
            ctx.fill();
            this.healAura--;
        }

        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.strokeStyle = "white";
        ctx.lineWidth = 3;
        ctx.stroke();

        ctx.save();
        ctx.translate(this.x, this.y);
        let swing = 0;
        if (this.attackFrame > 0 && this.weapon === 'melee') {
            swing = (1 - (this.attackFrame / this.maxAttackFrames)) * Math.PI - Math.PI / 2;
        }
        ctx.rotate(this.angle + swing);

        if (this.charId === 'kaelen') {
            ctx.beginPath();
            ctx.arc(0, 0, this.radius + 4, Math.PI / 2, Math.PI * 1.5);
            ctx.strokeStyle = "#FFD700";
            ctx.lineWidth = 6;
            ctx.stroke();
        }

        if (this.weapon === 'melee') {
            if (this.charId === 'silas') {
                ctx.fillStyle = "#444";
                ctx.fillRect(this.radius - 2, -15, 6, 4);
                ctx.fillRect(this.radius - 2, 11, 6, 4);
                ctx.fillStyle = "silver";
                ctx.beginPath();
                ctx.moveTo(this.radius + 4, -16);
                ctx.lineTo(this.radius + 25, -13);
                ctx.lineTo(this.radius + 4, -10);
                ctx.fill();
                ctx.beginPath();
                ctx.moveTo(this.radius + 4, 10);
                ctx.lineTo(this.radius + 25, 13);
                ctx.lineTo(this.radius + 4, 16);
                ctx.fill();
                if (this.attackFrame > 0) {
                    ctx.beginPath();
                    ctx.arc(0, 0, 45, -0.8, 0.8);
                    ctx.strokeStyle = "rgba(255,255,255,0.6)";
                    ctx.lineWidth = 3;
                    ctx.stroke();
                }
            } else {
                ctx.fillStyle = "#444";
                ctx.fillRect(this.radius - 2, -3, 8, 6);
                ctx.fillStyle = "#FFD700";
                ctx.fillRect(this.radius + 6, -12, 4, 24);
                ctx.shadowBlur = 15;
                ctx.shadowColor = this.color;
                ctx.fillStyle = "white";
                ctx.beginPath();
                ctx.moveTo(this.radius + 10, -5);
                ctx.lineTo(this.radius + 65, -2);
                ctx.lineTo(this.radius + 65, 2);
                ctx.lineTo(this.radius + 10, 5);
                ctx.fill();
                ctx.shadowBlur = 0;
                if (this.attackFrame > 0) {
                    ctx.beginPath();
                    ctx.arc(0, 0, 80, -0.6, 0.6);
                    ctx.strokeStyle = "rgba(255,255,255,0.4)";
                    ctx.lineWidth = 4;
                    ctx.stroke();
                }
            }
        } else {
            if (this.charId === 'elara') {
                ctx.strokeStyle = "#8B4513";
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.arc(this.radius - 5, 0, 20, -Math.PI / 2.5, Math.PI / 2.5);
                ctx.stroke();
                ctx.strokeStyle = "rgba(255,255,255,0.6)";
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(this.radius + 1, -19);
                if (this.attackFrame > 0) {
                    ctx.lineTo(this.radius - 15, 0);
                } else {
                    ctx.lineTo(this.radius + 1, 19);
                }
                ctx.stroke();
            } else if (this.charId === 'malacor' || this.charId === 'morwen') {
                ctx.fillStyle = "#5c3a21";
                ctx.fillRect(this.radius - 5, -25, 4, 50);
                ctx.shadowBlur = 15;
                ctx.shadowColor = this.color;
                ctx.fillStyle = this.color;
                ctx.beginPath();
                ctx.arc(this.radius - 3, -25, 7, 0, Math.PI * 2);
                ctx.fill();
                ctx.shadowBlur = 0;
                if (this.attackFrame > 0) {
                    ctx.beginPath();
                    ctx.arc(this.radius - 3, -25, 15, 0, Math.PI * 2);
                    ctx.fillStyle = "rgba(255,255,255,0.4)";
                    ctx.fill();
                }
            } else {
                ctx.fillStyle = "#555";
                ctx.fillRect(this.radius, -5, 25, 10);
            }
        }
        ctx.restore();

        ctx.fillStyle = "white";
        ctx.font = "bold 12px Rajdhani, Arial";
        ctx.textAlign = "center";
        ctx.fillText(this.name, this.x, this.y - 35);

        let barW = 42;
        ctx.fillStyle = "rgba(0,0,0,0.75)";
        ctx.fillRect(this.x - barW / 2, this.y - 30, barW, 5);
        ctx.fillStyle = (this.hp < 150) ? "#ff3d68" : (this.id === 'P1' ? "#00ff88" : this.color);
        ctx.fillRect(this.x - barW / 2, this.y - 30, (Math.max(0, this.hp) / this.maxHp) * barW, 5);
    }
}

// ==========================================
// GAME ENGINE (LOCAL & ONLINE)
// ==========================================
const Game = {
    active: true,
    isOnline: false,
    socket: null,
    players: [],
    projectiles: [],
    zone: { x: 0, y: 0, radius: 0 },
    eliminatedOrder: [],
    isSpectating: false,
    shakeFrames: 0,
    frameCount: 0,
    localPlayerId: 'P1',

    init() {
        this.active = true;
        this.zone = {
            x: canvas.width / 2,
            y: canvas.height / 2,
            radius: Math.max(canvas.width, canvas.height) * 0.45
        };

        if (isOnlineRequested) {
            this.tryInitOnline();
        } else {
            this.initLocal();
        }

        this.setupWeaponHud();
        this.loop();
    },

    initLocal() {
        this.isOnline = false;
        const cX = canvas.width / 2;
        const cY = canvas.height / 2;
        const spawnR = Math.min(canvas.width, canvas.height) * 0.34;

        // Perfis variados de partida para simular lobbies reais com níveis diferentes
        const matchProfiles = [
            { name: 'PARTIDA CASUAL (Maioria Iniciante)', tiers: ['easy', 'easy', 'easy', 'medium', 'hard'] },
            { name: 'PARTIDA MISTA (Níveis Variados)', tiers: ['easy', 'easy', 'medium', 'medium', 'hard'] },
            { name: 'PARTIDA EQUILIBRADA (Intermediária)', tiers: ['easy', 'medium', 'medium', 'medium', 'hard'] },
            { name: 'PARTIDA COMPETITIVA (Maioria Veterano)', tiers: ['easy', 'medium', 'hard', 'hard', 'hard'] }
        ];

        const chosenProfile = matchProfiles[Math.floor(Math.random() * matchProfiles.length)];
        // Embaralha os níveis entre os 5 bots da partida
        const shuffledTiers = [...chosenProfile.tiers].sort(() => Math.random() - 0.5);

        const botConfigs = [
            { id: 'B1', name: 'SHADOW_99', color: '#B19CD9', weapon: 'ranged', charId: 'malacor', angle: 0 },
            { id: 'B2', name: 'SOLAR_KNIGHT', color: '#00d2ff', weapon: 'melee', charId: 'kaelen', angle: (Math.PI * 2) / 5 },
            { id: 'B3', name: 'VALKYRIE_X', color: '#A7FF83', weapon: 'ranged', charId: 'elara', angle: (Math.PI * 4) / 5 },
            { id: 'B4', name: 'GHOST_STRIKE', color: '#ffffff', weapon: 'melee', charId: 'silas', angle: (Math.PI * 6) / 5 },
            { id: 'B5', name: 'PHOENIX_BR', color: '#ff3d68', weapon: 'ranged', charId: 'morwen', angle: (Math.PI * 8) / 5 }
        ];

        this.players = [
            new Player('P1', savedData.nickname, savedData.color, cX, cY, false, savedData.weapon,
                { up: 'KeyW', down: 'KeyS', left: 'KeyA', right: 'KeyD' }, savedData.charId, 'hard'),
            ...botConfigs.map((b, idx) => new Player(
                b.id, b.name, b.color,
                cX + Math.cos(b.angle) * spawnR,
                cY + Math.sin(b.angle) * spawnR,
                true, b.weapon, null, b.charId, shuffledTiers[idx]
            ))
        ];

        this.resetPlayerPips(this.players[0].maxAmmo);
    },

    tryInitOnline() {
        // Carrega Socket.io dinamicamente se necessário
        const connectSocket = () => {
            try {
                const url = window.location.protocol.startsWith('http') ? window.location.origin : 'http://localhost:3000';
                this.socket = io(url);

                this.socket.on('connect', () => {
                    this.isOnline = true;
                    this.localPlayerId = this.socket.id;
                });

                this.socket.on('game_snapshot', (snapshot) => {
                    const scaleX = canvas.width / 1920;
                    const scaleY = canvas.height / 1080;

                    this.zone = {
                        x: snapshot.zone.x * scaleX,
                        y: snapshot.zone.y * scaleY,
                        radius: snapshot.zone.radius * Math.min(scaleX, scaleY)
                    };

                    this.players = snapshot.players.map(sp => {
                        const p = new Player(sp.id, sp.name, sp.color, sp.x * scaleX, sp.y * scaleY, sp.isBot, sp.weapon, null, sp.charId);
                        p.hp = sp.hp;
                        p.maxHp = sp.maxHp;
                        p.alive = sp.alive;
                        p.angle = sp.angle;
                        p.currentAmmo = sp.currentAmmo;
                        p.maxAmmo = sp.maxAmmo;
                        p.reloadTimer = sp.reloadTimer;
                        p.attackFrame = sp.attackFrame;
                        p.healAura = sp.healAura;

                        if (sp.id === this.localPlayerId) {
                            p.updateUI();
                            if (!sp.alive && !this.isSpectating) this.startSpectating();
                        }
                        return p;
                    });

                    this.projectiles = snapshot.projectiles.map(pr => {
                        const p = new Projectile(pr.x * scaleX, pr.y * scaleY, 0, pr.color, '', '', pr.charId);
                        p.vx = pr.vx * scaleX;
                        p.vy = pr.vy * scaleY;
                        return p;
                    });

                    elements.aliveCount.innerText = snapshot.aliveCount;
                });

                this.socket.on('player_eliminated', (data) => {
                    this.addKillMsg(data.victim, data.killer, data.color);
                });

                this.socket.on('screen_shake', (data) => {
                    this.shakeFrames = data.duration || 60;
                    this.showWarning("⚠️ MALDIÇÃO DE MALACOR! ⚠️", "rgba(177, 156, 217, 0.9)");
                });

                this.socket.on('match_finished', (data) => {
                    this.active = false;
                    this.showRanking(data.winner, data.ranking);
                });

                this.socket.on('connect_error', () => {
                    this.initLocal();
                });

            } catch (e) {
                this.initLocal();
            }
        };

        if (typeof io !== 'undefined') {
            connectSocket();
        } else {
            const script = document.createElement('script');
            script.src = '/socket.io/socket.io.js';
            script.onload = connectSocket;
            script.onerror = () => {
                const cdn = document.createElement('script');
                cdn.src = 'https://cdn.socket.io/4.7.5/socket.io.min.js';
                cdn.onload = connectSocket;
                cdn.onerror = () => this.initLocal();
                document.head.appendChild(cdn);
            };
            document.head.appendChild(script);
        }
    },

    setupWeaponHud() {
        elements.playerNameHud.innerText = savedData.nickname;
        let wName = "ARMA";
        if (savedData.charId === 'kaelen') wName = "ESPADA LENDÁRIA";
        if (savedData.charId === 'elara') wName = "ARCO DA FLORESTA";
        if (savedData.charId === 'malacor') wName = "CAJADO DO VAZIO";
        if (savedData.charId === 'lyra') wName = "CETRO DIVINO";
        if (savedData.charId === 'silas') wName = "ADAGAS DA NÉVOA";
        if (savedData.charId === 'morwen') wName = "CAJADO ELEMENTAL";
        elements.weaponNameHud.innerText = wName;
    },

    resetPlayerPips(maxAmmo) {
        elements.p1PipsContainer.innerHTML = '';
        for (let i = 0; i < maxAmmo; i++) {
            let p = document.createElement('div');
            p.className = 'pip filled';
            elements.p1PipsContainer.appendChild(p);
        }
    },

    startSpectating() {
        this.isSpectating = true;
        elements.playerHud.classList.add('hidden');
        elements.spectatorUI.classList.remove('hidden');
    },

    showWarning(msg, color) {
        if (elements.spellWarning) {
            elements.spellWarning.innerText = msg;
            elements.spellWarning.style.background = color;
            elements.spellWarning.classList.remove('hidden');
            setTimeout(() => elements.spellWarning.classList.add('hidden'), 2000);
        }
    },

    update() {
        if (!this.active) return;
        this.frameCount++;

        if (this.isOnline && this.socket && this.socket.connected) {
            const localP = this.players.find(p => p.id === this.localPlayerId);
            let myAngle = 0;
            if (localP) {
                myAngle = Math.atan2(mouse.y - localP.y, mouse.x - localP.x);
            }

            this.socket.emit('player_input', {
                up: !!keys['KeyW'],
                down: !!keys['KeyS'],
                left: !!keys['KeyA'],
                right: !!keys['KeyD'],
                sprint: !!keys['Space'],
                angle: myAngle,
                attackRequested: mouse.attackTriggered
            });
            mouse.attackTriggered = false;
        } else {
            // Modo Local
            if (this.frameCount < CONFIG.zoneDelayFrames) {
                let secondsLeft = Math.ceil((CONFIG.zoneDelayFrames - this.frameCount) / 60);
                if (elements.zoneHud) elements.zoneHud.innerHTML = `<i class="fas fa-radiation-alt" style="color: #00d2ff;"></i> FECHA EM: <span>${secondsLeft}s</span>`;
            } else {
                if (elements.zoneHud) elements.zoneHud.innerHTML = `<i class="fas fa-radiation-alt" style="color: #ff3d68;"></i> ZONA ENCOLHENDO!`;
                if (this.zone.radius > 110) this.zone.radius -= CONFIG.zoneShrinkSpeed;
            }

            this.players.forEach(p => p.update());

            this.projectiles.forEach((t, i) => {
                t.update();
                this.players.forEach(p => {
                    if (p.alive && p.id !== t.ownerId && Math.hypot(p.x - t.x, p.y - t.y) < p.radius + t.radius) {
                        p.takeDamage(CONFIG.rangedDamage, t.ownerName);
                        if (t.charId === 'malacor' && p.id === 'P1') {
                            Game.shakeFrames = 120;
                            Game.showWarning("⚠️ MALDIÇÃO DE MALACOR! ⚠️", "rgba(177, 156, 217, 0.9)");
                        }
                        t.life = 0;
                    }
                });
                if (t.life <= 0) this.projectiles.splice(i, 1);
            });
        }
    },

    draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.save();
        if (this.shakeFrames > 0) {
            ctx.translate(Math.random() * 10 - 5, Math.random() * 10 - 5);
            this.shakeFrames--;
        }

        ctx.fillStyle = "rgba(10, 0, 20, 0.75)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.globalCompositeOperation = 'destination-out';
        ctx.beginPath();
        ctx.arc(this.zone.x, this.zone.y, Math.max(0, this.zone.radius), 0, Math.PI * 2);
        ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
        ctx.beginPath();
        ctx.arc(this.zone.x, this.zone.y, Math.max(0, this.zone.radius), 0, Math.PI * 2);
        ctx.strokeStyle = this.frameCount < CONFIG.zoneDelayFrames ? "#00d2ff" : "#ff3d68";
        ctx.lineWidth = 5;
        ctx.stroke();

        this.projectiles.forEach(p => p.draw());
        this.players.forEach(p => p.draw());
        ctx.restore();
    },

    loop() {
        Game.update();
        Game.draw();
        requestAnimationFrame(() => Game.loop());
    },

    addKillMsg(name, killer, color) {
        if (!elements.killFeed) return;
        while (elements.killFeed.children.length >= 3) {
            elements.killFeed.firstElementChild.remove();
        }
        const div = document.createElement('div');
        div.className = 'feed-item';
        div.innerHTML = `<span style="color:${color}">${name}</span> &bull; <b>${killer}</b>`;
        elements.killFeed.appendChild(div);
        setTimeout(() => { if (div.parentNode) div.remove(); }, 3000);
    },

    checkWin() {
        let vivos = this.players.filter(p => p.alive);
        elements.aliveCount.innerText = vivos.length;
        if (vivos.length <= 1) {
            this.active = false;
            this.showRanking(vivos[0]);
        }
    },

    showRanking(vencedor, customRanking = null) {
        const reversedElims = [...this.eliminatedOrder].reverse();
        const ranking = customRanking || (vencedor ? [vencedor, ...reversedElims] : reversedElims);
        elements.rankingList.innerHTML = '';

        // Atualiza o Ranking Real (localStorage + Servidor)
        const heroMap = {
            kaelen: 'Kaelen',
            elara: 'Elara',
            malacor: 'Malacor',
            lyra: 'Lyra',
            silas: 'Silas',
            morwen: 'Morwen'
        };

        let lb = [];
        try {
            const raw = localStorage.getItem('arenaLeaderboard');
            if (raw) lb = JSON.parse(raw);
        } catch (e) { lb = []; }

        let localPlayerEntry = null;

        ranking.forEach((player, index) => {
            const pos = index + 1;
            const liveObj = this.players.find(p => p.name === player.name);
            const kills = (liveObj && typeof liveObj.kills === 'number') ? liveObj.kills : (player.kills || 0);
            const charId = (liveObj && liveObj.charId) || player.charId || 'kaelen';
            const placePts = pos === 1 ? 100 : (pos === 2 ? 50 : (pos === 3 ? 25 : 10));
            const totalMatchPts = placePts + (kills * 25);

            // Atualiza ou insere no leaderboard local
            let entry = lb.find(item => item.name.toUpperCase() === player.name.toUpperCase());
            if (!entry) {
                entry = {
                    name: player.name.toUpperCase(),
                    charId: charId,
                    hero: heroMap[charId] || 'Kaelen',
                    wins: 0,
                    kills: 0,
                    pts: 200
                };
                lb.push(entry);
            }
            entry.charId = charId;
            entry.hero = heroMap[charId] || entry.hero || 'Kaelen';
            if (pos === 1) entry.wins = (entry.wins || 0) + 1;
            entry.kills = (entry.kills || 0) + kills;
            entry.pts = (entry.pts || 0) + totalMatchPts;

            if (player.name.toUpperCase() === savedData.nickname.toUpperCase()) {
                localPlayerEntry = entry;
            }

            const item = document.createElement('div');
            item.className = `rank-item ${pos === 1 ? 'winner' : ''}`;
            item.innerHTML = `
                <span class="rank-pos">#${pos}</span>
                <span class="rank-name" style="color:${player.color}">${player.name}</span>
                <span class="rank-status">${kills} ABATE${kills === 1 ? '' : 'S'} • +${totalMatchPts} PTS</span>
            `;
            elements.rankingList.appendChild(item);
        });

        try {
            lb.sort((a, b) => b.pts - a.pts);
            localStorage.setItem('arenaLeaderboard', JSON.stringify(lb));
        } catch (e) {}

        if (localPlayerEntry) {
            fetch('/api/ranking', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(localPlayerEntry)
            }).catch(() => {});
        }

        setTimeout(() => {
            elements.gameOver.classList.remove('hidden');
            elements.spectatorUI.classList.add('hidden');
            if (vencedor) {
                elements.winnerText.innerText = `${vencedor.name} VENCEU!`;
                elements.winnerText.style.color = vencedor.color;
            }
        }, 1500);
    }
};

// ==========================================
// NAVEGAÇÃO SEGURA & PRESERVAÇÃO DO MODO DE JOGO (TELA CHEIA)
// ==========================================
function tryLockLandscape() {
    try {
        if (screen.orientation && screen.orientation.lock) {
            screen.orientation.lock('landscape').catch(() => {});
        }
    } catch (e) {}
}

function requestArenaFullscreen() {
    try {
        const targetWin = (window.parent && window.parent !== window) ? window.parent : window;
        const doc = targetWin.document.documentElement;
        if (!targetWin.document.fullscreenElement) {
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

window.closeArenaToMenu = function () {
    try {
        if (window.parent && window.parent !== window && typeof window.parent.closeArenaEmbed === 'function') {
            window.parent.closeArenaEmbed();
            return;
        }
    } catch (e) {}
    window.location.href = 'index.html';
};

// Confirmação ao clicar em SAIR (Evita toques acidentais no canto superior no mobile)
const btnLeaveMatch = document.getElementById('btn-leave-match');
const leaveConfirmModal = document.getElementById('leave-confirm-modal');
const btnCancelLeave = document.getElementById('btn-cancel-leave');
const btnConfirmLeave = document.getElementById('btn-confirm-leave');

if (btnLeaveMatch && leaveConfirmModal) {
    btnLeaveMatch.addEventListener('click', (e) => {
        e.stopPropagation();
        leaveConfirmModal.classList.remove('hidden');
    });
}
if (btnCancelLeave && leaveConfirmModal) {
    btnCancelLeave.addEventListener('click', (e) => {
        e.stopPropagation();
        leaveConfirmModal.classList.add('hidden');
    });
}
if (btnConfirmLeave) {
    btnConfirmLeave.addEventListener('click', (e) => {
        e.stopPropagation();
        window.closeArenaToMenu();
    });
}

// Botão de Tela Cheia no HUD Superior da Arena
const btnArenaFs = document.getElementById('btn-arena-fullscreen');
if (btnArenaFs) {
    btnArenaFs.addEventListener('click', (e) => {
        e.stopPropagation();
        try {
            const targetWin = (window.parent && window.parent !== window) ? window.parent : window;
            if (!targetWin.document.fullscreenElement) {
                requestArenaFullscreen();
            } else if (targetWin.document.exitFullscreen) {
                targetWin.document.exitFullscreen().catch(() => {});
            }
        } catch (err) {
            requestArenaFullscreen();
        }
    });
}

// ==========================================
// TELA DE CARREGAMENTO & CONTAGEM
// ==========================================
const LoadingManager = {
    progress: 0,
    interval: null,
    finished: false,
    bar: document.getElementById('loading-bar-fill'),
    text: document.getElementById('loading-text'),
    screen: document.getElementById('loading-screen'),

    start() {
        Game.active = false;

        // Ao tocar na tela de carregamento ou pressionar espaço, ativa modo tela cheia (no mobile) e inicia
        const skip = (e) => {
            if (this.finished) return;
            if (isTouchDevice) requestArenaFullscreen();
            if (this.interval) clearInterval(this.interval);
            this.finish();
        };

        if (this.screen) {
            this.screen.addEventListener('click', skip, { once: true });
            this.screen.addEventListener('touchstart', skip, { once: true, passive: true });
        }
        window.addEventListener('keydown', (e) => { if (e.code === 'Space') skip(); }, { once: true });

        // Carregamento suave em ~3 segundos
        this.interval = setInterval(() => {
            this.progress += 2.2;

            if (this.progress >= 100) {
                this.progress = 100;
                clearInterval(this.interval);
                this.updateUI();
                setTimeout(() => this.finish(), 250);
            } else {
                this.updateUI();
            }
        }, 55);
    },

    updateUI() {
        if (this.bar && this.text) {
            this.bar.style.width = this.progress + '%';
            this.text.innerText = `CARREGANDO ARENA... ${Math.floor(this.progress)}%`;
        }
    },

    finish() {
        if (this.finished) return;
        this.finished = true;
        if (this.screen) {
            this.screen.style.opacity = '0';
            this.screen.style.transition = 'opacity 0.35s ease';

            setTimeout(() => {
                this.screen.classList.add('hidden');
                CountdownManager.start();
            }, 350);
        } else {
            CountdownManager.start();
        }
    }
};

const CountdownManager = {
    counter: 3,
    overlay: document.getElementById('countdown-overlay'),
    numberEl: document.getElementById('countdown-number'),

    start() {
        this.overlay.classList.remove('hidden');
        this.run();
    },

    run() {
        if (this.counter > 0) {
            this.numberEl.innerText = this.counter;
            this.numberEl.style.animation = 'none';
            this.numberEl.offsetHeight;
            this.numberEl.style.animation = 'countdownPulse 1s infinite';

            this.counter--;
            setTimeout(() => this.run(), 900);
        } else {
            this.numberEl.innerText = "BATALHA!";
            this.numberEl.classList.add('start-text');

            setTimeout(() => {
                this.overlay.classList.add('hidden');
                Game.init();
            }, 850);
        }
    }
};

// Inicia carregamento
window.onload = () => LoadingManager.start();

const btnRotateFs = document.getElementById('btn-fullscreen-rotate');
if (btnRotateFs) {
    btnRotateFs.addEventListener('click', () => {
        requestArenaFullscreen();
    });
}
window.addEventListener('load', tryLockLandscape);
document.addEventListener('touchstart', () => {
    if (isTouchDevice) tryLockLandscape();
}, { once: true, passive: true });
