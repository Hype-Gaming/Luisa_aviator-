import mongoose, { Schema, Document } from 'mongoose'

export interface IDeposit extends Document {
  slug: string
  transactionId: string
  userId: string
  userName: string
  userEmail: string
  amount: number
  status: string
  token: string
  cookieKey: string
  brandSlug: string
  baseDomain: string
}

const DepositSchema = new Schema<IDeposit>(
  {
    slug:          { type: String, required: true, index: true },
    transactionId: { type: String, required: true, unique: true },
    userId:        { type: String },
    userName:      { type: String },
    userEmail:     { type: String },
    amount:        { type: Number },
    status:        { type: String, default: 'pending', index: true },
    token:         { type: String },   // Bearer token para verificar status
    cookieKey:     { type: String },   // X-Cactus-Cookie-Key
    brandSlug:     { type: String, default: 'esportiva' },
    baseDomain:    { type: String, default: 'bet.br' },
  },
  { timestamps: true }
)

export const Deposit = mongoose.models.Deposit || mongoose.model<IDeposit>('Deposit', DepositSchema, 'deposits')
