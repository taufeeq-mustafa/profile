// Shrink nav on scroll
const nav = document.getElementById('nav');
window.addEventListener('scroll', () => {
    nav.style.padding = window.scrollY > 60
        ? '12px 48px'
        : '18px 48px';
});

// Hamburger menu toggle
const hamburger = document.getElementById('hamburger');
const navLinks  = document.getElementById('nav-links');

hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('open');
    navLinks.classList.toggle('open');
});

// Close menu when a link is clicked
navLinks.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
        hamburger.classList.remove('open');
        navLinks.classList.remove('open');
    });
});
