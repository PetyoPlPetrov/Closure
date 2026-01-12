#!/bin/bash

# GIF Optimization Script
# Uses ImageMagick to optimize GIF files by reducing colors, frame rate, and dimensions

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to get file size in bytes
get_size_bytes() {
    if [[ "$OSTYPE" == "darwin"* ]]; then
        stat -f%z "$1"
    else
        stat -c%s "$1"
    fi
}

# Function to get file size in MB (formatted)
get_size_mb() {
    local bytes=$(get_size_bytes "$1")
    echo "$bytes" | awk '{printf "%.1f", $1/1024/1024}'
}

# Function to optimize a GIF using ImageMagick
optimize_gif() {
    local input_file="$1"
    local output_file="${input_file%.gif}_optimized.gif"
    
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${YELLOW}Optimizing: $input_file${NC}"
    
    # Get original size
    local original_bytes=$(get_size_bytes "$input_file")
    local original_size=$(get_size_mb "$input_file")
    echo -e "  Original size: ${original_size}MB"
    
    # Determine optimization level based on file size
    local colors max_width
    if [ "$original_bytes" -gt 20971520 ]; then  # > 20MB
        colors=64
        max_width=600
        echo -e "  Strategy: Aggressive (colors=$colors, max_width=$max_width)"
    elif [ "$original_bytes" -gt 10485760 ]; then  # > 10MB
        colors=128
        max_width=700
        echo -e "  Strategy: Moderate (colors=$colors, max_width=$max_width)"
    else
        colors=256
        max_width=800
        echo -e "  Strategy: Light (colors=$colors, max_width=$max_width)"
    fi
    
    # Optimize using ImageMagick
    # -layers optimize: Optimize animation layers
    # -colors: Reduce color palette
    # -resize: Resize if needed
    # -coalesce: Handle frame disposal properly
    echo -e "  ${BLUE}[Optimizing...]${NC} This may take a while for large files..."
    
    if ! magick "$input_file" \
        -coalesce \
        -resize "${max_width}x${max_width}>" \
        -colors $colors \
        -layers optimize \
        -loop 0 \
        "$output_file" 2>/dev/null; then
        echo -e "  ${RED}✗ Failed to optimize${NC}\n"
        rm -f "$output_file"
        return 1
    fi
    
    # Verify output exists
    if [ ! -f "$output_file" ]; then
        echo -e "  ${RED}✗ Output file not created${NC}\n"
        return 1
    fi
    
    # Compare sizes
    local optimized_bytes=$(get_size_bytes "$output_file")
    local optimized_size=$(get_size_mb "$output_file")
    local reduction=$(echo "$original_bytes $optimized_bytes" | awk '{printf "%.1f", (($1-$2)/$1)*100}')
    
    echo -e "  Optimized size: ${optimized_size}MB"
    echo -e "  ${GREEN}Size reduction: ${reduction}%${NC}"
    
    # Replace original if optimization was successful and smaller
    if [ "$optimized_bytes" -lt "$original_bytes" ]; then
        # Backup original
        mv "$input_file" "${input_file%.gif}_backup.gif"
        mv "$output_file" "$input_file"
        echo -e "  ${GREEN}✓ Successfully optimized (backup saved as ${input_file%.gif}_backup.gif)${NC}\n"
    else
        rm -f "$output_file"
        echo -e "  ${YELLOW}⚠ Optimization didn't reduce size, keeping original${NC}\n"
    fi
}

# Main execution
echo -e "${GREEN}╔════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║     GIF Optimization Script v2.0          ║${NC}"
echo -e "${GREEN}║     Using ImageMagick                     ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════╝${NC}\n"

# Array of GIF files to optimize (sorted by size - largest first)
gif_files=(
    "./recapGiff.gif"
    "./assets/images/wheel.gif"
    "./latestWheelGif.gif"
    "./family.gif"
    "./assets/images/create.gif"
    "./assets/images/creating.gif"
    "./assets/images/output.gif"
    "./assets/images/memories.gif"
    "./assets/images/focusedFriend.gif"
    "./focusedFriend.gif"
    "./assets/images/home.gif"
    "./assets/images/memory.gif"
    "./assets/images/insights.gif"
    "./assets/images/reminders.gif"
    "./assets/images/welcome.gif"
    "./assets/images/notifications.gif"
)

# Count files
total_files=0
found_files=0
for gif_file in "${gif_files[@]}"; do
    total_files=$((total_files + 1))
    if [ -f "$gif_file" ]; then
        found_files=$((found_files + 1))
    fi
done

echo -e "Found ${found_files}/${total_files} GIF files to optimize\n"

# Process each GIF
processed=0
for gif_file in "${gif_files[@]}"; do
    if [ -f "$gif_file" ]; then
        processed=$((processed + 1))
        echo -e "${BLUE}[$processed/$found_files]${NC}"
        optimize_gif "$gif_file" || echo -e "${RED}Failed to optimize $gif_file${NC}\n"
    fi
done

echo -e "${GREEN}╔════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║        Optimization Complete!             ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════╝${NC}\n"

echo -e "${BLUE}Final file sizes:${NC}\n"
find . -name "*.gif" -type f ! -path "./node_modules/*" ! -name "*_backup.gif" ! -name "*_optimized.gif" -exec ls -lh {} \; | awk '{printf "  %6s  %s\n", $5, $9}' | sort -k2

echo -e "\n${YELLOW}Note: Original files backed up as *_backup.gif${NC}"
