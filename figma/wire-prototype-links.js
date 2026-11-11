// studyflow — wire up the wireframe prototype board
//
// Run this inside the "studyflow — Wireframe prototype" Figma file, on the
// "🗺 Prototype board" page, using the free "Scripter" community plugin
// (Plugins → Scripter → paste this → Run).
//
// Every clickable layer on the board is named "link:<Screen name>", so this
// script turns each one into an on-click "Navigate to" interaction, also links
// the sidebar/top-bar items inside every screen, sets two prototype flows, and
// applies two small visual fixes. Safe to run more than once.

async function main() {
  const page = figma.currentPage
  const frames = {}
  for (const s of page.children)
    if (s.type === "SECTION")
      for (const f of s.children) if (f.type === "FRAME") frames[f.name] = f

  if (!frames["Welcome"]) {
    figma.notify("Open the 🗺 Prototype board page first.")
    return
  }

  // Visual fixes: show the study-hours slider knob, shorten overview bars
  const setup2 = frames["Setup · 2 Study"]
  const slider = setup2 && setup2.findOne((n) => n.name === "Slider")
  if (slider && "clipsContent" in slider) slider.clipsContent = false
  for (const name of ["Overview", "Settings"]) {
    const chart = frames[name] && frames[name].findOne((n) => n.name === "Bar chart")
    if (!chart || chart.getPluginData("shrunk")) continue
    for (const bar of chart.findAll((n) => n.name === "Bar" && n.type === "FRAME")) {
      bar.resize(bar.width, Math.max(4, Math.round(bar.height * 0.62)))
      for (const c of bar.children)
        if (c.type === "RECTANGLE") c.resize(c.width, Math.max(2, Math.round(c.height * 0.62)))
    }
    chart.setPluginData("shrunk", "1")
  }

  const transition = { type: "DISSOLVE", easing: { type: "EASE_OUT" }, duration: 0.2 }
  const link = (node, target) =>
    node.setReactionsAsync([
      {
        trigger: { type: "ON_CLICK" },
        actions: [
          {
            type: "NODE",
            destinationId: target.id,
            navigation: "NAVIGATE",
            transition,
            preserveScrollPosition: false,
          },
        ],
      },
    ])

  // Layers inside the shared Sidebar / Topbar instances
  const shellMap = {
    "Nav · Schedule": "Schedule",
    "Nav · Overview": "Overview",
    "Nav · Study goals": "Study goals",
    "Focus card": "Study goals",
    "Profile row": "Settings",
    Logo: "Overview",
    Search: "Search",
    Bell: "Notifications",
    Avatar: "Settings",
  }
  const isShell = (n) =>
    n.type === "INSTANCE" &&
    n.mainComponent &&
    (n.mainComponent.name === "Sidebar" || n.mainComponent.name === "Topbar")

  let linked = 0
  const missing = new Set()
  for (const [frameName, frame] of Object.entries(frames)) {
    for (const node of frame.findAll((n) => n.name.startsWith("link:"))) {
      const target = frames[node.name.slice(5)]
      if (!target) { missing.add(node.name.slice(5)); continue }
      if (target === frame) continue
      await link(node, target)
      linked++
    }
    for (const shell of frame.findAll(isShell)) {
      for (const [childName, targetName] of Object.entries(shellMap)) {
        const child = shell.findOne((n) => n.name === childName)
        const target = frames[targetName]
        if (!child || !target || target === frame) continue
        await link(child, target)
        linked++
      }
    }
  }

  const flows = [
    { nodeId: frames["Welcome"].id, name: "Onboarding" },
    { nodeId: frames["Overview"].id, name: "Core app" },
  ]
  if (frames["Mobile · Overview"]) flows.push({ nodeId: frames["Mobile · Overview"].id, name: "Mobile" })
  page.flowStartingPoints = flows

  figma.notify(
    `Linked ${linked} hotspots across ${Object.keys(frames).length} screens` +
      (missing.size ? ` (no screen named: ${[...missing].join(", ")})` : ""),
  )
}

main()
