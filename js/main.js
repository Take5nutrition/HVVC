// ========================================
// HVVC — Main JavaScript
// Premium Interactions & Effects
// ========================================

// =============================================
// TRYOUT MODE TOGGLE
// Set to true when tryouts are open,
// false during the active season.
// That's it — one flip and the whole site updates.
// =============================================
const TRYOUTS_ACTIVE = false;

document.addEventListener('DOMContentLoaded', () => {

  // Apply mode class to body
  document.body.classList.add(TRYOUTS_ACTIVE ? 'mode-tryouts' : 'mode-in-season');

  // ---- Scroll progress bar ----
  const scrollProgress = document.querySelector('.scroll-progress');
  if (scrollProgress) {
    window.addEventListener('scroll', () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
      scrollProgress.style.width = progress + '%';
    }, { passive: true });
  }

  // ---- Back to top button ----
  const backToTop = document.querySelector('.back-to-top');
  if (backToTop) {
    window.addEventListener('scroll', () => {
      if (window.scrollY > 400) {
        backToTop.classList.add('visible');
      } else {
        backToTop.classList.remove('visible');
      }
    }, { passive: true });

    backToTop.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // ---- Navbar scroll effect ----
  const navbar = document.getElementById('navbar');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  }, { passive: true });

  // ---- Mobile burger menu ----
  const burger = document.getElementById('burger');
  const navLinks = document.getElementById('navLinks');

  if (burger && navLinks) {
    burger.addEventListener('click', () => {
      burger.classList.toggle('active');
      navLinks.classList.toggle('mobile-open');
      document.body.style.overflow = navLinks.classList.contains('mobile-open') ? 'hidden' : '';
    });

    navLinks.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        burger.classList.remove('active');
        navLinks.classList.remove('mobile-open');
        document.body.style.overflow = '';
      });
    });
  }

  // ---- Button ripple effect ----
  document.querySelectorAll('.btn').forEach(btn => {
    btn.addEventListener('click', function(e) {
      const ripple = document.createElement('span');
      ripple.classList.add('ripple');
      const rect = this.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      ripple.style.width = ripple.style.height = size + 'px';
      ripple.style.left = (e.clientX - rect.left - size / 2) + 'px';
      ripple.style.top = (e.clientY - rect.top - size / 2) + 'px';
      this.appendChild(ripple);
      setTimeout(() => ripple.remove(), 600);
    });
  });

  // ---- Animated number counter ----
  const counters = document.querySelectorAll('[data-target]');
  let countersAnimated = false;

  function animateCounters() {
    if (countersAnimated) return;
    countersAnimated = true;

    counters.forEach(counter => {
      const target = parseInt(counter.getAttribute('data-target'), 10);
      const duration = 2000;
      const startTime = performance.now();

      function updateCounter(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        // Elastic ease out for dramatic effect
        const eased = 1 - Math.pow(1 - progress, 4);
        counter.textContent = Math.round(target * eased);
        if (progress < 1) {
          requestAnimationFrame(updateCounter);
        } else {
          counter.textContent = target;
        }
      }
      requestAnimationFrame(updateCounter);
    });
  }

  // ---- Scroll reveal (standard fade-up) ----
  const revealElements = document.querySelectorAll(
    '.section__header, .about__text, .about__values, .expect__item, ' +
    '.program-card, .team-card, .coach-card, .invest-card, .scholarship, ' +
    '.update-card, .contact__info, .contact__form-wrap, .tryouts__content, ' +
    '.preview-card, .quick-link, .age-card, .faq-item, .home-intro, ' +
    '.program-photo-card, .quick-link-card, .value-card, ' +
    '.full-bleed-photo, .photo-carousel, .stats-row, .stat-card, .welcome, ' +
    '.welcome__feature, .pull-quote__inner, .why-item, .featured-testimonial__inner, ' +
    '.about-hero__content, .about-story__photo-wrap, .about-story__text-col, ' +
    '.about-mvv-item, .about-cta__inner, ' +
    '.prog-hero__content, .prog-card, .prog-soon__item, .prog-cta__inner, ' +
    '.prog-training__header, .prog-soon__header, ' +
    '.dk-hero__content, .dk-team-card, .dk-coach-card, .dk-invest-card, .dk-step, ' +
    '.dk-update-card, .dk-contact-info, .dk-form, .dk-cta__inner, ' +
    '.dk-upload-zone, .dk-scholarship, .dk-split__photo-wrap, .dk-split__text-col, ' +
    '.teams-division__header'
  );

  revealElements.forEach(el => el.classList.add('reveal'));

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

  revealElements.forEach(el => observer.observe(el));

  // ---- Directional reveal (slide from left/right) ----
  document.querySelectorAll('.split-section').forEach(split => {
    const text = split.querySelector('.split-section__text');
    const image = split.querySelector('.split-section__image');
    if (text && image) {
      const isReverse = split.classList.contains('split-section--reverse');
      text.classList.add(isReverse ? 'reveal-right' : 'reveal-left');
      image.classList.add(isReverse ? 'reveal-left' : 'reveal-right');

      const splitObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            text.classList.add('visible');
            image.classList.add('visible');
            splitObserver.unobserve(entry.target);
          }
        });
      }, { threshold: 0.15 });
      splitObserver.observe(split);
    }
  });

  // Counter observer
  const statsSection = document.querySelector('.stats-cards') || document.querySelector('.stats-row') || document.querySelector('.hero__stats');
  if (statsSection) {
    const counterObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          animateCounters();
          counterObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.2 });
    counterObserver.observe(statsSection);
  }

  // ---- Staggered reveal for grid items ----
  document.querySelectorAll(
    '.programs__grid, .teams__grid, .coaches__grid, .investment__grid, .updates__grid, ' +
    '.about__values, .expect__grid, .preview-grid, .quick-links, .age-grid, .scholarship-grid, ' +
    '.program-photo-grid, .quick-links-grid, .faq-list, .stats-cards, .welcome__features, .why-grid, ' +
    '.about-story__creds, .about-hero__badges, ' +
    '.prog-hero__badges, .prog-cards, .prog-soon__grid, .prog-featured__features, ' +
    '.teams-division__grid, .dk-coaches-grid, .dk-invest-grid, .dk-steps'
  ).forEach(grid => {
    const gridObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          Array.from(entry.target.children).forEach((item, i) => {
            item.style.transitionDelay = `${i * 0.1}s`;
          });
          gridObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });
    gridObserver.observe(grid);
  });

  // ---- 3D Tilt effect on cards (GPU-accelerated, rAF-throttled) ----
  if (window.matchMedia('(min-width: 768px)').matches) {
    document.querySelectorAll('.stat-card, .program-photo-card, .quick-link-card, .welcome__feature, .about-story__cred, .prog-card, .prog-featured__feature, .dk-team-card, .dk-invest-card, .dk-step, .dk-update-card').forEach(card => {
      card.classList.add('tilt-card');
      card.style.willChange = 'transform';
      card.style.transition = 'transform 0.15s ease-out';

      let tiltRAF = null;

      card.addEventListener('mousemove', (e) => {
        if (tiltRAF) return;
        tiltRAF = requestAnimationFrame(() => {
          const rect = card.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;
          const centerX = rect.width / 2;
          const centerY = rect.height / 2;
          const rotateX = (y - centerY) / centerY * -8;
          const rotateY = (x - centerX) / centerX * 8;
          card.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-8px)`;
          tiltRAF = null;
        });
      });

      card.addEventListener('mouseleave', () => {
        if (tiltRAF) { cancelAnimationFrame(tiltRAF); tiltRAF = null; }
        card.style.transition = 'transform 0.4s ease-out';
        card.style.transform = '';
        setTimeout(() => { card.style.transition = 'transform 0.15s ease-out'; }, 400);
      });
    });
  }

  // ---- Mouse spotlight on dark sections ----
  document.querySelectorAll('.stats-dark, .pull-quote, .featured-testimonial, .tryouts').forEach(section => {
    section.classList.add('has-spotlight');
    section.addEventListener('mousemove', (e) => {
      const rect = section.getBoundingClientRect();
      section.style.setProperty('--mouse-x', (e.clientX - rect.left) + 'px');
      section.style.setProperty('--mouse-y', (e.clientY - rect.top) + 'px');
    });
  });

  // ---- Magnetic button effect ----
  if (window.matchMedia('(min-width: 768px)').matches) {
    document.querySelectorAll('.btn--primary.btn--lg').forEach(btn => {
      btn.classList.add('btn-magnetic');

      btn.addEventListener('mousemove', (e) => {
        const rect = btn.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;
        btn.style.transform = `translate(${x * 0.15}px, ${y * 0.15}px) translateY(-3px) scale(1.02)`;
      });

      btn.addEventListener('mouseleave', () => {
        btn.style.transform = '';
      });
    });
  }

  // ---- Word-by-word text reveal on pull quote ----
  document.querySelectorAll('.pull-quote__text').forEach(el => {
    const text = el.innerHTML;
    // Split text by spaces but preserve HTML tags
    const words = text.split(/(\s+)/);
    el.innerHTML = words.map(word => {
      if (word.trim() === '') return word;
      return `<span class="word">${word}</span>`;
    }).join('');
    el.classList.add('word-reveal');

    const wordObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          el.classList.add('visible');
          // Stagger each word
          el.querySelectorAll('.word').forEach((word, i) => {
            word.style.transitionDelay = `${i * 0.06}s`;
          });
          wordObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.3 });
    wordObserver.observe(el);
  });

  // ---- Typing text animation ----
  const typingEl = document.getElementById('typingText');
  if (typingEl) {
    const phrases = ['Every Season.', 'Every Practice.', 'Every Rep.', 'Every Athlete.'];
    let phraseIndex = 0;
    let charIndex = 0;
    let isDeleting = false;
    let speed = 100;

    function type() {
      const current = phrases[phraseIndex];

      if (isDeleting) {
        typingEl.textContent = current.substring(0, charIndex - 1);
        charIndex--;
        speed = 50;
      } else {
        typingEl.textContent = current.substring(0, charIndex + 1);
        charIndex++;
        speed = 100;
      }

      if (!isDeleting && charIndex === current.length) {
        speed = 2000;
        isDeleting = true;
      } else if (isDeleting && charIndex === 0) {
        isDeleting = false;
        phraseIndex = (phraseIndex + 1) % phrases.length;
        speed = 300;
      }

      setTimeout(type, speed);
    }

    setTimeout(type, 1500);
  }

  // ---- Countdown timer (only runs when tryouts are active) ----
  const countdownEl = document.getElementById('countdown');
  if (countdownEl && TRYOUTS_ACTIVE) {
    const targetDate = new Date('2026-05-01T09:00:00');

    function updateCountdown() {
      const now = new Date();
      const diff = targetDate - now;

      if (diff <= 0) {
        countdownEl.innerHTML = '<span style="font-size:1.2rem;color:var(--pink);font-weight:700;">Tryouts are here!</span>';
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      countdownEl.innerHTML = `
        <div class="countdown__unit">
          <span class="countdown__number">${days}</span>
          <span class="countdown__label">Days</span>
        </div>
        <div class="countdown__unit">
          <span class="countdown__number">${hours}</span>
          <span class="countdown__label">Hours</span>
        </div>
        <div class="countdown__unit">
          <span class="countdown__number">${minutes}</span>
          <span class="countdown__label">Minutes</span>
        </div>
        <div class="countdown__unit">
          <span class="countdown__number">${seconds}</span>
          <span class="countdown__label">Seconds</span>
        </div>
      `;
    }

    updateCountdown();
    setInterval(updateCountdown, 1000);
  }

  // ---- FAQ Accordion ----
  document.querySelectorAll('.faq-question').forEach(question => {
    question.addEventListener('click', () => {
      const item = question.parentElement;
      const isOpen = item.classList.contains('open');

      document.querySelectorAll('.faq-item.open').forEach(openItem => {
        openItem.classList.remove('open');
      });

      if (!isOpen) {
        item.classList.add('open');
      }
    });
  });

  // ---- Testimonial carousel ----
  const testimonialTrack = document.querySelector('.testimonial-track');
  const testimonialDots = document.querySelectorAll('.testimonial-dot');

  if (testimonialTrack && testimonialDots.length > 0) {
    let currentSlide = 0;
    const slides = testimonialTrack.children;
    const totalSlides = slides.length;

    function goToSlide(index) {
      currentSlide = index;
      testimonialTrack.style.transform = `translateX(-${index * 100}%)`;
      testimonialDots.forEach((dot, i) => {
        dot.classList.toggle('active', i === index);
      });
    }

    testimonialDots.forEach((dot, i) => {
      dot.addEventListener('click', () => goToSlide(i));
    });

    setInterval(() => {
      goToSlide((currentSlide + 1) % totalSlides);
    }, 5000);
  }

  // ---- Toast notification system ----
  window.showToast = function(message) {
    let container = document.querySelector('.toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => toast.remove(), 3000);
  };

  // ---- Confetti effect ----
  window.fireConfetti = function() {
    const canvas = document.getElementById('confetti-canvas') || createConfettiCanvas();
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles = [];
    const colors = ['#ff2aa1', '#7b3fe4', '#ff6ec4', '#5a1fc0', '#f0abfc'];

    for (let i = 0; i < 150; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: -10 - Math.random() * 50,
        w: Math.random() * 10 + 5,
        h: Math.random() * 6 + 3,
        color: colors[Math.floor(Math.random() * colors.length)],
        vx: (Math.random() - 0.5) * 4,
        vy: Math.random() * 4 + 2,
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 10,
        opacity: 1
      });
    }

    function animate() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;

      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.05;
        p.rotation += p.rotationSpeed;
        p.opacity -= 0.005;

        if (p.opacity > 0 && p.y < canvas.height) {
          alive = true;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rotation * Math.PI / 180);
          ctx.globalAlpha = p.opacity;
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
          ctx.restore();
        }
      });

      if (alive) {
        requestAnimationFrame(animate);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }

    animate();
  };

  function createConfettiCanvas() {
    const canvas = document.createElement('canvas');
    canvas.id = 'confetti-canvas';
    document.body.appendChild(canvas);
    return canvas;
  }

  // ---- Contact form with confetti ----
  const form = document.getElementById('contactForm');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const btn = form.querySelector('button[type="submit"]');
      const originalText = btn.textContent;
      btn.textContent = 'Sending...';
      btn.disabled = true;

      setTimeout(() => {
        btn.textContent = 'Message Sent!';
        btn.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
        form.reset();

        window.fireConfetti();
        window.showToast('Message sent successfully!');

        setTimeout(() => {
          btn.textContent = originalText;
          btn.style.background = '';
          btn.disabled = false;
        }, 3000);
      }, 1000);
    });
  }

  // ---- Multi-layer parallax ----
  const heroPhotoBg = document.querySelector('.hero__photo-bg');
  const heroBg = document.querySelector('.hero__bg');
  const heroParticles = document.querySelector('.hero-particles');

  function handleParallax() {
    const scrollY = window.scrollY;
    if (scrollY < window.innerHeight * 1.5) {
      if (heroPhotoBg) {
        heroPhotoBg.style.transform = `scale(${1 + scrollY * 0.0003}) translateY(${scrollY * 0.2}px)`;
      }
      if (heroBg && !heroPhotoBg) {
        heroBg.style.transform = `translateY(${scrollY * 0.3}px)`;
      }
      if (heroParticles) {
        heroParticles.style.transform = `translateY(${scrollY * 0.1}px)`;
      }
    }
  }

  window.addEventListener('scroll', handleParallax, { passive: true });

  // ---- Smooth navbar hide/show on scroll direction ----
  let lastScrollY = window.scrollY;
  let scrollDirection = 'up';

  window.addEventListener('scroll', () => {
    const currentScrollY = window.scrollY;
    if (currentScrollY > lastScrollY && currentScrollY > 200) {
      scrollDirection = 'down';
      navbar.style.transform = 'translateY(-100%)';
    } else {
      scrollDirection = 'up';
      navbar.style.transform = 'translateY(0)';
    }
    lastScrollY = currentScrollY;
  }, { passive: true });

  // ---- About page MVV accordion ----
  document.querySelectorAll('[data-mvv]').forEach(item => {
    const btn = item.querySelector('.about-mvv-item__header');
    if (!btn) return;
    btn.addEventListener('click', () => {
      const isOpen = item.classList.contains('about-mvv-item--open');
      // Close all
      document.querySelectorAll('[data-mvv]').forEach(i => {
        i.classList.remove('about-mvv-item--open');
        const b = i.querySelector('.about-mvv-item__header');
        if (b) b.setAttribute('aria-expanded', 'false');
      });
      // Open clicked (if it wasn't already open)
      if (!isOpen) {
        item.classList.add('about-mvv-item--open');
        btn.setAttribute('aria-expanded', 'true');
      }
    });
  });

  // ---- About page: directional reveals on story split ----
  const aboutPhoto = document.querySelector('.about-story__photo-wrap');
  const aboutText = document.querySelector('.about-story__text-col');
  if (aboutPhoto && aboutText) {
    aboutPhoto.classList.remove('reveal');
    aboutText.classList.remove('reveal');
    aboutPhoto.classList.add('reveal-left');
    aboutText.classList.add('reveal-right');

    const storyObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          aboutPhoto.classList.add('visible');
          aboutText.classList.add('visible');
          storyObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });
    storyObserver.observe(aboutPhoto.closest('.about-story') || aboutPhoto);
  }

  // ---- About page: word-by-word reveal on story quote ----
  document.querySelectorAll('.about-story__quote').forEach(el => {
    const text = el.innerHTML;
    const words = text.split(/(\s+)/);
    el.innerHTML = words.map(word => {
      if (word.trim() === '') return word;
      return `<span class="word">${word}</span>`;
    }).join('');
    el.classList.add('word-reveal');

    const quoteObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          el.classList.add('visible');
          el.querySelectorAll('.word').forEach((word, i) => {
            word.style.transitionDelay = `${i * 0.05}s`;
          });
          quoteObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.3 });
    quoteObserver.observe(el);
  });

  // ---- About page: counter on photo badge (50+) ----
  const badgeNum = document.querySelector('.about-story__photo-badge-num');
  if (badgeNum) {
    const targetText = badgeNum.textContent.trim();
    const numMatch = targetText.match(/(\d+)/);
    if (numMatch) {
      const target = parseInt(numMatch[1], 10);
      const suffix = targetText.replace(numMatch[1], '');
      badgeNum.textContent = '0' + suffix;

      const badgeObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const duration = 1500;
            const startTime = performance.now();
            function updateBadge(currentTime) {
              const elapsed = currentTime - startTime;
              const progress = Math.min(elapsed / duration, 1);
              const eased = 1 - Math.pow(1 - progress, 3);
              badgeNum.textContent = Math.round(target * eased) + suffix;
              if (progress < 1) {
                requestAnimationFrame(updateBadge);
              } else {
                badgeNum.textContent = target + suffix;
              }
            }
            requestAnimationFrame(updateBadge);
            badgeObserver.unobserve(entry.target);
          }
        });
      }, { threshold: 0.5 });
      badgeObserver.observe(badgeNum);
    }
  }

  // ---- About page: parallax orbs on scroll ----
  const aboutOrb1 = document.querySelector('.about-hero__orb--1');
  const aboutOrb2 = document.querySelector('.about-hero__orb--2');
  if (aboutOrb1 && aboutOrb2) {
    window.addEventListener('scroll', () => {
      const scrollY = window.scrollY;
      if (scrollY < window.innerHeight * 1.2) {
        aboutOrb1.style.transform = `translate(${scrollY * 0.05}px, ${scrollY * 0.15}px) scale(1)`;
        aboutOrb2.style.transform = `translate(${scrollY * -0.04}px, ${scrollY * -0.1}px) scale(1)`;
      }
    }, { passive: true });
  }

  // ---- Generic hero orb parallax (programs + shared dk-hero) ----
  document.querySelectorAll('.prog-hero__orbs, .dk-hero__orbs').forEach(orbContainer => {
    const orb1 = orbContainer.children[0];
    const orb2 = orbContainer.children[1];
    if (orb1 && orb2) {
      window.addEventListener('scroll', () => {
        const scrollY = window.scrollY;
        if (scrollY < window.innerHeight * 1.2) {
          orb1.style.transform = `translate(${scrollY * 0.05}px, ${scrollY * 0.15}px) scale(1)`;
          orb2.style.transform = `translate(${scrollY * -0.04}px, ${scrollY * -0.1}px) scale(1)`;
        }
      }, { passive: true });
    }
  });

  // ---- Directional reveals on dk-split sections ----
  document.querySelectorAll('.dk-split').forEach(split => {
    const photo = split.querySelector('.dk-split__photo-wrap');
    const text = split.querySelector('.dk-split__text-col');
    if (photo && text) {
      photo.classList.remove('reveal');
      text.classList.remove('reveal');
      const isReverse = split.classList.contains('dk-split--reverse');
      photo.classList.add(isReverse ? 'reveal-right' : 'reveal-left');
      text.classList.add(isReverse ? 'reveal-left' : 'reveal-right');

      const splitObs = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            photo.classList.add('visible');
            text.classList.add('visible');
            splitObs.unobserve(entry.target);
          }
        });
      }, { threshold: 0.15 });
      splitObs.observe(split);
    }
  });

  // ---- Coach bio expand on hover ----
  document.querySelectorAll('[data-coach-bio]').forEach(card => {
    card.addEventListener('mouseenter', () => {
      card.classList.add('bio-open');
    });
    card.addEventListener('mouseleave', () => {
      card.classList.remove('bio-open');
    });
  });

  // ---- Coach photo lightbox ----
  const lightbox = document.getElementById('coachLightbox');
  if (lightbox) {
    const lbImg = lightbox.querySelector('img');
    const lbClose = lightbox.querySelector('.coach-lightbox__close');
    document.querySelectorAll('.dk-coach-card__photo').forEach(photoWrap => {
      photoWrap.addEventListener('click', () => {
        const img = photoWrap.querySelector('img');
        if (img) {
          lbImg.src = img.src;
          lbImg.alt = img.alt;
          lightbox.classList.add('is-active');
          document.body.style.overflow = 'hidden';
        }
      });
    });
    // Also make the split section coach photos clickable
    document.querySelectorAll('.dk-split__photo-wrap').forEach(photoWrap => {
      photoWrap.style.cursor = 'pointer';
      photoWrap.addEventListener('click', () => {
        const img = photoWrap.querySelector('img');
        if (img) {
          lbImg.src = img.src;
          lbImg.alt = img.alt;
          lightbox.classList.add('is-active');
          document.body.style.overflow = 'hidden';
        }
      });
    });
    function closeLightbox() {
      lightbox.classList.remove('is-active');
      document.body.style.overflow = '';
    }
    lbClose.addEventListener('click', closeLightbox);
    lightbox.addEventListener('click', (e) => { if (e.target === lightbox) closeLightbox(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeLightbox(); });
  }

  // ---- Spotlight on dark sections (all pages) ----
  document.querySelectorAll('.about-hero, .about-story, .about-mvv, .prog-hero, .prog-training, .dk-hero, .dk-section, .dk-split, .teams-division').forEach(section => {
    section.classList.add('has-spotlight');
    section.addEventListener('mousemove', (e) => {
      const rect = section.getBoundingClientRect();
      section.style.setProperty('--mouse-x', (e.clientX - rect.left) + 'px');
      section.style.setProperty('--mouse-y', (e.clientY - rect.top) + 'px');
    });
  });

});
