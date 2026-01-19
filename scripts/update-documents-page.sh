#!/bin/bash

file="app/[locale]/(dashboard)/documents/page.tsx"
echo "🔧 Updating documents page to ultra compact..."

# Replace remaining CardHeader with compact version
sed -i '' 's/<CardHeader>/<CardHeader className="p-2 pb-1">/g' "$file"

# Replace CardTitle with ultra compact
sed -i '' 's/CardTitle className="flex items-center gap-2"/CardTitle className="flex items-center gap-1 text-xs font-semibold"/g' "$file"

# Replace CardDescription with ultra compact
sed -i '' 's/<CardDescription>/<CardDescription className="text-[10px]">/g' "$file"

# Replace CardContent with ultra compact
sed -i '' 's/<CardContent className="space-y-4">/<CardContent className="p-2 pt-1 space-y-1">/g' "$file"
sed -i '' 's/<CardContent className="space-y-2">/<CardContent className="p-2 pt-1 space-y-1">/g' "$file"
sed -i '' 's/<CardContent>/<CardContent className="p-2 pt-1">/g' "$file"

# Make all buttons ultra compact (text-xs py-1 px-2 h-7)
sed -i '' 's/className="w-full"/className="w-full text-xs py-1 px-2 h-7"/g' "$file"

# Replace icon sizes in buttons
sed -i '' 's/className="mr-2 h-4 w-4"/className="mr-1 h-3 w-3"/g' "$file"

# Replace icon sizes in titles (h-4 w-4 to h-3 w-3)
sed -i '' 's/className="h-4 w-4"/className="h-3 w-3"/g' "$file"

# Replace label text sizes
sed -i '' 's/Label htmlFor="[^"]*" className="text-sm font-normal"/Label htmlFor="\0" className="text-[10px] font-normal"/g' "$file"
sed -i '' 's/"text-sm font-normal"/"text-[10px] font-normal"/g' "$file"

# Replace spacing in checkbox containers
sed -i '' 's/space-x-2/space-x-1/g' "$file"
sed -i '' 's/space-y-2/space-y-1/g' "$file"

echo "✅ Documents page updated to ultra compact!"
