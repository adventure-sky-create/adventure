"""
Sprite Generator v2 - Matching the Scout Tank Style
All sprites follow the same sci-fi polygonal tank style with:
- Gray metallic polygonal body with layered armor
- Neon colored outlines with outer glow
- Central hexagonal core with symbol
- Side armor plates with detail lines
- Top-mounted weapon barrel(s)
- Outer neon glow halo
"""

from PIL import Image, ImageDraw, ImageFilter
import os
import math
import random

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), 'enemies')
os.makedirs(OUTPUT_DIR, exist_ok=True)

def sc(base, v):
    return int(v * base / 128.0)

def create_glow_sprite(size, draw_func, glow_color, glow_radius=14):
    padding = glow_radius * 3
    total = size + padding * 2
    img = Image.new('RGBA', (total, total), (0, 0, 0, 0))
    sprite = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw_func(ImageDraw.Draw(sprite), size)
    glow = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    glow_px = glow.load()
    sprite_px = sprite.load()
    r, g, b = glow_color
    for y in range(size):
        for x in range(size):
            a = sprite_px[x, y][3]
            if a > 0:
                glow_px[x, y] = (r, g, b, a)
    glow_blur = glow.filter(ImageFilter.GaussianBlur(radius=glow_radius))
    result = Image.new('RGBA', (total, total), (0, 0, 0, 0))
    result.paste(glow_blur, (padding, padding), glow_blur)
    result.paste(sprite, (padding, padding), sprite)
    return result

def poly_pts(cx, cy, n, radius, rotation=0):
    pts = []
    for i in range(n):
        angle = (i / n) * 2 * math.pi + rotation
        pts.append((cx + radius * math.cos(angle), cy + radius * math.sin(angle)))
    return pts

def draw_hex_core(draw, cx, cy, r, outline, inner_color, symbol='triangle'):
    pts = poly_pts(cx, cy, 6, r, rotation=math.pi/6)
    draw.polygon(pts, fill=(35, 35, 40, 255), outline=outline)
    pts2 = poly_pts(cx, cy, 6, r*0.7, rotation=math.pi/6)
    draw.polygon(pts2, fill=(45, 45, 52, 255), outline=inner_color)
    sr = r * 0.4
    if symbol == 'triangle':
        pts3 = [(cx, cy-sr), (cx-sr*0.87, cy+sr*0.5), (cx+sr*0.87, cy+sr*0.5)]
        draw.polygon(pts3, fill=outline)
    elif symbol == 'cross':
        draw.rectangle([cx-sr*0.3, cy-sr, cx+sr*0.3, cy+sr], fill=outline)
        draw.rectangle([cx-sr, cy-sr*0.3, cx+sr, cy+sr*0.3], fill=outline)
    elif symbol == 'circle':
        draw.ellipse([cx-sr, cy-sr, cx+sr, cy+sr], fill=outline)
        draw.ellipse([cx-sr*0.5, cy-sr*0.5, cx+sr*0.5, cy+sr*0.5], fill=(255,255,255,255))
    elif symbol == 'ring':
        draw.ellipse([cx-sr, cy-sr, cx+sr, cy+sr], outline=outline, width=3)
        draw.ellipse([cx-sr*0.4, cy-sr*0.4, cx+sr*0.4, cy+sr*0.4], fill=outline)
    elif symbol == 'skull':
        draw.ellipse([cx-sr*0.8, cy-sr*0.7, cx+sr*0.8, cy+sr*0.7], fill=outline)
        draw.ellipse([cx-sr*0.5, cy-sr*0.3, cx-sr*0.1, cy+sr*0.1], fill=(35,35,40,255))
        draw.ellipse([cx+sr*0.1, cy-sr*0.3, cx+sr*0.5, cy+sr*0.1], fill=(35,35,40,255))
    elif symbol == 'x':
        draw.line([(cx-sr*0.7, cy-sr*0.7), (cx+sr*0.7, cy+sr*0.7)], fill=outline, width=4)
        draw.line([(cx+sr*0.7, cy-sr*0.7), (cx-sr*0.7, cy+sr*0.7)], fill=outline, width=4)
    elif symbol == 'bolt':
        pts3 = [(cx-sr*0.2, cy-sr), (cx+sr*0.4, cy-sr*0.2), (cx, cy),
                (cx+sr*0.3, cy+sr), (cx-sr*0.4, cy+sr*0.2), (cx-sr*0.1, cy-sr*0.2)]
        draw.polygon(pts3, fill=outline)
    elif symbol == 'square':
        draw.rectangle([cx-sr*0.7, cy-sr*0.7, cx+sr*0.7, cy+sr*0.7], fill=outline)

def draw_barrel(draw, cx, cy, length, width, outline, direction='up'):
    body = (60, 60, 66, 255)
    body_light = (85, 85, 92, 255)
    if direction == 'up':
        draw.rectangle([cx-width, cy-length, cx+width, cy], fill=body, outline=outline)
        draw.rectangle([cx-width+1, cy-length+2, cx+width-1, cy-length+8], fill=body_light)
        draw.rectangle([cx-width-1, cy-length-4, cx+width+1, cy-length],
                       fill=(50,50,55,255), outline=outline)
    elif direction == 'down':
        draw.rectangle([cx-width, cy, cx+width, cy+length], fill=body, outline=outline)
        draw.rectangle([cx-width+1, cy+length-8, cx+width-1, cy+length-2], fill=body_light)
        draw.rectangle([cx-width-1, cy+length, cx+width+1, cy+length+4],
                       fill=(50,50,55,255), outline=outline)

def draw_tracks(draw, cx, cy, w, h, outline):
    track_body = (35, 35, 40, 255)
    track_seg = (55, 55, 60, 255)
    draw.rectangle([cx-w-8, cy-h, cx-w, cy+h], fill=track_body, outline=outline)
    for i in range(int(h/6)):
        y = cy - h + 3 + i * 6
        draw.rectangle([cx-w-6, y, cx-w-2, y+3], fill=track_seg)
    draw.rectangle([cx+w, cy-h, cx+w+8, cy+h], fill=track_body, outline=outline)
    for i in range(int(h/6)):
        y = cy - h + 3 + i * 6
        draw.rectangle([cx+w+2, y, cx+w+6, y+3], fill=track_seg)

# ==================== ENEMIES ====================

def draw_heavy(draw, size):
    cx, cy = size//2, size//2
    w, h = sc(size, 48), sc(size, 40)
    outline = (155, 89, 182, 255)
    accent = (200, 150, 230, 255)
    draw_tracks(draw, cx, cy, w-4, h-8, outline)
    draw.rectangle([cx-w, cy-h, cx+w, cy+h], fill=(55,55,60,255), outline=outline, width=3)
    draw.rectangle([cx-w+6, cy-h+6, cx+w-6, cy+h-6], fill=(75,75,82,255))
    for side in [-1, 1]:
        ax = cx + side * w
        draw.polygon([(ax, cy-h*0.8), (ax+side*12, cy-h*0.5),
                       (ax+side*12, cy+h*0.5), (ax, cy+h*0.8)],
                      fill=(70,70,76,255), outline=outline)
        for i in range(3):
            y = cy - h*0.6 + i * h*0.4
            draw.line([(ax+side*4, y), (ax+side*10, y)], fill=accent, width=2)
    draw.rectangle([cx-sc(size,20), cy-sc(size,28), cx+sc(size,20), cy-sc(size,8)],
                   fill=(70,70,76,255), outline=outline, width=2)
    draw.rectangle([cx-sc(size,16), cy-sc(size,26), cx+sc(size,16), cy-sc(size,12)],
                   fill=(90,90,98,255))
    draw_barrel(draw, cx-sc(size,8), cy-sc(size,28), sc(size,28), sc(size,3), outline, 'up')
    draw_barrel(draw, cx+sc(size,8), cy-sc(size,28), sc(size,28), sc(size,3), outline, 'up')
    draw_hex_core(draw, cx, cy+sc(size,4), sc(size,12), outline, accent, symbol='square')

def draw_sniper(draw, size):
    cx, cy = size//2, size//2
    w, h = sc(size, 32), sc(size, 38)
    outline = (230, 126, 34, 255)
    accent = (255, 180, 100, 255)
    draw.rectangle([cx-w, cy-h, cx+w, cy+h], fill=(55,55,60,255), outline=outline, width=2)
    draw.rectangle([cx-w+4, cy-h+4, cx+w-4, cy+h-4], fill=(75,75,82,255))
    for side in [-1, 1]:
        ax = cx + side * w
        draw.polygon([(ax, cy-h*0.5), (ax+side*6, cy-h*0.3),
                       (ax+side*6, cy+h*0.3), (ax, cy+h*0.5)],
                      fill=(70,70,76,255), outline=outline)
    draw_barrel(draw, cx, cy-sc(size,4), sc(size,50), sc(size,4), outline, 'up')
    draw.rectangle([cx-sc(size,6), cy-sc(size,12), cx+sc(size,6), cy],
                   fill=(70,70,76,255), outline=outline)
    for side in [-1, 1]:
        draw.line([(cx+side*sc(size,20), cy-sc(size,10)), (cx+side*sc(size,26), cy-sc(size,10))],
                  fill=accent, width=2)
        draw.line([(cx+side*sc(size,20), cy+sc(size,2)), (cx+side*sc(size,26), cy+sc(size,2))],
                  fill=accent, width=2)
    draw_hex_core(draw, cx, cy+sc(size,6), sc(size,9), outline, accent, symbol='triangle')

def draw_bomber(draw, size):
    cx, cy = size//2, size//2
    w, h = sc(size, 40), sc(size, 36)
    outline = (255, 59, 59, 255)
    accent = (255, 150, 150, 255)
    pts = poly_pts(cx, cy, 8, w, rotation=0)
    draw.polygon(pts, fill=(55,55,60,255), outline=outline, width=3)
    pts2 = poly_pts(cx, cy, 8, w-8, rotation=0)
    draw.polygon(pts2, fill=(70,70,76,255), outline=(180,40,40,255))
    for side in [-1, 1]:
        ax = cx + side * w
        draw.polygon([(ax, cy-h*0.4), (ax+side*8, cy-h*0.2),
                       (ax+side*8, cy+h*0.2), (ax, cy+h*0.4)],
                      fill=(65,65,70,255), outline=outline)
    draw_hex_core(draw, cx, cy, sc(size,16), outline, (255,200,100,255), symbol='skull')
    for angle in range(0, 360, 45):
        rad = angle * math.pi / 180
        x1 = cx + (w-4) * math.cos(rad)
        y1 = cy + (w-4) * math.sin(rad)
        x2 = cx + (w+8) * math.cos(rad)
        y2 = cy + (w+8) * math.sin(rad)
        draw.line([(x1, y1), (x2, y2)], fill=outline, width=3)
        draw.ellipse([x2-3, y2-3, x2+3, y2+3], fill=accent)
    draw_barrel(draw, cx, cy-h-sc(size,6), sc(size,10), sc(size,4), outline, 'up')

def draw_spread(draw, size):
    cx, cy = size//2, size//2
    w, h = sc(size, 38), sc(size, 36)
    outline = (26, 188, 156, 255)
    accent = (100, 240, 200, 255)
    pts = poly_pts(cx, cy, 6, w, rotation=0)
    draw.polygon(pts, fill=(55,55,60,255), outline=outline, width=3)
    pts2 = poly_pts(cx, cy, 6, w-8, rotation=0)
    draw.polygon(pts2, fill=(70,70,76,255), outline=(20,150,120,255))
    for angle in range(0, 360, 72):
        rad = (angle - 90) * math.pi / 180
        bx = cx + sc(size, 16) * math.cos(rad)
        by = cy + sc(size, 16) * math.sin(rad)
        tx = cx + sc(size, 32) * math.cos(rad)
        ty = cy + sc(size, 32) * math.sin(rad)
        draw.line([(bx, by), (tx, ty)], fill=(40,100,85,255), width=sc(size,5))
        draw.ellipse([tx-sc(size,4), ty-sc(size,4), tx+sc(size,4), ty+sc(size,4)], fill=outline)
    draw_hex_core(draw, cx, cy, sc(size,12), outline, accent, symbol='circle')
    draw.ellipse([cx-w+4, cy-h+4, cx+w-4, cy+h-4], outline=accent, width=1)

# ==================== ELITE ENEMIES ====================

def draw_elite_warrior(draw, size):
    cx, cy = size//2, size//2
    w, h = sc(size, 48), sc(size, 42)
    outline = (255, 215, 0, 255)
    accent = (255, 240, 150, 255)
    pts = poly_pts(cx, cy, 8, w, rotation=math.pi/8)
    draw.polygon(pts, fill=(60,55,30,255), outline=outline, width=3)
    pts2 = poly_pts(cx, cy, 8, w-8, rotation=math.pi/8)
    draw.polygon(pts2, fill=(80,75,40,255), outline=(200,170,0,255))
    for side in [-1, 1]:
        tx = cx + side * sc(size, 22)
        ty = cy - sc(size, 8)
        draw.ellipse([tx-sc(size,12), ty-sc(size,10), tx+sc(size,12), ty+sc(size,10)],
                     fill=(85,80,45,255), outline=outline)
        draw_barrel(draw, tx, ty-sc(size,10), sc(size,24), sc(size,3), outline, 'up')
    draw_hex_core(draw, cx, cy+sc(size,6), sc(size,14), outline, accent, symbol='cross')
    for side in [-1, 1]:
        ax = cx + side * w
        draw.polygon([(ax, cy-h*0.5), (ax+side*10, cy-h*0.3),
                       (ax+side*10, cy+h*0.3), (ax, cy+h*0.5)],
                      fill=(70,65,35,255), outline=outline)

def draw_elite_sorcerer(draw, size):
    cx, cy = size//2, size//2
    w = sc(size, 44)
    outline = (168, 85, 247, 255)
    accent = (210, 150, 255, 255)
    draw.ellipse([cx-w, cy-w, cx+w, cy+w], outline=outline, width=3)
    pts = poly_pts(cx, cy, 6, w-sc(size,8), rotation=0)
    draw.polygon(pts, fill=(55,35,75,255), outline=outline, width=3)
    pts2 = poly_pts(cx, cy, 6, w-sc(size,16), rotation=0)
    draw.polygon(pts2, fill=(75,50,100,255), outline=(120,60,180,255))
    draw_hex_core(draw, cx, cy, sc(size,18), outline, accent, symbol='ring')
    for angle in range(0, 360, 60):
        rad = angle * math.pi / 180
        x1 = cx + (w-sc(size,6)) * math.cos(rad)
        y1 = cy + (w-sc(size,6)) * math.sin(rad)
        x2 = cx + (w+sc(size,4)) * math.cos(rad)
        y2 = cy + (w+sc(size,4)) * math.sin(rad)
        draw.line([(x1, y1), (x2, y2)], fill=accent, width=2)
        draw.ellipse([x2-sc(size,3), y2-sc(size,3), x2+sc(size,3), y2+sc(size,3)], fill=outline)

def draw_elite_hunter(draw, size):
    cx, cy = size//2, size//2
    w, h = sc(size, 30), sc(size, 42)
    outline = (0, 255, 136, 255)
    accent = (150, 255, 200, 255)
    pts = poly_pts(cx, cy, 6, w, rotation=0)
    stretched = [(cx+(x-cx)*0.75, cy+(y-cy)*1.3) for x,y in pts]
    draw.polygon(stretched, fill=(35,60,48,255), outline=outline, width=3)
    for side in [-1, 1]:
        ax = cx + side * sc(size, 32)
        draw.rectangle([ax-sc(size,4), cy-sc(size,18), ax+sc(size,4), cy+sc(size,18)],
                       fill=(45,70,55,255), outline=outline)
        for i in range(3):
            my = cy - sc(size,14) + i * sc(size,12)
            draw.rectangle([ax-sc(size,3), my-sc(size,4), ax+sc(size,3), my+sc(size,4)],
                           fill=(55,80,65,255), outline=outline)
    draw_barrel(draw, cx, cy-sc(size,8), sc(size,42), sc(size,3), outline, 'up')
    draw.rectangle([cx-sc(size,6), cy-sc(size,16), cx+sc(size,6), cy-sc(size,6)],
                   fill=(45,70,55,255), outline=outline)
    draw_hex_core(draw, cx, cy+sc(size,4), sc(size,10), outline, accent, symbol='bolt')

def draw_elite_guardian(draw, size):
    cx, cy = size//2, size//2
    w, h = sc(size, 56), sc(size, 46)
    outline = (59, 130, 246, 255)
    accent = (150, 200, 255, 255)
    pts = poly_pts(cx, cy, 10, w, rotation=0)
    draw.polygon(pts, fill=(35,55,95,255), outline=outline, width=3)
    pts2 = poly_pts(cx, cy, 10, w-sc(size,10), rotation=0)
    draw.polygon(pts2, fill=(50,75,120,255), outline=(40,100,200,255))
    for r in [w+sc(size,6), w+sc(size,10), w+sc(size,14)]:
        draw.ellipse([cx-r, cy-r, cx+r, cy+r], outline=accent, width=2)
    for angle in range(0, 360, 45):
        rad = angle * math.pi / 180
        x1 = cx + (w-sc(size,4)) * math.cos(rad)
        y1 = cy + (w-sc(size,4)) * math.sin(rad)
        x2 = cx + (w+sc(size,6)) * math.cos(rad)
        y2 = cy + (w+sc(size,6)) * math.sin(rad)
        draw.line([(x1, y1), (x2, y2)], fill=outline, width=sc(size,4))
    for side in [-1, 1]:
        bx = cx + side * sc(size,18)
        draw_barrel(draw, bx, cy-sc(size,12), sc(size,36), sc(size,5), outline, 'up')
    draw_hex_core(draw, cx, cy+sc(size,8), sc(size,16), outline, accent, symbol='circle')

# ==================== BOSSES ====================

def draw_iron_sentinel(draw, size):
    cx, cy = size//2, size//2
    w = sc(size, 70)
    magenta = (255, 46, 136, 255)
    cyan = (0, 240, 255, 255)
    accent = (200, 150, 230, 255)
    pts = poly_pts(cx, cy, 6, w, rotation=0)
    draw.polygon(pts, fill=(60,30,75,255), outline=magenta, width=3)
    pts2 = poly_pts(cx, cy, 6, w-sc(size,12), rotation=0)
    draw.polygon(pts2, fill=(80,50,95,255), outline=cyan)
    for angle in [0, 90, 180, 270]:
        rad = angle * math.pi / 180
        bx = cx + (w-sc(size,4)) * math.cos(rad)
        by = cy + (w-sc(size,4)) * math.sin(rad)
        lx = cx + (w+sc(size,30)) * math.cos(rad)
        ly = cy + (w+sc(size,30)) * math.sin(rad)
        draw.line([(bx, by), (lx, ly)], fill=(70,40,85,255), width=sc(size,10))
        draw.ellipse([lx-sc(size,8), ly-sc(size,8), lx+sc(size,8), ly+sc(size,8)],
                     fill=(55,30,70,255), outline=magenta)
        fx = cx + (w+sc(size,40)) * math.cos(rad)
        fy = cy + (w+sc(size,40)) * math.sin(rad)
        draw.ellipse([fx-sc(size,6), fy-sc(size,6), fx+sc(size,6), fy+sc(size,6)], fill=cyan)
    for angle in range(0, 360, 30):
        rad = angle * math.pi / 180
        bx = cx + sc(size,30) * math.cos(rad)
        by = cy + sc(size,30) * math.sin(rad)
        tx = cx + sc(size,48) * math.cos(rad)
        ty = cy + sc(size,48) * math.sin(rad)
        draw.line([(bx, by), (tx, ty)], fill=(80,50,95,255), width=sc(size,4))
        draw.ellipse([tx-sc(size,3), ty-sc(size,3), tx+sc(size,3), ty+sc(size,3)], fill=cyan)
    draw_hex_core(draw, cx, cy, sc(size,22), magenta, cyan, symbol='ring')

def draw_sky_rift(draw, size):
    cx, cy = size//2, size//2
    w = sc(size, 80)
    cyan = (0, 240, 255, 255)
    magenta = (255, 46, 136, 255)
    accent = (150, 220, 255, 255)
    pts = poly_pts(cx, cy, 8, w, rotation=math.pi/8)
    draw.polygon(pts, fill=(45,30,60,255), outline=cyan, width=3)
    pts2 = poly_pts(cx, cy, 8, w-sc(size,14), rotation=0)
    draw.polygon(pts2, fill=(65,45,80,255), outline=magenta)
    for angle in range(0, 360, 45):
        rad = angle * math.pi / 180
        ex = cx + (w-sc(size,8)) * math.cos(rad)
        ey = cy + (w-sc(size,8)) * math.sin(rad)
        draw.ellipse([ex-sc(size,8), ey-sc(size,8), ex+sc(size,8), ey+sc(size,8)],
                     fill=(55,35,70,255), outline=cyan)
        draw.ellipse([ex-sc(size,4), ey-sc(size,4), ex+sc(size,4), ey+sc(size,4)], fill=magenta)
    draw_hex_core(draw, cx, cy, sc(size,24), cyan, magenta, symbol='x')
    for angle in range(22, 360, 45):
        rad = angle * math.pi / 180
        x = cx + (w-sc(size,2)) * math.cos(rad)
        y = cy + (w-sc(size,2)) * math.sin(rad)
        draw.ellipse([x-sc(size,3), y-sc(size,3), x+sc(size,3), y+sc(size,3)], fill=accent)
    draw.ellipse([cx-w-sc(size,8), cy-w-sc(size,8), cx+w+sc(size,8), cy+w+sc(size,8)],
                 outline=cyan, width=2)

def draw_quantum_cyan(draw, size):
    cx, cy = size//2, size//2
    w = sc(size, 44)
    outline = (0, 240, 255, 255)
    accent = (150, 250, 255, 255)
    pts = poly_pts(cx, cy, 4, w, rotation=0)
    draw.polygon(pts, fill=(25,55,75,255), outline=outline, width=3)
    pts2 = poly_pts(cx, cy, 4, w-sc(size,8), rotation=0)
    draw.polygon(pts2, fill=(40,75,100,255), outline=(0,180,220,255))
    for side in [-1, 1]:
        draw.polygon([(cx+side*w*0.6, cy-sc(size,14)), (cx+side*w*1.1, cy),
                       (cx+side*w*0.6, cy+sc(size,14))],
                      fill=(30,65,88,255), outline=outline)
    draw_hex_core(draw, cx, cy, sc(size,16), outline, accent, symbol='bolt')
    for angle in range(0, 360, 90):
        rad = angle * math.pi / 180
        x1 = cx + (w-sc(size,2)) * math.cos(rad)
        y1 = cy + (w-sc(size,2)) * math.sin(rad)
        x2 = cx + (w+sc(size,8)) * math.cos(rad)
        y2 = cy + (w+sc(size,8)) * math.sin(rad)
        draw.line([(x1, y1), (x2, y2)], fill=accent, width=2)

def draw_quantum_purple(draw, size):
    cx, cy = size//2, size//2
    w = sc(size, 44)
    outline = (168, 85, 247, 255)
    accent = (210, 160, 255, 255)
    pts = poly_pts(cx, cy, 4, w, rotation=0)
    draw.polygon(pts, fill=(55,30,75,255), outline=outline, width=3)
    pts2 = poly_pts(cx, cy, 4, w-sc(size,8), rotation=0)
    draw.polygon(pts2, fill=(75,45,100,255), outline=(130,60,200,255))
    for side in [-1, 1]:
        draw.polygon([(cx+side*w*0.6, cy-sc(size,14)), (cx+side*w*1.1, cy),
                       (cx+side*w*0.6, cy+sc(size,14))],
                      fill=(60,35,85,255), outline=outline)
    draw_hex_core(draw, cx, cy, sc(size,16), outline, accent, symbol='bolt')
    for angle in range(0, 360, 90):
        rad = angle * math.pi / 180
        x1 = cx + (w-sc(size,2)) * math.cos(rad)
        y1 = cy + (w-sc(size,2)) * math.sin(rad)
        x2 = cx + (w+sc(size,8)) * math.cos(rad)
        y2 = cy + (w+sc(size,8)) * math.sin(rad)
        draw.line([(x1, y1), (x2, y2)], fill=accent, width=2)

def draw_doom_engine(draw, size):
    cx, cy = size//2, size//2
    w = sc(size, 95)
    red = (255, 59, 59, 255)
    orange = (255, 140, 50, 255)
    magenta = (255, 46, 136, 255)
    draw.ellipse([cx-w-sc(size,8), cy-w-sc(size,8), cx+w+sc(size,8), cy+w+sc(size,8)],
                 outline=red, width=4)
    pts = poly_pts(cx, cy, 8, w, rotation=0)
    draw.polygon(pts, fill=(65,25,25,255), outline=orange, width=3)
    pts2 = poly_pts(cx, cy, 8, w-sc(size,14), rotation=0)
    draw.polygon(pts2, fill=(85,40,40,255), outline=red)
    for r in [w-sc(size,20), w-sc(size,30), w-sc(size,40)]:
        draw.ellipse([cx-r, cy-r, cx+r, cy+r], outline=(180,50,50,255), width=2)
    draw_hex_core(draw, cx, cy, sc(size,30), red, orange, symbol='skull')
    for angle in range(0, 360, 60):
        rad = angle * math.pi / 180
        bx = cx + (w-sc(size,10)) * math.cos(rad)
        by = cy + (w-sc(size,10)) * math.sin(rad)
        draw.ellipse([bx-sc(size,10), by-sc(size,10), bx+sc(size,10), by+sc(size,10)],
                     fill=(75,30,30,255), outline=orange)
        tx = cx + (w+sc(size,20)) * math.cos(rad)
        ty = cy + (w+sc(size,20)) * math.sin(rad)
        draw.line([(bx, by), (tx, ty)], fill=red, width=sc(size,6))
        draw.ellipse([tx-sc(size,5), ty-sc(size,5), tx+sc(size,5), ty+sc(size,5)], fill=magenta)
    for angle in range(30, 360, 60):
        rad = angle * math.pi / 180
        x1 = cx + w * math.cos(rad)
        y1 = cy + w * math.sin(rad)
        x2 = cx + (w+sc(size,18)) * math.cos(rad)
        y2 = cy + (w+sc(size,18)) * math.sin(rad)
        draw.line([(x1, y1), (x2, y2)], fill=orange, width=sc(size,5))
        draw.ellipse([x2-sc(size,4), y2-sc(size,4), x2+sc(size,4), y2+sc(size,4)], fill=red)

# ==================== PLAYER & ENTITIES ====================

def draw_player(draw, size):
    cx, cy = size//2, size//2
    w, h = sc(size, 36), sc(size, 32)
    outline = (0, 240, 255, 255)
    accent = (150, 240, 255, 255)
    draw_tracks(draw, cx, cy, w-4, h-4, outline)
    draw.rectangle([cx-w, cy-h, cx+w, cy+h], fill=(40,60,85,255), outline=outline, width=3)
    draw.rectangle([cx-w+4, cy-h+4, cx+w-4, cy+h-4], fill=(60,80,105,255))
    for side in [-1, 1]:
        ax = cx + side * w
        draw.polygon([(ax, cy-h*0.4), (ax+side*6, cy-h*0.2),
                       (ax+side*6, cy+h*0.2), (ax, cy+h*0.4)],
                      fill=(50,70,95,255), outline=outline)
        for i in range(2):
            y = cy - h*0.25 + i * h*0.3
            draw.line([(ax+side*2, y), (ax+side*5, y)], fill=accent, width=1)
    draw.rectangle([cx-sc(size,14), cy-sc(size,22), cx+sc(size,14), cy-sc(size,6)],
                   fill=(55,75,100,255), outline=outline, width=2)
    draw.rectangle([cx-sc(size,12), cy-sc(size,20), cx+sc(size,12), cy-sc(size,10)],
                   fill=(75,95,120,255))
    draw_barrel(draw, cx, cy-sc(size,22), sc(size,28), sc(size,4), outline, 'up')
    draw_hex_core(draw, cx, cy+sc(size,2), sc(size,10), outline, accent, symbol='triangle')

def draw_drone(draw, size):
    cx, cy = size//2, size//2
    outline = (0, 240, 255, 255)
    accent = (150, 240, 255, 255)
    pts = poly_pts(cx, cy, 3, sc(size,24), rotation=-math.pi/2)
    draw.polygon(pts, fill=(25,55,75,255), outline=outline, width=2)
    draw.ellipse([cx-sc(size,26), cy-sc(size,6), cx+sc(size,26), cy+sc(size,6)],
                 outline=accent, width=1)
    draw_barrel(draw, cx, cy-sc(size,24), sc(size,12), sc(size,3), outline, 'up')
    for side in [-1, 1]:
        draw.polygon([(cx+side*sc(size,18), cy-sc(size,4)), (cx+side*sc(size,28), cy-sc(size,8)),
                       (cx+side*sc(size,28), cy+sc(size,2)), (cx+side*sc(size,18), cy+sc(size,2))],
                      fill=(30,60,82,255), outline=outline)
    draw_hex_core(draw, cx, cy+sc(size,2), sc(size,8), outline, accent, symbol='circle')

def draw_mine(draw, size):
    cx, cy = size//2, size//2
    outline = (255, 215, 0, 255)
    accent = (255, 240, 150, 255)
    draw.ellipse([cx-sc(size,22), cy-sc(size,22), cx+sc(size,22), cy+sc(size,22)],
                 fill=(65,55,25,255), outline=outline, width=3)
    draw.ellipse([cx-sc(size,18), cy-sc(size,18), cx+sc(size,18), cy+sc(size,18)],
                 fill=(85,75,40,255))
    for angle in [0, 120, 240]:
        rad = (angle - 90) * math.pi / 180
        pts = [(cx+sc(size,6)*math.cos(rad), cy+sc(size,6)*math.sin(rad)),
               (cx+sc(size,18)*math.cos(rad+0.3), cy+sc(size,18)*math.sin(rad+0.3)),
               (cx+sc(size,18)*math.cos(rad-0.3), cy+sc(size,18)*math.sin(rad-0.3))]
        draw.polygon(pts, fill=outline)
    draw.ellipse([cx-sc(size,6), cy-sc(size,6), cx+sc(size,6), cy+sc(size,6)],
                 fill=(75,65,30,255), outline=outline)
    draw.ellipse([cx-sc(size,3), cy-sc(size,3), cx+sc(size,3), cy+sc(size,3)], fill=accent)
    draw.ellipse([cx-sc(size,28), cy-sc(size,28), cx+sc(size,28), cy+sc(size,28)],
                 outline=accent, width=1)
    for angle in range(0, 360, 60):
        rad = angle * math.pi / 180
        x = cx + sc(size,26) * math.cos(rad)
        y = cy + sc(size,26) * math.sin(rad)
        draw.ellipse([x-sc(size,2), y-sc(size,2), x+sc(size,2), y+sc(size,2)], fill=outline)

# ==================== PROJECTILES ====================

def draw_missile(draw, size):
    cx, cy = size//2, size//2
    outline = (0, 255, 136, 255)
    accent = (120, 255, 180, 255)
    draw.polygon([(cx, cy-sc(size,30)), (cx-sc(size,8), cy-sc(size,12)),
                   (cx+sc(size,8), cy-sc(size,12))], fill=(25,75,50,255), outline=outline)
    draw.rectangle([cx-sc(size,8), cy-sc(size,12), cx+sc(size,8), cy+sc(size,14)],
                   fill=(35,85,58,255), outline=outline)
    draw.rectangle([cx-sc(size,6), cy-sc(size,10), cx+sc(size,6), cy+sc(size,12)],
                   fill=(55,105,78,255))
    for side in [-1, 1]:
        draw.polygon([(cx+side*sc(size,8), cy+sc(size,2)), (cx+side*sc(size,18), cy+sc(size,16)),
                       (cx+side*sc(size,8), cy+sc(size,14))],
                      fill=(30,70,48,255), outline=outline)
    draw.polygon([(cx-sc(size,4), cy+sc(size,14)), (cx, cy+sc(size,24)),
                   (cx+sc(size,4), cy+sc(size,14))], fill=accent)
    draw.line([(cx, cy-sc(size,8)), (cx, cy+sc(size,12))], fill=accent, width=1)

def draw_plasma(draw, size):
    cx, cy = size//2, size//2
    for r, alpha in [(sc(size,30),40), (sc(size,24),70), (sc(size,18),100)]:
        draw.ellipse([cx-r, cy-r, cx+r, cy+r], fill=(255,80,80,alpha))
    draw.ellipse([cx-sc(size,16), cy-sc(size,16), cx+sc(size,16), cy+sc(size,16)],
                 fill=(255,59,59,255), outline=(255,100,100,255))
    draw.ellipse([cx-sc(size,14), cy-sc(size,14), cx+sc(size,14), cy+sc(size,14)],
                 fill=(255,90,90,200))
    draw.ellipse([cx-sc(size,10), cy-sc(size,10), cx+sc(size,10), cy+sc(size,10)],
                 fill=(255,150,150,255))
    draw.ellipse([cx-sc(size,6), cy-sc(size,6), cx+sc(size,6), cy+sc(size,6)],
                 fill=(255,220,220,255))
    draw.ellipse([cx-sc(size,20), cy-sc(size,20), cx+sc(size,20), cy+sc(size,20)],
                 outline=(255,120,120,150), width=2)

def draw_flame(draw, size):
    cx, cy = size//2, size//2
    pts_outer = [(cx, cy-sc(size,30)), (cx-sc(size,28), cy+sc(size,20)),
                 (cx+sc(size,28), cy+sc(size,20))]
    draw.polygon(pts_outer, fill=(255,107,0,100))
    pts_mid = [(cx, cy-sc(size,22)), (cx-sc(size,20), cy+sc(size,15)),
               (cx+sc(size,20), cy+sc(size,15))]
    draw.polygon(pts_mid, fill=(255,140,50,130))
    pts_inner = [(cx, cy-sc(size,14)), (cx-sc(size,12), cy+sc(size,10)),
                 (cx+sc(size,12), cy+sc(size,10))]
    draw.polygon(pts_inner, fill=(255,180,100,160))
    random.seed(123)
    for _ in range(20):
        angle = random.uniform(-0.9, 0.9) - math.pi/2
        dist = random.uniform(sc(size,8), sc(size,28))
        px = cx + dist * math.cos(angle)
        py = cy + dist * math.sin(angle)
        r = random.randint(sc(size,2), sc(size,5))
        alpha = random.randint(80, 180)
        colors = [(255,107,0),(255,160,50),(255,200,100),(255,255,200)]
        c = random.choice(colors)
        draw.ellipse([px-r, py-r, px+r, py+r], fill=(c[0],c[1],c[2],alpha))

def draw_poison(draw, size):
    cx, cy = size//2, size//2
    blobs = [(cx-sc(size,6), cy-sc(size,6), sc(size,20)),
             (cx+sc(size,10), cy-sc(size,12), sc(size,16)),
             (cx+sc(size,14), cy+sc(size,4), sc(size,18)),
             (cx-sc(size,12), cy+sc(size,10), sc(size,15)),
             (cx+sc(size,2), cy+sc(size,14), sc(size,14)),
             (cx-sc(size,16), cy+sc(size,2), sc(size,13)),
             (cx+sc(size,4), cy-sc(size,16), sc(size,12))]
    for bx, by, br in blobs:
        draw.ellipse([bx-br, by-br, bx+br, by+br], fill=(136,255,0,70))
    for bx, by, br in blobs:
        draw.ellipse([bx-br, by-br, bx+br, by+br], outline=(136,255,0,110), width=1)
    random.seed(456)
    for _ in range(15):
        angle = random.uniform(0, 2*math.pi)
        dist = random.uniform(sc(size,4), sc(size,20))
        px = cx + dist * math.cos(angle)
        py = cy + dist * math.sin(angle)
        r = random.randint(sc(size,2), sc(size,5))
        draw.ellipse([px-r, py-r, px+r, py+r], fill=(180,255,100,90))


# ==================== GENERATE ====================

SPRITES = {
    'enemy_heavy':    {'draw': draw_heavy,    'size': 160, 'glow': (155,89,182),  'glow_r': 14},
    'enemy_sniper':   {'draw': draw_sniper,   'size': 128, 'glow': (230,126,34),  'glow_r': 12},
    'enemy_bomber':   {'draw': draw_bomber,   'size': 128, 'glow': (255,59,59),   'glow_r': 12},
    'enemy_spread':   {'draw': draw_spread,   'size': 128, 'glow': (26,188,156),  'glow_r': 12},
    'enemy_elite_warrior':  {'draw': draw_elite_warrior,  'size': 192, 'glow': (255,215,0),   'glow_r': 16},
    'enemy_elite_sorcerer': {'draw': draw_elite_sorcerer, 'size': 192, 'glow': (168,85,247),  'glow_r': 16},
    'enemy_elite_hunter':   {'draw': draw_elite_hunter,   'size': 160, 'glow': (0,255,136),   'glow_r': 14},
    'enemy_elite_guardian': {'draw': draw_elite_guardian, 'size': 224, 'glow': (59,130,246),  'glow_r': 18},
    'boss_iron_sentinel':   {'draw': draw_iron_sentinel,   'size': 320, 'glow': (255,46,136),  'glow_r': 20},
    'boss_sky_rift':       {'draw': draw_sky_rift,       'size': 320, 'glow': (0,240,255),   'glow_r': 20},
    'boss_quantum_cyan':   {'draw': draw_quantum_cyan,   'size': 224, 'glow': (0,240,255),   'glow_r': 16},
    'boss_quantum_purple': {'draw': draw_quantum_purple, 'size': 224, 'glow': (168,85,247),  'glow_r': 16},
    'boss_doom_engine':     {'draw': draw_doom_engine,    'size': 384, 'glow': (255,59,59),   'glow_r': 22},
    'player_tank':    {'draw': draw_player, 'size': 128, 'glow': (0,240,255),  'glow_r': 14},
    'entity_drone':   {'draw': draw_drone,  'size': 96,  'glow': (0,240,255),  'glow_r': 12},
    'entity_mine':    {'draw': draw_mine,   'size': 96,  'glow': (255,215,0),  'glow_r': 12},
    'proj_missile':   {'draw': draw_missile, 'size': 80,  'glow': (0,255,136),  'glow_r': 10},
    'proj_plasma':    {'draw': draw_plasma,  'size': 80,  'glow': (255,59,59),  'glow_r': 12},
    'proj_flame':     {'draw': draw_flame,   'size': 128, 'glow': (255,107,0),  'glow_r': 10},
    'proj_poison':    {'draw': draw_poison,  'size': 128, 'glow': (136,255,0),  'glow_r': 10},
}

print("Generating sprites...")
for name, config in SPRITES.items():
    print(f"  {name} ({config['size']}px)...")
    img = create_glow_sprite(config['size'], config['draw'], config['glow'], config['glow_r'])
    filepath = os.path.join(OUTPUT_DIR, f'{name}.png')
    img.save(filepath, 'PNG')
    print(f"    Saved: {filepath} ({img.size[0]}x{img.size[1]})")

print("\nGenerating HD versions...")
for name, config in SPRITES.items():
    hd_size = config['size'] * 2
    img = create_glow_sprite(hd_size, config['draw'], config['glow'], config['glow_r'] * 2)
    filepath = os.path.join(OUTPUT_DIR, f'{name}_hd.png')
    img.save(filepath, 'PNG')
    print(f"  {name}_hd ({img.size[0]}x{img.size[1]})")

print(f"\nDone! All sprites in: {OUTPUT_DIR}")
print(f"Total: {len(SPRITES)} sprites x2 = {len(SPRITES)*2} files")
