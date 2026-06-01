import mongoose, { Schema, Document } from 'mongoose'

export interface IGameImage extends Document {
  title: string
  imageUrl: string
  order: number
  active: boolean
  createdAt: Date
  updatedAt: Date
}

const GameImageSchema = new Schema<IGameImage>(
  {
    title:    { type: String, required: true, trim: true },
    imageUrl: { type: String, required: true },
    order:    { type: Number, default: 0 },
    active:   { type: Boolean, default: true },
  },
  { timestamps: true }
)

export const GameImage = mongoose.model<IGameImage>('GameImage', GameImageSchema)
