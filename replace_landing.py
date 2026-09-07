import sys

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

start_marker = '<!-- =========================================================================\n       VIEW 1'
end_marker = '<!-- =========================================================================\n       VIEW 2'

start_idx = html.find(start_marker)
end_idx = html.find(end_marker)

new_landing = '''<!-- =========================================================================
       VIEW 1: LANDING OVERVIEW (NOTHING STYLE)
  ========================================================================= -->
  <div id="landingView" class="view-screen">
    
    <header class="nothing-navbar">
      <div class="nothing-logo">SIH (1)</div>
      <nav class="nothing-nav">
        <a href="#">Specs</a>
        <a href="#">Forensics</a>
      </nav>
      <div class="nothing-nav-right">
        <button class="nothing-btn-outline" id="launchConsoleFromNav">Console</button>
      </div>
    </header>

    <section class="nothing-hero">
      <div class="nothing-hero-content">
        <h1 class="nothing-title">pure<br>verification.</h1>
        <p class="nothing-subtitle">Zero cloud. 100% on-device forensic document screening.</p>
        <button class="nothing-btn-pill" id="launchConsoleBtn">Launch Terminal</button>
      </div>
      <div class="nothing-hero-visual">
        <div class="id-wireframe">
          <div class="wire-photo"></div>
          <div class="wire-lines">
            <div class="w-line"></div>
            <div class="w-line"></div>
            <div class="w-line short"></div>
          </div>
          <div class="wire-mrz"></div>
          <div class="wire-mrz"></div>
          <div class="red-dot"></div>
        </div>
      </div>
    </section>

  </div>

  '''

new_html = html[:start_idx] + new_landing + html[end_idx:]

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(new_html)
