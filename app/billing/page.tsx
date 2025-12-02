"use client"

import { useEffect, useState } from "react"
import { Header } from "@/components/header"
import { SidebarNav } from "@/components/sidebar-nav"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Plus, Search, DollarSign, Download, Eye } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AddInvoiceDialog } from "@/components/billing/add-invoice-dialog"
import { collection, onSnapshot, query, orderBy, QuerySnapshot, DocumentData, QueryDocumentSnapshot } from "firebase/firestore"
import { db } from "@/lib/firebase"

interface Service {
  name: string
  price: number
}

interface Invoice {
  id: string
  date: string
  patientName: string
  ownerName: string
  services: Service[]
  subtotal: number
  tax: number
  total: number
  status: string
  paymentMethod: string
}

export default function BillingPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const q = query(collection(db, "invoices"), orderBy("createdAt", "desc"))
    const unsubscribe = onSnapshot(q, (querySnapshot: QuerySnapshot<DocumentData>) => {
      const invoicesData: Invoice[] = []
      querySnapshot.forEach((doc: QueryDocumentSnapshot<DocumentData>) => {
        invoicesData.push({ id: doc.id, ...doc.data() } as Invoice)
      })
      setInvoices(invoicesData)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const stats = {
    totalMonth: invoices.reduce((sum, inv) => sum + inv.total, 0),
    pending: invoices.filter(inv => inv.status === "pending").reduce((sum, inv) => sum + inv.total, 0),
    paid: invoices.filter(inv => inv.status === "paid").reduce((sum, inv) => sum + inv.total, 0),
    invoiceCount: invoices.length,
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return <Badge className="bg-accent">Pagada</Badge>
      case "pending":
        return <Badge variant="secondary">Pendiente</Badge>
      case "overdue":
        return <Badge variant="destructive">Vencida</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  return (
    <div className="flex h-screen">
      <SidebarNav />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto bg-background p-8">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Facturación</h1>
              <p className="text-muted-foreground">Gestiona facturas y pagos</p>
            </div>
            <AddInvoiceDialog />
          </div>

          <div className="mb-8 grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Histórico</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">€{stats.totalMonth.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground">{stats.invoiceCount} facturas</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Pendientes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">€{stats.pending.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground">Por cobrar</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Cobradas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">€{stats.paid.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground">Completadas</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Promedio</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">
                  €{stats.invoiceCount > 0 ? (stats.totalMonth / stats.invoiceCount).toFixed(2) : "0.00"}
                </div>
                <p className="text-xs text-muted-foreground">Por factura</p>
              </CardContent>
            </Card>
          </div>

          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex flex-col gap-4 md:flex-row">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input type="search" placeholder="Buscar por factura, cliente, paciente..." className="pl-10" />
                </div>
                <Select defaultValue="all">
                  <SelectTrigger className="w-full md:w-48">
                    <SelectValue placeholder="Estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="paid">Pagadas</SelectItem>
                    <SelectItem value="pending">Pendientes</SelectItem>
                    <SelectItem value="overdue">Vencidas</SelectItem>
                  </SelectContent>
                </Select>
                <Select defaultValue="month">
                  <SelectTrigger className="w-full md:w-48">
                    <SelectValue placeholder="Período" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="week">Esta semana</SelectItem>
                    <SelectItem value="month">Este mes</SelectItem>
                    <SelectItem value="year">Este año</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {loading ? (
            <div className="text-center py-10">Cargando facturas...</div>
          ) : (
            <div className="space-y-4">
              {invoices.length === 0 ? (
                <p className="text-center text-muted-foreground">No hay facturas registradas.</p>
              ) : (
                invoices.map((invoice) => (
                  <Card key={invoice.id} className="hover:shadow-lg transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                        <div className="flex-1">
                          <div className="mb-4 flex items-center gap-3">
                            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-accent/10">
                              <DollarSign className="h-6 w-6 text-accent" />
                            </div>
                            <div>
                              <div className="flex items-center gap-3">
                                <h3 className="text-lg font-semibold text-foreground">#{invoice.id.slice(0, 8)}</h3>
                                {getStatusBadge(invoice.status)}
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {invoice.ownerName} • {invoice.patientName}
                              </p>
                            </div>
                          </div>

                          <div className="rounded-lg border border-border bg-muted/30 p-4">
                            <p className="mb-3 text-sm font-semibold text-foreground">Servicios</p>
                            <div className="space-y-2">
                              {invoice.services.map((service, index) => (
                                <div key={index} className="flex justify-between text-sm">
                                  <span className="text-foreground">{service.name}</span>
                                  <span className="font-medium text-foreground">€{Number(service.price).toFixed(2)}</span>
                                </div>
                              ))}
                            </div>
                            <div className="mt-3 space-y-1 border-t border-border pt-3">
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Subtotal</span>
                                <span className="text-foreground">€{invoice.subtotal.toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">IVA (21%)</span>
                                <span className="text-foreground">€{invoice.tax.toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between border-t border-border pt-2 text-base font-semibold">
                                <span className="text-foreground">Total</span>
                                <span className="text-foreground">€{invoice.total.toFixed(2)}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col gap-4 lg:w-56">
                          <div className="rounded-lg border border-border bg-card p-4">
                            <p className="mb-2 text-sm text-muted-foreground">Fecha de emisión</p>
                            <p className="mb-3 font-semibold text-foreground">
                              {new Date(invoice.date).toLocaleDateString("es-ES", {
                                day: "numeric",
                                month: "long",
                                year: "numeric",
                              })}
                            </p>
                            <p className="mb-2 text-sm text-muted-foreground">Método de pago</p>
                            <p className="font-semibold text-foreground">{invoice.paymentMethod}</p>
                          </div>
                          <div className="flex flex-col gap-2">
                            <Button size="sm" variant="outline" className="w-full bg-transparent">
                              <Eye className="mr-2 h-4 w-4" />
                              Ver Factura
                            </Button>
                            <Button size="sm" variant="outline" className="w-full bg-transparent">
                              <Download className="mr-2 h-4 w-4" />
                              Descargar PDF
                            </Button>
                            {invoice.status === "pending" && (
                              <Button size="sm" className="w-full">
                                Marcar Pagada
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
