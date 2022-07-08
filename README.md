# Cridium Server

Backend implementation of [Cridium](https://github.com/Cridium) built with [DeepKit](https://deepkit.io).

WIP: missing features and not ready for deployment.

## Installation

1. ```sh
   git clone https://github.com/Cridium/cridium-server.git
   cd cridium-server
   npm install
   cp .env.example .env
   ```
1. Configure application settings in `.env`

## Usage

- `npm run app` would bootstrap the application without any further instructions, which would print a list of CLI commands available in the application. You can follow the printed information to run certain commands like `npm run app migration:create`.
- `npm run dev` would start the application as a server and watch file system changes in the workspace for developing.

## Known Issues

Because of some known issues of the current release of DeepKit, some features are temporarily not available:

- When enabling `APP_FRAMEWORK_DEBUG`, the ORM part of the DeepKit Debugger is not available.
- Database related features like `APP_FRAMEWORK_MIGRATE_ON_STARTUP` and `npm run app migration` will not work as expected. (thus the server will not work properly without manual database migrations)
