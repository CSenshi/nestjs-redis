#!/usr/bin/env node

const { execSync } = require('child_process');
const { readdirSync, existsSync } = require('fs');
const { join } = require('path');

const DIST_PACKAGES_DIR = 'dist/packages';

function publishPackages() {
  console.log('🚀 Publishing packages...');
  
  if (!existsSync(DIST_PACKAGES_DIR)) {
    console.error(`❌ Directory ${DIST_PACKAGES_DIR} does not exist`);
    process.exit(1);
  }

  const packageDirs = readdirSync(DIST_PACKAGES_DIR, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);

  if (packageDirs.length === 0) {
    console.log('⚠️  No packages found to publish');
    process.exit(0);
  }

  console.log(`📦 Found ${packageDirs.length} packages: ${packageDirs.join(', ')}`);

  let successCount = 0;
  let failCount = 0;

  for (const packageDir of packageDirs) {
    const packagePath = join(DIST_PACKAGES_DIR, packageDir);
    
    if (!existsSync(join(packagePath, 'package.json'))) {
      console.log(`⚠️  Skipping ${packageDir}: no package.json found`);
      continue;
    }

    try {
      console.log(`📤 Publishing ${packageDir}...`);
      execSync('pnpm publish --access public --no-git-checks', { 
        cwd: packagePath, 
        stdio: 'inherit' 
      });
      console.log(`✅ Successfully published ${packageDir}`);
      successCount++;
    } catch (error) {
      console.error(`❌ Failed to publish ${packageDir}:`, error.message);
      failCount++;
    }
  }

  console.log(`\n📊 Results: ${successCount} successful, ${failCount} failed`);
  
  if (failCount > 0) {
    process.exit(1);
  }
}

publishPackages();