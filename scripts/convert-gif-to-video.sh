#!/bin/bash

# Convert large GIF files to MP4 video format
# Much faster and smaller than optimizing GIFs

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

get_size_mb() {
    if [[ "$OSTYPE" == "darwin"* ]]; then
        stat -f%z "$1" | awk '{printf "%.1f", $1/1024/1024}'
    else
        stat -c%s "$1" | awk '{printf "%.1f", $1/1024/1024}'
    fi
}

convert_gif_to_mp4() {
    local input_file="$1"
    local output_file="${input_file%.gif}.mp4"
    
    echo -e "${YELLOW}Converting: $input_file${NC}"
    
    local original_size=$(get_size_mb "$input_file")
    echo -e "  Original GIF: ${original_size}MB"
    echo -e "  ${BLUE}Converting to MP4...${NC}"
    
    # Convert GIF to MP4 using ffmpeg
    # -vf scale: Resize to max 800px width (maintains aspect ratio)
    # -crf 28: Higher compression (lower quality but much smaller)
    # -preset fast: Faster encoding
    # -pix_fmt yuv420p: Ensures compatibility
    
    if ffmpeg -i "$input_file" \
        -vf "scale='min(800,iw)':'min(800,ih)':force_original_aspect_ratio=decrease" \
        -c:v libx264 \
        -crf 28 \
        -preset fast \
        -pix_fmt yuv420p \
        -movflags +faststart \
        -y "$output_file" 2>/dev/null; then
        
        if [ -f "$output_file" ]; then
            local video_size=$(get_size_mb "$output_file")
            local reduction=$(echo "$original_size $video_size" | awk '{printf "%.1f", (($1-$2)/$1)*100}')
            
            echo -e "  ${GREEN}✓ Converted to MP4${NC}"
            echo -e "  Video size: ${video_size}MB"
            echo -e "  ${GREEN}Size reduction: ${reduction}%${NC}\n"
            
            echo -e "  ${YELLOW}Note:${NC} You'll need to update your code to use .mp4 instead of .gif"
            echo -e "  File: $output_file\n"
        else
            echo -e "  ${RED}✗ Output file not created${NC}\n"
            return 1
        fi
    else
        echo -e "  ${RED}✗ Conversion failed${NC}\n"
        return 1
    fi
}

echo -e "${GREEN}=== Convert Large GIF to MP4 ===${NC}\n"

# Convert recapGiff.gif
if [ -f "./recapGiff.gif" ]; then
    convert_gif_to_mp4 "./recapGiff.gif"
else
    echo -e "${RED}File not found: ./recapGiff.gif${NC}"
fi

echo -e "${GREEN}=== Complete ===${NC}"
