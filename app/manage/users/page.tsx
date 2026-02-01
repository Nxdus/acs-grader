"use client"

import { useCallback, useEffect, useMemo, useState } from "react"

import { SectionNavBar } from "@/components/sidebar/section-navbar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Spinner } from "@/components/ui/spinner"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  MoreHorizontal,
  Search,
  UserPlus,
} from "lucide-react"

const roleOptions = ["ADMIN", "STAFF", "USER"] as const
const statusOptions = ["Verified", "Unverified"] as const

type UserRole = (typeof roleOptions)[number]
type UserStatus = (typeof statusOptions)[number]

type UserRecord = {
  id: string
  name: string
  email: string
  role: UserRole
  emailVerified: boolean
  createdAt: string
  updatedAt: string
  image?: string | null
}

type SortKey = "name" | "email" | "role" | "emailVerified" | "createdAt" | "updatedAt"

type UserResponse = {
  items: UserRecord[]
  total: number
  page: number
  pageSize: number
  stats?: {
    verified: number
    unverified: number
    admins: number
  }
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  })
}

function formatTime(value: string) {
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/)
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase()).join("")
}

function statusBadgeVariant(status: UserStatus) {
  return status === "Verified" ? "outline" : "secondary"
}

function roleBadgeVariant(role: UserRole) {
  switch (role) {
    case "ADMIN":
      return "default"
    case "STAFF":
      return "secondary"
    default:
      return "outline"
  }
}

function statusFromUser(user: UserRecord): UserStatus {
  return user.emailVerified ? "Verified" : "Unverified"
}

function statusToEmailVerified(status: UserStatus) {
  return status === "Verified"
}

export default function ManageUsersPage() {
  const [users, setUsers] = useState<UserRecord[]>([])
  const [total, setTotal] = useState(0)
  const [stats, setStats] = useState({ verified: 0, unverified: 0, admins: 0 })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [search, setSearch] = useState("")
  const [roleFilter, setRoleFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [sortKey, setSortKey] = useState<SortKey>("createdAt")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")
  const [page, setPage] = useState(1)
  const pageSize = 10

  const [formOpen, setFormOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null)
  const [formState, setFormState] = useState({
    name: "",
    email: "",
    role: roleOptions[2] as UserRole,
    status: statusOptions[1] as UserStatus,
  })
  const [formError, setFormError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const [deleteOpen, setDeleteOpen] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<UserRecord | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages)
    }
  }, [page, totalPages])

  useEffect(() => {
    setPage(1)
  }, [search, roleFilter, statusFilter, sortKey, sortDirection])

  const fetchUsers = useCallback(
    async (targetPage: number, signal?: AbortSignal) => {
      setIsLoading(true)
      setError(null)

      try {
        const params = new URLSearchParams()
        if (search.trim()) {
          params.set("search", search.trim())
        }
        if (roleFilter !== "all") {
          params.set("role", roleFilter)
        }
        if (statusFilter !== "all") {
          params.set("emailVerified", statusFilter === "Verified" ? "true" : "false")
        }
        params.set("sort", sortKey)
        params.set("dir", sortDirection)
        params.set("page", String(targetPage))
        params.set("pageSize", String(pageSize))

        const response = await fetch(`/api/users?${params.toString()}`, { signal })

        if (!response.ok) {
          throw new Error("Failed to load users.")
        }

        const payload = (await response.json()) as UserResponse
        setUsers(payload.items ?? [])
        setTotal(payload.total ?? 0)
        setStats(payload.stats ?? { verified: 0, unverified: 0, admins: 0 })
      } catch (err) {
        if (!(err instanceof DOMException && err.name === "AbortError")) {
          setError("Failed to load users. Please try again.")
        }
      } finally {
        setIsLoading(false)
      }
    },
    [pageSize, roleFilter, search, sortDirection, sortKey, statusFilter]
  )

  useEffect(() => {
    const controller = new AbortController()
    fetchUsers(page, controller.signal)
    return () => controller.abort()
  }, [fetchUsers, page])

  const showingFrom = total === 0 ? 0 : (page - 1) * pageSize + 1
  const showingTo = total === 0 ? 0 : Math.min(page * pageSize, total)

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"))
    } else {
      setSortKey(key)
      setSortDirection("asc")
    }
  }

  function openCreateDialog() {
    setEditingUser(null)
    setFormState({
      name: "",
      email: "",
      role: roleOptions[2],
      status: statusOptions[1],
    })
    setFormError(null)
    setFormOpen(true)
  }

  function openEditDialog(user: UserRecord) {
    setEditingUser(user)
    setFormState({
      name: user.name,
      email: user.email,
      role: user.role,
      status: statusFromUser(user),
    })
    setFormError(null)
    setFormOpen(true)
  }

  async function handleSave() {
    if (!formState.name.trim() || !formState.email.trim()) {
      setFormError("Name and email are required.")
      return
    }

    setIsSaving(true)
    setFormError(null)

    try {
      const payload = {
        name: formState.name.trim(),
        email: formState.email.trim(),
        role: formState.role,
        emailVerified: statusToEmailVerified(formState.status),
      }

      const response = await fetch(
        editingUser ? `/api/users/${editingUser.id}` : "/api/users",
        {
          method: editingUser ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      )

      if (!response.ok) {
        const message = await response.json().catch(() => null)
        throw new Error(message?.error ?? "Failed to save user.")
      }

      setFormOpen(false)
      setEditingUser(null)
      setPage(1)
      await fetchUsers(1)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to save user.")
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDelete() {
    if (!pendingDelete) {
      return
    }

    setIsDeleting(true)
    try {
      const response = await fetch(`/api/users/${pendingDelete.id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const message = await response.json().catch(() => null)
        throw new Error(message?.error ?? "Failed to delete user.")
      }

      setPendingDelete(null)
      setDeleteOpen(false)
      await fetchUsers(page)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete user.")
    } finally {
      setIsDeleting(false)
    }
  }

  async function handleToggleVerification(user: UserRecord) {
    try {
      const response = await fetch(`/api/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailVerified: !user.emailVerified }),
      })

      if (!response.ok) {
        throw new Error("Failed to update user.")
      }

      await fetchUsers(page)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update user.")
    }
  }

  function handleResetFilters() {
    setSearch("")
    setRoleFilter("all")
    setStatusFilter("all")
  }

  const statsDisplay = useMemo(
    () => ({
      total,
      verified: stats.verified,
      unverified: stats.unverified,
      admins: stats.admins,
    }),
    [stats.admins, stats.unverified, stats.verified, total]
  )

  return (
    <main className="w-full h-full flex flex-col rounded-xl bg-background">
      <SectionNavBar items={[{ label: "Manage" }, { label: "Users" }]} />

      <div className="container mx-auto flex flex-col gap-6 px-4 py-8">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Administration</p>
            <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Button variant="outline" onClick={handleResetFilters}>
              Reset filters
            </Button>
            <Button onClick={openCreateDialog} className="gap-2">
              <UserPlus className="size-4" />
              New user
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Total users</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold">{statsDisplay.total}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Verified</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold">{statsDisplay.verified}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Unverified</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold">{statsDisplay.unverified}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Admins</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold">{statsDisplay.admins}</CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle className="text-lg">User data table</CardTitle>
              <p className="text-sm text-muted-foreground">Search, filter, and manage user accounts.</p>
            </div>
            <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
              <div className="relative w-full sm:max-w-xs">
                <Search className="pointer-events-none absolute left-2 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search by name or email"
                  className="pl-8"
                />
              </div>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All roles</SelectItem>
                  {roleOptions.map((role) => (
                    <SelectItem key={role} value={role}>
                      {role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All status</SelectItem>
                  {statusOptions.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="px-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-60">
                      <button
                        className="inline-flex items-center gap-2 font-semibold"
                        onClick={() => toggleSort("name")}
                      >
                        User
                        <SortIcon active={sortKey === "name"} direction={sortDirection} />
                      </button>
                    </TableHead>
                    <TableHead>
                      <button
                        className="inline-flex items-center gap-2 font-semibold"
                        onClick={() => toggleSort("email")}
                      >
                        Email
                        <SortIcon active={sortKey === "email"} direction={sortDirection} />
                      </button>
                    </TableHead>
                    <TableHead>
                      <button
                        className="inline-flex items-center gap-2 font-semibold"
                        onClick={() => toggleSort("role")}
                      >
                        Role
                        <SortIcon active={sortKey === "role"} direction={sortDirection} />
                      </button>
                    </TableHead>
                    <TableHead>
                      <button
                        className="inline-flex items-center gap-2 font-semibold"
                        onClick={() => toggleSort("emailVerified")}
                      >
                        Verified
                        <SortIcon active={sortKey === "emailVerified"} direction={sortDirection} />
                      </button>
                    </TableHead>
                    <TableHead>
                      <button
                        className="inline-flex items-center gap-2 font-semibold"
                        onClick={() => toggleSort("createdAt")}
                      >
                        Created
                        <SortIcon active={sortKey === "createdAt"} direction={sortDirection} />
                      </button>
                    </TableHead>
                    <TableHead>
                      <button
                        className="inline-flex items-center gap-2 font-semibold"
                        onClick={() => toggleSort("updatedAt")}
                      >
                        Updated
                        <SortIcon active={sortKey === "updatedAt"} direction={sortDirection} />
                      </button>
                    </TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                        <div className="flex justify-center items-center w-full">
                          <Spinner/>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : error ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                        {error}
                      </TableCell>
                    </TableRow>
                  ) : users.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                        No users found. Adjust filters or create a new user.
                      </TableCell>
                    </TableRow>
                  ) : (
                    users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="size-9">
                              {user.image ? (
                                <AvatarImage src={user.image} alt={user.name} />
                              ) : null}
                              <AvatarFallback>{initialsFromName(user.name)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">{user.name}</div>
                              <div className="text-xs text-muted-foreground">{user.id}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{user.email}</TableCell>
                        <TableCell>
                          <Badge className={user.role === "ADMIN" ? "bg-red-500 text-white" : user.role === "STAFF" ? "bg-blue-500 text-white" : "bg-primary text-secondary"} variant={roleBadgeVariant(user.role)}>{user.role}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={statusFromUser(user) === "Verified" ? 'border-green-400 text-green-400' : 'border-red-400 text-red-400'} variant={statusBadgeVariant(statusFromUser(user))}>
                            {statusFromUser(user)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{formatDate(user.createdAt)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{formatTime(user.updatedAt)}</TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="size-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEditDialog(user)}>Edit</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleToggleVerification(user)}>
                                {user.emailVerified ? "Mark unverified" : "Mark verified"}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => {
                                  setPendingDelete(user)
                                  setDeleteOpen(true)
                                }}
                              >
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="flex flex-col gap-3 border-t px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-xs text-muted-foreground">
                Showing {showingFrom}-{showingTo} of {total}
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage(1)} disabled={page === 1}>
                  First
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  disabled={page === 1}
                >
                  Prev
                </Button>
                <div className="text-xs text-muted-foreground">
                  Page {page} of {totalPages}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={page === totalPages}
                >
                  Next
                </Button>
                <Button variant="outline" size="sm" onClick={() => setPage(totalPages)} disabled={page === totalPages}>
                  Last
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open)
          if (!open) {
            setEditingUser(null)
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingUser ? "Edit user" : "Create user"}</DialogTitle>
            <DialogDescription>
              {editingUser
                ? "Update role or verification status for this user."
                : "Create a new user and assign access level."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium" htmlFor="user-name">
                Name
              </label>
              <Input
                id="user-name"
                value={formState.name}
                onChange={(event) => setFormState((prev) => ({ ...prev, name: event.target.value }))}
                placeholder="Full name"
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium" htmlFor="user-email">
                Email
              </label>
              <Input
                id="user-email"
                value={formState.email}
                onChange={(event) => setFormState((prev) => ({ ...prev, email: event.target.value }))}
                placeholder="name@acs.ac"
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium" htmlFor="user-role">
                Role
              </label>
              <Select
                value={formState.role}
                onValueChange={(value) =>
                  setFormState((prev) => ({ ...prev, role: value as UserRole }))
                }
              >
                <SelectTrigger id="user-role" className="w-full">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {roleOptions.map((role) => (
                    <SelectItem key={role} value={role}>
                      {role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium" htmlFor="user-status">
                Status
              </label>
              <Select
                value={formState.status}
                onValueChange={(value) =>
                  setFormState((prev) => ({ ...prev, status: value as UserStatus }))
                }
              >
                <SelectTrigger id="user-status" className="w-full">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {formError ? (
              <p className="text-sm text-destructive">{formError}</p>
            ) : null}
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setFormOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving || !formState.name.trim() || !formState.email.trim()}>
              {isSaving ? "Saving..." : editingUser ? "Save changes" : "Create user"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete user</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete
                ? `Delete ${pendingDelete.name}? This action cannot be undone.`
                : "This action cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteOpen(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? "Deleting..." : "Delete user"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  )
}

function SortIcon({ active, direction }: { active: boolean; direction: "asc" | "desc" }) {
  if (!active) {
    return <ArrowUpDown className="size-4 text-muted-foreground" />
  }
  return direction === "asc" ? (
    <ArrowUp className="size-4" />
  ) : (
    <ArrowDown className="size-4" />
  )
}
