"use client"

import { useEffect, useState } from "react"
import { useForm, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Pencil, Check, ChevronsUpDown, CalendarIcon, Trash2, Plus } from "lucide-react"
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
import { Slider } from "@/components/ui/slider"

const medicationSchema = z.object({
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
    progress: z.number().min(0).max(100),
    status: z.string().min(1, "Estado requerido"),
    medications: z.array(medicationSchema).optional(),
})

interface Patient {
    id: string
    name: string
    owner: string
    species: string
}

interface Medication {
    name: string
    dosage: string
    frequency: string
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

interface EditTreatmentDialogProps {
    treatment: Treatment
}

export function EditTreatmentDialog({ treatment }: EditTreatmentDialogProps) {
    const [open, setOpen] = useState(false)
    const [patients, setPatients] = useState<Patient[]>([])
    const [openCombobox, setOpenCombobox] = useState(false)
    const { toast } = useToast()

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            patientId: treatment.patientId || "",
            treatmentType: treatment.treatmentType,
            startDate: new Date(treatment.startDate),
            endDate: new Date(treatment.endDate),
            instructions: treatment.instructions,
            progress: treatment.progress,
            status: treatment.status,
            medications: treatment.medications || [],
        },
    })

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "medications",
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

            if (!treatment.patientId && treatment.patientName) {
                const foundPatient = patientsData.find(p => p.name === treatment.patientName)
                if (foundPatient) {
                    form.setValue("patientId", foundPatient.id)
                }
            }
        }
        if (open) {
            fetchPatients()
        }
    }, [open, treatment.patientName, treatment.patientId, form])

    async function onSubmit(values: z.infer<typeof formSchema>) {
        try {
            const selectedPatient = patients.find(p => p.id === values.patientId)
            const treatmentRef = doc(db, "treatments", treatment.id)

            // Calculate duration in days
            const durationTime = values.endDate.getTime() - values.startDate.getTime()
            const durationDays = Math.ceil(durationTime / (1000 * 3600 * 24))
            const duration = `${durationDays} días`

            await updateDoc(treatmentRef, {
                ...values,
                startDate: values.startDate.toISOString(),
                endDate: values.endDate.toISOString(),
                patientName: selectedPatient?.name || "Desconocido",
                patientSpecies: selectedPatient?.species || "Desconocido",
                ownerName: selectedPatient?.owner || "Desconocido",
                duration,
            })

            toast({
                title: "Tratamiento actualizado",
                description: "El tratamiento se ha actualizado correctamente.",
            })
            setOpen(false)
        } catch (error) {
            console.error("Error updating treatment: ", error)
            toast({
                variant: "destructive",
                title: "Error",
                description: "No se pudo actualizar el tratamiento.",
            })
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                    Actualizar
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Editar Tratamiento</DialogTitle>
                    <DialogDescription>
                        Modifica los detalles del tratamiento.
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
                                        <Textarea placeholder="Instrucciones detalladas..." {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <FormLabel>Medicamentos</FormLabel>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => append({ name: "", dosage: "", frequency: "" })}
                                >
                                    <Plus className="h-4 w-4 mr-2" />
                                    Agregar
                                </Button>
                            </div>
                            <div className="space-y-2">
                                {fields.map((field, index) => (
                                    <div key={field.id} className="flex gap-2 items-start">
                                        <FormField
                                            control={form.control}
                                            name={`medications.${index}.name`}
                                            render={({ field }) => (
                                                <FormItem className="flex-1">
                                                    <FormControl>
                                                        <Input placeholder="Nombre" {...field} />
                                                    </FormControl>
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name={`medications.${index}.dosage`}
                                            render={({ field }) => (
                                                <FormItem className="flex-1">
                                                    <FormControl>
                                                        <Input placeholder="Dosis" {...field} />
                                                    </FormControl>
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name={`medications.${index}.frequency`}
                                            render={({ field }) => (
                                                <FormItem className="flex-1">
                                                    <FormControl>
                                                        <Input placeholder="Frecuencia" {...field} />
                                                    </FormControl>
                                                </FormItem>
                                            )}
                                        />
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => remove(index)}
                                        >
                                            <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <FormField
                            control={form.control}
                            name="progress"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Progreso ({field.value}%)</FormLabel>
                                    <FormControl>
                                        <Slider
                                            min={0}
                                            max={100}
                                            step={10}
                                            defaultValue={[field.value]}
                                            onValueChange={(vals) => field.onChange(vals[0])}
                                        />
                                    </FormControl>
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
                                            <SelectItem value="active">Activo</SelectItem>
                                            <SelectItem value="completed">Completado</SelectItem>
                                        </SelectContent>
                                    </Select>
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
