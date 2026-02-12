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
    
    // Create 2 copies for seamless infinite loop
    const duplicates = [...itemsToShow, ...itemsToShow];
    setDuplicatedItems(duplicates);
  }, [children]);

  useEffect(() => {
    if (!trackRef.current || duplicatedItems.length === 0) return;

    const track = trackRef.current;
    
    const calculateWidth = () => {
      const firstItem = track.children[0] as HTMLElement;
      if (!firstItem) return;
      
      const itemWidth = firstItem.offsetWidth;
      const gap = 24; // gap-6 = 1.5rem = 24px
      const itemsPerSet = duplicatedItems.length / 2;
      const singleSetWidth = (itemWidth + gap) * itemsPerSet;
      
      // Calculate animation duration based on speed
      const duration = (singleSetWidth / speed) * 1000; // Convert to milliseconds
      
      // Set CSS custom properties for animation
      track.style.setProperty('--carousel-width', `${singleSetWidth}px`);
      track.style.setProperty('--carousel-duration', `${duration}ms`);
    };

    // Calculate on mount and resize
    calculateWidth();
    
    const resizeObserver = new ResizeObserver(calculateWidth);
    resizeObserver.observe(track);

    if (isPaused) {
      track.style.animationPlayState = 'paused';
    } else {
      track.style.animationPlayState = 'running';
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, [speed, duplicatedItems.length, isPaused]);

  // Manual scroll handlers (for arrow buttons)
  const scrollLeft = () => {
    if (!trackRef.current) return;
    const itemWidth = (trackRef.current.children[0] as HTMLElement)?.offsetWidth || 300;
    const gap = 24;
    trackRef.current.scrollBy({ left: -(itemWidth + gap) * 3, behavior: 'smooth' });
  };

  const scrollRight = () => {
    if (!trackRef.current) return;
    const itemWidth = (trackRef.current.children[0] as HTMLElement)?.offsetWidth || 300;
    const gap = 24;
    trackRef.current.scrollBy({ left: (itemWidth + gap) * 3, behavior: 'smooth' });
  };

  // Touch/swipe support for mobile
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!trackRef.current) return;
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
      {/* Left Arrow */}
      {showArrows && (
        <button
          onClick={scrollLeft}
          className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white/90 hover:bg-white shadow-lg flex items-center justify-center transition-all duration-200"
          aria-label="Scroll left"
        >
          <ChevronLeft className="w-5 h-5 text-gray-700" />
        </button>
      )}

      {/* Right Arrow */}
      {showArrows && (
        <button
          onClick={scrollRight}
          className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white/90 hover:bg-white shadow-lg flex items-center justify-center transition-all duration-200"
          aria-label="Scroll right"
        >
          <ChevronRight className="w-5 h-5 text-gray-700" />
        </button>
      )}

      <div
        ref={trackRef}
        className="flex gap-6 animate-infinite-scroll"
        style={{
          width: 'max-content',
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
