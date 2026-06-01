import mongoose, { Schema, Document } from 'mongoose'

export const ALL_CATEGORIES = ['ROLETAS', 'CRASH', 'SLOT', 'DIVERSOS'] as const
export type GameCategory = typeof ALL_CATEGORIES[number]

export interface IGame extends Document {
  slug:      string
  name:      string
  logoUrl:   string | null
  category:  GameCategory
  order:     number
  active:    boolean
  gameSlug:  string | null
  apiUrl:    string | null
  signalUrl:        string | null
  signalName:       string | null
  signalCollection: string | null
  signalMessage:    string | null
  signalDuration:   number | null   // Duração base do sinal SLOT em segundos
  createdAt: Date
  updatedAt: Date
}

const GameSchema = new Schema<IGame>({
  slug:      { type: String, required: true, trim: true, lowercase: true },
  name:      { type: String, required: true, trim: true },
  logoUrl:   { type: String, default: null },
  category:  { type: String, enum: ALL_CATEGORIES, required: true },
  order:     { type: Number, default: 0 },
  active:    { type: Boolean, default: true },
  gameSlug:  { type: String, default: null, trim: true },
  apiUrl:    { type: String, default: null, trim: true },
  signalUrl:        { type: String, default: null, trim: true },
  signalName:       { type: String, default: null, trim: true },
  signalCollection: { type: String, default: null, trim: true },
  signalMessage:    { type: String, default: null, trim: true },
  signalDuration:   { type: Number, default: null },
}, { timestamps: true })

GameSchema.index({ slug: 1, category: 1, order: 1 })

export const GameModel = mongoose.model<IGame>('Game', GameSchema)
