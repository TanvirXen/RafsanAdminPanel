import { NextResponse, type NextRequest } from 'next/server'
import { Types } from 'mongoose'
import { z } from 'zod'
import { connectMongo } from '@/lib/server/mongodb'
import { Reel, Show } from '@/lib/server/models/Show'
import { authenticateRequest } from '@/lib/server/auth'

const reelSchema = z.object({
  title: z.string().min(1),
  showId: z.string().min(1),
  description: z.string().optional(),
  thumbnail: z.string().url().optional().or(z.literal('')),
  link: z.string().optional(),
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
  const reels = await Reel.find(filter).sort({ createdAt: -1 }).lean()
  const showIds = Array.from(new Set(reels.map((reel) => reel.showId.toString())))

  const showMap = showIds.length
    ? await Show.find({ _id: { $in: showIds } })
        .lean()
        .then((docs) => Object.fromEntries(docs.map((doc) => [doc._id.toString(), doc.title])))
    : {}

  return NextResponse.json({
    reels: reels.map((reel) => ({
      _id: reel._id.toString(),
      title: reel.title,
      showId: reel.showId.toString(),
      showTitle: showMap[reel.showId.toString()],
      description: reel.description,
      thumbnail: reel.thumbnail,
      link: reel.link,
      createdAt: reel.createdAt,
      updatedAt: reel.updatedAt,
    })),
  })
}

export async function POST(request: NextRequest) {
  const auth = authenticateRequest(request)
  if (!auth) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const parsed = reelSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ message: 'Invalid payload', issues: parsed.error.flatten() }, { status: 400 })
  }

  if (!Types.ObjectId.isValid(parsed.data.showId)) {
    return NextResponse.json({ message: 'Invalid show id' }, { status: 400 })
  }

  await connectMongo()
  const reel = await Reel.create({
    title: parsed.data.title,
    showId: new Types.ObjectId(parsed.data.showId),
    description: parsed.data.description,
    thumbnail: parsed.data.thumbnail || undefined,
    link: parsed.data.link,
  })

  return NextResponse.json(
    {
      reel: {
        _id: reel._id.toString(),
        title: reel.title,
        showId: reel.showId.toString(),
        description: reel.description,
        thumbnail: reel.thumbnail,
        link: reel.link,
      },
    },
    { status: 201 },
  )
}
