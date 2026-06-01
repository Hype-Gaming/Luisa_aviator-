import mongoose, { Schema, Document } from 'mongoose'
import bcrypt from 'bcryptjs'

export interface IAdminUser extends Document {
  name: string
  email: string
  password: string
  role: 'superadmin' | 'admin'
  active: boolean
  lastLogin: Date | null
  createdAt: Date
  updatedAt: Date
  comparePassword(plain: string): Promise<boolean>
}

const AdminUserSchema = new Schema<IAdminUser>(
  {
    name:      { type: String, required: true, trim: true },
    email:     { type: String, required: true, unique: true, lowercase: true, trim: true },
    password:  { type: String, required: true },
    role:      { type: String, enum: ['superadmin', 'admin'], default: 'admin' },
    active:    { type: Boolean, default: true },
    lastLogin: { type: Date, default: null },
  },
  { timestamps: true }
)

// Hash da senha antes de salvar
AdminUserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next()
  this.password = await bcrypt.hash(this.password, 12)
  next()
})

// Método para comparar senha
AdminUserSchema.methods.comparePassword = function (plain: string) {
  return bcrypt.compare(plain, this.password)
}

AdminUserSchema.index({ email: 1 })

export const AdminUserModel = mongoose.model<IAdminUser>('AdminUser', AdminUserSchema)
