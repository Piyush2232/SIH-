import sys

with open('style.css', 'r', encoding='utf-8') as f:
    css = f.read()

# We need to find the start of NAVBAR and the start of TERMINAL CONSOLE
start_idx = css.find('/* =========================================================================\n   NAVBAR')
end_idx = css.find('/* =========================================================================\n   TERMINAL CONSOLE')

if start_idx != -1 and end_idx != -1:
    new_landing_css = '''/* =========================================================================
   NOTHING STYLE LANDING PAGE
========================================================================= */

.nothing-navbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px 48px;
  background: var(--black);
  position: fixed;
  top: 0;
  width: 100%;
  z-index: 100;
  border-bottom: 1px solid var(--border);
}

.nothing-logo {
  font-family: var(--font-display);
  font-size: 28px;
  font-weight: 700;
  color: var(--text-display);
  letter-spacing: -0.05em;
}

.nothing-nav {
  display: flex;
  gap: 40px;
}

.nothing-nav a {
  font-family: var(--font-sans);
  font-size: 14px;
  font-weight: 500;
  color: var(--text-secondary);
  text-decoration: none;
  transition: color 0.2s ease;
}

.nothing-nav a:hover {
  color: var(--text-display);
}

.nothing-btn-outline {
  font-family: var(--font-sans);
  font-size: 14px;
  font-weight: 500;
  color: var(--text-display);
  background: transparent;
  border: 1px solid var(--text-disabled);
  padding: 8px 24px;
  border-radius: 40px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.nothing-btn-outline:hover {
  border-color: var(--text-display);
}

/* HERO */
.nothing-hero {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 10%;
  padding-top: 80px;
  background: var(--black);
}

.nothing-hero-content {
  flex: 1;
  max-width: 500px;
  position: relative;
  z-index: 2;
}

.nothing-title {
  font-family: var(--font-display);
  font-size: 100px;
  font-weight: 400;
  line-height: 0.9;
  color: var(--text-display);
  margin-bottom: 24px;
  letter-spacing: -0.02em;
}

.nothing-subtitle {
  font-family: var(--font-sans);
  font-size: 18px;
  color: var(--text-secondary);
  line-height: 1.5;
  margin-bottom: 48px;
  max-width: 400px;
}

.nothing-btn-pill {
  font-family: var(--font-sans);
  font-size: 16px;
  font-weight: 600;
  color: var(--black);
  background: var(--text-display);
  border: none;
  padding: 16px 40px;
  border-radius: 50px;
  cursor: pointer;
  transition: transform 0.2s ease;
}

.nothing-btn-pill:hover {
  transform: scale(1.05);
}

/* WIREFRAME VISUAL */
.nothing-hero-visual {
  flex: 1;
  display: flex;
  justify-content: center;
  position: relative;
}

.id-wireframe {
  width: 400px;
  height: 260px;
  border: 1px solid var(--text-disabled);
  border-radius: 12px;
  padding: 24px;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 20px;
  background: var(--black);
  transform: rotate(2deg) translateY(-20px);
  box-shadow: inset 0 0 40px rgba(255,255,255,0.02);
}

.wire-photo {
  width: 80px;
  height: 100px;
  border: 1px dashed var(--text-disabled);
  border-radius: 4px;
}

.wire-lines {
  position: absolute;
  top: 24px;
  left: 120px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.w-line {
  width: 140px;
  height: 4px;
  background: var(--border-visible);
  border-radius: 2px;
}
.w-line.short {
  width: 80px;
}

.wire-mrz {
  width: 100%;
  height: 8px;
  background: var(--border-visible);
  border-radius: 2px;
  margin-top: auto;
}

.wire-mrz:last-child {
  margin-top: 4px;
}

.red-dot {
  position: absolute;
  top: -10px;
  right: -10px;
  width: 20px;
  height: 20px;
  background: var(--accent);
  border-radius: 50%;
  box-shadow: 0 0 20px rgba(215, 25, 33, 0.4);
}

'''
    new_css = css[:start_idx] + new_landing_css + css[end_idx:]
    with open('style.css', 'w', encoding='utf-8') as f:
        f.write(new_css)
    print("CSS replaced successfully!")
else:
    print(f"Indices not found. start: {start_idx}, end: {end_idx}")
