"use client"

import { useState } from "react"
import { PageHeader } from "@/components/admin/page-header"
import { DataTable } from "@/components/admin/data-table"
import { DollarSign, Calendar, CreditCard, User } from "lucide-react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

interface Payment {
  _id: string
  fields: {
    name: string
    email: string
  }
  eventId: string
  eventTitle?: string
  date: string
  amount: number
  registrationId: string
}

const mockPayments: Payment[] = [
  {
    _id: "pay_123",
    fields: { name: "Jane Smith", email: "jane@example.com" },
    eventId: "evt2",
    eventTitle: "Developer Conference",
    date: "2025-09-15",
    amount: 299,
    registrationId: "reg_2",
  },
  {
    _id: "pay_456",
    fields: { name: "Bob Johnson", email: "bob@example.com" },
    eventId: "evt3",
    eventTitle: "AI Workshop Series",
    date: "2025-09-28",
    amount: 499,
    registrationId: "reg_3",
  },
  {
    _id: "pay_789",
    fields: { name: "Alice Williams", email: "alice@example.com" },
    eventId: "evt2",
    eventTitle: "Developer Conference",
    date: "2025-09-18",
    amount: 299,
    registrationId: "reg_4",
  },
]

export default function PaymentsPage() {
  const [payments] = useState<Payment[]>(mockPayments)
  const [dateFrom, setDateFrom] = useState<string>("")
  const [dateTo, setDateTo] = useState<string>("")

  const filteredPayments = payments.filter((payment) => {
    const paymentDate = new Date(payment.date)
    const fromDate = dateFrom ? new Date(dateFrom) : null
    const toDate = dateTo ? new Date(dateTo) : null

    if (fromDate && paymentDate < fromDate) return false
    if (toDate && paymentDate > toDate) return false
    return true
  })

  const totalRevenue = filteredPayments.reduce((sum, payment) => sum + payment.amount, 0)

  const columns = [
    {
      key: "_id",
      label: "Payment ID",
      render: (payment: Payment) => (
        <div className="flex items-center gap-2 font-mono text-sm">
          <CreditCard className="h-4 w-4 text-muted-foreground" />
          {payment._id}
        </div>
      ),
    },
    {
      key: "fields.name",
      label: "Customer",
      render: (payment: Payment) => (
        <div className="space-y-1">
          <div className="flex items-center gap-2 font-medium">
            <User className="h-4 w-4 text-muted-foreground" />
            {payment.fields.name}
          </div>
          <div className="text-xs text-muted-foreground">{payment.fields.email}</div>
        </div>
      ),
    },
    {
      key: "eventTitle",
      label: "Event",
    },
    {
      key: "date",
      label: "Date",
      render: (payment: Payment) => (
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          {new Date(payment.date).toLocaleDateString()}
        </div>
      ),
    },
    {
      key: "amount",
      label: "Amount",
      render: (payment: Payment) => (
        <div className="flex items-center gap-1 font-semibold">
          <DollarSign className="h-4 w-4" />
          {payment.amount.toFixed(2)}
        </div>
      ),
    },
  ]

  return (
    <div className="flex flex-col gap-6 p-6 lg:p-8">
      <PageHeader title="Payments" description="Track and manage payment transactions" />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
        <div className="flex-1 space-y-2">
          <Label htmlFor="date-from">From Date</Label>
          <Input id="date-from" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        </div>
        <div className="flex-1 space-y-2">
          <Label htmlFor="date-to">To Date</Label>
          <Input id="date-to" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        </div>
        {(dateFrom || dateTo) && (
          <Button
            variant="outline"
            onClick={() => {
              setDateFrom("")
              setDateTo("")
            }}
          >
            Clear Filters
          </Button>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-muted-foreground">Total Revenue</div>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="mt-2 text-3xl font-semibold">${totalRevenue.toFixed(2)}</div>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-muted-foreground">Total Transactions</div>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="mt-2 text-3xl font-semibold">{filteredPayments.length}</div>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-muted-foreground">Average Transaction</div>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="mt-2 text-3xl font-semibold">${(totalRevenue / filteredPayments.length).toFixed(2)}</div>
        </div>
      </div>

      <DataTable data={filteredPayments} columns={columns} searchPlaceholder="Search payments..." />
    </div>
  )
}
