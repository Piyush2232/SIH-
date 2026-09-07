import sys

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

scroll_section = '''
    <section class="nothing-scroll-section">
      <div class="scroll-content fade-in">
        <h2 class="scroll-title">the truth is in the details.</h2>
        <p class="scroll-desc">AuthentiQ is a next-generation forensic engine that runs entirely in your browser. Utilizing AI-powered Error Level Analysis (ELA) and biometric 128-dimensional facial matchings, it detects tampering, forged MRZ codes, and identity mismatches without ever sending a single pixel to the cloud.</p>
        <div class="scroll-grid">
          <div class="scroll-card">
            <h3>01 / ELA</h3>
            <p>JPEG quantization and EXIF forensics.</p>
          </div>
          <div class="scroll-card">
            <h3>02 / MRZ</h3>
            <p>ICAO 9303 checksum verification.</p>
          </div>
          <div class="scroll-card">
            <h3>03 / BIO</h3>
            <p>ResNet-34 biometric face matching.</p>
          </div>
        </div>
      </div>
    </section>
'''

hero_end = '</section>'
insert_pos = html.find(hero_end, html.find('nothing-hero')) + len(hero_end)

if insert_pos > len(hero_end):
    html = html[:insert_pos] + scroll_section + html[insert_pos:]

# Add Intersection Observer script to the end of body
script = '''
<script>
document.addEventListener("DOMContentLoaded", () => {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('.fade-in').forEach(el => observer.observe(el));
});
</script>
'''

body_end = '</body>'
body_pos = html.find(body_end)

if body_pos != -1:
    html = html[:body_pos] + script + html[body_pos:]

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)
