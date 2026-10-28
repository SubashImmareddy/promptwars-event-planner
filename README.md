# NexusPlan: AI-Powered Event Architect

![NexusPlan Version](https://img.shields.io/badge/Version-2.0-4F46E5?style=for-the-badge)
![Tech Stack](https://img.shields.io/badge/Stack-HTML5%20|%20CSS3%20|%20Vanilla%20JS-20232A?style=for-the-badge)
![AI Engine](https://img.shields.io/badge/AI-Google%20Gemini%203.8%20Flash-00A67E?style=for-the-badge)

NexusPlan is an enterprise-grade, hybrid AI event architecture dashboard built for the 2026 PromptWars Challenge. It bridges the gap between creative event ideation and strict logistical execution, allowing event planners to generate, manage, and export comprehensive project blueprints in seconds.

**LIVE EVALUATION URL:** [https://nexusplan-ai.netlify.app/](https://nexusplan-ai.netlify.app/)
**BACKUP EDGE URL (Vercel):** [https://nexusplan-ai.vercel.app/](https://nexusplan-ai.vercel.app/)

---

## PromptWars Evaluation Guide (For Judges)

Welcome to my submission! There is no need to clone this repository or run local servers. The application is fully deployed and production-ready on the edge.

To evaluate this application instantly:
1. **Access the Portal**: Click the live URL above.
2. **Bypass the Gatekeeper**: Use the built-in staging credentials to enter the admin dashboard:
   * **Username:** `admin`
   * **Password:** `promptwars`
3. **Generate an Event**: Click "Create New Event" in the sidebar, enter your parameters (e.g., a Corporate Summit in Hyderabad with a ₹150,000 budget), and click "Initialize Event Workspace."
4. **The Hackathon Fail-Safe**: NexusPlan is built to survive heavy judging traffic. If the shared free-tier Netlify backend hits its standard 10-second timeout limit, the system will automatically intercept the error and inject a perfectly scaled, localized 4-Phase Demo Plan. You will never be left staring at a loading screen or a broken UI.

---

## The Evolution: Version 1.0 to 2.0

I built NexusPlan iteratively to ensure a rock-solid foundation before introducing complex AI integrations. 

### Version 1.0: The Foundation
V1 focused on building a secure, accessible, and beautiful UI framework.
* **Authentication Gatekeeper:** A polished login portal protecting the admin workspace.
* **Smart System Theme Detection:** Automatically adapts to your OS preference (Dark/Light mode) on the first visit, with CSS variables powering seamless glassmorphism transitions.
* **Accessibility First:** Granular control over global font sizing without breaking layout grids.
* **Cloud Sync & Local Persistence:** Supabase PostgreSQL integration for real-time cloud saving, with a robust local storage fallback if offline.

### Version 2.0: The "Architect" Upgrade (Current)
V2 transformed the static dashboard into an autonomous AI planning engine.
* **Strict JSON Automation:** I upgraded the Gemini prompt to output strict JSON data. The system now autonomously parses AI responses to instantly inject structured expenses and task arrays directly into the application state.
* **Smart Model Auto-Discovery:** Instead of hardcoding AI endpoints that might deprecate, the system dynamically scans the Google API for available models and prioritizes the newest and fastest (`gemini-3.8-flash`), falling back automatically if needed.
* **Interactive Financials:** A live, dynamic Chart.js doughnut chart visually calculates allocated funds, spent budget, and overage warnings in real-time as expenses are generated or manually added.
* **4-Phase Timeline Architecture:** The AI now mathematically groups tasks chronologically into Phase 1 (Foundation), Phase 2 (Vendor Lock-in), Phase 3 (Final Prep), and Phase 4 (Execution), replacing overwhelming generic to-do lists.
* **Executive PDF Export:** A one-click generation tool that compiles the AI strategy, budget breakdown, and 4-phase checklist into a clean, printable PDF report ready to be handed to clients.

---

## Why NexusPlan is Highly Practical

In the real-world event management industry, planners waste hours bridging the gap between client brainstorming and actual spreadsheet creation. NexusPlan solves this by unifying the workflow:
1. **Time-to-Value:** What normally takes hours (drafting a budget baseline and task timeline) takes seconds.
2. **Contextual Awareness:** The AI mathematically ties the generated expense costs to your specific total budget (e.g., automatically allocating 40% to venue hire).
3. **Client-Ready Deliverables:** The Executive PDF Export allows a planner to take a client call, generate a plan, and instantly export a professional blueprint while still on the phone.

---

## Technical Stack

* **Frontend:** HTML5, CSS3 (Custom Variables, Flexbox/Grid), Vanilla JavaScript (ES6+)
* **Visualization:** Chart.js (Dynamic canvas rendering)
* **Backend / Database:** Supabase (PostgreSQL) & LocalStorage (Offline redundancy)
* **AI Engine:** Google Gemini AI API (`gemini-3.8-flash` via REST)
* **Deployment:** Netlify (Edge deployment & Serverless fallback functions)

---
*Designed and engineered by Subash Reddy for the 2026 PromptWars Challenge.*
