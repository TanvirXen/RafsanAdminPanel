import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { connectMongo } from '@/lib/server/mongodb'
import { Show } from '@/lib/server/models/Show'
import { authenticateRequest } from '@/lib/server/auth'
import { cacheGet, cacheSet, cacheDel } from '@/lib/server/cache'

const showSchema = z.object({
  title: z.string().min(1),
  seasons: z.number().int().min(0).default(0),
  reels: z.number().int().min(0).default(0),
  featured: z.boolean().default(false),
  description: z.string().optional(),
  thumbnail: z.string().url().optional().or(z.literal('')),
  heroImage: z.string().url().optional().or(z.literal('')),
})

const CACHE_KEY = 'shows:list'

export async function GET(request: NextRequest) {
  const auth = authenticateRequest(request)
  if (!auth) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  const cached = await cacheGet<any[]>(CACHE_KEY)
  if (cached) {
    return NextResponse.json({ shows: cached, cache: true })
  }

  await connectMongo()
  const shows = await Show.find().sort({ createdAt: -1 }).lean()

  const payload = shows.map((show) => ({
    _id: show._id.toString(),
    title: show.title,
    seasons: show.seasons ?? 0,
    reels: show.reels ?? 0,
    featured: show.featured,
    description: show.description,
    thumbnail: show.thumbnail,
    heroImage: show.heroImage,
    createdAt: show.createdAt,
    updatedAt: show.updatedAt,
  }))

  await cacheSet(CACHE_KEY, payload, 60)

  return NextResponse.json({ shows: payload })
}

export async function POST(request: NextRequest) {
  const auth = authenticateRequest(request)
  if (!auth) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const parsed = showSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ message: 'Invalid payload', issues: parsed.error.flatten() }, { status: 400 })
  }

  const data = parsed.data

  await connectMongo()
  const show = await Show.create({
    title: data.title,
    seasons: data.seasons,
    reels: data.reels,
    featured: data.featured,
    description: data.description,
    thumbnail: data.thumbnail || undefined,
    heroImage: data.heroImage || undefined,
  })

  await cacheDel(CACHE_KEY)

  return NextResponse.json(
    {
      show: {
        _id: show._id.toString(),
        title: show.title,
        seasons: show.seasons,
        reels: show.reels,
        featured: show.featured,
        description: show.description,
        thumbnail: show.thumbnail,
        heroImage: show.heroImage,
      },
    },
    { status: 201 },
  )
}
