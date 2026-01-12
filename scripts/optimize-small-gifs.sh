#!/bin/bash

# Quick GIF Optimization Script for Smaller Files
# Uses ImageMagick to optimize GIF files under 15MB

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
    
    echo -e "${YELLOW}Optimizing: $input_file${NC}"
    
    # Get original size
    local original_bytes=$(get_size_bytes "$input_file")
    local original_size=$(get_size_mb "$input_file")
    echo -e "  Original: ${original_size}MB"
    
    # Use moderate optimization for smaller files
    local colors=128
    local max_width=800
    
    # Optimize using ImageMagick
    if ! magick "$input_file" \
        -coalesce \
        -resize "${max_width}x${max_width}>" \
        -colors $colors \
        -layers optimize \
        -loop 0 \
        "$output_file" 2>/dev/null; then
        echo -e "  ${RED}✗ Failed${NC}\n"
        rm -f "$output_file"
        return 1
    fi
    
    # Verify output exists
    if [ ! -f "$output_file" ]; then
        echo -e "  ${RED}✗ Output not created${NC}\n"
        return 1
    fi
    
    # Compare sizes
    local optimized_bytes=$(get_size_bytes "$output_file")
    local optimized_size=$(get_size_mb "$output_file")
    local reduction=$(echo "$original_bytes $optimized_bytes" | awk '{printf "%.1f", (($1-$2)/$1)*100}')
    
    echo -e "  Optimized: ${optimized_size}MB (${GREEN}-${reduction}%${NC})"
    
    # Replace original if optimization was successful and smaller
    if [ "$optimized_bytes" -lt "$original_bytes" ]; then
        mv "$input_file" "${input_file%.gif}_backup.gif"
        mv "$output_file" "$input_file"
        echo -e "  ${GREEN}✓ Optimized${NC}\n"
    else
        rm -f "$output_file"
        echo -e "  ${YELLOW}⚠ No improvement${NC}\n"
    fi
}

echo -e "${GREEN}=== Optimizing Smaller GIF Files (< 15MB) ===${NC}\n"

# Smaller GIF files to optimize first
small_gifs=(
    "./assets/images/notifications.gif"
    "./assets/images/welcome.gif"
    "./assets/images/reminders.gif"
    "./assets/images/insights.gif"
    "./assets/images/home.gif"
    "./assets/images/memory.gif"
    "./assets/images/focusedFriend.gif"
    "./focusedFriend.gif"
    "./assets/images/memories.gif"
)

processed=0
for gif_file in "${small_gifs[@]}"; do
    if [ -f "$gif_file" ]; then
        file_size=$(get_size_bytes "$gif_file")
        if [ "$file_size" -lt 15728640 ]; then  # < 15MB
            processed=$((processed + 1))
            echo -e "${BLUE}[$processed]${NC}"
            optimize_gif "$gif_file"
        fi
    fi
done

echo -e "${GREEN}=== Complete ===${NC}\n"
