import { Contact } from '@portfolio-sections/Contact'
import { ContinuingEducation } from '@portfolio-sections/ContinuingEducation'
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
      <Projects />
      <PeriodicTable />
      <Contact />
    </>
  )
}
