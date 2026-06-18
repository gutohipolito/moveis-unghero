"use client";

import styles from './WhatsAppButton.module.css';

interface WhatsAppButtonProps {
  message?: string;
}

export default function WhatsAppButton({ message = "Olá! Gostaria de fazer um orçamento de móveis sob medida." }: WhatsAppButtonProps) {
  const encodedMessage = encodeURIComponent(message);
  const whatsappUrl = `https://wa.me/5554999971050?text=${encodedMessage}`;

  return (
    <a 
      href={whatsappUrl} 
      target="_blank" 
      rel="noopener noreferrer" 
      className={styles.wrapper}
      aria-label="Falar pelo WhatsApp com a Móveis Unghero"
    >
      <span className={styles.tooltip}>Fale com a gente no WhatsApp</span>
      <div className={styles.button} aria-hidden="true">
        <div className={styles.pulse}></div>
        <svg 
          viewBox="0 0 24 24" 
          width="32" 
          height="32" 
          fill="currentColor"
          style={{ marginTop: '2px' }}
        >
          <path d="M12.012 2c-5.506 0-9.989 4.478-9.99 9.984a9.96 9.96 0 001.333 4.982L2 22l5.233-1.371a9.994 9.994 0 004.779 1.218h.004c5.506 0 9.99-4.478 9.99-9.986 0-2.669-1.038-5.176-2.925-7.064C17.197 2.909 14.69 1.87 12.012 2zm5.727 14.156c-.244.688-1.22 1.25-1.688 1.332-.468.082-.93.153-2.946-.667-2.584-1.05-4.227-3.666-4.356-3.839-.128-.172-1.04-1.383-1.04-2.637 0-1.254.66-1.87.893-2.114.233-.244.512-.306.68-.306.17 0 .34.002.488.009.153.007.359-.059.562.446.208.517.712 1.737.773 1.861.062.124.103.268.02.434-.082.165-.124.268-.248.413-.124.145-.26.326-.372.438-.124.124-.254.26-.109.51.146.25.648 1.07 1.391 1.734.957.854 1.76 1.118 2.008 1.243.248.124.392.103.537-.062.145-.165.62-.724.786-.972.166-.248.33-.207.558-.124.227.083 1.444.681 1.692.805.247.124.412.186.473.289.062.103.062.6-.182 1.288z"/>
        </svg>
      </div>
    </a>
  );
}
