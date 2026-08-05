# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

[Unreleased]: https://github.com/karlprieb/reptikeep/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/karlprieb/reptikeep/compare/v0.1.0...v0.2.0
[0.1.1]: https://github.com/karlprieb/reptikeep/compare/v0.1.0...349df00
[0.1.0]: https://github.com/karlprieb/reptikeep/releases/tag/v0.1.0
