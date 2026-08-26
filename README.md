# Aegis Guard 🛡️ — Adult Content Blocker & Anti-Relapse Focus Engine

> **A production-grade, ultra-low RAM (< 5MB) system-wide adult content blocker, distraction sinkhole, and anti-relapse engine for Windows.**  
> Built with **Tauri v2 (Rust + React / TypeScript)**.

[![Platform - Windows](https://img.shields.io/badge/Platform-Windows_10%2F11-0078D6?logo=windows)](https://github.com/NY-Henry/aegis-adult-content-blocker)
[![Rust](https://img.shields.io/badge/Backend-Rust-dea584?logo=rust)](https://www.rust-lang.org/)
[![Tauri v2](https://img.shields.io/badge/Framework-Tauri_v2-24C8D8?logo=tauri)](https://tauri.app/)
[![React](https://img.shields.io/badge/Frontend-React_19_+_TypeScript-61DAFB?logo=react)](https://react.dev/)
[![License - MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![RAM Footprint](https://img.shields.io/badge/RAM_Usage-%3C_5_MB-success)](#-ultra-low-ram-architecture)

---

## 📥 Quick Download & Installation

### Option 1: One-Click Windows Installer (Recommended)
1. Go to the [**Releases**](https://github.com/NY-Henry/aegis-adult-content-blocker/releases) page.
2. Download **`Aegis Guard_1.0.0_x64-setup.exe`**.
3. Run the installer and launch **Aegis Guard** from your Start menu or Desktop shortcut.

### Option 2: Portable Executable (No Install Required)
1. Download **`aegis-shield.exe`** from the [Releases](https://github.com/NY-Henry/aegis-adult-content-blocker/releases) page.
2. Right-click $\rightarrow$ **"Run as administrator"**.

---

## 📖 How to Use Aegis Guard (Step-by-Step)

### Step 1: Launch & Ensure Administrator Rights
* Open **Aegis Guard**.
* Look at the top right of the header. It should show a green badge: **`Admin Active`**.
* *Note:* If running as a standard user, click the golden **"Elevate to Admin"** button to allow the app to configure network DNS and browser policies.

### Step 2: Arm the Master Shield
* On the **Protection Shield** tab, click **"Activate Protection"**.
* The hero shield will turn **Green (Armed)** and all 4 defense layers will activate across your system.

### Step 3: Set Your Security PIN & Anti-Relapse Cooldown
* Switch to the **Settings & DNS** tab.
* Under **Security & PIN Protection**, click **"Set Master Security PIN"** and enter a 4+ digit PIN.
* Under **Unlock Delay Cooldown**, select your desired waiting period (e.g. **15 Minutes** or **1 Hour**).
* **Why this works:** If you ever get an impulsive urge to disable protection, the app forces an unskippable countdown before the toggle activates, giving dopamine cravings time to subside.

### Step 4: Sync Extended Blocklists (Optional)
* Go to the **Rules & Blocklists** tab.
* Click **"Sync 100k+ Blocklist"** to download and sinkhole community-verified adult domains directly into your Windows `hosts` file.
* You can also add custom domains or specific search keywords you want the sentinel to monitor.

### Step 5: Minimize to System Tray
* Click the **'X'** button on the window. Aegis Guard will minimize quietly to your **Windows System Tray** (near the clock in the bottom-right corner) and guard your PC 24/7.

---

## ⚡ The 4 Defense Layers Explained

```
┌─────────────────────────────────────────────────────────────┐
│                    AEGIS GUARD DASHBOARD                    │
│   (Cyber-Dark Glassmorphism UI, PIN Protection & Cooldown) │
└───────────────┬─────────────────────────────┬───────────────┘
                │                             │
    ┌───────────▼──────────┐      ┌───────────▼──────────────┐
    │   SYSTEM & NETWORK   │      │    BROWSER & RUNTIME     │
    ├──────────────────────┤      ├──────────────────────────┤
    │ 1. Family DNS Lock   │      │ 3. Browser Lockdown      │
    │    (Cloudflare 1.1.1.3      │    (Disable Incognito,   │
    │     / CleanBrowsing) │      │     Force SafeSearch,    │
    │    → 0 MB Active RAM │      │     Disable DoH Bypass)  │
    │                      │      │    → 0 MB Active RAM     │
    │ 2. Hosts Sinkhole    │      │                          │
    │    (15k+ adult       │      │ 4. Keyword Sentinel      │
    │     domains -> 0.0.0.0      │    (Foreground Win32     │
    │     + SafeSearch VIPs)      │     watchdog scanner)    │
    │    → 0 MB Active RAM │      │    → ~3 MB RAM in tray   │
    └──────────────────────┘      └──────────────────────────┘
```

1. **Family DNS Resolver (Network Layer)**:
   * System-wide DNS lock to **Cloudflare Family (`1.1.1.3`)**, **CleanBrowsing**, or **AdGuard Family**.
   * Resolves adult domains to null at the network level before webpage requests are made.
2. **Local Hosts Sinkhole & SafeSearch VIPs (System Layer)**:
   * Kernel-level sinkhole mapping explicit domains to `0.0.0.0` in `C:\Windows\System32\drivers\etc\hosts`.
   * Enforces strict **SafeSearch & YouTube Restricted Mode VIPs** for Google, Bing, DuckDuckGo, and YouTube.
3. **Browser Policy Lockdown (Registry Layer)**:
   * Disables **Incognito / InPrivate Browsing** on Chrome, Edge, Brave, and Firefox via Windows Registry (`HKLM\SOFTWARE\Policies`).
   * Forces **Strict SafeSearch** and **Strict YouTube Mode** inside browser engines.
   * **Disables DNS-over-HTTPS (DoH)** to prevent browsers from bypassing system DNS rules.
4. **Real-time Window Sentinel (Watchdog Layer)**:
   * Native Win32 background scanner inspecting active foreground window titles every 400ms.
   * If explicit search keywords or trigger titles are detected, it immediately closes or minimizes the offending window.

---

## 📊 Ultra-Low RAM Architecture

| Metric | Aegis Guard | Traditional Electron Blockers |
| :--- | :--- | :--- |
| **Idle RAM in Background (Tray)** | **~3 – 5 MB** | 150 – 300 MB |
| **Idle CPU Usage** | **< 0.01%** | 1 – 5% |
| **DNS & Kernel Filtering Overhead** | **0 MB** *(Handled by Windows kernel)* | N/A |
| **Installer Size** | **~3.0 MB** | 85 – 140 MB |

---

## 🆘 Emergency System Reset Tool

You are always in full control of your machine. If you ever need to instantly revert all network settings and policies without opening the app:

* Double-click [`Emergency-Reset.bat`](Emergency-Reset.bat).
* It immediately reverts network DNS to DHCP, restores original hosts file, and removes browser policies.

---

## 🛠️ Developer Setup & How to Contribute

We welcome contributions from developers worldwide! Whether you want to add new blocklist sources, improve multi-language keyword detection, or build macOS/Linux support.

### Prerequisites:
* [Rust & Cargo](https://rustup.rs/) (1.75+)
* [Node.js](https://nodejs.org/) (v18+)

### Development Workflow:
```bash
# 1. Clone the repository
git clone https://github.com/NY-Henry/aegis-adult-content-blocker.git
cd aegis-adult-content-blocker

# 2. Install frontend dependencies
npm install

# 3. Run development server (Open terminal as Administrator)
npm run tauri dev

# 4. Build standalone production bundles (.exe & .msi)
npm run tauri build
```

### Contribution Guidelines:
1. **Fork** the repository.
2. Create your Feature Branch: `git checkout -b feature/AmazingFeature`
3. Commit your changes: `git commit -m 'Add AmazingFeature'`
4. Push to the branch: `git push origin feature/AmazingFeature`
5. Open a **Pull Request**.

---

## 📄 License

Distributed under the **MIT License**. See [`LICENSE`](LICENSE) for details.

---

<p align="center">
  Built with focus, resilience, and privacy in mind. 🛡️
</p>
