"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Pencil, Check, ChevronsUpDown, CalendarIcon } from "lucide-react"
import { doc, updateDoc, collection, getDocs, query, orderBy, QueryDocumentSnapshot, DocumentData } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { format } from "date-fns"
import { es } from "date-fns/locale"

import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"

const formSchema = z.object({
    patientId: z.string().min(1, "Debe seleccionar un paciente"),
    date: z.date({
        required_error: "La fecha es requerida",
    }),
    type: z.string().min(1, "El tipo es requerido"),
    veterinarian: z.string().min(1, "El veterinario es requerido"),
    diagnosis: z.string().min(1, "El diagnóstico es requerido"),
    treatment: z.string().min(1, "El tratamiento es requerido"),
    notes: z.string().optional(),
    weight: z.string().min(1, "El peso es requerido"),
    temperature: z.string().min(1, "La temperatura es requerida"),
    status: z.string().min(1, "El estado es requerido"),
    priority: z.string().min(1, "La prioridad es requerida"),
})

interface Patient {
    id: string
    name: string
    owner: string
    species: string
}

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
    patientId?: string
}

interface EditRecordDialogProps {
    record: MedicalRecord
}

export function EditRecordDialog({ record }: EditRecordDialogProps) {
    const [open, setOpen] = useState(false)
    const [patients, setPatients] = useState<Patient[]>([])
    const [openCombobox, setOpenCombobox] = useState(false)
    const { toast } = useToast()

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            patientId: record.patientId || "",
            date: new Date(record.date),
            type: record.type,
            veterinarian: record.veterinarian,
            diagnosis: record.diagnosis,
            treatment: record.treatment,
            notes: record.notes,
            weight: record.weight,
            temperature: record.temperature,
            status: record.status,
            priority: record.priority,
        },
    })

    useEffect(() => {
        const fetchPatients = async () => {
            const q = query(collection(db, "patients"), orderBy("name"))
            const querySnapshot = await getDocs(q)
            const patientsData: Patient[] = []
            querySnapshot.forEach((doc: QueryDocumentSnapshot<DocumentData>) => {
                const data = doc.data()
                patientsData.push({
                    id: doc.id,
                    name: data.name,
                    owner: data.owner,
                    species: data.species
                })
            })
            setPatients(patientsData)

            if (!record.patientId && record.patientName) {
                const foundPatient = patientsData.find(p => p.name === record.patientName)
                if (foundPatient) {
                    form.setValue("patientId", foundPatient.id)
                }
            }
        }
        if (open) {
            fetchPatients()
        }
    }, [open, record.patientName, record.patientId, form])

    async function onSubmit(values: z.infer<typeof formSchema>) {
        try {
            const selectedPatient = patients.find(p => p.id === values.patientId)
            const recordRef = doc(db, "records", record.id)

            await updateDoc(recordRef, {
                ...values,
                date: values.date.toISOString(),
                patientName: selectedPatient?.name || "Desconocido",
                patientSpecies: selectedPatient?.species || "Desconocido",
                ownerName: selectedPatient?.owner || "Desconocido",
            })

            toast({
                title: "Registro actualizado",
                description: "El historial médico se ha actualizado correctamente.",
            })
            setOpen(false)
        } catch (error) {
            console.error("Error updating record: ", error)
            toast({
                variant: "destructive",
                title: "Error",
                description: "No se pudo actualizar el registro.",
            })
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="w-full bg-transparent">
                    <Pencil className="mr-2 h-4 w-4" />
                    Editar
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Editar Historial Médico</DialogTitle>
                    <DialogDescription>
                        Modifica el registro médico del paciente.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="patientId"
                                render={({ field }) => (
                                    <FormItem className="flex flex-col">
                                        <FormLabel>Paciente</FormLabel>
                                        <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
                                            <PopoverTrigger asChild>
                                                <FormControl>
                                                    <Button
                                                        variant="outline"
                                                        role="combobox"
                                                        className={cn(
                                                            "w-full justify-between",
                                                            !field.value && "text-muted-foreground"
                                                        )}
                                                    >
                                                        {field.value
                                                            ? patients.find((patient) => patient.id === field.value)?.name
                                                            : "Seleccionar paciente"}
                                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                    </Button>
                                                </FormControl>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-[350px] p-0">
                                                <Command>
                                                    <CommandInput placeholder="Buscar paciente..." />
                                                    <CommandList>
                                                        <CommandEmpty>No se encontró paciente.</CommandEmpty>
                                                        <CommandGroup>
                                                            {patients.map((patient) => (
                                                                <CommandItem
                                                                    value={patient.name}
                                                                    key={patient.id}
                                                                    onSelect={() => {
                                                                        form.setValue("patientId", patient.id)
                                                                        setOpenCombobox(false)
                                                                    }}
                                                                >
                                                                    <Check
                                                                        className={cn(
                                                                            "mr-2 h-4 w-4",
                                                                            patient.id === field.value
                                                                                ? "opacity-100"
                                                                                : "opacity-0"
                                                                        )}
                                                                    />
                                                                    {patient.name} - {patient.owner}
                                                                </CommandItem>
                                                            ))}
                                                        </CommandGroup>
                                                    </CommandList>
                                                </Command>
                                            </PopoverContent>
                                        </Popover>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="date"
                                render={({ field }) => (
                                    <FormItem className="flex flex-col">
                                        <FormLabel>Fecha</FormLabel>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <FormControl>
                                                    <Button
                                                        variant={"outline"}
                                                        className={cn(
                                                            "w-full pl-3 text-left font-normal",
                                                            !field.value && "text-muted-foreground"
                                                        )}
                                                    >
                                                        {field.value ? (
                                                            format(field.value, "PPP", { locale: es })
                                                        ) : (
                                                            <span>Seleccionar fecha</span>
                                                        )}
                                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                    </Button>
                                                </FormControl>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0" align="start">
                                                <Calendar
                                                    mode="single"
                                                    selected={field.value}
                                                    onSelect={field.onChange}
                                                    disabled={(date) =>
                                                        date > new Date() || date < new Date("1900-01-01")
                                                    }
                                                    initialFocus
                                                />
                                            </PopoverContent>
                                        </Popover>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <FormField
                                control={form.control}
                                name="type"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Tipo</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Seleccionar" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="Consulta General">Consulta General</SelectItem>
                                                <SelectItem value="Vacunación">Vacunación</SelectItem>
                                                <SelectItem value="Cirugía">Cirugía</SelectItem>
                                                <SelectItem value="Control">Control</SelectItem>
                                                <SelectItem value="Urgencia">Urgencia</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="status"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Estado</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Seleccionar" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="completed">Completado</SelectItem>
                                                <SelectItem value="follow-up">Seguimiento</SelectItem>
                                                <SelectItem value="urgent">Urgente</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="priority"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Prioridad</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Seleccionar" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="normal">Normal</SelectItem>
                                                <SelectItem value="high">Alta</SelectItem>
                                                <SelectItem value="urgent">Urgente</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <FormField
                                control={form.control}
                                name="veterinarian"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Veterinario</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Dr. García" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="weight"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Peso</FormLabel>
                                        <FormControl>
                                            <Input placeholder="20 kg" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="temperature"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Temperatura</FormLabel>
                                        <FormControl>
                                            <Input placeholder="38.5°C" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="diagnosis"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Diagnóstico</FormLabel>
                                    <FormControl>
                                        <Textarea placeholder="Descripción del diagnóstico..." {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="treatment"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Tratamiento</FormLabel>
                                    <FormControl>
                                        <Textarea placeholder="Descripción del tratamiento..." {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="notes"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Notas Adicionales</FormLabel>
                                    <FormControl>
                                        <Textarea placeholder="Notas de seguimiento..." {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <DialogFooter>
                            <Button type="submit">Guardar Cambios</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
