"use client"

import { useEffect, useState } from "react"
import { Header } from "@/components/header"
import { SidebarNav } from "@/components/sidebar-nav"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Search, Filter, PawPrint, Calendar, Phone, Mail } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AddPatientDialog } from "@/components/patients/add-patient-dialog"
import { collection, onSnapshot, query, orderBy, QuerySnapshot, DocumentData, QueryDocumentSnapshot, deleteDoc, doc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { EditPatientDialog } from "@/components/patients/edit-patient-dialog"
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

interface Patient {
  id: string
  name: string
  species: string
  breed: string
  age: string
  gender: string
  owner: string
  phone: string
  email: string
  lastVisit?: any
  nextAppointment?: any
  status: string
  weight: string
  color: string
}

export default function PatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, "patients", id))
      toast({
        title: "Paciente eliminado",
        description: "El paciente ha sido eliminado correctamente.",
      })
    } catch (error) {
      console.error("Error deleting patient: ", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo eliminar el paciente.",
      })
    }
  }

  useEffect(() => {
    const q = query(collection(db, "patients"), orderBy("createdAt", "desc"))
    const unsubscribe = onSnapshot(q, (querySnapshot: QuerySnapshot<DocumentData>) => {
      const patientsData: Patient[] = []
      querySnapshot.forEach((doc: QueryDocumentSnapshot<DocumentData>) => {
        patientsData.push({ id: doc.id, ...doc.data() } as Patient)
      })
      setPatients(patientsData)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-accent">Activo</Badge>
      case "treatment":
        return <Badge variant="secondary">En Tratamiento</Badge>
      case "inactive":
        return <Badge variant="outline">Inactivo</Badge>
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
              <h1 className="text-3xl font-bold text-foreground">Pacientes</h1>
              <p className="text-muted-foreground">Gestiona todos los pacientes de la clínica</p>
            </div>
            <AddPatientDialog />
          </div>

          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex flex-col gap-4 md:flex-row">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input type="search" placeholder="Buscar por nombre, especie, propietario..." className="pl-10" />
                </div>
                <Select defaultValue="all">
                  <SelectTrigger className="w-full md:w-48">
                    <SelectValue placeholder="Especie" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las especies</SelectItem>
                    <SelectItem value="dog">Perros</SelectItem>
                    <SelectItem value="cat">Gatos</SelectItem>
                    <SelectItem value="other">Otros</SelectItem>
                  </SelectContent>
                </Select>
                <Select defaultValue="all">
                  <SelectTrigger className="w-full md:w-48">
                    <SelectValue placeholder="Estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los estados</SelectItem>
                    <SelectItem value="active">Activos</SelectItem>
                    <SelectItem value="treatment">En tratamiento</SelectItem>
                    <SelectItem value="inactive">Inactivos</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" size="icon">
                  <Filter className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {loading ? (
            <div className="text-center py-10">Cargando pacientes...</div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {patients.map((patient) => (
                <Card key={patient.id} className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardContent className="p-6">
                    <div className="mb-4 flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-12 w-12 bg-accent/10">
                          <AvatarFallback className="text-accent">
                            <PawPrint className="h-6 w-6" />
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="text-lg font-semibold text-foreground">{patient.name}</h3>
                          <p className="text-sm text-muted-foreground">{patient.breed}</p>
                        </div>
                      </div>
                      {getStatusBadge(patient.status)}
                    </div>

                    <div className="space-y-3 border-t border-border pt-4">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <p className="text-muted-foreground">Especie</p>
                          <p className="font-medium text-foreground">{patient.species}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Edad</p>
                          <p className="font-medium text-foreground">{patient.age}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Género</p>
                          <p className="font-medium text-foreground">{patient.gender}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Peso</p>
                          <p className="font-medium text-foreground">{patient.weight}</p>
                        </div>
                      </div>

                      <div className="space-y-2 border-t border-border pt-3">
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="h-4 w-4 text-accent" />
                          <span className="text-foreground">{patient.owner}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Mail className="h-4 w-4" />
                          <span>{patient.email}</span>
                        </div>
                        {patient.nextAppointment && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            <span>Próxima cita: {new Date(patient.nextAppointment.seconds ? patient.nextAppointment.seconds * 1000 : patient.nextAppointment).toLocaleDateString("es-ES")}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 flex gap-2">
                      <EditPatientDialog patient={patient} />
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="sm" className="flex-1">
                            <Trash2 className="h-4 w-4 mr-2" />
                            Eliminar
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta acción no se puede deshacer. Esto eliminará permanentemente al paciente y sus datos asociados.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(patient.id)}>Eliminar</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {patients.length === 0 && (
                <div className="text-center py-10 text-muted-foreground">
                  No hay pacientes registrados.
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
