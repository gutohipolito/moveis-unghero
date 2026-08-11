"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useInView } from "framer-motion";
import { ArrowRight, Check } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import WordsPullUp from "@/components/motion/WordsPullUp";
import WordsPullUpMultiStyle from "@/components/motion/WordsPullUpMultiStyle";
import ScrollRevealText from "@/components/motion/ScrollRevealText";
import { SITE, PROCESS_STEPS, buildContactWhatsAppUrl } from "@/lib/site";
import styles from "./home-cinematic.module.css";

const EASE = [0.16, 1, 0.3, 1] as const;
const EASE_CARD = [0.22, 1, 0.36, 1] as const;

type CaseCard = {
  slug: string;
  title: string;
  cover: string;
  type: string;
};

type Props = {
  cases: CaseCard[];
};

function FeatureCard({
  children,
  index,
  className,
}: {
  children: React.ReactNode;
  index: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, scale: 0.96 }}
      animate={inView ? { opacity: 1, scale: 1 } : undefined}
      transition={{ duration: 0.65, delay: index * 0.1, ease: EASE_CARD }}
    >
      {children}
    </motion.div>
  );
}

export default function HomeCinematic({ cases }: Props) {
  const [reduceMotion, setReduceMotion] = useState(false);
  const videoCase = cases[0];

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduceMotion(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  return (
    <>
      <section className={styles.heroSection}>
        <div className={styles.heroShell}>
          <div className={styles.heroMedia}>
            {!reduceMotion ? (
              <video
                className={styles.heroVideo}
                autoPlay
                muted
                loop
                playsInline
                preload="metadata"
                poster="/images/factory-bg.png"
              >
                <source src="/videos/parceiro-login-bg.mp4" type="video/mp4" />
              </video>
            ) : (
              <div
                className={styles.heroVideoStatic}
                style={{ backgroundImage: "url(/images/factory-bg.png)" }}
              />
            )}
            <div className={styles.heroOverlay} aria-hidden />
          </div>

          <div className={styles.heroContent}>
            <div className={styles.heroGrid}>
              <div className={styles.heroTitleCol}>
                <h1 className={styles.srOnly}>Móveis sob medida</h1>
                <WordsPullUp
                  text="Medida"
                  showAsterisk
                  className={styles.giantTitle}
                  style={{ color: "#E1E0CC" }}
                />
              </div>

              <div className={styles.heroSide}>
                <motion.p
                  className={styles.heroDesc}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.9, delay: 0.45, ease: EASE }}
                >
                  Marcenaria sob medida em Farroupilha. Residências e empresas inteiras — uma
                  linguagem do primeiro ao último ambiente.
                </motion.p>

                <motion.a
                  href={buildContactWhatsAppUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.cta}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.9, delay: 0.65, ease: EASE }}
                >
                  <span>Conversar sobre o projeto</span>
                  <span className={styles.ctaIcon}>
                    <ArrowRight size={16} color="#E1E0CC" />
                  </span>
                </motion.a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.about}>
        <div className={styles.aboutCard}>
          <p className={styles.aboutLabel}>Marcenaria sob medida</p>
          <WordsPullUpMultiStyle
            className={styles.aboutHeading}
            segments={[
              { text: "Não fazemos o cômodo pingado.", className: styles.segNormal },
              {
                text: "Fazemos a casa — ou o espaço — como um sistema.",
                className: styles.segItalic,
              },
            ]}
          />
          <ScrollRevealText text={SITE.manifesto} className={styles.aboutBody} />
        </div>
      </section>

      <section className={styles.features}>
        <div className={styles.featuresInner}>
          <WordsPullUpMultiStyle
            className={styles.featuresHead}
            segments={[
              {
                text: "Fluxo de ateliê para quem exige continuidade.",
                style: { color: "#E1E0CC" },
              },
              {
                text: "Projetos integrais. Ofício em Farroupilha.",
                style: { color: "#6b7280" },
              },
            ]}
          />

          <div className={styles.featureGrid}>
            <FeatureCard index={0} className={`${styles.featureCard} ${styles.featureVideo}`}>
              {videoCase ? (
                <Link href={`/projetos/${videoCase.slug}`} className={styles.featureVideoLink}>
                  <Image src={videoCase.cover} alt={videoCase.title} fill sizes="25vw" />
                  <span className={styles.featureVideoLabel}>Residência completa.</span>
                </Link>
              ) : null}
            </FeatureCard>

            {PROCESS_STEPS.slice(0, 3).map((step, i) => (
              <FeatureCard
                key={step.title}
                index={i + 1}
                className={`${styles.featureCard} ${styles.featureSolid}`}
              >
                <p className={styles.featureIndex}>{String(i + 1).padStart(2, "0")}</p>
                <h3 className={styles.featureTitle}>{step.title}</h3>
                <ul className={styles.featureList}>
                  <li>
                    <Check size={14} className={styles.check} />
                    <span>{step.text}</span>
                  </li>
                </ul>
                <Link href="/processo" className={styles.learnMore}>
                  Ver processo
                  <ArrowRight size={14} style={{ transform: "rotate(-45deg)" }} />
                </Link>
              </FeatureCard>
            ))}
          </div>

          <div className={styles.projectStrip}>
            {cases.slice(0, 3).map((item, i) => (
              <FeatureCard key={item.slug} index={i} className={styles.stripCard}>
                <Link href={`/projetos/${item.slug}`} className={styles.stripLink}>
                  <Image src={item.cover} alt={item.title} fill sizes="33vw" />
                  <span>
                    {item.type === "corporativo" ? "Corporativo" : "Residencial"} · {item.title}
                  </span>
                </Link>
              </FeatureCard>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
