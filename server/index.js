import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import jwt from 'jsonwebtoken'
import { createRequire } from 'module'
import { franc } from 'franc'
import { translate } from '@vitalets/google-translate-api'

import connectDB from './db.js'
import User from './models/User.js'
import History from './models/History.js'
import { protect, restrictTo } from './middleware/auth.js'

const require = createRequire(import.meta.url)
const langs = require('langs')

const app = express()
const PORT = process.env.PORT || 5000

connectDB()

const allowedOriginPatterns = [
  /^http:\/\/localhost:\d+$/,
  /^http:\/\/127\.0\.0\.1:\d+$/,
]

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true)

      const isAllowed = allowedOriginPatterns.some((pattern) => pattern.test(origin))
      if (isAllowed) return callback(null, true)

      return callback(new Error(`CORS blocked for origin: ${origin}`))
    },
    credentials: true,
  }),
)

app.use(express.json())

app.use('/api', (req, res, next) => {
  console.log(`${req.method} ${req.originalUrl}`)
  next()
})

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' })
})

const generateToken = (id) => {
  return jwt.sign(
    { id },
    process.env.JWT_SECRET || 'dev-secret-change-in-production',
    { expiresIn: '7d' },
  )
}

const signupHandler = async (req, res) => {
  try {
    const { name, email, password } = req.body

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email and password are required',
      })
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters',
      })
    }

    const exists = await User.findOne({ email })
    if (exists) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered',
      })
    }

    const user = await User.create({ name, email, password })
    const token = generateToken(user._id)

    return res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    })
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message })
  }
}

app.post('/api/auth/signup', signupHandler)
app.post('/api/signup', signupHandler)

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required',
      })
    }

    const user = await User.findOne({ email }).select('+password')
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      })
    }

    const match = await user.comparePassword(password)
    if (!match) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      })
    }

    const token = generateToken(user._id)

    return res.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    })
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message })
  }
})

app.get('/api/auth/me', protect, (req, res) => {
  res.json({ success: true, user: req.user })
})

app.get('/api/auth/admin', protect, restrictTo('admin'), (req, res) => {
  res.json({ success: true, message: 'Welcome, Admin!', user: req.user })
})

app.post('/api/detect-language', protect, async (req, res) => {
  try {
    const { text } = req.body

    if (!text) {
      return res.status(400).json({ success: false, message: 'Text is required' })
    }

    const langCode = franc(text)
    let language = 'unknown'
    let confidence = null

    if (langCode === 'und') {
      language = 'unknown'
      confidence = 0
    } else {
      const langData = langs.where('3', langCode)
      language = langData ? langData.name : langCode
      confidence = 1
    }

    return res.json({ success: true, language, confidence })
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Language detection failed' })
  }
})

const targetLanguageMap = {
  english: 'en',
  hindi: 'hi',
  marathi: 'mr',
  gujarati: 'gu',
  tamil: 'ta',
  telugu: 'te',
  kannada: 'kn',
  malayalam: 'ml',
  bengali: 'bn',
  punjabi: 'pa',
  urdu: 'ur',
  french: 'fr',
  spanish: 'es',
  german: 'de',
  chinese: 'zh-CN',
  japanese: 'ja',
  arabic: 'ar',
}

app.post('/api/translate', protect, async (req, res) => {
  try {
    const { text, targetLanguage } = req.body

    if (!text || !targetLanguage) {
      return res.status(400).json({
        success: false,
        message: 'Text and targetLanguage are required',
      })
    }

    const normalizedTarget = String(targetLanguage).trim().toLowerCase()
    const targetCode = targetLanguageMap[normalizedTarget] || normalizedTarget

    const result = await translate(text, { to: targetCode })

    return res.json({
      success: true,
      translation: result.text,
      targetLanguage: targetCode,
    })
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Translation failed' })
  }
})

app.post('/api/history', protect, async (req, res) => {
  try {
    const {
      feature,
      inputText,
      detectedLanguage = '',
      targetLanguage = '',
      translatedText = '',
    } = req.body

    if (!feature || !inputText) {
      return res.status(400).json({
        success: false,
        message: 'feature and inputText are required',
      })
    }

    const item = await History.create({
      user: req.user._id,
      feature,
      inputText,
      detectedLanguage,
      targetLanguage,
      translatedText,
    })

    return res.status(201).json({ success: true, history: item })
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to save history' })
  }
})

app.get('/api/history', protect, async (req, res) => {
  try {
    const history = await History.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(200)

    return res.json({
      success: true,
      history,
      profile: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
      },
    })
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to load history' })
  }
})

app.use('/api', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`,
  })
})

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`)
})
