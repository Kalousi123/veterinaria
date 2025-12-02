"use client"

import { useState, useEffect } from "react"
import { collection, getDocs, query, orderBy, deleteDoc, doc, addDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Plus, Search, Pill, Trash2, AlertCircle, Database } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { AddMedicationDialog } from "@/components/medications/add-medication-dialog"
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

interface Medication {
    id: string
    name: string
    description: string
    stock: number
    price: number
    unit: string
}

const SAMPLE_MEDICATIONS = [
    { name: "Amoxicilina", description: "Antibiótico de amplio espectro", stock: 100, price: 15.50, unit: "tabletas" },
    { name: "Meloxicam", description: "Antiinflamatorio no esteroideo", stock: 50, price: 22.00, unit: "ml" },
    { name: "Ivermectina", description: "Antiparasitario", stock: 200, price: 12.00, unit: "tabletas" },
    { name: "Prednisona", description: "Corticosteroide", stock: 80, price: 18.00, unit: "tabletas" },
    { name: "Tramadol", description: "Analgésico opioide", stock: 40, price: 25.00, unit: "ml" },
    { name: "Omeprazol", description: "Protector gástrico", stock: 150, price: 10.00, unit: "cápsulas" },
    { name: "Doxiciclina", description: "Antibiótico para infecciones respiratorias", stock: 60, price: 20.00, unit: "tabletas" },
    { name: "Metronidazol", description: "Antibiótico y antiparasitario", stock: 90, price: 14.00, unit: "ml" },
    { name: "Furosemida", description: "Diurético", stock: 70, price: 8.50, unit: "tabletas" },
    { name: "Enrofloxacina", description: "Antibiótico fluoroquinolona", stock: 45, price: 28.00, unit: "ml" },
    { name: "Ketoconazol", description: "Antifúngico", stock: 55, price: 16.00, unit: "tabletas" },
    { name: "Ranitidina", description: "Antiácido", stock: 120, price: 9.00, unit: "ml" },
    { name: "Cefalexina", description: "Antibiótico cefalosporina", stock: 85, price: 19.00, unit: "tabletas" },
    { name: "Dipirona", description: "Analgésico y antipirético", stock: 100, price: 11.00, unit: "ml" },
    { name: "Vitamina B12", description: "Suplemento vitamínico", stock: 200, price: 15.00, unit: "ml" },
    { name: "Clorhexidina", description: "Antiséptico tópico", stock: 30, price: 13.00, unit: "frasco" },
    { name: "Acepromacina", description: "Tranquilizante", stock: 25, price: 30.00, unit: "ml" },
    { name: "Apomorfina", description: "Inductor del vómito", stock: 10, price: 45.00, unit: "ampollas" },
    { name: "Atropina", description: "Anticolinérgico", stock: 20, price: 12.00, unit: "ml" },
    { name: "Diazepam", description: "Sedante y anticonvulsivo", stock: 35, price: 24.00, unit: "ml" }
]

export default function MedicationsPage() {
    const [medications, setMedications] = useState<Medication[]>([])
    const [searchTerm, setSearchTerm] = useState("")
    const [loading, setLoading] = useState(true)
    const { toast } = useToast()

    useEffect(() => {
        fetchMedications()
    }, [])

    const fetchMedications = async () => {
        try {
            const q = query(collection(db, "medications"), orderBy("name"))
            const querySnapshot = await getDocs(q)
            const medicationsData: Medication[] = []
            querySnapshot.forEach((doc) => {
                const data = doc.data()
                medicationsData.push({
                    id: doc.id,
                    name: data.name,
                    description: data.description,
                    stock: data.stock,
                    price: data.price,
                    unit: data.unit,
                })
            })
            setMedications(medicationsData)
        } catch (error) {
            console.error("Error fetching medications: ", error)
            toast({
                variant: "destructive",
                title: "Error",
                description: "No se pudieron cargar los medicamentos.",
            })
        } finally {
            setLoading(false)
        }
    }

    const seedMedications = async () => {
        try {
            setLoading(true)
            const batchPromises = SAMPLE_MEDICATIONS.map(med =>
                addDoc(collection(db, "medications"), med)
            )
            await Promise.all(batchPromises)
            toast({
                title: "Datos cargados",
                description: "Se han agregado 20 medicamentos de prueba.",
            })
            fetchMedications()
        } catch (error) {
            console.error("Error seeding medications: ", error)
            toast({
                variant: "destructive",
                title: "Error",
                description: "No se pudieron cargar los datos de prueba.",
            })
            setLoading(false)
        }
    }

    const handleDelete = async (id: string) => {
        try {
            await deleteDoc(doc(db, "medications", id))
            setMedications(medications.filter((med) => med.id !== id))
            toast({
                title: "Medicamento eliminado",
                description: "El medicamento ha sido eliminado correctamente.",
            })
        } catch (error) {
            console.error("Error deleting medication: ", error)
            toast({
                variant: "destructive",
                title: "Error",
                description: "No se pudo eliminar el medicamento.",
            })
        }
    }

    const filteredMedications = medications.filter((med) =>
        med.name.toLowerCase().includes(searchTerm.toLowerCase())
    )

    return (
        <div className="p-8 space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Medicamentos</h1>
                    <p className="text-muted-foreground mt-2">
                        Gestiona el inventario de medicamentos y suministros.
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={seedMedications}>
                        <Database className="mr-2 h-4 w-4" />
                        Cargar Datos de Prueba
                    </Button>
                    <AddMedicationDialog onSuccess={fetchMedications} />
                </div>
            </div>

            <div className="flex items-center space-x-2">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar medicamentos..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-8"
                    />
                </div>
            </div>

            {loading ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {[1, 2, 3].map((i) => (
                        <Card key={i} className="animate-pulse">
                            <CardHeader className="h-[100px] bg-muted rounded-t-xl" />
                            <CardContent className="h-[100px] bg-muted/50 rounded-b-xl mt-1" />
                        </Card>
                    ))}
                </div>
            ) : filteredMedications.length === 0 ? (
                <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
                        <Pill className="h-12 w-12 mb-4 opacity-20" />
                        <p className="text-lg font-medium">No hay medicamentos registrados</p>
                        <p className="text-sm">Agrega nuevos medicamentos para comenzar.</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {filteredMedications.map((med) => (
                        <Card key={med.id} className="hover:shadow-md transition-shadow">
                            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                                    <Pill className="h-5 w-5 text-primary" />
                                    {med.name}
                                </CardTitle>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive">
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                Esta acción no se puede deshacer. Esto eliminará permanentemente el medicamento
                                                "{med.name}" del inventario.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                            <AlertDialogAction
                                                onClick={() => handleDelete(med.id)}
                                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                            >
                                                Eliminar
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </CardHeader>
                            <CardContent>
                                <div className="grid gap-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Stock:</span>
                                        <span className={`font-medium ${med.stock < 10 ? "text-destructive" : ""}`}>
                                            {med.stock} {med.unit}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Precio:</span>
                                        <span className="font-medium">${med.price.toFixed(2)}</span>
                                    </div>
                                    {med.description && (
                                        <p className="text-muted-foreground text-xs mt-2 line-clamp-2">
                                            {med.description}
                                        </p>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    )
}
