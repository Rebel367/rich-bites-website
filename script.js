/* ==========================================================
   Rich Bites - script.js
   1. Marks <html> as JS-enabled (so CSS can enhance safely)
   2. Shows the "Back to top" link only after scrolling down
   3. Highlights the nav link of the section currently in view
   4. Order builder: quantity steppers, running total, and a
      WhatsApp message with the order pre-filled
   ========================================================== */
(() => {
    'use strict';

    // --- Settings you may want to change -------------------
    const WHATSAPP_NUMBER = '233508182407'; // international format, no "+"
    const CURRENCY = 'GH₵';
    const MAX_QTY = 50;                     // per cookie type
    const SHOW_TOP_AFTER = 400;             // px scrolled before "Top" appears
    // -------------------------------------------------------

    // JS flag: CSS hides the back-to-top link only when this class exists,
    // so the page still works if JavaScript fails to load.
    document.documentElement.classList.add('js');

    /* ---------- Back to top + active nav ---------- */
    const backToTop = document.querySelector('.back-to-top');
    const navLinks = Array.from(document.querySelectorAll('.nav-list a[href^="#"]'));
    const header = document.querySelector('.site-header');

    // Pair each nav link with the section it points to (skip broken targets)
    const tracked = navLinks
        .map((link) => ({ link, section: document.querySelector(link.hash) }))
        .filter((item) => item.section);

    function updateBackToTop() {
        if (!backToTop) return;
        backToTop.classList.toggle('is-visible', window.scrollY > SHOW_TOP_AFTER);
    }

    function updateActiveNav() {
        if (!tracked.length) return;

        const headerHeight = header ? header.offsetHeight : 0;
        const threshold = headerHeight + window.innerHeight * 0.3;
        const atBottom =
            window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;

        // Default: the last section whose top has passed the threshold line
        let current = tracked[0];
        for (const item of tracked) {
            if (item.section.getBoundingClientRect().top <= threshold) {
                current = item;
            }
        }

        // The Contact section is short, so it may never reach the threshold;
        // when the page is scrolled to the very bottom, select the last link.
        if (atBottom) current = tracked[tracked.length - 1];

        tracked.forEach(({ link }) => {
            if (link === current.link) {
                link.setAttribute('aria-current', 'true');
            } else {
                link.removeAttribute('aria-current');
            }
        });
    }

    // Throttle scroll work to one run per animation frame
    let ticking = false;
    function onScroll() {
        if (ticking) return;
        ticking = true;
        window.requestAnimationFrame(() => {
            updateBackToTop();
            updateActiveNav();
            ticking = false;
        });
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);

    updateBackToTop();
    updateActiveNav();

    /* ---------- Order builder ---------- */
    function initOrder() {
        const menu = document.querySelector('.cookie-menu');
        const orderSection = document.getElementById('order');
        const cards = Array.from(document.querySelectorAll('.cookie[data-name][data-price]'));
        if (!menu || !orderSection || !cards.length) return;

        const listEl = orderSection.querySelector('.order-list');
        const emptyEl = orderSection.querySelector('.order-empty');
        const totalEl = orderSection.querySelector('.order-total-value');
        const sendBtn = document.getElementById('order-send');
        const clearBtn = document.getElementById('order-clear');

        // Build the state from the data-* attributes in the HTML
        const items = cards.map((card) => ({
            card,
            name: card.dataset.name,
            price: Number(card.dataset.price),
            qty: 0,
            valueEl: card.querySelector('.qty-value'),
            decBtn: card.querySelector('[data-action="decrease"]'),
            incBtn: card.querySelector('[data-action="increase"]'),
        }));

        // Skip any card with a missing/invalid price instead of showing NaN
        const valid = items.filter((i) => Number.isFinite(i.price) && i.valueEl && i.decBtn && i.incBtn);
        if (!valid.length) return;

        // Reveal the JS-only UI (it is hidden in the HTML as a no-JS fallback)
        valid.forEach((i) => { i.card.querySelector('.qty').hidden = false; });
        orderSection.hidden = false;

        const money = (n) => `${CURRENCY}${n}`;

        function buildMessage(chosen, total) {
            const lines = chosen.map(
                (i) => `- ${i.qty} x ${i.name} (${money(i.qty * i.price)})`
            );
            return [
                "Hello Rich Bites, I'd like to order:",
                ...lines,
                `Total: ${money(total)}`,
            ].join('\n');
        }

        function render() {
            const chosen = valid.filter((i) => i.qty > 0);
            const total = chosen.reduce((sum, i) => sum + i.qty * i.price, 0);

            valid.forEach((i) => {
                i.valueEl.textContent = String(i.qty);
                i.decBtn.disabled = i.qty === 0;
                i.incBtn.disabled = i.qty >= MAX_QTY;
            });

            // Rebuild the summary list (textContent only, no innerHTML)
            listEl.textContent = '';
            chosen.forEach((i) => {
                const li = document.createElement('li');
                li.textContent = `${i.qty} × ${i.name} — ${money(i.qty * i.price)}`;
                listEl.appendChild(li);
            });

            emptyEl.hidden = chosen.length > 0;
            totalEl.textContent = money(total);
            clearBtn.disabled = chosen.length === 0;

            if (chosen.length) {
                sendBtn.href =
                    `https://wa.me/${WHATSAPP_NUMBER}?text=` +
                    encodeURIComponent(buildMessage(chosen, total));
                sendBtn.classList.remove('is-disabled');
                sendBtn.removeAttribute('aria-disabled');
            } else {
                sendBtn.href = `https://wa.me/${WHATSAPP_NUMBER}`;
                sendBtn.classList.add('is-disabled');
                sendBtn.setAttribute('aria-disabled', 'true');
            }
        }

        // One listener for all + / - buttons (event delegation)
        menu.addEventListener('click', (event) => {
            const btn = event.target.closest('.qty-btn');
            if (!btn || btn.disabled) return;
            const item = valid.find((i) => i.card.contains(btn));
            if (!item) return;

            const delta = btn.dataset.action === 'increase' ? 1 : -1;
            item.qty = Math.min(MAX_QTY, Math.max(0, item.qty + delta));
            render();
        });

        clearBtn.addEventListener('click', () => {
            valid.forEach((i) => { i.qty = 0; });
            render();
        });

        // Block the WhatsApp link while the order is empty
        sendBtn.addEventListener('click', (event) => {
            if (sendBtn.getAttribute('aria-disabled') === 'true') {
                event.preventDefault();
            }
        });

        render();
    }

    initOrder();
})();