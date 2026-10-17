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
