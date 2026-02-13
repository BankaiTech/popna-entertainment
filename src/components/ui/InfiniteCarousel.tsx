import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InfiniteCarouselProps {
  children: React.ReactNode[];
  className?: string;
  speed?: number; // pixels per second
  pauseOnHover?: boolean;
  showArrows?: boolean;
}

export function InfiniteCarousel({
  children,
  className,
  speed = 30,
  pauseOnHover = true,
  showArrows = true,
}: InfiniteCarouselProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [duplicatedItems, setDuplicatedItems] = useState<React.ReactNode[]>([]);
  const [translateX, setTranslateX] = useState(0);
  const animationRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const [cardWidth, setCardWidth] = useState(0);

  // Duplicate items to create seamless loop
  useEffect(() => {
    if (children.length === 0) return;
    
    // Ensure we have enough items for smooth scrolling
    let itemsToShow = children;
    if (children.length < 5) {
      // Duplicate until we have at least 5 items
      const multiplier = Math.ceil(5 / children.length);
      itemsToShow = Array(multiplier).fill(children).flat();
    }
    
    // Create 3 copies for seamless infinite loop
    const duplicates = [...itemsToShow, ...itemsToShow, ...itemsToShow];
    setDuplicatedItems(duplicates);
  }, [children]);

  // Calculate card width
  useEffect(() => {
    if (!trackRef.current || duplicatedItems.length === 0) return;

    const calculateWidth = () => {
      const firstItem = trackRef.current?.children[0] as HTMLElement;
      if (!firstItem) return;
      
      const itemWidth = firstItem.offsetWidth;
      const gap = 24; // gap-6 = 1.5rem = 24px
      setCardWidth(itemWidth + gap);
    };

    calculateWidth();
    
    const resizeObserver = new ResizeObserver(calculateWidth);
    if (trackRef.current) {
      resizeObserver.observe(trackRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, [duplicatedItems.length]);

  // Carousel control logic fixed — UI only
  // Transform-based animation for smooth infinite scroll with working arrow buttons
  useEffect(() => {
    if (duplicatedItems.length === 0 || cardWidth === 0) return;

    const itemsPerSet = duplicatedItems.length / 3;
    const singleSetWidth = cardWidth * itemsPerSet;

    const animate = (currentTime: number) => {
      if (!lastTimeRef.current) {
        lastTimeRef.current = currentTime;
      }

      const deltaTime = currentTime - lastTimeRef.current;
      lastTimeRef.current = currentTime;

      if (!isPaused) {
        setTranslateX((prev) => {
          const newTranslate = prev - (speed * deltaTime) / 1000;
          
          // Reset when we've scrolled through one complete set
          if (Math.abs(newTranslate) >= singleSetWidth) {
            return newTranslate + singleSetWidth;
          }
          
          return newTranslate;
        });
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [speed, duplicatedItems.length, isPaused, cardWidth]);

  // Carousel control logic fixed — UI only
  // Manual scroll handlers (for arrow buttons) - transform-based
  const scrollLeft = () => {
    if (cardWidth === 0) return;
    setIsPaused(true);
    setTranslateX((prev) => {
      const newTranslate = prev + cardWidth;
      const itemsPerSet = duplicatedItems.length / 3;
      const singleSetWidth = cardWidth * itemsPerSet;
      // Handle loop reset
      if (newTranslate > 0) {
        return newTranslate - singleSetWidth;
      }
      return newTranslate;
    });
    // Resume auto-play after manual interaction
    setTimeout(() => setIsPaused(false), 2000);
  };

  const scrollRight = () => {
    if (cardWidth === 0) return;
    setIsPaused(true);
    setTranslateX((prev) => {
      const newTranslate = prev - cardWidth;
      const itemsPerSet = duplicatedItems.length / 3;
      const singleSetWidth = cardWidth * itemsPerSet;
      // Handle loop reset
      if (Math.abs(newTranslate) >= singleSetWidth) {
        return newTranslate + singleSetWidth;
      }
      return newTranslate;
    });
    // Resume auto-play after manual interaction
    setTimeout(() => setIsPaused(false), 2000);
  };

  // Touch/swipe support for mobile
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
    setIsPaused(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    const swipeDistance = touchStart - touchEnd;
    const minSwipeDistance = 50;
    
    if (Math.abs(swipeDistance) > minSwipeDistance) {
      if (swipeDistance > 0) {
        scrollRight();
      } else {
        scrollLeft();
      }
    }
    
    setTouchStart(0);
    setTouchEnd(0);
    setIsPaused(false);
  };

  if (children.length === 0) return null;

  return (
    <div
      ref={containerRef}
      className={cn('relative w-full overflow-hidden', className)}
      onMouseEnter={() => pauseOnHover && setIsPaused(true)}
      onMouseLeave={() => pauseOnHover && setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Left Arrow - properly bound with pointer-events and z-index */}
      {/* Carousel control logic fixed — UI only */}
      {showArrows && cardWidth > 0 && (
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            scrollLeft();
          }}
          className="absolute left-2 top-1/2 -translate-y-1/2 z-30 w-10 h-10 rounded-full bg-white/90 hover:bg-white shadow-lg flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95 pointer-events-auto cursor-pointer"
          aria-label="Scroll left"
          type="button"
        >
          <ChevronLeft className="w-5 h-5 text-gray-700" />
        </button>
      )}

      {/* Right Arrow - properly bound with pointer-events and z-index */}
      {/* Carousel control logic fixed — UI only */}
      {showArrows && cardWidth > 0 && (
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            scrollRight();
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 z-30 w-10 h-10 rounded-full bg-white/90 hover:bg-white shadow-lg flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95 pointer-events-auto cursor-pointer"
          aria-label="Scroll right"
          type="button"
        >
          <ChevronRight className="w-5 h-5 text-gray-700" />
        </button>
      )}

      <div
        ref={trackRef}
        className="flex gap-6 transition-transform duration-300 ease-out"
        style={{
          width: 'max-content',
          transform: `translateX(${translateX}px)`,
        }}
      >
        {duplicatedItems.map((child, index) => (
          <div key={index} className="flex-shrink-0">
            {child}
          </div>
        ))}
      </div>
    </div>
  );
}
