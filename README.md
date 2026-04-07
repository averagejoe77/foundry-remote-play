# Foundry Remote Play

Foundry Remote Play is a streamlined, Electron-based thin-client wrapper for Foundry Virtual Tabletop (Foundry VTT). This application is designed to let you connect to remote Foundry VTT servers and play your character directly, minimizing the clutter of the standard Foundry user interface for a focused player experience.

## Features

- **Campaign Launcher Dashboard**: A polished, native-feeling dashboard to manage and launch into your different campaigns.
- **Custom Loading Overlay**: A sophisticated loading screen that seamlessly masks the Foundry VTT background login and initialization process. It only reveals the game board once your character sheet is fully rendered and ready for gameplay.
- **Server Connection Management**: Easily add, edit, and remove server configurations and user credentials.
- **One-Click Remote Connections**: Connect immediately to your saved campaigns without having to repeatedly log in.
- **Distraction-Free Gaming**: Optimized for players to focus purely on their characters and the core game.

## Tech Stack

This project is built using:

- **Electron**: Cross-platform desktop application framework.
- **Vue 3**: Frontend framework utilizing the Composition API and `<script setup>`.
- **Vite**: Next-generation frontend tooling for blazing-fast local development and builds.
- **Tailwind CSS**: Utility-first CSS framework for beautifully styled UI components.
- **TypeScript**: Static type-checking for more robust code.

## Development Setup

To get started with local development:

1. Clone the repository.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```

## Building for Production

To build the desktop executable for your operating system, simply run:

```bash
npm run build
```

Once the process finishes, the compiled binaries and installers will be located in the `release/` directory.
