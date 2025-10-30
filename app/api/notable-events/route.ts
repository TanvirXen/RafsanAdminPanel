import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { connectMongo } from '@/lib/server/mongodb'
import { NotableEvent } from '@/lib/server/models/NotableEvent'
import { authenticateRequest } from '@/lib/server/auth'
import { cacheGet, cacheSet, cacheDel } from '@/lib/server/cache'

const eventSchema = z.object({
  title: z.string().min(1),
  date: z.string().min(1),
  imageLink: z.string().url(),
  description: z.string().min(1),
  featured: z.boolean().default(false),
})

const CACHE_KEY = 'notable-events:list'

export async function GET(request: NextRequest) {
  const auth = authenticateRequest(request)
  if (!auth) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  const cached = await cacheGet<any[]>(CACHE_KEY)
  if (cached) {
    return NextResponse.json({ events: cached, cache: true })
  }

  await connectMongo()
  const events = await NotableEvent.find().sort({ date: -1 }).lean()

  const payload = events.map((event) => ({
    _id: event._id.toString(),
    title: event.title,
    date: event.date.toISOString(),
    imageLink: event.imageLink,
    description: event.description,
    featured: event.featured,
    createdAt: event.createdAt,
    updatedAt: event.updatedAt,
  }))

  await cacheSet(CACHE_KEY, payload, 120)

  return NextResponse.json({ events: payload })
}

export async function POST(request: NextRequest) {
  const auth = authenticateRequest(request)
  if (!auth) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const parsed = eventSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ message: 'Invalid payload', issues: parsed.error.flatten() }, { status: 400 })
  }

  await connectMongo()
  const event = await NotableEvent.create({
    title: parsed.data.title,
    date: new Date(parsed.data.date),
    imageLink: parsed.data.imageLink,
    description: parsed.data.description,
    featured: parsed.data.featured,
  })

  await cacheDel(CACHE_KEY)

  return NextResponse.json(
    {
      event: {
        _id: event._id.toString(),
        title: event.title,
        date: event.date.toISOString(),
        imageLink: event.imageLink,
        description: event.description,
        featured: event.featured,
      },
    },
    { status: 201 },
  )
}
