"use client"

import {
    InputGroup,
    InputGroupAddon,
    InputGroupInput,
} from "@/components/ui/input-group"
import { Search } from "lucide-react"
import { Dispatch, FormEvent, SetStateAction, useState } from "react"

export default function SearchInput({
    setSearchAction,
}: {
    setSearchAction: Dispatch<SetStateAction<string>>
}) {
    const [searchValue, setSearchValue] = useState("")

    const onSubmit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setSearchAction(searchValue.trim())
    }

    return (
        <form onSubmit={onSubmit}>
            <InputGroup className="border-0 has-[[data-slot=input-group-control]:focus-visible]:border-0 ring-0 has-[[data-slot=input-group-control]:focus-visible]:ring-0 has-[[data-slot][aria-invalid=true]]:ring-0 has-[[data-slot][aria-invalid=true]]:border-0">
                <InputGroupInput
                    value={searchValue}
                    onChange={(e) => {
                        setSearchValue(e.target.value)
                        setSearchAction(e.target.value.trim())
                    }}
                    placeholder="Search questions"
                />

                <InputGroupAddon>
                    <Search />
                </InputGroupAddon>
            </InputGroup>
        </form>
    )
}
