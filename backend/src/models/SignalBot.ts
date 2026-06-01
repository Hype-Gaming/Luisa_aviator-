import mongoose, { Schema, Document } from 'mongoose'

export interface ISignalBotGame {
  gameId:           string
  gameName:         string
  signalUrl:        string | null
  signalName:       string | null
  signalCollection: string | null
  signalMessage:    string | null
  signalDuration:   number | null
}

export interface ISignalBot extends Document {
  name:         string
  description:  string | null
  botToken:     string          // token do bot — obtido no @BotFather
  chatId:       string          // ID do canal/grupo (ex: -1001234567890 ou @username)
  wsUrl:        string | null   // URL do WebSocket que emite os sinais (wss://...)
  selectedGames:   ISignalBotGame[]
  scheduleType:    '24h' | 'specific'
  scheduleHours:   string[]
  status:          'active' | 'paused'
  createdAt:       Date
  updatedAt:       Date
}

const SignalBotGameSchema = new Schema<ISignalBotGame>(
  {
    gameId:           { type: String, required: true },
    gameName:         { type: String, required: true },
    signalUrl:        { type: String, default: null },
    signalName:       { type: String, default: null },
    signalCollection: { type: String, default: null },
    signalMessage:    { type: String, default: null },
    signalDuration:   { type: Number, default: null },
  },
  { _id: false }
)

const SignalBotSchema = new Schema<ISignalBot>(
  {
    name:        { type: String, required: true, trim: true },
    description: { type: String, default: null, trim: true },
    botToken:    { type: String, required: true, trim: true },
    chatId:      { type: String, required: true, trim: true },
    wsUrl:       { type: String, default: null, trim: true },
    selectedGames:   { type: [SignalBotGameSchema], default: [] },
    scheduleType:    { type: String, enum: ['24h', 'specific'], default: '24h' },
    scheduleHours:   [{ type: String }],
    status:          { type: String, enum: ['active', 'paused'], default: 'active' },
  },
  { timestamps: true }
)

SignalBotSchema.index({ status: 1 })

export const SignalBotModel = mongoose.model<ISignalBot>('SignalBot', SignalBotSchema)
