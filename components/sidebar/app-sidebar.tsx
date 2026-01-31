"use client"

import * as React from "react"
import { ChartNoAxesColumn, Grip, House, Info, Trophy } from "lucide-react"

import { NavMain } from "@/components/sidebar/nav-main"
import { NavUser, NavUserSkeleton } from "@/components/sidebar/nav-user"
import { RoleNav } from "@/components/sidebar/role-nav"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar"
import { useSession } from "@/lib/auth-client"
import Image from "next/image"


const navbarMenu = {
  navMain: [
    {
      title: "Home",
      url: "/",
      icon: House,
      isActive: true,
    },
    {
      title: "Problems",
      url: "/problems",
      icon: Grip,
    },
    {
      title: "Contest",
      url: "/contest",
      icon: Trophy,
    },
    {
      title: "Ranking",
      url: "/ranking",
      icon: ChartNoAxesColumn,
    },
    {
      title: "About",
      url: "/about",
      icon: Info,
    },
  ]
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {

  const { data: session, isPending } = useSession();

  return (
    <Sidebar className="select-none" collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Image draggable={false} src={"/images/acs.svg"} alt="@ACS" width={128} height={128} className="w-16 dark:invert" />
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">ACS GRADER</span>
                <span className="truncate text-xs text-muted-foreground">FIRSTMEET</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navbarMenu.navMain} />
        <RoleNav role={session?.user?.role} />
      </SidebarContent>
      <SidebarFooter>
        {isPending ? <NavUserSkeleton /> : session?.user ? <NavUser user={session.user} /> : null}
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
