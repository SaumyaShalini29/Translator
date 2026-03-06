import express from 'express'
import jwt from 'jsonwebtoken'
import User from '../models/User.js'
import { protect, restrictTo } from '../middleware/auth.js'

const router = express.Router()

// GET /api/auth/signup - helpful message (browser opens this with GET)
router.get('/signup', (req, res) => {
  res.status(405).json({
    success: false,
    message: 'Use POST to sign up. Open http://localhost:5173/signup and submit the form.',
    hint: 'POST /api/auth/signup with body: { name, email, password }',
  })
})

// GET /api/auth/login - helpful message
router.get('/login', (req, res) => {
  res.status(405).json({
    success: false,
    message: 'Use POST to login. Open http://localhost:5173/login and submit the form.',
    hint: 'POST /api/auth/login with body: { email, password }',
  })
})

const generateToken = (id) => {
  return jwt.sign(
    { id },
    process.env.JWT_SECRET || 'dev-secret-change-in-production',
    { expiresIn: '7d' }
  )
}

// POST /api/auth/signup
router.post('/signup', async (req, res) => {
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

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// POST /api/auth/login
router.post('/login', async (req, res) => {
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

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// GET /api/auth/me - get current user (protected)
router.get('/me', protect, (req, res) => {
  res.json({
    success: true,
    user: req.user,
  })
})

// GET /api/auth/admin - admin only (protected + role)
router.get('/admin', protect, restrictTo('admin'), (req, res) => {
  res.json({
    success: true,
    message: 'Welcome, Admin!',
    user: req.user,
  })
})

export default router
