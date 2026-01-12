#!/bin/bash

# Cleanup script to remove backup GIF files
# These are the original files saved before optimization

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${YELLOW}=== Cleaning up backup GIF files ===${NC}\n"

# Find all backup files
backup_files=$(find . -name "*_backup.gif" -type f ! -path "./node_modules/*")

if [ -z "$backup_files" ]; then
    echo -e "${GREEN}No backup files found.${NC}"
    exit 0
fi

echo -e "Found backup files:\n"
echo "$backup_files" | while read -r file; do
    size=$(ls -lh "$file" | awk '{print $5}')
    echo -e "  $file (${size})"
done

echo -e "\n${YELLOW}Total size: $(du -sh $(echo "$backup_files" | tr '\n' ' ') 2>/dev/null | awk '{print $1}')${NC}\n"

read -p "Delete all backup files? (y/N): " -n 1 -r
echo

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "$backup_files" | while read -r file; do
        rm -f "$file"
        echo -e "${GREEN}Deleted: $file${NC}"
    done
    echo -e "\n${GREEN}✓ Cleanup complete!${NC}"
else
    echo -e "${YELLOW}Cancelled. Backup files kept.${NC}"
fi
