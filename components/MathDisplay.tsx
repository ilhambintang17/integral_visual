import React, { useEffect, useRef } from 'react';

interface Props {
  latex: string;
  className?: string;
  inline?: boolean;
}

declare global {
  interface Window {
    MathJax: any;
  }
}

const MathDisplay: React.FC<Props> = ({ latex, className, inline = false }) => {
  const nodeRef = useRef<HTMLDivElement>(null);
  const spanRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = inline ? spanRef.current : nodeRef.current;
    if (window.MathJax && el) {
      // Wrap in appropriate delimiters
      const formattedLatex = inline 
        ? `\\( ${latex} \\)` 
        : latex.startsWith('$$') ? latex : `$$ ${latex} $$`;
        
      el.innerHTML = formattedLatex;
      window.MathJax.typesetPromise([el]).catch((err: any) => console.error(err));
    }
  }, [latex, inline]);

  if (inline) {
    return <span ref={spanRef} className={`${className} inline-block`} style={{ minHeight: '1em' }} />;
  }

  return <div ref={nodeRef} className={className} />;
};

export default MathDisplay;