"use client"

import type React from "react"

import { useState } from "react"
import { PageHeader } from "@/components/admin/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import {
  Facebook,
  Twitter,
  Instagram,
  Linkedin,
  Youtube,
  Globe,
  Save,
  Plus,
  Trash2,
  Users,
  Calendar,
  Award,
  TrendingUp,
} from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ImageUpload } from "@/components/admin/image-upload"

interface QuickFact {
  id: string
  title: string
  icon: string
  description: string
}

export default function SettingsPage() {
  const [socialLinks, setSocialLinks] = useState({
    facebook: "https://facebook.com/yourpage",
    twitter: "https://twitter.com/yourhandle",
    instagram: "https://instagram.com/yourprofile",
    linkedin: "https://linkedin.com/company/yourcompany",
    youtube: "https://youtube.com/@yourchannel",
    website: "https://yourwebsite.com",
  })

  const [heroSection, setHeroSection] = useState({
    title: "Welcome to Our Platform",
    subtitle: "Discover amazing shows and events",
    description:
      "Join thousands of users experiencing the best entertainment content. Register for exclusive events and stay updated with our latest shows.",
    image: "/hero-image.jpg",
  })

  const [aboutSection, setAboutSection] = useState({
    title: "About Us",
    description:
      "We are dedicated to bringing you the best entertainment experiences. Our platform connects you with amazing shows, events, and exclusive content.",
    image: "/about-image.jpg",
  })

  const [quickFacts, setQuickFacts] = useState<QuickFact[]>([
    {
      id: "1",
      title: "10,000+",
      icon: "Users",
      description: "Active Users",
    },
    {
      id: "2",
      title: "500+",
      icon: "Calendar",
      description: "Events Hosted",
    },
    {
      id: "3",
      title: "50+",
      icon: "Award",
      description: "Awards Won",
    },
    {
      id: "4",
      title: "98%",
      icon: "TrendingUp",
      description: "Satisfaction Rate",
    },
  ])

  const iconMap: Record<string, React.ReactNode> = {
    Users: <Users className="h-8 w-8" />,
    Calendar: <Calendar className="h-8 w-8" />,
    Award: <Award className="h-8 w-8" />,
    TrendingUp: <TrendingUp className="h-8 w-8" />,
    Globe: <Globe className="h-8 w-8" />,
  }

  const handleSocialLinkChange = (platform: string, value: string) => {
    setSocialLinks((prev) => ({ ...prev, [platform]: value }))
  }

  const handleHeroChange = (field: string, value: string) => {
    setHeroSection((prev) => ({ ...prev, [field]: value }))
  }

  const handleAboutChange = (field: string, value: string) => {
    setAboutSection((prev) => ({ ...prev, [field]: value }))
  }

  const handleAddQuickFact = () => {
    const newFact: QuickFact = {
      id: Date.now().toString(),
      title: "",
      icon: "Users",
      description: "",
    }
    setQuickFacts((prev) => [...prev, newFact])
  }

  const handleQuickFactChange = (id: string, field: keyof QuickFact, value: string) => {
    setQuickFacts((prev) => prev.map((fact) => (fact.id === id ? { ...fact, [field]: value } : fact)))
  }

  const handleDeleteQuickFact = (id: string) => {
    setQuickFacts((prev) => prev.filter((fact) => fact.id !== id))
  }

  const handleSaveSocialLinks = () => {
    console.log("Saving social links:", socialLinks)
    // TODO: Implement API call to save social links
    alert("Social links saved successfully!")
  }

  const handleSaveHeroSection = () => {
    console.log("Saving hero section:", heroSection)
    // TODO: Implement API call to save hero section
    alert("Hero section saved successfully!")
  }

  const handleSaveAboutSection = () => {
    console.log("Saving about section:", aboutSection)
    // TODO: Implement API call to save about section
    alert("About section saved successfully!")
  }

  const handleSaveQuickFacts = () => {
    console.log("Saving quick facts:", quickFacts)
    // TODO: Implement API call to save quick facts
    alert("Quick facts saved successfully!")
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader title="Settings" description="Manage your website settings, social links, and content sections" />

      {/* Social Links Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Social Media Links
          </CardTitle>
          <CardDescription>Update your social media profiles and website URL</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="facebook" className="flex items-center gap-2">
                <Facebook className="h-4 w-4 text-blue-600" />
                Facebook
              </Label>
              <Input
                id="facebook"
                type="url"
                placeholder="https://facebook.com/yourpage"
                value={socialLinks.facebook}
                onChange={(e) => handleSocialLinkChange("facebook", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="twitter" className="flex items-center gap-2">
                <Twitter className="h-4 w-4 text-sky-500" />
                Twitter
              </Label>
              <Input
                id="twitter"
                type="url"
                placeholder="https://twitter.com/yourhandle"
                value={socialLinks.twitter}
                onChange={(e) => handleSocialLinkChange("twitter", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="instagram" className="flex items-center gap-2">
                <Instagram className="h-4 w-4 text-pink-600" />
                Instagram
              </Label>
              <Input
                id="instagram"
                type="url"
                placeholder="https://instagram.com/yourprofile"
                value={socialLinks.instagram}
                onChange={(e) => handleSocialLinkChange("instagram", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="linkedin" className="flex items-center gap-2">
                <Linkedin className="h-4 w-4 text-blue-700" />
                LinkedIn
              </Label>
              <Input
                id="linkedin"
                type="url"
                placeholder="https://linkedin.com/company/yourcompany"
                value={socialLinks.linkedin}
                onChange={(e) => handleSocialLinkChange("linkedin", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="youtube" className="flex items-center gap-2">
                <Youtube className="h-4 w-4 text-red-600" />
                YouTube
              </Label>
              <Input
                id="youtube"
                type="url"
                placeholder="https://youtube.com/@yourchannel"
                value={socialLinks.youtube}
                onChange={(e) => handleSocialLinkChange("youtube", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="website" className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-gray-600" />
                Website
              </Label>
              <Input
                id="website"
                type="url"
                placeholder="https://yourwebsite.com"
                value={socialLinks.website}
                onChange={(e) => handleSocialLinkChange("website", e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <Button onClick={handleSaveSocialLinks} className="gap-2">
              <Save className="h-4 w-4" />
              Save Social Links
            </Button>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Hero Section */}
      <Card>
        <CardHeader>
          <CardTitle>Hero Section</CardTitle>
          <CardDescription>Customize the hero section on your homepage</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Hero Image */}
          <ImageUpload
            label="Hero Image"
            value={heroSection.image}
            onChange={(value) => setHeroSection((prev) => ({ ...prev, image: value }))}
            placeholder="Upload or paste hero image URL"
            category="settings/hero"
          />

          <Separator />

          {/* Hero Text Content */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="hero-title">Hero Title</Label>
              <Input
                id="hero-title"
                placeholder="Enter hero title"
                value={heroSection.title}
                onChange={(e) => handleHeroChange("title", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="hero-subtitle">Hero Subtitle</Label>
              <Input
                id="hero-subtitle"
                placeholder="Enter hero subtitle"
                value={heroSection.subtitle}
                onChange={(e) => handleHeroChange("subtitle", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="hero-description">Hero Description</Label>
              <Textarea
                id="hero-description"
                placeholder="Enter hero description"
                rows={4}
                value={heroSection.description}
                onChange={(e) => handleHeroChange("description", e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <Button onClick={handleSaveHeroSection} className="gap-2">
              <Save className="h-4 w-4" />
              Save Hero Section
            </Button>
          </div>
        </CardContent>
      </Card>

      <Separator />

      <Card>
        <CardHeader>
          <CardTitle>About Section</CardTitle>
          <CardDescription>Customize the about section on your website</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* About Image */}
          <ImageUpload
            label="About Image"
            value={aboutSection.image}
            onChange={(value) => setAboutSection((prev) => ({ ...prev, image: value }))}
            placeholder="Upload or paste about image URL"
            category="settings/about"
          />

          <Separator />

          {/* About Text Content */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="about-title">About Title</Label>
              <Input
                id="about-title"
                placeholder="Enter about title"
                value={aboutSection.title}
                onChange={(e) => handleAboutChange("title", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="about-description">About Description</Label>
              <Textarea
                id="about-description"
                placeholder="Enter about description"
                rows={6}
                value={aboutSection.description}
                onChange={(e) => handleAboutChange("description", e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <Button onClick={handleSaveAboutSection} className="gap-2">
              <Save className="h-4 w-4" />
              Save About Section
            </Button>
          </div>
        </CardContent>
      </Card>

      <Separator />

      <Card>
        <CardHeader>
          <CardTitle>Quick Facts</CardTitle>
          <CardDescription>Add statistics and key facts about your platform</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            {quickFacts.map((fact, index) => (
              <Card key={fact.id} className="border-2">
                <CardContent className="pt-6">
                  <div className="grid gap-4 md:grid-cols-4">
                    <div className="space-y-2">
                      <Label htmlFor={`fact-title-${fact.id}`}>Title/Number</Label>
                      <Input
                        id={`fact-title-${fact.id}`}
                        placeholder="e.g., 10,000+"
                        value={fact.title}
                        onChange={(e) => handleQuickFactChange(fact.id, "title", e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`fact-icon-${fact.id}`}>Icon</Label>
                      <Select
                        value={fact.icon}
                        onValueChange={(value) => handleQuickFactChange(fact.id, "icon", value)}
                      >
                        <SelectTrigger id={`fact-icon-${fact.id}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Users">
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4" />
                              Users
                            </div>
                          </SelectItem>
                          <SelectItem value="Calendar">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4" />
                              Calendar
                            </div>
                          </SelectItem>
                          <SelectItem value="Award">
                            <div className="flex items-center gap-2">
                              <Award className="h-4 w-4" />
                              Award
                            </div>
                          </SelectItem>
                          <SelectItem value="TrendingUp">
                            <div className="flex items-center gap-2">
                              <TrendingUp className="h-4 w-4" />
                              Trending Up
                            </div>
                          </SelectItem>
                          <SelectItem value="Globe">
                            <div className="flex items-center gap-2">
                              <Globe className="h-4 w-4" />
                              Globe
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor={`fact-description-${fact.id}`}>Description</Label>
                      <div className="flex gap-2">
                        <Input
                          id={`fact-description-${fact.id}`}
                          placeholder="e.g., Active Users"
                          value={fact.description}
                          onChange={(e) => handleQuickFactChange(fact.id, "description", e.target.value)}
                          className="flex-1"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          onClick={() => handleDeleteQuickFact(fact.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Button type="button" variant="outline" onClick={handleAddQuickFact} className="w-full gap-2 bg-transparent">
            <Plus className="h-4 w-4" />
            Add Quick Fact
          </Button>

          <div className="flex justify-end pt-4">
            <Button onClick={handleSaveQuickFacts} className="gap-2">
              <Save className="h-4 w-4" />
              Save Quick Facts
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
