/**
 * School Admission Management System - Main Page Interactivity
 */

document.addEventListener('DOMContentLoaded', () => {
  // 1. Hide Preloader with a smooth fade-out transition
  const loader = document.getElementById('pageLoader');
  if (loader) {
    setTimeout(() => {
      loader.classList.add('fade-out');
      // Completely remove from layout after fade transition ends
      setTimeout(() => {
        loader.style.display = 'none';
      }, 400);
    }, 300); // Small delay for visual aesthetic
  }

  // 2. Mobile Responsive Nav Hamburger Drawer
  const navToggle = document.getElementById('navToggle');
  const navMenu = document.getElementById('navMenu');
  
  if (navToggle && navMenu) {
    navToggle.addEventListener('click', () => {
      navToggle.classList.toggle('active');
      navMenu.classList.toggle('active');
    });

    // Close mobile nav drawer when clicking on links
    const navLinks = navMenu.querySelectorAll('a');
    navLinks.forEach(link => {
      link.addEventListener('click', () => {
        navToggle.classList.remove('active');
        navMenu.classList.remove('active');
      });
    });
  }

  // Carousel initialization
  function initializeCarousel(carousel) {
    const track = carousel.querySelector('.carousel-track');
    const slides = Array.from(track?.querySelectorAll('.carousel-slide') || []);
    const nextBtn = carousel.querySelector('.next');
    const prevBtn = carousel.querySelector('.prev');

    if (!track || slides.length === 0) return;

    let currentIndex = 0;

    function showSlide(index) {
      track.style.transform = `translateX(-${index * 100}%)`;
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        currentIndex = (currentIndex + 1) % slides.length;
        showSlide(currentIndex);
      });
    }

    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        currentIndex = (currentIndex - 1 + slides.length) % slides.length;
        showSlide(currentIndex);
      });
    }

    setInterval(() => {
      currentIndex = (currentIndex + 1) % slides.length;
      showSlide(currentIndex);
    }, 3000);
  }

  function buildTopperSlider() {
    const topperCarousel = document.getElementById('topperCarousel');
    if (!topperCarousel) return;

    const track = topperCarousel.querySelector('.carousel-track');
    if (!track) return;

    const toppers = window.DB.getToppers();
    if (toppers.length === 0) {
      track.innerHTML = `
        <div class="carousel-slide" style="display:flex;align-items:center;justify-content:center;background: var(--bg-card);color: var(--text-muted);font-size:1.05rem;min-height:260px;">
          No topper highlights are available yet. Admin can add toppers from the dashboard.
        </div>
      `;
      initializeCarousel(topperCarousel);
      return;
    }

    track.innerHTML = toppers.map(topper => `
      <div class="carousel-slide">
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;padding:1rem;gap:1rem;">
          <div style="width:220px;height:220px;border-radius:30px;overflow:hidden;box-shadow:var(--shadow-xl);border:1px solid var(--border);background:#fff;">
            <img src="${topper.image}" alt="${topper.name}" style="width:100%;height:100%;object-fit:cover;" />
          </div>
          <div style="text-align:center;max-width:520px;">
            <h3 style="margin:0 0 .35rem;">${topper.name}</h3>
            <p style="margin:0.15rem 0; color: var(--text-muted);">${topper.class}</p>
            <p style="margin:0.5rem 0 0; font-size:1rem; font-weight:700;">Marks: ${topper.marks}</p>
          </div>
        </div>
      </div>
    `).join('');

    initializeCarousel(topperCarousel);
  }

  const staticCarousels = document.querySelectorAll('.carousel:not(#topperCarousel)');
  staticCarousels.forEach(initializeCarousel);
  buildTopperSlider();

  window.addEventListener('topperDataUpdated', buildTopperSlider);

  // 3. Highlight Nav item on scroll
  const sections = document.querySelectorAll('section[id]');
  window.addEventListener('scroll', () => {
    let scrollY = window.pageYOffset;
    
    sections.forEach(current => {
      const sectionHeight = current.offsetHeight;
      const sectionTop = current.offsetTop - 100;
      const sectionId = current.getAttribute('id');
      const navLink = document.querySelector(`.nav-menu a[href*=${sectionId}]`);
      
      if (navLink) {
        if (scrollY > sectionTop && scrollY <= sectionTop + sectionHeight) {
          document.querySelectorAll('.nav-menu a').forEach(a => a.classList.remove('active'));
          navLink.classList.add('active');
        }
      }
    });
  });
});
