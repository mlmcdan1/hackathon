import { config, fields, collection } from '@keystatic/core'

// Content edited here is written straight to GitHub as commits — no
// database, no separate CMS server. Pushing a change triggers a normal
// Vercel deploy, same as if someone had hand-edited the JSON file and
// pushed it themselves. See src/lib/eventUtils.ts and
// scripts/generate-events-json.mjs for how these files turn back into the
// single events.json array the site actually reads at build time.
export default config({
  storage: {
    kind: 'github',
    repo: { owner: 'mlmcdan1', name: 'hackathon' },
  },
  ui: {
    brand: { name: 'Augusta Hackathon' },
    navigation: ['events'],
  },
  collections: {
    events: collection({
      label: 'Hackathon Events',
      path: 'src/content/events/*',
      format: { data: 'json' },
      slugField: 'slug',
      columns: ['title', 'startDate', 'published'],
      entryLayout: 'form',
      schema: {
        // This only generates the internal file name — it's not shown on
        // the site. Reuse the event's title here; it doesn't need to
        // match exactly, it just becomes the event's permanent ID.
        slug: fields.slug({
          name: {
            label: 'Event ID',
            description: "Used to generate this event's internal file name. Reuse the title — it doesn't need to match exactly.",
            validation: { isRequired: true },
          },
        }),
        title: fields.text({
          label: 'Title',
          description: 'The event name as shown on the site.',
          validation: { isRequired: true },
        }),
        published: fields.checkbox({
          label: 'Published',
          description: 'Off = saved as a draft, hidden from the live site.',
          defaultValue: false,
        }),
        description: fields.text({
          label: 'Description',
          multiline: true,
          validation: { isRequired: true },
        }),
        category: fields.text({
          label: 'Category',
          description: 'Short label, e.g. "Web Dev", "AI / ML", "Security".',
          validation: { isRequired: true },
        }),
        tag: fields.select({
          label: 'Type',
          options: [
            { label: 'Hackathon', value: 'Hackathon' },
            { label: 'Sprint', value: 'Sprint' },
            { label: 'Summit', value: 'Summit' },
            { label: 'Workshop', value: 'Workshop' },
          ],
          defaultValue: 'Hackathon',
        }),
        color: fields.select({
          label: 'Accent Color',
          description: 'Controls the card color on the events page.',
          options: [
            { label: 'Red', value: 'red' },
            { label: 'Yellow', value: 'yellow' },
            { label: 'Teal', value: 'teal' },
            { label: 'Purple', value: 'purple' },
            { label: 'Orange', value: 'orange' },
            { label: 'Green', value: 'green' },
          ],
          defaultValue: 'teal',
        }),
        location: fields.text({
          label: 'Location',
          description: 'e.g. "Augusta, GA" or "Online".',
          validation: { isRequired: true },
        }),
        format: fields.select({
          label: 'Format',
          options: [
            { label: 'In-Person', value: 'in-person' },
            { label: 'Virtual', value: 'virtual' },
            { label: 'Hybrid', value: 'hybrid' },
          ],
          defaultValue: 'in-person',
        }),
        startDate: fields.date({ label: 'Start Date', validation: { isRequired: true } }),
        endDate: fields.date({ label: 'End Date', validation: { isRequired: true } }),
        startTime: fields.text({
          label: 'Start Time',
          description: '24-hour format, e.g. "09:00".',
          defaultValue: '09:00',
        }),
        endTime: fields.text({
          label: 'End Time',
          description: '24-hour format, e.g. "21:00".',
          defaultValue: '17:00',
        }),
        duration: fields.text({
          label: 'Duration label',
          description: 'Shown as-is on the site, e.g. "36 hrs" or "2 days".',
        }),
        prizePool: fields.text({
          label: 'Prize Pool',
          description: 'Shown as-is, e.g. "$3,000" or "Network".',
        }),
        maxTeams: fields.integer({ label: 'Max Teams', defaultValue: 0 }),
        currentTeams: fields.integer({ label: 'Current Teams', defaultValue: 0 }),
        maxParticipants: fields.integer({ label: 'Max Participants', defaultValue: 0 }),
        currentParticipants: fields.integer({ label: 'Current Participants', defaultValue: 0 }),
        registrationOpen: fields.checkbox({ label: 'Registration Open', defaultValue: false }),
        tags: fields.array(fields.text({ label: 'Tag' }), {
          label: 'Tags',
          description: 'Short keyword chips shown on the event card.',
          itemLabel: (props) => props.value || 'Tag',
        }),
        image: fields.image({
          label: 'Image',
          description: 'Optional. Leave empty to use the default placeholder.',
          directory: 'public/events-images',
          publicPath: '/events-images/',
        }),
      },
    }),
  },
})
