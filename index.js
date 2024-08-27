const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3070;

app.use(express.static('public'));

let snakes = {};
let food = generateFood();
let leaderboard = [];

function generateFood() {
    return [
        { x: Math.floor(Math.random() * 100), y: Math.floor(Math.random() * 100) },
        { x: Math.floor(Math.random() * 100), y: Math.floor(Math.random() * 100) },
    ];
}

io.on('connection', (socket) => {
    socket.on('newPlayer', (nickname) => {
        snakes[socket.id] = {
            nickname,
            body: [{ x: 50, y: 50 }],
            direction: 'right',
            score: 0
        };
        updateLeaderboard();
        io.emit('updateLeaderboard', leaderboard);
    });

    socket.on('move', (direction) => {
        if (snakes[socket.id]) {
            snakes[socket.id].direction = direction;
        }
    });

    socket.on('disconnect', () => {
        delete snakes[socket.id];
        updateLeaderboard();
        io.emit('updateLeaderboard', leaderboard);
    });
});

function updateLeaderboard() {
    leaderboard = Object.values(snakes)
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);
}

setInterval(() => {
    for (let id in snakes) {
        let snake = snakes[id];
        let head = snake.body[0];

        let newHead;
        if (snake.direction === 'up') newHead = { x: head.x, y: head.y - 1 };
        if (snake.direction === 'down') newHead = { x: head.x, y: head.y + 1 };
        if (snake.direction === 'left') newHead = { x: head.x - 1, y: head.y };
        if (snake.direction === 'right') newHead = { x: head.x + 1, y: head.y };

        if (newHead.x < 0 || newHead.x >= 100 || newHead.y < 0 || newHead.y >= 100) {
            delete snakes[id];
            updateLeaderboard();
            io.emit('updateLeaderboard', leaderboard);
            continue;
        }

        for (let i = 0; i < food.length; i++) {
            if (newHead.x === food[i].x && newHead.y === food[i].y) {
                snake.score += 10;
                snake.body.unshift(newHead);
                food[i] = { x: Math.floor(Math.random() * 100), y: Math.floor(Math.random() * 100) };
                updateLeaderboard();
                io.emit('updateLeaderboard', leaderboard);
                break;
            }
        }

        snake.body.pop();
        snake.body.unshift(newHead);
    }

    io.emit('gameState', { snakes, food });
}, 100);

server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});