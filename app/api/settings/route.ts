import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { connectMongo } from '@/lib/server/mongodb'
import { Setting } from '@/lib/server/models/Setting'
import { authenticateRequest } from '@/lib/server/auth'

const socialLinksSchema = z.object({
  facebook: z.string().url().optional().or(z.literal('')),
  twitter: z.string().url().optional().or(z.literal('')),
  instagram: z.string().url().optional().or(z.literal('')),
  linkedin: z.string().url().optional().or(z.literal('')),
  youtube: z.string().url().optional().or(z.literal('')),
  website: z.string().url().optional().or(z.literal('')),
})

const heroSchema = z.object({
  title: z.string().min(1),
  subtitle: z.string().optional(),
  description: z.string().optional(),
  image: z.string().url().optional().or(z.literal('')),
})

const aboutSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  image: z.string().url().optional().or(z.literal('')),
})

const quickFactSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  icon: z.string().min(1),
  description: z.string().min(1),
})

const settingsSchema = z.object({
  socialLinks: socialLinksSchema.optional(),
  heroSection: heroSchema.optional(),
  aboutSection: aboutSchema.optional(),
  quickFacts: z.array(quickFactSchema).optional(),
})

async function getOrCreateSettings() {
  await connectMongo()
  let settings = await Setting.findOne().lean()
  if (!settings) {
    settings = await Setting.create({
      socialLinks: {},
      heroSection: { title: '', description: '' },
      aboutSection: { title: '', description: '' },
      quickFacts: [],
    }).then((doc) => doc.toObject())
  }
  return settings
}

export async function GET(request: NextRequest) {
  const auth = authenticateRequest(request)
  if (!auth) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  const settings = await getOrCreateSettings()

  return NextResponse.json({
    settings: {
      _id: settings._id.toString(),
      socialLinks: settings.socialLinks,
      heroSection: settings.heroSection,
      aboutSection: settings.aboutSection,
      quickFacts: settings.quickFacts,
      updatedAt: settings.updatedAt,
    },
  })
}

export async function PUT(request: NextRequest) {
  const auth = authenticateRequest(request)
  if (!auth) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const parsed = settingsSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ message: 'Invalid payload', issues: parsed.error.flatten() }, { status: 400 })
  }

  await connectMongo()
  const settings = await Setting.findOne()
  if (!settings) {
    await Setting.create(parsed.data)
    const created = await Setting.findOne().lean()
    return NextResponse.json({
      settings: {
        _id: created?._id.toString(),
        socialLinks: created?.socialLinks,
        heroSection: created?.heroSection,
        aboutSection: created?.aboutSection,
        quickFacts: created?.quickFacts,
      },
    })
  }

  const update = parsed.data

  if (update.socialLinks) {
    for (const key of Object.keys(update.socialLinks)) {
      if (update.socialLinks[key as keyof typeof update.socialLinks] === '') {
        update.socialLinks[key as keyof typeof update.socialLinks] = undefined
      }
    }
  }

  if (update.heroSection && update.heroSection.image === '') {
    update.heroSection.image = undefined
  }

  if (update.aboutSection && update.aboutSection.image === '') {
    update.aboutSection.image = undefined
  }

  settings.set(update)
  await settings.save()

  return NextResponse.json({
    settings: {
      _id: settings._id.toString(),
      socialLinks: settings.socialLinks,
      heroSection: settings.heroSection,
      aboutSection: settings.aboutSection,
      quickFacts: settings.quickFacts,
      updatedAt: settings.updatedAt,
    },
  })
}
