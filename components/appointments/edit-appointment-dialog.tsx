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
    time: z.string().min(1, "La hora es requerida"),
    type: z.string().min(1, "El tipo de cita es requerido"),
    veterinarian: z.string().min(1, "El veterinario es requerido"),
    status: z.string().min(1, "El estado es requerido"),
})

interface Patient {
    id: string
    name: string
    owner: string
    phone: string
    species: string
}

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
    patientId?: string // Might be missing in old data
}

interface EditAppointmentDialogProps {
    appointment: Appointment
}

export function EditAppointmentDialog({ appointment }: EditAppointmentDialogProps) {
    const [open, setOpen] = useState(false)
    const [patients, setPatients] = useState<Patient[]>([])
    const [openCombobox, setOpenCombobox] = useState(false)
    const { toast } = useToast()

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            patientId: appointment.patientId || "",
            date: new Date(appointment.date),
            time: appointment.time,
            type: appointment.type,
            veterinarian: appointment.veterinarian,
            status: appointment.status,
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
                    phone: data.phone,
                    species: data.species
                })
            })
            setPatients(patientsData)

            // Try to find patientId if missing
            if (!appointment.patientId && appointment.patient) {
                const foundPatient = patientsData.find(p => p.name === appointment.patient)
                if (foundPatient) {
                    form.setValue("patientId", foundPatient.id)
                }
            }
        }
        if (open) {
            fetchPatients()
        }
    }, [open, appointment.patient, appointment.patientId, form])

    async function onSubmit(values: z.infer<typeof formSchema>) {
        try {
            const selectedPatient = patients.find(p => p.id === values.patientId)
            const appointmentRef = doc(db, "appointments", appointment.id)

            await updateDoc(appointmentRef, {
                ...values,
                date: values.date.toISOString(),
                patient: selectedPatient?.name || "Desconocido",
                owner: selectedPatient?.owner || "Desconocido",
                phone: selectedPatient?.phone || "",
                species: selectedPatient?.species || "",
            })

            toast({
                title: "Cita actualizada",
                description: "La cita se ha actualizado correctamente.",
            })
            setOpen(false)
        } catch (error) {
            console.error("Error updating appointment: ", error)
            toast({
                variant: "destructive",
                title: "Error",
                description: "No se pudo actualizar la cita.",
            })
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                    Ver Detalles
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>Editar Cita</DialogTitle>
                    <DialogDescription>
                        Modifica los detalles de la cita.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                                        <PopoverContent className="w-[400px] p-0">
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

                        <div className="grid grid-cols-2 gap-4">
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
                                                        date < new Date("1900-01-01")
                                                    }
                                                    initialFocus
                                                />
                                            </PopoverContent>
                                        </Popover>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="time"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Hora</FormLabel>
                                        <FormControl>
                                            <Input type="time" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="type"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Tipo de Cita</FormLabel>
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
                                                <SelectItem value="Estética">Estética</SelectItem>
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
                                                <SelectItem value="confirmed">Confirmada</SelectItem>
                                                <SelectItem value="pending">Pendiente</SelectItem>
                                                <SelectItem value="urgent">Urgente</SelectItem>
                                                <SelectItem value="cancelled">Cancelada</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

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

                        <DialogFooter>
                            <Button type="submit">Guardar Cambios</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
