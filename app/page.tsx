'use client'

import { useState, useEffect, useCallback } from 'react'

type CardWithStatus = {
  id: string
  url: string
  name: string
  inStock: boolean | null
  lastCheck: string | null
  lastNotified: string | null
}

export default function Home() {
  const [cards, setCards] = useState<CardWithStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [checking, setChecking] = useState(false)
  const [newUrl, setNewUrl] = useState('')
  const [newName, setNewName] = useState('')
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchCards = useCallback(async () => {
    try {
      const res = await fetch('/api/cards')
      const data = await res.json()
      setCards(data)
    } catch {
      setError('No se pudo conectar a Redis')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCards()
  }, [fetchCards])

  async function addCard(e: React.FormEvent) {
    e.preventDefault()
    if (!newUrl.trim() || !newName.trim()) return
    setAdding(true)
    setError(null)
    try {
      const res = await fetch('/api/cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: newUrl.trim(), name: newName.trim() }),
      })
      if (!res.ok) throw new Error()
      setNewUrl('')
      setNewName('')
      await fetchCards()
    } catch {
      setError('Error al agregar la carta')
    } finally {
      setAdding(false)
    }
  }

  async function removeCard(id: string) {
    setError(null)
    try {
      await fetch(`/api/cards?id=${id}`, { method: 'DELETE' })
      await fetchCards()
    } catch {
      setError('Error al eliminar la carta')
    }
  }

  async function checkNow() {
    setChecking(true)
    setError(null)
    try {
      await fetch('/api/check-stock-manual')
      await fetchCards()
    } catch {
      setError('Error al chequear el stock')
    } finally {
      setChecking(false)
    }
  }

  return (
    <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2rem' }}>
      <div style={{ maxWidth: 680, width: '100%' }}>

        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.5rem', color: '#facc15', marginBottom: '0.25rem' }}>
            YuGiOh Stock Monitor
          </h1>
          <p style={{ fontSize: '0.85rem', color: '#888' }}>
            Chequeando stock en tiendas. El cron corre 1 vez por dia.
          </p>
        </div>

        <form onSubmit={addCard} style={{ background: '#1a1a1a', borderRadius: '1rem', padding: '1.5rem', marginBottom: '1.5rem', border: '1px solid #2a2a2a' }}>
          <p style={{ fontSize: '0.9rem', color: '#aaa', marginBottom: '1rem', fontWeight: 600 }}>Agregar carta</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <input
              type="text"
              placeholder="Nombre de la carta"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              style={inputStyle}
            />
            <input
              type="url"
              placeholder="URL del producto"
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              style={inputStyle}
            />
            <button type="submit" disabled={adding} style={btnStyle('#facc15', '#000')}>
              {adding ? 'Agregando...' : '+ Agregar'}
            </button>
          </div>
        </form>

        {error && (
          <p style={{ color: '#ef4444', fontSize: '0.85rem', marginBottom: '1rem', textAlign: 'center' }}>{error}</p>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <p style={{ color: '#888', fontSize: '0.85rem' }}>{cards.length} carta{cards.length !== 1 ? 's' : ''} monitoreada{cards.length !== 1 ? 's' : ''}</p>
          <button onClick={checkNow} disabled={checking || cards.length === 0} style={btnStyle('#3b82f6', '#fff')}>
            {checking ? 'Chequeando...' : 'Chequear ahora'}
          </button>
        </div>

        {loading ? (
          <p style={{ color: '#888', textAlign: 'center', padding: '2rem' }}>Cargando...</p>
        ) : cards.length === 0 ? (
          <p style={{ color: '#555', textAlign: 'center', padding: '2rem' }}>No hay cartas agregadas aun.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {cards.map((card) => {
              const color = card.inStock === null ? '#888' : card.inStock ? '#22c55e' : '#ef4444'
              const statusText = card.inStock === null ? 'Sin chequear' : card.inStock ? 'EN STOCK' : 'Sin stock'
              return (
                <div key={card.id} style={{ background: '#1a1a1a', border: `1px solid ${color}`, borderRadius: '0.75rem', padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 600, color: '#e0e0e0', marginBottom: '0.25rem', fontSize: '0.95rem' }}>{card.name}</p>
                    <a href={card.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.7rem', color: '#60a5fa', wordBreak: 'break-all', display: 'block', marginBottom: '0.35rem' }}>{card.url}</a>
                    {card.lastCheck && (
                      <p style={{ fontSize: '0.7rem', color: '#666' }}>Ultimo chequeo: {new Date(card.lastCheck).toLocaleString('es-AR')}</p>
                    )}
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <span style={{ display: 'inline-block', background: color, color: '#000', fontWeight: 700, fontSize: '0.7rem', borderRadius: '0.4rem', padding: '0.2rem 0.5rem', marginBottom: '0.5rem' }}>{statusText}</span>
                    <br />
                    <button onClick={() => removeCard(card.id)} style={{ background: 'transparent', border: '1px solid #444', color: '#888', borderRadius: '0.4rem', padding: '0.25rem 0.6rem', fontSize: '0.75rem', cursor: 'pointer' }}>
                      Eliminar
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}

const inputStyle: React.CSSProperties = {
  background: '#0f0f0f',
  border: '1px solid #333',
  borderRadius: '0.5rem',
  padding: '0.6rem 0.75rem',
  color: '#e0e0e0',
  fontSize: '0.9rem',
  width: '100%',
  boxSizing: 'border-box',
}

function btnStyle(bg: string, color: string): React.CSSProperties {
  return {
    background: bg,
    color,
    border: 'none',
    borderRadius: '0.5rem',
    padding: '0.6rem 1.2rem',
    fontSize: '0.9rem',
    fontWeight: 600,
    cursor: 'pointer',
  }
}
