import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { connectMongo } from '@/lib/server/mongodb'
import { TimelineItem } from '@/lib/server/models/TimelineItem'
import { authenticateRequest } from '@/lib/server/auth'
import { cacheGet, cacheSet, cacheDel } from '@/lib/server/cache'

const itemSchema = z.object({
  date: z.string().min(1),
  imageLink: z.string().url(),
  description: z.string().min(1),
  cardUrl: z.string().optional(),
})

const CACHE_KEY = 'timeline:list'

export async function GET(request: NextRequest) {
  const auth = authenticateRequest(request)
  if (!auth) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  const cached = await cacheGet<any[]>(CACHE_KEY)
  if (cached) {
    return NextResponse.json({ timeline: cached, cache: true })
  }

  await connectMongo()
  const items = await TimelineItem.find().sort({ date: -1 }).lean()

  const payload = items.map((item) => ({
    _id: item._id.toString(),
    date: item.date.toISOString(),
    imageLink: item.imageLink,
    description: item.description,
    cardUrl: item.cardUrl,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  }))

  await cacheSet(CACHE_KEY, payload, 120)

  return NextResponse.json({ timeline: payload })
}

export async function POST(request: NextRequest) {
  const auth = authenticateRequest(request)
  if (!auth) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const parsed = itemSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ message: 'Invalid payload', issues: parsed.error.flatten() }, { status: 400 })
  }

  await connectMongo()
  const item = await TimelineItem.create({
    date: new Date(parsed.data.date),
    imageLink: parsed.data.imageLink,
    description: parsed.data.description,
    cardUrl: parsed.data.cardUrl,
  })

  await cacheDel(CACHE_KEY)

  return NextResponse.json(
    {
      item: {
        _id: item._id.toString(),
        date: item.date.toISOString(),
        imageLink: item.imageLink,
        description: item.description,
        cardUrl: item.cardUrl,
      },
    },
    { status: 201 },
  )
}
