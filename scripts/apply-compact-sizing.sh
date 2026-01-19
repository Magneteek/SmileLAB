#!/bin/bash

# Apply Ultra Compact Sizing to All Dashboard Pages
echo "🔧 Applying ultra compact sizing to dashboard pages..."

# Find all TSX files in dashboard directory
find app/\[locale\]/\(dashboard\) -name "*.tsx" -type f | while read file; do
  echo "Processing: $file"

  # Replace text sizes (headings)
  sed -i '' 's/text-3xl/text-sm/g' "$file"
  sed -i '' 's/text-2xl/text-sm/g' "$file"

  # Replace vertical spacing
  sed -i '' 's/space-y-8/space-y-2/g' "$file"
  sed -i '' 's/space-y-6/space-y-2/g' "$file"

  # Replace gaps
  sed -i '' 's/gap-8/gap-2/g' "$file"
  sed -i '' 's/gap-6/gap-2/g' "$file"

  # Replace padding
  sed -i '' 's/\bp-8\b/p-2/g' "$file"
  sed -i '' 's/\bp-6\b/p-2/g' "$file"

  # Replace margins
  sed -i '' 's/\bmb-8\b/mb-2/g' "$file"
  sed -i '' 's/\bmb-6\b/mb-2/g' "$file"
  sed -i '' 's/\bmt-8\b/mt-2/g' "$file"
  sed -i '' 's/\bmt-6\b/mt-2/g' "$file"

  # Replace icon sizes
  sed -i '' 's/h-6 w-6/h-4 w-4/g' "$file"
  sed -i '' 's/h-5 w-5/h-4 w-4/g' "$file"

  echo "✅ Updated: $file"
done

echo "🎉 Done! All dashboard pages have ultra compact sizing."
