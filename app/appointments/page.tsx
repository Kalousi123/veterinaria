"use client"

import { useEffect, useState } from "react"
import { Header } from "@/components/header"
import { SidebarNav } from "@/components/sidebar-nav"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Plus, Calendar as CalendarIcon, Clock, Filter, CheckCircle2, Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AddAppointmentDialog } from "@/components/appointments/add-appointment-dialog"
import { AddRecordDialog } from "@/components/records/add-record-dialog"
import { collection, onSnapshot, query, orderBy, QuerySnapshot, DocumentData, QueryDocumentSnapshot, updateDoc, doc, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { EditAppointmentDialog } from "@/components/appointments/edit-appointment-dialog"
import { useToast } from "@/hooks/use-toast"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

interface Appointment {
  id: string
  date: string
  time: string
  patient: string
  species: string
  owner: string
  phone: string
  type: string
  status: string
  veterinarian: string
}

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [patients, setPatients] = useState<{ id: string, name: string }[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    const fetchPatients = async () => {
      const q = query(collection(db, "patients"))
      const querySnapshot = await getDocs(q)
      const patientsData: { id: string, name: string }[] = []
      querySnapshot.forEach((doc) => {
        patientsData.push({ id: doc.id, name: doc.data().name })
      })
      setPatients(patientsData)
    }
    fetchPatients()
  }, [])

  const handleCancel = async (id: string) => {
    try {
      await updateDoc(doc(db, "appointments", id), {
        status: "cancelled"
      })
      toast({
        title: "Cita cancelada",
        description: "La cita ha sido cancelada correctamente.",
      })
    } catch (error) {
      console.error("Error cancelling appointment: ", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo cancelar la cita.",
      })
    }
  }

  useEffect(() => {
    const q = query(collection(db, "appointments"), orderBy("createdAt", "desc"))
    const unsubscribe = onSnapshot(q, (querySnapshot: QuerySnapshot<DocumentData>) => {
      const appointmentsData: Appointment[] = []
      querySnapshot.forEach((doc: QueryDocumentSnapshot<DocumentData>) => {
        appointmentsData.push({ id: doc.id, ...doc.data() } as Appointment)
      })
      setAppointments(appointmentsData)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const handleComplete = async (id: string) => {
    try {
      await updateDoc(doc(db, "appointments", id), {
        status: "completed"
      })
      toast({
        title: "Cita completada",
        description: "La cita ha sido marcada como atendida.",
      })
    } catch (error) {
      console.error("Error completing appointment: ", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo actualizar la cita.",
      })
    }
  }

  const getStatusBadge = (status: string, date: string) => {
    const appointmentDate = new Date(date)
    const now = new Date()
    const isOverdue = appointmentDate < now && status === "pending"

    if (status === "cancelled") {
      return <Badge variant="destructive">Cancelada</Badge>
    }

    if (status === "completed") {
      return <Badge className="bg-green-500 hover:bg-green-600">Atendida</Badge>
    }

    if (isOverdue) {
      return <Badge variant="destructive">Vencido</Badge>
    }

    switch (status) {
      case "confirmed":
        return <Badge className="bg-blue-500 hover:bg-blue-600">Confirmada</Badge>
      case "pending":
        return <Badge variant="secondary">Pendiente</Badge>
      case "urgent":
        return <Badge className="bg-red-500 hover:bg-red-600">Urgencia</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
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
              <h1 className="text-3xl font-bold text-foreground">Gestión de Citas</h1>
              <p className="text-muted-foreground">Administra todas las citas de la clínica</p>
            </div>
            <AddAppointmentDialog />
          </div>

          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex flex-col gap-4 md:flex-row">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input type="search" placeholder="Buscar por paciente, propietario..." className="pl-10" />
                </div>
                <Select defaultValue="all">
                  <SelectTrigger className="w-full md:w-48">
                    <SelectValue placeholder="Estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los estados</SelectItem>
                    <SelectItem value="confirmed">Confirmadas</SelectItem>
                    <SelectItem value="pending">Pendientes</SelectItem>
                    <SelectItem value="urgent">Urgentes</SelectItem>
                    <SelectItem value="cancelled">Canceladas</SelectItem>
                  </SelectContent>
                </Select>
                <Select defaultValue="today">
                  <SelectTrigger className="w-full md:w-48">
                    <SelectValue placeholder="Fecha" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="today">Hoy</SelectItem>
                    <SelectItem value="tomorrow">Mañana</SelectItem>
                    <SelectItem value="week">Esta semana</SelectItem>
                    <SelectItem value="month">Este mes</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" size="icon">
                  <Filter className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {loading ? (
            <div className="text-center py-10">Cargando citas...</div>
          ) : (
            <div className="grid gap-4">
              {appointments.map((appointment) => (
                <Card key={appointment.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div className="flex items-start gap-4">
                        <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-lg bg-accent/10">
                          <Clock className="h-7 w-7 text-accent" />
                        </div>
                        <div className="flex-1">
                          <div className="mb-2 flex items-center gap-2">
                            <h3 className="font-semibold text-foreground">{appointment.patient}</h3>
                            <Badge variant="outline" className="text-xs">
                              {appointment.species}
                            </Badge>
                            {getStatusBadge(appointment.status, appointment.date)}
                          </div>
                          <div className="space-y-1 text-sm text-muted-foreground">
                            <p>
                              <span className="font-medium text-foreground">Propietario:</span> {appointment.owner} •{" "}
                              {appointment.phone}
                            </p>
                            <p>
                              <span className="font-medium text-foreground">Tipo:</span> {appointment.type}
                            </p>
                            <p>
                              <span className="font-medium text-foreground">Veterinario:</span> {appointment.veterinarian}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                            <CalendarIcon className="h-4 w-4 text-accent" />
                            {new Date(appointment.date).toLocaleDateString("es-ES", {
                              day: "numeric",
                              month: "short",
                            })}
                          </div>
                          <div className="mt-1 text-lg font-bold text-foreground">{appointment.time}</div>
                        </div>
                        <div className="flex flex-col gap-2">
                          <EditAppointmentDialog appointment={appointment} />
                          {appointment.status !== "cancelled" && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive hover:bg-destructive/10">
                                  Cancelar
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>¿Cancelar Cita?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    ¿Estás seguro de que deseas cancelar esta cita? El estado cambiará a "Cancelada".
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Volver</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleCancel(appointment.id)}>Confirmar Cancelación</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                          {appointment.status !== "cancelled" && appointment.status !== "completed" && (
                            <AddRecordDialog
                              trigger={
                                <Button
                                  size="sm"
                                  className="bg-green-600 hover:bg-green-700 text-white"
                                >
                                  <CheckCircle2 className="mr-2 h-4 w-4" />
                                  Atendido
                                </Button>
                              }
                              prefilledData={{
                                patientId: patients.find(p => p.name === appointment.patient)?.id,
                                veterinarian: "Dr. García", // Default or fetch from auth
                                date: new Date()
                              }}
                              onSuccess={() => handleComplete(appointment.id)}
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {appointments.length === 0 && (
                <div className="text-center py-10 text-muted-foreground">
                  No hay citas programadas.
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
