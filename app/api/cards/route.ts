import { NextRequest, NextResponse } from 'next/server'
import { Redis } from '@upstash/redis'

export type Card = {
  id: string
  url: string
  name: string
}

export type CardStatus = {
  inStock: boolean | null
  lastCheck: string | null
  lastNotified: string | null
}

function getRedis() {
  return new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  })
}

export async function GET() {
  const redis = getRedis()
  const cards = (await redis.get<Card[]>('cards')) ?? []

  const withStatus = await Promise.all(
    cards.map(async (card) => {
      const status = (await redis.get<CardStatus>(`status:${card.id}`)) ?? {
        inStock: null,
        lastCheck: null,
        lastNotified: null,
      }
      return { ...card, ...status }
    })
  )

  return NextResponse.json(withStatus)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { url, name } = body

  if (!url || !name) {
    return NextResponse.json({ error: 'url y name son requeridos' }, { status: 400 })
  }

  const redis = getRedis()
  const cards = (await redis.get<Card[]>('cards')) ?? []

  const newCard: Card = {
    id: crypto.randomUUID(),
    url: url.trim(),
    name: name.trim(),
  }

  await redis.set('cards', [...cards, newCard])

  return NextResponse.json(newCard, { status: 201 })
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: 'id es requerido' }, { status: 400 })
  }

  const redis = getRedis()
  const cards = (await redis.get<Card[]>('cards')) ?? []
  const filtered = cards.filter((c) => c.id !== id)

  await redis.set('cards', filtered)
  await redis.del(`status:${id}`)

  return NextResponse.json({ success: true })
}
