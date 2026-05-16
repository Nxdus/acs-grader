"use client"

import { ChevronRight, GraduationCap, LogOut, Pencil } from "lucide-react"
import { useState } from "react"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { signOut, updateUser } from "@/lib/auth-client"
import { useRouter } from "next/navigation"

type UserLevel = "BEGINNER" | "ADVANCED"

const userLevelOptions: { value: UserLevel; label: string }[] = [
  { value: "BEGINNER", label: "Beginner" },
  { value: "ADVANCED", label: "Advanced" },
]

export function NavUserSkeleton() {
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton size="lg" className="w-full">
          <div className="flex w-full items-center gap-3">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="flex flex-1 flex-col gap-1">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3 w-32" />
            </div>
            <Skeleton className="ml-auto h-4 w-4" />
          </div>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}

export function NavUser({
  user,
}: {
  user: {
    id: string;
    createdAt: Date;
    updatedAt: Date;
    email: string;
    emailVerified: boolean;
    name: string;
    level?: UserLevel | null;
    image?: string | null | undefined;
  }
}) {
  const router = useRouter();
  const { isMobile } = useSidebar()
  const [isNameDialogOpen, setIsNameDialogOpen] = useState(false)
  const [displayName, setDisplayName] = useState(user.name)
  const [nameDialogError, setNameDialogError] = useState<string | null>(null)
  const [isNameSubmitting, setIsNameSubmitting] = useState(false)
  const [isLevelDialogOpen, setIsLevelDialogOpen] = useState(false)
  const [level, setLevel] = useState<UserLevel>(user.level ?? "BEGINNER")
  const [levelDialogError, setLevelDialogError] = useState<string | null>(null)
  const [isLevelSubmitting, setIsLevelSubmitting] = useState(false)

  const handleSignOut = async () => {
    await signOut()
    router.replace("/sign-in")
    router.refresh()
  }

  const handleOpenNameDialog = () => {
    setDisplayName(user.name)
    setNameDialogError(null)
    setIsNameDialogOpen(true)
  }

  const handleOpenLevelDialog = () => {
    setLevel(user.level ?? "BEGINNER")
    setLevelDialogError(null)
    setIsLevelDialogOpen(true)
  }

  const handleSaveDisplayName = async () => {
    const trimmedName = displayName.trim()
    if (!trimmedName) {
      setNameDialogError("Please enter a display name.")
      return
    }

    if (trimmedName === user.name) {
      setIsNameDialogOpen(false)
      setNameDialogError(null)
      return
    }

    setIsNameSubmitting(true)
    const res = await updateUser({ name: trimmedName })
    setIsNameSubmitting(false)

    if (res.error) {
      setNameDialogError(res.error.message || "Something went wrong.")
      return
    }

    setIsNameDialogOpen(false)
    setNameDialogError(null)
    router.refresh()
  }

  const handleSaveLevel = async () => {
    if (level === user.level) {
      setIsLevelDialogOpen(false)
      setLevelDialogError(null)
      return
    }

    setIsLevelSubmitting(true)
    const res = await updateUser({ level })
    setIsLevelSubmitting(false)

    if (res.error) {
      setLevelDialogError(res.error.message || "Something went wrong.")
      return
    }

    setIsLevelDialogOpen(false)
    setLevelDialogError(null)
    router.refresh()
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="h-8 w-8 rounded-full">
                <AvatarImage src={user.image ? user.image : "/avatar.png"} alt={user.name} />
                <AvatarFallback className="rounded-full">NX</AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium capitalize">{user.name}</span>
                <span className="truncate text-xs">{user.email}</span>
              </div>
              <ChevronRight className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-full">
                  <AvatarImage src={user.image ? user.image : "/avatar.png"} alt={user.name} />
                  <AvatarFallback className="rounded-full">NX</AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium capitalize">{user.name}</span>
                  <span className="truncate text-xs">{user.email}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleOpenNameDialog}>
              <Pencil />
              Change display name
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleOpenLevelDialog}>
              <GraduationCap />
              Change level
            </DropdownMenuItem>
            <hr />
            <DropdownMenuItem onClick={handleSignOut}>
              <LogOut />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
      <Dialog
        open={isNameDialogOpen}
        onOpenChange={(open) => {
          setIsNameDialogOpen(open)
          if (!open) {
            setNameDialogError(null)
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change display name</DialogTitle>
            <DialogDescription>
              Update how your name appears across the app.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <label className="text-sm font-medium" htmlFor="display-name">
              Display name
            </label>
            <Input
              id="display-name"
              placeholder="your name"
              value={displayName}
              onChange={(event) => {
                const nextName = event.target.value
                setDisplayName(nextName)
                if (nameDialogError && nextName.trim()) {
                  setNameDialogError(null)
                }
              }}
              required
            />
            {nameDialogError && (
              <p className="text-sm text-destructive">{nameDialogError}</p>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              onClick={handleSaveDisplayName}
              disabled={isNameSubmitting}
            >
              {isNameSubmitting ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={isLevelDialogOpen}
        onOpenChange={(open) => {
          setIsLevelDialogOpen(open)
          if (!open) {
            setLevelDialogError(null)
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change level</DialogTitle>
            <DialogDescription>
              Update the contest and problem level shown to you.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <label className="text-sm font-medium" htmlFor="user-level">
              Level
            </label>
            <Select value={level} onValueChange={(value) => setLevel(value as UserLevel)}>
              <SelectTrigger id="user-level" className="w-full">
                <SelectValue placeholder="Select your level" />
              </SelectTrigger>
              <SelectContent>
                {userLevelOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {levelDialogError && (
              <p className="text-sm text-destructive">{levelDialogError}</p>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              onClick={handleSaveLevel}
              disabled={isLevelSubmitting}
            >
              {isLevelSubmitting ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarMenu>
  )
}
