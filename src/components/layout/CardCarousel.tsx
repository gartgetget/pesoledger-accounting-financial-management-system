import React, { Children, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export const CardCarousel: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const cards = Children.toArray(children);
  const sliderRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const slider = sliderRef.current;
    if (!slider) return;

    const updateActiveIndex = () => {
      const slides = Array.from(slider.children) as HTMLElement[];
      const current = slides.reduce((closest, slide, index) => (
        Math.abs(slide.offsetLeft - slider.scrollLeft) <
        Math.abs(slides[closest].offsetLeft - slider.scrollLeft)
          ? index
          : closest
      ), 0);
      setActiveIndex(current);
    };

    slider.addEventListener('scroll', updateActiveIndex, { passive: true });
    updateActiveIndex();
    return () => slider.removeEventListener('scroll', updateActiveIndex);
  }, [cards.length]);

  const goTo = (index: number) => {
    const slider = sliderRef.current;
    const slide = slider?.children[index] as HTMLElement | undefined;
    if (slider && slide) slider.scrollTo({ left: slide.offsetLeft, behavior: 'smooth' });
  };

  if (cards.length === 0) return null;

  return (
    <div>
      <div
        ref={sliderRef}
        className="relative flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth px-4 pt-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        aria-label="Card slider"
      >
        {cards.map((card, index) => (
          <div
            key={index}
            className="w-[76%] shrink-0 snap-start sm:w-[31%] xl:w-[23%]"
          >
            {card}
          </div>
        ))}
      </div>

      {cards.length > 1 && (
        <div className="flex items-center justify-center gap-3 px-4 pb-4 pt-3">
          <button
            type="button"
            onClick={() => goTo(Math.max(0, activeIndex - 1))}
            disabled={activeIndex === 0}
            className="flex h-7 w-7 items-center justify-center rounded-full text-blue-700 transition-colors hover:bg-blue-50 disabled:cursor-default disabled:opacity-30"
            aria-label="Previous card"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-1.5" aria-label={`Card ${activeIndex + 1} of ${cards.length}`}>
            {cards.map((_, index) => (
              <button
                key={index}
                type="button"
                onClick={() => goTo(index)}
                className={`h-1.5 rounded-full transition-all ${
                  activeIndex === index ? 'w-5 bg-blue-600' : 'w-1.5 bg-slate-300 hover:bg-blue-300'
                }`}
                aria-label={`Go to card ${index + 1}`}
                aria-current={activeIndex === index ? 'true' : undefined}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={() => goTo(Math.min(cards.length - 1, activeIndex + 1))}
            disabled={activeIndex === cards.length - 1}
            className="flex h-7 w-7 items-center justify-center rounded-full text-blue-700 transition-colors hover:bg-blue-50 disabled:cursor-default disabled:opacity-30"
            aria-label="Next card"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
};
