import { NextRequest, NextResponse } from 'next/server'
import { Redis } from '@upstash/redis'
import { Resend } from 'resend'
import type { Card, CardStatus } from '../cards/route'

function isInStock(html: string): boolean {
  return !html.includes('Sin stock')
}

async function sendNotification(resend: Resend, card: Card) {
  await resend.emails.send({
    from: process.env.EMAIL_FROM!,
    to: process.env.EMAIL_TO!,
    subject: `[STOCK] ${card.name} ya esta disponible`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #22c55e;">Carta disponible en stock</h2>
        <p>La carta <strong>${card.name}</strong> ahora tiene stock disponible.</p>
        <a href="${card.url}" style="
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
  const cards = (await redis.get<Card[]>('cards')) ?? []

  if (cards.length === 0) {
    return NextResponse.json({ checked: 0, results: [] })
  }

  const results = []

  for (const card of cards) {
    try {
      const res = await fetch(card.url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; StockBot/1.0)' },
        next: { revalidate: 0 },
      })
      const html = await res.text()
      const available = isInStock(html)
      const now = new Date().toISOString()

      const prevStatus = (await redis.get<CardStatus>(`status:${card.id}`)) ?? {
        inStock: null,
        lastCheck: null,
        lastNotified: null,
      }

      const newStatus: CardStatus = {
        inStock: available,
        lastCheck: now,
        lastNotified: prevStatus.lastNotified,
      }

      if (available && !prevStatus.lastNotified) {
        try {
          await sendNotification(resend, card)
          newStatus.lastNotified = now
          console.log(`Notification sent for ${card.name} at ${now}`)
        } catch (err) {
          console.error(`Error sending notification for ${card.name}:`, err)
        }
      } else if (!available && prevStatus.lastNotified) {
        newStatus.lastNotified = null
      }

      await redis.set(`status:${card.id}`, newStatus)
      results.push({ id: card.id, name: card.name, available })
    } catch (err) {
      console.error(`Error checking ${card.name}:`, err)
      results.push({ id: card.id, name: card.name, error: 'Failed to fetch' })
    }
  }

  return NextResponse.json({ checked: results.length, results })
}
