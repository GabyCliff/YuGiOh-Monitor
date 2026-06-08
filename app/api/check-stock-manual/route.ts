import { NextResponse } from 'next/server'
import { runStockCheck } from '@/lib/checkStock'

export async function GET() {
  const result = await runStockCheck()
  return NextResponse.json(result)
}
