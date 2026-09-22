const toggle = document.querySelector('.nav-toggle');
const links = document.querySelector('.nav-links');

toggle.addEventListener('click', () => {
  const open = links.classList.toggle('open');
  toggle.setAttribute('aria-expanded', open);
});

links.querySelectorAll('a').forEach(a => {
  a.addEventListener('click', () => {
    links.classList.remove('open');
    toggle.setAttribute('aria-expanded', 'false');
  });
});

// highlight the nav link for whichever section is on screen
const navLinks = [...links.querySelectorAll('a')];
const sections = [...document.querySelectorAll('main section[id]')];

const spy = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (!e.isIntersecting) return;
    navLinks.forEach(a => {
      a.classList.toggle('active', a.getAttribute('href') === '#' + e.target.id);
    });
  });
}, { rootMargin: '-40% 0px -55% 0px' });

sections.forEach(s => spy.observe(s));

// fade sections in as they scroll into view
const reveal = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add('in');
      reveal.unobserve(e.target);
    }
  });
}, { threshold: 0.1 });

document.querySelectorAll('.reveal').forEach(el => reveal.observe(el));

// photo stack: clicking sends the front photo to the back
const stack = document.querySelector('.photo-stack');
if (stack) {
  const cards = [...stack.querySelectorAll('.photo-card')];
  const shuffle = () => {
    cards.forEach(c => {
      const pos = Number(c.dataset.pos);
      c.dataset.pos = (pos + cards.length - 1) % cards.length;
    });
  };
  stack.addEventListener('click', shuffle);
  stack.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      shuffle();
    }
  });
}

document.getElementById('year').textContent = new Date().getFullYear();
