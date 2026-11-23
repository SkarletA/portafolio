import { About } from '@portfolio-sections/About'
import { Contact } from '@portfolio-sections/Contact'
import { Experience } from '@portfolio-sections/Experience'
import { Hero } from '@portfolio-sections/Hero'
import { Projects } from '@portfolio-sections/Projects'

export function Home() {
  return (
    <>
      <Hero />
      <About />
      <Experience />
      <Projects />
      <Contact />
    </>
  )
}
