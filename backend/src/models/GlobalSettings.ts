import mongoose, { Schema, Document } from 'mongoose'

// ============================================
// Interface da Manutenção
// ============================================
export interface IMaintenance {
  active: boolean
  title: string
  message: string
  activatedAt: Date | null
}

// ============================================
// Interface do GlobalSettings
// ============================================
export interface IGlobalSettings extends Document {
  maintenance: IMaintenance
  updatedAt: Date
  createdAt: Date
}

// ============================================
// Defaults
// ============================================
export const DEFAULT_MAINTENANCE: IMaintenance = {
  active: false,
  title: 'Em Manutenção',
  message: 'Estamos realizando melhorias para você. Voltamos em breve!',
  activatedAt: null,
}

// ============================================
// Schema
// ============================================
const MaintenanceSchema = new Schema<IMaintenance>({
  active:      { type: Boolean, default: false },
  title:       { type: String,  default: DEFAULT_MAINTENANCE.title },
  message:     { type: String,  default: DEFAULT_MAINTENANCE.message },
  activatedAt: { type: Date,    default: null },
}, { _id: false })

const GlobalSettingsSchema = new Schema<IGlobalSettings>({
  maintenance: { type: MaintenanceSchema, default: () => ({ ...DEFAULT_MAINTENANCE }) },
}, {
  timestamps: true,
  collection: 'global_settings',
})

export const GlobalSettingsModel = mongoose.model<IGlobalSettings>('GlobalSettings', GlobalSettingsSchema)

// ============================================
// Helper: busca ou cria o singleton
// ============================================
export async function getGlobalSettings(): Promise<IGlobalSettings> {
  let settings = await GlobalSettingsModel.findOne()
  if (!settings) {
    settings = await GlobalSettingsModel.create({})
  }
  return settings
}
