# Changelog

All notable changes to this project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
