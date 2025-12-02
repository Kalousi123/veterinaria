"use client"

import { useEffect, useState } from "react"
import { useForm, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Plus, Check, ChevronsUpDown, CalendarIcon, Trash2, FileText } from "lucide-react"
import { collection, addDoc, getDocs, query, orderBy, QueryDocumentSnapshot, DocumentData, where } from "firebase/firestore"
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

const serviceSchema = z.object({
    name: z.string().min(1, "Descripción requerida"),
    price: z.coerce.number().min(0, "Precio debe ser mayor o igual a 0"),
})

const formSchema = z.object({
    patientId: z.string().min(1, "Debe seleccionar un paciente"),
    date: z.date({
        required_error: "Fecha requerida",
    }),
    status: z.string().min(1, "Estado requerido"),
    paymentMethod: z.string().min(1, "Método de pago requerido"),
    services: z.array(serviceSchema).min(1, "Debe agregar al menos un servicio"),
})

interface Patient {
    id: string
    name: string
    owner: string
}

interface AddInvoiceDialogProps {
    prefilledData?: {
        patientId?: string
        treatment?: any
    }
    trigger?: React.ReactNode
    open?: boolean
    onOpenChange?: (open: boolean) => void
}

export function AddInvoiceDialog({ prefilledData, trigger, open: controlledOpen, onOpenChange }: AddInvoiceDialogProps) {
    const [internalOpen, setInternalOpen] = useState(false)
    const isControlled = controlledOpen !== undefined
    const open = isControlled ? controlledOpen : internalOpen
    const setOpen = isControlled ? onOpenChange! : setInternalOpen

    const [patients, setPatients] = useState<Patient[]>([])
    const [openCombobox, setOpenCombobox] = useState(false)
    const { toast } = useToast()

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            patientId: prefilledData?.patientId || "",
            status: "pending",
            paymentMethod: "Efectivo",
            services: [{ name: "", price: 0 }],
        },
    })

    const { fields, append, remove, replace } = useFieldArray({
        control: form.control,
        name: "services",
    })

    const watchServices = form.watch("services")
    const subtotal = watchServices?.reduce((sum, service) => sum + (Number(service.price) || 0), 0) || 0
    const tax = subtotal * 0.21
    const total = subtotal + tax

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
                    owner: data.owner
                })
            })
            setPatients(patientsData)
        }
        fetchPatients()
    }, [])

    useEffect(() => {
        const loadPrefilledData = async () => {
            if (prefilledData) {
                form.setValue("patientId", prefilledData.patientId || "")

                if (prefilledData.treatment && prefilledData.treatment.medications) {
                    const services = []

                    // Fetch all medications to find prices
                    const medsSnapshot = await getDocs(collection(db, "medications"))
                    const medsMap = new Map()
                    medsSnapshot.forEach(doc => {
                        medsMap.set(doc.data().name, doc.data().price)
                        medsMap.set(doc.id, doc.data().price)
                    })

                    for (const med of prefilledData.treatment.medications) {
                        let price = 0
                        if (med.medicationId && medsMap.has(med.medicationId)) {
                            price = medsMap.get(med.medicationId)
                        } else if (medsMap.has(med.name)) {
                            price = medsMap.get(med.name)
                        }

                        services.push({
                            name: `${med.name} (${med.dosage})`,
                            price: price
                        })
                    }

                    if (services.length > 0) {
                        replace(services)
                    }
                }
            }
        }

        if (open) {
            loadPrefilledData()
        }
    }, [prefilledData, open, form, replace])

    async function onSubmit(values: z.infer<typeof formSchema>) {
        try {
            const selectedPatient = patients.find(p => p.id === values.patientId)

            // Calculate totals again to be safe
            const currentSubtotal = values.services.reduce((sum, service) => sum + service.price, 0)
            const currentTax = currentSubtotal * 0.21
            const currentTotal = currentSubtotal + currentTax

            await addDoc(collection(db, "invoices"), {
                ...values,
                date: values.date.toISOString(),
                patientName: selectedPatient?.name || "Desconocido",
                ownerName: selectedPatient?.owner || "Desconocido",
                subtotal: currentSubtotal,
                tax: currentTax,
                total: currentTotal,
                createdAt: new Date(),
            })

            toast({
                title: "Factura creada",
                description: "La factura se ha registrado correctamente.",
            })
            setOpen(false)
            form.reset()
        } catch (error) {
            console.error("Error adding invoice: ", error)
            toast({
                variant: "destructive",
                title: "Error",
                description: "No se pudo crear la factura.",
            })
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="lg">
                    <Plus className="mr-2 h-5 w-5" />
                    Nueva Factura
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Nueva Factura</DialogTitle>
                    <DialogDescription>
                        Crea una nueva factura para un paciente.
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
                                                <SelectItem value="paid">Pagada</SelectItem>
                                                <SelectItem value="pending">Pendiente</SelectItem>
                                                <SelectItem value="overdue">Vencida</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="paymentMethod"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Método de Pago</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Seleccionar" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="Efectivo">Efectivo</SelectItem>
                                            <SelectItem value="Tarjeta">Tarjeta</SelectItem>
                                            <SelectItem value="Transferencia">Transferencia</SelectItem>
                                            <SelectItem value="-">-</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <FormLabel>Servicios / Items</FormLabel>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => append({ name: "", price: 0 })}
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
                                            name={`services.${index}.name`}
                                            render={({ field }) => (
                                                <FormItem className="flex-[2]">
                                                    <FormControl>
                                                        <Input placeholder="Descripción" {...field} />
                                                    </FormControl>
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name={`services.${index}.price`}
                                            render={({ field }) => (
                                                <FormItem className="flex-1">
                                                    <FormControl>
                                                        <Input type="number" placeholder="Precio" {...field} />
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

                        <div className="border-t pt-4 space-y-2">
                            <div className="flex justify-between text-sm">
                                <span>Subtotal</span>
                                <span>€{subtotal.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span>IVA (21%)</span>
                                <span>€{tax.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between font-bold text-lg">
                                <span>Total</span>
                                <span>€{total.toFixed(2)}</span>
                            </div>
                        </div>

                        <DialogFooter>
                            <Button type="submit">Guardar Factura</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
