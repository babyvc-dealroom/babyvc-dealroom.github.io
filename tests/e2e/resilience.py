# End-to-end: connection loss, join lock, PIN limit, ops console and simulated failures. Run with tests/e2e/run.sh
import json, os, sys, time
from playwright.sync_api import sync_playwright
URL = os.environ.get('BVC_URL', 'http://localhost:8765/index.html')
S = os.environ.get('SHOTS', '/tmp/bvc-shots/')
errs, checks = [], []
def ok(c, msg):
    checks.append((bool(c), msg)); print(('ok  ' if c else 'FAIL') + ' ' + msg)
with sync_playwright() as p:
    b = p.chromium.launch(**({'executable_path': os.environ['CHROME']} if os.environ.get('CHROME') else {}))
    ctx = b.new_context(locale='it-IT', viewport={'width': 1360, 'height': 900})
    def page(name):
        pg = ctx.new_page()
        pg.on('console', lambda m: m.type == 'error' and 'net::ERR_INTERNET_DISCONNECTED' not in m.text and errs.append(f'{name}: {m.text}'))
        pg.on('pageerror', lambda e: errs.append(f'{name} PAGEERROR: {e}'))
        return pg
    def clear(pg):
        for _ in range(5):
            done = True
            if pg.locator('.phasecard').count():
                time.sleep(0.6)
                try: pg.locator('.phasecard').click(force=True, timeout=1500)
                except Exception: pass
                time.sleep(0.4); done = False
            if pg.get_by_role('button', name='Salta il tour').count():
                pg.get_by_role('button', name='Salta il tour').click(); time.sleep(0.8); done = False
            if pg.locator('.overlay').count():
                pg.keyboard.press('Escape'); time.sleep(0.6); done = False
            if done: break
    adm = page('admin')
    adm.goto(URL + '#/admin'); adm.get_by_text('Entra come game master').click()
    adm.get_by_role('button', name='Nuova partita').click()
    adm.locator('.wizard input[type=range]').fill('2')
    ok(adm.get_by_text('si cancellano da soli dopo 7 giorni').count() == 1, 'the wizard says data is deleted after 7 days')
    adm.get_by_role('button', name='Crea la partita').click(); adm.wait_for_selector('.control'); time.sleep(0.6); clear(adm)
    db = json.loads(adm.evaluate("localStorage.getItem('bvc-demo-v2')"))
    g = db['games'][-1]; code = g['code']
    pin = {(t['table_no'], t['role']): db['pins'][t['id']] for t in db['teams'] if t['game_id'] == g['id']}
    def join(name, p_, who, expect_ok=True):
        pg = page(who); pg.goto(f"{URL}#/join?code={code}&pin={p_}")
        pg.fill('input[placeholder="es. Giulia"]', name); pg.get_by_role('button', name='Entra nella deal room').click()
        if expect_ok: pg.wait_for_selector('.gamebar'); time.sleep(0.6); clear(pg)
        else: time.sleep(0.8)
        return pg
    s1 = join('Anna', pin[(1, 'startup')], 's1')
    i1 = join('Bruno', pin[(1, 'investor')], 'i1')
    time.sleep(1.2)
    ok(adm.locator('.room-table .pdot.online').count() >= 2, 'the game master sees the players connected (green dots)')
    ok(adm.locator('.health').count() == 1, 'the control room shows the room health panel')

    # --- start: joins lock themselves
    adm.locator('.ctrl-bar .btn.primary').click(); time.sleep(1.0); clear(adm)
    ok(adm.locator('.lockbtn.on').count() == 1, 'starting the game locks joins automatically')
    late = join('Spia', pin[(2, 'investor')], 'late', expect_ok=False)
    ok(late.get_by_text('Gli ingressi sono chiusi').count() == 1, 'a new device is refused while joins are locked')
    late.screenshot(path=S + '01-joins-locked.png')
    adm.locator('.lockbtn').click(); time.sleep(0.5)
    late.get_by_role('button', name='Entra nella deal room').click(); late.wait_for_selector('.gamebar'); time.sleep(0.5); clear(late)
    ok(late.locator('.gamebar').count() == 1, 'once reopened the latecomer gets in')
    adm.locator('.lockbtn').click(); time.sleep(0.3)

    # --- PIN guessing
    g2 = page('guess'); g2.goto(URL + '#/join')
    g2.fill('input[placeholder="ABC123"]', code)
    for k in range(8):
        g2.fill('input[placeholder="XY7Z9"]', 'ZZZZ' + str(k)); g2.fill('input[placeholder="es. Giulia"]', 'x')
        g2.get_by_role('button', name='Entra nella deal room').click(); time.sleep(0.25)
    g2.fill('input[placeholder="XY7Z9"]', pin[(1, 'startup')]); g2.get_by_role('button', name='Entra nella deal room').click(); time.sleep(0.5)
    ok(g2.get_by_text('Troppi PIN sbagliati').count() == 1, 'after 8 wrong PINs even the right one is refused')

    # --- offline on a player
    for pg in (s1, i1, adm): clear(pg)
    adm.locator('.ctrl-bar .btn.primary').click(); time.sleep(1.2)
    for pg in (s1, i1, adm): clear(pg)
    ctx.set_offline(True); time.sleep(0.8)
    ok(s1.locator('.conn.offline').count() == 1, 'going offline shows the red «Sei offline» bar at once')
    s1.locator('.tabs [data-tab="deal"]').click(); time.sleep(0.3); clear(s1)
    send = s1.get_by_role('button', name='Manda il term sheet')
    ok(send.count() == 1 and send.is_disabled(), 'while offline the send button is disabled, the term sheet stays')
    s1.screenshot(path=S + '02-offline.png')
    ctx.set_offline(False); time.sleep(0.8)
    ok(s1.locator('.conn.back').count() == 1, 'back online: «Di nuovo online» confirms the room is up to date')
    s1.screenshot(path=S + '03-back-online.png')
    time.sleep(3.5)
    ok(s1.locator('.conn').count() == 0, 'the confirmation goes away by itself')

    # --- ops console
    ops = page('ops'); ops.goto(URL + '#/easteregg'); ops.wait_for_selector('.ops-gate')
    ok(ops.get_by_text('Hai trovato l\'uovo.').count() == 1, '/easteregg shows the password gate')
    ops.fill('input[type=password]', 'sbagliata'); ops.get_by_role('button', name='Apri la console').click(); time.sleep(1.6)
    ok(ops.get_by_text('Password sbagliata').count() == 1, 'a wrong password is refused')
    ops.screenshot(path=S + '04-gate.png')
    ops.fill('input[type=password]', os.environ.get('OPS_PASSWORD', 'demo-ops-console')); ops.get_by_role('button', name='Apri la console').click()
    ops.wait_for_selector('.ops-stats', timeout=8000); time.sleep(0.6)
    ok(ops.locator('.stat').count() == 4, 'the console opens with the four health tiles')
    ops.screenshot(path=S + '05-console.png', full_page=True)
    ops.get_by_role('tab', name='Simula').click(); time.sleep(0.3)
    for t in ['Un telefono si spegne', 'WebSocket bloccati', 'Richieste che falliscono', 'Wi-Fi saturo', 'Orologio del telefono avanti', 'Errore JavaScript', 'Il game master sparisce', 'Qualcuno prova PIN a caso', 'Fase dimenticata']:
        ops.get_by_role('button', name=t).click(); time.sleep(0.35)
    ops.screenshot(path=S + '06-simulate.png', full_page=True)
    ops.locator('.ops-tabs button').first.click(); time.sleep(4.5)
    kinds = ops.locator('.issue b').all_inner_texts()
    print('   issues:', kinds)
    for t in ['Il game master è offline', 'Dispositivo offline', 'Aggiornamenti in tempo reale fermi', 'Le richieste non arrivano', 'Rete lenta', 'Orologio del telefono sbagliato', 'Errore nell\'app', 'Qualcuno prova PIN a caso', 'Dispositivi bloccati', 'Fase scaduta']:
        ok(t in kinds, f'simulated problem detected: {t}')
    ok(ops.locator('.issue').first.get_attribute('class').endswith('critical'), 'critical problems come first')
    ops.screenshot(path=S + '07-issues.png', full_page=True)
    ops.locator('.issue', has_text='Qualcuno prova PIN a caso').get_by_role('button', name='Come si risolve').click(); time.sleep(0.6)
    ok(ops.locator('.fix-steps li').count() >= 2, 'the fix popup explains the steps')
    ops.screenshot(path=S + '08-fix.png')
    ops.locator('.overlay').get_by_role('button', name='Chiudi gli ingressi').click(); time.sleep(0.6)
    ok(ops.locator('.ok-line', has_text='Fatto').count() == 1, 'the popup action runs')
    ops.keyboard.press('Escape'); time.sleep(0.4)
    ops.locator('.issue', has_text='Dispositivi bloccati').get_by_role('button', name='Come si risolve').click(); time.sleep(0.4)
    ops.locator('.overlay').get_by_role('button', name='Sblocca i tentativi di PIN').click(); time.sleep(0.5); ops.keyboard.press('Escape'); time.sleep(4.5)
    ok('Dispositivi bloccati' not in ops.locator('.issue b').all_inner_texts(), 'resetting the attempts clears the blocked devices')
    g2.get_by_role('button', name='Entra nella deal room').click(); time.sleep(0.6)
    ok(g2.get_by_text('Gli ingressi sono chiusi').count() == 1, 'the unblocked device now meets the join lock set from the console')
    ops.get_by_role('tab', name='Partite').click(); time.sleep(0.5)
    ok(ops.locator('.og-table').count() >= 2 and ops.locator('.og-table code').count() >= 4, 'the games tab shows every table with PINs')
    ops.locator('.chip.dev.has').first.click(); time.sleep(0.5)
    ok(ops.locator('.kv div').count() >= 10, 'a device opens with its full health report')
    ops.screenshot(path=S + '09-device.png')
    ops.keyboard.press('Escape'); time.sleep(0.3)
    ops.screenshot(path=S + '10-games.png', full_page=True)
    ops.get_by_role('tab', name='Guida ai problemi').click(); time.sleep(0.3)
    ok(ops.locator('.guide-card').count() >= 20, 'the troubleshooting guide lists every known problem')
    ops.locator('.guide-card', has_text='Troppi ingressi').click(); time.sleep(0.4)
    ok(ops.get_by_text('Rate Limits').count() >= 1, 'the guide explains the sign-in limit fix')
    ops.keyboard.press('Escape'); time.sleep(0.3)
    ops.get_by_role('tab', name='Prima della sessione').click(); time.sleep(0.3)
    ok(ops.locator('.checks li').count() >= 10, 'the pre-session checklist is there')
    ops.screenshot(path=S + '11-prep.png', full_page=True)

    # --- the game master sees the simulated problems in the room health
    adm.reload(); adm.wait_for_selector('.control'); time.sleep(1.0); clear(adm)
    ok(adm.locator('.health .issue').count() >= 3, 'the game master room health lists the problems with fixes')
    adm.locator('.health .issue').first.get_by_role('button', name='Come si risolve').click(); time.sleep(0.5)
    ok(adm.locator('.fix-steps li').count() >= 1, 'the game master gets the same how-to popup')
    adm.screenshot(path=S + '12-gm-health.png')
    adm.keyboard.press('Escape')

    # --- local simulation from the console, seen in the game
    ops.get_by_role('tab', name='Simula').click(); time.sleep(0.3)
    ops.locator('.sim .panel').first.get_by_role('button', name='Offline').click(); time.sleep(0.4)
    ok(ops.locator('.conn.offline').count() == 1 and ops.locator('.sim-pill').count() == 1, 'simulating offline on this device shows the bar and the simulation pill')
    ops.get_by_role('button', name='Torna normale').click(); time.sleep(0.5)
    ops.locator('.sim .panel').nth(1).get_by_role('button', name='Togli le simulazioni').click(); time.sleep(0.6)

    # --- clock skew: the timer still agrees with the game master
    for _ in range(3): adm.get_by_role('button', name='+1 min').click(); time.sleep(0.3)
    s1.evaluate("sessionStorage.setItem('bvc-sim','skew')"); s1.reload(); s1.wait_for_selector('.gamebar'); time.sleep(1.5); clear(s1)
    a, b2 = adm.locator('.gamebar .timer span').inner_text(), s1.locator('.gamebar .timer span').inner_text()
    ok(abs(int(a.split(':')[0]) * 60 + int(a.split(':')[1]) - int(b2.split(':')[0]) * 60 - int(b2.split(':')[1])) <= 1, f'with a skewed clock the timer still matches ({a} vs {b2})')
    s1.evaluate("sessionStorage.removeItem('bvc-sim')")

    # --- lockout in a fresh browser
    ctx2 = b.new_context(locale='it-IT'); o2 = ctx2.new_page(); o2.goto(URL + '#/easteregg'); o2.wait_for_selector('.ops-gate')
    for k in range(5):
        o2.fill('input[type=password]', 'nope' + str(k)); o2.get_by_role('button', name='Apri la console').click(); time.sleep(1.5)
    o2.fill('input[type=password]', os.environ.get('OPS_PASSWORD', 'demo-ops-console')); o2.get_by_role('button', name='Apri la console').click(); time.sleep(1.5)
    ok(o2.get_by_text('console è bloccata per 15 minuti').count() == 1, 'after 5 wrong passwords even the right one is refused')

    # --- one-round game: no exit phase
    adm.goto(URL + '#/admin'); time.sleep(0.5)
    adm.get_by_role('button', name='Nuova partita').click(); time.sleep(0.3)
    adm.locator('.round-opt').first.click(); time.sleep(0.2)
    ok(adm.locator('.mins label').count() == 4, 'a one-round game asks no exit minutes')
    adm.get_by_role('button', name='Crea la partita').click(); adm.wait_for_selector('.control'); time.sleep(0.6); clear(adm)
    steps = adm.locator('.stepper li').all_inner_texts()
    ok(not any("exit" in x.lower() for x in steps) and len(steps) == 6, f'a one-round game has no exit step ({len(steps)} steps)')
    ctx.close(); ctx2.close(); b.close()
print('\nPASSED', sum(c for c, _ in checks), 'of', len(checks))
print('ERRORS:', errs)
sys.exit(0 if all(c for c, _ in checks) and not errs else 1)
