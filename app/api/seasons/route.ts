import { NextResponse, type NextRequest } from 'next/server'
import { Types } from 'mongoose'
import { z } from 'zod'
import { connectMongo } from '@/lib/server/mongodb'
import { Season, Show } from '@/lib/server/models/Show'
import { authenticateRequest } from '@/lib/server/auth'

const seasonSchema = z.object({
  title: z.string().min(1),
  showId: z.string().min(1),
  description: z.string().optional(),
})

export async function GET(request: NextRequest) {
  const auth = authenticateRequest(request)
  if (!auth) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = request.nextUrl
  const showId = searchParams.get('showId')

  const filter: Record<string, any> = {}
  if (showId && Types.ObjectId.isValid(showId)) {
    filter.showId = new Types.ObjectId(showId)
  }

  await connectMongo()
  const seasons = await Season.find(filter).sort({ createdAt: -1 }).lean()
  const showIds = Array.from(new Set(seasons.map((season) => season.showId.toString())))

  const showMap = showIds.length
    ? await Show.find({ _id: { $in: showIds } })
        .lean()
        .then((docs) => Object.fromEntries(docs.map((doc) => [doc._id.toString(), doc.title])))
    : {}

  return NextResponse.json({
    seasons: seasons.map((season) => ({
      _id: season._id.toString(),
      title: season.title,
      description: season.description,
      showId: season.showId.toString(),
      showTitle: showMap[season.showId.toString()],
      createdAt: season.createdAt,
      updatedAt: season.updatedAt,
    })),
  })
}

export async function POST(request: NextRequest) {
  const auth = authenticateRequest(request)
  if (!auth) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const parsed = seasonSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ message: 'Invalid payload', issues: parsed.error.flatten() }, { status: 400 })
  }

  if (!Types.ObjectId.isValid(parsed.data.showId)) {
    return NextResponse.json({ message: 'Invalid show id' }, { status: 400 })
  }

  await connectMongo()
  const season = await Season.create({
    title: parsed.data.title,
    showId: new Types.ObjectId(parsed.data.showId),
    description: parsed.data.description,
  })

  return NextResponse.json(
    {
      season: {
        _id: season._id.toString(),
        title: season.title,
        description: season.description,
        showId: season.showId.toString(),
      },
    },
    { status: 201 },
  )
}
