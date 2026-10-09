document.addEventListener('DOMContentLoaded', () => {
    // Wait a brief moment to ensure fonts are ready
    setTimeout(() => {
        const tl = gsap.timeline();

        // 1. Initial setups
        gsap.set('.navbar', { y: -30, opacity: 0 });
        gsap.set('.headline', { y: 60, opacity: 0 });
        gsap.set('.description', { y: 30, opacity: 0 });
        gsap.set('.cta-btn', { y: 30, opacity: 0 });
        gsap.set('.card', { y: 100, opacity: 0 });
        gsap.set('.conn-line', { scaleX: 0, transformOrigin: 'left center' });
        gsap.set('.conn-dot', { opacity: 0, scale: 0 });
        gsap.set('.avatar', { scale: 0, opacity: 0 });
        gsap.set('.badge-anim', { opacity: 0, y: 20 });

        // 2. Animate background lines drawing in
        tl.to('.line-anim', {
            strokeDashoffset: 0,
            duration: 3,
            ease: 'power2.inOut',
            stagger: 0.2
        }, 0);

        // 3. Navbar fade down
        tl.to('.navbar', {
            y: 0,
            opacity: 1,
            duration: 1.2,
            ease: 'power3.out'
        }, 0.3);

        // 4. Hero text reveal
        tl.to('.headline', {
            y: 0,
            opacity: 1,
            duration: 1.2,
            ease: 'power3.out'
        }, 0.6);

        tl.to('.description', {
            y: 0,
            opacity: 1,
            duration: 1,
            ease: 'power3.out'
        }, 0.9);

        tl.to('.cta-btn', {
            y: 0,
            opacity: 1,
            duration: 0.8,
            ease: 'power3.out'
        }, 1.1);

        // 5. Cards slide up staggered
        tl.to('.card', {
            y: 0,
            opacity: 1,
            duration: 1.2,
            stagger: 0.15,
            ease: 'power4.out'
        }, 1.2);

        // 6. Connecting lines grow
        tl.to('.conn-line', {
            scaleX: 1,
            duration: 0.8,
            ease: 'power2.inOut',
            stagger: 0.1
        }, 2.0);

        tl.to('.conn-dot', {
            opacity: 1,
            scale: 1,
            duration: 0.5,
            ease: 'back.out(2)',
            stagger: 0.1
        }, 2.4);

        // Avatars pop in
        tl.to('.avatar', {
            scale: 1,
            opacity: 1,
            duration: 0.6,
            stagger: -0.1, // Stagger in reverse for the stacking effect
            ease: 'back.out(1.5)'
        }, 2.6);

        // Tech Badges Fade In
        tl.to('.badge-anim', {
            opacity: 1,
            y: 0,
            duration: 0.8,
            stagger: 0.2,
            ease: 'power2.out'
        }, 2.8);

        // Continuous float animation for badges
        gsap.to('.badge-anim', {
            y: -8,
            duration: 2.5,
            yoyo: true,
            repeat: -1,
            ease: 'sine.inOut',
            stagger: 1.2
        });

        // Interactive Atom symbol
        const atomSvg = document.querySelector('.icon-o svg');
        if (atomSvg) {
            // Continuous slow spin
            gsap.to(atomSvg, {
                rotation: 360,
                duration: 20,
                repeat: -1,
                ease: 'linear',
                transformOrigin: "center center"
            });
        }
        
    }, 100);
});
