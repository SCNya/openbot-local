# OpenBot Local — сборка OpenBot без обязательного входа

> **Неофициальный форк для личного использования.** Это не продукт Synthetify Labs / nightly-labs
> и не связан с ними. Оригинал: <https://github.com/nightly-labs/openbot>.
> Код распространяется по лицензии **PolyForm Noncommercial 1.0.0** (файл [`LICENSE`](LICENSE)):
> только некоммерческое использование. Файлы `LICENSE` и `NOTICE`, копирайт и строки
> `Required Notice:` сохранены без изменений:
>
> Required Notice: Copyright 2026 Synthetify Labs spółka z ograniczoną odpowiedzialnością.
> Required Notice: For a commercial license, contact licenses@openbot.run.
>
> За коммерческой лицензией и поддержкой обращайтесь к авторам оригинала. Баги этой сборки
> не отправляйте в upstream.

## Что изменено (ветка `local-no-login`)

Логика перенесена с [ocodista/free-openbot](https://github.com/ocodista/free-openbot) и
[daMustermann/openbotfr](https://github.com/daMustermann/openbotfr) на свежий `main`.

- **Без экрана входа.** `AppAccessGate` (`src/renderer/src/AppView.tsx`) открывает выбор языка,
  первый запуск, настройку и рабочее пространство без аккаунта. `AccountLogin` при запуске не показывается.
- **Без сети при старте.** `src/main/central-auth-manager.ts`: без сохранённой сессии нет запросов
  `/health/live` и `/v1/me` к `api.openbot.run`; приложение стартует и без интернета.
- **Локальные сервер, команда и чаты без аккаунта** (`host-service.ts`, `team-store.ts`,
  `ipc/team-handlers.ts`): локальный сервер можно создать и переименовать, сообщения и прочтения
  работают от локального пользователя.
- **Аналитика и отчёты об ошибках выключены полностью** (`src/main/analytics.ts`,
  `src/renderer/src/analytics.ts`, `src/renderer/src/error-reports.ts`, `application-services.ts`).
  Ничего не уходит в OpenPanel/`analytics.openbot.run`, какой бы ни была настройка.
- **Автообновления выключены**: официальное обновление затёрло бы эту сборку.
- **Отдельный профиль**: `appId app.openbot.local`, имя «OpenBot Local», данные в
  `~/.config/OpenBot Local` (Linux) / `~/Library/Application Support/OpenBot Local` (macOS),
  рантаймы провайдеров тоже отдельно. Схема `openbot://` и `.desktop`-файл официального OpenBot не трогаются.
- **Скрыты разделы, которым нужен аккаунт**: «Профиль», «Оплата», «Телефон» в настройках,
  предложения hosted-серверов; кнопка «+» у серверов создаёт локальный сервер.

Не трогали: провайдеров агентов (Codex, Claude Code, Gemini, Grok, Ollama, LM Studio и др.),
встроенный браузер, очередь, хранение рабочих папок.

## Что без аккаунта не работает

- приглашения и общие команды с другими людьми, вход на чужие серверы по ссылке-приглашению;
- подключение телефона (мобильное приложение) и веб-клиент;
- hosted-серверы, оплата, лицензия, профиль аккаунта;
- публикация агентов/шаблонов на openbot.run;
- коннекторы Slack/Discord/Telegram и GitHub оставлены как в оригинале; работают ли они без аккаунта,
  не проверялось (часть может ходить через сервисы openbot.run).

Ссылки «Что нового», «Гайды», Discord в меню помощи по-прежнему ведут на openbot.run, но открываются
только по клику.

## Сборка

Linux x64 (AppImage в `dist/`):

```bash
bun install
bun run dist:linux
```

macOS arm64 (неподписанная, локально на Mac с Apple silicon):

```bash
bash scripts/apply-and-build-mac.sh            # клонирует upstream, накладывает no-login.patch, собирает
xattr -dr com.apple.quarantine "/Applications/OpenBot Local.app"   # один раз, иначе Gatekeeper не даст открыть
```

## Как обновляться на новый upstream

Ветка `main` этого репозитория — снимок upstream без `.github/workflows` (чтобы в форке не запускались
их CI). Сами правки лежат одним коммитом и файлом [`no-login.patch`](no-login.patch).

```bash
git clone https://github.com/nightly-labs/openbot openbot && cd openbot
git apply --3way /path/to/no-login.patch     # или: git am no-login.patch
# конфликты обычно в AppView.tsx, SettingsModal.tsx, server-actions.ts, application-services.ts
bun install && bun run desktop:typecheck && bun run dist:linux
git diff > no-login.patch                     # обновлённый патч для следующего раза
```

Если файлы в upstream переименуют, ищите по `AppAccessGate`, `#initialize` в `central-auth-manager`,
`updatesEnabled`, `shouldEnableDesktopAnalytics`.
