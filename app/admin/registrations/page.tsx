"use client"

import { useState } from "react"
import { PageHeader } from "@/components/admin/page-header"
import { DataTable } from "@/components/admin/data-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { User, Mail, Phone, Calendar, DollarSign } from "lucide-react"

interface Registration {
  _id: string
  fields: {
    name: string
    email: string
    phone: string
  }
  eventId: string
  eventTitle: string
  eventLink?: string
  date: string
  eventType: string
  paid: boolean
  amount?: number
  paymentId?: string
}

const mockRegistrations: Registration[] = [
  {
    _id: "1",
    fields: { name: "John Doe", email: "john@example.com", phone: "+1234567890" },
    eventId: "evt1",
    eventTitle: "Summer Tech Festival 2025",
    date: "2025-07-15",
    eventType: "Free_with_approval",
    paid: false,
  },
  {
    _id: "2",
    fields: { name: "Jane Smith", email: "jane@example.com", phone: "+1987654321" },
    eventId: "evt2",
    eventTitle: "Developer Conference",
    date: "2025-09-20",
    eventType: "Paid",
    paid: true,
    amount: 299,
    paymentId: "pay_123",
  },
  {
    _id: "3",
    fields: { name: "Bob Johnson", email: "bob@example.com", phone: "+1122334455" },
    eventId: "evt3",
    eventTitle: "AI Workshop Series",
    date: "2025-10-05",
    eventType: "Paid_with_approval",
    paid: true,
    amount: 499,
    paymentId: "pay_456",
  },
]

const mockShows = [
  { _id: "1", title: "Breaking Boundaries" },
  { _id: "2", title: "Tech Talks" },
  { _id: "3", title: "Future Forward" },
]

export default function RegistrationsPage() {
  const [registrations, setRegistrations] = useState<Registration[]>(mockRegistrations)
  const [selectedRegistration, setSelectedRegistration] = useState<Registration | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const [dateFrom, setDateFrom] = useState<string>("")
  const [dateTo, setDateTo] = useState<string>("")
  const [statusFilter, setStatusFilter] = useState<string>("all")

  const filteredRegistrations = registrations.filter((reg) => {
    const regDate = new Date(reg.date)
    const fromDate = dateFrom ? new Date(dateFrom) : null
    const toDate = dateTo ? new Date(dateTo) : null

    if (fromDate && regDate < fromDate) return false
    if (toDate && regDate > toDate) return false

    if (statusFilter !== "all") {
      if (statusFilter === "pending" && !reg.eventType.includes("approval")) return false
      if (statusFilter === "approved" && reg.eventType.includes("approval")) return false
    }

    return true
  })

  const handleView = (registration: Registration) => {
    setSelectedRegistration(registration)
    setIsDialogOpen(true)
  }

  const handleDelete = (registration: Registration) => {
    if (confirm(`Are you sure you want to delete registration for "${registration.fields.name}"?`)) {
      setRegistrations(registrations.filter((r) => r._id !== registration._id))
    }
  }

  const columns = [
    {
      key: "fields.name",
      label: "Attendee",
      render: (reg: Registration) => (
        <div className="space-y-1">
          <div className="flex items-center gap-2 font-medium">
            <User className="h-4 w-4 text-muted-foreground" />
            {reg.fields.name}
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Mail className="h-3 w-3" />
            {reg.fields.email}
          </div>
        </div>
      ),
    },
    {
      key: "eventTitle",
      label: "Event",
      render: (reg: Registration) => (
        <div className="space-y-1">
          <div className="font-medium">{reg.eventTitle}</div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            {new Date(reg.date).toLocaleDateString()}
          </div>
        </div>
      ),
    },
    {
      key: "eventType",
      label: "Type",
      render: (reg: Registration) => <Badge variant="outline">{reg.eventType.replace(/_/g, " ")}</Badge>,
    },
    {
      key: "paid",
      label: "Payment Status",
      render: (reg: Registration) => (
        <div className="space-y-1">
          <Badge variant={reg.paid ? "default" : "secondary"}>{reg.paid ? "Paid" : "Free"}</Badge>
          {reg.amount && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <DollarSign className="h-3 w-3" />
              {reg.amount}
            </div>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="flex flex-col gap-6 p-6 lg:p-8">
      <PageHeader title="Registrations" description="Manage event registrations and attendees" />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
        <div className="flex-1 space-y-2">
          <Label htmlFor="date-from">From Date</Label>
          <Input id="date-from" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        </div>
        <div className="flex-1 space-y-2">
          <Label htmlFor="date-to">To Date</Label>
          <Input id="date-to" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        </div>
        <div className="flex-1 space-y-2">
          <Label htmlFor="status-filter">Status</Label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Registrations</SelectItem>
              <SelectItem value="pending">Pending Approval</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {(dateFrom || dateTo || statusFilter !== "all") && (
          <Button
            variant="outline"
            onClick={() => {
              setDateFrom("")
              setDateTo("")
              setStatusFilter("all")
            }}
          >
            Clear Filters
          </Button>
        )}
      </div>

      <DataTable
        data={filteredRegistrations}
        columns={columns}
        onEdit={handleView}
        onDelete={handleDelete}
        searchPlaceholder="Search registrations..."
      />

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registration Details</DialogTitle>
          </DialogHeader>
          {selectedRegistration && (
            <div className="space-y-4">
              <div className="space-y-2">
                <h3 className="font-semibold">Attendee Information</h3>
                <div className="space-y-1 text-sm">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedRegistration.fields.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedRegistration.fields.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedRegistration.fields.phone}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="font-semibold">Event Information</h3>
                <div className="space-y-1 text-sm">
                  <div>
                    <span className="text-muted-foreground">Event:</span> {selectedRegistration.eventTitle}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Date:</span>{" "}
                    {new Date(selectedRegistration.date).toLocaleDateString()}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Type:</span>{" "}
                    {selectedRegistration.eventType.replace(/_/g, " ")}
                  </div>
                </div>
              </div>

              {selectedRegistration.eventType.includes("approval") && (
                <div className="space-y-2">
                  <h3 className="font-semibold">Approval Status</h3>
                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1 bg-transparent" onClick={() => setIsDialogOpen(false)}>
                      Approve
                    </Button>
                    <Button variant="destructive" className="flex-1" onClick={() => setIsDialogOpen(false)}>
                      Reject
                    </Button>
                  </div>
                </div>
              )}

              {selectedRegistration.paid && (
                <div className="space-y-2">
                  <h3 className="font-semibold">Payment Information</h3>
                  <div className="space-y-1 text-sm">
                    <div>
                      <span className="text-muted-foreground">Amount:</span> ${selectedRegistration.amount}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Payment ID:</span> {selectedRegistration.paymentId}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end">
                <Button onClick={() => setIsDialogOpen(false)}>Close</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
