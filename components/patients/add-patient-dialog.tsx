"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Plus, Check, ChevronsUpDown } from "lucide-react"
import { collection, addDoc, getDocs, query, orderBy, QueryDocumentSnapshot, DocumentData } from "firebase/firestore"
import { db } from "@/lib/firebase"

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

const formSchema = z.object({
    name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
    species: z.string().min(2, "Especie requerida"),
    breed: z.string().min(2, "Raza requerida"),
    age: z.string().min(1, "Edad requerida"),
    gender: z.string().min(1, "Género requerido"),
    weight: z.string().min(1, "Peso requerido"),
    color: z.string().min(2, "Color requerido"),
    ownerId: z.string().min(1, "Debe seleccionar un propietario"),
})

interface Owner {
    id: string
    name: string
    email: string
    phone: string
}

export function AddPatientDialog() {
    const [open, setOpen] = useState(false)
    const [owners, setOwners] = useState<Owner[]>([])
    const [openCombobox, setOpenCombobox] = useState(false)
    const { toast } = useToast()

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: "",
            species: "",
            breed: "",
            age: "",
            gender: "",
            weight: "",
            color: "",
            ownerId: "",
        },
    })

    useEffect(() => {
        const fetchOwners = async () => {
            const q = query(collection(db, "owners"), orderBy("name"))
            const querySnapshot = await getDocs(q)
            const ownersData: Owner[] = []
            querySnapshot.forEach((doc: QueryDocumentSnapshot<DocumentData>) => {
                const data = doc.data()
                ownersData.push({
                    id: doc.id,
                    name: data.name,
                    email: data.email,
                    phone: data.phone
                })
            })
            setOwners(ownersData)
        }
        fetchOwners()
    }, [])

    async function onSubmit(values: z.infer<typeof formSchema>) {
        try {
            const selectedOwner = owners.find(o => o.id === values.ownerId)

            await addDoc(collection(db, "patients"), {
                ...values,
                owner: selectedOwner?.name || "Desconocido",
                email: selectedOwner?.email || "",
                phone: selectedOwner?.phone || "",
                createdAt: new Date(),
                status: "active",
                nextAppointment: null,
                lastVisit: null
            })

            toast({
                title: "Paciente creado",
                description: "El paciente se ha registrado correctamente.",
            })
            setOpen(false)
            form.reset()
        } catch (error) {
            console.error("Error adding patient: ", error)
            toast({
                variant: "destructive",
                title: "Error",
                description: "No se pudo crear el paciente.",
            })
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="lg">
                    <Plus className="mr-2 h-5 w-5" />
                    Nuevo Paciente
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>Nuevo Paciente</DialogTitle>
                    <DialogDescription>
                        Ingresa los datos del nuevo paciente y asígnalo a un propietario.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Nombre</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Max" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="species"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Especie</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Seleccionar" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="Perro">Perro</SelectItem>
                                                <SelectItem value="Gato">Gato</SelectItem>
                                                <SelectItem value="Ave">Ave</SelectItem>
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
                                name="breed"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Raza</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Golden Retriever" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="gender"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Género</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Seleccionar" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="Macho">Macho</SelectItem>
                                                <SelectItem value="Hembra">Hembra</SelectItem>
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
                                name="age"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Edad</FormLabel>
                                        <FormControl>
                                            <Input placeholder="3 años" {...field} />
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
                                            <Input placeholder="10 kg" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="color"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Color</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Marrón" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="ownerId"
                            render={({ field }) => (
                                <FormItem className="flex flex-col">
                                    <FormLabel>Propietario</FormLabel>
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
                                                        ? owners.find((owner) => owner.id === field.value)?.name
                                                        : "Seleccionar propietario"}
                                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                </Button>
                                            </FormControl>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-[400px] p-0">
                                            <Command>
                                                <CommandInput placeholder="Buscar propietario..." />
                                                <CommandList>
                                                    <CommandEmpty>No se encontró propietario.</CommandEmpty>
                                                    <CommandGroup>
                                                        {owners.map((owner) => (
                                                            <CommandItem
                                                                value={owner.name}
                                                                key={owner.id}
                                                                onSelect={() => {
                                                                    form.setValue("ownerId", owner.id)
                                                                    setOpenCombobox(false)
                                                                }}
                                                            >
                                                                <Check
                                                                    className={cn(
                                                                        "mr-2 h-4 w-4",
                                                                        owner.id === field.value
                                                                            ? "opacity-100"
                                                                            : "opacity-0"
                                                                    )}
                                                                />
                                                                {owner.name}
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

                        <DialogFooter>
                            <Button type="submit">Guardar</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
