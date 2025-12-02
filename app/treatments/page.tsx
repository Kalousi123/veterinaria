"use client"

import { useEffect, useState } from "react"
import { Header } from "@/components/header"
import { SidebarNav } from "@/components/sidebar-nav"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Plus, Search, Activity, Clock, CheckCircle2, FileText } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AddTreatmentDialog } from "@/components/treatments/add-treatment-dialog"
import { collection, onSnapshot, query, orderBy, QuerySnapshot, DocumentData, QueryDocumentSnapshot, deleteDoc, doc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { EditTreatmentDialog } from "@/components/treatments/edit-treatment-dialog"
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
import { AddInvoiceDialog } from "@/components/billing/add-invoice-dialog"

interface Medication {
  name: string
  dosage: string
  frequency: string
  medicationId?: string
}

interface Treatment {
  id: string
  patientName: string
  patientSpecies: string
  ownerName: string
  treatmentType: string
  startDate: string
  endDate: string
  duration: string
  progress: number
  status: string
  medications: Medication[]
  instructions: string
  nextCheckup: string
  outcome?: string
  patientId?: string
}

export default function TreatmentsPage() {
  const [treatments, setTreatments] = useState<Treatment[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, "treatments", id))
      toast({
        title: "Tratamiento eliminado",
        description: "El tratamiento ha sido eliminado correctamente.",
      })
    } catch (error) {
      console.error("Error deleting treatment: ", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo eliminar el tratamiento.",
      })
    }
  }

  useEffect(() => {
    const q = query(collection(db, "treatments"), orderBy("createdAt", "desc"))
    const unsubscribe = onSnapshot(q, (querySnapshot: QuerySnapshot<DocumentData>) => {
      const treatmentsData: Treatment[] = []
      querySnapshot.forEach((doc: QueryDocumentSnapshot<DocumentData>) => {
        treatmentsData.push({ id: doc.id, ...doc.data() } as Treatment)
      })
      setTreatments(treatmentsData)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const activeTreatments = treatments.filter(t => t.status === "active")
  const completedTreatments = treatments.filter(t => t.status === "completed")

  return (
    <div className="flex h-screen">
      <SidebarNav />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto bg-background p-8">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Tratamientos</h1>
              <p className="text-muted-foreground">Monitorea los tratamientos activos y completados</p>
            </div>
            <AddTreatmentDialog />
          </div>

          <div className="mb-8 grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Tratamientos Activos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-foreground">{activeTreatments.length}</div>
                <p className="text-xs text-muted-foreground">En curso actualmente</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Completados</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-foreground">{completedTreatments.length}</div>
                <p className="text-xs text-muted-foreground">Finalizados exitosamente</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Registrados</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-foreground">{treatments.length}</div>
                <p className="text-xs text-muted-foreground">Histórico total</p>
              </CardContent>
            </Card>
          </div>

          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex flex-col gap-4 md:flex-row">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input type="search" placeholder="Buscar por paciente, tipo de tratamiento..." className="pl-10" />
                </div>
                <Select defaultValue="active">
                  <SelectTrigger className="w-full md:w-48">
                    <SelectValue placeholder="Estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="active">Activos</SelectItem>
                    <SelectItem value="completed">Completados</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {loading ? (
            <div className="text-center py-10">Cargando tratamientos...</div>
          ) : (
            <>
              <div className="mb-6">
                <h2 className="mb-4 text-xl font-semibold text-foreground">Tratamientos Activos</h2>
                {activeTreatments.length === 0 ? (
                  <p className="text-muted-foreground">No hay tratamientos activos.</p>
                ) : (
                  <div className="space-y-4">
                    {activeTreatments.map((treatment) => (
                      <Card key={treatment.id} className="hover:shadow-lg transition-shadow">
                        <CardContent className="p-6">
                          <div className="mb-4 flex items-start justify-between">
                            <div className="flex items-start gap-4">
                              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-accent/10">
                                <Activity className="h-6 w-6 text-accent" />
                              </div>
                              <div>
                                <div className="mb-2 flex items-center gap-3">
                                  <h3 className="text-lg font-semibold text-foreground">{treatment.patientName}</h3>
                                  <Badge variant="outline">{treatment.patientSpecies}</Badge>
                                  <Badge className="bg-accent">Activo</Badge>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                  {treatment.ownerName} • {treatment.treatmentType}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-sm text-muted-foreground">Duración</p>
                              <p className="font-semibold text-foreground">{treatment.duration}</p>
                            </div>
                          </div>

                          <div className="mb-4">
                            <div className="mb-2 flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Progreso del tratamiento</span>
                              <span className="font-semibold text-foreground">{treatment.progress}%</span>
                            </div>
                            <Progress value={treatment.progress} className="h-2" />
                            <div className="mt-1 flex justify-between text-xs text-muted-foreground">
                              <span>Inicio: {new Date(treatment.startDate).toLocaleDateString("es-ES")}</span>
                              <span>Fin: {new Date(treatment.endDate).toLocaleDateString("es-ES")}</span>
                            </div>
                          </div>

                          <div className="mb-4 rounded-lg border border-border bg-muted/30 p-4">
                            <p className="mb-3 text-sm font-semibold text-foreground">Medicamentos</p>
                            <div className="space-y-2">
                              {treatment.medications?.map((med, index) => (
                                <div
                                  key={index}
                                  className="flex items-center justify-between rounded border border-border bg-card p-2 text-sm"
                                >
                                  <span className="font-medium text-foreground">{med.name}</span>
                                  <span className="text-muted-foreground">
                                    {med.dosage} - {med.frequency}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="mb-4 rounded-lg border border-border bg-muted/30 p-3">
                            <p className="mb-1 text-xs font-semibold uppercase text-muted-foreground">Instrucciones</p>
                            <p className="text-sm text-foreground">{treatment.instructions}</p>
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-sm">
                              <Clock className="h-4 w-4 text-accent" />
                              <span className="text-muted-foreground">Próximo control:</span>
                              <span className="font-semibold text-foreground">
                                {new Date(treatment.nextCheckup).toLocaleDateString("es-ES")}
                              </span>
                            </div>
                            <div className="flex gap-2">
                              <AddInvoiceDialog
                                prefilledData={{
                                  patientId: treatment.patientId,
                                  treatment: treatment
                                }}
                                trigger={
                                  <Button size="sm" variant="outline">
                                    <FileText className="h-4 w-4 mr-2" />
                                    Generar Factura
                                  </Button>
                                }
                              />
                              <EditTreatmentDialog treatment={treatment} />
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button size="sm" variant="destructive">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Esta acción no se puede deshacer. Esto eliminará permanentemente el tratamiento.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDelete(treatment.id)}>Eliminar</AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h2 className="mb-4 text-xl font-semibold text-foreground">Tratamientos Completados</h2>
                {completedTreatments.length === 0 ? (
                  <p className="text-muted-foreground">No hay tratamientos completados.</p>
                ) : (
                  <div className="space-y-4">
                    {completedTreatments.map((treatment) => (
                      <Card key={treatment.id}>
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-accent/10">
                                <CheckCircle2 className="h-6 w-6 text-accent" />
                              </div>
                              <div>
                                <div className="mb-1 flex items-center gap-3">
                                  <h3 className="font-semibold text-foreground">{treatment.patientName}</h3>
                                  <Badge variant="outline">{treatment.patientSpecies}</Badge>
                                  <Badge variant="secondary">Completado</Badge>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                  {treatment.ownerName} • {treatment.treatmentType}
                                </p>
                                <p className="mt-1 text-sm text-foreground">{treatment.outcome || "Tratamiento finalizado"}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-sm text-muted-foreground">Finalizado</p>
                              <p className="font-semibold text-foreground">
                                {new Date(treatment.endDate).toLocaleDateString("es-ES")}
                              </p>
                              <div className="flex gap-2 mt-2 justify-end">
                                <AddInvoiceDialog
                                  prefilledData={{
                                    patientId: treatment.patientId,
                                    treatment: treatment
                                  }}
                                  trigger={
                                    <Button size="sm" variant="outline">
                                      <FileText className="h-4 w-4 mr-2" />
                                      Generar Factura
                                    </Button>
                                  }
                                />
                                <EditTreatmentDialog treatment={treatment} />
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button size="sm" variant="destructive">
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Esta acción no se puede deshacer. Esto eliminará permanentemente el tratamiento.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => handleDelete(treatment.id)}>Eliminar</AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  )
}
