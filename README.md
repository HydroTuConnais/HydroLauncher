

## Features

- **Easy Installation**: Simple one-click installation for modpacks
- **Java Management**: Automatic detection and installation of appropriate Java versions
- **Mod Management**: Automatic mod installation and cleanup
- **Memory Management**: Configurable memory allocation for Minecraft
- **Discord Integration**: Rich Presence support for Discord
- **Multi-Server Support**: Manage multiple server configurations
- **Microsoft Account Authentication**: Full Microsoft account authentication flow
- **Automatic Updates**: Built-in launcher update system

## Getting Started

### Prerequisites

- Node.js (LTS recommended)
- npm or yarn
- Git (for development)

### Installation

1. Clone the repository:

```console
> git clone https://github.com/HydroTuConnais/HydroLauncher.git
> cd HydroLauncher
```

2. Install dependencies:

```console
> npm install
```

### Development

To start the application in development mode:

```console
> npm start
```

### Building

To build installers for your current platform:

```console
> npm run dist
```

To build for specific platforms:

| Platform    | Command              |
| ----------- | -------------------- |
| Windows x64 | `npm run dist:win`   |
| macOS       | `npm run dist:mac`   |
| Linux x64   | `npm run dist:linux` |

## Configuration

### Distribution Index

HydroLauncher uses a distribution index to configure servers, mods, and other settings. This is a JSON file that defines:

- Server configurations
- Required mods and files
- Java requirements
- Discord integration settings
- And more

For detailed information about the distribution index format, see the distro.md documentation.

### Java Configuration

The launcher can be configured to use specific Java versions for different Minecraft instances:

- Automatic detection of installed Java versions
- Downloading of appropriate Java versions when needed
- Server-specific Java version requirements

## Architecture

HydroLauncher is built with:

- **Electron**: For cross-platform desktop application support
- **Node.js**: For backend operations
- **HTML/CSS/JavaScript**: For the frontend interface

Key components:

- **ProcessBuilder**: Handles construction of Java processes for Minecraft
- **ConfigManager**: Manages launcher and game configuration
- **DistroAPI**: Handles downloading and processing of the distribution index
- **AuthManager**: Handles Microsoft and Mojang authentication

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE.txt file for details.

## Acknowledgments

- Based on [HeliosLauncher](https://github.com/dscalzi/HeliosLauncher) by Daniel Scalzi
- Uses [helios-core](https://github.com/dscalzi/helios-core) for core functionality