"use client"

import { useEffect, useState } from "react"
import { Header } from "@/components/header"
import { SidebarNav } from "@/components/sidebar-nav"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar, Users, PawPrint, TrendingUp, Clock, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { collection, getDocs, query, where, Timestamp, orderBy, limit } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { format } from "date-fns"
import { es } from "date-fns/locale"

export default function DashboardPage() {
  const [stats, setStats] = useState({
    appointmentsToday: 0,
    activePatients: 0,
    owners: 0,
    monthlyRevenue: 0,
  })
  const [upcomingAppointments, setUpcomingAppointments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const tomorrow = new Date(today)
        tomorrow.setDate(tomorrow.getDate() + 1)

        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
        const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0)

        // Fetch Appointments Today
        const appointmentsQuery = query(
          collection(db, "appointments"),
          where("date", ">=", today.toISOString()),
          where("date", "<", tomorrow.toISOString()),
          orderBy("date", "asc")
        )
        const appointmentsSnapshot = await getDocs(appointmentsQuery)
        const appointmentsData = appointmentsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          date: new Date(doc.data().date)
        }))

        // Fetch Patients Count
        const patientsSnapshot = await getDocs(collection(db, "patients"))

        // Fetch Owners Count
        const ownersSnapshot = await getDocs(collection(db, "owners"))

        // Fetch Monthly Revenue
        const invoicesQuery = query(
          collection(db, "invoices"),
          where("date", ">=", startOfMonth.toISOString()),
          where("date", "<=", endOfMonth.toISOString())
        )
        const invoicesSnapshot = await getDocs(invoicesQuery)
        const revenue = invoicesSnapshot.docs.reduce((sum, doc) => sum + (doc.data().total || 0), 0)

        setStats({
          appointmentsToday: appointmentsSnapshot.size,
          activePatients: patientsSnapshot.size,
          owners: ownersSnapshot.size,
          monthlyRevenue: revenue,
        })

        setUpcomingAppointments(appointmentsData)
      } catch (error) {
        console.error("Error fetching dashboard data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const statCards = [
    {
      title: "Citas Hoy",
      value: stats.appointmentsToday.toString(),
      change: "Para el día de hoy",
      icon: Calendar,
    },
    {
      title: "Pacientes Activos",
      value: stats.activePatients.toString(),
      change: "Total registrados",
      icon: PawPrint,
    },
    {
      title: "Propietarios",
      value: stats.owners.toString(),
      change: "Total registrados",
      icon: Users,
    },
    {
      title: "Ingresos Mensuales",
      value: `€${stats.monthlyRevenue.toFixed(2)}`,
      change: "Mes actual",
      icon: TrendingUp,
    },
  ]

  const recentAlerts = [
    {
      id: 1,
      message: "Inventario bajo: Amoxicilina",
      type: "warning",
      time: "Hace 2 horas",
    },
    {
      id: 2,
      message: "Recordatorio: Actualizar stock",
      type: "info",
      time: "Hace 4 horas",
    },
  ]

  return (
    <div className="flex h-screen">
      <SidebarNav />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto bg-background p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground">Bienvenido al sistema de gestión veterinaria</p>
          </div>

          {loading ? (
            <div className="text-center py-10">Cargando datos...</div>
          ) : (
            <>
              <div className="mb-8 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                {statCards.map((stat) => {
                  const Icon = stat.icon
                  return (
                    <Card key={stat.title}>
                      <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
                        <Icon className="h-4 w-4 text-accent" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-foreground">{stat.value}</div>
                        <p className="text-xs text-muted-foreground">{stat.change}</p>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>

              <div className="grid gap-6 lg:grid-cols-3">
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-foreground">Citas de Hoy</CardTitle>
                      <Button size="sm">
                        <Calendar className="mr-2 h-4 w-4" />
                        Nueva Cita
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {upcomingAppointments.length === 0 ? (
                        <p className="text-center text-muted-foreground py-4">No hay citas para hoy.</p>
                      ) : (
                        upcomingAppointments.map((appointment) => (
                          <div
                            key={appointment.id}
                            className="flex items-center justify-between rounded-lg border border-border bg-card p-4"
                          >
                            <div className="flex items-center gap-4">
                              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-accent/10">
                                <Clock className="h-6 w-6 text-accent" />
                              </div>
                              <div>
                                <p className="font-semibold text-foreground">{appointment.patientName}</p>
                                <p className="text-sm text-muted-foreground">
                                  {appointment.veterinarian} • {appointment.type}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <span className="text-sm font-medium text-foreground">
                                {format(appointment.date, "HH:mm")}
                              </span>
                              <Badge variant={appointment.status === "confirmed" ? "default" : "secondary"}>
                                {appointment.status === "confirmed" ? "Confirmada" :
                                  appointment.status === "completed" ? "Completada" : "Pendiente"}
                              </Badge>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-foreground">Alertas Recientes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {recentAlerts.map((alert) => (
                        <div key={alert.id} className="flex gap-3 rounded-lg border border-border bg-card p-3">
                          <AlertCircle
                            className={`h-5 w-5 shrink-0 ${alert.type === "alert"
                              ? "text-destructive"
                              : alert.type === "warning"
                                ? "text-accent"
                                : "text-muted-foreground"
                              }`}
                          />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-foreground">{alert.message}</p>
                            <p className="text-xs text-muted-foreground">{alert.time}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  )
}
