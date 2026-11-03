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

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

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

window.addEventListener('keydown', e => keys[e.code] = true);
window.addEventListener('keyup', e => keys[e.code] = false);
window.addEventListener('mousemove', e => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
});
window.addEventListener('mousedown', e => {
    if (e.button === 0) {
        mouse.clicked = true;
        mouse.attackTriggered = true;
    }
});
window.addEventListener('mouseup', e => {
    if (e.button === 0) mouse.clicked = false;
});

// ==========================================
// CONTROLES MOBILE / TOUCH (JOYSTICK & BOTÕES)
// ==========================================
const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || window.matchMedia('(pointer: coarse)').matches;
const mobileControlsLayer = document.getElementById('mobile-controls');
const joystickZone = document.getElementById('joystick-zone');
const joystickBase = document.getElementById('joystick-base');
const joystickStick = document.getElementById('joystick-stick');
const btnTouchSprint = document.getElementById('btn-touch-sprint');
const btnTouchAttack = document.getElementById('btn-touch-attack');

if (isTouchDevice && mobileControlsLayer) {
    mobileControlsLayer.style.display = 'block';

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

        const maxDist = 42;
        const clampedDist = Math.min(dist, maxDist);
        const stickX = Math.cos(angle) * clampedDist;
        const stickY = Math.sin(angle) * clampedDist;

        joystickStick.style.transform = `translate(${stickX}px, ${stickY}px)`;

        // Movimentação
        if (dist > 10) {
            keys['KeyW'] = dy < -12;
            keys['KeyS'] = dy > 12;
            keys['KeyA'] = dx < -12;
            keys['KeyD'] = dx > 12;

            // Mira na direção do joystick se não estiver tocando na tela para mirar
            const p1 = Game.players.find(p => p.id === 'P1' || p.id === Game.localPlayerId);
            if (p1) {
                mouse.x = p1.x + Math.cos(angle) * 100;
                mouse.y = p1.y + Math.sin(angle) * 100;
            }
        } else {
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

    // Botão de Ataque Touch
    if (btnTouchAttack) {
        btnTouchAttack.addEventListener('touchstart', (e) => {
            e.preventDefault();
            mouse.clicked = true;
            mouse.attackTriggered = true;
            btnTouchAttack.classList.add('active');
        }, { passive: false });

        const endAttack = () => {
            mouse.clicked = false;
            btnTouchAttack.classList.remove('active');
        };
        btnTouchAttack.addEventListener('touchend', endAttack);
        btnTouchAttack.addEventListener('touchcancel', endAttack);
    }

    // Toque na tela para mirar e atacar diretamente
    canvas.addEventListener('touchstart', (e) => {
        const touch = e.touches[0];
        if (touch && touch.clientX > window.innerWidth * 0.4) {
            mouse.x = touch.clientX;
            mouse.y = touch.clientY;
            mouse.clicked = true;
            mouse.attackTriggered = true;
        }
    }, { passive: true });

    canvas.addEventListener('touchmove', (e) => {
        const touch = e.touches[0];
        if (touch && touch.clientX > window.innerWidth * 0.4) {
            mouse.x = touch.clientX;
            mouse.y = touch.clientY;
        }
    }, { passive: true });

    canvas.addEventListener('touchend', () => {
        mouse.clicked = false;
    }, { passive: true });
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
// CLASSE JOGADOR (CLIENTE & IA AVANÇADA)
// ==========================================
class Player {
    constructor(id, name, color, x, y, isBot, weaponType, controls, charId) {
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
            if (keys[this.controls.up]) moveY -= speed;
            if (keys[this.controls.down]) moveY += speed;
            if (keys[this.controls.left]) moveX -= speed;
            if (keys[this.controls.right]) moveX += speed;

            if (moveX !== 0 && moveY !== 0) {
                moveX *= 0.7071;
                moveY *= 0.7071;
            }

            this.angle = Math.atan2(mouse.y - this.y, mouse.x - this.x);

            if (mouse.clicked && this.cooldown <= 0 && this.currentAmmo > 0 && this.reloadTimer <= 0) {
                this.attack();
            }

            if (this.hp < 150) elements.damageOverlay.classList.add('pulse-red');
            else elements.damageOverlay.classList.remove('pulse-red');
        } else {
            // ==========================================
            // IA AVANÇADA (ESQUIVA + KITING + PREDIÇÃO)
            // ==========================================
            let speed = sWalk * 0.96;
            let distToZone = Math.hypot(this.x - Game.zone.x, this.y - Game.zone.y);

            // 1. ZONA SEGURA (PRIORIDADE ABSOLUTA)
            if (distToZone > Game.zone.radius - 75) {
                this.angle = Math.atan2(Game.zone.y - this.y, Game.zone.x - this.x);
                moveX = Math.cos(this.angle) * sRun * 1.1;
                moveY = Math.sin(this.angle) * sRun * 1.1;
                this.botState = 'ZONE_FLEE';
            } else {
                // 2. ESQUIVA INTELIGENTE DE PROJÉTEIS (DODGE 90°)
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

                if (incomingProj) {
                    const prAngle = Math.atan2(incomingProj.vy, incomingProj.vx);
                    const dodgeAngle = prAngle + (Math.PI / 2) * (Math.random() > 0.5 ? 1 : -1);
                    moveX = Math.cos(dodgeAngle) * sRun;
                    moveY = Math.sin(dodgeAngle) * sRun;
                    this.botState = 'DODGING';
                } else {
                    // 3. SELEÇÃO DE ALVO INTELIGENTE (MENOR HP OU MAIS PRÓXIMO)
                    let newClosest = null;
                    let minDist = Infinity;
                    let lowestHpTarget = null;
                    let lowestHp = Infinity;

                    Game.players.forEach(p => {
                        if (p !== this && p.alive) {
                            let d = Math.hypot(p.x - this.x, p.y - this.y);
                            if (d < minDist) { minDist = d; newClosest = p; }
                            if (p.hp < lowestHp) { lowestHp = p.hp; lowestTarget = p; }
                        }
                    });

                    let target = (lowestHpTarget && minDist < 450 && lowestHpTarget.hp < 150) ? lowestHpTarget : newClosest;
                    this.currentTarget = target;
                    let closest = this.currentTarget;

                    // 4. KITING DURANTE RECARGA
                    if (this.reloadTimer > 0 && closest && minDist < 350) {
                        this.botState = 'KITING';
                        this.angle = Math.atan2(this.y - closest.y, this.x - closest.x);
                        moveX = Math.cos(this.angle) * sRun * 0.9;
                        moveY = Math.sin(this.angle) * sRun * 0.9;
                    } else if (this.hp < this.maxHp * 0.25 && closest && minDist < 500 && this.lastDamageTimer < 150) {
                        this.botState = 'FLEE';
                        this.angle = Math.atan2(this.y - closest.y, this.x - closest.x);
                        moveX = Math.cos(this.angle) * sRun * 0.85;
                        moveY = Math.sin(this.angle) * sRun * 0.85;
                    } else if (closest && minDist < 750) {
                        this.botState = 'ATTACK';
                        this.strafeTimer--;
                        if (this.strafeTimer <= 0) {
                            this.strafeDir *= -1;
                            this.strafeTimer = 40 + Math.random() * 60;
                        }

                        // MIRA PREDITIVA
                        let aimX = closest.x + (closest.vx || 0) * 10;
                        let aimY = closest.y + (closest.vy || 0) * 10;
                        this.angle = Math.atan2(aimY - this.y, aimX - this.x);

                        if (this.weapon === 'melee') {
                            if (minDist > 85) {
                                moveX = Math.cos(this.angle) * speed * 1.1;
                                moveY = Math.sin(this.angle) * speed * 1.1;
                            } else if (minDist < 50) {
                                moveX = -Math.cos(this.angle) * speed * 0.5;
                                moveY = -Math.sin(this.angle) * speed * 0.5;
                            } else {
                                moveX = Math.cos(this.angle + (Math.PI / 2 * this.strafeDir)) * speed * 0.8;
                                moveY = Math.sin(this.angle + (Math.PI / 2 * this.strafeDir)) * speed * 0.8;
                            }

                            if (minDist < 95 && this.cooldown <= 0 && this.currentAmmo > 0 && this.reloadTimer <= 0) {
                                this.attack();
                            }
                        } else {
                            if (minDist < 200) {
                                moveX = -Math.cos(this.angle) * speed * 1.0;
                                moveY = -Math.sin(this.angle) * speed * 1.0;
                            } else if (minDist > 360) {
                                moveX = Math.cos(this.angle) * speed * 1.0;
                                moveY = Math.sin(this.angle) * speed * 1.0;
                            } else {
                                moveX = Math.cos(this.angle + (Math.PI / 2 * this.strafeDir)) * speed * 0.85;
                                moveY = Math.sin(this.angle + (Math.PI / 2 * this.strafeDir)) * speed * 0.85;
                            }

                            if (this.cooldown <= 0 && this.currentAmmo > 0 && this.reloadTimer <= 0) {
                                let error = (minDist > 300) ? (Math.random() - 0.5) * 0.12 : 0;
                                this.angle += error;
                                this.attack();
                            }
                        }
                    } else {
                        // WANDER
                        this.botState = 'WANDER';
                        if (!this.wanderTarget || Math.hypot(this.wanderTarget.x - this.x, this.wanderTarget.y - this.y) < 30) {
                            let r = Game.zone.radius * Math.random() * 0.6;
                            let theta = Math.random() * Math.PI * 2;
                            this.wanderTarget = {
                                x: Game.zone.x + r * Math.cos(theta),
                                y: Game.zone.y + r * Math.sin(theta)
                            };
                        }
                        this.angle = Math.atan2(this.wanderTarget.y - this.y, this.wanderTarget.x - this.x);
                        moveX = Math.cos(this.angle) * speed * 0.6;
                        moveY = Math.sin(this.angle) * speed * 0.6;
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
        if (this.currentAmmo <= 0) this.reloadTimer = CONFIG.reloadFrames;

        if (this.charId === 'lyra') {
            this.hp = Math.min(this.maxHp, this.hp + 40);
            this.healAura = 20;
        }

        if (this.weapon === 'melee') {
            this.cooldown = 20;
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
            this.cooldown = 32;
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
            Game.eliminatedOrder.push({ name: this.name, color: this.color });
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
        ctx.font = "bold 12px Arial";
        ctx.textAlign = "center";
        ctx.fillText(this.name, this.x, this.y - 35);

        if (this.id !== 'P1' || Game.isSpectating) {
            let barW = 40;
            ctx.fillStyle = "rgba(0,0,0,0.7)";
            ctx.fillRect(this.x - 20, this.y - 30, barW, 4);
            ctx.fillStyle = (this.hp < 150) ? "#ff3d68" : this.color;
            ctx.fillRect(this.x - 20, this.y - 30, (Math.max(0, this.hp) / this.maxHp) * barW, 4);
        }
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
        const offset = Math.min(canvas.width, canvas.height) * 0.25;

        this.players = [
            new Player('P1', savedData.nickname, savedData.color, cX, cY, false, savedData.weapon,
                { up: 'KeyW', down: 'KeyS', left: 'KeyA', right: 'KeyD' }, savedData.charId),
            new Player('B1', 'Malacor_Bot', '#B19CD9', cX - offset, cY - offset, true, 'ranged', null, 'malacor'),
            new Player('B2', 'Kaelen_Bot', '#00d2ff', cX + offset, cY - offset, true, 'melee', null, 'kaelen'),
            new Player('B3', 'Elara_Bot', '#A7FF83', cX - offset, cY + offset, true, 'ranged', null, 'elara'),
            new Player('B4', 'Silas_Bot', '#ffffff', cX + offset, cY + offset, true, 'melee', null, 'silas'),
            new Player('B5', 'Morwen_Bot', '#ff3d68', cX + (offset * 1.2), cY, true, 'ranged', null, 'morwen')
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
        const div = document.createElement('div');
        div.className = 'feed-item';
        div.innerHTML = `<span style="color:${color}">${name}</span> eliminado por <b>${killer}</b>`;
        elements.killFeed.appendChild(div);
        setTimeout(() => div.remove(), 4500);
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
        const ranking = customRanking || (vencedor ? [vencedor, ...this.eliminatedOrder.reverse()] : [...this.eliminatedOrder.reverse()]);
        elements.rankingList.innerHTML = '';
        ranking.forEach((player, index) => {
            const pos = index + 1;
            const item = document.createElement('div');
            item.className = `rank-item ${pos === 1 ? 'winner' : ''}`;
            item.innerHTML = `<span class="rank-pos">#${pos}</span><span class="rank-name" style="color:${player.color}">${player.name}</span><span class="rank-status">${pos === 1 ? 'VENCEDOR' : 'MORTO'}</span>`;
            elements.rankingList.appendChild(item);
        });

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
// TELA DE CARREGAMENTO & CONTAGEM
// ==========================================
const LoadingManager = {
    progress: 0,
    interval: null,
    bar: document.getElementById('loading-bar-fill'),
    text: document.getElementById('loading-text'),
    screen: document.getElementById('loading-screen'),

    start() {
        Game.active = false;

        // Ao tocar na tela ou pressionar espaço, pula imediatamente o tutorial
        const skip = () => {
            if (this.interval) {
                clearInterval(this.interval);
                this.finish();
            }
        };
        window.addEventListener('click', skip, { once: true });
        window.addEventListener('touchstart', skip, { once: true });
        window.addEventListener('keydown', (e) => { if (e.code === 'Space') skip(); }, { once: true });

        // Carregamento suave em ~4 segundos
        this.interval = setInterval(() => {
            this.progress += 1.6;

            if (this.progress >= 100) {
                this.progress = 100;
                clearInterval(this.interval);
                this.updateUI();
                setTimeout(() => this.finish(), 300);
            } else {
                this.updateUI();
            }
        }, 60);
    },

    updateUI() {
        if (this.bar && this.text) {
            this.bar.style.width = this.progress + '%';
            this.text.innerText = `CARREGANDO ARENA... ${Math.floor(this.progress)}%`;
        }
    },

    finish() {
        if (this.screen) {
            this.screen.style.opacity = '0';
            this.screen.style.transition = 'opacity 0.4s ease';

            setTimeout(() => {
                this.screen.classList.add('hidden');
                CountdownManager.start();
            }, 400);
        } else {
            CountdownManager.start();
        }
    }
};

const CountdownManager = {
    counter: 5,
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
            setTimeout(() => this.run(), 1000);
        } else {
            this.numberEl.innerText = "BATALHA!";
            this.numberEl.classList.add('start-text');

            setTimeout(() => {
                this.overlay.classList.add('hidden');
                Game.init();
            }, 1000);
        }
    }
};

// Inicia carregamento
window.onload = () => LoadingManager.start();

// ==========================================
// ORIENTAÇÃO LANDSCAPE OBRIGATÓRIA
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
