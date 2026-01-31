import { SectionNavBar } from "@/components/sidebar/section-navbar"

function Page() {
  return (
    <main className="w-full h-full flex flex-col rounded-xl bg-background">
      <SectionNavBar items={[{ label: "About" }]} />
    </main>
  )
}
export default Page