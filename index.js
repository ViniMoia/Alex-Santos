/**
 * AIOX Cohort Fundamentals · Turma 6 — Main Application Controller
 * Coordinates GSAP, ScrollTrigger, Telemetry, and ParticleEngine
 */

document.addEventListener("DOMContentLoaded", () => {
    // 1. Check for reduced motion
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // 2. Initialize WebGL Particle Engine with failover
    let particleEngine = null;
    const hasThree = typeof THREE !== "undefined";
    const hasGSAP = typeof gsap !== "undefined";

    if (hasThree) {
        try {
            particleEngine = new ParticleEngine("hero-particle-canvas");
        } catch (error) {
            console.error("WebGL initialization failed, falling back to static presentation:", error);
            activateFallback();
        }
    } else {
        console.warn("Three.js library missing. Activating fallback.");
        activateFallback();
    }

    // 3. Fallback activation helper
    function activateFallback() {
        const fallback = document.getElementById("webgl-fallback");
        if (fallback) fallback.classList.add("active");
        const status = document.getElementById("system-status-indicator");
        if (status) status.textContent = "TURMA 6 // 13 DE JUNHO";
    }

    // 4. If reduced motion is requested, set system to final organized state
    if (prefersReducedMotion) {
        if (particleEngine) {
            particleEngine.setFormationProgress(1.0);
        }
        updateTelemetry(1.0);
        return;
    }

    // 5. GSAP Entrance Timeline (0ms - 1000ms narrative sequence)
    if (hasGSAP) {
        initEntranceTimeline(particleEngine);
        initScrollStorytelling(particleEngine);
        initInteractiveControls(particleEngine);
    }
});

/**
 * 5.1 GSAP Entrance Animation
 */
function initEntranceTimeline(particleEngine) {
    // Initial style states to prevent FOUC
    gsap.set(".animate-item", { opacity: 0, y: 24 });
    gsap.set("#hero-headline", { clipPath: "inset(100% 0% 0% 0%)", opacity: 1 });
    gsap.set("#hero-nav", { opacity: 0, y: -20 });

    const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

    // 0ms - 200ms: Navigation and Badge
    tl.to("#hero-nav", {
        opacity: 1,
        y: 0,
        duration: 0.9,
        ease: "power2.out"
    })
    .to("#hero-badge", {
        opacity: 1,
        y: 0,
        duration: 0.8
    }, "-=0.6")

    // 100ms - 400ms: H1 Mask Reveal
    .to("#hero-headline", {
        clipPath: "inset(0% 0% 0% 0%)",
        duration: 1.25,
        ease: "power4.inOut"
    }, "-=0.6")

    // 400ms: Subheadline
    .to("#hero-subheadline", {
        opacity: 1,
        y: 0,
        duration: 0.85
    }, "-=0.65")

    // 550ms: CTAs
    .to("#hero-actions", {
        opacity: 1,
        y: 0,
        duration: 0.85
    }, "-=0.6");

    if (document.getElementById("state-telemetry")) {
        tl.to("#state-telemetry", {
            opacity: 1,
            y: 0,
            duration: 0.75
        }, "-=0.5");
    }

    tl.to("#scroll-prompt", {
        opacity: 0.7,
        duration: 0.8
    }, "-=0.3");
}

/**
 * 5.2 Scroll Storytelling via ScrollTrigger
 */
function initScrollStorytelling(particleEngine) {
    if (typeof ScrollTrigger === "undefined" || !particleEngine) return;

    gsap.registerPlugin(ScrollTrigger);

    ScrollTrigger.create({
        trigger: "#hero-scroll-wrapper",
        start: "top top",
        end: "bottom bottom",
        scrub: 0.8,
        onUpdate: (self) => {
            const p = self.progress;

            // Drive 3D simulation
            particleEngine.setFormationProgress(p);

            // Update UI Telemetry
            updateTelemetry(p);

            // Fade out scroll prompt as user advances
            const prompt = document.getElementById("scroll-prompt");
            if (prompt) {
                prompt.style.opacity = Math.max(0, 0.7 - p * 2.5);
            }
        }
    });
}

/**
 * 5.3 Interactive Controls for Step Buttons
 */
function initInteractiveControls(particleEngine) {
    const buttons = document.querySelectorAll(".step-btn");
    buttons.forEach((btn) => {
        btn.addEventListener("click", () => {
            const targetVal = parseFloat(btn.dataset.state);
            const scrollWrapper = document.getElementById("hero-scroll-wrapper");

            if (scrollWrapper && typeof ScrollTrigger !== "undefined") {
                const maxScroll = scrollWrapper.offsetHeight - window.innerHeight;
                const targetScroll = scrollWrapper.offsetTop + maxScroll * targetVal;
                window.scrollTo({
                    top: targetScroll,
                    behavior: "smooth"
                });
            } else if (particleEngine) {
                gsap.to({ val: particleEngine.state.formationProgress }, {
                    val: targetVal,
                    duration: 1.2,
                    ease: "power2.inOut",
                    onUpdate: function () {
                        particleEngine.setFormationProgress(this.targets()[0].val);
                        updateTelemetry(this.targets()[0].val);
                    }
                });
            }
        });
    });
}

/**
 * Update UI Telemetry text, progress bar, and status pills
 */
function updateTelemetry(progress) {
    const bar = document.getElementById("telemetry-bar");
    const name = document.getElementById("telemetry-state-name");
    const status = document.getElementById("system-status-indicator");
    const step0 = document.getElementById("step-btn-0");
    const step1 = document.getElementById("step-btn-1");
    const step2 = document.getElementById("step-btn-2");

    if (bar) {
        bar.style.width = `${Math.round(progress * 100)}%`;
    }

    // State 01: Usuário de Chat
    if (progress < 0.28) {
        if (name) name.textContent = "01 // USUÁRIO DE CHAT (PROMPTS SOLTOS)";
        if (status) {
            status.textContent = "INÍCIO: 13 DE JUNHO (SÁBADO)";
            status.style.color = "var(--brand-cyan)";
        }
        step0?.classList.add("active");
        step1?.classList.remove("active");
        step2?.classList.remove("active");
    }
    // State 02: 6 Encontros ao Vivo
    else if (progress < 0.75) {
        if (name) name.textContent = "02 // 6 ENCONTROS AO VIVO (CONSTRUÇÃO)";
        if (status) {
            status.textContent = "AGENTS // STRUCTURING";
            status.style.color = "var(--brand-cyan)";
        }
        step0?.classList.remove("active");
        step1?.classList.add("active");
        step2?.classList.remove("active");
    }
    // State 03: Sistema de Captação no Ar
    else {
        if (name) name.textContent = "03 // SISTEMA DE CAPTAÇÃO NO AR";
        if (status) {
            status.textContent = "SYS // 400+ AGENTES NO AR";
            status.style.color = "var(--brand-white-cool)";
        }
        step0?.classList.remove("active");
        step1?.classList.remove("active");
        step2?.classList.add("active");
    }
}
