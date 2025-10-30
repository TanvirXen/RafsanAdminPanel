import { NextResponse, type NextRequest } from 'next/server'
import { connectMongo } from '@/lib/server/mongodb'
import { Show } from '@/lib/server/models/Show'
import { Event } from '@/lib/server/models/Event'
import { Registration } from '@/lib/server/models/Registration'
import { Payment } from '@/lib/server/models/Payment'
import { NotableEvent } from '@/lib/server/models/NotableEvent'
import { Shot } from '@/lib/server/models/Shot'
import { cacheGet, cacheSet } from '@/lib/server/cache'
import { authenticateRequest } from '@/lib/server/auth'

const CACHE_KEY = 'dashboard:summary'

export async function GET(request: NextRequest) {
  const auth = authenticateRequest(request)
  if (!auth) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  const cached = await cacheGet<any>(CACHE_KEY)
  if (cached) {
    return NextResponse.json({ summary: cached, cache: true })
  }

  await connectMongo()

  const [showCount, eventCount, registrationCount, paymentAgg, notableCount, shotsCount] = await Promise.all([
    Show.countDocuments(),
    Event.countDocuments(),
    Registration.countDocuments(),
    Payment.aggregate([{ $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }]),
    NotableEvent.countDocuments(),
    Shot.countDocuments(),
  ])

  const totalRevenue = paymentAgg[0]?.total ?? 0
  const paymentCount = paymentAgg[0]?.count ?? 0

  const summary = {
    shows: showCount,
    events: eventCount,
    registrations: registrationCount,
    revenue: totalRevenue,
    payments: paymentCount,
    notableEvents: notableCount,
    shots: shotsCount,
  }

  await cacheSet(CACHE_KEY, summary, 60)

  return NextResponse.json({ summary })
}
