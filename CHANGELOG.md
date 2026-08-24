# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Android, in progress** — ReptiKeep now runs on Android. It is built in
  the platform's own vocabulary rather than ported from the iPhone: a top
  app bar that collapses as you scroll, a floating add button, Material
  list rows, and the system back gesture. The warm palette, the slab-serif
  names and the monospaced numbers are the same on both phones.
- The **Reptiles tab is the only screen finished so far**. Reminders,
  Settings, a reptile's detail screen and every form say so plainly instead
  of showing an empty page. There is no way to add a reptile on Android
  yet, so treat this as a preview rather than a second home for your
  collection — iPhone remains the complete app.
- Reminder notifications on Android arrive under their own **"Care
  reminders"** channel, so you can change their sound, importance or mute
  them from Android's notification settings without silencing anything else.
- An Android app icon, including the monochrome version Android 13 and
  later use when you turn on themed icons.

### Changed

- Nothing changes on iPhone. The iOS screens were moved so the two
  platforms can sit side by side, but they look and behave exactly as they
  did in 0.4.0.
- Android will not copy app data into Google's automatic cloud backup.
  Your records stay on the device and in the backup files you export
  yourself.

## [0.4.0] - 2026-08-19

### Added

- **Enclosure cleaning** — habitat records now track a cleaning separately
  from a water change, so a round where you do both is still one record.
  Log it under the reptile's ＋ menu → Habitat, where "Water changed" and
  "Enclosure cleaned" are independent switches.
- Enclosure cleaning schedule, with its own reminders. Set one cadence for
  the whole collection under Settings → Enclosure cleaning schedule, or give
  a reptile its own in its profile. Off until you turn it on.
- "Last clean" on the reptile's detail screen, beside the last water change,
  and a "Cleaning overdue" badge on the Reptiles list next to the feeding
  and water ones.
- **Medical records** — log vet visits, care and treatment with a required
  summary, optional notes and the date and time they happened. Medical records
  appear in the reptile's activity timeline but never create reminders.
- Attach multiple PDFs or photos to a medical record. Linked files also appear
  under the reptile's Documents area as medical documents, can be previewed and
  edited there, and are removed with the medical record after confirmation.
- **Filter the timeline by type** — a row of chips above a reptile's activity,
  one for each kind of record that reptile actually has. Tap Feed to see only
  feedings, tap it again or All for everything. "See all" keeps the filter and
  opens the full history for just that type.
- **Filter the full activity history** — the Activities screen now carries the
  same type chips as the reptile's detail screen, and a date range in its
  toolbar: the last 7 days, 30 days, 3 months or year, or a custom From/To
  range you pick yourself. An active range sits above the list with the number
  of records inside it, and Clear puts everything back.
- Log a record without leaving the Activities screen — the ＋ in its toolbar
  opens the same record picker as the reptile's detail screen, and what you
  save appears in the list you were already reading.
- **Weight trend chart** — a reptile's detail screen now plots its last eight
  weigh-ins, dated along the bottom, with the change since the first of them
  at the top. It appears once there are two weigh-ins to compare, and says
  "last 8" when the reptile has more history than the chart shows.

### Changed

- The Reminders tab lists one row per routine, so a reptile that needs both
  fresh water and a clean enclosure appears twice, each with its own icon,
  due date and done button. Marking one done leaves the other alone, and
  muting one routine keeps the other.
- Tapping a reminder opens the habitat form already set to that routine, so
  saving logs the work you were reminded about.
- The day's notification covers both routines in one message, a line each.
- A routine that has never been logged now counts as overdue from the day
  you added the reptile, so the Reptiles list, the reptile's detail screen
  and the Reminders tab always agree on what is due.
- Habitat records logged before this update say nothing either way about
  cleaning, so their detail screen leaves that line out rather than claiming
  the enclosure was not cleaned.
- Backups are now schema version 4 to include medical records and their linked
  documents. Backups from schema versions 1–3 still restore as before, but a
  backup made now will not restore on 0.3.0 or older.
- Habitat records are now moss green wherever they appear — the timeline,
  the record picker and the reminder rows.
- A reptile's detail screen shows the 20 most recent records instead of 8, so
  a weekly feeder sees months of history before reaching "See all".
- The Reptiles tab scrolls and switches between single-column, grid and list
  views without the lag and freezes that large collections caused before.
- Arriving at the full history from "See all" no longer renames the screen
  after the record type. The title stays "Activities" and the type shows as a
  selected chip, so you can widen or change the filter without going back.
- Settings was reorganized: language and a shortcut to Backup & restore now
  share a General section, the reminder time sits near the top, and the
  Advanced settings section is gone. "Reset app data" moved to the
  Backup & restore screen, under its own advanced options.

### Fixed

- A reptile with a water change schedule and nothing logged yet showed up as
  overdue on the Reminders tab while its card and detail screen said only
  "No water change logged". All three now agree.
- At larger text sizes the icon on an overdue badge ran into the first
  character of its label, so "16 days overdue" read as "6 days overdue".
  The icon now grows with the text instead of staying a fixed width.
- A backup from a large collection refused to restore, reporting that the
  archive exceeded safety limits. Your records now get their own size
  ceiling, separate from the one that guards individual attachments.
- The confirmation shown before restoring left medical records out of its
  record count, so a backup looked smaller than it was. The restore itself
  was never affected.
- Tapping the circle on a Reminders row to mark a routine done left the row
  in place until you left the screen and came back. The Reminders tab, the
  Reptiles list and the detail screens now update the moment you mark
  something done.

## [0.3.0] - 2026-08-06

### Added

- Documents: keep invoices, certificates of authenticity, origin papers
  and permits with the reptile they belong to. Attach a PDF or a photo from
  Files, your photo library or the camera, give it a title, type and issue
  date, and find it later under the reptile's ⋯ menu → Documents.
- Document preview: open an attachment in the app, zoom into a scanned
  page, flip through a multi-page PDF, and share it out through the usual
  share sheet.
- Documents in backups: exports now carry your attachments alongside
  reptiles, records and photos. Backups made by earlier versions still
  restore as before.

### Fixed

- Changing the photo of a reptile that already had one failed to save. The
  new photo now replaces the old one.

## [0.2.0] - 2026-08-05

### Added

- **Backup and restore** — export your whole collection (reptiles, activity
  records, schedules, settings and photos) to a single file you can save or
  share, and import it back on the same or another device. Restoring replaces
  the data currently on the device. Available under Settings → Backup and
  restore.

## [0.1.1] - 2026-08-05

### Changed

- Reptile photos are now converted to WebP and resized before being stored,
  so a collection with photos takes up considerably less space on device.

## [0.1.0] - 2026-08-04

### Added

- **Reptile profiles** — name, species, sex, photo, birth date and the date
  you acquired the animal.
- **Activity logging** — feedings, weigh-ins, sheds, waste and habitat
  upkeep, each with notes and a backdatable date, because nobody logs a
  feeding while holding the snake.
- **Per-animal timeline** — every record in one history, with feeding status
  (fed on time, overdue, or no data yet) and weight trend.
- **Care schedules** — feeding and habitat intervals that adapt to how you
  actually log, per reptile.
- **Reminders tab** — everything due and overdue across the collection, with
  optional daily notifications.
- **Search** across reptiles and their records.
- **Logging defaults** — meal measure, frozen or fresh prey, weight unit and
  waste type, set globally and overridable per reptile.
- **English and Brazilian Portuguese**, following the device language by
  default.
- **Light and dark mode**, Dynamic Type support throughout.
- **About screen** with the app version and a link to the repository.
- **Reset app data** in Settings, which permanently clears every reptile and
  record on the device.

[Unreleased]: https://github.com/karlprieb/reptikeep/compare/0.4.0...HEAD
[0.4.0]: https://github.com/karlprieb/reptikeep/compare/0.3.0...0.4.0
[0.3.0]: https://github.com/karlprieb/reptikeep/compare/v0.2.0...0.3.0
[0.2.0]: https://github.com/karlprieb/reptikeep/compare/v0.1.0...v0.2.0
[0.1.1]: https://github.com/karlprieb/reptikeep/compare/v0.1.0...349df00
[0.1.0]: https://github.com/karlprieb/reptikeep/releases/tag/v0.1.0
