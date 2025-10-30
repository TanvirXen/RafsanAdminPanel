import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { connectMongo } from '@/lib/server/mongodb'
import { Brand } from '@/lib/server/models/Brand'
import { authenticateRequest } from '@/lib/server/auth'
import { cacheGet, cacheSet, cacheDel } from '@/lib/server/cache'

const brandSchema = z.object({
  brandName: z.string().min(1),
  imageLink: z.string().url(),
  externalLink: z.string().url(),
})

const CACHE_KEY = 'brands:all'

export async function GET(request: NextRequest) {
  const auth = authenticateRequest(request)
  if (!auth) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  const cached = await cacheGet<any[]>(CACHE_KEY)
  if (cached) {
    return NextResponse.json({ brands: cached, cache: true })
  }

  await connectMongo()
  const brands = await Brand.find().sort({ createdAt: -1 }).lean()

  const payload = brands.map((brand) => ({
    _id: brand._id.toString(),
    brandName: brand.brandName,
    imageLink: brand.imageLink,
    externalLink: brand.externalLink,
    createdAt: brand.createdAt,
    updatedAt: brand.updatedAt,
  }))

  await cacheSet(CACHE_KEY, payload, 60)

  return NextResponse.json({ brands: payload })
}

export async function POST(request: NextRequest) {
  const auth = authenticateRequest(request)
  if (!auth) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const parsed = brandSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ message: 'Invalid payload', issues: parsed.error.flatten() }, { status: 400 })
  }

  await connectMongo()
  const brand = await Brand.create(parsed.data)

  await cacheDel(CACHE_KEY)

  return NextResponse.json(
    {
      brand: {
        _id: brand._id.toString(),
        brandName: brand.brandName,
        imageLink: brand.imageLink,
        externalLink: brand.externalLink,
        createdAt: brand.createdAt,
        updatedAt: brand.updatedAt,
      },
    },
    { status: 201 },
  )
}
