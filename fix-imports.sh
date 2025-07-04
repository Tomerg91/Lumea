#!/bin/bash

echo "Fixing .js import extensions in TypeScript files..."

# Find all TypeScript files with .js imports and fix them
find server/src -name "*.ts" -type f -exec sed -i '' "s/from '[^']*\.js'/from '&'/g; s/\.js'/'/" {} \;

# Alternative approach - more precise
find server/src -name "*.ts" -type f -exec perl -i -pe "s/from\s+['\"]([^'\"]+)\.js['\"]/from '\$1'/g" {} \;

echo "Import fixes completed!" 