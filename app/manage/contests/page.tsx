import { SectionNavBar } from "@/components/sidebar/section-navbar";

export default function Page() {
  return (
    <main className="w-full h-full flex flex-col rounded-xl bg-background">
          <SectionNavBar items={
            [
              { label: "Manage" },
              { label: "Problems", href: "/manage/problems" },
            ]
          }
          />
    </main>
  )
}