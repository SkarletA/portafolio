import { About } from '@portfolio-sections/About'
import { Contact } from '@portfolio-sections/Contact'
import { ContinuingEducation } from '@portfolio-sections/ContinuingEducation'
import { Experience } from '@portfolio-sections/Experience'
import { Hero } from '@portfolio-sections/Hero'
import { LabAnalogies } from '@portfolio-sections/LabAnalogies'
import { Laboratoria } from '@portfolio-sections/Laboratoria'
import { PeriodicTable } from '@portfolio-sections/PeriodicTable'
import { Projects } from '@portfolio-sections/Projects'

export function Home() {
  return (
    <>
      <Hero />
      <LabAnalogies />
      <Laboratoria />
      <ContinuingEducation />
      <About />
      <Experience />
      <Projects />
      <PeriodicTable />
      <Contact />
    </>
  )
}
