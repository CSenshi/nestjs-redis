#!/usr/bin/env node

const {
  execSync
} = require('child_process');
const {
  readdirSync,
  existsSync,
  readFileSync,
  writeFileSync
} = require('fs');
const {
  join
} = require('path');

const DIST_PACKAGES_DIR = 'dist/packages';


function getLatestVersion(packageName = 'kit') {
  const packageJsonPath = join(DIST_PACKAGES_DIR, packageName, 'package.json');
  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
  return packageJson.version;
}

function changeVersionsInKitPackageJson() {
  const kitPackageJsonPath = join(DIST_PACKAGES_DIR, 'kit', 'package.json');
  const kitPackageJson = JSON.parse(readFileSync(kitPackageJsonPath, 'utf8'));
  const version = getLatestVersion();

  kitPackageJson.dependencies = Object.fromEntries(
    Object.entries(kitPackageJson.dependencies).map(([key, value]) => {
      if (value.startsWith('workspace:')) {
        return [key, version];
      }
      return [key, value];
    }),
  );

  writeFileSync(kitPackageJsonPath, JSON.stringify(kitPackageJson, null, 2));
}

function publishKit() {
  console.log('🚀 Publishing packages...');

  if (!existsSync(DIST_PACKAGES_DIR)) {
    console.error(`❌ Directory ${DIST_PACKAGES_DIR} does not exist`);
    process.exit(1);
  }

  const packageDirs = readdirSync(DIST_PACKAGES_DIR, {
      withFileTypes: true
    })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name);

  console.log(
    `📦 Found ${packageDirs.length} packages: ${packageDirs.join(', ')}`,
  );

  const packageDir = 'kit';

  const packagePath = join(DIST_PACKAGES_DIR, packageDir);

  if (!existsSync(join(packagePath, 'package.json'))) {
    console.log(`⚠️  Skipping ${packageDir}: no package.json found`);
    return;
  }

  try {
    console.log(`📤 Publishing ${packageDir}...`);
    execSync('pnpm publish --access public --no-git-checks', {
      cwd: packagePath,
      stdio: 'inherit',
    });
    console.log(`✅ Successfully published ${packageDir}`);
  } catch (error) {
    console.error(`❌ Failed to publish ${packageDir}:`, error.message);
    process.exit(1);
  }
}

changeVersionsInKitPackageJson();
publishKit();