import { Trans } from 'react-i18next'
import { profile } from '@portfolio-data/profile'
import s from './Contact.module.css'

export function Contact() {
  return (
    <section id="contacto" className={s.section}>
      <div className={s.inner}>
        <h2 className={s.heading} data-testid="contact-heading">
          <Trans i18nKey="heading" ns="contact" components={{ em: <em className={s.highlight} /> }} />
        </h2>
        <div className={s.links}>
          <a className={s.linkPrimary} href={`mailto:${profile.email}`} data-testid="contact-email-link">
            {profile.email}
          </a>
          <a
            className={s.linkSecondary}
            href={profile.linkedin}
            target="_blank"
            rel="noreferrer"
            data-testid="contact-linkedin-link"
          >
            LinkedIn
          </a>
          <a
            className={s.linkSecondary}
            href={profile.github}
            target="_blank"
            rel="noreferrer"
            data-testid="contact-github-link"
          >
            GitHub
          </a>
        </div>
      </div>
    </section>
  )
}
