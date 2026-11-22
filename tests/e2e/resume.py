# End-to-end: «back to the game» in one tap and the screen kept on (Wake Lock), desktop and mobile.
import json, os, sys, time
from playwright.sync_api import sync_playwright
URL = os.environ.get('BVC_URL', 'http://localhost:8765/index.html'); S = os.environ.get('SHOTS', '/tmp/bvc-shots/')
checks, errs = [], []
def ok(c, m): checks.append(bool(c)); print(('ok  ' if c else 'FAIL') + ' ' + m)
MOCK = """window.__wl = 0; Object.defineProperty(navigator, 'wakeLock', { value: { request: async () => { window.__wl++; const t = new EventTarget(); t.release = async () => {}; return t; } } });"""
with sync_playwright() as p:
    b = p.chromium.launch(**({'executable_path': os.environ['CHROME']} if os.environ.get('CHROME') else {}))
    for vp, tag in [({'width': 1360, 'height': 860}, 'd'), ({'width': 390, 'height': 844}, 'm')]:
        ctx = b.new_context(locale='it-IT', viewport=vp); ctx.add_init_script(MOCK)
        def page():
            pg = ctx.new_page(); pg.on('pageerror', lambda e: errs.append(str(e))); return pg
        adm = page(); adm.goto(URL + '#/admin'); adm.get_by_text('Entra come game master').click()
        adm.get_by_role('button', name='Nuova partita').click(); adm.get_by_role('button', name='Crea la partita').click(); adm.wait_for_selector('.control'); time.sleep(0.6)
        db = json.loads(adm.evaluate("localStorage.getItem('bvc-demo-v2')")); g = db['games'][-1]
        pin = [db['pins'][t['id']] for t in db['teams'] if t['game_id'] == g['id'] and t['role'] == 'startup' and t['table_no'] == 1][0]
        pl = page(); pl.goto(f"{URL}#/join?code={g['code']}&pin={pin}"); pl.fill('input[placeholder="es. Giulia"]', 'Anna')
        pl.get_by_role('button', name='Entra nella deal room').click(); pl.wait_for_selector('.gamebar'); time.sleep(1.2)
        ok(pl.evaluate('window.__wl') >= 1, f'[{tag}] the game asks the phone to keep the screen on')
        pl.close()
        home = page(); home.goto(URL + '#/'); time.sleep(1.2)
        ok(home.locator('.resume').count() == 1 and 'Tavolo 1' in home.locator('.resume').inner_text(), f'[{tag}] reopening the site offers «Torna al gioco» with squad and table')
        home.screenshot(path=S + f'resume-{tag}.png')
        home.get_by_role('button', name='Torna al gioco').click(); home.wait_for_selector('.gamebar'); time.sleep(0.8)
        ok('/g/' + g['id'] in home.url and home.locator('.gamebar').count() == 1, f'[{tag}] one tap brings the player back into the same squad, no code or PIN')
        time.sleep(15.5)
        pr = json.loads(adm.evaluate("localStorage.getItem('bvc-demo-presence')"))
        ok(any(v['client'].get('wl') for v in pr.values() if v['game_id'] == g['id'] and v['client'].get('role') == 'player'), f'[{tag}] the heartbeat reports the screen is kept on')
        home.goto(URL + '#/'); time.sleep(1.0)
        home.get_by_role('button', name='Non sono io, entra con un altro codice').click(); time.sleep(0.4)
        ok(home.locator('.resume').count() == 0, f'[{tag}] «Non sono io» forgets the game')
        # removed device: no resume
        home.goto(URL + '#/g/' + g['id']); home.wait_for_selector('.gamebar'); time.sleep(0.5)
        uid = home.evaluate("JSON.parse(sessionStorage.getItem('bvc-demo-user')).id")
        adm.evaluate(f"""(() => {{ const d = JSON.parse(localStorage.getItem('bvc-demo-v2')); d.members = d.members.filter(m => m.user_id !== '{uid}'); localStorage.setItem('bvc-demo-v2', JSON.stringify(d)); }})()""")
        h2 = page(); h2.goto(URL + '#/'); time.sleep(1.2)
        ok(h2.locator('.resume').count() == 0, f'[{tag}] a device removed by the game master is not offered the game')
        ctx.close()
    b.close()
print('PASSED', sum(checks), 'of', len(checks)); print('ERRORS', errs)
sys.exit(0 if all(checks) and not errs else 1)
