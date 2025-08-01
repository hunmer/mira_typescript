#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Load configuration from external file
let config;
try {
  const configPath = path.resolve('dependency-switch-config.json');
  const configContent = fs.readFileSync(configPath, 'utf8');
  config = JSON.parse(configContent);
} catch (error) {
  console.error('❌ Error loading configuration file:', error.message);
  console.error('Make sure dependency-switch-config.json exists in the current directory');
  process.exit(1);
}

const PACKAGE_MAPPINGS = config.packageMappings;
const TARGET_FILES = config.targetFiles;

/**
 * Display usage information
 */
function showUsage() {
  console.log(`
Usage: node switch-dependencies.js [mode] [packages...] [options]

Modes:
  online    - Switch to online versions (npm registry)
  offline   - Switch to local file paths
  list      - List available versions and paths for packages
  build     - Build and publish packages (one-click upgrade and publish)
  
Packages (optional, if not specified, all configured packages will be used):
  ${Object.keys(PACKAGE_MAPPINGS).join(', ')}

Options:
  --version=X.X.X   - Specify which online version to use (only for online mode)
  --path=file:path  - Specify which offline path to use (only for offline mode)
  --dry-run         - Show what would be done without executing (for build mode)
  --version-bump=type - Version bump type: patch, minor, major (for build mode, default: patch)

Examples:
  node switch-dependencies.js online
  node switch-dependencies.js offline  
  node switch-dependencies.js online mira-app-core --version=1.0.1
  node switch-dependencies.js offline mira-app-core --path="file:../../packages/mira-core"
  node switch-dependencies.js list
  node switch-dependencies.js list mira-app-core
  node switch-dependencies.js build
  node switch-dependencies.js build mira-app-core mira-storage-sqlite
  node switch-dependencies.js build --dry-run
  node switch-dependencies.js build --version-bump=minor
  node switch-dependencies.js build mira-app-core --version-bump=major --dry-run

Configuration:
The script uses package mappings from dependency-switch-config.json
`);
}

/**
 * List available versions and paths for packages
 * @param {string[]} targetPackages - Array of package names to list
 */
function listPackageOptions(targetPackages) {
  console.log('📋 Available package options:\n');
  
  targetPackages.forEach(packageName => {
    if (PACKAGE_MAPPINGS[packageName]) {
      const mapping = PACKAGE_MAPPINGS[packageName];
      console.log(`📦 ${packageName}:`);
      
      console.log('  Online versions:');
      if (mapping.onlineVersions && mapping.onlineVersions.length > 0) {
        mapping.onlineVersions.forEach((version, index) => {
          const isDefault = version === mapping.defaultOnline;
          console.log(`    ${index + 1}. ^${version}${isDefault ? ' (default)' : ''}`);
        });
      } else {
        console.log(`    Default: ^${mapping.defaultOnline}`);
      }
      
      console.log('  Offline paths:');
      if (mapping.offlinePaths && mapping.offlinePaths.length > 0) {
        mapping.offlinePaths.forEach((path, index) => {
          const isDefault = path === mapping.defaultOffline;
          console.log(`    ${index + 1}. ${path}${isDefault ? ' (default)' : ''}`);
        });
      } else {
        console.log(`    Default: ${mapping.defaultOffline}`);
      }
      
      console.log('  Build configuration:');
      console.log(`    Path: ${mapping.buildPath || 'Not configured'}`);
      console.log(`    Command: ${mapping.buildCommand || 'npm install && npm run build && npm publish'}`);
      
      console.log('');
    }
  });
}

/**
 * Build and publish packages
 * @param {string[]} targetPackages - Array of package names to build
 * @param {boolean} dryRun - Whether to show commands without executing
 * @param {string} versionBump - Type of version bump: patch, minor, major
 */
async function buildAndPublishPackages(targetPackages, dryRun = false, versionBump = 'patch') {
  const { exec } = require('child_process');
  const { promisify } = require('util');
  const execAsync = promisify(exec);
  
  console.log(`🔨 ${dryRun ? 'Dry run - showing' : 'Executing'} build and publish for packages: ${targetPackages.join(', ')}`);
  console.log(`📈 Version bump type: ${versionBump}\n`);
  
  for (const packageName of targetPackages) {
    if (!PACKAGE_MAPPINGS[packageName]) {
      console.warn(`⚠️  Package ${packageName} not found in configuration, skipping`);
      continue;
    }
    
    const mapping = PACKAGE_MAPPINGS[packageName];
    const buildPath = mapping.buildPath || `packages/${packageName}`;
    const buildCommand = mapping.buildCommand || 'npm install && npm run build && npm publish';
    
    console.log(`\n📦 Processing ${packageName}:`);
    console.log(`   Path: ${buildPath}`);
    
    // Step 1: Update version
    const newVersion = updatePackageVersion(buildPath, packageName, versionBump, dryRun);
    if (!newVersion) {
      console.error(`   ❌ Failed to update version for ${packageName}, skipping`);
      continue;
    }
    
    // Step 2: Execute build command
    console.log(`   Command: ${buildCommand}`);
    
    if (dryRun) {
      console.log(`   📋 Would execute: cd ${buildPath} && ${buildCommand}`);
      continue;
    }
    
    try {
      console.log(`   🔄 Executing build and publish...`);
      
      // Check if build path exists
      const buildAbsolutePath = path.resolve(buildPath);
      if (!fs.existsSync(buildAbsolutePath)) {
        console.error(`   ❌ Build path does not exist: ${buildAbsolutePath}`);
        continue;
      }
      
      // Execute the build command
      const { stdout, stderr } = await execAsync(buildCommand, { 
        cwd: buildAbsolutePath,
        maxBuffer: 1024 * 1024 * 10 // 10MB buffer
      });
      
      if (stdout) {
        console.log(`   📝 Output: ${stdout.trim()}`);
      }
      
      if (stderr) {
        console.warn(`   ⚠️  Warnings: ${stderr.trim()}`);
      }
      
      console.log(`   ✅ Successfully built and published ${packageName} v${newVersion}`);
      
    } catch (error) {
      console.error(`   ❌ Error building ${packageName}:`, error.message);
      if (error.stdout) console.log(`   📝 Stdout: ${error.stdout}`);
      if (error.stderr) console.error(`   📝 Stderr: ${error.stderr}`);
    }
  }
  
  console.log(`\n🎉 Build process completed!`);
}

/**
 * Increment version number
 * @param {string} version - Current version (e.g., "1.0.2")
 * @param {string} bumpType - Type of bump: "patch", "minor", "major"
 * @returns {string} New version
 */
function incrementVersion(version, bumpType = 'patch') {
  const parts = version.split('.').map(Number);
  
  if (parts.length !== 3) {
    throw new Error(`Invalid version format: ${version}`);
  }
  
  let [major, minor, patch] = parts;
  
  switch (bumpType) {
    case 'major':
      major += 1;
      minor = 0;
      patch = 0;
      break;
    case 'minor':
      minor += 1;
      patch = 0;
      break;
    case 'patch':
    default:
      patch += 1;
      break;
  }
  
  return `${major}.${minor}.${patch}`;
}

/**
 * Update configuration file with new version
 * @param {string} packageName - Name of the package
 * @param {string} newVersion - New version to add
 * @param {boolean} dryRun - Whether to show changes without executing
 */
function updateConfigurationFile(packageName, newVersion, dryRun = false) {
  try {
    const configPath = path.resolve('dependency-switch-config.json');
    
    if (!dryRun) {
      // Read current config
      const configContent = fs.readFileSync(configPath, 'utf8');
      const config = JSON.parse(configContent);
      
      if (config.packageMappings[packageName]) {
        const mapping = config.packageMappings[packageName];
        
        // Update defaultOnline to new version
        mapping.defaultOnline = newVersion;
        
        // Add new version to onlineVersions if not already present
        if (!mapping.onlineVersions) {
          mapping.onlineVersions = [];
        }
        
        if (!mapping.onlineVersions.includes(newVersion)) {
          mapping.onlineVersions.push(newVersion);
          mapping.onlineVersions.sort((a, b) => {
            // Sort versions properly (1.0.9 < 1.0.10)
            const aParts = a.split('.').map(Number);
            const bParts = b.split('.').map(Number);
            
            for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
              const aPart = aParts[i] || 0;
              const bPart = bParts[i] || 0;
              
              if (aPart !== bPart) {
                return aPart - bPart;
              }
            }
            return 0;
          });
        }
        
        // Write updated config back to file
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n');
        console.log(`   ✅ Updated configuration file with new version ${newVersion}`);
      }
    } else {
      console.log(`   📋 Would update configuration file:`);
      console.log(`     - Set defaultOnline to: ${newVersion}`);
      console.log(`     - Add ${newVersion} to onlineVersions array`);
    }
    
  } catch (error) {
    console.error(`   ❌ Error updating configuration file:`, error.message);
  }
}

/**
 * Update version in package.json file
 * @param {string} packagePath - Path to package.json file
 * @param {string} packageName - Name of the package (for config update)
 * @param {string} bumpType - Type of version bump
 * @param {boolean} dryRun - Whether to show changes without executing
 * @returns {string|null} New version if successful, null if failed
 */
function updatePackageVersion(packagePath, packageName, bumpType = 'patch', dryRun = false) {
  try {
    const packageJsonPath = path.join(packagePath, 'package.json');
    
    if (!fs.existsSync(packageJsonPath)) {
      console.error(`   ❌ package.json not found in: ${packagePath}`);
      return null;
    }
    
    const content = fs.readFileSync(packageJsonPath, 'utf8');
    const packageJson = JSON.parse(content);
    
    if (!packageJson.version) {
      console.error(`   ❌ No version field found in: ${packageJsonPath}`);
      return null;
    }
    
    const oldVersion = packageJson.version;
    const newVersion = incrementVersion(oldVersion, bumpType);
    
    console.log(`   📈 Version: ${oldVersion} → ${newVersion} (${bumpType})`);
    
    if (!dryRun) {
      packageJson.version = newVersion;
      fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
      console.log(`   ✅ Version updated in package.json`);
      
      // Update configuration file with new version
      updateConfigurationFile(packageName, newVersion, dryRun);
    } else {
      console.log(`   📋 Would update version in package.json`);
      
      // Show what would be updated in configuration file
      updateConfigurationFile(packageName, newVersion, dryRun);
    }
    
    return newVersion;
    
  } catch (error) {
    console.error(`   ❌ Error updating version in ${packagePath}:`, error.message);
    return null;
  }
}

/**
 * Parse command line arguments
 * @param {string[]} args - Command line arguments
 * @returns {object} Parsed arguments
 */
function parseArguments(args) {
  const result = {
    mode: '',
    packages: [],
    version: null,
    path: null,
    dryRun: false,
    versionBump: 'patch'
  };
  
  if (args.length === 0) {
    return result;
  }
  
  result.mode = args[0];
  
  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    
    if (arg.startsWith('--version=')) {
      result.version = arg.substring(10);
    } else if (arg.startsWith('--path=')) {
      result.path = arg.substring(7);
    } else if (arg.startsWith('--version-bump=')) {
      const bumpType = arg.substring(15);
      if (['patch', 'minor', 'major'].includes(bumpType)) {
        result.versionBump = bumpType;
      } else {
        console.warn(`⚠️  Invalid version bump type: ${bumpType}, using 'patch'`);
      }
    } else if (arg === '--dry-run') {
      result.dryRun = true;
    } else if (!arg.startsWith('--')) {
      result.packages.push(arg);
    }
  }
  
  return result;
}
/**
 * Update dependencies in a package.json file
 * @param {string} filePath - Path to package.json file
 * @param {string} mode - 'online' or 'offline'
 * @param {string[]} targetPackages - Array of package names to update
 * @param {string|null} customVersion - Custom version for online mode
 * @param {string|null} customPath - Custom path for offline mode
 */
function updatePackageJson(filePath, mode, targetPackages, customVersion = null, customPath = null) {
  try {
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  File not found: ${filePath}`);
      return false;
    }

    // Read and parse package.json
    const content = fs.readFileSync(filePath, 'utf8');
    const packageJson = JSON.parse(content);
    
    let hasChanges = false;

    // Update dependencies
    ['dependencies', 'devDependencies', "peerDependencies"].forEach(depType => {
      if (packageJson[depType]) {
        targetPackages.forEach(packageName => {
          if (packageJson[depType][packageName] && PACKAGE_MAPPINGS[packageName]) {
            const mapping = PACKAGE_MAPPINGS[packageName];
            const oldValue = packageJson[depType][packageName];
            let newValue;
            
            if (mode === 'online') {
              // Use custom version or default
              const version = customVersion || mapping.defaultOnline;
              const availableVersions = mapping.onlineVersions || [mapping.defaultOnline];
              if (!availableVersions.includes(version)) {
                console.warn(`⚠️  Version ${version} not found for ${packageName}, using default`);
                newValue = `^${mapping.defaultOnline}`;
              } else {
                newValue = `^${version}`;
              }
            } else if (mode === 'offline') {
              // Use custom path or default
              const path = customPath || mapping.defaultOffline;
              const availablePaths = mapping.offlinePaths || [mapping.defaultOffline];
              if (!availablePaths.includes(path)) {
                console.warn(`⚠️  Path ${path} not found for ${packageName}, using default`);
                newValue = mapping.defaultOffline;
              } else {
                newValue = path;
              }
            }
            
            packageJson[depType][packageName] = newValue;
            
            if (oldValue !== newValue) {
              console.log(`  ${packageName}: ${oldValue} → ${newValue}`);
              hasChanges = true;
            }
          }
        });
      }
    });

    // Write back to file if there were changes
    if (hasChanges) {
      fs.writeFileSync(filePath, JSON.stringify(packageJson, null, 2) + '\n');
      console.log(`✅ Updated: ${filePath}`);
      return true;
    } else {
      console.log(`⚪ No changes needed: ${filePath}`);
      return false;
    }

  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
    return false;
  }
}

/**
 * Main function
 */
async function main() {
  const rawArgs = process.argv.slice(2);
  
  if (rawArgs.length === 0 || rawArgs.includes('--help') || rawArgs.includes('-h')) {
    showUsage();
    return;
  }

  const parsed = parseArguments(rawArgs);
  const mode = parsed.mode;

  if (!['online', 'offline', 'list', 'build'].includes(mode)) {
    console.error('❌ Invalid mode. Use "online", "offline", "list", or "build"');
    showUsage();
    process.exit(1);
  }

  // Determine which packages to work with
  const specifiedPackages = parsed.packages;
  const targetPackages = specifiedPackages.length > 0 
    ? specifiedPackages.filter(pkg => PACKAGE_MAPPINGS[pkg])
    : Object.keys(PACKAGE_MAPPINGS);

  if (specifiedPackages.length > 0) {
    const invalidPackages = specifiedPackages.filter(pkg => !PACKAGE_MAPPINGS[pkg]);
    if (invalidPackages.length > 0) {
      console.warn(`⚠️  Unknown packages (will be ignored): ${invalidPackages.join(', ')}`);
    }
  }

  if (targetPackages.length === 0) {
    console.error('❌ No valid packages specified');
    process.exit(1);
  }

  // Handle list mode
  if (mode === 'list') {
    listPackageOptions(targetPackages);
    return;
  }

  // Handle build mode
  if (mode === 'build') {
    await buildAndPublishPackages(targetPackages, parsed.dryRun, parsed.versionBump);
    return;
  }

  // Validate custom options for online/offline modes
  if (mode === 'online' && parsed.version) {
    const hasValidVersion = targetPackages.some(pkg => 
      PACKAGE_MAPPINGS[pkg] && 
      PACKAGE_MAPPINGS[pkg].onlineVersions && 
      PACKAGE_MAPPINGS[pkg].onlineVersions.includes(parsed.version)
    );
    if (!hasValidVersion) {
      console.warn(`⚠️  Custom version ${parsed.version} not found in any target package`);
    }
  }

  if (mode === 'offline' && parsed.path) {
    const hasValidPath = targetPackages.some(pkg => 
      PACKAGE_MAPPINGS[pkg] && 
      PACKAGE_MAPPINGS[pkg].offlinePaths && 
      PACKAGE_MAPPINGS[pkg].offlinePaths.includes(parsed.path)
    );
    if (!hasValidPath) {
      console.warn(`⚠️  Custom path ${parsed.path} not found in any target package`);
    }
  }

  console.log(`🔄 Switching to ${mode} mode for packages: ${targetPackages.join(', ')}`);
  if (parsed.version) console.log(`   Using custom version: ${parsed.version}`);
  if (parsed.path) console.log(`   Using custom path: ${parsed.path}`);
  console.log('');

  // Process each target file
  let totalUpdated = 0;
  TARGET_FILES.forEach(relativePath => {
    const absolutePath = path.resolve(relativePath);
    console.log(`\n📁 Processing: ${relativePath}`);
    
    if (updatePackageJson(absolutePath, mode, targetPackages, parsed.version, parsed.path)) {
      totalUpdated++;
    }
  });

  console.log(`\n🎉 Process completed! Updated ${totalUpdated} file(s).`);
  
  if (totalUpdated > 0) {
    console.log(`\n💡 Don't forget to run 'npm install' in the updated packages to apply changes.`);
  }
}

// Run the script
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  });
}

module.exports = {
  updatePackageJson,
  listPackageOptions,
  buildAndPublishPackages,
  incrementVersion,
  updatePackageVersion,
  updateConfigurationFile,
  parseArguments,
  PACKAGE_MAPPINGS,
  TARGET_FILES
};
