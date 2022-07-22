# Cridium Storage Server

Backend implementation of [Cridium](https://github.com/Cridium) Storage built with [DeepKit](https://deepkit.io).

WIP: missing features and not ready for deployment.

## Installation

1. ```sh
   git clone https://github.com/Cridium/storage-server.git
   cd storage-server
   npm install
   cp .env.example .env
   ```
1. Configure application settings in `.env`

## Usage

- `npm run app` would bootstrap the application without any further instructions, which would print a list of CLI commands available in the application. You can follow the printed information to run certain commands like `npm run app migration:create`.
- `npm run dev` would start the application as a server and watch file system changes in the workspace for development.

## Known Issues

Because of some known issues of the current release of DeepKit, some features are temporarily not available:

- DeepKit Debugger is not available because our entity classes cannot be serialized properly by the Debugger.
