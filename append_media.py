with open('style.css', 'a', encoding='utf-8') as f:
    f.write('''
@media (max-width: 900px) {
  .nothing-hero {
    flex-direction: column;
    text-align: center;
    padding-top: 120px;
    gap: 60px;
  }
  .nothing-hero-content {
    align-items: center;
    display: flex;
    flex-direction: column;
  }
  .nothing-title {
    font-size: 60px;
  }
  .id-wireframe {
    transform: none;
    width: 320px;
  }
}
''')
