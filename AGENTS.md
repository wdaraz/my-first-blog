# AGENTS.md

## Cursor Cloud specific instructions

This is the Django Girls tutorial blog app (a single Django project named `mysite` with one app, `blog`). It uses Django `~=2.2.4` and a SQLite database (`db.sqlite3`, committed with sample data).

### Python version gotcha (important)
Django 2.2 imports `distutils`, which was **removed from the Python 3.12 stdlib**, so the app does **not** run on the system Python (3.12). The environment uses a dedicated **Python 3.9** interpreter managed by `uv`, and the project virtualenv lives at `.venv/` (recreated by the update script). Always run management commands through `.venv/bin/python`, e.g.:
- `.venv/bin/python manage.py check`
- `.venv/bin/python manage.py runserver 0.0.0.0:8000`

`uv` is installed at `~/.local/bin/uv` and the Python 3.9 toolchain is cached under `~/.local/share/uv`.

### Running / testing / building
- Run dev server: `.venv/bin/python manage.py runserver 0.0.0.0:8000` (serves homepage at `/`, admin at `/admin/`).
- Tests: `.venv/bin/python manage.py test` (the repo currently has no real tests, so this reports 0 tests / OK).
- Migrations: `.venv/bin/python manage.py migrate` (already applied; `db.sqlite3` is committed).
- There is no separate build step (standard Django) and no configured linter.

### Notes
- The homepage template (`blog/templates/blog/post_list.html`) is **static HTML** and does not render posts from the database; to exercise the data model end-to-end, use the Django admin at `/admin/` (model `blog.Post` is registered there).
- To use the admin, create/reset a superuser: `DJANGO_SUPERUSER_PASSWORD=... .venv/bin/python manage.py createsuperuser --username admin --email admin@example.com --noinput`.
