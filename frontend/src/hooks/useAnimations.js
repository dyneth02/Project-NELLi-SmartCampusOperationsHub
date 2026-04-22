import {
  useCallback,
  useEffect,
  useRef,
} from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

/**
 * GSAP context wrapper with automatic revert on unmount.
 * @param {() => void} callback Runs inside `gsap.context` — create timelines / tweens here.
 * @param {import('react').DependencyList} [dependencies=[]]
 * @returns {{ contextRef: React.MutableRefObject<import('gsap').Context | null> }}
 */
export function useGSAP(callback, dependencies = []) {
  const contextRef = useRef(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      callback()
    })
    contextRef.current = ctx
    return () => {
      ctx.revert()
      contextRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- caller controls deps array
  }, dependencies)

  return { contextRef }
}

/**
 * Premium Fade-in with a smooth blur-to-focus effect.
 * Pass `ref` in options to drive an existing element ref.
 * @param {object} [options]
 * @param {React.RefObject<HTMLElement | null>} [options.ref]
 * @param {number} [options.duration]
 * @param {number} [options.delay]
 * @param {number} [options.y]
 */
export function useFadeIn(options = {}) {
  const {
    ref: externalRef,
    duration = 1.2, // Longer duration for a more cinematic fade
    delay = 0,
    y = 15,
  } = options

  const internalRef = useRef(null)
  const elementRef = externalRef ?? internalRef
  const tweenRef = useRef(null)

  useEffect(() => {
    const el = elementRef.current
    if (!el) return

    tweenRef.current = gsap.fromTo(
        el,
        {
          opacity: 0,
          y,
          filter: 'blur(12px)', // Starts blurred (simulates assembling/loading)
          scale: 0.98
        },
        {
          opacity: 1,
          y: 0,
          filter: 'blur(0px)',
          scale: 1,
          duration,
          delay,
          ease: 'power3.out', // Silkier ease
        },
    )

    return () => {
      tweenRef.current?.kill()
      tweenRef.current = null
    }
  }, [elementRef, duration, delay, y])

  const play = useCallback(() => tweenRef.current?.play(), [])
  const pause = useCallback(() => tweenRef.current?.pause(), [])
  const reverse = useCallback(() => tweenRef.current?.reverse(), [])
  const restart = useCallback(() => tweenRef.current?.restart(), [])

  return { ref: elementRef, play, pause, reverse, restart }
}

/**
 * Scroll-triggered smooth reveal; kills ScrollTrigger on unmount.
 * @param {object} [options]
 * @param {React.RefObject<HTMLElement | null>} [options.ref]
 */
export function useScrollReveal(options = {}) {
  const {
    ref: externalRef,
    start = 'top 85%',
    end = 'bottom 20%',
    toggleActions = 'play none none reverse',
    scrub = false,
    ...animationOptions
  } = options

  const internalRef = useRef(null)
  const elementRef = externalRef ?? internalRef
  const scrollTriggerRef = useRef(null)

  useEffect(() => {
    const el = elementRef.current
    if (!el) return

    const animation = gsap.fromTo(
        el,
        {
          opacity: 0,
          y: 40,
          filter: 'blur(8px)'
        },
        {
          opacity: 1,
          y: 0,
          filter: 'blur(0px)',
          duration: 1,
          ease: 'power3.out',
          ...animationOptions,
          scrollTrigger: {
            trigger: el,
            start,
            end,
            toggleActions,
            scrub,
          },
        },
    )

    scrollTriggerRef.current = animation.scrollTrigger ?? null

    return () => {
      scrollTriggerRef.current?.kill()
      animation.scrollTrigger?.kill()
      animation.kill()
      scrollTriggerRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elementRef, start, end, toggleActions, scrub])

  return { ref: elementRef, scrollTriggerRef }
}

/**
 * Smooth glowing hover timeline — play on enter, reverse on leave.
 * @returns {{ ref: React.RefObject<HTMLElement | null>, timeline: React.MutableRefObject<gsap.core.Timeline | null> }}
 */
export function useHoverAnimation() {
  const elementRef = useRef(null)
  const timelineRef = useRef(null)

  useEffect(() => {
    const el = elementRef.current
    if (!el) return

    const tl = gsap.timeline({ paused: true })
    tl.to(el, {
      scale: 1.02, // Less aggressive scale
      boxShadow: '0 15px 40px rgba(0, 0, 0, 0.1)', // Softer shadow
      duration: 0.4,
      ease: 'power2.out',
    })
    timelineRef.current = tl

    const onEnter = () => tl.play()
    const onLeave = () => tl.reverse()

    el.addEventListener('mouseenter', onEnter)
    el.addEventListener('mouseleave', onLeave)

    return () => {
      el.removeEventListener('mouseenter', onEnter)
      el.removeEventListener('mouseleave', onLeave)
      tl.kill()
      timelineRef.current = null
    }
  }, [])

  return { ref: elementRef, timeline: timelineRef }
}

/**
 * REPLACES useStaggerAnimation.
 * All items materialize simultaneously from a dispersed/blurred state without any staggering delays.
 * @param {number} count Expected number of elements (drives re-run when list length changes).
 * @param {object} [options]
 */
export function useGroupMaterialize(count, options = {}) {
  const {
    duration = 1.2,
    delay = 0,
  } = options

  const refs = useRef([])
  const timelineRef = useRef(null)

  // Keeps the exact same implementation signature so your components don't break
  const setRef = useCallback((index) => (el) => {
    refs.current[index] = el
  }, [])

  useEffect(() => {
    const elements = refs.current.filter(Boolean)
    if (elements.length === 0) return

    timelineRef.current = gsap.fromTo(
        elements,
        {
          opacity: 0,
          scale: 0.95,
          filter: 'blur(15px)', // High initial blur for the "disintegrated" look
        },
        {
          opacity: 1,
          scale: 1,
          filter: 'blur(0px)',
          duration,
          delay,
          ease: 'expo.out', // Extremely fast start that smoothly settles into place
        },
    )

    return () => {
      timelineRef.current?.kill()
      timelineRef.current = null
    }
  }, [count, duration, delay])

  const play = useCallback(() => timelineRef.current?.play(), [])
  const pause = useCallback(() => timelineRef.current?.pause(), [])
  const restart = useCallback(() => timelineRef.current?.restart(), [])

  return {
    setRef,
    /** @type {React.MutableRefObject<(HTMLElement | null)[]>} */
    refs,
    play,
    pause,
    restart,
  }
}

/**
 * Vertical parallax tied to scroll.
 * @param {number} [speed=0.5]
 */
export function useParallax(speed = 0.5) {
  const elementRef = useRef(null)

  useEffect(() => {
    const el = elementRef.current
    if (!el) return

    const animation = gsap.to(el, {
      y: () => window.innerHeight * speed,
      ease: 'none',
      scrollTrigger: {
        trigger: el,
        start: 'top bottom',
        end: 'bottom top',
        scrub: true,
      },
    })

    return () => {
      animation.scrollTrigger?.kill()
      animation.kill()
    }
  }, [speed])

  return elementRef
}