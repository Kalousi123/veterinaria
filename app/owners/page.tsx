"use client"

import { useEffect, useState } from "react"
import { Header } from "@/components/header"
import { SidebarNav } from "@/components/sidebar-nav"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Search, Filter, Phone, Mail, MapPin, PawPrint } from "lucide-react"
import { Input } from "@/components/ui/input"
import { AddOwnerDialog } from "@/components/owners/add-owner-dialog"
import { collection, onSnapshot, query, orderBy, QuerySnapshot, DocumentData, QueryDocumentSnapshot, deleteDoc, doc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { EditOwnerDialog } from "@/components/owners/edit-owner-dialog"
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

interface Pet {
  name: string
  species: string
}

interface Owner {
  id: string
  name: string
  email: string
  phone: string
  address: string
  pets: Pet[]
  totalVisits: number
  lastVisit?: any // Timestamp or string
  memberSince?: any
  status: string
}

export default function OwnersPage() {
  const [owners, setOwners] = useState<Owner[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, "owners", id))
      toast({
        title: "Propietario eliminado",
        description: "El propietario ha sido eliminado correctamente.",
      })
    } catch (error) {
      console.error("Error deleting owner: ", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo eliminar el propietario.",
      })
    }
  }

  useEffect(() => {
    const q = query(collection(db, "owners"), orderBy("createdAt", "desc"))
    const unsubscribe = onSnapshot(q, (querySnapshot: QuerySnapshot<DocumentData>) => {
      const ownersData: Owner[] = []
      querySnapshot.forEach((doc: QueryDocumentSnapshot<DocumentData>) => {
        ownersData.push({ id: doc.id, ...doc.data() } as Owner)
      })
      setOwners(ownersData)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const formatDate = (date: any) => {
    if (!date) return "N/A"
    // Handle Firestore Timestamp
    if (date.seconds) {
      return new Date(date.seconds * 1000).toLocaleDateString("es-ES", {
        day: "numeric",
        month: "short",
      })
    }
    return new Date(date).toLocaleDateString("es-ES", {
      day: "numeric",
      month: "short",
    })
  }

  return (
    <div className="flex h-screen">
      <SidebarNav />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto bg-background p-8">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Propietarios</h1>
              <p className="text-muted-foreground">Gestiona la información de los propietarios</p>
            </div>
            <AddOwnerDialog />
          </div>

          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex flex-col gap-4 md:flex-row">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input type="search" placeholder="Buscar por nombre, email, teléfono..." className="pl-10" />
                </div>
                <Button variant="outline" size="icon">
                  <Filter className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {loading ? (
            <div className="text-center py-10">Cargando propietarios...</div>
          ) : (
            <div className="grid gap-4">
              {owners.map((owner) => (
                <Card key={owner.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                      <div className="flex items-start gap-4">
                        <Avatar className="h-16 w-16 bg-accent/10">
                          <AvatarFallback className="text-lg font-semibold text-accent">
                            {getInitials(owner.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="mb-2 flex items-center gap-3">
                            <h3 className="text-xl font-semibold text-foreground">{owner.name}</h3>
                            <Badge
                              variant={owner.status === "active" ? "default" : "outline"}
                              className={owner.status === "active" ? "bg-accent" : ""}
                            >
                              {owner.status === "active" ? "Activo" : "Inactivo"}
                            </Badge>
                          </div>
                          <div className="space-y-2 text-sm">
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Mail className="h-4 w-4" />
                              <span>{owner.email}</span>
                            </div>
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Phone className="h-4 w-4" />
                              <span>{owner.phone}</span>
                            </div>
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <MapPin className="h-4 w-4" />
                              <span>{owner.address}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-4 lg:items-end">
                        <div className="space-y-3">
                          <div className="rounded-lg border border-border bg-card p-3">
                            <p className="text-xs text-muted-foreground">Mascotas</p>
                            <div className="mt-1 flex flex-wrap gap-2">
                              {owner.pets && owner.pets.length > 0 ? (
                                owner.pets.map((pet, index) => (
                                  <Badge key={index} variant="secondary" className="flex items-center gap-1">
                                    <PawPrint className="h-3 w-3" />
                                    {pet.name} ({pet.species})
                                  </Badge>
                                ))
                              ) : (
                                <span className="text-xs text-muted-foreground">Sin mascotas registradas</span>
                              )}
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <p className="text-muted-foreground">Total visitas</p>
                              <p className="text-lg font-semibold text-foreground">{owner.totalVisits || 0}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Última visita</p>
                              <p className="text-lg font-semibold text-foreground">
                                {formatDate(owner.lastVisit)}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <EditOwnerDialog owner={owner} />
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="destructive" size="sm">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta acción no se puede deshacer. Esto eliminará permanentemente al propietario y sus datos asociados.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(owner.id)}>Eliminar</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>

                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {owners.length === 0 && (
                <div className="text-center py-10 text-muted-foreground">
                  No hay propietarios registrados.
                </div>
              )}
            </div>
          )}
        </main>
      </div >
    </div >
  )
}

