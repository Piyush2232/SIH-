with open('style.css', 'a', encoding='utf-8') as f:
    f.write('''
/* SCROLL SECTION */
.nothing-scroll-section {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--black);
  padding: 100px 10%;
  color: var(--text-primary);
}

.scroll-content {
  max-width: 1000px;
  width: 100%;
}

.scroll-title {
  font-family: var(--font-display);
  font-size: 64px;
  color: var(--text-display);
  letter-spacing: -0.02em;
  margin-bottom: 24px;
}

.scroll-desc {
  font-size: 20px;
  color: var(--text-secondary);
  line-height: 1.6;
  max-width: 600px;
  margin-bottom: 64px;
}

.scroll-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 32px;
}

.scroll-card {
  border: 1px solid var(--border-visible);
  padding: 32px;
  border-radius: 8px;
  background: var(--surface);
  transition: transform 0.3s ease;
}

.scroll-card:hover {
  transform: translateY(-5px);
}

.scroll-card h3 {
  font-family: var(--font-mono);
  font-size: 18px;
  color: var(--text-display);
  margin-bottom: 12px;
  letter-spacing: 0.05em;
}

.scroll-card p {
  color: var(--text-secondary);
  font-size: 14px;
  line-height: 1.5;
}

/* ANIMATION */
.fade-in {
  opacity: 0;
  transform: translateY(40px);
  transition: opacity 1s cubic-bezier(0.2, 0.8, 0.2, 1), transform 1s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.fade-in.visible {
  opacity: 1;
  transform: translateY(0);
}

@media (max-width: 900px) {
  .scroll-grid {
    grid-template-columns: 1fr;
  }
  .scroll-title {
    font-size: 48px;
  }
}
''')
