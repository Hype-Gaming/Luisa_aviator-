import mongoose, { Schema, Document } from 'mongoose'

export interface ISolicitation extends Document {
  solicitationType: 'aplicativo' | 'canal-telegram'
  channelMode:      'existing' | 'create'   // canal-telegram: sala já existe ou criar nova
  name:             string
  whatsapp:         string
  logoUrl:          string | null
  primaryColor:     string
  linkCadastro:     string
  linkTelegram:     string | null
  linkSuporte:      string | null
  linkComunidade:   string | null
  linkInstagram:    string | null
  selectedGames:    string[]
  selectedRouletteTables: string[]
  scheduleType:     '24h' | 'specific'
  scheduleHours:    string[]
  signalPattern:    string | null
  status:           'pending' | 'approved' | 'rejected'
  createdAt:        Date
  updatedAt:        Date
}

const SolicitationSchema = new Schema<ISolicitation>({
  solicitationType: { type: String, enum: ['aplicativo', 'canal-telegram'], required: true, default: 'aplicativo' },
  channelMode:      { type: String, enum: ['existing', 'create'], default: 'existing' },
  name:             { type: String, required: true, trim: true },
  whatsapp:         { type: String, required: true, trim: true },
  logoUrl:          { type: String, default: null },
  primaryColor:     { type: String, default: '#2ab885' },
  linkCadastro:     { type: String, required: true, trim: true },
  linkTelegram:     { type: String, default: null, trim: true },
  linkSuporte:      { type: String, default: null, trim: true },
  linkComunidade:   { type: String, default: null, trim: true },
  linkInstagram:    { type: String, default: null, trim: true },
  selectedGames:    [{ type: String }],
  selectedRouletteTables: [{ type: String }],
  scheduleType:     { type: String, enum: ['24h', 'specific'], default: '24h' },
  scheduleHours:    [{ type: String }],
  signalPattern:    { type: String, default: null, trim: true },
  status:           { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
}, { timestamps: true })

export const SolicitationModel = mongoose.model<ISolicitation>('Solicitation', SolicitationSchema)
