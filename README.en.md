# dsh-completion-notifier

English | [中文说明](README.md)

Completion notifications, interaction alerts, and smart session titling for DeepSeek Harness (DSH).

Sends native macOS notification banners, in-app floating toasts, and sound alerts when tasks finish or when the agent pauses for human interaction (permission approval, plan review, or user prompts). Supports all-time alerts or background-only alerting, automatic session switching, and automatic title generation to replace generic `task ready` names.

---

## Why this exists

When running long-running coding tasks with DSH, several friction points often arise:

1. **Uncertain completion timing**: You minimize the window to work on other things, then either keep switching back or forget about the task entirely.
2. **Foreground banner suppression**: macOS Notification Center by default suppresses system banners for the currently focused frontmost application, so you might miss notices while working inside DSH.
3. **Silent blocking**: The agent pauses midway waiting for permission to run a command, plan approval, or response to a question. Without an alert, it sits idle in the background.
4. **Hunting for the right session**: After a background run finishes, you have to search through a long list of sessions to find it.
5. **Cluttered sidebar**: Sessions are frequently assigned unhelpful default titles like `task ready`, `task ready (1)`, or truncated paths/commands.

This plugin addresses these everyday friction points.

---

## Features

- **Completion notifications**: Sends a macOS notification banner with the DSH whale icon, execution duration, and response summary.
- **In-App Floating Toast (100% visible in foreground)**: Overcomes macOS's suppression of frontmost application notifications by sliding in a sleek, clickable toast inside DSH.
- **Flexible Alert Timing**:
  - **Always (Recommended)**: Alerts on all events whether DSH is focused or in the background.
  - **Unfocused only**: Stays silent while you are actively using DSH; alerts only when the window is minimized or behind other apps.
- **Auto-Jump to Session**: When enabled, automatically switches DSH to the session that just finished or needs approval without requiring manual clicks.
- **Action-required alerts**: Plays a sound and shows an alert when the agent pauses waiting for user action (permission approval, plan review, or question response).
- **Click-to-navigate**: Clicking any notification focuses the DSH window and immediately opens the corresponding session.
- **Smart session titles**: Automatically generates a concise title based on your prompt after the first turn, replacing `task ready`.
- **Threshold filtering**: Set a minimum execution duration (default: 3s) so quick single-turn exchanges don't trigger unnecessary notifications.
- **Dedicated Settings UI**: Clean, restrained "Notifications & Titles" tab inside the DSH desktop settings panel.

---

## Installation

### Via Plugin Market (Recommended)

Open DSH Desktop, navigate to **Settings → Plugin Market**, search for `dsh-completion-notifier`, and click **Install**.

### Via CLI

Run in your terminal:

```bash
dsh plugin --profile web add dsh-completion-notifier
```

Or directly from GitHub:

```bash
dsh plugin --profile web add github:zepeng-jin/dsh-completion-notifier
```

### Local Development

```bash
git clone https://github.com/zepeng-jin/dsh-completion-notifier.git
cd dsh-completion-notifier
dsh plugin --profile web add link:$(pwd)
```

---

## Configuration

Open **Settings → Notifications & Titles** in DSH Desktop to configure options:

| Option | Description | Default |
| :--- | :--- | :--- |
| **Enable Notifications** | Master toggle for completion notifications | On |
| **Alert Timing** | Always alert, or only alert when DSH is unfocused/backgrounded | Always |
| **Auto-Jump to Session** | Automatically switch DSH to the session upon completion/approval | Off |
| **DSH In-App Toast** | Floating banner inside DSH (avoids macOS foreground suppression) | On |
| **macOS Notification Banner** | Display system banners in macOS Notification Center | On |
| **Sound Alert** | Sound effect on task completion (Glass, Ping, Hero, Pop, etc.) | Glass |
| **Approval & Plan Review Alerts** | Alert when the agent is waiting for permission or plan approval | On |
| **Min Duration Threshold (sec)** | Minimum execution duration before alerting (0 alerts on all turns) | 3 sec |
| **Smart Session Titler** | Automatically name sessions based on your first turn | On |

---

## License

[MIT License](LICENSE) © [zepengjin](https://github.com/zepeng-jin)
