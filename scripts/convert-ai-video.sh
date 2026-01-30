#!/bin/bash
# Convert ai.mov to ai.mp4 for walkthrough modal (cross-platform compatibility)
# Place ai.mov in project root, then run: ./scripts/convert-ai-video.sh

set -e

if [ ! -f "./ai.mov" ]; then
  echo "Error: ai.mov not found in project root."
  exit 1
fi

echo "Converting ai.mov to ai.mp4..."
ffmpeg -i ./ai.mov \
  -vf "scale='min(800,iw)':'min(800,ih)':force_original_aspect_ratio=decrease" \
  -c:v libx264 \
  -crf 28 \
  -preset fast \
  -pix_fmt yuv420p \
  -movflags +faststart \
  -an \
  -y ./ai.mp4

echo "Done. Update onboarding-stepper.tsx to use ai.mp4 if you prefer."
