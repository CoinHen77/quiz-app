import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import cors from 'cors'
import { randomUUID } from 'crypto'

const PORT = process.env.PORT || 3001
const HOST_PASSWORD = process.env.HOST_PASSWORD || 'changeme'

type Player = {
  id: string
  name: string
  score: number
  socketId: string
}

type Question = {
  order: number
  text: string
  options: string[]
  correctIndex: number
  timeLimitSeconds: number
}

type Answer = {
  answerIndex: number
  responseTimeMs: number
}

type GameState = {
  roomCode: string
  quizId: string
  hostSocketId: string
  players: Map<string, Player>
  status: 'lobby' | 'active' | 'ended'
  questions: Question[]
  currentQuestionIndex: number
  questionStartTime: number
  answers: Map<string, Answer>
  questionLocked: boolean
  questionTimer: NodeJS.Timeout | null
}

const rooms = new Map<string, GameState>()

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)]
  return rooms.has(code) ? generateRoomCode() : code
}

function playersArray(room: GameState) {
  return Array.from(room.players.values()).map(p => ({ id: p.id, name: p.name }))
}

function buildStandings(room: GameState) {
  return Array.from(room.players.values())
    .sort((a, b) => b.score - a.score)
    .map((p, i) => ({ name: p.name, score: p.score, rank: i + 1 }))
}

const app = express()
app.use(cors())
app.use(express.json())

const httpServer = createServer(app)

const allowedOrigins = [
  'http://localhost:3000',
  'https://your-app.netlify.app',
  /\.netlify\.app$/,
]

const io = new Server(httpServer, {
  cors: { origin: allowedOrigins, methods: ['GET', 'POST'] },
})

function startQuestion(room: GameState) {
  room.answers = new Map()
  room.questionLocked = false
  if (room.questionTimer) {
    clearTimeout(room.questionTimer)
    room.questionTimer = null
  }

  const q = room.questions[room.currentQuestionIndex]
  room.questionStartTime = Date.now()

  io.to(room.roomCode).emit('question:show', {
    questionIndex: room.currentQuestionIndex,
    totalQuestions: room.questions.length,
    text: q.text,
    options: q.options,
    timeLimitSeconds: q.timeLimitSeconds,
    startTimestamp: room.questionStartTime,
  })

  room.questionTimer = setTimeout(() => {
    room.questionLocked = true
    io.to(room.roomCode).emit('question:locked')
  }, q.timeLimitSeconds * 1000)
}

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', rooms: rooms.size })
})

io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id}`)

  socket.on('host:create-room', (
    { quizId, password }: { quizId: string; password: string },
    cb: (res: { roomCode: string } | { error: string }) => void
  ) => {
    if (password !== HOST_PASSWORD) return cb({ error: 'Invalid host password' })
    const roomCode = generateRoomCode()
    rooms.set(roomCode, {
      roomCode,
      quizId,
      hostSocketId: socket.id,
      players: new Map(),
      status: 'lobby',
      questions: [],
      currentQuestionIndex: -1,
      questionStartTime: 0,
      answers: new Map(),
      questionLocked: false,
      questionTimer: null,
    })
    socket.join(roomCode)
    console.log(`Room ${roomCode} created for quiz ${quizId}`)
    cb({ roomCode })
  })

  socket.on('player:join', (
    { roomCode, name }: { roomCode: string; name: string },
    cb: (res: { playerId: string } | { error: string }) => void
  ) => {
    const room = rooms.get(roomCode.toUpperCase())
    if (!room) return cb({ error: 'Room not found' })
    if (room.status !== 'lobby') return cb({ error: 'Game already in progress' })

    const existing = Array.from(room.players.values()).find(
      p => p.name.toLowerCase() === name.trim().toLowerCase()
    )
    if (existing) {
      existing.socketId = socket.id
      socket.join(room.roomCode)
      io.to(room.roomCode).emit('lobby:update', { players: playersArray(room) })
      return cb({ playerId: existing.id })
    }

    const playerId = randomUUID()
    room.players.set(playerId, { id: playerId, name: name.trim(), score: 0, socketId: socket.id })
    socket.join(room.roomCode)
    io.to(room.roomCode).emit('lobby:update', { players: playersArray(room) })
    console.log(`Player "${name}" joined room ${room.roomCode} (${room.players.size} total)`)
    cb({ playerId })
  })

  socket.on('host:start-game', ({ roomCode, questions }: { roomCode: string; questions: Question[] }) => {
    const room = rooms.get(roomCode)
    if (!room || room.hostSocketId !== socket.id || room.status !== 'lobby') return
    if (!questions || questions.length === 0) return

    room.questions = questions
    room.status = 'active'
    room.currentQuestionIndex = 0

    io.to(roomCode).emit('game:started')
    startQuestion(room)
    console.log(`Game started in room ${roomCode} with ${questions.length} questions`)
  })

  socket.on('player:submit-answer', ({
    roomCode, playerId, answerIndex,
  }: { roomCode: string; playerId: string; answerIndex: number }) => {
    const room = rooms.get(roomCode)
    if (!room || room.status !== 'active') return
    if (room.questionLocked) return
    if (room.answers.has(playerId)) return
    if (!room.players.has(playerId)) return

    const responseTimeMs = Date.now() - room.questionStartTime
    room.answers.set(playerId, { answerIndex, responseTimeMs })

    io.to(room.hostSocketId).emit('answer:received', { count: room.answers.size })
  })

  socket.on('host:reveal-answer', ({ roomCode }: { roomCode: string }) => {
    const room = rooms.get(roomCode)
    if (!room || room.hostSocketId !== socket.id || room.status !== 'active') return

    if (room.questionTimer) {
      clearTimeout(room.questionTimer)
      room.questionTimer = null
    }
    room.questionLocked = true

    const q = room.questions[room.currentQuestionIndex]
    const answerCounts = Array(q.options.length).fill(0) as number[]
    for (const answer of room.answers.values()) {
      answerCounts[answer.answerIndex]++
    }

    for (const [pid, answer] of room.answers.entries()) {
      if (answer.answerIndex === q.correctIndex) {
        const player = room.players.get(pid)
        if (player) {
          const raw = Math.round(1000 * (1 - answer.responseTimeMs / (q.timeLimitSeconds * 1000) / 2))
          player.score += Math.max(0, raw)
        }
      }
    }

    io.to(room.roomCode).emit('question:reveal', {
      correctIndex: q.correctIndex,
      answerCounts,
    })
    io.to(room.roomCode).emit('leaderboard:update', { standings: buildStandings(room) })
    console.log(`Revealed Q${room.currentQuestionIndex + 1} in room ${roomCode}`)
  })

  socket.on('host:next-question', ({ roomCode }: { roomCode: string }) => {
    const room = rooms.get(roomCode)
    if (!room || room.hostSocketId !== socket.id || room.status !== 'active') return

    room.currentQuestionIndex++

    if (room.currentQuestionIndex >= room.questions.length) {
      room.status = 'ended'
      io.to(room.roomCode).emit('game:over', { finalStandings: buildStandings(room) })
      console.log(`Game over in room ${roomCode}`)
      return
    }

    startQuestion(room)
  })

  socket.on('disconnect', () => {
    console.log(`Socket disconnected: ${socket.id}`)
    for (const room of rooms.values()) {
      if (room.hostSocketId === socket.id && room.questionTimer) {
        clearTimeout(room.questionTimer)
        room.questionTimer = null
      }
    }
  })
})

httpServer.listen(PORT, () => {
  console.log(`Socket.IO server running on port ${PORT}`)
})
