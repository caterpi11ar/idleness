import type { ReactNode } from 'react'
import Link from '@docusaurus/Link'
import useDocusaurusContext from '@docusaurus/useDocusaurusContext'
import Layout from '@theme/Layout'
import styles from './index.module.css'

function HomepageHeader() {
  const { siteConfig } = useDocusaurusContext()
  return (
    <header className={styles.heroBanner}>
      <div className="container">
        <h1 className="hero__title">{siteConfig.title}</h1>
        <p className="hero__subtitle">{siteConfig.tagline}</p>
        <div className={styles.buttons}>
          <Link
            className="button button--secondary button--lg"
            to="/docs/getting-started"
          >
            Get Started
          </Link>
        </div>
      </div>
    </header>
  )
}

function Feature({ title, description }: { title: string, description: string }) {
  return (
    <div className="col col--4">
      <div className="text--center padding-horiz--md padding-vert--lg">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
    </div>
  )
}

const features = [
  {
    title: 'Layered Configuration',
    description: 'Multiple config sources — defaults, config files, environment variables, and overrides — merged with clear precedence rules.',
  },
  {
    title: 'Zod Validation',
    description: 'Optional Zod schema validation ensures your configuration is type-safe at both compile time and runtime.',
  },
  {
    title: 'Simple & Familiar',
    description: 'Inspired by Go\'s Viper library. Dot-notation key access, case-insensitive keys, and a straightforward API.',
  },
]

export default function Home(): ReactNode {
  return (
    <Layout description="Minimal Viper-inspired configuration library for TypeScript">
      <HomepageHeader />
      <main>
        <section className={styles.features}>
          <div className="container">
            <div className="row">
              {features.map(f => (
                <Feature key={f.title} {...f} />
              ))}
            </div>
          </div>
        </section>
      </main>
    </Layout>
  )
}
