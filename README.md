# Cridium Server

This is the server of Cridium, written in TypeScript with the [DeepKit](https://deepkit.io) framework.

## How to debug

### Prerequisites

1. Git and Nodejs 16+ installed.
2. `python3` and `build-essential` installed if you're on Linux, or follow [`node-gyp`'s guideline](https://github.com/nodejs/node-gyp#on-windows) if you're on Windows.

### Steps

1. Clone the repository, and install the dependencies

```bash
git clone https://github.com/Cridium/cridium-server.git
cd cridium-server
npm install
```

`npm install` will install all the dependencies and rebuild native packages with `node-gyp`, if it fails, recheck step 2 in prerequisites.

2. Copy the example configuration file `.env.example` to `.env` and modify the following

```ini
APP_FRAMEWORK_DEBUG=false
```

to

```ini
APP_FRAMEWORK_DEBUG=true
```

3. Run `npm run dev`

And it's running! Go to your browser and open `http://localhost:8080/_debug` (on WSL, the port will be automatically forwarded to host, so you can use `localhost` as well), you'll see the DeepKit Debugger.

## License

Apache License 2.0
