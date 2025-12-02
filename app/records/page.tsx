"use client"

import { useEffect, useState } from "react"
import { Header } from "@/components/header"
import { SidebarNav } from "@/components/sidebar-nav"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Plus, Search, FileText, Calendar, Activity, AlertCircle } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AddRecordDialog } from "@/components/records/add-record-dialog"
import { collection, onSnapshot, query, orderBy, QuerySnapshot, DocumentData, QueryDocumentSnapshot, deleteDoc, doc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { EditRecordDialog } from "@/components/records/edit-record-dialog"
import { Trash2 } from "lucide-react"
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
import { useToast } from "@/hooks/use-toast"

interface MedicalRecord {
  id: string
  patientName: string
  patientSpecies: string
  ownerName: string
  date: string
  type: string
  veterinarian: string
  diagnosis: string
  treatment: string
  notes: string
  weight: string
  temperature: string
  status: string
  priority: string
}

export default function RecordsPage() {
  const [medicalRecords, setMedicalRecords] = useState<MedicalRecord[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, "records", id))
      toast({
        title: "Registro eliminado",
        description: "El historial médico ha sido eliminado correctamente.",
      })
    } catch (error) {
      console.error("Error deleting record: ", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo eliminar el registro.",
      })
    }
  }

  useEffect(() => {
    const q = query(collection(db, "records"), orderBy("createdAt", "desc"))
    const unsubscribe = onSnapshot(q, (querySnapshot: QuerySnapshot<DocumentData>) => {
      const recordsData: MedicalRecord[] = []
      querySnapshot.forEach((doc: QueryDocumentSnapshot<DocumentData>) => {
        recordsData.push({ id: doc.id, ...doc.data() } as MedicalRecord)
      })
      setMedicalRecords(recordsData)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-accent">Completado</Badge>
      case "follow-up":
        return <Badge variant="secondary">Seguimiento</Badge>
      case "urgent":
        return <Badge variant="destructive">Urgente</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const getPriorityIcon = (priority: string) => {
    if (priority === "urgent" || priority === "high") {
      return <AlertCircle className="h-5 w-5 text-destructive" />
    }
    return <Activity className="h-5 w-5 text-accent" />
  }

  return (
    <div className="flex h-screen">
      <SidebarNav />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto bg-background p-8">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Historiales Médicos</h1>
              <p className="text-muted-foreground">Consulta y gestiona los registros médicos</p>
            </div>
            <AddRecordDialog />
          </div>

          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex flex-col gap-4 md:flex-row">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Buscar por paciente, diagnóstico, tratamiento..."
                    className="pl-10"
                  />
                </div>
                <Select defaultValue="all">
                  <SelectTrigger className="w-full md:w-48">
                    <SelectValue placeholder="Tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los tipos</SelectItem>
                    <SelectItem value="Consulta General">Consultas</SelectItem>
                    <SelectItem value="Cirugía">Cirugías</SelectItem>
                    <SelectItem value="Vacunación">Vacunaciones</SelectItem>
                    <SelectItem value="Urgencia">Urgencias</SelectItem>
                  </SelectContent>
                </Select>
                <Select defaultValue="all">
                  <SelectTrigger className="w-full md:w-48">
                    <SelectValue placeholder="Estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los estados</SelectItem>
                    <SelectItem value="completed">Completados</SelectItem>
                    <SelectItem value="follow-up">Seguimiento</SelectItem>
                    <SelectItem value="urgent">Urgentes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {loading ? (
            <div className="text-center py-10">Cargando historiales...</div>
          ) : (
            <div className="space-y-4">
              {medicalRecords.map((record) => (
                <Card key={record.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex flex-col gap-6 lg:flex-row">
                      <div className="flex items-start gap-4 flex-1">
                        <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-lg bg-accent/10">
                          {getPriorityIcon(record.priority)}
                        </div>
                        <div className="flex-1">
                          <div className="mb-3 flex flex-wrap items-center gap-3">
                            <h3 className="text-xl font-semibold text-foreground">{record.patientName}</h3>
                            <Badge variant="outline" className="text-xs">
                              {record.patientSpecies}
                            </Badge>
                            {getStatusBadge(record.status)}
                            <Badge variant="secondary" className="text-xs">
                              {record.type}
                            </Badge>
                          </div>

                          <div className="mb-4 grid gap-3 text-sm md:grid-cols-2">
                            <div>
                              <p className="text-muted-foreground">Propietario</p>
                              <p className="font-medium text-foreground">{record.ownerName}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Veterinario</p>
                              <p className="font-medium text-foreground">{record.veterinarian}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Peso</p>
                              <p className="font-medium text-foreground">{record.weight}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Temperatura</p>
                              <p className="font-medium text-foreground">{record.temperature}</p>
                            </div>
                          </div>

                          <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-4">
                            <div>
                              <p className="mb-1 text-xs font-semibold uppercase text-muted-foreground">Diagnóstico</p>
                              <p className="text-sm text-foreground">{record.diagnosis}</p>
                            </div>
                            <div>
                              <p className="mb-1 text-xs font-semibold uppercase text-muted-foreground">Tratamiento</p>
                              <p className="text-sm text-foreground">{record.treatment}</p>
                            </div>
                            <div>
                              <p className="mb-1 text-xs font-semibold uppercase text-muted-foreground">Notas</p>
                              <p className="text-sm text-foreground">{record.notes}</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col justify-between gap-4 lg:w-48">
                        <div className="text-right">
                          <div className="mb-1 flex items-center justify-end gap-2 text-sm text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            Fecha
                          </div>
                          <p className="text-lg font-bold text-foreground">
                            {new Date(record.date).toLocaleDateString("es-ES", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </p>
                        </div>
                        <div className="flex flex-col gap-2">
                          <EditRecordDialog record={record} />
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm" variant="destructive" className="w-full">
                                <Trash2 className="mr-2 h-4 w-4" />
                                Eliminar
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta acción no se puede deshacer. Esto eliminará permanentemente el historial médico.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(record.id)}>Eliminar</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {medicalRecords.length === 0 && (
                <div className="text-center py-10 text-muted-foreground">
                  No hay historiales médicos registrados.
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
