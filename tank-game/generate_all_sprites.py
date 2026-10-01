"""
Comprehensive Sprite Generator for Tank Game
Generates top-down view sprites matching the game's sci-fi polygonal style.
All sprites have transparent backgrounds and glowing neon outlines.
"""

from PIL import Image, ImageDraw, ImageFilter
import os
import math

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), 'enemies')
os.makedirs(OUTPUT_DIR, exist_ok=True)

def create_glow_sprite(size, draw_func, glow_color, glow_radius=12):
    padding = glow_radius * 3
    total = size + padding * 2
    img = Image.new('RGBA', (total, total), (0, 0, 0, 0))
    
    sprite = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw_func(ImageDraw.Draw(sprite), size)
    
    # Create glow layer
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

def polygon_points(cx, cy, n, radius, rotation=0):
    points = []
    for i in range(n):
        angle = (i / n) * 2 * math.pi + rotation
        points.append((cx + radius * math.cos(angle), cy + radius * math.sin(angle)))
    return points

def star_points(cx, cy, n, outer_r, inner_r, rotation=0):
    points = []
    for i in range(2 * n):
        angle = (i / (2 * n)) * 2 * math.pi + rotation
        r = outer_r if i % 2 == 0 else inner_r
        points.append((cx + r * math.cos(angle), cy + r * math.sin(angle)))
    return points

def sc(size, v):
    return int(v * size / 128.0)

# ============ ENEMIES ============

def draw_scout(draw, size):
    cx, cy = size // 2, size // 2
    s = lambda v: sc(size, v)
    body = (40, 15, 35, 255)
    outline = (255, 46, 136, 255)  # magenta #ff2e88
    detail = (255, 120, 180, 200)
    core = (255, 200, 230, 255)
    
    # Compact light chassis - diamond shape
    pts = polygon_points(cx, cy, 4, s(30), rotation=math.pi/4)
    draw.polygon(pts, fill=body, outline=outline)
    
    # Small turret
    draw.ellipse([cx-s(10), cy-s(10), cx+s(10), cy+s(10)], fill=(60, 20, 50, 255), outline=outline)
    
    # Barrel pointing up
    draw.rectangle([cx-s(3), cy-s(36), cx+s(3), cy-s(10)], fill=(80, 30, 60, 255), outline=outline)
    
    # Side fins
    for side in [-1, 1]:
        draw.polygon([
            (cx + side*s(22), cy - s(5)),
            (cx + side*s(34), cy),
            (cx + side*s(22), cy + s(8)),
            (cx + side*s(18), cy)
        ], fill=body, outline=outline)
    
    # Core
    draw.ellipse([cx-s(5), cy-s(5), cx+s(5), cy+s(5)], fill=core)

def draw_heavy(draw, size):
    cx, cy = size // 2, size // 2
    s = lambda v: sc(size, v)
    body = (50, 20, 60, 255)
    outline = (155, 89, 182, 255)  # purple #9b59b6
    detail = (200, 150, 220, 200)
    core = (220, 180, 255, 255)
    
    # Large thick chassis - octagon
    pts = polygon_points(cx, cy, 8, s(38), rotation=math.pi/8)
    draw.polygon(pts, fill=body, outline=outline)
    
    # Tracks
    draw.rectangle([cx-s(42), cy-s(30), cx-s(30), cy+s(30)], fill=(30, 15, 40, 255), outline=outline)
    draw.rectangle([cx+s(30), cy-s(30), cx+s(42), cy+s(30)], fill=(30, 15, 40, 255), outline=outline)
    
    # Big heavy turret
    draw.ellipse([cx-s(20), cy-s(20), cx+s(20), cy+s(20)], fill=(70, 30, 80, 255), outline=outline)
    
    # Double barrels
    draw.rectangle([cx-s(10), cy-s(40), cx-s(4), cy-s(20)], fill=(80, 40, 100, 255), outline=outline)
    draw.rectangle([cx+s(4), cy-s(40), cx+s(10), cy-s(20)], fill=(80, 40, 100, 255), outline=outline)
    
    # Armor plates
    for angle in [0, 90, 180, 270]:
        rad = angle * math.pi / 180
        x1 = cx + s(28) * math.cos(rad)
        y1 = cy + s(28) * math.sin(rad)
        x2 = cx + s(38) * math.cos(rad)
        y2 = cy + s(38) * math.sin(rad)
        draw.line([(x1, y1), (x2, y2)], fill=outline, width=s(3))
    
    # Core
    draw.ellipse([cx-s(7), cy-s(7), cx+s(7), cy+s(7)], fill=core)

def draw_sniper(draw, size):
    cx, cy = size // 2, size // 2
    s = lambda v: sc(size, v)
    body = (60, 35, 10, 255)
    outline = (230, 126, 34, 255)  # orange #e67e22
    detail = (255, 180, 100, 200)
    core = (255, 220, 150, 255)
    
    # Low profile chassis - stretched hexagon
    pts = polygon_points(cx, cy, 6, s(28), rotation=0)
    # Stretch vertically
    stretched = [(x, y * 0.85 + cy * 0.15) for x, y in pts]
    stretched = [(x - cx + cx, y) for x, y in stretched]
    draw.polygon(stretched, fill=body, outline=outline)
    
    # Long thin barrel
    draw.rectangle([cx-s(2), cy-s(52), cx+s(2), cy-s(8)], fill=(80, 50, 20, 255), outline=outline)
    draw.rectangle([cx-s(4), cy-s(55), cx+s(4), cy-s(50)], fill=outline)
    
    # Turret
    draw.ellipse([cx-s(12), cy-s(12), cx+s(12), cy+s(12)], fill=(80, 45, 15, 255), outline=outline)
    
    # Side rails
    draw.line([(cx-s(20), cy-s(2)), (cx-s(28), cy-s(2))], fill=outline, width=s(2))
    draw.line([(cx-s(20), cy+s(2)), (cx-s(28), cy+s(2))], fill=outline, width=s(2))
    draw.line([(cx+s(20), cy-s(2)), (cx+s(28), cy-s(2))], fill=outline, width=s(2))
    draw.line([(cx+s(20), cy+s(2)), (cx+s(28), cy+s(2))], fill=outline, width=s(2))
    
    # Core
    draw.ellipse([cx-s(5), cy-s(5), cx+s(5), cy+s(5)], fill=core)

def draw_bomber(draw, size):
    cx, cy = size // 2, size // 2
    s = lambda v: sc(size, v)
    body = (80, 15, 15, 255)
    outline = (255, 59, 59, 255)  # bright red #ff3b3b
    detail = (255, 120, 120, 200)
    core = (255, 200, 100, 255)
    
    # Rounded chassis - pentagon
    pts = polygon_points(cx, cy, 5, s(30), rotation=-math.pi/2)
    draw.polygon(pts, fill=body, outline=outline)
    
    # Glowing explosive core at center
    draw.ellipse([cx-s(16), cy-s(16), cx+s(16), cy+s(16)], fill=(150, 30, 30, 255), outline=outline)
    
    # Core - pulsing
    draw.ellipse([cx-s(10), cy-s(10), cx+s(10), cy+s(10)], fill=(255, 150, 50, 255))
    draw.ellipse([cx-s(5), cy-s(5), cx+s(5), cy+s(5)], fill=core)
    
    # Warning spikes
    for angle in range(0, 360, 60):
        rad = angle * math.pi / 180
        x1 = cx + s(28) * math.cos(rad)
        y1 = cy + s(28) * math.sin(rad)
        x2 = cx + s(36) * math.cos(rad)
        y2 = cy + s(36) * math.sin(rad)
        draw.line([(x1, y1), (x2, y2)], fill=outline, width=s(2))
        draw.ellipse([x2-s(2), y2-s(2), x2+s(2), y2+s(2)], fill=detail)
    
    # Side armor
    draw.rectangle([cx-s(34), cy-s(8), cx-s(28), cy+s(8)], fill=(100, 20, 20, 255), outline=outline)
    draw.rectangle([cx+s(28), cy-s(8), cx+s(34), cy+s(8)], fill=(100, 20, 20, 255), outline=outline)

def draw_spread(draw, size):
    cx, cy = size // 2, size // 2
    s = lambda v: sc(size, v)
    body = (15, 70, 60, 255)
    outline = (26, 188, 156, 255)  # teal-cyan #1abc9c
    detail = (100, 240, 200, 200)
    core = (150, 255, 220, 255)
    
    # Medium size polygonal tank - hexagon
    pts = polygon_points(cx, cy, 6, s(30), rotation=0)
    draw.polygon(pts, fill=body, outline=outline)
    
    # Multiple short barrels
    for angle in range(0, 360, 72):
        rad = angle * math.pi / 180 - math.pi/2
        bx = cx + s(18) * math.cos(rad)
        by = cy + s(18) * math.sin(rad)
        tx = cx + s(32) * math.cos(rad)
        ty = cy + s(32) * math.sin(rad)
        draw.line([(bx, by), (tx, ty)], fill=(30, 120, 100, 255), width=s(5))
        draw.ellipse([tx-s(3), ty-s(3), tx+s(3), ty+s(3)], fill=outline)
    
    # Center turret
    draw.ellipse([cx-s(12), cy-s(12), cx+s(12), cy+s(12)], fill=(25, 90, 75, 255), outline=outline)
    
    # Core
    draw.ellipse([cx-s(6), cy-s(6), cx+s(6), cy+s(6)], fill=core)
    
    # Inner ring
    draw.ellipse([cx-s(22), cy-s(22), cx+s(22), cy+s(22)], outline=detail, width=s(1))


# ============ ELITE ENEMIES ============

def draw_elite_warrior(draw, size):
    cx, cy = size // 2, size // 2
    s = lambda v: sc(size, v)
    body = (80, 65, 15, 255)
    outline = (255, 215, 0, 255)  # gold #ffd700
    detail = (255, 240, 150, 200)
    core = (255, 255, 200, 255)
    
    # Heavy armored polygonal tank - octagon
    pts = polygon_points(cx, cy, 8, s(38), rotation=math.pi/8)
    draw.polygon(pts, fill=body, outline=outline)
    
    # Dual turret cannons
    draw.ellipse([cx-s(22), cy-s(18), cx-s(4), cy+s(12)], fill=(100, 80, 25, 255), outline=outline)
    draw.ellipse([cx+s(4), cy-s(18), cx+s(22), cy+s(12)], fill=(100, 80, 25, 255), outline=outline)
    
    # Left barrel
    draw.rectangle([cx-s(18), cy-s(36), cx-s(12), cy-s(18)], fill=(120, 100, 40, 255), outline=outline)
    # Right barrel
    draw.rectangle([cx+s(12), cy-s(36), cx+s(18), cy-s(18)], fill=(120, 100, 40, 255), outline=outline)
    
    # Central core
    draw.ellipse([cx-s(10), cy-s(5), cx+s(10), cy+s(10)], fill=core)
    
    # Armor plates
    for side in [-1, 1]:
        x0, x1 = sorted([cx + side*s(32), cx + side*s(42)])
        draw.polygon([
            (x0, cy - s(15)),
            (x1, cy - s(5)),
            (x1, cy + s(10)),
            (x0, cy + s(15))
        ], fill=(90, 70, 20, 255), outline=outline)
    
    # Detail lines
    for angle in [45, 135, 225, 315]:
        rad = angle * math.pi / 180
        x1 = cx + s(28) * math.cos(rad)
        y1 = cy + s(28) * math.sin(rad)
        x2 = cx + s(38) * math.cos(rad)
        y2 = cy + s(38) * math.sin(rad)
        draw.line([(x1, y1), (x2, y2)], fill=outline, width=s(3))

def draw_elite_sorcerer(draw, size):
    cx, cy = size // 2, size // 2
    s = lambda v: sc(size, v)
    body = (50, 20, 80, 255)
    outline = (168, 85, 247, 255)  # purple #a855f7
    detail = (200, 150, 255, 200)
    core = (230, 200, 255, 255)
    
    # Floating polygonal unit - no treads, hover
    # Outer ring
    draw.ellipse([cx-s(38), cy-s(38), cx+s(38), cy+s(38)], outline=outline, width=s(3))
    
    # Hexagonal body
    pts = polygon_points(cx, cy, 6, s(28), rotation=0)
    draw.polygon(pts, fill=body, outline=outline)
    
    # Energy core
    draw.ellipse([cx-s(18), cy-s(18), cx+s(18), cy+s(18)], fill=(70, 30, 110, 255), outline=outline)
    draw.ellipse([cx-s(10), cy-s(10), cx+s(10), cy+s(10)], fill=core)
    
    # Floating energy tendrils
    for angle in range(0, 360, 60):
        rad = angle * math.pi / 180
        x1 = cx + s(30) * math.cos(rad)
        y1 = cy + s(30) * math.sin(rad)
        x2 = cx + s(42) * math.cos(rad)
        y2 = cy + s(42) * math.sin(rad)
        draw.line([(x1, y1), (x2, y2)], fill=detail, width=s(2))
        draw.ellipse([x2-s(3), y2-s(3), x2+s(3), y2+s(3)], fill=outline)
    
    # Inner rune pattern
    for i in range(6):
        angle = (i / 6) * 2 * math.pi
        x = cx + s(20) * math.cos(angle)
        y = cy + s(20) * math.sin(angle)
        draw.ellipse([x-s(2), y-s(2), x+s(2), y+s(2)], fill=detail)

def draw_elite_hunter(draw, size):
    cx, cy = size // 2, size // 2
    s = lambda v: sc(size, v)
    body = (10, 70, 40, 255)
    outline = (0, 255, 136, 255)  # green #00ff88
    detail = (100, 255, 180, 200)
    core = (180, 255, 220, 255)
    
    # Sleek narrow chassis - elongated hexagon
    pts = polygon_points(cx, cy, 6, s(25), rotation=0)
    stretched = []
    for x, y in pts:
        stretched.append((cx + (x - cx) * 0.7, cy + (y - cy) * 1.3))
    draw.polygon(stretched, fill=body, outline=outline)
    
    # Missile launchers on sides
    for side in [-1, 1]:
        # Launcher rail
        x0, x1 = sorted([cx + side*s(32) - s(4), cx + side*s(42) + s(4)])
        draw.rectangle([x0, cy - s(15), x1, cy + s(15)], fill=(20, 90, 50, 255), outline=outline)
        # Missiles
        for i in range(3):
            my = cy - s(10) + i * s(10)
            mx0, mx1 = sorted([cx + side*s(40) - s(3), cx + side*s(46) + s(3)])
            draw.ellipse([mx0, my - s(5), mx1, my + s(5)], fill=outline)
    
    # Center turret
    draw.ellipse([cx-s(10), cy-s(8), cx+s(10), cy+s(8)], fill=(15, 80, 45, 255), outline=outline)
    
    # Forward cannon
    draw.rectangle([cx-s(2), cy-s(42), cx+s(2), cy-s(12)], fill=(30, 100, 60, 255), outline=outline)
    
    # Core
    draw.ellipse([cx-s(4), cy-s(4), cx+s(4), cy+s(4)], fill=core)

def draw_elite_guardian(draw, size):
    cx, cy = size // 2, size // 2
    s = lambda v: sc(size, v)
    body = (20, 40, 90, 255)
    outline = (59, 130, 246, 255)  # blue #3b82f6
    detail = (150, 200, 255, 200)
    core = (200, 230, 255, 255)
    
    # Huge wide chassis - decagon
    pts = polygon_points(cx, cy, 10, s(40), rotation=0)
    draw.polygon(pts, fill=body, outline=outline)
    
    # Blue shield energy ring
    for r in [s(44), s(46), s(48)]:
        draw.ellipse([cx-r, cy-r, cx+r, cy+r], outline=detail, width=s(1))
    
    # Inner shield ring
    draw.ellipse([cx-s(32), cy-s(32), cx+s(32), cy+s(32)], outline=outline, width=s(2))
    
    # Very thick armor plates
    for angle in range(0, 360, 45):
        rad = angle * math.pi / 180
        x1 = cx + s(30) * math.cos(rad)
        y1 = cy + s(30) * math.sin(rad)
        x2 = cx + s(40) * math.cos(rad)
        y2 = cy + s(40) * math.sin(rad)
        draw.line([(x1, y1), (x2, y2)], fill=outline, width=s(4))
    
    # Heavy turret
    draw.ellipse([cx-s(18), cy-s(18), cx+s(18), cy+s(18)], fill=(30, 55, 110, 255), outline=outline)
    
    # Dual heavy barrels
    draw.rectangle([cx-s(14), cy-s(42), cx-s(6), cy-s(18)], fill=(40, 70, 130, 255), outline=outline)
    draw.rectangle([cx+s(6), cy-s(42), cx+s(14), cy-s(18)], fill=(40, 70, 130, 255), outline=outline)
    
    # Core
    draw.ellipse([cx-s(8), cy-s(8), cx+s(8), cy+s(8)], fill=core)


# ============ BOSSES ============

def draw_iron_sentinel(draw, size):
    cx, cy = size // 2, size // 2
    s = lambda v: sc(size, v)
    body = (60, 20, 80, 255)
    magenta = (255, 46, 136, 255)
    cyan = (0, 240, 255, 255)
    detail = (200, 150, 230, 200)
    core = (255, 200, 255, 255)
    
    # Four-legged fixed turret mech
    # Central body - large hexagon
    pts = polygon_points(cx, cy, 6, s(45), rotation=0)
    draw.polygon(pts, fill=body, outline=magenta)
    
    # Legs - 4 cardinal directions
    for angle in [0, 90, 180, 270]:
        rad = angle * math.pi / 180
        bx = cx + s(40) * math.cos(rad)
        by = cy + s(40) * math.sin(rad)
        lx = cx + s(60) * math.cos(rad)
        ly = cy + s(60) * math.sin(rad)
        # Leg
        draw.line([(bx, by), (lx, ly)], fill=(80, 30, 100, 255), width=s(8))
        # Leg tip
        tip_x = cx + s(65) * math.cos(rad)
        tip_y = cy + s(65) * math.sin(rad)
        draw.ellipse([tip_x-s(6), tip_y-s(6), tip_x+s(6), tip_y+s(6)], fill=magenta)
    
    # Central rotating cannon array
    # Ring of cannons
    for angle in range(0, 360, 30):
        rad = angle * math.pi / 180
        bx = cx + s(25) * math.cos(rad)
        by = cy + s(25) * math.sin(rad)
        tx = cx + s(38) * math.cos(rad)
        ty = cy + s(38) * math.sin(rad)
        draw.line([(bx, by), (tx, ty)], fill=cyan, width=s(3))
    
    # Inner rotating core
    draw.ellipse([cx-s(28), cy-s(28), cx+s(28), cy+s(28)], fill=(80, 30, 100, 255), outline=cyan)
    draw.ellipse([cx-s(18), cy-s(18), cx+s(18), cy+s(18)], fill=core)
    draw.ellipse([cx-s(8), cy-s(8), cx+s(8), cy+s(8)], fill=magenta)

def draw_sky_rift(draw, size):
    cx, cy = size // 2, size // 2
    s = lambda v: sc(size, v)
    body = (40, 15, 60, 255)
    cyan = (0, 240, 255, 255)
    magenta = (255, 46, 136, 255)
    detail = (150, 200, 255, 200)
    core = (200, 240, 255, 255)
    
    # Floating flying fortress - large flat polygonal hover platform
    pts = polygon_points(cx, cy, 8, s(50), rotation=math.pi/8)
    draw.polygon(pts, fill=body, outline=cyan)
    
    # Inner platform
    inner_pts = polygon_points(cx, cy, 8, s(38), rotation=0)
    draw.polygon(inner_pts, fill=(60, 25, 85, 255), outline=magenta)
    
    # Laser emitters
    for angle in range(0, 360, 45):
        rad = angle * math.pi / 180
        ex = cx + s(42) * math.cos(rad)
        ey = cy + s(42) * math.sin(rad)
        # Emitter housing
        draw.ellipse([ex-s(6), ey-s(6), ex+s(6), ey+s(6)], fill=cyan)
        # Inner glow
        draw.ellipse([ex-s(3), ey-s(3), ex+s(3), ey+s(3)], fill=magenta)
    
    # Central core
    draw.ellipse([cx-s(20), cy-s(20), cx+s(20), cy+s(20)], fill=(70, 30, 100, 255), outline=cyan)
    draw.ellipse([cx-s(12), cy-s(12), cx+s(12), cy+s(12)], fill=core)
    draw.ellipse([cx-s(6), cy-s(6), cx+s(6), cy+s(6)], fill=magenta)
    
    # Platform edge lights
    for angle in range(22, 360, 45):
        rad = angle * math.pi / 180
        x = cx + s(48) * math.cos(rad)
        y = cy + s(48) * math.sin(rad)
        draw.ellipse([x-s(2), y-s(2), x+s(2), y+s(2)], fill=detail)
    
    # Hover glow ring
    draw.ellipse([cx-s(55), cy-s(55), cx+s(55), cy+s(55)], outline=cyan, width=s(2))

def draw_quantum_twin_cyan(draw, size):
    cx, cy = size // 2, size // 2
    s = lambda v: sc(size, v)
    body = (10, 50, 70, 255)
    outline = (0, 240, 255, 255)  # cyan #00f0ff
    detail = (100, 240, 255, 200)
    core = (200, 250, 255, 255)
    
    # Compact hover mech - diamond
    pts = polygon_points(cx, cy, 4, s(35), rotation=0)
    draw.polygon(pts, fill=body, outline=outline)
    
    # Energy core
    draw.ellipse([cx-s(16), cy-s(16), cx+s(16), cy+s(16)], fill=(15, 70, 95, 255), outline=outline)
    draw.ellipse([cx-s(10), cy-s(10), cx+s(10), cy+s(10)], fill=core)
    draw.ellipse([cx-s(5), cy-s(5), cx+s(5), cy+s(5)], fill=outline)
    
    # Side wings
    for side in [-1, 1]:
        draw.polygon([
            (cx + side*s(20), cy - s(10)),
            (cx + side*s(36), cy),
            (cx + side*s(20), cy + s(10))
        ], fill=(15, 60, 85, 255), outline=outline)
    
    # Energy tendrils
    for angle in range(0, 360, 90):
        rad = angle * math.pi / 180
        x1 = cx + s(30) * math.cos(rad)
        y1 = cy + s(30) * math.sin(rad)
        x2 = cx + s(40) * math.cos(rad)
        y2 = cy + s(40) * math.sin(rad)
        draw.line([(x1, y1), (x2, y2)], fill=detail, width=s(2))

def draw_quantum_twin_purple(draw, size):
    cx, cy = size // 2, size // 2
    s = lambda v: sc(size, v)
    body = (50, 20, 70, 255)
    outline = (168, 85, 247, 255)  # purple #a855f7
    detail = (210, 150, 255, 200)
    core = (230, 200, 255, 255)
    
    # Compact hover mech - diamond
    pts = polygon_points(cx, cy, 4, s(35), rotation=0)
    draw.polygon(pts, fill=body, outline=outline)
    
    # Energy core
    draw.ellipse([cx-s(16), cy-s(16), cx+s(16), cy+s(16)], fill=(70, 30, 95, 255), outline=outline)
    draw.ellipse([cx-s(10), cy-s(10), cx+s(10), cy+s(10)], fill=core)
    draw.ellipse([cx-s(5), cy-s(5), cx+s(5), cy+s(5)], fill=outline)
    
    # Side wings
    for side in [-1, 1]:
        draw.polygon([
            (cx + side*s(20), cy - s(10)),
            (cx + side*s(36), cy),
            (cx + side*s(20), cy + s(10))
        ], fill=(60, 25, 85, 255), outline=outline)
    
    # Energy tendrils
    for angle in range(0, 360, 90):
        rad = angle * math.pi / 180
        x1 = cx + s(30) * math.cos(rad)
        y1 = cy + s(30) * math.sin(rad)
        x2 = cx + s(40) * math.cos(rad)
        y2 = cy + s(40) * math.sin(rad)
        draw.line([(x1, y1), (x2, y2)], fill=detail, width=s(2))

def draw_doom_engine(draw, size):
    cx, cy = size // 2, size // 2
    s = lambda v: sc(size, v)
    body = (60, 15, 15, 255)
    red = (255, 59, 59, 255)
    orange = (255, 107, 0, 255)
    magenta = (255, 46, 136, 255)
    detail = (255, 180, 150, 200)
    core = (255, 220, 100, 255)
    
    # Giant multi-segmented mechanical fortress
    # Outer ring
    draw.ellipse([cx-s(70), cy-s(70), cx+s(70), cy+s(70)], outline=red, width=s(4))
    
    # Main body - large octagon
    pts = polygon_points(cx, cy, 8, s(55), rotation=0)
    draw.polygon(pts, fill=body, outline=orange)
    
    # Segment rings
    for r in [s(50), s(45), s(40)]:
        draw.ellipse([cx-r, cy-r, cx+r, cy+r], outline=(200, 40, 40, 255), width=s(1))
    
    # Central weak-point glowing core
    draw.ellipse([cx-s(30), cy-s(30), cx+s(30), cy+s(30)], fill=(120, 30, 30, 255), outline=red)
    draw.ellipse([cx-s(20), cy-s(20), cx+s(20), cy+s(20)], fill=orange)
    draw.ellipse([cx-s(12), cy-s(12), cx+s(12), cy+s(12)], fill=core)
    draw.ellipse([cx-s(6), cy-s(6), cx+s(6), cy+s(6)], fill=magenta)
    
    # Multiple turret segments
    for angle in range(0, 360, 60):
        rad = angle * math.pi / 180
        # Turret base
        bx = cx + s(50) * math.cos(rad)
        by = cy + s(50) * math.sin(rad)
        draw.ellipse([bx-s(8), by-s(8), bx+s(8), by+s(8)], fill=(80, 25, 25, 255), outline=orange)
        # Barrel
        tx = cx + s(65) * math.cos(rad)
        ty = cy + s(65) * math.sin(rad)
        draw.line([(bx, by), (tx, ty)], fill=red, width=s(5))
        draw.ellipse([tx-s(4), ty-s(4), tx+s(4), ty+s(4)], fill=magenta)
    
    # Armor spikes
    for angle in range(30, 360, 60):
        rad = angle * math.pi / 180
        x1 = cx + s(55) * math.cos(rad)
        y1 = cy + s(55) * math.sin(rad)
        x2 = cx + s(68) * math.cos(rad)
        y2 = cy + s(68) * math.sin(rad)
        draw.line([(x1, y1), (x2, y2)], fill=orange, width=s(4))
        draw.ellipse([x2-s(3), y2-s(3), x2+s(3), y2+s(3)], fill=red)


# ============ PLAYER & WEAPON ENTITIES ============

def draw_player_tank(draw, size):
    cx, cy = size // 2, size // 2
    s = lambda v: sc(size, v)
    body = (20, 60, 90, 255)
    outline = (0, 240, 255, 255)  # cyan #00f0ff
    detail = (150, 240, 255, 200)
    core = (200, 250, 255, 255)
    
    # Sci-fi polygonal tank chassis
    pts = polygon_points(cx, cy, 6, s(28), rotation=0)
    draw.polygon(pts, fill=body, outline=outline)
    
    # Tracks
    draw.rectangle([cx-s(34), cy-s(22), cx-s(26), cy+s(22)], fill=(10, 40, 60, 255), outline=outline)
    draw.rectangle([cx+s(26), cy-s(22), cx+s(34), cy+s(22)], fill=(10, 40, 60, 255), outline=outline)
    
    # Turret
    draw.ellipse([cx-s(14), cy-s(14), cx+s(14), cy+s(14)], fill=(30, 75, 110, 255), outline=outline)
    
    # Main cannon
    draw.rectangle([cx-s(4), cy-s(36), cx+s(4), cy-s(14)], fill=(40, 90, 130, 255), outline=outline)
    draw.rectangle([cx-s(6), cy-s(40), cx+s(6), cy-s(34)], fill=outline)
    
    # Side detail
    draw.line([(cx-s(18), cy-s(4)), (cx-s(24), cy-s(4))], fill=detail, width=s(2))
    draw.line([(cx-s(18), cy+s(4)), (cx-s(24), cy+s(4))], fill=detail, width=s(2))
    draw.line([(cx+s(18), cy-s(4)), (cx+s(24), cy-s(4))], fill=detail, width=s(2))
    draw.line([(cx+s(18), cy+s(4)), (cx+s(24), cy+s(4))], fill=detail, width=s(2))
    
    # Core
    draw.ellipse([cx-s(6), cy-s(6), cx+s(6), cy+s(6)], fill=core)

def draw_drone(draw, size):
    cx, cy = size // 2, size // 2
    s = lambda v: sc(size, v)
    body = (15, 50, 70, 255)
    outline = (0, 240, 255, 255)  # cyan #00f0ff
    detail = (130, 240, 255, 200)
    core = (200, 250, 255, 255)
    
    # Compact polygonal hover drone - triangle
    pts = polygon_points(cx, cy, 3, s(22), rotation=-math.pi/2)
    draw.polygon(pts, fill=body, outline=outline)
    
    # Hover glow ring
    draw.ellipse([cx-s(24), cy-s(6), cx+s(24), cy+s(6)], outline=detail, width=s(1))
    
    # Small gun barrel
    draw.rectangle([cx-s(2), cy-s(30), cx+s(2), cy-s(20)], fill=(30, 80, 110, 255), outline=outline)
    
    # Side stabilizers
    for side in [-1, 1]:
        draw.polygon([
            (cx + side*s(16), cy - s(2)),
            (cx + side*s(26), cy - s(6)),
            (cx + side*s(26), cy + s(2)),
            (cx + side*s(16), cy + s(2))
        ], fill=(20, 60, 85, 255), outline=outline)
    
    # Core
    draw.ellipse([cx-s(5), cy-s(2), cx+s(5), cy+s(5)], fill=core)

def draw_mine(draw, size):
    cx, cy = size // 2, size // 2
    s = lambda v: sc(size, v)
    body = (60, 50, 15, 255)
    outline = (255, 215, 0, 255)  # gold #ffd700
    detail = (255, 240, 150, 200)
    core = (255, 255, 200, 255)
    
    # Round flat device
    draw.ellipse([cx-s(22), cy-s(22), cx+s(22), cy+s(22)], fill=body, outline=outline)
    
    # Central radiation symbol
    # Triangular blades
    for angle in [0, 120, 240]:
        rad = (angle - 90) * math.pi / 180
        pts = [
            (cx + s(6) * math.cos(rad), cy + s(6) * math.sin(rad)),
            (cx + s(18) * math.cos(rad + 0.3), cy + s(18) * math.sin(rad + 0.3)),
            (cx + s(18) * math.cos(rad - 0.3), cy + s(18) * math.sin(rad - 0.3)),
        ]
        draw.polygon(pts, fill=outline)
    
    # Center circle
    draw.ellipse([cx-s(6), cy-s(6), cx+s(6), cy+s(6)], fill=core, outline=outline)
    
    # Faint outer warning ring
    draw.ellipse([cx-s(28), cy-s(28), cx+s(28), cy+s(28)], outline=detail, width=s(1))
    
    # Small indicator lights
    for angle in range(0, 360, 60):
        rad = angle * math.pi / 180
        x = cx + s(26) * math.cos(rad)
        y = cy + s(26) * math.sin(rad)
        draw.ellipse([x-s(2), y-s(2), x+s(2), y+s(2)], fill=outline)


# ============ PROJECTILES / EFFECTS ============

def draw_missile(draw, size):
    cx, cy = size // 2, size // 2
    s = lambda v: sc(size, v)
    body = (15, 70, 40, 255)
    outline = (0, 255, 136, 255)  # green #00ff88
    detail = (120, 255, 180, 200)
    
    # Sleek sci-fi missile - pointing up
    # Nose cone
    draw.polygon([
        (cx, cy - s(28)),
        (cx - s(8), cy - s(10)),
        (cx + s(8), cy - s(10)),
    ], fill=body, outline=outline)
    
    # Body
    draw.rectangle([cx-s(8), cy-s(10), cx+s(8), cy+s(12)], fill=body, outline=outline)
    
    # Tail fins
    draw.polygon([
        (cx - s(8), cy + s(2)),
        (cx - s(18), cy + s(14)),
        (cx - s(8), cy + s(12)),
    ], fill=(20, 85, 50, 255), outline=outline)
    
    draw.polygon([
        (cx + s(8), cy + s(2)),
        (cx + s(18), cy + s(14)),
        (cx + s(8), cy + s(12)),
    ], fill=(20, 85, 50, 255), outline=outline)
    
    # Exhaust
    draw.polygon([
        (cx - s(4), cy + s(12)),
        (cx, cy + s(22)),
        (cx + s(4), cy + s(12)),
    ], fill=detail)
    
    # Center stripe
    draw.line([(cx, cy - s(8)), (cx, cy + s(10))], fill=detail, width=s(1))

def draw_plasma_orb(draw, size):
    cx, cy = size // 2, size // 2
    s = lambda v: sc(size, v)
    
    # Large glowing red energy sphere
    # Outer glow layers
    for r in [s(30), s(24), s(18)]:
        alpha = 50 + int(100 * (r / s(30)))
        draw.ellipse([cx-r, cy-r, cx+r, cy+r], fill=(255, 80, 80, alpha))
    
    # Main sphere
    draw.ellipse([cx-s(16), cy-s(16), cx+s(16), cy+s(16)], fill=(255, 59, 59, 255), outline=(255, 100, 100, 255))
    
    # Inner hot core
    draw.ellipse([cx-s(10), cy-s(10), cx+s(10), cy+s(10)], fill=(255, 150, 150, 255))
    draw.ellipse([cx-s(6), cy-s(6), cx+s(6), cy+s(6)], fill=(255, 220, 220, 255))
    
    # Pulsing ring
    draw.ellipse([cx-s(20), cy-s(20), cx+s(20), cy+s(20)], outline=(255, 120, 120, 150), width=s(1))

def draw_flamethrower(draw, size):
    cx, cy = size // 2, size // 2
    s = lambda v: sc(size, v)
    
    # Bright orange fire cone - semi-transparent
    # Outer cone
    pts_outer = [
        (cx, cy - s(30)),
        (cx - s(28), cy + s(20)),
        (cx + s(28), cy + s(20)),
    ]
    draw.polygon(pts_outer, fill=(255, 107, 0, 100))
    
    # Middle cone
    pts_mid = [
        (cx, cy - s(22)),
        (cx - s(20), cy + s(15)),
        (cx + s(20), cy + s(15)),
    ]
    draw.polygon(pts_mid, fill=(255, 140, 50, 140))
    
    # Inner cone
    pts_inner = [
        (cx, cy - s(14)),
        (cx - s(12), cy + s(10)),
        (cx + s(12), cy + s(10)),
    ]
    draw.polygon(pts_inner, fill=(255, 180, 100, 180))
    
    # Fire particles
    import random
    random.seed(42)
    for _ in range(15):
        angle = random.uniform(-0.8, 0.8) - math.pi/2
        dist = random.uniform(s(10), s(28))
        px = cx + dist * math.cos(angle)
        py = cy + dist * math.sin(angle)
        r = random.randint(s(2), s(5))
        alpha = random.randint(80, 160)
        colors = [(255, 107, 0), (255, 160, 50), (255, 200, 100), (255, 255, 200)]
        c = random.choice(colors)
        draw.ellipse([px-r, py-r, px+r, py+r], fill=(c[0], c[1], c[2], alpha))

def draw_poison_cloud(draw, size):
    cx, cy = size // 2, size // 2
    s = lambda v: sc(size, v)
    
    # Soft toxic-green semi-transparent cloud
    cloud_color = (136, 255, 0, 80)
    cloud_edge = (136, 255, 0, 120)
    
    # Main cloud blob - irregular shape
    blobs = [
        (cx - s(5), cy - s(5), s(18)),
        (cx + s(8), cy - s(10), s(15)),
        (cx + s(12), cy + s(5), s(16)),
        (cx - s(10), cy + s(8), s(14)),
        (cx, cy + s(12), s(13)),
        (cx - s(15), cy + s(2), s(12)),
        (cx + s(3), cy - s(14), s(11)),
    ]
    
    for bx, by, br in blobs:
        draw.ellipse([bx-br, by-br, bx+br, by+br], fill=cloud_color)
    
    # Edge highlights
    for bx, by, br in blobs:
        draw.ellipse([bx-br, by-br, bx+br, by+br], outline=cloud_edge, width=s(1))
    
    # Inner bubbles
    import random
    random.seed(99)
    for _ in range(12):
        angle = random.uniform(0, 2 * math.pi)
        dist = random.uniform(s(5), s(18))
        px = cx + dist * math.cos(angle)
        py = cy + dist * math.sin(angle)
        r = random.randint(s(2), s(5))
        draw.ellipse([px-r, py-r, px+r, py+r], fill=(180, 255, 100, 100))


# ============ GENERATE ALL SPRITES ============

SPRITES = {
    # Enemies (128px)
    'enemy_scout':     {'draw': draw_scout,     'size': 128, 'glow': (255, 46, 136),  'glow_r': 10},
    'enemy_heavy':     {'draw': draw_heavy,     'size': 160, 'glow': (155, 89, 182),  'glow_r': 12},
    'enemy_sniper':    {'draw': draw_sniper,    'size': 128, 'glow': (230, 126, 34),  'glow_r': 10},
    'enemy_bomber':    {'draw': draw_bomber,    'size': 128, 'glow': (255, 59, 59),   'glow_r': 10},
    'enemy_spread':    {'draw': draw_spread,    'size': 128, 'glow': (26, 188, 156),  'glow_r': 10},
    
    # Elite enemies (160px)
    'enemy_elite_warrior':   {'draw': draw_elite_warrior,   'size': 160, 'glow': (255, 215, 0),    'glow_r': 14},
    'enemy_elite_sorcerer':  {'draw': draw_elite_sorcerer,  'size': 160, 'glow': (168, 85, 247),   'glow_r': 14},
    'enemy_elite_hunter':    {'draw': draw_elite_hunter,    'size': 160, 'glow': (0, 255, 136),    'glow_r': 14},
    'enemy_elite_guardian':  {'draw': draw_elite_guardian,  'size': 192, 'glow': (59, 130, 246),   'glow_r': 15},
    
    # Bosses (256px)
    'boss_iron_sentinel':    {'draw': draw_iron_sentinel,    'size': 256, 'glow': (255, 46, 136),   'glow_r': 18},
    'boss_sky_rift':        {'draw': draw_sky_rift,        'size': 256, 'glow': (0, 240, 255),    'glow_r': 18},
    'boss_quantum_cyan':    {'draw': draw_quantum_twin_cyan, 'size': 192, 'glow': (0, 240, 255),   'glow_r': 16},
    'boss_quantum_purple':  {'draw': draw_quantum_twin_purple, 'size': 192, 'glow': (168, 85, 247), 'glow_r': 16},
    'boss_doom_engine':      {'draw': draw_doom_engine,     'size': 320, 'glow': (255, 59, 59),    'glow_r': 20},
    
    # Player & entities (128px)
    'player_tank':     {'draw': draw_player_tank, 'size': 128, 'glow': (0, 240, 255),   'glow_r': 12},
    'entity_drone':    {'draw': draw_drone,     'size': 96,  'glow': (0, 240, 255),   'glow_r': 10},
    'entity_mine':     {'draw': draw_mine,      'size': 96,  'glow': (255, 215, 0),   'glow_r': 10},
    
    # Projectiles (64px)
    'proj_missile':    {'draw': draw_missile,   'size': 64,  'glow': (0, 255, 136),   'glow_r': 8},
    'proj_plasma':     {'draw': draw_plasma_orb, 'size': 64, 'glow': (255, 59, 59),  'glow_r': 10},
    'proj_flame':      {'draw': draw_flamethrower, 'size': 96, 'glow': (255, 107, 0), 'glow_r': 8},
    'proj_poison':     {'draw': draw_poison_cloud, 'size': 96, 'glow': (136, 255, 0), 'glow_r': 8},
}

# Generate normal size sprites
print("Generating sprites...")
for name, config in SPRITES.items():
    print(f"  {name} ({config['size']}px)...")
    img = create_glow_sprite(config['size'], config['draw'], config['glow'], config['glow_r'])
    filepath = os.path.join(OUTPUT_DIR, f'{name}.png')
    img.save(filepath, 'PNG')
    print(f"    Saved: {filepath} ({img.size[0]}x{img.size[1]})")

# Generate HD versions
print("\nGenerating HD versions...")
for name, config in SPRITES.items():
    hd_size = config['size'] * 2
    config_copy = dict(config)
    config_copy['size'] = hd_size
    img = create_glow_sprite(hd_size, config['draw'], config['glow'], config['glow_r'] * 2)
    filepath = os.path.join(OUTPUT_DIR, f'{name}_hd.png')
    img.save(filepath, 'PNG')
    print(f"  {name}_hd ({img.size[0]}x{img.size[1]})")

print(f"\nDone! All sprites generated in: {OUTPUT_DIR}")
print(f"Total: {len(SPRITES)} sprites x2 (normal + HD) = {len(SPRITES) * 2} files")
