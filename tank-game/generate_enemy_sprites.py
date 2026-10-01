"""
Enemy Sprite Generator for Tank Game
Generates top-down view enemy sprites matching the game's dark tech/military style.
All sprites have transparent backgrounds and glowing neon outlines.
"""

from PIL import Image, ImageDraw, ImageFilter
import os

# Output directory
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), 'enemies')
os.makedirs(OUTPUT_DIR, exist_ok=True)

def create_glow_image(base_size, draw_func, glow_color, glow_radius=8):
    """Create a sprite with glow effect"""
    # Create a larger canvas for glow
    padding = glow_radius * 3
    img = Image.new('RGBA', (base_size + padding * 2, base_size + padding * 2), (0, 0, 0, 0))
    
    # Draw the sprite centered
    sprite_img = Image.new('RGBA', (base_size, base_size), (0, 0, 0, 0))
    draw_func(ImageDraw.Draw(sprite_img), base_size)
    
    # Create glow layer
    glow_img = Image.new('RGBA', (base_size, base_size), (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow_img)
    
    # Create a copy of the sprite for glow
    glow_sprite = sprite_img.copy()
    
    # Apply glow by creating a colored version and blurring
    for y in range(base_size):
        for x in range(base_size):
            r, g, b, a = glow_sprite.getpixel((x, y))
            if a > 0:
                glow_sprite.putpixel((x, y), (glow_color[0], glow_color[1], glow_color[2], a))
    
    # Blur to create glow
    glow_blurred = glow_sprite.filter(ImageFilter.GaussianBlur(radius=glow_radius))
    
    # Composite: glow behind, sprite on top
    result = Image.new('RGBA', (base_size + padding * 2, base_size + padding * 2), (0, 0, 0, 0))
    result.paste(glow_blurred, (padding, padding), glow_blurred)
    result.paste(sprite_img, (padding, padding), sprite_img)
    
    return result

def draw_fast_infantry(draw, size):
    """Fast infantry - sleek arrow shape, orange (#ff8800)"""
    cx, cy = size // 2, size // 2
    s = size / 64.0  # scale factor based on 64px reference
    
    # Scale all dimensions
    def sc(v): return int(v * s)
    
    # Main body - sleek arrow/dart shape
    # Dark body
    body_color = (80, 30, 0, 255)
    outline_color = (255, 136, 0, 255)
    inner_color = (255, 200, 50, 180)
    
    # Arrow shape pointing up
    # Nose
    draw.polygon([
        (cx, cy - sc(28)),       # nose tip
        (cx - sc(8), cy - sc(10)),  # left nose
        (cx - sc(18), cy + sc(5)),  # left mid
        (cx - sc(22), cy + sc(15)), # left rear
        (cx - sc(12), cy + sc(10)), # left inner
        (cx - sc(5), cy + sc(18)),  # left tail
        (cx + sc(5), cy + sc(18)),  # right tail
        (cx + sc(12), cy + sc(10)), # right inner
        (cx + sc(22), cy + sc(15)), # right rear
        (cx + sc(18), cy + sc(5)),  # right mid
        (cx + sc(8), cy - sc(10)),  # right nose
    ], fill=body_color, outline=outline_color)
    
    # Center glowing core
    draw.ellipse([
        cx - sc(6), cy - sc(6),
        cx + sc(6), cy + sc(6)
    ], fill=outline_color)
    
    # Inner detail lines
    draw.line([(cx, cy - sc(20)), (cx, cy + sc(10))], fill=inner_color, width=sc(2))
    draw.line([(cx - sc(3), cy - sc(15)), (cx - sc(12), cy + sc(8))], fill=inner_color, width=sc(1))
    draw.line([(cx + sc(3), cy - sc(15)), (cx + sc(12), cy + sc(8))], fill=inner_color, width=sc(1))
    
    # Wings/fins
    draw.polygon([
        (cx - sc(18), cy - sc(5)),
        (cx - sc(28), cy + sc(5)),
        (cx - sc(22), cy + sc(12)),
        (cx - sc(14), cy + sc(2)),
    ], fill=body_color, outline=outline_color)
    
    draw.polygon([
        (cx + sc(18), cy - sc(5)),
        (cx + sc(28), cy + sc(5)),
        (cx + sc(22), cy + sc(12)),
        (cx + sc(14), cy + sc(2)),
    ], fill=body_color, outline=outline_color)

def draw_grunt(draw, size):
    """Grunt - standard circular, red (#ff4444)"""
    cx, cy = size // 2, size // 2
    s = size / 64.0
    
    def sc(v): return int(v * s)
    
    # Outer ring
    ring_color = (180, 40, 40, 255)
    outline_color = (255, 68, 68, 255)
    body_color = (100, 20, 20, 255)
    inner_color = (255, 120, 120, 200)
    core_color = (255, 200, 150, 255)
    
    # Outer ring
    draw.ellipse([
        cx - sc(28), cy - sc(28),
        cx + sc(28), cy + sc(28)
    ], outline=outline_color, width=sc(3))
    
    # Main body circle
    draw.ellipse([
        cx - sc(24), cy - sc(24),
        cx + sc(24), cy + sc(24)
    ], fill=body_color, outline=ring_color, width=sc(2))
    
    # Inner ring
    draw.ellipse([
        cx - sc(18), cy - sc(18),
        cx + sc(18), cy + sc(18)
    ], outline=inner_color, width=sc(1))
    
    # Core
    draw.ellipse([
        cx - sc(8), cy - sc(8),
        cx + sc(8), cy + sc(8)
    ], fill=core_color)
    
    # Inner eye
    draw.ellipse([
        cx - sc(4), cy - sc(4),
        cx + sc(4), cy + sc(4)
    ], fill=(255, 80, 80, 255))
    
    # Tech details - 4 cardinal points
    for angle in range(0, 360, 90):
        rad = angle * 3.14159 / 180
        x1 = cx + sc(20) * (1 if angle == 0 else -1 if angle == 180 else 0)
        y1 = cy + sc(20) * (1 if angle == 90 else -1 if angle == 270 else 0)
        x2 = cx + sc(26) * (1 if angle == 0 else -1 if angle == 180 else 0)
        y2 = cy + sc(26) * (1 if angle == 90 else -1 if angle == 270 else 0)
        draw.line([(x1, y1), (x2, y2)], fill=outline_color, width=sc(2))
    
    # Additional tech lines
    draw.ellipse([
        cx - sc(14), cy - sc(14),
        cx + sc(14), cy + sc(14)
    ], outline=(255, 100, 100, 100), width=sc(1))

def draw_tank(draw, size):
    """Tank - heavy armor square, brown (#884400)"""
    cx, cy = size // 2, size // 2
    s = size / 64.0
    
    def sc(v): return int(v * s)
    
    body_color = (90, 50, 20, 255)
    outline_color = (180, 100, 40, 255)
    track_color = (50, 50, 50, 255)
    turret_color = (140, 80, 30, 255)
    barrel_color = (100, 60, 30, 255)
    detail_color = (255, 180, 80, 200)
    
    # Tank body
    draw.rectangle([
        cx - sc(28), cy - sc(24),
        cx + sc(28), cy + sc(24)
    ], fill=body_color, outline=outline_color, width=sc(2))
    
    # Tracks - top
    draw.rectangle([
        cx - sc(30), cy - sc(28),
        cx + sc(30), cy - sc(22)
    ], fill=track_color, outline=outline_color, width=sc(1))
    
    # Track segments - top
    for i in range(-5, 6):
        draw.rectangle([
            cx + sc(i * 5 - 2), cy - sc(27),
            cx + sc(i * 5 + 2), cy - sc(23)
        ], fill=(80, 80, 80, 255))
    
    # Tracks - bottom
    draw.rectangle([
        cx - sc(30), cy + sc(22),
        cx + sc(30), cy + sc(28)
    ], fill=track_color, outline=outline_color, width=sc(1))
    
    # Track segments - bottom
    for i in range(-5, 6):
        draw.rectangle([
            cx + sc(i * 5 - 2), cy + sc(23),
            cx + sc(i * 5 + 2), cy + sc(27)
        ], fill=(80, 80, 80, 255))
    
    # Turret base
    draw.ellipse([
        cx - sc(16), cy - sc(16),
        cx + sc(16), cy + sc(16)
    ], fill=turret_color, outline=outline_color, width=sc(2))
    
    # Turret top
    draw.ellipse([
        cx - sc(10), cy - sc(10),
        cx + sc(10), cy + sc(10)
    ], fill=(120, 70, 25, 255), outline=detail_color, width=sc(1))
    
    # Cannon barrel - pointing up
    draw.rectangle([
        cx - sc(3), cy - sc(30),
        cx + sc(3), cy - sc(16)
    ], fill=barrel_color, outline=outline_color, width=sc(1))
    
    # Cannon tip
    draw.rectangle([
        cx - sc(5), cy - sc(32),
        cx + sc(5), cy - sc(28)
    ], fill=(80, 50, 20, 255), outline=detail_color, width=sc(1))
    
    # Side armor plates
    draw.rectangle([
        cx - sc(30), cy - sc(10),
        cx - sc(26), cy + sc(10)
    ], fill=(100, 60, 25, 255), outline=outline_color, width=sc(1))
    
    draw.rectangle([
        cx + sc(26), cy - sc(10),
        cx + sc(30), cy + sc(10)
    ], fill=(100, 60, 25, 255), outline=outline_color, width=sc(1))
    
    # Glowing core light
    draw.ellipse([
        cx - sc(4), cy - sc(4),
        cx + sc(4), cy + sc(4)
    ], fill=(255, 200, 100, 200))

def draw_shooter(draw, size):
    """Shooter - hexagonal ranged, purple (#aa44ff)"""
    cx, cy = size // 2, size // 2
    s = size / 64.0
    
    def sc(v): return int(v * s)
    
    body_color = (80, 30, 140, 255)
    outline_color = (170, 68, 255, 255)
    inner_color = (200, 150, 255, 200)
    barrel_color = (120, 40, 200, 255)
    core_color = (255, 180, 255, 255)
    
    # Hexagonal body
    hex_points = []
    for i in range(6):
        angle = (i / 6) * 3.14159 * 2 - 3.14159 / 2
        r = sc(26)
        hex_points.append((cx + r * __import__('math').cos(angle), cy + r * __import__('math').sin(angle)))
    
    draw.polygon(hex_points, fill=body_color, outline=outline_color)
    
    # Inner hex
    inner_points = []
    for i in range(6):
        angle = (i / 6) * 3.14159 * 2 - 3.14159 / 2
        r = sc(18)
        inner_points.append((cx + r * __import__('math').cos(angle), cy + r * __import__('math').sin(angle)))
    
    draw.polygon(inner_points, outline=inner_color, width=sc(1))
    
    # Core
    draw.ellipse([
        cx - sc(6), cy - sc(6),
        cx + sc(6), cy + sc(6)
    ], fill=core_color)
    
    # Gun barrels - 3 directional
    for angle_offset in [0, 60, 120]:
        angle = (angle_offset - 90) * 3.14159 / 180
        x1 = cx + sc(8) * __import__('math').cos(angle)
        y1 = cy + sc(8) * __import__('math').sin(angle)
        x2 = cx + sc(22) * __import__('math').cos(angle)
        y2 = cy + sc(22) * __import__('math').sin(angle)
        draw.line([(x1, y1), (x2, y2)], fill=barrel_color, width=sc(3))
        # Barrel tip
        tx = cx + sc(24) * __import__('math').cos(angle)
        ty = cy + sc(24) * __import__('math').sin(angle)
        draw.ellipse([tx - sc(2), ty - sc(2), tx + sc(2), ty + sc(2)], fill=outline_color)
    
    # Connector lines
    for i in range(6):
        angle = (i / 6) * 3.14159 * 2 - 3.14159 / 2
        r1 = sc(10)
        r2 = sc(16)
        x1 = cx + r1 * __import__('math').cos(angle)
        y1 = cy + r1 * __import__('math').sin(angle)
        x2 = cx + r2 * __import__('math').cos(angle)
        y2 = cy + r2 * __import__('math').sin(angle)
        draw.line([(x1, y1), (x2, y2)], fill=inner_color, width=sc(1))

def draw_splitter(draw, size):
    """Splitter - bio-mechanical, green (#44ff44)"""
    cx, cy = size // 2, size // 2
    s = size / 64.0
    
    def sc(v): return int(v * s)
    
    body_color = (30, 120, 30, 255)
    outline_color = (68, 255, 68, 255)
    inner_color = (150, 255, 150, 200)
    vein_color = (100, 255, 100, 200)
    core_color = (200, 255, 200, 255)
    
    # Outer circle
    draw.ellipse([
        cx - sc(28), cy - sc(28),
        cx + sc(28), cy + sc(28)
    ], outline=outline_color, width=sc(3))
    
    # Main body
    draw.ellipse([
        cx - sc(24), cy - sc(24),
        cx + sc(24), cy + sc(24)
    ], fill=body_color, outline=(50, 180, 50, 255), width=sc(2))
    
    # Inner pattern - cross/DNA pattern
    # X cross
    draw.line([
        (cx - sc(16), cy - sc(16)),
        (cx + sc(16), cy + sc(16))
    ], fill=vein_color, width=sc(3))
    
    draw.line([
        (cx + sc(16), cy - sc(16)),
        (cx - sc(16), cy + sc(16))
    ], fill=vein_color, width=sc(3))
    
    # Inner circle nodes at cross points
    for dx, dy in [(-12, -12), (12, -12), (12, 12), (-12, 12)]:
        draw.ellipse([
            cx + sc(dx) - sc(3), cy + sc(dy) - sc(3),
            cx + sc(dx) + sc(3), cy + sc(dy) + sc(3)
        ], fill=inner_color)
    
    # Core
    draw.ellipse([
        cx - sc(6), cy - sc(6),
        cx + sc(6), cy + sc(6)
    ], fill=core_color)
    
    # Inner ring
    draw.ellipse([
        cx - sc(18), cy - sc(18),
        cx + sc(18), cy + sc(18)
    ], outline=(100, 255, 100, 100), width=sc(1))
    
    # Organic tendrils
    for angle in range(0, 360, 45):
        rad = angle * 3.14159 / 180
        x1 = cx + sc(24) * __import__('math').cos(rad)
        y1 = cy + sc(24) * __import__('math').sin(rad)
        x2 = cx + sc(28) * __import__('math').cos(rad)
        y2 = cy + sc(28) * __import__('math').sin(rad)
        draw.line([(x1, y1), (x2, y2)], fill=outline_color, width=sc(2))

def draw_elite(draw, size):
    """Elite - enhanced grunt, glowing pink (#ff0066)"""
    cx, cy = size // 2, size // 2
    s = size / 64.0
    
    def sc(v): return int(v * s)
    
    body_color = (120, 0, 50, 255)
    outline_color = (255, 0, 102, 255)
    inner_color = (255, 100, 150, 200)
    core_color = (255, 200, 220, 255)
    detail_color = (255, 150, 180, 255)
    
    # Outer double ring
    draw.ellipse([
        cx - sc(30), cy - sc(30),
        cx + sc(30), cy + sc(30)
    ], outline=outline_color, width=sc(4))
    
    draw.ellipse([
        cx - sc(26), cy - sc(26),
        cx + sc(26), cy + sc(26)
    ], outline=(255, 50, 100, 255), width=sc(2))
    
    # Main body
    draw.ellipse([
        cx - sc(22), cy - sc(22),
        cx + sc(22), cy + sc(22)
    ], fill=body_color, outline=(200, 0, 80, 255), width=sc(2))
    
    # Inner ring
    draw.ellipse([
        cx - sc(16), cy - sc(16),
        cx + sc(16), cy + sc(16)
    ], outline=inner_color, width=sc(2))
    
    # Core - larger than grunt
    draw.ellipse([
        cx - sc(10), cy - sc(10),
        cx + sc(10), cy + sc(10)
    ], fill=core_color)
    
    # Inner eye
    draw.ellipse([
        cx - sc(5), cy - sc(5),
        cx + sc(5), cy + sc(5)
    ], fill=(255, 0, 50, 255))
    
    # Crown spikes (elite markings)
    for angle in range(0, 360, 45):
        rad = angle * 3.14159 / 180
        x1 = cx + sc(22) * __import__('math').cos(rad)
        y1 = cy + sc(22) * __import__('math').sin(rad)
        x2 = cx + sc(32) * __import__('math').cos(rad)
        y2 = cy + sc(32) * __import__('math').sin(rad)
        draw.line([(x1, y1), (x2, y2)], fill=outline_color, width=sc(3))
        # Tip dots
        draw.ellipse([
            x2 - sc(2), y2 - sc(2),
            x2 + sc(2), y2 + sc(2)
        ], fill=detail_color)
    
    # Tech arcs
    for angle_start, angle_end in [(30, 150), (210, 330)]:
        # Draw arc segments
        for angle in range(angle_start, angle_end + 1, 10):
            rad = angle * 3.14159 / 180
            x = cx + sc(19) * __import__('math').cos(rad)
            y = cy + sc(19) * __import__('math').sin(rad)
            draw.ellipse([x - sc(1), y - sc(1), x + sc(1), y + sc(1)], fill=detail_color)

def draw_boss(draw, size):
    """Boss - large menacing commander"""
    cx, cy = size // 2, size // 2
    s = size / 128.0  # Boss is 128px base
    
    def sc(v): return int(v * s)
    
    body_color = (60, 15, 15, 255)
    outline_color = (255, 68, 68, 255)
    inner_color = (180, 40, 40, 255)
    core_color = (255, 100, 70, 255)
    
    # Outer ring
    draw.ellipse([
        cx - sc(55), cy - sc(55),
        cx + sc(55), cy + sc(55)
    ], outline=outline_color, width=sc(5))
    
    # 8-pointed star body
    points = []
    for i in range(16):
        angle = (i / 16) * 3.14159 * 2 - 3.14159 / 2
        r = sc(40) if i % 2 == 0 else sc(28)
        points.append((cx + r * __import__('math').cos(angle), cy + r * __import__('math').sin(angle)))
    
    draw.polygon(points, fill=body_color, outline=inner_color)
    
    # Inner body
    draw.ellipse([
        cx - sc(28), cy - sc(28),
        cx + sc(28), cy + sc(28)
    ], fill=(80, 20, 20, 255), outline=inner_color, width=sc(2))
    
    # Core
    draw.ellipse([
        cx - sc(15), cy - sc(15),
        cx + sc(15), cy + sc(15)
    ], fill=core_color)
    
    # Inner core
    draw.ellipse([
        cx - sc(8), cy - sc(8),
        cx + sc(8), cy + sc(8)
    ], fill=(255, 200, 150, 255))
    
    # Turret
    draw.rectangle([
        cx - sc(6), cy - sc(55),
        cx + sc(6), cy - sc(25)
    ], fill=outline_color, outline=inner_color)
    
    # Guns
    draw.rectangle([
        cx - sc(12), cy - sc(45),
        cx - sc(4), cy - sc(35)
    ], fill=(180, 30, 30, 255))
    
    draw.rectangle([
        cx + sc(4), cy - sc(45),
        cx + sc(12), cy - sc(35)
    ], fill=(180, 30, 30, 255))
    
    # Side cannons
    for side in [-1, 1]:
        base_x = cx + side * sc(45)
        barrel_base_x = cx + side * sc(50)
        barrel_tip_x = cx + side * sc(58)
        # Sort x coordinates to ensure x0 <= x1
        x0_armor, x1_armor = sorted([base_x - sc(5), base_x + sc(5)])
        draw.rectangle([x0_armor, cy - sc(8), x1_armor, cy + sc(8)], fill=(180, 30, 30, 255), outline=inner_color)
        x0_barrel, x1_barrel = sorted([barrel_base_x, barrel_tip_x])
        draw.rectangle([x0_barrel, cy - sc(3), x1_barrel, cy + sc(3)], fill=outline_color)

# Generate all sprites
sprites = {
    'fast': {'draw': draw_fast_infantry, 'size': 64, 'glow': (255, 136, 0), 'glow_r': 8},
    'grunt': {'draw': draw_grunt, 'size': 128, 'glow': (255, 68, 68), 'glow_r': 10},
    'tank': {'draw': draw_tank, 'size': 128, 'glow': (200, 120, 40), 'glow_r': 8},
    'shooter': {'draw': draw_shooter, 'size': 128, 'glow': (170, 68, 255), 'glow_r': 10},
    'splitter': {'draw': draw_splitter, 'size': 128, 'glow': (68, 255, 68), 'glow_r': 10},
    'elite': {'draw': draw_elite, 'size': 128, 'glow': (255, 0, 102), 'glow_r': 12},
    'boss': {'draw': draw_boss, 'size': 256, 'glow': (255, 68, 68), 'glow_r': 15},
}

for name, config in sprites.items():
    print(f"Generating {name} sprite...")
    img = create_glow_image(config['size'], config['draw'], config['glow'], config['glow_r'])
    
    # Save with transparent background
    filepath = os.path.join(OUTPUT_DIR, f'enemy_{name}.png')
    img.save(filepath, 'PNG')
    print(f"  Saved: {filepath} ({img.size[0]}x{img.size[1]})")

# Also generate large versions for high-DPI displays
print("\nGenerating high-DPI versions...")
for name, config in sprites.items():
    large_size = config['size'] * 2
    config['size'] = large_size
    img = create_glow_image(large_size, config['draw'], config['glow'], config['glow_r'] * 2)
    filepath = os.path.join(OUTPUT_DIR, f'enemy_{name}_hd.png')
    img.save(filepath, 'PNG')
    print(f"  Saved: {filepath} ({img.size[0]}x{img.size[1]})")

print("\nDone! All enemy sprites generated successfully.")
print(f"Output directory: {OUTPUT_DIR}")