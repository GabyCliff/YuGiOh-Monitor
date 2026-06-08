import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url')
  if (!url) {
    return NextResponse.json({ error: 'missing ?url=' }, { status: 400 })
  }

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; StockBot/1.0)' },
      cache: 'no-store',
    })
    const html = await res.text()
    const normalized = html.toLowerCase()

    const og = normalized.match(
      /<meta[^>]+property=["']product:availability["'][^>]+content=["']([^"']+)["']/i,
    )
    const jsonLd = normalized.match(/"availability"\s*:\s*"([^"]+)"/i)

    const snippetMatch = normalized.match(/availability[\s\S]{0,200}/g)

    return NextResponse.json({
      url,
      status: res.status,
      htmlLength: html.length,
      ogAvailability: og?.[1] ?? null,
      jsonLdAvailability: jsonLd?.[1] ?? null,
      hasCantidad: html.includes('Cantidad'),
      hasAgregarAlCarrito: html.includes('Agregar al carrito'),
      hasSinStock: html.includes('Sin stock'),
      availabilitySnippets: snippetMatch?.slice(0, 5) ?? [],
    })
  } catch (err) {
    return NextResponse.json(
      { error: 'fetch failed', detail: String(err) },
      { status: 500 },
    )
  }
}
