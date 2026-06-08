import { Redis } from '@upstash/redis'

export const dynamic = 'force-dynamic'

const CARD_URL = 'https://harucardshop.mitiendanube.com/productos/kewl-tune-rotary-blzd-ultra-rare/'

async function getStatus() {
  try {
    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
    const lastCheck = await redis.get<string>('last_check')
    const inStock = await redis.get<string>('in_stock')
    const lastNotified = await redis.get<string>('last_notified')
    return { lastCheck, inStock, lastNotified, error: null }
  } catch {
    return { lastCheck: null, inStock: null, lastNotified: null, error: 'No se pudo conectar a Redis' }
  }
}

export default async function Home() {
  const { lastCheck, inStock, lastNotified, error } = await getStatus()

  const isInStock = inStock === 'true'
  const statusColor = isInStock ? '#22c55e' : '#ef4444'
  const statusText = isInStock ? 'EN STOCK' : 'Sin stock'

  return (
    <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div style={{ maxWidth: 600, width: '100%', textAlign: 'center' }}>
        <h1 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', color: '#facc15' }}>
          YuGiOh Stock Monitor
        </h1>
        <p style={{ fontSize: '0.85rem', color: '#888', marginBottom: '2rem' }}>
          Chequeando cada 10 minutos
        </p>

        <div style={{
          background: '#1a1a1a',
          border: `2px solid ${statusColor}`,
          borderRadius: '1rem',
          padding: '2rem',
          marginBottom: '1.5rem',
        }}>
          <p style={{ fontSize: '0.9rem', color: '#aaa', marginBottom: '0.75rem' }}>
            Kewl Tune Rotary BLZD Ultra Rare
          </p>
          <a href={CARD_URL} target="_blank" rel="noopener noreferrer"
            style={{ fontSize: '0.75rem', color: '#60a5fa', wordBreak: 'break-all' }}>
            {CARD_URL}
          </a>
          <div style={{ marginTop: '1.5rem' }}>
            <span style={{
              background: statusColor,
              color: '#fff',
              borderRadius: '9999px',
              padding: '0.4rem 1.2rem',
              fontSize: '1.1rem',
              fontWeight: 700,
              letterSpacing: '0.05em',
            }}>
              {statusText}
            </span>
          </div>
        </div>

        {error && (
          <div style={{ background: '#2a1a1a', border: '1px solid #7f1d1d', borderRadius: '0.5rem', padding: '1rem', marginBottom: '1rem', color: '#fca5a5', fontSize: '0.85rem' }}>
            {error}
          </div>
        )}

        <div style={{ fontSize: '0.8rem', color: '#555', lineHeight: 1.8 }}>
          {lastCheck && <p>Ultimo chequeo: {new Date(lastCheck).toLocaleString('es-AR')}</p>}
          {lastNotified && <p>Ultima notificacion enviada: {new Date(lastNotified).toLocaleString('es-AR')}</p>}
        </div>
      </div>
    </main>
  )
}
