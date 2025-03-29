// This script prepares your app for mobile deployment by running the necessary 
// Capacitor commands to generate native projects for iOS and Android.

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

// Print styled message
function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Run a command and return the output
function run(command, options = {}) {
  try {
    log(`Running: ${command}`, 'cyan');
    return execSync(command, {
      stdio: 'inherit',
      ...options
    });
  } catch (error) {
    log(`Error running command: ${command}`, 'red');
    log(error.toString(), 'red');
    process.exit(1);
  }
}

// Check if Capacitor is properly set up
function checkCapacitorSetup() {
  if (!fs.existsSync('./capacitor.config.ts')) {
    log('Capacitor config file not found. Make sure you have initialized Capacitor in your project.', 'red');
    process.exit(1);
  }
  
  // Check for required Capacitor packages
  const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
  const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
  
  const requiredPackages = [
    '@capacitor/core', 
    '@capacitor/cli', 
    '@capacitor/android', 
    '@capacitor/ios'
  ];
  
  const missingPackages = requiredPackages.filter(pkg => !dependencies[pkg]);
  
  if (missingPackages.length > 0) {
    log(`Missing required Capacitor packages: ${missingPackages.join(', ')}`, 'red');
    log('Please install them using npm or yarn', 'yellow');
    process.exit(1);
  }
}

// Create platform-specific resources
function createResources() {
  log('Creating app icon and splash screen resources...', 'blue');
  
  // Check if the resources directory exists
  if (!fs.existsSync('./resources')) {
    fs.mkdirSync('./resources');
  }
  
  if (!fs.existsSync('./resources/icon.png')) {
    log('Icon template file not found. Using default icon from project.', 'yellow');
    // Copy the icon from the project root
    if (fs.existsSync('./generated-icon.png')) {
      fs.copyFileSync('./generated-icon.png', './resources/icon.png');
    } else {
      log('No icon found in project. Please add a icon.png file (1024x1024px) to the resources directory.', 'yellow');
    }
  }
  
  if (!fs.existsSync('./resources/splash.png')) {
    log('Splash screen template file not found. Please add a splash.png file (2732x2732px) to the resources directory.', 'yellow');
  }
  
  // If cordova-res is installed, use it to generate the resources
  try {
    execSync('npx cordova-res --version', { stdio: 'pipe' });
    log('Generating resources using cordova-res...', 'blue');
    run('npx cordova-res android --skip-config --copy');
    run('npx cordova-res ios --skip-config --copy');
  } catch (error) {
    log('cordova-res not found. Skipping resource generation.', 'yellow');
    log('You can install it using: npm install -g cordova-res', 'yellow');
  }
}

// Build the app for production
function buildApp() {
  log('Building app for production...', 'blue');
  run('npm run build');
}

// Sync the web code with native platforms
function syncWithNative() {
  log('Syncing web code with native platforms...', 'blue');
  run('npx cap sync');
}

// Copy web assets to native platforms
function copyAssets() {
  log('Copying web assets to native platforms...', 'blue');
  run('npx cap copy');
}

// Update native dependencies
function updateNativeDeps() {
  log('Updating native dependencies...', 'blue');
  run('npx cap update');
}

// Open native IDEs
function openNativeIdes() {
  const args = process.argv.slice(2);
  const openIos = args.includes('--ios') || args.includes('-i');
  const openAndroid = args.includes('--android') || args.includes('-a');
  
  if (openIos) {
    log('Opening iOS project in Xcode...', 'blue');
    run('npx cap open ios');
  }
  
  if (openAndroid) {
    log('Opening Android project in Android Studio...', 'blue');
    run('npx cap open android');
  }
  
  if (!openIos && !openAndroid) {
    log('No platform specified. Use --ios/-i or --android/-a to open the respective IDE.', 'yellow');
  }
}

// Main function
function main() {
  log('=========================================', 'bright');
  log('  Capacitor Mobile App Preparation Tool  ', 'bright');
  log('=========================================', 'bright');
  
  checkCapacitorSetup();
  createResources();
  buildApp();
  syncWithNative();
  copyAssets();
  updateNativeDeps();
  
  log('=========================================', 'bright');
  log('  Mobile preparation completed!  ', 'green');
  log('=========================================', 'bright');
  
  log('To open the native projects in their respective IDEs:', 'yellow');
  log('  - For iOS: npm run mobile -- --ios', 'yellow');
  log('  - For Android: npm run mobile -- --android', 'yellow');
  
  // Check if we should open native IDEs
  if (process.argv.length > 2) {
    openNativeIdes();
  }
}

// Run the main function
main();