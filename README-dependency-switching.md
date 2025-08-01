# Dependency Switching Script

This script allows you to switch between offline (local file paths) and online (npm registry versions) for specified packages in your package.json files.

## Files

- `switch-dependencies.js` - Main Node.js script
- `dependency-switch-config.json` - Configuration file
- `switch-dependencies.ps1` - PowerShell wrapper (Windows)
- `switch-dependencies.bat` - Batch file wrapper (Windows)

## Configuration

Edit `dependency-switch-config.json` to configure:

1. **Package Mappings**: Add packages you want to switch between offline/online modes
2. **Target Files**: Specify which package.json files to update

```json
{
  "packageMappings": {
    "mira-app-core": {
      "onlineVersions": [
        "1.0.2",
        "1.0.1", 
        "0.9.5"
      ],
      "offlinePaths": [
        "file:../mira-core",
        "file:D:/mira_typescript/packages/mira-core",
        "file:../../packages/mira-core"
      ],
      "defaultOnline": "1.0.2",
      "defaultOffline": "file:../mira-core"
    },
    "mira-storage-sqlite": {
      "onlineVersions": [
        "1.0.0",
        "0.9.0"
      ],
      "offlinePaths": [
        "file:../mira-storage-sqlite", 
        "file:D:/mira_typescript/packages/mira-storage-sqlite/"
      ],
      "defaultOnline": "1.0.0",
      "defaultOffline": "file:../mira-storage-sqlite"
    }
  },
  "targetFiles": [
    "plugins/plugins/mira_thumb/package.json",
    "packages/mira-core/package.json",
    "packages/mira-server/package.json"
  ]
}
```

### Configuration Properties

- **onlineVersions**: Array of available npm registry versions
- **offlinePaths**: Array of available local file paths
- **defaultOnline**: Default version to use when switching to online mode
- **defaultOffline**: Default path to use when switching to offline mode

## Usage

### Node.js (Direct)

```bash
# List available versions and paths for all packages
node switch-dependencies.js list

# List options for specific packages
node switch-dependencies.js list mira-app-core

# Switch all configured packages to online mode (using defaults)
node switch-dependencies.js online

# Switch all configured packages to offline mode (using defaults)
node switch-dependencies.js offline

# Switch specific packages to online mode with custom version
node switch-dependencies.js online mira-app-core --version=1.0.1

# Switch specific packages to offline mode with custom path
node switch-dependencies.js offline mira-app-core --path="file:../../packages/mira-core"

# Switch multiple packages
node switch-dependencies.js online mira-app-core mira-storage-sqlite

# Show help
node switch-dependencies.js --help
```

### PowerShell (Windows)

```powershell
# List available options
.\switch-dependencies.ps1 list

# Switch all packages to online mode (using defaults)
.\switch-dependencies.ps1 online

# Switch all packages to offline mode (using defaults)
.\switch-dependencies.ps1 offline

# Switch with custom version
.\switch-dependencies.ps1 online -Packages mira-app-core -Version "1.0.1"

# Switch with custom path  
.\switch-dependencies.ps1 offline -Packages mira-app-core -Path "file:../../packages/mira-core"

# Switch specific packages
.\switch-dependencies.ps1 online -Packages mira-app-core,mira-storage-sqlite
```

### Batch File (Windows)

```cmd
# Switch all packages to online mode
switch-dependencies.bat online

# Switch all packages to offline mode
switch-dependencies.bat offline

# Switch specific packages
switch-dependencies.bat online mira-app-core
switch-dependencies.bat offline mira-app-core mira-storage-sqlite
```

## What the Script Does

1. **Online Mode**: Changes package references from `"file:../path"` to `"^1.0.0"` (npm registry versions)
2. **Offline Mode**: Changes package references from `"^1.0.0"` to `"file:../path"` (local file paths)

## Example Output

```
🔄 Switching to offline mode for packages: mira-app-core, mira-storage-sqlite

📁 Processing: plugins/plugins/mira_thumb/package.json
  mira-app-core: ^1.0.2 → file:../mira-core
  mira-storage-sqlite: ^1.0.0 → file:../mira-storage-sqlite
✅ Updated: plugins/plugins/mira_thumb/package.json

📁 Processing: packages/mira-core/package.json
  mira-storage-sqlite: ^1.0.0 → file:../mira-storage-sqlite
✅ Updated: packages/mira-core/package.json

📁 Processing: packages/mira-server/package.json
  mira-app-core: ^1.0.2 → file:../mira-core
✅ Updated: packages/mira-server/package.json

🎉 Process completed! Updated 3 file(s).

💡 Don't forget to run 'npm install' in the updated packages to apply changes.
```

## After Running the Script

Remember to run `npm install` in the affected packages to apply the dependency changes:

```bash
# For offline mode (after switching to file: paths)
cd packages/mira-core && npm install
cd packages/mira-server && npm install
cd plugins/plugins/mira_thumb && npm install

# For online mode (after switching to npm versions)
cd packages/mira-core && npm install
cd packages/mira-server && npm install
cd plugins/plugins/mira_thumb && npm install
```

## Adding New Packages

To add support for new packages, edit `dependency-switch-config.json`:

1. Add the package to `packageMappings` with its version and local path
2. The package will automatically be detected in all target files

```json
{
  "packageMappings": {
    "mira-app-core": {
      "version": "1.0.2",
      "path": "file:../mira-core"
    },
    "your-new-package": {
      "version": "2.1.0",
      "path": "file:../your-package-path"
    }
  }
}
```
