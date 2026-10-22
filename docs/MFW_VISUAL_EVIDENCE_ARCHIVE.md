# MFW — визуальные доказательства для презентаций и syntha.pro

Автоматическая съёмка **реальных страниц**: `qa/capture-mfw-evidence.js` + `.github/workflows/mfw-visual-evidence.yml`.

**Production:** https://mfw-platform.onrender.com/platform/index.html — опубликованная версия, не равная PR #35. **Integration-preview:** текущий checkout PR на локальном HTTP-сервере внутри GitHub Actions. Никакие результаты тестов не называются реальными пользовательскими регистрациями.

Снимаются desktop PNG для MFW, BFS, Made in Moscow и инвесторской панели; mobile PNG для MFW, BFS и Made; отдельно по 25-секундному MP4 (H.264, 1280×720) на каждый источник. Все экраны открываются в новом публичном браузерном контексте без входа и без действий с приватными данными.

После успешной съёмки workflow сохраняет артефакт на 30 дней и пытается опубликовать `latest/` и 16 архивных наборов в ветке `mfw-media-archive`. Проверьте **фактическое существование ветки после первого запуска**; ссылка до этого не является доказательством. Снимки используют дату, URL, статус, хэш SHA-256. Для production точный SHA не заявляется до отдельной проверки Render. Если опубликованная страница недоступна, ошибка фиксируется, а не подменяется скриншотом preview.

**Частота:** при обновлении `mfw/**` и capture-скрипта на интеграционной ветке, вручную из GitHub Actions и еженедельно после появления файла workflow в `main` (cron GitHub запускается только из default branch).

Для личного лендинга используйте только реально подтверждённые файлы архива. Не подписывайте preview как production и не выдавайте публичный walkthrough за пройденный QR/финансовый E2E.

Полезные ссылки после подтверждённого первого прогона:

- https://github.com/PetrFedin/MFW/actions/workflows/mfw-visual-evidence.yml
- https://github.com/PetrFedin/MFW/tree/mfw-media-archive/latest
- https://raw.githubusercontent.com/PetrFedin/MFW/mfw-media-archive/latest/production/desktop-mfw.png
- https://raw.githubusercontent.com/PetrFedin/MFW/mfw-media-archive/latest/production/tour-25s.mp4
- https://raw.githubusercontent.com/PetrFedin/MFW/mfw-media-archive/latest/integration-preview/tour-25s.mp4


## Portfolio gallery and automatic evidence qualification — 20 October 2026

The integration workflow now runs `qa/portfolio-media-catalog.js` after browser capture and before publishing its archive. Each screenshot and MP4 must exist, match its recorded byte size and SHA-256, and have a valid PNG/MP4 file signature. Video duration must be 20–30 seconds. A clean source requires 26 distinct screenshots, 4 videos (general tour plus MFW/BFS/Made tours), no browser exceptions, and a source-specific provenance label. Integration preview source SHA must match the exact captured commit. Production SHA is never inferred from branch HEAD.

New output files under `mfw-media-archive/latest/`:

- `portfolio.html` — responsive landing-ready gallery of **qualified** screen captures and videos grouped by MFW, BFS, Made, and platform, with preview/production labels.
- `portfolio-catalog.json` — machine-readable media inventory with SHA-256, source URL, commit, duration and qualification results.
- `production/` and `integration-preview/` — underlying original captures and per-source diagnostic manifests.

A run may succeed with qualified integration-preview media while production remains diagnostic-only, but **production diagnostic media must never be silently shown as investor-ready**. This is actual public-browser footage; it is not a claim of real registration, QR admission, payments, approved accounting, image licences or production deployment. For external use, review frames and third-party media rights independently.

Gallery: https://raw.githubusercontent.com/PetrFedin/MFW/mfw-media-archive/latest/portfolio.html
Index: https://raw.githubusercontent.com/PetrFedin/MFW/mfw-media-archive/latest/portfolio-catalog.json
