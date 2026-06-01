import mongoose, { Schema } from 'mongoose'

const aviatorDb = mongoose.connection.useDb('games_telegram_apps', { useCache: true })

const AviatorRoundSchema = new Schema(
  {
    crash_point: { type: Number, required: true },
    created_at: { type: Date, default: Date.now },
  },
  { strict: false }
)

export const AviatorRoundModel = aviatorDb.model(
  'AviatorRound',
  AviatorRoundSchema,
  'aviator_spribe'
)
