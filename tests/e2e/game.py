# End-to-end: a full round with game master, two squads and a facilitator in one browser (demo backend). Run with tests/e2e/run.sh
import json, os, sys, time
from playwright.sync_api import sync_playwright
URL = os.environ.get('BVC_URL', 'http://localhost:8765/index.html')
S = os.environ.get('SHOTS', '/tmp/bvc-shots/')
errs = []
with sync_playwright() as p:
    b = p.chromium.launch(**({'executable_path': os.environ['CHROME']} if os.environ.get('CHROME') else {}))
    ctx = b.new_context(locale='it-IT', viewport={'width': 1360, 'height': 900})
    def clear(pg, shot=None):
        for _ in range(4):
            done = True
            if pg.locator('.phasecard').count():
                if shot: pg.screenshot(path=S + shot); shot = None
                time.sleep(0.7)
                try: pg.locator('.phasecard').click(force=True, timeout=1500)
                except Exception: pass
                time.sleep(0.4); done = False
            if pg.get_by_role('button', name='Salta il tour').count():
                if shot: pg.screenshot(path=S + shot); shot = None
                pg.get_by_role('button', name='Salta il tour').click(); time.sleep(1.0); done = False
            if pg.locator('.overlay[aria-label="Concetto del round"]').count():
                time.sleep(0.5); pg.keyboard.press('Escape'); time.sleep(0.8); done = False
            if done: break
    def page(name):
        pg = ctx.new_page()
        pg.on('console', lambda m: m.type == 'error' and errs.append(f'{name}: {m.text}'))
        pg.on('pageerror', lambda e: errs.append(f'{name} PAGEERROR: {e}'))
        return pg
    adm = page('admin')
    adm.goto(URL + '#/admin'); adm.get_by_text('Entra come game master').click()
    adm.get_by_role('button', name='Nuova partita').click()
    adm.locator('.wizard input[type=range]').fill('2')
    adm.screenshot(path=S + '01-wizard.png', full_page=True)
    adm.get_by_role('button', name='Crea la partita').click()
    adm.wait_for_selector('.control'); time.sleep(0.4)
    time.sleep(0.4); clear(adm)
    db = json.loads(adm.evaluate("localStorage.getItem('bvc-demo-v2')"))
    g = db['games'][-1]; code = g['code']
    pin = {(t['table_no'], t['role']): db['pins'][t['id']] for t in db['teams'] if t['game_id'] == g['id']}
    fac_pin = db['secrets'][g['id']]['1']
    def join(name, p_, who):
        pg = page(who); pg.goto(f"{URL}#/join?code={code}&pin={p_}")
        pg.fill('input[placeholder="es. Giulia"]', name); pg.get_by_role('button', name='Entra nella deal room').click()
        pg.wait_for_selector('.gamebar'); time.sleep(0.4)
        time.sleep(0.4); clear(pg, f'00-tour-{who}.png')
        return pg
    s1 = join('Anna', pin[(1, 'startup')], 's1')
    i1 = join('Bruno', pin[(1, 'investor')], 'i1')
    fac = join('Fede', fac_pin, 'fac')
    time.sleep(0.5); s1.screenshot(path=S + '02-lobby.png')
    adm.screenshot(path=S + '03-control-lobby.png', full_page=True)
    def nxt(shot=None):
        adm.locator('.ctrl-bar .btn.primary').click(); time.sleep(0.9)
        for k, pg in enumerate([s1, i1, fac, adm]): clear(pg, shot if k == 0 else None)
    nxt('04p-phasecard.png'); time.sleep(1.5); clear(s1, '04s-spotlight.png'); clear(i1); time.sleep(0.8); s1.screenshot(path=S + '04a-concept.png'); clear(s1); clear(i1)
    s1.screenshot(path=S + '04-brief-card.png', full_page=True)
    nxt(); time.sleep(0.6)
    for pg in (s1, i1, fac): clear(pg)
    # startup opens with a term sheet
    s1.locator('.composer input[type=range]').fill('6')
    s1.locator('.composer .chip').nth(2).click()   # deadEquity buyback
    s1.locator('.composer fieldset').nth(1).locator('.chip').nth(3).click()  # rights info + capped
    s1.fill('.composer textarea', 'Cap alto, ma vi diamo un cap table pulito con il buyback di Luca.')
    s1.screenshot(path=S + '05-composer.png', full_page=True)
    s1.get_by_role('button', name='Manda il term sheet').click(); time.sleep(0.5); s1.screenshot(path=S + '05b-badge.png'); time.sleep(0.8)
    i1.screenshot(path=S + '06-investor-incoming.png')
    # investor counters
    i1.get_by_role('button', name='Controproposta', exact=True).click(); time.sleep(0.3)
    i1.locator('.composer input[type=range]').fill('4.5')
    i1.locator('.composer fieldset').nth(1).locator('.chip').nth(2).click()
    i1.get_by_role('button', name='Manda la controproposta').click(); time.sleep(1.2)
    s1.screenshot(path=S + '07-startup-counter.png', full_page=True)
    # facilitator opens envelope A (startup only)
    fac.get_by_role('button', name='A').first.click() if False else fac.locator('.envbtn').first.click()
    time.sleep(1.6); s1.screenshot(path=S + '08-envelope.png')
    s1.get_by_role('button', name='Letta, torniamo al tavolo').click()
    # startup signs
    s1.locator('.sheet-actions .btn.sign').click(); time.sleep(0.4)
    s1.screenshot(path=S + '09-confirm.png')
    s1.get_by_role('button', name='Firma il deal').click(); time.sleep(3.4)
    s1.screenshot(path=S + '10-signed.png')
    i1.screenshot(path=S + '10b-signed-investor.png')
    for pg, v in ((s1, 8), (i1, 9)):
        pg.locator('.overlay .vote-scale button').nth(v).click(); pg.locator('.overlay').get_by_role('button', name='Invia il voto').click()
    time.sleep(0.5)
    s1.keyboard.press('Escape'); i1.keyboard.press('Escape')
    nxt(); time.sleep(0.5)  # sign phase
    fac.wait_for_selector('.scoreform'); time.sleep(0.5)
    print('fac table chips (expect 1):', fac.locator('.tchip').count())
    fac.screenshot(path=S + '11-fac-score.png', full_page=True)
    fac.get_by_role('button', name='Salva e mostra il punteggio').click(); time.sleep(2.6)
    s1.screenshot(path=S + '12-score-reveal.png')
    s1.get_by_role('button', name='Vai alla classifica').click(); time.sleep(0.6)
    s1.screenshot(path=S + '13-leaderboard.png', full_page=True)
    scr = page('screen')
    # projector needs admin identity: copy session
    scr.goto(URL + '#/screen/' + g['id']); time.sleep(1.5)
    scr.screenshot(path=S + '14-projector.png')
    i1.get_by_role('tab', name='Impara').click() if False else None
    s1.get_by_role('tab', name='Impara').click(); time.sleep(0.5); s1.screenshot(path=S + '15a-learn.png', full_page=True)
    s1.get_by_role('tab', name='Journey').click(); time.sleep(0.6); s1.screenshot(path=S + '15-journey.png', full_page=True)
    adm.screenshot(path=S + '16-control.png', full_page=True)
    adm.goto(URL + '#/cards/' + g['id']); time.sleep(1); adm.screenshot(path=S + '17-cards.png', full_page=True)
    # english
    s1.locator('.langsw button', has_text='EN').click(); s1.get_by_role('tab', name='The table').click(); time.sleep(0.4); s1.screenshot(path=S + '18-en.png', full_page=True)
    m = ctx.new_page(); m.set_viewport_size({'width': 390, 'height': 844}); m.evaluate if False else None
    b.close()
print('ERRORS:', *errs, sep='\n')
sys.exit(1 if errs else 0)
