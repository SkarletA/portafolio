import { profile } from '../data/profile'

const contacts = [
  { href: `mailto:${profile.email}`, label: profile.email },
  { href: `tel:${profile.phone.replace(/\s/g, '')}`, label: profile.phone },
  { href: profile.linkedin, label: 'LinkedIn' },
  { href: profile.github, label: 'GitHub' },
]

export function Contact() {
  return (
    <section id="contact" className="border-t border-paper/10">
      <div className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="mb-6 font-display text-3xl text-paper md:text-4xl">
          Contact
        </h2>
        <p className="max-w-xl text-lg text-paper-muted">
          Open to professional opportunities, collaborations, and technical
          discussions. Remote or hybrid; occasional in-office presence if
          required.
        </p>
        <ul className="mt-8 flex flex-wrap gap-x-8 gap-y-3 text-paper">
          {contacts.map((item) => (
            <li key={item.href}>
              <a
                className="underline decoration-ember/60 underline-offset-4 transition-colors hover:text-ember"
                href={item.href}
                {...(item.href.startsWith('http')
                  ? { target: '_blank', rel: 'noreferrer' }
                  : {})}
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
