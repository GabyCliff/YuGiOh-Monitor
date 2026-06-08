import { NextRequest, NextResponse } from 'next/server'
import { Redis } from '@upstash/redis'
import { Resend } from 'resend'

const CARD_URL = 'https://harucardshop.mitiendanube.com/productos/kewl-tune-rotary-blzd-ultra-rare/'
const CARD_NAME = 'Kewl Tune Rotary BLZD Ultra Rare'

function isInStock(html: string): boolean {
  return !html.includes('Sin stock')
}

async function sendNotification(resend: Resend) {
  await resend.emails.send({
    from: process.env.EMAIL_FROM!,
    to: process.env.EMAIL_TO!,
    subject: `[STOCK] ${CARD_NAME} ya esta disponible`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #22c55e;">Carta disponible en stock</h2>
        <p>La carta <strong>${CARD_NAME}</strong> ahora tiene stock disponible.</p>
        <a href="${CARD_URL}" style="
          display: inline-block;
          background: #22c55e;
          color: white;
          padding: 12px 24px;
          border-radius: 8px;
          text-decoration: none;
          font-weight: bold;
          margin-top: 16px;
        ">Ver carta en la tienda</a>
        <p style="color: #888; font-size: 12px; margin-top: 24px;">
          Este mensaje fue enviado automaticamente por YuGiOh Stock Monitor.
        </p>
      </div>
    `,
  })
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  })

  const resend = new Resend(process.env.RESEND_API_KEY!)

  let html: string
  try {
    const res = await fetch(CARD_URL, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; StockBot/1.0)' },
      next: { revalidate: 0 },
    })
    html = await res.text()
  } catch (err) {
    console.error('Error fetching page:', err)
    return NextResponse.json({ error: 'Failed to fetch page' }, { status: 500 })
  }

  const available = isInStock(html)
  const now = new Date().toISOString()

  await redis.set('last_check', now)
  await redis.set('in_stock', String(available))

  if (available) {
    const alreadyNotified = await redis.get<string>('last_notified')

    if (!alreadyNotified) {
      try {
        await sendNotification(resend)
        await redis.set('last_notified', now)
        console.log('Notification sent at', now)
      } catch (err) {
        console.error('Error sending email:', err)
        return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
      }
    }
  } else {
    await redis.del('last_notified')
  }

  return NextResponse.json({
    available,
    lastCheck: now,
    notified: available ? !!await redis.get('last_notified') : false,
  })
}
