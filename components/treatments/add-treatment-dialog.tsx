"use client"

import { useEffect, useState } from "react"
import { useForm, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Plus, Check, ChevronsUpDown, CalendarIcon, Trash2 } from "lucide-react"
import { collection, addDoc, getDocs, query, orderBy, QueryDocumentSnapshot, DocumentData } from "firebase/firestore"
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

const medicationSchema = z.object({
    medicationId: z.string().optional(),
    name: z.string().min(1, "Nombre requerido"),
    dosage: z.string().min(1, "Dosis requerida"),
    frequency: z.string().min(1, "Frecuencia requerida"),
})

const formSchema = z.object({
    patientId: z.string().min(1, "Debe seleccionar un paciente"),
    treatmentType: z.string().min(1, "Tipo de tratamiento requerido"),
    startDate: z.date({
        required_error: "Fecha de inicio requerida",
    }),
    endDate: z.date({
        required_error: "Fecha de fin requerida",
    }),
    instructions: z.string().min(1, "Instrucciones requeridas"),

    medications: z.array(medicationSchema).optional(),
})

interface Patient {
    id: string
    name: string
    owner: string
    species: string
}

interface Medication {
    id: string
    name: string
    unit: string
}

export interface AddTreatmentDialogProps {
    prefilledData?: {
        patientId?: string
    }
    trigger?: React.ReactNode
    open?: boolean
    onOpenChange?: (open: boolean) => void
}

export function AddTreatmentDialog({ prefilledData, trigger, open: controlledOpen, onOpenChange }: AddTreatmentDialogProps) {
    const [internalOpen, setInternalOpen] = useState(false)

    const isControlled = controlledOpen !== undefined
    const open = isControlled ? controlledOpen : internalOpen
    const setOpen = isControlled ? onOpenChange! : setInternalOpen

    const [patients, setPatients] = useState<Patient[]>([])
    const [availableMedications, setAvailableMedications] = useState<Medication[]>([])
    const [openCombobox, setOpenCombobox] = useState(false)
    const { toast } = useToast()

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            patientId: prefilledData?.patientId || "",
            treatmentType: "",
            instructions: "",
            medications: [],
        },
    })

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "medications",
    })

    useEffect(() => {
        if (prefilledData) {
            form.reset({
                patientId: prefilledData.patientId || "",
                treatmentType: "",
                instructions: "",
                medications: [],
            })
        }
    }, [prefilledData, form])

    useEffect(() => {
        const fetchData = async () => {
            // Fetch Patients
            const patientsQuery = query(collection(db, "patients"), orderBy("name"))
            const patientsSnapshot = await getDocs(patientsQuery)
            const patientsData: Patient[] = []
            patientsSnapshot.forEach((doc) => {
                const data = doc.data()
                patientsData.push({
                    id: doc.id,
                    name: data.name,
                    owner: data.owner,
                    species: data.species
                })
            })
            setPatients(patientsData)

            // Fetch Medications
            const medicationsQuery = query(collection(db, "medications"), orderBy("name"))
            const medicationsSnapshot = await getDocs(medicationsQuery)
            const medicationsData: Medication[] = []
            medicationsSnapshot.forEach((doc) => {
                const data = doc.data()
                medicationsData.push({
                    id: doc.id,
                    name: data.name,
                    unit: data.unit
                })
            })
            setAvailableMedications(medicationsData)
        }
        fetchData()
    }, [])

    async function onSubmit(values: z.infer<typeof formSchema>) {
        try {
            const selectedPatient = patients.find(p => p.id === values.patientId)

            // Calculate duration in days
            const durationTime = values.endDate.getTime() - values.startDate.getTime()
            const durationDays = Math.ceil(durationTime / (1000 * 3600 * 24))
            const duration = `${durationDays} días`

            // Calculate next checkup (randomly 3 days later for now, or logic)
            const nextCheckup = new Date(values.startDate)
            nextCheckup.setDate(nextCheckup.getDate() + 3)

            await addDoc(collection(db, "treatments"), {
                ...values,
                startDate: values.startDate.toISOString(),
                endDate: values.endDate.toISOString(),
                nextCheckup: nextCheckup.toISOString(),
                patientName: selectedPatient?.name || "Desconocido",
                patientSpecies: selectedPatient?.species || "Desconocido",
                ownerName: selectedPatient?.owner || "Desconocido",

                duration,
                progress: 0,
                status: "active",
                createdAt: new Date(),
            })

            toast({
                title: "Tratamiento creado",
                description: "El tratamiento se ha registrado correctamente.",
            })
            setOpen(false)
            form.reset()
        } catch (error) {
            console.error("Error adding treatment: ", error)
            toast({
                variant: "destructive",
                title: "Error",
                description: "No se pudo crear el tratamiento.",
            })
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            {trigger ? (
                <DialogTrigger asChild>
                    {trigger}
                </DialogTrigger>
            ) : (
                <DialogTrigger asChild>
                    <Button size="lg">
                        <Plus className="mr-2 h-5 w-5" />
                        Nuevo Tratamiento
                    </Button>
                </DialogTrigger>
            )}
            <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Nuevo Tratamiento</DialogTitle>
                    <DialogDescription>
                        Registra un nuevo tratamiento para un paciente.
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
                                            <PopoverContent className="w-[300px] p-0">
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
                                name="treatmentType"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Tipo de Tratamiento</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Seleccionar" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="Post-operatorio">Post-operatorio</SelectItem>
                                                <SelectItem value="Dermatología">Dermatología</SelectItem>
                                                <SelectItem value="Infección">Infección</SelectItem>
                                                <SelectItem value="Gastroenteritis">Gastroenteritis</SelectItem>
                                                <SelectItem value="Vacunación">Vacunación</SelectItem>
                                                <SelectItem value="Otro">Otro</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="startDate"
                                render={({ field }) => (
                                    <FormItem className="flex flex-col">
                                        <FormLabel>Fecha Inicio</FormLabel>
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
                                name="endDate"
                                render={({ field }) => (
                                    <FormItem className="flex flex-col">
                                        <FormLabel>Fecha Fin</FormLabel>
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
                                                    initialFocus
                                                />
                                            </PopoverContent>
                                        </Popover>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="instructions"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Instrucciones</FormLabel>
                                    <FormControl>
                                        <Textarea placeholder="Instrucciones detalladas del tratamiento..." {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <FormLabel>Medicamentos</FormLabel>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => append({ name: "", dosage: "", frequency: "" })}
                                >
                                    <Plus className="mr-2 h-4 w-4" />
                                    Agregar Medicamento
                                </Button>
                            </div>
                            {fields.map((field, index) => (
                                <div key={field.id} className="flex items-end gap-2">
                                    <FormField
                                        control={form.control}
                                        name={`medications.${index}.name`}
                                        render={({ field }) => (
                                            <FormItem className="flex-1">
                                                <FormLabel className={index !== 0 ? "sr-only" : ""}>
                                                    Medicamento
                                                </FormLabel>
                                                <Select onValueChange={(value) => {
                                                    field.onChange(value)
                                                    // Find medication to set ID if needed
                                                    const med = availableMedications.find(m => m.name === value)
                                                    if (med) {
                                                        form.setValue(`medications.${index}.medicationId`, med.id)
                                                    }
                                                }} defaultValue={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Seleccionar" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        {availableMedications.map((med) => (
                                                            <SelectItem key={med.id} value={med.name}>
                                                                {med.name} ({med.unit})
                                                            </SelectItem>
                                                        ))}
                                                        <SelectItem value="Otro">Otro</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name={`medications.${index}.dosage`}
                                        render={({ field }) => (
                                            <FormItem className="flex-1">
                                                <FormLabel className={index !== 0 ? "sr-only" : ""}>
                                                    Dosis
                                                </FormLabel>
                                                <FormControl>
                                                    <Input placeholder="Ej. 1 tableta" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name={`medications.${index}.frequency`}
                                        render={({ field }) => (
                                            <FormItem className="flex-1">
                                                <FormLabel className={index !== 0 ? "sr-only" : ""}>
                                                    Frecuencia
                                                </FormLabel>
                                                <FormControl>
                                                    <Input placeholder="Ej. Cada 8 horas" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => remove(index)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>

                        <DialogFooter>
                            <Button type="submit">Guardar Tratamiento</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
