import { profile } from '@portfolio-data/profile'
import s from './Contact.module.css'

interface ContactLink {
  href: string
  label: string
  testId: string
}

const contacts: ContactLink[] = [
  { href: `mailto:${profile.email}`, label: profile.email, testId: 'contact-email-link' },
  { href: `tel:${profile.phone.replace(/\s/g, '')}`, label: profile.phone, testId: 'contact-phone-link' },
  { href: profile.linkedin, label: 'LinkedIn', testId: 'contact-linkedin-link' },
  { href: profile.github, label: 'GitHub', testId: 'contact-github-link' },
]

export function Contact() {
  return (
    <section id="contact" className={s.section}>
      <div className={s.inner}>
        <h2 className={s.title}>Contact</h2>
        <p className={s.description}>
          Open to professional opportunities, collaborations, and technical discussions. Remote or hybrid;
          occasional in-office presence if required.
        </p>
        <ul className={s.list}>
          {contacts.map((item) => (
            <li key={item.href}>
              <a
                className={s.link}
                href={item.href}
                data-testid={item.testId}
                {...(item.href.startsWith('http') ? { target: '_blank', rel: 'noreferrer' } : {})}
              >
                {item.label}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
