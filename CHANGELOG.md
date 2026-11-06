# Changelog

All notable changes to this project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.1.0] - 2026-11-06

### Added

- **SALA-6** — Each room has its own maximum reservation duration.
  - Rooms have a `maxDuration` (`HH:mm`, from `00:15` to `23:59`), required on
    create; existing rooms get `04:00` (migration 0004).
  - A reservation can't last longer than its room's `maxDuration`; the 15-minute
    minimum still applies to every room.
  - `PATCH /rooms/edit/:id` refuses (409) to lower `maxDuration` below a
    reservation of that room that hasn't ended yet.
  - Web: room cards and the booking form show each room's limit; the room form
    edits it; admins get a "Nova sala" button and a `/salas/nova` page (404 for
    anyone else).

### Changed

- The fixed 4-hour reservation limit is replaced by each room's `maxDuration`.

## [1.0.1] - 2026-11-06

### Fixed

- **SALA-5** (production incident) — Reservations can only happen on weekdays
  (Monday to Friday), from 08:00 to 20:00 local time.
  - `POST /reservations/create` rejects (400) a start on a Saturday or Sunday,
    a start before 08:00, and an end after 20:00 or on another day.
  - Web: the booking form only offers times from 08:00 to 20:00.

## [1.0.0] - 2026-11-06

### Added

- **SALA-4** — Admins create, edit and delete rooms.
  - `POST /rooms/create`, `PATCH /rooms/edit/:id` and `DELETE /rooms/delete/:id`
    are admin only: the caller's `userId` comes in the body (403 for a regular
    user, 404 for an unknown one). Deleting a room deletes its reservations.
  - `GET /rooms/find/:id` returns one room.
  - Web: Editar and Excluir buttons on room cards for admins; `/salas/[id]/editar`
    answers 404 to anyone else, even by URL.
- **SALA-3** — List and cancel your own reservations.
  - `GET /reservations/list` returns only the caller's reservations, in
    chronological order, paginated.
  - `DELETE /reservations/delete/:id`: only the owner can cancel (403 otherwise,
    404 when missing).
  - Web: "Minhas reservas" page, with a Cancelar button on future reservations.
- **SALA-2** — Reserve a room by date and time.
  - `POST /reservations/create`, validated on the server: 15 min to 4 h, not in
    the past (`APP_TIMEZONE`, default `America/Sao_Paulo`), no overlap with
    another reservation of the same room (409).
  - Web: `/reservar` page and a Reservar button on each room card.
  - Error messages translated per request from `Accept-Language`, Portuguese by default.
- **SALA-1** — List rooms filtered by capacity and resources.
  - Rooms have a `maxCapacity` (migration 0002).
  - `GET /rooms/list?capacity=N&resources=...` matches rooms with
    `maxCapacity >= N` and all the given resources.
  - `GET /rooms/resources` lists the resource tags in use.
  - Web: home page lists rooms, with filters kept in the URL.

[Unreleased]: https://github.com/Rosnaldo/room-manager/compare/v1.1.0...develop
[1.1.0]: https://github.com/Rosnaldo/room-manager/compare/v1.0.1...v1.1.0
[1.0.1]: https://github.com/Rosnaldo/room-manager/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/Rosnaldo/room-manager/releases/tag/v1.0.0
