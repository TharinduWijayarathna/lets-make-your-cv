#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent / "public" / "templates"
o = chr(60) + "motion"
c = chr(60) + "/motion" + chr(62)
# use div not motion
o = "<div"
c = "</div>"


def write(name, lines):
    (ROOT / f"{name}.html").write_text("\n".join(lines) + "\n")


write(
    "gallery",
    [
        f'{o} class="cv-page">',
        '  <header class="mast">',
        f'    {o} class="name-wrap">',
        f'      {o} class="kicker">Professional Portfolio CV{c}',
        '      <h1 id="cv-name"></h1>',
        f'      {o} id="cv-title">{c}',
        f'    {c}',
        f'    {o} class="contact-card">',
        f'      {o} id="cv-email">{c}',
        f'      {o} id="cv-phone">{c}',
        f'      {o} id="cv-location">{c}',
        f'      {o} id="cv-linkedin">{c}',
        f'    {c}',
        "  </header>",
        f'  {o} class="grid">',
        "    <aside>",
        f'      {o} class="side-panel">{o} class="section-title">Skills{c}{o} class="skill-wrap" id="cv-skills">{c}{c}',
        f'      {o} class="side-panel">{o} class="section-title">Education{c}{o} id="cv-education">{c}{c}',
        f'      {o} class="side-panel">{o} class="section-title">Certifications{c}{o} id="cv-certifications">{c}{c}',
        f'      {o} class="side-panel">{o} class="section-title">Languages{c}{o} id="cv-languages">{c}{c}',
        "    </aside>",
        "    <main>",
        f'      <section class="section">{o} class="section-title">Summary{c}<p class="summary" id="cv-summary"></p></section>',
        f'      <section class="section">{o} class="section-title">Experience{c}{o} id="cv-experience">{c}</section>',
        f'      <section class="section">{o} class="section-title">Projects{c}{o} id="cv-projects">{c}</section>',
        "    </main>",
        f"  {c}",
        c,
    ],
)

write(
    "neoclassic",
    [
        f'{o} class="cv-page">',
        '  <header class="hero">',
        f'    {o} class="kicker">Curriculum Vitae{c}',
        '    <h1 id="cv-name"></h1>',
        f'    {o} id="cv-title">{c}',
        f'    {o} class="meta">',
        '      <span id="cv-email"></span>',
        '      <span id="cv-phone"></span>',
        '      <span id="cv-location"></span>',
        '      <span id="cv-linkedin"></span>',
        f"    {c}",
        "  </header>",
        f'  {o} class="body">',
        '    <aside class="side">',
        f'      <section class="section">{o} class="section-title">Expertise{c}{o} class="skill-wrap" id="cv-skills">{c}</section>',
        f'      <section class="section">{o} class="section-title">Education{c}{o} id="cv-education">{c}</section>',
        f'      <section class="section">{o} class="section-title">Certifications{c}{o} id="cv-certifications">{c}</section>',
        f'      <section class="section">{o} class="section-title">Languages{c}{o} id="cv-languages">{c}</section>',
        "    </aside>",
        '    <main class="main">',
        f'      <section class="section">{o} class="section-title">Profile{c}<p class="summary" id="cv-summary"></p></section>',
        f'      <section class="section">{o} class="section-title">Experience{c}{o} id="cv-experience">{c}</section>',
        f'      <section class="section">{o} class="section-title">Selected Projects{c}{o} id="cv-projects">{c}</section>',
        "    </main>",
        f"  {c}",
        c,
    ],
)

write(
    "pulse",
    [
        f'{o} class="cv-page">',
        '  <aside class="side">',
        f'    {o} class="logo">Pulse Grid{c}',
        '    <h1 id="cv-name"></h1>',
        f'    {o} id="cv-title">{c}',
        f'    {o} class="contact">',
        f'      {o} id="cv-email">{c}',
        f'      {o} id="cv-phone">{c}',
        f'      {o} id="cv-location">{c}',
        f'      {o} id="cv-linkedin">{c}',
        f"    {c}",
        f'    <section class="section">{o} class="section-title">Skills{c}{o} class="skill-wrap" id="cv-skills">{c}</section>',
        f'    {o} class="mini-card">{o} class="section-title">Languages{c}{o} id="cv-languages">{c}{c}',
        "  </aside>",
        '  <main class="main">',
        f'    <section class="top-summary">{o} class="section-title">Profile{c}<p class="summary" id="cv-summary"></p></section>',
        f'    <section class="section">{o} class="section-title">Experience{c}{o} id="cv-experience">{c}</section>',
        f'    <section class="section">{o} class="section-title">Projects{c}{o} class="projects" id="cv-projects">{c}</section>',
        f'    <section class="section">',
        f'      {o} class="section-title">Education &amp; Certifications{c}',
        f'      {o} id="cv-education">{c}',
        f'      {o} id="cv-certifications">{c}',
        "    </section>",
        "  </main>",
        c,
    ],
)

write(
    "signal",
    [
        f'{o} class="cv-page">',
        '  <header class="head">',
        f"    {o}>",
        '      <h1 id="cv-name"></h1>',
        f'      {o} id="cv-title">{c}',
        f"    {c}",
        f'    {o} class="contact">',
        f'      {o} id="cv-email">{c}',
        f'      {o} id="cv-phone">{c}',
        f'      {o} id="cv-location">{c}',
        f'      {o} id="cv-linkedin">{c}',
        f"    {c}",
        "  </header>",
        f'  {o} class="body">',
        "    <main>",
        f'      <section class="section summary-block">{o} class="section-title">Summary{c}<p class="summary" id="cv-summary"></p></section>',
        f'      <section class="section">{o} class="section-title">Experience{c}{o} id="cv-experience">{c}</section>',
        f'      <section class="section">{o} class="section-title">Projects{c}{o} id="cv-projects">{c}</section>',
        "    </main>",
        "    <aside>",
        f'      {o} class="sidebar-box">{o} class="section-title">Skills{c}{o} class="skill-wrap" id="cv-skills">{c}{c}',
        f'      {o} class="sidebar-box">{o} class="section-title">Education{c}{o} id="cv-education">{c}{c}',
        f'      {o} class="sidebar-box">{o} class="section-title">Certifications{c}{o} id="cv-certifications">{c}{c}',
        f'      {o} class="sidebar-box">{o} class="section-title">Languages{c}{o} id="cv-languages">{c}{c}',
        "    </aside>",
        f"  {c}",
        c,
    ],
)

write(
    "slatepanels",
    [
        f'{o} class="cv-page">',
        '  <header class="header">',
        f"    {o}>",
        '      <h1 id="cv-name"></h1>',
        f'      {o} id="cv-title">{c}',
        f"    {c}",
        f'    {o} class="contact">',
        f'      {o} id="cv-email">{c}',
        f'      {o} id="cv-phone">{c}',
        f'      {o} id="cv-location">{c}',
        f'      {o} id="cv-linkedin">{c}',
        f"    {c}",
        "  </header>",
        f'  {o} class="body">',
        "    <main>",
        f'      <section class="panel section">{o} class="section-title">Professional Summary{c}<p class="summary" id="cv-summary"></p></section>',
        f'      <section class="section">{o} class="section-title">Experience{c}{o} id="cv-experience">{c}</section>',
        f'      <section class="section">{o} class="section-title">Projects{c}{o} class="projects" id="cv-projects">{c}</section>',
        "    </main>",
        "    <aside>",
        f'      {o} class="panel section">{o} class="section-title">Core Skills{c}{o} class="skill-wrap" id="cv-skills">{c}{c}',
        f'      {o} class="panel section">{o} class="section-title">Education{c}{o} id="cv-education">{c}{c}',
        f'      {o} class="panel section">{o} class="section-title">Certifications{c}{o} id="cv-certifications">{c}{c}',
        f'      {o} class="panel section">{o} class="section-title">Languages{c}{o} id="cv-languages">{c}{c}',
        "    </aside>",
        f"  {c}",
        c,
    ],
)

for name in ["gallery", "neoclassic", "pulse", "signal", "slatepanels"]:
    text = (ROOT / f"{name}.html").read_text()
    assert "<motion" not in text, name
    print("wrote", name)