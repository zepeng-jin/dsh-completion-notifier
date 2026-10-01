# dsh-completion-notifier

English | [中文说明](README.md)

Completion notifications, interaction alerts, and smart session titling for DeepSeek Harness (DSH).

Sends native macOS notification banners and sound alerts when tasks finish or when the agent pauses for human interaction (permission approval, plan review, or user prompts). Clicking the notification brings the window into focus and opens the relevant session. Automatically derives clean session titles to replace generic `task ready` names.

---

## Why this exists

When running long-running coding tasks with DSH, you typically minimize the window to work on other things. Several friction points often arise:

1. **Uncertain completion timing**: You either keep checking back manually or forget about the task entirely.
2. **Silent blocking**: The agent pauses midway waiting for permission to run a command, plan approval, or input on a question. Without an alert, it sits idle in the background.
3. **Cluttered sidebar**: Sessions are frequently assigned unhelpful default titles like `task ready`, `task ready (1)`, or truncated paths/commands, making it hard to find past conversations.

This plugin addresses these everyday friction points.

---

## Features

- **Completion notifications**: Sends a macOS notification banner with the DSH whale icon, execution duration, and a brief response summary when a task settles.
- **Action-required alerts**: Plays a sound and shows a banner when the agent pauses waiting for user action (permission approval, plan review, or question response).
- **Click-to-navigate**: Clicking the banner focuses the DSH window and immediately opens the corresponding session.
- **Smart session titles**: Automatically generates a concise 6-to-10 character title based on your prompt after the first turn, replacing `task ready`.
- **Threshold filtering**: Set a minimum execution duration (default: 3s) so quick single-turn exchanges don't trigger unnecessary notifications.
- **Settings UI**: Dedicated "Notifications & Titles" tab inside the DSH desktop settings panel.

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
| **macOS Notification Banner** | Display system banners in Notification Center | On |
| **Sound Alert** | Sound effect on task completion (Glass, Ping, Hero, Pop, etc.) | Glass |
| **Approval & Plan Review Alerts** | Alert when the agent is waiting for permission or plan approval | On |
| **Min Duration Threshold (sec)** | Minimum execution duration before alerting (0 alerts on all turns) | 3 sec |
| **Smart Session Titler** | Automatically name sessions based on your first turn | On |

---

## License

[MIT License](LICENSE) © [zepengjin](https://github.com/zepeng-jin)
