import { BottomNav } from "@/components/bottom-nav"

export default function WorkoutPage() {
  return (
    <div className="flex flex-col h-screen bg-background">
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold text-foreground">Workout</h1>
          <p className="text-muted-foreground">Coming soon...</p>
        </div>
      </div>
      <BottomNav />
    </div>
  )
}
