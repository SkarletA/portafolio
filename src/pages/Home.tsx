import { About } from '@portfolio-sections/About'
import { Contact } from '@portfolio-sections/Contact'
import { Education } from '@portfolio-sections/Education'
import { Experience } from '@portfolio-sections/Experience'
import { Hero } from '@portfolio-sections/Hero'
import { Projects } from '@portfolio-sections/Projects'
import { Skills } from '@portfolio-sections/Skills'

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
