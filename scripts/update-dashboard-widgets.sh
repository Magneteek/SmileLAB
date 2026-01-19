#!/bin/bash

# Update all dashboard widgets to ultra compact sizing
echo "🔧 Updating dashboard widgets to ultra compact sizing..."

for file in components/dashboard/*.tsx; do
  echo "Processing: $file"
  
  # Update CardHeader padding
  sed -i '' 's/<CardHeader>/<CardHeader className="p-2 pb-1">/g' "$file"
  
  # Update CardContent padding
  sed -i '' 's/<CardContent className="space-y-1">/<CardContent className="p-2 pt-1 space-y-1">/g' "$file"
  sed -i '' 's/<CardContent className="space-y-2">/<CardContent className="p-2 pt-1 space-y-1">/g' "$file"
  sed -i '' 's/<CardContent>/<CardContent className="p-2 pt-1">/g' "$file"
  
  # Update CardTitle to ultra compact
  sed -i '' 's/CardTitle className="text-sm"/CardTitle className="text-xs font-semibold"/g' "$file"
  sed -i '' 's/CardTitle className="text-base"/CardTitle className="text-xs font-semibold"/g' "$file"
  
  # Update CardDescription
  sed -i '' 's/<CardDescription>/<CardDescription className="text-[10px]">/g' "$file"
  
  # Update icon sizes to minimal
  sed -i '' 's/className="h-4 w-4/className="h-3 w-3/g' "$file"
  
  # Update text sizes to minimal
  sed -i '' 's/text-sm text-muted-foreground/text-[10px] text-muted-foreground/g' "$file"
  
  # Update spacing to minimal
  sed -i '' 's/space-y-2/space-y-0.5/g' "$file"
  sed -i '' 's/space-y-1/space-y-0/g' "$file"
  sed -i '' 's/gap-2/gap-1/g' "$file"
  
  # Update margins
  sed -i '' 's/mb-3/mb-0.5/g' "$file"
  sed -i '' 's/mb-2/mb-0.5/g' "$file"
  
  # Update padding for rows
  sed -i '' 's/"flex items-center justify-between"/"flex items-center justify-between py-0.5"/g' "$file"
  
  echo "✅ Updated: $file"
done

echo "🎉 All dashboard widgets updated to ultra compact sizing!"
