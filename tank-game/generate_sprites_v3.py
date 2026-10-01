"""
Sprite Generator v3 - Precise Match to Scout Tank Style
Key visual elements from the scout reference:
- Beveled rectangular chassis with layered armor (dark frame → mid gray → light highlight)
- Trapezoidal side armor plates with ventilation lines
- Prominent hexagonal core with glowing symbol
- Thick top-mounted barrel with turret base
- Bottom chassis detail element
- Neon glow outlines with outer halo
- Track details on edges
"""

from PIL import Image, ImageDraw, ImageFilter
import os
import math
import random

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), 'enemies')
os.makedirs(OUTPUT_DIR, exist_ok=True)

def sc(base, v):
    return int(v * base / 128.0)

def create_glow_sprite(size, draw_func, glow_color, glow_radius=16):
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

def hex_pts(cx, cy, r, rotation=0):
    return poly_pts(cx, cy, 6, r, rotation)

# Color palettes
C = {
    'dark': (42, 42, 48, 255),
    'mid': (68, 68, 74, 255),
    'light': (92, 92, 100, 255),
    'edge': (32, 32, 36, 255),
    'inner': (55, 55, 62, 255),
    'highlight': (110, 110, 118, 255),
    'track': (28, 28, 32, 255),
    'track_seg': (48, 48, 54, 255),
}

def draw_chassis(draw, cx, cy, w, h, outline):
    """Draw beveled chassis - the main tank body"""
    dk, md, lt, eg = C['dark'], C['mid'], C['light'], C['edge']
    
    # Outer frame with beveled corners
    inset = min(w, h) * 0.12
    pts = [
        (cx - w + inset, cy - h),
        (cx + w - inset, cy - h),
        (cx + w, cy - h + inset),
        (cx + w, cy + h - inset),
        (cx + w - inset, cy + h),
        (cx - w + inset, cy + h),
        (cx - w, cy + h - inset),
        (cx - w, cy - h + inset),
    ]
    draw.polygon(pts, fill=dk, outline=outline, width=3)
    
    # Mid layer
    inset2 = min(w, h) * 0.18
    pts2 = [
        (cx - w + inset2, cy - h + 3),
        (cx + w - inset2, cy - h + 3),
        (cx + w - 3, cy - h + inset2),
        (cx + w - 3, cy + h - inset2),
        (cx + w - inset2, cy + h - 3),
        (cx - w + inset2, cy + h - 3),
        (cx - w + 3, cy + h - inset2),
        (cx - w + 3, cy - h + inset2),
    ]
    draw.polygon(pts2, fill=md, outline=eg)
    
    # Light highlight top
    draw.polygon([
        (cx - w + inset2 + 2, cy - h + 4),
        (cx + w - inset2 - 2, cy - h + 4),
        (cx + w - inset2 - 4, cy - h + 10),
        (cx - w + inset2 + 4, cy - h + 10),
    ], fill=lt)
    
    # Inner detail lines
    draw.rectangle([cx - w*0.6, cy - h*0.3, cx + w*0.6, cy + h*0.3],
                   outline=eg, width=1)
    draw.rectangle([cx - w*0.5, cy - h*0.25, cx + w*0.5, cy + h*0.25],
                   outline=eg, width=1)

def draw_side_plate(draw, cx, cy, w, h, outline, side):
    """Draw trapezoidal side armor plate with ventilation"""
    dk, md, lt, eg = C['dark'], C['mid'], C['light'], C['edge']
    
    ax = cx + side * w
    
    # Main plate - trapezoidal shape
    pts = [
        (ax + side * 2, cy - h * 0.55),
        (ax + side * (h * 0.25), cy - h * 0.35),
        (ax + side * (h * 0.25), cy + h * 0.35),
        (ax + side * 2, cy + h * 0.55),
    ]
    draw.polygon(pts, fill=md, outline=outline, width=2)
    
    # Inner frame
    pts2 = [
        (ax + side * 4, cy - h * 0.45),
        (ax + side * (h * 0.22), cy - h * 0.28),
        (ax + side * (h * 0.22), cy + h * 0.28),
        (ax + side * 4, cy + h * 0.45),
    ]
    draw.polygon(pts2, fill=dk, outline=eg)
    
    # Ventilation lines
    for i in range(3):
        y = cy - h * 0.3 + i * h * 0.2
        draw.line([(ax + side*6, y), (ax + side*(h*0.18), y)], fill=outline, width=2)
    
    # Step detail
    step_x = ax + side * h * 0.3
    draw.line([(ax + side*2, cy - h*0.55), (step_x, cy - h*0.55)], fill=outline, width=2)
    draw.line([(ax + side*2, cy + h*0.55), (step_x, cy + h*0.55)], fill=outline, width=2)

def draw_tracks_v2(draw, cx, cy, w, h, outline):
    """Draw detailed tank tracks"""
    track_c = C['track']
    seg_c = C['track_seg']
    
    # Left track
    tx = cx - w - sc(128, 10)
    draw.rectangle([tx, cy - h, tx + sc(128, 8), cy + h], fill=track_c, outline=outline)
    # Track segments
    seg_h = sc(128, 4)
    gap = sc(128, 2)
    for y in range(cy - h + sc(128, 3), cy + h - seg_h, seg_h + gap):
        draw.rectangle([tx + sc(128, 1), y, tx + sc(128, 7), y + seg_h], fill=seg_c)
    
    # Right track
    tx2 = cx + w + sc(128, 2)
    draw.rectangle([tx2, cy - h, tx2 + sc(128, 8), cy + h], fill=track_c, outline=outline)
    for y in range(cy - h + sc(128, 3), cy + h - seg_h, seg_h + gap):
        draw.rectangle([tx2 + sc(128, 1), y, tx2 + sc(128, 7), y + seg_h], fill=seg_c)

def draw_hex_core_v2(draw, cx, cy, r, outline, accent, symbol='triangle'):
    """Draw detailed hexagonal core with symbol"""
    dk = (32, 32, 36, 255)
    md = (48, 48, 54, 255)
    
    # Outer hex
    pts = hex_pts(cx, cy, r, rotation=math.pi/6)
    draw.polygon(pts, fill=dk, outline=outline, width=2)
    
    # Inner hex
    pts2 = hex_pts(cx, cy, r * 0.72, rotation=math.pi/6)
    draw.polygon(pts2, fill=md, outline=accent)
    
    # Deep inner hex
    pts3 = hex_pts(cx, cy, r * 0.55, rotation=math.pi/6)
    draw.polygon(pts3, fill=(38, 38, 44, 255))
    
    # Symbol
    sr = r * 0.38
    if symbol == 'triangle':
        draw.polygon([(cx, cy-sr), (cx-sr*0.87, cy+sr*0.5), (cx+sr*0.87, cy+sr*0.5)],
                     fill=outline)
    elif symbol == 'cross':
        draw.rectangle([cx-sr*0.25, cy-sr, cx+sr*0.25, cy+sr], fill=outline)
        draw.rectangle([cx-sr, cy-sr*0.25, cx+sr, cy+sr*0.25], fill=outline)
    elif symbol == 'circle':
        draw.ellipse([cx-sr, cy-sr, cx+sr, cy+sr], fill=outline)
        draw.ellipse([cx-sr*0.45, cy-sr*0.45, cx+sr*0.45, cy+sr*0.45], fill=(255,255,255,255))
    elif symbol == 'ring':
        draw.ellipse([cx-sr, cy-sr, cx+sr, cy+sr], outline=outline, width=4)
        draw.ellipse([cx-sr*0.35, cy-sr*0.35, cx+sr*0.35, cy+sr*0.35], fill=outline)
    elif symbol == 'skull':
        draw.ellipse([cx-sr*0.75, cy-sr*0.65, cx+sr*0.75, cy+sr*0.65], fill=outline)
        draw.ellipse([cx-sr*0.45, cy-sr*0.25, cx-sr*0.08, cy+sr*0.08], fill=dk)
        draw.ellipse([cx+sr*0.08, cy-sr*0.25, cx+sr*0.45, cy+sr*0.08], fill=dk)
        draw.rectangle([cx-sr*0.15, cy+sr*0.15, cx+sr*0.15, cy+sr*0.35], fill=dk)
        for i in range(3):
            x = cx - sr*0.5 + i * sr*0.5
            draw.rectangle([x-sr*0.08, cy+sr*0.45, x+sr*0.08, cy+sr*0.58], fill=outline)
    elif symbol == 'x':
        draw.line([(cx-sr*0.7, cy-sr*0.7), (cx+sr*0.7, cy+sr*0.7)], fill=outline, width=5)
        draw.line([(cx+sr*0.7, cy-sr*0.7), (cx-sr*0.7, cy+sr*0.7)], fill=outline, width=5)
    elif symbol == 'bolt':
        draw.polygon([(cx-sr*0.15, cy-sr), (cx+sr*0.45, cy-sr*0.15), (cx, cy),
                      (cx+sr*0.35, cy+sr), (cx-sr*0.45, cy+sr*0.15), (cx-sr*0.1, cy-sr*0.15)],
                     fill=outline)
    elif symbol == 'square':
        draw.rectangle([cx-sr*0.65, cy-sr*0.65, cx+sr*0.65, cy+sr*0.65], fill=outline)
        draw.rectangle([cx-sr*0.3, cy-sr*0.3, cx+sr*0.3, cy+sr*0.3], fill=md)
    elif symbol == 'dot':
        draw.ellipse([cx-sr*0.5, cy-sr*0.5, cx+sr*0.5, cy+sr*0.5], fill=outline)

def draw_barrel_v2(draw, cx, cy, length, w, outline):
    """Draw thick barrel with turret base and highlight"""
    dk, md, lt, eg = C['dark'], C['mid'], C['light'], C['edge']
    
    # Turret base
    base_w = w * 3.5
    base_h = sc(128, 14)
    draw.rectangle([cx-base_w, cy-base_h, cx+base_w, cy], fill=dk, outline=outline, width=2)
    draw.rectangle([cx-base_w+2, cy-base_h+2, cx+base_w-2, cy-2], fill=md)
    # Top highlight on turret
    draw.rectangle([cx-base_w+4, cy-base_h+2, cx+base_w-4, cy-base_h+5], fill=lt)
    
    # Barrel
    draw.rectangle([cx-w, cy-length, cx+w, cy], fill=md, outline=outline, width=2)
    # Barrel highlight
    draw.rectangle([cx-w+1, cy-length+3, cx+w-1, cy-length+10], fill=lt)
    draw.rectangle([cx-w+1, cy-length+3, cx-w+3, cy], fill=lt)
    # Barrel shadow
    draw.rectangle([cx+w-3, cy-length+3, cx+w-1, cy], fill=dk)
    # Muzzle
    draw.rectangle([cx-w-1, cy-length-sc(128, 5), cx+w+1, cy-length],
                   fill=dk, outline=outline, width=1)
    draw.rectangle([cx-w+1, cy-length-sc(128,3), cx+w-1, cy-length-sc(128,1)], fill=lt)

def draw_bottom_detail(draw, cx, cy, w, outline):
    """Draw bottom chassis detail element"""
    dk, md, lt = C['dark'], C['mid'], C['light']
    bw = w * 0.2
    bh = sc(128, 5)
    draw.rectangle([cx-bw, cy, cx+bw, cy+bh], fill=md, outline=outline, width=2)
    draw.rectangle([cx-bw+2, cy+1, cx+bw-2, cy+3], fill=lt)

# ===== SCOUT (existing reference - magenta) =====
def draw_scout_base(draw, size):
    cx, cy = size//2, size//2
    w, h = sc(size, 34), sc(size, 32)
    outline = (255, 46, 136, 255)
    accent = (255, 120, 180, 255)
    
    draw_tracks_v2(draw, cx, cy, w, h, outline)
    draw_chassis(draw, cx, cy, w, h, outline)
    draw_side_plate(draw, cx, cy, w, h, outline, -1)
    draw_side_plate(draw, cx, cy, w, h, outline, 1)
    draw_barrel_v2(draw, cx, cy-sc(size, 12), sc(size, 30), sc(size, 4), outline)
    draw_hex_core_v2(draw, cx, cy+sc(size, 4), sc(size, 12), outline, accent, 'triangle')
    draw_bottom_detail(draw, cx, cy+h+sc(size, 2), w, outline)

# ===== HEAVY (purple) =====
def draw_heavy_base(draw, size):
    cx, cy = size//2, size//2
    w, h = sc(size, 48), sc(size, 42)
    outline = (155, 89, 182, 255)
    accent = (200, 150, 230, 255)
    
    draw_tracks_v2(draw, cx, cy, w, h, outline)
    draw_chassis(draw, cx, cy, w, h, outline)
    draw_side_plate(draw, cx, cy, w, h, outline, -1)
    draw_side_plate(draw, cx, cy, w, h, outline, 1)
    
    # Double barrels
    bw = sc(size, 6)
    bh = sc(size, 32)
    for side in [-1, 1]:
        bx = cx + side * sc(size, 14)
        draw_barrel_v2(draw, bx, cy-sc(size, 14), bh, bw, outline)
    
    draw_hex_core_v2(draw, cx, cy+sc(size, 6), sc(size, 14), outline, accent, 'square')
    draw_bottom_detail(draw, cx, cy+h+sc(size, 2), w, outline)

# ===== SNIPER (orange) =====
def draw_sniper_base(draw, size):
    cx, cy = size//2, size//2
    w, h = sc(size, 30), sc(size, 36)
    outline = (230, 126, 34, 255)
    accent = (255, 180, 100, 255)
    
    draw_tracks_v2(draw, cx, cy, w, h, outline)
    draw_chassis(draw, cx, cy, w, h, outline)
    draw_side_plate(draw, cx, cy, w, h, outline, -1)
    draw_side_plate(draw, cx, cy, w, h, outline, 1)
    
    # Extra long barrel
    draw_barrel_v2(draw, cx, cy-sc(size, 6), sc(size, 48), sc(size, 4), outline)
    
    # Side rail details
    for side in [-1, 1]:
        draw.line([(cx+side*sc(size,20), cy-sc(size,8)), (cx+side*sc(size,26), cy-sc(size,8))],
                  fill=accent, width=2)
        draw.line([(cx+side*sc(size,20), cy+sc(size,4)), (cx+side*sc(size,26), cy+sc(size,4))],
                  fill=accent, width=2)
    
    draw_hex_core_v2(draw, cx, cy+sc(size, 4), sc(size, 10), outline, accent, 'triangle')
    draw_bottom_detail(draw, cx, cy+h+sc(size, 2), w, outline)

# ===== BOMBER (red) =====
def draw_bomber_base(draw, size):
    cx, cy = size//2, size//2
    w, h = sc(size, 38), sc(size, 36)
    outline = (255, 59, 59, 255)
    accent = (255, 180, 180, 255)
    
    draw_tracks_v2(draw, cx, cy, w, h, outline)
    draw_chassis(draw, cx, cy, w, h, outline)
    draw_side_plate(draw, cx, cy, w, h, outline, -1)
    draw_side_plate(draw, cx, cy, w, h, outline, 1)
    
    # Warning spikes
    for angle in [0, 45, 90, 135, 180, 225, 270, 315]:
        rad = angle * math.pi / 180
        x1 = cx + (w+2) * math.cos(rad)
        y1 = cy + (h+2) * math.sin(rad)
        x2 = cx + (w+sc(size, 10)) * math.cos(rad)
        y2 = cy + (h+sc(size, 10)) * math.sin(rad)
        draw.line([(x1, y1), (x2, y2)], fill=outline, width=3)
        draw.ellipse([x2-3, y2-3, x2+3, y2+3], fill=accent)
    
    draw_hex_core_v2(draw, cx, cy, sc(size, 18), outline, (255,200,100,255), 'skull')
    draw_bottom_detail(draw, cx, cy+h+sc(size, 2), w, outline)

# ===== SPREAD (teal-cyan) =====
def draw_spread_base(draw, size):
    cx, cy = size//2, size//2
    w, h = sc(size, 36), sc(size, 34)
    outline = (26, 188, 156, 255)
    accent = (100, 240, 200, 255)
    
    draw_tracks_v2(draw, cx, cy, w, h, outline)
    draw_chassis(draw, cx, cy, w, h, outline)
    draw_side_plate(draw, cx, cy, w, h, outline, -1)
    draw_side_plate(draw, cx, cy, w, h, outline, 1)
    
    # Multiple short barrels pointing outward
    for angle in range(0, 360, 72):
        rad = (angle - 90) * math.pi / 180
        bx = cx + sc(size, 14) * math.cos(rad)
        by = cy + sc(size, 14) * math.sin(rad)
        tx = cx + sc(size, 30) * math.cos(rad)
        ty = cy + sc(size, 30) * math.sin(rad)
        # Thick barrel line
        pts_perp = [(-math.sin(rad)*sc(size,4), math.cos(rad)*sc(size,4)),
                     (math.sin(rad)*sc(size,4), -math.cos(rad)*sc(size,4))]
        p1 = (bx + pts_perp[0][0], by + pts_perp[0][1])
        p2 = (bx + pts_perp[1][0], by + pts_perp[1][1])
        p3 = (tx + pts_perp[1][0], ty + pts_perp[1][1])
        p4 = (tx + pts_perp[0][0], ty + pts_perp[0][1])
        draw.polygon([p1, p2, p3, p4], fill=(40,100,85,255), outline=outline)
        draw.ellipse([tx-sc(size,3), ty-sc(size,3), tx+sc(size,3), ty+sc(size,3)], fill=outline)
    
    draw_hex_core_v2(draw, cx, cy, sc(size, 12), outline, accent, 'circle')
    draw_bottom_detail(draw, cx, cy+h+sc(size, 2), w, outline)

# ===== ELITE WARRIOR (gold) =====
def draw_elite_warrior_base(draw, size):
    cx, cy = size//2, size//2
    w, h = sc(size, 46), sc(size, 40)
    outline = (255, 215, 0, 255)
    accent = (255, 240, 150, 255)
    
    draw_tracks_v2(draw, cx, cy, w, h, outline)
    draw_chassis(draw, cx, cy, w, h, outline)
    draw_side_plate(draw, cx, cy, w, h, outline, -1)
    draw_side_plate(draw, cx, cy, w, h, outline, 1)
    
    # Dual turret cannons (side by side)
    for side in [-1, 1]:
        tx = cx + side * sc(size, 22)
        ty = cy - sc(size, 10)
        # Turret
        draw.ellipse([tx-sc(size,12), ty-sc(size,8), tx+sc(size,12), ty+sc(size,8)],
                     fill=(85,80,45,255), outline=outline, width=2)
        # Barrel
        draw_barrel_v2(draw, tx, ty-sc(size,8), sc(size,26), sc(size,3), outline)
    
    draw_hex_core_v2(draw, cx, cy+sc(size, 6), sc(size, 16), outline, accent, 'cross')
    draw_bottom_detail(draw, cx, cy+h+sc(size, 2), w, outline)

# ===== ELITE SORCERER (purple, hover) =====
def draw_elite_sorcerer_base(draw, size):
    cx, cy = size//2, size//2
    w = sc(size, 44)
    outline = (168, 85, 247, 255)
    accent = (210, 150, 255, 255)
    
    # Outer ring
    draw.ellipse([cx-w-sc(128,6), cy-w-sc(128,6), cx+w+sc(128,6), cy+w+sc(128,6)],
                 outline=outline, width=3)
    
    # Hover body (hexagonal)
    pts = hex_pts(cx, cy, w, rotation=0)
    draw.polygon(pts, fill=(55,35,75,255), outline=outline, width=3)
    pts2 = hex_pts(cx, cy, w-sc(128, 10), rotation=0)
    draw.polygon(pts2, fill=(75,50,100,255), outline=(120,60,180,255))
    
    # Large energy core
    draw_hex_core_v2(draw, cx, cy, sc(size, 20), outline, accent, 'ring')
    
    # Energy tendrils
    for angle in range(0, 360, 60):
        rad = angle * math.pi / 180
        x1 = cx + (w-sc(128,4)) * math.cos(rad)
        y1 = cy + (w-sc(128,4)) * math.sin(rad)
        x2 = cx + (w+sc(128,6)) * math.cos(rad)
        y2 = cy + (w+sc(128,6)) * math.sin(rad)
        draw.line([(x1, y1), (x2, y2)], fill=accent, width=2)
        draw.ellipse([x2-sc(128,3), y2-sc(128,3), x2+sc(128,3), y2+sc(128,3)], fill=outline)

# ===== ELITE HUNTER (green) =====
def draw_elite_hunter_base(draw, size):
    cx, cy = size//2, size//2
    w, h = sc(size, 28), sc(size, 42)
    outline = (0, 255, 136, 255)
    accent = (150, 255, 200, 255)
    
    # Sleek narrow chassis - stretched
    pts = poly_pts(cx, cy, 6, w, rotation=0)
    stretched = [(cx+(x-cx)*0.72, cy+(y-cy)*1.25) for x,y in pts]
    draw.polygon(stretched, fill=(35,60,48,255), outline=outline, width=3)
    
    # Missile launchers on sides
    for side in [-1, 1]:
        ax = cx + side * sc(size, 32)
        draw.rectangle([ax-sc(size,4), cy-sc(size,16), ax+sc(size,4), cy+sc(size,16)],
                       fill=(45,70,55,255), outline=outline, width=2)
        for i in range(3):
            my = cy - sc(size,12) + i * sc(size,11)
            draw.rectangle([ax-sc(size,3), my-sc(size,3), ax+sc(size,3), my+sc(size,3)],
                           fill=(55,80,65,255), outline=outline)
    
    # Forward cannon
    draw_barrel_v2(draw, cx, cy-sc(size,6), sc(size,40), sc(size,3), outline)
    
    draw_hex_core_v2(draw, cx, cy+sc(size, 4), sc(size, 12), outline, accent, 'bolt')
    draw_bottom_detail(draw, cx, cy+h+sc(size, 2), w, outline)

# ===== ELITE GUARDIAN (blue) =====
def draw_elite_guardian_base(draw, size):
    cx, cy = size//2, size//2
    w, h = sc(size, 54), sc(size, 44)
    outline = (59, 130, 246, 255)
    accent = (150, 200, 255, 255)
    
    # Huge chassis
    draw_tracks_v2(draw, cx, cy, w, h, outline)
    draw_chassis(draw, cx, cy, w, h, outline)
    draw_side_plate(draw, cx, cy, w, h, outline, -1)
    draw_side_plate(draw, cx, cy, w, h, outline, 1)
    
    # Shield rings
    for r in [w+sc(128,8), w+sc(128,12), w+sc(128,16)]:
        draw.ellipse([cx-r, cy-r, cx+r, cy+r], outline=accent, width=2)
    
    # Armor spikes
    for angle in range(0, 360, 45):
        rad = angle * math.pi / 180
        x1 = cx + (w-sc(128,4)) * math.cos(rad)
        y1 = cy + (w-sc(128,4)) * math.sin(rad)
        x2 = cx + (w+sc(128,8)) * math.cos(rad)
        y2 = cy + (w+sc(128,8)) * math.sin(rad)
        draw.line([(x1, y1), (x2, y2)], fill=outline, width=sc(128,4))
    
    # Dual heavy barrels
    for side in [-1, 1]:
        draw_barrel_v2(draw, cx+side*sc(size,18), cy-sc(size,12), sc(size,34), sc(size,5), outline)
    
    draw_hex_core_v2(draw, cx, cy+sc(size, 8), sc(size, 18), outline, accent, 'circle')
    draw_bottom_detail(draw, cx, cy+h+sc(size, 2), w, outline)

# ===== BOSS: IRON SENTINEL (magenta/cyan) =====
def draw_boss_sentinel(draw, size):
    cx, cy = size//2, size//2
    w = sc(size, 68)
    magenta = (255, 46, 136, 255)
    cyan = (0, 240, 255, 255)
    
    # Central hex body
    pts = hex_pts(cx, cy, w, rotation=0)
    draw.polygon(pts, fill=(60,30,75,255), outline=magenta, width=3)
    pts2 = hex_pts(cx, cy, w-sc(128,12), rotation=0)
    draw.polygon(pts2, fill=(80,50,95,255), outline=cyan)
    
    # Four-legged structure
    for angle in [0, 90, 180, 270]:
        rad = angle * math.pi / 180
        bx = cx + (w-sc(128,4)) * math.cos(rad)
        by = cy + (w-sc(128,4)) * math.sin(rad)
        lx = cx + (w+sc(128,30)) * math.cos(rad)
        ly = cy + (w+sc(128,30)) * math.sin(rad)
        # Leg
        draw.line([(bx, by), (lx, ly)], fill=(70,40,85,255), width=sc(128,10))
        # Joint
        draw.ellipse([lx-sc(128,10), ly-sc(128,10), lx+sc(128,10), ly+sc(128,10)],
                     fill=(55,30,70,255), outline=magenta)
        # Foot
        fx = cx + (w+sc(128,42)) * math.cos(rad)
        fy = cy + (w+sc(128,42)) * math.sin(rad)
        draw.ellipse([fx-sc(128,8), fy-sc(128,8), fx+sc(128,8), fy+sc(128,8)], fill=cyan)
    
    # Rotating cannon array
    for angle in range(0, 360, 30):
        rad = angle * math.pi / 180
        bx = cx + sc(128,32) * math.cos(rad)
        by = cy + sc(128,32) * math.sin(rad)
        tx = cx + sc(128,50) * math.cos(rad)
        ty = cy + sc(128,50) * math.sin(rad)
        draw.line([(bx, by), (tx, ty)], fill=(80,50,95,255), width=sc(128,5))
        draw.ellipse([tx-sc(128,4), ty-sc(128,4), tx+sc(128,4), ty+sc(128,4)], fill=cyan)
    
    # Central core
    draw_hex_core_v2(draw, cx, cy, sc(size, 24), magenta, cyan, 'ring')

# ===== BOSS: SKY RIFT (cyan/magenta) =====
def draw_boss_skyrift(draw, size):
    cx, cy = size//2, size//2
    w = sc(size, 78)
    cyan = (0, 240, 255, 255)
    magenta = (255, 46, 136, 255)
    
    # Floating fortress
    pts = poly_pts(cx, cy, 8, w, rotation=math.pi/8)
    draw.polygon(pts, fill=(45,30,60,255), outline=cyan, width=3)
    pts2 = poly_pts(cx, cy, 8, w-sc(128,14), rotation=0)
    draw.polygon(pts2, fill=(65,45,80,255), outline=magenta)
    
    # Laser emitters
    for angle in range(0, 360, 45):
        rad = angle * math.pi / 180
        ex = cx + (w-sc(128,8)) * math.cos(rad)
        ey = cy + (w-sc(128,8)) * math.sin(rad)
        draw.ellipse([ex-sc(128,8), ey-sc(128,8), ex+sc(128,8), ey+sc(128,8)],
                     fill=(55,35,70,255), outline=cyan)
        draw.ellipse([ex-sc(128,4), ey-sc(128,4), ex+sc(128,4), ey+sc(128,4)], fill=magenta)
    
    # Central core
    draw_hex_core_v2(draw, cx, cy, sc(size, 26), cyan, magenta, 'x')
    
    # Edge lights
    for angle in range(22, 360, 45):
        rad = angle * math.pi / 180
        x = cx + (w-sc(128,2)) * math.cos(rad)
        y = cy + (w-sc(128,2)) * math.sin(rad)
        draw.ellipse([x-sc(128,3), y-sc(128,3), x+sc(128,3), y+sc(128,3)],
                     fill=(150,220,255,255))
    
    # Hover ring
    draw.ellipse([cx-w-sc(128,8), cy-w-sc(128,8), cx+w+sc(128,8), cy+w+sc(128,8)],
                 outline=cyan, width=2)

# ===== BOSS: QUANTUM TWINS =====
def draw_quantum_base(draw, size, color):
    cx, cy = size//2, size//2
    w = sc(size, 42)
    outline = color
    accent = (min(color[0]+50, 255), min(color[1]+50, 255), min(color[2]+50, 255), 255)
    
    # Diamond hover mech
    pts = poly_pts(cx, cy, 4, w, rotation=0)
    draw.polygon(pts, fill=(30,50,65,255), outline=outline, width=3)
    pts2 = poly_pts(cx, cy, 4, w-sc(128,8), rotation=0)
    draw.polygon(pts2, fill=(50,75,95,255), outline=(min(color[0]-30,255), min(color[1]-30,255), min(color[2]-30,255), 255))
    
    # Wings
    for side in [-1, 1]:
        draw.polygon([(cx+side*w*0.6, cy-sc(128,14)), (cx+side*w*1.1, cy),
                       (cx+side*w*0.6, cy+sc(128,14))],
                      fill=(35,60,80,255), outline=outline)
    
    # Energy core
    draw_hex_core_v2(draw, cx, cy, sc(size, 18), outline, accent, 'bolt')
    
    # Tendrils
    for angle in range(0, 360, 90):
        rad = angle * math.pi / 180
        x1 = cx + (w-sc(128,2)) * math.cos(rad)
        y1 = cy + (w-sc(128,2)) * math.sin(rad)
        x2 = cx + (w+sc(128,8)) * math.cos(rad)
        y2 = cy + (w+sc(128,8)) * math.sin(rad)
        draw.line([(x1, y1), (x2, y2)], fill=accent, width=2)

# ===== BOSS: DOOM ENGINE (red/orange/magenta) =====
def draw_doom_engine(draw, size):
    cx, cy = size//2, size//2
    w = sc(size, 92)
    red = (255, 59, 59, 255)
    orange = (255, 140, 50, 255)
    magenta = (255, 46, 136, 255)
    
    # Outer ring
    draw.ellipse([cx-w-sc(128,8), cy-w-sc(128,8), cx+w+sc(128,8), cy+w+sc(128,8)],
                 outline=red, width=4)
    
    # Main body octagon
    pts = poly_pts(cx, cy, 8, w, rotation=0)
    draw.polygon(pts, fill=(65,25,25,255), outline=orange, width=3)
    pts2 = poly_pts(cx, cy, 8, w-sc(128,14), rotation=0)
    draw.polygon(pts2, fill=(85,40,40,255), outline=red)
    
    # Segment rings
    for r in [w-sc(128,20), w-sc(128,30), w-sc(128,40)]:
        draw.ellipse([cx-r, cy-r, cx+r, cy+r], outline=(180,50,50,255), width=2)
    
    # Central core
    draw_hex_core_v2(draw, cx, cy, sc(size, 32), red, orange, 'skull')
    
    # Turret segments
    for angle in range(0, 360, 60):
        rad = angle * math.pi / 180
        bx = cx + (w-sc(128,10)) * math.cos(rad)
        by = cy + (w-sc(128,10)) * math.sin(rad)
        draw.ellipse([bx-sc(128,10), by-sc(128,10), bx+sc(128,10), by+sc(128,10)],
                     fill=(75,30,30,255), outline=orange)
        tx = cx + (w+sc(128,22)) * math.cos(rad)
        ty = cy + (w+sc(128,22)) * math.sin(rad)
        draw.line([(bx, by), (tx, ty)], fill=red, width=sc(128,6))
        draw.ellipse([tx-sc(128,5), ty-sc(128,5), tx+sc(128,5), ty+sc(128,5)], fill=magenta)
    
    # Armor spikes
    for angle in range(30, 360, 60):
        rad = angle * math.pi / 180
        x1 = cx + w * math.cos(rad)
        y1 = cy + w * math.sin(rad)
        x2 = cx + (w+sc(128,20)) * math.cos(rad)
        y2 = cy + (w+sc(128,20)) * math.sin(rad)
        draw.line([(x1, y1), (x2, y2)], fill=orange, width=sc(128,5))
        draw.ellipse([x2-sc(128,4), y2-sc(128,4), x2+sc(128,4), y2+sc(128,4)], fill=red)

# ===== PLAYER TANK (cyan) =====
def draw_player_tank(draw, size):
    cx, cy = size//2, size//2
    w, h = sc(size, 36), sc(size, 32)
    outline = (0, 240, 255, 255)
    accent = (150, 240, 255, 255)
    
    draw_tracks_v2(draw, cx, cy, w, h, outline)
    draw_chassis(draw, cx, cy, w, h, outline)
    draw_side_plate(draw, cx, cy, w, h, outline, -1)
    draw_side_plate(draw, cx, cy, w, h, outline, 1)
    draw_barrel_v2(draw, cx, cy-sc(size, 12), sc(size, 30), sc(size, 4), outline)
    draw_hex_core_v2(draw, cx, cy+sc(size, 4), sc(size, 12), outline, accent, 'triangle')
    draw_bottom_detail(draw, cx, cy+h+sc(size, 2), w, outline)

# ===== DRONE (cyan) =====
def draw_drone_sprite(draw, size):
    cx, cy = size//2, size//2
    outline = (0, 240, 255, 255)
    accent = (150, 240, 255, 255)
    
    pts = poly_pts(cx, cy, 3, sc(size, 24), rotation=-math.pi/2)
    draw.polygon(pts, fill=(25,55,75,255), outline=outline, width=2)
    
    draw.ellipse([cx-sc(size,26), cy-sc(size,6), cx+sc(size,26), cy+sc(size,6)],
                 outline=accent, width=1)
    
    draw_barrel_v2(draw, cx, cy-sc(size,24), sc(size,12), sc(size,3), outline)
    
    for side in [-1, 1]:
        draw.polygon([(cx+side*sc(size,18), cy-sc(size,4)), (cx+side*sc(size,28), cy-sc(size,8)),
                       (cx+side*sc(size,28), cy+sc(size,2)), (cx+side*sc(size,18), cy+sc(size,2))],
                      fill=(30,60,82,255), outline=outline)
    
    draw_hex_core_v2(draw, cx, cy+sc(size, 2), sc(size, 9), outline, accent, 'circle')

# ===== MINE (gold) =====
def draw_mine_sprite(draw, size):
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

# ===== MISSILE (green) =====
def draw_missile_sprite(draw, size):
    cx, cy = size//2, size//2
    outline = (0, 255, 136, 255)
    accent = (120, 255, 180, 255)
    
    # Nose cone
    draw.polygon([(cx, cy-sc(size,30)), (cx-sc(size,8), cy-sc(size,12)),
                   (cx+sc(size,8), cy-sc(size,12))], fill=(25,75,50,255), outline=outline)
    # Body
    draw.rectangle([cx-sc(size,8), cy-sc(size,12), cx+sc(size,8), cy+sc(size,14)],
                   fill=(35,85,58,255), outline=outline)
    draw.rectangle([cx-sc(size,6), cy-sc(size,10), cx+sc(size,6), cy+sc(size,12)],
                   fill=(55,105,78,255))
    # Fins
    for side in [-1, 1]:
        draw.polygon([(cx+side*sc(size,8), cy+sc(size,2)), (cx+side*sc(size,18), cy+sc(size,16)),
                       (cx+side*sc(size,8), cy+sc(size,14))],
                      fill=(30,70,48,255), outline=outline)
    # Exhaust
    draw.polygon([(cx-sc(size,4), cy+sc(size,14)), (cx, cy+sc(size,24)),
                   (cx+sc(size,4), cy+sc(size,14))], fill=accent)
    draw.line([(cx, cy-sc(size,8)), (cx, cy+sc(size,12))], fill=accent, width=1)

# ===== PLASMA (red) =====
def draw_plasma_sprite(draw, size):
    cx, cy = size//2, size//2
    for r, a in [(sc(size,32),30),(sc(size,26),60),(sc(size,20),90)]:
        draw.ellipse([cx-r, cy-r, cx+r, cy+r], fill=(255,80,80,a))
    draw.ellipse([cx-sc(size,18), cy-sc(size,18), cx+sc(size,18), cy+sc(size,18)],
                 fill=(255,59,59,255), outline=(255,100,100,255))
    draw.ellipse([cx-sc(size,16), cy-sc(size,16), cx+sc(size,16), cy+sc(size,16)],
                 fill=(255,90,90,200))
    draw.ellipse([cx-sc(size,12), cy-sc(size,12), cx+sc(size,12), cy+sc(size,12)],
                 fill=(255,150,150,255))
    draw.ellipse([cx-sc(size,7), cy-sc(size,7), cx+sc(size,7), cy+sc(size,7)],
                 fill=(255,220,220,255))
    draw.ellipse([cx-sc(size,22), cy-sc(size,22), cx+sc(size,22), cy+sc(size,22)],
                 outline=(255,120,120,150), width=2)

# ===== FLAME EFFECT =====
def draw_flame_sprite(draw, size):
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

# ===== POISON CLOUD =====
def draw_poison_sprite(draw, size):
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


# ===== GENERATE ALL =====

SPRITES = {
    'enemy_heavy':   {'draw': draw_heavy_base,    'size': 160, 'glow': (155,89,182),  'glow_r': 14},
    'enemy_sniper':  {'draw': draw_sniper_base,   'size': 128, 'glow': (230,126,34),  'glow_r': 12},
    'enemy_bomber':  {'draw': draw_bomber_base,   'size': 128, 'glow': (255,59,59),   'glow_r': 12},
    'enemy_spread':  {'draw': draw_spread_base,   'size': 128, 'glow': (26,188,156),  'glow_r': 12},
    'enemy_elite_warrior':  {'draw': draw_elite_warrior_base,  'size': 192, 'glow': (255,215,0),   'glow_r': 16},
    'enemy_elite_sorcerer': {'draw': draw_elite_sorcerer_base, 'size': 192, 'glow': (168,85,247),  'glow_r': 16},
    'enemy_elite_hunter':   {'draw': draw_elite_hunter_base,   'size': 160, 'glow': (0,255,136),   'glow_r': 14},
    'enemy_elite_guardian': {'draw': draw_elite_guardian_base, 'size': 224, 'glow': (59,130,246),  'glow_r': 18},
    'boss_iron_sentinel':   {'draw': draw_boss_sentinel,       'size': 320, 'glow': (255,46,136),  'glow_r': 20},
    'boss_sky_rift':       {'draw': draw_boss_skyrift,        'size': 320, 'glow': (0,240,255),   'glow_r': 20},
    'boss_quantum_cyan':   {'draw': lambda d,s: draw_quantum_base(d,s,(0,240,255,255)),
                              'size': 224, 'glow': (0,240,255),   'glow_r': 16},
    'boss_quantum_purple': {'draw': lambda d,s: draw_quantum_base(d,s,(168,85,247,255)),
                              'size': 224, 'glow': (168,85,247),  'glow_r': 16},
    'boss_doom_engine':     {'draw': draw_doom_engine,        'size': 384, 'glow': (255,59,59),   'glow_r': 22},
    'player_tank':  {'draw': draw_player_tank, 'size': 128, 'glow': (0,240,255),  'glow_r': 14},
    'entity_drone': {'draw': draw_drone_sprite,'size': 96,  'glow': (0,240,255),  'glow_r': 12},
    'entity_mine':  {'draw': draw_mine_sprite, 'size': 96,  'glow': (255,215,0),  'glow_r': 12},
    'proj_missile': {'draw': draw_missile_sprite,'size': 80,  'glow': (0,255,136),  'glow_r': 10},
    'proj_plasma':  {'draw': draw_plasma_sprite, 'size': 80,  'glow': (255,59,59),  'glow_r': 12},
    'proj_flame':   {'draw': draw_flame_sprite, 'size': 128, 'glow': (255,107,0),  'glow_r': 10},
    'proj_poison':  {'draw': draw_poison_sprite, 'size': 128, 'glow': (136,255,0),  'glow_r': 10},
}

print("Generating v3 sprites...")
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
