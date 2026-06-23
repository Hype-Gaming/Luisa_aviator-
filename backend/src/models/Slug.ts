import mongoose, { Schema, Document } from 'mongoose'

// ============================================
// Interface do Tema (cores CSS)
// ============================================
export interface ITheme {
  colorPrimary: string
  colorPrimaryDark: string
  colorSecondary: string
  colorSecondaryDark: string
  bgDark: string
  bgDarker: string
  cardBg: string
  inputBg: string
  componentBg: string
  cardBorder: string
  textMain: string
  textMuted: string
  colorGold: string
  colorFire: string
  colorDanger: string
}

// ============================================
// Interface das Features (abas visíveis)
// ============================================
export interface IFeatures {
  esportes: boolean
  aulas: boolean
  ranking: boolean
  links: boolean
  gestao: boolean
}

// ============================================
// Interface dos Links
// ============================================
export interface ICustomLinks {
  telegramChannel: string
  telegramSupport: string
  whatsappSupport: string
  whatsappCommunity: string
  instagram: string
  site: string
  registerUrl: string
}

// ============================================
// Interface das Aulas
// ============================================
export interface ILesson {
  title: string
  description: string
  youtubeUrl: string
  category: string
  order: number
  active: boolean
}

export const DEFAULT_LINKS: ICustomLinks = {
  telegramChannel: '',
  telegramSupport: '',
  whatsappSupport: '',
  whatsappCommunity: '',
  instagram: '',
  site: '',
  registerUrl: ''
}

// ============================================
// Interface do Slug
// ============================================
export interface ISlug extends Document {
  slug: string
  brandSlug: string
  baseDomain: string
  name: string
  description: string
  keywords: string
  logo: string | null
  favicon: string | null
  bannerUrl: string | null
  theme: ITheme
  features: IFeatures
  customLinks: ICustomLinks
  enabledCategories: string[]
  lessons: ILesson[]
  active: boolean
  isDefault: boolean
  createdAt: Date
  updatedAt: Date
}

// ============================================
// Tema Padrão
// ============================================
export const DEFAULT_THEME: ITheme = {
  colorPrimary: '#2ab885',
  colorPrimaryDark: '#1e8a64',
  colorSecondary: '#2ab885',
  colorSecondaryDark: '#1e8a64',
  bgDark: '#000000',
  bgDarker: '#000000',
  cardBg: '#000000',
  inputBg: '#000000',
  componentBg: '#121214',
  cardBorder: '#181818',
  textMain: '#ffffff',
  textMuted: '#8f8f9c',
  colorGold: '#ffd700',
  colorFire: '#ffaa00',
  colorDanger: '#ff4757'
}

export const DEFAULT_FEATURES: IFeatures = {
  esportes: true,
  aulas: true,
  ranking: true,
  links: true,
  gestao: true
}

// ============================================
// Schema do Tema
// ============================================
const ThemeSchema = new Schema<ITheme>({
  colorPrimary:     { type: String, default: DEFAULT_THEME.colorPrimary },
  colorPrimaryDark: { type: String, default: DEFAULT_THEME.colorPrimaryDark },
  colorSecondary:     { type: String, default: DEFAULT_THEME.colorSecondary },
  colorSecondaryDark: { type: String, default: DEFAULT_THEME.colorSecondaryDark },
  bgDark:       { type: String, default: DEFAULT_THEME.bgDark },
  bgDarker:     { type: String, default: DEFAULT_THEME.bgDarker },
  cardBg:       { type: String, default: DEFAULT_THEME.cardBg },
  inputBg:      { type: String, default: DEFAULT_THEME.inputBg },
  componentBg:  { type: String, default: DEFAULT_THEME.componentBg },
  cardBorder:   { type: String, default: DEFAULT_THEME.cardBorder },
  textMain:     { type: String, default: DEFAULT_THEME.textMain },
  textMuted:    { type: String, default: DEFAULT_THEME.textMuted },
  colorGold:    { type: String, default: DEFAULT_THEME.colorGold },
  colorFire:    { type: String, default: DEFAULT_THEME.colorFire },
  colorDanger:  { type: String, default: DEFAULT_THEME.colorDanger },
}, { _id: false })

const LessonSchema = new Schema<ILesson>({
  title:       { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  youtubeUrl:  { type: String, required: true, trim: true },
  category:    { type: String, default: 'Geral', trim: true },
  order:       { type: Number, default: 0 },
  active:      { type: Boolean, default: true },
}, { _id: true })

const FeaturesSchema = new Schema<IFeatures>({
  esportes:    { type: Boolean, default: true },
  aulas:       { type: Boolean, default: true },
  ranking:     { type: Boolean, default: true },
  links:       { type: Boolean, default: true },
  gestao:      { type: Boolean, default: true },
}, { _id: false })

const CustomLinksSchema = new Schema<ICustomLinks>({
  telegramChannel:   { type: String, default: '' },
  telegramSupport:   { type: String, default: '' },
  whatsappSupport:   { type: String, default: '' },
  whatsappCommunity: { type: String, default: '' },
  instagram:         { type: String, default: '' },
  site:              { type: String, default: '' },
  registerUrl:       { type: String, default: '' },
}, { _id: false })

// ============================================
// Schema do Slug
// ============================================
const SlugSchema = new Schema<ISlug>({
  slug:        { type: String, required: true, unique: true, lowercase: true, trim: true },
  brandSlug:   { type: String, default: 'bateu', lowercase: true, trim: true },
  baseDomain:  { type: String, default: 'bet.br', lowercase: true, trim: true },
  name:        { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  keywords:    { type: String, default: '' },
  logo:        { type: String, default: null },
  favicon:     { type: String, default: null },
  bannerUrl:   { type: String, default: null },
  theme:       { type: ThemeSchema, default: () => ({ ...DEFAULT_THEME }) },
  features:    { type: FeaturesSchema, default: () => ({ ...DEFAULT_FEATURES }) },
  customLinks: { type: CustomLinksSchema, default: () => ({ ...DEFAULT_LINKS }) },
  enabledCategories: { type: [String], default: ['ROLETAS', 'CRASH', 'SLOT', 'DIVERSOS'] },
  lessons:     { type: [LessonSchema], default: [] },
  active:      { type: Boolean, default: true },
  isDefault:   { type: Boolean, default: false },
}, {
  timestamps: true,
})

// Índice para busca rápida por slug
SlugSchema.index({ slug: 1 })

export const SlugModel = mongoose.model<ISlug>('Slug', SlugSchema)
