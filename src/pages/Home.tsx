import { About } from '@portfolio-sections/About'
import { Contact } from '@portfolio-sections/Contact'
import { Experience } from '@portfolio-sections/Experience'
import { Hero } from '@portfolio-sections/Hero'
import { LabAnalogies } from '@portfolio-sections/LabAnalogies'
import { Projects } from '@portfolio-sections/Projects'

export function Home() {
  return (
    <>
      <Hero />
      <LabAnalogies />
      <About />
      <Experience />
      <Projects />
      <Contact />
    </>
  )
}
