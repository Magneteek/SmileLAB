#!/bin/bash

# Fix remaining large sizes in dashboard widgets
echo "🔧 Fixing remaining large sizes in widgets..."

for file in components/dashboard/*.tsx; do
  echo "Processing: $file"
  
  # Fix remaining text-lg titles
  sed -i '' 's/text-lg/text-xs font-semibold/g' "$file"
  
  # Fix remaining h-8 w-8 icons
  sed -i '' 's/h-8 w-8/h-3 w-3/g' "$file"
  
  # Fix padding in alert boxes
  sed -i '' 's/p-3/p-1/g' "$file"
  sed -i '' 's/pt-4/pt-1/g' "$file"
  
  # Fix space-y-3
  sed -i '' 's/space-y-3/space-y-0.5/g' "$file"
  
  # Fix any remaining text-sm that should be text-xs
  sed -i '' 's/"text-sm font-medium/"text-[10px] font-medium/g' "$file"
  sed -i '' 's/"text-sm font-semibold/"text-xs font-semibold/g' "$file"
  
  echo "✅ Fixed: $file"
done

echo "🎉 All remaining sizes fixed!"
