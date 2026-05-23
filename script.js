// Hamburger menu toggle
const hamburger = document.getElementById('hamburger');
const navLinks  = document.getElementById('nav-links');

hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('open');
    navLinks.classList.toggle('open');
});

navLinks.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
        hamburger.classList.remove('open');
        navLinks.classList.remove('open');
    });
});

// Accordion toggle
function toggleAcc(btn) {
    const item = btn.closest('.acc-item');
    const icon = btn.querySelector('.acc-icon');
    const isOpen = item.classList.contains('open');

    item.classList.toggle('open');
    icon.textContent = isOpen ? '+' : '−';
}
