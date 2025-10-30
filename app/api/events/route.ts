import { NextResponse, type NextRequest } from 'next/server'
import { Types } from 'mongoose'
import { z } from 'zod'
import { connectMongo } from '@/lib/server/mongodb'
import { Event } from '@/lib/server/models/Event'
import { Brand } from '@/lib/server/models/Brand'
import { authenticateRequest } from '@/lib/server/auth'
import { cacheGet, cacheSet, cacheDel } from '@/lib/server/cache'

const customFieldSchema = z.object({
  name: z.string().min(1),
  label: z.string().min(1),
  type: z.enum(['text', 'email', 'phone', 'number', 'select', 'textarea']).default('text'),
  required: z.boolean().default(false),
  options: z.array(z.string()).optional(),
})

const eventSchema = z.object({
  title: z.string().min(1),
  date: z.array(z.string().min(1)).min(1),
  venue: z.string().min(1),
  type: z.enum(['Free', 'Free_with_approval', 'Paid', 'Paid_with_approval']).default('Free'),
  description: z.string().optional(),
  imageLinkBg: z.string().url().optional().or(z.literal('')),
  imageLinkOverlay: z.string().url().optional().or(z.literal('')),
  brands: z.array(z.string()).optional(),
  customFields: z.array(customFieldSchema).optional(),
  category: z.string().default('event'),
})

const CACHE_KEY = 'events:list'

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
  const events = await Event.find().sort({ createdAt: -1 }).lean()

  const brandIds = Array.from(
    new Set(events.flatMap((evt) => evt.brands?.map((id) => id.toString()) ?? [])),
  ).filter(Boolean)

  const brandMap = brandIds.length
    ? await Brand.find({ _id: { $in: brandIds } })
        .lean()
        .then((docs) => Object.fromEntries(docs.map((doc) => [doc._id.toString(), doc.brandName])))
    : {}

  const payload = events.map((evt) => ({
    _id: evt._id.toString(),
    title: evt.title,
    date: evt.date.map((d) => d.toISOString()),
    venue: evt.venue,
    type: evt.type,
    description: evt.description,
    imageLinkBg: evt.imageLinkBg,
    imageLinkOverlay: evt.imageLinkOverlay,
    brands: (evt.brands ?? []).map((id) => brandMap[id.toString()] ?? id.toString()),
    brandIds: (evt.brands ?? []).map((id) => id.toString()),
    customFields: evt.customFields,
    category: evt.category,
    createdAt: evt.createdAt,
    updatedAt: evt.updatedAt,
  }))

  await cacheSet(CACHE_KEY, payload, 60)

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

  const data = parsed.data

  await connectMongo()

  const brandObjectIds = (data.brands ?? [])
    .filter((id) => Types.ObjectId.isValid(id))
    .map((id) => new Types.ObjectId(id))

  const event = await Event.create({
    title: data.title,
    date: data.date.map((d) => new Date(d)),
    venue: data.venue,
    type: data.type,
    description: data.description,
    imageLinkBg: data.imageLinkBg || undefined,
    imageLinkOverlay: data.imageLinkOverlay || undefined,
    brands: brandObjectIds,
    customFields: data.customFields ?? [],
    category: data.category ?? 'event',
  })

  await cacheDel(CACHE_KEY)

  return NextResponse.json(
    {
      event: {
        _id: event._id.toString(),
        title: event.title,
        date: event.date.map((d) => d.toISOString()),
        venue: event.venue,
        type: event.type,
        description: event.description,
        imageLinkBg: event.imageLinkBg,
        imageLinkOverlay: event.imageLinkOverlay,
        brands: brandObjectIds.map((id) => id.toString()),
        customFields: event.customFields,
        category: event.category,
      },
    },
    { status: 201 },
  )
}
