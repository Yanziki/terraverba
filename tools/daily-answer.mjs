// Answer whatever daily-quiz question is on screen (shared by the quiz tests).
// opts: { hint: use "rule one out" / "region" when offered, shot: async (step) => {} }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export async function answer(page, { hint = false, shot = async () => {} } = {}) {
  const click = async (sel) => {
    await page.$eval(sel, (e) => e.scrollIntoView({ block: 'center' }));
    await page.click(sel);
  };
  const type = await page.$eval('.daily-body', (e) => [...e.classList].find((c) => c.startsWith('type-')).slice(5));
  if (type === 'reveal') {
    await click('[data-act=more]');
    await sleep(500);
    await shot(2);
    await click('.choice');
  } else if (type === 'where') {
    if (hint) await click('[data-act=region]');
    await sleep(1400);
    const d = await page.evaluate(() => window.__glossa.globe.disc());
    await page.mouse.click(d.x, d.y);
  } else if (type === 'match') {
    const ids = await page.$$eval('[data-l]', (els) => els.map((e) => e.dataset.l));
    // one wrong pair first
    await click(`[data-l="${ids[0]}"]`);
    await click(`[data-r="${ids[1]}"]`);
    await sleep(500);
    for (const id of ids) {
      await click(`[data-l="${id}"]`);
      await sleep(120);
      if (id === ids[1]) await shot(2);
      await click(`[data-r="${id}"]`);
      await sleep(150);
    }
  } else if (type === 'sort') {
    for (let k = 0; await page.$('.sort-card:not(.picked)'); k++) {
      await click('.sort-card:not(.picked)');
      await sleep(200);
      if (k === 1) await shot(2);
    }
  } else if (type === 'listen') {
    await click('[data-act=hear]');
    await sleep(3500);
    await shot(2);
    await click('.choice');
  } else if (type === 'tree') {
    await click('.branch');
  } else if (type === 'lightning') {
    await click('[data-act=clock]');
    for (let k = 0; k < 6; k++) {
      await sleep(700);
      if (k === 2) await shot(2);
      await click(k % 2 ? '[data-yes="0"]' : '[data-yes="1"]');
    }
  } else {
    if (hint) {
      await click('[data-act=cut]');
      await sleep(250);
      await shot(2);
    }
    await click('.choice:not([disabled])');
  }
  return type;
}
