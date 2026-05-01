// ============================================
// MyGuru AI — Email System
// File: api/emails.js
// ============================================

import { Resend } from 'resend'
import * as dotenv from 'dotenv'
dotenv.config()

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = 'MyGuru AI <hello@myguruai.in>'

// ============================================
// MAIN SEND FUNCTION
// ============================================
export async function sendEmail({ to, type, data }) {
  const templates = {
    welcome: welcomeEmail(data),
    trial_reminder3: reminder3Days(data),
    trial_reminder1: reminder1Day(data),
    trial_expired: trialExpiredEmail(data),
    payment_success: paymentSuccessEmail(data),
  }

  const template = templates[type]
  if (!template) return console.error('Unknown email type:', type)

  try {
    await resend.emails.send({
      from: FROM,
      to,
      subject: template.subject,
      html: template.html,
    })
    console.log(`✅ Email sent: ${type} → ${to}`)
  } catch (err) {
    console.error('Email error:', err)
  }
}

// ============================================
// EMAIL TEMPLATES
// ============================================

function welcomeEmail({ name, plan_id }) {
  return {
    subject: `வரவேற்கிறோம்! உங்கள் MyGuru AI trial start ஆகிவிட்டது 🎉`,
    html: `
<!DOCTYPE html>
<html><head><meta charset="UTF-8"/></head>
<body style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:20px;color:#0E1B35;">
  <div style="text-align:center;padding:20px 0;">
    <h2 style="color:#1B3A6B;">MyGuru AI</h2>
  </div>
  <div style="background:#EBF0FB;border-radius:12px;padding:20px;margin-bottom:20px;text-align:center;">
    <h1 style="color:#1B3A6B;font-size:20px;">வணக்கம் ${name || 'Student'}! 🙏</h1>
    <p style="color:#5C6B8A;">உங்கள் <strong>${plan_id?.toUpperCase()} plan</strong> trial start ஆகிவிட்டது</p>
  </div>
  <div style="background:#fff;border:1px solid #E2E4EF;border-radius:12px;padding:20px;margin-bottom:16px;">
    <p>✅ 14 நாட்கள் full access</p>
    <p>✅ Tamil, Hindi, English-ல் கேளுங்க</p>
    <p>✅ 24/7 AI doubt solving</p>
  </div>
  <div style="text-align:center;margin-bottom:20px;">
    <a href="https://myguruai.in/app"
       style="background:#1B3A6B;color:#fff;padding:14px 32px;border-radius:100px;text-decoration:none;font-weight:600;">
      படிக்க start பண்ணுங்க →
    </a>
  </div>
  <p style="text-align:center;font-size:12px;color:#9CA3AF;">myguruai.in · contact@myguruai.in</p>
</body></html>`,
  }
}

function reminder3Days({ name }) {
  return {
    subject: `உங்கள் MyGuru AI trial-ல் 3 நாட்கள் மட்டுமே உள்ளன ⏰`,
    html: `
<!DOCTYPE html>
<html><head><meta charset="UTF-8"/></head>
<body style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:20px;color:#0E1B35;">
  <h2 style="color:#1B3A6B;text-align:center;">MyGuru AI</h2>
  <div style="background:#FEF0E7;border-radius:12px;padding:20px;text-align:center;margin-bottom:16px;">
    <div style="font-size:32px;">⏰</div>
    <h3 style="color:#C2530A;">3 நாட்கள் மட்டுமே!</h3>
    <p style="color:#92400E;">உங்கள் free trial 3 நாட்களில் முடிகிறது</p>
  </div>
  <div style="text-align:center;margin:20px 0;">
    <a href="https://myguruai.in/pricing"
       style="background:#1B3A6B;color:#fff;padding:14px 28px;border-radius:100px;text-decoration:none;font-weight:600;">
      Subscribe பண்ணுங்க →
    </a>
  </div>
  <p style="text-align:center;font-size:12px;color:#9CA3AF;">myguruai.in · contact@myguruai.in</p>
</body></html>`,
  }
}

function reminder1Day({ name, plan_id }) {
  const prices = { tnpsc: 79, neet: 129, jee: 129, upsc: 199, bank: 79, ssc: 79 }
  const price = prices[plan_id] || 99
  return {
    subject: `நாளை உங்கள் trial முடிகிறது — இப்போதே subscribe பண்ணுங்க 🚨`,
    html: `
<!DOCTYPE html>
<html><head><meta charset="UTF-8"/></head>
<body style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:20px;color:#0E1B35;">
  <h2 style="color:#1B3A6B;text-align:center;">MyGuru AI</h2>
  <div style="background:#FCEBEB;border-radius:12px;padding:20px;text-align:center;margin-bottom:16px;">
    <div style="font-size:32px;">🚨</div>
    <h3 style="color:#A32D2D;">நாளை இரவு 12 மணிக்கு trial முடிகிறது!</h3>
  </div>
  <div style="background:#E1F5EE;border-radius:10px;padding:14px;text-align:center;margin-bottom:16px;">
    <div style="font-size:28px;font-weight:700;color:#1B3A6B;">₹${price}/month</div>
    <div style="font-size:13px;color:#5C6B8A;">= ₹${Math.round(price / 30)}/day மட்டுமே</div>
  </div>
  <div style="text-align:center;margin:20px 0;">
    <a href="https://myguruai.in/pricing"
       style="background:#E8600A;color:#fff;padding:14px 28px;border-radius:100px;text-decoration:none;font-weight:600;">
      இப்போதே Subscribe பண்ணுங்க →
    </a>
  </div>
  <p style="text-align:center;font-size:12px;color:#9CA3AF;">myguruai.in · contact@myguruai.in</p>
</body></html>`,
  }
}

function trialExpiredEmail({ name }) {
  return {
    subject: `உங்கள் trial முடிந்தது — subscribe பண்ணி தொடருங்க`,
    html: `
<!DOCTYPE html>
<html><head><meta charset="UTF-8"/></head>
<body style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:20px;color:#0E1B35;">
  <h2 style="color:#1B3A6B;text-align:center;">MyGuru AI</h2>
  <div style="background:#F7F8FC;border-radius:12px;padding:24px;text-align:center;margin-bottom:16px;">
    <h3>உங்கள் trial முடிந்தது</h3>
    <p style="color:#5C6B8A;">இப்போது 10 questions/day free-ஆ கிடைக்கும்.</p>
  </div>
  <div style="text-align:center;margin:20px 0;">
    <a href="https://myguruai.in/pricing"
       style="background:#1B3A6B;color:#fff;padding:14px 28px;border-radius:100px;text-decoration:none;font-weight:600;">
      Subscribe பண்ணி தொடருங்க →
    </a>
  </div>
  <p style="text-align:center;font-size:12px;color:#9CA3AF;">myguruai.in · contact@myguruai.in</p>
</body></html>`,
  }
}

function paymentSuccessEmail({ name }) {
  return {
    subject: `Payment confirmed! MyGuru AI Pro activated ✅`,
    html: `
<!DOCTYPE html>
<html><head><meta charset="UTF-8"/></head>
<body style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:20px;color:#0E1B35;">
  <h2 style="color:#1B3A6B;text-align:center;">MyGuru AI</h2>
  <div style="background:#E1F5EE;border-radius:12px;padding:24px;text-align:center;margin-bottom:16px;">
    <div style="font-size:40px;">✅</div>
    <h3 style="color:#085041;">Payment confirmed!</h3>
    <p style="color:#0F6E56;">உங்கள் subscription active ஆகிவிட்டது!</p>
  </div>
  <div style="text-align:center;margin:20px 0;">
    <a href="https://myguruai.in/app"
       style="background:#1B3A6B;color:#fff;padding:14px 28px;border-radius:100px;text-decoration:none;font-weight:600;">
      படிக்க start பண்ணுங்க →
    </a>
  </div>
  <p style="text-align:center;font-size:12px;color:#9CA3AF;">myguruai.in · contact@myguruai.in</p>
</body></html>`,
  }
}
