#!/bin/bash
# Generate cinematic artwork for the OpenStream homepage — throttled + retry on 429
set -u
OUT=/home/z/my-project/public/hero
mkdir -p "$OUT"

gen() {
  local file="$1"; shift
  local prompt="$1"; shift
  local size="$1"; shift
  if [ -s "$OUT/$file" ]; then echo "skip $file (exists)"; return 0; fi
  for attempt in 1 2 3 4; do
    echo ">>> $file (attempt $attempt)"
    if z-ai image -p "$prompt" -o "$OUT/$file" -s "$size"; then echo "ok  $file"; sleep 20; return 0; fi
    echo "retrying $file in $((attempt * 45))s..."
    sleep $((attempt * 45))
  done
  echo "FAIL $file"
  return 1
}

gen hero-city.png "Futuristic cyberpunk metropolis skyline at night viewed from a rooftop, giant glowing moon behind glass towers, violet and purple neon lights reflecting on wet surfaces, a lone silhouette looking at the city, cinematic wide shot, atmospheric haze, ultra detailed digital art, no text, no words, no watermark" 1344x768

gen hero-news.png "Modern television broadcast newsroom at night seen through dark glass, glowing video walls, city lights bokeh beyond the windows, deep violet and purple lighting, sleek futuristic design, cinematic atmosphere, no people, no text, no words, no watermark" 1344x768

gen hero-sports.png "Massive football stadium under dazzling floodlights at night, dramatic purple sky, light rays and swirling confetti, epic cinematic wide angle view from the stands, high detail digital art, no text, no words, no watermark" 1344x768

gen hero-docs.png "Planet Earth seen from orbit at night with glowing city lights and a vivid purple aurora, stars and soft nebula in deep space, moon crescent on the horizon, cinematic, awe inspiring, ultra detailed, no text, no words, no watermark" 1344x768

gen hero-music.png "Retro synthwave concert stage bathed in neon purple and magenta lights, silhouette of an electric guitarist, crowd hands in the air, laser beams and haze, 1980s retro futurism aesthetic, cinematic, high detail, no text, no words, no watermark" 1344x768

gen hero-food.png "Moody cinematic chef kitchen with neon violet accent lighting, steam rising from gourmet dishes on a dark counter, warm golden highlights against deep shadows, shallow depth of field, professional cinematic food photography, no text, no words, no watermark" 1344x768

gen banner-open.png "Abstract flowing streams of glowing violet and magenta light forming a worldwide broadcast network above a dark futuristic cityscape, digital data waves and radio signals, open source energy, wide panoramic composition, ultra detailed digital art, no text, no words, no watermark" 1152x864

echo "ALL_DONE"
