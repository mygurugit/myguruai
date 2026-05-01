// ============================================
// MyGuru AI — Main API Server
// File: api/server.js
// ============================================

import express from 'express'
import cors from 'cors'
import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'
import { sendEmail } from './emails.js'
import crypto from 'crypto'
import * as dotenv from 'dotenv'
dotenv.config()

const app = express()
app.use(cors())
app.use(express.json())

// ── CLIENTS ──
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

const claude = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

// ── QUEUE — respects Claude rate limits ──
const requestQueue = []
let isProcessing = false

async function processQueue() {
  if (isProcessing || requestQueue.length === 0) return
  isProcessing = true
  const { task, resolve, reject } = requestQueue.shift()
  try {
    const result = await task()
    resolve(result)
  } catch (err) {
    reject(err)
  }
  await new Promise((r) => setTimeout(r, 1200))
  isProcessing = false
  processQueue()
}

function queueClaudeRequest(task) {
  return new Promise((resolve, reject) => {
    requestQueue.push({ task, resolve, reject })
    processQueue()
  })
}

// ============================================
// ROUTE 1 — SIGNUP + START TRIAL
// ============================================
app.post('/api/signup', async (req, res) => {
  const { email, name, plan_id, preferred_lang } = req.body

  if (!email || !plan_id) {
    return res.status(400).json({ error: 'Email and plan required' })
  }

  try {
    // Normalize Gmail
    let normalized = email.toLowerCase()
    const domain = normalized.split('@')[1]
    if (domain === 'gmail.com') {
      const user = normalized.split('@')[0].split('+')[0].replace(/\./g, '')
      normalized = `${user}@gmail.com`
    }

    // Check trial already used
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email_normalized', normalized)
      .single()

    if (existingUser) {
      return res.status(400).json({
        error: 'TRIAL_USED',
        message: 'You already have an account. Please login.',
      })
    }

    // Send OTP via Supabase
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${process.env.APP_URL}/dashboard`,
      },
    })

    if (otpError) throw otpError

    return res.json({
      success: true,
      message: 'OTP sent to your email',
      email,
    })
  } catch (err) {
    console.error('Signup error:', err)
    return res.status(500).json({ error: err.message })
  }
})

// ============================================
// ROUTE 2 — ASK A QUESTION
// ============================================
app.post('/api/ask', async (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return res.status(401).json({ error: 'No token' })

  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token)
    if (authError || !user) return res.status(401).json({ error: 'Invalid token' })

    const userId = user.id
    const { question, exam_type, language } = req.body
    if (!question) return res.status(400).json({ error: 'Question required' })

    // Get plan limits
    const { data: access } = await supabase.rpc('get_user_access', { p_user_id: userId })

    const userAccess = access[0]
    const { daily_limit, max_tokens, show_upgrade } = userAccess

    // Count today's questions
    const today = new Date().toISOString().split('T')[0]
    const { count: todayCount } = await supabase
      .from('usage_logs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('date', today)

    // Check limit
    if (todayCount >= daily_limit) {
      return res.status(429).json({
        error: 'LIMIT_REACHED',
        message: `Daily limit of ${daily_limit} questions reached.`,
        show_upgrade: true,
        resets_at: 'midnight tonight',
      })
    }

    // Build system prompt
    const systemPrompt = buildSystemPrompt(exam_type, language)

    // Call Claude
    const claudeResponse = await queueClaudeRequest(async () => {
      return await claude.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: max_tokens,
        system: systemPrompt,
        messages: [{ role: 'user', content: question }],
      })
    })

    const answer = claudeResponse.content[0].text
    const tokensUsed = claudeResponse.usage.input_tokens + claudeResponse.usage.output_tokens

    // Log usage
    await supabase.from('usage_logs').insert({
      user_id: userId,
      question,
      answer,
      exam_type,
      language,
      tokens_used: tokensUsed,
      date: today,
    })

    const remaining = daily_limit - (todayCount + 1)

    return res.json({
      success: true,
      answer,
      questions_remaining: remaining,
      daily_limit,
      show_upgrade: remaining <= 2 || show_upgrade,
    })
  } catch (err) {
    console.error('Ask error:', err)
    return res.status(500).json({ error: err.message })
  }
})

// ============================================
// ROUTE 3 — GET STATUS
// ============================================
app.get('/api/status', async (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return res.status(401).json({ error: 'No token' })

  const {
    data: { user },
  } = await supabase.auth.getUser(token)
  if (!user) return res.status(401).json({ error: 'Invalid token' })

  const { data: access } = await supabase.rpc('get_user_access', { p_user_id: user.id })

  const today = new Date().toISOString().split('T')[0]
  const { count: todayCount } = await supabase
    .from('usage_logs')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('date', today)

  const userAccess = access[0]

  return res.json({
    access_level: userAccess.access_level,
    plan_id: userAccess.plan_id,
    daily_limit: userAccess.daily_limit,
    questions_used_today: todayCount,
    questions_remaining: Math.max(0, userAccess.daily_limit - todayCount),
    days_left: userAccess.days_left,
    show_upgrade: userAccess.show_upgrade,
  })
})

// ============================================
// ROUTE 4 — RAZORPAY WEBHOOK
// ============================================
app.post('/api/webhook/razorpay', async (req, res) => {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET
  const signature = req.headers['x-razorpay-signature']
  const body = JSON.stringify(req.body)

  const expectedSig = crypto.createHmac('sha256', webhookSecret).update(body).digest('hex')

  if (signature !== expectedSig) {
    return res.status(400).json({ error: 'Invalid signature' })
  }

  const { event, payload } = req.body
  const userId = payload.subscription?.entity?.notes?.user_id

  if (!userId) return res.status(400).json({ error: 'No user_id' })

  try {
    if (event === 'subscription.activated') {
      const endDate = new Date()
      endDate.setMonth(endDate.getMonth() + 1)

      await supabase
        .from('subscriptions')
        .update({
          status: 'active',
          paid_start: new Date().toISOString(),
          end_date: endDate.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
    }

    if (event === 'subscription.halted' || event === 'subscription.cancelled') {
      await supabase
        .from('subscriptions')
        .update({ status: 'expired', updated_at: new Date().toISOString() })
        .eq('user_id', userId)
    }

    return res.json({ received: true })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
})

// ============================================
// HELPER — Build Claude prompt
// ============================================
function buildSystemPrompt(examType, language) {
  const lang = language || 'Tamil'
  const exam = examType || 'General'

  const langInstruction =
    {
      Tamil: 'Always respond in Tamil. Use simple clear Tamil language.',
      Hindi: 'Always respond in Hindi. Use simple clear Hindi language.',
      English: 'Always respond in English. Use simple clear English.',
    }[lang] || 'Detect the language and respond in the same language.'

  const examContext =
    {
      TNPSC:
        'Focus on TNPSC Group 1/2/4: Tamil GK, Indian history, Tamil Nadu history, polity, aptitude, current affairs.',
      NEET: 'Focus on NEET UG: Biology (Botany & Zoology), Physics, Chemistry. Reference NCERT chapters.',
      JEE: 'Focus on JEE Main & Advanced: Mathematics, Physics, Chemistry. Show step-by-step solutions.',
      UPSC: 'Focus on UPSC CSE: General Studies 1-4, Current Affairs, Essay, Polity, Economy, History.',
      'Bank PO':
        'Focus on Bank PO/SBI: Reasoning, Quantitative Aptitude, English, General Awareness.',
      SSC: 'Focus on SSC CGL/CHSL: Reasoning, Maths, English, GK.',
    }[exam] || 'Help with general exam preparation.'

  return `You are MyGuru AI — India's most helpful exam preparation assistant.

${langInstruction}

${examContext}

Rules:
- Give clear exam-focused explanations
- Use examples and mnemonics when helpful
- For MCQs explain why each option is right or wrong
- Keep answers concise but complete
- End with one short encouraging line
- Never make up facts — if unsure say so`
}

// ── ROUTE: PUBLIC CONFIG ──
app.get('/api/config', (req, res) => {
  res.json({
    supabase_url: process.env.SUPABASE_URL,
    supabase_anon_key: process.env.SUPABASE_ANON_KEY,
  })
})

// ============================================
// START SERVER
// ============================================
const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`✅ MyGuru AI API running on port ${PORT}`)
  console.log(`🌐 Local: http://localhost:${PORT}`)
})

export default app
