// Runs once in the main process, before the test workers start. A worker takes
// its time zone from the process when it is created, so setting process.env.TZ
// inside a test file has no effect. The suite runs in the product's zone
// (Mexico City, ADR-013) so local-date tests give the same result on every
// machine, including CI runners in UTC.
export default function setTestTimeZone() {
  process.env.TZ = 'America/Mexico_City'
}
