const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.PORT || 3000;

// Servir arquivos estáticos do jogo
app.use(express.static(__dirname));
app.use('/assets', express.static(path.join(__dirname, 'assets')));

// Rotas explícitas para garantir carregamento estático em Serverless (Vercel)
app.get('/style-menu.css', (req, res) => res.sendFile(path.join(__dirname, 'style-menu.css')));
app.get('/style-arena.css', (req, res) => res.sendFile(path.join(__dirname, 'style-arena.css')));
app.get('/style-login.css', (req, res) => res.sendFile(path.join(__dirname, 'style-login.css')));
app.get('/script-menu.js', (req, res) => res.sendFile(path.join(__dirname, 'script-menu.js')));
app.get('/script-arena.js', (req, res) => res.sendFile(path.join(__dirname, 'script-arena.js')));
app.get('/manifest.json', (req, res) => res.sendFile(path.join(__dirname, 'manifest.json')));
app.get('/service-worker.js', (req, res) => res.sendFile(path.join(__dirname, 'service-worker.js')));
app.get('/favicon.ico', (req, res) => res.sendFile(path.join(__dirname, 'favicon.ico')));
app.get('/assets/:file', (req, res) => res.sendFile(path.join(__dirname, 'assets', req.params.file)));
app.get('/menu.html', (req, res) => res.sendFile(path.join(__dirname, 'menu.html')));
app.get('/arena.html', (req, res) => res.sendFile(path.join(__dirname, 'arena.html')));
app.get('/login.html', (req, res) => res.sendFile(path.join(__dirname, 'login.html')));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'menu.html')));

// ========================================================
// GERENCIADOR DE SALAS E MULTIPLAYER AUTORITATIVO
// ========================================================

const rooms = new Map();

// Helper para gerar código curto de sala (ex: "LOS789" ou "KAEL92")
function generateRoomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 5; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return rooms.has(code) ? generateRoomCode() : code;
}

const HEROES = {
    kaelen: { name: 'KAELEN', class: 'GUERREIRO DO SOL', color: '#00d2ff', weapon: 'melee', maxAmmo: 5, speedMult: 1.0 },
    elara: { name: 'ELARA', class: 'PATRULHEIRA DA FLORESTA', color: '#A7FF83', weapon: 'ranged', maxAmmo: 4, speedMult: 1.0 },
    malacor: { name: 'MALACOR', class: 'MAGO DAS SOMBRAS', color: '#B19CD9', weapon: 'ranged', maxAmmo: 2, speedMult: 1.0 },
    lyra: { name: 'LYRA', class: 'SACERDOTISA DA LUZ', color: '#F0E68C', weapon: 'melee', maxAmmo: 5, speedMult: 1.0 },
    silas: { name: 'SILAS', class: 'ASSASSINO DA NÉVOA', color: '#ffffff', weapon: 'melee', maxAmmo: 5, speedMult: 1.3 },
    morwen: { name: 'MORWEN', class: 'INVOCADORA DOS ELEMENTOS', color: '#ff3d68', weapon: 'ranged', maxAmmo: 2, speedMult: 1.0 }
};

const BOT_HERO_KEYS = ['malacor', 'elara', 'kaelen', 'silas', 'morwen', 'lyra'];

function getPublicRoomsList() {
    const list = [];
    rooms.forEach((room, code) => {
        if (!room.isPrivate && room.state === 'LOBBY') {
            list.push({
                code: room.code,
                name: room.name,
                map: room.map,
                players: room.players.length,
                max: room.maxPlayers,
                state: room.state
            });
        }
    });
    return list;
}

function broadcastRoomsList() {
    io.emit('room_list_updated', getPublicRoomsList());
}

// Inicia a simulação em tempo real da arena no servidor (30 FPS)
function startRoomGameLoop(room) {
    if (room.loopInterval) clearInterval(room.loopInterval);

    room.state = 'IN_GAME';
    room.startTime = Date.now();
    room.frameCount = 0;
    room.projectiles = [];
    room.eliminatedOrder = [];

    // Dimensões virtuais padrão da arena (1920 x 1080 mapeados)
    const arenaW = 1920;
    const arenaH = 1080;
    room.arena = { width: arenaW, height: arenaH };

    room.zone = {
        x: arenaW / 2,
        y: arenaH / 2,
        radius: Math.max(arenaW, arenaH) * 0.45,
        minRadius: 110,
        shrinkSpeed: 0.16,
        delayFrames: 1800 // ~60 segundos a 30 FPS
    };

    // Posiciona os jogadores em círculo
    const centerX = arenaW / 2;
    const centerY = arenaH / 2;
    const spawnRadius = 380;
    const total = room.players.length;

    room.players.forEach((p, idx) => {
        const angle = (idx / total) * Math.PI * 2;
        p.x = centerX + Math.cos(angle) * spawnRadius;
        p.y = centerY + Math.sin(angle) * spawnRadius;
        p.hp = 500;
        p.maxHp = 500;
        p.alive = true;
        p.radius = 22;
        p.angle = angle + Math.PI; // Olhando para o centro
        p.vx = 0;
        p.vy = 0;
        p.currentAmmo = HEROES[p.charId] ? HEROES[p.charId].maxAmmo : 5;
        p.maxAmmo = p.currentAmmo;
        p.reloadTimer = 0;
        p.cooldown = 0;
        p.attackFrame = 0;
        p.lastDamageTimer = 0;

        // IA variáveis
        if (p.isBot) {
            p.botState = 'WANDER';
            p.wanderTarget = null;
            p.currentTarget = null;
            p.strafeDir = Math.random() > 0.5 ? 1 : -1;
            p.strafeTimer = 0;
            p.dodgeTimer = 0;
        }
    });

    io.to(room.code).emit('game_started', {
        arena: room.arena,
        zone: room.zone,
        players: room.players.map(p => serializePlayer(p))
    });

    const TICK_RATE = 30;
    const TICK_MS = 1000 / TICK_RATE;

    room.loopInterval = setInterval(() => {
        if (room.state !== 'IN_GAME') {
            clearInterval(room.loopInterval);
            return;
        }

        updateRoomState(room);

        // Envia snapshot do estado
        io.to(room.code).emit('game_snapshot', {
            frameCount: room.frameCount,
            zone: room.zone,
            players: room.players.map(p => serializePlayer(p)),
            projectiles: room.projectiles.map(pr => ({
                id: pr.id,
                x: pr.x,
                y: pr.y,
                vx: pr.vx,
                vy: pr.vy,
                color: pr.color,
                charId: pr.charId
            })),
            aliveCount: room.players.filter(p => p.alive).length
        });

    }, TICK_MS);
}

function serializePlayer(p) {
    return {
        id: p.id,
        name: p.name,
        charId: p.charId,
        color: p.color,
        weapon: p.weapon,
        isBot: p.isBot,
        x: Math.round(p.x * 10) / 10,
        y: Math.round(p.y * 10) / 10,
        angle: Math.round(p.angle * 100) / 100,
        hp: Math.round(p.hp),
        maxHp: p.maxHp,
        alive: p.alive,
        currentAmmo: p.currentAmmo,
        maxAmmo: p.maxAmmo,
        reloadTimer: p.reloadTimer,
        attackFrame: p.attackFrame,
        healAura: p.healAura || 0
    };
}

function updateRoomState(room) {
    room.frameCount++;

    // Encolhimento da Zona
    if (room.frameCount >= room.zone.delayFrames) {
        if (room.zone.radius > room.zone.minRadius) {
            room.zone.radius -= room.zone.shrinkSpeed;
        }
    }

    const sWalk = 3.4;
    const sRun = 6.8;

    // 1. Atualiza jogadores humanos
    room.players.forEach(p => {
        if (!p.alive) return;

        let speedMult = (p.charId === 'silas') ? 1.3 : 1.0;
        let oldX = p.x;
        let oldY = p.y;

        p.lastDamageTimer++;
        // Regeneração passiva (após 5s sem dano)
        if (p.lastDamageTimer > 150 && p.hp < p.maxHp) {
            p.hp = Math.min(p.maxHp, p.hp + 0.8);
        }

        if (p.reloadTimer > 0) {
            p.reloadTimer--;
            if (p.reloadTimer <= 0) p.currentAmmo = p.maxAmmo;
        }

        if (p.cooldown > 0) p.cooldown--;
        if (p.attackFrame > 0) p.attackFrame--;
        if (p.healAura && p.healAura > 0) p.healAura--;

        if (!p.isBot) {
            // Processa movimentação do jogador humano
            const inp = p.input || { up: false, down: false, left: false, right: false, sprint: false, angle: p.angle };
            const speed = (inp.sprint ? sRun : sWalk) * speedMult;

            let moveX = 0;
            let moveY = 0;
            if (inp.up) moveY -= speed;
            if (inp.down) moveY += speed;
            if (inp.left) moveX -= speed;
            if (inp.right) moveX += speed;

            // Normaliza diagonal
            if (moveX !== 0 && moveY !== 0) {
                moveX *= 0.7071;
                moveY *= 0.7071;
            }

            p.x += moveX;
            p.y += moveY;
            p.angle = inp.angle !== undefined ? inp.angle : p.angle;

            // Disparo/Ataque
            if (inp.attackRequested && p.cooldown <= 0 && p.currentAmmo > 0 && p.reloadTimer <= 0) {
                inp.attackRequested = false;
                executeAttack(room, p);
            }
        } else {
            // ==========================================
            // IA AVANÇADA NO SERVIDOR
            // ==========================================
            updateBotAI(room, p, sWalk, sRun, speedMult);
        }

        p.vx = p.x - oldX;
        p.vy = p.y - oldY;

        // Limita na arena
        p.x = Math.max(p.radius, Math.min(room.arena.width - p.radius, p.x));
        p.y = Math.max(p.radius, Math.min(room.arena.height - p.radius, p.y));

        // Dano da tempestade se fora da zona
        const distToCenter = Math.hypot(p.x - room.zone.x, p.y - room.zone.y);
        if (distToCenter > room.zone.radius) {
            applyDamage(room, p, 2.0, "Tempestade Cósmica");
        }
    });

    // 2. Atualiza Projéteis
    for (let i = room.projectiles.length - 1; i >= 0; i--) {
        const pr = room.projectiles[i];
        pr.x += pr.vx;
        pr.y += pr.vy;
        pr.life--;

        // Checa colisão com jogadores
        let hit = false;
        for (let j = 0; j < room.players.length; j++) {
            const target = room.players[j];
            if (target.alive && target.id !== pr.ownerId) {
                const dist = Math.hypot(target.x - pr.x, target.y - pr.y);
                if (dist < target.radius + pr.radius) {
                    hit = true;
                    applyDamage(room, target, 30, pr.ownerName);

                    // Efeito especial de Malacor
                    if (pr.charId === 'malacor') {
                        io.to(target.id).emit('screen_shake', { intensity: 10, duration: 40 });
                    }
                    break;
                }
            }
        }

        if (hit || pr.life <= 0) {
            room.projectiles.splice(i, 1);
        }
    }
}

function updateBotAI(room, bot, sWalk, sRun, speedMult) {
    const diff = bot.botDifficulty || 'veteran'; // 'recruit', 'veteran', 'master'
    let moveX = 0;
    let moveY = 0;
    const speed = (sWalk * 0.95) * speedMult;

    const distToZone = Math.hypot(bot.x - room.zone.x, bot.y - room.zone.y);

    // 1. Prioridade máxima: Não morrer para a zona
    if (distToZone > room.zone.radius - 80) {
        bot.angle = Math.atan2(room.zone.y - bot.y, room.zone.x - bot.x);
        moveX = Math.cos(bot.angle) * sRun * 1.1;
        moveY = Math.sin(bot.angle) * sRun * 1.1;
        bot.botState = 'ZONE_FLEE';
    } else {
        // 2. Esquiva de Projéteis Inteligente (Mestre & Veterano)
        let incomingProj = null;
        if (diff !== 'recruit') {
            for (let pr of room.projectiles) {
                if (pr.ownerId !== bot.id) {
                    let d = Math.hypot(pr.x - bot.x, pr.y - bot.y);
                    if (d < 220) {
                        // Verifica se o projétil está vindo na direção do bot
                        let projAngle = Math.atan2(pr.vy, pr.vx);
                        let angleToBot = Math.atan2(bot.y - pr.y, bot.x - pr.x);
                        let angleDiff = Math.abs(projAngle - angleToBot);
                        if (angleDiff < 0.45 || angleDiff > Math.PI * 2 - 0.45) {
                            incomingProj = pr;
                            break;
                        }
                    }
                }
            }
        }

        if (incomingProj) {
            // Esquiva a 90 graus da trajetória da bala
            const prAngle = Math.atan2(incomingProj.vy, incomingProj.vx);
            const dodgeAngle = prAngle + (Math.PI / 2) * (Math.random() > 0.5 ? 1 : -1);
            moveX = Math.cos(dodgeAngle) * sRun;
            moveY = Math.sin(dodgeAngle) * sRun;
            bot.botState = 'DODGING';
        } else {
            // 3. Procura inimigos vivos
            let closest = null;
            let minDist = Infinity;
            let lowestHpTarget = null;
            let minHp = Infinity;

            room.players.forEach(other => {
                if (other !== bot && other.alive) {
                    let d = Math.hypot(other.x - bot.x, other.y - bot.y);
                    if (d < minDist) { minDist = d; closest = other; }
                    if (other.hp < minHp) { minHp = other.hp; lowestHpTarget = other; }
                }
            });

            // Se for nível Mestre, foca no inimigo com menos vida se estiver a menos de 500px
            let target = (diff === 'master' && lowestHpTarget && minDist < 500 && lowestHpTarget.hp < 180) ? lowestHpTarget : closest;

            // 4. Kiting durante Recarga: Se sem munição, recua taticamente
            if (bot.reloadTimer > 0 && target && minDist < 400) {
                bot.botState = 'KITING';
                let fleeAngle = Math.atan2(bot.y - target.y, bot.x - target.x);
                moveX = Math.cos(fleeAngle) * sRun * 0.9;
                moveY = Math.sin(fleeAngle) * sRun * 0.9;
            } else if (bot.hp < bot.maxHp * 0.25 && target && minDist < 450 && bot.lastDamageTimer < 90) {
                // Fuga com vida crítica
                bot.botState = 'FLEE';
                bot.angle = Math.atan2(bot.y - target.y, bot.x - target.x);
                moveX = Math.cos(bot.angle) * sRun * 0.85;
                moveY = Math.sin(bot.angle) * sRun * 0.85;
            } else if (target && minDist < 750) {
                bot.botState = 'ATTACK';
                bot.strafeTimer--;
                if (bot.strafeTimer <= 0) {
                    bot.strafeDir *= -1;
                    bot.strafeTimer = 30 + Math.random() * 40;
                }

                // Mira Preditiva
                let leadTime = diff === 'master' ? 12 : (diff === 'veteran' ? 8 : 0);
                let aimX = target.x + (target.vx || 0) * leadTime;
                let aimY = target.y + (target.vy || 0) * leadTime;
                bot.angle = Math.atan2(aimY - bot.y, aimX - bot.x);

                if (bot.weapon === 'melee') {
                    if (minDist > 85) {
                        moveX = Math.cos(bot.angle) * speed * 1.1;
                        moveY = Math.sin(bot.angle) * speed * 1.1;
                    } else if (minDist < 50) {
                        moveX = -Math.cos(bot.angle) * speed * 0.5;
                        moveY = -Math.sin(bot.angle) * speed * 0.5;
                    } else {
                        moveX = Math.cos(bot.angle + (Math.PI / 2 * bot.strafeDir)) * speed * 0.8;
                        moveY = Math.sin(bot.angle + (Math.PI / 2 * bot.strafeDir)) * speed * 0.8;
                    }

                    if (minDist < 95 && bot.cooldown <= 0 && bot.currentAmmo > 0 && bot.reloadTimer <= 0) {
                        executeAttack(room, bot);
                    }
                } else {
                    // Ranged
                    if (minDist < 220) {
                        moveX = -Math.cos(bot.angle) * speed * 1.0;
                        moveY = -Math.sin(bot.angle) * speed * 1.0;
                    } else if (minDist > 380) {
                        moveX = Math.cos(bot.angle) * speed * 1.0;
                        moveY = Math.sin(bot.angle) * speed * 1.0;
                    } else {
                        moveX = Math.cos(bot.angle + (Math.PI / 2 * bot.strafeDir)) * speed * 0.9;
                        moveY = Math.sin(bot.angle + (Math.PI / 2 * bot.strafeDir)) * speed * 0.9;
                    }

                    if (bot.cooldown <= 0 && bot.currentAmmo > 0 && bot.reloadTimer <= 0) {
                        let error = diff === 'master' ? (Math.random() - 0.5) * 0.04 : (diff === 'recruit' ? (Math.random() - 0.5) * 0.35 : (Math.random() - 0.5) * 0.15);
                        bot.angle += error;
                        executeAttack(room, bot);
                    }
                }
            } else {
                // WANDER
                bot.botState = 'WANDER';
                if (!bot.wanderTarget || Math.hypot(bot.wanderTarget.x - bot.x, bot.wanderTarget.y - bot.y) < 30) {
                    let r = room.zone.radius * Math.random() * 0.6;
                    let theta = Math.random() * Math.PI * 2;
                    bot.wanderTarget = {
                        x: room.zone.x + r * Math.cos(theta),
                        y: room.zone.y + r * Math.sin(theta)
                    };
                }
                bot.angle = Math.atan2(bot.wanderTarget.y - bot.y, bot.wanderTarget.x - bot.x);
                moveX = Math.cos(bot.angle) * speed * 0.6;
                moveY = Math.sin(bot.angle) * speed * 0.6;
            }
        }
    }

    bot.x += moveX;
    bot.y += moveY;
}

function executeAttack(room, player) {
    player.attackFrame = 15;
    player.currentAmmo--;
    if (player.currentAmmo <= 0) {
        player.reloadTimer = 90; // 3 segundos a 30 FPS
    }

    // Passiva de Lyra: Cura +40
    if (player.charId === 'lyra') {
        player.hp = Math.min(player.maxHp, player.hp + 40);
        player.healAura = 15;
    }

    if (player.weapon === 'melee') {
        player.cooldown = 12;
        const range = (player.charId === 'silas') ? 75 : 95;

        room.players.forEach(target => {
            if (target !== player && target.alive) {
                const dist = Math.hypot(target.x - player.x, target.y - player.y);
                const angleToTarget = Math.atan2(target.y - player.y, target.x - player.x);
                let diff = Math.abs(angleToTarget - player.angle);
                while (diff > Math.PI) diff = Math.abs(diff - Math.PI * 2);

                if (dist < range && diff < Math.PI / 2.2) {
                    applyDamage(room, target, 45, player.name);
                    // Knockback
                    target.x += Math.cos(angleToTarget) * 45;
                    target.y += Math.sin(angleToTarget) * 45;
                }
            }
        });
    } else {
        // Ranged
        player.cooldown = 18;
        const speed = 18;
        room.projectiles.push({
            id: 'proj_' + Math.random().toString(36).substr(2, 9),
            x: player.x,
            y: player.y,
            vx: Math.cos(player.angle) * speed,
            vy: Math.sin(player.angle) * speed,
            radius: 5,
            color: player.color,
            ownerId: player.id,
            ownerName: player.name,
            charId: player.charId,
            life: 60
        });
    }
}

function applyDamage(room, player, amount, killerName) {
    if (!player.alive) return;
    player.hp -= amount;
    player.lastDamageTimer = 0;

    if (player.hp <= 0) {
        player.alive = false;
        player.hp = 0;
        room.eliminatedOrder.push({ name: player.name, color: player.color, charId: player.charId });

        io.to(room.code).emit('player_eliminated', {
            victim: player.name,
            killer: killerName,
            color: player.color
        });

        checkRoomWin(room);
    }
}

function checkRoomWin(room) {
    const alive = room.players.filter(p => p.alive);
    if (alive.length <= 1) {
        room.state = 'FINISHED';
        if (room.loopInterval) clearInterval(room.loopInterval);

        const winner = alive[0] || null;
        const ranking = winner ? [winner, ...room.eliminatedOrder.slice().reverse()] : [...room.eliminatedOrder.slice().reverse()];

        io.to(room.code).emit('match_finished', {
            winner: winner ? { name: winner.name, color: winner.color, charId: winner.charId } : null,
            ranking: ranking.map(r => ({ name: r.name, color: r.color, charId: r.charId }))
        });

        broadcastRoomsList();
    }
}

// ========================================================
// SOCKET.IO EVENTOS DE CONEXÃO E SALAS
// ========================================================

io.on('connection', (socket) => {
    // Envia lista atual de salas públicas
    socket.emit('room_list_updated', getPublicRoomsList());

    // 1. Criar Sala
    socket.on('create_room', (data) => {
        const { name, map, maxPlayers, isPrivate, playerInfo, fillBots, botDifficulty } = data;
        const code = generateRoomCode();

        const hostPlayer = {
            id: socket.id,
            name: (playerInfo && playerInfo.nickname) ? playerInfo.nickname : 'Host',
            charId: (playerInfo && playerInfo.charId) ? playerInfo.charId : 'kaelen',
            color: HEROES[playerInfo && playerInfo.charId] ? HEROES[playerInfo.charId].color : '#00d2ff',
            weapon: HEROES[playerInfo && playerInfo.charId] ? HEROES[playerInfo.charId].weapon : 'melee',
            isBot: false,
            isHost: true,
            ready: true
        };

        const room = {
            code: code,
            name: name || `Sala de ${hostPlayer.name}`,
            map: map || 'Hexágono Cósmico',
            maxPlayers: parseInt(maxPlayers) || 4,
            isPrivate: !!isPrivate,
            hostId: socket.id,
            botDifficulty: botDifficulty || 'veteran',
            state: 'LOBBY',
            players: [hostPlayer],
            loopInterval: null
        };

        // Preenche com bots se solicitado
        if (fillBots) {
            let botIndex = 1;
            while (room.players.length < room.maxPlayers) {
                const bCharId = BOT_HERO_KEYS[(botIndex - 1) % BOT_HERO_KEYS.length];
                const hero = HEROES[bCharId];
                room.players.push({
                    id: 'bot_' + Math.random().toString(36).substr(2, 6),
                    name: `${hero.name}_Bot`,
                    charId: bCharId,
                    color: hero.color,
                    weapon: hero.weapon,
                    isBot: true,
                    isHost: false,
                    ready: true,
                    botDifficulty: room.botDifficulty
                });
                botIndex++;
            }
        }

        rooms.set(code, room);
        socket.join(code);
        socket.currentRoom = code;

        socket.emit('room_joined', {
            code: code,
            room: getRoomPublicData(room),
            isHost: true
        });

        broadcastRoomsList();
    });

    // 2. Entrar em Sala por Código ou Lista
    socket.on('join_room', (data) => {
        const { code, playerInfo } = data;
        const room = rooms.get(code ? code.toUpperCase().trim() : '');

        if (!room) {
            socket.emit('join_error', { message: 'Sala não encontrada! Verifique o código.' });
            return;
        }

        if (room.state !== 'LOBBY') {
            socket.emit('join_error', { message: 'Esta partida já foi iniciada ou encerrada!' });
            return;
        }

        if (room.players.length >= room.maxPlayers) {
            socket.emit('join_error', { message: 'A sala está cheia!' });
            return;
        }

        const newPlayer = {
            id: socket.id,
            name: (playerInfo && playerInfo.nickname) ? playerInfo.nickname : `Jogador ${room.players.length + 1}`,
            charId: (playerInfo && playerInfo.charId) ? playerInfo.charId : 'elara',
            color: HEROES[playerInfo && playerInfo.charId] ? HEROES[playerInfo.charId].color : '#A7FF83',
            weapon: HEROES[playerInfo && playerInfo.charId] ? HEROES[playerInfo.charId].weapon : 'ranged',
            isBot: false,
            isHost: false,
            ready: false
        };

        room.players.push(newPlayer);
        socket.join(room.code);
        socket.currentRoom = room.code;

        socket.emit('room_joined', {
            code: room.code,
            room: getRoomPublicData(room),
            isHost: false
        });

        io.to(room.code).emit('lobby_updated', getRoomPublicData(room));
        broadcastRoomsList();
    });

    // 3. Adicionar Bot
    socket.on('add_bot', () => {
        const code = socket.currentRoom;
        const room = rooms.get(code);
        if (!room || room.hostId !== socket.id || room.state !== 'LOBBY') return;

        if (room.players.length < room.maxPlayers) {
            const bCharId = BOT_HERO_KEYS[room.players.length % BOT_HERO_KEYS.length];
            const hero = HEROES[bCharId];
            room.players.push({
                id: 'bot_' + Math.random().toString(36).substr(2, 6),
                name: `${hero.name}_Bot`,
                charId: bCharId,
                color: hero.color,
                weapon: hero.weapon,
                isBot: true,
                isHost: false,
                ready: true,
                botDifficulty: room.botDifficulty
            });

            io.to(room.code).emit('lobby_updated', getRoomPublicData(room));
            broadcastRoomsList();
        }
    });

    // 4. Remover Bot
    socket.on('remove_bot', (data) => {
        const code = socket.currentRoom;
        const room = rooms.get(code);
        if (!room || room.hostId !== socket.id || room.state !== 'LOBBY') return;

        const idx = room.players.findIndex(p => p.id === data.botId && p.isBot);
        if (idx !== -1) {
            room.players.splice(idx, 1);
            io.to(room.code).emit('lobby_updated', getRoomPublicData(room));
            broadcastRoomsList();
        }
    });

    // 5. Mudar Status Pronto
    socket.on('toggle_ready', () => {
        const code = socket.currentRoom;
        const room = rooms.get(code);
        if (!room || room.state !== 'LOBBY') return;

        const p = room.players.find(pl => pl.id === socket.id);
        if (p) {
            p.ready = !p.ready;
            io.to(room.code).emit('lobby_updated', getRoomPublicData(room));
        }
    });

    // 6. Iniciar Partida (Apenas Host)
    socket.on('start_match', () => {
        const code = socket.currentRoom;
        const room = rooms.get(code);
        if (!room || room.hostId !== socket.id || room.state !== 'LOBBY') return;

        if (room.players.length < 2) {
            socket.emit('join_error', { message: 'São necessários pelo menos 2 jogadores ou bots para iniciar!' });
            return;
        }

        room.state = 'STARTING';
        io.to(room.code).emit('match_starting', { countdown: 3 });

        setTimeout(() => {
            startRoomGameLoop(room);
        }, 3000);

        broadcastRoomsList();
    });

    // 7. Inputs do Jogador em Tempo Real
    socket.on('player_input', (inputData) => {
        const code = socket.currentRoom;
        if (!code) return;
        const room = rooms.get(code);
        if (!room || room.state !== 'IN_GAME') return;

        const p = room.players.find(pl => pl.id === socket.id);
        if (p && p.alive) {
            p.input = inputData;
        }
    });

    // 8. Desconexão / Sair
    const handleLeave = () => {
        const code = socket.currentRoom;
        if (!code) return;
        const room = rooms.get(code);
        if (!room) return;

        socket.leave(code);
        socket.currentRoom = null;

        const idx = room.players.findIndex(p => p.id === socket.id);
        if (idx !== -1) {
            const wasHost = room.players[idx].isHost;
            room.players.splice(idx, 1);

            // Se a sala estiver vazia ou só com bots, fecha a sala
            const humans = room.players.filter(p => !p.isBot);
            if (humans.length === 0) {
                if (room.loopInterval) clearInterval(room.loopInterval);
                rooms.delete(code);
            } else {
                // Se o host saiu, passa a liderança para o próximo humano
                if (wasHost && humans[0]) {
                    humans[0].isHost = true;
                    room.hostId = humans[0].id;
                }
                io.to(room.code).emit('lobby_updated', getRoomPublicData(room));
            }
            broadcastRoomsList();
        }
    };

    socket.on('leave_room', handleLeave);
    socket.on('disconnect', handleLeave);
});

function getRoomPublicData(room) {
    return {
        code: room.code,
        name: room.name,
        map: room.map,
        maxPlayers: room.maxPlayers,
        isPrivate: room.isPrivate,
        hostId: room.hostId,
        botDifficulty: room.botDifficulty,
        state: room.state,
        players: room.players.map(p => ({
            id: p.id,
            name: p.name,
            charId: p.charId,
            color: p.color,
            weapon: p.weapon,
            isBot: p.isBot,
            isHost: p.isHost,
            ready: p.ready
        }))
    };
}

if (require.main === module || !process.env.VERCEL) {
    server.listen(PORT, () => {
        console.log(`===============================================`);
        console.log(`⚔️ BATTLE ARENA SERVER RODANDO NA PORTA ${PORT}`);
        console.log(`👉 Acesse no navegador: http://localhost:${PORT}`);
        console.log(`===============================================`);
    });
}

module.exports = app;
