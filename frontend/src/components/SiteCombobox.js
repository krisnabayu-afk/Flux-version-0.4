import React, { useState } from 'react';
import { Button } from './ui/button';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from './ui/command';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '../lib/utils';

const SiteCombobox = ({ sites, value, onChange }) => {
    const [open, setOpen] = useState(false);

    // Ensure sites is an array to prevent errors if undefined/null is passed
    const safeSites = Array.isArray(sites) ? sites : [];
    const selectedSite = safeSites.find((site) => site.id === value);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700"
                    data-testid="site-select-combobox"
                >
                    {value
                        ? selectedSite?.name
                        : "Select site..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[400px] p-0 bg-gray-900 border-gray-700">
                <Command className="bg-gray-900 border-gray-700">
                    <CommandInput placeholder="Search site..." className="text-white" />
                    <CommandList>
                        <CommandEmpty className="text-gray-400">No site found.</CommandEmpty>
                        <CommandGroup>
                            {safeSites.map((site) => (
                                <CommandItem
                                    key={site.id}
                                    value={site.name}
                                    className="text-gray-200 data-[selected=true]:bg-gray-800"
                                    onSelect={() => {
                                        onChange(site.id === value ? "" : site.id);
                                        setOpen(false);
                                    }}
                                >
                                    <Check
                                        className={cn(
                                            "mr-2 h-4 w-4",
                                            value === site.id ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                    {site.name}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
};

export default SiteCombobox;
