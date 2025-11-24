import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageEnhance
import math

# Output directory
OUTPUT_DIR = "design_prototypes"
if not os.path.exists(OUTPUT_DIR):
    os.makedirs(OUTPUT_DIR)

# Dimensions
WIDTH = 1440
HEIGHT = 2000

def get_font(size):
    try:
        return ImageFont.truetype("arial.ttf", size)
    except:
        return ImageFont.load_default()

def draw_gradient(draw, rect, color1, color2, vertical=True):
    x1, y1, x2, y2 = rect
    width = x2 - x1
    height = y2 - y1
    if vertical:
        for i in range(height):
            r = int(color1[0] + (color2[0] - color1[0]) * i / height)
            g = int(color1[1] + (color2[1] - color1[1]) * i / height)
            b = int(color1[2] + (color2[2] - color1[2]) * i / height)
            draw.line([(x1, y1 + i), (x2, y1 + i)], fill=(r, g, b))
    else:
        for i in range(width):
            r = int(color1[0] + (color2[0] - color1[0]) * i / width)
            g = int(color1[1] + (color2[1] - color1[1]) * i / width)
            b = int(color1[2] + (color2[2] - color1[2]) * i / width)
            draw.line([(x1 + i, y1), (x1 + i, y2)], fill=(r, g, b))

def draw_button(draw, x, y, w, h, text, bg_color, text_color, radius=0):
    draw.rounded_rectangle([x, y, x+w, y+h], radius=radius, fill=bg_color)
    font = get_font(20)
    # accurate text centering
    bbox = font.getbbox(text) # left, top, right, bottom
    text_w = bbox[2] - bbox[0]
    text_h = bbox[3] - bbox[1]
    draw.text((x + (w - text_w) / 2, y + (h - text_h) / 2 - 2), text, fill=text_color, font=font)

def create_base_layout(variant_name, bg_color):
    img = Image.new('RGB', (WIDTH, HEIGHT), bg_color)
    draw = ImageDraw.Draw(img, 'RGBA')
    return img, draw

# ==========================================
# 1. Premium Minimalism
# ==========================================
def create_variant_1():
    img, draw = create_base_layout("minimalism", "#FFFFFF")
    
    # Header
    draw.line([(0, 100), (WIDTH, 100)], fill="#EEEEEE", width=1)
    draw.text((100, 40), "NIKITIN", fill="#000000", font=get_font(30))
    # Menu
    for i, label in enumerate(["CATALOG", "SERVICE", "ABOUT", "CONTACTS"]):
        draw.text((600 + i*150, 45), label, fill="#333333", font=get_font(16))
    
    # Banner
    # Placeholder for car image (Grey block)
    draw.rectangle([100, 150, 1340, 600], fill="#F5F5F5")
    draw.text((150, 250), "THE NEW ERA OF\nAUTOMOTIVE EXCELLENCE", fill="#000000", font=get_font(50))
    draw_button(draw, 150, 450, 200, 50, "EXPLORE", "#000000", "#FFFFFF", radius=0)
    
    # Catalog Grid
    draw.text((100, 700), "FEATURED MODELS", fill="#000000", font=get_font(24))
    for i in range(3):
        x = 100 + i * 430
        draw.rectangle([x, 750, x+400, 1100], fill="#FAFAFA", outline="#EEEEEE", width=1)
        # Car placeholder
        draw.rectangle([x+20, 770, x+380, 950], fill="#EEEEEE")
        draw.text((x+20, 970), "MODEL X", fill="#000000", font=get_font(20))
        draw.text((x+20, 1000), "$ 45,000", fill="#666666", font=get_font(16))

    # Reviews
    draw.rectangle([0, 1200, WIDTH, 1500], fill="#F9F9F9")
    draw.text((WIDTH/2 - 100, 1250), "TRUSTED BY EXPERTS", fill="#000000", font=get_font(24))
    draw.text((WIDTH/2 - 200, 1300), "\"The best service I have ever experienced.\"", fill="#555555", font=get_font(20))
    
    # Footer
    draw.rectangle([0, 1800, WIDTH, HEIGHT], fill="#111111")
    
    img.save(os.path.join(OUTPUT_DIR, "1_Premium_Minimalism.png"))
    print("Created 1_Premium_Minimalism.png")

# ==========================================
# 2. Tech "Tesla Style"
# ==========================================
def create_variant_2():
    img, draw = create_base_layout("tesla", "#F2F2F2")
    
    # Header - Transparent floating
    draw.rectangle([50, 30, WIDTH-50, 90], fill="#FFFFFF", outline=None)
    draw.text((100, 50), "NIKITIN", fill="#000000", font=get_font(24))
    
    # Banner - Full width hero
    draw_gradient(draw, (0, 0, WIDTH, 600), (220, 220, 220), (255, 255, 255))
    draw.text((WIDTH/2 - 200, 200), "FUTURE DRIVING", fill="#000000", font=get_font(60))
    draw_button(draw, WIDTH/2 - 100, 400, 200, 50, "ORDER NOW", "#FF0000", "#FFFFFF", radius=25)
    
    # Catalog - Horizontal scroll hint
    y_start = 700
    draw.text((100, y_start), "INVENTORY", fill="#333333", font=get_font(30))
    for i in range(3):
        x = 100 + i * 420
        # Card with soft shadow simulation (offset rect)
        draw.rounded_rectangle([x+5, y_start+65, x+405, y_start+405], radius=10, fill="#DDDDDD")
        draw.rounded_rectangle([x, y_start+60, x+400, y_start+400], radius=10, fill="#FFFFFF")
        draw.text((x+20, y_start+350), "Model S Plaid", fill="#000000", font=get_font(18))
    
    # Tech specs section (Trust/Help)
    draw.rectangle([0, 1200, WIDTH, 1600], fill="#000000")
    draw.text((100, 1250), "AUTOPILOT TECHNOLOGY", fill="#FFFFFF", font=get_font(30))
    draw.line([(100, 1300), (300, 1300)], fill="#FF0000", width=3)
    
    img.save(os.path.join(OUTPUT_DIR, "2_Tesla_Style.png"))
    print("Created 2_Tesla_Style.png")

# ==========================================
# 3. Metal + Glass + 3D
# ==========================================
def create_variant_3():
    img, draw = create_base_layout("metal_glass", "#E0E5EC") # Neumorphic base
    
    # Glassmorphism Header
    # Simulate glass with semi-transparent white and border
    draw.rectangle([0, 0, WIDTH, 100], fill=(255, 255, 255, 150))
    draw.line([(0, 100), (WIDTH, 100)], fill=(255, 255, 255, 200), width=1)
    draw.text((100, 40), "NIKITIN AUTO", fill="#2A3B4C", font=get_font(28))

    # Metallic Banner
    # Gradient background for banner
    draw_gradient(draw, (100, 150, 1340, 650), (200, 205, 210), (230, 235, 240))
    # Add "shine" line
    draw.line([(100, 150), (400, 650)], fill=(255, 255, 255, 100), width=100)
    
    draw.text((150, 300), "PRECISION & POWER", fill="#2A3B4C", font=get_font(50))
    
    # Glass Cards
    y_cat = 800
    for i in range(3):
        x = 100 + i * 430
        # Glass card background
        draw.rectangle([x, y_cat, x+400, y_cat+500], fill=(255, 255, 255, 100), outline=(255, 255, 255, 200))
        # Metallic button
        draw_gradient(draw, (x+50, y_cat+400, x+350, y_cat+450), (180, 190, 200), (210, 220, 230))
        draw.text((x+150, y_cat+415), "DETAILS", fill="#2A3B4C", font=get_font(16))

    # 3D element hint
    draw.ellipse([1100, 1200, 1300, 1400], fill=(200, 210, 220), outline=(255, 255, 255))
    
    img.save(os.path.join(OUTPUT_DIR, "3_Metal_Glass_3D.png"))
    print("Created 3_Metal_Glass_3D.png")

# ==========================================
# 4. Bright Neon Accent
# ==========================================
def create_variant_4():
    img, draw = create_base_layout("neon", "#F0F0F5")
    
    accent = "#00E5FF" # Cyan neon
    
    # Header
    draw.rectangle([0, 0, WIDTH, 80], fill="#FFFFFF")
    draw.line([(0, 78), (WIDTH, 78)], fill=accent, width=2)
    draw.text((100, 30), "NIKITIN", fill="#000000", font=get_font(30))
    
    # Banner with neon glow
    draw.rectangle([100, 150, 1340, 600], fill="#FFFFFF", outline=accent, width=2)
    # Glow effect simulation (concentric rects)
    for i in range(1, 10):
        draw.rectangle([100-i, 150-i, 1340+i, 600+i], outline=(0, 229, 255, 20-i*2), width=1)
        
    draw.text((150, 300), "ELECTRIFY YOUR RIDE", fill="#000000", font=get_font(50))
    draw_button(draw, 150, 450, 200, 60, "START NOW", accent, "#000000", radius=5)

    # Cards with accents
    y = 750
    for i in range(3):
        x = 100 + i * 430
        draw.rectangle([x, y, x+400, y+500], fill="#FFFFFF")
        draw.line([(x, y+500), (x+400, y+500)], fill=accent, width=4) # Bottom neon border
        
        # Image placeholder
        draw.rectangle([x+20, y+20, x+380, y+300], fill="#F8F8F8")
        draw.text((x+30, y+320), "Sport Edition", fill="#000000", font=get_font(22))

    img.save(os.path.join(OUTPUT_DIR, "4_Bright_Neon.png"))
    print("Created 4_Bright_Neon.png")

# ==========================================
# 5. Carbon + Grey + White Premium
# ==========================================
def create_variant_5():
    img, draw = create_base_layout("carbon", "#FFFFFF")
    
    # Carbon Pattern Simulation (Simple Grid)
    def draw_carbon(d, rect):
        x1, y1, x2, y2 = rect
        d.rectangle(rect, fill="#333333")
        step = 10
        for i in range(x1, x2, step):
            d.line([(i, y1), (i+step, y2)], fill="#444444", width=1)
        for i in range(y1, y2, step):
            d.line([(x1, i), (x2, i+step)], fill="#444444", width=1)

    # Header
    draw.rectangle([0, 0, WIDTH, 100], fill="#222222")
    draw.text((100, 40), "NIKITIN MOTORS", fill="#FFFFFF", font=get_font(28))
    
    # Banner
    draw_carbon(draw, (0, 100, WIDTH, 700))
    draw.text((100, 300), "CARBON EDITION", fill="#FFFFFF", font=get_font(60))
    draw.text((100, 380), "Lightweight. Durable. Premium.", fill="#CCCCCC", font=get_font(30))
    
    # Catalog
    y = 800
    draw.text((100, y-50), "EXLCUSIVE STOCK", fill="#000000", font=get_font(25))
    for i in range(3):
        x = 100 + i * 430
        draw.rectangle([x, y, x+400, y+550], fill="#F5F5F5", outline="#DDDDDD")
        # Carbon detail on card
        draw_carbon(draw, (x, y+450, x+400, y+550))
        draw.text((x+150, y+500), "VIEW", fill="#FFFFFF", font=get_font(20))

    img.save(os.path.join(OUTPUT_DIR, "5_Carbon_Grey.png"))
    print("Created 5_Carbon_Grey.png")

# ==========================================
# 6. Light Theme + Light 3D "Next Gen"
# ==========================================
def create_variant_6():
    img, draw = create_base_layout("next_gen", "#F8F9FA")
    
    # Soft floating header
    draw.rounded_rectangle([50, 30, WIDTH-50, 100], radius=20, fill="#FFFFFF")
    # Shadow hint
    draw.rounded_rectangle([55, 35, WIDTH-45, 105], radius=20, fill=(0,0,0, 10))
    draw.text((120, 55), "N K T N", fill="#000000", font=get_font(30))
    
    # 3D Abstract shapes in Banner
    # Sphere 1
    draw.ellipse([800, 200, 1200, 600], fill="#E8EEF5", outline=None)
    # Sphere 2
    draw.ellipse([100, 400, 400, 700], fill="#FFFFFF", outline="#E0E0E0")
    
    draw.text((WIDTH/2 - 250, 300), "NEXT GENERATION\nEXPERIENCE", fill="#222222", font=get_font(50), align="center")
    
    # Cards - Floating
    y = 800
    for i in range(3):
        x = 100 + i * 430
        # Shadow
        draw.rounded_rectangle([x+10, y+10, x+410, y+510], radius=30, fill=(0,0,0, 20))
        # Card
        draw.rounded_rectangle([x, y, x+400, y+500], radius=30, fill="#FFFFFF")
        
        # Image area rounded
        draw.rounded_rectangle([x+20, y+20, x+380, y+300], radius=20, fill="#EFF2F5")
        draw.text((x+40, y+340), "Concept Two", fill="#333333", font=get_font(24))

    img.save(os.path.join(OUTPUT_DIR, "6_Light_3D_NextGen.png"))
    print("Created 6_Light_3D_NextGen.png")


if __name__ == "__main__":
    try:
        create_variant_1()
        create_variant_2()
        create_variant_3()
        create_variant_4()
        create_variant_5()
        create_variant_6()
        print("All prototypes created successfully.")
    except Exception as e:
        print(f"Error: {e}")

