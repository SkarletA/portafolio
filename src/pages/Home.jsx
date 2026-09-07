import { About } from '../sections/About'
import { Contact } from '../sections/Contact'
import { Education } from '../sections/Education'
import { Experience } from '../sections/Experience'
import { Hero } from '../sections/Hero'
import { Projects } from '../sections/Projects'
import { Skills } from '../sections/Skills'

export function Home() {
  return (
    <>
      <Hero />
      <About />
      <Experience />
      <Skills />
      <Projects />
      <Education />
      <Contact />
    </>
  )
}
