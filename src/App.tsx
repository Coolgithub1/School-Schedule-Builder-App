import { AppShell } from "./components/Shell"
import { Toasts } from "./components/ui"
import { StoreProvider, useStore } from "./lib/store"
import { AuthScreen } from "./screens/Auth"
import { GoalsScreen } from "./screens/Goals"
import { OverviewScreen } from "./screens/Overview"
import { PlannerScreen } from "./screens/Planner"
import { SetupScreen } from "./screens/Setup"
import { WelcomeScreen } from "./screens/Welcome"

function Router() {
  const { screen, data } = useStore()
  if (screen === "auth") return <AuthScreen />
  if (screen === "welcome" || !data.profile) return <WelcomeScreen />
  if (screen === "setup") return <SetupScreen />
  return (
    <AppShell>
      {screen === "overview" ? (
        <OverviewScreen />
      ) : screen === "goals" ? (
        <GoalsScreen />
      ) : (
        <PlannerScreen />
      )}
    </AppShell>
  )
}

export default function App() {
  return (
    <StoreProvider>
      <Router />
      <Toasts />
    </StoreProvider>
  )
}
