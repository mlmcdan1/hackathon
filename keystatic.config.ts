import { config, fields, collection } from '@keystatic/core'

// Local-mode Keystatic: the admin UI writes straight to the files on disk,
// no GitHub OAuth, no server, no database. Run it with `npx vercel dev`
// (needed so api/keystatic/[...params].ts is served) and open
// http://localhost:3000/keystatic, edit, then commit/push the changed
// files yourself like any other local edit. It does nothing useful on the
// deployed site — there's no persistent filesystem to write to there — so
// this is a local-only editing tool, not a live admin panel.
// See src/lib/eventUtils.ts and scripts/generate-events-json.mjs for how
// these files turn back into the single events.json array the site reads.
export default config({
  storage: {
    kind: 'local',
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
        title: fields.text({
          label: 'Event Name',
          description: 'What people will see as the event’s name, e.g. "Mobile App Blitz".',
          validation: { isRequired: true },
        }),
        // Auto-fills from the name above as you type. It only becomes a
        // behind-the-scenes file name — nothing about it shows on the site.
        slug: fields.slug({
          name: {
            label: 'Internal ID',
            description: "Fills in automatically from the name above — it's just used internally, no need to touch it.",
            validation: { isRequired: true },
          },
        }),
        description: fields.text({
          label: 'Description',
          description: 'A sentence or two about the event, shown on its card and detail page.',
          multiline: true,
          validation: { isRequired: true },
        }),
        published: fields.checkbox({
          label: 'Visible on the website',
          description: "Turn this on when you're ready for people to see it. Leave it off while you're still setting things up.",
          defaultValue: false,
        }),
        category: fields.text({
          label: 'Category',
          description: 'A short label people will see, like "Web Dev", "AI / ML", or "Security".',
          validation: { isRequired: true },
        }),
        tag: fields.select({
          label: 'Event Type',
          description: 'What kind of event this is — shown as a small badge on the card.',
          options: [
            { label: 'Hackathon', value: 'Hackathon' },
            { label: 'Sprint', value: 'Sprint' },
            { label: 'Summit', value: 'Summit' },
            { label: 'Workshop', value: 'Workshop' },
          ],
          defaultValue: 'Hackathon',
        }),
        location: fields.text({
          label: 'Location',
          description: 'Where it’s happening, e.g. "Augusta, GA" or "Online".',
          validation: { isRequired: true },
        }),
        format: fields.select({
          label: 'How people attend',
          description: 'Will people show up in person, join online, or both?',
          options: [
            { label: 'In-Person', value: 'in-person' },
            { label: 'Virtual', value: 'virtual' },
            { label: 'Hybrid', value: 'hybrid' },
          ],
          defaultValue: 'in-person',
        }),
        color: fields.select({
          label: 'Card Color',
          description: 'Just changes the color of the event’s card — pick whichever looks good.',
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
        startDate: fields.date({
          label: 'Start Date',
          description: 'The day the event begins.',
          validation: { isRequired: true },
        }),
        endDate: fields.date({
          label: 'End Date',
          description: 'The day it wraps up — same as the start date for a one-day event.',
          validation: { isRequired: true },
        }),
        startTime: fields.text({
          label: 'Start Time',
          description: 'Uses a 24-hour clock: 9:00 AM is "09:00", 5:00 PM is "17:00".',
          defaultValue: '09:00',
        }),
        endTime: fields.text({
          label: 'End Time',
          description: 'Same 24-hour format as above.',
          defaultValue: '17:00',
        }),
        duration: fields.text({
          label: 'Duration',
          description: 'How long it runs, written out plainly, e.g. "36 hrs" or "2 days".',
        }),
        prizePool: fields.text({
          label: 'Prize Pool',
          description: 'What’s up for grabs, e.g. "$3,000" or "Network" if there’s no cash prize.',
        }),
        maxTeams: fields.integer({
          label: 'Team Limit',
          description: 'The most teams you’ll allow. Use 0 if you’re not tracking teams.',
          defaultValue: 0,
        }),
        currentTeams: fields.integer({
          label: 'Teams Signed Up',
          description: 'How many teams have registered so far — update this as people sign up.',
          defaultValue: 0,
        }),
        maxParticipants: fields.integer({
          label: 'Participant Limit',
          description: 'The most people you’ll allow to attend.',
          defaultValue: 0,
        }),
        currentParticipants: fields.integer({
          label: 'People Signed Up',
          description: 'How many people have registered so far.',
          defaultValue: 0,
        }),
        registrationOpen: fields.checkbox({
          label: 'Registration Open',
          description: 'Turn this on to let people sign up, and off once registration closes.',
          defaultValue: false,
        }),
        tags: fields.array(fields.text({ label: 'Keyword' }), {
          label: 'Keywords',
          description: 'Short words shown as little chips on the card, like "React" or "Beginner Friendly".',
          itemLabel: (props) => props.value || 'Keyword',
        }),
        image: fields.image({
          label: 'Cover Image',
          description: 'Optional — leave this empty to use the default picture.',
          directory: 'public/events-images',
          publicPath: '/events-images/',
        }),
      },
    }),
  },
})
