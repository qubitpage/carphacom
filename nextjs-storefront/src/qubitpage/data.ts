// Qubitpage LIMITED — company facts and curated project data.
// Every statement here comes from the qubitpage GitHub organisation profile and the projects' own READMEs
// (github.com/qubitpage). Live numbers (stars, updates, topics) are merged in from the GitHub API at runtime.

export const COMPANY = {
  name: "Qubitpage LIMITED",
  brand: "Qubitpage",
  tagline: "Software, AI agents and robotics — engineered end to end.",
  country: "Romania",
  email: "contact@qubitpage.com",
  github: "https://github.com/qubitpage",
  githubOrg: "qubitpage",
  site: "https://qubitpage.com",
  trademark: "QubitPage® is a registered trademark of Qubitpage LIMITED.",
}

export type Category = "Robotics" | "AI agents" | "Quantum & research" | "E-commerce" | "Infrastructure" | "Security" | "Accessibility"

export interface Project {
  slug: string // = GitHub repository name
  name: string
  category: Category
  tagline: string
  summary: string
  highlights: string[]
  tech: string[]
  links?: { label: string; url: string }[]
  image?: string
  featured?: boolean
  award?: string
}

const raw = (repo: string, branch: string, p: string) => `https://raw.githubusercontent.com/qubitpage/${repo}/${branch}/${p}`

export const PROJECTS: Project[] = [
  {
    slug: "carpathron-muse",
    name: "Carpathron",
    category: "Robotics",
    tagline: "Robots you can talk to, drive and become — powered by Meta Muse.",
    summary:
      "One Muse brain, one open robot protocol, every way to reach your robot: a Windows agent app, WhatsApp text and voice control, a native Meta Quest avatar app and an ESP32-CAM robot car. Built for the Meta Global AI Developer Hackathon 2026 (Startup track).",
    highlights: [
      "Muse Carpathron for Windows: chat and agent on Meta Muse with tools, MCP, memory, SSH servers, GitHub, firmware and robot control",
      "Carpathron Avatar for Meta Quest: see through the robot's camera, drive with the controllers, turn your head and the robot turns",
      "Baby Carpathron: ESP32-CAM car with live video, continuous driving and the open Carpathron Robot Protocol",
      "WhatsApp text and voice commands, room mapping and a phone or browser control panel",
    ],
    tech: ["Meta Muse", "Electron", "Node.js", "Godot 4 OpenXR", "ESP32-CAM", "WhatsApp"],
    links: [
      { label: "Download the apps", url: "https://github.com/qubitpage/carpathron-muse#%EF%B8%8F-download" },
      { label: "A-to-Z guide", url: "https://github.com/qubitpage/carpathron-muse/blob/main/docs/GUIDE.md" },
    ],
    image: raw("carpathron-muse", "main", "assets/brand/carpathron-social-1280x640.png"),
    featured: true,
    award: "Meta Global AI Developer Hackathon 2026",
  },
  {
    slug: "carphacom",
    name: "CarphaCom",
    category: "E-commerce",
    tagline: "Robotised commerce platform on Medusa, PostgreSQL and Next.js.",
    summary:
      "A full-stack commerce platform with a Medusa v2 backend, PostgreSQL, Redis, a Next.js storefront and a custom admin and operations panel. This repository is the public source of the CarphaCom Standalone Developer Edition for the Vultr Marketplace. Its robotised sibling, CarphaCom Robotised, won 1st place at the lablab.ai AI Meets Robotics 2026 hackathon.",
    highlights: [
      "Medusa v2 backend, Next.js storefront and a custom admin / operations UI",
      "Romanian courier integrations (FAN Courier, Sameday) and Netopia / Stripe payments",
      "Self-hosted Developer Edition image for the Vultr Marketplace",
      "CarphaCom Robotised: AI warehouse robotics with NVIDIA Isaac Sim and Google Gemini — 1st place, lablab.ai AI Meets Robotics 2026",
    ],
    tech: ["MedusaJS", "Next.js", "PostgreSQL", "Redis", "TypeScript", "Docker"],
    links: [
      { label: "CarphaCom Robotised (winning repo)", url: "https://github.com/msrusu87-web/CarphaCom-Robotised-E-Commerce" },
      { label: "The winning hackathon", url: "https://lablab.ai/ai-hackathons/launch-fund-ai-meets-robotics" },
    ],
    featured: true,
    award: "1st place — lablab.ai AI Meets Robotics 2026",
  },
  {
    slug: "QubitPage-OS",
    name: "QubitPage® OS",
    category: "Quantum & research",
    tagline: "A browser-based quantum operating system for AI-assisted drug discovery.",
    summary:
      "A complete desktop OS running in the browser, with the QLang circuit lab, IBM Quantum hardware access, MedGemma-powered medical research tools and AI drug-discovery workflows. Fully responsive across desktop, tablet and mobile.",
    highlights: [
      "20 desktop apps running in the browser",
      "IBM Quantum hardware access (IBM Fez, Torino, Marrakesh — 156 qubits)",
      "MedGemma disease-diagnosis assistant and AI drug-discovery tools",
      "13 drug candidates reported by the research pipeline",
    ],
    tech: ["Python", "Flask", "Socket.IO", "Qiskit", "MedGemma", "Gemini"],
    image: raw("QubitPage-OS", "main", "docs/screenshot-main.png"),
    featured: true,
  },
  {
    slug: "sentinel-coder-vscode",
    name: "Sentinel Coder One Studio",
    category: "AI agents",
    tagline: "An autonomous, bring-your-own-model AI coding agent for VS Code.",
    summary:
      "Your models, your keys, your machine: an autonomous coding agent that works with local models or your own API keys across 340+ models — no bundled provider, no vendor lock-in.",
    highlights: [
      "Autonomous tool loop: files, editor, terminal, git, Docker, SSH, HTTP, browser, RAG and media — with approval modes, checkpoints and verify-before-done",
      "Per-model tuning of reasoning effort and context size",
      "Boss / worker / reviewer agent teams with cost policies",
      "Keys in VS Code SecretStorage; local models keep code on the device",
    ],
    tech: ["TypeScript", "VS Code API", "MCP", "Ollama", "RAG"],
    featured: true,
  },
  {
    slug: "vultr-atlas-omniverse",
    name: "Vultr Atlas + Omniverse",
    category: "Infrastructure",
    tagline: "A live 3D cockpit for a real Vultr fleet.",
    summary:
      "A spinning 3D globe shows account regions as towers — height is server count, colour is health. Click a region to expand real servers, services and status, with a Gemini agent, an embedded VS Code Web editor and NVIDIA Omniverse / Isaac Sim streaming integration.",
    highlights: [
      "Real Vultr v2 API data: regions, plans and instances",
      "Three.js / react-three-fiber globe with region towers",
      "Gemini orchestration streamed over SSE",
      "Omniverse / Isaac Sim GPU streaming integration assets",
    ],
    tech: ["Next.js 15", "Three.js", "Gemini", "Vultr API", "NVIDIA Omniverse"],
    links: [{ label: "Live cockpit", url: "https://atlas.qubitpage.com" }],
    featured: true,
  },
  {
    slug: "picoflow",
    name: "PicoFlow",
    category: "Infrastructure",
    tagline: "The agentic settlement mesh on Arc.",
    summary:
      "PicoFlow turns AI and API calls into priced, signed, metered, ledgered and settlement-ready actions using USDC nanopayments, x402-style HTTP payment flows and Circle / Arc infrastructure.",
    highlights: ["Metered, signed and ledgered AI / API calls", "USDC nanopayments and x402-style payment flows", "Circle / Arc infrastructure"],
    tech: ["TypeScript", "USDC", "x402", "Circle", "Arc"],
    links: [
      { label: "Live demo", url: "https://picoflow.qubitpage.com" },
      { label: "Docs", url: "https://picoflow.qubitpage.com/docs" },
    ],
    featured: true,
  },
  {
    slug: "thearchitect",
    name: "The Architect",
    category: "AI agents",
    tagline: "AI-native governance and enterprise accountability platform.",
    summary:
      "A full-stack prototype for institutions, regulators and enterprises that need transparent records of money, risk and decisions, AI assistance that stays inside policy boundaries, and auditability strong enough for public trust — plus the book behind it, \"The Architect\" by Mircea S. Rusu.",
    highlights: ["Governance APIs, ledger modules and tamper-evident audit trail", "Gemini-powered analysis inside policy boundaries", "Enterprise onboarding flows and deterministic DPI security"],
    tech: ["Next.js", "TypeScript", "Gemini"],
    links: [{ label: "Latest release", url: "https://github.com/qubitpage/thearchitect/releases/latest" }],
  },
  {
    slug: "IBM-Bob-Sentinel-Security",
    name: "Bob Sentinel",
    category: "Security",
    tagline: "A pre-flight code and secret firewall.",
    summary:
      "A zero-trust security scanner that catches vulnerabilities, hard-coded secrets and unsafe code before they reach production, and shows every finding in a web dashboard with what is wrong, where, and how to fix it. Built for the IBM Bob Hackathon.",
    highlights: ["Scans a codebase in milliseconds", "Web dashboard with fixes for every finding", "CLI and API"],
    tech: ["JavaScript", "Node.js"],
  },
  {
    slug: "sentinel-vision",
    name: "Sentinel Vision Navigator",
    category: "Accessibility",
    tagline: "Voice-first assistive AI for blind and low-vision users.",
    summary:
      "An assistive AI prototype with a React Native / Expo Android app, a native Android Accessibility Service, a static web demo and the hackathon whitepaper, pitch deck and video generator sources.",
    highlights: ["Android app with Accessibility Service", "Web demo with local fallback commands", "Bring your own model API key"],
    tech: ["React Native", "Expo", "TypeScript", "Android"],
  },
  {
    slug: "qubgpu",
    name: "QubGPU — Neural Datagram Protocol",
    category: "Infrastructure",
    tagline: "Route AI training data like network packets: zero-copy, GPU-direct.",
    summary:
      "NDP replaces six data-loading layers (JSON parsing, tokenisation, padding, tensor creation, device transfer, batching) with a memory-mapped binary packet format that goes straight to GPU tensors. The README reports 5.55× training throughput on the authors' benchmark (Vultr RTX 3090, 50K examples).",
    highlights: ["Memory-mapped .qubgpu packet files", "3 data layers instead of 6", "Benchmarked against a standard pipeline on identical hardware"],
    tech: ["Python", "PyTorch", "CUDA"],
  },
  {
    slug: "QLang",
    name: "QLang",
    category: "Quantum & research",
    tagline: "A human-readable quantum programming language.",
    summary: "Write circuits in plain syntax, compile to QASM / Qiskit and run on IBM Torino, Fez and Marrakesh (156 qubits) — in the browser, no installation needed.",
    highlights: ["Compiles to QASM and Qiskit", "Runs on IBM Quantum hardware", "Browser SDK"],
    tech: ["Python", "QASM", "Qiskit", "JavaScript"],
  },
  {
    slug: "QuBIOS",
    name: "QuBIOS",
    category: "Quantum & research",
    tagline: "A quantum BIOS: fault-tolerant middleware for real quantum hardware.",
    summary:
      "A dual-layer quantum error correction and virtual-qubit escort system that wraps every computation on noisy hardware. The project reports 99.80% Bell-state fidelity on IBM Fez via its Transit Ring.",
    highlights: ["Dual-layer error correction (Steane [[7,1,3]])", "Virtual-qubit escort / Transit Ring", "Reported 99.80% Bell-state fidelity"],
    tech: ["Python", "Stim", "Qiskit", "Cirq"],
  },
  {
    slug: "quantum-longevity-research",
    name: "Quantum Longevity Research",
    category: "Quantum & research",
    tagline: "A GPU-accelerated quantum-chemistry study of ten longevity compounds.",
    summary:
      "A multi-reference quantum-chemistry pipeline run on an AMD Instinct MI300X (ROCm), published with an honest self-assessment of what was and was not computed — including a bug that was found and fixed.",
    highlights: ["10-compound study, ~5.5 hours on an AMD MI300X", "PySCF, OpenFermion and PyTorch on ROCm", "Transparent methods and limitations"],
    tech: ["Python", "PySCF", "OpenFermion", "PyTorch", "ROCm"],
  },
  {
    slug: "quantum-gravity-lab",
    name: "Quantum Gravity Lab",
    category: "Quantum & research",
    tagline: "VQE simulations of four quantum-gravity models.",
    summary:
      "Encodes four discrete quantum-gravity Hamiltonians as qubit operators and solves them with the Variational Quantum Eigensolver, validated against exact diagonalisation. As its README states, it is a demonstration of faithful encoding on near-term hardware, not a claim of new physics.",
    highlights: ["Spin-network, LQC big bounce, Regge / CDT and Wheeler-DeWitt models", "Results checked against exact eigenvalues", "Honest scope statement"],
    tech: ["Python", "Qiskit", "NumPy"],
  },
]

export const CATEGORIES: Category[] = ["Robotics", "AI agents", "E-commerce", "Infrastructure", "Quantum & research", "Security", "Accessibility"]

export const SERVICES = [
  {
    icon: "code",
    title: "Software development",
    text: "Full-stack products from idea to production: web apps, desktop apps, APIs and the infrastructure under them — built, tested and documented.",
  },
  {
    icon: "agent",
    title: "AI agents & automation",
    text: "Agents that do real work with tools — coding agents, desktop agents, governance assistants — with approvals, verification and your choice of models.",
  },
  {
    icon: "robot",
    title: "Robotics & IoT",
    text: "Robots end to end: ESP32 firmware, an open robot protocol, desktop and VR control apps, voice and AI — and warehouse robotics in simulation.",
  },
  {
    icon: "cart",
    title: "E-commerce platforms",
    text: "CarphaCom: a self-hosted commerce stack on Medusa, PostgreSQL and Next.js with a custom admin, payments and courier integrations.",
  },
  {
    icon: "atom",
    title: "Quantum & research",
    text: "Quantum software (QLang, QuBIOS, QubitPage® OS) on IBM Quantum hardware, plus GPU-accelerated research published with its methods and limits.",
  },
]

export const ACHIEVEMENTS = [
  { value: "1st", label: "place at lablab.ai AI Meets Robotics 2026 (CarphaCom Robotised)", url: "https://lablab.ai/ai-hackathons/launch-fund-ai-meets-robotics" },
  { value: "Meta", label: "Global AI Developer Hackathon 2026 — Carpathron", url: "https://github.com/qubitpage/carpathron-muse" },
  { value: "156", label: "qubit IBM Quantum systems used by QLang and QuBIOS", url: "https://github.com/qubitpage/QLang" },
]

export const projectBySlug = (slug: string) => PROJECTS.find((p) => p.slug.toLowerCase() === slug.toLowerCase())

export const fmtDate = (iso?: string) => (iso ? new Date(iso).toLocaleDateString("en-GB", { year: "numeric", month: "short", day: "numeric" }) : "")
