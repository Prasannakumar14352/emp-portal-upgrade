import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";

interface MultiSelectProps {
    items: { label: string; value: string }[];
    values: string[];
    onChange: (values: string[]) => void;
    placeholder?: string;
}

export function MultiSelect({
    items,
    values,
    onChange,
    placeholder = "Select items...",
}: MultiSelectProps) {
    const [open, setOpen] = useState(false);

    const toggleValue = (val: string) => {
        if (values.includes(val)) {
            onChange(values.filter((v) => v !== val));
        } else {
            onChange([...values, val]);
        }
    };

    const selectedLabels = items
        .filter((i) => values.includes(i.value))
        .map((i) => i.label)
        .join(", ");

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between"
                >
                    {selectedLabels || placeholder}
                    <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
                </Button>
            </PopoverTrigger>

            <PopoverContent className="w-full p-0">
                <Command>
                    <CommandInput placeholder="Search…" />
                    <CommandList>
                        <CommandEmpty>No results.</CommandEmpty>
                        <CommandGroup>
                            {items.map((item) => (
                                <CommandItem
                                    key={item.value}
                                    onSelect={() => toggleValue(item.value)}
                                >
                                    <Check
                                        className={cn(
                                            "mr-2 h-4 w-4",
                                            values.includes(item.value)
                                                ? "opacity-100"
                                                : "opacity-0"
                                        )}
                                    />
                                    {item.label}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
