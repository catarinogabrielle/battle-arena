# ⚔️ BATTLE ARENA: Last One Standing

> Um jogo de combate Battle Royale 2D Top-Down frenético em HTML5 Canvas e JavaScript, com suporte a **Multiplayer Online em Tempo Real com Salas Criadas** e **Modo Solo com IA Avançada**.

---

## 🎮 Sobre o Jogo

Em **Battle Arena: Last One Standing**, os combatentes entram em uma arena cósmica onde apenas o último sobrevivente sairá vitorioso. Cada guerreiro possui armas, alcances, munições e habilidades passivas exclusivas.

### 🛡️ Campeões Disponíveis
* **Kaelen (Guerreiro do Sol):** Campeão corpo a corpo com golpe giratório devastador e aura protetora de luz.
* **Elara (Patrulheira da Floresta):** Arqueira com disparos velozes e precisos de flechas élficas.
* **Malacor (Mago das Sombras):** Conjurador que lança orbes sombrios capazes de amaldiçoar os oponentes com tremor de tela.
* **Lyra (Sacerdotisa da Luz):** Guerreira de suporte sagrado que recupera **+40 de vida (HP)** a cada golpe conectado.
* **Silas (Assassino da Névoa):** O herói mais ágil da arena, movendo-se **30% mais rápido** com adagas duplas letais.
* **Morwen (Invocadora dos Elementos):** Maga elemental que projeta labaredas flamejantes com rastro de partículas.

---

## 🚀 Novas Funcionalidades Implementadas

### 🌐 1. Sistema Multiplayer Online com Salas
* **Criação de Salas Personalizadas:**
  * Nome da sala customizável.
  * Escolha de mapas (*Hexágono Cósmico*, *Abismo Escuro*, *Ruínas Antigas*).
  * Limite de jogadores (*2, 4, 6 ou 8 jogadores*).
  * Salas **Públicas** (visíveis no saguão geral) ou **Privadas** com código único de 5 dígitos (ex: `#A9X2B`) com botão de cópia com 1 clique.
* **Lobby / Saguão Interativo em Tempo Real:**
  * Visualização dos jogadores conectados com seus campeões escolhidos.
  * Badges de **Host**, **Pronto** e **Bot**.
  * Opção para o Host **adicionar bots** para preencher vagas ou **remover bots**.
  * Botão de **Estou Pronto** e início sincronizado da partida com contagem regressiva.
* **Netcode Autoritativo com Sockets (Socket.io):**
  * Sincronização em tempo real a 30 Hz de movimento, mira, disparos, colisões, dano e encolhimento da zona tempestade.
  * Kill feed global e tela de vitória com pódio e ranking dos eliminados.

### 🤖 2. Inteligência Artificial Avançada dos Bots (Online & Solo)
* **Três Níveis de Dificuldade:**
  * **Recruta (Fácil):** Velocidade reduzida, sem esquiva, tempo de reação mais suave.
  * **Veterano (Normal):** Movimentação tática equilibrada, strafe lateral e mira preditiva média.
  * **Mestre (Difícil):** 
    * **Esquiva Inteligente de Projéteis (Dodge):** Detecta projéteis em rota de colisão a até 220px e realiza arrancada evasiva perpendicular a 90°.
    * **Kiting Tático na Recarga:** Ao esgotar as cargas de energia (`reloadTimer > 0`), o bot recua taticamente em sprint na direção oposta ao inimigo mais próximo.
    * **Foco em Alvos Vulneráveis:** Prioriza oponentes com vida crítica para finalização rápida.
    * **Mira Preditiva Precisa:** Antecipa o vetor de velocidade do alvo para acerto cirúrgico.
* **Modo Treino Solo:**
  * Seleção de dificuldade e número de oponentes (1v1 Duelo, 3 Bots ou 5 Bots em Battle Royale completo).
  * Botão "Pular Guia" para início imediato na arena sem esperas.

---

## 🕹️ Controles do Jogo

| Comando | Ação |
| :--- | :--- |
| **W, A, S, D** ou **Setas** | Mover o Campeão |
| **Barra de Espaço** | Correr (Sprint) |
| **Mover Mouse** | Mirar e Direcionar |
| **Clique Esquerdo do Mouse** | Atacar / Disparar |

---

## 🛠️ Como Executar Localmente

### Pré-requisitos
* [Node.js](https://nodejs.org/) (versão 16+) instalado.

### Passo a Passo
1. Clone o repositório ou navegue até a pasta do projeto:
```bash
git clone https://github.com/catarinogabrielle/Battle-Arena.git
cd Battle-Arena
```

2. Instale as dependências:
```bash
npm install
```

3. Inicie o servidor:
```bash
npm start
```

4. Abra no seu navegador:
```
http://localhost:3000
```

> **Dica:** Para testar o multiplayer com amigos na mesma rede local (Wi-Fi), basta eles acessarem o seu IP local (ex: `http://192.168.x.x:3000`).

### Hospedagem do Multiplayer

O multiplayer usa conexões persistentes do Socket.IO. Para partidas online, hospede o projeto em um serviço Node.js que suporte WebSocket e mantenha o processo `npm start` ativo.

> **Atenção:** A configuração serverless da Vercel (`vercel.json`) pode servir a interface e a API, mas não mantém as conexões Socket.IO necessárias para as partidas em tempo real. Para habilitar multiplayer em produção, hospede o servidor em uma plataforma Node.js com suporte a WebSocket.
