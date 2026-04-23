import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

/**
 * Fade in from below.
 * @param {gsap.TweenTarget} element
 * @param {number} [duration=0.6]
 * @param {number} [delay=0]
 * @returns {gsap.core.Tween}
 */
export function fadeIn(element, duration = 0.6, delay = 0) {
    return gsap.fromTo(
        element,
        { opacity: 0, y: 20 },
        {
            opacity: 1,
            y: 0,
            duration,
            delay,
            ease: 'power2.out',
        },
    )
}

/**
 * Fade out upward.
 * @param {gsap.TweenTarget} element
 * @param {number} [duration=0.4]
 * @returns {gsap.core.Tween}
 */
export function fadeOut(element, duration = 0.4) {
    return gsap.to(element, {
        opacity: 0,
        y: -20,
        duration,
        ease: 'power2.in',
    })
}

/**
 * Slide in from the left.
 * @param {gsap.TweenTarget} element
 * @param {number} [duration=0.8]
 * @param {number} [delay=0]
 * @returns {gsap.core.Tween}
 */
export function slideInFromLeft(element, duration = 0.8, delay = 0) {
    return gsap.fromTo(
        element,
        { opacity: 0, x: -100 },
        {
            opacity: 1,
            x: 0,
            duration,
            delay,
            ease: 'power3.out',
        },
    )
}

/**
 * Slide in from the right.
 * @param {gsap.TweenTarget} element
 * @param {number} [duration=0.8]
 * @param {number} [delay=0]
 * @returns {gsap.core.Tween}
 */
export function slideInFromRight(element, duration = 0.8, delay = 0) {
    return gsap.fromTo(
        element,
        { opacity: 0, x: 100 },
        {
            opacity: 1,
            x: 0,
            duration,
            delay,
            ease: 'power3.out',
        },
    )
}

/**
 * Scale in with a soft overshoot.
 * @param {gsap.TweenTarget} element
 * @param {number} [duration=0.5]
 * @param {number} [delay=0]
 * @returns {gsap.core.Tween}
 */
export function scaleIn(element, duration = 0.5, delay = 0) {
    return gsap.fromTo(
        element,
        { opacity: 0, scale: 0.8 },
        {
            opacity: 1,
            scale: 1,
            duration,
            delay,
            ease: 'back.out(1.7)',
        },
    )
}

/**
 * Staggered fade / slide-up for a set of elements.
 * @param {gsap.TweenTarget} elements
 * @param {number} [stagger=0.1]
 * @returns {gsap.core.Tween}
 */
export function staggerFadeIn(elements, stagger = 0.1) {
    return gsap.fromTo(
        elements,
        { opacity: 0, y: 30 },
        {
            opacity: 1,
            y: 0,
            duration: 0.6,
            stagger,
            ease: 'power2.out',
        },
    )
}

/**
 * Infinite glow pulse (box-shadow).
 * @param {gsap.TweenTarget} element
 * @returns {gsap.core.Tween}
 */
export function glowPulse(element) {
    return gsap.to(element, {
        boxShadow: '0 0 40px rgba(64, 224, 208, 0.6)',
        duration: 1.5,
        yoyo: true,
        repeat: -1,
        ease: 'sine.inOut',
    })
}

/**
 * Hover in/out timeline for cards (call `play()` / `reverse()`).
 * @param {gsap.TweenTarget} element
 * @returns {gsap.core.Timeline}
 */
export function cardHoverEffect(element) {
    const timeline = gsap.timeline({ paused: true })
    timeline.to(element, {
        scale: 1.02,
        boxShadow: '0 10px 30px rgba(64, 224, 208, 0.3)',
        duration: 0.3,
        ease: 'power2.out',
    })
    return timeline
}

/**
 * Gentle floating motion.
 * @param {gsap.TweenTarget} element
 * @param {number} [amplitude=10]
 * @param {number} [duration=3]
 * @returns {gsap.core.Tween}
 */
export function floatingAnimation(element, amplitude = 10, duration = 3) {
    return gsap.to(element, {
        y: amplitude,
        duration,
        yoyo: true,
        repeat: -1,
        ease: 'sine.inOut',
    })
}

/**
 * Scroll-driven reveal.
 * @param {gsap.TweenTarget} elements
 * @param {Record<string, unknown>} [options={}] ScrollTrigger vars merged with defaults
 * @returns {gsap.core.Tween}
 */
export function scrollReveal(elements, options = {}) {
    const defaults = {
        trigger: elements,
        start: 'top 80%',
        end: 'bottom 20%',
        toggleActions: 'play none none reverse',
    }
    return gsap.fromTo(
        elements,
        { opacity: 0, y: 50 },
        {
            opacity: 1,
            y: 0,
            duration: 0.8,
            ease: 'power2.out',
            scrollTrigger: { ...defaults, ...options },
        },
    )
}

/**
 * Simple vertical parallax tied to scroll.
 * @param {gsap.TweenTarget} element
 * @param {number} [speed=0.5]
 * @returns {gsap.core.Tween}
 */
export function parallaxEffect(element, speed = 0.5) {
    return gsap.to(element, {
        y: () => window.innerHeight * speed,
        ease: 'none',
        scrollTrigger: {
            trigger: element,
            start: 'top bottom',
            end: 'bottom top',
            scrub: true,
        },
    })
}

/**
 * Fade out as the element leaves the viewport (scrubbed).
 * @param {gsap.TweenTarget} element
 * @returns {gsap.core.Tween}
 */
export function fadeOnScroll(element) {
    return gsap.fromTo(
        element,
        { opacity: 1 },
        {
            opacity: 0,
            ease: 'none',
            scrollTrigger: {
                trigger: element,
                start: 'top 90%',
                end: 'top 20%',
                scrub: true,
            },
        },
    )
}

/**
 * Batch reveal for a selector string.
 * @param {gsap.DOMTarget} selector
 * @param {Record<string, unknown>} [options={}]
 */
export function revealOnScroll(selector, options = {}) {
    const elements = gsap.utils.toArray(selector)
    return scrollReveal(elements, options)
}

/**
 * @param {gsap.TimelineVars} [options]
 * @returns {gsap.core.Timeline}
 */
export function createTimeline(options = {}) {
    return gsap.timeline(options)
}

/**
 * @param {...(gsap.core.Timeline | gsap.core.Tween | gsap.core.TimelineLabel | string | number)} animations
 * @returns {gsap.core.Timeline}
 */
export function sequenceAnimations(...animations) {
    const timeline = gsap.timeline()
    animations.forEach((anim) => {
        timeline.add(anim)
    })
    return timeline
}

/** Kill all ScrollTrigger instances (e.g. on route change). */
export function cleanupScrollTriggers() {
    ScrollTrigger.getAll().forEach((trigger) => trigger.kill())
}

/** Named bundle for convenient imports. */
export const animations = {
    fadeIn,
    fadeOut,
    slideInFromLeft,
    slideInFromRight,
    scaleIn,
    staggerFadeIn,
    glowPulse,
    cardHoverEffect,
    floatingAnimation,
    scrollReveal,
    parallaxEffect,
    fadeOnScroll,
    revealOnScroll,
}

export default animations
