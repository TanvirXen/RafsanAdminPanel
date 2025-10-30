import { NextResponse, type NextRequest } from 'next/server'
import { Types } from 'mongoose'
import { z } from 'zod'
import { connectMongo } from '@/lib/server/mongodb'
import { Episode, Season, Show } from '@/lib/server/models/Show'
import { authenticateRequest } from '@/lib/server/auth'

const episodeSchema = z.object({
  title: z.string().min(1),
  showId: z.string().min(1),
  seasonId: z.string().min(1),
  thumbnail: z.string().url().optional().or(z.literal('')),
  link: z.string().optional(),
  featured: z.boolean().default(false),
})

export async function GET(request: NextRequest) {
  const auth = authenticateRequest(request)
  if (!auth) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = request.nextUrl
  const filter: Record<string, any> = {}

  const showId = searchParams.get('showId')
  const seasonId = searchParams.get('seasonId')

  if (showId && Types.ObjectId.isValid(showId)) {
    filter.showId = new Types.ObjectId(showId)
  }

  if (seasonId && Types.ObjectId.isValid(seasonId)) {
    filter.seasonId = new Types.ObjectId(seasonId)
  }

  await connectMongo()
  const episodes = await Episode.find(filter).sort({ createdAt: -1 }).lean()

  const showIds = Array.from(new Set(episodes.map((ep) => ep.showId.toString())))
  const seasonIds = Array.from(new Set(episodes.map((ep) => ep.seasonId.toString())))

  const [showMap, seasonMap] = await Promise.all([
    showIds.length
      ? Show.find({ _id: { $in: showIds } })
          .lean()
          .then((docs) => Object.fromEntries(docs.map((doc) => [doc._id.toString(), doc.title])))
      : {},
    seasonIds.length
      ? Season.find({ _id: { $in: seasonIds } })
          .lean()
          .then((docs) => Object.fromEntries(docs.map((doc) => [doc._id.toString(), doc.title])))
      : {},
  ])

  return NextResponse.json({
    episodes: episodes.map((episode) => ({
      _id: episode._id.toString(),
      title: episode.title,
      showId: episode.showId.toString(),
      showTitle: showMap[episode.showId.toString()],
      seasonId: episode.seasonId.toString(),
      seasonTitle: seasonMap[episode.seasonId.toString()],
      thumbnail: episode.thumbnail,
      link: episode.link,
      featured: episode.featured,
      createdAt: episode.createdAt,
      updatedAt: episode.updatedAt,
    })),
  })
}

export async function POST(request: NextRequest) {
  const auth = authenticateRequest(request)
  if (!auth) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const parsed = episodeSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ message: 'Invalid payload', issues: parsed.error.flatten() }, { status: 400 })
  }

  if (!Types.ObjectId.isValid(parsed.data.showId) || !Types.ObjectId.isValid(parsed.data.seasonId)) {
    return NextResponse.json({ message: 'Invalid show or season id' }, { status: 400 })
  }

  await connectMongo()
  const episode = await Episode.create({
    title: parsed.data.title,
    showId: new Types.ObjectId(parsed.data.showId),
    seasonId: new Types.ObjectId(parsed.data.seasonId),
    thumbnail: parsed.data.thumbnail || undefined,
    link: parsed.data.link,
    featured: parsed.data.featured,
  })

  return NextResponse.json(
    {
      episode: {
        _id: episode._id.toString(),
        title: episode.title,
        showId: episode.showId.toString(),
        seasonId: episode.seasonId.toString(),
        thumbnail: episode.thumbnail,
        link: episode.link,
        featured: episode.featured,
      },
    },
    { status: 201 },
  )
}
