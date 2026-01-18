"use client"

import {
    InputGroup,
    InputGroupAddon,
    InputGroupButton,
    InputGroupInput,
} from "@/components/ui/input-group"
import { Search, X } from "lucide-react"
import { Dispatch, SetStateAction, useState } from "react"

export default function SearchInput({
    setSearchAction,
}: {
    setSearchAction: Dispatch<SetStateAction<string>>
}) {
    const [searchValue, setSearchValue] = useState("")
    const [hasSearched, setHasSearched] = useState(false)

    const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        const value = searchValue.trim()
        if (!value) return
        setSearchAction(value)
        setHasSearched(true)
    }

    const clearSearch = () => {
        setSearchValue("")
        setSearchAction("")
        setHasSearched(false)
    }

    return (
        <form onSubmit={onSubmit}>
            <InputGroup className="border-0 has-[[data-slot=input-group-control]:focus-visible]:border-0 ring-0 has-[[data-slot=input-group-control]:focus-visible]:ring-0 has-[[data-slot][aria-invalid=true]]:ring-0 has-[[data-slot][aria-invalid=true]]:border-0">                <InputGroupInput
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                placeholder="Search questions"
            />

                <InputGroupAddon>
                    <Search />
                </InputGroupAddon>
            </InputGroup>
        </form >
    )
}
