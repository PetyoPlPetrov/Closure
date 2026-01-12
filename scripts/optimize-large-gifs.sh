#!/bin/bash

# Optimize Large GIF Files
# Uses more aggressive settings for files over 15MB

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

get_size_bytes() {
    stat -f%z "$1" 2>/dev/null || stat -c%s "$1"
}

get_size_mb() {
    local bytes=$(get_size_bytes "$1")
    echo "$bytes" | awk '{printf "%.1f", $1/1024/1024}'
}

optimize_gif() {
    local input_file="$1"
    local output_file="${input_file%.gif}_optimized.gif"
    
    echo -e "${YELLOW}Optimizing: $input_file${NC}"
    
    local original_bytes=$(get_size_bytes "$input_file")
    local original_size=$(get_size_mb "$input_file")
    echo -e "  Original: ${original_size}MB"
    
    # Aggressive optimization for large files
    local colors=64
    local max_width=600
    
    echo -e "  Using aggressive settings (colors=$colors, max_width=$max_width)..."
    
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
    
    if [ ! -f "$output_file" ]; then
        echo -e "  ${RED}✗ Output not created${NC}\n"
        return 1
    fi
    
    local optimized_bytes=$(get_size_bytes "$output_file")
    local optimized_size=$(get_size_mb "$output_file")
    local reduction=$(echo "$original_bytes $optimized_bytes" | awk '{printf "%.1f", (($1-$2)/$1)*100}')
    
    echo -e "  Optimized: ${optimized_size}MB (${GREEN}-${reduction}%${NC})"
    
    if [ "$optimized_bytes" -lt "$original_bytes" ]; then
        mv "$input_file" "${input_file%.gif}_backup.gif"
        mv "$output_file" "$input_file"
        echo -e "  ${GREEN}✓ Optimized${NC}\n"
    else
        rm -f "$output_file"
        echo -e "  ${YELLOW}⚠ No improvement${NC}\n"
    fi
}

echo -e "${GREEN}=== Optimizing Large GIF Files (> 15MB) ===${NC}\n"
echo -e "${YELLOW}This may take several minutes per file...${NC}\n"

large_gifs=(
    "./assets/images/output.gif"
    "./assets/images/creating.gif"
    "./assets/images/create.gif"
    "./family.gif"
    "./assets/images/wheel.gif"
    "./latestWheelGif.gif"
    "./recapGiff.gif"
)

processed=0
for gif_file in "${large_gifs[@]}"; do
    if [ -f "$gif_file" ]; then
        file_size=$(get_size_bytes "$gif_file")
        if [ "$file_size" -gt 15728640 ]; then  # > 15MB
            processed=$((processed + 1))
            echo -e "${BLUE}[$processed/${#large_gifs[@]}]${NC}"
            optimize_gif "$gif_file"
        fi
    fi
done

echo -e "${GREEN}=== Complete ===${NC}\n"
